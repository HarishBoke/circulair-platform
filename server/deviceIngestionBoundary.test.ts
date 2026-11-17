import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canManageDevice, configureVerifiedRestIngest, deviceTelemetrySchema, heartbeatPatch, ingestVerifiedRest, publicDevice, topicMatchesDevice, validatePhysicalEnvelope, type VerifiedDeviceBinding } from "./deviceIngestionBoundary";

const bpan = "A".repeat(21);
const reading = () => ({ bpan, deviceId: "DEV-mock", recordedAt: new Date().toISOString(), source: "measured" as const, vPack: 0, iPack: 0, cycleCount: 0 });
const binding = (): VerifiedDeviceBinding => ({ bpan, deviceId: "DEV-mock", batteryId: 12, ownerId: 7, registeredBy: 7, apiKeyId: 9, status: "active", hardwareProfileEvidence: "offline-fixture-not-safety-spec", envelope: { vPack: { min: 0, max: 1 }, iPack: { min: -1, max: 1 }, cycleCount: { min: 0, max: 1 } } });
const key = { id: 9, userId: 7, status: "active", scopes: ["telemetry:write"] };
afterEach(() => configureVerifiedRestIngest(null));
describe("Strict measured payload", () => {
  it.each([19, 21])("allows exact %i character registry syntax without truncation", length => expect(deviceTelemetrySchema.safeParse({ ...reading(), bpan: "A".repeat(length) }).success).toBe(true));
  it.each(["", "a".repeat(21), "A".repeat(20), " A".repeat(21)])("rejects invalid BPAN %j", value => expect(deviceTelemetrySchema.safeParse({ ...reading(), bpan: value }).success).toBe(false));
  it("preserves explicit zero", () => expect(deviceTelemetrySchema.parse(reading())).toMatchObject({ vPack: 0, iPack: 0, cycleCount: 0 }));
  it("does not fabricate omitted measurements", () => expect(deviceTelemetrySchema.parse({ ...reading(), iPack: undefined })).not.toHaveProperty("sohEstimate"));
  it.each([{ vPack: NaN }, { vPack: Infinity }, { vPack: -1 }, { sohEstimate: 101 }, { cycleCount: 0.5 }, { cycleCount: -1 }, { tMax: -274 }, { vMin: 3, vMax: 2 }, { tPack: 2, tMax: 1 }, { dtcCodes: ["<script>"] }, { recordedAt: "2026-02-31T00:00:00Z" }, { batteryId: 0 }, { soc: 50 }, { inferred: true }, { source: "test" }, { deviceId: "" }, { vPack: "0" }])("rejects invalid measurement/unsupported provenance %j", invalid => expect(deviceTelemetrySchema.safeParse({ ...reading(), ...invalid }).success).toBe(false));
  it("requires a reading, device identity and date", () => {
    expect(deviceTelemetrySchema.safeParse({ bpan, source: "measured" }).success).toBe(false);
    expect(deviceTelemetrySchema.safeParse({ bpan, deviceId: "D", recordedAt: new Date().toISOString(), source: "measured" }).success).toBe(false);
  });
});
describe("Owner/topic/profile and heartbeat boundaries", () => {
  it("denies another tenant and unowned devices", () => {
    expect(canManageDevice({ id: 7 }, { registeredBy: 7 })).toBe(true);
    expect(canManageDevice({ id: 8 }, { registeredBy: 7 })).toBe(false);
    expect(canManageDevice({ id: 7 }, { registeredBy: null })).toBe(false);
    expect(canManageDevice({ id: 8, role: "admin" }, { registeredBy: 7 })).toBe(true);
  });
  it("routine DTO does not expose credentials", () => expect(publicDevice({ name: "fixture", mqttPassword: "mock-secret", mqttUsername: "mock-user" })).toEqual({ name: "fixture" }));
  it.each(["revoked", "inactive", "pending"])("heartbeat cannot activate %s", status => expect(heartbeatPatch(status, new Date())).toBeNull());
  it("active heartbeat changes timestamp only", () => expect(heartbeatPatch("active", new Date(0))).toEqual({ lastSeen: new Date(0) }));
  it("binds exact topic/battery/device", () => {
    expect(topicMatchesDevice(`local/${bpan}/DEV-mock`, "local", reading())).toBe(true);
    expect(topicMatchesDevice(`local/${bpan}/DEV-other`, "local", reading())).toBe(false);
    expect(topicMatchesDevice(`local/${"B".repeat(21)}/DEV-mock`, "local", reading())).toBe(false);
    expect(topicMatchesDevice(`local/${bpan}/DEV-mock/extra`, "local", reading())).toBe(false);
  });
  it("requires provisioned physical limits for every metric", () => {
    expect(validatePhysicalEnvelope(reading(), binding())).toBe(true);
    expect(validatePhysicalEnvelope(reading(), { ...binding(), envelope: {} })).toBe(false);
    expect(validatePhysicalEnvelope({ ...reading(), vPack: 2 }, binding())).toBe(false);
  });
  it.each([{ status: "revoked" }, { status: "pending" }, { ownerId: 8 }, { batteryId: 0 }, { deviceId: "other" }, { bpan: "B".repeat(21) }, { hardwareProfileEvidence: "" }])("denies bad persisted mapping %j", change => expect(validatePhysicalEnvelope(reading(), { ...binding(), ...change })).toBe(false));
  it("rejects stale or future readings", () => {
    expect(validatePhysicalEnvelope({ ...reading(), recordedAt: new Date(Date.now() - 300001).toISOString() }, binding())).toBe(false);
    expect(validatePhysicalEnvelope({ ...reading(), recordedAt: new Date(Date.now() + 30001).toISOString() }, binding())).toBe(false);
  });
});
describe("Verified REST integration adapter (offline only)", () => {
  const resolve = vi.fn(); const commit = vi.fn();
  beforeEach(() => { resolve.mockReset().mockResolvedValue(binding()); commit.mockReset().mockResolvedValue({ readingId: 45 }); configureVerifiedRestIngest({ resolve, commit }); });
  it("default adapter is unavailable with no success or persistence", async () => {
    configureVerifiedRestIngest(null);
    await expect(ingestVerifiedRest(key, reading())).rejects.toMatchObject({ status: 503 });
    expect(commit).not.toHaveBeenCalled();
  });
  it.each([{ status: "revoked" }, { scopes: [] }, { userId: 8 }, { expiresAt: new Date(0) }])("denies invalid API key %j", async change => {
    await expect(ingestVerifiedRest({ ...key, ...change }, reading())).rejects.toMatchObject({ status: 403 }); expect(commit).not.toHaveBeenCalled();
  });
  it("denies missing/wrong key-device binding", async () => {
    resolve.mockResolvedValue(null); await expect(ingestVerifiedRest(key, reading())).rejects.toMatchObject({ status: 403 });
    resolve.mockResolvedValue({ ...binding(), apiKeyId: 10 }); await expect(ingestVerifiedRest(key, reading())).rejects.toMatchObject({ status: 403 }); expect(commit).not.toHaveBeenCalled();
  });
  it("returns only a confirmed persisted reading ID", async () => {
    await expect(ingestVerifiedRest(key, reading())).resolves.toEqual({ readingId: 45 }); expect(commit).toHaveBeenCalledOnce();
    commit.mockResolvedValue({ readingId: 0 }); await expect(ingestVerifiedRest(key, reading())).rejects.toMatchObject({ status: 503 });
  });
  it("propagates transactional revocation/failure without fabricated success", async () => {
    commit.mockRejectedValue(new Error("mock revocation during transaction"));
    await expect(ingestVerifiedRest(key, reading())).rejects.toThrow("mock revocation");
  });
});
