/**
 * Uncalibrated, deterministic digital-twin scenario ESTIMATE. No neural model,
 * measured confidence interval, hardware control or safety certification.
 * Uses unchanged sohModel coefficient assumptions with corrected % point units.
 */
import { cycleFadePercentagePoints, DEMO_FADE_COEFFICIENTS, requireFiniteRange } from "./numericalUnits";

export type Scenario = "conservative" | "nominal" | "aggressive";
export interface TwinForecastPoint { day: number; soh: number; scenario: Scenario }
export interface TwinForecastResult {
  bpan: string;
  currentSoh: number;
  forecastHorizonDays: number;
  modelVersion: string;
  /** No validation dataset; a confidence score would not be a probability. */
  confidence: null;
  estimateStatus: "demo_uncalibrated";
  evaluationDate: string;
  anchorSource: "current_soh_input";
  /** Preserved for provenance, not blended away or treated as certified measurement. */
  bmsSohInput: number | null;
  assumptions: string[];
  scenarios: Record<Scenario, TwinForecastPoint[]>;
  /** First sampled day at/below an illustrative 80% SOH marker, NOT a safety cutoff. */
  eolDays: Record<Scenario, number | null>;
  /** Compatibility name: days to that marker, null means not crossed within horizon. */
  rulDaysNominal: number | null;
}
export interface TwinInput {
  bpan: string;
  chemistry: string;
  /** Anchor, in percent (0–100). Caller must identify source and reject missing data. */
  currentSoh: number;
  cycleCount: number;
  capacityKwh: number;
  mfgYear: number;
  mfgMonth: number;
  forecastHorizonDays?: number;
  bmsSoh?: number;
  /** Fixed evaluation date for deterministic tests; defaults to current timestamp. */
  evaluationDate?: Date;
}
const SCENARIO_CYCLES_PER_DAY: Record<Scenario, number> = { conservative: 0.3, nominal: 0.8, aggressive: 1.5 };
const SCENARIO_TEMP_C: Record<Scenario, number> = { conservative: 20, nominal: 25, aggressive: 35 };
const SCENARIOS: Scenario[] = ["conservative", "nominal", "aggressive"];

export function generateTwinForecast(input: TwinInput): TwinForecastResult {
  const { bpan, chemistry, currentSoh, cycleCount, capacityKwh, mfgYear, mfgMonth, forecastHorizonDays = 365, bmsSoh, evaluationDate = new Date() } = input;
  requireFiniteRange("SOH (%)", currentSoh, 0, 100);
  requireFiniteRange("cycles", cycleCount, 0);
  requireFiniteRange("capacity (kWh)", capacityKwh, Number.MIN_VALUE);
  requireFiniteRange("forecast horizon (days)", forecastHorizonDays, 0, 1825);
  if (!Number.isInteger(forecastHorizonDays)) throw new RangeError("Forecast horizon must be whole days");
  if (bmsSoh !== undefined) requireFiniteRange("BMS SOH (%)", bmsSoh, 0, 100);
  if (!Number.isInteger(mfgYear) || mfgYear < 1900 || mfgYear > 9999 || !Number.isInteger(mfgMonth) || mfgMonth < 1 || mfgMonth > 12) throw new RangeError("Invalid manufacture year/month");
  if (!Number.isFinite(evaluationDate.getTime())) throw new RangeError("Invalid evaluation date");
  const manufactureDate = new Date(Date.UTC(mfgYear, mfgMonth - 1, 1));
  if (manufactureDate > evaluationDate) throw new RangeError("Manufacture date is after evaluation date");
  const normalizedChemistry = chemistry.toUpperCase();
  if (!Object.hasOwn(DEMO_FADE_COEFFICIENTS, normalizedChemistry)) throw new RangeError("Unsupported chemistry; no invented fallback");
  const params = DEMO_FADE_COEFFICIENTS[normalizedChemistry];
  const scenarios: Record<Scenario, TwinForecastPoint[]> = { conservative: [], nominal: [], aggressive: [] };
  const eolDays: Record<Scenario, number | null> = { conservative: null, nominal: null, aggressive: null };
  const sampleDays = [0];
  for (let day = 7; day < forecastHorizonDays; day += 7) sampleDays.push(day);
  if (forecastHorizonDays > 0) sampleDays.push(forecastHorizonDays);

  for (const scenario of SCENARIOS) {
    const tempFactor = 1 + params.tempCoefficient * Math.max(0, SCENARIO_TEMP_C[scenario] - 25);
    // Linear calendar model: loss AFTER evaluation date. Manufacture date stays
    // fixed; existing age/cycles/degradation are already represented by the anchor.
    let previousSoh = currentSoh;
    for (const day of sampleDays) {
      const futureCalendarLoss = params.calendarPctPerYear * (day / 365.25) * tempFactor;
      const futureCycleLoss = cycleFadePercentagePoints(params.cyclePctPerCycle, day * SCENARIO_CYCLES_PER_DAY[scenario]);
      const soh = Math.min(previousSoh, Math.max(0, currentSoh - futureCalendarLoss - futureCycleLoss));
      scenarios[scenario].push({ day, soh, scenario });
      previousSoh = soh;
      if (eolDays[scenario] === null && soh <= 80) eolDays[scenario] = day;
    }
  }
  return {
    bpan, currentSoh, forecastHorizonDays, modelVersion: "demo-incremental-v1",
    confidence: null, estimateStatus: "demo_uncalibrated", evaluationDate: evaluationDate.toISOString(),
    anchorSource: "current_soh_input", bmsSohInput: bmsSoh ?? null,
    assumptions: [
      "Day 0 exactly equals the supplied current SOH, whose source must be verified by the caller; it is not a certified measurement.",
      "Existing age/cycle losses are in the anchor. Only future linear calendar/cycle losses are applied; manufacture date stays fixed.",
      "Scenarios assume 0.3/0.8/1.5 full-equivalent cycles/day at 20/25/35°C, not measured future use.",
      "Coefficients are uncalibrated demo assumptions; nominal cycle-life labels do not reconcile to the percentage-point rates.",
      "BMS SOH is retained as provenance, not independently calibrated. No statistical accuracy or confidence interval is available.",
      "80% marker is illustrative, sampled weekly plus the final day; it is NOT a hardware limit, safety cutoff or disposal authorization.",
    ],
    scenarios, eolDays, rulDaysNominal: eolDays.nominal,
  };
}

export function flattenForecastForStorage(result: TwinForecastResult): TwinForecastPoint[] {
  return [...result.scenarios.conservative, ...result.scenarios.nominal, ...result.scenarios.aggressive];
}
