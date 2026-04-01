/**
 * mqttSubscriber.ts
 *
 * Real MQTT broker subscriber for Circul-AI-r platform.
 *
 * Architecture:
 *   BMS/IoT Device → MQTT Broker (TCP/TLS) → This subscriber
 *     → insertTelemetry (MySQL)
 *     → Socket.io broadcast (/telemetry namespace)
 *     → createAlert (thermal anomaly / EOL detection)
 *
 * Environment variables (set via webdev_request_secrets):
 *   MQTT_BROKER_URL      e.g. "mqtts://broker.hivemq.com:8883"
 *                        or   "mqtt://localhost:1883"  (plain TCP, no TLS)
 *   MQTT_USERNAME        optional — broker username
 *   MQTT_PASSWORD        optional — broker password
 *   MQTT_CLIENT_ID       optional — defaults to "circulair-server-<random>"
 *   MQTT_TOPIC_PREFIX    optional — defaults to "circulair/telemetry"
 *   MQTT_CA_CERT         optional — PEM-encoded CA cert for self-signed brokers
 *
 * Expected MQTT payload (JSON, published to  <prefix>/<BPAN>):
 * {
 *   "bpan":        "INHB30N40250627A000101",  // 21-char BPAN
 *   "vPack":       354.2,    // Pack voltage (V)
 *   "iPack":       -45.3,    // Pack current (A, negative = charging)
 *   "vMin":        3.51,     // Min cell voltage (V)  [optional]
 *   "vMax":        3.58,     // Max cell voltage (V)  [optional]
 *   "tPack":       32.4,     // Pack temperature (°C)
 *   "tMax":        38.1,     // Max cell temperature (°C)
 *   "cycleCount":  342,      // Total charge cycles
 *   "irPack":      18.5,     // Internal resistance (mΩ)
 *   "sohEstimate": 91.2,     // BMS-reported SOH (%)
 *   "dtcCodes":    [],       // Diagnostic trouble codes [optional]
 *   "source":      "bms_v2" // Device identifier [optional]
 * }
 */

import mqtt, { MqttClient, IClientOptions } from "mqtt";
import { nanoid } from "nanoid";
import { getBatteryByBpan, insertTelemetry, createAlert, updateBatteryStatus } from "./db";
import { broadcastTelemetryReading, getSocketIO } from "./telemetrySocket";
import type { TelemetryAnomaly } from "./telemetrySocket";

function broadcastTelemetry(bpan: string, reading: Parameters<typeof broadcastTelemetryReading>[0]): void {
  broadcastTelemetryReading(reading);
}

function broadcastAnomaly(bpan: string, anomaly: TelemetryAnomaly): void {
  const io = getSocketIO();
  if (!io) return;
  const ns = io.of("/telemetry");
  ns.to("anomalies").emit("telemetry:anomaly", anomaly);
}

// ─── Configuration ────────────────────────────────────────────────────────────

export interface MqttConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  clientId?: string;
  topicPrefix?: string;
  caCert?: string;
}

export interface MqttSubscriberStatus {
  connected: boolean;
  brokerUrl: string;
  clientId: string;
  topicPrefix: string;
  subscribedTopics: string[];
  messagesReceived: number;
  messagesPerMinute: number;
  lastMessageAt: string | null;
  errors: string[];
  reconnectCount: number;
  startedAt: string | null;
}

// ─── Singleton state ──────────────────────────────────────────────────────────

let _client: MqttClient | null = null;
let _config: MqttConfig | null = null;
let _status: MqttSubscriberStatus = {
  connected: false,
  brokerUrl: "",
  clientId: "",
  topicPrefix: "circulair/telemetry",
  subscribedTopics: [],
  messagesReceived: 0,
  messagesPerMinute: 0,
  lastMessageAt: null,
  errors: [],
  reconnectCount: 0,
  startedAt: null,
};

// Rolling message counter for rate calculation
const _msgTimestamps: number[] = [];

function calcMessagesPerMinute(): number {
  const now = Date.now();
  const cutoff = now - 60_000;
  // Remove old timestamps
  while (_msgTimestamps.length > 0 && _msgTimestamps[0]! < cutoff) {
    _msgTimestamps.shift();
  }
  return _msgTimestamps.length;
}

// ─── Payload validation ───────────────────────────────────────────────────────

