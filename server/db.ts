import { eq, desc, and, like, or, sql, gte, lte, count, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser, users,
  batteries, InsertBattery,
  telemetry, InsertTelemetry,
  sohPredictions,
  marketplaceListings, InsertMarketplaceListing,
  logistics, InsertLogistics,
  eprTokens, InsertEprToken,
  yieldVerifications,
  alerts, InsertAlert,
  documents, InsertDocument,
  serviceHistory, InsertServiceHistory,
  chatSessions, chatMessages,
  roleAuditLog, InsertRoleAuditLog,
  consentLogs, InsertConsentLog,
  iotDevices, InsertIotDevice,
  listingPhotos, InsertListingPhoto,
  passwordResetTokens, InsertPasswordResetToken,
  marketplaceOffers, InsertMarketplaceOffer,
  alertRules, InsertAlertRule, AlertRule,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const rawUrl = process.env.DATABASE_URL;
      // Parse mysql:// URL into mysql2 connection options
      const url = new URL(rawUrl);
      const pool = mysql.createPool({
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.slice(1).split('?')[0],
        ssl: { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      _db = drizzle(pool) as any;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USER HELPERS ─────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  // Build the update set — only include fields that were explicitly provided
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    updateSet[field] = value ?? null;
  });
  if (user.lastSignedIn !== undefined) updateSet.lastSignedIn = user.lastSignedIn;
  if (user.role !== undefined) updateSet.role = user.role;

  // Build the insert values
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date(), ...updateSet };
  if (user.openId === ENV.ownerOpenId && !values.role) values.role = "admin";

  // Ensure at least lastSignedIn is in the update set
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  // MySQL INSERT ... ON DUPLICATE KEY UPDATE — atomic upsert, no duplicate key errors
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet as any });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: {
  openId: string;
  name: string | null;
  email: string;
  passwordHash: string;
  loginMethod: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: data.loginMethod,
    lastSignedIn: new Date(),
  });
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ─── BATTERY HELPERS ──────────────────────────────────────────────────────────
export async function createBattery(data: InsertBattery) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(batteries).values(data);
  const result = await db.select().from(batteries).where(eq(batteries.bpan, data.bpan)).limit(1);
  return result[0];
}

export async function getBatteryByBpan(bpan: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(batteries).where(eq(batteries.bpan, bpan)).limit(1);
  return result[0];
}

export async function getBatteryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(batteries).where(eq(batteries.id, id)).limit(1);
  return result[0];
}

export async function listBatteries(filters?: { status?: string; chemistry?: string; search?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;
  const conditions = [];
  if (filters?.status) conditions.push(eq(batteries.status, filters.status as any));
  if (filters?.chemistry) conditions.push(eq(batteries.chemistry, filters.chemistry as any));
  if (filters?.search) conditions.push(or(like(batteries.bpan, `%${filters.search}%`), like(batteries.vehicleId, `%${filters.search}%`)));
  const query = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, totalResult] = await Promise.all([
    db.select().from(batteries).where(query).orderBy(desc(batteries.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(batteries).where(query),
  ]);
  return { items, total: totalResult[0]?.count ?? 0 };
}

export async function updateBatteryStatus(bpan: string, status: string, soh?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status };
  if (soh !== undefined) updateData.currentSoh = soh;
  await db.update(batteries).set(updateData as any).where(eq(batteries.bpan, bpan));
}

export async function getBatteryStats() {
  const db = await getDb();
  if (!db) return { total: 0, operational: 0, secondLife: 0, endOfLife: 0, inTransit: 0 };
  const stats = await db.select({ status: batteries.status, count: count() }).from(batteries).groupBy(batteries.status);
  const result = { total: 0, operational: 0, secondLife: 0, endOfLife: 0, inTransit: 0 };
  stats.forEach((s) => {
    result.total += s.count;
    if (s.status === "operational") result.operational = s.count;
    else if (s.status === "second_life") result.secondLife = s.count;
    else if (s.status === "end_of_life") result.endOfLife = s.count;
    else if (s.status === "in_transit") result.inTransit = s.count;
  });
  return result;
}

// ─── TELEMETRY HELPERS ────────────────────────────────────────────────────────
export async function insertTelemetry(data: InsertTelemetry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(telemetry).values(data);
}

export async function getLatestTelemetry(bpan: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(telemetry).where(eq(telemetry.bpan, bpan)).orderBy(desc(telemetry.recordedAt)).limit(1);
  return result[0];
}

export async function getTelemetryHistory(bpan: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(telemetry).where(eq(telemetry.bpan, bpan)).orderBy(desc(telemetry.recordedAt)).limit(limit);
}

export async function getThermalAnomalies(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(telemetry).where(eq(telemetry.thermalAnomaly, true)).orderBy(desc(telemetry.recordedAt)).limit(limit);
}

// ─── SOH PREDICTION HELPERS ───────────────────────────────────────────────────
export async function saveSohPrediction(data: typeof sohPredictions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(sohPredictions).values(data);
  const result = await db.select().from(sohPredictions).where(eq(sohPredictions.bpan, data.bpan)).orderBy(desc(sohPredictions.predictedAt)).limit(1);
  return result[0];
}

export async function getLatestSohPrediction(bpan: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sohPredictions).where(eq(sohPredictions.bpan, bpan)).orderBy(desc(sohPredictions.predictedAt)).limit(1);
  return result[0];
}

