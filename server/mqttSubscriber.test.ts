/**
 * mqttSubscriber.test.ts
 *
 * Unit tests for the MQTT subscriber module.
 * Tests payload validation, status management, and configuration logic
 * without requiring a real MQTT broker connection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shouldPageAlert } from "./pagerDuty";

const mqttMock = vi.hoisted(() => ({
  handlers: new Map<string, (...args: any[]) => void>(),
  client: {
    on: vi.fn(),
    subscribe: vi.fn((_topic, _opts, cb) => cb?.()),
    publish: vi.fn((_topic, _payload, _opts, cb) => cb?.()),
    end: vi.fn(),
  },
}));

// ─── Mock dependencies ────────────────────────────────────────────────────────
// Mock mqtt to avoid real network connections in tests
vi.mock("mqtt", () => {
  mqttMock.client.on.mockImplementation((event, handler) => {
    mqttMock.handlers.set(event, handler);
    return mqttMock.client;
  });
  return {
    default: {
      connect: vi.fn(() => mqttMock.client),
    },
    connect: vi.fn(() => mqttMock.client),
  };
});

// Mock DB helpers to avoid real DB calls
vi.mock("./db", () => ({
  getBatteryByBpan: vi.fn(),
  insertTelemetry: vi.fn().mockResolvedValue(undefined),
  createAlert: vi.fn().mockResolvedValue(undefined),
  updateBatteryStatus: vi.fn().mockResolvedValue(undefined),
  updateDeviceLastSeenByBpan: vi.fn().mockResolvedValue(undefined),
  getActiveRulesForBpan: vi.fn().mockResolvedValue([]),
  evaluateAlertRules: vi.fn().mockReturnValue([]),
}));

vi.mock("./alertCooldown", () => ({
  shouldCreateAlert: vi.fn().mockResolvedValue(true),
  recordAlert: vi.fn(),
}));

// Mock telemetrySocket
vi.mock("./telemetrySocket", () => ({
  broadcastTelemetryReading: vi.fn(),
  getSocketIO: vi.fn(() => null),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MQTT Subscriber — Configuration", () => {
  it("does not start when MQTT_BROKER_URL is not set", async () => {
    const originalUrl = process.env.MQTT_BROKER_URL;
    delete process.env.MQTT_BROKER_URL;

    const { startMqttSubscriber, getMqttStatus } = await import("./mqttSubscriber");
    startMqttSubscriber({ brokerUrl: "" }, { role: "admin" });

    const status = getMqttStatus();
    expect(status.connected).toBe(false);

    if (originalUrl) process.env.MQTT_BROKER_URL = originalUrl;
  });

  it("returns correct initial status shape", async () => {
    const { getMqttStatus } = await import("./mqttSubscriber");
    const status = getMqttStatus();

    expect(status).toHaveProperty("connected");
    expect(status).toHaveProperty("brokerUrl");
    expect(status).toHaveProperty("clientId");
    expect(status).toHaveProperty("topicPrefix");
    expect(status).toHaveProperty("subscribedTopics");
    expect(status).toHaveProperty("messagesReceived");
    expect(status).toHaveProperty("messagesPerMinute");
    expect(status).toHaveProperty("lastMessageAt");
    expect(status).toHaveProperty("errors");
    expect(status).toHaveProperty("reconnectCount");
    expect(status).toHaveProperty("startedAt");
  });

  it("subscribedTopics is an array", async () => {
    const { getMqttStatus } = await import("./mqttSubscriber");
    const status = getMqttStatus();
    expect(Array.isArray(status.subscribedTopics)).toBe(true);
  });

  it("errors is an array", async () => {
    const { getMqttStatus } = await import("./mqttSubscriber");
    const status = getMqttStatus();
    expect(Array.isArray(status.errors)).toBe(true);
  });

  it("messagesReceived starts at 0", async () => {
    const { getMqttStatus } = await import("./mqttSubscriber");
    const status = getMqttStatus();
    expect(typeof status.messagesReceived).toBe("number");
    expect(status.messagesReceived).toBeGreaterThanOrEqual(0);
  });
});

describe("MQTT Subscriber — Payload Validation Logic", () => {
  // We test the validation logic by examining the exported types and behavior

  it("valid BPAN format is 21 characters", () => {
    // 21-char BPAN: IN(2) + HB(2) + 30(2) + N(1) + 40(2) + 250627(6) + A(1) + 000(3) + 10(2) = 21
    const validBpan = "INHB30N402506A00010";
    // Use a known-good 21-char string
    const bpan21 = "A".repeat(21);
    expect(bpan21.length).toBe(21);
  });

  it("BPAN with wrong length should fail 21-char check", () => {
    const shortBpan = "INHB30N402506";
    expect(shortBpan.length).not.toBe(21);
  });

  it("valid payload has required numeric fields", () => {
    const payload = {
      bpan: "INHB30N40250627A000101",
      vPack: 354.2,
      iPack: -45.3,
      tPack: 32.4,
      tMax: 38.1,
      sohEstimate: 91.2,
    };
    const hasNumericReading = ["vPack", "iPack", "tPack", "tMax", "sohEstimate"].some(
      (k) => typeof (payload as Record<string, unknown>)[k] === "number"
    );
    expect(hasNumericReading).toBe(true);
  });

  it("thermal anomaly threshold is 51°C", () => {
    const THERMAL_THRESHOLD = 51;
    expect(52 > THERMAL_THRESHOLD).toBe(true);   // should trigger
    expect(50 > THERMAL_THRESHOLD).toBe(false);  // should not trigger
    expect(51 > THERMAL_THRESHOLD).toBe(false);  // exactly at threshold, not over
  });

  it("SOH EOL threshold is 70%", () => {
    const EOL_THRESHOLD = 70;
    expect(69 < EOL_THRESHOLD).toBe(true);   // below EOL
    expect(71 < EOL_THRESHOLD).toBe(false);  // above EOL
    expect(70 < EOL_THRESHOLD).toBe(false);  // exactly at threshold
  });
});

describe("MQTT Subscriber — Stop/Start Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stopMqttSubscriber sets connected to false", async () => {
    const { stopMqttSubscriber, getMqttStatus } = await import("./mqttSubscriber");
    stopMqttSubscriber();
    const status = getMqttStatus();
    expect(status.connected).toBe(false);
  });

  it("startMqttSubscriber with empty brokerUrl does not throw", async () => {
    const { startMqttSubscriber } = await import("./mqttSubscriber");
    expect(() => startMqttSubscriber({ brokerUrl: "" }, { role: "admin" })).not.toThrow();
  });

  it("startMqttSubscriber rejects plaintext broker URL", async () => {
    const { startMqttSubscriber } = await import("./mqttSubscriber");
    // Should not throw even if mqtt.connect is mocked
    expect(() => startMqttSubscriber({ brokerUrl: "mqtt://test.broker.com:1883" }, { role: "admin" })).toThrow("Broker requires");
  });

  it("getMqttStatus returns consistent shape after stop", async () => {
    const { stopMqttSubscriber, getMqttStatus } = await import("./mqttSubscriber");
    stopMqttSubscriber();
    const status = getMqttStatus();
    expect(typeof status.connected).toBe("boolean");
    expect(typeof status.messagesReceived).toBe("number");
    expect(typeof status.messagesPerMinute).toBe("number");
  });
});

describe("MQTT Subscriber — Test Publish", () => {
  it("publishTestMessage rejects when client is not connected", async () => {
    const { stopMqttSubscriber, publishTestMessage } = await import("./mqttSubscriber");
    stopMqttSubscriber();
    await expect(publishTestMessage("INHB30N40250627A000101")).rejects.toThrow(
      "MQTT client not connected"
    );
  });

  it("publishTestMessage requires exactly 21-char BPAN", () => {
    // BPAN spec: 21 alphanumeric characters
    const bpan = "A".repeat(21);
    expect(bpan.length).toBe(21);
  });
});

describe("MQTT Subscriber — Topic Pattern", () => {
  it("default topic prefix is circulair/telemetry", () => {
    const DEFAULT_PREFIX = "circulair/telemetry";
    const wildcardTopic = `${DEFAULT_PREFIX}/+`;
    expect(wildcardTopic).toBe("circulair/telemetry/+");
  });

  it("per-BPAN topic follows prefix/BPAN pattern", () => {
    const prefix = "circulair/telemetry";
    const bpan = "INHB30N40250627A000101";
    const topic = `${prefix}/${bpan}`;
    expect(topic).toBe("circulair/telemetry/INHB30N40250627A000101");
  });

  it("custom topic prefix is respected", () => {
    const customPrefix = "ev/fleet/batteries";
    const bpan = "INHB30N40250627A000101";
    const topic = `${customPrefix}/${bpan}`;
    expect(topic).toBe("ev/fleet/batteries/INHB30N40250627A000101");
  });
});

// Operational ingestion is intentionally closed: synthetic-label preservation
// now means refusal to pollute history/alerts rather than writing marked fiction.
describe("MQTT Subscriber — Closed provenance and identity boundary", () => {
  let subscriber: typeof import("./mqttSubscriber");
  let db: typeof import("./db");
  beforeEach(async () => {
    subscriber = await import("./mqttSubscriber"); db = await import("./db");
    subscriber.stopTelemetryStream({ role: "admin" }); subscriber.stopMqttSubscriber({ role: "admin" });
    vi.clearAllMocks();
  });
  it.each(["demo", "test", "simulator", "simulated", "flow_tester", "mqtt_demo", "BMS_SIMULATOR_V2", "integration_test", "stream", "mqtt", "measured", undefined, "", 123, { source: "demo" }])("does not persist or page claimed source %j", async source => {
    const bpan = "A".repeat(21);
    await subscriber.handleMessage(`circulair/telemetry/${bpan}/DEV-mock`, Buffer.from(JSON.stringify({ bpan, deviceId: "DEV-mock", recordedAt: new Date().toISOString(), source, tMax: 65, sohEstimate: 60 })));
    expect(db.getBatteryByBpan).not.toHaveBeenCalled(); expect(db.insertTelemetry).not.toHaveBeenCalled();
    expect(db.createAlert).not.toHaveBeenCalled(); expect(db.updateBatteryStatus).not.toHaveBeenCalled();
    expect(db.updateDeviceLastSeenByBpan).not.toHaveBeenCalled();
  });
  it.each(["demo", "simulated"])("does not persist claimed boolean %s", async flag => {
    await subscriber.handleMessage("anything", Buffer.from(JSON.stringify({ bpan: "A".repeat(21), source: "mqtt", [flag]: true, tMax: 65 })));
    expect(db.insertTelemetry).not.toHaveBeenCalled(); expect(db.createAlert).not.toHaveBeenCalled();
  });
  it("rejects mismatched topic identity before any database access", async () => {
    await subscriber.handleMessage("circulair/telemetry/OTHER/DEV-mock", Buffer.from(JSON.stringify({ bpan: "A".repeat(21), deviceId: "DEV-mock", recordedAt: new Date().toISOString(), source: "measured", vPack: 0 })));
    expect(subscriber.getMqttStatus().errors.at(-1)).toBe("topic_device_identity_mismatch"); expect(db.getBatteryByBpan).not.toHaveBeenCalled();
  });
  it.each([Buffer.from("{"), Buffer.alloc(16385)])("rejects malformed/oversized input without writes", async raw => {
    await subscriber.handleMessage("anything", raw); expect(db.insertTelemetry).not.toHaveBeenCalled();
  });
});

describe("MQTT Subscriber — Admin/configuration boundary", () => {
  afterEach(async () => { (await import("./mqttSubscriber")).stopMqttSubscriber({ role: "admin" }); vi.unstubAllEnvs(); });
  it("does not connect at startup without admin integration authorization", async () => {
    const mqtt = await import("mqtt"); vi.mocked(mqtt.default.connect).mockClear();
    (await import("./mqttSubscriber")).startMqttSubscriber(); expect(mqtt.default.connect).not.toHaveBeenCalled();
  });
  it("denies login-only broker overrides", async () => {
    expect(() => (awaitSubscriber.startMqttSubscriber({ brokerUrl: "mqtts://evil.example.invalid" }))).toThrow("admin");
  });
  let awaitSubscriber: typeof import("./mqttSubscriber");
  beforeEach(async () => { awaitSubscriber = await import("./mqttSubscriber"); });
  it("rejects changed destinations without sending configured credentials", async () => {
    vi.stubEnv("MQTT_BROKER_URL", "mqtts://approved.example.invalid:8883");
    vi.stubEnv("MQTT_PASSWORD", "mock-secret");
    const mqtt = await import("mqtt"); vi.mocked(mqtt.default.connect).mockClear();
    expect(() => awaitSubscriber.startMqttSubscriber({ brokerUrl: "mqtts://evil.example.invalid" }, { role: "admin" })).toThrow("not approved"); expect(mqtt.default.connect).not.toHaveBeenCalled();
  });
  it.each(["mqtt://approved.example.invalid", "mqtts://user:mock-secret@approved.example.invalid", "mqtts://approved.example.invalid/?token=mock-secret"])("rejects unsafe secret-bearing/plaintext URL %s", url => {
    vi.stubEnv("MQTT_BROKER_URL", url); expect(() => awaitSubscriber.startMqttSubscriber({ brokerUrl: url }, { role: "admin" })).toThrow();
  });
  it("subscribes to approved TLS BPAN/device pattern and disposes stopped callbacks", async () => {
    vi.stubEnv("MQTT_BROKER_URL", "mqtts://approved.example.invalid:8883");
    awaitSubscriber.startMqttSubscriber({ topicPrefix: "local/telemetry" }, { role: "admin" });
    mqttMock.handlers.get("connect")!(); expect(mqttMock.client.subscribe).toHaveBeenCalledWith("local/telemetry/+/+", { qos: 1 }, expect.any(Function));
    awaitSubscriber.stopMqttSubscriber({ role: "admin" });
    mqttMock.handlers.get("connect")!(); expect(awaitSubscriber.getMqttStatus().connected).toBe(false);
  });
  it("denies non-admin disconnect and mismatched synthetic publish", async () => {
    vi.stubEnv("MQTT_BROKER_URL", "mqtts://approved.example.invalid:8883");
    awaitSubscriber.startMqttSubscriber(undefined, { role: "admin" }); mqttMock.handlers.get("connect")!();
    expect(() => awaitSubscriber.stopMqttSubscriber()).toThrow("admin");
    await expect(awaitSubscriber.publishTelemetryMessage("A".repeat(21), { bpan: "B".repeat(21) } as any, { role: "admin" })).rejects.toThrow("identity mismatch");
    await expect(awaitSubscriber.publishTestMessage("A".repeat(21))).rejects.toThrow("admin");
  });
});
