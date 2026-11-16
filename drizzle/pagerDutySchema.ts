import { pgTable, serial, integer, varchar, text, json, timestamp, index } from 'drizzle-orm/pg-core';
import type { PagerDutyEvent } from '../server/pagerDuty';
import { alerts } from './schema';

export const pagerDutyOutbox = pgTable('pagerduty_outbox', {
  id: serial('id').primaryKey(),
  alertId: integer('alertId').notNull().unique().references(() => alerts.id),
  dedupKey: varchar('dedupKey', { length: 255 }).notNull().unique(),
  routingFingerprint: varchar('routingFingerprint', { length: 24 }).notNull(),
  event: json('event').$type<PagerDutyEvent>().notNull(),
  status: text('status').default('pending').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  nextAttemptAt: timestamp('nextAttemptAt', { withTimezone: true }).defaultNow().notNull(),
  leaseUntil: timestamp('leaseUntil', { withTimezone: true }),
  leaseToken: varchar('leaseToken', { length: 36 }),
  lastErrorCode: varchar('lastErrorCode', { length: 64 }),
  acceptedAt: timestamp('acceptedAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('pagerduty_outbox_due_idx').on(table.status, table.nextAttemptAt)]);
