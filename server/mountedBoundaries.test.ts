import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { getTableName, type SQL } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
const fixture = vi.hoisted(() => ({ db: {} as any, getDb: vi.fn(), requireDb: vi.fn(), queries: [] as any[] }));
vi.mock('./db', async original => ({ ...await original<Record<string, unknown>>(), getDb: fixture.getDb, requireOwnershipDb: fixture.requireDb }));
vi.mock('pg', () => ({ Pool: class { constructor() { throw new Error('Real Pool forbidden'); } } }));
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn(() => { throw new Error('Real AI forbidden'); }) }));
import { appRouter } from './routers';
const dialect = new PgDialect();
const bpan = 'XXABC1234567890123456';
const assetRef = 'f970e093-7e87-44c2-aac0-6c69dc60a09e';
const owner = { id: 7, role: 'user', openId: 'SYNTHETIC-owner' } as any;
const previousRegistrant = { id: 42, role: 'user', openId: 'SYNTHETIC-registrant' } as any;
const admin = { id: 1, role: 'admin', openId: 'SYNTHETIC-admin' } as any;
const caller = (user: any) => appRouter.createCaller({ user, req: {} as any, res: {} as any });
const nativeBattery = { id: 12, bpan, ownerId: 7, registeredById: 42, currentSoh: '0.00', status: 'operational' };
const pilotAsset = { id: 17, assetRef, ownerId: 7, namespace: 'LOCAL_PILOT', officialBpan: null, manufacturerSerial: 'SYNTHETIC-label' };
beforeEach(() => {
  vi.clearAllMocks(); fixture.queries = []; vi.stubEnv('LOCAL_PILOT_ENABLED', 'false');
  fixture.getDb.mockResolvedValue(fixture.db); fixture.requireDb.mockResolvedValue(fixture.db);
  fixture.db.update = vi.fn((table: any) => ({ set: vi.fn((values: any) => ({ where: vi.fn((predicate: SQL) => ({ returning: vi.fn(async () => {
    const query = dialect.sqlToQuery(predicate); fixture.queries.push({ ...query, table: getTableName(table), values });
    return query.params[0] === bpan && query.params[1] === 7 ? [{ id: 12 }] : [];
  }) })) })) }));
  fixture.db.select = vi.fn(() => {
    let table: any, predicate: SQL;
    const chain: any = { from: (t: any) => { table = t; return chain; }, where: (p: SQL) => { predicate = p; return chain; }, limit: async () => {
      const query = dialect.sqlToQuery(predicate); const name = getTableName(table); fixture.queries.push({ ...query, table: name });
      return name === 'local_pilot_assets' && query.params[0] === assetRef && query.params[1] === 7 ? [pilotAsset] : [];
    } };
    return chain;
  });
});
afterEach(() => vi.unstubAllEnvs());
describe('actual centrally mounted boundaries with real ownership SQL predicates', () => {
  it('retains owner-positive battery status update including explicit zero', async () => {
    expect(await caller(owner).bpan.updateStatus({ bpan, status: 'operational', soh: 0 })).toEqual({ success: true });
    expect(fixture.queries).toHaveLength(1);
    expect(fixture.queries[0]).toMatchObject({ table: 'batteries', params: [bpan, 7], values: { currentSoh: '0.00' } });
    expect(fixture.queries[0].sql).toContain('"batteries"."ownerId"');
    expect(fixture.queries[0].sql).not.toContain('registeredById');
  });
  it.each([previousRegistrant, { ...owner, id: 8 }])('denies transferred registrant/foreign actor $id without successful update', async user => {
    await expect(caller(user).bpan.updateStatus({ bpan, status: 'operational' })).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'Resource not found' });
    expect(fixture.queries[0].params).toEqual([bpan, user.id]);
    expect(fixture.queries[0].sql).not.toContain('registeredById');
  });
  it('rejects caller-forged owner before DB access', async () => {
    await expect(caller(owner).bpan.updateStatus({ bpan, status: 'operational', ownerId: 42 } as any)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(fixture.requireDb).not.toHaveBeenCalled();
  });
  it('anonymous battery mutation rejects before DB access', async () => {
    await expect(caller(null).bpan.updateStatus({ bpan, status: 'operational' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(fixture.requireDb).not.toHaveBeenCalled();
  });
  it('native pilot status is mounted, default disabled, and establishes no physical acceptance', async () => {
    expect(await caller(owner).pilot.status()).toEqual({ enabled: false, namespace: 'LOCAL_PILOT', officialVerification: 'unverified', physicalAcceptance: 'not_established' });
    expect(fixture.getDb).not.toHaveBeenCalled();
  });
  it('anonymous pilot status rejects before database', async () => {
    await expect(caller(null).pilot.status()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(fixture.getDb).not.toHaveBeenCalled();
  });
  it.each(['listAssets', 'getAsset', 'listDevices', 'latestReadings'] as const)('mounted disabled %s rejects before any database call', async name => {
    const route: any = caller(owner).pilot[name];
    await expect(route(name === 'listAssets' ? undefined : { assetRef })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', message: 'local_pilot_disabled_pending_acceptance' });
    expect(fixture.getDb).not.toHaveBeenCalled(); expect(fixture.db.select).not.toHaveBeenCalled();
  });
  it('controlled mock-only enabled pilot returns actual owner asset under real SQL predicate', async () => {
    vi.stubEnv('LOCAL_PILOT_ENABLED', 'true');
    expect(await caller(owner).pilot.getAsset({ assetRef })).toEqual(pilotAsset);
    expect(fixture.queries[0]).toMatchObject({ table: 'local_pilot_assets', params: [assetRef, 7] });
    expect(fixture.queries[0].sql).toContain('"local_pilot_assets"."owner_id"');
  });
  it.each([previousRegistrant, admin])('pilot stays owner-scoped for foreign/admin actor $id', async user => {
    vi.stubEnv('LOCAL_PILOT_ENABLED', 'true');
    await expect(caller(user).pilot.getAsset({ assetRef })).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'pilot_asset_not_found' });
    expect(fixture.queries[0].params).toEqual([assetRef, user.id]);
  });
  it('pilot owner cannot be forged by request input', async () => {
    vi.stubEnv('LOCAL_PILOT_ENABLED', 'true');
    await expect(caller(owner).pilot.getAsset({ assetRef, ownerId: 42 } as any)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(fixture.getDb).not.toHaveBeenCalled();
  });
  it('source REST mount precedes global parser and gateway; native page and additive schema discoverable', () => {
    const entry = readFileSync(new URL('./_core/index.ts', import.meta.url), 'utf8');
    const mount = entry.indexOf('app.use("/api/v1/pilot", createLocalPilotRestRouter())');
    expect(mount).toBeGreaterThan(0);
    expect(mount).toBeLessThan(entry.indexOf('app.use(express.json({ limit: "50mb" }))'));
    expect(mount).toBeLessThan(entry.indexOf('app.use("/api/v1", createApiGateway())'));
    expect(readFileSync(new URL('../client/src/App.tsx', import.meta.url), 'utf8')).toContain('path="/local-battery-pilot"');
    expect(readFileSync(new URL('../drizzle.config.ts', import.meta.url), 'utf8')).toContain('"./drizzle/pilotSchema.ts"');
    expect(nativeBattery.registeredById).not.toBe(nativeBattery.ownerId); // Explicit transfer fixture.
  });
});
