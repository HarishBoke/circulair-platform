/**
 * Predictive Procurement Engine
 * Forecasts battery supply pipeline and matches forward purchase orders
 * against predicted available inventory.
 */

export interface SupplyForecastInput {
  /** Batteries currently operational with their SOH and chemistry */
  operationalBatteries: Array<{
    bpan: string;
    soh: number;
    chemistry: string;
    capacityKwh: number;
    cycleCount: number;
    cyclesPerYear: number;
  }>;
  /** Forecast horizon in months */
  horizonMonths?: number;
}

export interface SupplyForecastPoint {
  month: string; // YYYY-MM
  /** Predicted batteries reaching EOL (SOH < 80%) — available for reuse market */
  directReuseAvailable: number;
  /** Predicted batteries reaching SOH 60-80% — available for BESS repurposing */
  modulesAvailable: number;
  /** Predicted batteries below 60% SOH — for recycling */
  recyclingAvailable: number;
  /** Total kWh capacity entering the market */
  totalKwhAvailable: number;
  /** Chemistry breakdown */
  chemistryBreakdown: Record<string, number>;
}

export interface ForwardOrderMatchResult {
  orderId: number;
  matchedListingIds: number[];
  matchScore: number;
  estimatedDeliveryMonth: string;
  reasoning: string;
}

/**
 * Forecast battery supply entering the second-life market over the next N months.
 * Uses a simplified linear degradation model for quick estimation.
 */
export function forecastSupplyPipeline(input: SupplyForecastInput): SupplyForecastPoint[] {
  const { operationalBatteries, horizonMonths = 12 } = input;
  const results: SupplyForecastPoint[] = [];

  const now = new Date();

  for (let m = 1; m <= horizonMonths; m++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const monthStr = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, "0")}`;

    let directReuseAvailable = 0;
    let modulesAvailable = 0;
    let recyclingAvailable = 0;
    let totalKwhAvailable = 0;
    const chemistryBreakdown: Record<string, number> = {};

    for (const battery of operationalBatteries) {
      // Estimate SOH at forecast month using linear approximation
      // ~0.5% SOH loss per 100 cycles, ~0.3% per year calendar aging
      const cyclesInPeriod = (battery.cyclesPerYear * m) / 12;
      const cycleFade = (cyclesInPeriod / 100) * 0.5;
      const calendarFade = (m / 12) * 0.3;
      const projectedSoh = battery.soh - cycleFade - calendarFade;

      // Check if battery transitions to a new market segment this month
      const prevCyclesInPeriod = (battery.cyclesPerYear * (m - 1)) / 12;
      const prevCycleFade = (prevCyclesInPeriod / 100) * 0.5;
      const prevCalendarFade = ((m - 1) / 12) * 0.3;
      const prevSoh = battery.soh - prevCycleFade - prevCalendarFade;

      const crossedDirectReuse = prevSoh >= 80 && projectedSoh < 80;
      const crossedModuleReuse = prevSoh >= 60 && projectedSoh < 60;

      if (crossedDirectReuse) {
        directReuseAvailable++;
        totalKwhAvailable += battery.capacityKwh;
        chemistryBreakdown[battery.chemistry] = (chemistryBreakdown[battery.chemistry] ?? 0) + 1;
      } else if (crossedModuleReuse) {
        modulesAvailable++;
        totalKwhAvailable += battery.capacityKwh * 0.7; // ~70% capacity at this stage
        chemistryBreakdown[battery.chemistry] = (chemistryBreakdown[battery.chemistry] ?? 0) + 1;
      } else if (projectedSoh < 60 && prevSoh >= 60) {
        recyclingAvailable++;
      }
    }

    results.push({
      month: monthStr,
      directReuseAvailable,
      modulesAvailable,
      recyclingAvailable,
      totalKwhAvailable: Math.round(totalKwhAvailable * 100) / 100,
      chemistryBreakdown,
    });
  }

  return results;
}

/**
 * Score how well a marketplace listing matches a forward order.
 * Returns 0–1 match score.
 */
export function scoreForwardOrderMatch(
  order: {
    targetSohMin: number;
    targetSohMax: number;
    chemistry?: string | null;
    minCapacityKwh?: number | null;
    maxPricePerKwh?: number | null;
    deliveryMonth: string;
  },
  listing: {
    sohAtListing?: number | null;
    chemistry?: string | null;
    capacityKwh?: number | null;
    askingPriceInr?: number | null;
  }
): number {
  let score = 0;
  let factors = 0;

  // SOH match (most important — 40% weight)
  if (listing.sohAtListing != null) {
    const soh = Number(listing.sohAtListing);
    if (soh >= order.targetSohMin && soh <= order.targetSohMax) {
      score += 0.4;
    } else {
      const distance = Math.min(
        Math.abs(soh - order.targetSohMin),
        Math.abs(soh - order.targetSohMax)
      );
      score += Math.max(0, 0.4 - distance * 0.02);
    }
    factors++;
  }

  // Chemistry match (30% weight)
  if (order.chemistry && listing.chemistry) {
    score += listing.chemistry === order.chemistry ? 0.3 : 0;
    factors++;
  } else {
    score += 0.15; // Partial credit if no chemistry preference
  }

  // Capacity match (20% weight)
  if (order.minCapacityKwh && listing.capacityKwh) {
    const cap = Number(listing.capacityKwh);
    score += cap >= order.minCapacityKwh ? 0.2 : Math.max(0, 0.2 * (cap / order.minCapacityKwh));
    factors++;
  } else {
    score += 0.1;
  }

  // Price match (10% weight) — INR/kWh approximation
  if (order.maxPricePerKwh && listing.askingPriceInr && listing.capacityKwh) {
    const pricePerKwh = Number(listing.askingPriceInr) / Number(listing.capacityKwh);
    const maxInr = order.maxPricePerKwh * 83; // Approximate USD→INR
    score += pricePerKwh <= maxInr ? 0.1 : 0;
    factors++;
  } else {
    score += 0.05;
  }

  return Math.round(Math.min(1, score) * 100) / 100;
}
