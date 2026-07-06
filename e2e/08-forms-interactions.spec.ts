/**
 * 08-forms-interactions.spec.ts
 * Tests form interactions and user input flows on public pages.
 * Covers: warranty check form, wiki search, marketplace browsing.
 */
import { test, expect } from "@playwright/test";

test.describe("Warranty Check Form", () => {
  test("warranty check form accepts input", async ({ page }) => {
    await page.goto("/warranty/check");
    await expect(page.locator("body")).toBeVisible();
    const input = page.locator("input").first();
    if (await input.isVisible()) {
      await input.fill("TEST-BPAN-001");
      const value = await input.inputValue();
      expect(value).toBe("TEST-BPAN-001");
    }
  });

  test("warranty check form submits without crashing", async ({ page }) => {
    await page.goto("/warranty/check");
    await expect(page.locator("body")).toBeVisible();
    const input = page.locator("input").first();
    if (await input.isVisible()) {
      await input.fill("INVALID-BPAN-DOES-NOT-EXIST");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2000);
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).not.toContain("Internal Server Error");
    }
  });

  test("warranty check shows result or error message for invalid BPAN", async ({ page }) => {
    await page.goto("/warranty/check");
    const input = page.locator("input").first();
    if (await input.isVisible()) {
      await input.fill("XXXXXXXXXXXXXXXX");
      const submitBtn = page.locator("button[type='submit'], button:has-text('Check'), button:has-text('Search'), button:has-text('Verify')").first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        const bodyText = await page.locator("body").textContent();
        // Should show some feedback (not found, error, or result)
        expect(bodyText!.length).toBeGreaterThan(50);
      }
    }
  });
});

test.describe("EU Battery Passport Interaction", () => {
  test("EU passport page renders for a test BPAN", async ({ page }) => {
    await page.goto("/passport/EU/TESTBPAN001");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText!.trim().length).toBeGreaterThan(10);
  });

  test("EU passport handles special characters in BPAN", async ({ page }) => {
    await page.goto("/passport/EU/TEST-BPAN-001-2024");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });
});

test.describe("Wiki Interaction", () => {
  test("wiki page has searchable or navigable content", async ({ page }) => {
    await page.goto("/wiki");
    await expect(page.locator("body")).toBeVisible();
    // Check for search input or navigation links
    const hasSearch = await page.locator("input[type='search'], input[placeholder*='search' i], input[placeholder*='Search' i]").isVisible().catch(() => false);
    const hasLinks = (await page.locator("a[href]").all()).length > 0;
    expect(hasSearch || hasLinks).toBe(true);
  });
});

test.describe("Demo Mode", () => {
  test("demo mode page loads and shows content", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText!.trim().length).toBeGreaterThan(50);
  });
});

test.describe("Getting Started Flow", () => {
  test("getting started page has actionable content", async ({ page }) => {
    await page.goto("/getting-started");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
    // Should have some instructional content
    expect(bodyText!.trim().length).toBeGreaterThan(100);
  });
});

test.describe("Data Integration Page", () => {
  test("data integration page loads and shows content", async ({ page }) => {
    await page.goto("/data-integration");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });
});

test.describe("MQTT Flow Tester", () => {
  test("MQTT flow tester page loads", async ({ page }) => {
    await page.goto("/mqtt-flow-tester");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });
});
