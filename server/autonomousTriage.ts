/**
 * Autonomous Triage Routing Engine
 * Evaluates battery telemetry and SOH predictions to recommend and execute
 * the optimal end-of-life path with a human approval gate.
 */

export type TriagePath = "direct_reuse" | "module_repurposing" | "material_recycling";

export interface TriageInput {
  bpan: string;
  soh: number;
  cycleCount: number;
  chemistry: string;
  capacityKwh: number;
  hasActiveFaults: boolean;
  hasPhysicalDamage: boolean;
  /** Market demand signal: 0 = no demand, 1 = high demand */
  marketDemandScore?: number;
}

export interface TriageDecision {
  recommendedPath: TriagePath;
  confidence: number;
  reasoning: string[];
  autoActions: string[];
  requiresHumanApproval: boolean;
  urgency: "low" | "medium" | "high";
}

/**
 * Determine the optimal triage path based on battery state.
 * Rules based on IEC 62984 and industry best practices.
 */
export function evaluateTriagePath(input: TriageInput): TriageDecision {
  const {
    soh,
    cycleCount,
    chemistry,
    capacityKwh,
    hasActiveFaults,
    hasPhysicalDamage,
    marketDemandScore = 0.5,
  } = input;

  const reasoning: string[] = [];
  const autoActions: string[] = [];
  let recommendedPath: TriagePath;
  let confidence: number;
  let urgency: "low" | "medium" | "high" = "low";

  // Safety override: physical damage → immediate recycling
  if (hasPhysicalDamage) {
    reasoning.push("Physical damage detected — direct reuse or repurposing is unsafe.");
    reasoning.push("Routing to material recycling for safe disassembly.");
    autoActions.push("Generate hazmat logistics manifest");
    autoActions.push("Notify certified recycler");
    return {
      recommendedPath: "material_recycling",
      confidence: 0.97,
      reasoning,
      autoActions,
      requiresHumanApproval: true,
      urgency: "high",
    };
  }

  // Active faults: require inspection before reuse
  if (hasActiveFaults) {
    reasoning.push("Active DTC fault codes present — battery requires inspection.");
    urgency = "medium";
  }

  // SOH-based routing
  if (soh >= 80) {
    recommendedPath = "direct_reuse";
    confidence = 0.85 + (soh - 80) / 200; // 0.85–0.95
    reasoning.push(`SOH ${soh.toFixed(1)}% ≥ 80% threshold — eligible for direct reuse.`);
    autoActions.push("Create marketplace listing (second-life EV pack)");
    autoActions.push("Generate Battery Health Passport PDF");
    autoActions.push("Request logistics pickup");

    // Market demand boost
    if (marketDemandScore > 0.7) {
      reasoning.push("High market demand detected — prioritising direct reuse listing.");
      confidence = Math.min(0.97, confidence + 0.05);
    }
  } else if (soh >= 60) {
    recommendedPath = "module_repurposing";
    confidence = 0.78 + (soh - 60) / 400; // 0.78–0.83
    reasoning.push(`SOH ${soh.toFixed(1)}% between 60–80% — suitable for BESS module repurposing.`);
    autoActions.push("Create marketplace listing (BESS module)");
    autoActions.push("Generate module repurposing assessment report");
    autoActions.push("Notify BESS integrators in network");
    urgency = "medium";
  } else {
    recommendedPath = "material_recycling";
    confidence = 0.90 + (80 - soh) / 1000; // 0.90–0.92
    reasoning.push(`SOH ${soh.toFixed(1)}% < 60% — below economic reuse threshold.`);
    reasoning.push("Routing to material recycling for lithium/cobalt/nickel recovery.");
    autoActions.push("Create recycling work order");
    autoActions.push("Generate EPR compliance certificate");
    autoActions.push("Notify certified recycler partner");
    urgency = "high";
  }

  // Chemistry-specific adjustments
  if (chemistry === "LFP" && soh >= 70) {
    reasoning.push("LFP chemistry has excellent cycle stability — BESS repurposing is viable.");
    if (recommendedPath === "module_repurposing") {
      confidence = Math.min(0.95, confidence + 0.08);
    }
  }

  if (chemistry === "LCO" && soh < 75) {
    reasoning.push("LCO chemistry degrades non-linearly below 75% SOH — recycling preferred.");
    if (recommendedPath === "direct_reuse") {
      recommendedPath = "module_repurposing";
      reasoning.push("Downgraded from direct reuse to module repurposing for LCO safety.");
    }
  }

  // Capacity threshold
  if (capacityKwh < 5 && recommendedPath !== "material_recycling") {
    reasoning.push(`Small pack (${capacityKwh} kWh) — logistics cost may exceed reuse value.`);
    confidence = Math.max(0.5, confidence - 0.15);
  }

  // High cycle count warning
  if (cycleCount > 1500) {
    reasoning.push(`High cycle count (${cycleCount}) — accelerated degradation expected.`);
    urgency = urgency === "low" ? "medium" : urgency;
  }

  return {
    recommendedPath,
    confidence: Math.round(Math.min(0.99, confidence) * 1000) / 1000,
    reasoning,
    autoActions,
    requiresHumanApproval: true, // Always require human approval gate
    urgency,
  };
}
