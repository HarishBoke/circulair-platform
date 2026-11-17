import { Router } from "express";

const CANONICAL = "https://circulair.energy";

/** Public reference metadata only; never disclose tenant data or invent an integration contract. */
export function createSeoRouter(): Router {
  const router = Router();
  router.get("/api/v1/openapi.json", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({
      openapi: "3.1.0",
      info: {
        title: "Circul-AI-r API reference inventory",
        version: "1.0.0",
        description: "Reference inventory only, not a complete or executable integration specification. Native tRPC requests require authenticated access and exact current procedure contracts. The owner-bound local pilot has a separate gated device-Bearer REST contract. Disabled operations do not become available through this document.",
      },
      servers: [{ url: CANONICAL }],
      paths: {},
      "x-contract-status": "reference-only",
      "x-authentication": "Native application sessions; distinct asset-scoped device credentials for the separately enabled pilot",
      "x-unavailable": ["official BPAN allocation", "legacy MQTT ingestion and publishing", "new payment checkout and settlement", "certified regulatory generation", "blockchain anchoring", "unverified automatic dispatch"],
    });
  });
  router.get("/api/ai-context", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({
      platform: "Circul-AI-r",
      url: CANONICAL,
      description: "Fleet-agnostic battery lifecycle application with native authentication and owner-scoped records. Availability depends on the deployed release and verified external integrations. No validated neural-model accuracy, official allocation, regulatory acceptance, blockchain anchoring or physical battery connection is established by this metadata.",
      referenceAreas: ["Owner-scoped battery and lifecycle records", "Historical marketplace and EPR records", "Bounded estimates, not calibrated measurements", "Separately gated LOCAL_PILOT assets, device provisioning and persisted BMS-reported readings", "Default-off open-source incident delivery"],
      identityBoundary: "The supplied BPAN guideline is a 21-character draft. Existing 19/21-character application aliases remain legacy local identifiers, not proof of official allocation. LOCAL_PILOT UUIDs are separate from exact physical manufacturer serials and official identifiers.",
      disabledOrUnverified: ["official enrollment", "legacy MQTT ingestion and publishing", "payment checkout and settlement", "automatic regulatory submissions and credit issuance", "blockchain anchoring", "automatic dispatch", "instant phone delivery", "calibrated SOH or capacity tests", "measured uptime history"],
      safetyBoundary: "This software is not a battery protective control. No universal wiring, operating thresholds, pack opening, charging or discharging procedure is supplied.",
      apiReference: `${CANONICAL}/api/v1/openapi.json`,
    });
  });
  return router;
}
