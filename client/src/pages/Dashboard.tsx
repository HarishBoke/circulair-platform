import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/_core/hooks/useAuth";
import OnboardingWizard from "@/components/OnboardingWizard";
import GettingStartedWidget from "@/components/GettingStartedWidget";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Battery, Activity, Brain, ShoppingCart, Shield, AlertTriangle,
  ArrowRight, Zap, RefreshCw, Plus
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

export default function Dashboard() {
  usePageTitle("Dashboard");
  const { user } = useAuth();
  return (
    <>
      <OnboardingWizard />
      <DashboardContent user={user} />
    </>
  );
}

function DashboardContent({ user }: { user: any }) {
  const { data: kpis, isLoading: kpisLoading, error: kpisError, refetch } = trpc.analytics.kpis.useQuery();
  const { data: alerts, isLoading: alertsLoading, error: alertsError } = trpc.alerts.list.useQuery({ limit: 5 });
  const { data: sohTrend, isLoading: sohLoading, error: sohError } = trpc.analytics.sohTrend.useQuery();
  const { data: triageDistribution, isLoading: triageLoading, error: triageError } = trpc.analytics.triageDistribution.useQuery();
  const { data: marketplaceWeekly, isLoading: marketLoading, error: marketError } = trpc.analytics.marketplaceWeekly.useQuery();

  const batteryStats = kpis?.batteryStats;
  const marketStats = kpis?.marketStats;
  const eprStats = kpis?.eprStats;

  // Use real data; fall back to empty arrays so charts render gracefully
  const sohData = sohTrend?.filter((d) => d.avg !== null) ?? [];
  const triageData = triageDistribution ?? [];
  const marketData = marketplaceWeekly ?? [];

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Platform Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, <span className="text-primary">{user?.name ?? "User"}</span> · Authorized battery record overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Link href="/batteries/register">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Register Battery
            </Button>
          </Link>
        </div>
      </div>

      <p role="note" className="text-sm text-amber-300">Counts reflect stored records and labels, not verified physical condition or fulfilled regulatory obligations. SOH/RUL and triage heuristics are uncalibrated, not approved safety, second-life or recycling decisions. No measured accuracy, uptime, payment, carrier dispatch or government acceptance is established.</p>
      {kpisError && <p role="alert" className="text-sm text-destructive">Dashboard counts unavailable: {kpisError.message}</p>}
      {/* KPI Strip */}
      {/* Getting Started progress widget — shown to all users, dismissible */}
      <GettingStartedWidget />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Battery Records", value: batteryStats?.total, icon: Battery },
          { label: "Operational Label", value: batteryStats?.operational, icon: Activity },
          { label: "Active Listings", value: marketStats?.activeListings, icon: ShoppingCart },
          { label: "EPR Records — Verified Label", value: eprStats?.verified, icon: Shield },
          { label: "EOL Label", value: batteryStats?.endOfLife, icon: AlertTriangle },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all hover:-translate-y-0.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="flex items-start justify-between mb-3">
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{kpi.label}</span>
              <kpi.icon className="w-4 h-4 text-primary opacity-50" />
            </div>
            <div className="font-display text-3xl font-bold mb-1">
              {kpisLoading ? <span className="text-muted-foreground text-xl">Loading…</span> : kpisError || kpi.value == null ? <span className="text-muted-foreground text-xl">Unknown</span> : kpi.value.toLocaleString()}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">Recorded count; trend unavailable</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="font-display text-sm font-bold">Battery Record Average SOH</h3>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Recorded SOH by period; provenance and calibration require review</p>
            </div>
            <Badge variant="outline" className="font-mono text-[9px] border-primary/30 text-primary">Uncalibrated estimates</Badge>
          </div>
          <div className="p-5">
            {sohLoading ? <p className="text-sm">Loading SOH records…</p> : sohError ? <p role="alert" className="text-sm text-destructive">SOH records unavailable: {sohError.message}</p> : sohData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-xs font-mono">
                No SOH records returned; physical measurements and calibration are not established.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={sohData}>
                  <defs>
                    <linearGradient id="sohGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c8a0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00c8a0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,200,160,0.2)", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "11px" }} labelStyle={{ color: "#00c8a0" }} />
                  <Area type="monotone" dataKey="avg" stroke="#00c8a0" strokeWidth={2} fill="url(#sohGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-sm font-bold">Candidate Triage Label Distribution</h3>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Stored labels only; no route is approved or dispatched</p>
          </div>
          <div className="p-5 flex flex-col items-center">
            {triageLoading ? <p className="text-sm">Loading candidate records…</p> : triageError ? <p role="alert" className="text-sm text-destructive">Candidate records unavailable: {triageError.message}</p> : triageData.length === 0 || triageData.every((t) => t.value === 0) ? (
              <div className="h-[140px] flex items-center justify-center text-muted-foreground text-xs font-mono text-center px-4">
                No candidate distribution returned; no physical disposition is approved.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={triageData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {triageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,200,160,0.2)", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="space-y-2 w-full mt-2">
              {!triageError && !triageLoading && triageData.map((t) => (
                <div key={t.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    <span className="font-mono text-[10px] text-muted-foreground">{t.name}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: t.color }}>{t.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="font-display text-sm font-bold">Marketplace Activity</h3>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Weekly recorded activity; not evidence of executed payments</p>
            </div>
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className="text-primary text-xs h-7">View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </div>
          <div className="p-5">
            {marketLoading ? <p className="text-sm">Loading marketplace records…</p> : marketError ? <p role="alert" className="text-sm text-destructive">Marketplace records unavailable: {marketError.message}</p> : marketData.length === 0 || marketData.every((d) => d.txns === 0) ? (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground text-xs font-mono text-center px-4">
                No marketplace activity returned; payments are disabled pending separate acceptance.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={marketData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.08)" />
                  <XAxis dataKey="week" tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,200,160,0.2)", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "11px" }} />
                  <Bar dataKey="txns" fill="#00c8a0" radius={[4, 4, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="font-display text-sm font-bold">Recent Alerts</h3>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Recorded alerts; not proof of outbound notification delivery</p>
            </div>
            <Link href="/alerts">
              <Button variant="ghost" size="sm" className="text-primary text-xs h-7">View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {alertsLoading ? <p className="p-5 text-sm">Loading alert records…</p> : alertsError ? <p role="alert" className="p-5 text-sm text-destructive">Alert records unavailable: {alertsError.message}</p> : alerts && alerts.length > 0 ? (
              alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="px-5 py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alert.severity === "critical" ? "bg-destructive" : alert.severity === "warning" ? "bg-chart-4" : "bg-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{alert.title}</div>
                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">{alert.message}</div>
                  </div>
                  {!alert.read && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-xs">No alert records returned; absence does not prove safe battery condition.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Register Battery", href: "/batteries/register", icon: Battery },
          { label: "Review SOH Estimate", href: "/ai-soh", icon: Brain },
          { label: "List on Market", href: "/marketplace", icon: ShoppingCart },
          { label: "Review EPR Record", href: "/epr-compliance", icon: Shield },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2 hover:border-primary/30 transition-all hover:-translate-y-0.5 cursor-pointer text-center">
              <action.icon className="w-5 h-5 text-primary" />
              <span className="font-mono text-[10px] text-muted-foreground">{action.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
