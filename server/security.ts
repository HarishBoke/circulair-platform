/**
 * security.ts — Security middleware for Express
 * Provides helmet (security headers) and rate limiting.
 * Import and call applySecurityMiddleware(app) early in the Express setup.
 */
import type { Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

export function applySecurityMiddleware(app: Express): void {
  // ── Helmet: security headers ──────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: false, // Vite HMR + inline scripts need this off in dev
      crossOriginEmbedderPolicy: false, // Allow embedding external images (CDN assets)
    })
  );

  // ── Rate limiting on API routes ───────────────────────────────────────────
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120, // 120 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
  app.use("/api/", apiLimiter);

  // ── Stricter rate limit for auth endpoints ────────────────────────────────
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 auth attempts per 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts, please try again later." },
  });
  app.use("/api/auth/", authLimiter);
}
