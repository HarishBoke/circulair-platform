import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Activity, Thermometer, Zap, RefreshCw, AlertTriangle,
  Search, Wifi, WifiOff, Loader2, Radio, Battery, Gauge
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { useTelemetrySocket } from "@/hooks/useTelemetrySocket";

// ─── Connection Status Badge ──────────────────────────────────────────────────

function ConnectionBadge({ state }: { state: string }) {
  const configs = {
    connected: { icon: Wifi, label: "LIVE", cls: "bg-primary/10 text-primary border-primary/30 animate-pulse" },
    connecting: { icon: Loader2, label: "CONNECTING", cls: "bg-chart-4/10 text-chart-4 border-chart-4/30" },
    disconnected: { icon: WifiOff, label: "OFFLINE", cls: "bg-muted/10 text-muted-foreground border-border" },
    error: { icon: WifiOff, label: "ERROR", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  };
  const cfg = configs[state as keyof typeof configs] ?? configs.disconnected;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`font-mono text-[9px] tracking-widest flex items-center gap-1.5 px-2.5 py-1 ${cfg.cls}`}>
      <Icon className={`w-2.5 h-2.5 ${state === "connecting" ? "animate-spin" : ""}`} />
      {cfg.label}
    </Badge>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, unit, icon: Icon, warn, sub, flash
}: {
  label: string; value: string | number; unit?: string; icon: React.ElementType;
  warn?: boolean; sub?: string; flash?: boolean;
}) {
  const flashRef = useRef(false);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (!flash) return;
    if (flashRef.current) {
      setIsFlashing(true);
      const t = setTimeout(() => setIsFlashing(false), 400);
      return () => clearTimeout(t);
    }
    flashRef.current = true;
  }, [value, flash]);

  return (
    <div className={`bg-card border rounded-xl p-4 transition-all duration-300 ${
      warn ? "border-destructive/40 shadow-[0_0_12px_rgba(255,77,109,0.12)]" :
      isFlashing ? "border-primary/50 shadow-[0_0_12px_rgba(0,200,160,0.15)]" :
      "border-border"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{label}</span>
        <Icon className={`w-4 h-4 ${warn ? "text-destructive" : "text-primary"} opacity-70`} />
      </div>
      <div className={`font-display text-2xl font-bold tabular-nums ${warn ? "text-destructive" : "text-foreground"}`}>
        {value}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
      </div>
      {sub && <div className={`font-mono text-[9px] mt-1 ${warn ? "text-destructive" : "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2 shadow-xl">
      <p className="font-mono text-[9px] text-muted-foreground mb-1">t={label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-mono text-[10px]" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Telemetry() {
  const [bpan, setBpan] = useState("");
  const [activeBpan, setActiveBpan] = useState<string | null>(null);

  // Real-time WebSocket hook
  const { latest, history, connectionState, anomalies: liveAnomalies, isSubscribed } = useTelemetrySocket(activeBpan);

  // Historical anomalies from DB (shown in table)
  const { data: dbAnomalies, isLoading: anomaliesLoading, refetch: refetchAnomalies } = trpc.telemetry.thermalAnomalies.useQuery({ limit: 20 });

  // tRPC simulate mutation (triggers real-time broadcast too)
  const simulateMutation = trpc.telemetry.simulate.useMutation({
    onSuccess: (d) => toast.success(`Simulated ${d.records} readings — watch the live charts!`),
    onError: (e) => toast.error(e.message),
  });

  // Show toast for live anomalies
  useEffect(() => {
    if (liveAnomalies.length === 0) return;
    const newest = liveAnomalies[0];
    toast.error(`🔥 Thermal Anomaly: ${newest.bpan} @ ${newest.tMax.toFixed(1)}°C`, {
      description: newest.message,
      duration: 6000,
    });
    refetchAnomalies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAnomalies.length]);

  // Build chart data from live history (oldest → newest)
  const chartData = history.map((t, i) => ({
    t: i + 1,
    tMax: t.tMax,
    tPack: t.tPack,
    vPack: t.vPack,
    soh: t.sohEstimate,
    irPack: t.irPack,
    iPack: t.iPack,
  }));

  const handleMonitor = () => {
    if (bpan.length !== 21) {
      toast.error("BPAN must be exactly 21 characters");
      return;
    }
    setActiveBpan(bpan.toUpperCase());
  };

  const handleStop = () => {
    setActiveBpan(null);
    setBpan("");
  };

  // Merge live anomalies + DB anomalies for the table
  const allAnomalies = [
    ...liveAnomalies.map((a) => ({
      id: `live-${a.recordedAt}`,
      bpan: a.bpan,
      tMax: String(a.tMax),
      tPack: String(a.tPack),
      cycleCount: null,
      source: "live",
      recordedAt: new Date(a.recordedAt),
      isLive: true,
    })),
    ...(dbAnomalies ?? []).map((a) => ({ ...a, isLive: false })),
  ].slice(0, 30);

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            IoT Telemetry
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time WebSocket stream · MQTT simulation · Thermal anomaly detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge state={connectionState} />
          {isSubscribed && activeBpan && (
            <Badge variant="outline" className="font-mono text-[9px] bg-primary/5 text-primary border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-ping inline-block" />
              {activeBpan}
            </Badge>
          )}
        </div>
      </div>

      {/* BPAN Monitor Control */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
          <Radio className="w-3 h-3" /> Live Battery Monitor
        </div>
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="Enter 21-character BPAN to monitor live..."
            value={bpan}
            onChange={(e) => setBpan(e.target.value.toUpperCase())}
            className="bg-secondary/30 border-border font-mono text-sm h-9 flex-1 min-w-48"
            maxLength={21}
            onKeyDown={(e) => e.key === "Enter" && handleMonitor()}
          />
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-9"
            onClick={handleMonitor}
            disabled={isSubscribed}
          >
            <Search className="w-3.5 h-3.5 mr-1.5" />
            {isSubscribed ? "Monitoring..." : "Start Live Monitor"}
          </Button>
          {activeBpan && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-border h-9 text-xs"
                onClick={handleStop}
              >
                Stop
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-border h-9 text-xs"
                disabled={simulateMutation.isPending}
                onClick={() => {
                  if (latest?.batteryId) {
                    simulateMutation.mutate({ bpan: activeBpan, batteryId: latest.batteryId, cycles: 5 });
                  } else {
                    toast.info("Waiting for first reading to get battery ID...");
                  }
                }}
              >
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                {simulateMutation.isPending ? "Injecting..." : "Inject tRPC Reading"}
              </Button>
            </>
          )}
        </div>
        {activeBpan && (
          <div className="mt-3 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connectionState === "connected" ? "bg-primary animate-ping" : "bg-muted-foreground"}`} />
            <span className="font-mono text-[10px] text-muted-foreground">
              {connectionState === "connected"
                ? `Receiving live readings every 2s · ${history.length} readings in buffer`
                : "Connecting to telemetry stream..."}
            </span>
          </div>
        )}
      </div>

      {/* Live Metric Cards */}
      {activeBpan && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Pack Voltage"
            value={latest ? latest.vPack.toFixed(1) : "—"}
            unit="V"
            icon={Zap}
            flash
          />
          <MetricCard
            label="Pack Current"
            value={latest ? latest.iPack.toFixed(1) : "—"}
            unit="A"
            icon={Activity}
            sub={latest ? (latest.iPack > 0 ? "↑ Charging" : "↓ Discharging") : undefined}
            flash
          />
          <MetricCard
            label="Max Temperature"
            value={latest ? latest.tMax.toFixed(1) : "—"}
            unit="°C"
            icon={Thermometer}
            warn={!!latest && latest.tMax > 51}
            sub={latest?.tMax && latest.tMax > 51 ? "⚠ THERMAL ANOMALY" : latest ? "Normal range" : undefined}
            flash
          />
          <MetricCard
            label="State of Health"
            value={latest ? latest.sohEstimate.toFixed(1) : "—"}
            unit="%"
            icon={Battery}
            warn={!!latest && latest.sohEstimate < 50}
            sub={latest ? `Cycle ${latest.cycleCount}` : undefined}
            flash
          />
          <MetricCard
            label="Internal Resistance"
            value={latest ? latest.irPack.toFixed(2) : "—"}
            unit="mΩ"
            icon={Gauge}
            flash
          />
          <MetricCard
            label="Cell V Min"
            value={latest ? latest.vMin.toFixed(3) : "—"}
            unit="V"
            icon={Zap}
            flash
          />
          <MetricCard
            label="Cell V Max"
            value={latest ? latest.vMax.toFixed(3) : "—"}
            unit="V"
            icon={Zap}
            flash
          />
          <MetricCard
            label="Pack Temp"
            value={latest ? latest.tPack.toFixed(1) : "—"}
            unit="°C"
            icon={Thermometer}
            flash
          />
        </div>
      )}

      {/* No battery selected placeholder */}
      {!activeBpan && (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Radio className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm font-medium">Enter a BPAN above to start live monitoring</p>
          <p className="text-muted-foreground/60 text-xs mt-1 font-mono">
            WebSocket stream · 2s update interval · Auto-reconnect
          </p>
        </div>
      )}

      {/* Live Charts */}
      {activeBpan && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Temperature Chart */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold flex items-center gap-2">
                  <Thermometer className="w-3.5 h-3.5 text-destructive" /> Temperature
                </h3>
                <p className="font-mono text-[9px] text-muted-foreground mt-0.5">Live · last {chartData.length} readings</p>
              </div>
              {latest && latest.tMax > 51 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[9px] animate-pulse">
                  ⚠ ANOMALY
                </Badge>
              )}
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.06)" />
                  <XAxis dataKey="t" tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} label={{ value: "readings", position: "insideBottomRight", offset: -5, fill: "#7fa99a", fontSize: 9 }} />
                  <YAxis tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} unit="°C" />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={51} stroke="#ff4d6d" strokeDasharray="4 4" strokeWidth={1} label={{ value: "51°C limit", fill: "#ff4d6d", fontSize: 9, fontFamily: "DM Mono" }} />
                  <Line type="monotone" dataKey="tMax" stroke="#ff4d6d" strokeWidth={2} dot={false} name="T_max °C" isAnimationActive={false} />
                  <Line type="monotone" dataKey="tPack" stroke="#ffb347" strokeWidth={1.5} dot={false} name="T_pack °C" isAnimationActive={false} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SOH Chart */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display text-sm font-bold flex items-center gap-2">
                <Battery className="w-3.5 h-3.5 text-primary" /> State of Health
              </h3>
              <p className="font-mono text-[9px] text-muted-foreground mt-0.5">Live · last {chartData.length} readings</p>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.06)" />
                  <XAxis dataKey="t" tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={70} stroke="#ffb347" strokeDasharray="4 4" strokeWidth={1} />
                  <ReferenceLine y={50} stroke="#ff4d6d" strokeDasharray="4 4" strokeWidth={1} />
                  <Line type="monotone" dataKey="soh" stroke="#00c8a0" strokeWidth={2} dot={false} name="SOH %" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pack Voltage Chart */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display text-sm font-bold flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-chart-2" /> Pack Voltage
              </h3>
              <p className="font-mono text-[9px] text-muted-foreground mt-0.5">Live · last {chartData.length} readings</p>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.06)" />
                  <XAxis dataKey="t" tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} unit="V" />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="vPack" stroke="#4fc3f7" strokeWidth={2} dot={false} name="V_pack V" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Internal Resistance Chart */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display text-sm font-bold flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-chart-3" /> Internal Resistance
              </h3>
              <p className="font-mono text-[9px] text-muted-foreground mt-0.5">Live · degradation indicator</p>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.06)" />
                  <XAxis dataKey="t" tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} unit="mΩ" />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="irPack" stroke="#a78bfa" strokeWidth={2} dot={false} name="IR mΩ" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Anomalies Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Thermal Anomalies
            </h3>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
              Batteries exceeding 51°C · Live events + historical DB records
            </p>
          </div>
          <div className="flex items-center gap-2">
            {liveAnomalies.length > 0 && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[9px] animate-pulse">
                {liveAnomalies.length} live
              </Badge>
            )}
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[9px]">
              {allAnomalies.length} total
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetchAnomalies()} className="border-border h-7 w-7 p-0">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["", "BPAN", "Max Temp", "Pack Temp", "Cycle", "Source", "Time"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anomaliesLoading && allAnomalies.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary/50 rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : allAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No thermal anomalies detected. System operating normally.
                  </td>
                </tr>
              ) : (
                allAnomalies.map((t) => (
                  <tr key={t.id} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${t.isLive ? "bg-destructive/5" : ""}`}>
                    <td className="px-4 py-3">
                      {t.isLive && <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block animate-ping" />}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-primary">{t.bpan}</td>
                    <td className="px-4 py-3 font-mono text-xs text-destructive font-bold">{Number(t.tMax ?? 0).toFixed(1)}°C</td>
                    <td className="px-4 py-3 font-mono text-xs">{Number(t.tPack ?? 0).toFixed(1)}°C</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.cycleCount ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`font-mono text-[9px] ${t.isLive ? "bg-destructive/10 text-destructive border-destructive/20" : "border-border"}`}>
                        {t.isLive ? "LIVE" : t.source}
                      </Badge>
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