export async function getSohPredictionHistory(bpan: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sohPredictions).where(eq(sohPredictions.bpan, bpan)).orderBy(desc(sohPredictions.predictedAt)).limit(limit);
}

// ─── MARKETPLACE HELPERS ──────────────────────────────────────────────────────
export async function createListing(data: InsertMarketplaceListing) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(marketplaceListings).values(data);
  const result = await db.select().from(marketplaceListings).where(eq(marketplaceListings.bpan, data.bpan)).orderBy(desc(marketplaceListings.createdAt)).limit(1);
  return result[0];
}

export async function listMarketplace(filters?: { listingType?: string; chemistry?: string; minSoh?: number; maxPrice?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;
  const conditions = [eq(marketplaceListings.status, "active")];
  if (filters?.listingType) conditions.push(eq(marketplaceListings.listingType, filters.listingType as any));
  if (filters?.chemistry) conditions.push(eq(marketplaceListings.chemistry, filters.chemistry));
  const query = and(...conditions);
  const [items, totalResult] = await Promise.all([
    db.select().from(marketplaceListings).where(query).orderBy(desc(marketplaceListings.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(marketplaceListings).where(query),
  ]);
  return { items, total: totalResult[0]?.count ?? 0 };
}

export async function getMarketplaceStats() {
  const db = await getDb();
  if (!db) return { activeListings: 0, totalTransactions: 0, totalValueInr: 0 };
  const [active, sold] = await Promise.all([
    db.select({ count: count() }).from(marketplaceListings).where(eq(marketplaceListings.status, "active")),
    db.select({ count: count(), totalValue: sum(marketplaceListings.finalPriceInr) }).from(marketplaceListings).where(eq(marketplaceListings.status, "sold")),
  ]);
  return {
    activeListings: active[0]?.count ?? 0,
    totalTransactions: sold[0]?.count ?? 0,
    totalValueInr: Number(sold[0]?.totalValue ?? 0),
  };
}

// ─── LOGISTICS HELPERS ────────────────────────────────────────────────────────
export async function createShipment(data: InsertLogistics) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(logistics).values(data);
  const result = await db.select().from(logistics).where(eq(logistics.shipmentId, data.shipmentId)).limit(1);
  return result[0];
}

export async function listShipments(filters?: { status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;
  const conditions = [];
  if (filters?.status) conditions.push(eq(logistics.status, filters.status as any));
  const query = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, totalResult] = await Promise.all([
    db.select().from(logistics).where(query).orderBy(desc(logistics.requestedAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(logistics).where(query),
  ]);
  return { items, total: totalResult[0]?.count ?? 0 };
}

export async function updateShipmentStatus(shipmentId: string, status: string, extra?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(logistics).set({ status: status as any, ...extra } as any).where(eq(logistics.shipmentId, shipmentId));
}

// ─── EPR HELPERS ──────────────────────────────────────────────────────────────
export async function createEprToken(data: InsertEprToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(eprTokens).values(data);
  const result = await db.select().from(eprTokens).where(eq(eprTokens.tokenId, data.tokenId)).limit(1);
  return result[0];
}

export async function listEprTokens(filters?: { recyclerId?: number; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.recyclerId) conditions.push(eq(eprTokens.recyclerId, filters.recyclerId));
  if (filters?.status) conditions.push(eq(eprTokens.status, filters.status as any));
  const query = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(eprTokens).where(query).orderBy(desc(eprTokens.createdAt)).limit(filters?.limit ?? 50);
}

export async function getEprStats() {
  const db = await getDb();
  if (!db) return { total: 0, verified: 0, pending: 0, totalYieldKg: 0 };
  const [stats, yieldSum] = await Promise.all([
    db.select({ status: eprTokens.status, count: count() }).from(eprTokens).groupBy(eprTokens.status),
    db.select({ total: sum(eprTokens.actualYieldKg) }).from(eprTokens).where(eq(eprTokens.status, "verified")),
  ]);
  const result = { total: 0, verified: 0, pending: 0, totalYieldKg: Number(yieldSum[0]?.total ?? 0) };
  stats.forEach((s) => { result.total += s.count; if (s.status === "verified") result.verified = s.count; else if (s.status === "pending") result.pending = s.count; });
  return result;
}

// ─── ALERTS HELPERS ───────────────────────────────────────────────────────────
export async function createAlert(data: InsertAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(alerts).values(data);
}

export async function listAlerts(userId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const conditions = userId ? [eq(alerts.userId, userId)] : [];
  return db.select().from(alerts).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(alerts.createdAt)).limit(limit);
}

export async function markAlertRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(alerts).set({ read: true }).where(eq(alerts.id, id));
}

export async function getUnreadAlertCount(userId?: number) {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [eq(alerts.read, false)];
  if (userId) conditions.push(eq(alerts.userId, userId));
  const result = await db.select({ count: count() }).from(alerts).where(and(...conditions));
  return result[0]?.count ?? 0;
}

// ─── DOCUMENT HELPERS ─────────────────────────────────────────────────────────
export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(documents).values(data);
  const result = await db.select().from(documents).where(eq(documents.fileKey, data.fileKey ?? "")).limit(1);
  return result[0];
}

export async function listDocuments(filters?: { type?: string; bpan?: string; uploadedById?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.type) conditions.push(eq(documents.type, filters.type as any));
  if (filters?.bpan) conditions.push(eq(documents.bpan, filters.bpan));
  if (filters?.uploadedById) conditions.push(eq(documents.uploadedById, filters.uploadedById));
  return db.select().from(documents).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(documents.createdAt)).limit(filters?.limit ?? 50);
}

