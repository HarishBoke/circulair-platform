/**
 * seed-missing.mjs — Fill in empty tables for Circul-AI-r Platform
 * Uses actual DB column names discovered from DESCRIBE queries.
 * Run: node seed-missing.mjs
 */
import mysql from 'mysql2/promise';
import crypto from 'crypto';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dp = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));
const daysAgo = (d) => new Date(Date.now() - d * 86400000);
const traceId = () => crypto.randomBytes(16).toString('hex');
const hashKey = (k) => crypto.createHash('sha256').update(k).digest('hex');

// ─── LOAD EXISTING DATA ───────────────────────────────────────────────────────
console.log('📥 Loading existing data...');
const [batteries] = await conn.query('SELECT id, bpan, currentSoh, cycleCount, ownerId, chemistry, capacityKwh, mfgYear, countryCode FROM batteries LIMIT 50');
const [users] = await conn.query("SELECT id, openId, name, email, platformRole FROM users WHERE openId LIKE 'seed-%' OR email LIKE '%setoo%' OR email LIKE '%harish%'");

if (batteries.length === 0) { console.error('No batteries found!'); process.exit(1); }

const ownerIds = users.length > 0 ? users.map(u => u.id) : [1];
const adminUser = users.find(u => u.email && u.email.includes('harish')) || users[0] || { id: 1, name: 'Admin', email: 'admin@circulair.energy' };
const oemUser = users.find(u => u.platformRole === 'oem') || users[0] || adminUser;
const recyclerUser = users.find(u => u.platformRole === 'recycler') || users[1] || adminUser;

console.log(`  Loaded ${batteries.length} batteries, ${users.length} users`);

// ─── 1. WARRANTY RECORDS ──────────────────────────────────────────────────────
// Actual columns: id, batteryId, bpan, serialNumber, modelNumber, warrantyType, coverageType,
// warrantyTermMonths, purchaseDate, warrantyStartDate, warrantyEndDate, status,
// customerName, customerPhone, customerWhatsApp, customerEmail, customerAddress,
// dealerName, dealerCode, dealerPhone, dealerEmail, invoiceNumber, invoiceUrl,
// purchaseAmount, purchaseCurrency, manufacturer, totalClaims, lastClaimDate,
// notes, metadata, registeredById, activatedAt, voidedAt, voidReason, createdAt, updatedAt
console.log('\n🛡️  Seeding warranty records...');
const dealerNames = ['Ola Electric Showroom Mumbai', 'Ather Space Bangalore', 'Tata EV Dealer Delhi', 'Hero Electric Hub Chennai', 'Revolt Motors Pune'];
const customerNames = ['Rajesh Kumar', 'Priya Sharma', 'Vikram Singh', 'Anita Desai', 'Suresh Patel', 'Kavitha Nair', 'Mohammed Ali', 'Ravi Verma', 'Deepak Joshi', 'Meera Krishnan'];
const warrantyTypes = ['standard', 'extended', 'premium'];
const coverageTypes = ['full', 'limited', 'powertrain_only'];
let warrantyCount = 0;
const warrantyBats = batteries.slice(0, 20);

