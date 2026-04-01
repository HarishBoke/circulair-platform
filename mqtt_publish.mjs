/**
 * mqtt_publish.mjs
 * Publishes realistic battery telemetry log entries to the live EMQX broker.
 * Covers: normal operation, thermal anomaly, SOH degradation, charging, idle states.
 */

import mqtt from "mqtt";
import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

// ─── Load env ────────────────────────────────────────────────────────────────
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
const DATABASE_URL = process.env.DATABASE_URL     || env.DATABASE_URL     || "";

const VALID_SCHEMES = ["mqtt://","mqtts://","ws://","wss://","ssl://"];
const BROKER_URL = BROKER_RAW && !VALID_SCHEMES.some(s => BROKER_RAW.startsWith(s))
  ? `mqtts://${BROKER_RAW}` : BROKER_RAW;

if (!BROKER_URL) { console.error("❌  MQTT_BROKER_URL not set"); process.exit(1); }

// ─── Battery profiles (realistic physics per chemistry) ───────────────────────
const PROFILES = {
  NMC:  { vNom: 3.65, vMin: 3.0,  vMax: 4.2,  irBase: 18,  tBase: 31 },
  LFP:  { vNom: 3.30, vMin: 2.5,  vMax: 3.65, irBase: 12,  tBase: 28 },
  NCA:  { vNom: 3.60, vMin: 3.0,  vMax: 4.2,  irBase: 20,  tBase: 33 },
  LCO:  { vNom: 3.70, vMin: 3.0,  vMax: 4.2,  irBase: 22,  tBase: 35 },
  LMO:  { vNom: 3.80, vMin: 3.5,  vMax: 4.2,  irBase: 16,  tBase: 30 },
};

const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const jitter = (base, pct = 0.03) => +(base * (1 + (Math.random() - 0.5) * 2 * pct)).toFixed(2);

