/**
 * db-warranty.ts — Database helpers for Warranty Records, Claims, and Bulk Onboarding.
 * Provides CRUD operations, warranty status computation, multi-channel lookup,
 * and bulk battery onboarding with auto-BPAN generation.
 */
import { getDb } from "./db";
import {
  warrantyRecords, warrantyClaims, bulkOnboardingJobs,
  batteries,
  type InsertWarrantyRecord, type InsertWarrantyClaim, type InsertBulkOnboardingJob,
} from "../drizzle/schema";
import { eq, and, or, like, desc, count, sql } from "drizzle-orm";

// ─── WARRANTY STATUS ENGINE ──────────────────────────────────────────────────
/**
 * Compute the effective warranty status based on dates and manual overrides.
 * Logic:
 *   1. If status is voided/claimed/suspended → keep manual override
 *   2. If warrantyEndDate < now → expired
 *   3. If warrantyStartDate > now → pending_activation
 *   4. Otherwise → active
 */
export function computeWarrantyStatus(
  record: { status: string; warrantyStartDate: Date; warrantyEndDate: Date }
): { effectiveStatus: string; daysRemaining: number; isInWarranty: boolean } {
  const now = new Date();
  const endDate = new Date(record.warrantyEndDate);
  const startDate = new Date(record.warrantyStartDate);
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Manual overrides take precedence
  if (["voided", "claimed", "suspended"].includes(record.status)) {
    return { effectiveStatus: record.status, daysRemaining, isInWarranty: false };
  }

  if (endDate < now) {
    return { effectiveStatus: "expired", daysRemaining: 0, isInWarranty: false };
  }
  if (startDate > now) {
    return { effectiveStatus: "pending_activation", daysRemaining, isInWarranty: false };
  }
  return { effectiveStatus: "active", daysRemaining, isInWarranty: true };
}

// ─── WARRANTY CRUD ───────────────────────────────────────────────────────────
export async function createWarrantyRecord(data: Omit<InsertWarrantyRecord, "id" | "createdAt" | "updatedAt">) {
  const db = (await getDb())!;
  const [result] = await db.insert(warrantyRecords).values(data).$returningId();
  return { id: result.id };
}

export async function getWarrantyByBpan(bpan: string) {
  const db = (await getDb())!;
  const rows = await db.select().from(warrantyRecords).where(eq(warrantyRecords.bpan, bpan)).orderBy(desc(warrantyRecords.createdAt));
  return rows.map(r => ({
    ...r,
    ...computeWarrantyStatus({
      status: r.status,
      warrantyStartDate: r.warrantyStartDate,
      warrantyEndDate: r.warrantyEndDate,
    }),
  }));
}

export async function getWarrantyById(id: number) {
  const db = (await getDb())!;
  const [row] = await db.select().from(warrantyRecords).where(eq(warrantyRecords.id, id));
  if (!row) return null;
  return {
    ...row,
    ...computeWarrantyStatus({
      status: row.status,
      warrantyStartDate: row.warrantyStartDate,
      warrantyEndDate: row.warrantyEndDate,
    }),
  };
}

/**
 * Multi-channel warranty lookup — search by BPAN, serial number, phone, email, or WhatsApp.
 * This powers the public warranty check page and agent-driven verification.
 */
export async function lookupWarranty(params: {
  bpan?: string;
  serialNumber?: string;
  phone?: string;
  email?: string;
  whatsApp?: string;
}) {
  const db = (await getDb())!;
  const conditions: any[] = [];
  if (params.bpan) conditions.push(eq(warrantyRecords.bpan, params.bpan));
  if (params.serialNumber) conditions.push(eq(warrantyRecords.serialNumber, params.serialNumber));
  if (params.phone) conditions.push(eq(warrantyRecords.customerPhone, params.phone));
  if (params.email) conditions.push(eq(warrantyRecords.customerEmail, params.email));
  if (params.whatsApp) conditions.push(eq(warrantyRecords.customerWhatsApp, params.whatsApp));

  if (conditions.length === 0) return [];

  const rows = await db.select().from(warrantyRecords)
    .where(or(...conditions))
    .orderBy(desc(warrantyRecords.createdAt));

  return rows.map(r => ({
    ...r,
    ...computeWarrantyStatus({
      status: r.status,
      warrantyStartDate: r.warrantyStartDate,
      warrantyEndDate: r.warrantyEndDate,
    }),
  }));
}

