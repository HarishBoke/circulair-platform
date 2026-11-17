/**
 * Broker management uses approved TLS configuration and explicit admin context.
 * Operational ingestion is CLOSED pending authenticated publisher identity,
 * persisted owner/device/battery/key mapping and atomic provenance storage.
 * Future measured topic: <prefix>/<exact-registered-BPAN>/<deviceId>.
 * Future JSON contract: bpan, deviceId, recordedAt (ISO UTC), source: measured,
 * plus strictly validated supported metrics. Broker acknowledgement is not
 * persistence or hardware acceptance. Synthetic publishers cannot ingest here.
 */

import mqtt, { MqttClient, IClientOptions } from "mqtt";
import { nanoid } from "nanoid";
import { deviceBpanSchema, deviceTelemetrySchema } from "./deviceIngestionBoundary";

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
let _disposeConnection: (() => void) | null = null;
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

export function validatePayload(raw: unknown) {
  const result = deviceTelemetrySchema.safeParse(raw);
  return result.success ? result.data : null;
}

// ─── Message handler ──────────────────────────────────────────────────────────

export async function handleMessage(topic: string, rawPayload: Buffer): Promise<void> {
  _status.messagesReceived++;
  _status.lastMessageAt = new Date().toISOString();
  if (_msgTimestamps.length < 10000) _msgTimestamps.push(Date.now());
  _status.messagesPerMinute = calcMessagesPerMinute();
  let reason = "verified_broker_device_ingestion_unavailable";
  if (rawPayload.length > 16384) reason = "payload_too_large";
  else {
    try {
      const payload = deviceTelemetrySchema.safeParse(JSON.parse(rawPayload.toString("utf8")));
      if (!payload.success) reason = "invalid_measured_device_payload";
      else if (topic !== `${_config?.topicPrefix ?? "circulair/telemetry"}/${payload.data.bpan}/${payload.data.deviceId}`) reason = "topic_device_identity_mismatch";
    } catch { reason = "invalid_json"; }
  }
  // A normal broker subscription does NOT reveal/authenticate the original
  // publishing client's identity. Payload deviceId alone is not proof. Until a
  // reviewed broker ACL + authenticated publisher envelope + atomic persistence
  // adapter exists, reject both measured and synthetic operational ingestion.
  // No DB lookup, write, alert, heartbeat, lifecycle mutation or broadcast occurs.
  _status.errors.push(reason);
  if (_status.errors.length > 20) _status.errors.shift();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the MQTT subscriber. Safe to call multiple times — will disconnect
 * existing client first if already running.
 */
export function startMqttSubscriber(config?: Partial<MqttConfig>, actor?: { role: string }): void {
  if (actor?.role !== "admin") {
    if (config) throw new Error("Broker management requires admin authorization");
    return; // Startup is closed until approved broker integration is wired.
  }
  const configuredUrl = process.env.MQTT_BROKER_URL ?? "";
  const rawBrokerUrl = config?.brokerUrl ?? configuredUrl;
  if (!rawBrokerUrl) return;
  let url: URL;
  try { url = new URL(rawBrokerUrl); } catch { throw new Error("Invalid broker configuration"); }
  if (!['mqtts:', 'wss:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.search || url.hash || /[\s\\]/.test(rawBrokerUrl)) throw new Error("Broker requires an explicit credential-free TLS URL");
  // Destinations are selected through approved deployment configuration only.
  // Do not forward env credentials/CA to an interactive destination override.
  if (!configuredUrl || rawBrokerUrl !== configuredUrl) throw new Error("Broker destination is not approved");
  if (config?.username !== undefined || config?.password !== undefined || config?.caCert !== undefined) throw new Error("Broker secrets must use approved server configuration");
  const prefix = config?.topicPrefix ?? process.env.MQTT_TOPIC_PREFIX ?? "circulair/telemetry";
  if (!prefix || prefix.length > 128 || /[+#\s]/.test(prefix) || prefix.startsWith('/') || prefix.endsWith('/')) throw new Error("Invalid topic prefix");
  const resolved: MqttConfig = {
    brokerUrl: rawBrokerUrl, username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: config?.clientId ?? process.env.MQTT_CLIENT_ID ?? `circulair-server-${nanoid(8)}`,
    topicPrefix: prefix, caCert: process.env.MQTT_CA_CERT,
  };

  _disposeConnection?.();
  _disposeConnection = null;
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
    reconnectPeriod: 0,         // Disable built-in fixed reconnect — we use exponential backoff below
    connectTimeout: 20_000,     // 20s connection timeout
    keepalive: 90,              // 90s keepalive — reduces timeout events on cloud brokers
    resubscribe: true,
  };

  // Exponential backoff state
  let _reconnectDelay = 5_000;   // Start at 5s
  const MAX_RECONNECT_DELAY = 60_000; // Cap at 60s
  let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  let disposed = false;
  _disposeConnection = () => { disposed = true; if (_reconnectTimer) clearTimeout(_reconnectTimer); _reconnectTimer = null; };
  function scheduleReconnect() {
    if (disposed) return;
    if (_reconnectTimer) return; // Already scheduled
    _reconnectTimer = setTimeout(() => {
      _reconnectTimer = null;
      if (_client && !_status.connected) {
        _status.reconnectCount++;
        console.log(`[MQTT] Reconnecting... (attempt ${_status.reconnectCount}, delay was ${_reconnectDelay / 1000}s)`);
        _client.reconnect();
        // Increase delay exponentially up to the cap
        _reconnectDelay = Math.min(_reconnectDelay * 2, MAX_RECONNECT_DELAY);
      }
    }, _reconnectDelay);
  }

  if (resolved.username) options.username = resolved.username;
  if (resolved.password) options.password = resolved.password;

  // TLS options for mqtts:// URLs
  if (resolved.brokerUrl.startsWith("mqtts://") || resolved.brokerUrl.startsWith("wss://")) {
    options.rejectUnauthorized = true;
    if (resolved.caCert) {
      options.ca = [Buffer.from(resolved.caCert)];
    }
  }

  console.log(`[MQTT] Connecting to ${resolved.brokerUrl} as ${resolved.clientId}...`);

  _client = mqtt.connect(resolved.brokerUrl, options);

  _client.on("connect", () => {
    if (disposed) return;
    console.log(`[MQTT] Connected to ${resolved.brokerUrl}`);
    _status.connected = true;
    // Reset backoff delay on successful connection
    _reconnectDelay = 5_000;
    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer);
      _reconnectTimer = null;
    }

    // Subscribe to exact BPAN/device topic depth; publisher proof still required.
    const wildcardTopic = `${resolved.topicPrefix}/+/+`;
    _client!.subscribe(wildcardTopic, { qos: 1 }, (err) => {
      if (err) {
        console.error("[MQTT] Broker subscription failed");
        _status.errors.push("Broker subscription failed");
      } else {
        console.log(`[MQTT] Subscribed to ${wildcardTopic}`);
        _status.subscribedTopics = [wildcardTopic];
      }
    });
  });

  _client.on("message", (topic, message) => {
    if (disposed) return;
    handleMessage(topic, message).catch((err) => {
      console.error("[MQTT] Message rejected");
    });
  });

  _client.on("reconnect", () => {
    if (disposed) return;
    // Fired by manual _client.reconnect() calls from scheduleReconnect()
    _status.connected = false;
  });

  _client.on("offline", () => {
    if (disposed) return;
    _status.connected = false;
    console.log("[MQTT] Client offline — scheduling reconnect");
    scheduleReconnect();
  });

  _client.on("error", (err) => {
    if (disposed) return;
    _status.connected = false;
    const msg = "Broker connection failed";
    _status.errors.push(msg);
    if (_status.errors.length > 20) _status.errors.shift();
    console.error("[MQTT] Broker connection failed");
    // Schedule reconnect on keepalive timeout or other connection errors
    scheduleReconnect();
  });

  _client.on("close", () => {
    if (disposed) return;
    _status.connected = false;
    scheduleReconnect();
  });
}

/**
 * Stop the MQTT subscriber cleanly.
 */
export function stopMqttSubscriber(actor?: { role: string }): void {
  if (_client && actor?.role !== "admin") throw new Error("Broker management requires admin authorization");
  _disposeConnection?.(); _disposeConnection = null;
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
export function publishTestMessage(bpan: string, actor?: { role: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!_client || !_status.connected) {
      reject(new Error("MQTT client not connected"));
      return;
    }
    if (!deviceBpanSchema.safeParse(bpan).success) { reject(new Error("Invalid registered BPAN syntax")); return; }
    if (actor?.role !== "admin") { reject(new Error("Broker management requires admin authorization")); return; }
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
      if (err) reject(new Error("Broker publish failed"));
      else resolve();
    });
  });
}

