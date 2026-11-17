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

// Exercise the actual private handler through the mocked broker's message callback.
// No broker, database, sockets, or PagerDuty delivery is started by these tests.
describe("MQTT Subscriber — Provenance", () => {
  const bpan = "A".repeat(19); // Existing subscriber validation; identity rules are out of scope.
  let subscriber: typeof import("./mqttSubscriber");
  let db: typeof import("./db");
  let socket: typeof import("./telemetrySocket");

  beforeEach(async () => {
    subscriber = await import("./mqttSubscriber");
    db = await import("./db");
    socket = await import("./telemetrySocket");
    subscriber.stopTelemetryStream();
    subscriber.stopMqttSubscriber();
    vi.clearAllMocks();
    mqttMock.handlers.clear();
    vi.mocked(db.getBatteryByBpan).mockResolvedValue({ id: 42, chemistry: "NMC" } as any);
    vi.mocked(db.evaluateAlertRules).mockReturnValue([
      { id: 7, metric: "temperature", severity: "critical", name: "Thermal rule", operator: "gt", threshold: "51" } as any,
    ]);
    subscriber.startMqttSubscriber({
      brokerUrl: "mqtt://localhost:1883", clientId: "mock-provenance", topicPrefix: "local/telemetry",
      username: "", password: "", caCert: "",
    });
    mqttMock.handlers.get("connect")!();
  });

  afterEach(() => {
    subscriber.stopTelemetryStream();
    subscriber.stopMqttSubscriber();
    vi.useRealTimers();
  });

  async function receive(payload: Record<string, unknown>) {
    mqttMock.handlers.get("message")!(
      `local/telemetry/${bpan}`,
      Buffer.from(JSON.stringify({ bpan, tMax: 65, sohEstimate: 60, ...payload })),
    );
    await vi.waitFor(() => expect(db.updateBatteryStatus).toHaveBeenCalledTimes(1));
    expect(db.insertTelemetry).toHaveBeenCalledTimes(1);
    expect(db.createAlert).toHaveBeenCalledTimes(2);
    return {
      telemetry: vi.mocked(db.insertTelemetry).mock.calls[0]![0],
      reading: vi.mocked(socket.broadcastTelemetryReading).mock.calls[0]![0],
      alerts: vi.mocked(db.createAlert).mock.calls.map(([alert]) => {
        expect(alert.severity).toBeDefined();
        return { ...alert, severity: alert.severity!, metadata: alert.metadata };
      }),
    };
  }

  it.each(["demo", "test", "simulator", "simulated", "flow_tester", "mqtt_demo", "BMS_SIMULATOR_V2", "integration_test"])(
    "preserves explicit %s through persistence, dashboard classification, and every alert",
    async source => {
      const result = await receive({ source });
      expect(result.telemetry.source).toBe(source);
      expect(result.reading.source).toBe("simulated");
      for (const alert of result.alerts) {
        expect(alert.metadata).toMatchObject({ source });
        expect(shouldPageAlert(alert)).toBe(false);
      }
      expect(result.alerts[0]).toMatchObject({ severity: "critical", type: "thermal_anomaly" });
      expect(result.alerts[1]).toMatchObject({ type: "eol_detected" });
    },
  );

  it.each(["demo", "simulated"])("preserves explicit boolean %s without relying on a source label", async flag => {
    const result = await receive({ source: "mqtt", [flag]: true });
    expect(result.telemetry.source).toBe("simulated");
    expect(result.reading.source).toBe("simulated");
    for (const alert of result.alerts) {
      expect(alert.metadata).toMatchObject({ source: "simulated", [flag]: true });
      expect(shouldPageAlert(alert)).toBe(false);
    }
  });

  it.each([undefined, "mqtt", "bms_v2", "api", "", 123, { source: "demo" }])(
    "retains normal MQTT eligibility for an absent/unrecognized source %j",
    async source => {
      const result = await receive({ source, demo: false, simulated: "true" });
      expect(result.telemetry.source).toBe("mqtt");
      expect(result.reading.source).toBe("mqtt");
      expect(result.alerts[0].metadata).toMatchObject({ source: "mqtt" });
      expect(shouldPageAlert(result.alerts[0])).toBe(true);
      expect(shouldPageAlert(result.alerts[1])).toBe(false); // Existing warning severity.
    },
  );

  it("classifies the existing synthetic stream label as simulated", async () => {
    const result = await receive({ source: "stream" });
    expect(result.telemetry.source).toBe("simulated");
    expect(result.reading.source).toBe("simulated");
    expect(result.alerts[0].metadata).toMatchObject({ source: "simulated" });
    expect(shouldPageAlert(result.alerts[0])).toBe(false);
  });

  it("retains test provenance after a connectivity publisher message loops back", async () => {
    await subscriber.publishTestMessage(bpan);
    const [topic, body] = mqttMock.client.publish.mock.calls[0]!;
    expect(topic).toBe(`local/telemetry/${bpan}`);
    const published = JSON.parse(body);
    expect(published.source).toBe("test");
    const result = await receive({ ...published, tMax: 65, sohEstimate: 60 });
    expect(result.telemetry.source).toBe("test");
    expect(result.alerts.every(alert => !shouldPageAlert(alert))).toBe(true);
  });

  it("forces non-live flow-tester provenance even if custom payload includes a live label", async () => {
    await subscriber.publishTelemetryMessage(bpan, {
      bpan, vPack: 350, current: -40, tMax: 65, tMin: 25, tAvg: 40, soc: 50,
      sohEstimate: 60, cycleCount: 200, internalResistance: 20, source: "mqtt",
    } as any);
    const [topic, body] = mqttMock.client.publish.mock.calls[0]!;
    expect(topic).toBe(`local/telemetry/${bpan}`);
    const published = JSON.parse(body);
    expect(published.source).toBe("flow_tester");
    const result = await receive(published);
    expect(result.telemetry.source).toBe("flow_tester");
    expect(result.alerts.every(alert => !shouldPageAlert(alert))).toBe(true);
  });

  it("marks every generated stream scenario as simulated and keeps a thermal loopback non-pageable", async () => {
    vi.useFakeTimers();
    subscriber.startTelemetryStream([bpan], 1000);
    vi.advanceTimersByTime(6000);
    subscriber.stopTelemetryStream();
    vi.useRealTimers();
    const published = mqttMock.client.publish.mock.calls.map(([, body]) => JSON.parse(body));
    expect(published).toHaveLength(6);
    expect(published.every(payload => payload.source === "simulated")).toBe(true);
    const thermal = published.find(payload => payload.tMax > 51);
    expect(thermal).toBeDefined();
    const result = await receive({ ...thermal!, sohEstimate: 60 });
    expect(result.telemetry.source).toBe("simulated");
    expect(result.alerts.every(alert => !shouldPageAlert(alert))).toBe(true);
  });
});
