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
  completePasswordReset: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));
vi.mock('./email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
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
      .send({ email: "aimbim@yopmail.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/if that email exists/i);
  });

  it("creates a reset token when email is found", async () => {
    const mockUser = { id: 42, email: "aimbim@yopmail.com", name: "Test User" };
    vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser as any);
    vi.mocked(db.createPasswordResetToken).mockResolvedValue(undefined as any);
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "aimbim@yopmail.com" });
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

  it("never exposes reset credentials in development mode", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const mockUser = { id: 7, email: "aimbim@yopmail.com", name: "Dev" };
    vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser as any);
    vi.mocked(db.createPasswordResetToken).mockResolvedValue(undefined as any);
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "aimbim@yopmail.com" });
    expect(res.body.token).toBeUndefined();
    expect(res.body.resetUrl).toBeUndefined();
    expect(res.body.success).toBe(true);
    process.env.NODE_ENV = originalEnv;
  });
});

// ─── Reset Password ───────────────────────────────────────────────────────────
describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.completePasswordReset).mockReset().mockResolvedValue(true);
  });

  it("allows only the successful atomic claim when two route readers saw an unused token", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue({
      id: 1, userId: 42, token: "synthetic-race-token",
      expiresAt: new Date(Date.now() + 60000), usedAt: null, createdAt: new Date(),
    } as any);
    let claimed = false;
    vi.mocked(db.completePasswordReset).mockImplementation(async () => {
      if (claimed) return false;
      claimed = true;
      return true;
    });
    const app = buildApp();
    const responses = await Promise.all([
      request(app).post("/api/auth/reset-password").send({ token: "synthetic-race-token", password: "SyntheticPassword1!" }),
      request(app).post("/api/auth/reset-password").send({ token: "synthetic-race-token", password: "SyntheticPassword2!" }),
    ]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 400]);
    expect(db.completePasswordReset).toHaveBeenCalledTimes(2);
    expect(db.updateUserPassword).not.toHaveBeenCalled();
    expect(db.markPasswordResetTokenUsed).not.toHaveBeenCalled();
  });

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
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "validtoken", password: "NewSecurePass1!" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.completePasswordReset).toHaveBeenCalledWith("validtoken", expect.stringMatching(/^\$2[aby]\$/));
    expect(db.updateUserPassword).not.toHaveBeenCalled();
    expect(db.markPasswordResetTokenUsed).not.toHaveBeenCalled();
  });

  it("rejects a token that expires or is consumed after the preliminary lookup", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue({ userId: 42, expiresAt: new Date(Date.now() + 60000), usedAt: null } as any);
    vi.mocked(db.completePasswordReset).mockResolvedValue(false);
    const res = await request(buildApp()).post('/api/auth/reset-password').send({ token: 'raced-token', password: 'NewSecurePass1!' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBeUndefined();
  });

  it("fails closed without logging a token or raw transaction error", async () => {
    vi.mocked(db.getPasswordResetToken).mockResolvedValue({ userId: 42, expiresAt: new Date(Date.now() + 60000), usedAt: null } as any);
    vi.mocked(db.completePasswordReset).mockRejectedValue(new Error('synthetic-private-token'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await request(buildApp()).post('/api/auth/reset-password').send({ token: 'synthetic-private-token', password: 'NewSecurePass1!' });
      expect(res.status).toBe(500);
      expect(JSON.stringify(log.mock.calls)).not.toContain('synthetic-private-token');
    } finally { log.mockRestore(); }
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
