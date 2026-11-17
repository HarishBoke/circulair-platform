import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { resolvePostgresConnectionUrl } = require("../shared/databaseEnv.cjs") as
  typeof import("../shared/databaseEnv.cjs");

type DatabaseEnvironment = Parameters<typeof resolvePostgresConnectionUrl>[0];
const postgresUrl = "postgresql://fixture:fixture@example.invalid/app";
const alternateUrl = "postgres://fixture:fixture@alternate.invalid/other";
const configurationError =
  "A valid PostgreSQL URL is required in RENDER_DATABASE_URL or DATABASE_URL";

const mocks = vi.hoisted(() => ({
  env: {} as DatabaseEnvironment,
  pool: vi.fn(),
  connect: vi.fn(),
  release: vi.fn(),
  end: vi.fn(),
  on: vi.fn(),
  drizzle: vi.fn(),
}));

// Inject synthetic values without reading or modifying the runtime environment.
vi.mock("../shared/databaseEnv.cjs", async importOriginal => {
  const actual = await importOriginal<typeof import("../shared/databaseEnv.cjs")>();
  return {
    resolvePostgresConnectionUrl: () => actual.resolvePostgresConnectionUrl(mocks.env),
  };
});
vi.mock("./_core/env", () => ({ ENV: {} }));
vi.mock("./pagerDuty", () => ({
  pagerDutyConfig: vi.fn(),
  shouldPageAlert: vi.fn(),
  makePagerDutyEvent: vi.fn(),
}));
vi.mock("pg", () => ({ Pool: mocks.pool }));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: mocks.drizzle }));

import { getDb, resetDbConnection } from "./db";

beforeEach(() => {
  resetDbConnection();
  vi.clearAllMocks();
  mocks.env = {};
  mocks.connect.mockResolvedValue({ release: mocks.release });
  mocks.end.mockResolvedValue(undefined);
  mocks.pool.mockImplementation(() => ({
    connect: mocks.connect,
    end: mocks.end,
    on: mocks.on,
  }));
  mocks.drizzle.mockReturnValue({ fixture: true });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  resetDbConnection();
  vi.restoreAllMocks();
});

const rejected: [string, DatabaseEnvironment][] = [
  ["absent", {}],
  ["empty", { RENDER_DATABASE_URL: "", DATABASE_URL: "" }],
  ["whitespace", { RENDER_DATABASE_URL: " \n", DATABASE_URL: "\t" }],
  ["MySQL", { DATABASE_URL: "mysql://fixture:fixture@example.invalid/app" }],
  ["unsupported HTTPS", { DATABASE_URL: "https://example.invalid/app" }],
  ["unsupported PostgreSQL-like scheme", { DATABASE_URL: "postgresql+ssl://example.invalid/app" }],
  ["prefix without scheme", { DATABASE_URL: "postgres-not-a-url" }],
  ["missing slashes", { DATABASE_URL: "postgres:example.invalid/app" }],
  ["missing host", { DATABASE_URL: "postgresql:///app" }],
  ["bad IPv6", { DATABASE_URL: "postgres://[bad/app" }],
  ["invalid port", { DATABASE_URL: "postgres://example.invalid:bad/app" }],
  ["out-of-range port", { DATABASE_URL: "postgres://example.invalid:70000/app" }],
  ["embedded whitespace", { DATABASE_URL: "postgres://fixture:bad value@example.invalid/app" }],
  ["embedded control character", { DATABASE_URL: "postgres://fixture:bad\nvalue@example.invalid/app" }],
  ["backslash", { DATABASE_URL: "postgres://example.invalid/a\\b" }],
  ["bad percent escape", { DATABASE_URL: "postgres://fixture:%zz@example.invalid/app" }],
  ["bad UTF-8 escape", { DATABASE_URL: "postgres://fixture:%ff@example.invalid/app" }],
  ["fragment", { DATABASE_URL: "postgres://example.invalid/app#fragment" }],
  ["invalid Render and database", { RENDER_DATABASE_URL: "mysql://example.invalid/app", DATABASE_URL: "not-a-url" }],
  ["malformed selected Render blocks database", { RENDER_DATABASE_URL: "postgresql://[bad/app", DATABASE_URL: postgresUrl }],
  ["selected Render with missing host blocks database", { RENDER_DATABASE_URL: "postgresql:///app", DATABASE_URL: postgresUrl }],
];