interface MqttPayload {
  bpan?: string;
  vPack?: number;
  iPack?: number;
  vMin?: number;
  vMax?: number;
  tPack?: number;
  tMax?: number;
  cycleCount?: number;
  irPack?: number;
  sohEstimate?: number;
  dtcCodes?: string[];
  source?: string;
  ts?: number;
}

function validatePayload(raw: unknown): MqttPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;

  // bpan is required and must be 21 chars
  if (typeof p.bpan !== "string" || p.bpan.length !== 21) return null;

  // At least one numeric sensor reading required
  const hasReading = ["vPack", "iPack", "tPack", "tMax", "sohEstimate"].some(
    (k) => typeof p[k] === "number"
  );
  if (!hasReading) return null;

  return {
    bpan: p.bpan,
    vPack: typeof p.vPack === "number" ? p.vPack : undefined,
    iPack: typeof p.iPack === "number" ? p.iPack : undefined,
    vMin: typeof p.vMin === "number" ? p.vMin : undefined,
    vMax: typeof p.vMax === "number" ? p.vMax : undefined,
    tPack: typeof p.tPack === "number" ? p.tPack : undefined,
    tMax: typeof p.tMax === "number" ? p.tMax : undefined,
    cycleCount: typeof p.cycleCount === "number" ? Math.floor(p.cycleCount) : undefined,
    irPack: typeof p.irPack === "number" ? p.irPack : undefined,
    sohEstimate: typeof p.sohEstimate === "number" ? p.sohEstimate : undefined,
    dtcCodes: Array.isArray(p.dtcCodes) ? p.dtcCodes.map(String) : undefined,
    source: typeof p.source === "string" ? p.source : "mqtt",
  };
}

// ─── Message handler ──────────────────────────────────────────────────────────