// ─── SERVICE HISTORY HELPERS ──────────────────────────────────────────────────
export async function createServiceRecord(data: InsertServiceHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(serviceHistory).values(data);
}

export async function getServiceHistory(bpan: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceHistory).where(eq(serviceHistory.bpan, bpan)).orderBy(desc(serviceHistory.servicedAt));
}

// ─── CHAT HELPERS ─────────────────────────────────────────────────────────────
export async function createChatSession(userId: number, title?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chatSessions).values({ userId, title: title ?? "New Session" });
  const result = await db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.createdAt)).limit(1);
  return result[0];
}

export async function getChatSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.updatedAt)).limit(20);
}

export async function addChatMessage(sessionId: number, role: "user" | "assistant" | "system", content: string, metadata?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chatMessages).values({ sessionId, role, content, metadata: metadata ?? null });
}

export async function getChatMessages(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(chatMessages.createdAt);
}

// ─── PLATFORM ANALYTICS ───────────────────────────────────────────────────────
export async function getPlatformKpis() {
  const db = await getDb();
  if (!db) return null;
  const [batteryStats, marketStats, eprStats, alertCount] = await Promise.all([
    getBatteryStats(),
    getMarketplaceStats(),
    getEprStats(),
    getUnreadAlertCount(),
  ]);
  return { batteryStats, marketStats, eprStats, alertCount };
}

// ─── USER MANAGEMENT HELPERS (ADMIN) ─────────────────────────────────────────
export async function listUsersAdmin(filters?: {
  search?: string;
  platformRole?: string;
  role?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;
  const conditions: ReturnType<typeof eq>[] = [];
  if (filters?.platformRole) conditions.push(eq(users.platformRole, filters.platformRole as any));
  if (filters?.role) conditions.push(eq(users.role, filters.role as any));
  if (filters?.search) {
    conditions.push(
      or(
        like(users.name, `%${filters.search}%`),
        like(users.email, `%${filters.search}%`),
        like(users.organization, `%${filters.search}%`),
      ) as any
    );
  }
  const query = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, totalResult] = await Promise.all([
    db.select().from(users).where(query).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(users).where(query),
  ]);
  return { items, total: totalResult[0]?.count ?? 0 };
}

