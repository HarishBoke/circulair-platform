/**
 * db-agent.ts — Database helpers for Agent Actions tracking
 * Provides CRUD operations for the agent_actions table used by
 * the Super Admin panel and agentic middleware.
 */
import { getDb } from "./db";
import { agentActions, type InsertAgentAction } from "../drizzle/schema";
import { desc, eq, sql, and, gte, lte, like, count } from "drizzle-orm";

/* ─── INSERT ──────────────────────────────────────────────────────────────── */

export async function logAgentAction(data: InsertAgentAction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(agentActions).values(data);
  const [found] = await db.select({ id: agentActions.id }).from(agentActions)
    .where(eq(agentActions.action, data.action))
    .orderBy(desc(agentActions.createdAt)).limit(1);
  return { id: found?.id ?? 0 };
}

/* ─── QUERY ───────────────────────────────────────────────────────────────── */

export interface AgentActionFilter {
  actorType?: "human" | "agent" | "system";
  module?: string;
  status?: "success" | "failure" | "pending" | "cancelled";
  search?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export async function listAgentActions(filter: AgentActionFilter = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];

  if (filter.actorType) conditions.push(eq(agentActions.actorType, filter.actorType));
  if (filter.module) conditions.push(eq(agentActions.module, filter.module as any));
  if (filter.status) conditions.push(eq(agentActions.status, filter.status));
  if (filter.search) conditions.push(like(agentActions.action, `%${filter.search}%`));
  if (filter.from) conditions.push(gte(agentActions.createdAt, filter.from));
  if (filter.to) conditions.push(lte(agentActions.createdAt, filter.to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(agentActions)
    .where(where)
    .orderBy(desc(agentActions.createdAt))
    .limit(filter.limit ?? 50)
    .offset(filter.offset ?? 0);

  return rows;
}

export async function countAgentActions(filter: AgentActionFilter = {}) {
  const db = await getDb();
  if (!db) return 0;
  const conditions: any[] = [];
  if (filter.actorType) conditions.push(eq(agentActions.actorType, filter.actorType));
  if (filter.module) conditions.push(eq(agentActions.module, filter.module as any));
  if (filter.status) conditions.push(eq(agentActions.status, filter.status));
  if (filter.from) conditions.push(gte(agentActions.createdAt, filter.from));
  if (filter.to) conditions.push(lte(agentActions.createdAt, filter.to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [result] = await db
    .select({ count: count() })
    .from(agentActions)
    .where(where);

  return result?.count ?? 0;
}

/* ─── STATS ───────────────────────────────────────────────────────────────── */

export async function getAgentActionStats() {
  const db = await getDb();
  if (!db) return { total: 0, last24h: 0, failures: 0, failureRate: "0.0", byActorType: {}, byModule: {}, byStatus: {} };

  const [totalRow] = await db.select({ count: count() }).from(agentActions);
  const total = totalRow?.count ?? 0;

  const byActorType = await db
    .select({ actorType: agentActions.actorType, count: count() })
    .from(agentActions)
    .groupBy(agentActions.actorType);

  const byModule = await db
    .select({ module: agentActions.module, count: count() })
    .from(agentActions)
    .groupBy(agentActions.module);

  const byStatus = await db
    .select({ status: agentActions.status, count: count() })
    .from(agentActions)
    .groupBy(agentActions.status);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [last24hRow] = await db
    .select({ count: count() })
    .from(agentActions)
    .where(gte(agentActions.createdAt, oneDayAgo));
  const last24h = last24hRow?.count ?? 0;

  const [failureRow] = await db
    .select({ count: count() })
    .from(agentActions)
    .where(eq(agentActions.status, "failure"));
  const failures = failureRow?.count ?? 0;
  const failureRate = total > 0 ? ((failures / total) * 100).toFixed(1) : "0.0";

  return {
    total,
    last24h,
    failures,
    failureRate,
    byActorType: byActorType.reduce((acc: Record<string, number>, r) => ({ ...acc, [r.actorType]: r.count }), {} as Record<string, number>),
    byModule: byModule.reduce((acc: Record<string, number>, r) => ({ ...acc, [r.module]: r.count }), {} as Record<string, number>),
    byStatus: byStatus.reduce((acc: Record<string, number>, r) => ({ ...acc, [r.status]: r.count }), {} as Record<string, number>),
  };
}

/* ─── RECENT ACTIVITY FEED ────────────────────────────────────────────────── */

export async function getRecentActivity(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(agentActions)
    .orderBy(desc(agentActions.createdAt))
    .limit(limit);
}

/* ─── SYSTEM HEALTH METRICS ───────────────────────────────────────────────── */

export async function getSystemHealthMetrics() {
  const db = await getDb();
  if (!db) return { hourlyActions: [], avgDurationMs: 0 };

  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const hourlyActions = await db
    .select({
      hour: sql<string>`DATE_FORMAT(${agentActions.createdAt}, '%Y-%m-%d %H:00')`,
      count: count(),
    })
    .from(agentActions)
    .where(gte(agentActions.createdAt, twelveHoursAgo))
    .groupBy(sql`DATE_FORMAT(${agentActions.createdAt}, '%Y-%m-%d %H:00')`)
    .orderBy(sql`DATE_FORMAT(${agentActions.createdAt}, '%Y-%m-%d %H:00')`);

  const [avgDuration] = await db
    .select({ avg: sql<number>`AVG(${agentActions.durationMs})` })
    .from(agentActions)
    .where(sql`${agentActions.durationMs} IS NOT NULL`);

  return {
    hourlyActions,
    avgDurationMs: Math.round(avgDuration?.avg ?? 0),
  };
}
