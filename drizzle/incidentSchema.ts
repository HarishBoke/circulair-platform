import { sql } from 'drizzle-orm';
import { pgTable, uuid, integer, varchar, text, timestamp, boolean, index, unique, check } from 'drizzle-orm/pg-core';
import { users, alerts } from './schema';
const time = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
export const incidentDestinations = pgTable('oss_incident_destinations', {
  fingerprint: varchar('fingerprint', { length: 64 }).primaryKey(),
  approvedByUserId: integer('approved_by_user_id').notNull().references(() => users.id),
  approvalRef: uuid('approval_ref').notNull(),
  activationAt: time('activation_at').notNull(),
  approvedAt: time('approved_at').notNull().defaultNow(),
}, t => [check('oss_incident_destinations_fingerprint_check', sql`${t.fingerprint} ~ '^[a-f0-9]{64}$'`)]);
export const incidents = pgTable('oss_incidents', {
  id: uuid('id').primaryKey(),
  alertId: integer('alert_id').notNull().unique().references(() => alerts.id),
  tenantUserId: integer('tenant_user_id').notNull().references(() => users.id),
  destinationFingerprint: varchar('destination_fingerprint', { length: 64 }).notNull().references(() => incidentDestinations.fingerprint),
  category: text('category').$type<'availability' | 'telemetry' | 'security' | 'operational'>().notNull(),
  state: text('state').$type<'open' | 'resolved'>().notNull().default('open'),
  startedAt: time('started_at').notNull(), resolvedAt: time('resolved_at'),
  actionVersion: integer('action_version').notNull().default(1),
  nextRefreshAt: time('next_refresh_at').notNull().defaultNow(),
  resolvePending: boolean('resolve_pending').notNull().default(false), quarantined: boolean('quarantined').notNull().default(false),
  ambiguousUntil: time('ambiguous_until'), repairUntil: time('repair_until'),
  resolvedByUserId: integer('resolved_by_user_id').references(() => users.id),
  resolutionReason: text('resolution_reason').$type<'verified_recovery' | 'false_positive_verified' | 'operator_mitigation_verified'>(),
  recoveryEvidenceRef: uuid('recovery_evidence_ref'),
  createdAt: time('created_at').notNull().defaultNow(), updatedAt: time('updated_at').notNull().defaultNow(),
}, t => [
  index('oss_incident_refresh_idx').on(t.quarantined, t.nextRefreshAt),
  index('oss_incident_destination_idx').on(t.destinationFingerprint),
  check('oss_incidents_category_check', sql`${t.category} IN ('availability','telemetry','security','operational')`),
  check('oss_incidents_state_check', sql`${t.state} IN ('open','resolved')`),
  check('oss_incidents_action_version_check', sql`${t.actionVersion} > 0`),
  check('oss_incidents_resolution_reason_check', sql`${t.resolutionReason} IN ('verified_recovery','false_positive_verified','operator_mitigation_verified')`),
  check('oss_incidents_lifecycle_check', sql`(${t.state} = 'open' AND ${t.resolvedAt} IS NULL AND ${t.resolvedByUserId} IS NULL AND ${t.resolutionReason} IS NULL AND ${t.recoveryEvidenceRef} IS NULL AND NOT ${t.resolvePending}) OR (${t.state} = 'resolved' AND ${t.resolvedAt} IS NOT NULL AND ${t.resolvedAt} >= ${t.startedAt} AND ${t.resolvedByUserId} IS NOT NULL AND ${t.resolutionReason} IS NOT NULL AND ${t.recoveryEvidenceRef} IS NOT NULL)`),
  check('oss_incidents_repair_check', sql`${t.repairUntil} IS NULL OR ${t.ambiguousUntil} IS NOT NULL`),
]);
export const incidentDeliveries = pgTable('oss_incident_deliveries', {
  id: uuid('id').primaryKey(), incidentId: uuid('incident_id').notNull().references(() => incidents.id),
  action: text('action').$type<'trigger' | 'resolve'>().notNull(), version: integer('version').notNull(),
  kind: text('kind').$type<'initial' | 'refresh' | 'resolution' | 'repair'>().notNull(),
  state: text('state').$type<'pending' | 'sending' | 'accepted' | 'dead' | 'quarantined' | 'superseded'>().notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0), nextAttemptAt: time('next_attempt_at').notNull().defaultNow(),
  leaseUntil: time('lease_until'), leaseToken: uuid('lease_token'), leaseGeneration: integer('lease_generation').notNull().default(0),
  ambiguous: boolean('ambiguous').notNull().default(false), lastErrorCode: varchar('last_error_code', { length: 64 }),
  httpStatus: integer('http_status'), acceptedAt: time('accepted_at'),
  createdAt: time('created_at').notNull().defaultNow(), updatedAt: time('updated_at').notNull().defaultNow(),
}, t => [
  unique('oss_incident_deliveries_incident_id_version_key').on(t.incidentId, t.version),
  index('oss_incident_delivery_due_idx').on(t.state, t.nextAttemptAt, t.leaseUntil),
  check('oss_incident_deliveries_action_check', sql`${t.action} IN ('trigger','resolve')`),
  check('oss_incident_deliveries_version_check', sql`${t.version} > 0`),
  check('oss_incident_deliveries_kind_check', sql`${t.kind} IN ('initial','refresh','resolution','repair')`),
  check('oss_incident_deliveries_state_check', sql`${t.state} IN ('pending','sending','accepted','dead','quarantined','superseded')`),
  check('oss_incident_deliveries_attempts_check', sql`${t.attempts} >= 0`),
  check('oss_incident_deliveries_lease_generation_check', sql`${t.leaseGeneration} >= 0`),
  check('oss_incident_deliveries_http_status_check', sql`${t.httpStatus} IS NULL OR ${t.httpStatus} BETWEEN 100 AND 599`),
  check('oss_incident_deliveries_lease_check', sql`(${t.state} = 'sending' AND ${t.leaseToken} IS NOT NULL AND ${t.leaseUntil} IS NOT NULL) OR (${t.state} <> 'sending' AND ${t.leaseToken} IS NULL AND ${t.leaseUntil} IS NULL)`),
  check('oss_incident_deliveries_action_kind_check', sql`(${t.action} = 'trigger' AND ${t.kind} IN ('initial','refresh')) OR (${t.action} = 'resolve' AND ${t.kind} IN ('resolution','repair'))`),
]);
export const incidentCommands = pgTable('oss_incident_commands', {
  id: uuid('id').primaryKey(), incidentId: uuid('incident_id').references(() => incidents.id),
  actorUserId: integer('actor_user_id').notNull().references(() => users.id),
  command: text('command').$type<'resolve' | 'destination_approval' | 'dead_letter_retry' | 'quarantine_release'>().notNull(),
  evidenceRef: uuid('evidence_ref').notNull(), createdAt: time('created_at').notNull().defaultNow(),
}, t => [index('oss_incident_command_idx').on(t.incidentId, t.createdAt),
  check('oss_incident_commands_command_check', sql`${t.command} IN ('resolve','destination_approval','dead_letter_retry','quarantine_release')`)]);
export type Incident = typeof incidents.$inferSelect;
export type IncidentDelivery = typeof incidentDeliveries.$inferSelect;
