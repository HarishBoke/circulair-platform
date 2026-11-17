import { getDb } from "./db";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, inArray, sql, isNull } from "drizzle-orm";
import {
  batteries, regulatoryProfiles, carbonFootprintDeclarations, platformSettings, recycledContentDeclarations,
  type InsertRegulatoryProfile, type InsertCarbonFootprintDeclaration,
  type InsertPlatformSettings, type InsertRecycledContentDeclaration,
} from "../drizzle/schema";
import {
  type WarrantyActor, requireWarrantyActor, requireWarrantyAdmin, warrantyNotFound,
  batteryOwnerPredicate, batteryResourcePredicate, getOwnedCanonicalBattery, validateSelfDeclaredCarbon,
} from "./warrantyOwnership";
async function scopedDb(actor?: WarrantyActor | null) {
  requireWarrantyActor(actor);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
  return db;
}
function profileScope(actor?: WarrantyActor | null) {
  return batteryResourcePredicate(regulatoryProfiles.batteryId, regulatoryProfiles.bpan, actor);
}
function carbonScope(actor?: WarrantyActor | null) {
  return batteryResourcePredicate(carbonFootprintDeclarations.batteryId, carbonFootprintDeclarations.bpan, actor);
}
function recycledScope(actor?: WarrantyActor | null) {
  return batteryResourcePredicate(recycledContentDeclarations.batteryId, recycledContentDeclarations.bpan, actor);
}
export async function getRegulatoryProfilesForBattery(batteryId: number, actor?: WarrantyActor | null) {
  const db = await scopedDb(actor);
  await getOwnedCanonicalBattery(db, { batteryId }, actor);
  return db.select().from(regulatoryProfiles).where(and(eq(regulatoryProfiles.batteryId, batteryId), profileScope(actor))).orderBy(desc(regulatoryProfiles.updatedAt)).limit(200);
}
export async function getRegulatoryProfile(batteryId: number, jurisdiction: string, actor?: WarrantyActor | null) {
  const db = await scopedDb(actor);
  await getOwnedCanonicalBattery(db, { batteryId }, actor);
  const [row] = await db.select().from(regulatoryProfiles).where(and(eq(regulatoryProfiles.batteryId, batteryId), eq(regulatoryProfiles.jurisdiction, jurisdiction), profileScope(actor))).limit(1);
  return row ?? null;
}
/** Private until a reviewed public passport projection exists; arbitrary profile JSON is never public. */
export async function getRegulatoryProfileByLocalId(jurisdiction: string, localId: string, actor?: WarrantyActor | null) {
  const db = await scopedDb(actor);
  const [row] = await db.select().from(regulatoryProfiles).where(and(eq(regulatoryProfiles.jurisdiction, jurisdiction), eq(regulatoryProfiles.localId, localId), profileScope(actor))).limit(1);
  if (!row) warrantyNotFound();
  return row;
}
export async function upsertRegulatoryProfile(batteryId: number, jurisdiction: string, data: Omit<InsertRegulatoryProfile, "batteryId" | "jurisdiction">, actor?: WarrantyActor | null) {
  const db = await scopedDb(actor);
  if (!/^[A-Z]{2,10}$/.test(jurisdiction)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid jurisdiction" });
  if ((data.status && !["pending", "data_incomplete"].includes(data.status)) ||
      (data.govSyncStatus && data.govSyncStatus !== "pending")) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Compliance determination and government synchronization are unavailable" });
  }
  return db.transaction(async tx => {
    const battery = await getOwnedCanonicalBattery(tx, { batteryId, bpan: data.bpan }, actor, true);
    const [existing] = await tx.select().from(regulatoryProfiles).where(and(eq(regulatoryProfiles.batteryId, batteryId), eq(regulatoryProfiles.jurisdiction, jurisdiction), profileScope(actor))).limit(1).for("update");
    // Explicit allowlist excludes caller IDs, timestamps and trusted verification fields.
    const values = {
      batteryId: battery.id, bpan: battery.bpan, jurisdiction,
      localId: data.localId ?? null, profileData: data.profileData,
      status: "pending", govSyncStatus: "pending", lastCheckedAt: null, lastGovSyncAt: null,
    };
    if (existing) {
      const [row] = await tx.update(regulatoryProfiles).set({ ...values, updatedAt: new Date() }).where(and(eq(regulatoryProfiles.id, existing.id), profileScope(actor))).returning();
      if (!row) warrantyNotFound();
      return row;
    }
    const [row] = await tx.insert(regulatoryProfiles).values(values).returning();
    return row;
  });
}
/** No verified adapter exists. Even administrators cannot invent certified/synced status. */
export async function updateRegulatoryProfileStatus(_id: number, _status: "compliant" | "non_compliant" | "pending" | "not_applicable" | "data_incomplete", _govSyncStatus?: "synced" | "pending" | "failed" | "not_required", actor?: WarrantyActor | null) {
  requireWarrantyActor(actor);
  throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Verified regulatory status updates are unavailable" });
}
export async function getCarbonFootprintDeclarations(batteryId: number, actor?: WarrantyActor | null) {
  const db = await scopedDb(actor);
  await getOwnedCanonicalBattery(db, { batteryId }, actor);
  return db.select().from(carbonFootprintDeclarations).where(and(eq(carbonFootprintDeclarations.batteryId, batteryId), carbonScope(actor))).orderBy(desc(carbonFootprintDeclarations.declaredAt)).limit(200);
}
export async function getLatestCarbonFootprintDeclaration(batteryId: number, actor?: WarrantyActor | null) {
  return (await getCarbonFootprintDeclarations(batteryId, actor))[0] ?? null;
}
export async function getCarbonFootprintByBpan(bpan: string, actor?: WarrantyActor | null) {
  const db = await scopedDb(actor);
  await getOwnedCanonicalBattery(db, { bpan }, actor);
  const [row] = await db.select().from(carbonFootprintDeclarations).where(and(eq(carbonFootprintDeclarations.bpan, bpan), carbonScope(actor))).orderBy(desc(carbonFootprintDeclarations.declaredAt)).limit(1);
  return row ?? null;
}
export async function batchGetCarbonClasses(bpans: string[], actor?: WarrantyActor | null): Promise<Map<string, string>> {
  const db = await scopedDb(actor);
  const result = new Map<string, string>();
  if (!bpans.length) return result;
  if (bpans.length > 500) throw new TRPCError({ code: "BAD_REQUEST", message: "Batch limit exceeded" });
  const rows = await db.select({ bpan: carbonFootprintDeclarations.bpan, performanceClass: carbonFootprintDeclarations.performanceClass })
    .from(carbonFootprintDeclarations).where(and(inArray(carbonFootprintDeclarations.bpan, bpans), carbonScope(actor))).orderBy(desc(carbonFootprintDeclarations.declaredAt)).limit(200);
  for (const row of rows) if (!result.has(row.bpan)) result.set(row.bpan, row.performanceClass ?? "—");
  return result;
}
export async function createCarbonFootprintDeclaration(data: InsertCarbonFootprintDeclaration, actor?: WarrantyActor | null) {
  const db = await scopedDb(actor);
  validateSelfDeclaredCarbon(data);
  return db.transaction(async tx => {
    const battery = await getOwnedCanonicalBattery(tx, data, actor, true);
    const [row] = await tx.insert(carbonFootprintDeclarations).values({
      batteryId: battery.id, bpan: battery.bpan, totalKgCo2e: data.totalKgCo2e,
      rawMaterialKgCo2e: data.rawMaterialKgCo2e ?? null, productionKgCo2e: data.productionKgCo2e ?? null,
      distributionKgCo2e: data.distributionKgCo2e ?? null, endOfLifeKgCo2e: data.endOfLifeKgCo2e ?? null,
      // Class and certifier are not accepted as a verified legal determination.
      performanceClass: null, certifyingBody: null, methodology: data.methodology ?? "GHG_PROTOCOL",
      declaredById: requireWarrantyActor(actor).id,
    }).returning();
    return row;
  });
}

