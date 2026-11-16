import { describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
vi.mock('./db', () => ({ getDb: vi.fn() }));
import { getDb } from './db';
import { deleteWebhook } from './compliance';

describe('Webhook ownership boundary', () => {
  it('constrains deletion by both webhook ID and authenticated user ID', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getDb).mockResolvedValue({ delete: vi.fn().mockReturnValue({ where }) } as any);
    await deleteWebhook(123, 456);
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.sql).toContain('"webhooks"."id"');
    expect(query.sql).toContain('"webhooks"."userId"');
    expect(query.params).toEqual([123, 456]);
  });
});
