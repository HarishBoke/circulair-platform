import type { Request } from "express";

function httpOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch { return null; }
}

/** Password-recovery links never derive their destination from user-controlled headers. */
export function getApplicationOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.APP_URL || 'https://circulair.energy';
  const origin = httpOrigin(configured);
  if (!origin || (env.NODE_ENV === 'production' && !origin.startsWith('https://'))) {
    throw new Error('APP_URL must be a valid application URL (HTTPS in production)');
  }
  return origin;
}

/** Browser cookies must not authorize a mutation sent by another origin. */
export function isTrustedMutationOrigin(req: Request): boolean {
  const originHeader = req.headers.origin;
  if (!originHeader) return req.headers['sec-fetch-site'] !== 'cross-site';
  if (typeof originHeader !== 'string') return false;
  const origin = httpOrigin(originHeader);
  if (!origin) return false;
  const requestOrigin = httpOrigin(`${req.protocol}://${req.get('host')}`);
  const explicitlyAllowed = (process.env.ALLOWED_APP_ORIGINS || '').split(',').map(s => httpOrigin(s.trim())).filter(Boolean);
  try {
    return origin === requestOrigin || origin === getApplicationOrigin() || explicitlyAllowed.includes(origin);
  } catch {
    // Misconfiguration must reject the mutation, not turn a hostile Origin into HTTP 500.
    // Preserve the existing same-origin short circuit and production HTTPS requirement.
    return false;
  }
}
