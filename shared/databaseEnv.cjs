"use strict";

const CONFIGURATION_ERROR =
  "A valid PostgreSQL URL is required in RENDER_DATABASE_URL or DATABASE_URL";

/**
 * PostgreSQL-only priority: an explicitly PostgreSQL RENDER_DATABASE_URL wins;
 * otherwise use a PostgreSQL DATABASE_URL. Empty and non-PostgreSQL Render
 * values do not override a PostgreSQL DATABASE_URL. A selected PostgreSQL URL
 * that is malformed fails closed, rather than falling through to another URL.
 * No credentials, hosts, or default URLs are supplied by this module.
 * Validation is local only; never include the URL or parser error in an error.
 *
 * @param {{ RENDER_DATABASE_URL?: string, DATABASE_URL?: string }} env
 * @returns {string}
 */
function resolvePostgresConnectionUrl(env) {
  const renderUrl = (env.RENDER_DATABASE_URL || "").trim();
  const databaseUrl = (env.DATABASE_URL || "").trim();
  const isPostgres = value => /^(postgres|postgresql):\/\//i.test(value);
  const selected = isPostgres(renderUrl)
    ? renderUrl
    : isPostgres(databaseUrl)
      ? databaseUrl
      : "";

  try {
    if (!selected || /[\s\\]/.test(selected) || /%(?![0-9a-f]{2})/i.test(selected)) {
      throw new Error();
    }
    const parsed = new URL(selected);
    if (
      !["postgres:", "postgresql:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.hash
    ) {
      throw new Error();
    }
    // PostgreSQL clients decode these components; reject malformed escapes now.
    decodeURIComponent(parsed.username);
    decodeURIComponent(parsed.password);
    decodeURIComponent(parsed.pathname);
  } catch {
    throw new Error(CONFIGURATION_ERROR);
  }

  return selected;
}

module.exports = { resolvePostgresConnectionUrl };
