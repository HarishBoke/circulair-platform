/**
 * telemetrySocket.ts
 *
 * Socket.io server for real-time battery telemetry streaming.
 *
 * Architecture:
 *  - One Socket.io namespace: /telemetry
 *  - Clients join a room named after the BPAN they want to monitor
 *  - The physics-based simulator (batterySimulator.ts) emits readings every 2 s
 *  - Any tRPC telemetry.ingest call also broadcasts to the room in real time
 *  - A global "anomalies" room receives thermal-anomaly events for all batteries
 *
 * Events emitted to clients:
 *  telemetry:reading   — SimulatedReading (includes soc, chemistry)
 *  telemetry:anomaly   — { bpan, tMax, tPack, recordedAt, message }
 *  telemetry:status    — { bpan, connected: boolean }
 *
 * Events received from clients:
 *  subscribe           — { bpan: string, chemistry?: string }
 *  unsubscribe         — { bpan: string }
 *  ingest              — TelemetryReading
 */

import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import {
  startBatterySimulator,
  stopBatterySimulator,
  stopAllSimulators,
  getSimulatorStats,
  type SimulatedReading,
} from "./batterySimulator";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TelemetryReading {
  bpan: string;
  batteryId?: number;
  vPack: number;
  iPack: number;
  vMin: number;
  vMax: number;
  tPack: number;
  tMax: number;
  cycleCount: number;
  irPack: number;
  sohEstimate: number;
  thermalAnomaly: boolean;
  anomalyType?: string;
  source: "mqtt" | "api" | "simulated" | "websocket";
  recordedAt: string;
}

export interface TelemetryAnomaly {
  bpan: string;
  tMax: number;
  tPack: number;
  recordedAt: string;
  message: string;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _io: SocketIOServer | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Persist a simulated reading to the DB (fire-and-forget).
 */
async function persistReading(reading: SimulatedReading, batteryId: number = 0): Promise<void> {
  try {
    const { insertTelemetry } = await import("./db");
    await insertTelemetry({
      bpan: reading.bpan,
      batteryId,
      vPack: String(reading.vPack),
      iPack: String(reading.iPack),
      vMin: String(reading.vMin),
      vMax: String(reading.vMax),
      tPack: String(reading.tPack),
      tMax: String(reading.tMax),
      cycleCount: reading.cycleCount,
      irPack: String(reading.irPack),
      sohEstimate: String(reading.sohEstimate),
      dtcCodes: null,
      thermalAnomaly: reading.thermalAnomaly,
      anomalyType: reading.anomalyType ?? null,
      source: "simulated",
    });
  } catch {
    // DB unavailable — stream continues without persistence
  }
}

/**
 * Look up the batteryId for a BPAN (cached per session).
 */
const _batteryIdCache = new Map<string, number>();
async function getBatteryId(bpan: string): Promise<number> {
  if (_batteryIdCache.has(bpan)) return _batteryIdCache.get(bpan)!;
  try {
    const { getBatteryByBpan } = await import("./db");
    const battery = await getBatteryByBpan(bpan);
    const id = battery?.id ?? 0;
    _batteryIdCache.set(bpan, id);
    return id;
  } catch {
    return 0;
  }
}

/**
 * Start the physics-based simulation loop for a BPAN.
 * Emits readings to the Socket.io room, persists to DB, and broadcasts anomalies.
 */
function startSimulation(bpan: string, chemistry: string = "NMC"): void {
  const io = getSocketIO();
  if (!io) return;
  const ns = io.of("/telemetry");

  startBatterySimulator(
    bpan,
    chemistry,
    {
      onReading: async (reading) => {
        // Only emit if someone is in the room
        const room = ns.adapter.rooms.get(bpan);
        if (!room || room.size === 0) {
          stopBatterySimulator(bpan);
          return;
        }
        // Emit to room subscribers
        ns.to(bpan).emit("telemetry:reading", reading);
        // Persist to DB
        const batteryId = await getBatteryId(bpan);
        await persistReading(reading, batteryId);
      },
      onAnomaly: (reading) => {
        const anomaly: TelemetryAnomaly = {
          bpan,
          tMax: reading.tMax,
          tPack: reading.tPack,
          recordedAt: reading.recordedAt,
          message: `THERMAL ANOMALY: Battery ${bpan} at ${reading.tMax}°C — exceeds 51°C threshold`,
        };
        ns.to("anomalies").emit("telemetry:anomaly", anomaly);
      },
    },
    2000
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Attach Socket.io to the existing HTTP server and configure the /telemetry namespace.
 */
export function attachTelemetrySocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
    transports: ["websocket", "polling"],
  });

