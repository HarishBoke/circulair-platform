/**
 * apiGateway.ts — REST API Gateway (v1)
 * 
 * Provides a standard REST API alongside tRPC for microservices integration.
 * Features:
 * - API key authentication (Bearer token)
 * - Rate limiting per API key tier
 * - OpenAPI 3.1 specification
 * - Swagger UI at /api/docs
 * - Request/response logging
 * - CORS support
 * - Versioned endpoints under /api/v1/*
 */
import { Router, Request, Response, NextFunction } from "express";
import { openapiSpec as trpcOpenapiSpec } from "./openapi";
import {
  validateApiKey, logApiUsage, writeAuditLog, writeSecurityEvent, generateTraceId,
} from "./compliance";
import {
  getBatteryByBpan, listBatteries, getLatestTelemetry, getTelemetryHistory,
  getLatestSohPrediction, listMarketplace, getMarketplaceStats,
  listEprTokens, getEprStats, getBatteryStats, insertTelemetry, createAlert,
  updateDeviceLastSeenByBpan,
} from "./db";
import { broadcastTelemetryReading } from "./telemetrySocket";
import { shouldCreateAlert, recordAlert } from "./alertCooldown";
import {
  lookupWarranty, listWarrantyRecords, getWarrantyStats, computeWarrantyStatus, getWarrantyByBpan,
} from "./db-warranty";

// ─── API KEY AUTH MIDDLEWARE ─────────────────────────────────────────────────
async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Missing or invalid Authorization header. Use: Bearer <api_key>",
      docs: "/api/docs",
    });
  }

  const key = authHeader.substring(7);
  const apiKey = await validateApiKey(key);
  if (!apiKey) {
    await writeSecurityEvent({
      eventType: "permission_denied",
      severity: "medium",
      description: `Invalid API key attempt from ${req.ip}`,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers["user-agent"],
    });
    return res.status(401).json({
      error: "unauthorized",
      message: "Invalid or expired API key",
    });
  }

  // Attach API key info to request
  (req as any).apiKey = apiKey;
  (req as any).traceId = generateTraceId();
  next();
}

// ─── RATE LIMITING (in-memory per API key) ──────────────────────────────────
const rateLimitStore = new Map<number, { count: number; resetAt: number }>();

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const apiKey = (req as any).apiKey;
  if (!apiKey) return next();

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const limit = apiKey.rateLimit ?? 100;

  let entry = rateLimitStore.get(apiKey.id);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(apiKey.id, entry);
  }

  entry.count++;
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - entry.count));
  res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

  if (entry.count > limit) {
    writeSecurityEvent({
      eventType: "rate_limit_exceeded",
      severity: "low",
      description: `Rate limit exceeded for API key ${apiKey.keyPrefix}... (${entry.count}/${limit} req/min)`,
      metadata: { apiKeyId: apiKey.id, count: entry.count, limit },
    });
    return res.status(429).json({
      error: "rate_limit_exceeded",
      message: `Rate limit of ${limit} requests per minute exceeded`,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
  }

  next();
}

// ─── REQUEST LOGGING MIDDLEWARE ──────────────────────────────────────────────
function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const traceId = (req as any).traceId ?? generateTraceId();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const apiKey = (req as any).apiKey;

    writeAuditLog({
      traceId,
      actorType: "api_key",
      apiKeyId: apiKey?.id,
      action: `${req.method} ${req.path}`,
      module: "api",
      httpMethod: req.method,
      httpPath: req.path,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers["user-agent"],
      status: res.statusCode < 400 ? "success" : res.statusCode < 500 ? "denied" : "error",
      durationMs,
    });

    if (apiKey) {
      logApiUsage({
        apiKeyId: apiKey.id,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        durationMs,
        ipAddress: req.ip ?? undefined,
        traceId,
      });
    }
  });

  // Add trace ID to response headers
  res.setHeader("X-Trace-Id", traceId);
  res.setHeader("X-API-Version", "v1");
  next();
}

