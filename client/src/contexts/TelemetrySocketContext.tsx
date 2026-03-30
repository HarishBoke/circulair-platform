/**
 * TelemetrySocketContext.tsx
 *
 * Provides a single Socket.io client instance connected to the server's
 * /telemetry namespace. Components use useTelemetrySocket() to access it.
 *
 * The socket is created lazily on first use and shared across the entire app.
 * It automatically reconnects on network interruptions.
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";

// ─── Types (mirrored from server/telemetrySocket.ts) ─────────────────────────

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

export type SocketConnectionState = "connecting" | "connected" | "disconnected" | "error";

// ─── Context ─────────────────────────────────────────────────────────────────

interface TelemetrySocketContextValue {
  socket: Socket | null;
  connectionState: SocketConnectionState;
}

const TelemetrySocketContext = createContext<TelemetrySocketContextValue>({
  socket: null,
  connectionState: "disconnected",
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function TelemetrySocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>("connecting");

  useEffect(() => {
    // Derive the WebSocket server URL from the current window origin
    const serverUrl = window.location.origin;

    const socket = io(`${serverUrl}/telemetry`, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
      // Subscribe to the global anomaly feed
      socket.emit("subscribe:anomalies");
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
    });

    socket.on("connect_error", () => {
      setConnectionState("error");
    });

    socket.on("reconnecting", () => {
      setConnectionState("connecting");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <TelemetrySocketContext.Provider value={{ socket: socketRef.current, connectionState }}>
      {children}
    </TelemetrySocketContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTelemetrySocketContext() {
  return useContext(TelemetrySocketContext);
}
