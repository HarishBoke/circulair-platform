/**
 * Production seed script for Render PostgreSQL database.
 * Run via: npx tsx server/seed-prod.ts
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, sql } from "drizzle-orm";
import {
  users,
  batteries,
  telemetry,
  sohPredictions,
  marketplaceListings,
  logistics,
  eprTokens,
  alerts,
  documents,
  serviceHistory,
  regulatoryProfiles,
  platformSettings,
  warrantyRecords,
  auditLogs,
  apiKeys,
  webhooks,
  iotDevices,
  marketplaceOffers,
  alertRules,
  batteryTwins,
  carbonFootprints,
  blockchainAnchors,
  triageJobs,
  forwardOrders,
  contactInquiries,
  recycledContentDeclarations,
  modelVersions,
  dataSharingAgreements,
} from "../drizzle/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
  max: 5,
});
const db = drizzle(pool);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);
const hexStr = (len: number) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");

const CHEMISTRIES = ["NMC", "LFP", "NCA", "LTO", "NMC-811", "LFP-Prismatic"];
const CHEM_CODES: Record<string, string> = { NMC: "N", LFP: "L", NCA: "A", LTO: "T", "NMC-811": "M", "LFP-Prismatic": "P" };
const COUNTRIES = ["IN", "DE", "CN", "US", "JP", "KR", "FR", "GB"];
const MANUFACTURERS = ["TTA", "BYD", "PAN", "SAM", "LGE", "CAT", "ATL", "EVE"];
const STATUSES = ["operational", "degraded", "retired", "recycling", "storage", "transit"];
const LOCATIONS = [
  "Mumbai, Maharashtra", "Delhi, NCR", "Bengaluru, Karnataka",
  "Chennai, Tamil Nadu", "Hyderabad, Telangana", "Pune, Maharashtra",
  "Ahmedabad, Gujarat", "Kolkata, West Bengal", "Hamburg, Germany",
  "Berlin, Germany", "Shenzhen, China", "Shanghai, China",
];

function generateBpan(i: number): string {
  const cc = pick(COUNTRIES);
  const mfg = pick(MANUFACTURERS);
  const cap = String(randInt(10, 99));
  const chem = pick(Object.values(CHEM_CODES));
  const volt = String(randInt(10, 99));
  const orig = pick(COUNTRIES);
  const ext = pick(["A", "B", "C"]);
  const year = String(randInt(21, 25));
  const month = String(randInt(1, 12)).padStart(2, "0");
  const day = String(randInt(1, 28)).padStart(2, "0");
  const factory = pick(["A", "B", "C", "D"]);
  const serial = String(i).padStart(4, "0");
  return `${cc}${mfg}${cap}${chem}${volt}${orig}${ext}${year}${month}${day}${factory}${serial}`;
}

async function main() {
  console.log("🌱 Starting production seed for Circul-AI-r platform...\n");

  // ── Check existing data ────────────────────────────────────────────────────
  const existingBatteries = await db.select({ count: sql<number>`count(*)` }).from(batteries);
  const batteryCount = Number(existingBatteries[0]?.count ?? 0);
  console.log(`📊 Existing batteries: ${batteryCount}`);

  if (batteryCount > 50) {
    console.log("✅ Database already has sufficient battery data. Running supplemental seed only...\n");
    const existingUsers = await db.select({ id: users.id }).from(users).limit(20);
    const userIds = existingUsers.map(u => u.id);
    const existingBats = await db.select({ id: batteries.id, bpan: batteries.bpan }).from(batteries).limit(80);
    await seedSupplemental(userIds, existingBats);
    await pool.end();
    console.log("\n✅ Supplemental seed complete!");
    return;
  }

  // ── 1. Seed users ──────────────────────────────────────────────────────────
  console.log("👤 Seeding users...");
  const seedUsers = [
    { openId: "seed-oem-001", name: "Rajesh Kumar", email: "rajesh.kumar@tatamotors.com", role: "user" as const, platformRole: "oem", organization: "Tata Motors EV Division", loginMethod: "password" },
    { openId: "seed-oem-002", name: "Priya Sharma", email: "priya.sharma@mahindra.com", role: "user" as const, platformRole: "oem", organization: "Mahindra Electric", loginMethod: "password" },
    { openId: "seed-recycler-001", name: "Arjun Mehta", email: "arjun.mehta@attero.in", role: "user" as const, platformRole: "recycler", organization: "Attero Recycling", loginMethod: "password" },
    { openId: "seed-recycler-002", name: "Sunita Patel", email: "sunita.patel@lohum.com", role: "user" as const, platformRole: "recycler", organization: "Lohum Cleantech", loginMethod: "password" },
    { openId: "seed-trader-001", name: "Vikram Singh", email: "vikram.singh@betteries.in", role: "user" as const, platformRole: "trader", organization: "Betteries Energy", loginMethod: "password" },
    { openId: "seed-trader-002", name: "Ananya Iyer", email: "ananya.iyer@greencell.com", role: "user" as const, platformRole: "trader", organization: "GreenCell Mobility", loginMethod: "password" },
    { openId: "seed-regulator-001", name: "Dr. Suresh Nair", email: "suresh.nair@mnre.gov.in", role: "user" as const, platformRole: "regulator", organization: "MNRE India", loginMethod: "password" },
    { openId: "seed-admin-001", name: "Harish Boke", email: "harish@setoo.co", role: "admin" as const, platformRole: "oem", organization: "Setoo Technologies", loginMethod: "password" },
    { openId: "seed-oem-003", name: "Kiran Desai", email: "kiran.desai@olaelectric.com", role: "user" as const, platformRole: "oem", organization: "Ola Electric", loginMethod: "password" },
    { openId: "seed-trader-003", name: "Meera Krishnan", email: "meera.k@secondlife.in", role: "user" as const, platformRole: "trader", organization: "SecondLife Energy", loginMethod: "password" },
  ];

  const insertedUserIds: number[] = [];
  for (const u of seedUsers) {
    try {
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.openId, u.openId));
      if (existing.length > 0) {
        insertedUserIds.push(existing[0].id);
        continue;
      }
      const result = await db.insert(users).values(u).returning({ id: users.id });
      insertedUserIds.push(result[0].id);
    } catch (e: any) {
      console.warn(`  Skipping user ${u.email}: ${e.message?.slice(0, 80)}`);
    }
  }
  console.log(`  ✓ ${insertedUserIds.length} users ready`);

  // ── 2. Seed batteries ──────────────────────────────────────────────────────
  console.log("🔋 Seeding 200 batteries...");
  const batteryIds: { id: number; bpan: string }[] = [];
  for (let i = 1; i <= 200; i++) {
    const chemistry = pick(CHEMISTRIES);
    const capacityKwh = pick([10, 20, 30, 40, 50, 60, 75, 100]);
    const voltageV = pick([48, 96, 144, 192, 288, 360, 400, 480]);
    const status = i <= 140 ? "operational" : i <= 160 ? "degraded" : i <= 175 ? "storage" : i <= 185 ? "transit" : i <= 195 ? "retired" : "recycling";
    const soh = status === "operational" ? rand(75, 100) : status === "degraded" ? rand(50, 75) : rand(20, 60);
    const bpan = generateBpan(i);
    const ownerId = insertedUserIds[i % insertedUserIds.length];

    try {
      const result = await db.insert(batteries).values({
        bpan,
        countryCode: pick(COUNTRIES),
        manufacturerId: pick(MANUFACTURERS),
        capacityCode: String(Math.floor(capacityKwh / 10)).padStart(2, "0"),
        capacityKwh: String(capacityKwh),
        chemistryCode: CHEM_CODES[chemistry] ?? "N",
        chemistry,
        voltageCode: String(Math.floor(voltageV / 10)).padStart(2, "0"),
        voltageV: String(voltageV),
        cellOriginCode: pick(COUNTRIES),
        cellOriginCountry: pick(["China", "South Korea", "Japan", "India", "Germany"]),
        extinguisherClass: pick(["A", "B", "C"]),
        mfgYear: randInt(2020, 2024),
        mfgMonth: randInt(1, 12),
        mfgDay: randInt(1, 28),
        factoryCode: pick(["A", "B", "C", "D"]),
        serialNumber: String(i).padStart(4, "0"),
        recyclabilityPct: String(rand(60, 95).toFixed(2)),
        lithiumPct: String(rand(5, 12).toFixed(2)),
        cobaltPct: String(rand(0, 20).toFixed(2)),
        nickelPct: String(rand(10, 40).toFixed(2)),
        manganesePct: String(rand(5, 20).toFixed(2)),
        carbonFootprintKgCo2: String(rand(50, 200).toFixed(2)),
        status,
        currentSoh: String(soh.toFixed(2)),
        cycleCount: randInt(50, 2000),
        lastServiceDate: daysAgo(randInt(10, 365)),
        registeredById: ownerId,
        ownerId,
        vehicleId: `VH-${String(i).padStart(5, "0")}`,
      }).returning({ id: batteries.id });
      batteryIds.push({ id: result[0].id, bpan });
    } catch (e: any) {
      // skip duplicates silently
    }
  }
  console.log(`  ✓ ${batteryIds.length} batteries seeded`);

  // ── 3. Seed telemetry ──────────────────────────────────────────────────────
  console.log("📡 Seeding telemetry (15 records per battery for first 60)...");
  let telCount = 0;
  for (const bat of batteryIds.slice(0, 60)) {
    for (let t = 0; t < 15; t++) {
      try {
        await db.insert(telemetry).values({
          bpan: bat.bpan,
          batteryId: bat.id,
          vPack: String(rand(280, 420).toFixed(2)),
          iPack: String(rand(-150, 150).toFixed(2)),
          vMin: String(rand(3.0, 3.5).toFixed(3)),
          vMax: String(rand(3.8, 4.2).toFixed(3)),
          tPack: String(rand(20, 45).toFixed(2)),
          tMax: String(rand(35, 55).toFixed(2)),
          cycleCount: randInt(100, 1500),
          irPack: String(rand(1.5, 8.0).toFixed(3)),
          sohEstimate: String(rand(60, 99).toFixed(2)),
          dtcCodes: t % 10 === 0 ? ["P0A0F", "P0A80"] : [],
          thermalAnomaly: t % 15 === 0,
          anomalyType: t % 15 === 0 ? "thermal_runaway_risk" : null,
          source: pick(["mqtt", "api", "manual", "simulated"]),
          recordedAt: daysAgo(randInt(0, 90)),
        });
        telCount++;
      } catch (e: any) { /* skip */ }
    }
  }
  console.log(`  ✓ ${telCount} telemetry records seeded`);

  // ── 4. SOH Predictions ────────────────────────────────────────────────────
  console.log("🤖 Seeding SOH predictions...");
  let sohCount = 0;
  for (const bat of batteryIds.slice(0, 100)) {
    try {
      await db.insert(sohPredictions).values({
        bpan: bat.bpan,
        batteryId: bat.id,
        predictedSoh: String(rand(55, 98).toFixed(2)),
        rulCycles: randInt(200, 2000),
        confidence: String(rand(0.75, 0.98).toFixed(2)),
        rmse: String(rand(0.01, 0.05).toFixed(4)),
        triagePath: pick(["reuse", "remanufacture", "recycle", "second_life"]),
        triageReason: pick([
          "SOH above 80% — suitable for second-life ESS",
          "SOH 60-80% — remanufacturing recommended",
          "SOH below 60% — recycling pathway",
          "High internal resistance — maintenance required",
        ]),
        maintenanceRecommendations: ["Check cell balancing", "Inspect thermal management system", "Verify BMS firmware version"],
        modelVersion: "v3.2.1",
      });
      sohCount++;
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${sohCount} SOH predictions seeded`);

  // ── 5. Marketplace listings ───────────────────────────────────────────────
  console.log("🛒 Seeding marketplace listings...");
  let listCount = 0;
  for (const bat of batteryIds.slice(0, 70)) {
    const capacityKwh = pick([10, 20, 30, 40, 50, 60, 75, 100]);
    const pricePerKwh = rand(2000, 8000);
    try {
      await db.insert(marketplaceListings).values({
        bpan: bat.bpan,
        batteryId: bat.id,
        sellerId: insertedUserIds[listCount % insertedUserIds.length],
        listingType: pick(["spot", "forward", "auction", "fixed"]),
        askingPriceInr: String((pricePerKwh * capacityKwh).toFixed(2)),
        spotPriceInr: String((pricePerKwh * capacityKwh * 0.95).toFixed(2)),
        sohAtListing: String(rand(55, 95).toFixed(2)),
        rulAtListing: randInt(200, 2000),
        capacityKwh: String(capacityKwh),
        chemistry: pick(CHEMISTRIES),
        description: `Grade-${pick(["A", "B", "C"])} battery pack with verified SOH. Suitable for ${pick(["ESS", "EV second-life", "telecom backup", "industrial UPS"])}.`,
        conditionGrade: pick(["A", "B", "C", "A+", "B+"]),
        conditionNotes: pick([
          "Minor cosmetic wear, all cells balanced",
          "BMS replaced 6 months ago, excellent condition",
          "Original factory condition, low cycle count",
          "Post-EV use, capacity verified by third party",
        ]),
        location: pick(LOCATIONS),
        status: pick(["active", "active", "active", "sold", "pending"]),
      });
      listCount++;
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${listCount} marketplace listings seeded`);

  // ── 6. Logistics ──────────────────────────────────────────────────────────
  console.log("🚚 Seeding logistics...");
  let logCount = 0;
  for (const bat of batteryIds.slice(0, 50)) {
    try {
      await db.insert(logistics).values({
        shipmentId: `SHP-${String(logCount + 1).padStart(6, "0")}`,
        bpan: bat.bpan,
        batteryId: bat.id,
        requestedById: insertedUserIds[logCount % insertedUserIds.length],
        pickupAddress: pick(LOCATIONS),
        deliveryAddress: pick(LOCATIONS),
        pickupLat: String(rand(8, 35).toFixed(7)),
        pickupLng: String(rand(68, 97).toFixed(7)),
        deliveryLat: String(rand(8, 35).toFixed(7)),
        deliveryLng: String(rand(68, 97).toFixed(7)),
        currentLat: String(rand(8, 35).toFixed(7)),
        currentLng: String(rand(68, 97).toFixed(7)),
        logisticsPartner: pick(["BlueDart", "Delhivery", "DTDC", "Ecom Express", "XpressBees"]),
        driverName: pick(["Ramesh Kumar", "Sunil Yadav", "Ajay Singh", "Mohan Das", "Ravi Patel"]),
        vehicleNumber: `MH-${randInt(10, 99)}-${String.fromCharCode(65 + randInt(0, 25))}${String.fromCharCode(65 + randInt(0, 25))}-${randInt(1000, 9999)}`,
        slaTier: pick(["24h", "48h", "72h", "7d"]),
        status: pick(["pending", "dispatched", "in_transit", "delivered", "delivered", "delivered"]),
        requestedAt: daysAgo(randInt(1, 30)),
        dispatchedAt: daysAgo(randInt(0, 20)),
        estimatedDelivery: daysFromNow(randInt(1, 7)),
        deliveredAt: logCount % 3 === 0 ? daysAgo(randInt(0, 10)) : null,
      });
      logCount++;
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${logCount} logistics records seeded`);

  // ── 7. EPR tokens ─────────────────────────────────────────────────────────
  console.log("♻️  Seeding EPR tokens...");
  let eprCount = 0;
  for (const bat of batteryIds.slice(0, 60)) {
    try {
      const weightKg = rand(10, 500);
      await db.insert(eprTokens).values({
        tokenId: `EPR-${bat.bpan.slice(0, 8)}-${randInt(10000, 99999)}`,
        bpan: bat.bpan,
        batteryId: bat.id,
        recyclerId: insertedUserIds[eprCount % insertedUserIds.length],
        producerId: insertedUserIds[(eprCount + 1) % insertedUserIds.length],
        actualYieldKg: String((weightKg * rand(0.85, 0.95)).toFixed(3)),
        theoreticalYieldKg: String(weightKg.toFixed(3)),
        yieldRatio: String(rand(0.85, 0.95).toFixed(4)),
        blackMassKg: String((weightKg * rand(0.4, 0.6)).toFixed(3)),
        lithiumRecoveredKg: String((weightKg * rand(0.05, 0.08)).toFixed(3)),
        cobaltRecoveredKg: String((weightKg * rand(0.02, 0.06)).toFixed(3)),
        nickelRecoveredKg: String((weightKg * rand(0.08, 0.15)).toFixed(3)),
        status: pick(["pending", "verified", "verified", "rejected"]),
        blockchainTxHash: `0x${hexStr(64)}`,
        blockchainBlock: randInt(18000000, 20000000),
        cpcbFormUrl: `https://circulair.energy/cpcb/${bat.bpan}.pdf`,
        verifiedAt: eprCount % 3 === 0 ? daysAgo(randInt(0, 30)) : null,
      });
      eprCount++;
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${eprCount} EPR tokens seeded`);

  // ── 8. Alerts ─────────────────────────────────────────────────────────────
  console.log("🚨 Seeding alerts...");
  let alertCount = 0;
  for (const bat of batteryIds.slice(0, 40)) {
    try {
      const alertType = pick(["thermal_anomaly", "soh_degradation", "overcharge", "deep_discharge", "cell_imbalance", "maintenance_due"]);
      const alertMsg = pick([
        "Thermal anomaly detected — pack temperature exceeded 55°C",
        "SOH dropped below 70% threshold",
        "Cell voltage imbalance detected across pack",
        "Scheduled maintenance overdue by 30 days",
        "Internal resistance increased by 15% from baseline",
      ]);
      await db.insert(alerts).values({
        bpan: bat.bpan,
        batteryId: bat.id,
        userId: insertedUserIds[alertCount % insertedUserIds.length],
        type: alertType,
        severity: pick(["critical", "warning", "info"]),
        title: alertType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        message: alertMsg,
        acknowledged: alertCount % 3 === 0,
        createdAt: daysAgo(randInt(0, 30)),
      });
      alertCount++;
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${alertCount} alerts seeded`);

  // ── 9. Documents ──────────────────────────────────────────────────────────
  console.log("📄 Seeding documents...");
  let docCount = 0;
  for (const bat of batteryIds.slice(0, 50)) {
    try {
      await db.insert(documents).values({
        bpan: bat.bpan,
        batteryId: bat.id,
        uploadedById: insertedUserIds[docCount % insertedUserIds.length],
        type: pick(["health_passport", "test_report", "compliance_cert", "warranty_cert", "hazmat_manifest", "disassembly_guide"]),
        name: `${bat.bpan}-${pick(["health-passport", "test-report", "compliance"])}.pdf`,
        fileUrl: `https://circulair.energy/docs/${bat.bpan}.pdf`,
        fileSizeBytes: randInt(50000, 5000000),
        mimeType: "application/pdf",
        accessLevel: pick(["organization", "public", "private"]),
      });
      docCount++;
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${docCount} documents seeded`);

  // ── 10. Service history ───────────────────────────────────────────────────
  console.log("🔧 Seeding service history...");
  let svcCount = 0;
  for (const bat of batteryIds.slice(0, 60)) {
    for (let s = 0; s < randInt(1, 3); s++) {
      try {
        await db.insert(serviceHistory).values({
          bpan: bat.bpan,
          batteryId: bat.id,
          serviceProviderId: insertedUserIds[svcCount % insertedUserIds.length],
          serviceType: pick(["inspection", "cell_replacement", "bms_update", "balancing", "thermal_service", "capacity_test"]),
          notes: pick([
            "Full pack inspection and cell balancing performed",
            "BMS firmware updated to v4.1.2",
            "2 degraded cells replaced, capacity restored to 94%",
            "Thermal management system serviced",
            "Capacity test performed — results within spec",
          ]),
          sohBefore: String(rand(60, 85).toFixed(2)),
          sohAfter: String(rand(85, 98).toFixed(2)),
          location: pick(["Tata AutoComp Pune", "Mahindra Service Bengaluru", "Attero Noida", "Lohum Delhi"]),
          servicedAt: daysAgo(randInt(10, 365)),
        });
        svcCount++;
      } catch (e: any) { /* skip */ }
    }
  }
  console.log(`  ✓ ${svcCount} service history records seeded`);

  await seedSupplemental(insertedUserIds, batteryIds);

  console.log("\n✅ Production seed complete!");
  console.log(`   Batteries: ${batteryIds.length}`);
  console.log(`   Users: ${insertedUserIds.length}`);
  console.log(`   Telemetry: ${telCount}`);
  console.log(`   SOH Predictions: ${sohCount}`);
  console.log(`   Marketplace: ${listCount}`);
  console.log(`   Logistics: ${logCount}`);
  console.log(`   EPR Tokens: ${eprCount}`);
  console.log(`   Alerts: ${alertCount}`);
  console.log(`   Documents: ${docCount}`);
  console.log(`   Service History: ${svcCount}`);
}

async function seedSupplemental(userIds: number[], batIds: { id: number; bpan: string }[]) {
  if (!userIds.length || !batIds.length) return;

  // ── Warranty records ──────────────────────────────────────────────────────
  console.log("📋 Seeding warranty records...");
  let warCount = 0;
  for (const bat of batIds.slice(0, 60)) {
    try {
      const purchaseDate = daysAgo(randInt(30, 730));
      const warrantyStartDate = new Date(purchaseDate);
      const warrantyEndDate = new Date(purchaseDate.getTime() + 3 * 365 * 86400000);
      await db.insert(warrantyRecords).values({
        batteryId: bat.id,
        bpan: bat.bpan,
        registeredById: userIds[warCount % userIds.length],
        warrantyType: pick(["standard", "extended", "performance"]),
        coverageType: pick(["full_replacement", "pro_rata", "labor_only"]),
        warrantyTermMonths: pick([12, 24, 36, 48, 60]),
        purchaseDate,
        warrantyStartDate,
        warrantyEndDate,
        status: warrantyEndDate > new Date() ? "active" : "expired",
        customerName: pick(["Rajesh Kumar", "Priya Sharma", "Vikram Singh", "Ananya Iyer", "Kiran Desai"]),
        customerPhone: `+91-${randInt(7000000000, 9999999999)}`,
        customerEmail: pick(["rajesh@tatamotors.com", "priya@mahindra.com", "vikram@betteries.in"]),
        dealerName: pick(["Tata Motors Pune", "Mahindra Bengaluru", "Ola Electric Delhi"]),
        dealerCode: `DLR-${randInt(1000, 9999)}`,
        manufacturer: pick(["Tata Motors", "Mahindra Electric", "Ola Electric", "Attero Recycling"]),
        invoiceNumber: `INV-${randInt(100000, 999999)}`,
        purchaseAmount: String(rand(50000, 500000).toFixed(2)),
        purchaseCurrency: "INR",
        totalClaims: randInt(0, 3),
      });
      warCount++;
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${warCount} warranty records seeded`);

  // ── Carbon footprints ─────────────────────────────────────────────────────
  console.log("🌿 Seeding carbon footprints...");
  let cfCount = 0;
  for (const bat of batIds.slice(0, 70)) {
    try {
      await db.insert(carbonFootprints).values({
        bpan: bat.bpan,
        manufacturingKgCo2: String(rand(30, 80).toFixed(3)),
        transportKgCo2: String(rand(5, 25).toFixed(3)),
        operationalKgCo2: String(rand(10, 40).toFixed(3)),
        eolKgCo2: String(rand(2, 15).toFixed(3)),
        totalKgCo2: String(rand(50, 160).toFixed(3)),
        gridCarbonIntensity: String(rand(0.3, 0.9).toFixed(2)),
        gridRegion: pick(["IN-South", "IN-West", "IN-North", "EU-Central", "CN-East"]),
        certUrl: `https://circulair.energy/carbon/${bat.bpan}.pdf`,
        calculatedAt: daysAgo(randInt(1, 180)),
      });
      cfCount++;
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${cfCount} carbon footprint records seeded`);

  // ── Blockchain anchors ────────────────────────────────────────────────────
  console.log("⛓️  Seeding blockchain anchors...");
  let bcCount = 0;
  for (const bat of batIds.slice(0, 60)) {
    try {
      await db.insert(blockchainAnchors).values({
        bpan: bat.bpan,
        txHash: `0x${hexStr(64)}`,
        blockNumber: randInt(18000000, 20000000),
        network: pick(["polygon-mumbai", "ethereum-mainnet", "hyperledger"]),
        eventType: pick(["registration", "transfer", "service", "certification", "recycling"]),
        dataHash: hexStr(64),
        payload: { bpan: bat.bpan, timestamp: new Date().toISOString(), action: "registered" },
        anchoredAt: daysAgo(randInt(1, 365)),
      });
      bcCount++;
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${bcCount} blockchain anchors seeded`);

  // ── Battery twins ─────────────────────────────────────────────────────────
  console.log("🔬 Seeding battery digital twins...");
  let twinCount = 0;
  for (const bat of batIds.slice(0, 60)) {
    try {
      await db.insert(batteryTwins).values({
        bpan: bat.bpan,
        simulatedSoh: String(rand(60, 99).toFixed(2)),
        forecastHorizonDays: pick([90, 180, 365, 730]),
        forecastData: {
          points: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            soh: (rand(60, 99) - i * 0.5).toFixed(2),
          })),
        },
        modelVersion: pick(["physics-v1.0", "ml-v2.1", "hybrid-v3.0"]),
        confidence: String(rand(0.75, 0.98).toFixed(3)),
        lastUpdated: daysAgo(randInt(0, 7)),
      });
      twinCount++;
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${twinCount} battery twins seeded`);

  // ── Alert rules ───────────────────────────────────────────────────────────
  console.log("⚡ Seeding alert rules...");
  const alertRuleData = [
    { name: "Critical SOH Threshold", metric: "soh", operator: "lt", threshold: "60", severity: "critical" },
    { name: "Warning SOH Threshold", metric: "soh", operator: "lt", threshold: "75", severity: "warning" },
    { name: "High Temperature Alert", metric: "temperature", operator: "gt", threshold: "55", severity: "critical" },
    { name: "Overcharge Protection", metric: "voltage", operator: "gt", threshold: "4.25", severity: "critical" },
    { name: "Deep Discharge Alert", metric: "voltage", operator: "lt", threshold: "3.0", severity: "warning" },
    { name: "High Internal Resistance", metric: "internal_resistance", operator: "gt", threshold: "10", severity: "warning" },
    { name: "Maintenance Due", metric: "cycle_count", operator: "gt", threshold: "1500", severity: "info" },
    { name: "Cell Imbalance Alert", metric: "cell_delta_v", operator: "gt", threshold: "0.1", severity: "warning" },
  ];
  for (const rule of alertRuleData) {
    try {
      await db.insert(alertRules).values({
        name: rule.name,
        metric: rule.metric,
        operator: rule.operator,
        threshold: rule.threshold,
        severity: rule.severity,
        enabled: true,
        createdBy: userIds[0],
      });
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${alertRuleData.length} alert rules seeded`);

  // ── API keys ──────────────────────────────────────────────────────────────
  console.log("🔑 Seeding API keys...");
  const apiKeyData = [
    { name: "Tata Motors Integration", scopes: ["batteries:read", "telemetry:read"] },
    { name: "Attero Recycling API", scopes: ["batteries:read", "epr:write", "logistics:read"] },
    { name: "MNRE Regulatory Access", scopes: ["batteries:read", "compliance:read", "carbon:read"] },
    { name: "GreenCell Marketplace", scopes: ["marketplace:read", "marketplace:write"] },
  ];
  for (const key of apiKeyData) {
    try {
      await db.insert(apiKeys).values({
        userId: userIds[0],
        name: key.name,
        keyHash: hexStr(64),
        keyPrefix: `ck_${hexStr(8)}`,
        scopes: key.scopes,
        rateLimitTier: "standard",
        rateLimit: 1000,
        status: "active",
        expiresAt: daysFromNow(365),
        lastUsedAt: daysAgo(randInt(0, 30)),
      });
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${apiKeyData.length} API keys seeded`);

  // ── Webhooks ──────────────────────────────────────────────────────────────
  console.log("🪝 Seeding webhooks...");
  const webhookData = [
    { name: "Tata Motors Battery Events", url: "https://api.tatamotors.com/webhooks/battery-events", events: ["battery.degraded", "battery.retired"] },
    { name: "Attero Recycling Hook", url: "https://api.attero.in/webhooks/circulair", events: ["battery.recycling", "epr.issued"] },
    { name: "MNRE Regulatory Feed", url: "https://mnre.gov.in/api/battery-passport", events: ["battery.registered", "compliance.updated"] },
  ];
  for (const wh of webhookData) {
    try {
      await db.insert(webhooks).values({
        userId: userIds[0],
        name: wh.name,
        url: wh.url,
        events: wh.events,
        secret: `whsec_${hexStr(32)}`,
        status: "active",
        maxRetries: 3,
      });
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${webhookData.length} webhooks seeded`);

  // ── Triage jobs ───────────────────────────────────────────────────────────
  console.log("🔀 Seeding triage jobs...");
  let triageCount = 0;
  for (const bat of batIds.slice(0, 40)) {
    try {
      await db.insert(triageJobs).values({
        bpan: bat.bpan,
        recommendedPath: pick(["reuse", "remanufacture", "recycle", "second_life_ess"]),
        confidence: String(rand(0.7, 0.98).toFixed(3)),
        status: pick(["pending_approval", "approved", "approved", "rejected"]),
        autoActionsLog: [
          { action: "soh_check", result: "pass", timestamp: new Date().toISOString() },
          { action: "market_price_check", result: "pass", timestamp: new Date().toISOString() },
        ],
        reviewedBy: triageCount % 2 === 0 ? userIds[0] : null,
        reviewedAt: triageCount % 2 === 0 ? daysAgo(randInt(0, 10)) : null,
        reviewNote: triageCount % 2 === 0 ? "Approved for second-life ESS deployment" : null,
      });
      triageCount++;
    } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${triageCount} triage jobs seeded`);

  // ── Forward orders ────────────────────────────────────────────────────────
  console.log("📦 Seeding forward orders...");
  for (let f = 0; f < 15; f++) {
    try {
      await db.insert(forwardOrders).values({
        buyerId: userIds[f % userIds.length],
        targetSohMin: String(rand(70, 80).toFixed(2)),
        targetSohMax: String(rand(85, 100).toFixed(2)),
        chemistry: pick(CHEMISTRIES),
        minCapacityKwh: String(pick([20, 30, 40, 50, 75, 100])),
        quantity: randInt(1, 20),
        deliveryMonth: `${2025 + Math.floor(f / 6)}-${String((f % 12) + 1).padStart(2, "0")}`,
        maxPricePerKwh: String(rand(3000, 8000).toFixed(2)),
        status: pick(["pending", "matched", "fulfilled", "expired"]),
        expiresAt: daysFromNow(randInt(30, 180)),
      });
    } catch (e: any) { /* skip */ }
  }
  console.log("  ✓ 15 forward orders seeded");

  // ── Regulatory profiles ───────────────────────────────────────────────────
  console.log("📜 Seeding regulatory profiles...");
  for (const bat of batIds.slice(0, 40)) {
    try {
      await db.insert(regulatoryProfiles).values({
        bpan: bat.bpan,
        batteryId: bat.id,
        jurisdiction: pick(["IN", "EU", "US", "CN", "JP"]),
        status: pick(["compliant", "compliant", "pending", "non_compliant"]),
        profileData: {
          regulation: pick(["EU Battery Regulation 2023/1542", "CPCB EPR Guidelines 2022", "IEC 62619:2022"]),
          certificationNumber: `CERT-${bat.bpan.slice(0, 8)}-${randInt(1000, 9999)}`,
          verifiedBy: pick(["Bureau Veritas", "SGS India", "TÜV SÜD", "Intertek"]),
        },
        govSyncStatus: pick(["synced", "not_required", "pending"]),
        lastCheckedAt: daysAgo(randInt(0, 30)),
      });
    } catch (e: any) { /* skip */ }
  }
  console.log("  ✓ Regulatory profiles seeded");

  // ── Recycled content declarations ─────────────────────────────────────────
  console.log("♻️  Seeding recycled content declarations...");
  for (const bat of batIds.slice(0, 40)) {
    try {
      await db.insert(recycledContentDeclarations).values({
        bpan: bat.bpan,
        batteryId: bat.id,
        cobaltPct: String(rand(12, 16).toFixed(2)),
        lithiumPct: String(rand(6, 8).toFixed(2)),
        nickelPct: String(rand(4, 6).toFixed(2)),
        leadPct: String(rand(85, 90).toFixed(2)),
        totalRecycledPct: String(rand(20, 35).toFixed(2)),
        verificationMethod: pick(["SELF_DECLARED", "THIRD_PARTY_VERIFIED", "CERTIFIED"]),
        certifyingBody: pick(["Bureau Veritas", "SGS", "TÜV SÜD"]),
        certificateRef: `RCD-${randInt(10000, 99999)}`,
        declaredById: userIds[0],
        declaredAt: daysAgo(randInt(1, 180)),
      });
    } catch (e: any) { /* skip */ }
  }
  console.log("  ✓ Recycled content declarations seeded");

  // ── Model versions ────────────────────────────────────────────────────────
  console.log("🧠 Seeding model versions...");
  const models = [
    { version: "v3.2.1", rmse: "0.0312", mae: "0.0245", r2: "0.9421", batteryCount: 125000, isActive: true },
    { version: "v3.1.0", rmse: "0.0389", mae: "0.0312", r2: "0.9280", batteryCount: 98000, isActive: false },
    { version: "v2.1.0", rmse: "0.0421", mae: "0.0356", r2: "0.9150", batteryCount: 75000, isActive: false },
    { version: "v1.3.0", rmse: "0.0512", mae: "0.0445", r2: "0.8930", batteryCount: 60000, isActive: false },
  ];
  for (const m of models) {
    try {
      await db.insert(modelVersions).values({
        version: m.version,
        rmse: m.rmse,
        mae: m.mae,
        r2: m.r2,
        batteryCount: m.batteryCount,
        federatedRounds: randInt(10, 50),
        isActive: m.isActive,
        trainedAt: daysAgo(randInt(30, 365)),
      });
    } catch (e: any) { /* skip */ }
  }
  console.log("  ✓ Model versions seeded");

  // ── Platform settings ─────────────────────────────────────────────────────
  console.log("⚙️  Seeding platform settings...");
  const platformSettingsData = [
    { userId: userIds[0], locale: "en-IN", displayCurrency: "INR", timezone: "Asia/Kolkata", activeJurisdictions: ["IN", "EU"], dataResidencyRegion: "in", organisationName: "Setoo Technologies", organisationCountry: "IN" },
    { userId: userIds[1], locale: "en-IN", displayCurrency: "INR", timezone: "Asia/Kolkata", activeJurisdictions: ["IN"], dataResidencyRegion: "in", organisationName: "Tata Motors EV Division", organisationCountry: "IN" },
    { userId: userIds[2], locale: "en-IN", displayCurrency: "INR", timezone: "Asia/Kolkata", activeJurisdictions: ["IN"], dataResidencyRegion: "in", organisationName: "Attero Recycling", organisationCountry: "IN" },
  ];
  for (const s of platformSettingsData) {
    try {
      await db.insert(platformSettings).values(s);
    } catch (e: any) { /* skip */ }
  }
  console.log("  ✓ Platform settings seeded");

  // ── Contact inquiries ─────────────────────────────────────────────────────
  console.log("📬 Seeding contact inquiries...");
  const inquiries = [
    { name: "Aditya Birla", email: "aditya@hindalco.com", company: "Hindalco Industries", role: "Head of Sustainability", message: "Interested in EPR compliance module for our battery recycling operations." },
    { name: "Sarah Chen", email: "sarah.chen@catl.com", company: "CATL", role: "Business Development", message: "Looking to integrate our battery passport data with your platform." },
    { name: "Dr. Ravi Shankar", email: "ravi.shankar@iitb.ac.in", company: "IIT Bombay", role: "Research Lead", message: "Interested in accessing anonymized battery degradation data for academic research." },
    { name: "Marcus Weber", email: "m.weber@bmw.de", company: "BMW Group", role: "Battery Lifecycle Manager", message: "Evaluating second-life battery marketplace solutions for European operations." },
    { name: "Preethi Nair", email: "preethi@exide.in", company: "Exide Industries", role: "CTO", message: "Want to understand how the blockchain anchoring works for regulatory compliance." },
  ];
  for (const inq of inquiries) {
    try {
      await db.insert(contactInquiries).values({ ...inq, status: pick(["new", "read", "replied"]) });
    } catch (e: any) { /* skip */ }
  }
  console.log("  ✓ Contact inquiries seeded");

  // ── Data sharing agreements ───────────────────────────────────────────────
  console.log("🤝 Seeding data sharing agreements...");
  const agreements = [
    { scope: "telemetry,soh", purpose: "Fleet optimization research", status: "approved" },
    { scope: "carbon_footprint,compliance", purpose: "Regulatory reporting", status: "approved" },
    { scope: "marketplace,pricing", purpose: "Market analysis", status: "pending" },
  ];
  for (let i = 0; i < agreements.length; i++) {
    const ag = agreements[i];
    try {
      await db.insert(dataSharingAgreements).values({
        requestingUserId: userIds[(i + 1) % userIds.length],
        owningUserId: userIds[0],
        scope: ag.scope,
        status: ag.status,
        requestMessage: ag.purpose,
        expiresAt: daysFromNow(365),
        approvedAt: ag.status === "approved" ? daysAgo(randInt(1, 30)) : null,
      });
    } catch (e: any) { /* skip */ }
  }
  console.log("  ✓ Data sharing agreements seeded");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
}).finally(() => pool.end());
