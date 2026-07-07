/**
 * openapi.ts
 * Complete OpenAPI 3.0 specification for the Circul-AI-r platform.
 * Served at GET /api/openapi.json
 */

export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Circul-AI-r Battery Intelligence Platform API",
    description: `## Overview
The Circul-AI-r platform provides a comprehensive REST-style API via **tRPC** for managing the full lifecycle of batteries — from cell manufacturing to material recovery.

All tRPC procedures are accessible via:
- **GET** \`/api/trpc/{router}.{procedure}\` for queries
- **POST** \`/api/trpc/{router}.{procedure}\` for mutations

### Authentication
Protected endpoints require a valid session cookie obtained via Manus OAuth login.
Admin endpoints additionally require the user to have \`role: "admin"\` in the database.

### tRPC Batch Requests
Multiple procedures can be batched in a single request:
\`\`\`
GET /api/trpc/auth.me,analytics.kpis
\`\`\`

### Response Envelope
All tRPC responses are wrapped in:
\`\`\`json
{ "result": { "data": { "json": <actual_data> } } }
\`\`\`

### Error Format
\`\`\`json
{ "error": { "json": { "message": "...", "code": -32600, "data": { "code": "UNAUTHORIZED", "httpStatus": 401 } } } }
\`\`\``,
    version: "1.0.0",
    contact: {
      name: "Circul-AI-r Platform",
      url: "https://circulair.energy",
    },
    license: {
      name: "Proprietary",
    },
  },
  servers: [
    {
      url: "https://circulair.energy",
      description: "Production",
    },
    {
      url: "https://circulai-su7xgbwd.manus.space",
      description: "Staging",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication and session management" },
    { name: "BPAN Registry", description: "Battery Passport & Asset Number (BPAN) registration and lifecycle management" },
    { name: "Telemetry", description: "Real-time IoT telemetry data ingestion and retrieval" },
    { name: "AI & Predictions", description: "AI-powered SOH predictions, triage, and digital twin" },
    { name: "Marketplace", description: "Second-life battery marketplace listings and transactions" },
    { name: "Logistics", description: "Battery logistics, shipment tracking, and chain of custody" },
    { name: "EPR Compliance", description: "Extended Producer Responsibility tokens and recycling compliance" },
    { name: "Alerts", description: "Real-time alerts and alert rule management" },
    { name: "Documents", description: "Document management and storage" },
    { name: "Service History", description: "Battery service and maintenance records" },
    { name: "AI Assistant", description: "Conversational AI assistant for battery intelligence" },
    { name: "Consent & Privacy", description: "Data sharing consent management" },
    { name: "Analytics", description: "Platform KPIs, charts, and natural language data queries" },
    { name: "Admin", description: "Administrative operations (requires admin role)" },
    { name: "MQTT", description: "MQTT broker connectivity and real-time telemetry streaming" },
    { name: "PDF Reports", description: "PDF report generation for compliance and health passports" },
    { name: "Regulatory", description: "Multi-jurisdiction regulatory profiles and EU Battery Passport" },
    { name: "Platform Settings", description: "User and global platform configuration" },
    { name: "Agent", description: "Autonomous agent action logging and execution" },
    { name: "Warranty", description: "Battery warranty registration and claims management" },
    { name: "Onboarding", description: "Bulk battery import and onboarding jobs" },
    { name: "Compliance Audit", description: "ISO27001/SOC2 audit logs and security event tracking" },
    { name: "API Keys", description: "API key management for programmatic access" },
    { name: "Wiki", description: "Knowledge base chat and feedback" },
    { name: "Webhooks", description: "Outbound webhook endpoint management" },
    { name: "Tutorial", description: "Guided onboarding tutorial progress tracking" },
    { name: "Device Provisioning", description: "IoT device registration and credential management" },
    { name: "Alert Rules", description: "Configurable alert rule engine" },
    { name: "Digital Twin", description: "Battery digital twin generation and comparison" },
    { name: "Carbon", description: "Carbon footprint calculation and lifecycle assessment" },
    { name: "Blockchain", description: "Immutable blockchain anchoring and verification" },
    { name: "Developer API", description: "Developer API key management and SDK downloads" },
    { name: "Triage", description: "Second-life and end-of-life triage workflow" },
    { name: "Procurement", description: "Supply forecasting and forward order management" },
    { name: "Federated Learning", description: "Privacy-preserving federated ML model updates" },
    { name: "Data Sharing", description: "Cross-organization battery data sharing consents" },
    { name: "Stripe Webhook", description: "Stripe payment event processing" },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "session",
        description: "Session cookie obtained via Manus OAuth login at `/api/oauth/login`",
      },
    },
    schemas: {
      TRPCError: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              json: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  code: { type: "integer", example: -32600 },
                  data: {
                    type: "object",
                    properties: {
                      code: { type: "string", example: "UNAUTHORIZED" },
                      httpStatus: { type: "integer", example: 401 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          openId: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["user", "admin"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Battery: {
        type: "object",
        properties: {
          bpan: { type: "string", example: "INBAT001A1KKINA5ABCA0001", description: "Battery Passport & Asset Number (24-char unique ID)" },
          chemistry: { type: "string", enum: ["NMC", "LFP", "NCA", "LTO", "LMFP", "SIB", "SSB"] },
          status: { type: "string", enum: ["operational", "second_life", "end_of_life", "recalled", "in_transit"] },
          currentSoh: { type: "number", description: "State of Health (%)" },
          capacityKwh: { type: "number" },
          cycleCount: { type: "integer" },
          mfgYear: { type: "integer" },
          cellOriginCountry: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TelemetryRecord: {
        type: "object",
        properties: {
          bpan: { type: "string" },
          tMax: { type: "number", description: "Max cell temperature (°C)" },
          tPack: { type: "number", description: "Pack temperature (°C)" },
          vPack: { type: "number", description: "Pack voltage (V)" },
          sohEstimate: { type: "number", description: "Real-time SOH estimate (%)" },
          cycleCount: { type: "integer" },
          thermalAnomaly: { type: "boolean" },
          anomalyType: { type: "string" },
          recordedAt: { type: "string", format: "date-time" },
        },
      },
      Alert: {
        type: "object",
        properties: {
          id: { type: "integer" },
          bpan: { type: "string" },
          type: { type: "string", enum: ["thermal", "voltage", "soh", "cycle", "compliance", "system"] },
          severity: { type: "string", enum: ["info", "warning", "critical"] },
          title: { type: "string" },
          message: { type: "string" },
          read: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      MarketplaceListing: {
        type: "object",
        properties: {
          id: { type: "integer" },
          bpan: { type: "string" },
          listingType: { type: "string", enum: ["sell", "lease", "recycle"] },
          askingPriceInr: { type: "number" },
          sohAtListing: { type: "number" },
          status: { type: "string", enum: ["active", "sold", "expired", "withdrawn"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      SohPrediction: {
        type: "object",
        properties: {
          bpan: { type: "string" },
          predictedSoh: { type: "number" },
          rulCycles: { type: "integer", description: "Remaining Useful Life in cycles" },
          confidence: { type: "number", description: "Prediction confidence (0-1)" },
          triagePath: { type: "string", enum: ["continue_use", "second_life", "recycle", "warranty_claim"] },
          triageReason: { type: "string" },
          predictedAt: { type: "string", format: "date-time" },
        },
      },
      NlQueryResult: {
        type: "object",
        properties: {
          intent: { type: "string", enum: ["batteries", "telemetry", "alerts", "soh", "marketplace", "summary"] },
          query: { type: "string" },
          explanation: { type: "string" },
          answer: { type: "string", description: "Human-readable AI-generated answer" },
          results: { type: "array", items: { type: "object" } },
          totalCount: { type: "integer" },
          summaryStats: { type: "object", nullable: true },
          filters: { type: "object" },
        },
      },
      ApiKey: {
        type: "object",
        properties: {
          id: { type: "integer" },
          keyPrefix: { type: "string", example: "cai_live_abc12345" },
          name: { type: "string" },
          permissions: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["active", "revoked"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Warranty: {
        type: "object",
        properties: {
          id: { type: "integer" },
          bpan: { type: "string" },
          warrantyId: { type: "string" },
          status: { type: "string", enum: ["active", "expired", "claimed", "voided"] },
          expiresAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Device: {
        type: "object",
        properties: {
          id: { type: "integer" },
          deviceId: { type: "string" },
          bpan: { type: "string" },
          deviceType: { type: "string" },
          status: { type: "string", enum: ["active", "inactive", "decommissioned"] },
          mqttUsername: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    // ── Auth ──────────────────────────────────────────────────────────────────
    "/api/trpc/auth.me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        description: "Returns the currently authenticated user, or null if not logged in.",
        operationId: "auth.me",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "Current user or null",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    result: {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            json: { $ref: "#/components/schemas/User", nullable: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/trpc/auth.logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout current user",
        description: "Clears the session cookie and logs out the current user.",
        operationId: "auth.logout",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": { description: "Logout successful" },
        },
      },
    },
    "/api/oauth/login": {
      get: {
        tags: ["Auth"],
        summary: "Initiate OAuth login",
        description: "Redirects to the Manus OAuth login portal. Pass `returnPath` query param to redirect after login.",
        operationId: "oauth.login",
        parameters: [
          { name: "returnPath", in: "query", schema: { type: "string" }, description: "Path to redirect to after login" },
        ],
        responses: {
          "302": { description: "Redirect to OAuth portal" },
        },
      },
    },
    "/api/oauth/callback": {
      get: {
        tags: ["Auth"],
        summary: "OAuth callback",
        description: "Handles the OAuth callback from Manus, sets session cookie, and redirects to the app.",
        operationId: "oauth.callback",
        parameters: [
          { name: "code", in: "query", required: true, schema: { type: "string" } },
          { name: "state", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "302": { description: "Redirect to app after successful authentication" },
          "400": { description: "Invalid OAuth state or code" },
        },
      },
    },

    // ── BPAN Registry ─────────────────────────────────────────────────────────
    "/api/trpc/bpan.register": {
      post: {
        tags: ["BPAN Registry"],
        summary: "Register a new battery",
        description: "Registers a new battery in the BPAN registry and generates a unique BPAN identifier.",
        operationId: "bpan.register",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["chemistry", "capacityKwh", "mfgYear"],
                    properties: {
                      chemistry: { type: "string", enum: ["NMC", "LFP", "NCA", "LTO", "LMFP", "SIB", "SSB"] },
                      capacityKwh: { type: "number", example: 30 },
                      mfgYear: { type: "integer", example: 2024 },
                      cellOriginCountry: { type: "string", example: "India" },
                      manufacturerName: { type: "string" },
                      modelNumber: { type: "string" },
                      nominalVoltage: { type: "number" },
                      maxChargeRate: { type: "number" },
                      maxDischargeRate: { type: "number" },
                      weightKg: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Battery registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    result: {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            json: {
                              type: "object",
                              properties: {
                                bpan: { type: "string", example: "INBAT001A1KKINA5ABCA0001" },
                                battery: { $ref: "#/components/schemas/Battery" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/trpc/bpan.get": {
      get: {
        tags: ["BPAN Registry"],
        summary: "Get battery by BPAN",
        description: "Retrieves full battery details including telemetry, predictions, and service history.",
        operationId: "bpan.get",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "input", in: "query", required: true, schema: { type: "string" }, description: 'JSON: `{"json":{"bpan":"INBAT001A1KKINA5ABCA0001"}}`' },
        ],
        responses: {
          "200": { description: "Battery details", content: { "application/json": { schema: { type: "object" } } } },
          "404": { description: "Battery not found" },
        },
      },
    },
    "/api/trpc/bpan.list": {
      get: {
        tags: ["BPAN Registry"],
        summary: "List batteries",
        description: "Returns a paginated list of batteries with optional filters.",
        operationId: "bpan.list",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "input", in: "query", schema: { type: "string" }, description: 'JSON: `{"json":{"page":1,"limit":20,"chemistry":"NMC","status":"operational"}}`' },
        ],
        responses: {
          "200": { description: "Paginated battery list" },
        },
      },
    },
    "/api/trpc/bpan.update": {
      post: {
        tags: ["BPAN Registry"],
        summary: "Update battery details",
        operationId: "bpan.update",
        security: [{ sessionCookie: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Battery updated" } },
      },
    },
    "/api/trpc/bpan.updateStatus": {
      post: {
        tags: ["BPAN Registry"],
        summary: "Update battery lifecycle status",
        description: "Transitions a battery to a new lifecycle status (operational → second_life → end_of_life).",
        operationId: "bpan.updateStatus",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["bpan", "status"],
                    properties: {
                      bpan: { type: "string" },
                      status: { type: "string", enum: ["operational", "second_life", "end_of_life", "recalled", "in_transit"] },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Status updated" } },
      },
    },
    "/api/trpc/bpan.stats": {
      get: {
        tags: ["BPAN Registry"],
        summary: "Get battery fleet statistics",
        operationId: "bpan.stats",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "Fleet statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    result: {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            json: {
                              type: "object",
                              properties: {
                                total: { type: "integer" },
                                operational: { type: "integer" },
                                secondLife: { type: "integer" },
                                endOfLife: { type: "integer" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Telemetry ─────────────────────────────────────────────────────────────
    "/api/trpc/telemetry.ingest": {
      post: {
        tags: ["Telemetry"],
        summary: "Ingest telemetry data",
        description: "Ingests real-time IoT telemetry data for a battery. Automatically detects thermal anomalies.",
        operationId: "telemetry.ingest",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["bpan", "tMax", "tPack", "vPack"],
                    properties: {
                      bpan: { type: "string" },
                      tMax: { type: "number", description: "Max cell temperature (°C)" },
                      tPack: { type: "number", description: "Pack temperature (°C)" },
                      vPack: { type: "number", description: "Pack voltage (V)" },
                      sohEstimate: { type: "number" },
                      cycleCount: { type: "integer" },
                      stateOfCharge: { type: "number" },
                      current: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Telemetry ingested, returns anomaly detection result" },
          "404": { description: "Battery not found" },
        },
      },
    },
    "/api/trpc/telemetry.getLatest": {
      get: {
        tags: ["Telemetry"],
        summary: "Get latest telemetry for a battery",
        operationId: "telemetry.getLatest",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "input", in: "query", required: true, schema: { type: "string" }, description: 'JSON: `{"json":{"bpan":"INBAT001A1KKINA5ABCA0001"}}`' },
        ],
        responses: { "200": { description: "Latest telemetry record" } },
      },
    },
    "/api/trpc/telemetry.getHistory": {
      get: {
        tags: ["Telemetry"],
        summary: "Get telemetry history for a battery",
        operationId: "telemetry.getHistory",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "input", in: "query", schema: { type: "string" }, description: 'JSON: `{"json":{"bpan":"...","limit":100}}`' },
        ],
        responses: { "200": { description: "Telemetry history array" } },
      },
    },
    "/api/trpc/telemetry.getAnomalies": {
      get: {
        tags: ["Telemetry"],
        summary: "Get thermal anomaly events",
        operationId: "telemetry.getAnomalies",
        security: [{ sessionCookie: [] }],
        parameters: [
          { name: "input", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "List of anomaly events" } },
      },
    },

    // ── AI & Predictions ──────────────────────────────────────────────────────
    "/api/trpc/ai.predictSoh": {
      post: {
        tags: ["AI & Predictions"],
        summary: "Run AI SOH prediction",
        description: "Runs the AI model to predict State of Health and Remaining Useful Life for a battery.",
        operationId: "ai.predictSoh",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["bpan"],
                    properties: { bpan: { type: "string" } },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "SOH prediction result",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SohPrediction" } } },
          },
        },
      },
    },
    "/api/trpc/ai.getPrediction": {
      get: {
        tags: ["AI & Predictions"],
        summary: "Get latest SOH prediction for a battery",
        operationId: "ai.getPrediction",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "input", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Latest prediction" } },
      },
    },
    "/api/trpc/ai.getPredictionHistory": {
      get: {
        tags: ["AI & Predictions"],
        summary: "Get prediction history for a battery",
        operationId: "ai.getPredictionHistory",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "input", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Prediction history" } },
      },
    },
    "/api/trpc/ai.batchPredict": {
      post: {
        tags: ["AI & Predictions"],
        summary: "Batch SOH prediction for multiple batteries",
        operationId: "ai.batchPredict",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { json: { type: "object", properties: { bpans: { type: "array", items: { type: "string" } } } } },
              },
            },
          },
        },
        responses: { "200": { description: "Batch prediction results" } },
      },
    },

    // ── Analytics ─────────────────────────────────────────────────────────────
    "/api/trpc/analytics.kpis": {
      get: {
        tags: ["Analytics"],
        summary: "Get platform KPIs",
        description: "Returns aggregated KPIs: battery stats, marketplace volume, EPR token counts.",
        operationId: "analytics.kpis",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "Platform KPIs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    result: {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            json: {
                              type: "object",
                              properties: {
                                batteryStats: { type: "object" },
                                marketStats: { type: "object" },
                                eprStats: { type: "object" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/trpc/analytics.nlQuery": {
      post: {
        tags: ["Analytics"],
        summary: "Natural language battery data query",
        description: "Query battery data using plain English. The AI classifies intent, extracts filters, queries the database, and returns a human-readable answer.",
        operationId: "analytics.nlQuery",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["query"],
                    properties: {
                      query: { type: "string", minLength: 1, maxLength: 500, example: "Show critical thermal alerts from this week" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "NL query result with AI-generated answer and structured data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    result: {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: { json: { $ref: "#/components/schemas/NlQueryResult" } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/trpc/analytics.monthlyActivity": {
      get: { tags: ["Analytics"], summary: "Monthly platform activity chart data", operationId: "analytics.monthlyActivity", security: [{ sessionCookie: [] }], responses: { "200": { description: "Monthly registrations, recycling, and sales data" } } },
    },
    "/api/trpc/analytics.sohDistribution": {
      get: { tags: ["Analytics"], summary: "SOH distribution across fleet", operationId: "analytics.sohDistribution", security: [{ sessionCookie: [] }], responses: { "200": { description: "SOH distribution buckets" } } },
    },
    "/api/trpc/analytics.chemistryDistribution": {
      get: { tags: ["Analytics"], summary: "Battery chemistry mix", operationId: "analytics.chemistryDistribution", security: [{ sessionCookie: [] }], responses: { "200": { description: "Chemistry distribution percentages" } } },
    },

    // ── Marketplace ───────────────────────────────────────────────────────────
    "/api/trpc/marketplace.createListing": {
      post: {
        tags: ["Marketplace"],
        summary: "Create a marketplace listing",
        description: "Lists a battery for sale, lease, or recycling on the second-life marketplace.",
        operationId: "marketplace.createListing",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["bpan", "listingType", "askingPriceInr"],
                    properties: {
                      bpan: { type: "string" },
                      listingType: { type: "string", enum: ["sell", "lease", "recycle"] },
                      askingPriceInr: { type: "number" },
                      description: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Listing created", content: { "application/json": { schema: { $ref: "#/components/schemas/MarketplaceListing" } } } } },
      },
    },
    "/api/trpc/marketplace.getListings": {
      get: {
        tags: ["Marketplace"],
        summary: "Browse marketplace listings",
        operationId: "marketplace.getListings",
        parameters: [{ name: "input", in: "query", schema: { type: "string" }, description: 'JSON: `{"json":{"page":1,"limit":20,"listingType":"sell"}}`' }],
        responses: { "200": { description: "Paginated listings" } },
      },
    },
    "/api/trpc/marketplace.getListing": {
      get: {
        tags: ["Marketplace"],
        summary: "Get a single marketplace listing",
        operationId: "marketplace.getListing",
        parameters: [{ name: "input", in: "query", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Listing details" } },
      },
    },
    "/api/trpc/marketplace.purchaseListing": {
      post: {
        tags: ["Marketplace"],
        summary: "Purchase a marketplace listing",
        description: "Initiates a Stripe checkout session for purchasing a battery listing.",
        operationId: "marketplace.purchaseListing",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["listingId", "origin"],
                    properties: {
                      listingId: { type: "integer" },
                      origin: { type: "string", example: "https://circulair.energy" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Stripe checkout URL", content: { "application/json": { schema: { type: "object", properties: { result: { type: "object", properties: { data: { type: "object", properties: { json: { type: "object", properties: { checkoutUrl: { type: "string" } } } } } } } } } } } } },
      },
    },
    "/api/trpc/marketplace.stats": {
      get: { tags: ["Marketplace"], summary: "Marketplace statistics", operationId: "marketplace.stats", security: [{ sessionCookie: [] }], responses: { "200": { description: "Total transactions and volume" } } },
    },

    // ── EPR Compliance ────────────────────────────────────────────────────────
    "/api/trpc/epr.issueToken": {
      post: {
        tags: ["EPR Compliance"],
        summary: "Issue an EPR compliance token",
        description: "Issues a blockchain-anchored EPR token for a recycled battery.",
        operationId: "epr.issueToken",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["bpan", "recyclerName", "yieldKg"],
                    properties: {
                      bpan: { type: "string" },
                      recyclerName: { type: "string" },
                      yieldKg: { type: "number" },
                      jurisdiction: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "EPR token issued" } },
      },
    },
    "/api/trpc/epr.getTokens": {
      get: { tags: ["EPR Compliance"], summary: "Get EPR tokens", operationId: "epr.getTokens", security: [{ sessionCookie: [] }], responses: { "200": { description: "List of EPR tokens" } } },
    },
    "/api/trpc/epr.stats": {
      get: { tags: ["EPR Compliance"], summary: "EPR statistics", operationId: "epr.stats", security: [{ sessionCookie: [] }], responses: { "200": { description: "EPR token counts and yield" } } },
    },

    // ── Alerts ────────────────────────────────────────────────────────────────
    "/api/trpc/alerts.list": {
      get: { tags: ["Alerts"], summary: "List alerts", operationId: "alerts.list", security: [{ sessionCookie: [] }], parameters: [{ name: "input", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Alert list" } } },
    },
    "/api/trpc/alerts.markRead": {
      post: { tags: ["Alerts"], summary: "Mark alert as read", operationId: "alerts.markRead", security: [{ sessionCookie: [] }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "Alert marked read" } } },
    },
    "/api/trpc/alerts.unreadCount": {
      get: { tags: ["Alerts"], summary: "Get unread alert count", operationId: "alerts.unreadCount", security: [{ sessionCookie: [] }], responses: { "200": { description: "Unread count" } } },
    },

    // ── Warranty ──────────────────────────────────────────────────────────────
    "/api/trpc/warranty.register": {
      post: {
        tags: ["Warranty"],
        summary: "Register battery warranty",
        operationId: "warranty.register",
        security: [{ sessionCookie: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Warranty registered" } },
      },
    },
    "/api/trpc/warranty.lookup": {
      get: {
        tags: ["Warranty"],
        summary: "Public warranty lookup by BPAN or warranty ID",
        operationId: "warranty.lookup",
        parameters: [{ name: "input", in: "query", required: true, schema: { type: "string" }, description: 'JSON: `{"json":{"identifier":"INBAT001A1KKINA5ABCA0001"}}`' }],
        responses: { "200": { description: "Warranty details" } },
      },
    },
    "/api/trpc/warranty.submitClaim": {
      post: {
        tags: ["Warranty"],
        summary: "Submit a warranty claim",
        operationId: "warranty.submitClaim",
        security: [{ sessionCookie: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Claim submitted" } },
      },
    },

    // ── Device Provisioning ───────────────────────────────────────────────────
    "/api/trpc/device.register": {
      post: {
        tags: ["Device Provisioning"],
        summary: "Register an IoT device",
        description: "Provisions a new IoT device with MQTT credentials for telemetry ingestion.",
        operationId: "device.register",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["bpan", "deviceType"],
                    properties: {
                      bpan: { type: "string" },
                      deviceType: { type: "string", enum: ["bms", "gateway", "sensor"] },
                      firmwareVersion: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Device registered with MQTT credentials",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    result: {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            json: {
                              type: "object",
                              properties: {
                                device: { $ref: "#/components/schemas/Device" },
                                mqttCredentials: {
                                  type: "object",
                                  properties: {
                                    username: { type: "string" },
                                    password: { type: "string" },
                                    brokerUrl: { type: "string" },
                                    topic: { type: "string" },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/trpc/device.list": {
      get: { tags: ["Device Provisioning"], summary: "List registered devices", operationId: "device.list", security: [{ sessionCookie: [] }], responses: { "200": { description: "Device list" } } },
    },
    "/api/trpc/device.regenerateCredentials": {
      post: { tags: ["Device Provisioning"], summary: "Regenerate MQTT credentials for a device", operationId: "device.regenerateCredentials", security: [{ sessionCookie: [] }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "New credentials" } } },
    },

    // ── Blockchain ────────────────────────────────────────────────────────────
    "/api/trpc/blockchain.anchor": {
      post: {
        tags: ["Blockchain"],
        summary: "Anchor data to blockchain",
        description: "Creates an immutable blockchain record for battery data (SOH prediction, EPR token, etc.).",
        operationId: "blockchain.anchor",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["bpan", "dataType", "dataHash"],
                    properties: {
                      bpan: { type: "string" },
                      dataType: { type: "string", enum: ["soh_prediction", "epr_token", "ownership_transfer", "compliance_cert"] },
                      dataHash: { type: "string" },
                      metadata: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Blockchain record created", content: { "application/json": { schema: { type: "object", properties: { txHash: { type: "string" }, blockNumber: { type: "integer" } } } } } } },
      },
    },
    "/api/trpc/blockchain.verify": {
      get: { tags: ["Blockchain"], summary: "Verify a blockchain record", operationId: "blockchain.verify", parameters: [{ name: "input", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "Verification result" } } },
    },

    // ── Developer API ─────────────────────────────────────────────────────────
    "/api/trpc/developerApi.createKey": {
      post: {
        tags: ["Developer API"],
        summary: "Create a developer API key",
        description: "Creates a new API key with specified permissions for programmatic access.",
        operationId: "developerApi.createKey",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["name", "permissions"],
                    properties: {
                      name: { type: "string" },
                      permissions: { type: "array", items: { type: "string", enum: ["read:batteries", "write:telemetry", "read:analytics", "write:marketplace", "read:compliance"] } },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "API key created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    result: {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            json: {
                              type: "object",
                              properties: {
                                key: { type: "string", description: "Full API key — shown only once", example: "cai_live_abc123xyz..." },
                                keyRecord: { $ref: "#/components/schemas/ApiKey" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/trpc/developerApi.listKeys": {
      get: { tags: ["Developer API"], summary: "List developer API keys", operationId: "developerApi.listKeys", security: [{ sessionCookie: [] }], responses: { "200": { description: "API key list (prefixes only)" } } },
    },
    "/api/trpc/developerApi.revokeKey": {
      post: { tags: ["Developer API"], summary: "Revoke a developer API key", operationId: "developerApi.revokeKey", security: [{ sessionCookie: [] }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "Key revoked" } } },
    },
    "/api/trpc/developerApi.getPermissions": {
      get: { tags: ["Developer API"], summary: "Get available API permissions", operationId: "developerApi.getPermissions", responses: { "200": { description: "Permission list" } } },
    },
    "/api/trpc/developerApi.getSdkDownloadUrls": {
      get: { tags: ["Developer API"], summary: "Get SDK download URLs", operationId: "developerApi.getSdkDownloadUrls", responses: { "200": { description: "SDK download links for Python, Node.js, and Java" } } },
    },

    // ── Regulatory ────────────────────────────────────────────────────────────
    "/api/trpc/regulatory.getEuPassport": {
      get: {
        tags: ["Regulatory"],
        summary: "Get EU Battery Passport",
        description: "Returns the EU Battery Regulation-compliant digital passport for a battery (public endpoint).",
        operationId: "regulatory.getEuPassport",
        parameters: [{ name: "input", in: "query", required: true, schema: { type: "string" }, description: 'JSON: `{"json":{"bpan":"INBAT001A1KKINA5ABCA0001"}}`' }],
        responses: { "200": { description: "EU Battery Passport data" } },
      },
    },
    "/api/trpc/regulatory.getProfiles": {
      get: { tags: ["Regulatory"], summary: "Get regulatory profiles for all jurisdictions", operationId: "regulatory.getProfiles", security: [{ sessionCookie: [] }], responses: { "200": { description: "Regulatory profiles (EU, India, US, China, Japan, Korea, UK)" } } },
    },

    // ── PDF Reports ───────────────────────────────────────────────────────────
    "/api/trpc/pdf.healthPassport": {
      post: {
        tags: ["PDF Reports"],
        summary: "Generate Battery Health Passport PDF",
        description: "Generates a PDF health passport for a battery including SOH, telemetry, and compliance data.",
        operationId: "pdf.healthPassport",
        security: [{ sessionCookie: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { json: { type: "object", required: ["bpan"], properties: { bpan: { type: "string" } } } } } } } },
        responses: { "200": { description: "PDF URL", content: { "application/json": { schema: { type: "object", properties: { result: { type: "object", properties: { data: { type: "object", properties: { json: { type: "object", properties: { url: { type: "string" } } } } } } } } } } } } },
      },
    },
    "/api/trpc/pdf.eprComplianceReport": {
      post: {
        tags: ["PDF Reports"],
        summary: "Generate EPR Compliance Report PDF",
        operationId: "pdf.eprComplianceReport",
        security: [{ sessionCookie: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "EPR compliance report PDF URL" } },
      },
    },
    "/api/trpc/pdf.batteryComplianceCert": {
      post: {
        tags: ["PDF Reports"],
        summary: "Generate Battery Compliance Certificate PDF",
        operationId: "pdf.batteryComplianceCert",
        security: [{ sessionCookie: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Compliance certificate PDF URL" } },
      },
    },

    // ── Carbon ────────────────────────────────────────────────────────────────
    "/api/trpc/carbon.calculate": {
      post: {
        tags: ["Carbon"],
        summary: "Calculate battery carbon footprint",
        description: "Calculates lifecycle carbon footprint using grid region emission factors.",
        operationId: "carbon.calculate",
        security: [{ sessionCookie: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["bpan"],
                    properties: {
                      bpan: { type: "string" },
                      gridRegion: { type: "string", example: "IN-SOUTH" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Carbon footprint calculation result" } },
      },
    },
    "/api/trpc/carbon.getGridRegions": {
      get: { tags: ["Carbon"], summary: "Get available grid regions for carbon calculation", operationId: "carbon.getGridRegions", responses: { "200": { description: "Grid region list with emission factors" } } },
    },

    // ── Triage ────────────────────────────────────────────────────────────────
    "/api/trpc/triage.evaluate": {
      post: {
        tags: ["Triage"],
        summary: "Evaluate battery for second-life/end-of-life triage",
        description: "AI-powered triage evaluation to determine optimal disposition path.",
        operationId: "triage.evaluate",
        security: [{ sessionCookie: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { json: { type: "object", required: ["bpan"], properties: { bpan: { type: "string" } } } } } } } },
        responses: { "200": { description: "Triage recommendation" } },
      },
    },
    "/api/trpc/triage.listCandidates": {
      get: { tags: ["Triage"], summary: "List batteries eligible for triage", operationId: "triage.listCandidates", security: [{ sessionCookie: [] }], responses: { "200": { description: "Triage candidate list" } } },
    },

    // ── Onboarding ────────────────────────────────────────────────────────────
    "/api/trpc/onboarding.bulkImport": {
      post: {
        tags: ["Onboarding"],
        summary: "Bulk import batteries from CSV/JSON",
        description: "Starts an async bulk import job for registering multiple batteries at once.",
        operationId: "onboarding.bulkImport",
        security: [{ sessionCookie: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Import job created", content: { "application/json": { schema: { type: "object", properties: { result: { type: "object", properties: { data: { type: "object", properties: { json: { type: "object", properties: { jobId: { type: "string" } } } } } } } } } } } } },
      },
    },
    "/api/trpc/onboarding.getJob": {
      get: { tags: ["Onboarding"], summary: "Get bulk import job status", operationId: "onboarding.getJob", security: [{ sessionCookie: [] }], parameters: [{ name: "input", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "Job status and progress" } } },
    },

    // ── Admin ─────────────────────────────────────────────────────────────────
    "/api/trpc/admin.users": {
      get: { tags: ["Admin"], summary: "List all platform users", operationId: "admin.users", security: [{ sessionCookie: [] }], responses: { "200": { description: "User list" } } },
    },
    "/api/trpc/admin.updateUserRole": {
      post: { tags: ["Admin"], summary: "Update user role", operationId: "admin.updateUserRole", security: [{ sessionCookie: [] }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { json: { type: "object", required: ["userId", "role"], properties: { userId: { type: "integer" }, role: { type: "string", enum: ["user", "admin"] } } } } } } } }, responses: { "200": { description: "Role updated" } } },
    },
    "/api/trpc/admin.auditLog": {
      get: { tags: ["Admin"], summary: "Get admin audit log", operationId: "admin.auditLog", security: [{ sessionCookie: [] }], responses: { "200": { description: "Audit log entries" } } },
    },

    // ── Stripe Webhook ────────────────────────────────────────────────────────
    "/api/stripe/webhook": {
      post: {
        tags: ["Stripe Webhook"],
        summary: "Stripe payment event webhook",
        description: "Receives Stripe payment events (checkout.session.completed, payment_intent.succeeded, etc.). Must be called with raw body for signature verification. Configure this URL in your Stripe Dashboard → Webhooks.",
        operationId: "stripe.webhook",
        parameters: [
          { name: "stripe-signature", in: "header", required: true, schema: { type: "string" }, description: "Stripe webhook signature for verification" },
        ],
        requestBody: {
          description: "Raw Stripe event payload",
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string", example: "evt_1234567890" },
                  type: { type: "string", example: "checkout.session.completed" },
                  data: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Event processed", content: { "application/json": { schema: { type: "object", properties: { received: { type: "boolean" } } } } } },
          "400": { description: "Invalid signature" },
        },
      },
    },

    // ── Wiki ──────────────────────────────────────────────────────────────────
    "/api/trpc/wiki.chat": {
      post: {
        tags: ["Wiki"],
        summary: "Chat with the battery knowledge base",
        description: "Ask questions about battery technology, regulations, and platform features.",
        operationId: "wiki.chat",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  json: {
                    type: "object",
                    required: ["message"],
                    properties: {
                      message: { type: "string" },
                      sessionId: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "AI response with sources" } },
      },
    },

    // ── Digital Twin ──────────────────────────────────────────────────────────
    "/api/trpc/digitalTwin.generate": {
      post: {
        tags: ["Digital Twin"],
        summary: "Generate a battery digital twin",
        description: "Creates a digital twin model for a battery based on its telemetry and specifications.",
        operationId: "digitalTwin.generate",
        security: [{ sessionCookie: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { json: { type: "object", required: ["bpan"], properties: { bpan: { type: "string" } } } } } } } },
        responses: { "200": { description: "Digital twin model" } },
      },
    },

    // ── Federated Learning ────────────────────────────────────────────────────
    "/api/trpc/federatedLearning.submitLocalUpdate": {
      post: {
        tags: ["Federated Learning"],
        summary: "Submit local model update",
        description: "Submits a privacy-preserving local model update for federated learning aggregation.",
        operationId: "federatedLearning.submitLocalUpdate",
        security: [{ sessionCookie: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Update submitted" } },
      },
    },
    "/api/trpc/federatedLearning.getModelStatus": {
      get: { tags: ["Federated Learning"], summary: "Get federated model status", operationId: "federatedLearning.getModelStatus", security: [{ sessionCookie: [] }], responses: { "200": { description: "Model version and accuracy" } } },
    },
  },
};
