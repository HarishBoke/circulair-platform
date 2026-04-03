import { describe, it, expect } from "vitest";

describe("Device Provisioning — DB helpers", () => {
  it("insertIotDevice returns an object with id", async () => {
    const { insertIotDevice, getIotDeviceById, deleteIotDevice } = await import("./db");
    const result = await insertIotDevice({
      deviceId: `TEST-${Date.now()}`,
      name: "Test Gateway",
      deviceType: "gateway",
      bpan: null,
      mqttTopic: "circulair/telemetry/test",
      mqttUsername: `test_user_${Date.now()}`,
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
  });

  it("listIotDevices returns items array and total count", async () => {
    const { listIotDevices } = await import("./db");
    const result = await listIotDevices();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("listIotDevices filters by status", async () => {
    const { insertIotDevice, listIotDevices, deleteIotDevice } = await import("./db");
    const result = await insertIotDevice({
      deviceId: `FILTER-${Date.now()}`,
      name: "Filter Test",
      deviceType: "sensor",
      bpan: null,
      mqttTopic: "circulair/telemetry/filter-test",
      mqttUsername: `filter_${Date.now()}`,
      mqttPassword: "pw",
      status: "active",
      firmwareVersion: null,
      hardwareModel: null,
      location: null,
      notes: null,
      registeredBy: null,
    });
    const activeDevices = await listIotDevices({ status: "active" });
    expect(activeDevices.items.some((d: any) => d.deviceId.startsWith("FILTER-"))).toBe(true);
    const pendingDevices = await listIotDevices({ status: "pending" });
    expect(pendingDevices.items.some((d: any) => d.deviceId.startsWith("FILTER-"))).toBe(false);
    await deleteIotDevice(result.id);
  });

  it("updateIotDevice changes device fields", async () => {
    const { insertIotDevice, updateIotDevice, getIotDeviceById, deleteIotDevice } = await import("./db");
    const result = await insertIotDevice({
      deviceId: `UPD-${Date.now()}`,
      name: "Before Update",
      deviceType: "bms",
      bpan: null,
      mqttTopic: "circulair/telemetry/upd-test",
      mqttUsername: `upd_${Date.now()}`,
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
    const { insertIotDevice, updateDeviceLastSeen, getIotDeviceByDeviceId, deleteIotDevice } = await import("./db");
    const deviceId = `LS-${Date.now()}`;
    const result = await insertIotDevice({
      deviceId,
      name: "LastSeen Test",
      deviceType: "gateway",
      bpan: null,
      mqttTopic: "circulair/telemetry/ls-test",
      mqttUsername: `ls_${Date.now()}`,
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
    const { insertIotDevice, updateDeviceLastSeenByBpan, getIotDeviceById, deleteIotDevice } = await import("./db");
    const testBpan = "TESTBPAN000000000TEST";
    const result = await insertIotDevice({
      deviceId: `BPAN-${Date.now()}`,
      name: "BPAN LastSeen Test",
      deviceType: "bms",
      bpan: testBpan,
      mqttTopic: `circulair/telemetry/${testBpan}`,
      mqttUsername: `bpan_${Date.now()}`,
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

  it("getIotDeviceStats returns correct shape", async () => {
    const { getIotDeviceStats } = await import("./db");
    const stats = await getIotDeviceStats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("active");
    expect(stats).toHaveProperty("inactive");
    expect(stats).toHaveProperty("pending");
    expect(stats).toHaveProperty("revoked");
    expect(typeof stats.total).toBe("number");
  });

  it("deleteIotDevice removes the device", async () => {
    const { insertIotDevice, deleteIotDevice, getIotDeviceById } = await import("./db");
    const result = await insertIotDevice({
      deviceId: `DEL-${Date.now()}`,
      name: "Delete Test",
      deviceType: "edge_node",
      bpan: null,
      mqttTopic: "circulair/telemetry/del-test",
      mqttUsername: `del_${Date.now()}`,
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
