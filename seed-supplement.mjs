/**
 * Supplemental seed script for circulair-platform PostgreSQL database
 * Seeds only the tables that are currently empty:
 * telemetry, marketplace_listings, soh_predictions, alerts, logistics, epr_tokens, documents
 * 
 * Uses existing battery IDs from the database.
 * Run with: node seed-supplement.mjs
 */
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dec = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dec));
const randDate = (daysAgo) => new Date(Date.now() - randInt(0, daysAgo) * 86400000);

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting supplemental seed...');

    // ── Get existing battery IDs and BPANs ──────────────────────────────────
    const batteriesResult = await client.query('SELECT id, bpan FROM batteries ORDER BY "createdAt" LIMIT 200');
    const batteries = batteriesResult.rows;
    if (batteries.length === 0) {
      console.log('❌ No batteries found. Run the main seed first.');
      return;
    }
    const batteryIds = batteries.map(b => b.id);
    const bpans = batteries.map(b => b.bpan);
    console.log(`📦 Found ${batteries.length} existing batteries`);

    // ── Get existing user IDs ────────────────────────────────────────────────
    const usersResult = await client.query('SELECT id FROM users LIMIT 20');
    const userIds = usersResult.rows.map(u => u.id);
    if (userIds.length === 0) {
      console.log('❌ No users found. Run the main seed first.');
      return;
    }
    console.log(`👤 Found ${userIds.length} existing users`);

    // ── Check current table counts ───────────────────────────────────────────
    const currentCounts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM telemetry) as telemetry,
        (SELECT COUNT(*) FROM "marketplace_listings") as listings,
        (SELECT COUNT(*) FROM "soh_predictions") as soh_predictions,
        (SELECT COUNT(*) FROM alerts) as alerts,
        (SELECT COUNT(*) FROM logistics) as logistics,
        (SELECT COUNT(*) FROM "epr_tokens") as epr_tokens,
        (SELECT COUNT(*) FROM documents) as documents
    `);
    console.log('📊 Current counts:', JSON.stringify(currentCounts.rows[0], null, 2));

    // ── Seed telemetry ───────────────────────────────────────────────────────
    let telemetryCount = 0;
    for (let i = 0; i < Math.min(50, batteryIds.length); i++) {
      const batteryId = batteryIds[i];
      const bpan = bpans[i];
      for (let j = 0; j < 30; j++) {
        try {
          await client.query(
            `INSERT INTO telemetry (
              bpan, "batteryId", "vPack", "iPack", "vMin", "vMax", "tPack", "tMax",
              "cycleCount", "irPack", "sohEstimate", "dtcCodes",
              "thermalAnomaly", "anomalyType", source, "recordedAt"
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [
              bpan, batteryId,
              randFloat(44, 52, 2), randFloat(-50, 50, 2), randFloat(3.1, 3.3, 3),
              randFloat(3.4, 3.6, 3), randFloat(20, 45, 2), randFloat(25, 55, 2),
              randInt(0, 800), randFloat(0.5, 5.0, 3), randFloat(60, 100, 2),
              JSON.stringify([]),
              Math.random() > 0.9, Math.random() > 0.9 ? 'thermal_runaway_risk' : null,
              'simulated', randDate(90)
            ]
          );
          telemetryCount++;
        } catch (e) {
          if (j === 0 && i === 0) console.error('Telemetry error:', e.message);
        }
      }
    }
    console.log(`✅ ${telemetryCount} telemetry records seeded`);

    // ── Seed marketplace listings ────────────────────────────────────────────
    const listingTypes = ['sale', 'lease', 'auction'];
    let listingCount = 0;
    for (let i = 0; i < Math.min(60, batteryIds.length); i++) {
      const batteryId = batteryIds[i];
      const bpan = bpans[i];
      try {
        await client.query(
          `INSERT INTO "marketplace_listings" (
            bpan, "batteryId", "sellerId", "listingType",
            "askingPriceInr", "sohAtListing", chemistry, description,
            "conditionGrade", location, status, "createdAt", "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
          [
            bpan, batteryId, rand(userIds), rand(listingTypes),
            randFloat(50000, 1500000, 2), randFloat(70, 95, 2),
            rand(['LFP', 'NMC', 'NCA', 'LTO']),
            `High-quality battery pack available for second-life applications. Fully tested and certified.`,
            rand(['A', 'B', 'C', 'D']),
            rand(['Mumbai, IN', 'Delhi, IN', 'Pune, IN', 'Chennai, IN', 'Hyderabad, IN']),
            'active'
          ]
        );
        listingCount++;
      } catch (e) {
        if (i === 0) console.error('Marketplace error:', e.message);
      }
    }
    console.log(`✅ ${listingCount} marketplace listings seeded`);

    // ── Seed SOH predictions ─────────────────────────────────────────────────
    let sohCount = 0;
    for (let i = 0; i < Math.min(100, batteryIds.length); i++) {
      try {
        await client.query(
          `INSERT INTO "soh_predictions" (
            "batteryId", bpan, "predictedSoh", confidence,
            "rulCycles", "modelVersion", "predictedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
          [
            batteryIds[i], bpans[i],
            randFloat(60, 98, 2), randFloat(0.75, 0.99, 3),
            randInt(50, 500), 'v3.2.1'
          ]
        );
        sohCount++;
      } catch (e) {
        if (i === 0) console.error('SOH prediction error:', e.message);
      }
    }
    console.log(`✅ ${sohCount} SOH predictions seeded`);

    // ── Seed alerts ──────────────────────────────────────────────────────────
    const alertTypes = ['soh_critical', 'temperature_high', 'voltage_low', 'cycle_limit', 'compliance_due'];
    const severities = ['low', 'medium', 'high', 'critical'];
    let alertCount = 0;
    for (let i = 0; i < 40; i++) {
      try {
        await client.query(
          `INSERT INTO alerts (
            "batteryId", bpan, type, severity, title, message,
            "isRead", "isResolved", "createdAt", "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
          [
            rand(batteryIds), rand(bpans),
            rand(alertTypes), rand(severities),
            `${rand(alertTypes).replace(/_/g, ' ').toUpperCase()} Alert`,
            `Automated alert: battery parameter exceeded threshold. Immediate inspection recommended.`,
            Math.random() > 0.5, Math.random() > 0.7
          ]
        );
        alertCount++;
      } catch (e) {
        if (i === 0) console.error('Alert error:', e.message);
      }
    }
    console.log(`✅ ${alertCount} alerts seeded`);

    // ── Seed logistics ───────────────────────────────────────────────────────
    const logisticStatuses = ['pending', 'in_transit', 'delivered', 'returned'];
    const carriers = ['DHL', 'FedEx', 'UPS', 'DB Schenker', 'Kuehne+Nagel'];
    let logisticsCount = 0;
    for (let i = 0; i < 30; i++) {
      const idx = randInt(0, batteryIds.length - 1);
      try {
        await client.query(
          `INSERT INTO logistics (
            "shipmentId", bpan, "batteryId", "requestedById",
            "pickupAddress", "deliveryAddress",
            "logisticsPartner", "driverName", "vehicleNumber",
            "slaTier", status, "requestedAt", "estimatedDelivery"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12)`,
          [
            `SHP${String(randInt(100000, 999999))}`,
            bpans[idx], batteryIds[idx], rand(userIds),
            rand(['Mumbai, IN', 'Delhi, IN', 'Pune, IN']),
            rand(['Hyderabad, IN', 'Chennai, IN', 'Bangalore, IN', 'Kolkata, IN']),
            rand(carriers),
            `Driver ${randInt(100, 999)}`, `MH${randInt(10,99)}-${randInt(1000,9999)}`,
            rand(['24h', '48h', '72h']),
            rand(logisticStatuses),
            new Date(Date.now() + randInt(1, 30) * 86400000)
          ]
        );
        logisticsCount++;
      } catch (e) {
        if (i === 0) console.error('Logistics error:', e.message);
      }
    }
    console.log(`✅ ${logisticsCount} logistics records seeded`);

    // ── Seed EPR tokens ──────────────────────────────────────────────────────
    const jurisdictions = ['EU', 'DE', 'FR', 'NL', 'BE', 'SE', 'PL'];
    let eprCount = 0;
    for (let i = 0; i < 20; i++) {
      try {
        await client.query(
          `INSERT INTO "epr_tokens" (
            "tokenId", bpan, "batteryId", "recyclerId", "producerId",
            "actualYieldKg", "theoreticalYieldKg", "yieldRatio",
            "blackMassKg", "lithiumRecoveredKg", "cobaltRecoveredKg",
            status, "createdAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
          [
            `EPR-${rand(jurisdictions)}-${randInt(10000, 99999)}-${Date.now() + i}`,
            bpans[i % bpans.length], batteryIds[i % batteryIds.length],
            rand(userIds), rand(userIds),
            randFloat(50, 200, 3), randFloat(60, 220, 3),
            randFloat(0.7, 0.99, 4),
            randFloat(20, 80, 3), randFloat(5, 20, 3), randFloat(3, 15, 3),
            rand(['pending', 'verified', 'redeemed'])
          ]
        );
        eprCount++;
      } catch (e) {
        if (i === 0) console.error('EPR token error:', e.message);
      }
    }
    console.log(`✅ ${eprCount} EPR tokens seeded`);

    // ── Seed documents ───────────────────────────────────────────────────────
    const docTypes = ['certificate', 'test_report', 'compliance_doc', 'warranty', 'invoice', 'customs'];
    let docCount = 0;
    for (let i = 0; i < 50; i++) {
      const idx = randInt(0, batteryIds.length - 1);
      try {
        await client.query(
          `INSERT INTO documents (
            "batteryId", bpan, "uploadedById", type, name,
            "fileUrl", "mimeType", "fileSizeBytes", "createdAt", "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
          [
            batteryIds[idx], bpans[idx], rand(userIds),
            rand(docTypes),
            `${rand(docTypes).replace(/_/g, '-')}-${bpans[idx].substring(0,8)}.pdf`,
            `https://storage.circulair.energy/docs/${bpans[idx].substring(0,8)}-${randInt(1000,9999)}.pdf`,
            'application/pdf',
            randInt(50000, 5000000)
          ]
        );
        docCount++;
      } catch (e) {
        if (i === 0) console.error('Document error:', e.message);
      }
    }
    console.log(`✅ ${docCount} documents seeded`);

    // ── Final count ──────────────────────────────────────────────────────────
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM batteries) as batteries,
        (SELECT COUNT(*) FROM telemetry) as telemetry,
        (SELECT COUNT(*) FROM "marketplace_listings") as listings,
        (SELECT COUNT(*) FROM "soh_predictions") as soh_predictions,
        (SELECT COUNT(*) FROM alerts) as alerts,
        (SELECT COUNT(*) FROM logistics) as logistics,
        (SELECT COUNT(*) FROM "epr_tokens") as epr_tokens,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM users) as users
    `);
    console.log('\n📊 Final counts:', JSON.stringify(counts.rows[0], null, 2));
    console.log('\n🎉 Supplemental seed complete!');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
