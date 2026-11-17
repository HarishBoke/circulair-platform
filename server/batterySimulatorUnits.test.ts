import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAllStates,
  generateReading,
  getOrCreateState,
  type BatterySimState,
} from "./batterySimulator";

// Independent fixtures for the demo profiles; resistance is for the whole pack.
const profiles = [
  { chemistry: "LFP", seriesCells: 120, vNominal: 3.2, vMin: 2.5, vMax: 3.65, irBaseMilliOhm: 10, maxCharge: 100, maxDischarge: 200 },
  { chemistry: "NMC", seriesCells: 96, vNominal: 3.65, vMin: 3.0, vMax: 4.2, irBaseMilliOhm: 15, maxCharge: 80, maxDischarge: 150 },
  { chemistry: "LEAD_ACID", seriesCells: 6, vNominal: 2.0, vMin: 1.75, vMax: 2.4, irBaseMilliOhm: 50, maxCharge: 50, maxDischarge: 200 },
] as const;

const originalRandom = Math.random;
const cases = profiles.flatMap((profile) =>
  [false, true].flatMap((isCharging) =>
    [0, 1 - Number.EPSILON].flatMap((random) =>
      [0, 100].flatMap((soc) =>
        [20, 100].map((soh) => ({
          ...profile,
          isCharging,
          direction: isCharging ? "charge" : "discharge",
          random,
          randomLabel: random === 0 ? "minimum" : "maximum",
          soc,
          soh,
        }))
      )
    )
  )
);

function controlState(chemistry: string, overrides: Partial<BatterySimState>) {
  const state = getOrCreateState(`UNITS-${chemistry}`, chemistry);
  Object.assign(state, {
    soc: 50,
    soh: 100,
    cycleCount: 100,
    tPack: 25,
    tAmbient: 25,
    isCharging: false,
    directionTicks: 0,
    anomalyCountdown: 1000,
    thermalSpikeActive: false,
    spikeTicks: 0,
    ...overrides,
  });
  return state;
}

beforeEach(() => {
  expect(Math.random).toBe(originalRandom);
  clearAllStates();
});

afterEach(() => {
  vi.restoreAllMocks();
  clearAllStates();
  expect(Math.random).toBe(originalRandom);
});

describe("battery simulator pack/cell resistance units (demo model)", () => {
  it.each(cases)(
    "$chemistry $direction: RNG $randomLabel, SOC $soc%, SOH $soh% applies I * R once per pack",
    (testCase) => {
      vi.spyOn(Math, "random").mockReturnValue(testCase.random);
      const state = controlState(testCase.chemistry, {
        soc: testCase.soc,
        soh: testCase.soh,
        isCharging: testCase.isCharging,
      });

      const magnitude = testCase.isCharging
        ? 10 + testCase.random * testCase.maxCharge * 0.8
        : 15 + testCase.random * testCase.maxDischarge * 0.6;
      const signedCurrent = Number(((testCase.isCharging ? 1 : -1) * magnitude).toFixed(1));
      const capacityAh = 50000 / (testCase.vNominal * testCase.seriesCells);
      const deltaSoc = (magnitude * 2 / 3600 / capacityAh) * 100;
      const nextSoc = testCase.isCharging
        ? Math.min(100, testCase.soc + deltaSoc)
        : Math.max(0, testCase.soc - deltaSoc);
      const ocvCell = testCase.vMin + (testCase.vMax - testCase.vMin) * nextSoc / 100;
      const packResistanceOhm =
        (testCase.irBaseMilliOhm + (100 - testCase.soh) * 0.4) *
        (1 + testCase.random * 0.05) / 1000;
      // A * ohm = V. The pack drop must NOT be multiplied by seriesCells.
      const expectedPackVoltage = ocvCell * testCase.seriesCells + signedCurrent * packResistanceOhm;
      const expectedCellVoltage = ocvCell + signedCurrent * packResistanceOhm / testCase.seriesCells;
      const spread = 0.02 + (100 - testCase.soh) * 0.001;

      // Preserve every extreme fixture and the independent I*R arithmetic.
      // Previously nonpositive lead-acid voltages were asserted as valid output;
      // those same inputs now MUST fail closed, not be removed or clamped.
      const expectedMin = Number((expectedCellVoltage - spread / 2 - testCase.random * 0.01).toFixed(3));
      if (Number(expectedPackVoltage.toFixed(2)) <= 0 || expectedMin <= 0) {
        expect(() => generateReading(state.bpan, testCase.chemistry)).toThrow(RangeError);
        expect(state.soh).toBe(testCase.soh);
        expect(state.cycleCount).toBe(100);
        return;
      }

      const reading = generateReading(state.bpan, testCase.chemistry);
      expect(reading.iPack).toBe(signedCurrent);
      expect(state.soc).toBeCloseTo(nextSoc, 12);
      expect(state.isCharging).toBe(testCase.isCharging);
      expect(state.soh).toBe(testCase.soh);
      expect(state.directionTicks).toBe(1);
      expect(reading.cycleCount).toBe(100);
      expect(state.anomalyCountdown).toBe(999);
      expect(reading.thermalAnomaly).toBe(false);
      expect(reading.anomalyType).toBeUndefined();
      expect(reading.source).toBe("simulated");
      expect(reading.vPack).toBe(Number(expectedPackVoltage.toFixed(2)));
      expect(reading.vMin).toBe(Number((expectedCellVoltage - spread / 2 - testCase.random * 0.01).toFixed(3)));
      expect(reading.vMax).toBe(Number((expectedCellVoltage + spread / 2 + testCase.random * 0.01).toFixed(3)));
      // irPack includes the existing independent telemetry jitter (milli-ohm).
      expect(reading.irPack).toBe(Number((packResistanceOhm * 1000 + testCase.random * 0.5).toFixed(3)));
      expect(reading.vMin).toBeLessThan(reading.vPack / testCase.seriesCells);
      expect(reading.vMax).toBeGreaterThan(reading.vPack / testCase.seriesCells);
      const packOcv = ocvCell * testCase.seriesCells;
      if (testCase.isCharging) {
        expect(reading.vPack).toBeGreaterThan(packOcv);
      } else {
        expect(reading.vPack).toBeLessThan(packOcv);
      }
    }
  );

  it("keeps a low-SOC, aged LFP discharge inside the unchanged gateway range", () => {
    vi.spyOn(Math, "random").mockReturnValue(1 - Number.EPSILON);
    const state = controlState("LFP", { soc: 20, soh: 72, isCharging: false });
    const reading = generateReading(state.bpan, "LFP");
    const packOcv = (2.5 + (3.65 - 2.5) * state.soc / 100) * 120;
    const packResistanceOhm = (10 + (100 - 72) * 0.4) * 1.05 / 1000;
    expect(reading.iPack).toBe(-135);
    expect(reading.vPack).toBe(Number((packOcv - 135 * packResistanceOhm).toFixed(2)));
    expect(reading.vPack).toBeGreaterThan(100);
    expect(reading.vPack).toBeLessThan(600);
  });
});