const accepted: [string, DatabaseEnvironment, string][] = [
  ["PostgreSQL DATABASE_URL", { DATABASE_URL: postgresUrl }, postgresUrl],
  ["postgres alias", { DATABASE_URL: alternateUrl }, alternateUrl],
  ["Render only", { RENDER_DATABASE_URL: alternateUrl }, alternateUrl],
  ["explicit PostgreSQL Render priority", { RENDER_DATABASE_URL: alternateUrl, DATABASE_URL: postgresUrl }, alternateUrl],
  ["Render PostgreSQL overrides MySQL database", { RENDER_DATABASE_URL: alternateUrl, DATABASE_URL: "mysql://example.invalid/app" }, alternateUrl],
  ["Render PostgreSQL overrides malformed database", { RENDER_DATABASE_URL: alternateUrl, DATABASE_URL: "postgres://[bad/app" }, alternateUrl],
  ["empty Render does not override", { RENDER_DATABASE_URL: "", DATABASE_URL: postgresUrl }, postgresUrl],
  ["MySQL Render does not override PostgreSQL", { RENDER_DATABASE_URL: "mysql://example.invalid/app", DATABASE_URL: postgresUrl }, postgresUrl],
  ["unsupported Render does not override PostgreSQL", { RENDER_DATABASE_URL: "https://example.invalid/app", DATABASE_URL: postgresUrl }, postgresUrl],
  ["malformed non-PostgreSQL Render does not override", { RENDER_DATABASE_URL: "not-a-url", DATABASE_URL: postgresUrl }, postgresUrl],
  ["outer whitespace is trimmed", { DATABASE_URL: ` \n${postgresUrl}\t ` }, postgresUrl],
  ["case-insensitive scheme", { DATABASE_URL: "POSTGRESQL://example.invalid/app" }, "POSTGRESQL://example.invalid/app"],
  ["query parameters retained", { DATABASE_URL: `${postgresUrl}?sslmode=require&application_name=fixture` }, `${postgresUrl}?sslmode=require&application_name=fixture`],
  ["encoded credential characters retained", { DATABASE_URL: "postgres://fixture:fixture%40word@example.invalid/app" }, "postgres://fixture:fixture%40word@example.invalid/app"],
  ["host and default database permitted", { DATABASE_URL: "postgres://example.invalid" }, "postgres://example.invalid"],
  ["IPv6 and explicit port", { DATABASE_URL: "postgres://[::1]:5432/app" }, "postgres://[::1]:5432/app"],
];

describe("environment-only PostgreSQL resolver", () => {
  it.each(accepted)("accepts %s", (_name, env, expected) => {
    expect(resolvePostgresConnectionUrl(env)).toBe(expected);
  });
  it.each(rejected)("rejects %s with a URL-free error", (_name, env) => {
    let error: Error | undefined;
    try {
      resolvePostgresConnectionUrl(env);
    } catch (caught) {
      error = caught as Error;
    }
    expect(error?.message).toBe(configurationError);
    expect(error?.cause).toBeUndefined();
    expect(error?.stack).not.toContain("example.invalid");
    expect(mocks.pool).not.toHaveBeenCalled();
  });
});

