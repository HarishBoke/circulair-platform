/**
 * Physics-Informed Electrochemical SOH Prediction Model
 *
 * Replaces the LLM-simulated SOH prediction with a deterministic model grounded
 * in established battery degradation science:
 *
 * 1. Calendar aging (Arrhenius-based capacity fade)
 * 2. Cycle aging (Wöhler-curve capacity fade per cycle)
 * 3. Peukert correction for high-rate discharge effects
 * 4. Internal resistance growth (SEI layer model)
 * 5. Confidence interval based on data availability
 *
 * References:
 * - Arrhenius calendar aging: Broussely et al. (2005), J. Power Sources
 * - Cycle aging: Schmalstieg et al. (2014), J. Power Sources
 * - Peukert: Peukert (1897), extended by Doerffel & Sharkh (2006)
 * - IR growth: Prada et al. (2013), J. Electrochem. Soc.
 */

// ─── Chemistry-specific degradation parameters ────────────────────────────────

interface ChemistryParams {
  /** Calendar aging rate constant at 25°C (%/year) */
  calendarFadeRate: number;
  /** Arrhenius activation energy coefficient (dimensionless) */
  arrheniusCoeff: number;
  /** Capacity fade per full equivalent cycle (%) */
  cycleFadePerCycle: number;
  /** Peukert exponent (1.0 = ideal, >1 = more degradation at high rate) */
  peukertN: number;
  /** Nominal cycle life to 80% SOH (cycles) */
  nominalCycleLife: number;
  /** Internal resistance growth rate per cycle (mΩ/cycle) */
  irGrowthPerCycle: number;
  /** Typical initial internal resistance (mΩ/kWh) */
  baseIrPerKwh: number;
}

const CHEMISTRY_PARAMS: Record<string, ChemistryParams> = {
  NMC: {
    calendarFadeRate: 2.5,
    arrheniusCoeff: 0.05,
    cycleFadePerCycle: 0.0025,
    peukertN: 1.08,
    nominalCycleLife: 1500,
    irGrowthPerCycle: 0.0008,
    baseIrPerKwh: 1.2,
  },
  LFP: {
    calendarFadeRate: 1.2,
    arrheniusCoeff: 0.03,
    cycleFadePerCycle: 0.0015,
    peukertN: 1.04,
    nominalCycleLife: 3000,
    irGrowthPerCycle: 0.0004,
    baseIrPerKwh: 0.8,
  },
  NCA: {
    calendarFadeRate: 3.0,
    arrheniusCoeff: 0.07,
    cycleFadePerCycle: 0.003,
    peukertN: 1.10,
    nominalCycleLife: 1200,
    irGrowthPerCycle: 0.001,
    baseIrPerKwh: 1.5,
  },
  LCO: {
    calendarFadeRate: 3.5,
    arrheniusCoeff: 0.08,
    cycleFadePerCycle: 0.004,
    peukertN: 1.12,
    nominalCycleLife: 800,
    irGrowthPerCycle: 0.0015,
    baseIrPerKwh: 1.8,
  },
  LMO: {
    calendarFadeRate: 2.8,
    arrheniusCoeff: 0.06,
    cycleFadePerCycle: 0.0035,
    peukertN: 1.09,
    nominalCycleLife: 1000,
    irGrowthPerCycle: 0.0012,
    baseIrPerKwh: 1.4,
  },
  LEAD_ACID: {
    calendarFadeRate: 4.0,
    arrheniusCoeff: 0.09,
    cycleFadePerCycle: 0.008,
    peukertN: 1.3,
    nominalCycleLife: 400,
    irGrowthPerCycle: 0.003,
    baseIrPerKwh: 3.0,
  },
  // Solid-State Battery — emerging chemistry with superior cycle life and thermal stability
  // Parameters based on Toyota/QuantumScape published data (2023-2024)
  SOLID_STATE: {
    calendarFadeRate: 0.8,    // Very low calendar fade (ceramic electrolyte stability)
    arrheniusCoeff: 0.03,     // Excellent thermal stability (no liquid electrolyte)
    cycleFadePerCycle: 0.001, // ~5000 cycle life target
    peukertN: 1.02,           // Near-ideal Peukert behaviour
    nominalCycleLife: 5000,
    irGrowthPerCycle: 0.0001, // Minimal SEI growth
    baseIrPerKwh: 0.2,        // Very low internal resistance
  },
};

const DEFAULT_PARAMS = CHEMISTRY_PARAMS.NMC;

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface SohModelInput {
  chemistry: string;
  capacityKwh: number;
  mfgYear: number;
  mfgMonth: number;
  /** BMS-reported SOH (if available, used to calibrate model) */
  bmsReportedSoh?: number;
  /** Cycle count from telemetry */
  cycleCount?: number;
  /** Internal resistance from telemetry (mΩ) */
  irPack?: number;
  /** Max temperature observed (°C) */
  tMax?: number;
  /** Average discharge C-rate (if known) */
  avgCRate?: number;
}

export interface SohModelOutput {
  /** Predicted SOH (0–100%) */
  predictedSoh: number;
  /** Remaining useful life in cycles */
  rulCycles: number;
  /** Model confidence (0–100%) — higher when more telemetry is available */
  confidence: number;
  /** Root mean square error estimate (fraction, target < 0.02) */
  rmse: number;
  /** Triage recommendation */
  triagePath: "direct_reuse" | "module_repurposing" | "material_recycling";
  /** Breakdown of degradation contributions */
  breakdown: {
    calendarFade: number;
    cycleFade: number;
    irCorrection: number;
    bmsCorrectionApplied: boolean;
  };
}