for (let i = 0; i < warrantyBats.length; i++) {
  const bat = warrantyBats[i];
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
      `MODEL-${bat.chemistry || 'NMC'}-${bat.capacityKwh || 30}KWH`,
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

// ─── 2. WARRANTY CLAIMS ───────────────────────────────────────────────────────
// Actual columns: id, warrantyId, batteryId, bpan, claimType, description,
// evidenceUrls, sohAtClaim, cycleCountAtClaim, status, assignedTo,
// resolutionType, resolutionNotes, resolutionDate, claimedById, createdAt, updatedAt
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
  const cycles = bat.cycleCount || 500;

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
      `Battery showing ${claimType.replace(/_/g, ' ')} symptoms. SOH dropped below expected threshold. Customer reports reduced range and longer charging times.`,
      JSON.stringify([]),
      soh.toFixed(2), cycles,
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

// ─── 3. CARBON FOOTPRINTS ─────────────────────────────────────────────────────
// Actual columns: id, bpan, manufacturing_kg_co2, transport_kg_co2, operational_kg_co2,
// eol_kg_co2, total_kg_co2, grid_carbon_intensity, grid_region, cert_url, calculated_at, createdAt
console.log('🌱 Seeding carbon footprints...');
const gridRegions = ['IN-South', 'IN-North', 'IN-West', 'IN-East', 'EU-DE', 'EU-FR'];
let carbonCount = 0;
for (let i = 0; i < Math.min(25, batteries.length); i++) {
  const bat = batteries[i];
  const mfg = randFloat(20, 50);
  const transport = randFloat(5, 18);
  const operational = randFloat(10, 35);
  const eol = randFloat(3, 10);
  const total = mfg + transport + operational + eol;

  try {
    await conn.query(`
      INSERT INTO carbon_footprints (
        bpan, manufacturing_kg_co2, transport_kg_co2, operational_kg_co2,
        eol_kg_co2, total_kg_co2, grid_carbon_intensity, grid_region,
        cert_url, calculated_at, createdAt
      ) VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())
    `, [
      bat.bpan,
      mfg.toFixed(2), transport.toFixed(2), operational.toFixed(2),
      eol.toFixed(2), total.toFixed(2),
      randFloat(0.4, 0.9, 3),
      pick(gridRegions),
      `https://docs.circulair.energy/carbon/${bat.bpan}.pdf`,
    ]);
    carbonCount++;
  } catch (e) {
    if (!e.message.includes('Duplicate')) console.warn(`  Carbon skip: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${carbonCount} carbon footprint records seeded`);

// ─── 4. BLOCKCHAIN ANCHORS ────────────────────────────────────────────────────
// Actual columns: id, bpan, event_type, data_hash, tx_hash, block_number, network, payload, anchored_at, createdAt
console.log('⛓️  Seeding blockchain anchors...');
const eventTypes = ['battery_registered', 'soh_update', 'ownership_transfer', 'recycling_verified', 'warranty_claim', 'epr_token_issued'];
const networks = ['Polygon Mumbai Testnet', 'Ethereum Sepolia', 'Hyperledger Fabric'];
let blockchainCount = 0;
for (let i = 0; i < 30; i++) {
  const bat = batteries[i % batteries.length];
  const eventType = eventTypes[i % eventTypes.length];
  const txHash = '0x' + crypto.randomBytes(32).toString('hex');
  const dataHash = '0x' + crypto.randomBytes(32).toString('hex');

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
      JSON.stringify({ bpan: bat.bpan, event: eventType, soh: bat.currentSoh, timestamp: daysAgo(randInt(0, 90)).toISOString() }),
      daysAgo(randInt(0, 90)),
    ]);
    blockchainCount++;
  } catch (e) {
    console.warn(`  Blockchain skip: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${blockchainCount} blockchain anchors seeded`);

// ─── 5. ALERT RULES ───────────────────────────────────────────────────────────
// Actual columns: id, name, description, metric, operator, threshold, severity,
// bpan, chemistry, enabled, createdBy, createdAt, updatedAt
console.log('📏 Seeding alert rules...');
const ruleConfigs = [
  { name: 'Critical SOH Threshold', desc: 'Alert when battery SOH drops below 70%', metric: 'soh', op: 'lt', val: 70, severity: 'critical' },
  { name: 'Warning SOH Threshold', desc: 'Alert when battery SOH drops below 80%', metric: 'soh', op: 'lt', val: 80, severity: 'warning' },
  { name: 'Thermal Runaway Risk', desc: 'Alert when max cell temperature exceeds 55°C', metric: 'tMax', op: 'gt', val: 55, severity: 'critical' },
  { name: 'High Cycle Count Warning', desc: 'Alert when cycle count exceeds 1500', metric: 'cycleCount', op: 'gt', val: 1500, severity: 'warning' },
  { name: 'Cycle Count Critical', desc: 'Alert when cycle count exceeds 2000', metric: 'cycleCount', op: 'gt', val: 2000, severity: 'critical' },
  { name: 'Warranty Expiry 30 Days', desc: 'Alert 30 days before warranty expiry', metric: 'daysToExpiry', op: 'lt', val: 30, severity: 'info' },
  { name: 'EPR Compliance Deadline', desc: 'Alert 15 days before EPR reporting deadline', metric: 'daysToDeadline', op: 'lt', val: 15, severity: 'warning' },
  { name: 'Internal Resistance High', desc: 'Alert when internal resistance exceeds 5 mΩ', metric: 'irPack', op: 'gt', val: 5, severity: 'warning' },
];
let ruleCount = 0;
for (const rule of ruleConfigs) {
  try {
    await conn.query(`
      INSERT INTO alert_rules (
        name, description, metric, operator, threshold, severity,
        enabled, createdBy, createdAt, updatedAt
      ) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())
    `, [rule.name, rule.desc, rule.metric, rule.op, rule.val, rule.severity, 1, adminUser.id]);
    ruleCount++;
  } catch (e) {
    if (!e.message.includes('Duplicate')) console.warn(`  Rule skip: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${ruleCount} alert rules seeded`);

// ─── 6. API KEYS ──────────────────────────────────────────────────────────────
// Actual columns: id, name, description, keyHash, keyPrefix, userId, scopes,
// rateLimitTier, rateLimit, status, lastUsedAt, totalRequests, expiresAt,
// revokedAt, revokedReason, createdAt, updatedAt
console.log('🔑 Seeding API keys...');
const apiKeyConfigs = [
  { name: 'OEM Integration Key', desc: 'Primary integration key for OEM battery management', userId: oemUser.id, scopes: ['batteries:read', 'telemetry:read', 'soh:read', 'marketplace:read'], tier: 'standard' },
  { name: 'Recycler Operations API', desc: 'Recycler access for EPR and yield management', userId: recyclerUser.id, scopes: ['batteries:read', 'epr:write', 'yield:write', 'compliance:read'], tier: 'standard' },
  { name: 'Fleet Management System', desc: 'Fleet operator monitoring integration', userId: adminUser.id, scopes: ['batteries:read', 'telemetry:read', 'alerts:read', 'logistics:read'], tier: 'standard' },
  { name: 'CPCB Regulatory Access', desc: 'Government regulatory read-only access', userId: adminUser.id, scopes: ['batteries:read', 'compliance:read', 'epr:read', 'audit:read'], tier: 'premium' },
  { name: 'Analytics Dashboard', desc: 'BI and analytics platform integration', userId: adminUser.id, scopes: ['batteries:read', 'telemetry:read', 'soh:read', 'analytics:read'], tier: 'premium' },
  { name: 'Webhook Integration', desc: 'Event-driven webhook integration', userId: oemUser.id, scopes: ['webhooks:write', 'batteries:read'], tier: 'standard' },
];
let apiKeyCount = 0;
for (const ak of apiKeyConfigs) {
  const rawKey = `cai_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12);
  try {
    await conn.query(`
      INSERT INTO api_keys (
        name, description, keyHash, keyPrefix, userId, scopes, rateLimitTier, rateLimit,
        status, totalRequests, lastUsedAt, createdAt, updatedAt
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())
    `, [
      ak.name, ak.desc, keyHash, keyPrefix, ak.userId, JSON.stringify(ak.scopes),
      ak.tier, ak.tier === 'premium' ? 1000 : 100, 'active',
      randInt(100, 50000), daysAgo(randInt(0, 7)),
    ]);
    apiKeyCount++;
  } catch (e) {
    if (!e.message.includes('Duplicate')) console.warn(`  API key skip: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${apiKeyCount} API keys seeded`);

// ─── 7. DIGITAL TWINS ─────────────────────────────────────────────────────────
// Actual columns: id, bpan, simulated_soh, forecast_horizon_days, forecast_data,
// model_version, confidence, last_updated, createdAt
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
      confidence: Math.max(70, 95 - d * 0.05),
    });
  }

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
      randFloat(88, 97).toFixed(2),
    ]);
    twinCount++;
  } catch (e) {
    if (!e.message.includes('Duplicate')) console.warn(`  Twin skip: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${twinCount} digital twins seeded`);

// ─── 8. REGULATORY PROFILES ───────────────────────────────────────────────────
// Actual columns: id, bpan, batteryId, jurisdiction, localId, status,
// profileData, govSyncStatus, lastGovSyncAt, lastCheckedAt, createdAt, updatedAt
console.log('📜 Seeding regulatory profiles...');
const jurisdictions = ['IN-MH', 'IN-KA', 'IN-DL', 'IN-TN', 'IN-GJ', 'EU-DE', 'EU-FR'];
let regCount = 0;
for (let i = 0; i < Math.min(15, batteries.length); i++) {
  const bat = batteries[i];
  const jurisdiction = jurisdictions[i % jurisdictions.length];
  const profileData = {
    euBatteryPassportId: `EU-BP-${randInt(100000, 999999)}`,
    cpcbRegistrationNumber: `CPCB-${randInt(10000, 99999)}-${bat.mfgYear || 2022}`,
    bisApprovalNumber: `BIS-${randInt(10000, 99999)}`,
    rohs2Compliant: true,
    reachCompliant: true,
    un38_3Certified: true,
    lastAuditDate: daysAgo(randInt(30, 180)).toISOString(),
    nextAuditDue: daysAgo(-180).toISOString(),
  };

  try {
    await conn.query(`
      INSERT INTO regulatory_profiles (
        bpan, batteryId, jurisdiction, localId, status,
        profileData, govSyncStatus, lastGovSyncAt, lastCheckedAt, createdAt, updatedAt
      ) VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())
      ON DUPLICATE KEY UPDATE status='compliant', lastCheckedAt=NOW()
    `, [
      bat.bpan, bat.id, jurisdiction,
      `${jurisdiction}-${bat.bpan.substring(0, 8)}`,
      'compliant',
      JSON.stringify(profileData),
      'synced',
      daysAgo(randInt(1, 30)),
      daysAgo(randInt(0, 7)),
    ]);
    regCount++;
  } catch (e) {
    if (!e.message.includes('Duplicate')) console.warn(`  Reg skip: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${regCount} regulatory profiles seeded`);

// ─── 9. AUDIT LOGS ────────────────────────────────────────────────────────────
// Actual columns: id, traceId, userId, userName, userRole, actorType, apiKeyId,
// action, dataClassification, resourceType, resourceId, module, httpMethod, httpPath,
// ipAddress, userAgent, inputSummary, outputSummary, status, errorCode, errorMessage,
// durationMs, sessionId, complianceTags, createdAt
console.log('📝 Seeding audit logs...');
const auditActions = [
  'battery.register', 'battery.view', 'battery.update',
  'marketplace.list', 'marketplace.purchase',
  'warranty.register', 'warranty.claim',
  'soh.predict', 'epr.verify', 'user.login', 'user.logout',
  'api_key.create', 'compliance.report', 'logistics.create',
];
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
];
let auditCount = 0;
for (let i = 0; i < 50; i++) {
  const uid = ownerIds[i % ownerIds.length];
  const action = auditActions[i % auditActions.length];
  const bat = batteries[i % batteries.length];
  try {
    await conn.query(`
      INSERT INTO audit_logs (
        traceId, userId, userName, userRole, actorType,
        action, dataClassification, resourceType, resourceId, module,
        httpMethod, httpPath, ipAddress, userAgent, status, durationMs, createdAt
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      traceId(), uid, `User ${uid}`, 'user', 'human',
      action, 'internal',
      'battery', bat.bpan,
      action.split('.')[0],
      'POST', `/api/trpc/${action}`,
      `192.168.${randInt(1, 254)}.${randInt(1, 254)}`,
      pick(userAgents),
      'success', randInt(50, 500),
      daysAgo(randInt(0, 30)),
    ]);
    auditCount++;
  } catch (e) {
    console.warn(`  Audit skip: ${e.message.substring(0, 80)}`);
  }
}
console.log(`  ✓ ${auditCount} audit log entries seeded`);

// ─── 10. PLATFORM SETTINGS ────────────────────────────────────────────────────
console.log('⚙️  Seeding platform settings...');
const settings = [
  { key: 'platform.name', value: 'Circul-AI-r', category: 'general' },
  { key: 'platform.tagline', value: 'Battery Intelligence Platform for the Circular Economy', category: 'general' },
  { key: 'platform.support_email', value: 'support@circulair.energy', category: 'general' },
  { key: 'marketplace.commission_pct', value: '2.5', category: 'marketplace' },
  { key: 'marketplace.min_listing_price_inr', value: '1000', category: 'marketplace' },
  { key: 'soh.critical_threshold', value: '70', category: 'alerts' },
  { key: 'soh.warning_threshold', value: '80', category: 'alerts' },
  { key: 'soh.second_life_threshold', value: '60', category: 'alerts' },
  { key: 'epr.default_jurisdiction', value: 'IN', category: 'compliance' },
  { key: 'epr.reporting_cycle_months', value: '12', category: 'compliance' },
  { key: 'api.rate_limit_default', value: '100', category: 'api' },
  { key: 'api.rate_limit_premium', value: '1000', category: 'api' },
  { key: 'blockchain.network', value: 'Polygon Mumbai Testnet', category: 'blockchain' },
  { key: 'ai.soh_model_version', value: 'CNN-LSTM-v3.2.1', category: 'ai' },
  { key: 'ai.prediction_confidence_min', value: '85', category: 'ai' },
];
let settingCount = 0;
for (const s of settings) {
  try {
    await conn.query(`
      INSERT INTO platform_settings (\`key\`, value, category, createdAt, updatedAt)
      VALUES (?,?,?,NOW(),NOW())
      ON DUPLICATE KEY UPDATE value=VALUES(value)
    `, [s.key, s.value, s.category]);
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
console.log('\n✅ Seed complete!');
