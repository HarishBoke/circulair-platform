/**
 * SEO / GEO / AEO server routes
 * - /api/v1/openapi.json  — OpenAPI 3.1 spec for AI agent discovery
 * - /api/ai-context       — Machine-readable platform summary for LLMs
 * - /sitemap.xml          — Extended sitemap (handled by createSitemapRouter in sitemap.ts)
 */
import { Router } from "express";

const CANONICAL = "https://www.circulair.energy";

export function createSeoRouter(): Router {
  const router = Router();

  /* ── OpenAPI 3.1 Spec ─────────────────────────────────────────────── */
  router.get("/api/v1/openapi.json", (_req, res) => {
    const spec = {
      openapi: "3.1.0",
      info: {
        title: "Circul-AI-r Battery Platform API",
        version: "1.0.0",
        description:
          "End-to-end battery lifecycle intelligence API. Query battery passports (BPAN), AI-powered SOH predictions, EPR compliance status, marketplace listings, and IoT telemetry.",
        contact: { name: "Circul-AI-r Support", email: "business@setoo.co", url: CANONICAL },
        license: { name: "Proprietary", url: `${CANONICAL}/` },
        "x-logo": { url: `${CANONICAL}/circulair.svg` },
      },
      servers: [{ url: CANONICAL, description: "Production" }],
      tags: [
        { name: "batteries", description: "Battery passport (BPAN) registry" },
        { name: "soh", description: "AI-powered State of Health prediction" },
        { name: "marketplace", description: "Second-life battery marketplace" },
        { name: "epr", description: "EPR compliance and token management" },
        { name: "telemetry", description: "IoT telemetry data" },
        { name: "warranty", description: "Battery warranty management" },
      ],
      paths: {
        "/api/trpc/bpan.get": {
          get: {
            tags: ["batteries"],
            summary: "Get battery by BPAN",
            description:
              "Retrieve full battery passport data for a given BPAN (Battery Passport Alphanumeric Number). Returns chemistry, capacity, SOH, manufacturer, production date, and lifecycle history.",
            parameters: [
              {
                name: "input",
                in: "query",
                required: true,
                schema: { type: "object", properties: { bpan: { type: "string", minLength: 19, maxLength: 19, example: "NLBYM2L48JP22101200" } } },
              },
            ],
            responses: {
              "200": {
                description: "Battery passport data",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        bpan: { type: "string" },
                        chemistry: { type: "string", enum: ["LFP", "NMC", "NCA", "SSB"] },
                        capacityKwh: { type: "number" },
                        voltageV: { type: "number" },
                        currentSoh: { type: "number", description: "State of Health as percentage (0-100)" },
                        status: { type: "string", enum: ["operational", "degraded", "eol", "recycled"] },
                        manufacturer: { type: "string" },
                        countryOfOrigin: { type: "string" },
                        productionDate: { type: "string", format: "date" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/api/trpc/ai.predict": {
          post: {
            tags: ["soh"],
            summary: "Run AI SOH prediction",
            description:
              "Run an AI-powered State of Health (SOH) prediction for a battery identified by BPAN. Returns predicted SOH, Remaining Useful Life (RUL), confidence, RMSE, and triage path recommendation.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { bpan: { type: "string", minLength: 19, maxLength: 19 } },
                    required: ["bpan"],
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "SOH prediction result",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        predictedSoh: { type: "number", description: "Predicted SOH percentage" },
                        rulCycles: { type: "integer", description: "Remaining Useful Life in cycles" },
                        confidence: { type: "number", description: "Prediction confidence 0-1" },
                        rmse: { type: "number", description: "Root Mean Square Error" },
                        triagePath: { type: "string", enum: ["Direct Reuse", "Refurbish", "Repurpose", "Recycle"] },
                        reasoning: { type: "string", description: "AI-generated triage reasoning" },
                        maintenanceRecommendations: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/api/trpc/marketplace.list": {
          get: {
            tags: ["marketplace"],
            summary: "List marketplace listings",
            description:
              "Browse second-life battery listings on the Circul-AI-r marketplace. All listings include AI-verified SOH, BPAN traceability, and compliance documentation.",
            parameters: [
              { name: "chemistry", in: "query", schema: { type: "string", enum: ["LFP", "NMC", "NCA", "SSB"] } },
              { name: "minSoh", in: "query", schema: { type: "number", minimum: 0, maximum: 100 } },
              { name: "maxPrice", in: "query", schema: { type: "number" } },
              { name: "currency", in: "query", schema: { type: "string", enum: ["USD", "EUR", "INR", "CNY", "GBP", "THB", "IDR"] } },
            ],
            responses: {
              "200": {
                description: "List of marketplace listings",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          bpan: { type: "string" },
                          title: { type: "string" },
                          chemistry: { type: "string" },
                          capacityKwh: { type: "number" },
                          soh: { type: "number" },
                          price: { type: "number" },
                          currency: { type: "string" },
                          condition: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/api/trpc/epr.stats": {
          get: {
            tags: ["epr"],
            summary: "Get EPR compliance statistics",
            description:
              "Retrieve EPR compliance statistics including total tokens, verified tokens, pending review, and total yield by jurisdiction.",
            responses: {
              "200": {
                description: "EPR compliance statistics",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        totalTokens: { type: "integer" },
                        verifiedTokens: { type: "integer" },
                        pendingReview: { type: "integer" },
                        totalYieldTonnes: { type: "number" },
                        byJurisdiction: {
                          type: "object",
                          additionalProperties: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/warranty/check": {
          get: {
            tags: ["warranty"],
            summary: "Check battery warranty",
            description: "Public warranty check page. Enter a BPAN to verify warranty status, coverage, and remaining warranty period.",
            responses: { "200": { description: "Warranty check page" } },
          },
        },
      },
      components: {
        schemas: {
          Battery: {
            type: "object",
            properties: {
              bpan: { type: "string", description: "Battery Passport Alphanumeric Number (19 chars)" },
              chemistry: { type: "string", enum: ["LFP", "NMC", "NCA", "SSB"] },
              capacityKwh: { type: "number" },
              voltageV: { type: "number" },
              currentSoh: { type: "number" },
              status: { type: "string" },
            },
          },
        },
      },
    };
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(spec);
  });

  /* ── AI Context Endpoint ──────────────────────────────────────────── */
  router.get("/api/ai-context", (_req, res) => {
    const context = {
      platform: "Circul-AI-r",
      tagline: "Battery Circular Economy Platform",
      url: CANONICAL,
      contact: "business@setoo.co",
      description:
        "Circul-AI-r is an end-to-end battery lifecycle intelligence platform. It provides BPAN (Battery Passport Alphanumeric Number) traceability, AI-powered State of Health (SOH) prediction using a CNN-LSTM model, real-time IoT telemetry via MQTT, EPR compliance automation across 7 jurisdictions, a second-life battery marketplace, yield verification, and blockchain-based audit trails.",
      capabilities: [
        "Battery Passport (BPAN) generation and registry",
        "AI-powered SOH prediction (CNN-LSTM, RMSE < 2%)",
        "Remaining Useful Life (RUL) prediction",
        "Real-time IoT telemetry via MQTT over TLS",
        "EPR compliance for EU, India (CPCB BW-3), China (MEP), USA, UK, Thailand, Indonesia",
        "Second-life battery marketplace with multi-currency support",
        "Yield verification and EPR token issuance",
        "Carbon footprint declaration (EU Battery Regulation)",
        "Blockchain-based audit trail",
        "REST API and tRPC API",
        "MCP server for AI agent integration",
      ],
      jurisdictions: ["EU", "India", "China", "USA", "UK", "Thailand", "Indonesia"],
      chemistries: ["LFP", "NMC", "NCA", "SSB"],
      regulations: [
        "EU Battery Regulation 2023/1542",
        "India CPCB BW-3 (Battery Waste Management Rules 2022)",
        "China MEP Battery Recycling Measures",
        "UK Battery and Accumulator Regulations",
      ],
      keyTerms: {
        BPAN: "Battery Passport Alphanumeric Number — 19-character unique battery identifier",
        SOH: "State of Health — battery capacity as % of rated capacity",
        RUL: "Remaining Useful Life — cycles remaining before end-of-life",
        EPR: "Extended Producer Responsibility — producer obligation for battery end-of-life",
        "Second-Life Battery": "Battery at end-of-first-life (SOH ~80%) repurposed for stationary storage",
        "Triage Path": "AI recommendation: Direct Reuse, Refurbish, Repurpose, or Recycle",
      },
      publicPages: [
        { path: "/", title: "Home" },
        { path: "/marketplace", title: "Second-Life Battery Marketplace" },
        { path: "/faq", title: "FAQ" },
        { path: "/how-it-works", title: "How It Works" },
        { path: "/glossary", title: "Battery Industry Glossary" },
        { path: "/wiki", title: "Knowledge Wiki" },
        { path: "/getting-started", title: "Getting Started Guide" },
        { path: "/warranty/check", title: "Warranty Check" },
        { path: "/developer-portal", title: "Developer Portal" },
      ],
      api: {
        openapi: `${CANONICAL}/api/v1/openapi.json`,
        trpc: `${CANONICAL}/api/trpc`,
      },
    };
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(context);
  });

  return router;
}
