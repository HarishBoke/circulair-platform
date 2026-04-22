import { useParams, Link } from "wouter";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Brain, Truck, ShoppingCart, QrCode, Activity, Thermometer,
  Zap, RefreshCw, FileDown, Leaf, Recycle, Wifi, WifiOff, Loader2,
  Database, Clock, AlertTriangle, Play, Square, Shield,
} from "lucide-react";
import CarbonFootprintForm from "@/components/CarbonFootprintForm";
import RecycledContentForm from "@/components/RecycledContentForm";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area,
} from "recharts";
import { useTelemetrySocket } from "@/hooks/useTelemetrySocket";
import { useState, useMemo } from "react";

const STATUS_STYLES: Record<string, string> = {
  operational: "bg-primary/10 text-primary border-primary/20",
  second_life: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  end_of_life: "bg-destructive/10 text-destructive border-destructive/20",
  in_transit: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  recycling: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

const TRIAGE_COLORS: Record<string, string> = {
  direct_reuse: "text-primary",
  module_repurposing: "text-chart-4",
  material_recycling: "text-destructive",
};

function ConnectionBadge({ state }: { state: string }) {
  const cfg = ({
    connected: { icon: Wifi, label: "LIVE", cls: "bg-primary/10 text-primary border-primary/30 animate-pulse" },
    connecting: { icon: Loader2, label: "CONNECTING", cls: "bg-chart-4/10 text-chart-4 border-chart-4/30" },
    disconnected: { icon: WifiOff, label: "OFFLINE", cls: "bg-muted/10 text-muted-foreground border-border" },
    error: { icon: WifiOff, label: "ERROR", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  } as Record<string, { icon: React.ElementType; label: string; cls: string }>)[state] ?? { icon: WifiOff, label: "OFFLINE", cls: "bg-muted/10 text-muted-foreground border-border" };
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`font-mono text-[9px] tracking-widest flex items-center gap-1.5 px-2.5 py-1 ${cfg.cls}`}>
      <Icon className={`w-2.5 h-2.5 ${state === "connecting" ? "animate-spin" : ""}`} />
      {cfg.label}
    </Badge>
  );
}

