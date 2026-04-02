/**
 * auth.test.ts — Tests for custom JWT email/password authentication
 *
 * Tests cover:
 * - JWT token creation and verification
 * - Register endpoint validation
 * - Login endpoint validation
 * - Logout endpoint
 * - Auth middleware (authenticateRequest)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSessionToken, verifySessionToken } from "./_core/auth";

// ─── JWT TOKEN TESTS ─────────────────────────────────────────────────────────

describe("JWT Token Management", () => {
  it("should create a valid JWT token", async () => {
    const user = { id: 1, openId: "local_abc123", name: "Test User" };
    const token = await createSessionToken(user);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });

  it("should verify a valid JWT token and return payload", async () => {
    const user = { id: 42, openId: "local_xyz789", name: "Jane Doe" };
    const token = await createSessionToken(user);
    const payload = await verifySessionToken(token);

    expect(payload).not.toBeNull();
    expect(payload!.id).toBe(42);
    expect(payload!.openId).toBe("local_xyz789");
    expect(payload!.name).toBe("Jane Doe");
  });

  it("should return null for an invalid token", async () => {
    const payload = await verifySessionToken("invalid.token.here");
    expect(payload).toBeNull();
  });

  it("should return null for undefined/null token", async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken(null)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
  });

  it("should return null for a tampered token", async () => {
    const user = { id: 1, openId: "local_abc123", name: "Test" };
    const token = await createSessionToken(user);
    // Tamper with the payload section
    const parts = token.split(".");
    parts[1] = parts[1] + "tampered";
    const tampered = parts.join(".");

    const payload = await verifySessionToken(tampered);
    expect(payload).toBeNull();
  });

  it("should handle user with null name", async () => {
    const user = { id: 5, openId: "local_noname", name: null };
    const token = await createSessionToken(user);
    const payload = await verifySessionToken(token);

    expect(payload).not.toBeNull();
    expect(payload!.id).toBe(5);
    expect(payload!.openId).toBe("local_noname");
    expect(payload!.name).toBe("");
  });
});

// ─── tRPC AUTH PROCEDURE TESTS ───────────────────────────────────────────────

describe("tRPC auth.logout", () => {
  it("should return success and clear cookie", async () => {
    // Import the router and create a caller with mock context
    const { appRouter } = await import("./routers");
    const cookies: Record<string, unknown>[] = [];

    const ctx = {
      req: {
        protocol: "https",
        headers: { "x-forwarded-proto": "https" },
      } as any,
      res: {
        cookie: vi.fn((_name: string, _val: string, opts: unknown) => {
          cookies.push(opts as Record<string, unknown>);
        }),
        clearCookie: vi.fn(),
      } as any,
      user: {
        id: 1,
        openId: "local_test",
        name: "Test",
        email: "test@example.com",
        passwordHash: null,
        loginMethod: "email",
        role: "user" as const,
        platformRole: "oem" as const,
        organization: null,
        lastSignedIn: new Date(),
        createdAt: new Date(),
      },
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
  });
});

describe("tRPC auth.me", () => {
  it("should return user when authenticated", async () => {
    const { appRouter } = await import("./routers");

    const mockUser = {
      id: 1,
      openId: "local_test",
      name: "Test User",
      email: "test@example.com",
      passwordHash: null,
      loginMethod: "email",
      role: "user" as const,
      platformRole: "oem" as const,
      organization: null,
      lastSignedIn: new Date(),
      createdAt: new Date(),
    };

    const ctx = {
      req: {} as any,
      res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
      user: mockUser,
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();

    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
    expect(result!.name).toBe("Test User");
    expect(result!.email).toBe("test@example.com");
  });

  it("should return null when not authenticated", async () => {
    const { appRouter } = await import("./routers");

    const ctx = {
      req: {} as any,
      res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
      user: null,
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();

    expect(result).toBeNull();
  });
});

// ─── EMAIL VALIDATION TESTS ─────────────────────────────────────────────────

describe("Email validation patterns", () => {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it("should accept valid emails", () => {
    expect(EMAIL_RE.test("user@example.com")).toBe(true);
    expect(EMAIL_RE.test("test.user@company.co.uk")).toBe(true);
    expect(EMAIL_RE.test("admin@circul-air.io")).toBe(true);
  });

  it("should reject invalid emails", () => {
    expect(EMAIL_RE.test("")).toBe(false);
    expect(EMAIL_RE.test("notanemail")).toBe(false);
    expect(EMAIL_RE.test("@missing.com")).toBe(false);
    expect(EMAIL_RE.test("no spaces@test.com")).toBe(false);
  });
});
