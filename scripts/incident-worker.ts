import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { resolvePostgresConnectionUrl } from '../shared/databaseEnv.cjs';
import { createOpenSourceAlertingAdapter } from '../server/openSourceAlerting';
import { incidentGate, incidentGateReady, runIncidentCycle, type IncidentDatabase } from '../server/incidentOutbox';

/** Default --once; --daemon is a separately approved paid Render Background Worker, never a web request/import timer. */
export async function incidentWorkerMain(args = process.argv.slice(2), env: NodeJS.ProcessEnv = process.env) {
  if (args.some(a => !['--once', '--daemon'].includes(a)) || (args.includes('--once') && args.includes('--daemon')))
    throw new Error('Use --once (default) or explicitly approved --daemon');
  const daemon = args.includes('--daemon');
  if (daemon && (env.RENDER !== 'true' || env.INCIDENT_RENDER_WORKER_APPROVED !== 'true'))
    throw new Error('Daemon requires explicit paid Render worker approval');
  const adapter = createOpenSourceAlertingAdapter(env); const gate = incidentGate(env);
  const ready = incidentGateReady(adapter, gate);
  // Disabled daemon may stay alive for approved Render service creation, but NEVER resolves/connects to the DB.
  const pool = ready ? new Pool({ connectionString: resolvePostgresConnectionUrl(env), max: 2,
    connectionTimeoutMillis: 3000, idleTimeoutMillis: 10000,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined }) : null;
  pool?.on('error', () => console.error(JSON.stringify({ event: 'incident.worker', code: 'database_unavailable' })));
  const db = pool ? drizzle(pool) as unknown as IncidentDatabase : null;
  let stopped = false; let wake: (() => void) | undefined;
  const stop = () => { stopped = true; wake?.(); };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  try {
    do {
      if (stopped) break;
      try {
        const result = db ? await runIncidentCycle(db, adapter, gate, 5) : { enabled: false, attempted: 0 };
        console.info(JSON.stringify({ event: 'incident.worker', ...result }));
      } catch { console.error(JSON.stringify({ event: 'incident.worker', code: 'cycle_failed' })); if (!daemon) throw new Error('Incident worker cycle failed'); }
      if (!daemon || stopped) break;
      // Only explicit main daemon mode owns this finite sleep; 15s scan supports 30s-3min persisted refresh deadlines.
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => { wake = undefined; resolve(); }, 15000);
        wake = () => { clearTimeout(timer); wake = undefined; resolve(); };
      });
    } while (!stopped);
  } finally { process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop); await pool?.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  incidentWorkerMain().catch(() => {
    console.error(JSON.stringify({ event: 'incident.worker', code: 'startup_or_cycle_failed' })); process.exitCode = 1;
  });
}
