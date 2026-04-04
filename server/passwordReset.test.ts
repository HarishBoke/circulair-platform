/**
 * passwordReset.test.ts
 *
 * Tests for the forgot-password / reset-password flow:
 * - Token creation and retrieval helpers in db.ts
 * - Express route behaviour (via supertest)
 * - Edge cases: expired token, used token, missing fields
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the database helpers ────────────────────────────────────────────────
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  createPasswordResetToken: vi.fn(),
  getPasswordResetToken: vi.fn(),
  updateUserPassword: vi.fn(),
  markPasswordResetTokenUsed: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import * as db from "./db";
import express from "express";
import request from "supertest";
import { registerPasswordResetRoutes } from "./_core/auth";

function buildApp() {
  const app = express();
  app.use(express.json());
  registerPasswordResetRoutes(app);
  return app;
}

// ─── Forgot Password ──────────────────────────────────────────────────────────
describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with success message even when email not found (prevents enumeration)", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined as any);
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/if that email exists/i);
  });

  it("creates a reset token when email is found", async () => {
    const mockUser = { id: 42, email: "user@example.com", name: "Test User" };
    vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser as any);
    vi.mocked(db.createPasswordResetToken).mockResolvedValue(undefined as any);
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "user@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.createPasswordResetToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42 })
    );
  });

  it("returns 400 when email is missing", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email is required/i);
  });

  it("includes resetUrl in development mode", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const mockUser = { id: 7, email: "dev@example.com", name: "Dev" };
    vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser as any);
    vi.mocked(db.createPasswordResetToken).mockResolvedValue(undefined as any);
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "dev@example.com" });
    expect(res.body.token).toBeDefined();
    expect(res.body.resetUrl).toContain("/reset-password?token=");
    process.env.NODE_ENV = originalEnv;
  });
});

// ─── Reset Password ───────────────────────────────────────────────────────────
describe("POST /api/auth/reset-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resets password successfully with a valid token", async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    vi.mocked(db.getPasswordResetToken).mockResolvedValue({
      id: 1,
      userId: 42,
      token: "validtoken",
      expiresAt: futureDate,
      usedAt: null,
      createdAt: new Date(),
    } as any);
    vi.mocked(db.updateUserPassword).mockResolvedValue(undefined as any);
    vi.mocked(db.markPasswordResetTokenUsed).mockResolvedValue(undefined as any);
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "validtoken", password: "NewSecurePass1!" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.updateUserPassword).toHaveBeenCalledWith(42, expect.any(String));
    expect(db.markPasswordResetTokenUsed).toHaveBeenCalledWith("validtoken");
  });

  it("returns 400 for an expired token", async () => {
    const pastDate = new Date(Date.now() - 1000);
    vi.mocked(db.getPasswordResetToken).mockResolvedValue({
      id: 1, userId: 42, token: "expiredtoken",
      expiresAt: pastDate, usedAt: null, createdAt: new Date(),
    } as any);
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "expiredtoken", password: "NewSecurePass1!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  it("returns 400 for an already-used token", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue({
      id: 1, userId: 42, token: "usedtoken",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      usedAt: new Date(), createdAt: new Date(),
    } as any);
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "usedtoken", password: "NewSecurePass1!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already been used/i);
  });

  it("returns 400 for an invalid/missing token", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue(null as any);
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "badtoken", password: "NewSecurePass1!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it("returns 400 when password is too short", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "anytoken", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8 characters/i);
  });

  it("returns 400 when token is missing", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ password: "NewSecurePass1!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/token is required/i);
  });
});

// ─── Validate Token (GET) ─────────────────────────────────────────────────────
describe("GET /api/auth/reset-password/validate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns valid: true for a valid token", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue({
      id: 1, userId: 42, token: "goodtoken",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      usedAt: null, createdAt: new Date(),
    } as any);
    const app = buildApp();
    const res = await request(app)
      .get("/api/auth/reset-password/validate?token=goodtoken");
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it("returns valid: false for an expired token", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue({
      id: 1, userId: 42, token: "expiredtoken",
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null, createdAt: new Date(),
    } as any);
    const app = buildApp();
    const res = await request(app)
      .get("/api/auth/reset-password/validate?token=expiredtoken");
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
  });

  it("returns valid: false when token not found", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue(null as any);
    const app = buildApp();
    const res = await request(app)
      .get("/api/auth/reset-password/validate?token=unknown");
    expect(res.body.valid).toBe(false);
  });

  it("returns 400 when token query param is missing", async () => {
    const app = buildApp();
    const res = await request(app)
      .get("/api/auth/reset-password/validate");
    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
  });
});
