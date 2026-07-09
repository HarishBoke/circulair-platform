import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BookOpen, Key, Zap, Globe, Bot, Plug, Code2, Terminal,
  ChevronRight, Copy, CheckCircle2, ArrowRight, Shield,
  Layers, Activity, FileText, Network, Webhook, Lock,
  ExternalLink, AlertTriangle, Info,
} from "lucide-react";

// ─── QUICK-START CODE SAMPLES ────────────────────────────────────────────────

const QUICKSTART_SAMPLES = {
  curl: `# 1. Get your API key from the Developer Portal
# 2. Replace <YOUR_API_KEY> below

# List your batteries
curl -H "Authorization: Bearer <YOUR_API_KEY>" \\
  https://circulair.energy/api/v1/batteries

# Get SOH prediction
curl -H "Authorization: Bearer <YOUR_API_KEY>" \\
  https://circulair.energy/api/v1/batteries/INAB12FABCD1234567AB/soh

# Push telemetry reading (requires telemetry:write scope)
curl -X POST \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"vPack":48.2,"iPack":12.5,"tPack":31.0,"cycleCount":142}' \\
  https://circulair.energy/api/v1/batteries/INAB12FABCD1234567AB/telemetry`,

  python: `import requests

API_KEY = "<YOUR_API_KEY>"
BASE_URL = "https://circulair.energy/api/v1"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# List batteries
resp = requests.get(f"{BASE_URL}/batteries", headers=HEADERS)
batteries = resp.json()
print(f"Found {batteries['total']} batteries")

# Get SOH prediction for a specific battery
bpan = "INAB12FABCD1234567AB"
soh = requests.get(f"{BASE_URL}/batteries/{bpan}/soh", headers=HEADERS).json()
print(f"SOH: {soh['soh']}% | RUL: {soh['rulDays']} days")

# Push telemetry (requires telemetry:write scope)
payload = {"vPack": 48.2, "iPack": 12.5, "tPack": 31.0, "cycleCount": 142}
r = requests.post(
    f"{BASE_URL}/batteries/{bpan}/telemetry",
    json=payload, headers=HEADERS
)
print("Telemetry ingested:", r.json())`,

  node: `const API_KEY = "<YOUR_API_KEY>";
const BASE = "https://circulair.energy/api/v1";
const headers = { Authorization: \`Bearer \${API_KEY}\` };

// List batteries
const { batteries, total } = await fetch(\`\${BASE}/batteries\`, { headers })
  .then(r => r.json());
console.log(\`Found \${total} batteries\`);

// Get SOH prediction
const bpan = "INAB12FABCD1234567AB";
const { soh, rulDays } = await fetch(\`\${BASE}/batteries/\${bpan}/soh\`, { headers })
  .then(r => r.json());
console.log(\`SOH: \${soh}% | RUL: \${rulDays} days\`);

// Push telemetry (requires telemetry:write scope)
await fetch(\`\${BASE}/batteries/\${bpan}/telemetry\`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ vPack: 48.2, iPack: 12.5, tPack: 31.0, cycleCount: 142 }),
});`,

  mqtt: `# Connect to the Circul-AI-r MQTT broker
# Broker: mqtts://sd1218f1.ala.asia-southeast1.emqxsl.com:8883
# Topic pattern: CAI_/<BPAN>

import paho.mqtt.client as mqtt
import json, ssl

client = mqtt.Client()
client.username_pw_set("<MQTT_USER>", "<MQTT_PASS>")
client.tls_set(cert_reqs=ssl.CERT_REQUIRED)

def on_connect(client, userdata, flags, rc):
    print("Connected, subscribing...")
    client.subscribe("CAI_/INAB12FABCD1234567AB")

def on_message(client, userdata, msg):
    data = json.loads(msg.payload)
    print(f"vPack={data['vPack']}V  tPack={data['tPack']}°C  SOH={data.get('sohEstimate','?')}%")

client.on_connect = on_connect
client.on_message = on_message
client.connect("sd1218f1.ala.asia-southeast1.emqxsl.com", 8883)
client.loop_forever()`,
};

