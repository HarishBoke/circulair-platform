import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, Battery, ShoppingCart, Shield, Activity } from "lucide-react";
import NaturalLanguageSearch from "@/components/NaturalLanguageSearch";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

export default function Analytics() {
  usePageTitle("Analytics");

  const { data: kpis, isLoading, error: kpiError, refetch } = trpc.analytics.kpis.useQuery();
  const { data: monthlyActivity, isLoading: monthlyLoading, error: monthlyError } = trpc.analytics.monthlyActivity.useQuery();
  const { data: sohDistribution, isLoading: sohLoading, error: sohError } = trpc.analytics.sohDistribution.useQuery();
  const { data: chemistryDistribution, isLoading: chemistryLoading, error: chemistryError } = trpc.analytics.chemistryDistribution.useQuery();

  if (kpiError || monthlyError || sohError || chemistryError) return (
    <div className="p-6 space-y-3"><h1 className="font-display text-2xl font-bold">Analytics & KPIs</h1>
      <p role="alert">Analytics data is unavailable. Administrator permission and a successful database query are required; unavailable data is not shown as zero.</p></div>
  );
  if (isLoading || monthlyLoading || sohLoading || chemistryLoading) return <div className="p-6">Loading database-backed analytics…</div>;

  const batteryStats = kpis?.batteryStats;
  const marketStats = kpis?.marketStats;
  const eprStats = kpis?.eprStats;

  const monthlyData = monthlyActivity ?? [];
  const sohData = sohDistribution ?? [];
  const chemData = chemistryDistribution ?? [];

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      {/* AI Natural Language Search */}
      <NaturalLanguageSearch />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics & KPIs</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform performance metrics, sustainability KPIs, and operational intelligence</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Batteries", value: batteryStats?.total ?? 0, icon: Battery, sub: "Registered in BPAN registry" },
          { label: "Marketplace Volume", value: `₹${((marketStats?.totalValueInr ?? 0) / 100000).toFixed(1)}L`, icon: ShoppingCart, sub: `${marketStats?.totalTransactions ?? 0} transactions` },
          { label: "Legacy EPR Records", value: eprStats?.verified ?? 0, icon: Shield, sub: "Stored statuses; not regulatory certification" },
          { label: "System Uptime", value: "Unavailable", icon: Activity, sub: "No measured monitor history is integrated" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="flex items-start justify-between mb-3">
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{kpi.label}</span>
              <kpi.icon className="w-4 h-4 text-primary opacity-50" />
            </div>
            <div className="font-display text-3xl font-bold mb-1">
              {isLoading ? <span className="text-muted-foreground text-xl">—</span> : (typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value)}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold">Monthly Platform Activity</h3>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Registrations, recycling, and sales</p>
            </div>
            <Badge variant="outline" className="font-mono text-[9px] border-primary/30 text-primary">6 months</Badge>
          </div>
          <div className="p-5">
            {monthlyData.every((d) => d.registered === 0 && d.sold === 0 && d.recycled === 0) ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs font-mono text-center px-4">
                No activity data yet - register batteries to populate this chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,200,160,0.2)", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "11px" }} />
                  <Bar dataKey="registered" fill="#00c8a0" radius={[2, 2, 0, 0]} opacity={0.9} name="Registered" />
                  <Bar dataKey="recycled" fill="#4fc3f7" radius={[2, 2, 0, 0]} opacity={0.7} name="Recycled" />
                  <Bar dataKey="sold" fill="#ffb347" radius={[2, 2, 0, 0]} opacity={0.7} name="Sold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-sm font-bold">SOH Distribution</h3>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Fleet health breakdown</p>
          </div>
          <div className="p-5">
            {sohData.every((d) => d.count === 0) ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs font-mono text-center px-4">
                No SOH data yet - run AI predictions on registered batteries to see distribution.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sohData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.08)" />
                  <XAxis type="number" tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="range" type="category" tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,200,160,0.2)", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "11px" }} />
                  <Bar dataKey="count" fill="#00c8a0" radius={[0, 4, 4, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-sm font-bold">Chemistry Mix</h3>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Fleet composition</p>
          </div>
          <div className="p-5 flex flex-col items-center">
            {chemData.length === 0 || chemData.every((d) => d.value === 0) ? (
              <div className="h-[140px] flex items-center justify-center text-muted-foreground text-xs font-mono text-center px-4">
                No batteries registered yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={chemData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                    {chemData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,200,160,0.2)", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="space-y-1.5 w-full mt-2">
              {chemData.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    <span className="font-mono text-[10px] text-muted-foreground">{c.name}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: c.color }}>{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold">System Uptime History</h3>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Requires measured monitoring history</p>
            </div>
            <Badge variant="outline" className="font-mono text-[9px] border-border">Unavailable</Badge>
          </div>
          <div className="p-5">
            <p className="min-h-40 flex items-center text-sm text-muted-foreground">No verified uptime series is connected. The separately approved Render monitoring stack must be deployed, configured, and accumulate real probe history before an availability chart can be shown.</p>
          </div>
        </div>
      </div>

      {/* Sustainability KPIs */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Sustainability KPIs
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "CO₂ Avoided", value: "Unavailable", sub: "No validated baseline or measured comparison", color: "text-primary" },
            { label: "Registered Batteries", value: `${batteryStats?.total ?? 0}`, sub: "Registration is not proof of landfill diversion", color: "text-chart-2" },
            { label: "Recorded Yield", value: `${((eprStats?.totalYieldKg ?? 0) / 1000).toFixed(1)}t`, sub: "Legacy recorded values; not verified recovery", color: "text-chart-3" },
            { label: "Warranty Claims Reduced", value: "Unavailable", sub: "No measured comparative study", color: "text-chart-4" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-secondary/30 rounded-xl p-4">
              <div className="font-mono text-[9px] text-muted-foreground mb-2">{kpi.label}</div>
              <div className={`font-display text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="font-mono text-[9px] text-muted-foreground mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
