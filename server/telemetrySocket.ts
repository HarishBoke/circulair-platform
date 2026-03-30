/**
 * telemetrySocket.ts
 *
 * Socket.io server for real-time battery telemetry streaming.
 *
 * Architecture:
 *  - One Socket.io namespace: /telemetry
 *  - Clients join a room named after the BPAN they want to monitor
 *  - The MQTT simulation loop emits readings to the correct room every 2 s
 *  - Any tRPC telemetry.ingest call also broadcasts to the room in real time
 *  - A global "anomalies" room receives thermal-anomaly events for all batteries
 *
 * Events emitted to clients:
 *  telemetry:reading   — { bpan, vPack, iPack, vMin, vMax, tPack, tMax, cycleCount, irPack, sohEstimate, thermalAnomaly, recordedAt }
 *  telemetry:anomaly   — { bpan, tMax, tPack, recordedAt, message }
 *  telemetry:status    — { bpan, connected: boolean }
 *
 * Events received from clients:
 *  subscribe           — { bpan: string }   → joins room bpan + starts simulation for that battery
 *  unsubscribe         — { bpan: string }   → leaves room bpan
 *  ingest              — TelemetryReading   → server-side ingest + broadcast (for field devices)
 */

import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

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
  recordedAt: string; // ISO string
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

// Track active simulation intervals per BPAN
const simulationIntervals = new Map<string, ReturnType<typeof setInterval>>();

// Track SOH state per BPAN for realistic degradation simulation
const bpanSohState = new Map<string, number>();
const bpanCycleState = new Map<string, number>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a realistic telemetry reading for a given BPAN.
 * Simulates a 96s NMC pack with gradual SOH degradation.
 */
function generateReading(bpan: string): TelemetryReading {
  // Maintain per-battery state for continuity
  const currentSoh = bpanSohState.get(bpan) ?? (75 + Math.random() * 20);
  const currentCycle = bpanCycleState.get(bpan) ?? Math.floor(200 + Math.random() * 800);

  // Gradual SOH degradation: ~0.001% per reading (very slow)
  const newSoh = Math.max(20, currentSoh - Math.random() * 0.002);
  const newCycle = currentCycle + (Math.random() > 0.9 ? 1 : 0); // cycle increments ~10% of readings

  bpanSohState.set(bpan, newSoh);
  bpanCycleState.set(bpan, newCycle);

  // Realistic NMC 96s pack parameters
  const nominalCellV = 3.65;
  const cellVariance = (Math.random() - 0.5) * 0.08;
  const vCell = nominalCellV + cellVariance;
  const vPack = parseFloat((vCell * 96).toFixed(2));
  const vMin = parseFloat((vCell - 0.05 - Math.random() * 0.05).toFixed(3));
  const vMax = parseFloat((vCell + 0.05 + Math.random() * 0.05).toFixed(3));

  // Current: charging (+) or discharging (-)
  const isCharging = Math.random() > 0.6;
  const iPack = parseFloat(((isCharging ? 1 : -1) * (20 + Math.random() * 80)).toFixed(1));

  // Temperature: ambient 22-28°C, rises under load
  const ambientTemp = 22 + Math.random() * 6;
  const loadHeat = Math.abs(iPack) * 0.08;
  const tPack = parseFloat((ambientTemp + loadHeat).toFixed(1));

  // Occasional thermal spikes (5% chance)
  const thermalSpike = Math.random() < 0.05;
  const tMax = parseFloat((tPack + (thermalSpike ? 15 + Math.random() * 15 : Math.random() * 3)).toFixed(1));

  const thermalAnomaly = tMax > 51;

  // Internal resistance increases as SOH decreases
  const irBase = 15 + (100 - newSoh) * 0.3;
  const irPack = parseFloat((irBase + Math.random() * 2).toFixed(3));

  return {
    bpan,
    vPack,
    iPack,
    vMin,
    vMax,
    tPack,
    tMax,
    cycleCount: newCycle,
    irPack,
    sohEstimate: parseFloat(newSoh.toFixed(2)),
    thermalAnomaly,
    anomalyType: thermalAnomaly ? `High temperature: ${tMax}°C` : undefined,
    source: "mqtt",
    recordedAt: new Date().toISOString(),
  };
}

