/**
 * auth.ts — Custom JWT email/password authentication
 *
 * Replaces Manus OAuth with simple email/password auth.
 * - POST /api/auth/register — create account
 * - POST /api/auth/login    — sign in, get JWT cookie
 * - POST /api/auth/logout   — clear session cookie
 * - GET  /api/auth/me       — get current user from cookie
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../email";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import type { User } from "../../drizzle/schema";

// ─── JWT HELPERS ─────────────────────────────────────────────────────────────

function getSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createSessionToken(user: {
  id: number;
  openId: string;
  name?: string | null;
}): Promise<string> {
  const secret = getSecret();
  return new SignJWT({
    sub: String(user.id),
    openId: user.openId,
    name: user.name ?? "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ id: number; openId: string; name: string } | null> {
  if (!token) return null;
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    const id = Number(payload.sub);
    const openId = payload.openId as string;
    const name = (payload.name as string) ?? "";
    if (!id || !openId) return null;
    return { id, openId, name };
  } catch {
    return null;
  }
}

// ─── AUTHENTICATE REQUEST (used by tRPC context) ────────────────────────────

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  const pairs = cookieHeader.split(";").map((s) => s.trim());
  const map = new Map<string, string>();
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    map.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
  return map;
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.get(COOKIE_NAME);
  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await db.getUserByOpenId(session.openId);
  if (!user) return null;

  // Touch lastSignedIn
  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  return user;
}

// ─── EXPRESS ROUTES ──────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function registerAuthRoutes(app: Express) {
  // ── Register ────────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body ?? {};

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      if (typeof name === "string" && name.length > 200) {
        return res.status(400).json({ error: "Name is too long" });
      }

      // Check if email already exists
      const existing = await db.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Generate a unique openId for this user
      const openId = `local_${nanoid(16)}`;

      // Create user
      await db.createLocalUser({
        openId,
        name: name?.trim() || null,
        email: email.toLowerCase().trim(),
        passwordHash,
        loginMethod: "email",
      });

      const user = await db.getUserByOpenId(openId);
      if (!user) {
        return res.status(500).json({ error: "Failed to create account" });
      }

      // Issue JWT
      const token = await createSessionToken(user);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          platformRole: user.platformRole,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[Auth] Register failed:", msg);
      // Surface DB-specific errors as 503 so the client knows to retry
      if (msg.includes("Database not available") || msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT")) {
        return res.status(503).json({ error: "Database unavailable — please try again in a moment" });
      }
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  // ── Login ───────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body ?? {};

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await db.getUserByEmail(email.toLowerCase().trim());
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Update last signed in
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

      // Issue JWT
      const token = await createSessionToken(user);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          platformRole: user.platformRole,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[Auth] Login failed:", msg);
      if (msg.includes("Database not available") || msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT")) {
        return res.status(503).json({ error: "Database unavailable — please try again in a moment" });
      }
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // ── Logout ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    return res.json({ success: true });
  });

  // ── Me (current user) ──────────────────────────────────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        platformRole: user.platformRole,
        organization: user.organization,
      });
    } catch {
      return res.status(401).json({ error: "Not authenticated" });
    }
  });
}

// ─── FORGOT / RESET PASSWORD ROUTES ─────────────────────────────────────────

export function registerPasswordResetRoutes(app: Express) {
  // ── Forgot Password ─────────────────────────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body ?? {};
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      // Always return 200 to prevent email enumeration
      const user = await db.getUserByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.json({ success: true, message: "If that email exists, a reset link has been sent." });
      }

      // Generate a secure random token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Persist the token
      await db.createPasswordResetToken({ userId: user.id, token, expiresAt });

      // Build the reset URL
      const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "https://circulair.energy";
      const resetUrl = `${origin}/reset-password?token=${token}`;

      // Send the reset email via Resend (best-effort — failure must not block the response)
      const recipientEmail: string = user.email ?? email; // email is already validated above
      try {
        const emailResult = await sendPasswordResetEmail(
          recipientEmail,
          resetUrl,
          user.name ?? "",
          15
        );
        if (!emailResult.success) {
          console.warn(`[Auth] Resend delivery failed for ${user.email}:`, emailResult.error);
        }
      } catch (emailErr) {
        console.error("[Auth] Unexpected error sending reset email:", emailErr);
      }

      // Also notify the owner as a secondary audit trail (best-effort)
      try {
        const { notifyOwner } = await import("./notification");
        await notifyOwner({
          title: `[Circul-AI-r] Password reset requested for ${user.email}`,
          content: `A password reset was requested for ${user.email}.\n\nReset link (valid 15 min):\n${resetUrl}\n\nIf you did not request this, ignore this message.`,
        });
      } catch {
        // Notification failure must not block the response
      }

      // In development / demo mode, return the token so it can be used without email
      const isDev = process.env.NODE_ENV !== "production";
      return res.json({
        success: true,
        message: "If that email exists, a reset link has been sent.",
        ...(isDev ? { resetUrl, token } : {}),
      });
    } catch (error) {
      console.error("[Auth] Forgot password failed:", error);
      return res.status(500).json({ error: "Failed to process request" });
    }
  });

  // ── Reset Password ──────────────────────────────────────────────────────────
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body ?? {};
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Reset token is required" });
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      // Look up the token
      const resetToken = await db.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      if (resetToken.usedAt) {
        return res.status(400).json({ error: "This reset link has already been used" });
      }
      if (new Date(resetToken.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This reset link has expired. Please request a new one." });
      }

      // Hash the new password and update the user
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await db.updateUserPassword(resetToken.userId, passwordHash);

      // Mark token as used
      await db.markPasswordResetTokenUsed(token);

      return res.json({ success: true, message: "Password updated successfully. You can now log in." });
    } catch (error) {
      console.error("[Auth] Reset password failed:", error);
      return res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // ── Validate Reset Token (GET — for pre-flight check on the reset page) ─────
  app.get("/api/auth/reset-password/validate", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      if (!token) return res.status(400).json({ valid: false, error: "Token is required" });

      const resetToken = await db.getPasswordResetToken(token);
      if (!resetToken || resetToken.usedAt || new Date(resetToken.expiresAt) < new Date()) {
        return res.json({ valid: false, error: "Invalid or expired token" });
      }
      return res.json({ valid: true });
    } catch {
      return res.status(500).json({ valid: false, error: "Validation failed" });
    }
  });
}
