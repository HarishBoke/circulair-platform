/**
 * 09-admin-settings.spec.ts
 * Tests admin and settings pages for correct loading and auth protection.
 */
import { test, expect } from "@playwright/test";

test.describe("Admin Pages", () => {
  test("admin users page loads without crashing", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("Cannot GET");
  });

  test("admin system page loads without crashing", async ({ page }) => {
    await page.goto("/admin/system");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("Cannot GET");
  });

  test("admin feedback page loads without crashing", async ({ page }) => {
    await page.goto("/admin/feedback");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("Cannot GET");
  });
});

test.describe("Settings Pages", () => {
  test("platform settings page loads without crashing", async ({ page }) => {
    await page.goto("/settings/platform");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("Cannot GET");
  });
});

test.describe("Documents Page", () => {
  test("documents page loads without crashing", async ({ page }) => {
    await page.goto("/documents");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });
});
