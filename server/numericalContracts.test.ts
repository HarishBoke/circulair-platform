import { describe, expect, it } from "vitest";
import { buildCarbonInputFromBattery, buildTwinInputFromBattery, canonicalBatteryNumerics, storedTriageNumerics, triageRouteFromDecision } from "./numericalContracts";
import { evaluateTriagePath } from "./autonomousTriage";

const battery = { bpan: "IDENTITY-WITH-NO-MODEL-OFFSETS", chemistry: "LFP", capacityKwh: "2.50", mfgYear: 2023, mfgMonth: 4, currentSoh: "0", cycleCount: 0 };

describe("canonical stored numerical inputs (offline, no DB imports)", () => {
  it("uses stored properties rather than decoding BPAN or guessing defaults", () => {
    expect(buildTwinInputFromBattery(battery, 30)).toEqual({ bpan: battery.bpan, chemistry: "LFP", capacityKwh: 2.5, currentSoh: 0, cycleCount: 0, mfgYear: 2023, mfgMonth: 4, forecastHorizonDays: 30 });
    expect(buildCarbonInputFromBattery(battery, { totalEnergyKwh: 0, transportDistanceKm: 0 })).toEqual({ bpan: battery.bpan, chemistry: "LFP", capacityKwh: 2.5, totalEnergyKwh: 0, transportDistanceKm: 0 });
    expect(storedTriageNumerics(battery)).toEqual({ chemistry: "LFP", capacityKwh: 2.5, soh: 0, cycleCount: 0 });
  });
  it.each([null, "", " ", "NaN", "Infinity", "-1", "101"])("rejects unknown/out-of-range SOH %s instead of guessing 85", (currentSoh) => {
    expect(() => buildTwinInputFromBattery({ ...battery, currentSoh }, 30)).toThrow(RangeError);
  });
  it.each(["", " ", "0", "-1", "NaN", "Infinity"])("rejects missing/nonpositive capacity %s", (capacityKwh) => {
    expect(() => canonicalBatteryNumerics({ ...battery, capacityKwh })).toThrow(RangeError);
  });
  it("rejects unknown cycles instead of inventing zero; preserves explicit zero", () => {
    expect(() => buildTwinInputFromBattery({ ...battery, cycleCount: null }, 30)).toThrow(RangeError);
    expect(buildTwinInputFromBattery(battery, 30).cycleCount).toBe(0);
  });
  it("rejects unsupported chemistry", () => {
    expect(() => canonicalBatteryNumerics({ ...battery, chemistry: "UNKNOWN" })).toThrow(RangeError);
  });
});

describe("exact triage backend-to-UI route mapping, not hardware authorization", () => {
  it.each([{ soh: 90, route: "reuse" }, { soh: 65, route: "repurpose" }, { soh: 40, route: "recycle" }])("SOH $soh maps to $route without recycling fallback", ({ soh, route }) => {
    const decision = evaluateTriagePath({ bpan: "OFFLINE", soh, cycleCount: 80, chemistry: "NMC", capacityKwh: 10, hasActiveFaults: false, hasPhysicalDamage: false });
    expect(triageRouteFromDecision(decision)).toBe(route);
  });
});
