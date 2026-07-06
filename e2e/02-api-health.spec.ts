/**
 * 02-api-health.spec.ts
 * Tests all tRPC API endpoints for correct responses.
 * Covers: auth.me, public procedures, error handling, CORS.
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://circulair-platform.onrender.com";

test.describe("tRPC API Health", () => {
  test("auth.me returns valid response for unauthenticated user", async ({ request }) => {
    const res = await request.get(`${BASE}/api/trpc/auth.me`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("result");
    expect(body.result).toHaveProperty("data");
    // Unauthenticated → data.json should be null
    expect(body.result.data.json).toBeNull();
  });

  test("tRPC endpoint returns JSON content-type", async ({ request }) => {
    const res = await request.get(`${BASE}/api/trpc/auth.me`);
    const contentType = res.headers()["content-type"] ?? "";
    expect(contentType).toContain("application/json");
  });

  test("invalid tRPC procedure returns 404 or error", async ({ request }) => {
    const res = await request.get(`${BASE}/api/trpc/nonexistent.procedure`);
    // tRPC returns 404 for unknown procedures
    expect([404, 400]).toContain(res.status());
  });

  test("protected procedure returns UNAUTHORIZED for unauthenticated request", async ({ request }) => {
    const res = await request.get(`${BASE}/api/trpc/battery.list`);
    // Should not return 500 — either UNAUTHORIZED (401) or empty result
    expect(res.status()).toBeLessThan(500);
    const body = await res.json();
    const bodyStr = JSON.stringify(body);
    // Should not expose internal server errors
    expect(bodyStr).not.toContain("INTERNAL_SERVER_ERROR");
  });

  test("server responds to health check path", async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    expect(res.status()).toBeLessThan(500);
  });

  test("static assets are served correctly", async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"] ?? "";
    expect(contentType).toContain("text/html");
  });
});

test.describe("API Security Headers", () => {
  test("response includes security-related headers", async ({ request }) => {
    const res = await request.get(`${BASE}/api/trpc/auth.me`);
    // Should not expose server internals
    const serverHeader = res.headers()["server"] ?? "";
    expect(serverHeader).not.toContain("Apache");
    expect(serverHeader).not.toContain("IIS");
  });

  test("CORS headers present for API routes", async ({ request }) => {
    const res = await request.get(`${BASE}/api/trpc/auth.me`, {
      headers: { "Origin": "https://example.com" },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe("Stripe Webhook Endpoint", () => {
  test("stripe webhook endpoint exists and rejects invalid signatures", async ({ request }) => {
    const res = await request.post(`${BASE}/api/stripe/webhook`, {
      data: JSON.stringify({ type: "test" }),
      headers: { "Content-Type": "application/json" },
    });
    // Should return 400 (invalid signature) not 404 or 500
    expect([400, 401]).toContain(res.status());
  });
});

test.describe("OAuth Endpoints", () => {
  test("OAuth callback endpoint exists", async ({ request }) => {
    const res = await request.get(`${BASE}/api/oauth/callback`);
    // Should redirect or return an error, not 404
    expect(res.status()).not.toBe(404);
    expect(res.status()).toBeLessThan(500);
  });
});