async function handleMessage(topic: string, rawPayload: Buffer): Promise<void> {
  // Track rate
  _msgTimestamps.push(Date.now());
  _status.messagesReceived++;
  _status.lastMessageAt = new Date().toISOString();
  _status.messagesPerMinute = calcMessagesPerMinute();
  console.log(`[MQTT] ← Message received on topic: ${topic} (${rawPayload.length} bytes, total: ${_status.messagesReceived})`);

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload.toString("utf8"));
  } catch {
    _status.errors.push(`[${new Date().toISOString()}] JSON parse error on topic ${topic}`);
    if (_status.errors.length > 20) _status.errors.shift();
    return;
  }

  const payload = validatePayload(parsed);
  if (!payload || !payload.bpan) {
    _status.errors.push(`[${new Date().toISOString()}] Invalid payload on topic ${topic}`);
    if (_status.errors.length > 20) _status.errors.shift();
    return;
  }

  const { bpan } = payload;

  // Look up battery in DB to get batteryId
  let batteryId: number;
  try {
    const battery = await getBatteryByBpan(bpan);
    if (!battery) {
      // Auto-register unknown BPAN with minimal data so telemetry isn't lost
      console.warn(`[MQTT] Unknown BPAN ${bpan} — telemetry received but battery not registered`);
      _status.errors.push(`[${new Date().toISOString()}] Unknown BPAN: ${bpan} — register battery first`);
      if (_status.errors.length > 20) _status.errors.shift();
      return;
    }
    batteryId = battery.id;
  } catch (err) {
    console.error(`[MQTT] DB lookup failed for BPAN ${bpan}:`, err);
    return;
  }

  // Detect anomalies
  const thermalAnomaly = (payload.tMax ?? 0) > 51;
  const anomalyType = thermalAnomaly ? "over_temperature" : null;
  const sohBelowThreshold = (payload.sohEstimate ?? 100) < 70;

  // Persist to DB
  try {
    await insertTelemetry({
      bpan,
      batteryId,
      vPack: payload.vPack?.toString(),
      iPack: payload.iPack?.toString(),
      vMin: payload.vMin?.toString(),
      vMax: payload.vMax?.toString(),
      tPack: payload.tPack?.toString(),
      tMax: payload.tMax?.toString(),
      cycleCount: payload.cycleCount,
      irPack: payload.irPack?.toString(),
      sohEstimate: payload.sohEstimate?.toString(),
      dtcCodes: payload.dtcCodes ?? null,
      thermalAnomaly,
      anomalyType: anomalyType ?? undefined,
      source: "mqtt",
    });
  } catch (err) {
    console.error(`[MQTT] DB insert failed for BPAN ${bpan}:`, err);
    return;
  }

  // Broadcast to Socket.io live dashboard
  const reading = {
    bpan,
    batteryId,
    vPack: payload.vPack ?? 0,
    iPack: payload.iPack ?? 0,
    vMin: payload.vMin ?? 0,
    vMax: payload.vMax ?? 0,
    tPack: payload.tPack ?? 0,
    tMax: payload.tMax ?? 0,
    cycleCount: payload.cycleCount ?? 0,
    irPack: payload.irPack ?? 0,
    sohEstimate: payload.sohEstimate ?? 0,
    thermalAnomaly,
    anomalyType: anomalyType ?? undefined,
    source: "mqtt" as const,
    recordedAt: new Date().toISOString(),
  };
  broadcastTelemetry(bpan, reading);

  // Thermal anomaly — create alert + broadcast anomaly event
  if (thermalAnomaly) {
    broadcastAnomaly(bpan, {
      bpan,
      tMax: payload.tMax ?? 0,
      tPack: payload.tPack ?? 0,
      recordedAt: new Date().toISOString(),
      message: `Thermal anomaly: T_max ${payload.tMax?.toFixed(1)}°C exceeds 51°C threshold`,
    });

    try {
      await createAlert({
        bpan,
        batteryId,
        type: "thermal_anomaly",
        severity: "critical",
        title: `Thermal Anomaly — ${bpan}`,
        message: `Pack temperature T_max = ${payload.tMax?.toFixed(1)}°C exceeds 51°C safety threshold. Immediate inspection required.`,
        metadata: { tMax: payload.tMax, tPack: payload.tPack, source: "mqtt" },
      });
    } catch (err) {
      console.error(`[MQTT] Alert creation failed for BPAN ${bpan}:`, err);
    }
  }

  // SOH below EOL threshold — create alert
  if (sohBelowThreshold) {
    try {
      await createAlert({
        bpan,
        batteryId,
        type: "eol_detected",
        severity: "warning",
        title: `EOL Threshold Reached — ${bpan}`,
        message: `Battery SOH = ${payload.sohEstimate?.toFixed(1)}% has fallen below 70% EOL threshold. Initiate triage workflow.`,
        metadata: { soh: payload.sohEstimate, source: "mqtt" },
      });
      // Update battery status to end_of_life
      await updateBatteryStatus(bpan, "end_of_life", payload.sohEstimate);
    } catch (err) {
      console.error(`[MQTT] EOL alert creation failed for BPAN ${bpan}:`, err);
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the MQTT subscriber. Safe to call multiple times — will disconnect
 * existing client first if already running.
 */
export function startMqttSubscriber(config?: Partial<MqttConfig>): void {
  // Merge with env defaults
  // Auto-prepend mqtts:// for bare hostnames (e.g. "broker.hivemq.com" → "mqtts://broker.hivemq.com")
  const rawBrokerUrl = config?.brokerUrl ?? process.env.MQTT_BROKER_URL ?? "";
  const _validSchemes = ["mqtt://", "mqtts://", "ws://", "wss://", "ssl://"];
  const normalizedBrokerUrl = rawBrokerUrl && !_validSchemes.some(s => rawBrokerUrl.startsWith(s))
    ? `mqtts://${rawBrokerUrl}`
    : rawBrokerUrl;
  if (rawBrokerUrl && rawBrokerUrl !== normalizedBrokerUrl) {
    console.log(`[MQTT] Bare hostname detected — normalised to: ${normalizedBrokerUrl}`);
  }
  const resolved: MqttConfig = {
    brokerUrl: normalizedBrokerUrl,
    username: config?.username ?? process.env.MQTT_USERNAME,
    password: config?.password ?? process.env.MQTT_PASSWORD,
    clientId: config?.clientId ?? process.env.MQTT_CLIENT_ID ?? `circulair-server-${nanoid(8)}`,
    topicPrefix: config?.topicPrefix ?? process.env.MQTT_TOPIC_PREFIX ?? "circulair/telemetry",
    caCert: config?.caCert ?? process.env.MQTT_CA_CERT,
  };

  if (!resolved.brokerUrl) {
    console.log("[MQTT] No MQTT_BROKER_URL configured — subscriber not started. Set MQTT_BROKER_URL to enable real MQTT.");
    return;
  }

  // Disconnect existing client
  if (_client) {
    _client.end(true);
    _client = null;
  }

  _config = resolved;
  _status = {
    ..._status,
    brokerUrl: resolved.brokerUrl,
    clientId: resolved.clientId!,
    topicPrefix: resolved.topicPrefix!,
    connected: false,
    errors: [],
    reconnectCount: 0,
    startedAt: new Date().toISOString(),
  };

  const options: IClientOptions = {
    clientId: resolved.clientId,
    clean: true,
    reconnectPeriod: 5000,      // Reconnect every 5s on disconnect
    connectTimeout: 15_000,     // 15s connection timeout
    keepalive: 60,
    resubscribe: true,
  };

  if (resolved.username) options.username = resolved.username;
  if (resolved.password) options.password = resolved.password;

  // TLS options for mqtts:// URLs
  if (resolved.brokerUrl.startsWith("mqtts://") || resolved.brokerUrl.startsWith("ssl://")) {
    options.rejectUnauthorized = true;
    if (resolved.caCert) {
      options.ca = [Buffer.from(resolved.caCert)];
    }
  }

  console.log(`[MQTT] Connecting to ${resolved.brokerUrl} as ${resolved.clientId}...`);

  _client = mqtt.connect(resolved.brokerUrl, options);

  _client.on("connect", () => {
    console.log(`[MQTT] Connected to ${resolved.brokerUrl}`);
    _status.connected = true;

    // Subscribe to wildcard topic: <prefix>/+  (single level = one BPAN per topic)
    const wildcardTopic = `${resolved.topicPrefix}/+`;
    _client!.subscribe(wildcardTopic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT] Subscribe error:`, err);
        _status.errors.push(`Subscribe error: ${err.message}`);
      } else {
        console.log(`[MQTT] Subscribed to ${wildcardTopic}`);
        _status.subscribedTopics = [wildcardTopic];
      }
    });
  });

  _client.on("message", (topic, message) => {
    handleMessage(topic, message).catch((err) => {
      console.error(`[MQTT] Message handler error:`, err);
    });
  });

  _client.on("reconnect", () => {
    _status.reconnectCount++;
    _status.connected = false;
    console.log(`[MQTT] Reconnecting... (attempt ${_status.reconnectCount})`);
  });

  _client.on("offline", () => {
    _status.connected = false;
    console.log("[MQTT] Client offline");
  });

  _client.on("error", (err) => {
    _status.connected = false;
    const msg = `[${new Date().toISOString()}] ${err.message}`;
    _status.errors.push(msg);
    if (_status.errors.length > 20) _status.errors.shift();
    console.error(`[MQTT] Error:`, err.message);
  });

  _client.on("close", () => {
    _status.connected = false;
  });
}

/**
 * Stop the MQTT subscriber cleanly.
 */
export function stopMqttSubscriber(): void {
  if (_client) {
    _client.end(true);
    _client = null;
    _status.connected = false;
    console.log("[MQTT] Subscriber stopped");
  }
}

/**
 * Get current subscriber status (for API/UI polling).
 */
export function getMqttStatus(): MqttSubscriberStatus {
  return {
    ..._status,
    messagesPerMinute: calcMessagesPerMinute(),
  };
}

/**
 * Publish a test message to the broker (for connectivity testing).
 */
export function publishTestMessage(bpan: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!_client || !_status.connected) {
      reject(new Error("MQTT client not connected"));
      return;
    }
    const topic = `${_config?.topicPrefix ?? "circulair/telemetry"}/${bpan}`;
    const payload = JSON.stringify({
      bpan,
      vPack: 350 + Math.random() * 10,
      iPack: -(20 + Math.random() * 30),
      vMin: 3.45 + Math.random() * 0.1,
      vMax: 3.55 + Math.random() * 0.1,
      tPack: 28 + Math.random() * 8,
      tMax: 32 + Math.random() * 10,
      cycleCount: Math.floor(200 + Math.random() * 800),
      irPack: 15 + Math.random() * 10,
      sohEstimate: 75 + Math.random() * 20,
      source: "test",
    });
    _client!.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ─── Stream state ─────────────────────────────────────────────────────────────
let _streamTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Publish a fully custom telemetry payload to the broker.
 * Used by the MQTT Flow Tester UI to send real messages.
 */
export function publishTelemetryMessage(
  bpan: string,
  payload: {
    bpan: string;
    vPack: number;
    current: number;
    tMax: number;
    tMin: number;
    tAvg: number;
    soc: number;
    sohEstimate: number;
    cycleCount: number;
    internalResistance: number;
    dtcCodes?: string[];
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!_client || !_status.connected) {
      reject(new Error("MQTT client not connected — cannot publish"));
      return;
    }
    const topic = `${_config?.topicPrefix ?? "circulair/telemetry"}/${bpan}`;
    const body = JSON.stringify({
      ...payload,
      source: "flow_tester",
      ts: new Date().toISOString(),
    });
    _client!.publish(topic, body, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT] Publish failed for ${bpan}:`, err.message);
        reject(err);
      } else {
        console.log(`[MQTT] ↑ Published to ${topic} (${body.length} bytes)`);
        resolve();
      }
    });
  });
}

