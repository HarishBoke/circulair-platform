/**
 * Email/password login UI, anonymous sessions and protected-route behavior.
 * No successful login, registration, password reset or application-data writes.
 */
import { test, expect } from "@playwright/test";
import { COOKIE_NAME } from "../shared/const";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication Flow", () => {
  for (const route of ["/batteries", "/dashboard", "/admin/users"]) {
    test(`unauthenticated user sees login prompt on ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).toContainText(/sign in|log in|login/i);
    });
  }

  test("login page exposes a same-origin email/password form", async ({ page, baseURL }) => {
    await page.goto("/login");
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
    await expect(page.getByLabel("Email Address", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?", exact: true })).toHaveAttribute("href", "/forgot-password");
    // Do not submit credentials against production; successful login writes lastSignedIn.
  });

  test("anonymous session reads do not issue a login cookie", async ({ request }) => {
    const res = await request.get("/api/trpc/auth.me");
    expect(res.status()).toBe(200);
    expect((await res.json()).result.data.json).toBeNull();
    expect(res.headers()["set-cookie"] ?? "").not.toContain(COOKIE_NAME);
    const state = await request.storageState();
    expect(state.cookies.some(cookie => cookie.name === COOKIE_NAME)).toBe(false);
  });

  test("malformed JWT remains unauthenticated", async ({ request }) => {
    // Deliberately invalid text, not a signed token or a real account credential.
    const headers = { Cookie: `${COOKIE_NAME}=not-a-valid-session` };
    const rest = await request.get("/api/auth/me", { headers });
    expect(rest.status()).toBe(401);
    expect(await rest.json()).toEqual({ error: "Not authenticated" });
    const trpc = await request.get("/api/trpc/auth.me", { headers });
    expect(trpc.status()).toBe(200);
    expect((await trpc.json()).result.data.json).toBeNull();
  });

  test("logout clears a synthetic invalid cookie on localhost only", async ({ request, baseURL }) => {
    const url = new URL(baseURL!);
    const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      && !url.username && !url.password;
    test.skip(!isLocal, "Cookie-mutating logout is restricted to localhost; no production mutation.");

    const res = await request.post("/api/auth/logout", {
      headers: { Cookie: `${COOKIE_NAME}=not-a-valid-session`, Origin: url.origin },
      data: {},
      maxRedirects: 0,
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const cleared = res.headers()["set-cookie"] ?? "";
    expect(cleared).toContain(`${COOKIE_NAME}=`);
    expect(cleared).toMatch(/expires=Thu, 01 Jan 1970|Max-Age=0/i);
    const me = await request.get("/api/auth/me");
    expect(me.status()).toBe(401);
  });
});

test.describe("Protected Route Behavior", () => {
  const protectedRoutes = [
    "/batteries", "/telemetry", "/ai-soh", "/marketplace", "/logistics",
    "/epr-compliance", "/analytics", "/alerts", "/documents",
    "/device-provisioning", "/compliance", "/warranty", "/assistant",
  ];

  for (const route of protectedRoutes) {
    test(`${route} does not crash for an unauthenticated user`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("body")).not.toHaveText(/^\s*$/);
      await expect(page.locator("body")).not.toContainText(/Internal Server Error|Cannot GET/);
    });
  }
});

test.describe("Admin Route Protection", () => {
  for (const route of ["/admin/users", "/admin/system"]) {
    test(`${route} shows an auth gate for an unauthenticated user`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).toContainText(/sign in|log in|login/i);
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
    });
  }
});
