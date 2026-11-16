import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';

async function main() {
  const url = new URL(process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL || 'https://invalid');
  if (process.env.QA_LOCAL !== '1' || url.hostname !== '127.0.0.1' || url.pathname !== '/circulair_qa') throw new Error('Isolated localhost QA database required');
  process.env.PAGERDUTY_ENABLED = 'true'; process.env.PAGERDUTY_ROUTING_KEY = 'c'.repeat(32);
  process.env.PAGERDUTY_ENVIRONMENT = 'isolated-qa'; process.env.APP_URL = 'https://circulair.energy';
  const { createAlert, getDb, resetDbConnection } = await import('../server/db');
  const { alerts } = await import('../drizzle/schema');
  const { pagerDutyOutbox } = await import('../drizzle/pagerDutySchema');
  const { pagerDutyConfig, makePagerDutyEvent } = await import('../server/pagerDuty');
  const { processPagerDutyOutbox } = await import('../server/pagerDutyOutbox');
  const db = await getDb(); assert(db);
  let networkCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { networkCalls++; return new Response('{}', { status: 202 }); };
  try {
    const inserted = await createAlert({ type: 'thermal_anomaly', severity: 'critical', title: 'isolated QA only', message: 'mocked network only', metadata: { tMax: 65 } });
    assert(inserted);
    let rows;
    for (let i = 0; i < 20; i++) {
      rows = (await db.execute(sql`SELECT * FROM pagerduty_outbox WHERE "alertId" = ${inserted.id}`)).rows;
      if (rows[0]?.status === 'accepted') break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(rows?.[0]?.status, 'accepted'); assert.equal(networkCalls, 1);
    assert(!JSON.stringify(rows).includes(process.env.PAGERDUTY_ROUTING_KEY));
    await processPagerDutyOutbox(); assert.equal(networkCalls, 1, 'Accepted rows must not resend');
    const warning = await createAlert({ type: 'health_warning', severity: 'warning', title: 'QA warning', message: 'not a page' });
    assert.equal((await db.execute(sql`SELECT id FROM pagerduty_outbox WHERE "alertId" = ${warning.id}`)).rows.length, 0);
    for (let i = 0; i < 2; i++) {
      const [alert] = await db.insert(alerts).values({ type: 'thermal_anomaly', severity: 'critical', title: 'QA concurrency', message: 'mocked network' }).returning();
      const config = pagerDutyConfig(); const event = makePagerDutyEvent(alert, config);
      await db.insert(pagerDutyOutbox).values({ alertId: alert.id, dedupKey: event.dedup_key, routingFingerprint: config.routingFingerprint, event });
      await db.insert(pagerDutyOutbox).values({ alertId: alert.id, dedupKey: event.dedup_key, routingFingerprint: config.routingFingerprint, event }).onConflictDoNothing();
    }
    const result = await Promise.all([processPagerDutyOutbox(10), processPagerDutyOutbox(10)]);
    assert.equal(result.reduce((n, r) => n + r.accepted, 0), 2); assert.equal(networkCalls, 3, 'Concurrent drainers must send each row once');
    console.info(JSON.stringify({ qa: 'pagerduty_real_postgresql', atomicAlertOutbox: true, acceptedNoResend: true, warningExcluded: true, concurrentLeaseDedup: true, network: 'mocked_no_external_requests' }));
  } finally { globalThis.fetch = originalFetch; resetDbConnection(); }
}
main().catch(() => { console.error('PagerDuty isolated PostgreSQL regression failed'); process.exitCode = 1; });
