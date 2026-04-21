import { describe, it, expect } from "vitest";
import { predictSohPhysics } from "./sohModel";

// Helper: manufacture date 3 years ago
const mfgYear = new Date().getFullYear() - 3;
const mfgMonth = 1;

describe("predictSohPhysics — NMC battery", () => {
  it("returns SOH between 0 and 100", () => {
    const result = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
    });
    expect(result.predictedSoh).toBeGreaterThanOrEqual(0);
    expect(result.predictedSoh).toBeLessThanOrEqual(100);
  });

  it("returns rulCycles >= 0", () => {
    const result = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
      cycleCount: 300,
    });
    expect(result.rulCycles).toBeGreaterThanOrEqual(0);
  });

  it("confidence increases when telemetry is provided", () => {
    const noTelemetry = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
    });
    const withTelemetry = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
      cycleCount: 300,
      irPack: 15,
      bmsReportedSoh: 82,
      tMax: 35,
    });
    expect(withTelemetry.confidence).toBeGreaterThan(noTelemetry.confidence);
  });

  it("BMS calibration blends BMS and physics SOH", () => {
    const withBms = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
      bmsReportedSoh: 90,
    });
    expect(withBms.breakdown.bmsCorrectionApplied).toBe(true);
    // BMS reports 90%, physics without BMS would be lower for a 3-year-old battery
    // Blended result should be between physics-only and 90
    expect(withBms.predictedSoh).toBeGreaterThan(80);
  });

  it("high cycle count reduces SOH", () => {
    const lowCycles = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
      cycleCount: 100,
    });
    const highCycles = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
      cycleCount: 1200,
    });
    expect(highCycles.predictedSoh).toBeLessThan(lowCycles.predictedSoh);
  });

  it("high temperature accelerates degradation", () => {
    const normalTemp = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
      tMax: 25,
    });
    const highTemp = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
      tMax: 55,
    });
    expect(highTemp.predictedSoh).toBeLessThan(normalTemp.predictedSoh);
  });

  it("high IR pack adds SOH penalty", () => {
    const lowIr = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
      irPack: 12, // near baseline
    });
    const highIr = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
      irPack: 60, // 5x baseline → significant penalty
    });
    expect(highIr.predictedSoh).toBeLessThan(lowIr.predictedSoh);
  });

  it("triage path follows SOH thresholds", () => {
    // Force a high SOH via BMS
    const high = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear: new Date().getFullYear(), // brand new
      mfgMonth: new Date().getMonth() + 1,
      bmsReportedSoh: 95,
    });
    expect(high.triagePath).toBe("direct_reuse");

    // Force a low SOH via many cycles
    const low = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear: new Date().getFullYear() - 10,
      mfgMonth: 1,
      cycleCount: 2000,
      bmsReportedSoh: 40,
    });
    expect(low.triagePath).toBe("material_recycling");
  });

  it("RMSE is within expected range (0.01 – 0.06)", () => {
    const result = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
    });
    expect(result.rmse).toBeGreaterThanOrEqual(0.01);
    expect(result.rmse).toBeLessThanOrEqual(0.06);
  });
});

describe("predictSohPhysics — LFP battery (longer life)", () => {
  it("LFP degrades slower than NMC for same age and cycles", () => {
    const input = {
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
      cycleCount: 500,
    };
    const nmc = predictSohPhysics({ ...input, chemistry: "NMC" });
    const lfp = predictSohPhysics({ ...input, chemistry: "LFP" });
    expect(lfp.predictedSoh).toBeGreaterThan(nmc.predictedSoh);
  });

  it("LFP has higher nominal cycle life than NMC", () => {
    const lfp = predictSohPhysics({
      chemistry: "LFP",
      capacityKwh: 10,
      mfgYear: new Date().getFullYear(), // brand new
      mfgMonth: new Date().getMonth() + 1,
      bmsReportedSoh: 100,
    });
    const nmc = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear: new Date().getFullYear(),
      mfgMonth: new Date().getMonth() + 1,
      bmsReportedSoh: 100,
    });
    expect(lfp.rulCycles).toBeGreaterThan(nmc.rulCycles);
  });
});

describe("predictSohPhysics — edge cases", () => {
  it("handles unknown chemistry gracefully (falls back to NMC params)", () => {
    const result = predictSohPhysics({
      chemistry: "UNKNOWN_CHEM",
      capacityKwh: 10,
      mfgYear,
      mfgMonth,
    });
    expect(result.predictedSoh).toBeGreaterThan(0);
    expect(result.predictedSoh).toBeLessThanOrEqual(100);
  });

  it("handles zero capacity without throwing", () => {
    expect(() =>
      predictSohPhysics({
        chemistry: "NMC",
        capacityKwh: 0,
        mfgYear,
        mfgMonth,
      })
    ).not.toThrow();
  });

  it("handles future manufacture date (0 calendar age)", () => {
    const result = predictSohPhysics({
      chemistry: "NMC",
      capacityKwh: 10,
      mfgYear: new Date().getFullYear() + 1,
      mfgMonth: 1,
    });
    expect(result.predictedSoh).toBeGreaterThanOrEqual(95); // near-new
  });

  it("SOH never exceeds 100 even with optimistic BMS reading", () => {
    const result = predictSohPhysics({
      chemistry: "LFP",
      capacityKwh: 10,
      mfgYear: new Date().getFullYear(),
      mfgMonth: new Date().getMonth() + 1,
      bmsReportedSoh: 100,
    });
    expect(result.predictedSoh).toBeLessThanOrEqual(100);
  });

  it("SOH never goes below 0 for extremely degraded battery", () => {
    const result = predictSohPhysics({
      chemistry: "LEAD_ACID",
      capacityKwh: 5,
      mfgYear: new Date().getFullYear() - 15,
      mfgMonth: 1,
      cycleCount: 5000,
      bmsReportedSoh: 10,
    });
    expect(result.predictedSoh).toBeGreaterThanOrEqual(0);
  });
});
