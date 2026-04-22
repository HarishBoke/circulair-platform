/**
 * mcpServer.ts — Model Context Protocol (MCP) Server
 * 
 * Provides a standardized MCP-compatible interface for AI agents to interact
 * with the Circul-AI-r platform. Implements the MCP tool specification format
 * so agents (Claude, GPT, Gemini, etc.) can discover and invoke platform capabilities.
 * 
 * Exposed via REST at /api/mcp/* for HTTP-based MCP transport.
 * 
 * MCP Spec: https://modelcontextprotocol.io/
 */
import { Router, Request, Response } from "express";
import {
  getBatteryByBpan, listBatteries, getLatestTelemetry, getTelemetryHistory,
  getLatestSohPrediction, listMarketplace, getMarketplaceStats,
  listEprTokens, getEprStats, getBatteryStats, getPlatformKpis,
} from "./db";
import {
  lookupWarranty, listWarrantyRecords, getWarrantyStats, computeWarrantyStatus, getWarrantyByBpan,
} from "./db-warranty";
import { logAgentAction, getAgentActionStats, getRecentActivity } from "./db-agent";
import { writeAuditLog, generateTraceId, getAuditStats, getSecurityStats, validateApiKey, writeSecurityEvent, logApiUsage } from "./compliance";
import { NextFunction } from "express";

// ─── TOOL → REQUIRED SCOPE MAP ──────────────────────────────────────────────
// Maps each MCP tool name to the API key scope required to invoke it.
// Tools not in this map are public (discovery only).
const TOOL_SCOPE_MAP: Record<string, string> = {
  // Battery registry
  get_battery: "bpan_validate",
  list_batteries: "bpan_validate",
  get_battery_stats: "bpan_validate",
  // Telemetry
  get_telemetry: "telemetry_read",
  get_telemetry_history: "telemetry_read",
  // SOH prediction
  get_soh_prediction: "soh_predict",
  // Warranty
  check_warranty: "bpan_validate",
  lookup_warranty: "bpan_validate",
  get_warranty_stats: "compliance_report",
  // Marketplace
  list_marketplace: "marketplace_read",
  get_marketplace_stats: "marketplace_read",
  // Compliance
  get_epr_stats: "compliance_report",
  list_epr_tokens: "compliance_report",
  // Analytics
  get_platform_kpis: "compliance_report",
  get_audit_stats: "compliance_report",
  get_security_stats: "compliance_report",
  // Agent ops
  log_agent_action: "telemetry_read",
  get_agent_activity: "compliance_report",
};

// ─── MCP AUTH MIDDLEWARE ─────────────────────────────────────────────────────
/**
 * Validates Bearer API key on every /api/mcp request.
 * - GET /api/mcp, /api/mcp/tools, /api/mcp/resources, /api/mcp/prompts, /api/mcp/manifest
 *   are unauthenticated (discovery endpoints).
 * - POST /api/mcp (JSON-RPC) and POST /api/mcp/invoke require a valid cai_… key.
 * - tools/call additionally checks that the key has the required scope for the tool.
 */
async function mcpAuth(req: Request, res: Response, next: NextFunction) {
  // Allow GET discovery endpoints without auth
  if (req.method === "GET") return next();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      jsonrpc: "2.0",
      id: (req.body as any)?.id ?? null,
      error: {
        code: -32001,
        message: "Unauthorized: Missing or invalid Authorization header. Use: Bearer <api_key>",
        data: { docs: "/api-reference", mcpDocs: "/mcp-server" },
      },
    });
  }

  const key = authHeader.substring(7);
  const apiKey = await validateApiKey(key);

  if (!apiKey) {
    await writeSecurityEvent({
      eventType: "permission_denied",
      severity: "medium",
      description: `Invalid API key attempt on MCP endpoint from ${req.ip}`,
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers["user-agent"],
    });
    return res.status(401).json({
      jsonrpc: "2.0",
      id: (req.body as any)?.id ?? null,
      error: { code: -32001, message: "Unauthorized: Invalid or expired API key" },
    });
  }

  // Attach resolved key to request for downstream scope checks
  (req as any).mcpApiKey = apiKey;
  next();
}

