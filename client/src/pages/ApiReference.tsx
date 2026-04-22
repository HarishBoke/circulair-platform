import { useState, useId } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  BookOpen, Copy, Play, ChevronDown, ChevronRight,
  Zap, Battery, Activity, BarChart3, ShieldCheck, ShoppingCart,
  Bot, Globe, Lock, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";

// ─── ENDPOINT CATALOGUE ──────────────────────────────────────────────────────

const BASE_URL = "https://circulair.energy/api/v1";

interface Param { name: string; type: string; required: boolean; description: string; example: string; }
interface Endpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  summary: string;
  description: string;
  scope: string;
  category: string;
  params?: Param[];
  body?: Param[];
  responseExample: string;
}

const ENDPOINTS: Endpoint[] = [
  // SOH
  {
    id: "soh_predict",
    method: "POST",
    path: "/soh/predict",
    summary: "Predict State of Health",
    description: "Run an AI-powered SOH prediction for a registered battery. Returns current SOH percentage, remaining useful life estimate, degradation breakdown, and maintenance recommendations.",
    scope: "predict:soh",
    category: "AI & SOH",
    body: [
      { name: "bpan", type: "string", required: true, description: "Battery Pack Alphanumeric Number", example: "IND-A3F-2024A01-00001" },
      { name: "chemistry", type: "string", required: false, description: "Battery chemistry override (NMC, LFP, NCA, LTO)", example: "NMC" },
      { name: "cycleCount", type: "integer", required: false, description: "Override cycle count for prediction", example: "450" },
    ],
    responseExample: `{
  "bpan": "IND-A3F-2024A01-00001",
  "soh": 87.4,
  "rulDays": 412,
  "healthStatus": "healthy",
  "degradationBreakdown": {
    "calendarAging": 3.2,
    "cyclicAging": 7.1,
    "temperatureStress": 2.3
  },
  "recommendations": [
    "Reduce peak charge rate to 0.5C to extend life",
    "Schedule capacity test within 60 days"
  ],
  "confidence": 0.94,
  "generatedAt": "2026-04-22T08:00:00Z"
}`,
  },
  {
    id: "soh_history",
    method: "GET",
    path: "/soh/{bpan}/history",
    summary: "Get SOH History",
    description: "Retrieve historical SOH measurements for a battery, ordered by timestamp descending. Useful for trend analysis and degradation rate calculation.",
    scope: "predict:soh",
    category: "AI & SOH",
    params: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN identifier", example: "IND-A3F-2024A01-00001" },
      { name: "limit", type: "integer", required: false, description: "Max records to return (default 50, max 500)", example: "100" },
    ],
    responseExample: `{
  "bpan": "IND-A3F-2024A01-00001",
  "history": [
    { "soh": 87.4, "measuredAt": "2026-04-22T08:00:00Z", "cycleCount": 450 },
    { "soh": 88.1, "measuredAt": "2026-03-15T10:00:00Z", "cycleCount": 420 }
  ],
  "total": 24
}`,
  },
  // BPAN
  {
    id: "bpan_validate",
    method: "GET",
    path: "/bpan/validate/{bpan}",
    summary: "Validate BPAN",
    description: "Validate a Battery Pack Alphanumeric Number and return its registration details, chemistry, capacity, manufacturer, and current lifecycle status.",
    scope: "read:bpan",
    category: "Battery Registry",
    params: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN to validate", example: "IND-A3F-2024A01-00001" },
    ],
    responseExample: `{
  "valid": true,
  "bpan": "IND-A3F-2024A01-00001",
  "chemistry": "NMC",
  "nominalCapacityKwh": 75.0,
  "manufacturer": "Tata AutoComp",
  "countryOfOrigin": "IN",
  "registeredAt": "2024-01-15T00:00:00Z",
  "lifecycleStatus": "in_use",
  "currentSoh": 87.4
}`,
  },
  {
    id: "bpan_list",
    method: "GET",
    path: "/bpan",
    summary: "List Batteries",
    description: "List all registered batteries accessible to the authenticated API key. Supports pagination, filtering by chemistry, status, and SOH range.",
    scope: "read:bpan",
    category: "Battery Registry",
    params: [
      { name: "limit", type: "integer", required: false, description: "Page size (default 20, max 100)", example: "20" },
      { name: "offset", type: "integer", required: false, description: "Pagination offset", example: "0" },
      { name: "chemistry", type: "string", required: false, description: "Filter by chemistry (NMC, LFP, NCA)", example: "NMC" },
      { name: "status", type: "string", required: false, description: "Filter by lifecycle status", example: "in_use" },
    ],
    responseExample: `{
  "items": [
    {
      "bpan": "IND-A3F-2024A01-00001",
      "chemistry": "NMC",
      "nominalCapacityKwh": 75.0,
      "currentSoh": 87.4,
      "lifecycleStatus": "in_use"
    }
  ],
  "total": 142,
  "limit": 20,
  "offset": 0
}`,
  },
  // Telemetry
  {
    id: "telemetry_latest",
    method: "GET",
    path: "/telemetry/{bpan}/latest",
    summary: "Get Latest Telemetry",
    description: "Retrieve the most recent telemetry snapshot for a battery including voltage, current, temperature, SOC, and cycle count.",
    scope: "read:telemetry",
    category: "Telemetry",
    params: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN identifier", example: "IND-A3F-2024A01-00001" },
    ],
    responseExample: `{
  "bpan": "IND-A3F-2024A01-00001",
  "voltage": 398.2,
  "current": -12.4,
  "temperature": 28.5,
  "soc": 74.3,
  "cycleCount": 450,
  "timestamp": "2026-04-22T08:00:00Z",
  "source": "mqtt"
}`,
  },
  {
    id: "telemetry_stream",
    method: "GET",
    path: "/telemetry/{bpan}/stream",
    summary: "Stream Telemetry (SSE)",
    description: "Subscribe to a real-time Server-Sent Events stream for a battery's telemetry. The connection stays open and pushes new readings as they arrive from the IoT gateway.",
    scope: "read:telemetry",
    category: "Telemetry",
    params: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN identifier", example: "IND-A3F-2024A01-00001" },
    ],
    responseExample: `data: {"voltage":398.2,"current":-12.4,"temperature":28.5,"soc":74.3,"timestamp":"2026-04-22T08:00:01Z"}

data: {"voltage":398.1,"current":-12.3,"temperature":28.6,"soc":74.2,"timestamp":"2026-04-22T08:00:06Z"}`,
  },
  // Carbon
  {
    id: "carbon_calculate",
    method: "POST",
    path: "/carbon/calculate",
    summary: "Calculate Carbon Footprint",
    description: "Calculate the lifecycle carbon footprint for a battery based on its chemistry, capacity, manufacturing region, and usage profile. Returns CO₂e in kg with breakdown by lifecycle stage.",
    scope: "read:carbon",
    category: "Carbon & Compliance",
    body: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN identifier", example: "IND-A3F-2024A01-00001" },
      { name: "gridRegion", type: "string", required: false, description: "Grid region for use-phase calculation (IN, EU, US)", example: "IN" },
    ],
    responseExample: `{
  "bpan": "IND-A3F-2024A01-00001",
  "totalCo2eKg": 4820.5,
  "breakdown": {
    "manufacturing": 3200.0,
    "usePhase": 1420.5,
    "endOfLife": 200.0
  },
  "gridRegion": "IN",
  "calculatedAt": "2026-04-22T08:00:00Z"
}`,
  },
  // Digital Twin
  {
    id: "digital_twin_generate",
    method: "POST",
    path: "/digital-twin/generate",
    summary: "Generate Digital Twin Forecast",
    description: "Run a physics-informed Arrhenius + Wöhler simulation to generate a multi-scenario SOH trajectory forecast for a battery over a configurable horizon.",
    scope: "read:digital-twin",
    category: "Digital Twin",
    body: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN identifier", example: "IND-A3F-2024A01-00001" },
      { name: "forecastHorizonDays", type: "integer", required: false, description: "Forecast horizon in days (default 365)", example: "365" },
    ],
    responseExample: `{
  "bpan": "IND-A3F-2024A01-00001",
  "currentSoh": 87.4,
  "healthStatus": "healthy",
  "rulDaysNominal": 412,
  "scenarios": {
    "nominal": [
      { "day": 30, "predictedSoh": 86.8 },
      { "day": 60, "predictedSoh": 86.2 }
    ],
    "conservative": [...],
    "aggressive": [...]
  }
}`,
  },
  // Triage
  {
    id: "triage_evaluate",
    method: "POST",
    path: "/triage/evaluate",
    summary: "Evaluate Triage Route",
    description: "Run an AI triage evaluation for a battery to determine the optimal end-of-life route: reuse, repurpose, recycle, or dispose. Returns route recommendation with confidence score and reasoning.",
    scope: "read:telemetry",
    category: "Autonomous Triage",
    body: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN identifier", example: "IND-A3F-2024A01-00001" },
    ],
    responseExample: `{
  "bpan": "IND-A3F-2024A01-00001",
  "recommendedPath": "repurpose",
  "confidence": 0.87,
  "reasoning": "SOH of 65% is below EV threshold but suitable for stationary storage. Cycle count within repurposing range.",
  "alternativeRoutes": ["recycle"],
  "evaluatedAt": "2026-04-22T08:00:00Z"
}`,
  },
];