// ─── PLATFORM SETTINGS ────────────────────────────────────────────────────────
function allowedSettings(data: Partial<Omit<InsertPlatformSettings, "userId" | "id" | "createdAt" | "updatedAt">>) {
  return Object.fromEntries(Object.entries(data).filter(([key, value]) => value !== undefined && [
    "locale", "displayCurrency", "timezone", "activeJurisdictions", "dataResidencyRegion", "organisationName", "organisationCountry",
  ].includes(key))) as typeof data;
}

export async function getPlatformSettings(userId: number, actor?: WarrantyActor | null) {
  const user = requireWarrantyActor(actor);
  if (user.role !== "admin" && user.id !== userId) warrantyNotFound();
  const db = await scopedDb(actor);
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
    .where(isNull(platformSettings.userId))
    .limit(1);
  return globalRows[0] ?? null;
}

export async function upsertPlatformSettings(
  userId: number,
  data: Partial<Omit<InsertPlatformSettings, "userId" | "id" | "createdAt" | "updatedAt">>, actor?: WarrantyActor | null
) {
  const user = requireWarrantyActor(actor);
  if (user.role !== "admin" && user.id !== userId) warrantyNotFound();
  const db = await scopedDb(actor);
  if (!db) return null;
  const existing = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(platformSettings)
      .set({ ...allowedSettings(data), updatedAt: new Date() })
      .where(and(eq(platformSettings.id, existing[0].id), eq(platformSettings.userId, userId)));
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
  return getPlatformSettings(userId, actor);
}

