import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { createIncidentStore, enqueueIncidentForAlert, eligibleLiveCritical, incidentGate, incidentGateReady,
  incidentRetryDelay, runIncidentCycle, type IncidentDatabase, type LiveCriticalContext, type IncidentGate } from './incidentOutbox';
import { createIncidentRouter } from './incidentRouter';
import { createOpenSourceAlertingAdapter, type OpenSourceAlertingAdapter, type OpenSourceDeliveryResult, type OpenSourceAlertEvent } from './openSourceAlerting';
import { incidentWorkerMain } from '../scripts/incident-worker';
import type { Alert } from '../drizzle/schema';
const ACCEPTED: OpenSourceDeliveryResult = { accepted: true, retryable: false, code: 'accepted', httpStatus: 200 };
const fp = 'a'.repeat(64); const otherFp = 'b'.repeat(64);
const activation = new Date('2026-01-01T00:00:00.000Z'); const approvalRef = randomUUID();
const gate: IncidentGate = { enabled: true, activationAt: activation, approvalRef, refreshMs: 30000 };
const adapter = (send = vi.fn(async (_event: OpenSourceAlertEvent) => ACCEPTED), fingerprint = fp): OpenSourceAlertingAdapter =>
  ({ enabled: true, configured: true, destinationFingerprint: fingerprint, send });
const live: LiveCriticalContext = { provenance: 'live', tenantUserId: 1, category: 'telemetry' };
const admin = { id: 3, role: 'admin' }; const tenant = { id: 1, role: 'user' };
const fakeAlert = (changes: Partial<Alert> = {}): Alert => ({ id: 123, userId: 1, batteryId: null, bpan: null,
  type: 'thermal_threshold', severity: 'critical', title: 'PRIVATE_TITLE', message: 'PRIVATE_MESSAGE',
  metadata: null, read: false, acknowledged: false, createdAt: new Date(), ...changes });
const callerContext = (user: any) => ({ user, req: {} as any, res: {} as any });

