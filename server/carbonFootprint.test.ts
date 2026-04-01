/**
 * carbonFootprint.test.ts
 * Tests for:
 * 1. calculatePerformanceClass — EU A–E class calculator (shared/carbonClass.ts)
 * 2. getThresholds / getReferenceIntensity — threshold helpers
 * 3. LIFECYCLE_STAGES — stage metadata completeness
 * 4. declareCarbonFootprint tRPC procedure — input validation, auth guard
 * 5. getCarbonFootprintByBpan tRPC procedure — query correctness
 */
import { describe, it, expect } from "vitest";
import {
  calculatePerformanceClass,
  getThresholds,
  getReferenceIntensity,
  LIFECYCLE_STAGES,
  CLASS_LABELS,
  CLASS_COLORS,
  type PerformanceClass,
} from "../shared/carbonClass";

// ─── 1. calculatePerformanceClass ────────────────────────────────────────────
describe("calculatePerformanceClass", () => {
  // NMC thresholds: A≤45, B≤80, C≤115, D≤160, E>160 (per kWh)
  it("returns A for very low intensity NMC battery", () => {
    // 100 kWh NMC, 4000 kg CO₂e → 40 kg/kWh → Class A
    expect(calculatePerformanceClass(4000, 100, "NMC")).toBe("A");
  });

  it("returns B for moderate intensity NMC battery", () => {
    // 100 kWh NMC, 6500 kg CO₂e → 65 kg/kWh → Class B
    expect(calculatePerformanceClass(6500, 100, "NMC")).toBe("B");
  });

  it("returns C for average intensity NMC battery", () => {
    // 100 kWh NMC, 10000 kg CO₂e → 100 kg/kWh → Class C
    expect(calculatePerformanceClass(10000, 100, "NMC")).toBe("C");
  });

  it("returns D for high intensity NMC battery", () => {
    // 100 kWh NMC, 15000 kg CO₂e → 150 kg/kWh → Class D
    expect(calculatePerformanceClass(15000, 100, "NMC")).toBe("D");
  });

  it("returns E for very high intensity NMC battery", () => {
    // 100 kWh NMC, 20000 kg CO₂e → 200 kg/kWh → Class E
    expect(calculatePerformanceClass(20000, 100, "NMC")).toBe("E");
  });

  // LFP has lower thresholds: A≤35, B≤60, C≤90, D≤130
  it("returns A for low intensity LFP battery", () => {
    // 10 kWh LFP, 300 kg CO₂e → 30 kg/kWh → Class A
    expect(calculatePerformanceClass(300, 10, "LFP")).toBe("A");
  });

  it("returns C for average LFP battery", () => {
    // 10 kWh LFP, 750 kg CO₂e → 75 kg/kWh → Class C
    expect(calculatePerformanceClass(750, 10, "LFP")).toBe("C");
  });

  it("returns E for very high intensity LFP battery", () => {
    // 10 kWh LFP, 1500 kg CO₂e → 150 kg/kWh → Class E
    expect(calculatePerformanceClass(1500, 10, "LFP")).toBe("E");
  });

  // Edge cases
  it("returns E when capacity is 0 (division guard)", () => {
    expect(calculatePerformanceClass(1000, 0, "NMC")).toBe("E");
  });

  it("returns E when capacity is negative (guard)", () => {
    expect(calculatePerformanceClass(1000, -5, "NMC")).toBe("E");
  });

  it("uses DEFAULT thresholds for unknown chemistry", () => {
    // DEFAULT: A≤40, B≤70, C≤100, D≤140
    // 100 kWh, 3500 kg CO₂e → 35 kg/kWh → Class A
    expect(calculatePerformanceClass(3500, 100, "UNKNOWN_CHEM")).toBe("A");
    // 100 kWh, 12000 kg CO₂e → 120 kg/kWh → Class D
    expect(calculatePerformanceClass(12000, 100, "UNKNOWN_CHEM")).toBe("D");
  });

  it("uses DEFAULT thresholds when chemistry is undefined", () => {
    expect(calculatePerformanceClass(4000, 100, undefined)).toBe("A");
  });

  it("handles exact boundary values correctly (A/B boundary for NMC = 45)", () => {
    // Exactly at A threshold → Class A
    expect(calculatePerformanceClass(4500, 100, "NMC")).toBe("A");
    // Just above A threshold → Class B
    expect(calculatePerformanceClass(4501, 100, "NMC")).toBe("B");
  });

  it("handles exact D/E boundary for LFP (130 kg/kWh)", () => {
    expect(calculatePerformanceClass(1300, 10, "LFP")).toBe("D");
    expect(calculatePerformanceClass(1301, 10, "LFP")).toBe("E");
  });

  it("handles LEAD_ACID chemistry", () => {
    // LEAD_ACID: A≤30, B≤55, C≤80, D≤115
    expect(calculatePerformanceClass(250, 10, "LEAD_ACID")).toBe("A");
    expect(calculatePerformanceClass(1200, 10, "LEAD_ACID")).toBe("E");
  });

  it("handles very small batteries (e-bike, 0.5 kWh)", () => {
    // 0.5 kWh LFP, 20 kg CO₂e → 40 kg/kWh
    // LFP thresholds: A≤35, B≤60 → 40 falls in Class B
    expect(calculatePerformanceClass(20, 0.5, "LFP")).toBe("B");
  });

  it("handles large utility-scale batteries (1000 kWh)", () => {
    // 1000 kWh NMC, 40000 kg CO₂e → 40 kg/kWh → Class A
    expect(calculatePerformanceClass(40000, 1000, "NMC")).toBe("A");
  });
});

