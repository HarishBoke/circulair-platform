import { test, expect, type Page } from "@playwright/test";

// Deliberate browser-wire fixtures, not real Cashfree acceptance or customer data.
const SDK = "https://sdk.cashfree.com/js/v3/cashfree.js";
const common = { mode: "sandbox", provider: "cashfree", amountMinor: 1000, currency: "INR", scope: "gateway-test-only" };
const orderId = "cftest_00000000-0000-4000-8000-000000000001";
const signedContext = "cft1.browser_fixture_only.not_a_real_provider_context";
type Options = { anonymous?: boolean; enabled?: boolean; status?: string; verifyError?: boolean; wrongAmount?: boolean; sdkError?: boolean; sdkBlocked?: boolean; sdkHangs?: boolean };

async function fixture(page: Page, options: Options = {}) {
  const calls: string[] = [];
  const sdkRequests: string[] = [];
  const inputs: unknown[] = [];
  const user = { id: 910001, openId: "isolated-browser-persona", name: "Sandbox Reviewer", email: "reviewer@example.invalid", role: "user", loginMethod: "email" };
  await page.context().route("**/*", async route => {
    const u = new URL(route.request().url());
    const base = new URL(test.info().project.use.baseURL as string);
    if (u.origin === base.origin) await route.continue();
    else await route.abort("blockedbyclient");
  });
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = decodeURIComponent(url.pathname.split("/api/trpc/")[1]).split(",");
    const replies = paths.map(path => {
      calls.push(path);
      if (path === "auth.me") return { result: { data: { json: options.anonymous ? null : user } } };
      if (path === "paymentSandbox.status") return { result: { data: { json: { ...common, enabled: options.enabled !== false, configured: options.enabled !== false } } } };
      if (path === "paymentSandbox.createOrder") return { result: { data: { json: { ...common, amountMinor: options.wrongAmount ? 1 : 1000, orderId, paymentSessionId: "session_browser_fixture_only_0123456789", context: signedContext, expiresAt: new Date(Date.now() + 900000).toISOString() } } } };
      if (path === "paymentSandbox.verify") {
        inputs.push(route.request().postDataJSON());
        if (options.verifyError) return { error: { json: { message: "PRIVATE_PROVIDER_ERROR_DO_NOT_DISPLAY", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, path } } } };
        const status = options.status || "paid";
        return { result: { data: { json: { ...common, orderId, paymentId: "9100001", verified: status === "paid", status, creditsGranted: 0, listingChanged: false } } } };
      }
      return { result: { data: { json: [] } } };
    });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.searchParams.get("batch") === "1" ? replies : replies[0]) });
  });
  await page.route(SDK, async route => {
    sdkRequests.push(route.request().url());
    if (options.sdkBlocked) { await route.abort("blockedbyclient"); return; }
    const result = options.sdkHangs ? "new Promise(() => {})" : options.sdkError ? '{error:{message:"PRIVATE_SDK_DETAIL"}}' : '{paymentDetails:{paymentMessage:"Not authoritative"}}';
    await route.fulfill({ contentType: "application/javascript", body: `window.Cashfree = function(config) { window.__cashfreeFixtureMode = config.mode; return { checkout: async function(options) { window.__cashfreeFixtureTarget = options.redirectTarget; return ${result}; } }; };` });
  });
  await page.goto("/payments/test");
  await page.getByRole("button", { name: "Essential only", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Cookie consent" })).toHaveCount(0);
  return { calls, sdkRequests, inputs };
}

test.describe("Cashfree sandbox browser fixtures — no actual provider payment", () => {
  test("anonymous visitors cannot load checkout or create test orders", async ({ page }) => {
    const f = await fixture(page, { anonymous: true });
    await expect(page.getByRole("button", { name: "Sign In to Platform" })).toBeVisible();
    expect(f.calls).not.toContain("paymentSandbox.createOrder"); expect(f.sdkRequests).toHaveLength(0);
  });
  test("default-off access leaves checkout disabled and SDK unloaded", async ({ page }) => {
    const f = await fixture(page, { enabled: false });
    await expect(page.getByRole("heading", { name: "Payment sandbox" })).toBeVisible();
    await expect(page.getByText("Test access is not enabled", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Open Cashfree TEST checkout/ })).toBeDisabled();
    expect(f.sdkRequests).toHaveLength(0); expect(f.calls).not.toContain("paymentSandbox.createOrder");
  });
  test("only server-verified payment shows success; mode and scope remain sandbox-only", async ({ page }) => {
    const f = await fixture(page);
    await expect(page.getByRole("button", { name: /Open Cashfree TEST checkout/ })).toBeEnabled();
    expect(f.sdkRequests).toHaveLength(0);
    await page.getByRole("button", { name: /Open Cashfree TEST checkout/ }).click();
    await expect(page.getByText("Test payment verified", { exact: true })).toBeVisible();
    expect(f.sdkRequests).toEqual([SDK]); expect(f.calls).toContain("paymentSandbox.verify");
    expect(await page.evaluate(() => (window as unknown as { __cashfreeFixtureMode: string }).__cashfreeFixtureMode)).toBe("sandbox");
    expect(await page.evaluate(() => (window as unknown as { __cashfreeFixtureTarget: string }).__cashfreeFixtureTarget)).toBe("_modal");
    await expect(page.getByText("No real money. No credits. No listing or ownership changes.", { exact: true })).toBeVisible();
    const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    expect(storage).not.toContain(signedContext); expect(storage).not.toContain("session_browser_fixture_only");
  });
  for (const status of ["pending", "authorized", "failed", "cancelled", "expired", "refunded"]) {
    test(`${status} does not become success despite SDK completion`, async ({ page }) => {
      const f = await fixture(page, { status });
      await page.getByRole("button", { name: /Open Cashfree TEST checkout/ }).click();
      await expect(page.getByRole("button", { name: "Recheck payment", exact: true })).toBeEnabled();
      expect(f.calls).toContain("paymentSandbox.verify");
      await expect(page.getByText("Test payment verified", { exact: true })).toHaveCount(0);
      const creates = f.calls.filter(x => x === "paymentSandbox.createOrder").length;
      await page.getByRole("button", { name: "Recheck payment", exact: true }).click();
      await expect(page.getByRole("button", { name: "Recheck payment", exact: true })).toBeEnabled();
      expect(f.calls.filter(x => x === "paymentSandbox.createOrder")).toHaveLength(creates);
    });
  }
  test("closing or SDK errors still require authoritative server verification", async ({ page }) => {
    const f = await fixture(page, { sdkError: true });
    await page.getByRole("button", { name: /Open Cashfree TEST checkout/ }).click();
    await expect(page.getByText("Test payment verified", { exact: true })).toBeVisible();
    expect(f.calls).toContain("paymentSandbox.verify");
    await expect(page.getByText("PRIVATE_SDK_DETAIL")).toHaveCount(0);
  });
  test("verification errors stay unconfirmed and allow the same-order retry", async ({ page }) => {
    const f = await fixture(page, { verifyError: true });
    await page.getByRole("button", { name: /Open Cashfree TEST checkout/ }).click();
    await expect(page.getByText("Could not verify payment", { exact: true })).toBeVisible();
    await expect(page.getByText("Test payment verified", { exact: true })).toHaveCount(0);
    await expect(page.getByText("PRIVATE_PROVIDER_ERROR_DO_NOT_DISPLAY")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Recheck payment", exact: true })).toBeEnabled();
    expect(f.calls.filter(x => x === "paymentSandbox.createOrder")).toHaveLength(1);
  });
  test("client rejects a changed amount before loading checkout", async ({ page }) => {
    const f = await fixture(page, { wrongAmount: true });
    await page.getByRole("button", { name: /Open Cashfree TEST checkout/ }).click();
    await expect(page.getByText("Could not start test checkout", { exact: true })).toBeVisible();
    expect(f.sdkRequests).toHaveLength(0); expect(f.calls).not.toContain("paymentSandbox.verify");
  });
  test("SDK load failure remains retryable and does not imply payment success", async ({ page }) => {
    const f = await fixture(page, { sdkBlocked: true, status: "pending" });
    await page.getByRole("button", { name: /Open Cashfree TEST checkout/ }).click();
    await expect(page.getByRole("button", { name: "Recheck payment", exact: true })).toBeEnabled();
    expect(f.calls).toContain("paymentSandbox.verify");
    await expect(page.getByText("Test payment verified", { exact: true })).toHaveCount(0);
  });
  test("a stalled SDK reaches server verification and unlocks retry after its finite deadline", async ({ page }) => {
    await page.clock.install();
    const f = await fixture(page, { sdkHangs: true, status: "pending" });
    await page.getByRole("button", { name: /Open Cashfree TEST checkout/ }).click();
    await expect(page.getByText("Cashfree TEST checkout is open. Complete or close the checkout to continue.", { exact: true })).toBeVisible();
    await page.clock.fastForward(120001);
    await expect(page.getByRole("button", { name: "Recheck payment", exact: true })).toBeEnabled();
    expect(f.calls).toContain("paymentSandbox.verify");
    await expect(page.getByText("Test payment verified", { exact: true })).toHaveCount(0);
  });
});
