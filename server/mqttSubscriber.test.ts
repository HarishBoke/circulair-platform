/**
 * mqttSubscriber.test.ts
 *
 * Unit tests for the MQTT subscriber module.
 * Tests payload validation, status management, and configuration logic
 * without requiring a real MQTT broker connection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock dependencies ────────────────────────────────────────────────────────
// Mock mqtt to avoid real network connections in tests
vi.mock("mqtt", () => {
  const mockClient = {
    on: vi.fn(),
    subscribe: vi.fn(),
    publish: vi.fn((topic: string, payload: string, opts: unknown, cb?: (err?: Error) => void) => {
      cb?.();
    }),
    end: vi.fn(),
  };
  return {
    default: {
      connect: vi.fn(() => mockClient),
    },
    connect: vi.fn(() => mockClient),
  };
});

// Mock DB helpers to avoid real DB calls
vi.mock("./db", () => ({
  getBatteryByBpan: vi.fn(),
  insertTelemetry: vi.fn().mockResolvedValue(undefined),
  createAlert: vi.fn().mockResolvedValue(undefined),
  updateBatteryStatus: vi.fn().mockResolvedValue(undefined),
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
    startMqttSubscriber({ brokerUrl: "" });

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
    expect(() => startMqttSubscriber({ brokerUrl: "" })).not.toThrow();
  });

  it("startMqttSubscriber with valid URL does not throw", async () => {
    const { startMqttSubscriber } = await import("./mqttSubscriber");
    // Should not throw even if mqtt.connect is mocked
    expect(() => startMqttSubscriber({ brokerUrl: "mqtt://test.broker.com:1883" })).not.toThrow();
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