/**
 * Generate a realistic random telemetry payload for a given BPAN.
 * Used by the continuous stream for testing.
 */
function generateRandomPayload(bpan: string, scenario: string = "normal") {
  const base = {
    bpan,
    vPack: parseFloat((340 + Math.random() * 20).toFixed(2)),
    current: parseFloat((-80 + Math.random() * 160).toFixed(2)),
    tMin: parseFloat((22 + Math.random() * 5).toFixed(2)),
    tAvg: parseFloat((28 + Math.random() * 8).toFixed(2)),
    tMax: parseFloat((32 + Math.random() * 12).toFixed(2)),
    soc: parseFloat((20 + Math.random() * 75).toFixed(1)),
    sohEstimate: parseFloat((65 + Math.random() * 30).toFixed(1)),
    cycleCount: Math.floor(100 + Math.random() * 900),
    internalResistance: parseFloat((10 + Math.random() * 20).toFixed(2)),
    dtcCodes: [] as string[],
    source: "stream",
  };

  if (scenario === "thermal") {
    base.tMax = parseFloat((52 + Math.random() * 10).toFixed(2));
    base.tAvg = parseFloat((48 + Math.random() * 5).toFixed(2));
    base.dtcCodes = ["P0A1B", "P0A0F"];
  } else if (scenario === "degraded") {
    base.sohEstimate = parseFloat((45 + Math.random() * 20).toFixed(1));
    base.dtcCodes = ["P0A80"];
  } else if (scenario === "charging") {
    base.current = parseFloat((80 + Math.random() * 70).toFixed(2));
    base.soc = parseFloat((40 + Math.random() * 55).toFixed(1));
  }

  return base;
}

