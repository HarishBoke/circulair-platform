import { and, desc, eq, sql } from "drizzle-orm";
import { iotDevices } from "../drizzle/schema";
import { getDb } from "./db";

// Explicit SQL projection: routine responses never select the password/username.
const safeColumns = {
  id: iotDevices.id, deviceId: iotDevices.deviceId, name: iotDevices.name,
  deviceType: iotDevices.deviceType, bpan: iotDevices.bpan,
  mqttTopic: iotDevices.mqttTopic, status: iotDevices.status,
  lastSeen: iotDevices.lastSeen, firmwareVersion: iotDevices.firmwareVersion,
  hardwareModel: iotDevices.hardwareModel, location: iotDevices.location,
  notes: iotDevices.notes, registeredBy: iotDevices.registeredBy,
  createdAt: iotDevices.createdAt, updatedAt: iotDevices.updatedAt,
};
export async function listOwnedDevices(actor: { id: number; role?: string }, opts?: { limit?: number; offset?: number; status?: string; bpan?: string }) {
  if (!Number.isSafeInteger(actor.id) || actor.id <= 0) throw new Error("Device access denied");
  const db = await getDb();
  if (!db) throw new Error("Device store unavailable");
  const conditions = [eq(iotDevices.registeredBy, actor.id)];
  // Admin is deliberately owner-scoped too; a distinct audited fleet endpoint is required.
  if (opts?.status) conditions.push(eq(iotDevices.status, opts.status as any));
  if (opts?.bpan) conditions.push(eq(iotDevices.bpan, opts.bpan));
  const where = and(...conditions);
  const [items, counts] = await Promise.all([
    db.select(safeColumns).from(iotDevices).where(where).orderBy(desc(iotDevices.createdAt)).limit(Math.min(opts?.limit ?? 50, 100)).offset(opts?.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(iotDevices).where(where),
  ]);
  return { items, total: Number(counts[0]?.count ?? 0) };
}
export async function getOwnedDevice(actor: { id: number }, id: number) {
  if (!Number.isSafeInteger(actor.id) || actor.id <= 0 || !Number.isSafeInteger(id) || id <= 0) return null;
  const db = await getDb();
  if (!db) throw new Error("Device store unavailable");
  const rows = await db.select(safeColumns).from(iotDevices).where(and(eq(iotDevices.id, id), eq(iotDevices.registeredBy, actor.id))).limit(1);
  return rows[0] ?? null;
}
export async function getOwnedDeviceStats(actor: { id: number }) {
  if (!Number.isSafeInteger(actor.id) || actor.id <= 0) throw new Error("Device access denied");
  const db = await getDb();
  if (!db) throw new Error("Device store unavailable");
  const rows = await db.select({ status: iotDevices.status, count: sql<number>`count(*)` }).from(iotDevices).where(eq(iotDevices.registeredBy, actor.id)).groupBy(iotDevices.status);
  const stats = { total: 0, active: 0, inactive: 0, pending: 0, revoked: 0 };
  for (const row of rows) {
    const count = Number(row.count); stats.total += count;
    if (row.status in stats && row.status !== "total") stats[row.status as keyof Omit<typeof stats, "total">] += count;
  }
  return stats;
}
