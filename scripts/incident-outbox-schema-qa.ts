import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { is, SQL } from "drizzle-orm";
import {
  getTableConfig,
  PgDialect,
  type PgColumn,
  type PgTable,
} from "drizzle-orm/pg-core";
import { users, alerts } from "../drizzle/schema";

/**
 * Offline bootstrap for a FRESH, private PostgreSQL 16 QA cluster only.
 * This is NOT a production migration or a complete production schema export.
 * Import only schema tables: never application DB/config, credentials or providers.
 *
 * Contract: every source column's SQL type, NOT NULL, static database default,
 * primary key and unique constraint. Foreign keys, checks, non-unique indexes,
 * policies/triggers and Drizzle client-side update callbacks are outside scope.
 * The current users/alerts source declares no foreign keys (including batteryId).
 *
 * Serial is emitted as serial, letting PostgreSQL create LOCAL public sequences.
 * incidentOutbox.test.ts clones LIKE public.* INCLUDING CONSTRAINTS, WITHOUT
 * INCLUDING DEFAULTS/IDENTITY/INDEXES. Its synthetic rows supply IDs explicitly;
 * the clones must not inherit nextval references to these public sequences.
 */
const dialect = new PgDialect();

export function quoteQaIdentifier(identifier: string): string {
  if (!identifier || identifier.includes("\0")) {
    throw new Error("Invalid QA SQL identifier");
  }
  return `"${identifier.replaceAll('"', '""')}"`;
}

function stringLiteral(value: string): string {
  if (value.includes("\0"))
    throw new Error("NUL is unsupported in a QA SQL default");
  // E literals are safe independently of standard_conforming_strings.
  return `E'${value.replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}

function staticDefault(column: PgColumn): string | undefined {
  const label = `${getTableConfig(column.table).name}.${column.name}`;
  // Never invoke a $defaultFn, even if the column also has a database default.
  if (column.defaultFn)
    throw new Error(`Runtime default is unsupported: ${label}`);
  if (column.generated || column.generatedIdentity) {
    throw new Error(`Generated/identity column is unsupported: ${label}`);
  }
  const value = column.default;
  if (value === undefined) {
    // Serial already supplies a local sequence. Client-side onUpdateFn is NOT
    // a DDL default; if it is the only default, fail rather than evaluating it.
    if (
      column.hasDefault &&
      !/^(?:smallserial|serial|bigserial)$/.test(column.getSQLType())
    ) {
      throw new Error(`Missing static database default: ${label}`);
    }
    return undefined;
  }
  if (is(value, SQL)) {
    const query = dialect.sqlToQuery(value);
    // Deliberately narrow static allowlist, not arbitrary raw SQL or functions.
    if (
      query.params.length ||
      !/^(?:now\(\)|CURRENT_TIMESTAMP)$/i.test(query.sql.trim())
    ) {
      throw new Error(`Unsupported static SQL default: ${label}`);
    }
    return query.sql.trim();
  }
  if (value === null) return "NULL";
  if (typeof value === "string") return stringLiteral(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "bigint") return String(value);
  throw new Error(`Unsupported static database default: ${label}`);
}

function columnDefinition(column: PgColumn): string {
  const type = column.getSQLType();
  // Built-in scalar SQL types only. Fail closed for new enums/custom types or
  // expression-based type declarations instead of emitting unchecked SQL.
  if (
    !/^(?:(?:smallserial|serial|bigserial|smallint|integer|bigint|text|boolean|json|jsonb|real|double precision|uuid|date)|varchar\(\d+\)|numeric(?:\(\d+(?:,\s*\d+)?\))?|timestamp(?:\(\d+\))?(?: with(?:out)? time zone)?)$/.test(
      type
    )
  ) {
    throw new Error(`Unsupported QA SQL type: ${column.name}`);
  }
  const defaultSql = staticDefault(column);
  return `${quoteQaIdentifier(column.name)} ${type}${column.notNull ? " NOT NULL" : ""}${defaultSql === undefined ? "" : ` DEFAULT ${defaultSql}`}${column.primary ? " PRIMARY KEY" : ""}`;
}

/** Pure renderer, also reusable for schema-contract unit tests. No SQL execution. */
export function renderIncidentOutboxFixtureTable(table: PgTable): string {
  const config = getTableConfig(table);
  if (config.schema && config.schema !== "public") {
    throw new Error("QA bootstrap supports source tables in public only");
  }
  if (config.indexes.some(index => index.config.unique)) {
    throw new Error(
      "Unique indexes are unsupported; declare a source unique constraint for QA"
    );
  }
  const definitions = config.columns.map(columnDefinition);
  for (const primaryKey of config.primaryKeys) {
    definitions.push(
      `CONSTRAINT ${quoteQaIdentifier(primaryKey.getName())} PRIMARY KEY (${primaryKey.columns.map(column => quoteQaIdentifier(column.name)).join(", ")})`
    );
  }
  for (const column of config.columns.filter(column => column.isUnique)) {
    definitions.push(
      `CONSTRAINT ${quoteQaIdentifier(column.uniqueName!)} UNIQUE${column.uniqueType === "not distinct" ? " NULLS NOT DISTINCT" : ""} (${quoteQaIdentifier(column.name)})`
    );
  }
  for (const unique of config.uniqueConstraints) {
    const name = unique.getName();
    definitions.push(
      `${name ? `CONSTRAINT ${quoteQaIdentifier(name)} ` : ""}UNIQUE${unique.nullsNotDistinct ? " NULLS NOT DISTINCT" : ""} (${unique.columns.map(column => quoteQaIdentifier(column.name)).join(", ")})`
    );
  }
  return `CREATE TABLE ${quoteQaIdentifier("public")}.${quoteQaIdentifier(config.name)} (\n  ${definitions.join(",\n  ")}\n);`;
}

/** Deterministic SQL for EMPTY public.users and public.alerts, never fixture data. */
export function renderIncidentOutboxSchemaQa(): string {
  return [
    "-- FRESH PRIVATE PG16 QA ONLY: empty users/alerts bootstrap, not a production migration.",
    "-- Source: drizzle/schema.ts; all columns/types/NOT NULL/static defaults/PK/unique constraints.",
    "-- Excludes foreign keys, checks, non-unique indexes, policies/triggers and client update callbacks.",
    "-- Current source has no users/alerts foreign keys; batteryId does not require a batteries table.",
    "-- Serial sequences belong to this private cluster; LIKE INCLUDING CONSTRAINTS does NOT copy defaults.",
    "-- Integration clones use explicit synthetic IDs; never add INCLUDING DEFAULTS to those clones.",
    renderIncidentOutboxFixtureTable(users),
    renderIncidentOutboxFixtureTable(alerts),
    "",
  ].join("\n");
}

// Importing this file is side-effect free. The CLI only prints SQL; the caller
// owns validation of its private cluster and piping stdout into psql.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.stdout.write(renderIncidentOutboxSchemaQa());
}