/**
 * Start a continuous telemetry stream publishing to the broker at a fixed interval.
 * Each tick publishes one reading per BPAN with randomised realistic values.
 */
export function startTelemetryStream(bpans: string[], intervalMs: number = 3000): void {
  if (_streamTimer) {
    clearInterval(_streamTimer);
    _streamTimer = null;
  }
  if (!_client || !_status.connected) {
    throw new Error("MQTT client not connected — cannot start stream");
  }

  const scenarios = ["normal", "normal", "normal", "charging", "thermal", "degraded"];
  let tick = 0;

  console.log(`[MQTT] Stream started — ${bpans.length} BPANs at ${intervalMs}ms interval`);

  _streamTimer = setInterval(() => {
    if (!_client || !_status.connected) {
      stopTelemetryStream();
      return;
    }
    for (const bpan of bpans) {
      const scenario = scenarios[tick % scenarios.length];
      const payload = generateRandomPayload(bpan, scenario);
      const topic = `${_config?.topicPrefix ?? "circulair/telemetry"}/${bpan}`;
      const body = JSON.stringify(payload);
      _client!.publish(topic, body, { qos: 0 }, (err) => {
        if (err) console.error(`[MQTT] Stream publish error for ${bpan}:`, err.message);
      });
    }
    tick++;
    console.log(`[MQTT] Stream tick #${tick} — published ${bpans.length} messages`);
  }, intervalMs);
}

/**
 * Stop the continuous telemetry stream.
 */
export function stopTelemetryStream(): void {
  if (_streamTimer) {
    clearInterval(_streamTimer);
    _streamTimer = null;
    console.log("[MQTT] Stream stopped");
  }
}

/**
 * Check if a continuous stream is currently running.
 */
export function isStreamRunning(): boolean {
  return _streamTimer !== null;
}
