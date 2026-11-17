import { z } from "zod";

export const PILOT_NAMESPACE = "LOCAL_PILOT" as const;
export const PILOT_VERSION = "local-pilot-asset/1" as const;
export const PILOT_LABEL = "LOCAL / NON-AUTHORITATIVE — NOT GOVERNMENT BPAN";
export const PILOT_MAX_BYTES = 8192;
export const PILOT_STALE_MS = 300_000;
export const PILOT_FUTURE_MS = 30_000;
export const pilotAssetRefSchema = z.string().uuid();
const text = z.string().min(1).max(200).refine(v => v.trim().length > 0 && !/[\x00-\x1f\x7f]/.test(v), "Nonblank bounded text required");
const finite = z.number().finite();
export const pilotMetrics = ["vPack", "iPack", "tPack", "socReported"] as const;
export const pilotUnits = { vPack: "V", iPack: "A", tPack: "degC", socReported: "%" } as const;
const range = (min: number, max: number) => z.object({ min: finite.min(min).max(max), max: finite.min(min).max(max) }).strict().refine(v => v.min <= v.max, "Minimum exceeds maximum");
export const pilotEnvelopeSchema = z.object({
  vPack: range(0, 1_000_000),
  iPack: range(-1_000_000, 1_000_000).optional(),
  tPack: range(-273.15, 10_000).optional(),
  socReported: range(0, 100).optional(),
}).strict();
export const pilotCreateAssetSchema = z.object({
  manufacturerSerial: text, // Exact physical serial: never normalize or replace with the local UUID.
  manufacturer: text.optional(), model: text.optional(), chemistry: text,
  nominalVoltage: z.object({ value: finite.positive().max(1_000_000), unit: z.literal("V") }).strict(),
  ratedCapacity: z.object({ value: finite.positive().max(1_000_000_000), unit: z.enum(["Ah", "kWh"]) }).strict(),
  specificationEvidence: text, specificationRevision: text,
  interfaceDescription: text, interfaceRevision: text, procedureRevision: text,
  currentSignConvention: text,
  units: z.object({ vPack: z.literal("V"), iPack: z.literal("A"), tPack: z.literal("degC"), socReported: z.literal("%") }).strict(),
  acceptedReadingEnvelope: pilotEnvelopeSchema,
  ownerAttestation: z.object({ consent: z.literal(true), attestedAt: z.string().datetime({ offset: true }), evidenceReference: text }).strict(),
  provenance: z.object({ source: z.literal("physical-label-and-owner-attestation"), observedAt: z.string().datetime({ offset: true }), evidenceReference: text }).strict(),
}).strict();
export type PilotCreateAsset = z.infer<typeof pilotCreateAssetSchema>;
export const pilotProvisionSchema = z.object({ assetRef: pilotAssetRefSchema, name: text, captureRevision: text }).strict();
export const pilotReadingSchema = z.object({
  sampleId: z.string().uuid(), recordedAt: z.string().datetime({ offset: true }),
  source: z.literal("BMS_REPORTED"), captureRevision: text,
  metrics: z.object({ vPack: finite.min(0).max(1_000_000).optional(), iPack: finite.min(-1_000_000).max(1_000_000).optional(), tPack: finite.min(-273.15).max(10_000).optional(), socReported: finite.min(0).max(100).optional() }).strict().refine(v => pilotMetrics.some(k => v[k] !== undefined), "At least one actual BMS-reported metric required"),
  units: z.object({ vPack: z.literal("V").optional(), iPack: z.literal("A").optional(), tPack: z.literal("degC").optional(), socReported: z.literal("%").optional() }).strict(),
}).strict().superRefine((v, ctx) => {
  for (const k of pilotMetrics) if ((v.metrics[k] !== undefined) !== (v.units[k] !== undefined)) ctx.addIssue({ code: "custom", path: ["units", k], message: "Exactly one documented unit per supplied metric required" });
});
export type PilotReading = z.infer<typeof pilotReadingSchema>;
export class PilotError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export function validatePilotReading(reading: PilotReading, profile: PilotCreateAsset, captureRevision: string, now = Date.now()) {
  const timestamp = Date.parse(reading.recordedAt);
  if (timestamp < now - PILOT_STALE_MS || timestamp > now + PILOT_FUTURE_MS || !Number.isFinite(timestamp)) throw new PilotError(422, "pilot_timestamp_outside_fresh_window");
  if (reading.captureRevision !== captureRevision) throw new PilotError(422, "pilot_capture_revision_mismatch");
  for (const k of pilotMetrics) {
    const value = reading.metrics[k];
    if (value === undefined) continue;
    const envelope = profile.acceptedReadingEnvelope[k];
    if (!envelope || value < envelope.min || value > envelope.max || reading.units[k] !== profile.units[k]) throw new PilotError(422, "pilot_reading_outside_accepted_envelope");
  }
}
export function validatePilotAttestation(input: PilotCreateAsset, now = Date.now()) {
  if ([input.ownerAttestation.attestedAt, input.provenance.observedAt].some(v => Date.parse(v) > now + PILOT_FUTURE_MS)) throw new PilotError(422, "pilot_attestation_future");
}
export function pilotEnabled() { return process.env.LOCAL_PILOT_ENABLED === "true"; }
export function requirePilotEnabled() { if (!pilotEnabled()) throw new PilotError(503, "local_pilot_disabled_pending_acceptance"); }