const CATEGORIES = Array.from(new Set(ENDPOINTS.map((e) => e.category)));

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
  PATCH: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "AI & SOH": Brain,
  "Battery Registry": Battery,
  "Telemetry": Activity,
  "Carbon & Compliance": ShieldCheck,
  "Digital Twin": Zap,
  "Autonomous Triage": Bot,
  "Marketplace": ShoppingCart,
};

function Brain({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>;
}

function generateCurl(ep: Endpoint, apiKey: string, tryParams: Record<string, string>): string {
  const pathWithParams = ep.path.replace(/\{(\w+)\}/g, (_, k) => tryParams[k] || `{${k}}`);
  const url = `${BASE_URL}${pathWithParams}`;
  const queryParams = (ep.params || [])
    .filter((p) => !ep.path.includes(`{${p.name}}`))
    .filter((p) => tryParams[p.name])
    .map((p) => `${p.name}=${encodeURIComponent(tryParams[p.name])}`)
    .join("&");
  const fullUrl = queryParams ? `${url}?${queryParams}` : url;
  const bodyParams = ep.body || [];
  const bodyObj = Object.fromEntries(bodyParams.map((p) => [p.name, tryParams[p.name] || p.example]));
  const bodyStr = ep.method !== "GET" ? `\\\n  -d '${JSON.stringify(bodyObj, null, 2)}'` : "";
  return `curl -X ${ep.method} "${fullUrl}" \\
  -H "Authorization: Bearer ${apiKey || "cai_your_key_here"}" \\
  -H "Content-Type: application/json"${bodyStr ? " \\" : ""}${bodyStr}`;
}

function generateJS(ep: Endpoint, apiKey: string, tryParams: Record<string, string>): string {
  const pathWithParams = ep.path.replace(/\{(\w+)\}/g, (_, k) => tryParams[k] || `{${k}}`);
  const url = `${BASE_URL}${pathWithParams}`;
  const bodyParams = ep.body || [];
  const bodyObj = Object.fromEntries(bodyParams.map((p) => [p.name, tryParams[p.name] || p.example]));
  const bodyStr = ep.method !== "GET" ? `,\n  body: JSON.stringify(${JSON.stringify(bodyObj, null, 2)})` : "";
  return `const response = await fetch("${url}", {
  method: "${ep.method}",
  headers: {
    "Authorization": "Bearer ${apiKey || "cai_your_key_here"}",
    "Content-Type": "application/json",
  }${bodyStr}
});
const data = await response.json();
console.log(data);`;
}

function generatePython(ep: Endpoint, apiKey: string, tryParams: Record<string, string>): string {
  const pathWithParams = ep.path.replace(/\{(\w+)\}/g, (_, k) => tryParams[k] || `{${k}}`);
  const url = `${BASE_URL}${pathWithParams}`;
  const bodyParams = ep.body || [];
  const bodyObj = Object.fromEntries(bodyParams.map((p) => [p.name, tryParams[p.name] || p.example]));
  const bodyStr = ep.method !== "GET" ? `,\n    json=${JSON.stringify(bodyObj, null, 4)}` : "";
  return `import requests

response = requests.${ep.method.toLowerCase()}(
    "${url}",
    headers={
        "Authorization": "Bearer ${apiKey || "cai_your_key_here"}",
        "Content-Type": "application/json",
    }${bodyStr}
)
print(response.json())`;
}

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

// ─── ENDPOINT CARD ────────────────────────────────────────────────────────────

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("curl");
  const [apiKey, setApiKey] = useState("");
  const [tryParams, setTryParams] = useState<Record<string, string>>({});
  const [tryResult, setTryResult] = useState<{ status: number; body: string } | null>(null);
  const [trying, setTrying] = useState(false);
  const apiKeyId = useId();

  const allParams = [...(ep.params || []), ...(ep.body || [])];

  const handleTry = async () => {
    if (!apiKey.trim()) {
      toast.error("API key required", { description: "Enter your API key in the field above to try this endpoint." });
      return;
    }
    setTrying(true);
    setTryResult(null);
    try {
      const pathWithParams = ep.path.replace(/\{(\w+)\}/g, (_, k) => tryParams[k] || `:${k}`);
      const queryParams = (ep.params || [])
        .filter((p) => !ep.path.includes(`{${p.name}}`))
        .filter((p) => tryParams[p.name])
        .map((p) => `${p.name}=${encodeURIComponent(tryParams[p.name])}`)
        .join("&");
      const url = `/api/proxy/v1${pathWithParams}${queryParams ? `?${queryParams}` : ""}`;
      const bodyParams = ep.body || [];
      const bodyObj = Object.fromEntries(bodyParams.map((p) => [p.name, tryParams[p.name] || p.example]));
      const res = await fetch(url, {
        method: ep.method,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        ...(ep.method !== "GET" ? { body: JSON.stringify(bodyObj) } : {}),
      });
      const text = await res.text();
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch { /* not JSON */ }
      setTryResult({ status: res.status, body: pretty });
    } catch (err: any) {
      setTryResult({ status: 0, body: `Network error: ${err.message}` });
    } finally {
      setTrying(false);
    }
  };

  const curlCode = generateCurl(ep, apiKey, tryParams);
  const jsCode = generateJS(ep, apiKey, tryParams);
  const pythonCode = generatePython(ep, apiKey, tryParams);

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/30">
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`ep-${ep.id}-body`}
      >
        <Badge className={`font-mono text-xs border shrink-0 ${METHOD_COLORS[ep.method]}`}>
          {ep.method}
        </Badge>
        <code className="text-sm font-mono text-foreground flex-1 truncate">{ep.path}</code>
        <span className="text-sm text-muted-foreground hidden md:block flex-1">{ep.summary}</span>
        <Badge variant="outline" className="text-xs border-border/50 font-mono hidden sm:inline-flex">
          {ep.scope}
        </Badge>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        )}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div id={`ep-${ep.id}-body`} className="border-t border-border/30 p-4 space-y-5">
          <p className="text-sm text-muted-foreground">{ep.description}</p>

          {/* Parameters */}
          {allParams.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {ep.body ? "Request Body" : "Parameters"}
              </h4>
              <div className="space-y-2">
                {allParams.map((p) => (
                  <div key={p.name} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start p-2 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-foreground">{p.name}</code>
                      {p.required && (
                        <Badge variant="outline" className="text-xs border-red-500/30 text-red-400 py-0">required</Badge>
                      )}
                    </div>
                    <div>
                      <Badge variant="outline" className="text-xs border-border/50 font-mono">{p.type}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    </div>
                    <Input
                      placeholder={p.example}
                      value={tryParams[p.name] ?? ""}
                      onChange={(e) => setTryParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                      className="h-7 text-xs font-mono"
                      aria-label={`Value for parameter ${p.name}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Key for Try-It */}
          <div className="space-y-1.5">
            <Label htmlFor={apiKeyId} className="text-xs text-muted-foreground">
              API Key (for Try It)
            </Label>
            <Input
              id={apiKeyId}
              type="password"
              placeholder="cai_…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-8 text-xs font-mono max-w-sm"
            />
          </div>

          {/* Code tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-8">
              <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
              <TabsTrigger value="js" className="text-xs">JavaScript</TabsTrigger>
              <TabsTrigger value="python" className="text-xs">Python</TabsTrigger>
              <TabsTrigger value="response" className="text-xs">Response</TabsTrigger>
            </TabsList>
            {[
              { id: "curl", code: curlCode },
              { id: "js", code: jsCode },
              { id: "python", code: pythonCode },
              { id: "response", code: ep.responseExample },
            ].map(({ id, code }) => (
              <TabsContent key={id} value={id} className="mt-2">
                <div className="relative">
                  <pre
                    className="text-xs font-mono bg-background/80 p-4 rounded-lg overflow-x-auto text-foreground leading-relaxed"
                    tabIndex={0}
                    aria-label={`${id} code example for ${ep.summary}`}
                  >
                    {code}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-60 hover:opacity-100"
                    aria-label={`Copy ${id} code`}
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
              </TabsContent>
            ))}
          </Tabs>

          {/* Try It button */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleTry}
              disabled={trying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              aria-busy={trying}
            >
              {trying ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden="true" />Sending…</>
              ) : (
                <><Play className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />Try It</>
              )}
            </Button>
            {tryResult && (
              <div className="flex items-center gap-1.5">
                {tryResult.status >= 200 && tryResult.status < 300 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
                )}
                <span className={`text-xs font-mono ${tryResult.status >= 200 && tryResult.status < 300 ? "text-emerald-400" : "text-red-400"}`}>
                  {tryResult.status || "Error"}
                </span>
              </div>
            )}
          </div>

          {/* Try It response */}
          {tryResult && (
            <div aria-live="polite" aria-atomic="true">
              <pre className="text-xs font-mono bg-background/80 p-4 rounded-lg overflow-x-auto text-foreground max-h-64">
                {tryResult.body}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ApiReference() {
  usePageTitle("API Reference");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const searchId = useId();

  const filtered = ENDPOINTS.filter((ep) => {
    const matchCat = activeCategory === "All" || ep.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || ep.path.toLowerCase().includes(q) || ep.summary.toLowerCase().includes(q) || ep.scope.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0" aria-hidden="true">
          <BookOpen className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">API Reference</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Full REST API documentation for the Circul-AI-r Battery Intelligence Platform
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shrink-0">
          v1.0
        </Badge>
      </div>

      {/* Base URL + Auth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Base URL</span>
            </div>
            <code className="text-sm font-mono text-foreground">{BASE_URL}</code>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Authentication</span>
            </div>
            <code className="text-sm font-mono text-foreground">Authorization: Bearer cai_…</code>
            <p className="text-xs text-muted-foreground mt-1">Issue keys in <a href="/developer-portal" className="text-emerald-400 underline underline-offset-2">Developer Portal</a></p>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limits */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-amber-300">
            <strong>Rate limits:</strong> Default 100 req/min per API key. Exceeding the limit returns HTTP 429. Increase limits in the Developer Portal when creating or editing a key.
          </p>
        </CardContent>
      </Card>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor={searchId} className="sr-only">Search endpoints</Label>
          <Input
            id={searchId}
            placeholder="Search endpoints, paths, or scopes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
            aria-label="Search API endpoints"
          />
        </div>
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by category">
          {["All", ...CATEGORIES].map((cat) => {
            const Icon = cat !== "All" ? (CATEGORY_ICONS[cat] || BookOpen) : BookOpen;
            return (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                className={`h-9 text-xs ${activeCategory === cat ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                {cat}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Endpoint list */}
      <div aria-live="polite" aria-atomic="false">
        <p className="sr-only">{filtered.length} endpoint{filtered.length !== 1 ? "s" : ""} shown</p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" aria-hidden="true" />
          <p className="text-sm">No endpoints match your search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {CATEGORIES.filter((cat) => activeCategory === "All" || cat === activeCategory).map((cat) => {
            const catEndpoints = filtered.filter((ep) => ep.category === cat);
            if (catEndpoints.length === 0) return null;
            const CatIcon = CATEGORY_ICONS[cat] || BookOpen;
            return (
              <section key={cat} aria-labelledby={`cat-${cat.replace(/\s+/g, "-")}`}>
                <div className="flex items-center gap-2 mb-3 mt-4">
                  <CatIcon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <h2
                    id={`cat-${cat.replace(/\s+/g, "-")}`}
                    className="text-sm font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {cat}
                  </h2>
                  <div className="flex-1 h-px bg-border/30" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  {catEndpoints.map((ep) => (
                    <EndpointCard key={ep.id} ep={ep} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* OpenAPI download */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">OpenAPI 3.1 Specification</p>
            <p className="text-xs text-muted-foreground">Download the machine-readable spec to generate SDKs or import into Postman / Insomnia</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => window.open("/api/v1/openapi.json", "_blank")}
          >
            openapi.json
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
