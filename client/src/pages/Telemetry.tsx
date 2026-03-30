import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Activity, Thermometer, Zap, RefreshCw, AlertTriangle, Search } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Telemetry() {
  const [bpan, setBpan] = useState("");
  const [activeBpan, setActiveBpan] = useState("");

  const { data: anomalies, isLoading: anomaliesLoading } = trpc.telemetry.thermalAnomalies.useQuery({ limit: 20 });
  const { data: history, isLoading: histLoading, refetch } = trpc.telemetry.history.useQuery(
    { bpan: activeBpan, limit: 50 },
    { enabled: !!activeBpan }
  );
  const { data: latest } = trpc.telemetry.latest.useQuery(
    { bpan: activeBpan },
    { enabled: !!activeBpan }
  );

  const simulateMutation = trpc.telemetry.simulate.useMutation({
    onSuccess: (d) => { toast.success(`Simulated ${d.records} records`); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const chartData = (history ?? []).slice(0, 30).reverse().map((t, i) => ({
    idx: i + 1,
    tMax: Number(t.tMax ?? 0),
    vPack: Number(t.vPack ?? 0),
    soh: Number(t.sohEstimate ?? 0),
  }));

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">IoT Telemetry</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time battery telemetry monitoring and anomaly detection</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-blink" />
          <span className="font-mono text-[10px] text-primary">LIVE MONITORING</span>
        </div>
      </div>

      {/* BPAN Search */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Monitor Battery</div>
        <div className="flex gap-3">
          <Input
            placeholder="Enter 21-character BPAN..."
            value={bpan}
            onChange={(e) => setBpan(e.target.value.toUpperCase())}
            className="bg-secondary/30 border-border font-mono text-sm h-9 flex-1"
            maxLength={21}
          />
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-9"
            onClick={() => { if (bpan.length === 21) setActiveBpan(bpan); else toast.error("BPAN must be 21 characters"); }}
          >
            <Search className="w-3.5 h-3.5 mr-1.5" /> Monitor
          </Button>
          {activeBpan && (
            <Button
              variant="outline"
              size="sm"
              className="border-border h-9 text-xs"
              disabled={simulateMutation.isPending}
              onClick={() => {
                if (latest?.batteryId) {
                  simulateMutation.mutate({ bpan: activeBpan, batteryId: latest.batteryId, cycles: 10 });
                }
              }}
            >
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              {simulateMutation.isPending ? "Simulating..." : "Simulate Data"}
            </Button>
          )}
        </div>
      </div>

      {/* Live Metrics */}
      {activeBpan && latest && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pack Voltage", value: `${Number(latest.vPack ?? 0).toFixed(1)}V`, icon: Zap, warn: false },
            { label: "Pack Current", value: `${Number(latest.iPack ?? 0).toFixed(1)}A`, icon: Activity, warn: false },
            { label: "Max Temperature", value: `${Number(latest.tMax ?? 0).toFixed(1)}°C`, icon: Thermometer, warn: Number(latest.tMax ?? 0) > 51 },
            { label: "Cycle Count", value: String(latest.cycleCount ?? 0), icon: RefreshCw, warn: false },
          ].map((m) => (
            <div key={m.label} className={`bg-card border rounded-xl p-4 ${m.warn ? "border-destructive/40" : "border-border"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{m.label}</span>
                <m.icon className={`w-4 h-4 ${m.warn ? "text-destructive" : "text-primary"}`} />
              </div>
              <div className={`font-display text-2xl font-bold ${m.warn ? "text-destructive" : "text-foreground"}`}>{m.value}</div>
              {m.warn && <div className="font-mono text-[9px] text-destructive mt-1">⚠ THERMAL ANOMALY</div>}
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {activeBpan && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display text-sm font-bold">Temperature History</h3>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.08)" />
                  <XAxis dataKey="idx" tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,200,160,0.2)", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "11px" }} />
                  <Line type="monotone" dataKey="tMax" stroke="#ff4d6d" strokeWidth={2} dot={false} name="Temp °C" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display text-sm font-bold">SOH Trend</h3>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.08)" />
                  <XAxis dataKey="idx" tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,200,160,0.2)", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "11px" }} />
                  <Line type="monotone" dataKey="soh" stroke="#00c8a0" strokeWidth={2} dot={false} name="SOH %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Anomalies */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Thermal Anomalies
            </h3>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">Batteries exceeding 51°C threshold</p>
          </div>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[9px]">
            {(anomalies ?? []).length} detected
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["BPAN", "Max Temp", "Pack Temp", "Cycle", "Source", "Time"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anomaliesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary/50 rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : (anomalies ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No thermal anomalies detected. System operating normally.
                  </td>
                </tr>
              ) : (
                (anomalies ?? []).map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{t.bpan}</td>
                    <td className="px-4 py-3 font-mono text-xs text-destructive font-bold">{Number(t.tMax ?? 0).toFixed(1)}°C</td>
                    <td className="px-4 py-3 font-mono text-xs">{Number(t.tPack ?? 0).toFixed(1)}°C</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.cycleCount ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-[9px] border-border">{t.source}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(t.recordedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
