import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  db: {} as Record<string, any>,
  connect: vi.fn().mockResolvedValue({ release: vi.fn() }),
  listRules: vi.fn(),
  getRule: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  toggleRule: vi.fn(),
  deleteRule: vi.fn(),
}));

// No real pool, network, credentials, environment changes, or external providers.
vi.mock("pg", () => ({
  Pool: class {
    on() {}
    connect = mocks.connect;
  },
}));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: () => mocks.db }));
vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue(mocks.db),
    listAlertRules: mocks.listRules,
    getAlertRuleById: mocks.getRule,
    createAlertRule: mocks.createRule,
    updateAlertRule: mocks.updateRule,
    toggleAlertRule: mocks.toggleRule,
    deleteAlertRule: mocks.deleteRule,
    // markAlertRead/listAlerts/unreadCount retain their real implementations.
  };
});

import { appRouter } from "./routers";
import { markAlertRead } from "./db";

const dialect = new PgDialect();
const owner = { id: 7, role: "user", openId: "owner" } as TrpcContext["user"];
const admin = { id: 1, role: "admin", openId: "admin" } as TrpcContext["user"];
const caller = (user: TrpcContext["user"]) =>
  appRouter.createCaller({
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user,
  });
type Caller = ReturnType<typeof caller>;
type AlertRow = { id: number; userId: number | null; read: boolean };
let rows: AlertRow[];
let updateQueries: { sql: string; params: unknown[] }[];
let readQueries: { sql: string; params: unknown[] }[];
let rejectUpdate: boolean;
const foreignRule = {
  id: 91,
  createdBy: 42,
  name: "Global thermal rule",
  threshold: "55",
};
const createInput = {
  name: "Global thermal rule",
  metric: "temperature" as const,
  operator: "gt" as const,
  threshold: 55,
};

beforeEach(() => {
  vi.clearAllMocks();
  rows = [
    { id: 10, userId: 7, read: false },
    { id: 11, userId: 42, read: false },
    { id: 12, userId: null, read: false },
    { id: 13, userId: 7, read: true },
  ];
  updateQueries = [];
  readQueries = [];
  rejectUpdate = false;
  mocks.listRules.mockResolvedValue({ items: [foreignRule], total: 1 });
  mocks.getRule.mockResolvedValue(foreignRule);
  mocks.createRule.mockImplementation(async input => ({ id: 92, ...input }));
  mocks.updateRule.mockResolvedValue(undefined);
  mocks.toggleRule.mockResolvedValue(undefined);
  mocks.deleteRule.mockResolvedValue(undefined);

  // Capture the real Drizzle predicate; emulate only its bound ID/owner equality.
  mocks.db.update = vi.fn(() => ({
    set: vi.fn(values => ({
      where: vi.fn((predicate: SQL) => ({
        returning: vi.fn(async () => {
          if (rejectUpdate) throw new Error("Mock database update unavailable");
          const query = dialect.sqlToQuery(predicate);
          updateQueries.push(query);
          const matched = rows.filter(
            row =>
              row.id === query.params[0] &&
              (query.params.length === 1 || row.userId === query.params[1])
          );
          matched.forEach(row => Object.assign(row, values));
          return matched.map(({ id }) => ({ id }));
        }),
      })),
    })),
  }));
  mocks.db.select = vi.fn(selection => {
    let matched = rows;
    const query = {
      from: vi.fn(() => query),
      where: vi.fn((predicate?: SQL) => {
        if (predicate) {
          const compiled = dialect.sqlToQuery(predicate);
          readQueries.push(compiled);
          const ownerId = compiled.params.find(
            value => typeof value === "number"
          );
          matched = rows.filter(
            row =>
              (ownerId === undefined || row.userId === ownerId) &&
              (!compiled.params.includes(false) || !row.read)
          );
        }
        return query;
      }),
      orderBy: vi.fn(() => query),
      limit: vi.fn(async (limit: number) => matched.slice(0, limit)),
      then: (resolve: (value: unknown) => unknown) =>
        resolve(selection?.count ? [{ count: matched.length }] : matched),
    };
    return query;
  });
});

