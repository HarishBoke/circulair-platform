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

const BASE_URL = "https://approved-host.example.invalid/api/v1";

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
    summary: "Review SOH Estimate",
    description: "Historical estimate contract example, not a verified enabled endpoint. Current SOH outputs are uncalibrated deterministic heuristics; confidence metadata is not measured accuracy or approval for safety, second-life or recycling.",
    scope: "predict:soh",
    category: "AI & SOH",
    body: [
      { name: "bpan", type: "string", required: true, description: "Local battery identifier (not official enrollment)", example: "IND-A3F-2024A01-00001" },
      { name: "chemistry", type: "string", required: false, description: "Battery chemistry override (NMC, LFP, NCA, LTO)", example: "NMC" },
      { name: "cycleCount", type: "integer", required: false, description: "Override cycle count for prediction", example: "450" },
    ],
    responseExample: `{
  "documentationOnly": true,
  "availability": "unverified",
  "note": "No request was made. Confirm the enabled contract with the owner; unavailable paths may return HTTP 503."
}`,
  },
  {
    id: "soh_history",
    method: "GET",
    path: "/soh/{bpan}/history",
    summary: "Get SOH History",
    description: "Historical SOH record example. Estimates must not be described as measured capacity; verify provenance, timestamps and the enabled owner-scoped contract.",
    scope: "predict:soh",
    category: "AI & SOH",
    params: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN identifier", example: "IND-A3F-2024A01-00001" },
      { name: "limit", type: "integer", required: false, description: "Max records to return (default 50, max 500)", example: "100" },
    ],
    responseExample: `{
  "documentationOnly": true,
  "availability": "unverified",
  "note": "No request was made. Confirm the enabled contract with the owner; unavailable paths may return HTTP 503."
}`,
  },
  // BPAN
  {
    id: "bpan_validate",
    method: "GET",
    path: "/bpan/validate/{bpan}",
    summary: "Validate BPAN",
    description: "Historical local identifier lookup example. A registration or format match is not official BPAN enrollment, government acceptance or verified physical condition.",
    scope: "read:bpan",
    category: "Battery Registry",
    params: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN to validate", example: "IND-A3F-2024A01-00001" },
    ],
    responseExample: `{
  "documentationOnly": true,
  "availability": "unverified",
  "note": "No request was made. Confirm the enabled contract with the owner; unavailable paths may return HTTP 503."
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
  "documentationOnly": true,
  "availability": "unverified",
  "note": "No request was made. Confirm the enabled contract with the owner; unavailable paths may return HTTP 503."
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
  "documentationOnly": true,
  "availability": "unverified",
  "note": "No request was made. Confirm the enabled contract with the owner; unavailable paths may return HTTP 503."
}`,
  },
  {
    id: "telemetry_stream",
    method: "GET",
    path: "/telemetry/{bpan}/stream",
    summary: "Stream Telemetry (SSE)",
    description: "Historical streaming contract example. A stream URL does not prove an implemented, authorized stream or a working physical gateway; confirm the current enabled interface.",
    scope: "read:telemetry",
    category: "Telemetry",
    params: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN identifier", example: "IND-A3F-2024A01-00001" },
    ],
    responseExample: `{
  "documentationOnly": true,
  "availability": "unverified",
  "note": "No request was made. Confirm the enabled contract with the owner; unavailable paths may return HTTP 503."
}`,
  },
  // Carbon
  {
    id: "carbon_calculate",
    method: "POST",
    path: "/carbon/calculate",
    summary: "Calculate Carbon Footprint",
    description: "Historical lifecycle emissions estimate example. Inputs, units, factors and boundary need qualified review; no approved carbon declaration or regulatory methodology conformity is established.",
    scope: "read:carbon",
    category: "Carbon & Compliance",
    body: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN identifier", example: "IND-A3F-2024A01-00001" },
      { name: "gridRegion", type: "string", required: false, description: "Grid region for use-phase calculation (IN, EU, US)", example: "IN" },
    ],
    responseExample: `{
  "documentationOnly": true,
  "availability": "unverified",
  "note": "No request was made. Confirm the enabled contract with the owner; unavailable paths may return HTTP 503."
}`,
  },
  // Digital Twin
  {
    id: "digital_twin_generate",
    method: "POST",
    path: "/digital-twin/generate",
    summary: "Generate Digital Twin Forecast",
    description: "Historical physics simulation example. Numerical forecasts are uncalibrated and assumption-dependent, not validated service-life guarantees.",
    scope: "read:digital-twin",
    category: "Digital Twin",
    body: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN identifier", example: "IND-A3F-2024A01-00001" },
      { name: "forecastHorizonDays", type: "integer", required: false, description: "Forecast horizon in days (default 365)", example: "365" },
    ],
    responseExample: `{
  "documentationOnly": true,
  "availability": "unverified",
  "note": "No request was made. Confirm the enabled contract with the owner; unavailable paths may return HTTP 503."
}`,
  },
  // Triage
  {
    id: "triage_evaluate",
    method: "POST",
    path: "/triage/evaluate",
    summary: "Evaluate Triage Route",
    description: "Historical candidate-label example only. No optimal route, autonomous approval, carrier dispatch, safety determination or second-life/recycling qualification is established.",
    scope: "read:telemetry",
    category: "Triage Review",
    body: [
      { name: "bpan", type: "string", required: true, description: "Battery BPAN identifier", example: "IND-A3F-2024A01-00001" },
    ],
    responseExample: `{
  "documentationOnly": true,
  "availability": "unverified",
  "note": "No request was made. Confirm the enabled contract with the owner; unavailable paths may return HTTP 503."
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
  "Triage Review": Bot,
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
  const apiKeyId = useId();

  const allParams = [...(ep.params || []), ...(ep.body || [])];

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
              API Key placeholder (reference snippets only)
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

          <div className="space-y-2">
            <Button size="sm" disabled={true}>Requests unavailable</Button>
            <p className="text-xs text-muted-foreground">No request is sent. These historical examples are reference-only and use a non-routable placeholder host.</p>
          </div>
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
    <div className="max-w-6xl mx-auto py-2">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 border-b border-border/40 pb-5 mb-6">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0" aria-hidden="true">
          <BookOpen className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">API Reference</h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">v1.0</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Historical API catalogue for development review — availability unverified
            {" · "}<span className="font-mono text-xs text-emerald-400/80">{BASE_URL}</span>
          </p>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="flex gap-6">
        {/* Sticky sidebar */}
        <aside className="hidden lg:flex flex-col gap-1 w-48 shrink-0">
          <div className="sticky top-4 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Categories</p>
            {["All", ...CATEGORIES].map((cat) => {
              const Icon = cat !== "All" ? (CATEGORY_ICONS[cat] || BookOpen) : BookOpen;
              const count = cat === "All" ? ENDPOINTS.length : ENDPOINTS.filter(e => e.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={activeCategory === cat}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                    activeCategory === cat
                      ? "bg-emerald-500/15 text-emerald-400 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{cat}</span>
                  <span className="text-[10px] text-muted-foreground/60">{count}</span>
                </button>
              );
            })}
            <div className="h-px bg-border/30 my-2" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Resources</p>
            <a href="/developer-portal" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              Developer Portal
            </a>
            <button
              onClick={() => window.open("/api/v1/docs", "_blank")}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-left"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              Swagger UI
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">
          <p role="note" className="text-sm text-amber-300">Static examples are not the current API contract or execution receipts. Confirm authentication, endpoint scopes and ownership with the enabled source. Legacy hardware ingestion is blocked with HTTP 503; payments and private document publishing are disabled. Execution and training are gated unavailable. The new local pilot is in development and not deployed; no new route is advertised as ready.</p>
          {/* Auth + Rate limit info bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Authentication</span>
                </div>
                <code className="text-xs font-mono text-foreground">Authorization: Bearer cai_…</code>
                <p className="text-[11px] text-muted-foreground mt-1">Review enabled key contracts in <a href="/developer-portal" className="text-emerald-400 underline underline-offset-2">Developer Portal</a></p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wide">Rate Limits</span>
                </div>
                <p className="text-xs text-amber-300/90">Configured limits vary by endpoint and key</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">In-process limits are not an availability or security guarantee</p>
              </CardContent>
            </Card>
          </div>

          {/* Search + mobile category filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
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
            <div className="flex gap-2 flex-wrap lg:hidden" role="group" aria-label="Filter by category">
              {["All", ...CATEGORIES].map((cat) => {
                const Icon = cat !== "All" ? (CATEGORY_ICONS[cat] || BookOpen) : BookOpen;
                return (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? "default" : "outline"}
                    size="sm"
                    className={`h-8 text-xs ${activeCategory === cat ? "bg-emerald-600 hover:bg-emerald-700 text-foreground" : ""}`}
                    onClick={() => setActiveCategory(cat)}
                    aria-pressed={activeCategory === cat}
                  >
                    <Icon className="w-3 h-3 mr-1" aria-hidden="true" />
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
                      <CatIcon className="w-4 h-4 text-emerald-400/60" aria-hidden="true" />
                      <h2
                        id={`cat-${cat.replace(/\s+/g, "-")}`}
                        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        {cat}
                      </h2>
                      <div className="flex-1 h-px bg-border/30" aria-hidden="true" />
                      <span className="text-[10px] text-muted-foreground/50">{catEndpoints.length} endpoint{catEndpoints.length !== 1 ? "s" : ""}</span>
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

          {/* Swagger UI + OpenAPI downloads */}
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Interactive Swagger UI
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">REST API v1</p>
                    <p className="text-xs text-muted-foreground">Bearer token auth — batteries, telemetry, warranty, marketplace, compliance</p>
                  </div>
                  <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 shrink-0" onClick={() => window.open("/api/v1/docs", "_blank")}>
                    Open Swagger UI
                  </Button>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      tRPC API — Source Interfaces
                      <Badge className="ml-2 text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Contract review required</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">Session authentication; scope/ownership and feature gates apply</p>
                  </div>
                  <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 shrink-0" onClick={() => window.open("/api/trpc/docs", "_blank")}>
                    Open Swagger UI
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-4 pb-3">
              <p className="text-sm font-medium text-foreground mb-2">Download OpenAPI Specs</p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => window.open("/api/v1/openapi.json", "_blank")}>
                  REST API openapi.json
                </Button>
                <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => window.open("/api/trpc/openapi.json", "_blank")}>
                  tRPC API openapi.json
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Documentation links are not verified downloads or deployment evidence; review enabled contracts before generating clients</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
