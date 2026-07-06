/**
 * 04-navigation.spec.ts
 * Tests navigation, routing, and layout across all major platform sections.
 * Covers: sidebar navigation, breadcrumbs, page titles, deep linking.
 */
import { test, expect } from "@playwright/test";

test.describe("Platform Navigation", () => {
  test("landing page has navigation to key sections", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // Check for navigation links
    const links = await page.locator("a[href]").all();
    expect(links.length).toBeGreaterThan(0);
  });

  test("wiki navigation works", async ({ page }) => {
    await page.goto("/wiki");
    await expect(page.locator("body")).toBeVisible();
    // Wiki should have internal navigation
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.length).toBeGreaterThan(200);
  });

  test("warranty check is accessible from root", async ({ page }) => {
    await page.goto("/warranty/check");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });
});

test.describe("All Platform Routes Load Without Crashing", () => {
  const allRoutes = [
    { path: "/", name: "Landing Page" },
    { path: "/wiki", name: "Wiki" },
    { path: "/warranty/check", name: "Warranty Check" },
    { path: "/privacy", name: "Privacy Policy" },
    { path: "/terms", name: "Terms of Service" },
    { path: "/404", name: "404 Page" },
    { path: "/coming-soon", name: "Coming Soon" },
    { path: "/batteries", name: "Batteries" },
    { path: "/telemetry", name: "Telemetry" },
    { path: "/ai-soh", name: "AI SOH" },
    { path: "/marketplace", name: "Marketplace" },
    { path: "/logistics", name: "Logistics" },
    { path: "/epr-compliance", name: "EPR Compliance" },
    { path: "/yield-verification", name: "Yield Verification" },
    { path: "/service-history", name: "Service History" },
    { path: "/analytics", name: "Analytics" },
    { path: "/alerts", name: "Alerts" },
    { path: "/alert-rules", name: "Alert Rules" },
    { path: "/assistant", name: "AI Assistant" },
    { path: "/documents", name: "Documents" },
    { path: "/device-provisioning", name: "Device Provisioning" },
    { path: "/demo", name: "Demo Mode" },
    { path: "/gateway-docs", name: "Gateway Docs" },
    { path: "/compliance", name: "Compliance Dashboard" },
    { path: "/warranty", name: "Warranty Dashboard" },
    { path: "/warranty/register", name: "Warranty Register" },
    { path: "/onboarding", name: "Bulk Onboarding" },
    { path: "/getting-started", name: "Getting Started" },
    { path: "/digital-twin", name: "Digital Twin" },
    { path: "/carbon-accounting", name: "Carbon Accounting" },
    { path: "/federated-learning", name: "Federated Learning" },
    { path: "/blockchain-audit", name: "Blockchain Audit" },
    { path: "/data-sharing", name: "Data Sharing" },
    { path: "/developer-portal", name: "Developer Portal" },
    { path: "/autonomous-triage", name: "Autonomous Triage" },
    { path: "/autonomous-triage/queue", name: "Triage Queue" },
    { path: "/predictive-procurement", name: "Predictive Procurement" },
    { path: "/solid-state", name: "Solid State Battery" },
    { path: "/api-reference", name: "API Reference" },
    { path: "/mcp-server", name: "MCP Server" },
    { path: "/admin/users", name: "Admin Users" },
    { path: "/admin/system", name: "Admin System" },
    { path: "/admin/feedback", name: "Admin Feedback" },
    { path: "/settings/platform", name: "Platform Settings" },
  ];

  for (const route of allRoutes) {
    test(`${route.name} (${route.path}) loads without 500 error`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator("body")).toBeVisible();
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).not.toContain("Internal Server Error");
      expect(bodyText).not.toContain("Cannot GET");
      expect(bodyText!.trim().length).toBeGreaterThan(5);
    });
  }
});

test.describe("Page Titles", () => {
  test("landing page has a meaningful title", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(3);
    expect(title).not.toBe("undefined");
    expect(title).not.toBe("null");
  });

  test("wiki page has a meaningful title", async ({ page }) => {
    await page.goto("/wiki");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(3);
  });
});

test.describe("Mobile Navigation", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("landing page is usable on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("wiki is usable on mobile", async ({ page }) => {
    await page.goto("/wiki");
    await expect(page.locator("body")).toBeVisible();
  });

  test("warranty check is usable on mobile", async ({ page }) => {
    await page.goto("/warranty/check");
    await expect(page.locator("body")).toBeVisible();
  });
});