export async function listWarrantyRecords(params?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = (await getDb())!;
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;
  const conditions: any[] = [];

  if (params?.status) conditions.push(eq(warrantyRecords.status, params.status as any));
  if (params?.search) {
    conditions.push(
      or(
        like(warrantyRecords.bpan, `%${params.search}%`),
        like(warrantyRecords.customerName, `%${params.search}%`),
        like(warrantyRecords.customerPhone, `%${params.search}%`),
        like(warrantyRecords.customerEmail, `%${params.search}%`),
        like(warrantyRecords.serialNumber, `%${params.search}%`),
        like(warrantyRecords.invoiceNumber, `%${params.search}%`),
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(warrantyRecords)
    .where(where)
    .orderBy(desc(warrantyRecords.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db.select({ count: count() }).from(warrantyRecords).where(where);

  return {
    records: rows.map(r => ({
      ...r,
      ...computeWarrantyStatus({
        status: r.status,
        warrantyStartDate: r.warrantyStartDate,
        warrantyEndDate: r.warrantyEndDate,
      }),
    })),
    total: countResult?.count ?? 0,
  };
}

export async function updateWarrantyStatus(id: number, status: string, extras?: { voidReason?: string }) {
  const db = (await getDb())!;
  const updates: any = { status };
  if (status === "active") updates.activatedAt = new Date();
  if (status === "voided") {
    updates.voidedAt = new Date();
    if (extras?.voidReason) updates.voidReason = extras.voidReason;
  }
  await db.update(warrantyRecords).set(updates).where(eq(warrantyRecords.id, id));
  return { success: true };
}

export async function getWarrantyStats() {
  const db = (await getDb())!;
  const rows = await db.select({
    status: warrantyRecords.status,
    count: count(),
  }).from(warrantyRecords).groupBy(warrantyRecords.status);

  const total = rows.reduce((sum: number, r: { count: number }) => sum + r.count, 0);
  return { byStatus: rows, total };
}

// ─── WARRANTY CLAIMS ─────────────────────────────────────────────────────────
export async function createWarrantyClaim(data: Omit<InsertWarrantyClaim, "id" | "createdAt" | "updatedAt">) {
  const db = (await getDb())!;
  const [result] = await db.insert(warrantyClaims).values(data).$returningId();
  // Increment totalClaims on the warranty record
  await db.update(warrantyRecords)
    .set({
      totalClaims: sql`${warrantyRecords.totalClaims} + 1`,
      lastClaimDate: new Date(),
    })
    .where(eq(warrantyRecords.id, data.warrantyId));
  return { id: result.id };
}

export async function listWarrantyClaims(warrantyId: number) {
  const db = (await getDb())!;
  return db.select().from(warrantyClaims)
    .where(eq(warrantyClaims.warrantyId, warrantyId))
    .orderBy(desc(warrantyClaims.createdAt));
}

export async function updateClaimStatus(
  claimId: number,
  status: string,
  extras?: { resolutionType?: string; resolutionNotes?: string }
) {
  const db = (await getDb())!;
  const updates: any = { status };
  if (extras?.resolutionType) updates.resolutionType = extras.resolutionType;
  if (extras?.resolutionNotes) updates.resolutionNotes = extras.resolutionNotes;
  if (["resolved", "rejected", "replacement_issued"].includes(status)) {
    updates.resolutionDate = new Date();
  }
  await db.update(warrantyClaims).set(updates).where(eq(warrantyClaims.id, claimId));
  return { success: true };
}

// ─── BULK ONBOARDING ─────────────────────────────────────────────────────────
export async function createBulkOnboardingJob(data: Omit<InsertBulkOnboardingJob, "id" | "createdAt" | "updatedAt">) {
  const db = (await getDb())!;
  const [result] = await db.insert(bulkOnboardingJobs).values(data).$returningId();
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
