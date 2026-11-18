import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getTableColumns, sql } from "drizzle-orm";
import {
  boolean,
  getTableConfig,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { alerts, users } from "../drizzle/schema";
import {
  quoteQaIdentifier,
  renderIncidentOutboxFixtureTable,
  renderIncidentOutboxSchemaQa,
} from "../scripts/incident-outbox-schema-qa";

// Offline contract only: no application imports, PG connections or runtime gates.
const root = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(
  new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url)
);
const script = fileURLToPath(
  new URL("../scripts/incident-outbox-schema-qa.ts", import.meta.url)
);

describe("source-derived empty incident outbox QA bootstrap", () => {
  it.each([users, alerts])(
    "preserves every current source column's type/nullability/primary flag",
    table => {
      const generated = renderIncidentOutboxFixtureTable(table);
      const lines = generated.split("\n").slice(1, -1);
      const columns = Object.values(getTableColumns(table));
      const columnLines = lines.filter(
        line => !line.trimStart().startsWith("CONSTRAINT")
      );
      expect(columnLines).toHaveLength(columns.length);
      columns.forEach((column, index) => {
        const line = columnLines[index].trim().replace(/,$/, "");
        const prefix = `${quoteQaIdentifier(column.name)} ${column.getSQLType()}`;
        expect(line.startsWith(prefix)).toBe(true);
        expect(line.includes(" NOT NULL")).toBe(column.notNull);
        expect(line.includes(" PRIMARY KEY")).toBe(column.primary);
        expect(line.includes(" DEFAULT ")).toBe(column.default !== undefined);
        if (column.isUnique) {
          expect(generated).toContain(
            `CONSTRAINT ${quoteQaIdentifier(column.uniqueName!)} UNIQUE (${quoteQaIdentifier(column.name)})`
          );
        }
      });
      expect(getTableConfig(table).foreignKeys).toEqual([]);
      expect(generated).not.toMatch(/\bREFERENCES\b/);
    }
  );

  it("preserves current static database defaults and serial clone safety", () => {
    const generated = renderIncidentOutboxSchemaQa();
    expect(generated).toContain("\"role\" text NOT NULL DEFAULT E'user'");
    expect(generated).toContain(
      "\"platformRole\" text NOT NULL DEFAULT E'oem'"
    );
    expect(generated).toContain("\"severity\" text NOT NULL DEFAULT E'info'");
    expect(generated).toContain('"read" boolean NOT NULL DEFAULT false');
    expect(generated).toContain(
      '"acknowledged" boolean NOT NULL DEFAULT false'
    );
    expect(generated.match(/DEFAULT now\(\)/g)).toHaveLength(4);
    expect(generated.match(/"id" serial NOT NULL PRIMARY KEY/g)).toHaveLength(
      2
    );
    expect(generated).not.toMatch(/\bnextval\s*\(/i);
    expect(generated).toContain(
      "LIKE INCLUDING CONSTRAINTS does NOT copy defaults"
    );
    expect(generated).toContain("explicit synthetic IDs");
  });

  it("is deterministic, empty, create-only and explicit about limited fixture scope", () => {
    const first = renderIncidentOutboxSchemaQa();
    expect(renderIncidentOutboxSchemaQa()).toBe(first);
    const statements = first
      .split("\n")
      .filter(line => !line.startsWith("--"))
      .join("\n")
      .split(";")
      .map(s => s.trim())
      .filter(Boolean);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toMatch(/^CREATE TABLE "public"\."users" \(/);
    expect(statements[1]).toMatch(/^CREATE TABLE "public"\."alerts" \(/);
    expect(statements.join(";\n")).not.toMatch(
      /\b(?:ALTER|DROP|UPDATE|DELETE|TRUNCATE|INSERT|COPY|GRANT|CONNECT)\b/i
    );
    expect(first).not.toContain("IF NOT EXISTS"); // Drift must fail, not pass silently.
    expect(first).toContain("not a production migration");
    expect(first).toContain(
      "Excludes foreign keys, checks, non-unique indexes"
    );
  });

  it("quotes all identifiers and safely escapes string defaults", () => {
    const table = pgTable('fixture"table', {
      id: serial('odd"id').primaryKey(),
      value: text('odd"column').default("O'Reilly\\path"),
      enabled: boolean("enabled").default(true),
    });
    const generated = renderIncidentOutboxFixtureTable(table);
    expect(generated).toContain('CREATE TABLE "public"."fixture""table"');
    expect(generated).toContain('"odd""id" serial NOT NULL PRIMARY KEY');
    expect(generated).toContain(
      "\"odd\"\"column\" text DEFAULT E'O''Reilly\\\\path'"
    );
    expect(generated).toContain('"enabled" boolean DEFAULT true');
    expect(quoteQaIdentifier('a"b')).toBe('"a""b"');
    expect(() => quoteQaIdentifier("\0")).toThrow("Invalid QA SQL identifier");
  });

  it("derives named composite PK/unique constraints and null semantics", () => {
    const table = pgTable(
      "composite",
      {
        a: integer("a").notNull(),
        b: integer("b").notNull(),
        c: text("c").unique('odd"unique', { nulls: "not distinct" }),
      },
      t => [
        primaryKey({ columns: [t.a, t.b], name: 'odd"primary' }),
        unique('pair"unique').on(t.b, t.c).nullsNotDistinct(),
      ]
    );
    const generated = renderIncidentOutboxFixtureTable(table);
    expect(generated).toContain(
      'CONSTRAINT "odd""primary" PRIMARY KEY ("a", "b")'
    );
    expect(generated).toContain(
      'CONSTRAINT "odd""unique" UNIQUE NULLS NOT DISTINCT ("c")'
    );
    expect(generated).toContain(
      'CONSTRAINT "pair""unique" UNIQUE NULLS NOT DISTINCT ("b", "c")'
    );
  });

  it("never evaluates runtime defaults or update callbacks", () => {
    const callback = vi.fn(() => "runtime");
    expect(() =>
      renderIncidentOutboxFixtureTable(
        pgTable("runtime", {
          value: text("value").$defaultFn(callback),
        })
      )
    ).toThrow("Runtime default is unsupported");
    expect(callback).not.toHaveBeenCalled();
    expect(() =>
      renderIncidentOutboxFixtureTable(
        pgTable("update_only", {
          value: text("value").$onUpdateFn(callback),
        })
      )
    ).toThrow("Missing static database default");
    const staticWithUpdate = pgTable("static_update", {
      value: text("value").default("static").$onUpdateFn(callback),
    });
    expect(renderIncidentOutboxFixtureTable(staticWithUpdate)).toContain(
      "DEFAULT E'static'"
    );
    expect(callback).not.toHaveBeenCalled();
  });

  it.each([
    sql`random()`,
    sql`coalesce(${"unsafe"}, 'fallback')`,
    sql.raw("now(); DROP TABLE public.users"),
  ])("rejects unsupported SQL defaults", defaultSql => {
    expect(() =>
      renderIncidentOutboxFixtureTable(
        pgTable("unsupported", {
          value: text("value").default(defaultSql),
        })
      )
    ).toThrow("Unsupported static SQL default");
  });

  it("prints only deterministic SQL as CLI; importing is silent and needs no environment", () => {
    const options = {
      cwd: root,
      env: {},
      encoding: "utf8" as const,
      timeout: 15000,
    };
    const stdout = execFileSync(process.execPath, [cli, script], options);
    expect(stdout).toBe(renderIncidentOutboxSchemaQa());
    const imported = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        "await import('./scripts/incident-outbox-schema-qa.ts');",
      ],
      options
    );
    expect(imported).toBe("");
  });
});
