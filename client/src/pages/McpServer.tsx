import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Cpu, Copy, CheckCircle2, Code2, Zap, Battery, Activity,
  ShieldCheck, Bot, Globe, Key, BookOpen, ArrowRight, ExternalLink,
  Network, Terminal, Layers,
} from "lucide-react";

// ─── MCP TOOL MANIFEST ───────────────────────────────────────────────────────

const MCP_TOOLS = [
  {
    name: "predict_soh",
    description: "Predict the State of Health (SOH) for a registered battery using AI/ML models. Returns SOH percentage, remaining useful life, degradation breakdown, and maintenance recommendations.",
    scope: "predict:soh",
    inputSchema: {
      type: "object",
      properties: {
        bpan: { type: "string", description: "Battery Pack Alphanumeric Number" },
        chemistry: { type: "string", description: "Battery chemistry (NMC, LFP, NCA, LTO)", enum: ["NMC", "LFP", "NCA", "LTO"] },
      },
      required: ["bpan"],
    },
    outputSummary: "{ soh: number, rulDays: number, healthStatus: string, recommendations: string[] }",
    icon: Zap,
    color: "text-violet-400",
  },
  {
    name: "validate_bpan",
    description: "Validate a Battery Pack Alphanumeric Number and retrieve its registration details including chemistry, capacity, manufacturer, and current lifecycle status.",
    scope: "read:bpan",
    inputSchema: {
      type: "object",
      properties: {
        bpan: { type: "string", description: "Battery BPAN to validate" },
      },
      required: ["bpan"],
    },
    outputSummary: "{ valid: boolean, chemistry: string, nominalCapacityKwh: number, lifecycleStatus: string }",
    icon: Battery,
    color: "text-emerald-400",
  },
  {
    name: "get_telemetry",
    description: "Retrieve the latest telemetry snapshot for a battery including voltage, current, temperature, state of charge, and cycle count.",
    scope: "read:telemetry",
    inputSchema: {
      type: "object",
      properties: {
        bpan: { type: "string", description: "Battery BPAN identifier" },
      },
      required: ["bpan"],
    },
    outputSummary: "{ voltage: number, current: number, temperature: number, soc: number, cycleCount: number }",
    icon: Activity,
    color: "text-cyan-400",
  },
  {
    name: "calculate_carbon",
    description: "Calculate the lifecycle carbon footprint for a battery. Returns total CO₂e in kg with breakdown by manufacturing, use-phase, and end-of-life stages.",
    scope: "read:carbon",
    inputSchema: {
      type: "object",
      properties: {
        bpan: { type: "string", description: "Battery BPAN identifier" },
        gridRegion: { type: "string", description: "Grid region for use-phase calculation", enum: ["IN", "EU", "US", "CN"] },
      },
      required: ["bpan"],
    },
    outputSummary: "{ totalCo2eKg: number, breakdown: { manufacturing, usePhase, endOfLife } }",
    icon: ShieldCheck,
    color: "text-green-400",
  },
  {
    name: "generate_digital_twin",
    description: "Generate a physics-informed digital twin forecast for a battery using Arrhenius + Wöhler simulation. Returns multi-scenario SOH trajectory over a configurable horizon.",
    scope: "read:digital-twin",
    inputSchema: {
      type: "object",
      properties: {
        bpan: { type: "string", description: "Battery BPAN identifier" },
        forecastHorizonDays: { type: "integer", description: "Forecast horizon in days (default 365)", minimum: 30, maximum: 1825 },
      },
      required: ["bpan"],
    },
    outputSummary: "{ currentSoh: number, rulDaysNominal: number, scenarios: { nominal, conservative, aggressive } }",
    icon: Cpu,
    color: "text-violet-400",
  },
  {
    name: "evaluate_triage",
    description: "Run an AI triage evaluation to determine the optimal end-of-life route for a battery: reuse, repurpose, recycle, or dispose. Returns route recommendation with confidence score.",
    scope: "read:telemetry",
    inputSchema: {
      type: "object",
      properties: {
        bpan: { type: "string", description: "Battery BPAN identifier" },
      },
      required: ["bpan"],
    },
    outputSummary: "{ recommendedPath: string, confidence: number, reasoning: string }",
    icon: Bot,
    color: "text-orange-400",
  },
  {
    name: "list_batteries",
    description: "List registered batteries with optional filtering by chemistry, lifecycle status, and SOH range. Supports pagination.",
    scope: "read:bpan",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Number of results (default 20, max 100)" },
        chemistry: { type: "string", description: "Filter by chemistry" },
        status: { type: "string", description: "Filter by lifecycle status" },
      },
      required: [],
    },
    outputSummary: "{ items: Battery[], total: number }",
    icon: Battery,
    color: "text-emerald-400",
  },
];

