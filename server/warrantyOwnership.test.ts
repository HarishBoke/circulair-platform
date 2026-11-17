import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { warrantyRecords, warrantyClaims, regulatoryProfiles } from "../drizzle/schema";
import { bpanReadSchema } from "../shared/bpanContract";
import { encodeWarrantyCsv, warrantyCsvCell } from "../shared/warrantyCsv";
const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
import * as warranty from "./db-warranty";
import * as regulatory from "./db-regulatory";
import { assertCanonicalIdentity, batteryResourcePredicate, getOwnedCanonicalBattery, requireWarrantyActor, validateSelfDeclaredCarbon, warrantyTermEndDate, validateWarrantyDates } from "./warrantyOwnership";
const owner = { id: 11, role: "user" };
const admin = { id: 12, role: "admin" };
const bpan = "A".repeat(21);
const battery = { id: 7, bpan, ownerId: owner.id };
const record = { id: 31, batteryId: 7, bpan, status: "active", warrantyStartDate: new Date("2026-01-01"), warrantyEndDate: new Date("2030-01-01") };
const claim = { warrantyId: 31, batteryId: 7, bpan, description: "Measured loss observed", claimedById: 999, claimType: "other" };
const dialect = new PgDialect();
function querySql(where: any) { return dialect.sqlToQuery(where); }
function fakeDb(results: unknown[]) {
  const calls: { op: string; table?: unknown; where?: any; values?: any; lock?: string }[] = [];
  let writes = 0;
  const db: any = {
    calls, get writes() { return writes; },
    transaction: vi.fn(async (fn: any) => {
      const before = writes;
      try { return await fn(db); } catch (e) { writes = before; throw e; }
    }),
  };
  for (const op of ["select", "insert", "update"]) db[op] = (table: unknown) => {
    const call = { op, table } as typeof calls[number]; calls.push(call);
    const builder: any = {};
    for (const method of ["from", "where", "values", "set", "for", "orderBy", "groupBy", "limit", "offset", "returning"]) builder[method] = (...args: any[]) => {
      if (method === "from") call.table = args[0];
      if (method === "where") call.where = args[0];
      if (method === "values" || method === "set") call.values = args[0];
      if (method === "for") call.lock = args[0];
      return builder;
    };
    builder.then = (resolve: any, reject: any) => {
      if (!results.length) return Promise.reject(new Error("Unexpected mock query")).then(resolve, reject);
      const value = results.shift();
      if (value instanceof Error) return Promise.reject(value).then(resolve, reject);
      if (op !== "select") writes++;
      return Promise.resolve(value).then(resolve, reject);
    };
    return builder;
  };
  mocks.getDb.mockResolvedValue(db);
  return db;
}
beforeEach(() => { mocks.getDb.mockReset(); });

