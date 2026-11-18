import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { applySecurityMiddleware } from "./security";
import { createCashfreeSandboxRouter } from "./cashfreeSandboxRouter";
import { createCashfreeSandbox } from "./cashfreeSandbox";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

function app() {
  const a = express(); applySecurityMiddleware(a); a.use(express.json());
  a.get("/payments/test", (_req, res) => res.send("sandbox test page"));
  a.use("/api/trpc", createExpressMiddleware({
    router: createCashfreeSandboxRouter(createCashfreeSandbox({ getConfig: () => ({}) })),
    createContext: ({ req, res }) => ({ req, res, user: null }),
  }));
  return a;
}
afterEach(() => vi.unstubAllEnvs());

describe("Cashfree sandbox native HTTP protections", () => {
  it.each([
    ["false", "sandbox"], ["true", "production"], ["TRUE", "sandbox"], ["true", ""],
  ])("keeps production frames denied with enabled=%s mode=%s", async (enabled, mode) => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CASHFREE_SANDBOX_ENABLED", enabled); vi.stubEnv("CASHFREE_MODE", mode);
    const response = await request(app()).get("/payments/test");
    expect(response.headers["content-security-policy"]).toContain("frame-src 'none'");
  });
  it("allows only the verified sandbox iframe origins in explicitly enabled production CSP", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CASHFREE_SANDBOX_ENABLED", "true"); vi.stubEnv("CASHFREE_MODE", "sandbox");
    const response = await request(app()).get("/payments/test");
    const csp = response.headers["content-security-policy"];
    expect(csp).toContain("frame-src https://payments-test.cashfree.com https://sandbox.cashfree.com;");
    const frames = csp.split(";").find((part: string) => part.startsWith("frame-src "));
    expect(frames?.split(" ").slice(1)).toEqual(["https://payments-test.cashfree.com", "https://sandbox.cashfree.com"]);
    expect(csp).not.toContain("https://payments.cashfree.com");
    expect(csp).toContain("object-src 'none'");
  });
  it("rejects an attacker-origin Cashfree mutation before RPC dispatch", async () => {
    expect((await request(app()).post("/api/trpc/createOrder").set("Origin", "https://attacker.invalid").send({ json: null })).status).toBe(403);
  });
  it("rejects opaque-origin Cashfree verification before RPC dispatch", async () => {
    expect((await request(app()).post("/api/trpc/verify").set("Origin", "null").send({ json: {} })).status).toBe(403);
  });
  it("requires a native session for a same-origin test-order mutation", async () => {
    const response = await request(app()).post("/api/trpc/createOrder").send({ json: null });
    expect(response.status).toBe(401);
  });
  it("requires a native session for test-status reads", async () => {
    expect((await request(app()).get("/api/trpc/status")).status).toBe(401);
  });
});