function LiveMetric({ label, value, unit, icon: Icon, warn }: {
  label: string; value: string | number; unit?: string; icon: React.ElementType; warn?: boolean;
}) {
  return (
    <div className={`bg-card border rounded-xl p-4 transition-all duration-300 ${warn ? "border-destructive/40 shadow-[0_0_12px_rgba(255,77,109,0.12)]" : "border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{label}</span>
        <Icon className={`w-4 h-4 ${warn ? "text-destructive" : "text-primary"} opacity-70`} />
      </div>
      <div className={`font-display text-2xl font-bold tabular-nums ${warn ? "text-destructive" : "text-foreground"}`}>
        {value}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a1628] border border-primary/20 rounded-lg p-2.5 font-mono text-[10px]">
      <div className="text-muted-foreground mb-1">#{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}</div>
      ))}
    </div>
  );
}

export default function BpanDetail() {
  usePageTitle("Battery Details");
  const params = useParams<{ bpan: string }>();
  const bpan = params.bpan ?? "";
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [historyPage, setHistoryPage] = useState(0);
  const HISTORY_PAGE_SIZE = 20;

  const { data, isLoading, refetch } = trpc.bpan.get.useQuery({ bpan }, { enabled: !!bpan });
  const { data: telemetryHistory, refetch: refetchHistory } = trpc.telemetry.history.useQuery(
    { bpan, limit: 200 },
    { enabled: !!bpan, refetchInterval: 10000 }
  );

  const predictMutation = trpc.ai.predictSoh.useMutation({
    onSuccess: () => { toast.success("AI prediction completed!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const simulateMutation = trpc.telemetry.simulate.useMutation({
    onSuccess: (d) => {
      toast.success(`Simulated ${d.records} telemetry records`);
      refetch();
      refetchHistory();
    },
    onError: (e) => toast.error(e.message),
  });
  const complianceCertMutation = trpc.pdf.batteryComplianceCert.useMutation({
    onSuccess: (d) => {
      toast.success("Compliance Certificate ready!", { description: "Opening in new tab..." });
      window.open(d.url, "_blank");
    },
    onError: (e) => toast.error("Certificate generation failed", { description: e.message }),
  });
  const pdfMutation = trpc.pdf.healthPassport.useMutation({
    onSuccess: (d) => {
      toast.success("Health Passport PDF ready!", { description: "Opening in new tab..." });
      window.open(d.url, "_blank");
    },
    onError: (e) => toast.error("PDF generation failed", { description: e.message }),
  });

  // Live Socket.io stream — auto-starts simulation when subscribed
  const { latest, history: liveHistory, connectionState, anomalies } = useTelemetrySocket(liveEnabled ? bpan : null);

  const voltageChartData = useMemo(() =>
    liveHistory.map((r, i) => ({ idx: i + 1, vPack: r.vPack, vMin: r.vMin, vMax: r.vMax })),
    [liveHistory]
  );
  const tempChartData = useMemo(() =>
    liveHistory.map((r, i) => ({ idx: i + 1, tPack: r.tPack, tMax: r.tMax })),
    [liveHistory]
  );
  const sohLiveChartData = useMemo(() =>
    liveHistory.map((r, i) => ({ idx: i + 1, soh: r.sohEstimate })),
    [liveHistory]
  );
  const currentChartData = useMemo(() =>
    liveHistory.map((r, i) => ({ idx: i + 1, iPack: r.iPack })),
    [liveHistory]
  );

  const historyRows = telemetryHistory ?? [];
  const totalPages = Math.ceil(historyRows.length / HISTORY_PAGE_SIZE);
  const pagedRows = historyRows.slice(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-fade-up">
        <div className="h-8 bg-secondary/50 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data?.battery) {
    return (
      <div className="p-6 text-center py-20">
        <QrCode className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="font-display text-xl font-bold mb-2">Battery Not Found</h2>
        <p className="text-muted-foreground text-sm mb-6">BPAN <span className="font-mono text-primary">{bpan}</span> is not registered.</p>
        <Link href="/batteries"><Button variant="outline" className="border-border">Back to Registry</Button></Link>
      </div>
    );
  }

  const { battery, latestTelemetry, latestSoh, sohHistory } = data;
  const displayTelemetry = latest ?? latestTelemetry;
  const soh = Number(latestSoh?.predictedSoh ?? battery.currentSoh ?? 100);
  const sohColor = soh > 75 ? "text-primary" : soh > 50 ? "text-chart-4" : "text-destructive";
  const sohChartData = (sohHistory ?? []).map((h, i) => ({ idx: i + 1, soh: Number(h.predictedSoh) })).reverse();

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/batteries">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl font-bold font-mono">{bpan}</h1>
              <Badge variant="outline" className={`font-mono text-[9px] capitalize ${STATUS_STYLES[battery.status] ?? ""}`}>
                {battery.status.replace("_", " ")}
              </Badge>
              <ConnectionBadge state={connectionState} />
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">{battery.chemistry} · {battery.capacityKwh} kWh · {battery.voltageV}V · {battery.cellOriginCountry}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border h-8">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm" variant="outline"
            className={`border-border h-8 text-xs ${liveEnabled ? "border-primary/40 text-primary" : ""}`}
            onClick={() => setLiveEnabled((v) => !v)}
          >
            {liveEnabled ? <><Square className="w-3 h-3 mr-1.5 fill-current" /> Stop Live</> : <><Play className="w-3 h-3 mr-1.5" /> Start Live</>}
          </Button>
          <Button
            size="sm" variant="outline"
            className="border-border h-8 text-xs"
            disabled={simulateMutation.isPending}
            onClick={() => simulateMutation.mutate({ bpan, batteryId: battery.id, cycles: 10 })}
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            {simulateMutation.isPending ? "Simulating..." : "Simulate (10 pts)"}
          </Button>
          <Button
            size="sm" variant="outline"
            className="border-border h-8 text-xs"
            disabled={pdfMutation.isPending}
            onClick={() => pdfMutation.mutate({ bpan })}
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            {pdfMutation.isPending ? "Generating..." : "Health Passport"}
          </Button>
          <Button
            size="sm" variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 h-8 text-xs"
            disabled={complianceCertMutation.isPending}
            onClick={() => complianceCertMutation.mutate({ bpan })}
          >
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            {complianceCertMutation.isPending ? "Generating..." : "Compliance Cert"}
          </Button>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs"
            disabled={predictMutation.isPending}
            onClick={() => predictMutation.mutate({ bpan, batteryId: battery.id })}
          >
            <Brain className="w-3.5 h-3.5 mr-1.5" />
            {predictMutation.isPending ? "Predicting..." : "Run AI Prediction"}
          </Button>
        </div>
      </div>

      {/* Thermal anomaly banner */}
      {(displayTelemetry?.thermalAnomaly || anomalies.length > 0) && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <div>
            <span className="font-mono text-xs font-bold text-destructive">THERMAL ANOMALY DETECTED</span>
            <span className="font-mono text-xs text-destructive/80 ml-2">
              T_max = {Number(displayTelemetry?.tMax ?? (anomalies[0] as { tMax?: number } | undefined)?.tMax ?? 0).toFixed(1)}°C — exceeds 51°C safety threshold
            </span>
          </div>
        </div>
      )}

      {/* SOH + Identity + Latest Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* SOH Gauge */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center justify-center">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">State of Health</div>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,200,160,0.1)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={soh > 75 ? "#00c8a0" : soh > 50 ? "#ffb347" : "#ff4d6d"} // eslint-disable-line
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${soh * 2.51} 251`}
              />
            </svg>
            <div className="absolute text-center">
              <div className={`font-display text-2xl font-bold ${sohColor}`}>{soh.toFixed(1)}%</div>
              <div className="font-mono text-[9px] text-muted-foreground">SOH</div>
            </div>
          </div>
          {latestSoh && (
            <div className="mt-3 text-center">
              <div className={`font-mono text-xs font-bold ${TRIAGE_COLORS[latestSoh.triagePath ?? ""] ?? ""}`}>
                {(latestSoh.triagePath ?? "").replace(/_/g, " ").toUpperCase()}
              </div>
              <div className="font-mono text-[9px] text-muted-foreground mt-1">Confidence: {Number(latestSoh.confidence).toFixed(1)}%</div>
            </div>
          )}
        </div>

        {/* Battery Details */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Battery Identity</div>
          <div className="space-y-2.5">
            {[
              { label: "BPAN", value: bpan, mono: true },
              { label: "Chemistry", value: battery.chemistry },
              { label: "Capacity", value: `${battery.capacityKwh} kWh` },
              { label: "Voltage", value: `${battery.voltageV}V` },
              { label: "Cell Origin", value: battery.cellOriginCountry },
              { label: "Manufacturer ID", value: battery.manufacturerId },
              { label: "Mfg Date", value: `${battery.mfgYear}-${String(battery.mfgMonth).padStart(2, "0")}-${String(battery.mfgDay).padStart(2, "0")}` },
              { label: "Extinguisher", value: battery.extinguisherClass },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">{row.label}</span>
                <span className={`text-xs ${row.mono ? "font-mono text-primary" : "text-foreground"}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Latest / Live Telemetry Snapshot */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              {latest ? "Live Reading" : "Latest Telemetry"}
            </div>
            {displayTelemetry?.thermalAnomaly && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[9px]">
                THERMAL ALERT
              </Badge>
            )}
          </div>
          {displayTelemetry ? (
            <div className="space-y-2.5">
              {[
                { label: "Pack Voltage", value: `${Number(displayTelemetry.vPack ?? 0).toFixed(1)}V`, icon: Zap },
                { label: "Pack Current", value: `${Number(displayTelemetry.iPack ?? 0).toFixed(1)}A`, icon: Activity },
                { label: "Max Temp", value: `${Number(displayTelemetry.tMax ?? 0).toFixed(1)}°C`, icon: Thermometer, warn: Number(displayTelemetry.tMax ?? 0) > 51 },
                { label: "Cycle Count", value: String(displayTelemetry.cycleCount ?? 0), icon: RefreshCw },
                { label: "Int. Resistance", value: `${Number(displayTelemetry.irPack ?? 0).toFixed(2)}mΩ`, icon: Activity },
                { label: "BMS SOH", value: `${Number(displayTelemetry.sohEstimate ?? 0).toFixed(1)}%`, icon: Brain },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <row.icon className="w-3 h-3 text-muted-foreground/50" />
                    <span className="font-mono text-[10px] text-muted-foreground">{row.label}</span>
                  </div>
                  <span className={`font-mono text-xs ${row.warn ? "text-destructive font-bold" : "text-foreground"}`}>{row.value}</span>
                </div>
              ))}
              {latest && (
                <div className="pt-2 border-t border-border">
                  <span className="font-mono text-[9px] text-primary">● LIVE · {new Date(latest.recordedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-xs">No telemetry yet. Click "Start Live" or "Simulate" to generate data.</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Metric Cards */}
      {liveHistory.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <LiveMetric label="Pack Voltage" value={latest?.vPack.toFixed(1) ?? "—"} unit="V" icon={Zap} />
          <LiveMetric label="Pack Current" value={latest?.iPack.toFixed(1) ?? "—"} unit="A" icon={Activity} />
          <LiveMetric label="Max Temperature" value={latest?.tMax.toFixed(1) ?? "—"} unit="°C" icon={Thermometer} warn={(latest?.tMax ?? 0) > 51} />
          <LiveMetric label="BMS SOH" value={latest?.sohEstimate.toFixed(1) ?? "—"} unit="%" icon={Brain} />
        </div>
      )}

      {/* Live Charts */}
      {liveHistory.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
                Live Telemetry Stream
              </h3>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                Rolling 60-point window · 2s interval · {liveHistory.length} readings buffered
              </p>
            </div>
            <ConnectionBadge state={connectionState} />
          </div>
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Voltage */}
            <div>
              <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Pack Voltage (V)</div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={voltageChartData}>
                  <defs>
                    <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c8a0" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#00c8a0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.08)" />
                  <XAxis dataKey="idx" tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="vPack" name="vPack" stroke="#00c8a0" strokeWidth={2} fill="url(#vGrad)" dot={false} />
                  <Line type="monotone" dataKey="vMin" name="vMin" stroke="#7fa99a" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="vMax" name="vMax" stroke="#4ecdc4" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Temperature */}
            <div>
              <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Temperature (°C)</div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={tempChartData}>
                  <defs>
                    <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffb347" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ffb347" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,179,71,0.08)" />
                  <XAxis dataKey="idx" tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={51} stroke="#ff4d6d" strokeDasharray="4 2" label={{ value: "51°C", fill: "#ff4d6d", fontSize: 9, fontFamily: "DM Mono" }} />
                  <Area type="monotone" dataKey="tPack" name="tPack" stroke="#ffb347" strokeWidth={2} fill="url(#tGrad)" dot={false} />
                  <Line type="monotone" dataKey="tMax" name="tMax" stroke="#ff7f7f" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Current */}
            <div>
              <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Pack Current (A)</div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={currentChartData}>
                  <defs>
                    <linearGradient id="iGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c6af7" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#7c6af7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,106,247,0.08)" />
                  <XAxis dataKey="idx" tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                  <Area type="monotone" dataKey="iPack" name="iPack" stroke="#7c6af7" strokeWidth={2} fill="url(#iGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Live SOH */}
            <div>
              <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-2">BMS SOH Estimate (%)</div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={sohLiveChartData}>
                  <defs>
                    <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c8a0" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#00c8a0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.08)" />
                  <XAxis dataKey="idx" tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={75} stroke="#00c8a0" strokeDasharray="4 2" label={{ value: "75%", fill: "#00c8a0", fontSize: 9, fontFamily: "DM Mono" }} />
                  <ReferenceLine y={50} stroke="#ffb347" strokeDasharray="4 2" label={{ value: "50%", fill: "#ffb347", fontSize: 9, fontFamily: "DM Mono" }} />
                  <Area type="monotone" dataKey="soh" name="SOH" stroke="#00c8a0" strokeWidth={2} fill="url(#sGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Waiting for live stream */}
      {liveEnabled && liveHistory.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Loader2 className="w-8 h-8 text-primary/40 mx-auto mb-3 animate-spin" />
          <p className="font-mono text-xs text-muted-foreground">Waiting for live telemetry stream…</p>
          <p className="font-mono text-[10px] text-muted-foreground/60 mt-1">The simulator starts automatically when connected. Or click "Simulate (10 pts)" for instant data.</p>
        </div>
      )}

      {/* SOH History Chart */}
      {sohChartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-sm font-bold">SOH Prediction History</h3>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">AI model predictions over time</p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={sohChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,160,0.08)" />
                <XAxis dataKey="idx" tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#7fa99a", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,200,160,0.2)", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "11px" }} />
                <Line type="monotone" dataKey="soh" stroke="#00c8a0" strokeWidth={2} dot={{ fill: "#00c8a0", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Telemetry History Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-display text-sm font-bold">Telemetry History</h3>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
              {historyRows.length} readings stored · auto-refreshes every 10s
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-border h-7 text-xs" onClick={() => refetchHistory()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>
        {historyRows.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-xs">No telemetry readings yet. Start the live stream or simulate data.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    {["Time", "vPack (V)", "iPack (A)", "tPack (°C)", "tMax (°C)", "Cycles", "SOH (%)", "Source", "Anomaly"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[9px] text-muted-foreground uppercase tracking-widest font-normal whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => {
                    const isAnomaly = row.thermalAnomaly;
                    return (
                      <tr key={row.id} className={`border-b border-border/50 hover:bg-secondary/10 transition-colors ${isAnomaly ? "bg-destructive/5" : ""}`}>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 opacity-40" />
                            {new Date(row.recordedAt).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{Number(row.vPack ?? 0).toFixed(1)}</td>
                        <td className="px-4 py-2.5 text-foreground">{Number(row.iPack ?? 0).toFixed(1)}</td>
                        <td className="px-4 py-2.5 text-foreground">{Number(row.tPack ?? 0).toFixed(1)}</td>
                        <td className={`px-4 py-2.5 font-bold ${isAnomaly ? "text-destructive" : "text-foreground"}`}>
                          {Number(row.tMax ?? 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{row.cycleCount ?? "—"}</td>
                        <td className="px-4 py-2.5 text-primary">{Number(row.sohEstimate ?? 0).toFixed(1)}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="font-mono text-[8px] px-1.5 py-0.5 border-border text-muted-foreground capitalize">
                            {row.source ?? "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          {isAnomaly && (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[8px] px-1.5 py-0.5">
                              <AlertTriangle className="w-2.5 h-2.5 mr-1" />THERMAL
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">
                  Page {historyPage + 1} of {totalPages} · {historyRows.length} total readings
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs border-border" disabled={historyPage === 0} onClick={() => setHistoryPage((p) => p - 1)}>
                    ← Prev
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs border-border" disabled={historyPage >= totalPages - 1} onClick={() => setHistoryPage((p) => p + 1)}>
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* AI Prediction Details */}
      {latestSoh && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">AI Prediction Details</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Predicted SOH", value: `${Number(latestSoh.predictedSoh).toFixed(2)}%` },
              { label: "RUL (Cycles)", value: String(latestSoh.rulCycles ?? "—") },
              { label: "Model Confidence", value: `${Number(latestSoh.confidence).toFixed(1)}%` },
              { label: "RMSE", value: `${Number(latestSoh.rmse ?? 0).toFixed(4)}` },
            ].map((m) => (
              <div key={m.label} className="bg-secondary/30 rounded-lg p-3">
                <div className="font-mono text-[9px] text-muted-foreground mb-1">{m.label}</div>
                <div className="font-display text-lg font-bold text-primary">{m.value}</div>
              </div>
            ))}
          </div>
          {Array.isArray(latestSoh.maintenanceRecommendations) && (latestSoh.maintenanceRecommendations as string[]).length > 0 && (
            <div>
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Maintenance Recommendations</div>
              <div className="space-y-1.5">
                {((latestSoh.maintenanceRecommendations ?? []) as string[]).map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-primary mt-0.5">→</span>
                    <span className="text-xs text-foreground/80">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Carbon Footprint Declaration */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display text-sm font-bold">Carbon Footprint Declaration</h3>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
            EU Battery Regulation 2023/1542 - Lifecycle CO₂e per kWh · A–E Performance Class
          </p>
        </div>
        <div className="p-5">
          <CarbonFootprintForm
            bpan={bpan}
            batteryId={battery.id}
            capacityKwh={Number(battery.capacityKwh)}
            chemistry={battery.chemistry}
          />
        </div>
      </div>

      {/* Recycled Content Declaration */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Recycle className="w-4 h-4 text-teal-400" />
            <h3 className="font-display text-sm font-bold">Recycled Content Declaration</h3>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
            EU Battery Regulation Art. 8 - Co, Li, Ni, Pb recycled content · 2031 & 2036 targets
          </p>
        </div>
        <div className="p-5">
          <RecycledContentForm bpan={bpan} batteryId={battery.id} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/logistics">
          <Button variant="outline" size="sm" className="border-border text-xs">
            <Truck className="w-3.5 h-3.5 mr-1.5" /> Request Pickup
          </Button>
        </Link>
        <Link href="/marketplace">
          <Button variant="outline" size="sm" className="border-border text-xs">
            <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> List on Marketplace
          </Button>
        </Link>
        <Link href="/epr-compliance">
          <Button variant="outline" size="sm" className="border-border text-xs">
            <Brain className="w-3.5 h-3.5 mr-1.5" /> Submit EPR Token
          </Button>
        </Link>
      </div>
    </div>
  );
}
