import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { consumePasswordReset } from './passwordRecovery';
import { passwordResetTokens, users } from '../drizzle/schema';

function fakeDb(claimed: unknown[], updated: unknown[] = [{ id: 7 }]) {
  const update = vi.fn((table: unknown) => ({
    set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(async () => table === passwordResetTokens ? claimed : updated) })) })),
  }));
  const transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn({ update }));
  return { db: { transaction } as unknown as NodePgDatabase, update, transaction };
}

describe('atomic password recovery database contract', () => {
  it('does not update a password without a matching unused unexpired token claim', async () => {
    const f = fakeDb([]);
    expect(await consumePasswordReset(f.db, 'synthetic-token', 'synthetic-hash')).toBe(false);
    expect(f.transaction).toHaveBeenCalledOnce();
    expect(f.update).toHaveBeenCalledTimes(1);
    expect(f.update).not.toHaveBeenCalledWith(users);
  });
  it('uses the same transaction for the successful token claim and password update', async () => {
    const f = fakeDb([{ userId: 7 }]);
    expect(await consumePasswordReset(f.db, 'synthetic-token', 'synthetic-hash')).toBe(true);
    expect(f.transaction).toHaveBeenCalledOnce();
    expect(f.update.mock.calls.map(call => call[0])).toEqual([passwordResetTokens, users]);
  });
  it('throws when the token owner is missing so the real transaction can roll back', async () => {
    const f = fakeDb([{ userId: 7 }], []);
    await expect(consumePasswordReset(f.db, 'synthetic-token', 'synthetic-hash')).rejects.toThrow('Password recovery update failed');
  });
});

const enabled = process.env.PASSWORD_RECOVERY_PG_TESTS === 'true';
const socket = process.env.PASSWORD_RECOVERY_QA_SOCKET ?? '';
// Dedicated new cluster only; never resolve DATABASE_URL or touch shared/public production tables.
const dedicatedSocket = /^\/home\/ubuntu\/email-repair-2026-11-18\/reset-pg-[A-Za-z0-9_-]+\/socket$/.test(socket) || /^\/tmp\/circulair-reset-qa-[A-Za-z0-9_-]+\/socket$/.test(socket);
if (enabled && !dedicatedSocket) {
  throw new Error('A dedicated local reset QA socket is required');
}

