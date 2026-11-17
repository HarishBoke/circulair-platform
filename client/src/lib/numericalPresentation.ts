import type { CarbonCalculationResult } from "../../../server/carbonModel";
import type { TwinForecastResult } from "../../../server/digitalTwin";

/** Absolute kg values, not percentage shares or nonexistent legacy field names. */
export function carbonStageData(result: CarbonCalculationResult) {
  return [
    { name: "Manufacturing", value: result.manufacturingKgCo2, color: "#6366f1" },
    { name: "All charging energy", value: result.operationalKgCo2, color: "#22c55e" },
    { name: "Transport", value: result.transportKgCo2, color: "#f59e0b" },
    { name: "End of Life", value: result.eolKgCo2, color: "#ef4444" },
  ];
}

export function twinChartData(result: TwinForecastResult) {
  return result.scenarios.nominal.map((point, i) => ({
    day: point.day,
    nominal: Number(point.soh.toFixed(1)),
    conservative: Number(result.scenarios.conservative[i].soh.toFixed(1)),
    aggressive: Number(result.scenarios.aggressive[i].soh.toFixed(1)),
  }));
}

export function comparisonChartData(a: TwinForecastResult, b: TwinForecastResult) {
  const byDay = new Map<number, { day: number; batteryA: number | null; batteryB: number | null }>();
  for (const point of a.scenarios.nominal) byDay.set(point.day, { day: point.day, batteryA: Number(point.soh.toFixed(1)), batteryB: null });
  for (const point of b.scenarios.nominal) {
    const row = byDay.get(point.day) ?? { day: point.day, batteryA: null, batteryB: null };
    row.batteryB = Number(point.soh.toFixed(1));
    byDay.set(point.day, row);
  }
  return Array.from(byDay.values()).sort((x, y) => x.day - y.day);
}

export function daysToMarkerLabel(days: number | null) {
  return days === null ? "Not crossed in horizon" : `${days} days`;
}