export async function getUserRoleStats() {
  const db = await getDb();
  if (!db) return { total: 0, byPlatformRole: {} as Record<string, number>, byRole: {} as Record<string, number> };
  const [byPlatformRole, byRole] = await Promise.all([
    db.select({ platformRole: users.platformRole, count: count() }).from(users).groupBy(users.platformRole),
    db.select({ role: users.role, count: count() }).from(users).groupBy(users.role),
  ]);
  const platformRoleMap: Record<string, number> = {};
  byPlatformRole.forEach((r) => { platformRoleMap[r.platformRole] = r.count; });
  const roleMap: Record<string, number> = {};
  byRole.forEach((r) => { roleMap[r.role] = r.count; });
  return {
    total: byRole.reduce((sum, r) => sum + r.count, 0),
    byPlatformRole: platformRoleMap,
    byRole: roleMap,
  };
}

export async function updateUserRoleById(
  userId: number,
  platformRole: string,
  systemRole: "user" | "admin",
  organization?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {
    platformRole,
    role: systemRole,
  };
  if (organization !== undefined) updateData.organization = organization;
  await db.update(users).set(updateData as any).where(eq(users.id, userId));
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function createRoleAuditEntry(data: InsertRoleAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(roleAuditLog).values(data);
}

export async function getRoleAuditLog(filters?: { targetUserId?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = filters?.limit ?? 50;
  const conditions = [];
  if (filters?.targetUserId) conditions.push(eq(roleAuditLog.targetUserId, filters.targetUserId));
  const query = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(roleAuditLog).where(query).orderBy(desc(roleAuditLog.createdAt)).limit(limit);
}

// ─── CHART DATA HELPERS ──────────────────────────────────────────────────────

/** Monthly battery registrations, sales, and recycled counts for the last 6 months */
export async function getMonthlyBatteryActivity() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString("en", { month: "short" }) });
  }
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const [regRows, soldRows, recycledRows] = await Promise.all([
    db.select({ year: sql<number>`YEAR(createdAt)`, month: sql<number>`MONTH(createdAt)`, n: count() })
      .from(batteries).where(gte(batteries.createdAt, since)).groupBy(sql`YEAR(createdAt)`, sql`MONTH(createdAt)`),
    db.select({ year: sql<number>`YEAR(createdAt)`, month: sql<number>`MONTH(createdAt)`, n: count() })
      .from(marketplaceListings)
      .where(and(gte(marketplaceListings.createdAt, since), eq(marketplaceListings.status, "sold")))
      .groupBy(sql`YEAR(createdAt)`, sql`MONTH(createdAt)`),
    db.select({ year: sql<number>`YEAR(createdAt)`, month: sql<number>`MONTH(createdAt)`, n: count() })
      .from(batteries)
      .where(and(gte(batteries.createdAt, since), eq(batteries.status, "end_of_life")))
      .groupBy(sql`YEAR(createdAt)`, sql`MONTH(createdAt)`),
  ]);
  return months.map((m) => ({
    month: m.label,
    registered: regRows.find((r) => r.year === m.year && r.month === m.month)?.n ?? 0,
    sold: soldRows.find((r) => r.year === m.year && r.month === m.month)?.n ?? 0,
    recycled: recycledRows.find((r) => r.year === m.year && r.month === m.month)?.n ?? 0,
  }));
}

/** SOH distribution bucketed into 10% ranges */
export async function getSohDistribution() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ soh: batteries.currentSoh }).from(batteries).where(sql`currentSoh IS NOT NULL`);
  const buckets: Record<string, number> = { "90-100%": 0, "80-90%": 0, "70-80%": 0, "60-70%": 0, "50-60%": 0, "<50%": 0 };
  rows.forEach(({ soh }) => {
    const v = parseFloat(soh as unknown as string);
    if (v >= 90) buckets["90-100%"]++;
    else if (v >= 80) buckets["80-90%"]++;
    else if (v >= 70) buckets["70-80%"]++;
    else if (v >= 60) buckets["60-70%"]++;
    else if (v >= 50) buckets["50-60%"]++;
    else buckets["<50%"]++;
  });
  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