describe('incident outbox offline fail-closed contract', () => {
  it('defaults both runtime gates off without activation approval', () => {
    expect(incidentGate({}).enabled).toBe(false);
    expect(incidentGateReady(adapter(), incidentGate({}))).toBe(false);
    expect(createOpenSourceAlertingAdapter({}).enabled).toBe(false);
  });
  it.each(['', 'not-a-date', '2026-01-01', '2026-02-30T00:00:00.000Z'])('invalid activation fails closed: %s', date => {
    expect(incidentGate({ INCIDENT_ACTIVATION_AT: date }).activationAt).toBe(null);
  });
  it('future activation and missing approval cannot claim', () => {
    expect(incidentGateReady(adapter(), { ...gate, activationAt: new Date('2099-01-01') })).toBe(false);
    expect(incidentGateReady(adapter(), { ...gate, approvalRef: null })).toBe(false);
  });
  it.each([30, 60, 180])('refresh seconds are bounded and supported: %s', n => {
    expect(incidentGate({ INCIDENT_REFRESH_SECONDS: String(n) }).refreshMs).toBe(n * 1000);
  });
  it.each([0, 29, 181, NaN])('invalid refresh falls back to 60s: %s', n => {
    expect(incidentGate({ INCIDENT_REFRESH_SECONDS: String(n) }).refreshMs).toBe(60000);
  });
  it.each(['simulated', 'test', 'demo'] as const)('rejects trusted synthetic provenance %s', provenance => {
    expect(eligibleLiveCritical(fakeAlert(), { ...live, provenance })).toBe(false);
  });
  it.each(['demo', 'simulated', 'test', 'synthetic'])('rejects synthetic metadata veto %s', field => {
    expect(eligibleLiveCritical(fakeAlert({ metadata: { [field]: true } }), live)).toBe(false);
  });
  it.each([{ severity: 'warning' }, { userId: null }, { userId: 2 }, { type: 'simulation_critical' },
    { metadata: { source: 'test_ingest' } }, { metadata: { provenance: 'demo' } }] as Partial<Alert>[])
    ('rejects ineligible alert %j', changes => expect(eligibleLiveCritical(fakeAlert(changes), live)).toBe(false));
  it('requires explicit server provenance, permits owned live critical only', () => {
    expect(eligibleLiveCritical(fakeAlert())).toBe(false); expect(eligibleLiveCritical(fakeAlert(), live)).toBe(true);
  });
  it('disabled and configuration missing do not access any DB methods', async () => {
    const db = { execute: vi.fn(), transaction: vi.fn() } as unknown as IncidentDatabase;
    for (const a of [{ ...adapter(), enabled: false }, { ...adapter(), configured: false }]) {
      expect((await runIncidentCycle(db, a, gate)).attempted).toBe(0);
      expect(await createIncidentStore(db).claim(a, gate, 5)).toEqual([]);
    }
    expect(db.transaction).not.toHaveBeenCalled(); expect(db.execute).not.toHaveBeenCalled();
  });
  it('offline default --once starts without credentials or database/network', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    await incidentWorkerMain([], {}); expect(log).toHaveBeenCalled(); log.mockRestore();
  });
  it('daemon requires approved Render and mutually exclusive modes', async () => {
    await expect(incidentWorkerMain(['--daemon'], {})).rejects.toThrow('Render');
    await expect(incidentWorkerMain(['--daemon', '--once'], {})).rejects.toThrow('Use --once');
  });
  it('backoff honors bounded 429 delay and caps one hour', () => {
    expect(incidentRetryDelay(1)).toBe(30000); expect(incidentRetryDelay(2)).toBe(60000);
    expect(incidentRetryDelay(1, 900000)).toBe(900000); expect(incidentRetryDelay(8, 99999999)).toBe(3600000);
  });
  it.each([null, tenant, { id: 2, role: 'oem' }])('native router denies non-admin before database work %j', async user => {
    const getDatabase = vi.fn();
    const r = createIncidentRouter({ getDatabase, adapter: () => adapter(), gate: () => gate });
    await expect(r.createCaller(callerContext(user)).status()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(r.createCaller(callerContext(user)).resolve({ incidentId: randomUUID(), reason: 'verified_recovery', evidenceRef: randomUUID() }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(getDatabase).not.toHaveBeenCalled();
  });
  it('router refuses mark-read reason, missing evidence and arbitrary destination input', async () => {
    const r = createIncidentRouter({ getDatabase: async () => null, adapter: () => adapter(), gate: () => gate }).createCaller(callerContext(admin));
    await expect(r.resolve({ incidentId: randomUUID(), reason: 'mark_read', evidenceRef: randomUUID() } as any)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(r.resolve({ incidentId: randomUUID(), reason: 'verified_recovery' } as any)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(r.approveDestination({ evidenceRef: randomUUID(), origin: 'https://attacker.invalid' } as any)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// This suite NEVER falls back to application env. Explicit isolated QA credential only, validated before connect.
const qaUrl = process.env.TEST_INCIDENT_PG_URL;
const pgSuite = qaUrl ? describe : describe.skip;
pgSuite('guarded PostgreSQL incident outbox (all sends mocked)', () => {
  let pool: Pool; let db: IncidentDatabase;
  const schema = `qa_oss_${randomUUID().replaceAll('-', '')}`;
  let sequence = 100;
  const table = (name: string) => sql.raw(`"${schema}"."${name}"`);
  const store = () => createIncidentStore(db);
  async function fixture(changes: Partial<Alert> = {}, context: LiveCriticalContext | null = live, a = adapter(), g = gate) {
    let alert!: Alert; let id: string | null = null;
    await db.transaction(async tx => {
      const v = fakeAlert({ id: ++sequence, ...changes });
      const r = await tx.execute(sql`INSERT INTO alerts(id,"userId","batteryId",bpan,type,severity,title,message,metadata,read,acknowledged,"createdAt")
        VALUES (${v.id},${v.userId},${v.batteryId},${v.bpan},${v.type},${v.severity},${v.title},${v.message},${v.metadata === null ? null : JSON.stringify(v.metadata)}::json,
          ${v.read},${v.acknowledged},${v.createdAt}) RETURNING *`);
      alert = r.rows[0] as Alert;
      id = await enqueueIncidentForAlert(tx, alert, context ?? undefined, a, g);
    });
    return { id, alert };
  }
  beforeAll(async () => {
    const u = new URL(qaUrl!);
    if (!['postgres:', 'postgresql:'].includes(u.protocol) || u.hostname !== '127.0.0.1' || (u.port || '5432') !== '5432'
      || u.pathname !== '/circulair_qa' || u.search || u.hash) throw new Error('Unsafe QA target rejected');
    pool = new Pool({ connectionString: qaUrl, max: 6, connectionTimeoutMillis: 2000, options: `-c search_path=${schema},public` });
    await pool.query(`CREATE SCHEMA "${schema}"`);
    // Copy ACTUAL users/alerts columns without serial/default sequence references. Only synthetic fixtures in this namespace.
    await pool.query(`CREATE TABLE "${schema}".users (LIKE public.users INCLUDING CONSTRAINTS); CREATE UNIQUE INDEX ON "${schema}".users(id);
      CREATE TABLE "${schema}".alerts (LIKE public.alerts INCLUDING CONSTRAINTS); CREATE UNIQUE INDEX ON "${schema}".alerts(id);
      CREATE TABLE "${schema}".batteries(id integer PRIMARY KEY, "ownerId" integer, bpan varchar(21));`);
    await pool.query(readFileSync(new URL('../drizzle/open-source-incidents.sql', import.meta.url), 'utf8'));
    db = drizzle(pool) as unknown as IncidentDatabase;
  }, 15000);
  beforeEach(async () => {
    await pool.query(`TRUNCATE TABLE "${schema}".oss_incident_commands, "${schema}".oss_incident_deliveries,
      "${schema}".oss_incidents,"${schema}".oss_incident_destinations,"${schema}".alerts,"${schema}".users,"${schema}".batteries`);
    await pool.query(`INSERT INTO "${schema}".users(id,"openId",role,"platformRole","createdAt","updatedAt","lastSignedIn") VALUES
      (1,'qa-owner','user','oem',NOW(),NOW(),NOW()),(2,'qa-foreign','user','oem',NOW(),NOW(),NOW()),(3,'qa-admin','admin','admin',NOW(),NOW(),NOW())`);
    await store().approveDestination(admin, adapter(), gate, randomUUID());
  });
  afterAll(async () => {
    if (pool) { try { await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await pool.end(); } }
  });
  it('persists random UUID incident and delivery atomically and exports no private fields', async () => {
    const f = await fixture(); expect(f.id).toMatch(/^[a-f0-9-]{36}$/); expect(f.id).not.toContain(String(f.alert.id));
    const sender = vi.fn(async (event: OpenSourceAlertEvent) => { expect(Object.keys(event).sort()).toEqual(['action','category','incidentId','provenance','startedAt']); return ACCEPTED; });
    const result = await runIncidentCycle(db, adapter(sender), gate); expect(result.accepted).toBe(1);
    const status = await store().status(admin);
    expect(status.items[0]).toMatchObject({ action: 'trigger', state: 'accepted', version: 1 });
    expect(JSON.stringify(status)).not.toMatch(/PRIVATE|tenant|fingerprint|password|metadata|alertId|title|message/);
  });
  it('rollback prevents alert/incident/outbox partial commits', async () => {
    const id = ++sequence;
    await expect(db.transaction(async tx => {
      const v = fakeAlert({ id });
      const r = await tx.execute(sql`INSERT INTO alerts(id,"userId",type,severity,title,message,read,acknowledged,"createdAt")
        VALUES (${id},1,${v.type},'critical','QA','QA',false,false,${v.createdAt}) RETURNING *`);
      await enqueueIncidentForAlert(tx, r.rows[0] as Alert, live, adapter(), gate); throw new Error('rollback fixture');
    })).rejects.toThrow('rollback');
    const rows = await db.execute(sql`SELECT id FROM alerts WHERE id = ${id}`); expect(rows.rows).toHaveLength(0);
    expect((await store().status(admin)).items).toHaveLength(0);
  });
  it('old committed critical alerts cannot be backfilled even after activation', async () => {
    const f = await fixture({}, null); expect(f.id).toBeNull();
    const result = await db.transaction(tx => enqueueIncidentForAlert(tx, f.alert, live, adapter(), gate)); expect(result).toBeNull();
  });
  it.each(['simulated','demo','test'] as const)('no incident for synthetic %s', async provenance => {
    expect((await fixture({}, { ...live, provenance })).id).toBeNull();
  });
  it('tenant mismatch, absent user, foreign battery and preactivation are excluded', async () => {
    expect((await fixture({ userId: 2 })).id).toBeNull();
    expect((await fixture({ userId: null })).id).toBeNull();
    await pool.query(`INSERT INTO "${schema}".batteries VALUES (10,2,'QA-BATTERY')`);
    expect((await fixture({ batteryId: 10 })).id).toBeNull();
    expect((await fixture({ createdAt: new Date('2025-01-01') })).id).toBeNull();
  });
  it('owned battery permits live critical creation and mismatched identity cannot', async () => {
    await pool.query(`INSERT INTO "${schema}".batteries VALUES (10,1,'QA-BATTERY')`);
    expect((await fixture({ batteryId: 10, bpan: 'QA-BATTERY' })).id).not.toBeNull();
    expect((await fixture({ batteryId: 10, bpan: 'WRONG-BATTERY' })).id).toBeNull();
  });
  it('disabled or missing durable destination approval leaves pending untouched', async () => {
    await fixture(); const a = { ...adapter(), enabled: false };
    expect((await runIncidentCycle(db, a, gate)).attempted).toBe(0);
    const unapproved = { ...gate, approvalRef: randomUUID() };
    expect((await runIncidentCycle(db, adapter(), unapproved)).attempted).toBe(0);
    expect((await store().status(admin)).items[0]).toMatchObject({ state: 'pending', attempts: 0 });
  });
  it('existing fingerprint approval cannot silently change activation/review identity', async () => {
    await expect(store().approveDestination(admin,adapter(),{ ...gate, approvalRef: randomUUID() },randomUUID()))
      .rejects.toThrow('approval differs');
    expect((await db.execute(sql`SELECT approval_ref FROM oss_incident_destinations WHERE fingerprint = ${fp}`)).rows[0].approval_ref).toBe(approvalRef);
  });
  it('refresh uses stable UUID/start and monotonic versions; no new alert rows', async () => {
    const f = await fixture(); const events: OpenSourceAlertEvent[] = [];
    const a = adapter(vi.fn(async e => { events.push(e); return ACCEPTED; }));
    await runIncidentCycle(db,a,gate);
    await db.execute(sql`UPDATE oss_incidents SET next_refresh_at = NOW() - INTERVAL '1 second' WHERE id = ${f.id}::uuid`);
    await runIncidentCycle(db,a,gate);
    expect(events).toHaveLength(2); expect(events[0]).toEqual(events[1]);
    const status = await store().status(admin); expect(status.items.map(i => i.version).sort()).toEqual([1,2]);
    expect((await db.execute(sql`SELECT COUNT(*)::int AS n FROM alerts`)).rows[0].n).toBe(1);
  });
  it('real resolve records accountable admin/reason/evidence, stops trigger refresh and sends endsAt', async () => {
    const f = await fixture(); const events: OpenSourceAlertEvent[] = [];
    const a = adapter(vi.fn(async e => { events.push(e); return ACCEPTED; }));
    await runIncidentCycle(db,a,gate);
    const evidenceRef = randomUUID(); await store().resolve(admin,f.id!,'verified_recovery',evidenceRef);
    await runIncidentCycle(db,a,gate);
    const r = (await db.execute(sql`SELECT * FROM oss_incidents WHERE id = ${f.id}::uuid`)).rows[0];
    expect(r).toMatchObject({ state: 'resolved', resolve_pending: false, resolved_by_user_id: 3, resolution_reason: 'verified_recovery', recovery_evidence_ref: evidenceRef });
    expect(events.map(e => e.action)).toEqual(['trigger','resolve']); expect(events[1].resolvedAt).toBeTruthy();
    await db.execute(sql`UPDATE oss_incidents SET next_refresh_at = NOW() - INTERVAL '1 second' WHERE id = ${f.id}::uuid`);
    expect(await store().reconcile(a,gate,10)).toBe(0);
  });
  it('database rechecks admin role and native tenant resolve is denied', async () => {
    const f = await fixture();
    await expect(store().resolve(tenant,f.id!,'verified_recovery',randomUUID())).rejects.toThrow('administrator');
    await expect(store().resolve({ id: 1, role: 'admin' },f.id!,'verified_recovery',randomUUID())).rejects.toThrow('administrator');
    expect((await store().status(admin)).items[0].incidentState).toBe('open');
  });
  it('approved changed destination quarantines rather than rerouting; explicit restore-only release', async () => {
    const f = await fixture(); const sender = vi.fn(async (_: OpenSourceAlertEvent) => ACCEPTED); const changed = adapter(sender,otherFp);
    await store().approveDestination(admin,changed,gate,randomUUID());
    expect((await runIncidentCycle(db,changed,gate)).attempted).toBe(0); expect(sender).not.toHaveBeenCalled();
    expect((await store().status(admin)).items[0]).toMatchObject({ state: 'quarantined', quarantined: true });
    await expect(store().releaseQuarantine(admin,f.id!,randomUUID(),changed,gate)).rejects.toThrow('rerouting forbidden');
    await store().releaseQuarantine(admin,f.id!,randomUUID(),adapter(),gate);
    expect((await runIncidentCycle(db,adapter(sender),gate)).accepted).toBe(1);
  });
  it('concurrent processes do not double claim a single incident', async () => {
    await fixture(); const results = await Promise.all([store().claim(adapter(),gate,10),store().claim(adapter(),gate,10)]);
    expect(results.flat()).toHaveLength(1);
  });
  it('lease expiry increments generation; stale completion cannot send', async () => {
    await fixture(); const a = adapter(); const [old] = await store().claim(a,gate,10);
    await db.execute(sql`UPDATE oss_incident_deliveries SET lease_until = NOW() - INTERVAL '1 second' WHERE id = ${old.id}::uuid`);
    const [current] = await store().claim(a,gate,10); expect(current.generation).toBe(old.generation+1);
    expect(await store().dispatch(old,a,gate)).toBe('stale'); expect(a.send).not.toHaveBeenCalled();
    expect(await store().dispatch(current,a,gate)).toBe('accepted');
    expect((await store().status(admin)).items[0].ambiguous).toBe(true);
  });
  it('resolution supersedes claimed but unsent trigger without reopening', async () => {
    const f = await fixture(); const a = adapter(); const [claimed] = await store().claim(a,gate,10);
    await store().resolve(admin,f.id!,'operator_mitigation_verified',randomUUID());
    expect(await store().dispatch(claimed,a,gate)).toBe('stale'); expect(a.send).not.toHaveBeenCalled();
    expect((await runIncidentCycle(db,a,gate)).accepted).toBe(1);
    expect((await store().status(admin)).items.some(i => i.action === 'trigger' && i.state === 'superseded')).toBe(true);
  });
  it('send lock blocks concurrent resolve/reconcile/expired reclaim until ack; old trigger cannot start after resolve', async () => {
    const f = await fixture(); let release!: (r: OpenSourceDeliveryResult) => void; let entered!: () => void;
    const started = new Promise<void>(r => { entered = r; });
    const events: string[] = [];
    const a = adapter(vi.fn(async e => { events.push(e.action); entered(); return await new Promise<OpenSourceDeliveryResult>(r => { release = r; }); }));
    const [claim] = await store().claim(a,gate,10);
    // Make lease expire DURING send: incident lock remains authoritative even after lease expiry.
    await db.execute(sql`UPDATE oss_incident_deliveries SET lease_until = NOW() + INTERVAL '250 milliseconds' WHERE id = ${claim.id}::uuid`);
    const sending = store().dispatch(claim,a,gate); await started;
    await new Promise(r => setTimeout(r,300));
    expect(await store().claim(a,gate,10)).toEqual([]); expect(await store().reconcile(a,gate,10)).toBe(0);
    let resolved = false;
    const resolving = store().resolve(admin,f.id!,'verified_recovery',randomUUID()).then(r => { resolved = true; return r; });
    await new Promise(r => setTimeout(r,30)); expect(resolved).toBe(false);
    release(ACCEPTED); expect(await sending).toBe('accepted'); await resolving;
    const real = adapter(vi.fn(async e => { events.push(e.action); return ACCEPTED; }));
    await runIncidentCycle(db,real,gate); expect(events).toEqual(['trigger','resolve']);
    expect(await store().dispatch(claim,real,gate)).toBe('stale');
  });
  it('long in-flight send makes resolution bounded busy rather than an unbounded transaction', async () => {
    const f = await fixture(); let release!: (r: OpenSourceDeliveryResult) => void; let entered!: () => void;
    const started = new Promise<void>(r => { entered = r; });
    const a = adapter(vi.fn(async _e => { entered(); return await new Promise<OpenSourceDeliveryResult>(r => { release = r; }); }));
    const [claim] = await store().claim(a,gate,1); const sending = store().dispatch(claim,a,gate); await started;
    try {
      await expect(store().resolve(admin,f.id!,'verified_recovery',randomUUID())).rejects.toMatchObject({ cause: { code: '55P03' } });
    } finally { release(ACCEPTED); await sending; }
    expect((await store().status(admin)).items[0].incidentState).toBe('open');
  });
  it('completion DB failure retains claim and recovers same UUID after lease expiry', async () => {
    await fixture(); const a = adapter(); const [c] = await store().claim(a,gate,1);
    const broken: IncidentDatabase = { execute: query => db.execute(query), transaction: fn => db.transaction(tx => fn({
      execute: async query => {
        const { PgDialect } = await import('drizzle-orm/pg-core');
        const text = new PgDialect().sqlToQuery(query).sql;
        if (text.includes('SET state =') && text.includes('http_status')) throw new Error('synthetic completion failure');
        return tx.execute(query);
      },
    })) };
    await expect(createIncidentStore(broken).dispatch(c,a,gate)).rejects.toThrow('completion failure');
    expect((await store().status(admin)).items[0]).toMatchObject({ state: 'sending', attempts: 1 });
    await db.execute(sql`UPDATE oss_incident_deliveries SET lease_until = NOW() - INTERVAL '1 second' WHERE id = ${c.id}::uuid`);
    const [retry] = await store().claim(a,gate,1); expect(retry.id).toBe(c.id);
    await store().dispatch(retry,a,gate);
    expect((await store().status(admin)).items[0]).toMatchObject({ state: 'accepted', ambiguous: true });
    expect(a.send).toHaveBeenCalledTimes(2);
    expect((a.send as ReturnType<typeof vi.fn>).mock.calls[0][0].incidentId).toBe((a.send as ReturnType<typeof vi.fn>).mock.calls[1][0].incidentId);
  });
  it('hard send bound persists ambiguity and repairs resolution after simulated late upstream completion', async () => {
    const f = await fixture(); let late!: (r: OpenSourceDeliveryResult) => void;
    const a = adapter(vi.fn(async _e => new Promise<OpenSourceDeliveryResult>(r => { late = r; })));
    const [c] = await store().claim(a,gate,1); const started = Date.now();
    expect(await store().dispatch(c,a,gate)).toBe('pending');
    expect(Date.now()-started).toBeLessThan(9000);
    expect((await store().status(admin)).items[0]).toMatchObject({ ambiguous: true, lastErrorCode: 'network_or_timeout' });
    await store().resolve(admin,f.id!,'verified_recovery',randomUUID());
    const ok = adapter(); await runIncidentCycle(db,ok,gate);
    late(ACCEPTED);
    await db.execute(sql`UPDATE oss_incidents SET next_refresh_at = NOW() - INTERVAL '1 second' WHERE id = ${f.id}::uuid`);
    await runIncidentCycle(db,ok,gate);
    expect((await db.execute(sql`SELECT state,resolve_pending FROM oss_incidents WHERE id = ${f.id}::uuid`)).rows[0])
      .toMatchObject({ state: 'resolved', resolve_pending: true });
    expect(ok.send).toHaveBeenCalledTimes(2);
    expect((ok.send as ReturnType<typeof vi.fn>).mock.calls.every(args => args[0].action === 'resolve')).toBe(true);
  }, 12000);
  it('429 and transient failure retry with same incident and bounded backoff', async () => {
    await fixture(); const a = adapter(vi.fn(async _e => ({ accepted: false, retryable: true, code: 'http_error' as const, httpStatus: 429, retryAfterMs: 120000 })));
    const before = Date.now(); await runIncidentCycle(db,a,gate);
    const d = (await store().status(admin)).items[0]; expect(d).toMatchObject({ state: 'pending', attempts: 1, httpStatus: 429 });
    expect(new Date(d.nextAttemptAt).getTime()).toBeGreaterThanOrEqual(before+120000);
    expect((await runIncidentCycle(db,a,gate)).attempted).toBe(0);
  });
  it('permanent failure is visible dead letter; audited retry preserves UUID/version', async () => {
    await fixture(); const a = adapter(vi.fn(async _e => ({ accepted: false, retryable: false, code: 'http_error' as const, httpStatus: 401 })));
    await runIncidentCycle(db,a,gate); const d = (await store().status(admin)).items[0]; expect(d.state).toBe('dead');
    await store().retryDeadLetter(admin,d.id,randomUUID()); expect((await runIncidentCycle(db,adapter(),gate)).accepted).toBe(1);
    expect((await store().status(admin)).items[0]).toMatchObject({ id: d.id, incidentId: d.incidentId, version: d.version });
  });
  it('exhausted expired lease dead-letters without another send', async () => {
    await fixture(); const a = adapter(); const [c] = await store().claim(a,gate,1);
    await db.execute(sql`UPDATE oss_incident_deliveries SET attempts = 8, lease_until = NOW() - INTERVAL '1 second' WHERE id = ${c.id}::uuid`);
    expect(await store().claim(a,gate,1)).toEqual([]); expect(a.send).not.toHaveBeenCalled();
    expect((await store().status(admin)).items[0]).toMatchObject({ state: 'dead', ambiguous: true, lastErrorCode: 'attempts_exhausted' });
  });
  it('ambiguous old send persists real resolve pending and repeated repair, never reopens', async () => {
    const f = await fixture(); const a = adapter(vi.fn(async _e => ({ accepted: false, retryable: true, code: 'network_or_timeout' as const })));
    await runIncidentCycle(db,a,gate);
    await store().resolve(admin,f.id!,'verified_recovery',randomUUID());
    const events: OpenSourceAlertEvent[] = []; const ok = adapter(vi.fn(async e => { events.push(e); return ACCEPTED; }));
    await runIncidentCycle(db,ok,gate);
    const i = (await db.execute(sql`SELECT * FROM oss_incidents WHERE id = ${f.id}::uuid`)).rows[0]; expect(i).toMatchObject({ state: 'resolved', resolve_pending: true });
    await db.execute(sql`UPDATE oss_incidents SET next_refresh_at = NOW() - INTERVAL '1 second' WHERE id = ${f.id}::uuid`);
    await runIncidentCycle(db,ok,gate); expect(events.map(e => e.action)).toEqual(['resolve','resolve']); expect(events[0]).toEqual(events[1]);
    expect((await store().status(admin)).items.some(i => i.kind === 'repair')).toBe(true);
  });
  it('SQL constraints reject reopening a resolved incident or sending without a lease', async () => {
    const f = await fixture(); await store().resolve(admin,f.id!,'verified_recovery',randomUUID());
    await expect(db.execute(sql`UPDATE oss_incidents SET state = 'open' WHERE id = ${f.id}::uuid`))
      .rejects.toMatchObject({ cause: { code: '23514' } });
    await expect(db.execute(sql`UPDATE oss_incident_deliveries SET state = 'sending' WHERE incident_id = ${f.id}::uuid`))
      .rejects.toMatchObject({ cause: { code: '23514' } });
  });
  it('resolve failures remain pending/dead visible; reading alerts is never resolution', async () => {
    const f = await fixture(); await db.execute(sql`UPDATE alerts SET read = true, acknowledged = true WHERE id = ${f.alert.id}`);
    expect((await store().status(admin)).items[0].incidentState).toBe('open');
    await store().resolve(admin,f.id!,'false_positive_verified',randomUUID());
    const fail = adapter(vi.fn(async _e => ({ accepted: false, retryable: false, code: 'http_error' as const, httpStatus: 403 })));
    await runIncidentCycle(db,fail,gate);
    expect((await store().status(admin)).items.find(i => i.action === 'resolve')).toMatchObject({ state: 'dead', resolvePending: true, incidentState: 'resolved' });
  });
  it('bounded list/counts and exact additive SQL columns match DTOs', async () => {
    await fixture(); await fixture(); expect((await store().status(admin,1)).items).toHaveLength(1);
    const { incidents, incidentDeliveries, incidentDestinations, incidentCommands } = await import('../drizzle/incidentSchema');
    const { getTableColumns, getTableName } = await import('drizzle-orm');
    for (const t of [incidents, incidentDeliveries, incidentDestinations, incidentCommands]) {
      const r = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY column_name', [schema,getTableName(t)]);
      expect(r.rows.map(r => r.column_name)).toEqual(Object.values(getTableColumns(t)).map(c => c.name).sort());
    }
    expect(readFileSync(new URL('../drizzle/open-source-incidents.sql',import.meta.url),'utf8')).not.toMatch(/\b(?:ALTER|DROP|UPDATE|DELETE|TRUNCATE)\b/i);
  });
});
