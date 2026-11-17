"use strict";

const bcrypt = require("bcryptjs");
const { randomUUID } = require("node:crypto");

/**
 * @typedef {{ [key: string]: string | undefined,
 *   ADMIN_BOOTSTRAP_EMAIL?: string, ADMIN_BOOTSTRAP_PASSWORD?: string,
 *   ADMIN_BOOTSTRAP_NAME?: string }} BootstrapEnvironment
 */

/**
 * Validate explicit server-side operator input without changing the environment.
 * Passwords are never trimmed and must fit bcrypt's 72-byte UTF-8 limit.
 * @param {BootstrapEnvironment} env
 */
function validateAdminBootstrap(env) {
  const email = env.ADMIN_BOOTSTRAP_EMAIL;
  if (typeof email !== "string" || email.length > 254 || /\s/.test(email)) {
    throw new Error("ADMIN_BOOTSTRAP_EMAIL must be a valid email address.");
  }
  const parts = email.split("@");
  const local = parts[0];
  const domain = parts[1];
  const localPattern = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
  if (
    parts.length !== 2 || !local || local.length > 64 || !localPattern.test(local) ||
    !domain || domain.split(".").length < 2 ||
    !domain.split(".").every(label =>
      /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label)) ||
    !/^[A-Za-z]{2,63}$/.test(domain.split(".").at(-1) || "")
  ) {
    throw new Error("ADMIN_BOOTSTRAP_EMAIL must be a valid email address.");
  }

  const password = env.ADMIN_BOOTSTRAP_PASSWORD;
  if (
    typeof password !== "string" || [...password].length < 16 ||
    Buffer.byteLength(password, "utf8") > 72 || /[\x00-\x1f\x7f]/.test(password) ||
    !/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) || !/[^A-Za-z0-9\s]/.test(password) ||
    /^(.+)\1+$/u.test(password)
  ) {
    throw new Error(
      "ADMIN_BOOTSTRAP_PASSWORD must contain at least 16 characters, uppercase and lowercase letters, a digit and a symbol; no control characters or repeated-only pattern; at most 72 UTF-8 bytes."
    );
  }

  const suppliedName = env.ADMIN_BOOTSTRAP_NAME;
  let name = null;
  if (suppliedName !== undefined) {
    if (
      typeof suppliedName !== "string" || !suppliedName.trim() ||
      suppliedName.trim().length > 256 || /[\x00-\x1f\x7f]/.test(suppliedName)
    ) {
      throw new Error("ADMIN_BOOTSTRAP_NAME, if supplied, must be nonempty text of at most 256 characters without control characters.");
    }
    name = suppliedName.trim();
  }

  return { email, password, name };
}

/**
 * Complete validation and hashing before either entrypoint creates a SQL client.
 * Return only the values needed by the parameterized insert, never plaintext.
 * @param {BootstrapEnvironment} env
 */
async function prepareAdminBootstrap(env) {
  const { email, password, name } = validateAdminBootstrap(env);
  let passwordHash;
  try {
    passwordHash = await bcrypt.hash(password, 12);
  } catch {
    // Dependency errors can contain input; do not propagate their text or cause.
    throw new Error("Admin bootstrap password hashing failed.");
  }
  return { email, name, passwordHash, openId: `admin-local-${randomUUID()}` };
}

module.exports = { validateAdminBootstrap, prepareAdminBootstrap };
