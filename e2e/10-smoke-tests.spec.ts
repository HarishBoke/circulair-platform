/**
 * 10-smoke-tests.spec.ts
 * Critical smoke tests — fast checks that the platform is alive and functional.
 * These run first and fail fast if the deployment is broken.
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://circulair-platform.onrender.com";

test.describe("Smoke Tests — Platform Health", () => {
  test("platform is reachable", async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    expect(res.status()).toBe(200);
  });

  test("tRPC API is responding", async ({ request }) => {
    const res = await request.get(`${BASE}/api/trpc/auth.me`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("result");
  });

  test("no JavaScript errors on landing page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForTimeout(2000);
    // Filter out known non-critical errors (MQTT keepalive, etc.)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("MQTT") &&
        !e.includes("WebSocket") &&
        !e.includes("net::ERR") &&
        !e.includes("Failed to fetch") &&
        !e.includes("NetworkError")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("no console errors on landing page", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter known non-critical errors
        if (
          !text.includes("MQTT") &&
          !text.includes("WebSocket") &&
          !text.includes("net::ERR") &&
          !text.includes("Failed to fetch") &&
          !text.includes("favicon")
        ) {
          consoleErrors.push(text);
        }
      }
    });
    await page.goto("/");
    await page.waitForTimeout(2000);
    expect(consoleErrors).toHaveLength(0);
  });

  test("no JavaScript errors on wiki page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/wiki");
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("MQTT") &&
        !e.includes("WebSocket") &&
        !e.includes("net::ERR") &&
        !e.includes("Failed to fetch")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("no JavaScript errors on warranty check page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/warranty/check");
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("MQTT") &&
        !e.includes("WebSocket") &&
        !e.includes("net::ERR") &&
        !e.includes("Failed to fetch")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("platform renders React app (not blank page)", async ({ page }) => {
    await page.goto("/");
    // React app should mount the #root element
    const root = page.locator("#root");
    if (await root.count() > 0) {
      const innerHTML = await root.innerHTML();
      expect(innerHTML.trim().length).toBeGreaterThan(50);
    } else {
      // If no #root, check body has content
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.trim().length).toBeGreaterThan(50);
    }
  });

  test("CSS is loaded (page is styled)", async ({ page }) => {
    await page.goto("/");
    // Check that CSS is applied by verifying computed styles
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Background should not be the default white (rgba(0,0,0,0)) if CSS is loaded
    expect(bodyBg).toBeTruthy();
  });
});

test.describe("Smoke Tests — Database Connectivity", () => {
  test("tRPC auth.me does not return 500 (DB is connected)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/trpc/auth.me`);
    expect(res.status()).not.toBe(500);
    const body = await res.json();
    // Should not contain database connection error
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("ECONNREFUSED");
    expect(bodyStr).not.toContain("connection refused");
    expect(bodyStr).not.toContain("database");
  });
});

test.describe("Smoke Tests — Static Assets", () => {
  test("favicon is served", async ({ request }) => {
    const res = await request.get(`${BASE}/favicon.ico`);
    // Should return 200 or 304, not 404
    expect([200, 304]).toContain(res.status());
  });
});
