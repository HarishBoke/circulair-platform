/**
 * 07-performance-accessibility.spec.ts
 * Tests performance metrics and accessibility compliance for the platform.
 * Covers: page load times, WCAG basics, keyboard navigation, ARIA roles.
 */
import { test, expect } from "@playwright/test";

test.describe("Page Load Performance", () => {
  test("landing page loads within 20 seconds (accounts for cold start)", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const elapsed = Date.now() - start;
    // Render free tier may have cold starts up to 15s; 20s is a safe threshold
    expect(elapsed).toBeLessThan(20000);
  });

  test("wiki page loads within 20 seconds (accounts for cold start)", async ({ page }) => {
    const start = Date.now();
    await page.goto("/wiki", { waitUntil: "domcontentloaded" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(20000);
  });

  test("API response time is under 15 seconds (accounts for cold start)", async ({ request }) => {
    const BASE = process.env.BASE_URL || "https://circulair-platform.onrender.com";
    // Warm up the service first
    await request.get(`${BASE}/api/trpc/auth.me`);
    // Now measure the actual response time
    const start = Date.now();
    await request.get(`${BASE}/api/trpc/auth.me`);
    const elapsed = Date.now() - start;
    // Render free tier may have cold starts; 15s is generous but realistic
    expect(elapsed).toBeLessThan(15000);
  });
});

test.describe("Accessibility — WCAG Basics", () => {
  test("landing page has a lang attribute on html element", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });

  test("landing page has a meta viewport tag", async ({ page }) => {
    await page.goto("/");
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).toBeTruthy();
    expect(viewport).toContain("width=device-width");
  });

  test("landing page has at least one heading (h1-h6)", async ({ page }) => {
    await page.goto("/");
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test("wiki page has at least one heading", async ({ page }) => {
    await page.goto("/wiki");
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test("images on landing page have alt attributes", async ({ page }) => {
    await page.goto("/");
    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      const role = await img.getAttribute("role");
      const ariaHidden = await img.getAttribute("aria-hidden");
      // Images should have alt text, or be decorative (role=presentation or aria-hidden)
      const isAccessible = alt !== null || role === "presentation" || ariaHidden === "true";
      expect(isAccessible).toBe(true);
    }
  });

  test("buttons on landing page have accessible labels", async ({ page }) => {
    await page.goto("/");
    const buttons = await page.locator("button").all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute("aria-label");
      const ariaLabelledBy = await btn.getAttribute("aria-labelledby");
      const title = await btn.getAttribute("title");
      const hasLabel = (text && text.trim().length > 0) || ariaLabel || ariaLabelledBy || title;
      expect(hasLabel).toBeTruthy();
    }
  });
});

test.describe("Keyboard Navigation", () => {
  test("landing page is keyboard navigable", async ({ page }) => {
    await page.goto("/");
    // Tab through the page — should not throw errors
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.locator("body")).toBeVisible();
  });

  test("warranty check form is keyboard accessible", async ({ page }) => {
    await page.goto("/warranty/check");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    // Should focus on an interactive element
    expect(["INPUT", "BUTTON", "A", "SELECT", "TEXTAREA"]).toContain(focused);
  });
});

test.describe("Responsive Design", () => {
  const viewports = [
    { name: "Mobile S", width: 320, height: 568 },
    { name: "Mobile M", width: 375, height: 812 },
    { name: "Mobile L", width: 425, height: 926 },
    { name: "Tablet", width: 768, height: 1024 },
    { name: "Laptop", width: 1024, height: 768 },
    { name: "Desktop", width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`landing page renders correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
      await expect(page.locator("body")).toBeVisible();
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).not.toContain("Internal Server Error");
      // Check no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10);
    });
  }
});

test.describe("Error Boundary", () => {
  test("404 page shows user-friendly message", async ({ page }) => {
    await page.goto("/this-page-absolutely-does-not-exist-xyz-123");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    // Should not show raw error stack traces
    expect(bodyText).not.toContain("at Object.<anonymous>");
    expect(bodyText).not.toContain("node_modules");
    expect(bodyText).not.toContain("Internal Server Error");
  });
});