// ─── OPENAPI 3.1 SPECIFICATION ──────────────────────────────────────────────
const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Circul-AI-r Platform API",
    version: "1.0.0",
    description: "REST API for the Circul-AI-r Battery Intelligence Platform. Provides programmatic access to battery lifecycle management, warranty verification, marketplace operations, compliance reporting, and IoT telemetry data.\n\nAll endpoints require API key authentication via Bearer token.",
    contact: {
      name: "Circul-AI-r Platform",
      url: "https://circulair.io",
    },
    license: {
      name: "Proprietary",
    },
  },
  servers: [
    { url: "/api/v1", description: "Production API" },
  ],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key obtained from the platform admin panel",
      },
    },
    schemas: {
      Battery: {
        type: "object",
        properties: {
          id: { type: "integer" },
          bpan: { type: "string", description: "Battery Passport Aadhaar Number (21 chars)" },
          manufacturer: { type: "string" },
          chemistry: { type: "string", enum: ["NMC", "LFP", "NCA", "LCO", "LMO", "LMFP", "Na-ion", "Solid-state"] },
          capacityKwh: { type: "string" },
          currentSoh: { type: "string" },
          status: { type: "string", enum: ["operational", "second_life", "end_of_life", "in_transit", "recycling"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Telemetry: {
        type: "object",
        properties: {
          bpan: { type: "string" },
          voltage: { type: "string" },
          current: { type: "string" },
          temperature: { type: "string" },
          soc: { type: "string" },
          cycleCount: { type: "integer" },
          internalResistance: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      WarrantyRecord: {
        type: "object",
        properties: {
          id: { type: "integer" },
          bpan: { type: "string" },
          customerName: { type: "string" },
          warrantyType: { type: "string" },
          status: { type: "string" },
          warrantyStartDate: { type: "string", format: "date-time" },
          warrantyEndDate: { type: "string", format: "date-time" },
          effectiveStatus: { type: "string" },
          daysRemaining: { type: "integer" },
          isInWarranty: { type: "boolean" },
        },
      },
      MarketplaceListing: {
        type: "object",
        properties: {
          id: { type: "integer" },
          bpan: { type: "string" },
          listingType: { type: "string" },
          spotPriceInr: { type: "string" },
          sohAtListing: { type: "string" },
          status: { type: "string" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/batteries": {
      get: {
        summary: "List batteries",
        tags: ["Batteries"],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 0 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "chemistry", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "List of batteries", content: { "application/json": { schema: { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/Battery" } }, total: { type: "integer" } } } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/batteries/{bpan}": {
      get: {
        summary: "Get battery by BPAN",
        tags: ["Batteries"],
        parameters: [{ name: "bpan", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Battery details", content: { "application/json": { schema: { $ref: "#/components/schemas/Battery" } } } },
          "404": { description: "Battery not found" },
        },
      },
    },
    "/batteries/{bpan}/telemetry": {
      get: {
        summary: "Get battery telemetry",
        tags: ["Telemetry"],
        parameters: [
          { name: "bpan", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          "200": { description: "Telemetry data", content: { "application/json": { schema: { type: "object", properties: { latest: { $ref: "#/components/schemas/Telemetry" }, history: { type: "array", items: { $ref: "#/components/schemas/Telemetry" } } } } } } },
        },
      },
    },
    "/batteries/{bpan}/soh": {
      get: {
        summary: "Get battery SOH prediction",
        tags: ["AI Predictions"],
        parameters: [{ name: "bpan", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "SOH prediction", content: { "application/json": { schema: { type: "object", properties: { predictedSoh: { type: "string" }, rulCycles: { type: "integer" }, triageRecommendation: { type: "string" } } } } } },
        },
      },
    },
    "/batteries/{bpan}/warranty": {
      get: {
        summary: "Get battery warranty status",
        tags: ["Warranty"],
        parameters: [{ name: "bpan", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Warranty records with computed status", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/WarrantyRecord" } } } } },
        },
      },
    },
    "/warranty/lookup": {
      get: {
        summary: "Multi-channel warranty lookup",
        tags: ["Warranty"],
        parameters: [
          { name: "channel", in: "query", required: true, schema: { type: "string", enum: ["bpan", "serialNumber", "phone", "email", "whatsApp"] } },
          { name: "value", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Warranty lookup results" },
        },
      },
    },
    "/warranty/stats": {
      get: {
        summary: "Warranty statistics",
        tags: ["Warranty"],
        responses: { "200": { description: "Warranty stats" } },
      },
    },
    "/marketplace": {
      get: {
        summary: "List marketplace listings",
        tags: ["Marketplace"],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 0 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "listingType", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Marketplace listings", content: { "application/json": { schema: { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/MarketplaceListing" } }, total: { type: "integer" } } } } } },
        },
      },
    },
    "/marketplace/stats": {
      get: {
        summary: "Marketplace statistics",
        tags: ["Marketplace"],
        responses: { "200": { description: "Marketplace stats" } },
      },
    },
    "/compliance/epr": {
      get: {
        summary: "List EPR tokens",
        tags: ["Compliance"],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 0 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { "200": { description: "EPR tokens" } },
      },
    },
    "/compliance/epr/stats": {
      get: {
        summary: "EPR compliance statistics",
        tags: ["Compliance"],
        responses: { "200": { description: "EPR stats" } },
      },
    },
    "/stats/batteries": {
      get: {
        summary: "Battery fleet statistics",
        tags: ["Analytics"],
        responses: { "200": { description: "Battery stats" } },
      },
    },
    "/health": {
      get: {
        summary: "API health check",
        tags: ["System"],
        security: [],
        responses: { "200": { description: "API is healthy" } },
      },
    },
  },
  tags: [
    { name: "Batteries", description: "Battery registry and lifecycle management" },
    { name: "Telemetry", description: "IoT telemetry data" },
    { name: "AI Predictions", description: "SOH prediction and triage" },
    { name: "Warranty", description: "Warranty registration and verification" },
    { name: "Marketplace", description: "Second-life battery marketplace" },
    { name: "Compliance", description: "EPR compliance and regulatory" },
    { name: "Analytics", description: "Platform analytics and KPIs" },
    { name: "System", description: "System health and status" },
  ],
};

// ─── SHARED SWAGGER NAV STYLES ───────────────────────────────────────────────
const swaggerNavStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: #07100a; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; color: #e8f5ee; }

  /* ── TOP BAR ── */
  .dev-header {
    background: #0a1a0f;
    border-bottom: 1px solid #1a3a28;
    padding: 0 24px;
    display: flex;
    align-items: center;
    gap: 0;
    height: 56px;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .dev-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-right: 32px;
    text-decoration: none;
  }
  .dev-brand-dot {
    width: 28px; height: 28px;
    background: linear-gradient(135deg, #00c589, #00a070);
    border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #07100a;
  }
  .dev-brand-name {
    font-size: 15px; font-weight: 700; color: #e8f5ee;
    letter-spacing: -0.02em;
  }
  .dev-brand-name span { color: #00c589; }
  .dev-nav-tabs {
    display: flex;
    align-items: stretch;
    height: 100%;
    gap: 0;
    flex: 1;
  }
  .dev-tab {
    display: flex; align-items: center; gap: 7px;
    padding: 0 16px;
    font-size: 13px; font-weight: 500;
    color: #6b9e7e;
    text-decoration: none;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .dev-tab:hover { color: #b8e8cc; }
  .dev-tab.active { color: #00c589; border-bottom-color: #00c589; }
  .dev-tab .tab-badge {
    background: #00c58920;
    color: #00c589;
    border: 1px solid #00c58940;
    font-size: 10px; font-weight: 600;
    padding: 1px 6px; border-radius: 10px;
    font-family: 'DM Mono', monospace;
  }
  .dev-tab .tab-icon { font-size: 14px; opacity: 0.7; }
  .dev-actions {
    display: flex; align-items: center; gap: 8px;
    margin-left: auto;
  }
  .dev-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    font-size: 12px; font-weight: 500;
    border-radius: 6px;
    text-decoration: none;
    transition: background 0.15s;
    font-family: 'DM Mono', monospace;
  }
  .dev-btn-outline {
    color: #6b9e7e;
    border: 1px solid #1a3a28;
    background: transparent;
  }
  .dev-btn-outline:hover { background: #1a3a28; color: #b8e8cc; }
  .dev-btn-primary {
    background: #00c589;
    color: #07100a;
    border: 1px solid #00c589;
    font-weight: 600;
  }
  .dev-btn-primary:hover { background: #00d99a; }

  /* ── INFO BANNER ── */
  .dev-info-banner {
    background: #0d1f17;
    border-bottom: 1px solid #1a3a28;
    padding: 10px 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .dev-info-tag {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: #6b9e7e;
    font-family: 'DM Mono', monospace;
  }
  .dev-info-tag .dot { width: 6px; height: 6px; border-radius: 50%; background: #00c589; }
  .dev-info-tag .dot.amber { background: #f59e0b; }
  .dev-info-tag strong { color: #b8e8cc; }
  .dev-info-sep { color: #1a3a28; }

  /* ── SWAGGER UI OVERRIDES ── */
  .swagger-ui { font-family: 'DM Sans', sans-serif !important; }
  .swagger-ui .topbar { display: none !important; }
  .swagger-ui .info { padding: 20px 0 10px; }
  .swagger-ui .info .title { color: #e8f5ee !important; font-family: 'DM Sans', sans-serif !important; font-size: 24px !important; }
  .swagger-ui .info p, .swagger-ui .info li { color: #9cbfac !important; }
  .swagger-ui .info a { color: #00c589 !important; }
  .swagger-ui .scheme-container { background: #0a1a0f !important; border: 1px solid #1a3a28 !important; padding: 12px 20px !important; border-radius: 8px !important; }
  .swagger-ui .opblock-tag { color: #b8e8cc !important; font-family: 'DM Sans', sans-serif !important; font-size: 16px !important; border-bottom: 1px solid #1a3a28 !important; }
  .swagger-ui .opblock { border: 1px solid #1a3a28 !important; border-radius: 8px !important; margin-bottom: 8px !important; overflow: hidden; }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #1a4a6e !important; }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #1a4a2e !important; }
  .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #4a3a1a !important; }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #4a1a1a !important; }
  .swagger-ui .opblock-summary-method { font-family: 'DM Mono', monospace !important; font-size: 12px !important; min-width: 70px !important; padding: 6px 10px !important; border-radius: 4px !important; }
  .swagger-ui .opblock-summary-path { color: #e8f5ee !important; font-family: 'DM Mono', monospace !important; font-size: 14px !important; }
  .swagger-ui .opblock-summary-description { color: #9cbfac !important; }
  .swagger-ui .opblock-body { background: #0a1a0f !important; }
  .swagger-ui .opblock-section-header { background: #0d1f17 !important; border-bottom: 1px solid #1a3a28 !important; }
  .swagger-ui .opblock-section-header label { color: #b8e8cc !important; }
  .swagger-ui table thead tr td, .swagger-ui table thead tr th { color: #9cbfac !important; border-bottom: 1px solid #1a3a28 !important; font-family: 'DM Mono', monospace !important; font-size: 12px !important; }
  .swagger-ui .parameter__name { color: #e8f5ee !important; font-family: 'DM Mono', monospace !important; }
  .swagger-ui .parameter__type { color: #00c589 !important; font-family: 'DM Mono', monospace !important; }
  .swagger-ui .parameter__in { color: #f59e0b !important; font-family: 'DM Mono', monospace !important; }
  .swagger-ui .response-col_status { color: #00c589 !important; font-family: 'DM Mono', monospace !important; }
  .swagger-ui .response-col_description { color: #9cbfac !important; }
  .swagger-ui .model-title { color: #b8e8cc !important; }
  .swagger-ui .model { color: #9cbfac !important; }
  .swagger-ui .prop-type { color: #00c589 !important; font-family: 'DM Mono', monospace !important; }
  .swagger-ui .prop-format { color: #f59e0b !important; }
  .swagger-ui textarea, .swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui input[type=email], .swagger-ui input[type=file], .swagger-ui input[type=search] {
    background: #0d1f17 !important; color: #e8f5ee !important; border: 1px solid #1a3a28 !important; border-radius: 6px !important; font-family: 'DM Mono', monospace !important;
  }
  .swagger-ui .btn { border-radius: 6px !important; font-family: 'DM Sans', sans-serif !important; font-weight: 600 !important; }
  .swagger-ui .btn.execute { background: #00c589 !important; color: #07100a !important; border-color: #00c589 !important; }
  .swagger-ui .btn.execute:hover { background: #00d99a !important; }
  .swagger-ui .btn.cancel { background: transparent !important; color: #e8f5ee !important; border-color: #1a3a28 !important; }
  .swagger-ui .btn.authorize { background: #00c58920 !important; color: #00c589 !important; border-color: #00c58940 !important; }
  .swagger-ui .btn.authorize svg { fill: #00c589 !important; }
  .swagger-ui .auth-wrapper { background: #0a1a0f !important; border: 1px solid #1a3a28 !important; border-radius: 8px !important; }
  .swagger-ui .dialog-ux .modal-ux { background: #0d1f17 !important; border: 1px solid #1a3a28 !important; border-radius: 12px !important; }
  .swagger-ui .dialog-ux .modal-ux-header { background: #0a1a0f !important; border-bottom: 1px solid #1a3a28 !important; }
  .swagger-ui .dialog-ux .modal-ux-header h3 { color: #e8f5ee !important; }
  .swagger-ui .highlight-code, .swagger-ui .microlight { background: #060d08 !important; border-radius: 6px !important; }
  .swagger-ui .microlight span { color: #00c589 !important; }
  .swagger-ui select { background: #0d1f17 !important; color: #e8f5ee !important; border: 1px solid #1a3a28 !important; border-radius: 6px !important; }
  .swagger-ui .wrapper { padding: 0 24px !important; }
  .swagger-ui section.models { background: #0a1a0f !important; border: 1px solid #1a3a28 !important; border-radius: 8px !important; }
  .swagger-ui section.models h4 { color: #b8e8cc !important; }
  .swagger-ui .model-box { background: #060d08 !important; border-radius: 6px !important; }
  .swagger-ui .servers-title, .swagger-ui .schemes-title { color: #9cbfac !important; }
  .swagger-ui .servers > label select { background: #0d1f17 !important; color: #e8f5ee !important; }
  .swagger-ui .expand-methods svg, .swagger-ui .expand-operation svg { fill: #6b9e7e !important; }
  .swagger-ui .arrow { fill: #6b9e7e !important; }
  .swagger-ui .opblock-tag-section { margin-bottom: 16px !important; }
  .swagger-ui .opblock .opblock-summary { background: #0d1f17 !important; }
  .swagger-ui .opblock .opblock-summary:hover { background: #0f2318 !important; }
  .swagger-ui .opblock.is-open .opblock-summary { border-bottom: 1px solid #1a3a28 !important; }
  .swagger-ui .copy-to-clipboard { background: #1a3a28 !important; border-radius: 4px !important; }
  .swagger-ui .copy-to-clipboard button { background: transparent !important; }
  .swagger-ui .copy-to-clipboard button svg { fill: #6b9e7e !important; }
  .swagger-ui .responses-inner h4, .swagger-ui .responses-inner h5 { color: #b8e8cc !important; }
  .swagger-ui .response-control-media-type__accept-message { color: #9cbfac !important; }
  .swagger-ui .tab li { color: #9cbfac !important; }
  .swagger-ui .tab li.active { color: #00c589 !important; }
  .swagger-ui .tab li.active::after { background: #00c589 !important; }
  .swagger-ui .loading-container .loading::after { color: #00c589 !important; }
`;

// ─── SWAGGER UI HTML (REST Gateway) ─────────────────────────────────────────
const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>REST API v1 — Circul-AI-r Developer Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>${swaggerNavStyles}</style>
</head>
<body>
  <!-- ── HEADER ── -->
  <header class="dev-header">
    <a href="/developer-hub" class="dev-brand">
      <div class="dev-brand-dot">C</div>
      <span class="dev-brand-name">Circul-<span>AI</span>-r</span>
    </a>
    <nav class="dev-nav-tabs">
      <a href="/api/v1/docs" class="dev-tab active">
        <span class="tab-icon">⚡</span> REST API v1
        <span class="tab-badge">Bearer</span>
      </a>
      <a href="/api/trpc/docs" class="dev-tab">
        <span class="tab-icon">⚙</span> tRPC Full Reference
        <span class="tab-badge">188</span>
      </a>
    </nav>
    <div class="dev-actions">
      <a href="/api/v1/openapi.json" target="_blank" class="dev-btn dev-btn-outline">⬇ OpenAPI JSON</a>
      <a href="/developer-portal" class="dev-btn dev-btn-primary">🔑 Get API Key</a>
    </div>
  </header>

  <!-- ── INFO BANNER ── -->
  <div class="dev-info-banner">
    <div class="dev-info-tag"><div class="dot"></div><strong>REST API v1</strong></div>
    <div class="dev-info-sep">|</div>
    <div class="dev-info-tag">Base URL: <strong>https://circulair.energy/api/v1</strong></div>
    <div class="dev-info-sep">|</div>
    <div class="dev-info-tag">Auth: <strong>Authorization: Bearer &lt;API_KEY&gt;</strong></div>
    <div class="dev-info-sep">|</div>
    <div class="dev-info-tag"><div class="dot amber"></div>18 endpoints · OpenAPI 3.1</div>
  </div>

  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/v1/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      tryItOutEnabled: true,
      requestInterceptor: (req) => { req.headers['X-Requested-With'] = 'SwaggerUI'; return req; },
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      docExpansion: 'list',
      syntaxHighlight: { activated: true, theme: 'monokai' },
    });
  </script>
</body>
</html>`;

// ─── SWAGGER UI HTML (tRPC full spec) ────────────────────────────────────────
const trpcSwaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>tRPC Full Reference — Circul-AI-r Developer Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>${swaggerNavStyles}</style>
</head>
<body>
  <!-- ── HEADER ── -->
  <header class="dev-header">
    <a href="/developer-hub" class="dev-brand">
      <div class="dev-brand-dot">C</div>
      <span class="dev-brand-name">Circul-<span>AI</span>-r</span>
    </a>
    <nav class="dev-nav-tabs">
      <a href="/api/v1/docs" class="dev-tab">
        <span class="tab-icon">⚡</span> REST API v1
        <span class="tab-badge">Bearer</span>
      </a>
      <a href="/api/trpc/docs" class="dev-tab active">
        <span class="tab-icon">⚙</span> tRPC Full Reference
        <span class="tab-badge">188</span>
      </a>
    </nav>
    <div class="dev-actions">
      <a href="/api/trpc/openapi.json" target="_blank" class="dev-btn dev-btn-outline">⬇ OpenAPI JSON</a>
      <a href="/developer-portal" class="dev-btn dev-btn-primary">🔑 Get API Key</a>
    </div>
  </header>

  <!-- ── INFO BANNER ── -->
  <div class="dev-info-banner">
    <div class="dev-info-tag"><div class="dot"></div><strong>tRPC API</strong></div>
    <div class="dev-info-sep">|</div>
    <div class="dev-info-tag">Base URL: <strong>https://circulair.energy/api/trpc</strong></div>
    <div class="dev-info-sep">|</div>
    <div class="dev-info-tag">Auth: <strong>Session Cookie (HttpOnly JWT)</strong></div>
    <div class="dev-info-sep">|</div>
    <div class="dev-info-tag"><div class="dot amber"></div>188 procedures · 30+ routers · OpenAPI 3.1</div>
  </div>

  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/trpc/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      tryItOutEnabled: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      docExpansion: 'list',
      withCredentials: true,
      syntaxHighlight: { activated: true, theme: 'monokai' },
    });
  </script>
</body>
</html>`;

// ─── ROUTE HANDLERS ─────────────────────────────────────────────────────────
export function createApiGateway(): Router {
  const api = Router();

  // Public endpoints (no auth required)
  api.get("/health", (_req, res) => {
    res.json({ status: "healthy", version: "1.0.0", timestamp: new Date().toISOString() });
  });

  api.get("/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });

  api.get("/docs", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(swaggerHtml);
  });

  // tRPC OpenAPI spec + Swagger UI
  api.get("/trpc/openapi.json", (_req, res) => {
    res.json(trpcOpenapiSpec);
  });
  api.get("/trpc/docs", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(trpcSwaggerHtml);
  });

  // Protected endpoints (API key required)
  api.use(apiKeyAuth);
  api.use(rateLimiter);
  api.use(requestLogger);

  // ─── BATTERIES ──────────────────────────────────────────────────────────
  api.get("/batteries", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const result = await listBatteries({
        offset: page * limit, limit,
        search: req.query.search as string,
        status: req.query.status as string,
        chemistry: req.query.chemistry as string,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  api.get("/batteries/:bpan", async (req, res) => {
    try {
      const battery = await getBatteryByBpan(req.params.bpan);
      if (!battery) return res.status(404).json({ error: "not_found", message: "Battery not found" });
      res.json(battery);
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  api.get("/batteries/:bpan/telemetry", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const [latest, history] = await Promise.all([
        getLatestTelemetry(req.params.bpan),
        getTelemetryHistory(req.params.bpan),
      ]);
      res.json({ latest, history });
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  // POST /batteries/:bpan/telemetry — REST ingest for non-MQTT sources (SCADA, fleet software, direct device)
  api.post("/batteries/:bpan/telemetry", async (req, res) => {
    try {
      const bpan = req.params.bpan;
      const battery = await getBatteryByBpan(bpan);
      if (!battery) return res.status(404).json({ error: "not_found", message: `Battery ${bpan} not registered` });
      const body = req.body as Record<string, unknown>;
      const vPack = typeof body.vPack === "number" ? body.vPack : undefined;
      const iPack = typeof body.iPack === "number" ? body.iPack : undefined;
      const vMin  = typeof body.vMin  === "number" ? body.vMin  : undefined;
      const vMax  = typeof body.vMax  === "number" ? body.vMax  : undefined;
      const tPack = typeof body.tPack === "number" ? body.tPack : undefined;
      const tMax  = typeof body.tMax  === "number" ? body.tMax  : undefined;
      const cycleCount = typeof body.cycleCount === "number" ? Math.floor(body.cycleCount) : undefined;
      const irPack = typeof body.irPack === "number" ? body.irPack : undefined;
      const sohEstimate = typeof body.sohEstimate === "number" ? body.sohEstimate : undefined;
      const dtcCodes = Array.isArray(body.dtcCodes) ? (body.dtcCodes as unknown[]).map(String) : undefined;
      const thermalAnomaly = (tMax ?? 0) > 51;
      await insertTelemetry({
        bpan,
        batteryId: battery.id,
        vPack: vPack != null ? String(vPack) : undefined,
        iPack: iPack != null ? String(iPack) : undefined,
        vMin:  vMin  != null ? String(vMin)  : undefined,
        vMax:  vMax  != null ? String(vMax)  : undefined,
        tPack: tPack != null ? String(tPack) : undefined,
        tMax:  tMax  != null ? String(tMax)  : undefined,
        cycleCount,
        irPack: irPack != null ? String(irPack) : undefined,
        sohEstimate: sohEstimate != null ? String(sohEstimate) : undefined,
        dtcCodes: dtcCodes ?? null,
        thermalAnomaly,
        anomalyType: thermalAnomaly ? `High temperature: ${tMax}°C` : undefined,
        source: "api",
      });
      // Update IoT device lastSeen heartbeat (fire-and-forget)
      updateDeviceLastSeenByBpan(bpan).catch(() => {});
      broadcastTelemetryReading({
        bpan,
        batteryId: battery.id,
        vPack: vPack ?? 0, iPack: iPack ?? 0, vMin: vMin ?? 0, vMax: vMax ?? 0,
        tPack: tPack ?? 0, tMax: tMax ?? 0, cycleCount: cycleCount ?? 0,
        irPack: irPack ?? 0, sohEstimate: sohEstimate ?? 0,
        thermalAnomaly,
        anomalyType: thermalAnomaly ? `High temperature: ${tMax}°C` : undefined,
        source: "api",
        recordedAt: new Date().toISOString(),
      });
      if (thermalAnomaly && await shouldCreateAlert(bpan, "thermal_anomaly")) {
        await createAlert({
          bpan, batteryId: battery.id, type: "thermal_anomaly", severity: "critical",
          title: `Thermal Anomaly — ${bpan}`,
          message: `REST ingest: T_max = ${tMax}°C exceeds 51°C threshold.`,
          metadata: { tMax, tPack, source: "api" },
        });
        recordAlert(bpan, "thermal_anomaly");
      }
      res.status(201).json({ success: true, bpan, thermalAnomaly });
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  api.get("/batteries/:bpan/soh", async (req, res) => {
    try {
      const prediction = await getLatestSohPrediction(req.params.bpan);
      if (!prediction) return res.status(404).json({ error: "not_found", message: "No SOH prediction found" });
      res.json(prediction);
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  api.get("/batteries/:bpan/warranty", async (req, res) => {
    try {
      const records = await getWarrantyByBpan(req.params.bpan);
      const enriched = records.map(r => ({ ...r, ...computeWarrantyStatus(r) }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  // ─── WARRANTY ───────────────────────────────────────────────────────────
  api.get("/warranty/lookup", async (req, res) => {
    try {
      const { channel, value } = req.query;
      if (!channel || !value) return res.status(400).json({ error: "bad_request", message: "channel and value are required" });
      const lookupParams: Record<string, string> = {};
      lookupParams[channel as string] = value as string;
      const results = await lookupWarranty(lookupParams);
      const enriched = results.map(r => ({ ...r, ...computeWarrantyStatus(r) }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  api.get("/warranty/stats", async (_req, res) => {
    try {
      const stats = await getWarrantyStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  // ─── MARKETPLACE ────────────────────────────────────────────────────────
  api.get("/marketplace", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const result = await listMarketplace({
        offset: page * limit, limit,
        listingType: req.query.listingType as string,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  api.get("/marketplace/stats", async (_req, res) => {
    try {
      const stats = await getMarketplaceStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  // ─── COMPLIANCE ─────────────────────────────────────────────────────────
  api.get("/compliance/epr", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const tokens = await listEprTokens({ limit });
      res.json(tokens);
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  api.get("/compliance/epr/stats", async (_req, res) => {
    try {
      const stats = await getEprStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  // ─── ANALYTICS ──────────────────────────────────────────────────────────
  api.get("/stats/batteries", async (_req, res) => {
    try {
      const stats = await getBatteryStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  });

  return api;
}
