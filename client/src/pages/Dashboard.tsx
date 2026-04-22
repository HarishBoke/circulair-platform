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
  TrendingUp, TrendingDown, ArrowRight, Zap, RefreshCw, Plus
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const TRIAGE_FALLBACK = [
  { name: "Direct Reuse", value: 0, color: "#00c8a0" },
  { name: "Module Repurposing", value: 0, color: "#ffb347" },
  { name: "Material Recycling", value: 0, color: "#ff4d6d" },
];

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
  const { data: kpis, isLoading: kpisLoading, refetch } = trpc.analytics.kpis.useQuery();
  const { data: alerts } = trpc.alerts.list.useQuery({ limit: 5 });
  const { data: sohTrend } = trpc.analytics.sohTrend.useQuery();
  const { data: triageDistribution } = trpc.analytics.triageDistribution.useQuery();
  const { data: marketplaceWeekly } = trpc.analytics.marketplaceWeekly.useQuery();

  const batteryStats = kpis?.batteryStats;
  const marketStats = kpis?.marketStats;
  const eprStats = kpis?.eprStats;

  // Use real data; fall back to empty arrays so charts render gracefully
  const sohData = sohTrend?.filter((d) => d.avg !== null) ?? [];
  const triageData = (triageDistribution && triageDistribution.length > 0)
    ? triageDistribution
    : TRIAGE_FALLBACK;
  const marketData = marketplaceWeekly ?? [];

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Platform Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, <span className="text-primary">{user?.name ?? "User"}</span> · Real-time battery intelligence overview
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

      {/* KPI Strip */}
      {/* Getting Started progress widget — shown to all users, dismissible */}
      <GettingStartedWidget />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Batteries", value: batteryStats?.total ?? 0, icon: Battery, change: "+12%", up: true },
          { label: "Operational", value: batteryStats?.operational ?? 0, icon: Activity, change: "+8%", up: true },
          { label: "Active Listings", value: marketStats?.activeListings ?? 0, icon: ShoppingCart, change: "+20%", up: true },
          { label: "EPR Tokens", value: eprStats?.verified ?? 0, icon: Shield, change: "100%", up: true },
          { label: "EOL Batteries", value: batteryStats?.endOfLife ?? 0, icon: AlertTriangle, change: "-5%", up: false },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all hover:-translate-y-0.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="flex items-start justify-between mb-3">
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{kpi.label}</span>
              <kpi.icon className="w-4 h-4 text-primary opacity-50" />
            </div>
            <div className="font-display text-3xl font-bold mb-1">
              {kpisLoading ? <span className="text-muted-foreground text-xl">—</span> : kpi.value.toLocaleString()}
            </div>
            <div className={`flex items-center gap-1 font-mono text-[10px] ${kpi.up ? "text-primary" : "text-destructive"}`}>
              {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {kpi.change} this month
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="font-display text-sm font-bold">Fleet Average SOH Trend</h3>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">State of Health over 6 months</p>
            </div>
            <Badge variant="outline" className="font-mono text-[9px] border-primary/30 text-primary">CNN-LSTM v3.2.1</Badge>
          </div>
          <div className="p-5">
            {sohData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-xs font-mono">
                No SOH data yet - register batteries and run AI predictions to populate this chart.
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
                  <YAxis domain={[70, 100]} tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,200,160,0.2)", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "11px" }} labelStyle={{ color: "#00c8a0" }} />
                  <Area type="monotone" dataKey="avg" stroke="#00c8a0" strokeWidth={2} fill="url(#sohGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-sm font-bold">AI Triage Distribution</h3>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Current EOL routing</p>
          </div>
          <div className="p-5 flex flex-col items-center">
            {triageData.every((t) => t.value === 0) ? (
              <div className="h-[140px] flex items-center justify-center text-muted-foreground text-xs font-mono text-center px-4">
                No triage data yet - run AI SOH predictions to see routing distribution.
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
              {triageData.map((t) => (
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
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Weekly transactions</p>
            </div>
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className="text-primary text-xs h-7">View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </div>
          <div className="p-5">
            {marketData.every((d) => d.txns === 0) ? (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground text-xs font-mono text-center px-4">
                No marketplace transactions yet - list batteries to see weekly activity.
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
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">System notifications</p>
            </div>
            <Link href="/alerts">
              <Button variant="ghost" size="sm" className="text-primary text-xs h-7">View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {alerts && alerts.length > 0 ? (
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
                <p className="text-muted-foreground text-xs">No alerts yet. Register a battery to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Register Battery", href: "/batteries/register", icon: Battery },
          { label: "Run AI Prediction", href: "/ai-soh", icon: Brain },
          { label: "List on Market", href: "/marketplace", icon: ShoppingCart },
          { label: "Submit EPR Token", href: "/epr-compliance", icon: Shield },
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
