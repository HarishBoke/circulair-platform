import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";
import { sql, type SQL, type Table } from "drizzle-orm";
import { createProposedOwnershipHarness } from "./resourceOwnership.proposedRouterFixture";
import {
  addOwnedServiceRecord, appendOwnedChatMessage, batteryIdentityInput, batteryOwnerPredicate,
  batteryResourcePredicate, conversationMessageInput, createOwnedChatSession, getOwnedBattery,
  getOwnedChatMessages, getOwnedChatSessions, getOwnedServiceHistory, pendingYieldInput,
  listOwnedBatteries, getOwnedBatteryStats,
  getOwnedBatteryDetail, getOwnedBatteryRelated,
  prepareOwnedChat, recordPendingOwnedYield, resourceActor, sessionResourcePredicate,
  updateOwnedBatteryStatus, withOwnedBattery,
} from "./resourceOwnership";

// No db.ts/router/main import, environment reads, socket, provider, pg Pool or network.
const dialect = new PgDialect();
const owner = { id: 7, role: "user" };
const other = { id: 42, role: "user" };
const admin = { id: 1, role: "admin" };
const BPAN = "XXABC1234567890123456";
const FOREIGN = "XXDEF1234567890123456";
const UNOWNED = "XXGHI1234567890123456";
const MISSING = "XXJKL1234567890123456";
const tokenId = "EPR0000000000000001";
type Row = Record<string, any>;
let rows: Record<string, Row[]>;
let queries: { op: string; table: string; sql?: string; params?: unknown[]; lock?: string; values?: Row }[];
let failInsert: boolean;
let failUpdate: boolean;
let db: any;