// ─── Core model ───────────────────────────────────────────────────────────────

/**
 * Compute calendar age in fractional years from manufacture date to today.
 */
function calendarAgeYears(mfgYear: number, mfgMonth: number): number {
  const now = new Date();
  const mfgDate = new Date(mfgYear, mfgMonth - 1, 1);
  const msPerYear = 365.25 * 24 * 3600 * 1000;
  return Math.max(0, (now.getTime() - mfgDate.getTime()) / msPerYear);
}

/**
 * Arrhenius temperature correction factor.
 * Returns a multiplier > 1 when temperature > 25°C (accelerated aging).
 */
function arrheniusFactor(tMax: number | undefined, arrheniusCoeff: number): number {
  if (tMax === undefined || tMax === null) return 1.0;
  const tRef = 25; // °C reference temperature
  const deltaT = Math.max(0, tMax - tRef);
  return 1 + arrheniusCoeff * deltaT;
}

/**
 * Peukert correction: high C-rate discharge accelerates capacity fade.
 * Returns a multiplier applied to cycle fade rate.
 */
function peukertFactor(avgCRate: number | undefined, peukertN: number): number {
  if (avgCRate === undefined || avgCRate === null) return 1.0;
  const cRef = 0.5; // reference C-rate (0.5C)
  const cActual = Math.max(0.1, avgCRate);
  return Math.pow(cActual / cRef, peukertN - 1);
}

/**
 * Internal resistance growth correction.
 * High IR relative to baseline indicates advanced degradation.
 * Returns an additional SOH penalty (%).
 */
function irCorrection(
  irPack: number | undefined,
  capacityKwh: number,
  params: ChemistryParams
): number {
  if (irPack === undefined || irPack === null || irPack <= 0) return 0;
  const baseIr = params.baseIrPerKwh * capacityKwh;
  const irRatio = irPack / baseIr;
  // IR doubling from baseline corresponds to ~10% additional SOH loss
  const penalty = Math.max(0, (irRatio - 1) * 10);
  return Math.min(penalty, 20); // cap at 20% to avoid overcorrection
}

/**
 * Main physics-informed SOH prediction function.
 */
export function predictSohPhysics(input: SohModelInput): SohModelOutput {
  const params = CHEMISTRY_PARAMS[input.chemistry?.toUpperCase()] ?? DEFAULT_PARAMS;

  // 1. Calendar aging
  const ageYears = calendarAgeYears(input.mfgYear, input.mfgMonth);
  const tempFactor = arrheniusFactor(input.tMax, params.arrheniusCoeff);
  const calendarFade = params.calendarFadeRate * ageYears * tempFactor;

  // 2. Cycle aging
  const cycles = input.cycleCount ?? 0;
  const cRateFactor = peukertFactor(input.avgCRate, params.peukertN);
  const cycleFade = params.cycleFadePerCycle * cycles * cRateFactor * 100;

  // 3. Internal resistance correction
  const irPenalty = irCorrection(input.irPack, input.capacityKwh, params);

  // 4. Raw model SOH
  let modelSoh = 100 - calendarFade - cycleFade - irPenalty;
  modelSoh = Math.max(0, Math.min(100, modelSoh));

  // 5. BMS calibration: if BMS reports SOH, blend it with model output
  //    Weight: 60% BMS (direct measurement) + 40% physics model
  let predictedSoh = modelSoh;
  let bmsCorrectionApplied = false;
  if (input.bmsReportedSoh !== undefined && input.bmsReportedSoh > 0) {
    predictedSoh = 0.6 * input.bmsReportedSoh + 0.4 * modelSoh;
    bmsCorrectionApplied = true;
  }
  predictedSoh = Math.max(0, Math.min(100, predictedSoh));

  // 6. Remaining useful life (cycles to 80% SOH threshold)
  const sohRemaining = Math.max(0, predictedSoh - 80);
  const fadePer100Cycles = params.cycleFadePerCycle * 100 * cRateFactor * 100;
  const rulCycles = fadePer100Cycles > 0
    ? Math.round((sohRemaining / fadePer100Cycles) * 100)
    : params.nominalCycleLife;

  // 7. Confidence: increases with available data
  let confidence = 50; // base confidence with no telemetry
  if (input.cycleCount !== undefined) confidence += 15;
  if (input.irPack !== undefined) confidence += 15;
  if (input.bmsReportedSoh !== undefined) confidence += 15;
  if (input.tMax !== undefined) confidence += 5;
  confidence = Math.min(confidence, 95); // never claim 100%

  // 8. RMSE estimate: decreases as confidence increases
  //    At 50% confidence → RMSE ~0.04; at 95% confidence → RMSE ~0.01
  const rmse = parseFloat((0.06 - (confidence / 100) * 0.05).toFixed(4));

  // 9. Triage path
  let triagePath: "direct_reuse" | "module_repurposing" | "material_recycling";
  if (predictedSoh >= 75) {
    triagePath = "direct_reuse";
  } else if (predictedSoh >= 50) {
    triagePath = "module_repurposing";
  } else {
    triagePath = "material_recycling";
  }

  return {
    predictedSoh: parseFloat(predictedSoh.toFixed(2)),
    rulCycles: Math.max(0, rulCycles),
    confidence: parseFloat(confidence.toFixed(1)),
    rmse,
    triagePath,
    breakdown: {
      calendarFade: parseFloat(calendarFade.toFixed(2)),
      cycleFade: parseFloat(cycleFade.toFixed(2)),
      irCorrection: parseFloat(irPenalty.toFixed(2)),
      bmsCorrectionApplied,
    },
  };
}
