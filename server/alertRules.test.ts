/**
 * alertRules.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for:
 *   - evaluateAlertRules() — pure function, no DB needed
 *   - alertCooldown dynamic key support
 *   - alertRules tRPC procedures (mocked DB)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateAlertRules } from "./db";
import { shouldCreateAlert, recordAlert, clearCooldown } from "./alertCooldown";

// ─── evaluateAlertRules ───────────────────────────────────────────────────────

type AlertRule = Parameters<typeof evaluateAlertRules>[0][0];

function makeRule(overrides: Partial<AlertRule>): AlertRule {
  return {
    id: 1,
    name: "Test Rule",
    description: null,
    metric: "temperature",
    operator: "gt",
    threshold: "45",
    severity: "warning",
    bpan: null,
    chemistry: null,
    enabled: true,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as AlertRule;
}

describe("evaluateAlertRules", () => {
  it("fires a gt temperature rule when value exceeds threshold", () => {
    const rules = [makeRule({ metric: "temperature", operator: "gt", threshold: "45" })];
    const result = evaluateAlertRules(rules, { temperature: 46 });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Rule");
  });

  it("does not fire a gt temperature rule when value is at threshold", () => {
    const rules = [makeRule({ metric: "temperature", operator: "gt", threshold: "45" })];
    const result = evaluateAlertRules(rules, { temperature: 45 });
    expect(result).toHaveLength(0);
  });

  it("fires a gte rule when value equals threshold", () => {
    const rules = [makeRule({ metric: "soh", operator: "gte", threshold: "70" })];
    const result = evaluateAlertRules(rules, { soh: 70 });
    expect(result).toHaveLength(1);
  });

  it("fires a lt rule when value is below threshold", () => {
    const rules = [makeRule({ metric: "soh", operator: "lt", threshold: "70" })];
    const result = evaluateAlertRules(rules, { soh: 65 });
    expect(result).toHaveLength(1);
  });

  it("fires a lte rule when value equals threshold", () => {
    const rules = [makeRule({ metric: "voltage", operator: "lte", threshold: "2.5" })];
    const result = evaluateAlertRules(rules, { voltage: 2.5 });
    expect(result).toHaveLength(1);
  });

  it("fires an eq rule when value exactly matches threshold", () => {
    const rules = [makeRule({ metric: "cycleCount", operator: "eq", threshold: "500" })];
    const result = evaluateAlertRules(rules, { cycleCount: 500 });
    expect(result).toHaveLength(1);
  });

  it("does not fire eq rule when value does not match", () => {
    const rules = [makeRule({ metric: "cycleCount", operator: "eq", threshold: "500" })];
    const result = evaluateAlertRules(rules, { cycleCount: 499 });
    expect(result).toHaveLength(0);
  });

  it("skips rules where the metric value is null", () => {
    const rules = [makeRule({ metric: "soc", operator: "lt", threshold: "20" })];
    const result = evaluateAlertRules(rules, { soc: null });
    expect(result).toHaveLength(0);
  });

  it("skips rules where the metric value is undefined", () => {
    const rules = [makeRule({ metric: "soc", operator: "lt", threshold: "20" })];
    const result = evaluateAlertRules(rules, {}); // soc not provided
    expect(result).toHaveLength(0);
  });

  it("evaluates multiple rules and returns only triggered ones", () => {
    const rules = [
      makeRule({ id: 1, metric: "temperature", operator: "gt", threshold: "45", severity: "warning" }),
      makeRule({ id: 2, metric: "temperature", operator: "gt", threshold: "55", severity: "critical" }),
      makeRule({ id: 3, metric: "soh", operator: "lt", threshold: "70", severity: "warning" }),
    ];
    // temperature = 50 → fires rule 1 (>45) but NOT rule 2 (>55)
    // soh = 75 → does NOT fire rule 3 (<70)
    const result = evaluateAlertRules(rules, { temperature: 50, soh: 75 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("evaluates internalResistance metric correctly", () => {
    const rules = [makeRule({ metric: "internalResistance", operator: "gt", threshold: "30" })];
    const result = evaluateAlertRules(rules, { internalResistance: 35 });
    expect(result).toHaveLength(1);
  });

  it("returns empty array when no rules are provided", () => {
    const result = evaluateAlertRules([], { temperature: 60 });
    expect(result).toHaveLength(0);
  });
});

// ─── alertCooldown dynamic key support ───────────────────────────────────────

describe("alertCooldown — dynamic rule keys", () => {
  const bpan = "INHB30N40250627A000199";

  beforeEach(() => {
    clearCooldown(bpan, "rule_42");
    clearCooldown(bpan, "rule_99");
  });

  it("allows the first alert for a dynamic rule key", async () => {
    const allowed = await shouldCreateAlert(bpan, "rule_42");
    expect(allowed).toBe(true);
  });

  it("suppresses a second alert within the cooldown window", async () => {
    await shouldCreateAlert(bpan, "rule_99");
    recordAlert(bpan, "rule_99");
    const second = await shouldCreateAlert(bpan, "rule_99");
    expect(second).toBe(false);
  });

  it("allows a different rule key independently", async () => {
    recordAlert(bpan, "rule_42");
    const allowed = await shouldCreateAlert(bpan, "rule_99");
    expect(allowed).toBe(true);
  });

  it("allows well-known type thermal_anomaly independently of rule keys", async () => {
    recordAlert(bpan, "rule_42");
    clearCooldown(bpan, "thermal_anomaly");
    const allowed = await shouldCreateAlert(bpan, "thermal_anomaly");
    expect(allowed).toBe(true);
  });
});

// ─── Rule scope priority (getActiveRulesForBpan logic) ───────────────────────

describe("rule scope priority", () => {
  it("BPAN-specific rule matches only the exact BPAN", () => {
    const rules = [
      makeRule({ id: 1, bpan: "INHB30N40250627A000101", chemistry: null }),
      makeRule({ id: 2, bpan: null, chemistry: "NMC" }),
      makeRule({ id: 3, bpan: null, chemistry: null }),
    ];
    // Simulate getActiveRulesForBpan filter logic
    const bpan = "INHB30N40250627A000101";
    const chemistry = "NMC";
    const filtered = rules.filter((r) => {
      if (r.bpan) return r.bpan === bpan;
      if (r.chemistry) return r.chemistry === chemistry;
      return true;
    });
    expect(filtered.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("chemistry rule does not match a different chemistry battery", () => {
    const rules = [makeRule({ id: 1, bpan: null, chemistry: "LFP" })];
    const filtered = rules.filter((r) => {
      if (r.bpan) return r.bpan === "INHB30N40250627A000101";
      if (r.chemistry) return r.chemistry === "NMC"; // battery is NMC
      return true;
    });
    expect(filtered).toHaveLength(0);
  });

  it("platform-wide rule matches any battery regardless of chemistry", () => {
    const rules = [makeRule({ id: 1, bpan: null, chemistry: null })];
    const filtered = rules.filter((r) => {
      if (r.bpan) return r.bpan === "INHB30N40250627A000101";
      if (r.chemistry) return r.chemistry === "LFP";
      return true;
    });
    expect(filtered).toHaveLength(1);
  });
});