describe("runtime database connection gate", () => {
  it.each(rejected)("does not construct or connect a pool for %s", async (_name, env) => {
    mocks.env = env;
    expect(await getDb()).toBeNull();
    expect(await getDb()).toBeNull();
    expect(mocks.pool).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(mocks.drizzle).not.toHaveBeenCalled();
    expect(vi.mocked(console.warn).mock.calls).toEqual([
      [`[Database] ${configurationError}`],
      [`[Database] ${configurationError}`],
    ]);
  });
  it.each([
    ["external", postgresUrl, { rejectUnauthorized: false }],
    ["localhost", "postgres://localhost/app", false],
    ["Render internal hostname", "postgres://dpg-fixture.invalid/app", false],
  ])("preserves %s pool options and successful connection reuse", async (_name, url, ssl) => {
    mocks.env = { DATABASE_URL: url as string };
    const db = await getDb();
    expect(await getDb()).toBe(db);
    expect(mocks.pool).toHaveBeenCalledOnce();
    expect(mocks.pool).toHaveBeenCalledWith({
      connectionString: url,
      ssl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(mocks.release).toHaveBeenCalledOnce();
    expect(mocks.drizzle).toHaveBeenCalledOnce();
  });
  it("does not expose driver-supplied URL errors and permits the existing retry", async () => {
    mocks.env = { DATABASE_URL: postgresUrl };
    mocks.connect.mockRejectedValueOnce(new Error(postgresUrl));
    expect(await getDb()).toBeNull();
    expect(vi.mocked(console.warn).mock.calls).toEqual([
      ["[Database] Failed to connect (attempt 1/5)"],
    ]);
    expect(await getDb()).toEqual({ fixture: true });
    expect(mocks.pool).toHaveBeenCalledTimes(2);
  });
  it("preserves pool-error reconnection without exposing driver messages", async () => {
    mocks.env = { DATABASE_URL: postgresUrl };
    await getDb();
    const onError = mocks.on.mock.calls.find(([event]) => event === "error")?.[1];
    expect(onError).toBeTypeOf("function");
    onError(new Error(postgresUrl));
    expect(vi.mocked(console.error).mock.calls).toEqual([
      ["[Database] Pool error (will attempt reconnect on next query)"],
    ]);
    await getDb();
    expect(mocks.pool).toHaveBeenCalledTimes(2);
  });
  it("keeps explicit pool reset and release behavior", async () => {
    mocks.env = { DATABASE_URL: postgresUrl };
    await getDb();
    resetDbConnection();
    expect(mocks.end).toHaveBeenCalledOnce();
    await getDb();
    expect(mocks.pool).toHaveBeenCalledTimes(2);
  });
});

describe("Drizzle environment-only configuration", () => {
  it.each(rejected)("rejects %s before any client can be constructed", async (_name, env) => {
    mocks.env = env;
    vi.resetModules();
    await expect(import("../drizzle.config")).rejects.toThrow(configurationError);
    expect(mocks.pool).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it("retains PostgreSQL dialect, schema, output and explicit Render priority", async () => {
    mocks.env = { RENDER_DATABASE_URL: alternateUrl, DATABASE_URL: postgresUrl };
    vi.resetModules();
    const { default: config } = await import("../drizzle.config");
    expect(config).toEqual({
      schema: "./drizzle/schema.ts",
      out: "./drizzle",
      dialect: "postgresql",
      dbCredentials: { url: alternateUrl },
    });
    expect(mocks.pool).not.toHaveBeenCalled();
  });
});

describe("admin connection lines only (scripts are never imported or run)", () => {
  for (const script of ["insert-admin.js", "insert-admin.mjs"]) {
    function resolveAdminLine(env: DatabaseEnvironment) {
      const source = readFileSync(new URL(`../${script}`, import.meta.url), "utf8");
      const connectionLine = source.split("\n").find(line => line.startsWith("const DB_URL ="));
      expect(connectionLine).toBeDefined();
      expect(source).not.toMatch(/postgres(?:ql)?:\/\//i);
      const databaseEnv = { resolvePostgresConnectionUrl };
      return runInNewContext(`${connectionLine}\nDB_URL;`, {
        process: { env },
        databaseEnv,
        require: (path: string) => {
          expect(path).toBe("./shared/databaseEnv.cjs");
          return databaseEnv;
        },
      });
    }
    it.each(rejected)(`${script} rejects %s before its SQL client line`, (_name, env) => {
      expect(() => resolveAdminLine(env)).toThrow(configurationError);
    });
    it(`${script} requires explicit environment and keeps PostgreSQL Render priority`, () => {
      expect(resolveAdminLine({ DATABASE_URL: postgresUrl })).toBe(postgresUrl);
      expect(resolveAdminLine({ RENDER_DATABASE_URL: alternateUrl, DATABASE_URL: postgresUrl })).toBe(alternateUrl);
      expect(mocks.pool).not.toHaveBeenCalled();
      expect(mocks.connect).not.toHaveBeenCalled();
    });
  }
});
