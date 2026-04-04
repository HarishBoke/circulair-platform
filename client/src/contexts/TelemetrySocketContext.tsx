/**
 * TelemetrySocketContext.tsx
 *
 * Provides a single Socket.io client instance connected to the server's
 * /telemetry namespace. Components use useTelemetrySocket() to access it.
 *
 * The socket is created lazily on first use and shared across the entire app.
 * It automatically reconnects on network interruptions.
 *
 * The socket is intentionally NOT opened on public routes (/login, /register,
 * /forgot-password, /reset-password) to avoid unnecessary WebSocket connections
 * before the user is authenticated.
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";

// Public routes where the socket should NOT be opened
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/coming-soon", "/privacy", "/terms"];
function isPublicRoute(): boolean {
  if (typeof window === "undefined") return true;
  const path = window.location.pathname;
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "?"));
}

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
  const [connectionState, setConnectionState] = useState<SocketConnectionState>("disconnected");

  // Read auth state from the TanStack Query cache — no new network request.
  const meData = trpc.auth.me.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });
  const isAuthenticated = Boolean(meData.data);

  useEffect(() => {
    // Don't open a socket on public routes or when unauthenticated
    if (!isAuthenticated || isPublicRoute()) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnectionState("disconnected");
      }
      return;
    }

    // Avoid creating a duplicate socket
    if (socketRef.current) return;

    setConnectionState("connecting");

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
  }, [isAuthenticated]);

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
