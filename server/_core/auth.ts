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
      console.error("[Auth] Register failed:", error);
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
      console.error("[Auth] Login failed:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // ── Logout ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
