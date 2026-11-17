import { readFileSync } from 'node:fs';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { TrpcContext } from './_core/context';
import type { Alert, InsertAlert } from '../drizzle/schema';
import type { LiveCriticalContext } from './incidentOutbox';

const mocks = vi.hoisted(() => ({
  db: {} as Record<string, any>,
  connect: vi.fn().mockResolvedValue({ release: vi.fn() }),
  getDatabase: vi.fn(),
  adapterFactory: vi.fn(),
  send: vi.fn(),
}));
// Preserve actual createAlert and incident SQL. Only isolated Pool/Drizzle and
// destination leaves are doubled; there is no real URL, DB, provider or sender.
vi.mock('../shared/databaseEnv.cjs', () => ({
  resolvePostgresConnectionUrl: () => 'postgresql://SYNTHETIC:SYNTHETIC@127.0.0.1:5432/SYNTHETIC_never_connected',
}));
vi.mock('pg', () => ({ Pool: class { on() {} connect = mocks.connect; } }));
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: () => mocks.db }));
vi.mock('./db', async importOriginal => ({
  ...await importOriginal<typeof import('./db')>(), getDb: mocks.getDatabase,
}));
vi.mock('./openSourceAlerting', async importOriginal => ({
  ...await importOriginal<typeof import('./openSourceAlerting')>(),
  createOpenSourceAlertingAdapter: mocks.adapterFactory,
}));

import { appRouter } from './routers';
import { createAlert } from './db';
import { alerts } from '../drizzle/schema';
import { NOT_ADMIN_ERR_MSG } from '../shared/const';

const dialect = new PgDialect();
const incidentId = '11111111-1111-4111-8111-111111111111';
const deliveryId = '22222222-2222-4222-8222-222222222222';
const approvalRef = '33333333-3333-4333-8333-333333333333';
const evidenceRef = '44444444-4444-4444-8444-444444444444';
const owner = { id: 7, role: 'user', openId: 'SYNTHETIC-owner' } as TrpcContext['user'];
const admin = { id: 1, role: 'admin', openId: 'SYNTHETIC-admin' } as TrpcContext['user'];
const caller = (user: TrpcContext['user']) => appRouter.createCaller({ user, req: {} as any, res: {} as any });
type Caller = ReturnType<typeof caller>;
type Query = { sql: string; params: unknown[] };
let queries: Query[];
let commits: string[];
let currentEffects: string[];
let inserted: Alert;
let insertedInput: InsertAlert | undefined;
let databaseAdmin: boolean;
let persistedOwner: boolean;
let batteryOwner: boolean;
let destinationApproved: boolean;
let failDelivery: boolean;
let insertedInCurrentTransaction: boolean;
const live: LiveCriticalContext = { provenance: 'live', tenantUserId: 7, category: 'telemetry' };
const data: InsertAlert = { userId: 7, batteryId: 12, bpan: 'SYNTHETIC-BATTERY', type: 'thermal_threshold',
  severity: 'critical', title: 'PRIVATE_TITLE', message: 'PRIVATE_MESSAGE', metadata: null };

