import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, Search, Zap, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

const TRIAGE_INFO = {
  direct_reuse: { label: "Direct Reuse", color: "text-primary", bg: "bg-primary/10 border-primary/20", icon: CheckCircle2, desc: "SOH > 75% - Battery suitable for direct second-life deployment in BESS or EV applications." },
  module_repurposing: { label: "Module Repurposing", color: "text-chart-4", bg: "bg-chart-4/10 border-chart-4/20", icon: Zap, desc: "SOH 50-75% - Individual modules can be repurposed for lower-demand stationary storage." },
  material_recycling: { label: "Material Recycling", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", icon: AlertTriangle, desc: "SOH < 50% - Battery should be routed to certified recycler for Black Mass extraction." },
};

export default function AiSoh() {
  usePageTitle("AI SOH Prediction");

  const [bpan, setBpan] = useState("");
  const [batteryId, setBatteryId] = useState<number | null>(null);
  const [activeBpan, setActiveBpan] = useState("");

  const { data: batteryData, isLoading: batteryLoading } = trpc.bpan.get.useQuery(
    { bpan: activeBpan },
    { enabled: !!activeBpan }
  );

  const predictMutation = trpc.ai.predictSoh.useMutation({
    onSuccess: () => { toast.success("AI prediction completed!"); },
    onError: (e) => toast.error(e.message),
  });

  const { data: predHistory } = trpc.ai.predictionHistory.useQuery(
    { bpan: activeBpan, limit: 10 },
    { enabled: !!activeBpan }
  );

  const handleSearch = () => {
    if (bpan.length !== 19) { toast.error("BPAN must be 19 characters"); return; }
    setActiveBpan(bpan);
  };

  const handlePredict = () => {
    if (!activeBpan || !batteryData?.battery) return;
    predictMutation.mutate({ bpan: activeBpan, batteryId: batteryData.battery.id });
  };

  const latestPred = batteryData?.latestSoh ?? (predHistory?.[0]);
  const battery = batteryData?.battery;
  const soh = Number(latestPred?.predictedSoh ?? battery?.currentSoh ?? 0);
  const triage = latestPred?.triagePath as keyof typeof TRIAGE_INFO | null;
  const triageInfo = triage ? TRIAGE_INFO[triage] : null;

  const radarData = latestPred ? [
    { metric: "SOH", value: soh },
    { metric: "Confidence", value: Number(latestPred.confidence ?? 0) },
    { metric: "RUL Score", value: Math.min(100, ((latestPred.rulCycles ?? 0) / 1000) * 100) },
    { metric: "Accuracy", value: Math.max(0, 100 - (Number(latestPred.rmse ?? 0) * 1000)) },
    { metric: "Reliability", value: soh > 75 ? 90 : soh > 50 ? 65 : 35 },
  ] : [];

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">AI SOH Prediction</h1>
          <p className="text-muted-foreground text-sm mt-1">CNN-LSTM model · State of Health & Remaining Useful Life estimation</p>
        </div>
        <Badge variant="outline" className="font-mono text-[9px] border-primary/30 text-primary">CNN-LSTM v3.2.1 · RMSE &lt;2%</Badge>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Battery Analysis</div>
        <div className="flex gap-3">
          <Input
            placeholder="Enter 19-character BPAN..."
            value={bpan}
            onChange={(e) => setBpan(e.target.value.toUpperCase())}
            className="bg-secondary/30 border-border font-mono text-sm h-9 flex-1"
            maxLength={19}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-9" onClick={handleSearch}>
            <Search className="w-3.5 h-3.5 mr-1.5" /> Load Battery
          </Button>
          {activeBpan && battery && (
            <Button
              size="sm"
              className="bg-chart-2/20 text-chart-2 hover:bg-chart-2/30 border border-chart-2/30 h-9 text-xs"
              disabled={predictMutation.isPending}
              onClick={handlePredict}
            >
              <Brain className="w-3.5 h-3.5 mr-1.5" />
              {predictMutation.isPending ? "Running AI..." : "Run Prediction"}
            </Button>
          )}
        </div>
      </div>

      {batteryLoading && activeBpan && (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      )}

      {battery && (
        <>
          {/* Prediction Results */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* SOH Gauge */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">State of Health</div>
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,200,160,0.1)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={soh > 75 ? "#00c8a0" : soh > 50 ? "#ffb347" : "#ff4d6d"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${soh * 2.51} 251`}
                  />
                </svg>
                <div className="absolute text-center">
                  <div className={`font-display text-3xl font-bold ${soh > 75 ? "text-primary" : soh > 50 ? "text-chart-4" : "text-destructive"}`}>
                    {soh.toFixed(1)}%
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground">SOH</div>
                </div>
              </div>
              {triageInfo && (
                <div className={`mt-4 px-3 py-2 rounded-lg border text-center ${triageInfo.bg}`}>
                  <div className={`font-mono text-[10px] font-bold uppercase tracking-widest ${triageInfo.color}`}>
                    {triageInfo.label}
                  </div>
                </div>
              )}
            </div>

            {/* Key Metrics */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Prediction Metrics</div>
              {latestPred ? (
                <div className="space-y-3">
                  {[
                    { label: "Predicted SOH", value: `${Number(latestPred.predictedSoh).toFixed(2)}%` },
                    { label: "RUL (Cycles)", value: String(latestPred.rulCycles ?? "—") },
                    { label: "Model Confidence", value: `${Number(latestPred.confidence).toFixed(1)}%` },
                    { label: "RMSE", value: Number(latestPred.rmse ?? 0).toFixed(5) },
                    { label: "Triage Path", value: (latestPred.triagePath ?? "").replace(/_/g, " ") },
                    { label: "Battery", value: `${battery.chemistry} · ${battery.capacityKwh} kWh` },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground">{m.label}</span>
                      <span className="font-mono text-xs text-foreground capitalize">{m.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-xs">Click "Run Prediction" to analyze this battery</p>
                </div>
              )}
            </div>

            {/* Radar Chart */}
            {radarData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Health Radar</div>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(0,200,160,0.15)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "#7fa99a", fontSize: 9, fontFamily: "DM Mono" }} />
                    <Radar dataKey="value" stroke="#00c8a0" fill="#00c8a0" fillOpacity={0.2} />
                    <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,200,160,0.2)", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "11px" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Triage Details */}
          {triageInfo && (
            <div className={`bg-card border rounded-xl p-5 ${triageInfo.bg}`}>
              <div className="flex items-start gap-3">
                <triageInfo.icon className={`w-5 h-5 ${triageInfo.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <div className={`font-display text-sm font-bold ${triageInfo.color} mb-1`}>{triageInfo.label}</div>
                  <p className="text-sm text-foreground/80">{triageInfo.desc}</p>
                  {latestPred?.triageReason && (
                    <p className="text-xs text-muted-foreground mt-2">{latestPred.triageReason}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Recommendations */}
          {Array.isArray(latestPred?.maintenanceRecommendations) && (latestPred!.maintenanceRecommendations as string[]).length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Maintenance Recommendations</div>
              <div className="space-y-2">
                {(latestPred!.maintenanceRecommendations as string[]).map((rec, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-[10px] text-primary mt-1 flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-sm text-foreground/80">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prediction History */}
          {predHistory && predHistory.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-display text-sm font-bold">Prediction History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      {["SOH %", "RUL Cycles", "Confidence", "RMSE", "Triage", "Date"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {predHistory.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{Number(p.predictedSoh).toFixed(2)}%</td>
                        <td className="px-4 py-3 font-mono text-xs">{p.rulCycles ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{Number(p.confidence).toFixed(1)}%</td>
                        <td className="px-4 py-3 font-mono text-xs">{Number(p.rmse ?? 0).toFixed(5)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-[9px] capitalize ${
                            p.triagePath === "direct_reuse" ? "text-primary" :
                            p.triagePath === "module_repurposing" ? "text-chart-4" : "text-destructive"
                          }`}>{(p.triagePath ?? "").replace(/_/g, " ")}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {new Date(p.predictedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!activeBpan && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-bold mb-2">AI Battery Analysis</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Enter a BPAN to load battery data and run the CNN-LSTM SOH prediction model. The AI will analyze telemetry patterns and provide triage routing recommendations.
          </p>
        </div>
      )}
    </div>
  );
}
