import { randomBytes, randomUUID, createHash } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { pilotAssets, pilotDevices, pilotProvenance, pilotReadings } from "../drizzle/pilotSchema";
import { PilotError, pilotCreateAssetSchema, pilotProvisionSchema, pilotReadingSchema, pilotAssetRefSchema, requirePilotEnabled, validatePilotAttestation, validatePilotReading, type PilotCreateAsset, type PilotReading } from "../shared/localPilotContract";

export function hashPilotToken(token: string) { return createHash("sha256").update(token, "utf8").digest("hex"); }
function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, value]) => `${JSON.stringify(k)}:${canonical(value)}`).join(",")}}`;
}
export function hashPilotReading(payload: PilotReading) { return createHash("sha256").update(canonical(payload)).digest("hex"); }
const deviceProjection = { id: pilotDevices.id, deviceRef: pilotDevices.deviceRef, assetRef: pilotDevices.assetRef, name: pilotDevices.name, captureRevision: pilotDevices.captureRevision, revokedAt: pilotDevices.revokedAt, lastSeenAt: pilotDevices.lastSeenAt, createdAt: pilotDevices.createdAt };
function actorId(ownerId: number) { if (!Number.isSafeInteger(ownerId) || ownerId <= 0) throw new PilotError(404, "pilot_asset_not_found"); }
function positiveId(id: number | undefined) { if (!Number.isSafeInteger(id) || !id || id <= 0) throw new PilotError(503, "pilot_persistence_unconfirmed"); }
async function defaultDb() { const { getDb } = await import("./db"); return getDb(); }
export function createPilotStore(getDatabase: () => Promise<NodePgDatabase | null> = defaultDb) {
  async function database() { requirePilotEnabled(); const db = await getDatabase(); if (!db) throw new PilotError(503, "pilot_store_unavailable"); return db; }
  async function owned(db: NodePgDatabase, ownerId: number, assetRef: string) {
    actorId(ownerId); pilotAssetRefSchema.parse(assetRef);
    const [asset] = await db.select().from(pilotAssets).where(and(eq(pilotAssets.assetRef, assetRef), eq(pilotAssets.ownerId, ownerId))).limit(1);
    if (!asset) throw new PilotError(404, "pilot_asset_not_found"); return asset;
  }
  return {
    async createAsset(ownerId: number, raw: PilotCreateAsset) {
      actorId(ownerId); const input = pilotCreateAssetSchema.parse(raw); validatePilotAttestation(input); const db = await database();
      return db.transaction(async tx => {
        const [asset] = await tx.insert(pilotAssets).values({ assetRef: randomUUID(), ownerId, manufacturerSerial: input.manufacturerSerial, profile: input }).returning();
        positiveId(asset?.id);
        const [provenance] = await tx.insert(pilotProvenance).values({ assetRef: asset.assetRef, source: input.provenance.source, observedAt: new Date(input.provenance.observedAt), evidenceReference: input.provenance.evidenceReference, attestedBy: ownerId, attestedAt: new Date(input.ownerAttestation.attestedAt), consentEvidence: input.ownerAttestation.evidenceReference }).returning({ id: pilotProvenance.id });
        positiveId(provenance?.id); return asset;
      });
    },
    async listAssets(ownerId: number) {
      actorId(ownerId); const db = await database();
      return db.select().from(pilotAssets).where(eq(pilotAssets.ownerId, ownerId)).orderBy(desc(pilotAssets.id)).limit(100);
    },
    async getAsset(ownerId: number, assetRef: string) { return owned(await database(), ownerId, assetRef); },
    async provisionDevice(ownerId: number, raw: { assetRef: string; name: string; captureRevision: string }) {
      actorId(ownerId); const input = pilotProvisionSchema.parse(raw); const db = await database();
      return db.transaction(async tx => {
        const [asset] = await tx.select({ assetRef: pilotAssets.assetRef }).from(pilotAssets).where(and(eq(pilotAssets.assetRef, input.assetRef), eq(pilotAssets.ownerId, ownerId))).for("update").limit(1);
        if (!asset) throw new PilotError(404, "pilot_asset_not_found");
        const token = `lp1_${randomBytes(32).toString("base64url")}`;
        const [device] = await tx.insert(pilotDevices).values({ assetRef: asset.assetRef, ownerId, deviceRef: randomUUID(), name: input.name, captureRevision: input.captureRevision, credentialHash: hashPilotToken(token) }).returning(deviceProjection);
        positiveId(device?.id); return { device, token }; // Only initial authenticated provisioning returns plaintext.
      });
    },
    async listDevices(ownerId: number, assetRef: string) {
      const db = await database(); await owned(db, ownerId, assetRef);
      return db.select(deviceProjection).from(pilotDevices).where(and(eq(pilotDevices.assetRef, assetRef), eq(pilotDevices.ownerId, ownerId))).orderBy(desc(pilotDevices.id)).limit(100);
    },
    async revokeDevice(ownerId: number, assetRef: string, deviceRef: string) {
      actorId(ownerId); pilotAssetRefSchema.parse(assetRef); pilotAssetRefSchema.parse(deviceRef); const db = await database();
      return db.transaction(async tx => {
        const [device] = await tx.select(deviceProjection).from(pilotDevices).where(and(eq(pilotDevices.deviceRef, deviceRef), eq(pilotDevices.assetRef, assetRef), eq(pilotDevices.ownerId, ownerId))).for("update").limit(1);
        if (!device) throw new PilotError(404, "pilot_asset_not_found");
        const [asset] = await tx.select({ id: pilotAssets.id }).from(pilotAssets).where(and(eq(pilotAssets.assetRef, assetRef), eq(pilotAssets.ownerId, ownerId))).for("update").limit(1);
        if (!asset) throw new PilotError(404, "pilot_asset_not_found");
        if (device.revokedAt) return device;
        const [revoked] = await tx.update(pilotDevices).set({ revokedAt: sql`clock_timestamp()` }).where(and(eq(pilotDevices.id, device.id), isNull(pilotDevices.revokedAt))).returning(deviceProjection);
        if (!revoked) throw new PilotError(503, "pilot_revocation_unconfirmed"); return revoked;
      });
    },
    async latestReadings(ownerId: number, assetRef: string) {
      const db = await database(); await owned(db, ownerId, assetRef);
      return db.select({ id: pilotReadings.id, assetRef: pilotReadings.assetRef, deviceRef: pilotReadings.deviceRef, sampleId: pilotReadings.sampleId, source: pilotReadings.source, recordedAt: pilotReadings.recordedAt, receivedAt: pilotReadings.receivedAt, payload: pilotReadings.payload }).from(pilotReadings).where(eq(pilotReadings.assetRef, assetRef)).orderBy(desc(pilotReadings.id)).limit(50);
    },
    async ingest(assetRef: string, token: string, raw: PilotReading) {
      pilotAssetRefSchema.parse(assetRef);
      if (!/^lp1_[A-Za-z0-9_-]{43}$/.test(token)) throw new PilotError(401, "pilot_device_not_authorized");
      const payload = pilotReadingSchema.parse(raw); const payloadHash = hashPilotReading(payload); const db = await database();
      return db.transaction(async tx => {
        // Device lock serializes revocation; asset lock serializes all device sample-ID collisions.
        // No pre-transaction credential decision is trusted at persistence time.
        const [device] = await tx.select().from(pilotDevices).where(and(eq(pilotDevices.credentialHash, hashPilotToken(token)), eq(pilotDevices.assetRef, assetRef))).for("update").limit(1);
        if (!device || device.revokedAt) throw new PilotError(401, "pilot_device_not_authorized");
        const [asset] = await tx.select().from(pilotAssets).where(and(eq(pilotAssets.assetRef, assetRef), eq(pilotAssets.ownerId, device.ownerId))).for("update").limit(1);
        if (!asset) throw new PilotError(401, "pilot_device_not_authorized");
        const [previous] = await tx.select({ id: pilotReadings.id, deviceRef: pilotReadings.deviceRef, payloadHash: pilotReadings.payloadHash }).from(pilotReadings).where(and(eq(pilotReadings.assetRef, assetRef), eq(pilotReadings.sampleId, payload.sampleId))).limit(1);
        if (previous) {
          if (previous.payloadHash !== payloadHash || previous.deviceRef !== device.deviceRef) throw new PilotError(409, "pilot_sample_payload_conflict");
          positiveId(previous.id); return { readingId: previous.id, assetRef, sampleId: payload.sampleId, duplicate: true };
        }
        const clock = await tx.execute<{ now: Date | string }>(sql`SELECT clock_timestamp() AS now`);
        const now = new Date(clock.rows[0].now).getTime();
        const profile = pilotCreateAssetSchema.parse(asset.profile);
        validatePilotReading(payload, profile, device.captureRevision, now);
        const [reading] = await tx.insert(pilotReadings).values({ assetRef, deviceRef: device.deviceRef, sampleId: payload.sampleId, recordedAt: new Date(payload.recordedAt), source: "BMS_REPORTED", payload, payloadHash }).returning({ id: pilotReadings.id });
        positiveId(reading?.id);
        const heartbeat = await tx.update(pilotDevices).set({ lastSeenAt: new Date(now) }).where(and(eq(pilotDevices.id, device.id), isNull(pilotDevices.revokedAt))).returning({ id: pilotDevices.id });
        positiveId(heartbeat[0]?.id); // A failed heartbeat rolls back the entire reading.
        return { readingId: reading.id, assetRef, sampleId: payload.sampleId, duplicate: false };
      }); // Receipt is returned only AFTER transaction commit resolves.
    },
  };
}
export const localPilotStore = createPilotStore();
export type LocalPilotStore = ReturnType<typeof createPilotStore>;