function enableMockRuntime() {
  mocks.adapterFactory.mockReturnValue({ enabled: true, configured: true, destinationFingerprint: 'a'.repeat(64), send: mocks.send });
  vi.stubEnv('INCIDENT_OUTBOX_ENABLED', 'true');
  vi.stubEnv('INCIDENT_ACTIVATION_AT', '2026-01-01T00:00:00.000Z');
  vi.stubEnv('INCIDENT_ACTIVATION_APPROVAL_REF', approvalRef);
}
function noDatabase() {
  expect(mocks.getDatabase).not.toHaveBeenCalled();
  expect(mocks.connect).not.toHaveBeenCalled();
  expect(mocks.db.transaction).not.toHaveBeenCalled();
  expect(mocks.db.insert).not.toHaveBeenCalled();
  expect(queries).toEqual([]);
  expect(mocks.send).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('INCIDENT_OUTBOX_ENABLED', 'false');
  vi.stubEnv('INCIDENT_ACTIVATION_AT', '');
  vi.stubEnv('INCIDENT_ACTIVATION_APPROVAL_REF', '');
  mocks.adapterFactory.mockReturnValue({ enabled: false, configured: false, destinationFingerprint: null, send: mocks.send });
  mocks.getDatabase.mockResolvedValue(mocks.db);
  queries = []; commits = []; currentEffects = [];
  databaseAdmin = true; persistedOwner = true; batteryOwner = true; destinationApproved = true;
  failDelivery = false; insertedInCurrentTransaction = true; insertedInput = undefined;
  inserted = { id: 731, ...data, userId: 7, batteryId: 12, bpan: 'SYNTHETIC-BATTERY', severity: 'critical',
    metadata: null, read: false, acknowledged: false, createdAt: new Date() } as Alert;
  const tx = {
    insert: vi.fn((table: unknown) => {
      expect(table).toBe(alerts);
      return { values: vi.fn((value: InsertAlert) => {
        insertedInput = value;
        return { returning: vi.fn(async () => { currentEffects.push('alert'); return [inserted]; }) };
      }) };
    }),
    execute: vi.fn(async (query: SQL) => {
      const q = dialect.sqlToQuery(query); queries.push(q);
      if (/^SET LOCAL/.test(q.sql)) return { rows: [] };
      if (/SELECT id FROM users/.test(q.sql)) return { rows: databaseAdmin ? [{ id: 1 }] : [] };
      if (/SELECT fingerprint FROM oss_incident_destinations/.test(q.sql)) return { rows: destinationApproved ? [{ fingerprint: 'a'.repeat(64) }] : [] };
      if (/SELECT a.id FROM alerts/.test(q.sql)) return { rows: persistedOwner && insertedInCurrentTransaction ? [{ id: inserted.id }] : [] };
      if (/SELECT id FROM batteries/.test(q.sql)) return { rows: batteryOwner ? [{ id: 12 }] : [] };
      if (/INSERT INTO oss_incidents\(/.test(q.sql)) { currentEffects.push('incident'); return { rows: [{ id: q.params[0] }] }; }
      if (/INSERT INTO oss_incident_deliveries/.test(q.sql)) {
        if (failDelivery) throw new Error('SYNTHETIC delivery persistence failure');
        currentEffects.push('delivery'); return { rows: [] };
      }
      if (/INSERT INTO oss_incident_destinations/.test(q.sql)) { currentEffects.push('destination'); return { rows: [] }; }
      if (/INSERT INTO oss_incident_commands/.test(q.sql)) { currentEffects.push('audit'); return { rows: [] }; }
      if (/SELECT state, COUNT/.test(q.sql)) return { rows: [{ state: 'pending', count: 1 }] };
      if (/SELECT d.id, d.incident_id/.test(q.sql)) return { rows: [{ id: deliveryId, incidentId, action: 'trigger', version: 1,
        kind: 'initial', state: 'pending', attempts: 0, leaseGeneration: 0, ambiguous: false,
        incidentState: 'open', resolvePending: false, quarantined: false }] };
      throw new Error('Unexpected SQL in isolated incident integration fixture');
    }),
  };
  mocks.db.insert = vi.fn(() => { throw new Error('Alert INSERT must occur only inside transaction'); });
  mocks.db.execute = vi.fn(() => { throw new Error('Incident SQL must occur only inside transaction'); });
  mocks.db.transaction = vi.fn(async (fn: (tx: typeof tx) => Promise<unknown>) => {
    currentEffects = [];
    try { const value = await fn(tx); commits.push(...currentEffects); return value; }
    catch (error) { currentEffects = []; throw error; }
  });
});
afterEach(() => vi.unstubAllEnvs());

