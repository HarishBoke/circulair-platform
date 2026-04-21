/**
 * alertCooldown.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Prevents alert flooding by enforcing a per-BPAN, per-alert-type cooldown
 * window.  Two layers of protection:
 *
 *  1. In-memory map  — zero-latency check for the common case (same process,
 *     server running continuously).  Entries are auto-expired after the
 *     cooldown window so the map never grows unbounded.
 *
 *  2. DB-backed check — consulted on the first call for a given key (i.e.
 *     after a server restart) to honour cooldowns that were set before the
 *     process was recycled.  This prevents a restart from resetting all
 *     cooldowns and causing a burst of duplicate alerts.
 *
 * Usage:
 *   import { shouldCreateAlert, recordAlert } from "./alertCooldown";
 *
 *   if (await shouldCreateAlert(bpan, "thermal_anomaly")) {
 *     await createAlert({ ... });
 *     recordAlert(bpan, "thermal_anomaly");   // sync — no await needed
 *   }
 *
 *   // Dynamic rule-based keys are also supported:
 *   if (await shouldCreateAlert(bpan, "rule_42")) { ... }
 */

import { and, desc, eq, gte } from "drizzle-orm";
import { alerts } from "../drizzle/schema";
import { getDb } from "./db";

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Alert types that are subject to deduplication.
 * The `string & {}` union allows arbitrary dynamic keys (e.g. "rule_42")
 * while still providing autocomplete for the well-known types.
 */
export type DeduplicatedAlertType =
  | "thermal_anomaly"
  | "eol_detected"
  | "soh_degradation"
  | "threshold_breach"
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

/** Default cooldown duration for unknown/dynamic types (5 minutes). */
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

/** Cooldown durations per well-known alert type (milliseconds). */
const COOLDOWN_MS_MAP: Record<string, number> = {
  thermal_anomaly:  5 * 60 * 1000,
  eol_detected:     5 * 60 * 1000,
  soh_degradation:  5 * 60 * 1000,
  threshold_breach: 5 * 60 * 1000,
};

function getCooldownMs(type: string): number {
  return COOLDOWN_MS_MAP[type] ?? DEFAULT_COOLDOWN_MS;
}

// ─── In-memory cooldown map ───────────────────────────────────────────────────

/**
 * Key: `${bpan}::${alertType}`
 * Value: timestamp (ms) when the last alert was fired
 */
const _cooldownMap = new Map<string, number>();

/** Set of keys whose DB check has already been performed this process lifetime. */
const _dbChecked = new Set<string>();

function cooldownKey(bpan: string, type: string): string {
  return `${bpan}::${type}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns `true` if an alert of the given type should be created for this BPAN.
 * Returns `false` if a duplicate alert was already fired within the cooldown window.
 *
 * This function is async because the first call per key may consult the database.
 */
export async function shouldCreateAlert(
  bpan: string,
  type: DeduplicatedAlertType
): Promise<boolean> {
  const key = cooldownKey(bpan, type);
  const cooldownMs = getCooldownMs(type);
  const now = Date.now();

  // ── Layer 1: in-memory check (fast path) ──────────────────────────────────
  const lastFiredAt = _cooldownMap.get(key);
  if (lastFiredAt !== undefined) {
    const elapsed = now - lastFiredAt;
    if (elapsed < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - elapsed) / 1000);
      console.log(
        `[AlertCooldown] Suppressed ${type} for ${bpan} — cooldown active (${remainingSec}s remaining)`
      );
      return false;
    }
    // Cooldown expired — allow and refresh
    return true;
  }

  // ── Layer 2: DB-backed check (first call after server restart) ────────────
  // Only perform DB check for well-known alert types (not dynamic rule keys)
  const isWellKnownType = type in COOLDOWN_MS_MAP;
  if (isWellKnownType && !_dbChecked.has(key)) {
    _dbChecked.add(key);
    try {
      const db = await getDb();
      if (db) {
        const cutoff = new Date(now - cooldownMs);
        const recent = await db
          .select({ id: alerts.id, createdAt: alerts.createdAt })
          .from(alerts)
          .where(
            and(
              eq(alerts.bpan, bpan),
              eq(alerts.type, type as any),
              gte(alerts.createdAt, cutoff)
            )
          )
          .orderBy(desc(alerts.createdAt))
          .limit(1);

        if (recent.length > 0) {
          const lastTs = recent[0].createdAt.getTime();
          const elapsed = now - lastTs;
          if (elapsed < cooldownMs) {
            // Seed the in-memory map so subsequent calls are fast
            _cooldownMap.set(key, lastTs);
            const remainingSec = Math.ceil((cooldownMs - elapsed) / 1000);
            console.log(
              `[AlertCooldown] Suppressed ${type} for ${bpan} — DB cooldown active (${remainingSec}s remaining, seeded from DB)`
            );
            return false;
          }
        }
      }
    } catch (err) {
      // If DB check fails, allow the alert (fail-open — better to have a
      // duplicate than to miss a critical thermal alert).
      console.warn(`[AlertCooldown] DB check failed for ${key}:`, err);
    }
  }

  return true;
}

/**
 * Record that an alert was just created.  Call this immediately after a
 * successful `createAlert()` call.  Synchronous — no await required.
 *
 * Also schedules automatic expiry of the in-memory entry so the map stays lean.
 */
export function recordAlert(bpan: string, type: DeduplicatedAlertType): void {
  const key = cooldownKey(bpan, type);
  const cooldownMs = getCooldownMs(type);
  const now = Date.now();

  _cooldownMap.set(key, now);
  console.log(`[AlertCooldown] Recorded ${type} for ${bpan} — cooldown active for ${cooldownMs / 1000}s`);

  // Auto-expire the in-memory entry after the cooldown window
  setTimeout(() => {
    const current = _cooldownMap.get(key);
    if (current === now) {
      _cooldownMap.delete(key);
      console.log(`[AlertCooldown] Cooldown expired for ${type} / ${bpan}`);
    }
  }, cooldownMs + 1000); // +1s buffer
}

/**
 * Manually clear a cooldown entry (useful in tests or admin overrides).
 */
export function clearCooldown(bpan: string, type: DeduplicatedAlertType): void {
  const key = cooldownKey(bpan, type);
  _cooldownMap.delete(key);
  _dbChecked.delete(key);
}

/**
 * Return a snapshot of all active in-memory cooldowns.
 * Useful for admin dashboards and debugging.
 */
export function getActiveCooldowns(): Array<{
  bpan: string;
  type: string;
  firedAt: Date;
  expiresAt: Date;
  remainingSec: number;
}> {
  const now = Date.now();
  const result: ReturnType<typeof getActiveCooldowns> = [];

  for (const [key, firedAt] of Array.from(_cooldownMap.entries())) {
    const parts = key.split("::");
    const bpan = parts[0];
    const type = parts.slice(1).join("::");
    const cooldownMs = getCooldownMs(type);
    const expiresAt = firedAt + cooldownMs;
    const remainingSec = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    if (remainingSec > 0) {
      result.push({
        bpan,
        type,
        firedAt: new Date(firedAt),
        expiresAt: new Date(expiresAt),
        remainingSec,
      });
    }
  }

  return result;
}
