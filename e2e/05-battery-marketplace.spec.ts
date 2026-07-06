/**
 * 05-battery-marketplace.spec.ts
 * Tests battery management and marketplace pages.
 * Covers: battery list, battery detail, marketplace listing, payment flow.
 */
import { test, expect } from "@playwright/test";

test.describe("Battery Management Pages", () => {
  test("batteries page loads and shows auth gate or content", async ({ page }) => {
    await page.goto("/batteries");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText!.trim().length).toBeGreaterThan(10);
  });

  test("telemetry page loads without error", async ({ page }) => {
    await page.goto("/telemetry");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("AI SOH page loads without error", async ({ page }) => {
    await page.goto("/ai-soh");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("service history page loads without error", async ({ page }) => {
    await page.goto("/service-history");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("digital twin page loads without error", async ({ page }) => {
    await page.goto("/digital-twin");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });
});

test.describe("Marketplace Pages", () => {
  test("marketplace listing page loads", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("marketplace create page loads", async ({ page }) => {
    await page.goto("/marketplace/create");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("marketplace orders page loads", async ({ page }) => {
    await page.goto("/marketplace/orders");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("marketplace detail page loads for unknown ID", async ({ page }) => {
    await page.goto("/marketplace/999999");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("payment success page loads", async ({ page }) => {
    await page.goto("/marketplace/payment-success");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });
});

test.describe("Compliance and EPR", () => {
  test("EPR compliance page loads", async ({ page }) => {
    await page.goto("/epr-compliance");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("yield verification page loads", async ({ page }) => {
    await page.goto("/yield-verification");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("compliance dashboard page loads", async ({ page }) => {
    await page.goto("/compliance");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("carbon accounting page loads", async ({ page }) => {
    await page.goto("/carbon-accounting");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });
});

test.describe("Logistics and Warranty", () => {
  test("logistics page loads", async ({ page }) => {
    await page.goto("/logistics");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("warranty dashboard loads", async ({ page }) => {
    await page.goto("/warranty");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("warranty register page loads", async ({ page }) => {
    await page.goto("/warranty/register");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });
});