// ─── CONFIG SNIPPETS ──────────────────────────────────────────────────────────

const MCP_SERVER_URL = "https://circulair.energy/api/mcp";

const CLAUDE_CONFIG = (apiKey: string) => JSON.stringify({
  mcpServers: {
    "circulair": {
      command: "npx",
      args: ["-y", "@circulair/mcp-client"],
      env: {
        CIRCULAIR_API_KEY: apiKey || "cai_your_key_here",
        CIRCULAIR_MCP_URL: MCP_SERVER_URL,
      },
    },
  },
}, null, 2);

const CURSOR_CONFIG = (apiKey: string) => JSON.stringify({
  mcp: {
    servers: {
      circulair: {
        url: MCP_SERVER_URL,
        headers: {
          Authorization: `Bearer ${apiKey || "cai_your_key_here"}`,
        },
      },
    },
  },
}, null, 2);

const WINDSURF_CONFIG = (apiKey: string) => JSON.stringify({
  mcpServers: {
    circulair: {
      serverUrl: MCP_SERVER_URL,
      authToken: apiKey || "cai_your_key_here",
    },
  },
}, null, 2);

const VSCODE_CONFIG = (apiKey: string) => JSON.stringify({
  "github.copilot.chat.mcp.servers": {
    circulair: {
      url: MCP_SERVER_URL,
      headers: {
        Authorization: `Bearer ${apiKey || "cai_your_key_here"}`,
      },
    },
  },
}, null, 2);

const HTTP_INVOKE_EXAMPLE = `POST ${MCP_SERVER_URL}/invoke
Authorization: Bearer cai_your_key_here
Content-Type: application/json

{
  "tool": "predict_soh",
  "arguments": {
    "bpan": "IND-A3F-2024A01-00001",
    "chemistry": "NMC"
  }
}

// Response:
{
  "result": {
    "soh": 87.4,
    "rulDays": 412,
    "healthStatus": "healthy",
    "recommendations": ["Reduce peak charge rate to 0.5C"]
  },
  "tool": "predict_soh",
  "executedAt": "2026-04-22T08:00:00Z"
}`;