export async function getGlobalPlatformSettings(actor?: WarrantyActor | null) {
  requireWarrantyAdmin(actor);
  const db = await scopedDb(actor);
  if (!db) return null;
  const [row] = await db.select().from(platformSettings).where(isNull(platformSettings.userId)).limit(1);
  return row ?? null;
}

export async function upsertGlobalPlatformSettings(
  data: Partial<Omit<InsertPlatformSettings, "userId" | "id" | "createdAt" | "updatedAt">>, actor?: WarrantyActor | null
) {
  requireWarrantyAdmin(actor);
  const db = await scopedDb(actor);
  if (!db) return null;
  const existing = await getGlobalPlatformSettings(actor);
  if (existing) {
    await db
      .update(platformSettings)
      .set({ ...allowedSettings(data), updatedAt: new Date() })
      .where(and(eq(platformSettings.id, existing.id), isNull(platformSettings.userId)));
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
  return getGlobalPlatformSettings(actor);
}

// ─── RECYCLED CONTENT DECLARATIONS ──────────────────────────────────────────
export async function getRecycledContentByBpan(bpan: string, actor?: WarrantyActor | null) {
  const db = await scopedDb(actor);
  await getOwnedCanonicalBattery(db, { bpan }, actor);
  const [row] = await db.select().from(recycledContentDeclarations).where(and(eq(recycledContentDeclarations.bpan, bpan), recycledScope(actor))).orderBy(desc(recycledContentDeclarations.declaredAt)).limit(1);
  return row ?? null;
}
export async function getRecycledContentDeclarations(batteryId: number, actor?: WarrantyActor | null) {
  const db = await scopedDb(actor);
  await getOwnedCanonicalBattery(db, { batteryId }, actor);
  return db.select().from(recycledContentDeclarations).where(and(eq(recycledContentDeclarations.batteryId, batteryId), recycledScope(actor))).orderBy(desc(recycledContentDeclarations.declaredAt)).limit(200);
}
export async function createRecycledContentDeclaration(data: InsertRecycledContentDeclaration, actor?: WarrantyActor | null) {
  const db = await scopedDb(actor);
  const percentages = [data.cobaltPct, data.lithiumPct, data.nickelPct, data.leadPct].filter(v => v !== null && v !== undefined);
  if (!percentages.length || percentages.some(v => !Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 100)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "At least one valid material percentage is required" });
  }
  if ((data.verificationMethod && data.verificationMethod !== "SELF_DECLARED") || data.certifyingBody || data.certificateRef) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Certification verification is unavailable; submit self-declared evidence only" });
  }
  return db.transaction(async tx => {
    const battery = await getOwnedCanonicalBattery(tx, data, actor, true);
    const [row] = await tx.insert(recycledContentDeclarations).values({
      batteryId: battery.id, bpan: battery.bpan, cobaltPct: data.cobaltPct ?? null,
      lithiumPct: data.lithiumPct ?? null, nickelPct: data.nickelPct ?? null, leadPct: data.leadPct ?? null,
      // Composition weights are unavailable: an unweighted average is not total recycled mass.
      totalRecycledPct: null, verificationMethod: "SELF_DECLARED", certifyingBody: null,
      certificateRef: null, notes: data.notes ?? null, declaredById: requireWarrantyActor(actor).id,
    }).returning();
    return row;
  });
}
export async function batchGetRecycledContentStatus(bpans: string[], actor?: WarrantyActor | null): Promise<Map<string, boolean>> {
  const db = await scopedDb(actor);
  const result = new Map<string, boolean>();
  if (!bpans.length) return result;
  if (bpans.length > 500) throw new TRPCError({ code: "BAD_REQUEST", message: "Batch limit exceeded" });
  const rows = await db.select({ bpan: recycledContentDeclarations.bpan }).from(recycledContentDeclarations).where(and(inArray(recycledContentDeclarations.bpan, bpans), recycledScope(actor)));
  // Never emit existence information for foreign batteries (including false entries).
  const owned = await db.select({ bpan: batteries.bpan }).from(batteries).where(and(inArray(batteries.bpan, bpans), batteryOwnerPredicate(actor)));
  const declared = new Set(rows.map(r => r.bpan));
  for (const row of owned) result.set(row.bpan, declared.has(row.bpan));
  return result;
}
