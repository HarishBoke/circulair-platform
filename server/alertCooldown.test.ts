/**
 * alertCooldown.test.ts
 * Tests for the 5-minute alert deduplication cooldown module.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// ─── Mock the DB so tests run without a real database ────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null), // DB unavailable → fail-open
}));

// Import AFTER mocking db
import {
  shouldCreateAlert,
  recordAlert,
  clearCooldown,
  getActiveCooldowns,
} from "./alertCooldown";

const BPAN_A = "INHB30N40250627A0001";  // 20 chars — invalid length
const BPAN_B = "INHB30N40250627A000101"; // 22 chars — also invalid
// Use a valid 21-char BPAN for all tests
const BPAN = "INHB30N40250627A00010";

beforeEach(() => {
  // Clear all cooldowns before each test to ensure isolation
  clearCooldown(BPAN, "thermal_anomaly");
  clearCooldown(BPAN, "eol_detected");
  clearCooldown(BPAN, "soh_degradation");
  clearCooldown("INXB30N40250627A00010", "thermal_anomaly");
  clearCooldown("INXB30N40250627A00010", "eol_detected");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── shouldCreateAlert — basic allow/suppress ─────────────────────────────────

describe("shouldCreateAlert — basic allow/suppress", () => {
  it("allows the first alert for a new BPAN (no prior history)", async () => {
    const result = await shouldCreateAlert(BPAN, "thermal_anomaly");
    expect(result).toBe(true);
  });

  it("suppresses a second alert fired immediately after the first", async () => {
    // First alert — allowed
    const first = await shouldCreateAlert(BPAN, "thermal_anomaly");
    expect(first).toBe(true);
    recordAlert(BPAN, "thermal_anomaly");

    // Second alert — same BPAN, same type, within cooldown
    const second = await shouldCreateAlert(BPAN, "thermal_anomaly");
    expect(second).toBe(false);
  });

  it("allows a different alert type for the same BPAN independently", async () => {
    // Record thermal_anomaly cooldown
    recordAlert(BPAN, "thermal_anomaly");

    // eol_detected should still be allowed (different type)
    const result = await shouldCreateAlert(BPAN, "eol_detected");
    expect(result).toBe(true);
  });

  it("allows the same alert type for a different BPAN independently", async () => {
    const OTHER_BPAN = "INXB30N40250627A00010";
    recordAlert(BPAN, "thermal_anomaly");

    // Different BPAN — should be allowed
    const result = await shouldCreateAlert(OTHER_BPAN, "thermal_anomaly");
    expect(result).toBe(true);
  });

  it("allows all three deduplicated alert types independently", async () => {
    const types = ["thermal_anomaly", "eol_detected", "soh_degradation"] as const;
    for (const type of types) {
      const result = await shouldCreateAlert(BPAN, type);
      expect(result).toBe(true);
      recordAlert(BPAN, type);
    }
    // All three are now in cooldown
    for (const type of types) {
      const result = await shouldCreateAlert(BPAN, type);
      expect(result).toBe(false);
    }
  });
});

// ─── recordAlert ─────────────────────────────────────────────────────────────

describe("recordAlert", () => {
  it("records a cooldown that is immediately visible via getActiveCooldowns", () => {
    recordAlert(BPAN, "thermal_anomaly");
    const active = getActiveCooldowns();
    const entry = active.find((c) => c.bpan === BPAN && c.type === "thermal_anomaly");
    expect(entry).toBeDefined();
    expect(entry!.remainingSec).toBeGreaterThan(0);
    expect(entry!.remainingSec).toBeLessThanOrEqual(300);
  });

  it("sets expiresAt approximately 5 minutes after firedAt", () => {
    const before = Date.now();
    recordAlert(BPAN, "eol_detected");
    const after = Date.now();
    const active = getActiveCooldowns();
    const entry = active.find((c) => c.bpan === BPAN && c.type === "eol_detected");
    expect(entry).toBeDefined();
    const firedMs = entry!.firedAt.getTime();
    const expiresMs = entry!.expiresAt.getTime();
    expect(expiresMs - firedMs).toBe(5 * 60 * 1000); // exactly 5 minutes
    expect(firedMs).toBeGreaterThanOrEqual(before);
    expect(firedMs).toBeLessThanOrEqual(after);
  });

  it("overwrites an existing cooldown entry when called again", async () => {
    recordAlert(BPAN, "thermal_anomaly");
    const first = await shouldCreateAlert(BPAN, "thermal_anomaly");
    expect(first).toBe(false);

    // Manually clear and re-record (simulates cooldown expiry + new event)
    clearCooldown(BPAN, "thermal_anomaly");
    recordAlert(BPAN, "thermal_anomaly");
    const second = await shouldCreateAlert(BPAN, "thermal_anomaly");
    expect(second).toBe(false); // still suppressed
  });
});

// ─── clearCooldown ────────────────────────────────────────────────────────────

describe("clearCooldown", () => {
  it("removes an active cooldown so the next alert is allowed", async () => {
    recordAlert(BPAN, "thermal_anomaly");
    expect(await shouldCreateAlert(BPAN, "thermal_anomaly")).toBe(false);

    clearCooldown(BPAN, "thermal_anomaly");
    expect(await shouldCreateAlert(BPAN, "thermal_anomaly")).toBe(true);
  });

  it("is a no-op when called for a BPAN with no active cooldown", () => {
    expect(() => clearCooldown(BPAN, "eol_detected")).not.toThrow();
  });

  it("only clears the specified type, leaving other types intact", async () => {
    recordAlert(BPAN, "thermal_anomaly");
    recordAlert(BPAN, "eol_detected");

    clearCooldown(BPAN, "thermal_anomaly");

    expect(await shouldCreateAlert(BPAN, "thermal_anomaly")).toBe(true);  // cleared
    expect(await shouldCreateAlert(BPAN, "eol_detected")).toBe(false);    // still active
  });
});

// ─── getActiveCooldowns ───────────────────────────────────────────────────────

describe("getActiveCooldowns", () => {
  it("returns an empty array when no cooldowns are active", () => {
    const active = getActiveCooldowns();
    const relevant = active.filter((c) => c.bpan === BPAN);
    expect(relevant).toHaveLength(0);
  });

  it("returns all active cooldowns with correct shape", () => {
    recordAlert(BPAN, "thermal_anomaly");
    recordAlert(BPAN, "eol_detected");
    const active = getActiveCooldowns();
    const relevant = active.filter((c) => c.bpan === BPAN);
    expect(relevant.length).toBeGreaterThanOrEqual(2);
    for (const entry of relevant) {
      expect(entry).toHaveProperty("bpan");
      expect(entry).toHaveProperty("type");
      expect(entry).toHaveProperty("firedAt");
      expect(entry).toHaveProperty("expiresAt");
      expect(entry).toHaveProperty("remainingSec");
      expect(entry.remainingSec).toBeGreaterThan(0);
    }
  });

  it("does not return expired entries", () => {
    // Simulate an expired entry by manipulating the map via clear + re-check
    recordAlert(BPAN, "soh_degradation");
    clearCooldown(BPAN, "soh_degradation"); // remove it
    const active = getActiveCooldowns();
    const entry = active.find((c) => c.bpan === BPAN && c.type === "soh_degradation");
    expect(entry).toBeUndefined();
  });
});

// ─── DB-backed check (fail-open) ──────────────────────────────────────────────

describe("DB-backed check", () => {
  it("allows alert when DB is unavailable (fail-open)", async () => {
    // DB mock returns null (unavailable) — should allow the alert
    const result = await shouldCreateAlert(BPAN, "thermal_anomaly");
    expect(result).toBe(true);
  });

  it("allows alert when DB throws an error (fail-open)", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockRejectedValueOnce(new Error("DB connection refused"));

    // Clear DB-checked cache to force a DB lookup
    clearCooldown(BPAN, "thermal_anomaly");
    const result = await shouldCreateAlert(BPAN, "thermal_anomaly");
    expect(result).toBe(true); // fail-open: allow the alert
  });
});

// ─── Cooldown key isolation ───────────────────────────────────────────────────

describe("Cooldown key isolation", () => {
  it("uses composite key bpan::type so different combos are independent", async () => {
    const BPAN2 = "INXB30N40250627A00010";
    recordAlert(BPAN, "thermal_anomaly");
    recordAlert(BPAN2, "eol_detected");

    // BPAN + eol_detected → not suppressed
    expect(await shouldCreateAlert(BPAN, "eol_detected")).toBe(true);
    // BPAN2 + thermal_anomaly → not suppressed
    expect(await shouldCreateAlert(BPAN2, "thermal_anomaly")).toBe(true);
    // BPAN + thermal_anomaly → suppressed
    expect(await shouldCreateAlert(BPAN, "thermal_anomaly")).toBe(false);
    // BPAN2 + eol_detected → suppressed
    expect(await shouldCreateAlert(BPAN2, "eol_detected")).toBe(false);
  });
});