describe.skipIf(!enabled)('fresh local PostgreSQL atomic recovery acceptance', () => {
  let pool: Pool;
  let db: NodePgDatabase;
  beforeAll(async () => {
    pool = new Pool({ host: socket, port: 5432, user: 'reset_qa_operator', database: 'postgres', max: 10, connectionTimeoutMillis: 3000 });
    db = drizzle(pool);
    await pool.query('CREATE TABLE users (id integer PRIMARY KEY, "passwordHash" text NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now())');
    await pool.query('CREATE TABLE password_reset_tokens (id serial PRIMARY KEY, "userId" integer NOT NULL, token varchar(128) NOT NULL UNIQUE, "expiresAt" timestamptz NOT NULL, "usedAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now())');
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE password_reset_tokens, users RESTART IDENTITY');
    await pool.query('INSERT INTO users (id, "passwordHash") VALUES (7, $1), (8, $1)', ['synthetic-old-hash']);
  });
  afterAll(async () => { await pool?.end(); });
  async function seed(token = 'synthetic-valid-token', userId = 7, expired = false, used = false) {
    await pool.query('INSERT INTO password_reset_tokens ("userId", token, "expiresAt", "usedAt") VALUES ($1,$2,clock_timestamp() + $3::interval, CASE WHEN $4 THEN clock_timestamp() ELSE NULL END)', [userId, token, expired ? '-1 second' : '1 minute', used]);
  }
  async function state(token = 'synthetic-valid-token') {
    const row = await pool.query('SELECT "usedAt" FROM password_reset_tokens WHERE token=$1', [token]);
    const owner = await pool.query('SELECT id, "passwordHash" FROM users ORDER BY id');
    return { usedAt: row.rows[0]?.usedAt, hashes: owner.rows.map(row => row.passwordHash) };
  }
  it('consumes once and changes only the owner; replay does not change either password', async () => {
    await seed();
    expect(await consumePasswordReset(db, 'synthetic-valid-token', 'synthetic-new-hash')).toBe(true);
    expect(await consumePasswordReset(db, 'synthetic-valid-token', 'synthetic-replay-hash')).toBe(false);
    expect((await state()).hashes).toEqual(['synthetic-new-hash', 'synthetic-old-hash']);
    expect((await state()).usedAt).toBeInstanceOf(Date);
  });
  it('allows exactly one of eight simultaneous claims without a process-local mutex', async () => {
    await seed();
    const outcomes = await Promise.all(Array.from({ length: 8 }, (_, i) => consumePasswordReset(db, 'synthetic-valid-token', `synthetic-concurrent-hash-${i}`)));
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect((await state()).hashes).toEqual([`synthetic-concurrent-hash-${outcomes.indexOf(true)}`, 'synthetic-old-hash']);
  });
  it('rejects expired tokens without consuming them or changing a password', async () => {
    await seed('synthetic-valid-token', 7, true);
    expect(await consumePasswordReset(db, 'synthetic-valid-token', 'synthetic-new-hash')).toBe(false);
    expect(await state()).toEqual({ usedAt: null, hashes: ['synthetic-old-hash', 'synthetic-old-hash'] });
  });
  it('rejects already-used tokens and missing tokens without a password update', async () => {
    await seed('synthetic-valid-token', 7, false, true);
    expect(await consumePasswordReset(db, 'synthetic-valid-token', 'synthetic-new-hash')).toBe(false);
    expect(await consumePasswordReset(db, 'synthetic-missing-token', 'synthetic-new-hash')).toBe(false);
    expect((await state()).hashes).toEqual(['synthetic-old-hash', 'synthetic-old-hash']);
  });
  it('rolls back the claim if the owner row is missing', async () => {
    await seed('synthetic-valid-token', 99);
    await expect(consumePasswordReset(db, 'synthetic-valid-token', 'synthetic-new-hash')).rejects.toThrow();
    expect((await state()).usedAt).toBeNull();
  });
  it('rolls back a failed password write and permits a safe subsequent successful claim', async () => {
    await seed();
    await pool.query("CREATE OR REPLACE FUNCTION reject_reset_qa_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.\"passwordHash\" = 'synthetic-failing-hash' THEN RAISE EXCEPTION 'synthetic update rejection'; END IF; RETURN NEW; END $$");
    await pool.query('CREATE TRIGGER reset_qa_reject BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION reject_reset_qa_write()');
    try {
      await expect(consumePasswordReset(db, 'synthetic-valid-token', 'synthetic-failing-hash')).rejects.toThrow();
      expect(await state()).toEqual({ usedAt: null, hashes: ['synthetic-old-hash', 'synthetic-old-hash'] });
      expect(await consumePasswordReset(db, 'synthetic-valid-token', 'synthetic-new-hash')).toBe(true);
    } finally { await pool.query('DROP TRIGGER reset_qa_reject ON users'); }
  });
  it('rechecks database wall-clock expiry after waiting for a competing row update', async () => {
    await seed();
    await pool.query('UPDATE password_reset_tokens SET "expiresAt"=clock_timestamp() + interval \'250 milliseconds\'');
    const blocker = await pool.connect();
    await blocker.query('BEGIN');
    await blocker.query('UPDATE password_reset_tokens SET "createdAt"=clock_timestamp()');
    let settled = false;
    const result = consumePasswordReset(db, 'synthetic-valid-token', 'synthetic-new-hash').then(value => { settled = true; return value; });
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(settled).toBe(false);
      await new Promise(resolve => setTimeout(resolve, 300));
      await blocker.query('COMMIT');
      expect(await result).toBe(false);
      expect(await state()).toEqual({ usedAt: null, hashes: ['synthetic-old-hash', 'synthetic-old-hash'] });
    } finally { await blocker.query('ROLLBACK'); blocker.release(); }
  });
});
