import { pagerDutyConfig } from '../server/pagerDuty';

async function main() {
  if (!pagerDutyConfig().enabled) {
    console.info(JSON.stringify({ event: 'pagerduty.drain', enabled: false, attempted: 0 }));
    return;
  }
  const url = process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL || '';
  if (!/^postgres(?:ql)?:\/\//.test(url)) throw new Error('Explicit PostgreSQL environment configuration is required');
  const { processPagerDutyOutbox } = await import('../server/pagerDutyOutbox');
  const { resetDbConnection } = await import('../server/db');
  try { console.info(JSON.stringify({ event: 'pagerduty.drain', ...await processPagerDutyOutbox(10) })); }
  finally { resetDbConnection(); }
}
main().catch(() => {
  console.error(JSON.stringify({ event: 'pagerduty.drain_failed', code: 'configuration_database_or_delivery_error' }));
  process.exitCode = 1;
});
