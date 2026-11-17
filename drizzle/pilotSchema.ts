import { pgTable, serial, uuid, integer, text, timestamp, jsonb, unique, check, foreignKey, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./schema";
import type { PilotCreateAsset, PilotReading } from "../shared/localPilotContract";
const time = (name: string) => timestamp(name, { mode: "date", withTimezone: true });
export const pilotAssets = pgTable("local_pilot_assets", {
  id: serial("id").primaryKey(), assetRef: uuid("asset_ref").notNull().unique(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  namespace: text("namespace").default("LOCAL_PILOT").notNull(), version: text("version").default("local-pilot-asset/1").notNull(),
  manufacturerSerial: text("manufacturer_serial").notNull(),
  profile: jsonb("profile").$type<PilotCreateAsset>().notNull(),
  officialBpan: text("official_bpan"), officialAllocationStatus: text("official_allocation_status"),
  officialVerification: text("official_verification").default("unverified").notNull(),
  createdAt: time("created_at").defaultNow().notNull(),
}, t => [
  unique("local_pilot_asset_owner_uq").on(t.assetRef, t.ownerId),
  check("local_pilot_local_only", sql`${t.namespace} = 'LOCAL_PILOT' AND ${t.version} = 'local-pilot-asset/1' AND ${t.officialBpan} IS NULL AND ${t.officialAllocationStatus} IS NULL AND ${t.officialVerification} = 'unverified'`),
  check("local_pilot_assets_manufacturer_serial_check", sql`length(${t.manufacturerSerial}) BETWEEN 1 AND 200`),
  check("local_pilot_assets_profile_check", sql`jsonb_typeof(${t.profile}) = 'object'`),
  index("local_pilot_assets_owner_idx").on(t.ownerId, t.id.desc()),
]);
export const pilotProvenance = pgTable("local_pilot_provenance", {
  id: serial("id").primaryKey(), assetRef: uuid("asset_ref").notNull().unique().references(() => pilotAssets.assetRef),
  source: text("source").notNull(), observedAt: time("observed_at").notNull(), evidenceReference: text("evidence_reference").notNull(),
  attestedBy: integer("attested_by").notNull().references(() => users.id), attestedAt: time("attested_at").notNull(), consentEvidence: text("consent_evidence").notNull(),
  createdAt: time("created_at").defaultNow().notNull(),
}, t => [
  foreignKey({ columns: [t.assetRef, t.attestedBy], foreignColumns: [pilotAssets.assetRef, pilotAssets.ownerId] }),
  check("local_pilot_provenance_source_check", sql`${t.source} = 'physical-label-and-owner-attestation'`),
  check("local_pilot_provenance_evidence_reference_check", sql`length(${t.evidenceReference}) BETWEEN 1 AND 200`),
  check("local_pilot_provenance_consent_evidence_check", sql`length(${t.consentEvidence}) BETWEEN 1 AND 200`),
]);
export const pilotDevices = pgTable("local_pilot_devices", {
  id: serial("id").primaryKey(), deviceRef: uuid("device_ref").notNull().unique(),
  assetRef: uuid("asset_ref").notNull().references(() => pilotAssets.assetRef), ownerId: integer("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(), captureRevision: text("capture_revision").notNull(), credentialHash: text("credential_hash").notNull().unique(),
  revokedAt: time("revoked_at"), lastSeenAt: time("last_seen_at"), createdAt: time("created_at").defaultNow().notNull(),
}, t => [
  foreignKey({ columns: [t.assetRef, t.ownerId], foreignColumns: [pilotAssets.assetRef, pilotAssets.ownerId] }),
  unique("local_pilot_device_asset_uq").on(t.deviceRef, t.assetRef),
  check("local_pilot_devices_name_check", sql`length(${t.name}) BETWEEN 1 AND 200`),
  check("local_pilot_devices_capture_revision_check", sql`length(${t.captureRevision}) BETWEEN 1 AND 200`),
  check("local_pilot_devices_credential_hash_check", sql`${t.credentialHash} ~ '^[a-f0-9]{64}$'`),
  index("local_pilot_devices_asset_idx").on(t.assetRef),
]);
export const pilotReadings = pgTable("local_pilot_readings", {
  id: serial("id").primaryKey(), assetRef: uuid("asset_ref").notNull().references(() => pilotAssets.assetRef), deviceRef: uuid("device_ref").notNull().references(() => pilotDevices.deviceRef),
  sampleId: uuid("sample_id").notNull(), source: text("source").default("BMS_REPORTED").notNull(),
  recordedAt: time("recorded_at").notNull(), receivedAt: time("received_at").defaultNow().notNull(),
  payload: jsonb("payload").$type<PilotReading>().notNull(), payloadHash: text("payload_hash").notNull(),
}, t => [
  unique("local_pilot_sample_uq").on(t.assetRef, t.sampleId),
  foreignKey({ columns: [t.deviceRef, t.assetRef], foreignColumns: [pilotDevices.deviceRef, pilotDevices.assetRef] }),
  check("local_pilot_readings_source_check", sql`${t.source} = 'BMS_REPORTED'`),
  check("local_pilot_readings_payload_check", sql`jsonb_typeof(${t.payload}) = 'object' AND (${t.payload}->>'source' = 'BMS_REPORTED') IS TRUE`),
  check("local_pilot_readings_payload_hash_check", sql`${t.payloadHash} ~ '^[a-f0-9]{64}$'`),
  index("local_pilot_readings_latest_idx").on(t.assetRef, t.id.desc()),
]);
// SQL-only append-only/revocation guards live in reviewed local-pilot.sql.
// Do not replace that migration with a generated schema push lacking these triggers.
