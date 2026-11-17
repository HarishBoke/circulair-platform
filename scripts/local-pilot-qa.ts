import { readFileSync, lstatSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { request as httpRequest, type Server } from "node:http";
import assert from "node:assert/strict";
import express from "express";
import supertest from "supertest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { createPilotStore, hashPilotToken, hashPilotReading } from "../server/localPilotDb";
import { createLocalPilotRestRouter } from "../server/localPilotRest";
import { createLocalPilotRouter } from "../server/localPilotRouter";
import { pilotReadingSchema, validatePilotReading, PILOT_MAX_BYTES, PILOT_STALE_MS, PILOT_FUTURE_MS, type PilotCreateAsset, type PilotReading } from "../shared/localPilotContract";

export const REVIEWED_PILOT_SQL_SHA256 = "9f1643faab94e2719a467674037b363b9682e0cd893dff81c1e0ae5b891d0b86";
// Real PostgreSQL exposed CHECK(NULL) acceptance. Original reviewed bytes/evidence are retained separately.
export const ACCEPTANCE_PILOT_SQL_SHA256 = "edff6d0267a8b38d4f47f3c08f03d57589a989260587d41812e6482735745a3e";
export function guardedPilotQaUrl(raw: string | undefined, approved: string | undefined): string {
  if (approved !== "1" || !raw) throw new Error("pilot_qa_explicit_local_credentials_required");
  let url: URL; try { url = new URL(raw.trim()); } catch { throw new Error("pilot_qa_local_target_required"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" || url.port !== "5432" || url.pathname !== "/circulair_qa" || url.search || url.hash || !url.username || !url.password) throw new Error("pilot_qa_local_target_required");
  return url.toString();
}
export function guardedPilotQaCredentialFile(file: string | undefined): string {
  if (!file) throw new Error("pilot_qa_private_credential_file_required");
  const stat = lstatSync(file);
  if (!stat.isFile() || (stat.mode & 0o777) !== 0o600 || (process.getuid && stat.uid !== process.getuid())) throw new Error("pilot_qa_private_credential_file_required");
  return readFileSync(file, "utf8");
}
function fixtureProfile(): PilotCreateAsset {
  const now = new Date().toISOString();
  // The unchanged contract has no SYNTHETIC source. These markers are explicit QA-only,
  // not a claim that a physical label was inspected or any BMS/hardware was connected.
  return { manufacturerSerial: "QA-SYNTHETIC-NOT-PHYSICAL-" + randomUUID(), chemistry: "QA synthetic only; no chemistry established", nominalVoltage: { value: 12, unit: "V" }, ratedCapacity: { value: 10, unit: "Ah" }, specificationEvidence: "QA synthetic only; no physical specification", specificationRevision: "QA/1", interfaceDescription: "QA generated samples; no BMS connection", interfaceRevision: "QA/1", procedureRevision: "QA/1", currentSignConvention: "QA positive discharge", units: { vPack: "V", iPack: "A", tPack: "degC", socReported: "%" }, acceptedReadingEnvelope: { vPack: { min: 0, max: 15 }, iPack: { min: -5, max: 5 }, socReported: { min: 0, max: 100 } }, ownerAttestation: { consent: true, attestedAt: now, evidenceReference: "QA synthetic namespace fixture; not real attestation" }, provenance: { source: "physical-label-and-owner-attestation", observedAt: now, evidenceReference: "QA synthetic only; physical provenance NOT established" } };
}
function sample(changes: Partial<PilotReading> = {}): PilotReading {
  // Wire source follows the strict contract only; all data is generated QA, not genuine BMS.
  return { sampleId: randomUUID(), recordedAt: new Date().toISOString(), source: "BMS_REPORTED", captureRevision: "QA/1", metrics: { vPack: 0, iPack: 0, socReported: 0 }, units: { vPack: "V", iPack: "A", socReported: "%" }, ...changes };
}
async function publicCatalog(pool: Pool) {
  const result = await pool.query(`SELECT COALESCE(jsonb_agg(v ORDER BY v::text),'[]'::jsonb)::text AS fingerprint FROM (
    SELECT jsonb_build_array('relation',c.oid::text,c.relname,c.relkind) AS v FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    UNION ALL SELECT jsonb_build_array('function',p.oid::text,p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
  ) catalog`);
  return createHash("sha256").update(result.rows[0].fingerprint).digest("hex");
}
async function rejectedSql(operation: () => Promise<unknown>, expected: string) {
  await assert.rejects(operation(), (error: unknown) => typeof error === "object" && error !== null && (error as { code?: string }).code === expected);
}
async function waitForLock(pool: Pool, pid: number) {
  for (let i = 0; i < 100; i++) {
    const result = await pool.query("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND $1::integer=ANY(pg_blocking_pids(pid)) LIMIT 1", [pid]);
    if (result.rows.length) return result.rows[0].pid as number;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("pilot_qa_lock_not_observed");
}
async function rawLoopbackPost(server: Server, assetRef: string, token: string, bytes: Buffer) {
  const address = server.address();
  if (!address || typeof address === "string" || address.address !== "127.0.0.1") throw new Error("pilot_qa_loopback_listener_required");
  return new Promise<number>((resolveStatus, reject) => {
    const req = httpRequest({ hostname: "127.0.0.1", port: address.port, path: `/api/local-pilot/v1/assets/${assetRef}/readings`, method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "Transfer-Encoding": "chunked" } }, res => {
      res.resume(); res.on("end", () => resolveStatus(res.statusCode!));
    });
    req.on("error", reject); req.write(bytes.subarray(0, Math.min(4096, bytes.length))); req.end(bytes.subarray(Math.min(4096, bytes.length)));
  });
}
export async function runPilotQa() {
  const connectionString = guardedPilotQaUrl(guardedPilotQaCredentialFile(process.env.LOCAL_PILOT_QA_CREDENTIAL_FILE), process.env.QA_LOCAL);
  const ownerA = Number(process.env.LOCAL_PILOT_QA_OWNER_A), ownerB = Number(process.env.LOCAL_PILOT_QA_OWNER_B);
  if (![ownerA, ownerB].every(v => Number.isSafeInteger(v) && v > 0) || ownerA === ownerB) throw new Error("pilot_qa_two_approved_fixture_user_ids_required");
  const migration = readFileSync(new URL("../drizzle/local-pilot.sql", import.meta.url), "utf8");
  const checksum = createHash("sha256").update(migration).digest("hex");
  if (process.env.LOCAL_PILOT_QA_SQL_SHA256 !== checksum || checksum !== ACCEPTANCE_PILOT_SQL_SHA256) throw new Error("pilot_qa_reviewed_sql_checksum_required");
  if (/\bpublic\s*\./i.test(migration) || /\b(?:ALTER|DROP|TRUNCATE)\b/i.test(migration.replace(/^--.*$/gm, ""))) throw new Error("pilot_qa_private_create_only_sql_required");
  const schema = "qa_pilot_" + randomUUID().replaceAll("-", "");
  const pool = new Pool({ connectionString, ssl: false, max: 8, connectionTimeoutMillis: 2000, options: `-c search_path=${schema},pg_catalog -c statement_timeout=10000 -c lock_timeout=5000`, application_name: "local-pilot-private-qa" });
  const originalEnabled = process.env.LOCAL_PILOT_ENABLED;
  const checks: string[] = [];
  let stage = "identity";
  const check = async (name: string, operation: () => Promise<void> | void) => {
    stage = name; await operation(); checks.push(name); console.log(JSON.stringify({ check: name, passed: true }));
  };
  try {
    console.log(JSON.stringify({ qaStarted: true, endpoint: "127.0.0.1:5432/circulair_qa", schema, sqlSha256: checksum, generatedSamples: "synthetic QA only; not genuine BMS" }));
    const identity = await pool.query("SELECT current_database() AS db, host(inet_server_addr()) AS host, inet_server_port() AS port");
    assert.equal(identity.rows[0].db, "circulair_qa"); assert.equal(identity.rows[0].host, "127.0.0.1"); assert.equal(identity.rows[0].port, 5432);
    const catalogBefore = await publicCatalog(pool);
    stage = "private_fixture_setup";
    await pool.query(`CREATE SCHEMA "${schema}"`);
    // LIKE copies actual columns/checks/types, NOT data, defaults, serial sequence references or public FK links.
    await pool.query(`CREATE TABLE "${schema}".users (LIKE public.users INCLUDING CONSTRAINTS); CREATE UNIQUE INDEX ON "${schema}".users(id)`);
    await pool.query(`INSERT INTO "${schema}".users(id,"openId",role,"platformRole","createdAt","updatedAt","lastSignedIn") VALUES
      ($1,$3,'user','oem',NOW(),NOW(),NOW()),($2,$4,'admin','admin',NOW(),NOW(),NOW())`, [ownerA, ownerB, `qa-pilot-${schema}-owner`, `qa-pilot-${schema}-foreign`]);
    const fixtures = await pool.query(`SELECT count(*)::int AS n, bool_and("openId" LIKE $1) AS synthetic FROM "${schema}".users WHERE id=ANY($2::integer[])`, [`qa-pilot-${schema}-%`, [ownerA, ownerB]]);
    assert.equal(fixtures.rows[0].n, 2); assert.equal(fixtures.rows[0].synthetic, true);
    await pool.query(migration); // EXACT reviewed bytes, with all objects bound to this fresh search_path.
    await check("private_namespace_fk_trigger_binding", async () => {
      const refs = await pool.query(`SELECT DISTINCT n.nspname FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace s ON s.oid=t.relnamespace JOIN pg_class r ON r.oid=c.confrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE s.nspname=$1 AND c.contype='f'`, [schema]);
      assert.deepEqual(refs.rows, [{ nspname: schema }]);
      const triggerFns = await pool.query(`SELECT count(*)::int AS n, bool_and(p.pronamespace=t.relnamespace) AS private FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_proc p ON p.oid=g.tgfoid WHERE t.relnamespace=$1::regnamespace AND NOT g.tgisinternal`, [schema]);
      assert.equal(triggerFns.rows[0].n, 4); assert.equal(triggerFns.rows[0].private, true);
      const names = await pool.query("SELECT current_schema() AS schema, to_regclass('users')::oid=to_regclass($1)::oid AS users_private", [`${schema}.users`]);
      assert.equal(names.rows[0].schema, schema); assert.equal(names.rows[0].users_private, true);
    });
    process.env.LOCAL_PILOT_ENABLED = "true";
    const db = drizzle(pool), store = createPilotStore(async () => db);
    const callerA = createLocalPilotRouter(store).createCaller({ user: { id: ownerA, role: "user" }, req: {}, res: {} } as any);
    const callerB = createLocalPilotRouter(store).createCaller({ user: { id: ownerB, role: "admin" }, req: {}, res: {} } as any);
    const anonymous = createLocalPilotRouter(store).createCaller({ user: null, req: {}, res: {} } as any);
    const profile = fixtureProfile();
    const assetA = await callerA.createAsset(profile), assetB = await callerB.createAsset(fixtureProfile());
    await check("native_rpc_real_persistence_and_gate", async () => {
      assert(assetA.id > 0 && assetB.id > 0); assert.notEqual(assetA.assetRef, assetB.assetRef);
      assert.equal(assetA.officialBpan, null); assert.equal(assetA.officialAllocationStatus, null); assert.equal(assetA.officialVerification, "unverified");
      assert.equal((await callerA.getAsset({ assetRef: assetA.assetRef })).manufacturerSerial, profile.manufacturerSerial);
      assert.equal((await callerA.listAssets()).length, 1); assert.equal((await callerB.listAssets()).length, 1);
      assert.deepEqual(await callerA.status(), { enabled: true, namespace: "LOCAL_PILOT", officialVerification: "unverified", physicalAcceptance: "not_established" });
      await assert.rejects(anonymous.listAssets(), { code: "UNAUTHORIZED" });
      await assert.rejects(anonymous.status(), { code: "UNAUTHORIZED" });
    });
    const issued = await callerA.provisionDevice({ assetRef: assetA.assetRef, name: "QA synthetic finite replay A", captureRevision: "QA/1" });
    const issuedB = await callerB.provisionDevice({ assetRef: assetB.assetRef, name: "QA synthetic finite replay B", captureRevision: "QA/1" });
    const secondA = await store.provisionDevice(ownerA, { assetRef: assetA.assetRef, name: "QA second device A", captureRevision: "QA/1" });
    await check("two_tenant_store_and_rpc_owner_isolation", async () => {
      for (const op of [() => store.getAsset(ownerB, assetA.assetRef), () => store.listDevices(ownerB, assetA.assetRef), () => store.latestReadings(ownerB, assetA.assetRef), () => store.provisionDevice(ownerB, { assetRef: assetA.assetRef, name: "QA denied", captureRevision: "QA/1" }), () => store.revokeDevice(ownerB, assetA.assetRef, issued.device.deviceRef)]) await assert.rejects(op(), { status: 404 });
      for (const op of [() => callerB.getAsset({ assetRef: assetA.assetRef }), () => callerB.listDevices({ assetRef: assetA.assetRef }), () => callerB.latestReadings({ assetRef: assetA.assetRef }), () => callerB.provisionDevice({ assetRef: assetA.assetRef, name: "QA denied", captureRevision: "QA/1" }), () => callerB.revokeDevice({ assetRef: assetA.assetRef, deviceRef: issued.device.deviceRef })]) await assert.rejects(op(), { code: "NOT_FOUND" });
      await assert.rejects(callerA.getAsset({ assetRef: assetB.assetRef }), { code: "NOT_FOUND" });
      const listed = JSON.stringify(await callerA.listDevices({ assetRef: assetA.assetRef }));
      assert(!listed.includes(issued.token)); assert(!listed.includes("credentialHash"));
      const hashed = await pool.query("SELECT credential_hash=$1 AS hashed FROM local_pilot_devices WHERE device_ref=$2", [hashPilotToken(issued.token), issued.device.deviceRef]);
      assert.equal(hashed.rows[0].hashed, true);
    });
    const payload = sample();
    const first = await store.ingest(assetA.assetRef, issued.token, payload);
    await check("positive_receipt_zero_vs_missing_and_idempotency", async () => {
      assert(first.readingId > 0); assert.equal(first.duplicate, false);
      const duplicate = await store.ingest(assetA.assetRef, issued.token, { ...payload, metrics: { socReported: 0, iPack: 0, vPack: 0 } });
      assert.equal(duplicate.readingId, first.readingId); assert.equal(duplicate.duplicate, true);
      const readings = await callerA.latestReadings({ assetRef: assetA.assetRef });
      assert.equal(readings.length, 1); assert.equal(readings[0].id, first.readingId);
      assert.equal(readings[0].payload.metrics.vPack, 0); assert.equal(readings[0].payload.metrics.iPack, 0); assert.equal(readings[0].payload.metrics.socReported, 0);
      assert(!Object.hasOwn(readings[0].payload.metrics, "tPack")); assert(!Object.hasOwn(readings[0].payload.units, "tPack"));
      assert.equal(readings[0].recordedAt.toISOString(), payload.recordedAt); assert(readings[0].receivedAt instanceof Date);
      assert(!Object.hasOwn(readings[0].payload, "soh"));
      await assert.rejects(store.ingest(assetA.assetRef, issued.token, { ...payload, metrics: { ...payload.metrics, vPack: 1 } }), { status: 409 });
      await assert.rejects(store.ingest(assetA.assetRef, secondA.token, payload), { status: 409 });
    });
    await check("real_concurrent_idempotency_and_conflict", async () => {
      const p = sample();
      const results = await Promise.all(Array.from({ length: 6 }, () => store.ingest(assetA.assetRef, issued.token, p)));
      assert.equal(new Set(results.map(v => v.readingId)).size, 1); assert.equal(results.filter(v => !v.duplicate).length, 1);
      const p2 = sample();
      const conflicts = await Promise.allSettled([store.ingest(assetA.assetRef, issued.token, p2), store.ingest(assetA.assetRef, secondA.token, p2)]);
      assert.equal(conflicts.filter(v => v.status === "fulfilled").length, 1);
      const failure = conflicts.find(v => v.status === "rejected") as PromiseRejectedResult; assert.equal(failure.reason.status, 409);
    });
    const app = express(); app.use("/api/local-pilot/v1", createLocalPilotRestRouter(store));
    // Supertest's default implicit listener binds all interfaces. Bind explicitly to loopback instead.
    const listener = await new Promise<ReturnType<typeof app.listen>>(resolveListener => { const server = app.listen(0, "127.0.0.1", () => resolveListener(server)); });
    const api = supertest(listener);
    const post = (assetRef: string, token: string, body: unknown) => api.post(`/api/local-pilot/v1/assets/${assetRef}/readings`).set("Authorization", "Bearer " + token).set("Content-Type", "application/json").send(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    let httpReceipt = 0;
    try {
      await check("real_rest_two_tenants_wrong_token_and_payload_409", async () => {
        const p = sample(); const result = await post(assetA.assetRef, issued.token, p); assert.equal(result.status, 201); assert(result.body.readingId > 0); httpReceipt = result.body.readingId; assert.equal(result.headers["cache-control"], "no-store");
        const repeat = await post(assetA.assetRef, issued.token, p); assert.equal(repeat.status, 200); assert.equal(repeat.body.readingId, result.body.readingId); assert.equal(repeat.body.duplicate, true);
        assert.equal((await post(assetA.assetRef, issued.token, { ...p, metrics: { ...p.metrics, vPack: 1 } })).status, 409);
        const b = await post(assetB.assetRef, issuedB.token, sample()); assert.equal(b.status, 201); assert(b.body.readingId > 0);
        assert.equal((await post(assetB.assetRef, issued.token, sample())).status, 401); assert.equal((await post(assetA.assetRef, issuedB.token, sample())).status, 401);
        assert.equal((await post(assetA.assetRef, "lp1_" + "a".repeat(43), sample())).status, 401);
        assert.equal((await api.post(`/api/local-pilot/v1/assets/${assetA.assetRef}/readings`).set("Content-Type", "application/json").send(sample())).status, 401);
      });
      await check("real_rest_strict_unknown_nested_quantity_and_units", async () => {
        const p = sample();
        for (const body of [{ ...p, soh: 100 }, { ...p, metrics: { vPack: { value: 0, unit: "V" } }, units: { vPack: "V" } }, { ...p, metrics: { vPack: 0, unknown: 1 }, units: { vPack: "V" } }, { ...p, metrics: { vPack: "0" }, units: { vPack: "V" } }, { ...p, metrics: { vPack: null }, units: { vPack: "V" } }, { ...p, units: { vPack: "mV", iPack: "A", socReported: "%" } }, { ...p, metrics: {}, units: {} }, { ...p, source: "SYNTHETIC" }, { ...p, units: { vPack: "V" } }]) assert.equal((await post(assetA.assetRef, issued.token, body)).status, 400);
        assert.equal((await post(assetA.assetRef, issued.token, '{"metrics":{"vPack":0,"vPack":1}}')).status, 400);
        assert.equal((await post(assetA.assetRef, issued.token, '{"source":"SYNTHETIC","sour\\u0063e":"BMS_REPORTED"}')).status, 400);
        assert.equal((await post(assetA.assetRef, issued.token, "[".repeat(17) + "0" + "]".repeat(17))).status, 400);
        assert.equal((await post(assetA.assetRef, issued.token, "{" )).status, 400);
        assert.equal(await rawLoopbackPost(listener, assetA.assetRef, issued.token, Buffer.from([255])), 400);
      });
      await check("real_rest_8kib_exact_limit_declared_and_chunked", async () => {
        const p = sample(), json = JSON.stringify(p), padded = json + " ".repeat(PILOT_MAX_BYTES - Buffer.byteLength(json));
        assert.equal(Buffer.byteLength(padded), 8192); const accepted = await post(assetA.assetRef, issued.token, padded); assert.equal(accepted.status, 201); assert(accepted.body.readingId > 0);
        assert.equal((await post(assetA.assetRef, issued.token, padded + " ")).status, 413);
        assert.equal(await rawLoopbackPost(listener, assetA.assetRef, issued.token, Buffer.from(padded + " ")), 413);
        assert.equal((await api.post(`/api/local-pilot/v1/assets/${assetA.assetRef}/readings`).set("Authorization", "Bearer " + issued.token).set("Content-Type", "text/plain").send("{}")).status, 415);
        assert.equal((await api.post(`/api/local-pilot/v1/assets/${assetA.assetRef}/readings`).set("Authorization", "Bearer " + issued.token).set("Content-Type", "application/json").set("Content-Encoding", "gzip").send("{}")).status, 415);
      });
      await check("real_rest_stale_future_range_revision_and_timezone", async () => {
        for (const change of [{ recordedAt: new Date(Date.now() - 301000).toISOString() }, { recordedAt: new Date(Date.now() + 31000).toISOString() }, { captureRevision: "QA/wrong" }, { metrics: { vPack: 15.000001 }, units: { vPack: "V" as const } }, { metrics: { iPack: -5.000001 }, units: { iPack: "A" as const } }, { metrics: { tPack: 20 }, units: { tPack: "degC" as const } }]) assert.equal((await post(assetA.assetRef, issued.token, sample(change))).status, 422);
        assert.equal((await post(assetA.assetRef, issued.token, sample({ recordedAt: new Date().toISOString().replace("Z", "") }))).status, 400);
        const instant = new Date(); const local = new Date(instant.getTime() + 330 * 60000).toISOString().replace("Z", "+05:30");
        const tz = sample({ recordedAt: local, metrics: { vPack: 15, iPack: -5, socReported: 100 }, units: { vPack: "V", iPack: "A", socReported: "%" } });
        const accepted = await post(assetA.assetRef, issued.token, tz); assert.equal(accepted.status, 201);
        const row = await pool.query("SELECT recorded_at FROM local_pilot_readings WHERE id=$1", [accepted.body.readingId]); assert.equal(row.rows[0].recorded_at.toISOString(), instant.toISOString());
        // Exact +/-1ms boundary checks use a fixed explicit clock, not a flaky moving PostgreSQL clock.
        const fixed = Date.now();
        for (const delta of [-PILOT_STALE_MS, PILOT_FUTURE_MS]) validatePilotReading(pilotReadingSchema.parse(sample({ recordedAt: new Date(fixed + delta).toISOString() })), profile, "QA/1", fixed);
        for (const delta of [-PILOT_STALE_MS - 1, PILOT_FUTURE_MS + 1]) assert.throws(() => validatePilotReading(pilotReadingSchema.parse(sample({ recordedAt: new Date(fixed + delta).toISOString() })), profile, "QA/1", fixed), { status: 422 });
      });
      await check("real_sql_append_only_mapping_revocation_and_fk", async () => {
        for (const table of ["local_pilot_assets", "local_pilot_provenance", "local_pilot_readings"]) {
          const timestamp = table === "local_pilot_readings" ? "received_at" : "created_at";
          await rejectedSql(() => pool.query(`UPDATE ${table} SET ${timestamp}=${timestamp} WHERE asset_ref=$1`, [assetA.assetRef]), "P0001");
          // Only private QA rows; trigger must reject deletion, leaving all fixtures retained.
          await rejectedSql(() => pool.query(`DELETE FROM ${table} WHERE asset_ref=$1`, [assetA.assetRef]), "P0001");
        }
        await rejectedSql(() => pool.query("DELETE FROM local_pilot_devices WHERE device_ref=$1", [issued.device.deviceRef]), "P0001");
        await rejectedSql(() => pool.query("UPDATE local_pilot_devices SET asset_ref=$1 WHERE device_ref=$2", [assetB.assetRef, issued.device.deviceRef]), "P0001");
        await rejectedSql(() => pool.query("UPDATE local_pilot_devices SET last_seen_at=NULL WHERE device_ref=$1", [issued.device.deviceRef]), "P0001");
        await rejectedSql(() => pool.query("INSERT INTO local_pilot_devices(device_ref,asset_ref,owner_id,name,capture_revision,credential_hash) VALUES($1,$2,$3,'QA denied','QA/1',$4)", [randomUUID(), assetA.assetRef, ownerB, "f".repeat(64)]), "23503");
        await rejectedSql(() => pool.query("INSERT INTO local_pilot_readings(asset_ref,device_ref,sample_id,recorded_at,payload,payload_hash) VALUES($1,$2,$3,NOW(),$4,$5)", [assetA.assetRef, issuedB.device.deviceRef, randomUUID(), JSON.stringify(sample()), "f".repeat(64)]), "23503");
        const invalidOwner = Math.max(ownerA, ownerB) + 1;
        await rejectedSql(() => pool.query("INSERT INTO local_pilot_assets(asset_ref,owner_id,manufacturer_serial,profile) VALUES($1,$2,'QA denied',$3)", [randomUUID(), invalidOwner, JSON.stringify(profile)]), "23503");
      });
      await check("real_sql_null_source_regression_local_only_and_unique", async () => {
        for (const invalidPayload of [{}, { source: null }, { source: "SYNTHETIC" }, []]) {
          await rejectedSql(() => pool.query("INSERT INTO local_pilot_readings(asset_ref,device_ref,sample_id,recorded_at,payload,payload_hash) VALUES($1,$2,$3,NOW(),$4,$5)", [assetA.assetRef, issued.device.deviceRef, randomUUID(), JSON.stringify(invalidPayload), "e".repeat(64)]), "23514");
        }
        for (const values of [{ namespace: "OFFICIAL", bpan: null, allocation: null, verification: "unverified" }, { namespace: "LOCAL_PILOT", bpan: "QA-NOT-OFFICIAL", allocation: null, verification: "unverified" }, { namespace: "LOCAL_PILOT", bpan: null, allocation: "allocated", verification: "unverified" }, { namespace: "LOCAL_PILOT", bpan: null, allocation: null, verification: "verified" }]) {
          await rejectedSql(() => pool.query("INSERT INTO local_pilot_assets(asset_ref,owner_id,manufacturer_serial,profile,namespace,official_bpan,official_allocation_status,official_verification) VALUES($1,$2,'QA denied',$3,$4,$5,$6,$7)", [randomUUID(), ownerA, JSON.stringify(profile), values.namespace, values.bpan, values.allocation, values.verification]), "23514");
        }
        await rejectedSql(() => pool.query("INSERT INTO local_pilot_readings(asset_ref,device_ref,sample_id,recorded_at,payload,payload_hash) VALUES($1,$2,$3,$4,$5,$6)", [assetA.assetRef, issued.device.deviceRef, payload.sampleId, payload.recordedAt, JSON.stringify(payload), hashPilotReading(payload)]), "23505");
      });
      await check("real_inflight_ingestion_waits_for_committed_revocation", async () => {
        const revoker = await pool.connect(); let committed = false;
        try {
          await revoker.query("BEGIN"); await revoker.query("SELECT id FROM local_pilot_devices WHERE device_ref=$1 FOR UPDATE", [issued.device.deviceRef]);
          await revoker.query("UPDATE local_pilot_devices SET revoked_at=clock_timestamp() WHERE device_ref=$1", [issued.device.deviceRef]);
          const pid = await revoker.query("SELECT pg_backend_pid() AS pid");
          const pendingSample = sample(); const blocked = store.ingest(assetA.assetRef, issued.token, pendingSample); const denied = assert.rejects(blocked, { status: 401 });
          await waitForLock(pool, pid.rows[0].pid); await revoker.query("COMMIT"); committed = true; await denied;
          const count = await pool.query("SELECT count(*)::int AS n FROM local_pilot_readings WHERE sample_id=$1", [pendingSample.sampleId]); assert.equal(count.rows[0].n, 0);
        } finally { if (!committed) await revoker.query("ROLLBACK"); revoker.release(); }
        await assert.rejects(store.ingest(assetA.assetRef, issued.token, sample()), { status: 401 });
        assert.equal((await post(assetA.assetRef, issued.token, sample())).status, 401);
        assert.equal((await post(assetA.assetRef, issued.token, payload)).status, 401);
        await rejectedSql(() => pool.query("UPDATE local_pilot_devices SET revoked_at=NULL WHERE device_ref=$1", [issued.device.deviceRef]), "P0001");
        await rejectedSql(() => pool.query("UPDATE local_pilot_devices SET revoked_at=clock_timestamp() WHERE device_ref=$1", [issued.device.deviceRef]), "P0001");
        const revoked = await callerA.revokeDevice({ assetRef: assetA.assetRef, deviceRef: issued.device.deviceRef }); assert(revoked.revokedAt);
      });
      await check("real_revocation_waits_behind_inflight_accepted_ingestion", async () => {
        const assetLocker = await pool.connect(); let committed = false;
        try {
          await assetLocker.query("BEGIN"); await assetLocker.query("SELECT id FROM local_pilot_assets WHERE asset_ref=$1 FOR UPDATE", [assetA.assetRef]);
          const pid = await assetLocker.query("SELECT pg_backend_pid() AS pid");
          const p = sample(); const pending = store.ingest(assetA.assetRef, secondA.token, p);
          // Ingest now owns the device lock and is blocked on the asset lock.
          const ingestionPid = await waitForLock(pool, pid.rows[0].pid);
          const revoke = callerA.revokeDevice({ assetRef: assetA.assetRef, deviceRef: secondA.device.deviceRef });
          await waitForLock(pool, ingestionPid);
          await assetLocker.query("COMMIT"); committed = true;
          const receipt = await pending; assert(receipt.readingId > 0); assert.equal(receipt.duplicate, false);
          const revoked = await revoke; assert(revoked.revokedAt);
          const count = await pool.query("SELECT count(*)::int AS n FROM local_pilot_readings WHERE sample_id=$1", [p.sampleId]); assert.equal(count.rows[0].n, 1);
        } finally { if (!committed) await assetLocker.query("ROLLBACK"); assetLocker.release(); }
        assert.equal((await post(assetA.assetRef, secondA.token, sample())).status, 401);
      });
      await check("real_rpc_revocation_and_disabled_gates", async () => {
        const firstRevoke = await callerB.revokeDevice({ assetRef: assetB.assetRef, deviceRef: issuedB.device.deviceRef }); assert(firstRevoke.revokedAt);
        const repeat = await callerB.revokeDevice({ assetRef: assetB.assetRef, deviceRef: issuedB.device.deviceRef }); assert.equal(repeat.revokedAt!.getTime(), firstRevoke.revokedAt!.getTime());
        assert.equal((await post(assetB.assetRef, issuedB.token, sample())).status, 401);
        process.env.LOCAL_PILOT_ENABLED = "false";
        assert.equal((await callerA.status()).enabled, false);
        await assert.rejects(callerA.listAssets(), { code: "SERVICE_UNAVAILABLE" });
        await assert.rejects(store.listAssets(ownerA), { status: 503 });
        assert.equal((await post(assetA.assetRef, secondA.token, sample())).status, 503);
        process.env.LOCAL_PILOT_ENABLED = "true";
      });
    } finally { await new Promise<void>((resolveClose, reject) => listener.close(error => error ? reject(error) : resolveClose())); }
    stage = "final_counts";
    const totals = await pool.query(`SELECT (SELECT count(*)::int FROM users) AS fixture_users,(SELECT count(*)::int FROM local_pilot_assets) AS assets,(SELECT count(*)::int FROM local_pilot_provenance) AS provenance,(SELECT count(*)::int FROM local_pilot_devices) AS devices,(SELECT count(*)::int FROM local_pilot_readings) AS readings,(SELECT count(*)::int FROM local_pilot_devices WHERE revoked_at IS NOT NULL) AS revoked_devices`);
    assert.deepEqual(totals.rows[0], { fixture_users: 2, assets: 2, provenance: 2, devices: 3, readings: 8, revoked_devices: 3 });
    await check("public_catalog_unchanged_no_public_rows_accessed", async () => assert.equal(await publicCatalog(pool), catalogBefore));
    const result = { qa: "explicit_127.0.0.1_circulair_qa", passed: true, sqlSha256: checksum, privateSchema: schema, checksPassed: checks.length, checks, counts: totals.rows[0], positiveReceiptIds: { store: first.readingId, http: httpReceipt }, fixtureRetention: "fresh private schema and all synthetic fixtures retained; no public writes, no public row reads, no reset", fixtureProof: "two private QA namespace users; actual public column structure copied without customer data/default sequences", publicCatalogUnchanged: true, externalTraffic: 0, sampleGeneration: "synthetic QA only; wire BMS_REPORTED is not genuine hardware evidence", physicalAcceptance: "not_established", productionSqlApplied: false };
    console.log(JSON.stringify(result)); return result;
  } catch {
    // Never print driver error objects, connection values, payloads or tokens.
    console.error(JSON.stringify({ passed: false, stage, checksPassed: checks.length, privateSchema: schema, retained: true, details: "redacted" }));
    throw new Error("local_pilot_qa_guard_or_acceptance_failed_no_details");
  } finally {
    if (originalEnabled === undefined) delete process.env.LOCAL_PILOT_ENABLED; else process.env.LOCAL_PILOT_ENABLED = originalEnabled;
    await pool.end();
  }
}
// Works with tsx AND an ESM esbuild entry; import by unit tests never executes acceptance.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runPilotQa().catch(() => { console.error("local_pilot_qa_guard_or_acceptance_failed_no_details"); process.exitCode = 1; });
}
