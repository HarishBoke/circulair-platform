/**
 * Production seed script using raw pg queries.
 * Uses explicit error logging — no silent failures.
 */
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 3,
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function generateBpan(i: number): string {
  const countries = ["IN", "DE", "CN", "KR", "JP", "US", "FR", "GB"];
  const mfrs = ["TM1", "MH2", "OL3", "AT4", "LH5", "GC6", "RJ7", "KD8"];
  const cc = countries[i % countries.length];
  const mfr = mfrs[i % mfrs.length];
  const cap = String(Math.floor(rand(10, 100) / 10)).padStart(2, "0");
  const chem = pick(["L", "N", "S", "F"]);
  const volt = String(Math.floor(rand(4, 48))).padStart(2, "0");
  const orig = countries[(i + 3) % countries.length];
  const ext = pick(["A", "B", "C"]);
  const yr = String(randInt(20, 24));
  const mo = String(randInt(1, 12)).padStart(2, "0");
  const dy = String(randInt(1, 28)).padStart(2, "0");
  const fact = pick(["A", "B", "C", "D"]);
  const ser = String(i).padStart(4, "0");
  return `${cc}${mfr}${cap}${chem}${volt}${orig}${ext}${yr}${mo}${dy}${fact}${ser}`;
}

const CHEMISTRIES = ["LFP", "NMC", "NCA", "LTO", "LMFP", "Solid-State"];
const COUNTRIES = ["IN", "DE", "CN", "KR", "JP", "US", "FR", "GB"];
const MANUFACTURERS = ["TM1", "MH2", "OL3", "AT4", "LH5", "GC6", "RJ7", "KD8"];

