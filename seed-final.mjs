/**
 * seed-final.mjs — Final seed for remaining empty tables
 * Fixes: blockchain_anchors, battery_twins, warranty_records, platform_settings
 * Run: node seed-final.mjs
 */
import mysql from 'mysql2/promise';
import crypto from 'crypto';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dp = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));
const daysAgo = (d) => new Date(Date.now() - d * 86400000);

const [batteries] = await conn.query('SELECT id, bpan, currentSoh, cycleCount, ownerId, chemistry, capacityKwh, mfgYear, countryCode FROM batteries LIMIT 50');
const [users] = await conn.query("SELECT id, openId, name, email, platformRole FROM users WHERE openId LIKE 'seed-%' OR email LIKE '%setoo%' OR email LIKE '%harish%'");
const adminUser = users.find(u => u.email && u.email.includes('harish')) || users[0] || { id: 1 };
const ownerIds = users.length > 0 ? users.map(u => u.id) : [1];

console.log(`Loaded ${batteries.length} batteries, ${users.length} users`);

// ─── 1. BLOCKCHAIN ANCHORS (correct enum values) ──────────────────────────────
// enum: 'bpan_registration','soh_prediction','epr_token_issuance','compliance_report',
//       'marketplace_transaction','logistics_dispatch','data_sharing_consent'
console.log('⛓️  Seeding blockchain anchors...');
const blockchainEventTypes = [
  'bpan_registration', 'soh_prediction', 'epr_token_issuance',
  'compliance_report', 'marketplace_transaction', 'logistics_dispatch', 'data_sharing_consent'
];
const networks = ['Polygon Mumbai Testnet', 'Ethereum Sepolia', 'Hyperledger Fabric'];
let blockchainCount = 0;
for (let i = 0; i < 35; i++) {
  const bat = batteries[i % batteries.length];
  const eventType = blockchainEventTypes[i % blockchainEventTypes.length];
  const txHash = '0x' + crypto.randomBytes(32).toString('hex').substring(0, 64);
  const dataHash = crypto.randomBytes(32).toString('hex').substring(0, 64);

  try {
    await conn.query(`
      INSERT INTO blockchain_anchors (
        bpan, event_type, data_hash, tx_hash, block_number, network, payload, anchored_at, createdAt
      ) VALUES (?,?,?,?,?,?,?,?,NOW())
    `, [
      bat.bpan, eventType,
      dataHash, txHash,
      randInt(18000000, 19500000),
      pick(networks),
      JSON.stringify({ bpan: bat.bpan, event: eventType, soh: bat.currentSoh, ts: daysAgo(randInt(0, 90)).toISOString() }),
      daysAgo(randInt(0, 90)),
    ]);
    blockchainCount++;
  } catch (e) {
    console.warn(`  Blockchain skip: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${blockchainCount} blockchain anchors seeded`);

// ─── 2. BATTERY TWINS (confidence is decimal(4,3) = max 9.999, use 0-1 range) ─
console.log('🔮 Seeding digital twins...');
let twinCount = 0;
for (let i = 0; i < Math.min(25, batteries.length); i++) {
  const bat = batteries[i];
  const soh = parseFloat(bat.currentSoh || 85);
  const forecastData = [];
  for (let d = 30; d <= 365; d += 30) {
    forecastData.push({
      days: d,
      predictedSoh: Math.max(50, soh - (d / 365) * randFloat(3, 8)),
      confidence: Math.max(0.70, 0.95 - d * 0.0005),
    });
  }
  // confidence is decimal(4,3) so max is 9.999 — use 0.0-1.0 range
  const confidence = randFloat(0.880, 0.970, 3);

  try {
    await conn.query(`
      INSERT INTO battery_twins (
        bpan, simulated_soh, forecast_horizon_days, forecast_data,
        model_version, confidence, last_updated, createdAt
      ) VALUES (?,?,?,?,?,?,NOW(),NOW())
      ON DUPLICATE KEY UPDATE simulated_soh=VALUES(simulated_soh), last_updated=NOW()
    `, [
      bat.bpan,
      soh.toFixed(2),
      365,
      JSON.stringify(forecastData),
      'CNN-LSTM-v3.2.1',
      confidence,
    ]);
    twinCount++;
  } catch (e) {
    if (!e.message.includes('Duplicate')) console.warn(`  Twin skip: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${twinCount} digital twins seeded`);

// ─── 3. WARRANTY RECORDS (correct enum values) ────────────────────────────────
// warrantyType: 'standard','extended','premium','commercial'
// coverageType: 'full_replacement','pro_rata','labor_only','parts_only','comprehensive'
// status: 'active','expired','voided','pending_activation'
console.log('🛡️  Seeding warranty records...');
const warrantyTypes = ['standard', 'extended', 'premium', 'commercial'];
const coverageTypes = ['full_replacement', 'pro_rata', 'labor_only', 'parts_only', 'comprehensive'];
const dealerNames = ['Ola Electric Showroom Mumbai', 'Ather Space Bangalore', 'Tata EV Dealer Delhi', 'Hero Electric Hub Chennai', 'Revolt Motors Pune'];
const customerNames = ['Rajesh Kumar', 'Priya Sharma', 'Vikram Singh', 'Anita Desai', 'Suresh Patel', 'Kavitha Nair', 'Mohammed Ali', 'Ravi Verma', 'Deepak Joshi', 'Meera Krishnan'];
let warrantyCount = 0;

for (let i = 0; i < Math.min(20, batteries.length); i++) {
  const bat = batteries[i];
  const months = pick([12, 24, 36, 60]);
  const purchaseDate = daysAgo(randInt(30, 365 * 2));
  const startDate = purchaseDate;
  const endDate = new Date(purchaseDate.getTime() + months * 30 * 86400000);
  const status = endDate > new Date() ? 'active' : 'expired';

  try {
    await conn.query(`
      INSERT INTO warranty_records (
        batteryId, bpan, serialNumber, modelNumber, warrantyType, coverageType,
        warrantyTermMonths, purchaseDate, warrantyStartDate, warrantyEndDate, status,
        customerName, customerPhone, customerWhatsApp, customerEmail, customerAddress,
        dealerName, dealerCode, dealerPhone, dealerEmail,
        invoiceNumber, purchaseAmount, purchaseCurrency,
        manufacturer, registeredById, activatedAt, createdAt, updatedAt
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())
    `, [
      bat.id, bat.bpan,
      `SN-${bat.bpan.replace(/-/g,'').substring(0,8)}-${String(i+1).padStart(4,'0')}`,
      `${bat.chemistry || 'NMC'}-${bat.capacityKwh || 30}KWH`,
      pick(warrantyTypes), pick(coverageTypes),
      months, purchaseDate, startDate, endDate, status,
      customerNames[i % customerNames.length],
      `+91 98${randInt(10000000, 99999999)}`,
      `+91 98${randInt(10000000, 99999999)}`,
      `customer${i+1}@${pick(['gmail.com', 'yahoo.com', 'outlook.com'])}`,
      `${pick(['Mumbai', 'Bangalore', 'Delhi', 'Chennai', 'Pune'])}, India`,
      pick(dealerNames), `DLR-${String(1000 + i)}`,
      `+91 22${randInt(10000000, 99999999)}`, `dealer${i+1}@evdealer.in`,
      `INV-${randInt(100000, 999999)}`,
      (parseFloat(bat.capacityKwh || 30) * randFloat(15000, 25000)).toFixed(2), 'INR',
      `Battery Manufacturer ${bat.countryCode || 'IN'}`,
      adminUser.id, purchaseDate,
    ]);
    warrantyCount++;
  } catch (e) {
    if (!e.message.includes('Duplicate')) console.warn(`  Warranty skip ${i}: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${warrantyCount} warranty records seeded`);

// ─── 4. WARRANTY CLAIMS ───────────────────────────────────────────────────────
console.log('📋 Seeding warranty claims...');
const [dbWarranties] = await conn.query('SELECT id, bpan, batteryId FROM warranty_records LIMIT 8');
const claimTypes = ['capacity_degradation', 'cell_failure', 'bms_fault', 'thermal_event', 'physical_damage'];
const claimStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'resolved'];
let claimCount = 0;

for (let i = 0; i < Math.min(6, dbWarranties.length); i++) {
  const w = dbWarranties[i];
  const claimType = claimTypes[i % claimTypes.length];
  const status = claimStatuses[i % claimStatuses.length];
  const bat = batteries.find(b => b.bpan === w.bpan) || batteries[0];
  const soh = parseFloat(bat.currentSoh || 80);

  try {
    await conn.query(`
      INSERT INTO warranty_claims (
        warrantyId, batteryId, bpan, claimType, description,
        evidenceUrls, sohAtClaim, cycleCountAtClaim,
        status, assignedTo, resolutionType, resolutionNotes, resolutionDate,
        claimedById, createdAt, updatedAt
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())
    `, [
      w.id, w.batteryId, w.bpan, claimType,
      `Battery showing ${claimType.replace(/_/g, ' ')} symptoms. SOH dropped below expected threshold. Customer reports reduced range.`,
      JSON.stringify([]),
      soh.toFixed(2), bat.cycleCount || 500,
      status,
      status !== 'submitted' ? 'Technical Team Alpha' : null,
      status === 'resolved' ? 'replacement' : status === 'rejected' ? 'denied' : 'pending',
      status === 'resolved' ? 'Replacement battery dispatched. Original returned for root cause analysis.' :
      status === 'rejected' ? 'Claim rejected: physical damage not covered under standard warranty terms.' : null,
      status === 'resolved' ? daysAgo(randInt(1, 10)) : null,
      adminUser.id,
    ]);
    claimCount++;
  } catch (e) {
    console.warn(`  Claim skip: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${claimCount} warranty claims seeded`);

// ─── 5. PLATFORM SETTINGS (correct columns) ───────────────────────────────────
// Actual columns: id, userId, locale, displayCurrency, timezone, activeJurisdictions,
// dataResidencyRegion, organisationName, organisationCountry, createdAt, updatedAt
// dataResidencyRegion enum: 'in','eu','cn','us'
console.log('⚙️  Seeding platform settings...');
const settingsData = [
  { userId: adminUser.id, locale: 'en-IN', currency: 'INR', timezone: 'Asia/Kolkata', jurisdictions: ['IN-MH', 'IN-KA', 'IN-DL'], region: 'in', orgName: 'Setoo Energy Pvt Ltd', orgCountry: 'IN' },
  { userId: ownerIds[1] || adminUser.id, locale: 'en-IN', currency: 'INR', timezone: 'Asia/Kolkata', jurisdictions: ['IN-TN', 'IN-KA'], region: 'in', orgName: 'Ola Electric Mobility', orgCountry: 'IN' },
  { userId: ownerIds[2] || adminUser.id, locale: 'en-IN', currency: 'INR', timezone: 'Asia/Kolkata', jurisdictions: ['IN-DL', 'IN-MH'], region: 'in', orgName: 'Tata Motors EV', orgCountry: 'IN' },
];
let settingCount = 0;
for (const s of settingsData) {
  try {
    await conn.query(`
      INSERT INTO platform_settings (
        userId, locale, displayCurrency, timezone, activeJurisdictions,
        dataResidencyRegion, organisationName, organisationCountry, createdAt, updatedAt
      ) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())
      ON DUPLICATE KEY UPDATE locale=VALUES(locale), organisationName=VALUES(organisationName)
    `, [
      s.userId, s.locale, s.currency, s.timezone,
      JSON.stringify(s.jurisdictions), s.region, s.orgName, s.orgCountry,
    ]);
    settingCount++;
  } catch (e) {
    console.warn(`  Setting skip: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${settingCount} platform settings seeded`);

// ─── FINAL SUMMARY ────────────────────────────────────────────────────────────
console.log('\n📊 Final database counts:');
const tables = [
  'batteries', 'users', 'telemetry', 'soh_predictions', 'marketplace_listings',
  'logistics', 'warranty_records', 'warranty_claims', 'epr_tokens',
  'carbon_footprints', 'blockchain_anchors', 'alerts', 'alert_rules',
  'documents', 'api_keys', 'battery_twins', 'service_history',
  'regulatory_profiles', 'yield_verifications', 'audit_logs',
  'contact_inquiries', 'platform_settings',
];
for (const t of tables) {
  try {
    const [r] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${t}\``);
    console.log(`  ${t}: ${r[0].cnt}`);
  } catch (e) {
    console.log(`  ${t}: ERROR`);
  }
}

await conn.end();
console.log('\n✅ Final seed complete!');
