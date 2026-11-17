import { DEMO_FADE_COEFFICIENTS, requireFiniteRange } from "./numericalUnits";
import type { TwinInput } from "./digitalTwin";
import type { CarbonCalculationInput } from "./carbonModel";
import type { TriageDecision } from "./autonomousTriage";

/** Structural input only; no database imports, calls or runtime initialization. */
export interface NumericalBatteryRecord {
  bpan: string;
  chemistry: string;
  capacityKwh: string | number;
  mfgYear: number;
  mfgMonth: number;
  currentSoh: string | number | null;
  cycleCount: number | null;
}

function storedNumber(name: string, value: string | number | null, min: number, max = Number.MAX_VALUE): number {
  if (value === null || (typeof value === "string" && value.trim() === "")) throw new RangeError(`${name} is unknown; no fabricated default`);
  return requireFiniteRange(name, Number(value), min, max);
}

export function canonicalBatteryNumerics(battery: NumericalBatteryRecord) {
  const chemistry = battery.chemistry.toUpperCase();
  if (!Object.hasOwn(DEMO_FADE_COEFFICIENTS, chemistry)) throw new RangeError("Unsupported stored chemistry");
  return { chemistry, capacityKwh: storedNumber("stored capacity (kWh)", battery.capacityKwh, Number.MIN_VALUE) };
}

export function buildTwinInputFromBattery(battery: NumericalBatteryRecord, forecastHorizonDays: number): TwinInput {
  const { chemistry, capacityKwh } = canonicalBatteryNumerics(battery);
  const cycleCount = storedNumber("stored cycles", battery.cycleCount, 0);
  return {
    bpan: battery.bpan, chemistry, capacityKwh, cycleCount,
    currentSoh: storedNumber("stored SOH (%)", battery.currentSoh, 0, 100),
    mfgYear: battery.mfgYear, mfgMonth: battery.mfgMonth, forecastHorizonDays,
  };
}

export function buildCarbonInputFromBattery(
  battery: NumericalBatteryRecord,
  options: Pick<CarbonCalculationInput, "transportDistanceKm" | "gridRegion" | "ageYears" | "cyclesPerYear" | "totalEnergyKwh">,
): CarbonCalculationInput {
  return { ...options, bpan: battery.bpan, ...canonicalBatteryNumerics(battery) };
}

export function storedTriageNumerics(battery: NumericalBatteryRecord) {
  return {
    ...canonicalBatteryNumerics(battery),
    soh: storedNumber("stored SOH (%)", battery.currentSoh, 0, 100),
    cycleCount: storedNumber("stored cycles", battery.cycleCount, 0),
  };
}

/** Exact mapping only; invalid/missing paths do not default to recycling. */
export function triageRouteFromDecision(decision: TriageDecision): "reuse" | "repurpose" | "recycle" {
  switch (decision.recommendedPath) {
    case "direct_reuse": return "reuse";
    case "module_repurposing": return "repurpose";
    case "material_recycling": return "recycle";
    default: throw new RangeError("Unknown triage recommendation; no automatic route");
  }
}
