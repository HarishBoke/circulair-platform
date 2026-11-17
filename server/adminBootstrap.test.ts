import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs") as typeof import("bcryptjs");
type BootstrapEnvironment = {
  ADMIN_BOOTSTRAP_EMAIL?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
  ADMIN_BOOTSTRAP_NAME?: string;
};
type PreparedBootstrap = {
  email: string;
  name: string | null;
  passwordHash: string;
  openId: string;
};
const adminBootstrap = require("./adminBootstrap.cjs") as {
  validateAdminBootstrap: (env: BootstrapEnvironment) => {
    email: string; password: string; name: string | null;
  };
  prepareAdminBootstrap: (env: BootstrapEnvironment) => Promise<PreparedBootstrap>;
};
const databaseEnv = require("../shared/databaseEnv.cjs") as {
  resolvePostgresConnectionUrl: (env: Record<string, string>) => string;
};
const scripts = ["insert-admin.js", "insert-admin.mjs"];
const emailError = "ADMIN_BOOTSTRAP_EMAIL must be a valid email address.";
const passwordError = "ADMIN_BOOTSTRAP_PASSWORD must contain at least 16 characters, uppercase and lowercase letters, a digit and a symbol; no control characters or repeated-only pattern; at most 72 UTF-8 bytes.";
const nameError = "ADMIN_BOOTSTRAP_NAME, if supplied, must be nonempty text of at most 256 characters without control characters.";

function validEnvironment(): BootstrapEnvironment {
  // Ephemeral synthetic input, not a saved password or runtime environment.
  return {
    ADMIN_BOOTSTRAP_EMAIL: "operator@example.invalid",
    ADMIN_BOOTSTRAP_PASSWORD: `Aa9!${randomBytes(12).toString("hex")}`,
  };
}

const rejected: [string, (env: BootstrapEnvironment) => BootstrapEnvironment, string][] = [
  ["all inputs missing", () => ({}), emailError],
  ["missing email", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: undefined }), emailError],
  ["empty email", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: "" }), emailError],
  ["whitespace email", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: " \t" }), emailError],
  ["email without domain", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: "operator@" }), emailError],
  ["email without local part", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: "@example.invalid" }), emailError],
  ["email without domain suffix", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: "operator@localhost" }), emailError],
  ["multiple at signs", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: "operator@@example.invalid" }), emailError],
  ["email injection", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: "operator@example.invalid\nother" }), emailError],
  ["email leading whitespace", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: " operator@example.invalid" }), emailError],
  ["email repeated local dots", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: "op..erator@example.invalid" }), emailError],
  ["invalid domain label", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: "operator@-example.invalid" }), emailError],
  ["overlength email", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: `${"a".repeat(250)}@example.invalid` }), emailError],
  ["overlength local part", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: `${"a".repeat(65)}@example.invalid` }), emailError],
  ["nonstrings email", env => ({ ...env, ADMIN_BOOTSTRAP_EMAIL: 123 as unknown as string }), emailError],
  ["missing password", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: undefined }), passwordError],
  ["empty password", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: "" }), passwordError],
  ["whitespace password", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: " ".repeat(20) }), passwordError],
  ["short password", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: env.ADMIN_BOOTSTRAP_PASSWORD!.slice(0, 15) }), passwordError],
  ["no uppercase", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: env.ADMIN_BOOTSTRAP_PASSWORD!.toLowerCase() }), passwordError],
  ["no lowercase", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: env.ADMIN_BOOTSTRAP_PASSWORD!.toUpperCase() }), passwordError],
  ["no digits", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: env.ADMIN_BOOTSTRAP_PASSWORD!.replace(/[0-9]/g, "a") }), passwordError],
  ["no symbols", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: env.ADMIN_BOOTSTRAP_PASSWORD!.replace(/[^A-Za-z0-9]/g, "a") }), passwordError],
  ["repeated-only pattern", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: env.ADMIN_BOOTSTRAP_PASSWORD!.slice(0, 4).repeat(4) }), passwordError],
  ["NUL password", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: `${env.ADMIN_BOOTSTRAP_PASSWORD}\0` }), passwordError],
  ["newline password", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: `${env.ADMIN_BOOTSTRAP_PASSWORD}\n` }), passwordError],
  ["ASCII over 72 bytes", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: `${env.ADMIN_BOOTSTRAP_PASSWORD!.slice(0, 4)}${"a".repeat(69)}` }), passwordError],
  ["multibyte over 72 bytes", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: `${env.ADMIN_BOOTSTRAP_PASSWORD!.slice(0, 4)}${"é".repeat(35)}` }), passwordError],
  ["nonstrings password", env => ({ ...env, ADMIN_BOOTSTRAP_PASSWORD: 123 as unknown as string }), passwordError],
  ["empty supplied name", env => ({ ...env, ADMIN_BOOTSTRAP_NAME: "" }), nameError],
  ["whitespace supplied name", env => ({ ...env, ADMIN_BOOTSTRAP_NAME: " \t" }), nameError],
  ["overlength name", env => ({ ...env, ADMIN_BOOTSTRAP_NAME: "n".repeat(257) }), nameError],
  ["control character name", env => ({ ...env, ADMIN_BOOTSTRAP_NAME: "Operator\n" }), nameError],
  ["nonstrings name", env => ({ ...env, ADMIN_BOOTSTRAP_NAME: 123 as unknown as string }), nameError],
];

