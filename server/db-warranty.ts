/** Warranty/customer data is private: every helper requires a server-derived actor. */
import { getDb } from "./db";
import {
  warrantyRecords, warrantyClaims, bulkOnboardingJobs,
  type InsertWarrantyRecord, type InsertWarrantyClaim, type InsertBulkOnboardingJob,
} from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { eq, and, or, like, desc, count, sql, type SQL } from "drizzle-orm";
import {
  type WarrantyActor, requireWarrantyActor, requireWarrantyAdmin, warrantyNotFound,
  batteryResourcePredicate, getOwnedCanonicalBattery, assertCanonicalIdentity, validateWarrantyDates,
} from "./warrantyOwnership";

export function computeWarrantyStatus(
  record: { status: string; warrantyStartDate: Date; warrantyEndDate: Date }, now = new Date(),
): { effectiveStatus: string; daysRemaining: number; isInWarranty: boolean } {
  const end = new Date(record.warrantyEndDate).getTime();
  const start = new Date(record.warrantyStartDate).getTime();
  if (!Number.isFinite(end) || !Number.isFinite(start) || end <= start) {
    return { effectiveStatus: "data_incomplete", daysRemaining: 0, isInWarranty: false };
  }
  const daysRemaining = Math.max(0, Math.ceil((end - now.getTime()) / 86400000));
  if (["voided", "claimed", "suspended", "expired", "pending_activation"].includes(record.status)) {
    return { effectiveStatus: record.status, daysRemaining: record.status === "expired" ? 0 : daysRemaining, isInWarranty: false };
  }
  if (record.status !== "active") return { effectiveStatus: "data_incomplete", daysRemaining: 0, isInWarranty: false };
  if (end < now.getTime()) return { effectiveStatus: "expired", daysRemaining: 0, isInWarranty: false };
  if (start > now.getTime()) return { effectiveStatus: "pending_activation", daysRemaining, isInWarranty: false };
  return { effectiveStatus: "active", daysRemaining, isInWarranty: true };
}
function effectiveStatusSql(now: Date) {
  return sql<string>`case
    when ${warrantyRecords.warrantyEndDate} <= ${warrantyRecords.warrantyStartDate} then 'data_incomplete'
    when ${warrantyRecords.status} in ('voided','claimed','suspended','expired','pending_activation') then ${warrantyRecords.status}
    when ${warrantyRecords.status} <> 'active' then 'data_incomplete'
    when ${warrantyRecords.warrantyEndDate} < ${now} then 'expired'
    when ${warrantyRecords.warrantyStartDate} > ${now} then 'pending_activation'
    else 'active' end`;
}
function decorate(row: typeof warrantyRecords.$inferSelect, now = new Date()) {
  return { ...row, ...computeWarrantyStatus(row, now) };
}
async function requiredDb(actor?: WarrantyActor | null) {
  requireWarrantyActor(actor);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
  return db;
}
function warrantyScope(actor?: WarrantyActor | null) {
  return batteryResourcePredicate(warrantyRecords.batteryId, warrantyRecords.bpan, actor);
}
function claimScope(actor?: WarrantyActor | null) {
  return and(
    batteryResourcePredicate(warrantyClaims.batteryId, warrantyClaims.bpan, actor),
    sql`exists (select 1 from ${warrantyRecords} where ${warrantyRecords.id} = ${warrantyClaims.warrantyId}
      and ${warrantyRecords.batteryId} = ${warrantyClaims.batteryId} and ${warrantyRecords.bpan} = ${warrantyClaims.bpan})`,
  );
}
export async function createWarrantyRecord(data: Omit<InsertWarrantyRecord, "id" | "createdAt" | "updatedAt">, actor?: WarrantyActor | null) {
  const db = await requiredDb(actor);
  validateWarrantyDates(data);
  if (!data.customerName.trim() || (data.purchaseAmount != null && (!Number.isFinite(Number(data.purchaseAmount)) || Number(data.purchaseAmount) < 0))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid customer or purchase amount" });
  }
  return db.transaction(async tx => {
    const battery = await getOwnedCanonicalBattery(tx, data, actor, true);
    const [row] = await tx.insert(warrantyRecords).values({
      ...data, batteryId: battery.id, bpan: battery.bpan, registeredById: requireWarrantyActor(actor).id,
      status: "active", totalClaims: 0, lastClaimDate: null, voidedAt: null, voidReason: null,
    }).returning({ id: warrantyRecords.id });
    return row;
  });
}
export async function getWarrantyByBpan(bpan: string, actor?: WarrantyActor | null) {
  const db = await requiredDb(actor);
  await getOwnedCanonicalBattery(db, { bpan }, actor);
  const now = new Date();
  const rows = await db.select().from(warrantyRecords).where(and(eq(warrantyRecords.bpan, bpan), warrantyScope(actor))).orderBy(desc(warrantyRecords.createdAt));
  return rows.map(r => decorate(r, now));
}
export async function getWarrantyById(id: number, actor?: WarrantyActor | null) {
  const db = await requiredDb(actor);
  const [row] = await db.select().from(warrantyRecords).where(and(eq(warrantyRecords.id, id), warrantyScope(actor))).limit(1);
  if (!row) warrantyNotFound();
  return decorate(row);
}
/** Contact matches are scoped search, not proof of possession or public verification. */
export async function lookupWarranty(params: { bpan?: string; serialNumber?: string; phone?: string; email?: string; whatsApp?: string }, actor?: WarrantyActor | null) {
  const db = await requiredDb(actor);
  const conditions: SQL[] = [];
  if (params.bpan) conditions.push(eq(warrantyRecords.bpan, params.bpan));
  if (params.serialNumber) conditions.push(eq(warrantyRecords.serialNumber, params.serialNumber));
  if (params.phone) conditions.push(eq(warrantyRecords.customerPhone, params.phone));
  if (params.email) conditions.push(eq(warrantyRecords.customerEmail, params.email));
  if (params.whatsApp) conditions.push(eq(warrantyRecords.customerWhatsApp, params.whatsApp));
  if (!conditions.length) return [];
  const now = new Date();
  const rows = await db.select().from(warrantyRecords).where(and(warrantyScope(actor), or(...conditions))).orderBy(desc(warrantyRecords.createdAt)).limit(200);
  return rows.map(r => decorate(r, now));
}
export async function listWarrantyRecords(params?: { status?: string; search?: string; limit?: number; offset?: number }, actor?: WarrantyActor | null) {
  const db = await requiredDb(actor);
  const limit = params?.limit ?? 50, offset = params?.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isSafeInteger(offset) || offset < 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid pagination" });
  }
  const now = new Date();
  const conditions: SQL[] = [warrantyScope(actor)];
  if (params?.status) conditions.push(eq(effectiveStatusSql(now), params.status));
  if (params?.search) conditions.push(or(
    like(warrantyRecords.bpan, `%${params.search}%`), like(warrantyRecords.customerName, `%${params.search}%`),
    like(warrantyRecords.customerPhone, `%${params.search}%`), like(warrantyRecords.customerEmail, `%${params.search}%`),
    like(warrantyRecords.serialNumber, `%${params.search}%`), like(warrantyRecords.invoiceNumber, `%${params.search}%`),
  )!);
  const where = and(...conditions);
  const rows = await db.select().from(warrantyRecords).where(where).orderBy(desc(warrantyRecords.createdAt)).limit(limit).offset(offset);
  const [total] = await db.select({ count: count() }).from(warrantyRecords).where(where);
  return { records: rows.map(r => decorate(r, now)), total: total?.count ?? 0 };
}
export async function updateWarrantyStatus(id: number, status: string, extras?: { voidReason?: string }, actor?: WarrantyActor | null) {
  const db = await requiredDb(actor);
  if (!["active", "expired", "voided", "claimed", "suspended", "pending_activation"].includes(status)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid warranty status" });
  }
  const [row] = await db.update(warrantyRecords).set({
    status, ...(status === "active" ? { activatedAt: new Date() } : {}),
    ...(status === "voided" ? { voidedAt: new Date(), voidReason: extras?.voidReason ?? null } : {}),
  }).where(and(eq(warrantyRecords.id, id), warrantyScope(actor))).returning({ id: warrantyRecords.id });
  if (!row) warrantyNotFound();
  return { success: true };
}
export async function getWarrantyStats(actor?: WarrantyActor | null) {
  const db = await requiredDb(actor);
  const status = effectiveStatusSql(new Date());
  const rows = await db.select({ status, count: count() }).from(warrantyRecords).where(warrantyScope(actor)).groupBy(status);
  return { byStatus: rows, total: rows.reduce((sum, r) => sum + r.count, 0) };
}
export async function createWarrantyClaim(data: Omit<InsertWarrantyClaim, "id" | "createdAt" | "updatedAt">, actor?: WarrantyActor | null) {
  const db = await requiredDb(actor);
  return db.transaction(async tx => {
    // Battery ownership changes and concurrent claims serialize against the canonical battery.
    const battery = await getOwnedCanonicalBattery(tx, { batteryId: data.batteryId }, actor, true);
    const [warranty] = await tx.select().from(warrantyRecords).where(and(eq(warrantyRecords.id, data.warrantyId), warrantyScope(actor))).limit(1).for("update");
    if (!warranty) warrantyNotFound();
    assertCanonicalIdentity(battery, warranty);
    assertCanonicalIdentity(battery, data);
    if (!computeWarrantyStatus(warranty).isInWarranty) throw new TRPCError({ code: "BAD_REQUEST", message: "Warranty is not active" });
    if (data.description.trim().length < 10 || (data.sohAtClaim != null && (!Number.isFinite(Number(data.sohAtClaim)) || Number(data.sohAtClaim) < 0 || Number(data.sohAtClaim) > 100)) ||
        (data.cycleCountAtClaim != null && (!Number.isInteger(data.cycleCountAtClaim) || data.cycleCountAtClaim < 0))) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid claim measurements or description" });
    }
    const [pending] = await tx.select({ id: warrantyClaims.id }).from(warrantyClaims).where(and(eq(warrantyClaims.warrantyId, warranty.id),
      sql`${warrantyClaims.status} not in ('resolved','rejected','replacement_issued')`)).limit(1);
    if (pending) throw new TRPCError({ code: "CONFLICT", message: "An open claim already exists for this warranty" });
    const [claim] = await tx.insert(warrantyClaims).values({
      ...data, warrantyId: warranty.id, batteryId: warranty.batteryId, bpan: warranty.bpan,
      claimedById: requireWarrantyActor(actor).id, status: "submitted", assignedTo: null,
      resolutionType: "pending", resolutionNotes: null, resolutionDate: null,
    }).returning({ id: warrantyClaims.id });
    const [updated] = await tx.update(warrantyRecords).set({ totalClaims: sql`coalesce(${warrantyRecords.totalClaims}, 0) + 1`, lastClaimDate: new Date() })
      .where(and(eq(warrantyRecords.id, warranty.id), warrantyScope(actor))).returning({ id: warrantyRecords.id });
    if (!updated) warrantyNotFound();
    return claim;
  });
}
export async function listWarrantyClaims(warrantyId: number, actor?: WarrantyActor | null) {
  const db = await requiredDb(actor);
  await getWarrantyById(warrantyId, actor);
  return db.select().from(warrantyClaims).where(and(eq(warrantyClaims.warrantyId, warrantyId), claimScope(actor))).orderBy(desc(warrantyClaims.createdAt)).limit(200);
}
export async function updateClaimStatus(claimId: number, status: string, extras?: { resolutionType?: string; resolutionNotes?: string }, actor?: WarrantyActor | null) {
  requireWarrantyAdmin(actor);
  const db = await requiredDb(actor);
  if (!["submitted", "under_review", "approved", "rejected", "in_repair", "replacement_issued", "resolved", "escalated"].includes(status)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid claim status" });
  }
  const [row] = await db.update(warrantyClaims).set({ status,
    ...(extras?.resolutionType ? { resolutionType: extras.resolutionType } : {}),
    ...(extras?.resolutionNotes ? { resolutionNotes: extras.resolutionNotes } : {}),
    ...(["resolved", "rejected", "replacement_issued"].includes(status) ? { resolutionDate: new Date() } : {}),
  }).where(and(eq(warrantyClaims.id, claimId), claimScope(actor))).returning({ id: warrantyClaims.id });
  if (!row) warrantyNotFound();
  return { success: true };
}

