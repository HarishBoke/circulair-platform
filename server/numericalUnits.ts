/** Pure numerical boundaries. These checks are NOT hardware limits or safety cutoffs. */
export function requireFiniteRange(name: string, value: number, min: number, max = Number.MAX_VALUE): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be finite and between ${min} and ${max}`);
  }
  return value;
}

/** The rate is percentage POINTS per full-equivalent cycle, not a fraction. */
export function cycleFadePercentagePoints(ratePctPerCycle: number, cycles: number, rateMultiplier = 1): number {
  requireFiniteRange("cycle fade rate (% points/cycle)", ratePctPerCycle, 0);
  requireFiniteRange("full-equivalent cycles", cycles, 0);
  requireFiniteRange("cycle rate multiplier", rateMultiplier, 0);
  return requireFiniteRange("cycle fade (% points)", ratePctPerCycle * cycles * rateMultiplier, 0);
}

/** Cycle-only estimate to an illustrative SOH marker; excludes calendar/IR aging. */
export function cyclesToSohMarker(sohPct: number, fadePctPerCycle: number, markerPct = 80): number | null {
  requireFiniteRange("SOH (%)", sohPct, 0, 100);
  requireFiniteRange("SOH marker (%)", markerPct, 0, 100);
  requireFiniteRange("cycle fade rate (% points/cycle)", fadePctPerCycle, 0);
  if (sohPct <= markerPct) return 0;
  if (fadePctPerCycle === 0) return null;
  return requireFiniteRange("estimated cycles to marker", Math.round((sohPct - markerPct) / fadePctPerCycle), 0);
}

/**
 * Existing sohModel.ts coefficients, unchanged: % points/year, dimensionless
 * temperature coefficient per °C above 25°C, and % points/full-equivalent cycle.
 * Nominal cycle-life labels do NOT calibrate these rates. Laboratory validation
 * and model reconciliation remain open. No chemistry is treated as safety-certified.
 */
export const DEMO_FADE_COEFFICIENTS: Record<string, { calendarPctPerYear: number; tempCoefficient: number; cyclePctPerCycle: number }> = {
  NMC: { calendarPctPerYear: 2.5, tempCoefficient: 0.05, cyclePctPerCycle: 0.0025 },
  LFP: { calendarPctPerYear: 1.2, tempCoefficient: 0.03, cyclePctPerCycle: 0.0015 },
  NCA: { calendarPctPerYear: 3.0, tempCoefficient: 0.07, cyclePctPerCycle: 0.003 },
  LCO: { calendarPctPerYear: 3.5, tempCoefficient: 0.08, cyclePctPerCycle: 0.004 },
  LMO: { calendarPctPerYear: 2.8, tempCoefficient: 0.06, cyclePctPerCycle: 0.0035 },
  LEAD_ACID: { calendarPctPerYear: 4.0, tempCoefficient: 0.09, cyclePctPerCycle: 0.008 },
  SOLID_STATE: { calendarPctPerYear: 0.8, tempCoefficient: 0.03, cyclePctPerCycle: 0.001 },
};
