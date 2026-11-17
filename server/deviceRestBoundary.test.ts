import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ validate: vi.fn(), battery: vi.fn(), insert: vi.fn(), heartbeat: vi.fn(), broadcast: vi.fn() }));
vi.mock("./compliance", () => ({ validateApiKey: mock.validate, logApiUsage: vi.fn(), writeAuditLog: vi.fn(), writeSecurityEvent: vi.fn(), generateTraceId: () => "offline-trace" }));
vi.mock("./openapi", () => ({ openapiSpec: {} }));
vi.mock("./db", () => ({ getBatteryByBpan: mock.battery, insertTelemetry: mock.insert, updateDeviceLastSeenByBpan: mock.heartbeat, listBatteries: vi.fn(), getLatestTelemetry: vi.fn(), getTelemetryHistory: vi.fn(), getLatestSohPrediction: vi.fn(), listMarketplace: vi.fn(), getMarketplaceStats: vi.fn(), listEprTokens: vi.fn(), getEprStats: vi.fn(), getBatteryStats: vi.fn(), createAlert: vi.fn() }));
vi.mock("./telemetrySocket", () => ({ broadcastTelemetryReading: mock.broadcast }));
vi.mock("./db-warranty", () => ({ lookupWarranty: vi.fn(), listWarrantyRecords: vi.fn(), getWarrantyStats: vi.fn(), computeWarrantyStatus: vi.fn(), getWarrantyByBpan: vi.fn() }));
import { createApiGateway } from "./apiGateway";
import { configureVerifiedRestIngest } from "./deviceIngestionBoundary";
const bpan = "A".repeat(21);
const key = { id: 9, userId: 7, status: "active", scopes: ["telemetry:write", "telemetry:read", "batteries:read"] };
function response() { const res: any = { statusCode: 200, body: null, setHeader: vi.fn(), on: vi.fn() }; res.status = vi.fn((code: number) => { res.statusCode = code; return res; }); res.json = vi.fn((body: unknown) => { res.body = body; return res; }); return res; }
function telemetry() { return { bpan, deviceId: "DEV-mock", source: "measured", recordedAt: new Date().toISOString(), iPack: 0 }; }
function layer(path: string, method = "post") { return (createApiGateway() as any).stack.find((x: any) => x.route?.path === path && x.route.methods[method]).route.stack[0].handle; }
function middlewares() { return (createApiGateway() as any).stack.filter((x: any) => !x.route).map((x: any) => x.handle); }
beforeEach(() => { vi.clearAllMocks(); configureVerifiedRestIngest(null); mock.validate.mockResolvedValue(key); mock.battery.mockResolvedValue({ id: 12, bpan, ownerId: 7 }); });
describe("Actual REST gateway device and API-key handlers (no HTTP transport)", () => {
  it("valid shape returns 503 with no persisted device adapter", async () => {
    const res = response(); await layer("/batteries/:bpan/telemetry")({ params: { bpan }, body: telemetry(), apiKey: key }, res);
    expect(res.statusCode).toBe(503); expect(res.body).toEqual({ error: "verified_device_ingestion_unavailable" });
    expect(mock.insert).not.toHaveBeenCalled(); expect(mock.heartbeat).not.toHaveBeenCalled(); expect(mock.broadcast).not.toHaveBeenCalled();
  });
  it.each([{ bpan: "B".repeat(21) }, { deviceId: undefined }, { source: "test" }, { batteryId: 0 }, { cycleCount: -1 }, { sohEstimate: 101 }])("invalid/path mismatched payload rejected with no writes %j", async change => {
    const res = response(); await layer("/batteries/:bpan/telemetry")({ params: { bpan }, body: { ...telemetry(), ...change }, apiKey: key }, res);
    expect(res.statusCode).toBe(400); expect(mock.insert).not.toHaveBeenCalled();
  });
  it("returns generic adapter failure without credential/error disclosure", async () => {
    configureVerifiedRestIngest({ resolve: async () => { throw new Error("mock-private-secret"); }, commit: vi.fn() });
    const res = response(); await layer("/batteries/:bpan/telemetry")({ params: { bpan }, body: telemetry(), apiKey: key }, res);
    expect(res.body).toEqual({ error: "ingestion_not_confirmed" });
  });
  it.each([undefined, "Bearer malformed", "Basic cai_" + "a".repeat(32)])("rejects invalid Authorization %j before key verification", async authorization => {
    const res = response(), next = vi.fn(); await middlewares()[0]({ headers: { authorization } }, res, next);
    expect(res.statusCode).toBe(401); expect(next).not.toHaveBeenCalled(); expect(mock.validate).not.toHaveBeenCalled();
  });
  it.each([null, { ...key, status: "revoked" }, { ...key, expiresAt: new Date(0) }])("rejects inactive/missing/expired key", async value => {
    mock.validate.mockResolvedValue(value); const res = response(), next = vi.fn();
    await middlewares()[0]({ headers: { authorization: "Bearer cai_" + "a".repeat(32) } }, res, next);
    expect(res.statusCode).toBe(401); expect(next).not.toHaveBeenCalled();
  });
  it("authentication failure is sanitized and unavailable", async () => {
    mock.validate.mockRejectedValue(new Error("mock-secret")); const res = response();
    await middlewares()[0]({ headers: { authorization: "Bearer cai_" + "a".repeat(32) } }, res, vi.fn()); expect(res.body).toEqual({ error: "authentication_unavailable" });
  });
  it.each(["/batteries", "/warranty/lookup", "/compliance/epr", "/stats/batteries", "/marketplace"])("legacy unscoped path %s is disabled", async path => {
    const res = response(), next = vi.fn(); await middlewares()[3]({ path, method: "GET", apiKey: key }, res, next);
    expect(res.statusCode).toBe(503); expect(next).not.toHaveBeenCalled(); expect(mock.battery).not.toHaveBeenCalled();
  });
  it.each([{ ...key, userId: 8 }, { ...key, scopes: [] }])("cross-owner or missing scope denied", async apiKey => {
    const res = response(), next = vi.fn(); await middlewares()[3]({ path: `/batteries/${bpan}/telemetry`, method: "GET", apiKey }, res, next);
    expect(res.statusCode).toBe(403); expect(next).not.toHaveBeenCalled();
  });
  it("read-only exact battery owner/scope passes", async () => {
    const res = response(), next = vi.fn(); await middlewares()[3]({ path: `/batteries/${bpan}/telemetry`, method: "GET", apiKey: key }, res, next);
    expect(next).toHaveBeenCalledOnce(); expect(mock.battery).toHaveBeenCalledWith(bpan);
  });
});
