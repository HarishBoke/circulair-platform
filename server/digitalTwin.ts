/**
 * Battery Digital Twin — Simulation Engine
 * Generates multi-scenario SOH trajectory forecasts using the physics-informed
 * Arrhenius calendar aging + Wöhler cycle fade model from sohModel.ts.
 */

import { predictSohPhysics, SohModelInput } from "./sohModel";

// Chemistry-specific baseline ambient temperatures (°C)
const CHEMISTRY_BASE_TEMP: Record<string, number> = {
  LFP: 25, NMC: 25, NCA: 25, LCO: 25, LMO: 25, LEAD_ACID: 30, SOLID_STATE: 25,
};

// Approximate cycle life per chemistry for confidence scaling
const CHEMISTRY_CYCLE_LIFE: Record<string, number> = {
  LFP: 3000, NMC: 1500, NCA: 1200, LCO: 800, LMO: 1000, LEAD_ACID: 500, SOLID_STATE: 5000,
};

export type Scenario = "conservative" | "nominal" | "aggressive";

export interface TwinForecastPoint {
  day: number;
  soh: number;
  scenario: Scenario;
}

export interface TwinForecastResult {
  bpan: string;
  currentSoh: number;
  forecastHorizonDays: number;
  modelVersion: string;
  confidence: number;
  scenarios: {
    conservative: TwinForecastPoint[];
    nominal: TwinForecastPoint[];
    aggressive: TwinForecastPoint[];
  };
  /** Day at which each scenario crosses the 80% EOL threshold */
  eolDays: { conservative: number | null; nominal: number | null; aggressive: number | null };
  /** Estimated remaining useful life in days under nominal scenario */
  rulDaysNominal: number | null;
}

interface TwinInput {
  bpan: string;
  chemistry: string;
  currentSoh: number;
  cycleCount: number;
  capacityKwh: number;
  mfgYear: number;
  mfgMonth: number;
  forecastHorizonDays?: number;
  /** BMS-reported SOH for calibration */
  bmsSoh?: number;
}

/** Scenario multipliers for daily cycle rate */
const SCENARIO_CYCLES_PER_DAY: Record<Scenario, number> = {
  conservative: 0.3, // Light usage — 0.3 cycles/day
  nominal: 0.8,      // Typical EV/BESS — 0.8 cycles/day
  aggressive: 1.5,   // Heavy cycling — 1.5 cycles/day
};

/** Scenario multipliers for ambient temperature offset (°C above baseline) */
const SCENARIO_TEMP_OFFSET: Record<Scenario, number> = {
  conservative: -5,  // Cool storage
  nominal: 0,        // Ambient 25°C
  aggressive: 10,    // Hot environment
};

/**
 * Generate a multi-scenario SOH trajectory for a battery.
 */
export function generateTwinForecast(input: TwinInput): TwinForecastResult {
  const {
    bpan,
    chemistry,
    currentSoh,
    cycleCount,
    capacityKwh,
    mfgYear,
    mfgMonth,
    forecastHorizonDays = 365,
    bmsSoh,
  } = input;

  const baseCycleLife = CHEMISTRY_CYCLE_LIFE[chemistry] ?? 1500;

  const scenarios: Record<Scenario, TwinForecastPoint[]> = {
    conservative: [],
    nominal: [],
    aggressive: [],
  };

  const eolDays: Record<Scenario, number | null> = {
    conservative: null,
    nominal: null,
    aggressive: null,
  };

  const STEP_DAYS = 7; // Weekly forecast points

  for (const scenario of ["conservative", "nominal", "aggressive"] as Scenario[]) {
    const cyclesPerDay = SCENARIO_CYCLES_PER_DAY[scenario];
    const tempOffset = SCENARIO_TEMP_OFFSET[scenario];

    for (let day = 0; day <= forecastHorizonDays; day += STEP_DAYS) {
      const futureYear = mfgYear + Math.floor((mfgMonth - 1 + day / 30) / 12);
      const futureMonth = ((mfgMonth - 1 + Math.floor(day / 30)) % 12) + 1;
      const futureCycles = cycleCount + day * cyclesPerDay;

      const modelInput: SohModelInput = {
        chemistry,
        cycleCount: futureCycles,
        capacityKwh,
        mfgYear: futureYear,
        mfgMonth: futureMonth,
        tMax: 25 + tempOffset,
        bmsReportedSoh: day === 0 ? bmsSoh : undefined,
      };
      const prediction = predictSohPhysics(modelInput);

      // Clamp SOH to [0, currentSoh] — it can only degrade
      const soh = Math.min(currentSoh, Math.max(0, prediction.predictedSoh));

      scenarios[scenario].push({ day, soh, scenario });

      // Record first day SOH crosses 80% EOL threshold
      if (eolDays[scenario] === null && soh < 80) {
        eolDays[scenario] = day;
      }
    }
  }

  const rulDaysNominal = eolDays.nominal;

  // Confidence: based on data richness (higher cycle count = more data = higher confidence)
  const confidence = Math.min(0.95, 0.5 + (cycleCount / baseCycleLife) * 0.45);

  return {
    bpan,
    currentSoh,
    forecastHorizonDays,
    modelVersion: "physics-v1.0",
    confidence: Math.round(confidence * 1000) / 1000,
    scenarios,
    eolDays,
    rulDaysNominal,
  };
}

/**
 * Flatten all scenario points into a single array for DB storage.
 */
export function flattenForecastForStorage(result: TwinForecastResult): TwinForecastPoint[] {
  return [
    ...result.scenarios.conservative,
    ...result.scenarios.nominal,
    ...result.scenarios.aggressive,
  ];
}
