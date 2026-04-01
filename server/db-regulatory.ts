/**
 * db-regulatory.ts
 * Database helpers for multinational compliance features:
 * - Regulatory profiles (per-battery, per-jurisdiction)
 * - Carbon footprint declarations
 * - Platform settings (locale, currency, active jurisdictions)
 */
import { getDb } from "./db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  regulatoryProfiles,
  carbonFootprintDeclarations,
  platformSettings,
  InsertRegulatoryProfile,
  InsertCarbonFootprintDeclaration,
  InsertPlatformSettings,
} from "../drizzle/schema";

// ─── REGULATORY PROFILES ──────────────────────────────────────────────────────

export async function getRegulatoryProfilesForBattery(batteryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(regulatoryProfiles)
    .where(eq(regulatoryProfiles.batteryId, batteryId))
    .orderBy(desc(regulatoryProfiles.updatedAt));
}

export async function getRegulatoryProfile(batteryId: number, jurisdiction: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(regulatoryProfiles)
    .where(and(eq(regulatoryProfiles.batteryId, batteryId), eq(regulatoryProfiles.jurisdiction, jurisdiction)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRegulatoryProfileByLocalId(jurisdiction: string, localId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(regulatoryProfiles)
    .where(and(eq(regulatoryProfiles.jurisdiction, jurisdiction), eq(regulatoryProfiles.localId, localId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertRegulatoryProfile(
  batteryId: number,
  jurisdiction: string,
  data: Omit<InsertRegulatoryProfile, "batteryId" | "jurisdiction">
) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getRegulatoryProfile(batteryId, jurisdiction);
  if (existing) {
    await db
      .update(regulatoryProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(regulatoryProfiles.id, existing.id));
  } else {
    await db.insert(regulatoryProfiles).values({ batteryId, jurisdiction, ...data });
  }
  return getRegulatoryProfile(batteryId, jurisdiction);
}

export async function updateRegulatoryProfileStatus(
  id: number,
  status: "compliant" | "non_compliant" | "pending" | "not_applicable" | "data_incomplete",
  govSyncStatus?: "synced" | "pending" | "failed" | "not_required"
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(regulatoryProfiles)
    .set({ status, ...(govSyncStatus ? { govSyncStatus } : {}), lastCheckedAt: new Date(), updatedAt: new Date() })
    .where(eq(regulatoryProfiles.id, id));
}

// ─── CARBON FOOTPRINT DECLARATIONS ───────────────────────────────────────────

export async function getCarbonFootprintDeclarations(batteryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(carbonFootprintDeclarations)
    .where(eq(carbonFootprintDeclarations.batteryId, batteryId))
    .orderBy(desc(carbonFootprintDeclarations.declaredAt));
}

export async function getLatestCarbonFootprintDeclaration(batteryId: number) {
  const rows = await getCarbonFootprintDeclarations(batteryId);
  return rows[0] ?? null;
}

export async function getCarbonFootprintByBpan(bpan: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(carbonFootprintDeclarations)
    .where(eq(carbonFootprintDeclarations.bpan, bpan))
    .orderBy(desc(carbonFootprintDeclarations.declaredAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Batch-fetch the latest carbon footprint performance class for multiple BPANs.
 * Returns a Map<bpan, performanceClass> for efficient lookup.
 */
export async function batchGetCarbonClasses(bpans: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (bpans.length === 0) return result;
  const db = await getDb();
  if (!db) return result;
  // Get the latest declaration per BPAN using a subquery approach
  const rows = await db
    .select({
      bpan: carbonFootprintDeclarations.bpan,
      performanceClass: carbonFootprintDeclarations.performanceClass,
    })
    .from(carbonFootprintDeclarations)
    .where(inArray(carbonFootprintDeclarations.bpan, bpans))
    .orderBy(desc(carbonFootprintDeclarations.declaredAt));
  // Keep only the first (latest) per BPAN
  for (const row of rows) {
    if (!result.has(row.bpan)) {
      result.set(row.bpan, row.performanceClass ?? "—");
    }
  }
  return result;
}

export async function createCarbonFootprintDeclaration(data: InsertCarbonFootprintDeclaration) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(carbonFootprintDeclarations).values(data);
  const rows = await db
    .select()
    .from(carbonFootprintDeclarations)
    .where(eq(carbonFootprintDeclarations.batteryId, data.batteryId))
    .orderBy(desc(carbonFootprintDeclarations.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

// ─── PLATFORM SETTINGS ────────────────────────────────────────────────────────

export async function getPlatformSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  // Try user-specific first
  const userRows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.userId, userId))
    .limit(1);
  if (userRows[0]) return userRows[0];
  // Fall back to global default (userId IS NULL)
  const globalRows = await db
    .select()
    .from(platformSettings)
    .limit(1);
  return globalRows.find(r => r.userId === null) ?? null;
}

export async function upsertPlatformSettings(
  userId: number,
  data: Partial<Omit<InsertPlatformSettings, "userId" | "id" | "createdAt" | "updatedAt">>
) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(platformSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(platformSettings.id, existing[0].id));
  } else {
    const insertData: InsertPlatformSettings = {
      userId,
      locale: data.locale ?? "en-IN",
      displayCurrency: data.displayCurrency ?? "INR",
      timezone: data.timezone ?? "Asia/Kolkata",
      activeJurisdictions: data.activeJurisdictions ?? ["IN"],
      dataResidencyRegion: data.dataResidencyRegion ?? "in",
      organisationName: data.organisationName ?? null,
      organisationCountry: data.organisationCountry ?? null,
    };
    await db.insert(platformSettings).values(insertData);
  }
  return getPlatformSettings(userId);
}

export async function getGlobalPlatformSettings() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(platformSettings).limit(10);
  return rows.find(r => r.userId === null) ?? null;
}

export async function upsertGlobalPlatformSettings(
  data: Partial<Omit<InsertPlatformSettings, "userId" | "id" | "createdAt" | "updatedAt">>
) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getGlobalPlatformSettings();
  if (existing) {
    await db
      .update(platformSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(platformSettings.id, existing.id));
  } else {
    const insertData: InsertPlatformSettings = {
      userId: null as any,
      locale: data.locale ?? "en-IN",
      displayCurrency: data.displayCurrency ?? "INR",
      timezone: data.timezone ?? "Asia/Kolkata",
      activeJurisdictions: data.activeJurisdictions ?? ["IN"],
      dataResidencyRegion: data.dataResidencyRegion ?? "in",
      organisationName: data.organisationName ?? null,
      organisationCountry: data.organisationCountry ?? null,
    };
    await db.insert(platformSettings).values(insertData);
  }
  return getGlobalPlatformSettings();
}

// ─── RECYCLED CONTENT DECLARATIONS ──────────────────────────────────────────

import {
  recycledContentDeclarations,
  InsertRecycledContentDeclaration,
} from "../drizzle/schema";

export async function getRecycledContentByBpan(bpan: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(recycledContentDeclarations)
    .where(eq(recycledContentDeclarations.bpan, bpan))
    .orderBy(desc(recycledContentDeclarations.declaredAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRecycledContentDeclarations(batteryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(recycledContentDeclarations)
    .where(eq(recycledContentDeclarations.batteryId, batteryId))
    .orderBy(desc(recycledContentDeclarations.declaredAt));
}

export async function createRecycledContentDeclaration(data: InsertRecycledContentDeclaration) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(recycledContentDeclarations).values(data);
  const rows = await db
    .select()
    .from(recycledContentDeclarations)
    .where(eq(recycledContentDeclarations.batteryId, data.batteryId))
    .orderBy(desc(recycledContentDeclarations.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function batchGetRecycledContentStatus(bpans: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (bpans.length === 0) return result;
  const db = await getDb();
  if (!db) return result;
  const rows = await db
    .select({ bpan: recycledContentDeclarations.bpan })
    .from(recycledContentDeclarations)
    .where(inArray(recycledContentDeclarations.bpan, bpans));
  const declared = new Set(rows.map(r => r.bpan));
  for (const bpan of bpans) {
    result.set(bpan, declared.has(bpan));
  }
  return result;
}
