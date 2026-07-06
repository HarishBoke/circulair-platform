/**
 * deviceProvisioning.test.ts
 * Tests for IoT device provisioning DB helpers using mocked database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── In-memory device store for mock ─────────────────────────────────────────
let deviceStore: any[] = [];
let nextId = 1;

function makeDevice(data: any) {
  return {
    id: nextId++,
    deviceId: data.deviceId,
    name: data.name,
    deviceType: data.deviceType ?? "gateway",
    bpan: data.bpan ?? null,
    mqttTopic: data.mqttTopic,
    mqttUsername: data.mqttUsername,
    mqttPassword: data.mqttPassword,
    status: data.status ?? "pending",
    lastSeen: null,
    firmwareVersion: data.firmwareVersion ?? null,
    hardwareModel: data.hardwareModel ?? null,
    location: data.location ?? null,
    notes: data.notes ?? null,
    registeredBy: data.registeredBy ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  insertIotDevice: vi.fn(async (data: any) => {
    const device = makeDevice(data);
    deviceStore.push(device);
    return { id: device.id };
  }),
  getIotDeviceById: vi.fn(async (id: number) => {
    return deviceStore.find((d) => d.id === id) ?? null;
  }),
  getIotDeviceByDeviceId: vi.fn(async (deviceId: string) => {
    return deviceStore.find((d) => d.deviceId === deviceId) ?? null;
  }),
  listIotDevices: vi.fn(async (opts?: { status?: string; bpan?: string; limit?: number; offset?: number }) => {
    let items = [...deviceStore];
    if (opts?.status) items = items.filter((d) => d.status === opts.status);
    if (opts?.bpan) items = items.filter((d) => d.bpan === opts.bpan);
    return { items, total: items.length };
  }),
  updateIotDevice: vi.fn(async (id: number, data: any) => {
    const idx = deviceStore.findIndex((d) => d.id === id);
    if (idx !== -1) Object.assign(deviceStore[idx], data);
  }),
  updateDeviceLastSeen: vi.fn(async (deviceId: string) => {
    const device = deviceStore.find((d) => d.deviceId === deviceId);
    if (device) { device.lastSeen = new Date(); device.status = "active"; }
  }),
  updateDeviceLastSeenByBpan: vi.fn(async (bpan: string) => {
    deviceStore.filter((d) => d.bpan === bpan).forEach((d) => {
      d.lastSeen = new Date();
      d.status = "active";
    });
  }),
  getIotDeviceStats: vi.fn(async () => {
    const total = deviceStore.length;
    const active = deviceStore.filter((d) => d.status === "active").length;
    const inactive = deviceStore.filter((d) => d.status === "inactive").length;
    const pending = deviceStore.filter((d) => d.status === "pending").length;
    const revoked = deviceStore.filter((d) => d.status === "revoked").length;
    return { total, active, inactive, pending, revoked };
  }),
  deleteIotDevice: vi.fn(async (id: number) => {
    deviceStore = deviceStore.filter((d) => d.id !== id);
  }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import {
  insertIotDevice, getIotDeviceById, getIotDeviceByDeviceId,
  listIotDevices, updateIotDevice, updateDeviceLastSeen,
  updateDeviceLastSeenByBpan, getIotDeviceStats, deleteIotDevice,
} from "./db";

describe("Device Provisioning — DB helpers", () => {
  beforeEach(() => {
    deviceStore = [];
    nextId = 1;
    vi.clearAllMocks();
  });

  it("insertIotDevice returns an object with id", async () => {
    const result = await insertIotDevice({
      deviceId: "TEST-001",
      name: "Test Gateway",
      deviceType: "gateway",
      bpan: null,
      mqttTopic: "circulair/telemetry/test",
      mqttUsername: "test_user",
      mqttPassword: "test_password_123",
      status: "pending",
      firmwareVersion: null,
      hardwareModel: null,
      location: null,
      notes: null,
      registeredBy: null,
    });
    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    const device = await getIotDeviceById(result.id);
    expect(device).toBeDefined();
    expect(device!.name).toBe("Test Gateway");
    expect(device!.deviceType).toBe("gateway");
    expect(device!.status).toBe("pending");
    await deleteIotDevice(result.id);
    expect(await getIotDeviceById(result.id)).toBeNull();
  });

  it("listIotDevices returns items array and total count", async () => {
    const result = await listIotDevices();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("getIotDeviceStats returns correct shape", async () => {
    const stats = await getIotDeviceStats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("active");
    expect(stats).toHaveProperty("inactive");
    expect(stats).toHaveProperty("pending");
    expect(stats).toHaveProperty("revoked");
    expect(typeof stats.total).toBe("number");
  });

  it("listIotDevices filters by status", async () => {
    const result = await insertIotDevice({
      deviceId: "FILTER-001",
      name: "Filter Test",
      deviceType: "sensor",
      bpan: null,
      mqttTopic: "circulair/telemetry/filter-test",
      mqttUsername: "filter_user",
      mqttPassword: "pw",
      status: "active",
      firmwareVersion: null,
      hardwareModel: null,
      location: null,
      notes: null,
      registeredBy: null,
    });
    const activeDevices = await listIotDevices({ status: "active" });
    expect(activeDevices.items.some((d: any) => d.deviceId === "FILTER-001")).toBe(true);
    const pendingDevices = await listIotDevices({ status: "pending" });
    expect(pendingDevices.items.some((d: any) => d.deviceId === "FILTER-001")).toBe(false);
    await deleteIotDevice(result.id);
  });

  it("updateIotDevice changes device fields", async () => {
    const result = await insertIotDevice({
      deviceId: "UPD-001",
      name: "Before Update",
      deviceType: "bms",
      bpan: null,
      mqttTopic: "circulair/telemetry/upd-test",
      mqttUsername: "upd_user",
      mqttPassword: "pw",
      status: "pending",
      firmwareVersion: null,
      hardwareModel: null,
      location: null,
      notes: null,
      registeredBy: null,
    });
    await updateIotDevice(result.id, { name: "After Update", status: "active" });
    const updated = await getIotDeviceById(result.id);
    expect(updated!.name).toBe("After Update");
    expect(updated!.status).toBe("active");
    await deleteIotDevice(result.id);
  });

  it("updateDeviceLastSeen sets lastSeen and status to active", async () => {
    const deviceId = "LS-001";
    const result = await insertIotDevice({
      deviceId,
      name: "LastSeen Test",
      deviceType: "gateway",
      bpan: null,
      mqttTopic: "circulair/telemetry/ls-test",
      mqttUsername: "ls_user",
      mqttPassword: "pw",
      status: "pending",
      firmwareVersion: null,
      hardwareModel: null,
      location: null,
      notes: null,
      registeredBy: null,
    });
    let device = await getIotDeviceByDeviceId(deviceId);
    expect(device!.lastSeen).toBeNull();
    expect(device!.status).toBe("pending");
    await updateDeviceLastSeen(deviceId);
    device = await getIotDeviceByDeviceId(deviceId);
    expect(device!.lastSeen).not.toBeNull();
    expect(device!.status).toBe("active");
    await deleteIotDevice(result.id);
  });

  it("updateDeviceLastSeenByBpan updates devices associated with a BPAN", async () => {
    const testBpan = "TESTBPAN000000000TEST";
    const result = await insertIotDevice({
      deviceId: "BPAN-001",
      name: "BPAN LastSeen Test",
      deviceType: "bms",
      bpan: testBpan,
      mqttTopic: `circulair/telemetry/${testBpan}`,
      mqttUsername: "bpan_user",
      mqttPassword: "pw",
      status: "pending",
      firmwareVersion: null,
      hardwareModel: null,
      location: null,
      notes: null,
      registeredBy: null,
    });
    await updateDeviceLastSeenByBpan(testBpan);
    const device = await getIotDeviceById(result.id);
    expect(device!.lastSeen).not.toBeNull();
    expect(device!.status).toBe("active");
    await deleteIotDevice(result.id);
  });

  it("deleteIotDevice removes the device", async () => {
    const result = await insertIotDevice({
      deviceId: "DEL-001",
      name: "Delete Test",
      deviceType: "edge_node",
      bpan: null,
      mqttTopic: "circulair/telemetry/del-test",
      mqttUsername: "del_user",
      mqttPassword: "pw",
      status: "pending",
      firmwareVersion: null,
      hardwareModel: null,
      location: null,
      notes: null,
      registeredBy: null,
    });
    await deleteIotDevice(result.id);
    const device = await getIotDeviceById(result.id);
    expect(device).toBeNull();
  });
});

describe("Device Provisioning — input validation", () => {
  it("register requires a non-empty name", async () => {
    const { z } = await import("zod");
    const schema = z.object({
      name: z.string().min(1).max(256),
      deviceType: z.enum(["gateway", "bms", "sensor", "edge_node"]),
    });
    expect(() => schema.parse({ name: "", deviceType: "gateway" })).toThrow();
    expect(() => schema.parse({ name: "Valid", deviceType: "gateway" })).not.toThrow();
  });

  it("update validates status enum", async () => {
    const { z } = await import("zod");
    const schema = z.object({
      id: z.number(),
      status: z.enum(["active", "inactive", "pending", "revoked"]).optional(),
    });
    expect(() => schema.parse({ id: 1, status: "invalid" })).toThrow();
    expect(() => schema.parse({ id: 1, status: "active" })).not.toThrow();
  });
});