// ─── Scenario definitions ─────────────────────────────────────────────────────
const SCENARIOS = [
  {
    name:  "Normal Discharge (EV driving)",
    icon:  "🚗",
    build: (bpan, chem, soh, cycles) => {
      const p = PROFILES[chem] || PROFILES.NMC;
      const cells = 96;
      const vCell = jitter(p.vNom, 0.04);
      return {
        bpan, vPack: +(vCell * cells).toFixed(1),
        iPack: rand(-120, -20),
        vMin: +(vCell - rand(0.01, 0.04)).toFixed(3),
        vMax: +(vCell + rand(0.01, 0.04)).toFixed(3),
        tPack: jitter(p.tBase + 4, 0.05),
        tMax:  jitter(p.tBase + 8, 0.04),
        cycleCount: cycles, irPack: jitter(p.irBase + (100 - soh) * 0.3, 0.05),
        sohEstimate: soh, source: "bms_v2", ts: Date.now(),
      };
    },
  },
  {
    name:  "Fast Charging (DC 150kW)",
    icon:  "⚡",
    build: (bpan, chem, soh, cycles) => {
      const p = PROFILES[chem] || PROFILES.NMC;
      const cells = 96;
      const vCell = jitter(p.vMax * 0.95, 0.02);
      return {
        bpan, vPack: +(vCell * cells).toFixed(1),
        iPack: rand(80, 200),
        vMin: +(vCell - rand(0.02, 0.06)).toFixed(3),
        vMax: +(vCell + rand(0.01, 0.03)).toFixed(3),
        tPack: jitter(p.tBase + 12, 0.06),
        tMax:  jitter(p.tBase + 18, 0.05),
        cycleCount: cycles, irPack: jitter(p.irBase + (100 - soh) * 0.3, 0.04),
        sohEstimate: soh, source: "bms_charger", ts: Date.now(),
      };
    },
  },
  {
    name:  "Idle / Standby",
    icon:  "💤",
    build: (bpan, chem, soh, cycles) => {
      const p = PROFILES[chem] || PROFILES.NMC;
      const cells = 96;
      const vCell = jitter(p.vNom * 1.01, 0.01);
      return {
        bpan, vPack: +(vCell * cells).toFixed(1),
        iPack: rand(-1.5, 1.5),
        vMin: +(vCell - rand(0.001, 0.005)).toFixed(3),
        vMax: +(vCell + rand(0.001, 0.005)).toFixed(3),
        tPack: jitter(p.tBase - 2, 0.03),
        tMax:  jitter(p.tBase + 1, 0.03),
        cycleCount: cycles, irPack: jitter(p.irBase + (100 - soh) * 0.3, 0.02),
        sohEstimate: soh, source: "bms_v2", ts: Date.now(),
      };
    },
  },
  {
    name:  "⚠️  THERMAL ANOMALY (T_max > 51°C)",
    icon:  "🔥",
    build: (bpan, chem, soh, cycles) => {
      const p = PROFILES[chem] || PROFILES.NMC;
      const cells = 96;
      const vCell = jitter(p.vNom * 0.97, 0.03);
      return {
        bpan, vPack: +(vCell * cells).toFixed(1),
        iPack: rand(-80, -40),
        vMin: +(vCell - rand(0.05, 0.12)).toFixed(3),
        vMax: +(vCell + rand(0.01, 0.03)).toFixed(3),
        tPack: rand(47, 53),
        tMax:  rand(52, 61),   // ← triggers anomaly alert
        cycleCount: cycles, irPack: jitter(p.irBase * 1.4, 0.06),
        sohEstimate: soh, dtcCodes: ["P0A1B", "P0A0F"],
        source: "bms_v2", ts: Date.now(),
      };
    },
  },
  {
    name:  "⚠️  SOH DEGRADATION (SOH < 70%)",
    icon:  "📉",
    build: (bpan, chem, _soh, cycles) => {
      const p = PROFILES[chem] || PROFILES.NMC;
      const cells = 96;
      const soh = rand(58, 69);   // ← triggers EOL alert
      const vCell = jitter(p.vNom * 0.96, 0.04);
      return {
        bpan, vPack: +(vCell * cells).toFixed(1),
        iPack: rand(-60, -15),
        vMin: +(vCell - rand(0.08, 0.18)).toFixed(3),
        vMax: +(vCell + rand(0.01, 0.04)).toFixed(3),
        tPack: jitter(p.tBase + 6, 0.06),
        tMax:  jitter(p.tBase + 11, 0.05),
        cycleCount: cycles + randInt(50, 200),
        irPack: jitter(p.irBase * 1.6, 0.07),
        sohEstimate: soh, dtcCodes: ["P0A80"],
        source: "bms_v2", ts: Date.now(),
      };
    },
  },
  {
    name:  "BESS Grid Storage (slow discharge)",
    icon:  "🏭",
    build: (bpan, chem, soh, cycles) => {
      const p = PROFILES[chem] || PROFILES.NMC;
      const cells = 96;
      const vCell = jitter(p.vNom, 0.02);
      return {
        bpan, vPack: +(vCell * cells).toFixed(1),
        iPack: rand(-15, -5),
        vMin: +(vCell - rand(0.005, 0.015)).toFixed(3),
        vMax: +(vCell + rand(0.005, 0.015)).toFixed(3),
        tPack: jitter(p.tBase + 2, 0.04),
        tMax:  jitter(p.tBase + 5, 0.03),
        cycleCount: cycles, irPack: jitter(p.irBase + (100 - soh) * 0.25, 0.03),
        sohEstimate: soh, source: "bess_controller", ts: Date.now(),
      };
    },
  },
  {
    name:  "Regenerative Braking (short burst)",
    icon:  "🔄",
    build: (bpan, chem, soh, cycles) => {
      const p = PROFILES[chem] || PROFILES.NMC;
      const cells = 96;
      const vCell = jitter(p.vNom * 1.03, 0.02);
      return {
        bpan, vPack: +(vCell * cells).toFixed(1),
        iPack: rand(30, 90),
        vMin: +(vCell - rand(0.01, 0.03)).toFixed(3),
        vMax: +(vCell + rand(0.02, 0.06)).toFixed(3),
        tPack: jitter(p.tBase + 3, 0.04),
        tMax:  jitter(p.tBase + 7, 0.04),
        cycleCount: cycles, irPack: jitter(p.irBase + (100 - soh) * 0.28, 0.04),
        sohEstimate: soh, source: "bms_v2", ts: Date.now(),
      };
    },
  },
];

// ─── Batteries to simulate ────────────────────────────────────────────────────
const BATTERIES = [
  { bpan: "INMH1C3FKOIND5COA0001", chem: "NMC", soh: 94.2, cycles: 312 },
  { bpan: "INSA10L48251129000010", chem: "LFP", soh: 88.7, cycles: 521 },
  { bpan: "INOK60N48250767000020", chem: "NMC", soh: 81.3, cycles: 743 },
  { bpan: "INEX40N72251218000030", chem: "LCO", soh: 76.5, cycles: 892 },
  { bpan: "INEX75A48251188000040", chem: "NCA", soh: 91.8, cycles: 228 },
  { bpan: "INLU50N96251036000060", chem: "NMC", soh: 85.4, cycles: 634 },
  { bpan: "INAM75N80251095000090", chem: "NMC", soh: 97.1, cycles: 88  },
  { bpan: "INAM50N40250110000100", chem: "NMC", soh: 79.2, cycles: 811 },
];

