import { describe, expect, it } from "vitest";
import { cycleFadePercentagePoints, cyclesToSohMarker } from "./numericalUnits";
import { flattenForecastForStorage, generateTwinForecast } from "./digitalTwin";
import { carbonStageData, comparisonChartData, daysToMarkerLabel, twinChartData } from "../client/src/lib/numericalPresentation";
import { calculateCarbonFootprint } from "./carbonModel";

const input = {
  bpan: "OFFLINE-TWIN", chemistry: "NMC", currentSoh: 90, cycleCount: 80,
  capacityKwh: 10, mfgYear: 2023, mfgMonth: 1,
  evaluationDate: new Date("2026-01-01T00:00:00.000Z"), forecastHorizonDays: 365,
};

describe("percentage point units, not fraction/100 multipliers", () => {
  it("80 full-equivalent cycles at .0025 percentage points/cycle lose .2 points", () => {
    expect(cycleFadePercentagePoints(0.0025, 80)).toBeCloseTo(0.2, 12);
    expect(cycleFadePercentagePoints(0.0025, 80, 2)).toBeCloseTo(0.4, 12);
  });
  it("RUL uses the same units: (99.8 - 80)/.0025 = 7920 cycles", () => {
    expect(cyclesToSohMarker(99.8, 0.0025)).toBe(7920);
  });
  it("preserves zero cycles, zero SOH and zero fade rate semantics", () => {
    expect(cycleFadePercentagePoints(0.0025, 0)).toBe(0);
    expect(cycleFadePercentagePoints(0, 80)).toBe(0);
    expect(cyclesToSohMarker(0, 0.0025)).toBe(0);
    expect(cyclesToSohMarker(80, 0.0025)).toBe(0);
    expect(cyclesToSohMarker(81, 0)).toBeNull();
  });
  it.each([-1, NaN, Infinity])("rejects invalid finite quantities %s", (value) => {
    expect(() => cycleFadePercentagePoints(value, 80)).toThrow(RangeError);
    expect(() => cycleFadePercentagePoints(0.0025, value)).toThrow(RangeError);
    expect(() => cyclesToSohMarker(value, 0.0025)).toThrow(RangeError);
  });
});

describe("anchored uncalibrated twin boundaries", () => {
  it("keeps day 0 equal to current SOH, including discordant BMS provenance", () => {
    const result = generateTwinForecast({ ...input, bmsSoh: 0 });
    for (const points of Object.values(result.scenarios)) expect(points[0].soh).toBe(90);
    expect(result.bmsSohInput).toBe(0);
    expect(result.confidence).toBeNull();
    expect(result.estimateStatus).toBe("demo_uncalibrated");
  });
  it("uses fixed manufacture date and evaluation anchoring: day 7 = 90 - 2.5×7/365.25 - .0025×.8×7", () => {
    const result = generateTwinForecast(input);
    expect(result.scenarios.nominal[1].soh).toBeCloseTo(90 - 2.5 * 7 / 365.25 - 0.0025 * 0.8 * 7, 12);
    expect(result.scenarios.nominal.at(-1)?.soh).toBeCloseTo(90 - 2.5 * 365 / 365.25 - 0.0025 * 0.8 * 365, 12);
    const older = generateTwinForecast({ ...input, mfgYear: 2000, cycleCount: 10000 });
    expect(older.scenarios).toEqual(result.scenarios); // historic losses already in current SOH
  });
  it.each([0, 1, 7, 30, 365, 1825])("is bounded/monotonic with exact final horizon %s", (forecastHorizonDays) => {
    const result = generateTwinForecast({ ...input, forecastHorizonDays });
    for (const points of Object.values(result.scenarios)) {
      expect(points[0]).toMatchObject({ day: 0, soh: 90 });
      expect(points.at(-1)?.day).toBe(forecastHorizonDays);
      expect(points.length).toBeLessThanOrEqual(263);
      for (let i = 0; i < points.length; i++) {
        expect(Number.isFinite(points[i].soh)).toBe(true);
        expect(points[i].soh).toBeGreaterThanOrEqual(0);
        expect(points[i].soh).toBeLessThanOrEqual(i ? points[i - 1].soh : 90);
        expect(result.scenarios.conservative[i].soh).toBeGreaterThanOrEqual(result.scenarios.nominal[i].soh);
        expect(result.scenarios.nominal[i].soh).toBeGreaterThanOrEqual(result.scenarios.aggressive[i].soh);
      }
    }
    expect(flattenForecastForStorage(result)).toHaveLength(result.scenarios.nominal.length * 3);
  });
  it.each([0, 79.99, 80])("preserves current SOH %s and a day-zero marker crossing", (currentSoh) => {
    const result = generateTwinForecast({ ...input, currentSoh });
    expect(result.scenarios.nominal[0].soh).toBe(currentSoh);
    expect(result.rulDaysNominal).toBe(0);
    expect(daysToMarkerLabel(result.rulDaysNominal)).toBe("0 days");
  });
  it("null means not crossed inside horizon, not zero or indefinite hardware lifetime", () => {
    const result = generateTwinForecast({ ...input, forecastHorizonDays: 7 });
    expect(result.rulDaysNominal).toBeNull();
    expect(daysToMarkerLabel(result.rulDaysNominal)).toBe("Not crossed in horizon");
  });
  it.each([
    { currentSoh: -1 }, { currentSoh: 101 }, { currentSoh: NaN }, { currentSoh: Infinity },
    { capacityKwh: 0 }, { cycleCount: -1 }, { bmsSoh: 101 }, { bmsSoh: NaN },
    { forecastHorizonDays: 1826 }, { forecastHorizonDays: -1 }, { forecastHorizonDays: 7.5 },
    { mfgYear: 2027 }, { mfgMonth: 0 }, { mfgMonth: 13 }, { chemistry: "UNKNOWN" },
    { evaluationDate: new Date("invalid") },
  ])("rejects invalid input rather than inventing values: %o", (override) => {
    expect(() => generateTwinForecast({ ...input, ...override })).toThrow(RangeError);
  });
});

describe("actual model-to-presentation numerical contracts", () => {
  it("carbon chart reads real absolute kg fields and preserves valid zeros", () => {
    const result = calculateCarbonFootprint({ bpan: "OFFLINE-CARBON", chemistry: "NMC", capacityKwh: 10, totalEnergyKwh: 0, transportDistanceKm: 0 });
    expect(carbonStageData(result).map((row) => row.value)).toEqual([850, 0, 0, 120]);
  });
  it("single and comparison twin charts use soh, not nonexistent predictedSoh", () => {
    const a = generateTwinForecast(input);
    const b = generateTwinForecast({ ...input, currentSoh: 0 });
    expect(twinChartData(a)[0]).toEqual({ day: 0, nominal: 90, conservative: 90, aggressive: 90 });
    expect(comparisonChartData(a, b)[0]).toEqual({ day: 0, batteryA: 90, batteryB: 0 });
    expect(comparisonChartData(a, b).at(-1)?.day).toBe(365);
  });
});