/**
 * Start the MQTT simulation loop for a BPAN.
 * Emits a reading every 2 seconds to the room named after the BPAN.
 * Also saves to DB and broadcasts anomalies.
 */
function startSimulation(bpan: string) {
  if (simulationIntervals.has(bpan)) return; // already running

  const io = getSocketIO();
  if (!io) return;

  const ns = io.of("/telemetry");

  const interval = setInterval(async () => {
    // Only emit if someone is in the room
    const room = ns.adapter.rooms.get(bpan);
    if (!room || room.size === 0) {
      stopSimulation(bpan);
      return;
    }

    const reading = generateReading(bpan);

    // Emit to room subscribers
    ns.to(bpan).emit("telemetry:reading", reading);

    // Emit anomaly to global anomalies room
    if (reading.thermalAnomaly) {
      const anomaly: TelemetryAnomaly = {
        bpan,
        tMax: reading.tMax,
        tPack: reading.tPack,
        recordedAt: reading.recordedAt,
        message: `THERMAL ANOMALY: Battery ${bpan} at ${reading.tMax}°C — exceeds 51°C threshold`,
      };
      ns.to("anomalies").emit("telemetry:anomaly", anomaly);
    }

    // Persist to DB asynchronously (fire and forget — don't block the stream)
    try {
      const { insertTelemetry } = await import("./db");
      await insertTelemetry({
        bpan: reading.bpan,
        batteryId: reading.batteryId ?? 0,
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
  }, 2000);

  simulationIntervals.set(bpan, interval);
}

function stopSimulation(bpan: string) {
  const interval = simulationIntervals.get(bpan);
  if (interval) {
    clearInterval(interval);
    simulationIntervals.delete(bpan);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Attach Socket.io to the existing HTTP server and configure the /telemetry namespace.
 * Call this once from server/_core/index.ts after the Express app is created.
 */
export function attachTelemetrySocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/api/socket.io",
    transports: ["websocket", "polling"],
  });

  _io = io;

  const ns = io.of("/telemetry");

  ns.on("connection", (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // ── subscribe: join a BPAN room and start simulation ──────────────────
    socket.on("subscribe", ({ bpan }: { bpan: string }) => {
      if (!bpan || typeof bpan !== "string") return;
      const room = bpan.trim().toUpperCase();
      socket.join(room);
      console.log(`[Socket.io] ${socket.id} subscribed to BPAN: ${room}`);

      // Confirm subscription to client
      socket.emit("telemetry:status", { bpan: room, connected: true });

      // Start MQTT simulation for this battery
      startSimulation(room);
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

      // Broadcast to all subscribers of this battery
      ns.to(room).emit("telemetry:reading", full);

      if (full.thermalAnomaly) {
        ns.to("anomalies").emit("telemetry:anomaly", {
          bpan: room,
          tMax: full.tMax,
          tPack: full.tPack,
          recordedAt: full.recordedAt,
          message: `THERMAL ANOMALY: Battery ${room} at ${full.tMax}°C`,
        });
      }

      // Acknowledge
      socket.emit("ingest:ack", { bpan: room, recordedAt: full.recordedAt });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[Socket.io] Telemetry namespace /telemetry attached");
  return io;
}

/**
 * Get the Socket.io server instance (for use in tRPC procedures).
 */
export function getSocketIO(): SocketIOServer | null {
  return _io;
}

/**
 * Broadcast a telemetry reading from a tRPC procedure (e.g., telemetry.ingest).
 * This allows REST/tRPC ingestion to also push live updates to WebSocket subscribers.
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

/**
 * Stop all simulation loops (for graceful shutdown).
 */
export function stopAllSimulations(): void {
  for (const bpan of Array.from(simulationIntervals.keys())) {
    stopSimulation(bpan);
  }
}