function expectNoDbAccess() {
  expect(mocks.db.update).not.toHaveBeenCalled();
  expect(mocks.db.select).not.toHaveBeenCalled();
  for (const mock of [
    mocks.listRules,
    mocks.getRule,
    mocks.createRule,
    mocks.updateRule,
    mocks.toggleRule,
    mocks.deleteRule,
  ]) {
    expect(mock).not.toHaveBeenCalled();
  }
}

const globalOperations: [string, (c: Caller) => Promise<unknown>][] = [
  ["alerts.listAll", c => c.alerts.listAll({})],
  ["alertRules.list", c => c.alertRules.list({})],
  ["alertRules.getById", c => c.alertRules.getById({ id: 91 })],
  ["alertRules.create", c => c.alertRules.create(createInput)],
  ["alertRules.update", c => c.alertRules.update({ id: 91, threshold: 60 })],
  ["alertRules.toggle", c => c.alertRules.toggle({ id: 91, enabled: false })],
  ["alertRules.delete", c => c.alertRules.delete({ id: 91 })],
  ["alertRules.getDefaults", c => c.alertRules.getDefaults()],
];

describe("global alert access is administrator-only", () => {
  it.each(globalOperations)(
    "rejects anonymous %s without database access",
    async (_name, invoke) => {
      await expect(invoke(caller(null))).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expectNoDbAccess();
    }
  );
  it.each(globalOperations)(
    "rejects ordinary %s even for a foreign rule ID without database access",
    async (_name, invoke) => {
      await expect(invoke(caller(owner))).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expectNoDbAccess();
    }
  );
  it.each(globalOperations)(
    "allows administrator %s including foreign-created global rules",
    async (_name, invoke) => {
      await expect(invoke(caller(admin))).resolves.toBeDefined();
    }
  );
  it("does not grant rule administration merely because the ordinary caller created the rule", async () => {
    mocks.getRule.mockResolvedValue({ ...foreignRule, createdBy: owner!.id });
    await expect(
      caller(owner).alertRules.update({ id: 91, enabled: false })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expectNoDbAccess();
  });
  it("records the authenticated administrator as creator and converts the threshold", async () => {
    await caller(admin).alertRules.create(createInput);
    expect(mocks.createRule).toHaveBeenCalledWith({
      ...createInput,
      threshold: "55",
      createdBy: 1,
      severity: "warning",
      enabled: true,
      bpan: null,
      chemistry: null,
      description: null,
    });
  });
  it("allows the administrator to list all alert ownership scopes", async () => {
    expect(
      (await caller(admin).alerts.listAll({ limit: 100 })).map(row => row.id)
    ).toEqual([10, 11, 12, 13]);
    expect(readQueries).toEqual([]);
  });
});

const scopedOperations: [string, (c: Caller) => Promise<unknown>][] = [
  ["alerts.list", c => c.alerts.list({})],
  ["alerts.unreadCount", c => c.alerts.unreadCount()],
  ["alerts.markRead", c => c.alerts.markRead({ id: 10 })],
];

describe("ordinary alerts retain their protected owner-scoped contract", () => {
  it.each(scopedOperations)(
    "rejects anonymous %s without database access",
    async (_name, invoke) => {
      await expect(invoke(caller(null))).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      expectNoDbAccess();
    }
  );
  it("lists only the authenticated owner's alerts, ignoring a supplied userId", async () => {
    const result = await caller(owner).alerts.list({
      limit: 50,
      userId: 42,
    } as any);
    expect(result.map(row => row.id)).toEqual([10, 13]);
    expect(readQueries[0]).toMatchObject({
      sql: '"alerts"."userId" = $1',
      params: [7],
    });
  });
  it("counts only unread alerts owned by the authenticated user", async () => {
    expect(await caller(owner).alerts.unreadCount()).toBe(1);
    expect(readQueries[0]).toMatchObject({ params: [false, 7] });
  });
  it("keeps administrator list/unreadCount scoped instead of implicitly global", async () => {
    expect(await caller(admin).alerts.list({})).toEqual([]);
    expect(await caller(admin).alerts.unreadCount()).toBe(0);
    expect(readQueries.map(query => query.params)).toEqual([[1], [false, 1]]);
  });
});

describe("markRead ownership is enforced atomically", () => {
  it("updates the owner's row with an ID AND userId predicate and no preliminary read", async () => {
    expect(await caller(owner).alerts.markRead({ id: 10 })).toEqual({
      success: true,
    });
    expect(updateQueries).toEqual([
      {
        sql: '("alerts"."id" = $1 and "alerts"."userId" = $2)',
        params: [10, 7],
        typings: ["none", "none"],
      },
    ]);
    expect(mocks.db.select).not.toHaveBeenCalled();
    expect(rows.find(row => row.id === 10)?.read).toBe(true);
    expect(rows.find(row => row.id === 11)?.read).toBe(false);
  });
  it.each([11, 12, 999])(
    "denies foreign, unowned, or missing alert %s without modifying any row",
    async id => {
      const before = structuredClone(rows);
      await expect(caller(owner).alerts.markRead({ id })).rejects.toMatchObject(
        { code: "NOT_FOUND", message: "Alert not found" }
      );
      expect(rows).toEqual(before);
      expect(updateQueries[0]).toMatchObject({ params: [id, 7] });
      expect(mocks.db.select).not.toHaveBeenCalled();
    }
  );
  it("cannot forge administrator scope or ownership in request input", async () => {
    await expect(
      caller(owner).alerts.markRead({ id: 11, admin: true, userId: 42 } as any)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(updateQueries[0]).toMatchObject({ params: [11, 7] });
    expect(rows.find(row => row.id === 11)?.read).toBe(false);
  });
  it.each([11, 12])(
    "explicitly lets administrators acknowledge foreign/unowned alert %s",
    async id => {
      expect(await caller(admin).alerts.markRead({ id })).toEqual({
        success: true,
      });
      expect(updateQueries[0]).toMatchObject({
        sql: '"alerts"."id" = $1',
        params: [id],
      });
      expect(rows.find(row => row.id === id)?.read).toBe(true);
    }
  );
  it("returns NOT_FOUND to administrators for a missing alert", async () => {
    await expect(
      caller(admin).alerts.markRead({ id: 999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "Alert not found" });
  });
  it("is idempotent for an owned already-read alert", async () => {
    expect(await caller(owner).alerts.markRead({ id: 13 })).toEqual({
      success: true,
    });
  });
  it("propagates an update failure instead of claiming successful acknowledgement", async () => {
    rejectUpdate = true;
    await expect(
      caller(owner).alerts.markRead({ id: 10 })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(rows.find(row => row.id === 10)?.read).toBe(false);
  });
  it("fails closed if a direct database-helper caller omits scope", async () => {
    await expect((markAlertRead as any)(11)).rejects.toThrow(
      "Invalid alert acknowledgement scope"
    );
    expectNoDbAccess();
  });
  it.each([0, -1, 1.5, NaN, undefined])(
    "fails closed for invalid direct-helper owner %s",
    async userId => {
      await expect((markAlertRead as any)(11, { userId })).rejects.toThrow(
        "Invalid alert acknowledgement scope"
      );
      expectNoDbAccess();
    }
  );
});

const invalidIds = [
  0,
  -1,
  1.5,
  2147483648,
  Number.MAX_SAFE_INTEGER,
  NaN,
  Infinity,
  "91",
  null,
  undefined,
];
const idOperations: [string, (c: Caller, id: any) => Promise<unknown>][] = [
  ["alerts.markRead", (c, id) => c.alerts.markRead({ id })],
  ["alertRules.getById", (c, id) => c.alertRules.getById({ id })],
  ["alertRules.update", (c, id) => c.alertRules.update({ id, enabled: false })],
  ["alertRules.toggle", (c, id) => c.alertRules.toggle({ id, enabled: false })],
  ["alertRules.delete", (c, id) => c.alertRules.delete({ id })],
];

describe("invalid IDs are rejected before database access", () => {
  for (const [name, invoke] of idOperations) {
    it.each(invalidIds)(`${name} rejects invalid ID %s`, async id => {
      await expect(invoke(caller(admin), id)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expectNoDbAccess();
    });
  }
});

describe("missing global rules never report successful administration", () => {
  it.each(idOperations.slice(1))(
    "%s returns NOT_FOUND for an absent rule",
    async (_name, invoke) => {
      mocks.getRule.mockResolvedValue(undefined);
      await expect(invoke(caller(admin), 999)).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Alert rule not found",
      });
      expect(mocks.updateRule).not.toHaveBeenCalled();
      expect(mocks.toggleRule).not.toHaveBeenCalled();
      expect(mocks.deleteRule).not.toHaveBeenCalled();
    }
  );
});