// ─── Stream state ─────────────────────────────────────────────────────────────
let _streamTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Publish a fully custom telemetry payload to the broker.
 * Synthetic broker acknowledgement only; no operational history writes.
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
  },
  actor?: { role: string }
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!_client || !_status.connected) {
      reject(new Error("MQTT client not connected — cannot publish"));
      return;
    }
    if (actor?.role !== "admin") { reject(new Error("Broker management requires admin authorization")); return; }
    if (payload.bpan !== bpan || !deviceBpanSchema.safeParse(bpan).success) { reject(new Error("Publisher identity mismatch")); return; }
    const topic = `${_config?.topicPrefix ?? "circulair/telemetry"}/${bpan}`;
    const body = JSON.stringify({
      ...payload,
      source: "flow_tester",
      ts: new Date().toISOString(),
    });
    _client!.publish(topic, body, { qos: 1 }, (err) => {
      if (err) {
        console.error("[MQTT] Synthetic broker publish failed");
        reject(new Error("Broker publish failed"));
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
    source: "simulated",
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
export function startTelemetryStream(bpans: string[], intervalMs: number = 3000, actor?: { role: string }): void {
  if (actor?.role !== "admin") throw new Error("Broker management requires admin authorization");
  if (_streamTimer) {
    clearInterval(_streamTimer);
    _streamTimer = null;
  }
  if (!_client || !_status.connected) {
    throw new Error("MQTT client not connected — cannot start stream");
  }
  if (bpans.length < 1 || bpans.length > 10 || !Number.isInteger(intervalMs) || intervalMs < 1000 || intervalMs > 60000 || bpans.some(b => !deviceBpanSchema.safeParse(b).success)) throw new Error("Invalid bounded synthetic stream");

  const scenarios = ["normal", "normal", "normal", "charging", "thermal", "degraded"];
  let tick = 0;

  console.log(`[MQTT] Stream started — ${bpans.length} BPANs at ${intervalMs}ms interval`);

  _streamTimer = setInterval(() => {
    if (!_client || !_status.connected) {
      stopTelemetryStream({ role: "admin" });
      return;
    }
    for (const bpan of bpans) {
      const scenario = scenarios[tick % scenarios.length];
      const payload = generateRandomPayload(bpan, scenario);
      const topic = `${_config?.topicPrefix ?? "circulair/telemetry"}/${bpan}`;
      const body = JSON.stringify(payload);
      _client!.publish(topic, body, { qos: 0 }, (err) => {
        if (err) console.error("[MQTT] Synthetic stream broker publish failed");
      });
    }
    tick++;
    console.log(`[MQTT] Stream tick #${tick} — published ${bpans.length} messages`);
  }, intervalMs);
}

/**
 * Stop the continuous telemetry stream.
 */
export function stopTelemetryStream(actor?: { role: string }): void {
  if (_streamTimer && actor?.role !== "admin") throw new Error("Broker management requires admin authorization");
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
