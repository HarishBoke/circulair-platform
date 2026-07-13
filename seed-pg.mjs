/**
 * Production seed script for circulair-platform PostgreSQL database
 * Uses raw pg queries with camelCase column names matching the Drizzle schema
 * Run with: node seed-pg.mjs
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
    console.log('🌱 Starting seed...');

    // ── Check existing data ──────────────────────────────────────────────────
    const existingBatteries = await client.query('SELECT COUNT(*) FROM batteries');
    if (parseInt(existingBatteries.rows[0].count) > 0) {
      console.log(`⚠️  Database already has ${existingBatteries.rows[0].count} batteries. Skipping seed.`);
      return;
    }

    // ── Show tables ──────────────────────────────────────────────────────────
    const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
    console.log('📋 Tables:', tables.rows.map(r => r.table_name).join(', '));

    // ── Seed users ───────────────────────────────────────────────────────────
    const userEmails = [
      { email: 'harish@setoo.co', name: 'Harish Boke', role: 'admin', openId: 'harish-setoo-001' },
      { email: 'admin@circulair.energy', name: 'Circul-AI-r Admin', role: 'admin', openId: 'circulair-admin-001' },
      { email: 'manufacturer@bmw.de', name: 'BMW Battery Team', role: 'user', openId: 'bmw-mfg-001' },
      { email: 'fleet@dhl.com', name: 'DHL Fleet Manager', role: 'user', openId: 'dhl-fleet-001' },
      { email: 'recycler@umicore.com', name: 'Umicore Recycling', role: 'user', openId: 'umicore-rec-001' },
      { email: 'trader@battery-exchange.eu', name: 'Battery Exchange EU', role: 'user', openId: 'bex-trader-001' },
      { email: 'compliance@eu-battery.org', name: 'EU Battery Compliance', role: 'user', openId: 'eu-comp-001' },
      { email: 'oem@stellantis.com', name: 'Stellantis OEM', role: 'user', openId: 'stellantis-oem-001' },
    ];

    const userIds = [];
    for (const u of userEmails) {
      const result = await client.query(
        `INSERT INTO users ("openId", email, name, role, "platformRole", "loginMethod", "createdAt", "updatedAt", "lastSignedIn")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
         ON CONFLICT ("openId") DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
         RETURNING id`,
        [u.openId, u.email, u.name, u.role, u.role === 'admin' ? 'oem' : 'standard', 'password']
      );
      userIds.push(result.rows[0].id);
    }
    console.log(`✅ ${userIds.length} users seeded`);

    // ── Seed batteries ───────────────────────────────────────────────────────
    const chemistries = [
      { code: 'L', name: 'LFP (Lithium Iron Phosphate)', voltageCode: '48', voltageV: 48.0 },
      { code: 'N', name: 'NMC (Nickel Manganese Cobalt)', voltageCode: '72', voltageV: 72.0 },
      { code: 'S', name: 'NCA (Nickel Cobalt Aluminium)', voltageCode: '96', voltageV: 96.0 },
      { code: 'F', name: 'Solid-State (SSB)', voltageCode: '48', voltageV: 48.0 },
    ];
    const countries = ['DE', 'FR', 'CN', 'US', 'JP', 'KR', 'IN', 'NL'];
    const manufacturers = ['BMW', 'VLV', 'TES', 'PAN', 'SAM', 'LGE', 'CAT', 'BYD'];
    const statuses = ['operational', 'degraded', 'retired', 'in_transit', 'testing'];
    const cellOrigins = [
      { code: 'CN', country: 'China' },
      { code: 'KR', country: 'South Korea' },
      { code: 'JP', country: 'Japan' },
      { code: 'DE', country: 'Germany' },
      { code: 'US', country: 'United States' },
    ];

    const batteryIds = [];
    const bpans = [];
    for (let i = 0; i < 200; i++) {
      const chem = rand(chemistries);
      const country = rand(countries);
      const mfg = rand(manufacturers);
      const cellOrigin = rand(cellOrigins);
      const year = randInt(2020, 2025);
      const month = randInt(1, 12);
      const day = randInt(1, 28);
      const serial = String(i + 1).padStart(4, '0');
      const capacityKwh = randFloat(20, 120, 2);
      const capacityCode = capacityKwh < 50 ? 'S1' : capacityKwh < 80 ? 'M2' : 'L3';
      // BPAN format: CC(2)+MFG(2)+CAP(2)+CHEM(1)+VOLT(2)+CELL(2)+YY(2)+MM(2)+DD(2)+SER(2) = 21 chars
      const bpan = `${country}${mfg.slice(0,2)}${capacityCode}${chem.code}${chem.voltageCode}${cellOrigin.code}${String(year).slice(2)}${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}${serial.slice(2)}`;
      const soh = randFloat(60, 100, 2);
      const status = soh > 80 ? rand(['operational', 'operational', 'in_transit']) : soh > 60 ? 'degraded' : 'retired';
      const ownerId = rand(userIds);

      try {
        const result = await client.query(
          `INSERT INTO batteries (
            bpan, "countryCode", "manufacturerId", "capacityCode", "capacityKwh",
            "chemistryCode", chemistry, "voltageCode", "voltageV", "cellOriginCode",
            "cellOriginCountry", "extinguisherClass", "mfgYear", "mfgMonth", "mfgDay",
            "factoryCode", "serialNumber", "recyclabilityPct", "lithiumPct", "cobaltPct",
            "nickelPct", "manganesePct", "carbonFootprintKgCo2", status, "currentSoh",
            "cycleCount", "registeredById", "ownerId", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, NOW(), NOW()
          ) RETURNING id`,
          [
            bpan, country, mfg, capacityCode, capacityKwh,
            chem.code, chem.name, chem.voltageCode, chem.voltageV, cellOrigin.code,
            cellOrigin.country, 'A', year, month, day,
            'F', serial, randFloat(85, 99, 2), randFloat(3, 8, 2), randFloat(5, 15, 2),
            randFloat(10, 25, 2), randFloat(2, 8, 2), randFloat(50, 200, 2), status, soh,
            randInt(0, 800), ownerId, ownerId
          ]
        );
        batteryIds.push(result.rows[0].id);
        bpans.push(bpan);
      } catch (e) {
        console.error(`Battery insert error for ${bpan}:`, e.message);
      }
    }
    console.log(`✅ ${batteryIds.length} batteries seeded`);

    // ── Seed telemetry ───────────────────────────────────────────────────────
    let telemetryCount = 0;
    for (let i = 0; i < Math.min(50, batteryIds.length); i++) {
      const batteryId = batteryIds[i];
      const bpan = bpans[i];
      for (let j = 0; j < 30; j++) {
        const soh = randFloat(60, 100, 2);
        try {
          await client.query(
            `INSERT INTO telemetry (
              bpan, "batteryId", "vPack", "iPack", "vMin", "vMax", "tPack", "tMax",
              soh, soc, "cycleCount", "powerKw", "energyKwh", "isCharging",
              "gpsLat", "gpsLon", "recordedAt", "createdAt"
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())`,
            [
              bpan, batteryId,
              randFloat(44, 52, 2), randFloat(-50, 50, 2), randFloat(3.1, 3.3, 3),
              randFloat(3.4, 3.6, 3), randFloat(20, 45, 2), randFloat(25, 55, 2),
              soh, randFloat(10, 100, 2), randInt(0, 800),
              randFloat(0, 50, 2), randFloat(0, 100, 2), Math.random() > 0.5,
              randFloat(48.0, 52.0, 6), randFloat(8.0, 14.0, 6),
              randDate(90)
            ]
          );
          telemetryCount++;
        } catch (e) {
          // skip
        }
      }
    }
    console.log(`✅ ${telemetryCount} telemetry records seeded`);

    // ── Seed marketplace listings ────────────────────────────────────────────
    const listingTypes = ['sale', 'lease', 'auction'];
    const conditions = ['excellent', 'good', 'fair', 'poor'];
    let listingCount = 0;
    for (let i = 0; i < Math.min(60, batteryIds.length); i++) {
      const batteryId = batteryIds[i];
      const bpan = bpans[i];
      try {
        await client.query(
          `INSERT INTO "marketplace_listings" (
            bpan, "batteryId", "sellerId", "listingType", condition,
            "askingPriceEur", currency, title, description, location,
            "isActive", "viewCount", "createdAt", "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
          [
            bpan, batteryId, rand(userIds), rand(listingTypes), rand(conditions),
            randFloat(500, 15000, 2), 'EUR',
            `Battery ${bpan.substring(0, 8)} - ${rand(conditions)} condition`,
            `High-quality battery pack available for second-life applications. SOH: ${randFloat(70, 95, 1)}%. Fully tested and certified.`,
            rand(['Munich, DE', 'Paris, FR', 'Amsterdam, NL', 'Brussels, BE', 'Stockholm, SE']),
            true, randInt(0, 250)
          ]
        );
        listingCount++;
      } catch (e) {
        // skip
      }
    }
    console.log(`✅ ${listingCount} marketplace listings seeded`);

    // ── Seed SOH predictions ─────────────────────────────────────────────────
    let sohCount = 0;
    for (let i = 0; i < Math.min(100, batteryIds.length); i++) {
      try {
        await client.query(
          `INSERT INTO "soh_predictions" (
            "batteryId", bpan, "predictedSoh", "confidenceScore",
            "predictedAt", "modelVersion", "createdAt"
          ) VALUES ($1,$2,$3,$4,NOW(),$5,NOW())`,
          [
            batteryIds[i], bpans[i],
            randFloat(60, 98, 2), randFloat(0.75, 0.99, 3),
            'v2.1.0-circulair'
          ]
        );
        sohCount++;
      } catch (e) {
        // skip
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
            `${rand(alertTypes).replace('_', ' ').toUpperCase()} Alert`,
            `Automated alert: battery parameter exceeded threshold. Immediate inspection recommended.`,
            Math.random() > 0.5, Math.random() > 0.7
          ]
        );
        alertCount++;
      } catch (e) {
        // skip
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
            bpan, "batteryId", "fromLocation", "toLocation", carrier,
            "trackingNumber", status, "estimatedDelivery", "shippedAt", "createdAt", "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
          [
            bpans[idx], batteryIds[idx],
            rand(['Munich, DE', 'Paris, FR', 'Amsterdam, NL']),
            rand(['Brussels, BE', 'Stockholm, SE', 'Madrid, ES', 'Warsaw, PL']),
            rand(carriers),
            `TRK${String(randInt(100000, 999999))}`,
            rand(logisticStatuses),
            randDate(-30), // future date
            randDate(60)
          ]
        );
        logisticsCount++;
      } catch (e) {
        // skip
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
            "issuedToId", jurisdiction, "tokenRef", "capacityKwh",
            "issuedAt", "expiresAt", "isRedeemed", "createdAt"
          ) VALUES ($1,$2,$3,$4,NOW(),$5,$6,NOW())`,
          [
            rand(userIds), rand(jurisdictions),
            `EPR-${rand(jurisdictions)}-${randInt(10000, 99999)}`,
            randFloat(20, 120, 2),
            new Date(Date.now() + 365 * 86400000), // 1 year from now
            Math.random() > 0.7
          ]
        );
        eprCount++;
      } catch (e) {
        // skip
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
            `${rand(docTypes).replace('_', '-')}-${bpans[idx].substring(0,8)}.pdf`,
            `https://storage.circulair.energy/docs/${bpans[idx].substring(0,8)}-${randInt(1000,9999)}.pdf`,
            'application/pdf',
            randInt(50000, 5000000)
          ]
        );
        docCount++;
      } catch (e) {
        // skip
      }
    }
    console.log(`✅ ${docCount} documents seeded`);

    // ── Seed platform settings ───────────────────────────────────────────────
    try {
      await client.query(
        `INSERT INTO "platform_settings" (key, value, "updatedAt")
         VALUES ('platform_name', 'Circul-AI-r Battery Intelligence Platform', NOW()),
                ('default_currency', 'EUR', NOW()),
                ('supported_jurisdictions', 'EU,DE,FR,NL,BE,SE,PL,IN', NOW()),
                ('soh_alert_threshold', '70', NOW()),
                ('max_cycle_warning', '1000', NOW())
         ON CONFLICT (key) DO NOTHING`
      );
      console.log('✅ Platform settings seeded');
    } catch (e) {
      console.log('⚠️  Platform settings:', e.message);
    }

    // ── Final count ──────────────────────────────────────────────────────────
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM batteries) as batteries,
        (SELECT COUNT(*) FROM telemetry) as telemetry,
        (SELECT COUNT(*) FROM "marketplace_listings") as listings,
        (SELECT COUNT(*) FROM "soh_predictions") as soh_predictions,
        (SELECT COUNT(*) FROM alerts) as alerts,
        (SELECT COUNT(*) FROM users) as users
    `);
    console.log('\n📊 Final counts:', JSON.stringify(counts.rows[0], null, 2));
    console.log('\n🎉 Seed complete!');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
