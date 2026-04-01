/**
 * mqtt_diag.mjs — Diagnostic subscriber to confirm broker connectivity and message receipt
 */
import mqtt from "mqtt";
import { readFileSync } from "fs";

const envPath = "/home/ubuntu/circulair-platform/.env";
const env = {};
try {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const BROKER_RAW   = process.env.MQTT_BROKER_URL  || env.MQTT_BROKER_URL  || "";
const USERNAME     = process.env.MQTT_USERNAME    || env.MQTT_USERNAME    || "";
const PASSWORD     = process.env.MQTT_PASSWORD    || env.MQTT_PASSWORD    || "";
const TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX|| env.MQTT_TOPIC_PREFIX|| "circulair/telemetry";

const VALID_SCHEMES = ["mqtt://","mqtts://","ws://","wss://","ssl://"];
const BROKER_URL = BROKER_RAW && !VALID_SCHEMES.some(s => BROKER_RAW.startsWith(s))
  ? `mqtts://${BROKER_RAW}` : BROKER_RAW;

console.log(`\n🔌 Connecting to: ${BROKER_URL}`);
console.log(`📡 Topic prefix: ${TOPIC_PREFIX}`);
console.log(`🔑 Auth: ${USERNAME ? 'YES' : 'NO'}\n`);

const client = mqtt.connect(BROKER_URL, {
  username: USERNAME || undefined,
  password: PASSWORD || undefined,
  clientId: `circulair-diag-${Date.now()}`,
  clean: true,
  connectTimeout: 15000,
  rejectUnauthorized: true,
});

client.on("connect", () => {
  console.log("✅ Connected!\n");
  
  // Subscribe to ALL topics under prefix
  const topics = [
    `${TOPIC_PREFIX}/+`,
    `${TOPIC_PREFIX}/#`,
    "#",  // catch-all to see all messages
  ];
  
  for (const t of topics) {
    client.subscribe(t, { qos: 0 }, (err) => {
      if (err) console.log(`  ❌ Subscribe ${t}: ${err.message}`);
      else console.log(`  ✅ Subscribed to: ${t}`);
    });
  }
  console.log("\n⏳ Waiting for messages for 15 seconds...\n");
  
  setTimeout(() => {
    console.log("\n⏱️  15s elapsed. Disconnecting.");
    client.end();
    process.exit(0);
  }, 15000);
});

client.on("message", (topic, payload) => {
  console.log(`📨 RECEIVED: ${topic}`);
  try {
    const data = JSON.parse(payload.toString());
    console.log(`   BPAN: ${data.bpan || 'N/A'}  SOH: ${data.sohEstimate || 'N/A'}%  T_max: ${data.tMax || 'N/A'}°C`);
  } catch {
    console.log(`   Raw: ${payload.toString().substring(0, 100)}`);
  }
  console.log();
});

client.on("error", (err) => {
  console.error(`❌ Error: ${err.message}`);
});

client.on("offline", () => console.log("⚠️  Client offline"));
client.on("reconnect", () => console.log("🔄 Reconnecting..."));