const MANIFEST_EXAMPLE = `GET ${MCP_SERVER_URL}/manifest
Authorization: Bearer cai_your_key_here

// Response:
{
  "name": "Circul-AI-r Battery Intelligence",
  "version": "1.0.0",
  "description": "AI-powered battery lifecycle intelligence platform",
  "tools": [
    {
      "name": "predict_soh",
      "description": "Predict battery State of Health using AI",
      "inputSchema": { ... }
    },
    ...
  ]
}`;

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative">
      <pre
        className="text-xs font-mono bg-background/80 p-4 rounded-lg overflow-x-auto text-foreground leading-relaxed"
        tabIndex={0}
        aria-label={label}
      >
        {code}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 opacity-60 hover:opacity-100"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await copyText(code);
            toast.success("Copied to clipboard");
          } catch {
            toast.error("Copy failed");
          }
        }}
      >
        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function McpServer() {
  usePageTitle("MCP Server");
  const [apiKey, setApiKey] = useState("");
  const [activeClient, setActiveClient] = useState("claude");

  const clientConfigs: Record<string, { label: string; config: string; file: string; instructions: string }> = {
    claude: {
      label: "Claude Desktop",
      file: "~/Library/Application Support/Claude/claude_desktop_config.json",
      config: CLAUDE_CONFIG(apiKey),
      instructions: "Open Claude Desktop → Settings → Developer → Edit Config. Paste the JSON below into the mcpServers section, then restart Claude.",
    },
    cursor: {
      label: "Cursor",
      file: "~/.cursor/mcp.json",
      config: CURSOR_CONFIG(apiKey),
      instructions: "Open Cursor → Settings → MCP Servers (or create ~/.cursor/mcp.json). Paste the JSON below, then reload the window.",
    },
    windsurf: {
      label: "Windsurf",
      file: "~/.codeium/windsurf/mcp_config.json",
      config: WINDSURF_CONFIG(apiKey),
      instructions: "Open Windsurf → Settings → MCP. Paste the JSON below into the mcpServers section, then reload.",
    },
    vscode: {
      label: "VS Code + Copilot",
      file: ".vscode/settings.json",
      config: VSCODE_CONFIG(apiKey),
      instructions: "Add the JSON below to your VS Code settings.json (workspace or user). Requires GitHub Copilot Chat extension with MCP support.",
    },
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-violet-500/10 shrink-0" aria-hidden="true">
          <Network className="w-6 h-6 text-violet-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">MCP Server</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect AI clients (Claude, Cursor, Windsurf, VS Code) to the Circul-AI-r Battery Intelligence platform via the Model Context Protocol
          </p>
        </div>
        <Badge variant="outline" className="border-violet-500/30 text-violet-400 bg-violet-500/10 shrink-0">
          MCP 1.0
        </Badge>
      </div>

      {/* What is MCP */}
      <Card className="border-violet-500/20 bg-violet-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" aria-hidden="true" />
            What is MCP?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The <strong className="text-foreground">Model Context Protocol (MCP)</strong> is an open standard that lets AI assistants like Claude, Cursor, and Windsurf call external tools and data sources in a structured, type-safe way. By connecting your AI client to the Circul-AI-r MCP server, you can ask natural-language questions like:
          </p>
          <ul className="space-y-1.5" aria-label="Example MCP queries">
            {[
              "\"What is the SOH of battery IND-A3F-2024A01-00001?\"",
              "\"Generate a 12-month digital twin forecast for my fleet's lowest-SOH battery.\"",
              "\"Which batteries in my fleet should be triaged for recycling this quarter?\"",
              "\"Calculate the carbon footprint of all NMC batteries registered in 2024.\"",
            ].map((q) => (
              <li key={q} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="italic">{q}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            The AI client sends structured tool calls to the Circul-AI-r MCP server, which executes them against the live platform and returns typed results — no custom code required.
          </p>
        </CardContent>
      </Card>

      {/* Architecture diagram (ASCII) */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre
            className="text-xs font-mono text-muted-foreground leading-relaxed overflow-x-auto"
            aria-label="MCP architecture diagram"
            tabIndex={0}
          >
{`┌─────────────────────┐     MCP Protocol      ┌──────────────────────────┐
│   AI Client          │ ─────────────────────► │  Circul-AI-r MCP Server  │
│  (Claude / Cursor /  │                        │  POST /api/mcp/invoke    │
│   Windsurf / VSCode) │ ◄───────────────────── │  GET  /api/mcp/manifest  │
└─────────────────────┘     JSON tool results   └──────────┬───────────────┘
                                                            │
                                                            ▼
                                               ┌────────────────────────┐
                                               │  Platform Services     │
                                               │  ├─ AI SOH Engine      │
                                               │  ├─ Digital Twin       │
                                               │  ├─ Battery Registry   │
                                               │  ├─ Telemetry Stream   │
                                               │  ├─ Carbon Calculator  │
                                               │  └─ Triage Engine      │
                                               └────────────────────────┘`}
          </pre>
        </CardContent>
      </Card>

      {/* Quick Setup */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" aria-hidden="true" />
            Quick Setup
          </CardTitle>
          <CardDescription>
            Paste your API key below to auto-fill all configuration snippets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="password"
              placeholder="cai_your_api_key_here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 max-w-sm h-9 px-3 text-sm font-mono rounded-md border border-border/50 bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              aria-label="Your API key for MCP configuration"
            />
            <Button
              variant="outline"
              size="sm"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => window.open("/developer-portal", "_blank")}
            >
              <Key className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Get API Key
              <ExternalLink className="w-3 h-3 ml-1.5" aria-hidden="true" />
            </Button>
          </div>
          <ol className="space-y-2" aria-label="Setup steps">
            {[
              { step: "1", text: "Issue an API key in the Developer Portal with the required scopes", href: "/developer-portal" },
              { step: "2", text: "Paste the key above to auto-fill the config snippets below" },
              { step: "3", text: "Choose your AI client tab and follow the instructions" },
              { step: "4", text: "Restart your AI client and start asking battery intelligence questions" },
            ].map(({ step, text, href }) => (
              <li key={step} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                  {step}
                </span>
                {href ? (
                  <span>
                    {text.split("Developer Portal")[0]}
                    <a href={href} className="text-violet-400 underline underline-offset-2">Developer Portal</a>
                    {text.split("Developer Portal")[1]}
                  </span>
                ) : (
                  <span>{text}</span>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Client config tabs */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code2 className="w-4 h-4 text-violet-400" aria-hidden="true" />
            Client Configuration
          </CardTitle>
          <CardDescription>
            Select your AI client and paste the generated config
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeClient} onValueChange={setActiveClient}>
            <TabsList className="h-9 mb-4">
              <TabsTrigger value="claude" className="text-xs">Claude Desktop</TabsTrigger>
              <TabsTrigger value="cursor" className="text-xs">Cursor</TabsTrigger>
              <TabsTrigger value="windsurf" className="text-xs">Windsurf</TabsTrigger>
              <TabsTrigger value="vscode" className="text-xs">VS Code</TabsTrigger>
            </TabsList>
            {Object.entries(clientConfigs).map(([key, cfg]) => (
              <TabsContent key={key} value={key} className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                  <p className="text-sm text-muted-foreground">{cfg.instructions}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 font-mono opacity-70">
                    Config file: <code>{cfg.file}</code>
                  </p>
                </div>
                <CodeBlock code={cfg.config} label={`${cfg.label} MCP configuration`} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* HTTP Invoke API */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            Direct HTTP Invocation
          </CardTitle>
          <CardDescription>
            Call MCP tools directly via HTTP — useful for server-to-server integrations and custom clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CodeBlock code={HTTP_INVOKE_EXAMPLE} label="HTTP MCP tool invocation example" />
          <CodeBlock code={MANIFEST_EXAMPLE} label="MCP manifest endpoint example" />
        </CardContent>
      </Card>

      {/* Tool Manifest Table */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            Available Tools
          </CardTitle>
          <CardDescription>
            {MCP_TOOLS.length} tools available — each tool requires the corresponding API key scope
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="MCP tool manifest">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2 pr-4">Tool</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2 pr-4">Description</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2 pr-4">Required Scope</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2">Output Shape</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {MCP_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <tr key={tool.name} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${tool.color} shrink-0`} aria-hidden="true" />
                          <code className="text-xs font-mono text-foreground">{tool.name}</code>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground max-w-xs">{tool.description}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs border-border/50 font-mono">
                          {tool.scope}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <code className="text-xs font-mono text-muted-foreground">{tool.outputSummary}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Example prompts */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-4 h-4 text-orange-400" aria-hidden="true" />
            Example Prompts
          </CardTitle>
          <CardDescription>
            Try these natural-language queries in your connected AI client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { prompt: "What is the current SOH of battery IND-A3F-2024A01-00001?", tool: "predict_soh" },
              { prompt: "Is BPAN IND-A3F-2024A01-00001 a valid registered battery?", tool: "validate_bpan" },
              { prompt: "Show me the latest telemetry for battery IND-A3F-2024A01-00001", tool: "get_telemetry" },
              { prompt: "Generate a 12-month SOH forecast for battery IND-A3F-2024A01-00001", tool: "generate_digital_twin" },
              { prompt: "What is the carbon footprint of battery IND-A3F-2024A01-00001 in the Indian grid?", tool: "calculate_carbon" },
              { prompt: "Should battery IND-A3F-2024A01-00001 be recycled or repurposed?", tool: "evaluate_triage" },
              { prompt: "List all NMC batteries currently in use", tool: "list_batteries" },
              { prompt: "Which batteries in my fleet have SOH below 70%?", tool: "list_batteries" },
            ].map(({ prompt, tool }) => (
              <div
                key={prompt}
                className="p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors"
              >
                <p className="text-sm text-foreground italic mb-1.5">"{prompt}"</p>
                <Badge variant="outline" className="text-xs border-border/50 font-mono">
                  → {tool}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next steps */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-2">Ready to connect?</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => window.open("/developer-portal", "_self")}
                >
                  <Key className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  Issue API Key
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => window.open("/api-reference", "_self")}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  API Reference
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border/50 text-muted-foreground hover:bg-muted/20"
                  onClick={() => window.open("/getting-started", "_self")}
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  Getting Started Guide
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