/** Fleet average SOH per month for the last 6 months */
export async function getSohTrend() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString("en", { month: "short" }) });
  }
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const rows = await db
    .select({ year: sql<number>`YEAR(createdAt)`, month: sql<number>`MONTH(createdAt)`, avg: sql<number>`AVG(CAST(currentSoh AS DECIMAL(5,2)))` })
    .from(batteries)
    .where(and(gte(batteries.createdAt, since), sql`currentSoh IS NOT NULL`))
    .groupBy(sql`YEAR(createdAt)`, sql`MONTH(createdAt)`);
  return months.map((m) => {
    const row = rows.find((r) => r.year === m.year && r.month === m.month);
    return { month: m.label, avg: row?.avg ? Math.round(Number(row.avg)) : null };
  });
}

/** Chemistry breakdown as percentage of total fleet */
export async function getChemistryDistribution() {
  const db = await getDb();
  if (!db) return [];
  const COLORS: Record<string, string> = { NMC: "#00c8a0", LFP: "#4fc3f7", NCA: "#ffb347", LCO: "#ff4d6d", LMO: "#a78bfa", LEAD_ACID: "#94a3b8" };
  const rows = await db.select({ chemistry: batteries.chemistry, n: count() }).from(batteries).groupBy(batteries.chemistry);
  const total = rows.reduce((s, r) => s + r.n, 0);
  return rows.filter((r) => r.n > 0).map((r) => ({
    name: r.chemistry,
    value: total > 0 ? Math.round((r.n / total) * 100) : 0,
    color: COLORS[r.chemistry] ?? "#94a3b8",
  }));
}

/** AI triage distribution from soh_predictions */
export async function getTriageDistribution() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ triagePath: sohPredictions.triagePath, n: count() })
    .from(sohPredictions).where(sql`triagePath IS NOT NULL`).groupBy(sohPredictions.triagePath);
  const total = rows.reduce((s, r) => s + r.n, 0);
  const COLORS: Record<string, string> = { direct_reuse: "#00c8a0", module_repurposing: "#ffb347", material_recycling: "#ff4d6d" };
  const LABELS: Record<string, string> = { direct_reuse: "Direct Reuse", module_repurposing: "Module Repurposing", material_recycling: "Material Recycling" };
  return rows.filter((r) => r.triagePath).map((r) => ({
    name: LABELS[r.triagePath!] ?? r.triagePath,
    value: total > 0 ? Math.round((r.n / total) * 100) : 0,
    color: COLORS[r.triagePath!] ?? "#94a3b8",
  }));
}

/** Weekly marketplace listing count for the last 4 weeks */
export async function getMarketplaceWeeklyActivity() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const results = await Promise.all(
    ["W1", "W2", "W3", "W4"].map(async (label, i) => {
      const start = new Date(now.getTime() - (4 - i) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - (3 - i) * 7 * 24 * 60 * 60 * 1000);
      const [row] = await db.select({ txns: count() }).from(marketplaceListings)
        .where(and(gte(marketplaceListings.createdAt, start), lte(marketplaceListings.createdAt, end)));
      return { week: label, txns: row?.txns ?? 0 };
    }),
  );
  return results;
}

// ─── CONSENT LOG HELPERS (GDPR Article 7 accountability) ─────────────────────
export async function insertConsentLog(data: InsertConsentLog): Promise<void> {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot insert consent log: database not available"); return; }
  await db.insert(consentLogs).values(data);
}

export async function listConsentLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consentLogs).orderBy(desc(consentLogs.createdAt)).limit(limit);
}

// ─── IOT DEVICES ─────────────────────────────────────────────────────────────
export async function insertIotDevice(data: InsertIotDevice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(iotDevices).values(data);
  const [result] = await db.select().from(iotDevices).where(eq(iotDevices.deviceId, data.deviceId)).limit(1);
  return result;
}