function compiled(predicate: SQL) { return dialect.sqlToQuery(predicate); }
function tableName(table: Table) { return getTableConfig(table as any).name; }
function matches(table: string, row: Row, predicate?: SQL) {
  if (!predicate) return true;
  const query = compiled(predicate);
  // Emulate the narrow equality/OR predicates produced by the actual helper.
  // SQL shape itself is separately asserted; no real DB executor is implied.
  if (table === "batteries") {
    if (query.sql.includes('"bpan"') && row.bpan !== query.params[0]) return false;
    const ownerParam = query.sql.includes('"ownerId"') ? query.params[query.sql.includes('"bpan"') ? 1 : 0] : undefined;
    if (ownerParam !== undefined && row.ownerId !== ownerParam) return false;
    if (query.sql.includes('"id"') && row.id !== query.params.at(-1)) return false;
    return true;
  }
  if (table === "chat_sessions") {
    if (query.sql.includes('"id"') && row.id !== query.params[0]) return false;
    if (query.sql.includes('"userId"') && row.userId !== query.params.at(-1)) return false;
    return true;
  }
  if (table === "epr_tokens") {
    return (row.batteryId === query.params[0] || row.bpan === query.params[1]) && ["pending", "verified"].includes(row.status);
  }
  if (table === "chat_messages") return row.sessionId === query.params[0];
  if (table === "service_history") return row.bpan === query.params[0] && row.batteryId === query.params[1];
  if (table === "telemetry" || table === "soh_predictions") return row.bpan === query.params[0] && row.batteryId === query.params[1];
  return false;
}
function makeDb() {
  const fake: any = {};
  let queue = Promise.resolve();
  fake.transaction = vi.fn((callback: (tx: any) => Promise<any>) => {
    const result = queue.then(async () => {
      const snapshot = structuredClone(rows);
      try { return await callback(fake); }
      catch (error) { rows = snapshot; throw error; }
    });
    queue = result.then(() => undefined, () => undefined);
    return result;
  });
  fake.select = vi.fn((selection?: Row) => {
    let table = ""; let predicate: SQL | undefined; let limit = Infinity; let descending = false;
    let offset = 0; let grouped = false;
    let executed = false; let result: Row[];
    const execute = () => {
      if (!executed) {
        executed = true;
        const query = predicate ? compiled(predicate) : undefined;
        queries.push({ op: "select", table, sql: query?.sql, params: query?.params });
        result = rows[table].filter(row => matches(table, row, predicate));
        if (descending) result = [...result].sort((a, b) => b.id - a.id);
        if (grouped) {
          const counts = new Map<string, number>();
          result.forEach(row => counts.set(row.status, (counts.get(row.status) ?? 0) + 1));
          result = [...counts].map(([status, count]) => ({ status, count }));
        } else if (selection?.count) result = [{ count: result.length }];
        else result = result.slice(offset, offset + limit);
      }
      return Promise.resolve(result!);
    };
    const builder: any = {
      from: (value: Table) => { table = tableName(value); return builder; },
      where: (value: SQL) => { predicate = value; return builder; },
      orderBy: (...order: SQL[]) => { descending = order.some(value => compiled(sql`${value}`).sql.includes("desc")); return builder; },
      limit: (value: number) => { limit = value; return builder; },
      offset: (value: number) => { offset = value; return builder; },
      groupBy: () => { grouped = true; return builder; },
      for: (lock: string) => { queries.push({ op: "lock", table, lock }); return builder; },
      then: (resolve: any, reject: any) => execute().then(resolve, reject),
    };
    return builder;
  });
  fake.insert = vi.fn((value: Table) => ({ values: (values: Row) => {
    const table = tableName(value);
    let result: Row[] | undefined;
    const execute = async () => {
      if (failInsert) throw new Error("Offline insert failure");
      if (!result) {
        queries.push({ op: "insert", table, values });
        const inserted = { id: Math.max(0, ...rows[table].map(row => row.id)) + 1, ...values };
        rows[table].push(inserted); result = [inserted];
      }
      return result;
    };
    return { returning: execute, then: (resolve: any, reject: any) => execute().then(resolve, reject) };
  } }));
  fake.update = vi.fn((value: Table) => ({ set: (values: Row) => ({ where: (predicate: SQL) => {
    const table = tableName(value);
    let result: Row[] | undefined;
    const execute = async () => {
      if (failUpdate) throw new Error("Offline update failure");
      if (!result) {
        const query = compiled(predicate);
        queries.push({ op: "update", table, sql: query.sql, params: query.params, values });
        const selected = rows[table].filter(row => matches(table, row, predicate));
        selected.forEach(row => Object.assign(row, values)); result = selected;
      }
      return result;
    };
    return { returning: execute, then: (resolve: any, reject: any) => execute().then(resolve, reject) };
  } }) }));
  return fake;
}
beforeEach(() => {
  rows = {
    batteries: [
      { id: 10, bpan: BPAN, ownerId: 7, registeredById: 42, status: "operational", currentSoh: "90.00" },
      { id: 11, bpan: FOREIGN, ownerId: 42, registeredById: 7, status: "operational" },
      { id: 12, bpan: UNOWNED, ownerId: null, registeredById: 7, status: "operational" },
    ],
    chat_sessions: [{ id: 10, userId: 7 }, { id: 11, userId: 42 }],
    chat_messages: [{ id: 1, sessionId: 10, role: "user", content: "earlier" }, { id: 2, sessionId: 11, role: "user", content: "private foreign" }],
    epr_tokens: [], service_history: [{ id: 1, bpan: BPAN, batteryId: 10 }, { id: 2, bpan: BPAN, batteryId: 11 }],
    telemetry: [{ id: 1, bpan: BPAN, batteryId: 10 }, { id: 2, bpan: BPAN, batteryId: 11 }],
    soh_predictions: [{ id: 1, bpan: BPAN, batteryId: 10 }, { id: 2, bpan: BPAN, batteryId: 11 }],
  };
  queries = []; failInsert = false; failUpdate = false; db = makeDb();
});
const invalidIds = [0, -1, 1.5, 2147483648, Number.MAX_SAFE_INTEGER, NaN, Infinity, "10", null, undefined];
const validYield = { bpan: BPAN, batteryId: 10, actualYieldKg: 90, theoreticalYieldKg: 100, blackMassKg: 0, lithiumRecoveredKg: 0 };

