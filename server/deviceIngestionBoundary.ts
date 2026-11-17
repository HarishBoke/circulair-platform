import { z } from "zod";

// Syntax only: database lookup must still establish the exact registered identity.
export const deviceBpanSchema = z.string().regex(/^(?:[A-Z0-9]{19}|[A-Z0-9]{21})$/);
const finite = z.number().finite();
const sensorFields = ["vPack", "iPack", "vMin", "vMax", "tPack", "tMax", "irPack", "sohEstimate", "cycleCount"] as const;
export const deviceTelemetrySchema = z.object({
  bpan: deviceBpanSchema,
  deviceId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  recordedAt: z.string().datetime({ offset: true }),
  source: z.literal("measured"),
  vPack: finite.nonnegative().max(999999.99).optional(),
  iPack: finite.min(-999999.99).max(999999.99).optional(),
  vMin: finite.nonnegative().max(9999.999).optional(),
  vMax: finite.nonnegative().max(9999.999).optional(),
  tPack: finite.min(-273.15).max(9999.99).optional(),
  tMax: finite.min(-273.15).max(9999.99).optional(),
  irPack: finite.nonnegative().max(99999.999).optional(),
  sohEstimate: finite.min(0).max(100).optional(),
  cycleCount: finite.int().min(0).max(2147483647).optional(),
  dtcCodes: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,32}$/)).max(64).optional(),
}).strict().superRefine((p, ctx) => {
  if (p.sohEstimate !== undefined) ctx.addIssue({ code: "custom", message: "Estimate provenance persistence is not implemented" });
  if (!sensorFields.some(k => p[k] !== undefined)) ctx.addIssue({ code: "custom", message: "A measured reading is required" });
  if (p.vMin !== undefined && p.vMax !== undefined && p.vMin > p.vMax) ctx.addIssue({ code: "custom", message: "Cell minimum exceeds maximum" });
  if (p.tPack !== undefined && p.tMax !== undefined && p.tPack > p.tMax) ctx.addIssue({ code: "custom", message: "Pack temperature exceeds maximum" });
});
export type DeviceTelemetry = z.infer<typeof deviceTelemetrySchema>;
export type PhysicalEnvelope = Partial<Record<typeof sensorFields[number], { min: number; max: number }>>;
export interface VerifiedDeviceBinding {
  deviceId: string; bpan: string; batteryId: number;
  ownerId: number; registeredBy: number; status: string;
  apiKeyId: number; hardwareProfileEvidence: string; envelope: PhysicalEnvelope;
}
export function validatePhysicalEnvelope(payload: DeviceTelemetry, binding: VerifiedDeviceBinding, now = Date.now()): boolean {
  const date = Date.parse(payload.recordedAt);
  // Initial pilot is fresh-only. Replay requires a separately designed idempotent path.
  if (!Number.isFinite(date) || date > now + 30000 || date < now - 300000) return false;
  if (!binding.hardwareProfileEvidence || binding.status !== "active" || binding.ownerId <= 0 || binding.ownerId !== binding.registeredBy || binding.batteryId <= 0 || binding.bpan !== payload.bpan || binding.deviceId !== payload.deviceId) return false;
  return sensorFields.every(k => {
    if (payload[k] === undefined) return true;
    const limit = binding.envelope[k];
    return !!limit && Number.isFinite(limit.min) && Number.isFinite(limit.max) && limit.min <= limit.max && payload[k]! >= limit.min && payload[k]! <= limit.max;
  });
}
export function canManageDevice(actor: { id: number; role?: string }, device: { registeredBy: number | null }): boolean {
  return actor.role === "admin" || (actor.id > 0 && device.registeredBy === actor.id);
}
export function publicDevice<T extends { mqttPassword?: unknown; mqttUsername?: unknown }>(device: T): Omit<T, "mqttPassword" | "mqttUsername"> {
  const { mqttPassword: _secret, mqttUsername: _username, ...dto } = device;
  return dto;
}
export function heartbeatPatch(status: string, now: Date): { lastSeen: Date } | null {
  return status === "active" ? { lastSeen: now } : null;
}
export function topicMatchesDevice(topic: string, prefix: string, payload: Pick<DeviceTelemetry, "bpan" | "deviceId">): boolean {
  return !!prefix && !/[+#]/.test(prefix) && topic === `${prefix}/${payload.bpan}/${payload.deviceId}`;
}

export interface VerifiedRestIngestAdapter {
  // Must resolve *persisted* key/device/battery/owner/profile mapping; not request claims.
  resolve: (keyId: number, deviceId: string) => Promise<VerifiedDeviceBinding | null>;
  // Must recheck active key/device/owner in one transaction, persist provenance,
  // and heartbeat ONLY that still-active device without setting status.
  commit: (payload: DeviceTelemetry, binding: VerifiedDeviceBinding) => Promise<{ readingId: number }>;
}
let verifiedRestAdapter: VerifiedRestIngestAdapter | null = null;
// No router/environment toggle exposes this; a reviewed server-side integration is required.
export function configureVerifiedRestIngest(adapter: VerifiedRestIngestAdapter | null): void { verifiedRestAdapter = adapter; }
export async function ingestVerifiedRest(key: { id: number; userId: number; status: string; scopes: unknown; expiresAt?: Date | null }, payload: DeviceTelemetry): Promise<{ readingId: number }> {
  if (!verifiedRestAdapter) throw new DeviceBoundaryError(503, "verified_device_ingestion_unavailable");
  if (key.status !== "active" || key.userId <= 0 || (key.expiresAt && key.expiresAt.getTime() <= Date.now()) || !Array.isArray(key.scopes) || !key.scopes.includes("telemetry:write")) throw new DeviceBoundaryError(403, "device_not_authorized");
  const binding = await verifiedRestAdapter.resolve(key.id, payload.deviceId);
  if (!binding || binding.apiKeyId !== key.id || binding.ownerId !== key.userId || !validatePhysicalEnvelope(payload, binding)) throw new DeviceBoundaryError(403, "device_not_authorized");
  const result = await verifiedRestAdapter.commit(payload, binding);
  if (!Number.isSafeInteger(result.readingId) || result.readingId <= 0) throw new DeviceBoundaryError(503, "ingestion_not_confirmed");
  return result;
}
export class DeviceBoundaryError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
