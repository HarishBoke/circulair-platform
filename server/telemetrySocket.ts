import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { Request } from 'express';
import { authenticateRequest } from './_core/auth';
import { getBatteryByBpan } from './db';
import { isTrustedMutationOrigin } from './requestSecurity';
import { stopAllSimulators, getSimulatorStats } from './batterySimulator';

export interface TelemetryReading {
  bpan: string; batteryId?: number; vPack: number; iPack: number;
  vMin: number; vMax: number; tPack: number; tMax: number;
  cycleCount: number; irPack: number; sohEstimate: number;
  thermalAnomaly: boolean; anomalyType?: string;
  source: 'mqtt' | 'api' | 'simulated' | 'websocket'; recordedAt: string;
}
export interface TelemetryAnomaly {
  bpan: string; tMax: number; tPack: number; recordedAt: string; message: string;
}
let _io: SocketIOServer | null = null;

export function attachTelemetrySocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: true, credentials: true, methods: ['GET', 'POST'] },
    path: '/api/socket.io', transports: ['websocket', 'polling'],
  });
  _io = io;
  const ns = io.of('/telemetry');
  ns.use(async (socket, next) => {
    try {
      const request = socket.request as Request;
      const originRequest = {
        headers: request.headers,
        protocol: request.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http',
        get: (key: string) => key === 'host' ? request.headers.host : undefined,
      } as Request;
      if (!isTrustedMutationOrigin(originRequest)) return next(new Error('Forbidden origin'));
      const user = await authenticateRequest(request);
      if (!user) return next(new Error('Unauthorized'));
      socket.data.user = user;
      next();
    } catch { next(new Error('Unauthorized')); }
  });
  ns.on('connection', socket => {
    socket.on('subscribe', async (input: unknown) => {
      try {
        const bpan = (input as { bpan?: unknown } | null)?.bpan;
        if (typeof bpan !== 'string' || !/^[A-Z0-9]{19,21}$/.test(bpan.trim().toUpperCase())) {
          socket.emit('telemetry:error', { message: 'Invalid BPAN' }); return;
        }
        const room = bpan.trim().toUpperCase();
        const battery = await getBatteryByBpan(room);
        const user = socket.data.user;
        if (!battery || (user.role !== 'admin' && battery.ownerId !== user.id && battery.registeredById !== user.id)) {
          socket.emit('telemetry:error', { message: 'Battery access denied' }); return;
        }
        await socket.join(room);
        socket.emit('telemetry:status', { bpan: room, connected: true });
        // Subscription is read-only. Simulators are not started or persisted here.
      } catch { socket.emit('telemetry:error', { message: 'Unable to subscribe' }); }
    });
    socket.on('unsubscribe', (input: unknown) => {
      const bpan = (input as { bpan?: unknown } | null)?.bpan;
      if (typeof bpan !== 'string') return;
      const room = bpan.trim().toUpperCase();
      void socket.leave(room);
      socket.emit('telemetry:status', { bpan: room, connected: false });
    });
    socket.on('subscribe:anomalies', () => {
      // Ordinary users receive only anomalies in their authorized battery rooms.
      if (socket.data.user.role === 'admin') void socket.join('anomalies');
    });
    socket.on('ingest', () => {
      // Do not acknowledge a fabricated or unpersisted browser event as successful ingest.
      socket.emit('ingest:error', { message: 'Use the authenticated REST telemetry endpoint for device ingestion' });
    });
  });
  return io;
}
export function getSocketIO(): SocketIOServer | null { return _io; }
export function broadcastTelemetryReading(reading: TelemetryReading): void {
  const ns = _io?.of('/telemetry');
  if (!ns) return;
  ns.to(reading.bpan).emit('telemetry:reading', reading);
  if (reading.thermalAnomaly) {
    broadcastAnomaly(reading.bpan, {
      bpan: reading.bpan, tMax: reading.tMax, tPack: reading.tPack,
      recordedAt: reading.recordedAt,
      message: `THERMAL ANOMALY: Battery ${reading.bpan} at ${reading.tMax}°C`,
    });
  }
}
export const broadcastTelemetry = broadcastTelemetryReading;
export function broadcastAnomaly(bpan: string, anomaly: TelemetryAnomaly): void {
  _io?.of('/telemetry').to(bpan).to('anomalies').emit('telemetry:anomaly', anomaly);
}
export function stopAllSimulations(): void { stopAllSimulators(); }
export function getActiveSimulatorStats() { return getSimulatorStats(); }