  _io = io;
  const ns = io.of("/telemetry");

  ns.on("connection", (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // ── subscribe: join a BPAN room and start simulation ──────────────────
    socket.on("subscribe", ({ bpan, chemistry }: { bpan: string; chemistry?: string }) => {
      if (!bpan || typeof bpan !== "string") return;
      const room = bpan.trim().toUpperCase();
      socket.join(room);
      console.log(`[Socket.io] ${socket.id} subscribed to BPAN: ${room}`);
      socket.emit("telemetry:status", { bpan: room, connected: true });
      startSimulation(room, chemistry ?? "NMC");
    });

    // ── unsubscribe: leave the room ────────────────────────────────────────
    socket.on("unsubscribe", ({ bpan }: { bpan: string }) => {
      if (!bpan || typeof bpan !== "string") return;
      const room = bpan.trim().toUpperCase();
      socket.leave(room);
      socket.emit("telemetry:status", { bpan: room, connected: false });
      console.log(`[Socket.io] ${socket.id} unsubscribed from BPAN: ${room}`);
    });

    // ── subscribe to global anomaly feed ──────────────────────────────────
    socket.on("subscribe:anomalies", () => {
      socket.join("anomalies");
      console.log(`[Socket.io] ${socket.id} subscribed to anomaly feed`);
    });

    // ── ingest: field device pushes a reading directly via WebSocket ──────
    socket.on("ingest", async (reading: Partial<TelemetryReading>) => {
      if (!reading.bpan) return;
      const room = reading.bpan.trim().toUpperCase();
      const full: TelemetryReading = {
        bpan: room,
        vPack: reading.vPack ?? 0,
        iPack: reading.iPack ?? 0,
        vMin: reading.vMin ?? 0,
        vMax: reading.vMax ?? 0,
        tPack: reading.tPack ?? 0,
        tMax: reading.tMax ?? 0,
        cycleCount: reading.cycleCount ?? 0,
        irPack: reading.irPack ?? 0,
        sohEstimate: reading.sohEstimate ?? 0,
        thermalAnomaly: (reading.tMax ?? 0) > 51,
        source: "websocket",
        recordedAt: new Date().toISOString(),
      };
      ns.to(room).emit("telemetry:reading", full);
      if (full.thermalAnomaly) {
        ns.to("anomalies").emit("telemetry:anomaly", {
          bpan: room, tMax: full.tMax, tPack: full.tPack,
          recordedAt: full.recordedAt,
          message: `THERMAL ANOMALY: Battery ${room} at ${full.tMax}°C`,
        });
      }
      socket.emit("ingest:ack", { bpan: room, recordedAt: full.recordedAt });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[Socket.io] Telemetry namespace /telemetry attached");
  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return _io;
}

/**
 * Broadcast a telemetry reading from a tRPC procedure (e.g., telemetry.ingest).
 */
export function broadcastTelemetryReading(reading: TelemetryReading): void {
  const io = getSocketIO();
  if (!io) return;
  const ns = io.of("/telemetry");
  ns.to(reading.bpan).emit("telemetry:reading", reading);
  if (reading.thermalAnomaly) {
    const anomaly: TelemetryAnomaly = {
      bpan: reading.bpan,
      tMax: reading.tMax,
      tPack: reading.tPack,
      recordedAt: reading.recordedAt,
      message: `THERMAL ANOMALY: Battery ${reading.bpan} at ${reading.tMax}°C`,
    };
    ns.to("anomalies").emit("telemetry:anomaly", anomaly);
  }
}

// Alias used by mqttSubscriber.ts
export const broadcastTelemetry = broadcastTelemetryReading;

/**
 * Broadcast an anomaly event from the MQTT subscriber.
 */
export function broadcastAnomaly(bpan: string, anomaly: TelemetryAnomaly): void {
  const io = getSocketIO();
  if (!io) return;
  io.of("/telemetry").to("anomalies").emit("telemetry:anomaly", anomaly);
}

/**
 * Stop all simulation loops (for graceful shutdown).
 */
export function stopAllSimulations(): void {
  stopAllSimulators();
}

/**
 * Get stats about active simulators (for demo dashboard).
 */
export function getActiveSimulatorStats() {
  return getSimulatorStats();
}