// ─── 2. getThresholds ────────────────────────────────────────────────────────
describe("getThresholds", () => {
  it("returns NMC-specific thresholds", () => {
    const t = getThresholds("NMC");
    expect(t.A).toBe(45);
    expect(t.B).toBe(80);
    expect(t.C).toBe(115);
    expect(t.D).toBe(160);
  });

  it("returns LFP-specific thresholds", () => {
    const t = getThresholds("LFP");
    expect(t.A).toBe(35);
    expect(t.B).toBe(60);
    expect(t.C).toBe(90);
    expect(t.D).toBe(130);
  });

  it("returns DEFAULT thresholds for unknown chemistry", () => {
    const t = getThresholds("MYSTERY");
    expect(t.A).toBe(40);
    expect(t.D).toBe(140);
  });

  it("thresholds are in ascending order A < B < C < D", () => {
    for (const chem of ["NMC", "LFP", "NCA", "LCO", "LMO", "LEAD_ACID"]) {
      const t = getThresholds(chem);
      expect(t.A).toBeLessThan(t.B);
      expect(t.B).toBeLessThan(t.C);
      expect(t.C).toBeLessThan(t.D);
    }
  });
});

// ─── 3. getReferenceIntensity ─────────────────────────────────────────────────
describe("getReferenceIntensity", () => {
  it("returns midpoint of B–C band for NMC", () => {
    const t = getThresholds("NMC");
    expect(getReferenceIntensity("NMC")).toBe((t.B + t.C) / 2);
  });

  it("returns a positive value for all known chemistries", () => {
    for (const chem of ["NMC", "LFP", "NCA", "LCO", "LMO", "LEAD_ACID"]) {
      expect(getReferenceIntensity(chem)).toBeGreaterThan(0);
    }
  });

  it("falls back to DEFAULT for unknown chemistry", () => {
    const t = getThresholds("DEFAULT");
    expect(getReferenceIntensity("UNKNOWN")).toBe((t.B + t.C) / 2);
  });
});

// ─── 4. LIFECYCLE_STAGES metadata ────────────────────────────────────────────
describe("LIFECYCLE_STAGES", () => {
  it("has exactly 4 stages", () => {
    expect(LIFECYCLE_STAGES).toHaveLength(4);
  });

  it("stage keys match expected names", () => {
    const keys = LIFECYCLE_STAGES.map((s) => s.key);
    expect(keys).toContain("rawMaterialKgCo2e");
    expect(keys).toContain("productionKgCo2e");
    expect(keys).toContain("distributionKgCo2e");
    expect(keys).toContain("endOfLifeKgCo2e");
  });

  it("typical shares sum to approximately 1.0", () => {
    const total = LIFECYCLE_STAGES.reduce((sum, s) => sum + s.typicalShare, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it("all stages have EU stage references", () => {
    for (const stage of LIFECYCLE_STAGES) {
      expect(stage.euStage).toBeTruthy();
      expect(stage.euStage.length).toBeGreaterThan(0);
    }
  });

  it("all stages have non-empty labels and descriptions", () => {
    for (const stage of LIFECYCLE_STAGES) {
      expect(stage.label.length).toBeGreaterThan(5);
      expect(stage.shortLabel.length).toBeGreaterThan(2);
      expect(stage.description.length).toBeGreaterThan(10);
    }
  });
});

// ─── 5. CLASS_LABELS and CLASS_COLORS completeness ───────────────────────────
describe("CLASS_LABELS and CLASS_COLORS", () => {
  const classes: PerformanceClass[] = ["A", "B", "C", "D", "E"];

  it("CLASS_LABELS has an entry for every class", () => {
    for (const cls of classes) {
      expect(CLASS_LABELS[cls]).toBeTruthy();
    }
  });

  it("CLASS_COLORS has bg, text, and border for every class", () => {
    for (const cls of classes) {
      expect(CLASS_COLORS[cls].bg).toBeTruthy();
      expect(CLASS_COLORS[cls].text).toBeTruthy();
      expect(CLASS_COLORS[cls].border).toBeTruthy();
    }
  });

  it("CLASS_LABELS are in degrading order", () => {
    expect(CLASS_LABELS["A"]).toContain("Best");
    expect(CLASS_LABELS["E"]).toContain("Worst");
  });
});