describe("demo simulator nonphysical boundaries (not safety validation)", () => {
  it("preserves zero SOH at a forced charge-direction switch instead of raising it to 20%", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = controlState("NMC", { soh: 0, soc: 50, isCharging: true, directionTicks: 1000 });
    const reading = generateReading(state.bpan, "NMC");
    expect(reading.sohEstimate).toBe(0);
    expect(state.soh).toBe(0);
    expect(reading.modelStatus).toBe("demo_uncalibrated");
  });

  it("rejects nonpositive low-voltage pack output, rather than clamping to a fake valid reading", () => {
    vi.spyOn(Math, "random").mockReturnValue(1 - Number.EPSILON);
    const state = controlState("LEAD_ACID", { soh: 20, soc: 0, isCharging: false });
    expect(() => generateReading(state.bpan, "LEAD_ACID")).toThrow(RangeError);
  });

  it.each([
    { soc: -1 }, { soc: 101 }, { soc: NaN }, { soh: -1 }, { soh: 101 }, { soh: Infinity },
    { cycleCount: -1 }, { cycleCount: NaN }, { tPack: NaN }, { tAmbient: Infinity },
  ])("rejects invalid state without returning telemetry: %o", (override) => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = controlState("NMC", override);
    expect(() => generateReading(state.bpan, "NMC")).toThrow(RangeError);
    expect(state.directionTicks).toBe(0);
  });

  it("reported maximum temperature is not below pack temperature during an injected spike", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = controlState("NMC", { tPack: 80, tAmbient: 80, thermalSpikeActive: true, spikeTicks: 3 });
    const reading = generateReading(state.bpan, "NMC");
    expect(reading.tMax).toBeGreaterThanOrEqual(reading.tPack);
    expect(reading.thermalAnomaly).toBe(true);
  });
});

describe("demo chemistry provenance", () => {
  it.each(["Unknown", "SOLID_STATE", "toString"])("rejects unsupported %s instead of mislabelling an NMC simulation", (chemistry) => {
    expect(() => getOrCreateState("UNSUPPORTED-DEMO", chemistry)).toThrow(RangeError);
    expect(() => generateReading("UNSUPPORTED-DEMO", chemistry)).toThrow(RangeError);
  });
});