afterEach(() => vi.restoreAllMocks());

async function assertRejected(operation: () => Promise<unknown>, message: string) {
  let error: Error | undefined;
  try {
    await operation();
  } catch (caught) {
    error = caught as Error;
  }
  // Only static errors are compared: a failed assertion never prints input.
  expect(error?.message === message).toBe(true);
  expect(error?.cause === undefined).toBe(true);
}

describe("server-side operator bootstrap helper (offline)", () => {
  it.each(rejected)("rejects %s before hashing without disclosing input", async (_label, change, message) => {
    const hash = vi.spyOn(bcrypt, "hash");
    await assertRejected(() => adminBootstrap.prepareAdminBootstrap(change(validEnvironment())), message);
    expect(hash).not.toHaveBeenCalled();
  });

  it("generates a fresh bcrypt hash with cost 12, unique identity and no plaintext result", async () => {
    const env = validEnvironment();
    const first = await adminBootstrap.prepareAdminBootstrap(env);
    const second = await adminBootstrap.prepareAdminBootstrap(env);
    expect(await bcrypt.compare(env.ADMIN_BOOTSTRAP_PASSWORD!, first.passwordHash)).toBe(true);
    expect(bcrypt.getRounds(first.passwordHash)).toBe(12);
    expect(first.passwordHash !== second.passwordHash).toBe(true);
    expect(first.openId !== second.openId).toBe(true);
    expect(first.openId.length <= 64).toBe(true);
    expect(first.email === env.ADMIN_BOOTSTRAP_EMAIL).toBe(true);
    expect(first.name).toBeNull();
    expect(Object.values(first).includes(env.ADMIN_BOOTSTRAP_PASSWORD!)).toBe(false);
    expect(Object.hasOwn(first, "password")).toBe(false);
  });

  it.each(["ASCII", "multibyte"])("accepts exactly 72 UTF-8 bytes (%s), without trimming passwords", kind => {
    const env = validEnvironment();
    env.ADMIN_BOOTSTRAP_PASSWORD = env.ADMIN_BOOTSTRAP_PASSWORD!.slice(0, 4) +
      (kind === "ASCII" ? "a".repeat(68) : "é".repeat(34));
    const result = adminBootstrap.validateAdminBootstrap(env);
    expect(Buffer.byteLength(result.password, "utf8")).toBe(72);
    expect(result.password === env.ADMIN_BOOTSTRAP_PASSWORD).toBe(true);
  });

  it("preserves intentional password spaces and uses only an explicit optional name", () => {
    const env = validEnvironment();
    env.ADMIN_BOOTSTRAP_PASSWORD = ` ${env.ADMIN_BOOTSTRAP_PASSWORD} `;
    env.ADMIN_BOOTSTRAP_NAME = " Operator ";
    const result = adminBootstrap.validateAdminBootstrap(env);
    expect(result.password === env.ADMIN_BOOTSTRAP_PASSWORD).toBe(true);
    expect(result.name).toBe("Operator");
    expect(adminBootstrap.validateAdminBootstrap(validEnvironment()).name).toBeNull();
  });

  it("suppresses dependency error details and causes", async () => {
    const env = validEnvironment();
    vi.spyOn(bcrypt, "hash").mockRejectedValueOnce(new Error(env.ADMIN_BOOTSTRAP_PASSWORD));
    await assertRejected(() => adminBootstrap.prepareAdminBootstrap(env), "Admin bootstrap password hashing failed.");
  });
});

