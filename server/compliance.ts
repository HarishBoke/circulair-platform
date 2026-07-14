/**
 * compliance.ts — ISO 27001 / SOC 2 Compliance Framework
 * 
 * Provides:
 * - Comprehensive audit logging (ISO 27001 A.12.4)
 * - Security event logging (SOC 2 CC7.2)
 * - Data classification labels (ISO 27001 A.8.2)
 * - Access control matrix (ISO 27001 A.9)
 * - Structured JSON logging with correlation IDs
 * - SIEM-ready security event format
 */
import { getDb } from "./db";
import { auditLogs, securityEvents, apiKeys, apiUsageLogs, webhooks } from "../drizzle/schema";
import { eq, and, desc, count, sql, gte, lte, like, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as crypto from "crypto";

// ─── TRACE ID GENERATION ────────────────────────────────────────────────────
export function generateTraceId(): string {
  return `cai-${nanoid(16)}`;
}

// ─── DATA CLASSIFICATION ────────────────────────────────────────────────────
// ISO 27001 A.8.2 — Information classification
export type DataClassification = "public" | "internal" | "confidential" | "restricted";

export const DATA_CLASSIFICATION_MAP: Record<string, DataClassification> = {
  // Public endpoints
  "warranty.lookup": "public",
  "bpan.validate": "public",
  "marketplace.list": "public",
  "marketplace.getStats": "public",
  // Internal
  "bpan.list": "internal",
  "bpan.get": "internal",
  "telemetry.latest": "internal",
  "analytics.kpis": "internal",
  "alerts.list": "internal",
  // Confidential
  "warranty.register": "confidential",
  "warranty.list": "confidential",
  "warranty.claim": "confidential",
  "marketplace.createListing": "confidential",
  "logistics.create": "confidential",
  "epr.createToken": "confidential",
  "telemetry.ingest": "confidential",
  // Restricted
  "admin.listUsers": "restricted",
  "admin.updateUserRole": "restricted",
  "admin.auditLog": "restricted",
  "agent.execute": "restricted",
  "agent.batchExecute": "restricted",
  "compliance.exportAuditLog": "restricted",
  "apiKey.create": "restricted",
  "apiKey.revoke": "restricted",
};

export function getDataClassification(action: string): DataClassification {
  return DATA_CLASSIFICATION_MAP[action] ?? "internal";
}

// ─── ACCESS CONTROL MATRIX ──────────────────────────────────────────────────
// ISO 27001 A.9 — Access control
export const ACCESS_CONTROL_MATRIX: Record<string, string[]> = {
  // Admin-only
  "admin.listUsers": ["admin"],
  "admin.updateUserRole": ["admin"],
  "admin.auditLog": ["admin"],
  "admin.roleStats": ["admin"],
  "compliance.exportAuditLog": ["admin"],
  "compliance.securityEvents": ["admin"],
  "apiKey.create": ["admin"],
  "apiKey.revoke": ["admin"],
  "agent.execute": ["admin"],
  "agent.batchExecute": ["admin"],
  // OEM + Admin
  "bpan.generate": ["admin", "oem", "manufacturer"],
  "warranty.register": ["admin", "oem", "manufacturer", "service_provider"],
  // Recycler + Admin
  "yield.verify": ["admin", "recycler"],
  "epr.createToken": ["admin", "recycler"],
  // All authenticated users
  "bpan.list": ["admin", "oem", "manufacturer", "recycler", "bess_developer", "service_provider", "government"],
  "bpan.get": ["admin", "oem", "manufacturer", "recycler", "bess_developer", "service_provider", "government"],
  "marketplace.list": ["admin", "oem", "manufacturer", "recycler", "bess_developer", "service_provider", "government"],
};

// ─── AUDIT LOGGING ──────────────────────────────────────────────────────────
export interface AuditLogEntry {
  traceId: string;
  userId?: number;
  userName?: string;
  userRole?: string;
  actorType?: "human" | "agent" | "system" | "api_key";
  apiKeyId?: number;
  action: string;
  resourceType?: string;
  resourceId?: string;
  module?: string;
  httpMethod?: string;
  httpPath?: string;
  ipAddress?: string;
  userAgent?: string;
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  status?: "success" | "failure" | "denied" | "error";
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
  sessionId?: string;
  complianceTags?: string[];
}

/** Write an audit log entry. Non-blocking — errors are swallowed to avoid disrupting business logic. */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const db = (await getDb())!;
    const classification = getDataClassification(entry.action);
    await db.insert(auditLogs).values({
      traceId: entry.traceId,
      userId: entry.userId ?? null,
      userName: entry.userName ?? null,
      userRole: entry.userRole ?? null,
      actorType: entry.actorType ?? "human",
      apiKeyId: entry.apiKeyId ?? null,
      action: entry.action,
      dataClassification: classification,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      module: entry.module ?? null,
      httpMethod: entry.httpMethod ?? null,
      httpPath: entry.httpPath ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      inputSummary: entry.inputSummary ?? null,
      outputSummary: entry.outputSummary ?? null,
      status: entry.status ?? "success",
      errorCode: entry.errorCode ?? null,
      errorMessage: entry.errorMessage ?? null,
      durationMs: entry.durationMs ?? null,
      sessionId: entry.sessionId ?? null,
      complianceTags: entry.complianceTags ?? null,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write:", err);
  }
}

/** Query audit logs with filtering and pagination */
export async function queryAuditLogs(params: {
  page?: number;
  limit?: number;
  userId?: number;
  action?: string;
  module?: string;
  status?: string;
  dataClassification?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}) {
  const db = (await getDb())!;
  const page = params.page ?? 0;
  const limit = Math.min(params.limit ?? 50, 200);
  const conditions: ReturnType<typeof eq>[] = [];

  if (params.userId) conditions.push(eq(auditLogs.userId, params.userId));
  if (params.action) conditions.push(like(auditLogs.action, `%${params.action}%`));
  if (params.module) conditions.push(eq(auditLogs.module, params.module));
  if (params.status) conditions.push(eq(auditLogs.status, params.status as any));
  if (params.dataClassification) conditions.push(eq(auditLogs.dataClassification, params.dataClassification as any));
  if (params.startDate) conditions.push(gte(auditLogs.createdAt, params.startDate));
  if (params.endDate) conditions.push(lte(auditLogs.createdAt, params.endDate));
  if (params.search) {
    conditions.push(
      or(
        like(auditLogs.action, `%${params.search}%`),
        like(auditLogs.userName, `%${params.search}%`),
        like(auditLogs.resourceId, `%${params.search}%`),
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(page * limit),
    db.select({ total: count() }).from(auditLogs).where(where),
  ]);

  return { items, total, page, limit };
}

/** Get audit log statistics */
export async function getAuditStats() {
  const db = (await getDb())!;
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalResult, last24hResult, last7dResult, byStatusResult, byClassResult] = await Promise.all([
    db.select({ total: count() }).from(auditLogs),
    db.select({ total: count() }).from(auditLogs).where(gte(auditLogs.createdAt, last24h)),
    db.select({ total: count() }).from(auditLogs).where(gte(auditLogs.createdAt, last7d)),
    db.select({ status: auditLogs.status, cnt: count() }).from(auditLogs).groupBy(auditLogs.status),
    db.select({ classification: auditLogs.dataClassification, cnt: count() }).from(auditLogs).groupBy(auditLogs.dataClassification),
  ]);

  return {
    total: totalResult[0]?.total ?? 0,
    last24h: last24hResult[0]?.total ?? 0,
    last7d: last7dResult[0]?.total ?? 0,
    byStatus: byStatusResult,
    byClassification: byClassResult,
  };
}

// ─── SECURITY EVENT LOGGING ─────────────────────────────────────────────────
export interface SecurityEventEntry {
  eventType: typeof securityEvents.$inferInsert["eventType"];
  severity?: typeof securityEvents.$inferInsert["severity"];
  userId?: number;
  userName?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
}

/** Write a security event. Non-blocking. */
export async function writeSecurityEvent(entry: SecurityEventEntry): Promise<void> {
  try {
    const db = (await getDb())!;
    await db.insert(securityEvents).values({
      eventType: entry.eventType,
      severity: entry.severity ?? "info",
      userId: entry.userId ?? null,
      userName: entry.userName ?? null,
      description: entry.description,
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      traceId: entry.traceId ?? generateTraceId(),
    });
  } catch (err) {
    console.error("[SecurityEvent] Failed to write:", err);
  }
}

/** Query security events */
export async function querySecurityEvents(params: {
  page?: number;
  limit?: number;
  eventType?: string;
  severity?: string;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = (await getDb())!;
  const page = params.page ?? 0;
  const limit = Math.min(params.limit ?? 50, 200);
  const conditions: ReturnType<typeof eq>[] = [];

  if (params.eventType) conditions.push(eq(securityEvents.eventType, params.eventType as any));
  if (params.severity) conditions.push(eq(securityEvents.severity, params.severity as any));
  if (params.userId) conditions.push(eq(securityEvents.userId, params.userId));
  if (params.startDate) conditions.push(gte(securityEvents.createdAt, params.startDate));
  if (params.endDate) conditions.push(lte(securityEvents.createdAt, params.endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(securityEvents).where(where).orderBy(desc(securityEvents.createdAt)).limit(limit).offset(page * limit),
    db.select({ total: count() }).from(securityEvents).where(where),
  ]);

  return { items, total, page, limit };
}

/** Get security event statistics */
export async function getSecurityStats() {
  const db = (await getDb())!;
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [totalResult, last24hResult, bySeverityResult, byTypeResult] = await Promise.all([
    db.select({ total: count() }).from(securityEvents),
    db.select({ total: count() }).from(securityEvents).where(gte(securityEvents.createdAt, last24h)),
    db.select({ severity: securityEvents.severity, cnt: count() }).from(securityEvents).groupBy(securityEvents.severity),
    db.select({ eventType: securityEvents.eventType, cnt: count() }).from(securityEvents).groupBy(securityEvents.eventType),
  ]);

  return {
    total: totalResult[0]?.total ?? 0,
    last24h: last24hResult[0]?.total ?? 0,
    bySeverity: bySeverityResult,
    byType: byTypeResult,
  };
}

// ─── API KEY MANAGEMENT ─────────────────────────────────────────────────────
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `cai_${nanoid(32)}`;
  const prefix = key.substring(0, 8);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

export async function createApiKey(params: {
  name: string;
  description?: string;
  userId: number;
  scopes: string[];
  rateLimitTier?: "free" | "standard" | "premium" | "enterprise";
  rateLimit?: number;
  expiresAt?: Date;
}) {
  const db = (await getDb())!;
  const { key, prefix, hash } = generateApiKey();

    const [insertResult] = await db.insert(apiKeys).values({
    name: params.name,
    description: params.description ?? null,
    keyHash: hash,
    keyPrefix: prefix,
    userId: params.userId,
    scopes: params.scopes,
    rateLimitTier: params.rateLimitTier ?? "standard",
    rateLimit: params.rateLimit ?? 100,
    expiresAt: params.expiresAt ?? null,
  }).$returningId();
  return { id: insertResult.id, key, prefix };
}

export async function validateApiKey(key: string) {
  const db = (await getDb())!;
  const hash = hashApiKey(key);
  const [found] = await db.select().from(apiKeys).where(
    and(eq(apiKeys.keyHash, hash), eq(apiKeys.status, "active"))
  ).limit(1);

  if (!found) return null;

  // Check expiry
  if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
    await db.update(apiKeys).set({ status: "expired" }).where(eq(apiKeys.id, found.id));
    return null;
  }

  // Update last used
  await db.update(apiKeys).set({
    lastUsedAt: new Date(),
    totalRequests: (found.totalRequests ?? 0) + 1,
  }).where(eq(apiKeys.id, found.id));

  return found;
}

export async function revokeApiKey(keyId: number, reason?: string) {
  const db = (await getDb())!;
  await db.update(apiKeys).set({
    status: "revoked",
    revokedAt: new Date(),
    revokedReason: reason ?? null,
  }).where(eq(apiKeys.id, keyId));
}

export async function listApiKeys(userId?: number) {
  const db = (await getDb())!;
  const where = userId ? eq(apiKeys.userId, userId) : undefined;
  return db.select().from(apiKeys).where(where).orderBy(desc(apiKeys.createdAt));
}

// ─── API USAGE TRACKING ─────────────────────────────────────────────────────
export async function logApiUsage(params: {
  apiKeyId: number;
  endpoint: string;
  method: string;
  statusCode?: number;
  durationMs?: number;
  requestSize?: number;
  responseSize?: number;
  ipAddress?: string;
  traceId?: string;
}) {
  try {
    const db = (await getDb())!;
    await db.insert(apiUsageLogs).values({
      apiKeyId: params.apiKeyId,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode ?? null,
      durationMs: params.durationMs ?? null,
      requestSize: params.requestSize ?? null,
      responseSize: params.responseSize ?? null,
      ipAddress: params.ipAddress ?? null,
      traceId: params.traceId ?? null,
    });
  } catch (err) {
    console.error("[ApiUsage] Failed to log:", err);
  }
}

export async function getApiUsageStats(apiKeyId?: number) {
  const db = (await getDb())!;
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const where = apiKeyId ? eq(apiUsageLogs.apiKeyId, apiKeyId) : undefined;

  const [totalResult, last24hResult, last7dResult] = await Promise.all([
    db.select({ total: count() }).from(apiUsageLogs).where(where),
    db.select({ total: count() }).from(apiUsageLogs).where(
      apiKeyId ? and(eq(apiUsageLogs.apiKeyId, apiKeyId), gte(apiUsageLogs.createdAt, last24h)) : gte(apiUsageLogs.createdAt, last24h)
    ),
    db.select({ total: count() }).from(apiUsageLogs).where(
      apiKeyId ? and(eq(apiUsageLogs.apiKeyId, apiKeyId), gte(apiUsageLogs.createdAt, last7d)) : gte(apiUsageLogs.createdAt, last7d)
    ),
  ]);

  return {
    total: totalResult[0]?.total ?? 0,
    last24h: last24hResult[0]?.total ?? 0,
    last7d: last7dResult[0]?.total ?? 0,
  };
}

// ─── WEBHOOK MANAGEMENT ─────────────────────────────────────────────────────
export async function createWebhook(params: {
  userId: number;
  name: string;
  url: string;
  events: string[];
  maxRetries?: number;
}) {
  const db = (await getDb())!;
  const secret = `whsec_${nanoid(32)}`;
  const [insertResult] = await db.insert(webhooks).values({
    userId: params.userId,
    name: params.name,
    url: params.url,
    secret,
    events: params.events,
    maxRetries: params.maxRetries ?? 3,
  }).$returningId();
  return { id: insertResult.id, secret };
}

export async function listWebhooks(userId?: number) {
  const db = (await getDb())!;
  const where = userId ? eq(webhooks.userId, userId) : undefined;
  return db.select().from(webhooks).where(where).orderBy(desc(webhooks.createdAt));
}

export async function deleteWebhook(webhookId: number) {
  const db = (await getDb())!;
  await db.delete(webhooks).where(eq(webhooks.id, webhookId));
}

/** Deliver a webhook event to all matching subscribers */
export async function deliverWebhookEvent(eventName: string, payload: Record<string, unknown>) {
  const db = (await getDb())!;
  const activeWebhooks = await db.select().from(webhooks).where(eq(webhooks.status, "active"));

  for (const wh of activeWebhooks) {
    const events = wh.events as string[];
    if (!events.includes(eventName) && !events.includes("*")) continue;

    const body = JSON.stringify({ event: eventName, data: payload, timestamp: new Date().toISOString() });
    const signature = crypto.createHmac("sha256", wh.secret).update(body).digest("hex");

    try {
      const response = await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": eventName,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      await db.update(webhooks).set({
        totalDeliveries: (wh.totalDeliveries ?? 0) + 1,
        lastDeliveryAt: new Date(),
      }).where(eq(webhooks.id, wh.id));

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (err: any) {
      await db.update(webhooks).set({
        totalFailures: (wh.totalFailures ?? 0) + 1,
        lastFailureAt: new Date(),
        lastFailureReason: err.message ?? "Unknown error",
      }).where(eq(webhooks.id, wh.id));
    }
  }
}
