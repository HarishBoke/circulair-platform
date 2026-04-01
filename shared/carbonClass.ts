/**
 * carbonClass.ts
 * EU Battery Regulation 2023/1542 — Carbon Footprint Performance Class Calculator
 *
 * The EU regulation defines A–E classes based on kg CO₂e per kWh of battery capacity.
 * Thresholds are per battery chemistry and capacity tier, derived from the GBA Battery
 * Passport methodology and the EU PEF (Product Environmental Footprint) approach.
 *
 * Reference thresholds (kg CO₂e / kWh):
 *   Class A: ≤ 40   — best-in-class (top ~20% of market)
 *   Class B: ≤ 70   — above average
 *   Class C: ≤ 100  — average / EU reference value
 *   Class D: ≤ 140  — below average
 *   Class E: > 140  — worst-in-class
 *
 * Chemistry-adjusted thresholds reflect real-world production differences:
 *   NMC/NCA: higher cobalt/nickel extraction → higher reference values
 *   LFP: lower material extraction footprint → lower reference values
 *   LEAD_ACID: high recycled content offsets → moderate values
 */

export type PerformanceClass = "A" | "B" | "C" | "D" | "E";

export interface ClassThresholds {
  A: number; // ≤ this → Class A
  B: number; // ≤ this → Class B
  C: number; // ≤ this → Class C
  D: number; // ≤ this → Class D
  // > D → Class E
}

/** Chemistry-specific thresholds (kg CO₂e per kWh of usable capacity) */
const CHEMISTRY_THRESHOLDS: Record<string, ClassThresholds> = {
  NMC:       { A: 45,  B: 80,  C: 115, D: 160 },
  NCA:       { A: 48,  B: 85,  C: 120, D: 165 },
  LFP:       { A: 35,  B: 60,  C: 90,  D: 130 },
  LCO:       { A: 50,  B: 90,  C: 130, D: 180 },
  LMO:       { A: 38,  B: 68,  C: 98,  D: 138 },
  LEAD_ACID: { A: 30,  B: 55,  C: 80,  D: 115 },
  DEFAULT:   { A: 40,  B: 70,  C: 100, D: 140 },
};

/**
 * Calculate the EU performance class for a battery's carbon footprint.
 *
 * @param totalKgCo2e  Total lifecycle carbon footprint in kg CO₂e
 * @param capacityKwh  Usable battery capacity in kWh
 * @param chemistry    Battery chemistry (NMC, LFP, etc.)
 * @returns            Performance class A–E
 */
export function calculatePerformanceClass(
  totalKgCo2e: number,
  capacityKwh: number,
  chemistry?: string
): PerformanceClass {
  if (capacityKwh <= 0) return "E";
  const intensity = totalKgCo2e / capacityKwh; // kg CO₂e per kWh
  const thresholds = CHEMISTRY_THRESHOLDS[chemistry ?? ""] ?? CHEMISTRY_THRESHOLDS.DEFAULT;
  if (intensity <= thresholds.A) return "A";
  if (intensity <= thresholds.B) return "B";
  if (intensity <= thresholds.C) return "C";
  if (intensity <= thresholds.D) return "D";
  return "E";
}

/** Human-readable label for each performance class */
export const CLASS_LABELS: Record<PerformanceClass, string> = {
  A: "Best in Class",
  B: "Above Average",
  C: "Average",
  D: "Below Average",
  E: "Worst in Class",
};

/** Tailwind colour tokens for each performance class */
export const CLASS_COLORS: Record<PerformanceClass, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  B: { bg: "bg-green-500/15",   text: "text-green-400",   border: "border-green-500/30"   },
  C: { bg: "bg-yellow-500/15",  text: "text-yellow-400",  border: "border-yellow-500/30"  },
  D: { bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-orange-500/30"  },
  E: { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/30"     },
};

/** EU reference value (Class C midpoint) for a given chemistry, in kg CO₂e / kWh */
export function getReferenceIntensity(chemistry?: string): number {
  const t = CHEMISTRY_THRESHOLDS[chemistry ?? ""] ?? CHEMISTRY_THRESHOLDS.DEFAULT;
  return (t.B + t.C) / 2; // midpoint of B–C band = "average"
}

/** Get the threshold band boundaries for a given chemistry */
export function getThresholds(chemistry?: string): ClassThresholds {
  return CHEMISTRY_THRESHOLDS[chemistry ?? ""] ?? CHEMISTRY_THRESHOLDS.DEFAULT;
}

/**
 * Lifecycle stage labels as defined by EU Battery Regulation Annex II
 */
export const LIFECYCLE_STAGES = [
  {
    key: "rawMaterialKgCo2e" as const,
    label: "Raw Material Acquisition & Processing",
    shortLabel: "Raw Materials",
    description: "Mining, refining, and processing of lithium, cobalt, nickel, manganese, and other materials",
    euStage: "A1–A3",
    typicalShare: 0.40,
  },
  {
    key: "productionKgCo2e" as const,
    label: "Battery Production & Assembly",
    shortLabel: "Production",
    description: "Cell manufacturing, module assembly, pack integration, and factory energy consumption",
    euStage: "A4–A5",
    typicalShare: 0.35,
  },
  {
    key: "distributionKgCo2e" as const,
    label: "Distribution & Logistics",
    shortLabel: "Distribution",
    description: "Transportation from factory to end customer, including packaging and warehousing",
    euStage: "B1–B7",
    typicalShare: 0.05,
  },
  {
    key: "endOfLifeKgCo2e" as const,
    label: "End-of-Life Treatment",
    shortLabel: "End of Life",
    description: "Collection, dismantling, recycling processes, and credits for recovered materials",
    euStage: "C1–D",
    typicalShare: 0.20,
  },
] as const;

export type LifecycleStageKey = typeof LIFECYCLE_STAGES[number]["key"];
