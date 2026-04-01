import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Brain, Truck, ShoppingCart, QrCode, Activity, Thermometer, Zap, RefreshCw, FileDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

export default function BpanDetail() {
  const params = useParams<{ bpan: string }>();
  const bpan = params.bpan ?? "";

  const { data, isLoading, refetch } = trpc.bpan.get.useQuery({ bpan }, { enabled: !!bpan });
  const predictMutation = trpc.ai.predictSoh.useMutation({
    onSuccess: () => { toast.success("AI prediction completed!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const simulateMutation = trpc.telemetry.simulate.useMutation({
    onSuccess: (d) => { toast.success(`Simulated ${d.records} telemetry records`); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const pdfMutation = trpc.pdf.healthPassport.useMutation({
    onSuccess: (d) => {
      toast.success("Health Passport PDF ready!", { description: "Opening in new tab..." });
      window.open(d.url, "_blank");
    },
    onError: (e) => toast.error("PDF generation failed", { description: e.message }),
  });

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
  const soh = Number(latestSoh?.predictedSoh ?? battery.currentSoh ?? 100);
  const sohColor = soh > 75 ? "text-primary" : soh > 50 ? "text-chart-4" : "text-destructive";

  const sohChartData = (sohHistory ?? []).map((h, i) => ({
    idx: i + 1,
    soh: Number(h.predictedSoh),
  })).reverse();

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/batteries">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold font-mono">{bpan}</h1>
              <Badge variant="outline" className={`font-mono text-[9px] capitalize ${STATUS_STYLES[battery.status] ?? ""}`}>
                {battery.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">{battery.chemistry} · {battery.capacityKwh} kWh · {battery.voltageV}V · {battery.cellOriginCountry}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border h-8">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-border h-8 text-xs"
            disabled={simulateMutation.isPending}
            onClick={() => simulateMutation.mutate({ bpan, batteryId: battery.id, cycles: 5 })}
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            {simulateMutation.isPending ? "Simulating..." : "Simulate Telemetry"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-border h-8 text-xs"
            disabled={pdfMutation.isPending}
            onClick={() => pdfMutation.mutate({ bpan })}
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            {pdfMutation.isPending ? "Generating PDF..." : "Health Passport"}
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

      {/* SOH + Triage */}
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

        {/* Latest Telemetry */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Latest Telemetry</div>
            {latestTelemetry?.thermalAnomaly && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[9px]">
                THERMAL ALERT
              </Badge>
            )}
          </div>
          {latestTelemetry ? (
            <div className="space-y-2.5">
              {[
                { label: "Pack Voltage", value: `${Number(latestTelemetry.vPack ?? 0).toFixed(1)}V`, icon: Zap },
                { label: "Pack Current", value: `${Number(latestTelemetry.iPack ?? 0).toFixed(1)}A`, icon: Activity },
                { label: "Max Temp", value: `${Number(latestTelemetry.tMax ?? 0).toFixed(1)}°C`, icon: Thermometer, warn: Number(latestTelemetry.tMax ?? 0) > 51 },
                { label: "Cycle Count", value: String(latestTelemetry.cycleCount ?? 0), icon: RefreshCw },
                { label: "Int. Resistance", value: `${Number(latestTelemetry.irPack ?? 0).toFixed(2)}mΩ`, icon: Activity },
                { label: "BMS SOH", value: `${Number(latestTelemetry.sohEstimate ?? 0).toFixed(1)}%`, icon: Brain },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <row.icon className="w-3 h-3 text-muted-foreground/50" />
                    <span className="font-mono text-[10px] text-muted-foreground">{row.label}</span>
                  </div>
                  <span className={`font-mono text-xs ${row.warn ? "text-destructive font-bold" : "text-foreground"}`}>{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-xs">No telemetry data. Click "Simulate Telemetry" to generate sample data.</p>
            </div>
          )}
        </div>
      </div>

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