// ─── Main publisher ───────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║     Circul-AI-r MQTT Log Generator — Live Broker Publish    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log(`🔌  Broker  : ${BROKER_URL}`);
  console.log(`📡  Prefix  : ${TOPIC_PREFIX}`);
  console.log(`🔋  Batteries: ${BATTERIES.length}`);
  console.log(`📦  Scenarios: ${SCENARIOS.length}`);
  console.log(`📨  Total msgs: ${BATTERIES.length * SCENARIOS.length}\n`);

  // Connect
  const client = mqtt.connect(BROKER_URL, {
    username: USERNAME || undefined,
    password: PASSWORD || undefined,
    clientId: `circulair-log-gen-${Date.now()}`,
    clean: true,
    connectTimeout: 15000,
    rejectUnauthorized: true,
  });

  await new Promise((resolve, reject) => {
    client.on("connect", resolve);
    client.on("error", reject);
    setTimeout(() => reject(new Error("Connection timeout")), 15000);
  });
  console.log("✅  Connected to MQTT broker\n");

  let published = 0;
  let errors = 0;

  // Publish all scenarios for all batteries with 300ms spacing
  for (const bat of BATTERIES) {
    // Pick a scenario for this battery (cycle through them)
    const scenarioIdx = BATTERIES.indexOf(bat) % SCENARIOS.length;
    const scenario = SCENARIOS[scenarioIdx];
    const payload = scenario.build(bat.bpan, bat.chem, bat.soh, bat.cycles);
    const topic = `${TOPIC_PREFIX}/${bat.bpan}`;
    const msg = JSON.stringify(payload);

    await new Promise((resolve) => {
      client.publish(topic, msg, { qos: 1 }, (err) => {
        if (err) {
          console.error(`  ❌  [${bat.bpan}] ${scenario.icon} ${scenario.name} — ERROR: ${err.message}`);
          errors++;
        } else {
          console.log(`  ✅  [${bat.bpan}] ${scenario.icon} ${scenario.name}`);
          console.log(`      Topic : ${topic}`);
          console.log(`      SOH   : ${payload.sohEstimate}%  |  T_max: ${payload.tMax}°C  |  V_pack: ${payload.vPack}V  |  I: ${payload.iPack}A`);
          if (payload.dtcCodes?.length) console.log(`      DTCs  : ${payload.dtcCodes.join(", ")}`);
          console.log();
          published++;
        }
        resolve();
      });
    });
    await new Promise(r => setTimeout(r, 350)); // 350ms between publishes
  }

  // Now publish the two special anomaly scenarios to specific batteries
  console.log("─── Special Anomaly Scenarios ──────────────────────────────────\n");

  const anomalyBatteries = [
    { bat: BATTERIES[2], scenario: SCENARIOS[3] }, // THERMAL ANOMALY
    { bat: BATTERIES[3], scenario: SCENARIOS[4] }, // SOH DEGRADATION
  ];

  for (const { bat, scenario } of anomalyBatteries) {
    const payload = scenario.build(bat.bpan, bat.chem, bat.soh, bat.cycles);
    const topic = `${TOPIC_PREFIX}/${bat.bpan}`;
    const msg = JSON.stringify(payload);

    await new Promise((resolve) => {
      client.publish(topic, msg, { qos: 1 }, (err) => {
        if (err) {
          console.error(`  ❌  [${bat.bpan}] ${scenario.icon} ${scenario.name} — ERROR: ${err.message}`);
          errors++;
        } else {
          console.log(`  🚨  [${bat.bpan}] ${scenario.icon} ${scenario.name}`);
          console.log(`      Topic : ${topic}`);
          console.log(`      SOH   : ${payload.sohEstimate}%  |  T_max: ${payload.tMax}°C  |  V_pack: ${payload.vPack}V`);
          if (payload.dtcCodes?.length) console.log(`      DTCs  : ${payload.dtcCodes.join(", ")}`);
          console.log();
          published++;
        }
        resolve();
      });
    });
    await new Promise(r => setTimeout(r, 350));
  }

  // Summary
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`✅  Published : ${published} messages`);
  if (errors) console.log(`❌  Errors    : ${errors} messages`);
  console.log(`📡  Broker    : ${BROKER_URL}`);
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("💡  Check the Circul-AI-r Telemetry dashboard and Alerts page");
  console.log("    to see the live data and any triggered anomaly alerts.\n");

  client.end();
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
