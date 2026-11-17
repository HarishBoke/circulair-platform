import { randomUUID } from 'node:crypto';
import { sql, type SQL } from 'drizzle-orm';
import type { Alert } from '../drizzle/schema';
import type { OpenSourceAlertingAdapter, OpenSourceAlertEvent, OpenSourceDeliveryResult } from './openSourceAlerting';

/** Inject the application's node-postgres Drizzle connection. No database/network/env activity at import. */
export interface IncidentTx { execute(query: SQL): Promise<{ rows: Record<string, any>[] }> }
export interface IncidentDatabase extends IncidentTx { transaction<T>(fn: (tx: IncidentTx) => Promise<T>): Promise<T> }
export type IncidentActor = Readonly<{ id: number; role: string }>;
export type LiveCriticalContext = Readonly<{
  // Trusted ingestion/auth context ONLY; never reconstruct this from arbitrary alert metadata/request JSON.
  provenance: 'live' | 'simulated' | 'test' | 'demo';
  tenantUserId: number;
  category: OpenSourceAlertEvent['category'];
}>;
export const RESOLUTION_REASONS = ['verified_recovery', 'false_positive_verified', 'operator_mitigation_verified'] as const;
export type ResolutionReason = typeof RESOLUTION_REASONS[number];
export type IncidentGate = Readonly<{ enabled: boolean; activationAt: Date | null; approvalRef: string | null; refreshMs: number }>;
export type IncidentClaim = { id: string; incidentId: string; version: number; token: string; generation: number };
export const MAX_INCIDENT_ATTEMPTS = 8;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const FP = /^[a-f0-9]{64}$/;
const categories = ['availability', 'telemetry', 'security', 'operational'];
const positive = (id: number) => Number.isInteger(id) && id > 0 && id <= 2147483647;
const isoDate = (s?: string) => s && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s) && new Date(s).toISOString() === s ? new Date(s) : null;
export function incidentGate(env: NodeJS.ProcessEnv = process.env): IncidentGate {
  let activationAt: Date | null = null;
  try { activationAt = isoDate(env.INCIDENT_ACTIVATION_AT) || null; } catch { /* fail closed */ }
  const approvalRef = UUID.test(env.INCIDENT_ACTIVATION_APPROVAL_REF ?? '') ? env.INCIDENT_ACTIVATION_APPROVAL_REF! : null;
  const value = Number(env.INCIDENT_REFRESH_SECONDS ?? 60);
  return Object.freeze({ enabled: env.INCIDENT_OUTBOX_ENABLED === 'true', activationAt, approvalRef,
    refreshMs: Number.isInteger(value) && value >= 30 && value <= 180 ? value * 1000 : 60000 });
}
export function incidentRetryDelay(attempt: number, retryAfterMs = 0): number {
  return Math.min(3600000, Math.max(30000 * 2 ** Math.min(7, Math.max(0, attempt - 1)), Number.isFinite(retryAfterMs) ? retryAfterMs : 0));
}
function assertAdmin(actor: IncidentActor) {
  if (!actor || !positive(actor.id) || actor.role !== 'admin') throw new Error('Incident administrator required');
}
function assertUuid(value: string) { if (!UUID.test(value)) throw new Error('Invalid incident reference'); }
async function bounded(tx: IncidentTx) {
  await tx.execute(sql`SET LOCAL lock_timeout = '1s'`);
  await tx.execute(sql`SET LOCAL statement_timeout = '2s'`);
  // Crash protection for a worker dying during its <=6.5s send; never leave an unbounded open transaction.
  await tx.execute(sql`SET LOCAL idle_in_transaction_session_timeout = '10s'`);
}
async function databaseAdmin(tx: IncidentTx, actor: IncidentActor) {
  assertAdmin(actor);
  const r = await tx.execute(sql`SELECT id FROM users WHERE id = ${actor.id} AND role = 'admin' FOR SHARE`);
  if (!r.rows.length) throw new Error('Incident administrator required');
}
export function incidentGateReady(adapter: OpenSourceAlertingAdapter, gate: IncidentGate, now = new Date()) {
  return Boolean(adapter.enabled && adapter.configured && adapter.destinationFingerprint && FP.test(adapter.destinationFingerprint)
    && gate.enabled && gate.activationAt && gate.activationAt <= now && gate.approvalRef);
}
async function approved(tx: IncidentTx, adapter: OpenSourceAlertingAdapter, gate: IncidentGate) {
  if (!incidentGateReady(adapter, gate)) return false;
  const r = await tx.execute(sql`SELECT fingerprint FROM oss_incident_destinations
    WHERE fingerprint = ${adapter.destinationFingerprint} AND activation_at = ${gate.activationAt}
      AND approval_ref = ${gate.approvalRef}::uuid AND activation_at <= NOW()`);
  return r.rows.length === 1;
}
export function eligibleLiveCritical(alert: Alert, context?: LiveCriticalContext): boolean {
  if (!context || context.provenance !== 'live' || !positive(context.tenantUserId) || !categories.includes(context.category)
    || !positive(alert.id) || !positive(alert.userId ?? 0) || alert.userId !== context.tenantUserId || alert.severity !== 'critical') return false;
  const m = alert.metadata as Record<string, unknown> | null;
  // Explicit live assertion is required; negative synthetic indicators also veto it.
  return !/(simulat|demo|test)/i.test(alert.type) && !/(simulat|demo|test)/i.test(String(m?.source ?? ''))
    && !['demo', 'simulated', 'test', 'synthetic'].some(k => m?.[k] === true)
    && (!m?.provenance || m.provenance === 'live');
}
/** MUST run inside createAlert's transaction, immediately after INSERT RETURNING. Never scans/backfills alerts. */
export async function enqueueIncidentForAlert(tx: IncidentTx, inserted: Alert, context: LiveCriticalContext | undefined,
  adapter: OpenSourceAlertingAdapter, gate: IncidentGate): Promise<string | null> {
  if (!incidentGateReady(adapter, gate) || !eligibleLiveCritical(inserted, context)) return null;
  const createdAt = new Date(inserted.createdAt);
  if (!Number.isFinite(createdAt.getTime()) || !gate.activationAt || createdAt < gate.activationAt || !(await approved(tx, adapter, gate))) return null;
  // Re-read persisted ownership/provenance fields; fabricated Alert DTOs cannot insert against another tenant.
  const owner = await tx.execute(sql`SELECT a.id FROM alerts a JOIN users u ON u.id = a."userId"
    WHERE a.id = ${inserted.id} AND a."userId" = ${context!.tenantUserId} AND a.severity = 'critical'
      AND a."createdAt" = ${inserted.createdAt} AND a.type = ${inserted.type}
      AND a.xmin::text::bigint = txid_current() % 4294967296
      AND a.metadata::jsonb IS NOT DISTINCT FROM ${inserted.metadata === null ? null : JSON.stringify(inserted.metadata)}::jsonb
      AND (a."batteryId" IS NULL AND a.bpan IS NULL OR EXISTS (
        SELECT 1 FROM batteries b WHERE b."ownerId" = a."userId"
          AND (a."batteryId" IS NULL OR b.id = a."batteryId") AND (a.bpan IS NULL OR b.bpan = a.bpan)
      )) FOR SHARE OF a, u`);
  if (!owner.rows.length) return null;
  if (inserted.batteryId !== null || inserted.bpan !== null) {
    const battery = await tx.execute(sql`SELECT id FROM batteries WHERE "ownerId" = ${context!.tenantUserId}
      AND (${inserted.batteryId}::integer IS NULL OR id = ${inserted.batteryId})
      AND (${inserted.bpan}::text IS NULL OR bpan = ${inserted.bpan}) FOR SHARE`);
    if (battery.rows.length !== 1) return null;
  }
  const id = randomUUID();
  const r = await tx.execute(sql`INSERT INTO oss_incidents(id, alert_id, tenant_user_id, destination_fingerprint, category, started_at, next_refresh_at)
    VALUES (${id}::uuid, ${inserted.id}, ${context!.tenantUserId}, ${adapter.destinationFingerprint}, ${context!.category}, ${inserted.createdAt}, NOW())
    ON CONFLICT (alert_id) DO NOTHING RETURNING id`);
  if (!r.rows.length) return null;
  await tx.execute(sql`INSERT INTO oss_incident_deliveries(id, incident_id, action, version, kind)
    VALUES (${randomUUID()}::uuid, ${id}::uuid, 'trigger', 1, 'initial')`);
  return id;
}
async function appendAction(tx: IncidentTx, incidentId: string, action: 'trigger' | 'resolve', kind: 'refresh' | 'resolution' | 'repair', refreshMs: number) {
  const r = await tx.execute(sql`UPDATE oss_incidents SET action_version = action_version + 1,
    next_refresh_at = NOW() + ${refreshMs} * INTERVAL '1 millisecond', updated_at = NOW()
    WHERE id = ${incidentId}::uuid RETURNING action_version`);
  await tx.execute(sql`INSERT INTO oss_incident_deliveries(id, incident_id, action, version, kind)
    VALUES (${randomUUID()}::uuid, ${incidentId}::uuid, ${action}, ${r.rows[0].action_version}, ${kind})`);
}
export function createIncidentStore(db: IncidentDatabase) {
  return {
    async approveDestination(actor: IncidentActor, adapter: OpenSourceAlertingAdapter, gate: IncidentGate, evidenceRef: string) {
      assertAdmin(actor); assertUuid(evidenceRef);
      if (!adapter.configured || !adapter.destinationFingerprint || !FP.test(adapter.destinationFingerprint) || !gate.activationAt || !gate.approvalRef)
        throw new Error('Destination configuration review required');
      await db.transaction(async tx => {
        await bounded(tx); await databaseAdmin(tx, actor);
        await tx.execute(sql`INSERT INTO oss_incident_destinations(fingerprint, approved_by_user_id, approval_ref, activation_at)
          VALUES (${adapter.destinationFingerprint}, ${actor.id}, ${gate.approvalRef}::uuid, ${gate.activationAt})
          ON CONFLICT (fingerprint) DO NOTHING`);
        const confirmed = await tx.execute(sql`SELECT fingerprint FROM oss_incident_destinations WHERE fingerprint = ${adapter.destinationFingerprint}
          AND activation_at = ${gate.activationAt} AND approval_ref = ${gate.approvalRef}::uuid`);
        if (!confirmed.rows.length) throw new Error('Existing destination approval differs; reviewed activation change required');
        await tx.execute(sql`INSERT INTO oss_incident_commands(id, actor_user_id, command, evidence_ref)
          VALUES (${randomUUID()}::uuid, ${actor.id}, 'destination_approval', ${evidenceRef}::uuid)`);
      });
      return { reviewed: true, enabled: false };
    },
    async resolve(actor: IncidentActor, incidentId: string, reason: ResolutionReason, evidenceRef: string, refreshMs = 60000) {
      assertAdmin(actor); assertUuid(incidentId); assertUuid(evidenceRef);
      if (!(RESOLUTION_REASONS as readonly string[]).includes(reason)) throw new Error('Verified resolution reason required');
      return db.transaction(async tx => {
        await bounded(tx); await databaseAdmin(tx, actor);
        // Same row lock as dispatch. Concurrent resolution waits for acknowledgement/timeout, or returns bounded busy.
        const r = await tx.execute(sql`SELECT * FROM oss_incidents WHERE id = ${incidentId}::uuid FOR UPDATE`);
        const i = r.rows[0]; if (!i) throw new Error('Incident not found');
        if (i.state === 'resolved') return { state: 'resolved' as const, resolvePending: i.resolve_pending as boolean };
        // A claimed sender may have crashed before acquiring its send lock. Treat that uncertain send conservatively.
        const uncertain = await tx.execute(sql`SELECT id FROM oss_incident_deliveries WHERE incident_id = ${incidentId}::uuid
          AND (state = 'sending' OR ambiguous) LIMIT 1`);
        await tx.execute(sql`UPDATE oss_incidents SET state = 'resolved', resolved_at = GREATEST(NOW(), started_at),
          resolved_by_user_id = ${actor.id}, resolution_reason = ${reason}, recovery_evidence_ref = ${evidenceRef}::uuid,
          resolve_pending = true, ambiguous_until = CASE WHEN ${uncertain.rows.length > 0} THEN NOW() ELSE ambiguous_until END,
          repair_until = CASE WHEN ${uncertain.rows.length > 0} THEN NOW() ELSE repair_until END, updated_at = NOW()
          WHERE id = ${incidentId}::uuid`);
        await tx.execute(sql`UPDATE oss_incident_deliveries SET state = 'superseded', lease_token = NULL, lease_until = NULL, updated_at = NOW()
          WHERE incident_id = ${incidentId}::uuid AND action = 'trigger' AND state IN ('pending','sending','dead','quarantined')`);
        await appendAction(tx, incidentId, 'resolve', 'resolution', refreshMs);
        await tx.execute(sql`INSERT INTO oss_incident_commands(id, incident_id, actor_user_id, command, evidence_ref)
          VALUES (${randomUUID()}::uuid, ${incidentId}::uuid, ${actor.id}, 'resolve', ${evidenceRef}::uuid)`);
        return { state: 'resolved' as const, resolvePending: true };
      });
    },
    async reconcile(adapter: OpenSourceAlertingAdapter, gate: IncidentGate, limit: number) {
      if (!incidentGateReady(adapter, gate)) return 0;
      return db.transaction(async tx => {
        await bounded(tx); if (!(await approved(tx, adapter, gate))) return 0;
        const r = await tx.execute(sql`SELECT * FROM oss_incidents WHERE NOT quarantined
          AND (destination_fingerprint <> ${adapter.destinationFingerprint} OR
            (next_refresh_at <= NOW() AND (state = 'open' OR resolve_pending) AND NOT EXISTS (
              SELECT 1 FROM oss_incident_deliveries d WHERE d.incident_id = oss_incidents.id
                AND d.state IN ('pending','sending','dead','quarantined'))))
          ORDER BY next_refresh_at, id LIMIT ${Math.min(20, Math.max(1, Math.trunc(limit)))} FOR UPDATE SKIP LOCKED`);
        let added = 0;
        for (const i of r.rows) {
          if (i.destination_fingerprint !== adapter.destinationFingerprint) {
            await tx.execute(sql`UPDATE oss_incidents SET quarantined = true, updated_at = NOW() WHERE id = ${i.id}::uuid`);
            await tx.execute(sql`UPDATE oss_incident_deliveries SET state = 'quarantined', lease_token = NULL, lease_until = NULL,
              last_error_code = 'destination_changed', updated_at = NOW() WHERE incident_id = ${i.id}::uuid AND state IN ('pending','sending','dead')`);
            continue;
          }
          const unfinished = await tx.execute(sql`SELECT id FROM oss_incident_deliveries WHERE incident_id = ${i.id}::uuid
            AND state IN ('pending','sending','dead','quarantined') LIMIT 1`);
          if (unfinished.rows.length) continue;
          if (i.state === 'open' || i.resolve_pending) {
            await appendAction(tx, i.id, i.state === 'open' ? 'trigger' : 'resolve', i.state === 'open' ? 'refresh' : 'repair', gate.refreshMs); added++;
          }
        }
        return added;
      });
    },
    async claim(adapter: OpenSourceAlertingAdapter, gate: IncidentGate, limit: number): Promise<IncidentClaim[]> {
      if (!incidentGateReady(adapter, gate)) return [];
      return db.transaction(async tx => {
        await bounded(tx); if (!(await approved(tx, adapter, gate))) return [];
        // Incident FIRST on every operation. A dispatcher holding the incident lock is skipped even if lease expired.
        const r = await tx.execute(sql`SELECT i.id FROM oss_incidents i WHERE NOT i.quarantined
          AND i.destination_fingerprint = ${adapter.destinationFingerprint} AND EXISTS (
            SELECT 1 FROM oss_incident_deliveries d WHERE d.incident_id = i.id AND
              ((d.state = 'pending' AND d.next_attempt_at <= NOW()) OR (d.state = 'sending' AND d.lease_until <= NOW())))
          ORDER BY i.next_refresh_at, i.id LIMIT ${Math.min(10, Math.max(1, Math.trunc(limit)))} FOR UPDATE OF i SKIP LOCKED`);
        const claims: IncidentClaim[] = [];
        for (const i of r.rows) {
          const q = await tx.execute(sql`SELECT * FROM oss_incident_deliveries WHERE incident_id = ${i.id}::uuid AND
            ((state = 'pending' AND next_attempt_at <= NOW()) OR (state = 'sending' AND lease_until <= NOW()))
            ORDER BY version LIMIT 1 FOR UPDATE SKIP LOCKED`);
          const d = q.rows[0]; if (!d) continue;
          if (d.state === 'sending') {
            await tx.execute(sql`UPDATE oss_incidents SET ambiguous_until = NOW(), repair_until = NOW(), updated_at = NOW() WHERE id = ${i.id}::uuid`);
            await tx.execute(sql`UPDATE oss_incident_deliveries SET ambiguous = true WHERE id = ${d.id}::uuid`);
          }
          if (d.attempts >= MAX_INCIDENT_ATTEMPTS) {
            await tx.execute(sql`UPDATE oss_incident_deliveries SET state = 'dead', last_error_code = 'attempts_exhausted',
              lease_token = NULL, lease_until = NULL, updated_at = NOW() WHERE id = ${d.id}::uuid`); continue;
          }
          const token = randomUUID();
          const c = await tx.execute(sql`UPDATE oss_incident_deliveries SET state = 'sending', attempts = attempts + 1,
            lease_generation = lease_generation + 1, lease_token = ${token}::uuid, lease_until = NOW() + INTERVAL '120 seconds', updated_at = NOW()
            WHERE id = ${d.id}::uuid RETURNING lease_generation`);
          claims.push({ id: d.id, incidentId: i.id, version: d.version, token, generation: c.rows[0].lease_generation });
        }
        return claims;
      });
    },
    async dispatch(claim: IncidentClaim, adapter: OpenSourceAlertingAdapter, gate: IncidentGate): Promise<string> {
      if (!incidentGateReady(adapter, gate)) return 'disabled';
      return db.transaction(async tx => {
        await bounded(tx); if (!(await approved(tx, adapter, gate))) return 'not_approved';
        const ir = await tx.execute(sql`SELECT * FROM oss_incidents WHERE id = ${claim.incidentId}::uuid FOR UPDATE`);
        const i = ir.rows[0]; if (!i) return 'stale';
        const dr = await tx.execute(sql`SELECT * FROM oss_incident_deliveries WHERE id = ${claim.id}::uuid
          AND state = 'sending' AND lease_token = ${claim.token}::uuid AND lease_generation = ${claim.generation}
          AND lease_until > NOW() FOR UPDATE`);
        const d = dr.rows[0]; if (!d) return 'stale';
        if (i.quarantined || i.destination_fingerprint !== adapter.destinationFingerprint) {
          await tx.execute(sql`UPDATE oss_incidents SET quarantined = true WHERE id = ${i.id}::uuid`);
          await tx.execute(sql`UPDATE oss_incident_deliveries SET state = 'quarantined', lease_token = NULL, lease_until = NULL,
            last_error_code = 'destination_changed' WHERE id = ${d.id}::uuid`); return 'quarantined';
        }
        if (d.version !== i.action_version || (d.action === 'trigger' && i.state !== 'open') || (d.action === 'resolve' && i.state !== 'resolved')) {
          await tx.execute(sql`UPDATE oss_incident_deliveries SET state = 'superseded', lease_token = NULL, lease_until = NULL WHERE id = ${d.id}::uuid`);
          return 'stale';
        }
        const event: OpenSourceAlertEvent = { incidentId: i.id, action: d.action, category: i.category,
          startedAt: new Date(i.started_at).toISOString(), provenance: 'live',
          ...(d.action === 'resolve' ? { resolvedAt: new Date(i.resolved_at).toISOString() } : {}) };
        // Hold the incident lock through acknowledgement AND fenced completion; no version-only race window.
        let timer: ReturnType<typeof setTimeout> | undefined;
        let result: OpenSourceDeliveryResult;
        try {
          result = await Promise.race([adapter.send(event), new Promise<OpenSourceDeliveryResult>(resolve => {
            timer = setTimeout(() => resolve({ accepted: false, retryable: true, code: 'network_or_timeout' }), 6500);
          })]);
        } catch { result = { accepted: false, retryable: true, code: 'network_or_timeout' }; }
        finally { clearTimeout(timer); }
        const ambiguous = result.code === 'network_or_timeout';
        const state = result.accepted ? 'accepted' : result.retryable && d.attempts < MAX_INCIDENT_ATTEMPTS ? 'pending' : 'dead';
        const done = await tx.execute(sql`UPDATE oss_incident_deliveries SET state = ${state}, lease_token = NULL, lease_until = NULL,
          next_attempt_at = NOW() + ${incidentRetryDelay(d.attempts, result.retryAfterMs)} * INTERVAL '1 millisecond',
          accepted_at = CASE WHEN ${result.accepted} THEN NOW() ELSE NULL END,
          ambiguous = ambiguous OR ${ambiguous}, last_error_code = ${result.accepted ? null : result.code},
          http_status = ${result.httpStatus ?? null}, updated_at = NOW()
          WHERE id = ${d.id}::uuid AND lease_token = ${claim.token}::uuid AND lease_generation = ${claim.generation} AND state = 'sending' RETURNING id`);
        if (!done.rows.length) return 'stale';
        if (ambiguous) await tx.execute(sql`UPDATE oss_incidents SET ambiguous_until = NOW(), repair_until = NOW() WHERE id = ${i.id}::uuid`);
        if (result.accepted) await tx.execute(sql`UPDATE oss_incidents SET next_refresh_at = NOW() + ${gate.refreshMs} * INTERVAL '1 millisecond',
          resolve_pending = CASE WHEN state = 'resolved' THEN ambiguous_until IS NOT NULL ELSE false END,
          updated_at = NOW() WHERE id = ${i.id}::uuid`);
        return state;
      });
    },
    async retryDeadLetter(actor: IncidentActor, deliveryId: string, evidenceRef: string) {
      assertAdmin(actor); assertUuid(deliveryId); assertUuid(evidenceRef);
      return db.transaction(async tx => {
        await bounded(tx); await databaseAdmin(tx, actor);
        const identity = await tx.execute(sql`SELECT incident_id FROM oss_incident_deliveries WHERE id = ${deliveryId}::uuid`);
        if (!identity.rows[0]) throw new Error('Delivery not found');
        const ir = await tx.execute(sql`SELECT * FROM oss_incidents WHERE id = ${identity.rows[0].incident_id}::uuid FOR UPDATE`);
        if (ir.rows[0].quarantined) throw new Error('Pinned destination review required');
        const r = await tx.execute(sql`UPDATE oss_incident_deliveries SET state = 'pending', attempts = 0, next_attempt_at = NOW(),
          last_error_code = NULL, updated_at = NOW() WHERE id = ${deliveryId}::uuid AND state = 'dead' RETURNING id`);
        if (!r.rows.length) throw new Error('Dead letter required');
        await tx.execute(sql`INSERT INTO oss_incident_commands(id, incident_id, actor_user_id, command, evidence_ref)
          VALUES (${randomUUID()}::uuid, ${identity.rows[0].incident_id}::uuid, ${actor.id}, 'dead_letter_retry', ${evidenceRef}::uuid)`);
        return { retried: true };
      });
    },
    async releaseQuarantine(actor: IncidentActor, incidentId: string, evidenceRef: string, adapter: OpenSourceAlertingAdapter, gate: IncidentGate) {
      assertAdmin(actor); assertUuid(incidentId); assertUuid(evidenceRef);
      return db.transaction(async tx => {
        await bounded(tx); await databaseAdmin(tx, actor);
        if (!(await approved(tx, adapter, gate))) throw new Error('Destination approval required');
        const r = await tx.execute(sql`SELECT * FROM oss_incidents WHERE id = ${incidentId}::uuid FOR UPDATE`);
        if (!r.rows[0] || r.rows[0].destination_fingerprint !== adapter.destinationFingerprint) throw new Error('Restore pinned destination; rerouting forbidden');
        await tx.execute(sql`UPDATE oss_incidents SET quarantined = false, next_refresh_at = NOW() WHERE id = ${incidentId}::uuid`);
        await tx.execute(sql`UPDATE oss_incident_deliveries SET state = 'pending', next_attempt_at = NOW(), last_error_code = NULL
          WHERE incident_id = ${incidentId}::uuid AND state = 'quarantined'`);
        await tx.execute(sql`INSERT INTO oss_incident_commands(id, incident_id, actor_user_id, command, evidence_ref)
          VALUES (${randomUUID()}::uuid, ${incidentId}::uuid, ${actor.id}, 'quarantine_release', ${evidenceRef}::uuid)`);
        return { released: true };
      });
    },
    async status(actor: IncidentActor, limit = 50) {
      assertAdmin(actor);
      return db.transaction(async tx => {
        await bounded(tx); await databaseAdmin(tx, actor);
        const counts = await tx.execute(sql`SELECT state, COUNT(*)::int AS count FROM oss_incident_deliveries GROUP BY state ORDER BY state`);
        const items = await tx.execute(sql`SELECT d.id, d.incident_id AS "incidentId", d.action, d.version, d.kind, d.state, d.attempts,
          d.lease_generation AS "leaseGeneration", d.next_attempt_at AS "nextAttemptAt", d.last_error_code AS "lastErrorCode",
          d.http_status AS "httpStatus", d.ambiguous, i.state AS "incidentState", i.resolve_pending AS "resolvePending", i.quarantined
          FROM oss_incident_deliveries d JOIN oss_incidents i ON i.id = d.incident_id
          ORDER BY d.created_at DESC, d.id LIMIT ${Math.min(100, Math.max(1, Math.trunc(limit)))}`);
        return { counts: counts.rows, items: items.rows, acceptedMeaning: 'Alertmanager input accepted; not phone or human acknowledgement',
          ambiguityMeaning: 'Resolve repair repeats while ambiguity persists; timeout is not physical recovery' };
      });
    },
  };
}
export async function runIncidentCycle(db: IncidentDatabase, adapter: OpenSourceAlertingAdapter, gate: IncidentGate, limit = 5) {
  if (!incidentGateReady(adapter, gate)) return { enabled: false, reconciled: 0, attempted: 0, accepted: 0, errors: 0 };
  const store = createIncidentStore(db);
  const size = Number.isFinite(limit) ? Math.min(10, Math.max(1, Math.trunc(limit))) : 5;
  const reconciled = await store.reconcile(adapter, gate, size);
  const claims = await store.claim(adapter, gate, size);
  let accepted = 0; let errors = 0;
  for (const claim of claims) {
    try { if (await store.dispatch(claim, adapter, gate) === 'accepted') accepted++; }
    catch { errors++; /* Keep lease pending recovery; no raw SQL/secret/upstream errors logged. */ }
  }
  return { enabled: true, reconciled, attempted: claims.length, accepted, errors };
}