// ─── RESOURCE CARDS ──────────────────────────────────────────────────────────

const RESOURCES = [
  {
    icon: BookOpen,
    label: "API Reference",
    href: "/api-reference",
    color: "#00c589",
    badge: "18 endpoints",
    description: "Full REST API v1 reference with live try-it-out, request/response schemas, and code samples in curl, Python, and Node.js.",
    tags: ["REST", "Bearer Token", "OpenAPI 3.1"],
  },
  {
    icon: Globe,
    href: "/api/v1/docs",
    label: "Swagger UI — REST v1",
    color: "#3b82f6",
    badge: "Interactive",
    description: "Interactive Swagger UI for the REST API v1. Paste your API key and execute live requests directly from the browser.",
    tags: ["Swagger", "Try It Out", "OpenAPI"],
    external: true,
  },
  {
    icon: Layers,
    href: "/api/trpc/docs",
    label: "Swagger UI — tRPC",
    color: "#8b5cf6",
    badge: "130+ endpoints",
    description: "Full tRPC procedure reference rendered as OpenAPI. Covers all 188 procedures across 30+ routers. Session-cookie authenticated.",
    tags: ["tRPC", "Session Auth", "Full Reference"],
    external: true,
  },
  {
    icon: Bot,
    href: "/mcp-server",
    label: "MCP Server",
    color: "#f59e0b",
    badge: "17 tools",
    description: "Model Context Protocol server for AI agent integration. Connect Claude Desktop, Cursor, or Windsurf for natural-language battery intelligence.",
    tags: ["MCP", "AI Agents", "Claude", "Cursor"],
  },
  {
    icon: Key,
    href: "/developer-portal",
    label: "Developer Portal",
    color: "#ec4899",
    badge: "API Keys",
    description: "Create and manage API keys with granular scope control. Monitor usage, set rate limits, and configure webhook subscriptions.",
    tags: ["API Keys", "Scopes", "Webhooks"],
  },
  {
    icon: Network,
    href: "/gateway-docs",
    label: "IoT Gateway Docs",
    color: "#14b8a6",
    badge: "ESP32 · RPi",
    description: "Hardware integration guides for ESP32 CAN gateways, Raspberry Pi BMS bridges, Python scripts, and legacy lead-acid adapters.",
    tags: ["MQTT", "ESP32", "Raspberry Pi", "CAN Bus"],
  },
  {
    icon: Activity,
    href: "/data-integration",
    label: "Data Integration Hub",
    color: "#f97316",
    badge: "5 channels",
    description: "Configure MQTT, REST API, CSV import, webhooks, and SDK integrations. Test connections and monitor data flow in real time.",
    tags: ["MQTT", "REST", "CSV", "Webhooks"],
  },
  {
    icon: FileText,
    href: "/wiki?category=integration",
    label: "Integration Guides",
    color: "#06b6d4",
    badge: "CirculWiki",
    description: "In-depth articles on REST API, MCP integration, MQTT data pipeline, webhook patterns, and the Write API Scope Strategy.",
    tags: ["Guides", "Best Practices", "WhatsApp"],
  },
];

// ─── SCOPE TABLE ─────────────────────────────────────────────────────────────

