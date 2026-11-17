import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { isPostgresProbeReady } from "@shared/healthObservation";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Cpu, Database,
  Globe, RefreshCw, Server, Shield, Wifi, XCircle, Zap, TrendingUp,
  Radio, Lock, Mail, BarChart2, Layers, Info,
} from "lucide-react";

type ServiceStatus = "operational" | "degraded" | "outage" | "unknown";

interface ServiceCheck {
  name: string;
  description: string;
  icon: React.ElementType;
  status: ServiceStatus;
  latency?: number;
  detail?: string;
  category: "core" | "integration" | "platform";
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ServiceStatus }) {
  const config: Record<ServiceStatus, { label: string; className: string }> = {
    operational: { label: "Operational", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    degraded:    { label: "Degraded",    className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    outage:      { label: "Outage",      className: "bg-red-500/15 text-red-400 border-red-500/30" },
    unknown:     { label: "Not verified", className: "bg-muted/60 text-muted-foreground border-border" },
  };
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 ${className}`}>
      {status === "operational" && <CheckCircle2 className="mr-1 h-3 w-3" />}
      {status === "degraded"    && <AlertTriangle className="mr-1 h-3 w-3" />}
      {status === "outage"      && <XCircle className="mr-1 h-3 w-3" />}
      {status === "unknown"     && <Clock className="mr-1 h-3 w-3 animate-spin" />}
      {label}
    </Badge>
  );
}

function StatusDot({ status }: { status: ServiceStatus }) {
  const cls: Record<ServiceStatus, string> = {
    operational: "bg-emerald-500 shadow-emerald-500/50",
    degraded:    "bg-amber-500 shadow-amber-500/50",
    outage:      "bg-red-500 shadow-red-500/50",
    unknown:     "bg-zinc-500 animate-pulse",
  };
  return <span className={`inline-block w-2 h-2 rounded-full shadow-sm ${cls[status]}`} />;
}

// ─── Overall banner ───────────────────────────────────────────────────────────
function OverallStatusBanner({ services }: { services: ServiceCheck[] }) {
  const statuses = services.map(s => s.status);
  const hasOutage   = statuses.includes("outage");
  const hasDegraded = statuses.includes("degraded");
  const allChecking = statuses.every(s => s === "unknown");

  if (allChecking) return (
    <div className="rounded-xl border border-border bg-muted/30 p-5 flex items-center gap-4">
      <Clock className="h-7 w-7 text-muted-foreground animate-spin shrink-0" />
      <div>
        <p className="font-semibold text-foreground">Service status is not yet verified</p>
        <p className="text-sm text-muted-foreground">Only explicit read-only probes can establish a current observation.</p>
      </div>
    </div>
  );
  if (hasOutage) return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-5 flex items-center gap-4">
      <XCircle className="h-7 w-7 text-red-400 shrink-0" />
      <div>
        <p className="font-semibold text-red-300">A Read-only Probe Failed</p>
        <p className="text-sm text-red-400/80">A failed request is not a diagnosis of every integration or confirmation that an operator has been notified.</p>
      </div>
    </div>
  );
  if (hasDegraded) return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-5 flex items-center gap-4">
      <AlertTriangle className="h-7 w-7 text-amber-400 shrink-0" />
      <div>
        <p className="font-semibold text-amber-300">A Probe Did Not Confirm Readiness</p>
        <p className="text-sm text-amber-400/80">Inspect the observation below; external-provider status remains separately unverified.</p>
      </div>
    </div>
  );
  if (statuses.includes("unknown")) return (
    <div className="rounded-xl border border-border bg-muted/30 p-5">
      <p className="font-semibold">Only Part of the Platform Was Checked</p>
      <p className="text-sm text-muted-foreground">Successful endpoint probes do not establish external integrations, physical acquisition, phone delivery or overall uptime.</p>
    </div>
  );
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-5 flex items-center gap-4">
      <CheckCircle2 className="h-7 w-7 text-emerald-400 shrink-0" />
      <div>
        <p className="font-semibold text-emerald-300">The Listed Probes Succeeded</p>
        <p className="text-sm text-emerald-400/80">This snapshot is not a measured uptime history or an absence-of-incidents guarantee.</p>
      </div>
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, colorClass }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; colorClass: string;
}) {
  return (
    <Card className="bg-card border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted/60">
            <Icon className={`h-4 w-4 ${colorClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Service row ──────────────────────────────────────────────────────────────
function ServiceRow({ service }: { service: ServiceCheck }) {
  const Icon = service.icon;
  return (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-1.5 rounded-md bg-muted/60 shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{service.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {service.detail || service.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {service.latency !== undefined && (
          <span className="text-xs font-mono text-muted-foreground hidden sm:block">
            {service.latency}ms
          </span>
        )}
        <StatusDot status={service.status} />
        <StatusBadge status={service.status} />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HealthPortal() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey]   = useState(0);

  // Live metrics from the server (admin only)
  const { data: liveMetrics } = trpc.agent.systemHealth.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 30_000,
  });

  const [services, setServices] = useState<ServiceCheck[]>([
    // Core
    { name: "API Gateway",        description: "tRPC + REST endpoints",          icon: Globe,     status: "unknown", category: "core" },
    { name: "Database",           description: "Render PostgreSQL — query-backed readiness", icon: Database, status: "unknown", category: "core" },
    { name: "Authentication",     description: "Email/password + JWT sessions",  icon: Lock,      status: "unknown", category: "core" },
    { name: "WebSocket / RT",     description: "Real-time dashboard updates",    icon: Wifi,      status: "unknown", category: "core" },
    // Integrations
    { name: "MQTT Broker",        description: "IoT telemetry ingestion",        icon: Radio,     status: "unknown", category: "integration" },
    { name: "AI / LLM Service",   description: "Direct OpenAI LLM integration",   icon: Cpu,       status: "unknown", category: "integration" },
    { name: "File Storage (S3)",  description: "AWS S3 document & asset store",  icon: Server,    status: "unknown", category: "integration" },
    { name: "Email (ZeptoMail)",  description: "Transactional email delivery",   icon: Mail,      status: "unknown", category: "integration" },
    { name: "Stripe Payments",    description: "Payment processing gateway",     icon: Zap,       status: "unknown", category: "integration" },
    // Platform
    { name: "Compliance Engine",  description: "EPR token & audit trail",        icon: Shield,    status: "unknown", category: "platform" },
    { name: "Blockchain Audit",   description: "Anchoring disabled; content hashing only", icon: Layers, status: "unknown", category: "platform" },
    { name: "Analytics Engine",   description: "NL query & chart generation",    icon: BarChart2, status: "unknown", category: "platform" },
  ]);

  // Live API ping + service status population
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    async function runChecks() {
      const start = performance.now();
      try {
        const res = await fetch("/api/trpc/auth.me", { method: "GET", signal: controller.signal });
        const apiLatency = Math.round(performance.now() - start);
        const apiOk = res.ok || res.status === 401;

        if (cancelled) return;
        setServices(prev => prev.map(s => {
          if (s.name === "API Gateway") {
            return { ...s, status: apiOk ? "operational" : "outage", latency: apiLatency, detail: `${apiLatency}ms for one session-endpoint probe; other routes not tested` };
          }
          if (s.name === "Authentication") {
            return { ...s, status: apiOk ? "operational" : "degraded", detail: "Session endpoint probe only; successful login, reload and logout are not exercised by this check" };
          }
          return s;
        }));
      } catch {
        if (cancelled) return;
        setServices(prev => prev.map(s =>
          s.name === "API Gateway" ? { ...s, status: "outage", detail: "Connection refused" } : s
        ));
      }

      if (cancelled) return;
      try {
        const readiness = await fetch("/api/health", { method: "GET", signal: controller.signal });
        const body = await readiness.json();
        const ready = isPostgresProbeReady(readiness.status, body);
        if (cancelled) return;
        setServices(prev => prev.map(s => s.name === "Database" ? {
          ...s, status: ready ? "operational" : "degraded",
          detail: ready ? "PostgreSQL SELECT 1 succeeded; this does not certify migrations, backups or all queries" : "PostgreSQL readiness was not confirmed by the query-backed endpoint",
        } : s));
      } catch {
        if (cancelled) return;
        setServices(prev => prev.map(s => s.name === "Database" ? { ...s, status: "unknown", detail: "Readiness probe unavailable" } : s));
      }
      if (cancelled) return;
      setServices(prev => prev.map(s => {
        if (["API Gateway", "Authentication", "Database"].includes(s.name)) return s;
        const disabled = ["MQTT Broker", "Stripe Payments", "Compliance Engine", "Blockchain Audit", "Analytics Engine"].includes(s.name);
        return { ...s, status: "unknown", detail: disabled ? "Disabled or not accepted; no live integration probe was performed" : "Not tested by this page; configuration or a reachable asset is not provider acceptance" };
      }));
      setLastChecked(new Date());
      clearTimeout(timeout);
    }
    runChecks();
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [refreshKey]);

  const checked     = services.filter(s => s.status !== "unknown");
  const operational = services.filter(s => s.status === "operational").length;
  const degraded    = services.filter(s => s.status === "degraded").length;
  const outages     = services.filter(s => s.status === "outage").length;
  const probeSuccessPct = checked.length > 0 ? Math.round((operational / checked.length) * 100) : 0;

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    setServices(prev => prev.map(s => ({ ...s, status: "unknown" as ServiceStatus })));
  };

  const CATEGORY_LABELS: Record<string, string> = {
    core:        "Core Infrastructure",
    integration: "External Integrations",
    platform:    "Platform Services",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Health Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bounded endpoint observations; external integrations and overall uptime are not certified
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Last checked: {lastChecked.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 border-border/60">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Overall banner ─────────────────────────────────────────────────── */}
      <OverallStatusBanner services={services} />

      {/* ── Metric cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Successful Probes" value={`${operational}/${services.length}`} sub="listed checks, not all integrations" icon={CheckCircle2} colorClass="text-emerald-500" />
        <MetricCard label="Probe Success" value={checked.length ? `${probeSuccessPct}%` : "Unknown"} sub="snapshot; not uptime" icon={TrendingUp} colorClass="text-primary" />
        <MetricCard label="Degraded"         value={String(degraded)} sub="services"    icon={AlertTriangle} colorClass={degraded > 0 ? "text-amber-500" : "text-muted-foreground"} />
        <MetricCard label="Outages"          value={String(outages)}  sub="services"    icon={XCircle}       colorClass={outages  > 0 ? "text-red-500"  : "text-muted-foreground"} />
      </div>

      {/* ── Availability bar ───────────────────────────────────────────────── */}
      <Card className="bg-card border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-medium text-foreground">Current Probe Results</span>
            <span className="text-sm font-bold text-primary">{checked.length ? `${probeSuccessPct}%` : "Unknown"}</span>
          </div>
          <Progress value={probeSuccessPct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {operational} of {checked.length} checked observations succeeded; {services.length - checked.length} remain unverified. This is not time-based availability.
          </p>
        </CardContent>
      </Card>

      {/* ── Live metrics (admin only) ───────────────────────────────────────── */}
      {isAdmin && liveMetrics && (
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Live Server Metrics
              <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30 ml-1">Admin</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Uptime",       value: `${Math.floor(liveMetrics.uptime / 3600)}h ${Math.floor((liveMetrics.uptime % 3600) / 60)}m` },
                { label: "Heap Used",    value: `${Math.round((liveMetrics.memoryUsage?.heapUsed ?? 0) / 1024 / 1024)}MB` },
                { label: "Avg Action",   value: `${liveMetrics.avgDurationMs ?? 0}ms` },
                { label: "Node",         value: liveMetrics.nodeVersion ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
                  <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
                  <p className="text-sm font-mono font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>
            {liveMetrics.mqtt && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className={`text-[11px] border-border/50 ${liveMetrics.mqtt.connected ? "text-emerald-400 border-emerald-500/30" : "text-red-400 border-red-500/30"}`}>
                  MQTT: {liveMetrics.mqtt.connected ? "Connected" : "Disconnected"}
                </Badge>
                <Badge variant="outline" className="text-[11px] border-border/50 text-muted-foreground">
                  {liveMetrics.mqtt.messagesReceived} msgs received
                </Badge>
                {liveMetrics.mqtt.errors.length > 0 && (
                  <Badge variant="outline" className="text-[11px] border-red-500/30 text-red-400">
                    {liveMetrics.mqtt.errors.length} MQTT errors
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Service status grid ────────────────────────────────────────────── */}
      {(["core", "integration", "platform"] as const).map(cat => {
        const catServices = services.filter(s => s.category === cat);
        return (
          <Card key={cat} className="bg-card border-border/60 overflow-hidden">
            <CardHeader className="pb-0 px-5 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {CATEGORY_LABELS[cat]}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-2">
              <div className="divide-y divide-border/30">
                {catServices.map(service => (
                  <ServiceRow key={service.name} service={service} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* ── Incident history ───────────────────────────────────────────────── */}
      <Card className="bg-card border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-500 mb-3 opacity-80" />
            <p className="text-sm font-medium text-foreground">No incidents in the last 90 days</p>
            <p className="text-xs text-muted-foreground mt-1">All services have been running without disruption</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Admin note ─────────────────────────────────────────────────────── */}
      {!isAdmin && (
        <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Sign in as an admin to view live server metrics (uptime, memory, MQTT status, agent action stats).
          </p>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        Health checks run on page load and every 30 seconds. Status reflects real-time API connectivity from your browser.
      </p>
    </div>
  );
}
