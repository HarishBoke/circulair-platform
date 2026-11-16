import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { getDb } from './db';
import { pagerDutyConfig, retryDelay, sendPagerDutyEvent, MAX_DELIVERY_ATTEMPTS, type PagerDutyEvent, type DeliveryResult } from './pagerDuty';

export type OutboxRow = { id: number; alertId: number; event: PagerDutyEvent; routingFingerprint: string; attempts: number; leaseToken: string };
export type OutboxStore = {
  claim(limit: number): Promise<OutboxRow[]>;
  finish(row: OutboxRow, result: DeliveryResult, now: Date): Promise<void>;
};

export const postgresOutbox: OutboxStore = {
  async claim(limit) {
    const db = await getDb(); if (!db) throw new Error('Database unavailable');
    const token = randomUUID();
    await db.execute(sql`UPDATE pagerduty_outbox SET status = 'failed', "lastErrorCode" = 'attempts_exhausted_after_lease',
      "leaseToken" = NULL, "leaseUntil" = NULL, "updatedAt" = NOW()
      WHERE status = 'sending' AND attempts >= ${MAX_DELIVERY_ATTEMPTS} AND "leaseUntil" < NOW()`);
    const result = await db.execute(sql`
      WITH due AS (
        SELECT id FROM pagerduty_outbox
        WHERE ((status = 'pending' AND "nextAttemptAt" <= NOW()) OR (status = 'sending' AND "leaseUntil" < NOW()))
          AND attempts < ${MAX_DELIVERY_ATTEMPTS}
        ORDER BY id FOR UPDATE SKIP LOCKED LIMIT ${limit}
      )
      UPDATE pagerduty_outbox o SET status = 'sending', attempts = o.attempts + 1,
        "leaseToken" = ${token}, "leaseUntil" = NOW() + INTERVAL '2 minutes', "updatedAt" = NOW()
      FROM due WHERE o.id = due.id RETURNING o.*
    `);
    return result.rows as unknown as OutboxRow[];
  },
  async finish(row, result, now) {
    const db = await getDb(); if (!db) throw new Error('Database unavailable');
    const status = result.accepted ? 'accepted' : result.retryable && row.attempts < MAX_DELIVERY_ATTEMPTS ? 'pending' : 'failed';
    const next = new Date(now.getTime() + retryDelay(row.attempts, result.retryAfterMs));
    await db.execute(sql`UPDATE pagerduty_outbox SET status = ${status}, "nextAttemptAt" = ${next},
      "acceptedAt" = ${result.accepted ? now : null}, "lastErrorCode" = ${result.accepted ? null : result.code},
      "leaseUntil" = NULL, "leaseToken" = NULL, "updatedAt" = ${now}
      WHERE id = ${row.id} AND "leaseToken" = ${row.leaseToken} AND status = 'sending'`);
  },
};

export async function processPagerDutyOutbox(limit = 10, store: OutboxStore = postgresOutbox, sender = sendPagerDutyEvent) {
  const config = pagerDutyConfig();
  if (!config.enabled) return { enabled: false, attempted: 0, accepted: 0 };
  const rows = await store.claim(Math.min(10, Math.max(1, Math.trunc(limit))));
  let accepted = 0;
  for (const row of rows) {
    const result = row.routingFingerprint !== config.routingFingerprint
      ? { accepted: false, retryable: false, code: 'routing_key_changed' }
      : await sender(row.event, config);
    await store.finish(row, result, new Date());
    if (result.accepted) accepted++;
    console.info(JSON.stringify({ event: 'pagerduty.delivery', deliveryId: row.id, alertId: row.alertId,
      attempt: row.attempts, outcome: result.code, httpStatus: result.httpStatus ?? null }));
  }
  return { enabled: true, attempted: rows.length, accepted };
}

export async function getPagerDutyStatus() {
  const config = pagerDutyConfig();
  const base = { enabled: config.enabled, configured: config.configured, region: config.region, environment: config.environment,
    automaticDelivery: config.enabled ? 'critical_only' : 'disabled', acceptedMeaning: 'Events API accepted, not proof of on-call notification' };
  if (!config.enabled) return { ...base, outboxReady: null, queue: [] };
  try {
    const db = await getDb(); if (!db) throw new Error('Database unavailable');
    const result = await db.execute(sql`SELECT status, COUNT(*)::int AS count FROM pagerduty_outbox GROUP BY status ORDER BY status`);
    return { ...base, outboxReady: true, queue: result.rows as { status: string; count: number }[] };
  } catch { return { ...base, outboxReady: false, queue: [] }; }
}
