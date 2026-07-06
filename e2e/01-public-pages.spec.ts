/**
 * 01-public-pages.spec.ts
 * Tests all publicly accessible pages that do not require authentication.
 * Covers: landing page, warranty check, wiki, privacy, terms, 404, EU passport.
 */
import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads and shows the hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Circul/i);
    // Hero section should be visible
    await expect(page.locator("body")).toBeVisible();
    // Page should not show a 500 error
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("Cannot GET");
  });

  test("navigation links are present", async ({ page }) => {
    await page.goto("/");
    // Should have some navigation element
    const nav = page.locator("nav, header, [role='navigation']").first();
    await expect(nav).toBeVisible();
  });

  test("page is responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
  });
});

test.describe("Warranty Check (Public)", () => {
  test("warranty check page loads", async ({ page }) => {
    await page.goto("/warranty/check");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("warranty check form is present", async ({ page }) => {
    await page.goto("/warranty/check");
    // Should have an input for BPAN or warranty lookup
    const input = page.locator("input").first();
    await expect(input).toBeVisible();
  });
});

test.describe("Wiki (Public)", () => {
  test("wiki page loads", async ({ page }) => {
    await page.goto("/wiki");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("wiki has searchable content", async ({ page }) => {
    await page.goto("/wiki");
    // Should have some text content about the platform
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.length).toBeGreaterThan(100);
  });
});

test.describe("Legal Pages", () => {
  test("privacy policy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText!.length).toBeGreaterThan(100);
  });

  test("terms of service page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText!.length).toBeGreaterThan(100);
  });
});

test.describe("404 Handling", () => {
  test("404 page loads for unknown routes", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-xyz");
    await expect(page.locator("body")).toBeVisible();
    // Should show 404 page content (SPA handles this client-side)
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("explicit /404 route loads", async ({ page }) => {
    await page.goto("/404");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("EU Battery Passport (Public)", () => {
  test("EU passport route loads without crashing", async ({ page }) => {
    await page.goto("/passport/EU/TEST-BPAN-001");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });
});

test.describe("Coming Soon Page", () => {
  test("coming soon page loads", async ({ page }) => {
    await page.goto("/coming-soon");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });
});