// ─── MCP TOOL DEFINITIONS ───────────────────────────────────────────────────
// Each tool follows the MCP specification format with name, description,
// inputSchema (JSON Schema), and handler function.

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any) => Promise<any>;
}

const mcpTools: McpTool[] = [
  // ─── BATTERY REGISTRY ─────────────────────────────────────────────────
  {
    name: "get_battery",
    description: "Retrieve detailed information about a battery using its BPAN (Battery Passport Aadhaar Number). Returns manufacturer, chemistry, capacity, current SOH, status, and lifecycle data.",
    inputSchema: {
      type: "object",
      properties: {
        bpan: { type: "string", description: "Battery Passport Aadhaar Number (21 characters)" },
      },
      required: ["bpan"],
    },
    handler: async (args) => {
      const battery = await getBatteryByBpan(args.bpan);
      if (!battery) return { error: "Battery not found", bpan: args.bpan };
      return battery;
    },
  },
  {
    name: "list_batteries",
    description: "List registered batteries with optional filtering by status, chemistry, and search term. Returns paginated results.",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Search by BPAN, manufacturer, or model" },
        status: { type: "string", enum: ["operational", "second_life", "end_of_life", "in_transit", "recycling"], description: "Filter by battery status" },
        chemistry: { type: "string", enum: ["NMC", "LFP", "NCA", "LCO", "LMO", "LMFP", "Na-ion", "Solid-state"], description: "Filter by battery chemistry" },
        limit: { type: "number", description: "Max results (default 20, max 100)" },
        offset: { type: "number", description: "Pagination offset" },
      },
    },
    handler: async (args) => {
      return listBatteries({
        search: args.search,
        status: args.status,
        chemistry: args.chemistry,
        limit: Math.min(args.limit ?? 20, 100),
        offset: args.offset ?? 0,
      });
    },
  },
  {
    name: "get_battery_stats",
    description: "Get fleet-wide battery statistics including total count, chemistry distribution, status breakdown, and average SOH.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => getBatteryStats(),
  },

  // ─── TELEMETRY ────────────────────────────────────────────────────────
  {
    name: "get_telemetry",
    description: "Get the latest telemetry reading for a battery. Returns voltage, current, temperature, SOC, cycle count, and internal resistance.",
    inputSchema: {
      type: "object",
      properties: {
        bpan: { type: "string", description: "Battery BPAN" },
      },
      required: ["bpan"],
    },
    handler: async (args) => {
      const latest = await getLatestTelemetry(args.bpan);
      if (!latest) return { error: "No telemetry data found", bpan: args.bpan };
      return latest;
    },
  },
  {
    name: "get_telemetry_history",
    description: "Get historical telemetry data for a battery. Returns time-series data for voltage, current, temperature, SOC, and cycle count.",
    inputSchema: {
      type: "object",
      properties: {
        bpan: { type: "string", description: "Battery BPAN" },
      },
      required: ["bpan"],
    },
    handler: async (args) => {
      const history = await getTelemetryHistory(args.bpan);
      return { bpan: args.bpan, readings: history, count: history.length };
    },
  },

  // ─── SOH PREDICTION ───────────────────────────────────────────────────
  {
    name: "get_soh_prediction",
    description: "Get the latest AI-powered State of Health (SOH) prediction for a battery. Returns predicted SOH percentage, remaining useful life (RUL) in cycles, confidence interval, and triage recommendation.",
    inputSchema: {
      type: "object",
      properties: {
        bpan: { type: "string", description: "Battery BPAN" },
      },
      required: ["bpan"],
    },
    handler: async (args) => {
      const prediction = await getLatestSohPrediction(args.bpan);
      if (!prediction) return { error: "No SOH prediction found", bpan: args.bpan };
      return prediction;
    },
  },

  // ─── WARRANTY ─────────────────────────────────────────────────────────
  {
    name: "check_warranty",
    description: "Check warranty status for a battery. Returns warranty records with computed status (active/expired/voided/claimed), days remaining, and coverage details.",
    inputSchema: {
      type: "object",
      properties: {
        bpan: { type: "string", description: "Battery BPAN" },
      },
      required: ["bpan"],
    },
    handler: async (args) => {
      const records = await getWarrantyByBpan(args.bpan);
      return records.map(r => ({ ...r, ...computeWarrantyStatus(r) }));
    },
  },
  {
    name: "lookup_warranty",
    description: "Multi-channel warranty lookup. Search by BPAN, serial number, phone, email, or WhatsApp number.",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", enum: ["bpan", "serialNumber", "phone", "email", "whatsApp"], description: "Lookup channel" },
        value: { type: "string", description: "Search value" },
      },
      required: ["channel", "value"],
    },
    handler: async (args) => {
      const params: Record<string, string> = {};
      params[args.channel] = args.value;
      const results = await lookupWarranty(params);
      return results.map(r => ({ ...r, ...computeWarrantyStatus(r) }));
    },
  },
  {
    name: "get_warranty_stats",
    description: "Get warranty statistics including total registrations, active/expired/claimed counts, and coverage distribution.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => getWarrantyStats(),
  },

  // ─── MARKETPLACE ──────────────────────────────────────────────────────
  {
    name: "list_marketplace",
    description: "List second-life battery marketplace listings. Filter by listing type and status.",
    inputSchema: {
      type: "object",
      properties: {
        listingType: { type: "string", enum: ["second_life", "recycling", "refurbished"], description: "Listing type filter" },
        limit: { type: "number", description: "Max results" },
        offset: { type: "number", description: "Pagination offset" },
      },
    },
    handler: async (args) => {
      return listMarketplace({
        listingType: args.listingType,
        limit: Math.min(args.limit ?? 20, 100),
        offset: args.offset ?? 0,
      });
    },
  },
  {
    name: "get_marketplace_stats",
    description: "Get marketplace statistics including total listings, volume, and pricing data.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => getMarketplaceStats(),
  },

  // ─── COMPLIANCE ───────────────────────────────────────────────────────
  {
    name: "get_epr_stats",
    description: "Get Extended Producer Responsibility (EPR) compliance statistics including total tokens, recycled weight, and compliance rate.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => getEprStats(),
  },
  {
    name: "list_epr_tokens",
    description: "List EPR compliance tokens with recycling verification data.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results" },
      },
    },
    handler: async (args) => listEprTokens({ limit: args.limit ?? 20 }),
  },

  // ─── ANALYTICS ────────────────────────────────────────────────────────
  {
    name: "get_platform_kpis",
    description: "Get platform-wide KPIs including total batteries, active users, marketplace volume, compliance rate, and fleet health metrics.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => getPlatformKpis(),
  },
  {
    name: "get_audit_stats",
    description: "Get audit log statistics for compliance monitoring. Returns total entries, last 24h/7d counts, and breakdown by status and data classification.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => getAuditStats(),
  },
  {
    name: "get_security_stats",
    description: "Get security event statistics. Returns total events, last 24h count, and breakdown by severity and event type.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => getSecurityStats(),
  },

  // ─── AGENT OPERATIONS ─────────────────────────────────────────────────
  {
    name: "log_agent_action",
    description: "Log an action performed by an AI agent for audit trail and tracking purposes.",
    inputSchema: {
      type: "object",
      properties: {
        actionType: { type: "string", description: "Type of action (e.g., battery_check, warranty_lookup, triage_decision)" },
        module: { type: "string", description: "Platform module (e.g., bpan, warranty, marketplace)" },
        description: { type: "string", description: "Human-readable description of the action" },
        inputData: { type: "object", description: "Input parameters for the action" },
        outputData: { type: "object", description: "Output/result of the action" },
        status: { type: "string", enum: ["success", "failure", "pending"], description: "Action status" },
      },
      required: ["actionType", "module", "description"],
    },
    handler: async (args) => {
      return logAgentAction({
        action: args.actionType,
        module: args.module as any,
        description: args.description,
        inputParams: args.inputData,
        outputResult: args.outputData,
        status: args.status ?? "success",
        actorType: "agent",
        actorId: 0,
      });
    },
  },
  {
    name: "get_agent_activity",
    description: "Get recent agent activity log for monitoring and debugging.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
    handler: async (args) => getRecentActivity(args.limit ?? 20),
  },
];

