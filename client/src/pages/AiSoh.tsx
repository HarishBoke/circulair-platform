import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, Search, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

const TRIAGE_INFO = {
  direct_reuse: { label: "Direct Reuse", color: "text-primary", bg: "bg-primary/10 border-primary/20", icon: CheckCircle2, desc: "Uncalibrated reuse candidate label only; not approval for safety or second-life deployment." },
  module_repurposing: { label: "Module Repurposing", color: "text-chart-4", bg: "bg-chart-4/10 border-chart-4/20", icon: Zap, desc: "Uncalibrated repurposing candidate label only; qualification requires separate physical evidence and human approval." },
  material_recycling: { label: "Material Recycling", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", icon: AlertTriangle, desc: "Uncalibrated recycling review label only; no disposal instruction, approved facility or dispatch is established." },
};

export default function AiSoh() {
  usePageTitle("SOH Estimate Review");

  const [bpan, setBpan] = useState("");
  const [activeBpan, setActiveBpan] = useState("");

  const { data: batteryData, isLoading: batteryLoading, error: batteryError } = trpc.bpan.get.useQuery(
    { bpan: activeBpan },
    { enabled: !!activeBpan }
  );

  const utils = trpc.useUtils();
  const predictMutation = trpc.ai.predictSoh.useMutation({
    onSuccess: () => {
      toast.success("Heuristic estimate recorded; calibration unverified");
      utils.ai.predictionHistory.invalidate({ bpan: activeBpan });
      utils.bpan.get.invalidate({ bpan: activeBpan });
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: predHistory, error: historyError } = trpc.ai.predictionHistory.useQuery(
    { bpan: activeBpan, limit: 10 },
    { enabled: !!activeBpan }
  );

  const handleSearch = () => {
    if (!bpan.trim()) { toast.error("Enter an existing battery identifier"); return; }
    setActiveBpan(bpan.trim());
  };

  const handlePredict = () => {
    if (!activeBpan || !batteryData?.battery) return;
    predictMutation.mutate({ bpan: activeBpan, batteryId: batteryData.battery.id });
  };

  const latestPred = batteryData?.latestSoh ?? (predHistory?.[0]);
  const battery = batteryData?.battery;
  const rawSoh = latestPred?.predictedSoh ?? battery?.currentSoh;
  const soh = rawSoh == null || !Number.isFinite(Number(rawSoh)) ? null : Number(rawSoh);
  const triage = latestPred?.triagePath as keyof typeof TRIAGE_INFO | null;
  const triageInfo = triage ? TRIAGE_INFO[triage] : null;

  const formatMetric = (value: unknown, digits = 1, suffix = "") => value == null || !Number.isFinite(Number(value)) ? "Unknown" : `${Number(value).toFixed(digits)}${suffix}`;
  const radarData = soh == null ? [] : [{ metric: "SOH estimate (uncalibrated)", value: soh }];

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">SOH Estimate Review</h1>
          <p className="text-muted-foreground text-sm mt-1">Deterministic physics-based heuristics · State of Health & Remaining Useful Life estimates</p>
        </div>
        <Badge variant="outline" className="font-mono text-[9px] border-primary/30 text-primary">Uncalibrated · accuracy unknown</Badge>
      </div>

      <p role="note" className="text-sm text-amber-300">All numerical estimates, legacy confidence/error metadata and suggested actions are uncalibrated. They are not approved safety, second-life or recycling decisions. Qualified inspection and manufacturer limits are required; the app does not control batteries or dispatch carriers.</p>
      {batteryError && <p role="alert" className="text-sm text-destructive">Battery data unavailable: {batteryError.message}</p>}
      {historyError && <p role="alert" className="text-sm text-destructive">Estimate history unavailable: {historyError.message}</p>}
      {activeBpan && !batteryLoading && !batteryError && !battery && <p className="text-sm">No battery record returned for this identifier.</p>}
      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Battery Analysis</div>
        <div className="flex gap-3">
          <Input
            placeholder="Enter an existing battery identifier..."
            value={bpan}
            onChange={(e) => setBpan(e.target.value.toUpperCase())}
            className="bg-secondary/30 border-border font-mono text-sm h-9 flex-1"
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
              {predictMutation.isPending ? "Estimating..." : "Run Estimate"}
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
                    stroke={(soh ?? -1) > 75 ? "#00c8a0" : (soh ?? -1) > 50 ? "#ffb347" : "#ff4d6d"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(soh == null ? 0 : Math.max(0, Math.min(100, soh))) * 2.51} 251`}
                  />
                </svg>
                <div className="absolute text-center">
                  <div className={`font-display text-3xl font-bold ${(soh ?? -1) > 75 ? "text-primary" : (soh ?? -1) > 50 ? "text-chart-4" : "text-destructive"}`}>
                    {formatMetric(soh, 1, "%")}
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground">SOH</div>
                </div>
              </div>
              {triageInfo && (
                <div className={`mt-4 px-3 py-2 rounded-lg border text-center ${triageInfo.bg}`}>
                  <div className={`font-mono text-[10px] font-bold uppercase tracking-widest ${triageInfo.color}`}>
                    {triageInfo.label} candidate — not approved
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
                    { label: "SOH estimate (uncalibrated)", value: formatMetric(latestPred.predictedSoh, 2, "%") },
                    { label: "RUL estimate (uncalibrated cycles)", value: formatMetric(latestPred.rulCycles, 0) },
                    { label: "Legacy confidence (uncalibrated)", value: formatMetric(latestPred.confidence, 1, "%") },
                    { label: "Legacy error metadata (not validation RMSE)", value: formatMetric(latestPred.rmse, 5) },
                    { label: "Candidate label (not approved)", value: latestPred.triagePath?.replace(/_/g, " ") ?? "Unknown" },
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
                  <p className="text-muted-foreground text-xs">Click "Run Estimate" to analyze this battery</p>
                </div>
              )}
            </div>

            {/* Radar Chart */}
            {radarData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">SOH estimate only (uncalibrated)</div>
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
                  <div className={`font-display text-sm font-bold ${triageInfo.color} mb-1`}>{triageInfo.label} candidate — not approved</div>
                  <p className="text-sm text-foreground/80">{triageInfo.desc}</p>
                  {latestPred?.triageReason && (
                    <p className="text-xs text-muted-foreground mt-2">{latestPred.triageReason}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Uncalibrated Maintenance Suggestions — not instructions */}
          {Array.isArray(latestPred?.maintenanceRecommendations) && (latestPred!.maintenanceRecommendations as string[]).length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Uncalibrated Maintenance Suggestions — not instructions</div>
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
                      {["SOH estimate %", "RUL estimate cycles", "Legacy confidence (uncalibrated)", "Legacy error (not validation RMSE)", "Candidate label", "Date"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {predHistory.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{formatMetric(p.predictedSoh, 2, "%")}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMetric(p.rulCycles, 0)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMetric(p.confidence, 1, "%")}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMetric(p.rmse, 5)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-[9px] capitalize ${
                            p.triagePath === "direct_reuse" ? "text-primary" :
                            p.triagePath === "module_repurposing" ? "text-chart-4" : "text-destructive"
                          }`}>{p.triagePath?.replace(/_/g, " ") ?? "Unknown"}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {p.predictedAt && Number.isFinite(new Date(p.predictedAt).getTime()) ? new Date(p.predictedAt).toLocaleString() : "Unknown"}
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
          <h3 className="font-display text-lg font-bold mb-2">Battery Estimate Review</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Enter an existing identifier to load authorized battery records and review uncalibrated heuristic estimates. Candidate labels are not qualified disposition decisions.
          </p>
        </div>
      )}
    </div>
  );
}
