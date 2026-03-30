/**
 * useTelemetrySocket.ts
 *
 * React hook for subscribing to live telemetry for a specific BPAN.
 *
 * Usage:
 *   const { latest, history, connectionState, anomalies } = useTelemetrySocket(bpan);
 *
 * - Joins the BPAN room on mount, leaves on unmount.
 * - Maintains a rolling buffer of the last MAX_HISTORY readings for charts.
 * - Exposes the most recent reading as `latest`.
 * - Collects thermal anomaly events in `anomalies`.
 * - Provides `connectionState` for UI status indicators.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type { TelemetryReading, TelemetryAnomaly, SocketConnectionState } from "@/contexts/TelemetrySocketContext";

const MAX_HISTORY = 60; // keep last 60 readings (~2 min at 2s interval)

export interface UseTelemetrySocketResult {
  /** Most recent telemetry reading */
  latest: TelemetryReading | null;
  /** Rolling history buffer (oldest → newest) */
  history: TelemetryReading[];
  /** WebSocket connection state */
  connectionState: SocketConnectionState;
  /** Thermal anomaly events received during this session */
  anomalies: TelemetryAnomaly[];
  /** Whether the hook is actively subscribed to a BPAN */
  isSubscribed: boolean;
  /** Manually push a reading (for tRPC-ingested data) */
  pushReading: (reading: TelemetryReading) => void;
}

export function useTelemetrySocket(bpan: string | null): UseTelemetrySocketResult {
  const socketRef = useRef<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>("disconnected");
  const [latest, setLatest] = useState<TelemetryReading | null>(null);
  const [history, setHistory] = useState<TelemetryReading[]>([]);
  const [anomalies, setAnomalies] = useState<TelemetryAnomaly[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const pushReading = useCallback((reading: TelemetryReading) => {
    setLatest(reading);
    setHistory((prev) => {
      const next = [...prev, reading];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
  }, []);

  useEffect(() => {
    // Create a dedicated socket for this hook instance
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
      // Subscribe to anomaly feed
      socket.emit("subscribe:anomalies");
      // Subscribe to BPAN room if one is active
      if (bpan) {
        socket.emit("subscribe", { bpan });
        setIsSubscribed(true);
      }
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
      setIsSubscribed(false);
    });

    socket.on("connect_error", () => {
      setConnectionState("error");
    });

    socket.on("telemetry:reading", (reading: TelemetryReading) => {
      pushReading(reading);
    });

    socket.on("telemetry:anomaly", (anomaly: TelemetryAnomaly) => {
      setAnomalies((prev) => {
        const next = [anomaly, ...prev];
        return next.length > 50 ? next.slice(0, 50) : next;
      });
    });

    socket.on("telemetry:status", ({ connected }: { bpan: string; connected: boolean }) => {
      setIsSubscribed(connected);
    });

    return () => {
      if (bpan) {
        socket.emit("unsubscribe", { bpan });
      }
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // socket created once — bpan subscription handled in separate effect

  // Handle BPAN changes after initial mount
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    if (bpan) {
      socket.emit("subscribe", { bpan });
      setIsSubscribed(true);
      // Clear history when switching batteries
      setLatest(null);
      setHistory([]);
    }

    return () => {
      if (bpan && socket.connected) {
        socket.emit("unsubscribe", { bpan });
        setIsSubscribed(false);
      }
    };
  }, [bpan]);

  return { latest, history, connectionState, anomalies, isSubscribed, pushReading };
}
