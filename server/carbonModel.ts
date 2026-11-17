/**
 * Unverified lifecycle carbon ESTIMATE, in kg CO2e. Not a regulatory declaration.
 * Embedded grid/process factors are demonstration assumptions, not live verified
 * datasets. Counts ALL charging energy (delivered energy / assumed efficiency),
 * including losses; it does not count only charging losses.
 */
import { requireFiniteRange } from "./numericalUnits";

/** Embedded historical grid assumptions, g CO2e per kWh drawn from the grid. */
export const GRID_INTENSITY: Record<string, number> = {
  IN: 713, CN: 581, US: 386, EU: 255, DE: 380, FR: 58,
  NO: 26, AU: 560, JP: 471, KR: 415, GLOBAL: 450,
};

/** kg CO2e per kWh of nominal battery capacity; unverified assumptions. */
const MFG_KG_CO2_PER_KWH: Record<string, number> = {
  LFP: 60, NMC: 85, NCA: 90, LCO: 110, LMO: 70, LEAD_ACID: 35, SOLID_STATE: 95,
};
const EOL_KG_CO2_PER_KWH: Record<string, number> = {
  LFP: 8, NMC: 12, NCA: 13, LCO: 15, LMO: 10, LEAD_ACID: 5, SOLID_STATE: 14,
};
/** kg CO2e / (kWh capacity × 1000 km). */
const TRANSPORT_KG_CO2_PER_KWH_PER_1000KM = 2.5;
const CHARGING_EFFICIENCY = 0.92;

export interface CarbonCalculationInput {
  bpan: string;
  chemistry: string;
  /** Strictly positive nominal capacity (kWh); zero capacity has undefined intensity. */
  capacityKwh: number;
  /** Total estimated transport distance (km); explicit zero is valid. */
  transportDistanceKm?: number;
  /** Supported embedded region code; unknown codes are rejected, not silently relabelled. */
  gridRegion?: string;
  /** Lifetime delivered/discharged energy (kWh); explicit zero overrides age/cycle defaults. */
  totalEnergyKwh?: number;
  ageYears?: number;
  /** Full-equivalent cycles per year, not percentage. */
  cyclesPerYear?: number;
}

export interface CarbonCalculationResult {
  bpan: string;
  manufacturingKgCo2: number;
  transportKgCo2: number;
  operationalKgCo2: number;
  eolKgCo2: number;
  totalKgCo2: number;
  /** g CO2e per kWh of grid energy; NOT kg/kWh. */
  gridCarbonIntensity: number;
  gridRegion: string;
  /** Lifecycle kg CO2e per kWh of NOMINAL capacity, not lifetime throughput. */
  intensityKgCo2PerKwh: number;
  /** Legacy field retained as unknown. No legal threshold is evaluated by this model. */
  euCompliant: null;
  complianceStatus: "not_assessed";
  estimateStatus: "estimated_unverified";
  method: "all_grid_charging_energy";
  chargingEfficiency: number;
  lifetimeDeliveredEnergyKwh: number;
  energyDrawnFromGridKwh: number;
  assumptions: string[];
  /** Unrounded percentage shares of the unrounded total. */
  breakdown: { manufacturingPct: number; transportPct: number; operationalPct: number; eolPct: number };
}

export function calculateCarbonFootprint(input: CarbonCalculationInput): CarbonCalculationResult {
  const {
    bpan, chemistry, capacityKwh, transportDistanceKm = 5000,
    gridRegion = "IN", totalEnergyKwh, ageYears = 3, cyclesPerYear = 200,
  } = input;
  requireFiniteRange("capacity (kWh)", capacityKwh, Number.MIN_VALUE);
  requireFiniteRange("transport distance (km)", transportDistanceKm, 0);
  requireFiniteRange("age (years)", ageYears, 0);
  requireFiniteRange("cycles/year", cyclesPerYear, 0);
  if (totalEnergyKwh !== undefined) requireFiniteRange("delivered energy (kWh)", totalEnergyKwh, 0);
  if (!Object.hasOwn(GRID_INTENSITY, gridRegion)) throw new RangeError("Unsupported grid region; supply a documented factor before adding a new region");
  if (!Object.hasOwn(MFG_KG_CO2_PER_KWH, chemistry)) throw new RangeError("Unsupported chemistry; no invented NMC fallback");

  const gridIntensity = GRID_INTENSITY[gridRegion];
  const manufacturingKgCo2 = MFG_KG_CO2_PER_KWH[chemistry] * capacityKwh;
  const transportKgCo2 = TRANSPORT_KG_CO2_PER_KWH_PER_1000KM * capacityKwh * (transportDistanceKm / 1000);
  const lifetimeEnergyKwh = totalEnergyKwh ?? capacityKwh * cyclesPerYear * ageYears;
  const energyDrawnFromGrid = lifetimeEnergyKwh / CHARGING_EFFICIENCY;
  // kWh × g/kWh = g; 1000 g = 1 kg. Includes all charging energy AND losses.
  const operationalKgCo2 = energyDrawnFromGrid * (gridIntensity / 1000);
  const eolKgCo2 = EOL_KG_CO2_PER_KWH[chemistry] * capacityKwh;
  const totalKgCo2 = manufacturingKgCo2 + transportKgCo2 + operationalKgCo2 + eolKgCo2;
  const intensityKgCo2PerKwh = totalKgCo2 / capacityKwh;
  for (const [name, value] of Object.entries({ manufacturingKgCo2, transportKgCo2, lifetimeEnergyKwh, energyDrawnFromGrid, operationalKgCo2, eolKgCo2, totalKgCo2, intensityKgCo2PerKwh })) {
    requireFiniteRange(name, value, 0);
  }
  if (totalKgCo2 === 0) throw new RangeError("Capacity is below representable model precision");

  return {
    bpan,
    manufacturingKgCo2: round2(manufacturingKgCo2),
    transportKgCo2: round2(transportKgCo2),
    operationalKgCo2: round2(operationalKgCo2),
    eolKgCo2: round2(eolKgCo2),
    totalKgCo2: round2(totalKgCo2),
    gridCarbonIntensity: gridIntensity, gridRegion,
    intensityKgCo2PerKwh: round2(intensityKgCo2PerKwh),
    euCompliant: null, complianceStatus: "not_assessed", estimateStatus: "estimated_unverified",
    method: "all_grid_charging_energy", chargingEfficiency: CHARGING_EFFICIENCY,
    lifetimeDeliveredEnergyKwh: lifetimeEnergyKwh, energyDrawnFromGridKwh: energyDrawnFromGrid,
    assumptions: [
      "Embedded historical grid and process factors are unverified estimates, not a certified lifecycle assessment.",
      "Operational emissions count all charging energy at assumed 92% efficiency, not only losses.",
      "Defaults, when omitted: 5000 km transport, 3 years, 200 full-equivalent cycles/year, IN grid.",
      "No recycling credit, time-varying grid mix, electricity provenance or regulatory compliance evaluation.",
      "Mass outputs rounded to 0.01 kg; total rounded independently, so displayed stages may differ by 0.01 kg.",
    ],
    breakdown: {
      manufacturingPct: manufacturingKgCo2 / totalKgCo2 * 100,
      transportPct: transportKgCo2 / totalKgCo2 * 100,
      operationalPct: operationalKgCo2 / totalKgCo2 * 100,
      eolPct: eolKgCo2 / totalKgCo2 * 100,
    },
  };
}

function round2(n: number): number {
  // Avoid overflowing n * 100 for a finite large value.
  return Number(n.toFixed(2));
}