export async function listIotDevices(opts?: { limit?: number; offset?: number; status?: string; bpan?: string }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions: any[] = [];
  if (opts?.status) conditions.push(eq(iotDevices.status, opts.status as any));
  if (opts?.bpan) conditions.push(eq(iotDevices.bpan, opts.bpan));
  const where = conditions.length ? and(...conditions) : undefined;
  const [items, countResult] = await Promise.all([
    db.select().from(iotDevices).where(where).orderBy(desc(iotDevices.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(iotDevices).where(where),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getIotDeviceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(iotDevices).where(eq(iotDevices.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getIotDeviceByDeviceId(deviceId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(iotDevices).where(eq(iotDevices.deviceId, deviceId)).limit(1);
  return rows[0] ?? null;
}

export async function getIotDeviceByMqttUsername(mqttUsername: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(iotDevices).where(eq(iotDevices.mqttUsername, mqttUsername)).limit(1);
  return rows[0] ?? null;
}

export async function updateIotDevice(id: number, data: Partial<InsertIotDevice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(iotDevices).set(data).where(eq(iotDevices.id, id));
}

export async function updateDeviceLastSeen(deviceId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(iotDevices).set({ lastSeen: new Date(), status: "active" as const }).where(eq(iotDevices.deviceId, deviceId));
}

export async function updateDeviceLastSeenByBpan(bpan: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(iotDevices).set({ lastSeen: new Date(), status: "active" as const }).where(eq(iotDevices.bpan, bpan));
}

export async function deleteIotDevice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(iotDevices).where(eq(iotDevices.id, id));
}

export async function getIotDeviceStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, inactive: 0, pending: 0, revoked: 0 };
  const rows = await db.select({
    status: iotDevices.status,
    count: sql<number>`count(*)`,
  }).from(iotDevices).groupBy(iotDevices.status);
  const stats = { total: 0, active: 0, inactive: 0, pending: 0, revoked: 0 };
  for (const r of rows) {
    const c = Number(r.count);
    stats.total += c;
    if (r.status === "active") stats.active = c;
    else if (r.status === "inactive") stats.inactive = c;
    else if (r.status === "pending") stats.pending = c;
    else if (r.status === "revoked") stats.revoked = c;
  }
  return stats;
}


// ─── LISTING PHOTO HELPERS ───────────────────────────────────────────────────
export async function insertListingPhoto(data: InsertListingPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(listingPhotos).values(data);
  const result = await db.select().from(listingPhotos)
    .where(and(eq(listingPhotos.listingId, data.listingId), eq(listingPhotos.url, data.url)))
    .limit(1);
  return result[0];
}

export async function getListingPhotos(listingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId))
    .orderBy(listingPhotos.sortOrder);
}

export async function deleteListingPhoto(photoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(listingPhotos).where(eq(listingPhotos.id, photoId));
}

export async function getListingById(listingId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(marketplaceListings)
    .where(eq(marketplaceListings.id, listingId)).limit(1);
  return result[0];
}

export async function listUserListings(userId: number, filters?: { status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;
  const conditions = [eq(marketplaceListings.sellerId, userId)];
  if (filters?.status) conditions.push(eq(marketplaceListings.status, filters.status as any));
  const query = and(...conditions);
  const [items, totalResult] = await Promise.all([
    db.select().from(marketplaceListings).where(query).orderBy(desc(marketplaceListings.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(marketplaceListings).where(query),
  ]);
  return { items, total: totalResult[0]?.count ?? 0 };
}

export async function updateListing(listingId: number, data: Partial<InsertMarketplaceListing>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(marketplaceListings).set(data as any).where(eq(marketplaceListings.id, listingId));
}

export async function withdrawListing(listingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(marketplaceListings).set({ status: "withdrawn" } as any).where(eq(marketplaceListings.id, listingId));
}

export async function listUserBatteries(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(batteries)
    .where(or(eq(batteries.registeredById, userId), eq(batteries.ownerId, userId)))
    .orderBy(desc(batteries.createdAt));
}

// ─── PASSWORD RESET TOKEN HELPERS ─────────────────────────────────────────────

export async function createPasswordResetToken(data: {
  userId: number;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(passwordResetTokens).values({
    userId: data.userId,
    token: data.token,
    expiresAt: data.expiresAt,
  });
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);
  return result[0] ?? null;
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.token, token));
}

export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ─── USER PROFILE HELPERS ───────────────────────────────────────────────────

export async function updateUserProfile(userId: number, data: {
  name?: string | null;
  organization?: string | null;
  platformRole?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.organization !== undefined) updateData.organization = data.organization;
  if (data.platformRole !== undefined) updateData.platformRole = data.platformRole;
  await db.update(users).set(updateData as any).where(eq(users.id, userId));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── MARKETPLACE OFFER HELPERS ────────────────────────────────────────────────

export async function createMarketplaceOffer(data: InsertMarketplaceOffer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(marketplaceOffers).values(data);
  const result = await db
    .select()
    .from(marketplaceOffers)
    .where(and(
      eq(marketplaceOffers.listingId, data.listingId),
      eq(marketplaceOffers.buyerId, data.buyerId),
    ))
    .orderBy(desc(marketplaceOffers.createdAt))
    .limit(1);
  return result[0];
}

export async function getOffersForListing(listingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(marketplaceOffers)
    .where(eq(marketplaceOffers.listingId, listingId))
    .orderBy(desc(marketplaceOffers.createdAt));
}

export async function getOffersByBuyer(buyerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(marketplaceOffers)
    .where(eq(marketplaceOffers.buyerId, buyerId))
    .orderBy(desc(marketplaceOffers.createdAt));
}

// ─── ALERT RULE HELPERS ───────────────────────────────────────────────────────
export async function createAlertRule(data: InsertAlertRule): Promise<AlertRule> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(alertRules).values(data);
  const [inserted] = await db.select().from(alertRules)
    .where(and(eq(alertRules.metric, data.metric), eq(alertRules.chemistry, data.chemistry ?? "")))
    .orderBy(desc(alertRules.createdAt)).limit(1);
  return inserted as AlertRule;
}

export async function listAlertRules(filters?: {
  chemistry?: string;
  bpan?: string;
  metric?: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ items: AlertRule[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  const conditions = [];
  if (filters?.chemistry) conditions.push(eq(alertRules.chemistry, filters.chemistry as any));
  if (filters?.bpan) conditions.push(eq(alertRules.bpan, filters.bpan));
  if (filters?.metric) conditions.push(eq(alertRules.metric, filters.metric as any));
  if (filters?.enabled !== undefined) conditions.push(eq(alertRules.enabled, filters.enabled));
  const query = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, totalResult] = await Promise.all([
    db.select().from(alertRules).where(query).orderBy(desc(alertRules.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(alertRules).where(query),
  ]);
  return { items, total: totalResult[0]?.count ?? 0 };
}

export async function getAlertRuleById(id: number): Promise<AlertRule | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(alertRules).where(eq(alertRules.id, id)).limit(1);
  return result[0];
}

export async function updateAlertRule(id: number, data: Partial<InsertAlertRule>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(alertRules).set(data as any).where(eq(alertRules.id, id));
}

export async function deleteAlertRule(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(alertRules).where(eq(alertRules.id, id));
}

export async function toggleAlertRule(id: number, enabled: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(alertRules).set({ enabled }).where(eq(alertRules.id, id));
}

/**
 * Get all enabled alert rules that apply to a specific battery.
 * Returns rules scoped to the BPAN, rules scoped to the chemistry, and platform-wide rules.
 */
export async function getActiveRulesForBpan(bpan: string, chemistry: string): Promise<AlertRule[]> {
  const db = await getDb();
  if (!db) return [];
  // Fetch all enabled rules and filter in JS for clarity
  const all = await db.select().from(alertRules).where(eq(alertRules.enabled, true));
  return all.filter((r) => {
    if (r.bpan) return r.bpan === bpan; // BPAN-specific rule
    if (r.chemistry) return r.chemistry === chemistry; // Chemistry-wide rule
    return true; // Platform-wide rule (no bpan, no chemistry)
  });
}

/**
 * Evaluate a set of alert rules against a telemetry reading.
 * Returns the list of rules that were triggered.
 */
export function evaluateAlertRules(
  rules: AlertRule[],
  reading: { temperature?: number | null; voltage?: number | null; current?: number | null; soc?: number | null; soh?: number | null; cycleCount?: number | null; internalResistance?: number | null }
): AlertRule[] {
  const triggered: AlertRule[] = [];
  for (const rule of rules) {
    const rawValue = reading[rule.metric as keyof typeof reading];
    if (rawValue === null || rawValue === undefined) continue;
    const value = Number(rawValue);
    const threshold = Number(rule.threshold);
    let fired = false;
    switch (rule.operator) {
      case "gt": fired = value > threshold; break;
      case "lt": fired = value < threshold; break;
      case "gte": fired = value >= threshold; break;
      case "lte": fired = value <= threshold; break;
      case "eq": fired = value === threshold; break;
    }
    if (fired) triggered.push(rule);
  }
  return triggered;
}