// Do not import or execute either admin script. Parse each actual entrypoint and
// evaluate ONLY its bootstrap initializer with a synthetic env and the real
// helper. The SQL client, SQL statements and main() are never evaluated.
function entrypointGate(script: string) {
  const source = readFileSync(new URL(`../${script}`, import.meta.url), "utf8");
  const ast = ts.createSourceFile(script, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const imports = ast.statements.filter(ts.isImportDeclaration);
  expect(imports.some(node => node.moduleSpecifier.getText(ast) === "'./server/adminBootstrap.cjs'" &&
    node.importClause?.name?.text === "adminBootstrap")).toBe(true);
  const declaration = ast.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(node => node.name.getText(ast) === "bootstrap");
  expect(declaration?.initializer !== undefined).toBe(true);
  const initializer = declaration!.initializer!;
  expect(ts.isAwaitExpression(initializer)).toBe(true);
  const awaited = (initializer as ts.AwaitExpression).expression;
  expect(ts.isCallExpression(awaited)).toBe(true);
  const call = awaited as ts.CallExpression;
  expect(call.expression.getText(ast)).toBe("adminBootstrap.prepareAdminBootstrap");
  expect(call.arguments.map(arg => arg.getText(ast))).toEqual(["process.env"]);

  const clientCalls: ts.CallExpression[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "postgres") clientCalls.push(node);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  expect(clientCalls.length).toBe(1);
  expect(clientCalls[0].getStart(ast) > initializer.end).toBe(true);
  expect(source.indexOf("await main();") > initializer.end).toBe(true);
  expect(source.includes("const DB_URL = databaseEnv.resolvePostgresConnectionUrl(process.env);")).toBe(true);

  return {
    source,
    prepare: (env: BootstrapEnvironment) => runInNewContext(
      `(async () => { return ${initializer.getText(ast)}; })()`,
      { adminBootstrap, process: { env } },
      { timeout: 1000 }
    ) as Promise<PreparedBootstrap>,
  };
}

for (const script of scripts) {
  describe(`${script} pre-client gate (only isolated initializer evaluation)`, () => {
    it.each(rejected)("invokes the actual helper and rejects %s before SQL client creation", async (_label, change, message) => {
      const hash = vi.spyOn(bcrypt, "hash");
      const gate = entrypointGate(script);
      await assertRejected(() => gate.prepare(change(validEnvironment())), message);
      expect(hash).not.toHaveBeenCalled();
    });

    it("awaits validated hashing before its SQL client and parameterizes explicit identity values", async () => {
      const gate = entrypointGate(script);
      const env = validEnvironment();
      env.ADMIN_BOOTSTRAP_NAME = "Operator";
      const result = await gate.prepare(env);
      expect(await bcrypt.compare(env.ADMIN_BOOTSTRAP_PASSWORD!, result.passwordHash)).toBe(true);
      expect(result.email === env.ADMIN_BOOTSTRAP_EMAIL).toBe(true);
      expect(result.name).toBe("Operator");
      for (const field of ["openId", "name", "email", "passwordHash"]) {
        expect(gate.source.includes(`\u0024{bootstrap.${field}}`)).toBe(true);
      }
      expect(gate.source.includes('ON CONFLICT ("email") DO UPDATE SET')).toBe(true);
      expect(gate.source.includes('"passwordHash" = EXCLUDED."passwordHash"')).toBe(true);
      expect(gate.source.includes('RETURNING id, email, role')).toBe(true);
      expect(gate.source.includes("'oem'")).toBe(true);
      expect(gate.source.includes("rejectUnauthorized: false")).toBe(true);
    });

    it("contains no embedded bcrypt hashes, URLs, fixed identities or dynamic console output", () => {
      const source = entrypointGate(script).source;
      const hashPattern = new RegExp("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}");
      expect(hashPattern.test(source)).toBe(false);
      expect(/postgres(?:ql)?:\/\//i.test(source)).toBe(false);
      expect(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(source)).toBe(false);
      expect(source.includes("admin-local-001")).toBe(false);
      expect(source.includes("require(")).toBe(false);
      const ast = ts.createSourceFile(script, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      let logs = 0;
      function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && /^console\./.test(node.expression.getText(ast))) {
          logs++;
          expect(node.arguments.length).toBe(1);
          expect(ts.isStringLiteral(node.arguments[0])).toBe(true);
        }
        ts.forEachChild(node, visit);
      }
      visit(ast);
      expect(logs).toBe(4);
    });
  });
}

describe("scope and absence of secrets", () => {
  it("retains identical ESM entrypoints", () => {
    const sources = scripts.map(script => readFileSync(new URL(`../${script}`, import.meta.url), "utf8"));
    expect(sources[0] === sources[1]).toBe(true);
    expect(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).type).toBe("module");
  });

  it("keeps the helper server-only, default-free, environment-read-only and free of output or DB access", () => {
    const source = readFileSync(new URL("./adminBootstrap.cjs", import.meta.url), "utf8");
    expect(new RegExp("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}").test(source)).toBe(false);
    expect(/console\.|process\.env|postgres|DATABASE_URL|VITE_|bcrypt\.compare/.test(source)).toBe(false);
    expect(source.includes('bcrypt.hash(password, 12)')).toBe(true);
    const env = validEnvironment();
    const snapshot = { ...env };
    Object.freeze(env);
    adminBootstrap.validateAdminBootstrap(env);
    expect(JSON.stringify(env) === JSON.stringify(snapshot)).toBe(true);
  });

  it("retains a sanitized fail-closed database resolver without creating a client", () => {
    let error: Error | undefined;
    try {
      databaseEnv.resolvePostgresConnectionUrl({});
    } catch (caught) {
      error = caught as Error;
    }
    expect(error?.message === "A valid PostgreSQL URL is required in RENDER_DATABASE_URL or DATABASE_URL").toBe(true);
  });
});