// ─── MCP PROTOCOL HANDLERS ──────────────────────────────────────────────────

/** List all available tools (MCP tools/list) */
function handleToolsList() {
  return {
    tools: mcpTools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
}

/** Call a specific tool (MCP tools/call) */
async function handleToolsCall(toolName: string, args: any) {
  const tool = mcpTools.find(t => t.name === toolName);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: "text", text: `Tool '${toolName}' not found. Use tools/list to see available tools.` }],
    };
  }

  try {
    const result = await tool.handler(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error executing '${toolName}': ${err.message}` }],
    };
  }
}

/** List available resources (MCP resources/list) */
function handleResourcesList() {
  return {
    resources: [
      {
        uri: "circulair://batteries",
        name: "Battery Registry",
        description: "All registered batteries with BPAN, status, and lifecycle data",
        mimeType: "application/json",
      },
      {
        uri: "circulair://warranties",
        name: "Warranty Records",
        description: "All warranty registrations with status and customer data",
        mimeType: "application/json",
      },
      {
        uri: "circulair://marketplace",
        name: "Marketplace Listings",
        description: "Second-life battery marketplace listings",
        mimeType: "application/json",
      },
      {
        uri: "circulair://compliance/epr",
        name: "EPR Compliance",
        description: "Extended Producer Responsibility compliance tokens",
        mimeType: "application/json",
      },
      {
        uri: "circulair://analytics/kpis",
        name: "Platform KPIs",
        description: "Platform-wide key performance indicators",
        mimeType: "application/json",
      },
    ],
  };
}

/** Read a specific resource (MCP resources/read) */
async function handleResourcesRead(uri: string) {
  const resourceHandlers: Record<string, () => Promise<any>> = {
    "circulair://batteries": () => listBatteries({ limit: 100, offset: 0 }),
    "circulair://warranties": () => listWarrantyRecords({ limit: 100 }),
    "circulair://marketplace": () => listMarketplace({ limit: 100, offset: 0 }),
    "circulair://compliance/epr": () => listEprTokens({ limit: 100 }),
    "circulair://analytics/kpis": () => getPlatformKpis(),
  };

  const handler = resourceHandlers[uri];
  if (!handler) {
    return { error: `Resource '${uri}' not found` };
  }

  const data = await handler();
  return {
    contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }],
  };
}

/** List available prompts (MCP prompts/list) */
function handlePromptsList() {
  return {
    prompts: [
      {
        name: "battery_health_report",
        description: "Generate a comprehensive health report for a specific battery",
        arguments: [
          { name: "bpan", description: "Battery BPAN", required: true },
        ],
      },
      {
        name: "fleet_overview",
        description: "Generate an overview of the entire battery fleet with key metrics and insights",
        arguments: [],
      },
      {
        name: "warranty_analysis",
        description: "Analyze warranty data and provide insights on claim patterns and coverage",
        arguments: [],
      },
      {
        name: "compliance_summary",
        description: "Generate a compliance summary covering EPR, data classification, and audit status",
        arguments: [],
      },
    ],
  };
}

/** Get a specific prompt (MCP prompts/get) */
async function handlePromptsGet(name: string, args: Record<string, string>) {
  const promptHandlers: Record<string, (args: Record<string, string>) => Promise<any>> = {
    battery_health_report: async (a) => {
      const battery = await getBatteryByBpan(a.bpan);
      const telemetry = await getLatestTelemetry(a.bpan);
      const soh = await getLatestSohPrediction(a.bpan);
      const warranty = await getWarrantyByBpan(a.bpan);
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Generate a comprehensive health report for battery ${a.bpan}.\n\nBattery Data: ${JSON.stringify(battery)}\nLatest Telemetry: ${JSON.stringify(telemetry)}\nSOH Prediction: ${JSON.stringify(soh)}\nWarranty: ${JSON.stringify(warranty?.map(w => ({ ...w, ...computeWarrantyStatus(w) })))}\n\nInclude: current health assessment, risk factors, recommended actions, warranty implications, and lifecycle stage recommendation.`,
          },
        }],
      };
    },
    fleet_overview: async () => {
      const [stats, kpis, warrantyStats] = await Promise.all([
        getBatteryStats(),
        getPlatformKpis(),
        getWarrantyStats(),
      ]);
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Generate a fleet overview report.\n\nBattery Stats: ${JSON.stringify(stats)}\nPlatform KPIs: ${JSON.stringify(kpis)}\nWarranty Stats: ${JSON.stringify(warrantyStats)}\n\nInclude: fleet health summary, chemistry distribution analysis, lifecycle stage breakdown, warranty coverage analysis, and actionable recommendations.`,
          },
        }],
      };
    },
    warranty_analysis: async () => {
      const stats = await getWarrantyStats();
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Analyze warranty data and provide insights.\n\nWarranty Stats: ${JSON.stringify(stats)}\n\nInclude: coverage rate analysis, claim patterns, expiry forecasting, customer contact channel distribution, and recommendations for warranty program optimization.`,
          },
        }],
      };
    },
    compliance_summary: async () => {
      const [eprStats, auditStats, secStats] = await Promise.all([
        getEprStats(),
        getAuditStats(),
        getSecurityStats(),
      ]);
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Generate a compliance summary report.\n\nEPR Stats: ${JSON.stringify(eprStats)}\nAudit Stats: ${JSON.stringify(auditStats)}\nSecurity Stats: ${JSON.stringify(secStats)}\n\nInclude: EPR compliance status, audit trail health, security posture assessment, ISO 27001 / SOC 2 readiness indicators, and remediation recommendations.`,
          },
        }],
      };
    },
  };

  const handler = promptHandlers[name];
  if (!handler) return { error: `Prompt '${name}' not found` };
  return handler(args);
}

// ─── EXPRESS ROUTER ─────────────────────────────────────────────────────────
export function createMcpRouter(): Router {
  const mcp = Router();

  // Apply auth middleware to all routes in this router
  mcp.use(mcpAuth);

  // MCP Server Info
  mcp.get("/", (_req, res) => {
    res.json({
      name: "circulair-platform",
      version: "1.0.0",
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
        prompts: { listChanged: false },
      },
      serverInfo: {
        name: "Circul-AI-r Battery Intelligence Platform",
        version: "1.0.0",
        description: "MCP server for AI-powered battery lifecycle management, warranty verification, compliance tracking, and second-life marketplace operations.",
      },
    });
  });

  // MCP JSON-RPC endpoint (single endpoint for all MCP operations)
  mcp.post("/", async (req: Request, res: Response) => {
    const { method, params, id } = req.body;
    const traceId = generateTraceId();

    try {
      let result: any;

      switch (method) {
        case "initialize":
          result = {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: {
              name: "Circul-AI-r Battery Intelligence Platform",
              version: "1.0.0",
            },
          };
          break;

        case "tools/list":
          result = handleToolsList();
          break;

        case "tools/call": {
          // Scope check: verify the API key has the required scope for this tool
          const toolName = params?.name as string;
          const requiredScope = TOOL_SCOPE_MAP[toolName];
          const apiKey = (req as any).mcpApiKey;
          if (requiredScope && apiKey) {
            const scopes: string[] = Array.isArray(apiKey.scopes) ? apiKey.scopes : [];
            if (!scopes.includes(requiredScope)) {
              res.json({
                jsonrpc: "2.0", id,
                error: {
                  code: -32003,
                  message: `Forbidden: tool '${toolName}' requires scope '${requiredScope}'. Your key has: [${scopes.join(", ")}]`,
                  data: { requiredScope, yourScopes: scopes, docs: "/api-reference" },
                },
              });
              return;
            }
          }
          result = await handleToolsCall(toolName, params?.arguments ?? {});
          // Log the tool call for audit
          writeAuditLog({
            traceId,
            actorType: "agent",
            action: `mcp.tools.call.${toolName}`,
            module: "mcp",
            inputSummary: params?.arguments,
            status: result.isError ? "error" : "success",
          });
          // Log API usage for rate limiting tracking
          if (apiKey) {
            logApiUsage({
              apiKeyId: apiKey.id,
              endpoint: `/api/mcp (tools/call:${toolName})`,
              method: "POST",
              statusCode: result.isError ? 400 : 200,
              durationMs: 0,
              ipAddress: req.ip ?? undefined,
            });
          }
          break;
        }

        case "resources/list":
          result = handleResourcesList();
          break;

        case "resources/read":
          result = await handleResourcesRead(params?.uri);
          break;

        case "prompts/list":
          result = handlePromptsList();
          break;

        case "prompts/get":
          result = await handlePromptsGet(params?.name, params?.arguments ?? {});
          break;

        case "ping":
          result = {};
          break;

        default:
          res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method '${method}' not found` } });
          return;
      }

      res.json({ jsonrpc: "2.0", id, result });
    } catch (err: any) {
      res.json({ jsonrpc: "2.0", id, error: { code: -32603, message: err.message } });
    }
  });

  // Convenience REST endpoints for tool discovery
  mcp.get("/tools", (_req, res) => res.json(handleToolsList()));
  mcp.get("/resources", (_req, res) => res.json(handleResourcesList()));
  mcp.get("/prompts", (_req, res) => res.json(handlePromptsList()));

  /**
   * GET /api/mcp/manifest — Returns the full tool manifest in a developer-friendly format.
   * Compatible with the MCP client configuration page and SDK auto-discovery.
   */
  mcp.get("/manifest", (_req, res) => {
    res.json({
      name: "Circul-AI-r Battery Intelligence",
      version: "1.0.0",
      description: "AI-powered battery lifecycle intelligence platform — SOH prediction, digital twin, triage, carbon accounting, and fleet analytics.",
      mcpEndpoint: "/api/mcp",
      tools: mcpTools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
      resources: handleResourcesList().resources,
      prompts: handlePromptsList().prompts,
    });
  });

  /**
   * POST /api/mcp/invoke — REST convenience wrapper around tools/call.
   * Body: { tool: string, arguments: Record<string, any> }
   * Returns: { result: any, tool: string, executedAt: string }
   */
  mcp.post("/invoke", async (req: Request, res: Response) => {
    const { tool, arguments: args } = req.body ?? {};
    if (!tool) {
      return res.status(400).json({ error: "Missing required field: tool" });
    }
    const result = await handleToolsCall(tool, args ?? {});
    if (result.isError) {
      return res.status(400).json({ error: result.content?.[0]?.text ?? "Tool execution failed", tool });
    }
    let parsed: any = result.content?.[0]?.text;
    try { parsed = JSON.parse(parsed); } catch { /* not JSON, return raw */ }
    return res.json({ result: parsed, tool, executedAt: new Date().toISOString() });
  });

  return mcp;
}
