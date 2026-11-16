/**
 * Read-only API checks and safe rejections. No users, mail, payments or
 * application records are created by these tests.
 */
import { test, expect } from "@playwright/test";
import { COOKIE_NAME } from "../shared/const";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("tRPC API Health", () => {
  test("auth.me returns null without a session", async ({ request }) => {
    const res = await request.get("/api/trpc/auth.me");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/json");
    expect((await res.json()).result.data.json).toBeNull();
    expect(res.headers()["set-cookie"] ?? "").not.toContain(COOKIE_NAME);
  });

  test("invalid tRPC procedure returns NOT_FOUND", async ({ request }) => {
    const res = await request.get("/api/trpc/nonexistent.procedure");
    expect(res.status()).toBe(404);
    expect((await res.json()).error.json.data.code).toBe("NOT_FOUND");
  });

  test("protected bpan.list rejects an unauthenticated request", async ({ request }) => {
    const res = await request.get("/api/trpc/bpan.list", {
      params: { input: JSON.stringify({ json: {} }) },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error.json.data.code).toBe("UNAUTHORIZED");
  });

  test("Render readiness reports PostgreSQL connected or explicitly degraded", async ({ request }) => {
    const res = await request.get("/api/health");
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body.dbType).toBe("postgresql");
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.status).toBe(res.status() === 200 ? "ok" : "degraded");
    expect(body.db).toBe(res.status() === 200 ? "connected" : "disconnected");
    // This endpoint does not establish email, AI, storage or device readiness.
  });

  test("homepage serves HTML", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/html");
  });
});

test.describe("API Security Headers", () => {
  test("API response has defensive headers", async ({ request }) => {
    const res = await request.get("/api/trpc/auth.me");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });

  test("cross-origin logout is rejected without issuing a session", async ({ request }) => {
    // This is rejected by middleware before any cookie/session mutation.
    const res = await request.post("/api/auth/logout", {
      headers: { Origin: "https://untrusted.example.invalid", "Sec-Fetch-Site": "cross-site" },
      data: {},
    });
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ error: "Cross-origin mutation rejected" });
    expect(res.headers()["set-cookie"] ?? "").not.toContain(COOKIE_NAME);
  });
});

test.describe("Stripe Webhook Safe Rejection", () => {
  test("missing signature is rejected before payment handling", async ({ request }) => {
    const res = await request.post("/api/stripe/webhook", { data: { type: "test" } });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing stripe-signature header" });
  });
});

test.describe("Email/Password Auth Endpoints", () => {
  test("login rejects an empty payload before database lookup", async ({ request }) => {
    const res = await request.post("/api/auth/login", { data: {} });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Email and password are required" });
    expect(res.headers()["set-cookie"] ?? "").not.toContain(COOKIE_NAME);
  });

  test("REST me rejects a missing session", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "Not authenticated" });
  });
});