// ─── BULK ONBOARDING ─────────────────────────────────────────────────────────
export async function createBulkOnboardingJob(data: Omit<InsertBulkOnboardingJob, "id" | "createdAt" | "updatedAt">) {
  const db = (await getDb())!;
  const [{ id: _insertedId }] = await db.insert(bulkOnboardingJobs).values(data).returning();
  const result = { id: _insertedId };
  return { id: result.id };
}

export async function updateBulkOnboardingJob(
  id: number,
  updates: Partial<{
    processedRecords: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
    status: string;
    errorLog: { row: number; error: string }[];
    generatedBpans: string[];
    completedAt: Date;
  }>
) {
  const db = (await getDb())!;
  await db.update(bulkOnboardingJobs).set(updates as any).where(eq(bulkOnboardingJobs.id, id));
  return { success: true };
}

export async function getBulkOnboardingJob(id: number) {
  const db = (await getDb())!;
  const [row] = await db.select().from(bulkOnboardingJobs).where(eq(bulkOnboardingJobs.id, id));
  return row ?? null;
}

export async function listBulkOnboardingJobs(params?: { limit?: number; offset?: number }) {
  const db = (await getDb())!;
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;
  const rows = await db.select().from(bulkOnboardingJobs)
    .orderBy(desc(bulkOnboardingJobs.createdAt))
    .limit(limit)
    .offset(offset);
  const [countResult] = await db.select({ count: count() }).from(bulkOnboardingJobs);
  return { jobs: rows, total: countResult?.count ?? 0 };
}
