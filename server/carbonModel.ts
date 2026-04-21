/**
 * Carbon Accounting Module — Lifecycle Carbon Footprint Calculator
 * Computes manufacturing, transport, operational, and end-of-life emissions
 * per battery in kg CO2e, aligned with EU Battery Regulation Article 7.
 */

// ─── Grid Carbon Intensity (gCO2/kWh) by region ──────────────────────────────
export const GRID_INTENSITY: Record<string, number> = {
  IN: 713,   // India (CEA 2023)
  CN: 581,   // China
  US: 386,   // USA (EPA 2023)
  EU: 255,   // EU average (EEA 2023)
  DE: 380,   // Germany
  FR: 58,    // France (nuclear-heavy)
  NO: 26,    // Norway (hydro)
  AU: 560,   // Australia
  JP: 471,   // Japan
  KR: 415,   // South Korea
  GLOBAL: 450, // Global average fallback
};

// ─── Manufacturing emissions (kg CO2e per kWh capacity) by chemistry ─────────
const MFG_KG_CO2_PER_KWH: Record<string, number> = {
  LFP: 60,       // Lower — no cobalt/nickel
  NMC: 85,       // Higher — cobalt & nickel mining
  NCA: 90,       // Similar to NMC
  LCO: 110,      // Highest — cobalt-intensive
  LMO: 70,
  LEAD_ACID: 35, // Low but toxic
  SOLID_STATE: 95, // Emerging — energy-intensive production
};

// ─── Transport emissions (kg CO2e per kWh per 1000 km) ───────────────────────
const TRANSPORT_KG_CO2_PER_KWH_PER_1000KM = 2.5; // Road freight average

// ─── End-of-life processing (kg CO2e per kWh) ────────────────────────────────
const EOL_KG_CO2_PER_KWH: Record<string, number> = {
  LFP: 8,
  NMC: 12,
  NCA: 13,
  LCO: 15,
  LMO: 10,
  LEAD_ACID: 5,
  SOLID_STATE: 14,
};

export interface CarbonCalculationInput {
  bpan: string;
  chemistry: string;
  capacityKwh: number;
  /** Estimated transport distance in km (cell origin to manufacturer + to end user) */
  transportDistanceKm?: number;
  /** Country/region code for grid intensity lookup */
  gridRegion?: string;
  /** Total energy discharged over lifetime (kWh) — for operational emissions */
  totalEnergyKwh?: number;
  /** Battery age in years (for operational estimate if totalEnergyKwh not provided) */
  ageYears?: number;
  /** Average cycles per year (for operational estimate) */
  cyclesPerYear?: number;
}

export interface CarbonCalculationResult {
  bpan: string;
  manufacturingKgCo2: number;
  transportKgCo2: number;
  operationalKgCo2: number;
  eolKgCo2: number;
  totalKgCo2: number;
  gridCarbonIntensity: number;
  gridRegion: string;
  /** kg CO2e per kWh of usable capacity — for comparison */
  intensityKgCo2PerKwh: number;
  /** EU Article 7 compliance threshold (150 kg CO2e/kWh for 2027) */
  euCompliant: boolean;
  /** Breakdown percentages */
  breakdown: {
    manufacturingPct: number;
    transportPct: number;
    operationalPct: number;
    eolPct: number;
  };
}

/**
 * Calculate the full lifecycle carbon footprint of a battery.
 */
export function calculateCarbonFootprint(input: CarbonCalculationInput): CarbonCalculationResult {
  const {
    bpan,
    chemistry,
    capacityKwh,
    transportDistanceKm = 5000, // Default: cell origin (Asia) to India
    gridRegion = "IN",
    totalEnergyKwh,
    ageYears = 3,
    cyclesPerYear = 200,
  } = input;

  const gridIntensity = GRID_INTENSITY[gridRegion] ?? GRID_INTENSITY["GLOBAL"];
  const mfgFactor = MFG_KG_CO2_PER_KWH[chemistry] ?? MFG_KG_CO2_PER_KWH["NMC"];
  const eolFactor = EOL_KG_CO2_PER_KWH[chemistry] ?? EOL_KG_CO2_PER_KWH["NMC"];

  // Manufacturing emissions
  const manufacturingKgCo2 = mfgFactor * capacityKwh;

  // Transport emissions
  const transportKgCo2 =
    (TRANSPORT_KG_CO2_PER_KWH_PER_1000KM * capacityKwh * transportDistanceKm) / 1000;

  // Operational emissions (charging losses ~15% round-trip efficiency loss)
  const chargingEfficiency = 0.92; // 92% round-trip
  const lifetimeEnergyKwh =
    totalEnergyKwh ?? capacityKwh * cyclesPerYear * ageYears;
  const energyDrawnFromGrid = lifetimeEnergyKwh / chargingEfficiency;
  const operationalKgCo2 = (energyDrawnFromGrid * gridIntensity) / 1_000_000; // gCO2 → kgCO2

  // End-of-life processing
  const eolKgCo2 = eolFactor * capacityKwh;

  const totalKgCo2 = manufacturingKgCo2 + transportKgCo2 + operationalKgCo2 + eolKgCo2;

  const intensityKgCo2PerKwh = totalKgCo2 / capacityKwh;

  // EU Battery Regulation 2023/1542 Article 7 — 150 kg CO2e/kWh threshold (2027)
  const euCompliant = intensityKgCo2PerKwh <= 150;

  const breakdown = {
    manufacturingPct: Math.round((manufacturingKgCo2 / totalKgCo2) * 100),
    transportPct: Math.round((transportKgCo2 / totalKgCo2) * 100),
    operationalPct: Math.round((operationalKgCo2 / totalKgCo2) * 100),
    eolPct: Math.round((eolKgCo2 / totalKgCo2) * 100),
  };

  return {
    bpan,
    manufacturingKgCo2: round2(manufacturingKgCo2),
    transportKgCo2: round2(transportKgCo2),
    operationalKgCo2: round2(operationalKgCo2),
    eolKgCo2: round2(eolKgCo2),
    totalKgCo2: round2(totalKgCo2),
    gridCarbonIntensity: gridIntensity,
    gridRegion,
    intensityKgCo2PerKwh: round2(intensityKgCo2PerKwh),
    euCompliant,
    breakdown,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