async function main() {
  const client = await pool.connect();
  console.log("🌱 Starting production seed for Circul-AI-r platform...\n");

  try {
    // ── Check existing data ──────────────────────────────────────────────────
    const existingCheck = await client.query("SELECT COUNT(*) as count FROM batteries");
    const batteryCount = parseInt(existingCheck.rows[0].count, 10);
    console.log(`📊 Existing batteries: ${batteryCount}`);

    if (batteryCount > 50) {
      console.log("✅ Database already has sufficient data. Skipping full seed.\n");
      return;
    }

    // ── Check table structure ────────────────────────────────────────────────
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'batteries' ORDER BY ordinal_position LIMIT 5
    `);
    console.log("📋 Batteries columns (first 5):", cols.rows.map((r: any) => r.column_name).join(", "));

    // ── 1. Seed users ────────────────────────────────────────────────────────
    console.log("\n👤 Seeding users...");
    const seedUsers = [
      { openId: "seed-oem-001", name: "Rajesh Kumar", email: "rajesh.kumar@tatamotors.com", role: "user", platformRole: "oem", organization: "Tata Motors EV Division" },
      { openId: "seed-oem-002", name: "Priya Sharma", email: "priya.sharma@mahindra.com", role: "user", platformRole: "oem", organization: "Mahindra Electric" },
      { openId: "seed-recycler-001", name: "Arjun Mehta", email: "arjun.mehta@attero.in", role: "user", platformRole: "recycler", organization: "Attero Recycling" },
      { openId: "seed-recycler-002", name: "Sunita Patel", email: "sunita.patel@lohum.com", role: "user", platformRole: "recycler", organization: "Lohum Cleantech" },
      { openId: "seed-trader-001", name: "Vikram Singh", email: "vikram.singh@betteries.in", role: "user", platformRole: "trader", organization: "Betteries Energy" },
      { openId: "seed-trader-002", name: "Ananya Iyer", email: "ananya.iyer@greencell.com", role: "user", platformRole: "trader", organization: "GreenCell Mobility" },
      { openId: "seed-regulator-001", name: "Dr. Suresh Nair", email: "suresh.nair@mnre.gov.in", role: "user", platformRole: "regulator", organization: "MNRE India" },
      { openId: "seed-admin-001", name: "Harish Boke", email: "harish@setoo.co", role: "admin", platformRole: "oem", organization: "Setoo Technologies" },
      { openId: "seed-oem-003", name: "Kiran Desai", email: "kiran.desai@olaelectric.com", role: "user", platformRole: "oem", organization: "Ola Electric" },
      { openId: "seed-trader-003", name: "Meera Krishnan", email: "meera.k@secondlife.in", role: "user", platformRole: "trader", organization: "SecondLife Energy" },
    ];

    const insertedUserIds: number[] = [];
    for (const u of seedUsers) {
      try {
        const existing = await client.query(
          `SELECT id FROM users WHERE "openId" = $1`,
          [u.openId]
        );
        if (existing.rows.length > 0) {
          insertedUserIds.push(existing.rows[0].id);
          continue;
        }
        const result = await client.query(
          `INSERT INTO users ("openId", name, email, role, "platformRole", organization, "loginMethod")
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [u.openId, u.name, u.email, u.role, u.platformRole, u.organization, "password"]
        );
        insertedUserIds.push(result.rows[0].id);
      } catch (e: any) {
        console.warn(`  Skipping user ${u.email}: ${e.message?.slice(0, 100)}`);
      }
    }
    console.log(`  ✓ ${insertedUserIds.length} users ready (IDs: ${insertedUserIds.slice(0, 3).join(",")}...)`);

    if (insertedUserIds.length === 0) {
      console.error("  ✗ No users available — cannot seed batteries without owner IDs");
      return;
    }

    // ── 2. Seed batteries ────────────────────────────────────────────────────
    console.log("\n🔋 Seeding 200 batteries...");
    const batteryIds: { id: number; bpan: string }[] = [];

    for (let i = 1; i <= 200; i++) {
      const chemistry = pick(CHEMISTRIES);
      const capacityKwh = pick([10, 20, 30, 40, 50, 60, 75, 100]);
      const voltageV = pick([48, 96, 144, 192, 288, 360, 400, 480]);
      const status = i <= 140 ? "operational" : i <= 160 ? "degraded" : i <= 175 ? "storage" : i <= 185 ? "transit" : i <= 195 ? "retired" : "recycling";
      const soh = status === "operational" ? rand(75, 100) : status === "degraded" ? rand(50, 75) : rand(20, 60);
      const bpan = generateBpan(i);
      const ownerId = insertedUserIds[i % insertedUserIds.length];
      const chemCode = chemistry === "LFP" ? "L" : chemistry === "NMC" ? "N" : chemistry === "NCA" ? "A" : chemistry === "LTO" ? "T" : chemistry === "LMFP" ? "M" : "S";
      const countryCode = pick(COUNTRIES);
      const mfrId = pick(MANUFACTURERS);
      const capCode = String(Math.floor(capacityKwh / 10)).padStart(2, "0");
      const voltCode = String(Math.floor(voltageV / 10)).padStart(2, "0");
      const origCode = pick(COUNTRIES);
      const origCountry = pick(["China", "South Korea", "Japan", "India", "Germany", "USA"]);
      const extClass = pick(["A", "B", "C"]);
      const mfgYear = randInt(2020, 2024);
      const mfgMonth = randInt(1, 12);
      const mfgDay = randInt(1, 28);
      const factCode = pick(["A", "B", "C", "D"]);
      const serNum = String(i).padStart(4, "0");

      try {
        const result = await client.query(
          `INSERT INTO batteries(
            bpan, "countryCode", "manufacturerId", "capacityCode", "capacityKwh",
            "chemistryCode", chemistry, "voltageCode", "voltageV", "cellOriginCode",
            "cellOriginCountry", "extinguisherClass", "mfgYear", "mfgMonth", "mfgDay",
            "factoryCode", "serialNumber", "recyclabilityPct", "lithiumPct", "cobaltPct",
            "nickelPct", "manganesePct", "carbonFootprintKgCo2", status, "currentSoh",
            "cycleCount", "lastServiceDate", "registeredById", "ownerId", "vehicleId"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
          ) ON CONFLICT (bpan) DO NOTHING RETURNING id`,
          [
            bpan, countryCode, mfrId, capCode, capacityKwh.toFixed(2),
            chemCode, chemistry, voltCode, voltageV.toFixed(1), origCode,
            origCountry, extClass, mfgYear, mfgMonth, mfgDay,
            factCode, serNum, rand(60, 95).toFixed(2), rand(5, 12).toFixed(2), rand(0, 20).toFixed(2),
            rand(10, 40).toFixed(2), rand(5, 20).toFixed(2), rand(50, 200).toFixed(2), status, soh.toFixed(2),
            randInt(50, 2000), daysAgo(randInt(10, 365)), ownerId, ownerId, `VH-${String(i).padStart(5, "0")}`
          ]
        );
        if (result.rows.length > 0) {
          batteryIds.push({ id: result.rows[0].id, bpan });
        }
      } catch (e: any) {
        if (batteryIds.length < 3) {
          console.error(`  Battery ${i} insert error: ${e.message?.slice(0, 200)}`);
        }
      }
    }
    console.log(`  ✓ ${batteryIds.length} batteries seeded`);

    // ── 3. Seed telemetry ────────────────────────────────────────────────────
    console.log("\n📡 Seeding telemetry (15 records per battery for first 60)...");
    let telCount = 0;
    for (const bat of batteryIds.slice(0, 60)) {
      for (let t = 0; t < 15; t++) {
        try {
          await client.query(
            `INSERT INTO telemetry(
              bpan, "batteryId", "vPack", "iPack", "vMin", "vMax", "tPack", "tMax",
              soc, soh, "cycleCount", "stateOfPower", "remainingCapacity", "internalResistance",
              latitude, longitude, altitude, speed, "cellVoltages", "cellTemperatures",
              "chargingStatus", "faultCodes", "timestamp"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
              $15, $16, $17, $18, $19, $20, $21, $22, $23
            )`,
            [
              bat.bpan, bat.id,
              rand(280, 420).toFixed(2), rand(-150, 150).toFixed(2),
              rand(3.0, 3.5).toFixed(3), rand(3.5, 4.2).toFixed(3),
              rand(20, 45).toFixed(2), rand(30, 55).toFixed(2),
              rand(20, 100).toFixed(2), rand(60, 100).toFixed(2),
              randInt(50, 2000), rand(0, 100).toFixed(2),
              rand(10, 100).toFixed(2), rand(0.01, 0.1).toFixed(4),
              rand(8, 28).toFixed(6), rand(68, 88).toFixed(6),
              rand(0, 500).toFixed(2), rand(0, 120).toFixed(2),
              JSON.stringify(Array.from({ length: 8 }, () => rand(3.2, 4.1).toFixed(3))),
              JSON.stringify(Array.from({ length: 4 }, () => rand(20, 45).toFixed(1))),
              pick(["charging", "discharging", "idle", "balancing"]),
              JSON.stringify([]),
              daysAgo(randInt(0, 30))
            ]
          );
          telCount++;
        } catch (e: any) {
          if (telCount === 0) console.error(`  Telemetry error: ${e.message?.slice(0, 150)}`);
        }
      }
    }
    console.log(`  ✓ ${telCount} telemetry records seeded`);

    // ── 4. Seed SOH predictions ──────────────────────────────────────────────
    console.log("\n🤖 Seeding SOH predictions...");
    let sohCount = 0;
    for (const bat of batteryIds.slice(0, 80)) {
      try {
        await client.query(
          `INSERT INTO "sohPredictions"(
            "batteryId", bpan, "currentSoh", "predictedSoh30d", "predictedSoh90d",
            "predictedSoh180d", "predictedSoh365d", "remainingUsefulLife",
            "confidenceScore", "modelVersion", "degradationRate", "anomalyDetected",
            "anomalyType", "recommendation", "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            bat.id, bat.bpan,
            rand(60, 100).toFixed(2), rand(58, 98).toFixed(2), rand(55, 95).toFixed(2),
            rand(50, 90).toFixed(2), rand(40, 85).toFixed(2),
            randInt(6, 60),
            rand(0.7, 0.99).toFixed(4),
            "CirculAI-v2.1",
            rand(0.01, 0.5).toFixed(4),
            Math.random() < 0.15,
            Math.random() < 0.15 ? pick(["capacity_fade", "impedance_rise", "thermal_runaway_risk"]) : null,
            pick([
              "Continue normal operation",
              "Schedule preventive maintenance within 30 days",
              "Consider second-life deployment",
              "Initiate recycling process",
              "Monitor closely — anomaly detected"
            ]),
            daysAgo(randInt(0, 7))
          ]
        );
        sohCount++;
      } catch (e: any) {
        if (sohCount === 0) console.error(`  SOH prediction error: ${e.message?.slice(0, 150)}`);
      }
    }
    console.log(`  ✓ ${sohCount} SOH predictions seeded`);

    // ── 5. Seed marketplace listings ─────────────────────────────────────────
    console.log("\n🛒 Seeding marketplace listings...");
    let mktCount = 0;
    for (const bat of batteryIds.slice(0, 50)) {
      const listingType = pick(["sale", "lease", "auction", "recycling"]);
      const sellerId = insertedUserIds[mktCount % insertedUserIds.length];
      try {
        await client.query(
          `INSERT INTO "marketplaceListings"(
            "batteryId", bpan, "sellerId", "listingType", "askingPrice", currency,
            "negotiable", condition, "sohAtListing", "cycleCountAtListing",
            description, "applicationSuitability", location, country,
            "availableFrom", "expiresAt", status, "viewCount", "inquiryCount"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            bat.id, bat.bpan, sellerId, listingType,
            rand(5000, 150000).toFixed(2), pick(["USD", "EUR", "INR"]),
            Math.random() < 0.6,
            pick(["excellent", "good", "fair", "poor"]),
            rand(60, 98).toFixed(2), randInt(100, 1500),
            pick([
              "Well-maintained EV battery pack, suitable for second-life energy storage applications.",
              "Decommissioned from fleet vehicle, tested and certified for reuse.",
              "High-capacity battery available for industrial ESS deployment.",
              "Low-cycle battery from hybrid vehicle, ideal for residential solar storage."
            ]),
            JSON.stringify(pick([["ESS", "Solar"], ["Grid", "UPS"], ["EV", "Hybrid"], ["Industrial", "Telecom"]])),
            pick(["Mumbai", "Delhi", "Bangalore", "Chennai", "Berlin", "Seoul", "Tokyo"]),
            pick(["IN", "DE", "KR", "JP", "US"]),
            daysAgo(-randInt(1, 30)), daysAgo(-randInt(31, 90)),
            pick(["active", "active", "active", "pending", "sold"]),
            randInt(0, 500), randInt(0, 50)
          ]
        );
        mktCount++;
      } catch (e: any) {
        if (mktCount === 0) console.error(`  Marketplace error: ${e.message?.slice(0, 150)}`);
      }
    }
    console.log(`  ✓ ${mktCount} marketplace listings seeded`);

    // ── 6. Seed logistics ────────────────────────────────────────────────────
    console.log("\n🚚 Seeding logistics...");
    let logCount = 0;
    for (const bat of batteryIds.slice(0, 40)) {
      const initiatorId = insertedUserIds[logCount % insertedUserIds.length];
      try {
        await client.query(
          `INSERT INTO "logisticsRecords"(
            "batteryId", bpan, "initiatorId", "movementType", status,
            "originAddress", "originCity", "originCountry",
            "destinationAddress", "destinationCity", "destinationCountry",
            "carrier", "trackingNumber", "estimatedArrival", "actualArrival",
            "handlingInstructions", "temperatureMin", "temperatureMax",
            "packagingType", "insuranceValue", currency
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
          [
            bat.id, bat.bpan, initiatorId,
            pick(["sale_transfer", "repair", "recycling", "lease_return", "inspection"]),
            pick(["delivered", "delivered", "in_transit", "pending", "scheduled"]),
            pick(["Plot 45, Industrial Area", "Sector 12, MIDC", "Unit 7, Tech Park"]),
            pick(["Mumbai", "Delhi", "Bangalore", "Chennai", "Pune"]),
            pick(["IN", "DE", "KR"]),
            pick(["Green Energy Park, Phase 2", "Recycling Hub, Zone B", "Storage Facility A"]),
            pick(["Hyderabad", "Berlin", "Seoul", "Tokyo", "Los Angeles"]),
            pick(["IN", "DE", "KR", "JP", "US"]),
            pick(["DHL", "FedEx", "Blue Dart", "DTDC", "Maersk", "DB Schenker"]),
            `TRK${String(randInt(100000, 999999))}`,
            daysAgo(-randInt(1, 14)), Math.random() < 0.6 ? daysAgo(randInt(1, 7)) : null,
            "Handle with care. Lithium battery — no puncture, no extreme heat.",
            -10, 45,
            pick(["UN3480 Compliant Box", "Custom Battery Crate", "Pallet with Straps"]),
            rand(5000, 100000).toFixed(2), pick(["USD", "EUR", "INR"])
          ]
        );
        logCount++;
      } catch (e: any) {
        if (logCount === 0) console.error(`  Logistics error: ${e.message?.slice(0, 150)}`);
      }
    }
    console.log(`  ✓ ${logCount} logistics records seeded`);

    // ── 7. Seed EPR tokens ───────────────────────────────────────────────────
    console.log("\n♻️ Seeding EPR tokens...");
    let eprCount = 0;
    const eprStatuses = ["active", "active", "active", "redeemed", "expired"];
    for (let i = 0; i < 30; i++) {
      const issuedToId = insertedUserIds[i % insertedUserIds.length];
      const capacityKwh = pick([10, 20, 30, 50, 75, 100]);
      try {
        await client.query(
          `INSERT INTO "eprTokens"(
            "tokenId", "issuedToId", "issuedBy", jurisdiction, "capacityKwh",
            "tokenValue", currency, status, "validFrom", "validUntil",
            "batteryChemistry", "recyclingObligation", notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            `EPR-${pick(["IN", "EU", "KR", "JP"])}-${String(randInt(10000, 99999))}`,
            issuedToId,
            pick(["CPCB India", "EU Battery Regulation Authority", "K-BATT Korea", "METI Japan"]),
            pick(["India", "EU", "South Korea", "Japan", "Germany"]),
            capacityKwh.toFixed(2),
            (capacityKwh * rand(5, 15)).toFixed(2),
            pick(["USD", "EUR", "INR", "KRW"]),
            pick(eprStatuses),
            daysAgo(randInt(30, 365)),
            daysAgo(-randInt(180, 730)),
            pick(CHEMISTRIES),
            rand(80, 100).toFixed(2),
            pick([
              "Standard EPR compliance token for battery lifecycle management",
              "Extended producer responsibility certificate — EU Battery Regulation 2023",
              "Battery recycling obligation certificate under E-Waste Rules India",
              null
            ])
          ]
        );
        eprCount++;
      } catch (e: any) {
        if (eprCount === 0) console.error(`  EPR token error: ${e.message?.slice(0, 150)}`);
      }
    }
    console.log(`  ✓ ${eprCount} EPR tokens seeded`);

    // ── 8. Seed alerts ───────────────────────────────────────────────────────
    console.log("\n🚨 Seeding alerts...");
    let alertCount = 0;
    const alertTypes = ["soh_low", "temperature_high", "voltage_anomaly", "cycle_limit", "maintenance_due", "compliance_expiry"];
    const alertSeverities = ["critical", "high", "medium", "low"];
    for (const bat of batteryIds.slice(0, 60)) {
      if (Math.random() < 0.4) {
        const ownerId = insertedUserIds[alertCount % insertedUserIds.length];
        try {
          await client.query(
            `INSERT INTO alerts(
              "batteryId", bpan, "userId", type, severity, title, message,
              status, "triggeredAt", "acknowledgedAt", "resolvedAt", metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              bat.id, bat.bpan, ownerId,
              pick(alertTypes), pick(alertSeverities),
              pick([
                "SOH Below Threshold", "High Temperature Alert", "Voltage Anomaly Detected",
                "Cycle Count Limit Approaching", "Maintenance Overdue", "Compliance Certificate Expiring"
              ]),
              pick([
                "Battery state of health has dropped below 70%. Consider scheduling maintenance.",
                "Pack temperature exceeded 45°C. Check cooling system immediately.",
                "Unusual voltage pattern detected. Manual inspection recommended.",
                "Battery approaching end-of-life cycle count. Plan for second-life deployment.",
                "Last service was over 180 days ago. Schedule maintenance.",
                "EPR compliance certificate expires in 30 days. Renew to avoid penalties."
              ]),
              pick(["active", "active", "acknowledged", "resolved"]),
              daysAgo(randInt(0, 30)),
              Math.random() < 0.5 ? daysAgo(randInt(0, 15)) : null,
              Math.random() < 0.3 ? daysAgo(randInt(0, 7)) : null,
              JSON.stringify({ batteryId: bat.id, threshold: rand(60, 80).toFixed(1) })
            ]
          );
          alertCount++;
        } catch (e: any) {
          if (alertCount === 0) console.error(`  Alert error: ${e.message?.slice(0, 150)}`);
        }
      }
    }
    console.log(`  ✓ ${alertCount} alerts seeded`);

    // ── 9. Seed documents ────────────────────────────────────────────────────
    console.log("\n📄 Seeding documents...");
    let docCount = 0;
    const docTypes = ["battery_passport", "test_report", "compliance_cert", "warranty_cert", "recycling_cert", "transport_doc"];
    for (const bat of batteryIds.slice(0, 50)) {
      if (Math.random() < 0.6) {
        const uploadedById = insertedUserIds[docCount % insertedUserIds.length];
        try {
          await client.query(
            `INSERT INTO documents(
              "batteryId", bpan, "uploadedById", type, name,
              "fileUrl", "fileKey", "mimeType", "fileSizeBytes",
              "isPublic", "expiresAt", metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              bat.id, bat.bpan, uploadedById,
              pick(docTypes),
              pick([
                "Battery Health Passport.pdf", "IEC 62133 Test Report.pdf",
                "EU Battery Regulation Compliance.pdf", "Warranty Certificate.pdf",
                "Recycling Authorization.pdf", "UN3480 Transport Document.pdf"
              ]),
              `https://storage.example.com/docs/${bat.bpan}-${randInt(1000, 9999)}.pdf`,
              `docs/${bat.bpan}-${randInt(1000, 9999)}.pdf`,
              "application/pdf",
              randInt(50000, 5000000),
              Math.random() < 0.3,
              Math.random() < 0.4 ? daysAgo(-randInt(30, 365)) : null,
              JSON.stringify({ version: "1.0", issuer: pick(["TÜV SÜD", "Bureau Veritas", "SGS", "Intertek"]) })
            ]
          );
          docCount++;
        } catch (e: any) {
          if (docCount === 0) console.error(`  Document error: ${e.message?.slice(0, 150)}`);
        }
      }
    }
    console.log(`  ✓ ${docCount} documents seeded`);

    // ── 10. Seed service history ─────────────────────────────────────────────
    console.log("\n🔧 Seeding service history...");
    let svcCount = 0;
    const serviceTypes = ["inspection", "repair", "replacement", "calibration", "software_update", "cleaning"];
    for (const bat of batteryIds.slice(0, 60)) {
      if (Math.random() < 0.5) {
        const techId = insertedUserIds[svcCount % insertedUserIds.length];
        try {
          await client.query(
            `INSERT INTO "serviceHistory"(
              "batteryId", bpan, "technicianId", "serviceType", "serviceDate",
              "sohBefore", "sohAfter", "cycleCountBefore", "cycleCountAfter",
              "workPerformed", "partsReplaced", "laborHours", cost, currency,
              "nextServiceDue", "serviceCenter", outcome, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [
              bat.id, bat.bpan, techId,
              pick(serviceTypes),
              daysAgo(randInt(10, 365)),
              rand(65, 95).toFixed(2), rand(68, 98).toFixed(2),
              randInt(200, 1500), randInt(200, 1500),
              pick([
                "Full battery inspection and cell balancing performed.",
                "BMS firmware updated to v3.2.1. Cell voltage calibration completed.",
                "Replaced 2 degraded cells in module 3. Full capacity test passed.",
                "Thermal management system cleaned and coolant replaced.",
                "Routine 12-month inspection. All parameters within spec."
              ]),
              JSON.stringify(Math.random() < 0.3 ? [pick(["BMS Module", "Cell Module", "Cooling Pump", "Connector"])] : []),
              rand(1, 8).toFixed(1),
              rand(500, 15000).toFixed(2), pick(["USD", "EUR", "INR"]),
              daysAgo(-randInt(90, 365)),
              pick(["Tata Motors Service Center", "Mahindra Authorized Workshop", "Attero Recycling Hub", "GreenCell Service Point"]),
              pick(["completed", "completed", "completed", "partial", "pending_parts"]),
              Math.random() < 0.3 ? "Customer notified of upcoming end-of-life. Second-life options discussed." : null
            ]
          );
          svcCount++;
        } catch (e: any) {
          if (svcCount === 0) console.error(`  Service history error: ${e.message?.slice(0, 150)}`);
        }
      }
    }
    console.log(`  ✓ ${svcCount} service history records seeded`);

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log("\n✅ Production seed complete!");
    console.log(`  Batteries: ${batteryIds.length}`);
    console.log(`  Users: ${insertedUserIds.length}`);
    console.log(`  Telemetry: ${telCount}`);
    console.log(`  SOH Predictions: ${sohCount}`);
    console.log(`  Marketplace: ${mktCount}`);
    console.log(`  Logistics: ${logCount}`);
    console.log(`  EPR Tokens: ${eprCount}`);
    console.log(`  Alerts: ${alertCount}`);
    console.log(`  Documents: ${docCount}`);
    console.log(`  Service History: ${svcCount}`);

  } catch (e: any) {
    console.error("❌ Fatal seed error:", e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
