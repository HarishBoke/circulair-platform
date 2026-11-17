import { TRPCError } from "@trpc/server";

/**
 * Fail-closed boundary for routes that currently log metadata rather than
 * executing a requested action or training a model. This helper has no database,
 * provider or environment dependencies. It must not be replaced by a feature
 * flag until an implemented, authorized and validated pipeline exists.
 * Central wiring is proposed separately, not applied by the claims review.
 */
export type UnsupportedClaimsFeature = "agentExecution" | "federatedTraining";

const UNAVAILABLE_MESSAGES: Record<UnsupportedClaimsFeature, string> = {
  agentExecution:
    "Execution is unavailable: the reviewed route only logs action metadata. No battery, payment, carrier or administrative action has been performed.",
  federatedTraining:
    "Training is unavailable: the reviewed route only changes round/version metadata. No model weights are trained or securely aggregated.",
};

// A void return preserves existing route output inference when this boundary is
// inserted before its legacy body; the implementation always throws.
export function assertClaimsFeatureAvailable(feature: UnsupportedClaimsFeature): void {
  throw new TRPCError({ code: "PRECONDITION_FAILED", message: UNAVAILABLE_MESSAGES[feature] });
}