const commands: [string, (c: Caller) => Promise<unknown>][] = [
  ['resolve', c => c.incidents.resolve({ incidentId, reason: 'verified_recovery', evidenceRef })],
  ['approveDestination', c => c.incidents.approveDestination({ evidenceRef })],
  ['retryDeadLetter', c => c.incidents.retryDeadLetter({ deliveryId, evidenceRef })],
  ['releaseQuarantine', c => c.incidents.releaseQuarantine({ incidentId, evidenceRef })],
];
const operations: [string, (c: Caller) => Promise<unknown>][] = [
  ['status', c => c.incidents.status()], ...commands,
];

describe('actual mounted incident administrative boundaries', () => {
  for (const user of [null, owner]) {
    it.each(operations)('denies ' + (user ? 'ordinary' : 'anonymous') + ' %s with exact admin error and zero DB', async (_name, invoke) => {
      await expect(invoke(caller(user))).rejects.toMatchObject({ code: 'FORBIDDEN', message: NOT_ADMIN_ERR_MSG });
      noDatabase();
      expect(mocks.adapterFactory).not.toHaveBeenCalled();
    });
  }
  it('default-off admin status is bounded metadata only without resolving getDb', async () => {
    expect(await caller(admin).incidents.status()).toMatchObject({ adapterEnabled: false, outboxEnabled: false,
      configured: false, activationGateReady: false, databaseReady: false, counts: [], items: [] });
    noDatabase();
  });
  it.each(commands)('default-off admin %s fails consistently without resolving getDb', async (_name, invoke) => {
    await expect(invoke(caller(admin))).rejects.toMatchObject({ code: 'CONFLICT',
      message: 'Incident command blocked; check authorization, evidence, pinned destination or retry when send lock is free' });
    noDatabase();
  });
  it.each(['adapter', 'outbox', 'futureActivation', 'approvalMissing'])('partial gate %s cannot open DB access', async missing => {
    enableMockRuntime();
    if (missing === 'adapter') mocks.adapterFactory.mockReturnValue({ enabled: false, configured: true, destinationFingerprint: 'a'.repeat(64), send: mocks.send });
    if (missing === 'outbox') vi.stubEnv('INCIDENT_OUTBOX_ENABLED', 'false');
    if (missing === 'futureActivation') vi.stubEnv('INCIDENT_ACTIVATION_AT', '2099-01-01T00:00:00.000Z');
    if (missing === 'approvalMissing') vi.stubEnv('INCIDENT_ACTIVATION_APPROVAL_REF', '');
    expect((await caller(admin).incidents.status()).databaseReady).toBe(false);
    await expect(caller(admin).incidents.approveDestination({ evidenceRef })).rejects.toMatchObject({ code: 'CONFLICT' });
    noDatabase();
  });
  it('mock-enabled admin status rechecks persisted admin role and selects only sanitized bounded fields', async () => {
    enableMockRuntime();
    const status = await caller(admin).incidents.status({ limit: 100 });
    expect(status).toMatchObject({ databaseReady: true, counts: [{ state: 'pending', count: 1 }] });
    const auth = queries.find(q => /SELECT id FROM users/.test(q.sql))!;
    expect(auth).toMatchObject({ params: [1] });
    expect(auth.sql).toContain("role = 'admin' FOR SHARE");
    const items = queries.find(q => /SELECT d.id,/.test(q.sql))!;
    expect(items.params).toEqual([100]);
    expect(items.sql).not.toMatch(/tenant_user_id|alert_id|destination_fingerprint|metadata|title|message/);
    expect(JSON.stringify(status)).not.toMatch(/PRIVATE|SYNTHETIC|fingerprint|tenantUserId|alertId|metadata/);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('a caller-context forged admin cannot read persisted incident status', async () => {
    enableMockRuntime(); databaseAdmin = false;
    expect(await caller({ ...owner!, role: 'admin' }).incidents.status()).toMatchObject({ databaseReady: false, counts: [], items: [] });
    expect(queries.find(q => /SELECT id FROM users/.test(q.sql))?.params).toEqual([7]);
    expect(queries.some(q => /SELECT state, COUNT|SELECT d.id,/.test(q.sql))).toBe(false);
  });
  it.each(commands)('a caller-context forged admin cannot execute %s past SQL authorization', async (_name, invoke) => {
    enableMockRuntime(); databaseAdmin = false;
    await expect(invoke(caller({ ...owner!, role: 'admin' }))).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(queries.find(q => /SELECT id FROM users/.test(q.sql))?.params).toEqual([7]);
    expect(commits).toEqual([]);
    expect(queries.every(q => /^SET LOCAL|SELECT id FROM users/.test(q.sql))).toBe(true);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('destination review writes only server-configured pin and accountable admin/evidence, never sends', async () => {
    enableMockRuntime();
    expect(await caller(admin).incidents.approveDestination({ evidenceRef })).toEqual({ reviewed: true, enabled: false });
    expect(commits).toEqual(['destination', 'audit']);
    expect(queries.find(q => /INSERT INTO oss_incident_destinations/.test(q.sql))?.params.slice(0, 3)).toEqual(['a'.repeat(64), 1, approvalRef]);
    const audit = queries.find(q => /INSERT INTO oss_incident_commands/.test(q.sql))!;
    expect(audit.params.slice(1)).toEqual([1, evidenceRef]);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each([
    ['destination', (c: Caller) => c.incidents.approveDestination({ evidenceRef, origin: 'https://attacker.invalid', role: 'admin' } as any)],
    ['actor', (c: Caller) => c.incidents.resolve({ incidentId, reason: 'verified_recovery', evidenceRef, actorUserId: 7 } as any)],
    ['read-as-recovery', (c: Caller) => c.incidents.resolve({ incidentId, reason: 'mark_read', evidenceRef } as any)],
    ['missing-evidence', (c: Caller) => c.incidents.retryDeadLetter({ deliveryId } as any)],
    ['limit', (c: Caller) => c.incidents.status({ limit: 101 })],
  ] as [string, (c: Caller) => Promise<unknown>][])('rejects forged/invalid %s input before DB', async (_name, invoke) => {
    enableMockRuntime();
    await expect(invoke(caller(admin))).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    noDatabase();
  });
  it('legacy HTTPS telemetry input cannot turn caller-claimed live BMS context into acquisition proof', async () => {
    enableMockRuntime();
    await expect(caller(owner).telemetry.ingest({ bpan: 'SYNTHETIC-BATTERY', batteryId: 12, tMax: 65,
      trustedLiveContext: live, source: 'BMS_REPORTED', provenance: 'live' } as any)).rejects.toMatchObject({
        code: 'PRECONDITION_FAILED', message: 'Operational telemetry requires a verified persisted device/key/profile mapping and atomic receipt; login-JWT ingestion is unavailable',
      });
    noDatabase();
  });
});

describe('actual createAlert same-transaction contract, no fire-and-forget', () => {
  it('returns exactly INSERT RETURNING row/id and preserves data, even default-off', async () => {
    expect(await createAlert(data)).toBe(inserted);
    expect(insertedInput).toBe(data);
    expect(mocks.db.transaction).toHaveBeenCalledOnce();
    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(commits).toEqual(['alert']); expect(queries).toEqual([]);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('legacy provider enable flags cannot revive removed enqueue or immediate drain', async () => {
    vi.stubEnv('PAGERDUTY_ENABLED', 'true');
    vi.stubEnv('PAGING_ENABLED', 'true');
    expect(await createAlert(data)).toBe(inserted);
    expect(commits).toEqual(['alert']); expect(queries).toEqual([]);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('runtime-enabled legacy caller without context remains nonpaging even with claimed BMS metadata', async () => {
    enableMockRuntime();
    inserted.metadata = { source: 'BMS_REPORTED', provenance: 'live', trustedLiveContext: live };
    expect(await createAlert({ ...data, metadata: inserted.metadata })).toBe(inserted);
    expect(commits).toEqual(['alert']); expect(queries).toEqual([]);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each(['test', 'demo', 'simulated'] as const)('synthetic context %s cannot enqueue even with enabled runtime', async provenance => {
    enableMockRuntime(); await createAlert(data, { ...live, provenance });
    expect(commits).toEqual(['alert']); expect(queries).toEqual([]);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('synthetic metadata vetoes an explicit live server assertion', async () => {
    enableMockRuntime(); inserted.metadata = { synthetic: true };
    await createAlert({ ...data, metadata: inserted.metadata }, live);
    expect(commits).toEqual(['alert']); expect(queries).toEqual([]);
  });
  it('verified server context hook persists incident and delivery within the same alert transaction only', async () => {
    enableMockRuntime();
    expect(await createAlert(data, live)).toBe(inserted);
    expect(commits).toEqual(['alert', 'incident', 'delivery']);
    expect(mocks.db.transaction).toHaveBeenCalledOnce();
    expect(mocks.db.execute).not.toHaveBeenCalled();
    const ownership = queries.find(q => /SELECT a.id FROM alerts/.test(q.sql))!;
    expect(ownership.params.slice(0, 2)).toEqual([inserted.id, 7]);
    expect(ownership.sql).toContain('JOIN users u ON u.id = a."userId"');
    expect(ownership.sql).toContain('a.xmin::text::bigint = txid_current() % 4294967296');
    expect(ownership.sql).toContain('b."ownerId" = a."userId"');
    expect(ownership.sql).toContain('FOR SHARE OF a, u');
    const battery = queries.find(q => /SELECT id FROM batteries/.test(q.sql))!;
    expect(battery.params).toEqual([7, 12, 12, 'SYNTHETIC-BATTERY', 'SYNTHETIC-BATTERY']);
    expect(battery.sql).toContain('FOR SHARE');
    const incident = queries.find(q => /INSERT INTO oss_incidents\(/.test(q.sql))!;
    expect(incident.params[0]).toMatch(/^[a-f0-9-]{36}$/);
    expect(incident.params.slice(1, 3)).toEqual([731, 7]);
    expect(queries.find(q => /INSERT INTO oss_incident_deliveries/.test(q.sql))?.params[1]).toBe(incident.params[0]);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each(['persistedOwner', 'batteryOwner', 'currentTransaction', 'destinationApproval'])('failed database %s proof prevents incident persistence', async proof => {
    enableMockRuntime();
    if (proof === 'persistedOwner') persistedOwner = false;
    if (proof === 'batteryOwner') batteryOwner = false;
    if (proof === 'currentTransaction') insertedInCurrentTransaction = false;
    if (proof === 'destinationApproval') destinationApproved = false;
    expect(await createAlert(data, live)).toBe(inserted);
    expect(commits).toEqual(['alert']);
    expect(queries.some(q => /INSERT INTO oss_incidents|INSERT INTO oss_incident_deliveries/.test(q.sql))).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('delivery persistence failure rejects and rolls back alert plus incident, never claims success', async () => {
    enableMockRuntime(); failDelivery = true;
    await expect(createAlert(data, live)).rejects.toThrow('SYNTHETIC delivery persistence failure');
    expect(commits).toEqual([]); expect(currentEffects).toEqual([]);
    expect(mocks.db.transaction).toHaveBeenCalledOnce();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('integration preserves old provider rows/schema and does not import/drain old provider enqueue code', () => {
    const source = readFileSync(new URL('./db.ts', import.meta.url), 'utf8');
    const boundary = source.slice(source.indexOf('export async function createAlert('), source.indexOf('export async function listAlerts('));
    expect(source).not.toMatch(/from ["']\.\/pagerDuty["']|from ["']\.\.\/drizzle\/pagerDutySchema["']/);
    expect(boundary).not.toMatch(/pagerDuty|processPager|void import|\.send\(/);
    expect(readFileSync(new URL('../drizzle/pagerDutySchema.ts', import.meta.url), 'utf8')).toContain('pagerDutyOutbox');
  });
  it('no current production caller passes trusted live context; pilot does not call createAlert', () => {
    const source = readFileSync(new URL('./routers.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('trustedLiveContext:');
    expect(source).not.toContain('tenantUserId:');
    expect(readFileSync(new URL('./localPilotRouter.ts', import.meta.url), 'utf8')).not.toContain('createAlert');
  });
});