const SCOPES = [
  { id: "soh_predict",       label: "SOH Prediction",     type: "read",       desc: "Run AI health predictions" },
  { id: "bpan_validate",     label: "BPAN Validation",    type: "read",       desc: "Validate and decode BPANs" },
  { id: "telemetry_read",    label: "Telemetry Read",      type: "read",       desc: "Read telemetry history" },
  { id: "marketplace_read",  label: "Marketplace Read",    type: "read",       desc: "Browse listings and stats" },
  { id: "compliance_report", label: "Compliance Reports",  type: "read",       desc: "Access EPR and audit data" },
  { id: "carbon_report",     label: "Carbon Footprint",    type: "read",       desc: "Carbon declarations and scores" },
  { id: "digital_twin",      label: "Digital Twin",        type: "read",       desc: "Digital twin state and history" },
  { id: "telemetry:write",   label: "Telemetry Ingest",    type: "write",      desc: "Push telemetry readings" },
  { id: "battery:write",     label: "Battery Registry",    type: "write",      desc: "Register and update batteries" },
  { id: "warranty:write",    label: "Warranty Write",      type: "write",      desc: "Register warranty and claims" },
  { id: "marketplace:write", label: "Marketplace Write",   type: "write",      desc: "Create and manage listings" },
  { id: "alert:write",       label: "Alert Write",         type: "write",      desc: "Create and manage alerts" },
  { id: "assistant:query",   label: "AI Assistant",        type: "write",      desc: "Natural-language queries" },
  { id: "webhook:manage",    label: "Webhook Management",  type: "write",      desc: "Register webhook endpoints" },
  { id: "compliance:write",  label: "Compliance Write",    type: "enterprise", desc: "Issue EPR tokens" },
  { id: "admin:user_write",  label: "Admin User Write",    type: "enterprise", desc: "Manage user roles (admin only)" },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function DeveloperHub() {
  usePageTitle("Developer Hub — Circul-AI-r");
  const [activeTab, setActiveTab] = useState<"curl" | "python" | "node" | "mqtt">("curl");
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── HERO ── */}
      <div className="border-b border-border bg-gradient-to-br from-[#07100a] via-[#0a1a0f] to-[#07100a]">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#00c589]/20 border border-[#00c589]/30 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-[#00c589]" />
            </div>
            <span className="text-xs font-mono text-[#00c589]/70 tracking-widest uppercase">Developer Hub</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
            Build on Circul-AI-r
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mb-8 leading-relaxed">
            REST API, MCP server, MQTT broker, and tRPC procedures — everything you need to integrate battery intelligence into your applications, workflows, and AI agents.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/developer-portal">
              <Button className="bg-[#00c589] hover:bg-[#00c589]/90 text-[#07100a] font-semibold gap-2">
                <Key className="w-4 h-4" />
                Get API Key
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="/api/v1/docs" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2 border-border">
                <Globe className="w-4 h-4" />
                Open Swagger UI
                <ExternalLink className="w-3 h-3 opacity-60" />
              </Button>
            </a>
            <Link href="/api-reference">
              <Button variant="outline" className="gap-2 border-border">
                <BookOpen className="w-4 h-4" />
                API Reference
              </Button>
            </Link>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-border/50">
            {[
              { label: "REST Endpoints", value: "18" },
              { label: "tRPC Procedures", value: "188" },
              { label: "MCP Tools", value: "17" },
              { label: "API Scopes", value: "16" },
              { label: "Auth Methods", value: "3" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-2xl font-bold text-[#00c589]">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">

        {/* ── QUICK START ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-5 h-5 text-[#00c589]" />
            <h2 className="text-xl font-bold text-foreground">Quick Start</h2>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-border bg-muted/30">
              {(["curl", "python", "node", "mqtt"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-sm font-mono transition-colors ${
                    activeTab === tab
                      ? "text-[#00c589] border-b-2 border-[#00c589] bg-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "node" ? "Node.js" : tab === "mqtt" ? "MQTT (Python)" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => handleCopy(QUICKSTART_SAMPLES[activeTab])}
                className="flex items-center gap-1.5 px-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#00c589]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            {/* Code block */}
            <div className="bg-[#060d08] p-6 overflow-x-auto">
              <pre className="text-sm font-mono text-emerald-300 leading-relaxed whitespace-pre">
                {QUICKSTART_SAMPLES[activeTab]}
              </pre>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Replace <code className="bg-muted px-1.5 py-0.5 rounded text-[0.8em] font-mono text-emerald-300">&lt;YOUR_API_KEY&gt;</code> with a key from the{" "}
            <Link href="/developer-portal" className="text-[#00c589] hover:underline">Developer Portal</Link>.
          </p>
        </section>

        {/* ── RESOURCE CARDS ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Plug className="w-5 h-5 text-[#00c589]" />
            <h2 className="text-xl font-bold text-foreground">Developer Resources</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RESOURCES.map((r) => {
              const Icon = r.icon;
              const content = (
                <div
                  className="group h-full rounded-xl border border-border bg-card hover:border-[#00c589]/40 hover:bg-[#00c589]/[0.03] transition-all duration-200 p-5 flex flex-col gap-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${r.color}18`, border: `1px solid ${r.color}30` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: r.color }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {r.badge}
                      </Badge>
                      {r.external && <ExternalLink className="w-3 h-3 text-muted-foreground/50" />}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm mb-1 flex items-center gap-1.5">
                      {r.label}
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-[#00c589] transition-colors" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                    {r.tags.map((t) => (
                      <span key={t} className="text-[10px] font-mono text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
              return r.external ? (
                <a key={r.href} href={r.href} target="_blank" rel="noopener noreferrer" className="h-full">
                  {content}
                </a>
              ) : (
                <Link key={r.href} href={r.href} className="h-full">
                  {content}
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── AUTH METHODS ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-[#00c589]" />
            <h2 className="text-xl font-bold text-foreground">Authentication</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Bearer Token (REST API)",
                color: "#00c589",
                icon: Key,
                desc: "Pass your API key in the Authorization header for all REST v1 calls. Keys are scoped — only the permissions you grant are active.",
                code: `Authorization: Bearer cai_live_xxxxxxxxxxxx`,
                badge: "Recommended",
              },
              {
                title: "Session Cookie (tRPC)",
                color: "#8b5cf6",
                icon: Shield,
                desc: "The tRPC API uses HttpOnly session cookies set by the OAuth login flow. Use this for server-side integrations that maintain a logged-in session.",
                code: `Cookie: session=<jwt_token>`,
                badge: "Server-side",
              },
              {
                title: "MCP Bearer Token",
                color: "#f59e0b",
                icon: Bot,
                desc: "The MCP server accepts the same API keys as the REST API. Pass it as a Bearer token in the Authorization header when connecting your AI client.",
                code: `Authorization: Bearer cai_live_xxxxxxxxxxxx`,
                badge: "AI Agents",
              },
            ].map(({ title, color, icon: Icon, desc, code, badge }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <span className="font-semibold text-sm text-foreground">{title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{badge}</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                <div className="bg-[#060d08] rounded-lg px-4 py-3 font-mono text-xs text-emerald-300 overflow-x-auto">
                  {code}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── API SCOPES ── */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-[#00c589]" />
            <h2 className="text-xl font-bold text-foreground">API Scopes</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Each API key carries a set of scopes that determine what it can access. Read scopes are available on all tiers; write scopes require Premium or Enterprise.{" "}
            <Link href="/wiki?article=write-api-scope-strategy" className="text-[#00c589] hover:underline">
              Read the full scope strategy →
            </Link>
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scope ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tier</th>
                </tr>
              </thead>
              <tbody>
                {SCOPES.map((s, i) => (
                  <tr key={s.id} className={`border-t border-border/50 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-2.5">
                      <code className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded">{s.id}</code>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-foreground/80 whitespace-nowrap">{s.label}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{s.desc}</td>
                    <td className="px-4 py-2.5">
                      {s.type === "read" && (
                        <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Standard</Badge>
                      )}
                      {s.type === "write" && (
                        <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">Premium</Badge>
                      )}
                      {s.type === "enterprise" && (
                        <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-400 border-red-500/20">Enterprise</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── RATE LIMITS ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-[#00c589]" />
            <h2 className="text-xl font-bold text-foreground">Rate Limits</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { tier: "Standard", color: "#00c589", rpm: "100", burst: "20", write: "—", scopes: "Read scopes only" },
              { tier: "Premium", color: "#f59e0b", rpm: "500", burst: "100", write: "200/min", scopes: "Read + write scopes" },
              { tier: "Enterprise", color: "#ec4899", rpm: "2,000", burst: "500", write: "1,000/min", scopes: "All scopes incl. compliance:write" },
            ].map(({ tier, color, rpm, burst, write, scopes }) => (
              <div key={tier} className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{tier}</span>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requests/min</span>
                    <span className="font-mono text-foreground">{rpm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Burst</span>
                    <span className="font-mono text-foreground">{burst}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Write ops/min</span>
                    <span className="font-mono text-foreground">{write}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">{scopes}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 border border-border">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
            Rate limit headers are returned on every response: <code className="font-mono text-emerald-300 mx-1">X-RateLimit-Limit</code>, <code className="font-mono text-emerald-300 mx-1">X-RateLimit-Remaining</code>, <code className="font-mono text-emerald-300">X-RateLimit-Reset</code>. On 429, retry after the <code className="font-mono text-emerald-300 mx-1">Retry-After</code> value (seconds).
          </div>
        </section>

        {/* ── WEBHOOKS ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Webhook className="w-5 h-5 text-[#00c589]" />
            <h2 className="text-xl font-bold text-foreground">Webhooks</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Register an HTTPS endpoint to receive push notifications for platform events. Webhooks eliminate polling and enable real-time integrations with WhatsApp bots, n8n workflows, and Make scenarios.
              </p>
              <div className="space-y-2">
                {[
                  { event: "soh.updated", desc: "SOH prediction recalculated for a battery" },
                  { event: "telemetry.anomaly", desc: "Thermal or voltage anomaly detected" },
                  { event: "alert.created", desc: "New alert raised on any battery" },
                  { event: "warranty.registered", desc: "New warranty record created" },
                  { event: "marketplace.offer", desc: "Offer placed on a listing" },
                  { event: "epr.token_issued", desc: "EPR token issued on yield verification" },
                ].map(({ event, desc }) => (
                  <div key={event} className="flex items-start gap-3 text-sm">
                    <code className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded whitespace-nowrap">{event}</code>
                    <span className="text-muted-foreground text-xs leading-relaxed pt-0.5">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/30 px-4 py-2.5 border-b border-border text-xs font-mono text-muted-foreground">
                Webhook payload example — soh.updated
              </div>
              <div className="bg-[#060d08] p-5 overflow-x-auto">
                <pre className="text-xs font-mono text-emerald-300 leading-relaxed">{`{
  "event": "soh.updated",
  "timestamp": "2026-07-09T08:00:00Z",
  "data": {
    "bpan": "INAB12FABCD1234567AB",
    "soh": 84.2,
    "rulDays": 312,
    "healthStatus": "fair",
    "triage": "module_repurposing"
  },
  "webhookId": 42,
  "deliveryId": "wh_01J2K..."
}`}</pre>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/developer-portal">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Webhook className="w-3.5 h-3.5" />
                Register a Webhook in Developer Portal
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* ── BASE URLS ── */}
        <section className="pb-8">
          <div className="flex items-center gap-3 mb-6">
            <Code2 className="w-5 h-5 text-[#00c589]" />
            <h2 className="text-xl font-bold text-foreground">Base URLs & Endpoints</h2>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interface</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base URL</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Auth</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Docs</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { iface: "REST API v1", url: "https://circulair.energy/api/v1", auth: "Bearer Token", docs: "/api/v1/docs" },
                  { iface: "tRPC API", url: "https://circulair.energy/api/trpc", auth: "Session Cookie", docs: "/api/trpc/docs" },
                  { iface: "MCP Server", url: "https://circulair.energy/api/mcp", auth: "Bearer Token", docs: "/mcp-server" },
                  { iface: "MQTT Broker", url: "mqtts://sd1218f1.ala.asia-southeast1.emqxsl.com:8883", auth: "Username/Password", docs: "/gateway-docs" },
                  { iface: "WebSocket", url: "wss://circulair.energy", auth: "Session Cookie", docs: "/data-integration" },
                ].map(({ iface, url, auth, docs }, i) => (
                  <tr key={iface} className={`border-t border-border/50 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3 font-medium text-foreground/80 whitespace-nowrap">{iface}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-emerald-300">{url}</code>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{auth}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <a href={docs} target={docs.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                        className="text-xs text-[#00c589] hover:underline flex items-center gap-1">
                        View docs <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