describe("canonical inputs and authenticated actor", () => {
  it.each(invalidIds)("rejects invalid actor ID %s before any DB access", id => {
    expect(() => resourceActor({ id: id as number, role: "admin" })).toThrowError(expect.objectContaining({ code: "UNAUTHORIZED" }));
    expect(queries).toEqual([]);
  });
  it.each(invalidIds)("rejects invalid session ID %s", async id => {
    await expect(getOwnedChatMessages(db, owner, id)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it.each(invalidIds.filter(id => id !== undefined))("rejects invalid supplied battery ID %s", async id => {
    await expect(getOwnedBattery(db, owner, { bpan: BPAN, batteryId: id })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.select).not.toHaveBeenCalled();
  });
  it.each(["", "lowercase12345678901", " BPAN ", "XXABC123456789012345", "XXABC12345678901234567"])("rejects noncanonical BPAN %s", bpan => {
    expect(batteryIdentityInput.safeParse({ bpan }).success).toBe(false);
  });
  it("accepts exact legacy 19 and generated 21 character IDs without interpreting their segments", () => {
    expect(batteryIdentityInput.safeParse({ bpan: "X".repeat(19) }).success).toBe(true);
    expect(batteryIdentityInput.safeParse({ bpan: BPAN }).success).toBe(true);
  });
  it("copies only trusted actor fields; rejects request ownership/admin fields", () => {
    expect(resourceActor({ ...owner, admin: true, ownerId: 42 } as any)).toEqual(owner);
    expect(Object.isFrozen(resourceActor(owner))).toBe(true);
    expect(batteryIdentityInput.safeParse({ bpan: BPAN, ownerId: 42, admin: true }).success).toBe(false);
    expect(conversationMessageInput.safeParse({ sessionId: 10, message: "x", userId: 42 }).success).toBe(false);
    expect(pendingYieldInput.safeParse({ ...validYield, recyclerId: 42 }).success).toBe(false);
  });
  it.each(["", "  ", "x".repeat(8001)])("rejects blank/unbounded chat messages", message => {
    expect(conversationMessageInput.safeParse({ sessionId: 10, message }).success).toBe(false);
  });
});

describe("battery resource ownership", () => {
  it("reads only current-owner battery with SQL owner predicate", async () => {
    expect((await getOwnedBattery(db, owner, { bpan: BPAN })).id).toBe(10);
    expect(queries[0]).toMatchObject({ params: [BPAN, 7] });
    expect(queries[0].sql).toContain('"batteries"."ownerId"');
    expect(queries[0].sql).not.toContain("registeredById");
  });
  it.each([FOREIGN, UNOWNED, MISSING])("uniformly denies foreign, former-registrant, null-owner and missing %s", async bpan => {
    await expect(getOwnedBattery(db, owner, { bpan })).rejects.toMatchObject({ code: "NOT_FOUND", message: "Resource not found" });
  });
  it("does not grant ownership merely because caller originally registered the battery", async () => {
    await expect(getOwnedBattery(db, owner, { bpan: FOREIGN })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await getOwnedBattery(db, other, { bpan: FOREIGN })).id).toBe(11);
  });
  it.each([FOREIGN, UNOWNED])("allows exact server admin role to access %s", async bpan => {
    expect((await getOwnedBattery(db, admin, { bpan })).bpan).toBe(bpan);
    expect(compiled(batteryOwnerPredicate(admin))).toMatchObject({ sql: "true", params: [] });
  });
  it("does not treat platform or uppercased role as admin", async () => {
    await expect(getOwnedBattery(db, { id: 7, role: "ADMIN" }, { bpan: FOREIGN })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects forged pair with same not-found response", async () => {
    await expect(getOwnedBattery(db, owner, { bpan: BPAN, batteryId: 11 })).rejects.toMatchObject({ code: "NOT_FOUND", message: "Resource not found" });
    expect(compiled(batteryResourcePredicate(owner, { bpan: BPAN, batteryId: 10 })).params).toEqual([BPAN, 7, 10]);
  });
  it("performs atomic owner-scoped status update and preserves zero SOH", async () => {
    expect(await updateOwnedBatteryStatus(db, owner, { bpan: BPAN, status: "end_of_life", soh: 0 })).toEqual({ success: true });
    expect(db.select).not.toHaveBeenCalled();
    expect(queries[0]).toMatchObject({ op: "update", params: [BPAN, 7], values: { currentSoh: "0.00", status: "end_of_life" } });
  });
  it.each([FOREIGN, UNOWNED, MISSING])("does not report successful update for inaccessible %s", async bpan => {
    const before = structuredClone(rows);
    await expect(updateOwnedBatteryStatus(db, owner, { bpan, status: "recycling" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(rows).toEqual(before);
  });
  it.each([-1, 101, Infinity])("rejects invalid SOH %s before writing", async soh => {
    await expect(updateOwnedBatteryStatus(db, owner, { bpan: BPAN, status: "recycling", soh })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.update).not.toHaveBeenCalled();
  });
  it("rejects caller-controlled ownership in status input", async () => {
    await expect(updateOwnedBatteryStatus(db, owner, { bpan: FOREIGN, status: "recycling", admin: true, ownerId: 42 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.update).not.toHaveBeenCalled();
  });
  it("locks battery before invoking related-row callback and suppresses callback on denied access", async () => {
    const callback = vi.fn(async (_tx, battery) => battery.id);
    expect(await withOwnedBattery(db, owner, { bpan: BPAN }, callback)).toBe(10);
    expect(queries[0]).toMatchObject({ op: "lock", table: "batteries", lock: "update" });
    await expect(withOwnedBattery(db, owner, { bpan: FOREIGN }, callback)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it("propagates persistence failure rather than fake update success", async () => {
    failUpdate = true;
    await expect(updateOwnedBatteryStatus(db, owner, { bpan: BPAN, status: "recycling" })).rejects.toThrow("Offline update failure");
    expect(rows.batteries[0].status).toBe("operational");
  });
  it("uses identical owner predicates for list rows and full count", async () => {
    const result = await listOwnedBatteries(db, owner, {});
    expect(result.items.map(row => row.id)).toEqual([10]);
    expect(result.total).toBe(1);
    expect(queries.map(q => q.params)).toEqual([[7], [7]]);
  });
  it("admin registry list includes unowned rows and respects pagination", async () => {
    const result = await listOwnedBatteries(db, admin, { limit: 1, offset: 1 });
    expect(result.items.map(row => row.id)).toEqual([11]); expect(result.total).toBe(3);
  });
  it("does not grant aggregate access from registration; admin includes all", async () => {
    expect(await getOwnedBatteryStats(db, owner)).toMatchObject({ total: 1, operational: 1 });
    expect(await getOwnedBatteryStats(db, admin)).toMatchObject({ total: 3, operational: 3 });
  });
  it.each([{ limit: 0 }, { limit: 101 }, { offset: -1 }, { ownerId: 42 }])("rejects invalid or caller-scoped registry filters %j", async value => {
    await expect(listOwnedBatteries(db, owner, value)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.select).not.toHaveBeenCalled();
  });
  it("detail derives both child identifiers, locks ownership, and explicitly withholds private warranty fields", async () => {
    const result = await getOwnedBatteryDetail(db, owner, BPAN);
    expect(result).toMatchObject({ battery: { id: 10 }, latestTelemetry: { id: 1 }, latestSoh: { id: 1 },
      warranties: [], activeWarranty: null, warrantyAvailability: "withheld_use_owned_warranty_route" });
    expect(result.serviceHistory.map(row => row.id)).toEqual([1]);
    expect(queries.filter(q => ["telemetry", "soh_predictions", "service_history"].includes(q.table)).map(q => q.params))
      .toEqual([[BPAN, 10], [BPAN, 10], [BPAN, 10]]);
  });
  it.each(["telemetryLatest", "telemetryHistory", "predictionLatest", "predictionHistory"] as const)("related %s filters canonical pair and denies foreign rows", async kind => {
    expect((await getOwnedBatteryRelated(db, owner, { bpan: BPAN, limit: 20 }, kind)).map(row => row.id)).toEqual([1]);
    await expect(getOwnedBatteryRelated(db, owner, { bpan: FOREIGN }, kind)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("service lifecycle", () => {
  it("derives canonical battery/provider IDs, preserving zero and scoped history pair", async () => {
    await addOwnedServiceRecord(db, owner, { bpan: BPAN, serviceType: "inspection", sohBefore: 0, sohAfter: 0, cycleCountAtService: 0 });
    expect(rows.service_history.at(-1)).toMatchObject({ batteryId: 10, serviceProviderId: 7, sohBefore: "0.00", sohAfter: "0.00", cycleCountAtService: 0 });
    const result = await getOwnedServiceHistory(db, owner, BPAN);
    expect(result.map(row => row.id)).toEqual([3, 1]);
    expect(queries.find(q => q.table === "service_history" && q.op === "select")).toMatchObject({ params: [BPAN, 10] });
  });
  it.each([FOREIGN, UNOWNED, MISSING])("denies service creation and reading %s", async bpan => {
    await expect(addOwnedServiceRecord(db, owner, { bpan, serviceType: "inspection" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getOwnedServiceHistory(db, owner, bpan)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.insert).not.toHaveBeenCalled();
  });
  it("rejects forged canonical pair", async () => {
    await expect(addOwnedServiceRecord(db, owner, { bpan: BPAN, batteryId: 11, serviceType: "inspection" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("assistant session access", () => {
  it("uses owner AND session predicate; admin override is exact", () => {
    expect(compiled(sessionResourcePredicate(owner, 10)).params).toEqual([10, 7]);
    expect(compiled(sessionResourcePredicate(admin, 10))).toMatchObject({ params: [10], sql: '("chat_sessions"."id" = $1 and true)' });
  });
  it.each([11, 999])("uniformly denies foreign/missing session %s read, append and prompt prep", async sessionId => {
    const before = structuredClone(rows);
    await expect(getOwnedChatMessages(db, owner, sessionId)).rejects.toMatchObject({ code: "NOT_FOUND", message: "Resource not found" });
    await expect(appendOwnedChatMessage(db, owner, sessionId, "user", "bad append")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(prepareOwnedChat(db, owner, { sessionId, message: "bad context" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(rows).toEqual(before); expect(db.insert).not.toHaveBeenCalled();
  });
  it("allows owner and admin direct resource access without mixing foreign history", async () => {
    expect((await getOwnedChatMessages(db, owner, 10)).map(row => row.content)).toEqual(["earlier"]);
    expect((await getOwnedChatMessages(db, admin, 11)).map(row => row.content)).toEqual(["private foreign"]);
    await appendOwnedChatMessage(db, admin, 11, "assistant", "admin reply");
    expect(rows.chat_messages.at(-1)).toMatchObject({ sessionId: 11, role: "assistant" });
  });
  it("session lists remain personal for both ordinary and admin callers", async () => {
    expect((await getOwnedChatSessions(db, owner)).map(row => row.id)).toEqual([10]);
    expect(await getOwnedChatSessions(db, admin)).toEqual([]);
  });
  it("creates session using INSERT RETURNING, avoiding newest-row race", async () => {
    const created = await createOwnedChatSession(db, owner, "  Session  ");
    expect(created).toMatchObject({ id: 12, userId: 7, title: "Session" });
    expect(db.select).not.toHaveBeenCalled();
  });
  it("prepares exactly one trimmed prompt append and updates session under a lock", async () => {
    const history = await prepareOwnedChat(db, owner, { sessionId: 10, message: "  question  " });
    expect(history).toEqual([{ role: "user", content: "earlier" }, { role: "user", content: "question" }]);
    expect(history.filter(message => message.content === "question")).toHaveLength(1);
    expect(rows.chat_messages.filter(row => row.content === "question")).toHaveLength(1);
    expect(queries[0]).toMatchObject({ op: "lock", table: "chat_sessions", lock: "update" });
    expect(queries.at(-1)).toMatchObject({ op: "update", params: [10, 7] });
  });
  it("denies foreign battery context before conversation write", async () => {
    await expect(prepareOwnedChat(db, owner, { sessionId: 10, message: "question", bpanContext: FOREIGN })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.insert).not.toHaveBeenCalled();
  });
  it("bounds history to latest 100 messages in chronological order", async () => {
    rows.chat_messages = Array.from({ length: 150 }, (_, i) => ({ id: i + 1, sessionId: 10, role: "user", content: String(i) }));
    const messages = await getOwnedChatMessages(db, owner, 10);
    expect(messages).toHaveLength(100); expect(messages[0].id).toBe(51); expect(messages.at(-1)?.id).toBe(150);
  });
  it("rolls back appended message when session timestamp update fails", async () => {
    failUpdate = true; const before = structuredClone(rows);
    await expect(prepareOwnedChat(db, owner, { sessionId: 10, message: "question" })).rejects.toThrow("Offline update failure");
    expect(rows).toEqual(before);
  });
  it("rechecks ownership before persisting delayed assistant reply", async () => {
    await prepareOwnedChat(db, owner, { sessionId: 10, message: "question" });
    rows.chat_sessions[0].userId = 42;
    await expect(appendOwnedChatMessage(db, owner, 10, "assistant", "reply")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(rows.chat_messages.some(row => row.content === "reply")).toBe(false);
  });
  it("rejects caller-selected system role", async () => {
    await expect(appendOwnedChatMessage(db, owner, 10, "system" as any, "fake instruction")).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.transaction).not.toHaveBeenCalled();
  });
});

describe("pending yield recording is not verified credit issuance", () => {
  const invalidYields = [
    { actualYieldKg: -90, theoreticalYieldKg: -100 },
    { actualYieldKg: -1 }, { theoreticalYieldKg: 0 }, { theoreticalYieldKg: -1 },
    { actualYieldKg: Infinity }, { actualYieldKg: NaN }, { actualYieldKg: 101 },
    { actualYieldKg: 0.0001 }, { theoreticalYieldKg: 10000000 },
    { blackMassKg: -1 }, { blackMassKg: 91 }, { lithiumRecoveredKg: 91 },
    { lithiumRecoveredKg: 60, cobaltRecoveredKg: 31 },
  ];
  it.each(invalidYields)("rejects invalid/negative/unbalanced masses %j before database access", async invalid => {
    await expect(recordPendingOwnedYield(db, owner, { ...validYield, ...invalid }, tokenId)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it("writes a single pending non-creditable record with canonical identity and null blockchain", async () => {
    const result = await recordPendingOwnedYield(db, owner, validYield, tokenId);
    expect(result).toMatchObject({ status: "pending", replayed: false, creditIssued: false, yieldRatio: 0.9 });
    expect(result.token).toMatchObject({ batteryId: 10, bpan: BPAN, recyclerId: 7, blackMassKg: "0.000", lithiumRecoveredKg: "0.000", status: "pending", blockchainTxHash: null, blockchainBlock: null, verifiedAt: null });
    expect(queries[0]).toMatchObject({ op: "lock", table: "batteries", lock: "update" });
    expect(queries.find(q => q.table === "epr_tokens" && q.op === "select")?.sql).toContain('"epr_tokens"."batteryId" = $1 or "epr_tokens"."bpan" = $2');
  });
  it.each([FOREIGN, UNOWNED, MISSING])("denies pending yield for inaccessible battery %s", async bpan => {
    await expect(recordPendingOwnedYield(db, owner, { ...validYield, bpan, batteryId: undefined }, tokenId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.insert).not.toHaveBeenCalled();
  });
  it("accepts zero actual yield but never marks it verified", async () => {
    const result = await recordPendingOwnedYield(db, owner, { ...validYield, actualYieldKg: 0 }, tokenId);
    expect(result).toMatchObject({ status: "pending", creditIssued: false, yieldRatio: 0 });
  });
  it("makes exact retries idempotent even with a new caller-independent token ID", async () => {
    const first = await recordPendingOwnedYield(db, owner, validYield, tokenId);
    const replay = await recordPendingOwnedYield(db, owner, validYield, "EPR0000000000000002");
    expect(replay).toMatchObject({ replayed: true, creditIssued: false });
    expect(replay.token.id).toBe(first.token.id); expect(rows.epr_tokens).toHaveLength(1);
  });
  it("serializes bounded concurrent retries to one insert in the fake transaction store", async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () => recordPendingOwnedYield(db, owner, validYield, tokenId)));
    expect(rows.epr_tokens).toHaveLength(1); expect(results.filter(r => r.replayed)).toHaveLength(3);
    expect(queries.filter(q => q.op === "insert" && q.table === "epr_tokens")).toHaveLength(1);
  });
  it("refuses changed retry masses or existing verified credit", async () => {
    await recordPendingOwnedYield(db, owner, validYield, tokenId);
    await expect(recordPendingOwnedYield(db, owner, { ...validYield, actualYieldKg: 89 }, tokenId)).rejects.toMatchObject({ code: "CONFLICT" });
    rows.epr_tokens[0].status = "verified";
    await expect(recordPendingOwnedYield(db, owner, validYield, tokenId)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(rows.epr_tokens).toHaveLength(1);
  });
  it.each([{ bpan: FOREIGN, batteryId: 10 }, { bpan: BPAN, batteryId: 11 }])("blocks legacy one-column identity conflict %j", async legacy => {
    rows.epr_tokens = [{ id: 1, ...legacy, status: "verified", recyclerId: 42 }];
    await expect(recordPendingOwnedYield(db, owner, validYield, tokenId)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.insert).not.toHaveBeenCalled();
  });
  it("refuses an admin retry of another recycler's pending data rather than rebinding it", async () => {
    await recordPendingOwnedYield(db, owner, validYield, tokenId);
    await expect(recordPendingOwnedYield(db, admin, validYield, tokenId)).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("fails loudly and rolls back on insert failure", async () => {
    failInsert = true;
    await expect(recordPendingOwnedYield(db, owner, validYield, tokenId)).rejects.toThrow("Offline insert failure");
    expect(rows.epr_tokens).toEqual([]);
  });
});

describe("exact unapplied proposed tRPC handlers, extracted into offline fixture", () => {
  function harness(user: typeof owner | null = owner) {
    const provider = vi.fn().mockResolvedValue({ choices: [{ message: { content: "Mock assistant response" } }] });
    const caller = createProposedOwnershipHarness(db, provider).createCaller({ user: user as any, req: {} as any, res: {} as any });
    return { caller, provider };
  }
  const operations = [
    ["bpan.get", (c: any, foreign: boolean) => c.bpan.get({ bpan: foreign ? FOREIGN : BPAN })],
    ["bpan.updateStatus", (c: any, foreign: boolean) => c.bpan.updateStatus({ bpan: foreign ? FOREIGN : BPAN, status: "recycling" })],
    ["service.addRecord", (c: any, foreign: boolean) => c.service.addRecord({ bpan: foreign ? FOREIGN : BPAN, serviceType: "inspection" })],
    ["service.history", (c: any, foreign: boolean) => c.service.history({ bpan: foreign ? FOREIGN : BPAN })],
    ["epr.verifyYield", (c: any, foreign: boolean) => c.epr.verifyYield({ ...validYield, bpan: foreign ? FOREIGN : BPAN, batteryId: foreign ? 11 : 10 })],
    ["assistant.getMessages", (c: any, foreign: boolean) => c.assistant.getMessages({ sessionId: foreign ? 11 : 10 })],
    ["assistant.chat", (c: any, foreign: boolean) => c.assistant.chat({ sessionId: foreign ? 11 : 10, message: "question" })],
  ] as const;
  it.each(operations)("rejects anonymous %s before fake DB/provider calls", async (_name, invoke) => {
    const { caller, provider } = harness(null);
    await expect(invoke(caller, false)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(queries).toEqual([]); expect(provider).not.toHaveBeenCalled();
  });
  it.each(operations)("rejects foreign %s with uniform response and no write/provider calls", async (_name, invoke) => {
    const { caller, provider } = harness();
    const before = structuredClone(rows);
    await expect(invoke(caller, true)).rejects.toMatchObject({ code: "NOT_FOUND", message: "Resource not found" });
    expect(rows).toEqual(before); expect(provider).not.toHaveBeenCalled(); expect(db.insert).not.toHaveBeenCalled();
  });
  it("owned chat invokes mock provider once with one latest prompt, omitting private foreign history", async () => {
    const { caller, provider } = harness();
    expect(await caller.assistant.chat({ sessionId: 10, message: "  question  ", bpanContext: BPAN })).toEqual({ message: "Mock assistant response" });
    expect(provider).toHaveBeenCalledTimes(1);
    const sent = provider.mock.calls[0][0].messages;
    expect(sent.filter((m: any) => m.content === "question")).toHaveLength(1);
    expect(JSON.stringify(sent)).not.toContain("private foreign");
    expect(rows.chat_messages.at(-1)).toMatchObject({ sessionId: 10, role: "assistant", content: "Mock assistant response" });
  });
  it("foreign battery context denies owned conversation chat before provider/write", async () => {
    const { caller, provider } = harness();
    await expect(caller.assistant.chat({ sessionId: 10, message: "question", bpanContext: FOREIGN })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.insert).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled();
  });
  it("strict route input cannot forge owner, role, recycler or conversation owner", async () => {
    const { caller, provider } = harness();
    await expect(caller.bpan.updateStatus({ bpan: FOREIGN, status: "recycling", ownerId: 42, admin: true } as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.epr.verifyYield({ ...validYield, recyclerId: 42 } as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.assistant.chat({ sessionId: 11, message: "x", userId: 42 } as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(queries).toEqual([]); expect(provider).not.toHaveBeenCalled();
  });
  it("proposed yield route returns pending and never issues credit or reaches provider", async () => {
    const { caller, provider } = harness();
    expect(await caller.epr.verifyYield(validYield)).toMatchObject({ status: "pending", creditIssued: false, replayed: false });
    expect(provider).not.toHaveBeenCalled();
  });
});
