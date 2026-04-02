import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity, AlertTriangle, BarChart3, Brain, CheckCircle2,
  Clock, Cpu, Database, Globe, Layers, Radio, RefreshCw,
  Server, Shield, TrendingUp, Users, Zap, XCircle, Search,
  ChevronLeft, ChevronRight, Terminal, ArrowUpRight, Timer
} from "lucide-react";

const PAGE_SIZE = 25;

const MODULE_COLORS: Record<string, string> = {
  battery: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  telemetry: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  marketplace: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  compliance: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  logistics: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  analytics: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  admin: "bg-red-500/10 text-red-400 border-red-500/20",
  system: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  agent: "bg-primary/10 text-primary border-primary/20",
  ai: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  success: { icon: CheckCircle2, color: "text-emerald-400" },
  failure: { icon: XCircle, color: "text-red-400" },
  pending: { icon: Clock, color: "text-amber-400" },
  cancelled: { icon: XCircle, color: "text-zinc-400" },
};

const ACTOR_BADGE: Record<string, string> = {
  human: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  agent: "bg-primary/10 text-primary border-primary/20",
  system: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/* ─── TABS ─────────────────────────────────────────────────────────────────── */
type Tab = "overview" | "actions" | "activity";

export default function SuperAdmin() {
  usePageTitle("Super Admin");

  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  const isAdmin = (user as any)?.role === "admin";
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display text-xl font-bold mb-1">Access Restricted</h2>
          <p className="text-muted-foreground text-sm">Super Admin panel is available to platform administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">Super Admin</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Platform health, agent action tracking, and system oversight
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-blink" />
            <span className="font-mono text-[10px] text-primary">ADMIN MODE</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
        {([
          { key: "overview", label: "System Overview", icon: BarChart3 },
          { key: "actions", label: "Agent Actions", icon: Terminal },
          { key: "activity", label: "Live Activity", icon: Activity },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "actions" && <ActionsTab />}
      {tab === "activity" && <ActivityTab />}
    </div>
  );
}

/* ─── OVERVIEW TAB ─────────────────────────────────────────────────────────── */
function OverviewTab() {
  const { data: health, isLoading: healthLoading, refetch } = trpc.agent.systemHealth.useQuery();
  const { data: stats } = trpc.agent.stats.useQuery();

  return (
    <div className="space-y-6">
      {/* System Vitals */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">System Vitals</h3>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Server, label: "Server Uptime",
            value: health ? formatUptime(health.uptime) : "—",
            sub: `Node ${health?.nodeVersion ?? "—"}`,
          },
          {
            icon: Database, label: "Memory Usage",
            value: health ? formatBytes(health.memoryUsage.heapUsed) : "—",
            sub: health ? `of ${formatBytes(health.memoryUsage.heapTotal)}` : "—",
          },
          {
            icon: Radio, label: "MQTT Status",
            value: health?.mqtt.connected ? "Connected" : "Disconnected",
            sub: `${health?.mqtt.messagesReceived ?? 0} messages received`,
            highlight: health?.mqtt.connected,
          },
          {
            icon: Timer, label: "Avg Action Duration",
            value: health ? `${health.avgDurationMs}ms` : "—",
            sub: "Across all tracked actions",
          },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4 text-primary" />
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{card.label}</span>
            </div>
            <div className="font-display text-xl font-bold mb-0.5">{card.value}</div>
            <div className="text-xs text-muted-foreground">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Action Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Actor Type */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Actions by Actor Type
          </h4>
          <div className="space-y-3">
            {(["human", "agent", "system"] as const).map((type) => {
              const count = stats?.byActorType[type] ?? 0;
              const total = stats?.total ?? 1;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={type} className="flex items-center gap-3">
                  <Badge variant="outline" className={`${ACTOR_BADGE[type]} text-[10px] font-mono w-16 justify-center`}>
                    {type}
                  </Badge>
                  <div className="flex-1">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground w-16 text-right">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Module */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Actions by Module
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(MODULE_COLORS).map(([mod, cls]) => {
              const count = stats?.byModule[mod] ?? 0;
              return (
                <div key={mod} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
                  <Badge variant="outline" className={`${cls} text-[9px] font-mono`}>{mod}</Badge>
                  <span className="font-mono text-xs font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Actions", value: stats?.total ?? 0, icon: BarChart3 },
          { label: "Last 24h", value: stats?.last24h ?? 0, icon: TrendingUp },
          { label: "Failures", value: stats?.failures ?? 0, icon: AlertTriangle, alert: (stats?.failures ?? 0) > 0 },
          { label: "Failure Rate", value: `${stats?.failureRate ?? "0.0"}%`, icon: Shield },
        ].map((s) => (
          <div key={s.label} className={`bg-card border rounded-xl p-4 ${s.alert ? "border-red-500/30" : "border-border"}`}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-3.5 h-3.5 ${s.alert ? "text-red-400" : "text-primary"}`} />
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
            </div>
            <div className={`font-display text-2xl font-bold ${s.alert ? "text-red-400" : ""}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Hourly Actions Chart (text-based) */}
      {health?.hourlyActions && health.hourlyActions.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Actions Per Hour (Last 12h)
          </h4>
          <div className="flex items-end gap-1 h-24">
            {health.hourlyActions.map((h: any, i: number) => {
              const max = Math.max(...health.hourlyActions.map((x: any) => x.count), 1);
              const pct = (h.count / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="font-mono text-[8px] text-muted-foreground">{h.count}</span>
                  <div className="w-full bg-secondary rounded-t" style={{ height: `${Math.max(pct, 4)}%` }}>
                    <div className="w-full h-full bg-primary/60 rounded-t" />
                  </div>
                  <span className="font-mono text-[7px] text-muted-foreground">
                    {h.hour?.split(" ")[1]?.slice(0, 5) ?? ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ACTIONS TAB ──────────────────────────────────────────────────────────── */
function ActionsTab() {
  const [search, setSearch] = useState("");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const queryInput = useMemo(() => ({
    search: search || undefined,
    actorType: actorFilter !== "all" ? actorFilter as any : undefined,
    module: moduleFilter !== "all" ? moduleFilter : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }), [search, actorFilter, moduleFilter, statusFilter, page]);

  const { data, isLoading, refetch } = trpc.agent.listActions.useQuery(queryInput);
  const actions = data?.actions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-9 bg-card border-border"
          />
        </div>
        <Select value={actorFilter} onValueChange={(v) => { setActorFilter(v); setPage(0); }}>
          <SelectTrigger className="w-32 h-9 bg-card border-border">
            <SelectValue placeholder="Actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actors</SelectItem>
            <SelectItem value="human">Human</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36 h-9 bg-card border-border">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {Object.keys(MODULE_COLORS).map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-32 h-9 bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border h-9">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{total} action{total !== 1 ? "s" : ""} found</span>
        {totalPages > 1 && (
          <span>Page {page + 1} of {totalPages}</span>
        )}
      </div>

      {/* Actions Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
            Loading actions...
          </div>
        ) : actions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No actions found</p>
            <p className="text-xs mt-1">Actions will appear here as platform operations are performed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Actor</th>
                  <th className="text-left px-4 py-3">Module</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Duration</th>
                  <th className="text-left px-4 py-3 hidden xl:table-cell">Target</th>
                  <th className="text-right px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action: any) => {
                  const statusCfg = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.success;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={action.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-medium">{action.action}</div>
                        {action.description && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{action.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${ACTOR_BADGE[action.actorType] ?? ACTOR_BADGE.human} text-[9px] font-mono`}>
                            {action.actorType}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">{action.actorName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`${MODULE_COLORS[action.module] ?? MODULE_COLORS.system} text-[9px] font-mono`}>
                          {action.module}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`w-3.5 h-3.5 ${statusCfg.color}`} />
                          <span className={`font-mono text-[10px] ${statusCfg.color}`}>{action.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="font-mono text-xs text-muted-foreground">{formatDuration(action.durationMs)}</span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {action.targetEntity ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">{action.targetEntity}</span>
                            {action.targetEntityType && (
                              <span className="text-[8px] text-muted-foreground/60">({action.targetEntityType})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-[10px] text-muted-foreground">{timeAgo(action.createdAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="border-border h-8"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="font-mono text-xs text-muted-foreground px-3">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
            className="border-border h-8"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── ACTIVITY TAB ─────────────────────────────────────────────────────────── */
function ActivityTab() {
  const { data: activity, isLoading, refetch } = trpc.agent.recentActivity.useQuery({ limit: 30 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Live Activity Feed
        </h3>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
            Loading activity...
          </div>
        ) : !activity || activity.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">Platform actions will appear here in real-time</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {activity.map((item: any) => {
              const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.success;
              const StatusIcon = statusCfg.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-primary/5 transition-colors">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      item.status === "success" ? "bg-emerald-400" :
                      item.status === "failure" ? "bg-red-400" : "bg-amber-400"
                    }`} />
                    <div className="w-px flex-1 bg-border/50 mt-1" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-medium">{item.action}</span>
                      <Badge variant="outline" className={`${MODULE_COLORS[item.module] ?? MODULE_COLORS.system} text-[8px] font-mono`}>
                        {item.module}
                      </Badge>
                      <Badge variant="outline" className={`${ACTOR_BADGE[item.actorType] ?? ACTOR_BADGE.human} text-[8px] font-mono`}>
                        {item.actorType}
                      </Badge>
                      <StatusIcon className={`w-3 h-3 ${statusCfg.color}`} />
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
                      <span>{item.actorName}</span>
                      {item.durationMs && <span>{formatDuration(item.durationMs)}</span>}
                      {item.targetEntity && (
                        <span className="flex items-center gap-0.5">
                          <ArrowUpRight className="w-2.5 h-2.5" />
                          {item.targetEntity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