describe("fail-closed context boundary", () => {
  const calls: [string, () => Promise<unknown>][] = [
    ["warranty register", () => warranty.createWarrantyRecord({} as any)],
    ["warranty BPAN read", () => warranty.getWarrantyByBpan(bpan)],
    ["warranty ID read", () => warranty.getWarrantyById(31)],
    ["contact lookup", () => warranty.lookupWarranty({ email: "private@example.invalid" })],
    ["warranty list", () => warranty.listWarrantyRecords()],
    ["warranty status", () => warranty.updateWarrantyStatus(31, "active")],
    ["warranty stats", () => warranty.getWarrantyStats()],
    ["claim create", () => warranty.createWarrantyClaim(claim as any)],
    ["claim list", () => warranty.listWarrantyClaims(31)],
    ["claim status", () => warranty.updateClaimStatus(1, "approved")],
    ["profiles", () => regulatory.getRegulatoryProfilesForBattery(7)],
    ["profile", () => regulatory.getRegulatoryProfile(7, "EU")],
    ["passport", () => regulatory.getRegulatoryProfileByLocalId("EU", "private-id")],
    ["profile upsert", () => regulatory.upsertRegulatoryProfile(7, "EU", {} as any)],
    ["profile status", () => regulatory.updateRegulatoryProfileStatus(1, "compliant")],
    ["carbon history", () => regulatory.getCarbonFootprintDeclarations(7)],
    ["latest carbon", () => regulatory.getLatestCarbonFootprintDeclaration(7)],
    ["carbon BPAN", () => regulatory.getCarbonFootprintByBpan(bpan)],
    ["carbon classes", () => regulatory.batchGetCarbonClasses([bpan])],
    ["carbon create", () => regulatory.createCarbonFootprintDeclaration({} as any)],
    ["recycled BPAN", () => regulatory.getRecycledContentByBpan(bpan)],
    ["recycled history", () => regulatory.getRecycledContentDeclarations(7)],
    ["recycled create", () => regulatory.createRecycledContentDeclaration({} as any)],
    ["recycled batch", () => regulatory.batchGetRecycledContentStatus([bpan])],
    ["settings read", () => regulatory.getPlatformSettings(11)],
    ["settings write", () => regulatory.upsertPlatformSettings(11, {})],
    ["global settings read", () => regulatory.getGlobalPlatformSettings()],
    ["global settings write", () => regulatory.upsertGlobalPlatformSettings({})],
  ];
  it.each(calls)("%s rejects before database acquisition without actor", async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it("rejects zero/invalid actor IDs and requires admin for claim review", async () => {
    expect(() => requireWarrantyActor({ id: 0, role: "admin" })).toThrow();
    await expect(warranty.updateClaimStatus(1, "approved", {}, owner)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it("owner predicate correlates ID AND BPAN and never includes registering user", () => {
    const q = querySql(batteryResourcePredicate(warrantyRecords.batteryId, warrantyRecords.bpan, owner));
    expect(q.sql).toContain('"batteries"."id" = "warranty_records"."batteryId"');
    expect(q.sql).toContain('"batteries"."bpan" = "warranty_records"."bpan"');
    expect(q.sql).toContain('"batteries"."ownerId" = $1');
    expect(q.params).toEqual([11]);
    expect(q.sql).not.toContain("registeredById");
  });
  it("admin scope still requires existing consistent battery identity", () => {
    const q = querySql(batteryResourcePredicate(regulatoryProfiles.batteryId, regulatoryProfiles.bpan, admin));
    expect(q.sql).toContain('"batteries"."bpan" = "regulatory_profiles"."bpan"');
    expect(q.params).toEqual([]);
    expect(q.sql).toContain("true");
  });
});

describe("actual helper queries with offline mocked database", () => {
  it.each(["absent", "foreign", "inconsistent legacy"])("single warranty read uses same NOT_FOUND for %s", async () => {
    const db = fakeDb([[]]);
    await expect(warranty.getWarrantyById(31, owner)).rejects.toMatchObject({ code: "NOT_FOUND", message: "Resource not found" });
    const q = querySql(db.calls[0].where);
    expect(q.params).toEqual([31, 11]);
    expect(q.sql).toContain('"batteries"."ownerId"');
  });
  it("owner read decorates status; missing DB is an explicit error", async () => {
    fakeDb([[record]]);
    await expect(warranty.getWarrantyById(31, owner)).resolves.toMatchObject({ id: 31, isInWarranty: true });
    mocks.getDb.mockResolvedValue(null);
    await expect(warranty.getWarrantyById(31, owner)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
  it("contact lookup adds owner predicate around OR matches and caps results", async () => {
    const db = fakeDb([[]]);
    await expect(warranty.lookupWarranty({ phone: "+100", email: "private@example.invalid" }, owner)).resolves.toEqual([]);
    const q = querySql(db.calls[0].where);
    expect(q.params).toEqual([11, "+100", "private@example.invalid"]);
    expect(q.sql).toContain("exists"); expect(q.sql).toContain(" or ");
  });
  it("list filter/count and stats share effective status and owner predicates", async () => {
    const db = fakeDb([[], [{ count: 0 }], []]);
    await warranty.listWarrantyRecords({ status: "expired" }, owner);
    await warranty.getWarrantyStats(owner);
    const rows = querySql(db.calls[0].where), total = querySql(db.calls[1].where), stats = querySql(db.calls[2].where);
    expect(rows).toEqual(total); expect(rows.sql).toContain("case"); expect(rows.params).toContain("expired");
    expect(stats.params).toEqual([11]);
  });
  it("atomic status update includes scope and missing/foreign result is NOT_FOUND", async () => {
    const db = fakeDb([[]]);
    await expect(warranty.updateWarrantyStatus(31, "expired", {}, owner)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(querySql(db.calls[0].where).params).toEqual([31, 11]);
  });
  it("registration locks canonical battery, derives registrant and ignores forged counter/status", async () => {
    const db = fakeDb([[battery], [{ id: 31 }]]);
    await expect(warranty.createWarrantyRecord({ ...record, customerName: "Fixture", purchaseDate: new Date("2026-01-01"), warrantyTermMonths: 48, registeredById: 999, status: "claimed", totalClaims: 99 } as any, owner)).resolves.toEqual({ id: 31 });
    expect(db.calls[0].lock).toBe("update");
    expect(db.calls[1].values).toMatchObject({ batteryId: 7, bpan, registeredById: 11, status: "active", totalClaims: 0 });
  });
  it("registration refuses mismatched BPAN with no write", async () => {
    const db = fakeDb([[battery]]);
    await expect(warranty.createWarrantyRecord({ ...record, bpan: "B".repeat(21), customerName: "Fixture", purchaseDate: new Date("2026-01-01"), warrantyTermMonths: 48 } as any, owner)).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Battery identity mismatch" });
    expect(db.writes).toBe(0);
  });
  it("claim derives warranty identity/claimant and counter update is transactional", async () => {
    const db = fakeDb([[battery], [record], [], [{ id: 88 }], [{ id: 31 }]]);
    await expect(warranty.createWarrantyClaim(claim as any, owner)).resolves.toEqual({ id: 88 });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.calls[3].values).toMatchObject({ warrantyId: 31, batteryId: 7, bpan, claimedById: 11, status: "submitted" });
    expect(querySql(db.calls[4].where).params).toEqual([31, 11]);
  });
  it("claim mismatch/open duplicate/inactive warranty cannot insert", async () => {
    for (const [fixture, input, code] of [
      [[[battery]], { ...claim, bpan: "B".repeat(21) }, "BAD_REQUEST"],
      [[[battery]], claim, "CONFLICT"],
      [[[battery]], claim, "BAD_REQUEST"],
    ] as const) {
      const rows = code === "CONFLICT" ? [...fixture, [record], [{ id: 80 }]] : code === "BAD_REQUEST" && input === claim ? [...fixture, [{ ...record, status: "expired" }]] : [...fixture, [record]];
      const db = fakeDb(rows as unknown[]);
      await expect(warranty.createWarrantyClaim(input as any, owner)).rejects.toMatchObject({ code });
      expect(db.writes).toBe(0);
    }
  });
  it("counter failure rolls back mocked claim write rather than reporting success", async () => {
    const db = fakeDb([[battery], [record], [], [{ id: 88 }], new Error("offline injected update failure")]);
    await expect(warranty.createWarrantyClaim(claim as any, owner)).rejects.toThrow("offline injected update failure");
    expect(db.writes).toBe(0);
  });
  it("claim reads correlate warranty identity and review updates are admin scoped", async () => {
    const db = fakeDb([[record], [], [{ id: 88 }]]);
    await warranty.listWarrantyClaims(31, owner);
    expect(querySql(db.calls[1].where).sql).toContain('"warranty_records"."bpan" = "warranty_claims"."bpan"');
    await warranty.updateClaimStatus(88, "under_review", {}, admin);
    expect(querySql(db.calls[2].where).sql).toContain("exists");
    expect(db.calls[2].table).toBe(warrantyClaims);
  });
  it("profile reads authorize battery before private query and hide absent/foreign local IDs uniformly", async () => {
    const db = fakeDb([[battery], [], []]);
    await expect(regulatory.getRegulatoryProfilesForBattery(7, owner)).resolves.toEqual([]);
    expect(querySql(db.calls[1].where).params).toEqual([7, 11]);
    await expect(regulatory.getRegulatoryProfileByLocalId("EU", "foreign-id", owner)).rejects.toMatchObject({ code: "NOT_FOUND", message: "Resource not found" });
    expect(querySql(db.calls[2].where).params).toEqual(["EU", "foreign-id", 11]);
  });
  it("profile mutation rejects forged compliant/synced states without querying batteries", async () => {
    const db = fakeDb([]);
    for (const data of [{ bpan, profileData: {}, status: "compliant" }, { bpan, profileData: {}, govSyncStatus: "synced" }]) {
      await expect(regulatory.upsertRegulatoryProfile(7, "EU", data, owner)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    }
    expect(db.calls).toHaveLength(0);
    await expect(regulatory.updateRegulatoryProfileStatus(1, "compliant", "synced", admin)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
  it("profile insert locks owned battery and ignores caller IDs/timestamps", async () => {
    const db = fakeDb([[battery], [], [{ id: 5 }]]);
    await regulatory.upsertRegulatoryProfile(7, "EU", { id: 99, bpan, profileData: { note: "self-declared" }, lastCheckedAt: new Date(), status: "pending", govSyncStatus: "pending" }, owner);
    expect(db.calls[2].values).toMatchObject({ batteryId: 7, bpan, status: "pending", govSyncStatus: "pending", lastCheckedAt: null, lastGovSyncAt: null });
    expect(db.calls[2].values).not.toHaveProperty("id");
  });
  it("carbon/recycled writes derive actor and preserve unknown class/weighted total", async () => {
    const db = fakeDb([[battery], [{ id: 55 }], [battery], [{ id: 56 }]]);
    await regulatory.createCarbonFootprintDeclaration({ batteryId: 7, bpan, totalKgCo2e: "10", declaredById: 999, performanceClass: "A" }, owner);
    expect(db.calls[1].values).toMatchObject({ batteryId: 7, bpan, declaredById: 11, performanceClass: null, certifyingBody: null });
    await regulatory.createRecycledContentDeclaration({ batteryId: 7, bpan, cobaltPct: "0", totalRecycledPct: "100", declaredById: 999 }, owner);
    expect(db.calls[3].values).toMatchObject({ declaredById: 11, cobaltPct: "0", totalRecycledPct: null, verificationMethod: "SELF_DECLARED" });
  });
  it("declaration identity mismatch and fabricated certification reject before writes", async () => {
    const db = fakeDb([[battery]]);
    await expect(regulatory.createCarbonFootprintDeclaration({ batteryId: 7, bpan: "B".repeat(21), totalKgCo2e: "10", declaredById: 11 }, owner)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(regulatory.createRecycledContentDeclaration({ batteryId: 7, bpan, cobaltPct: "10", verificationMethod: "CERTIFIED_LAB", declaredById: 11 }, owner)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(db.writes).toBe(0);
  });
  it("batch recycled status emits no false existence entry for foreign IDs", async () => {
    const db = fakeDb([[{ bpan }], [{ bpan }]]);
    const result = await regulatory.batchGetRecycledContentStatus([bpan, "B".repeat(21)], owner);
    expect([...result.entries()]).toEqual([[bpan, true]]);
    expect(querySql(db.calls[0].where).params).toContain(11);
    expect(querySql(db.calls[1].where).params).toContain(11);
  });
  it("settings cannot cross users and global defaults require admin", async () => {
    await expect(regulatory.getPlatformSettings(12, owner)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(regulatory.upsertPlatformSettings(12, {}, owner)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(regulatory.upsertGlobalPlatformSettings({}, owner)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getDb).not.toHaveBeenCalled();
    const db = fakeDb([[], [{ id: 1, userId: null }]]);
    await expect(regulatory.getPlatformSettings(11, owner)).resolves.toMatchObject({ userId: null });
    expect(querySql(db.calls[1].where).sql).toContain('"platform_settings"."userId" is null');
  });
});

describe("pure boundary fixtures", () => {
  it("uses shared existing-ID compatibility for both lengths without normalizing identity", async () => {
    expect(bpanReadSchema.safeParse("A".repeat(19)).success).toBe(true);
    expect(bpanReadSchema.safeParse("A".repeat(21)).success).toBe(true);
    expect(bpanReadSchema.safeParse("a".repeat(21)).success).toBe(false);
    expect(() => assertCanonicalIdentity(battery, { batteryId: 0, bpan })).toThrow("Battery identity mismatch");
    const db = fakeDb([]);
    await expect(getOwnedCanonicalBattery(db, { batteryId: 0 }, owner)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.calls).toHaveLength(0);
  });
  it.each(["expired", "pending_activation", "voided", "suspended", "claimed"])("honors explicit %s status over valid dates", status => {
    expect(warranty.computeWarrantyStatus({ ...record, status }, new Date("2026-11-18"))).toMatchObject({ effectiveStatus: status, isInWarranty: false });
  });
  it("invalid dates fail closed instead of active/NaN", () => {
    expect(warranty.computeWarrantyStatus({ ...record, warrantyEndDate: new Date("invalid") })).toEqual({ effectiveStatus: "data_incomplete", isInWarranty: false, daysRemaining: 0 });
  });
  it("clamps UTC month-end terms and rejects a inconsistent supplied end date", () => {
    const start = new Date("2028-01-31T12:34:00Z");
    expect(warrantyTermEndDate(start, 1).toISOString()).toBe("2028-02-29T12:34:00.000Z");
    expect(warrantyTermEndDate(new Date("2027-01-31T12:34:00Z"), 1).toISOString()).toBe("2027-02-28T12:34:00.000Z");
    expect(() => validateWarrantyDates({ purchaseDate: start, warrantyStartDate: start, warrantyEndDate: new Date("2028-03-02T12:34:00Z"), warrantyTermMonths: 1 })).toThrow("Invalid warranty dates or term");
  });
  it.each([
    { totalKgCo2e: "-1" }, { totalKgCo2e: "NaN" }, { totalKgCo2e: "10", rawMaterialKgCo2e: "-1" },
    { totalKgCo2e: "10", rawMaterialKgCo2e: "2", productionKgCo2e: "2", distributionKgCo2e: "2", endOfLifeKgCo2e: "2" },
    { totalKgCo2e: "10", certifyingBody: "Unverified claim" },
  ])("rejects invalid/inconsistent carbon %j", data => { expect(() => validateSelfDeclaredCarbon(data)).toThrow(); });
  it("accepts reconciled stages including real zero", () => {
    expect(() => validateSelfDeclaredCarbon({ totalKgCo2e: "10", rawMaterialKgCo2e: "0", productionKgCo2e: "5", distributionKgCo2e: "3", endOfLifeKgCo2e: "2" })).not.toThrow();
  });
  it.each(["=1+1", "+100", "-2", "@SUM(1)", "  =1", "\t=1"])("neutralizes formula-leading customer/contact cell %j", value => {
    expect(warrantyCsvCell(value)).toBe(`"'${value}"`);
  });
  it("quotes commas, embedded quotes, newlines and preserves column boundaries", () => {
    expect(encodeWarrantyCsv([["Customer", "Phone"], ['A, "B"\nC', "+100"]])).toBe('"Customer","Phone"\r\n"A, ""B""\nC","\'+100"\r\n');
  });
});
