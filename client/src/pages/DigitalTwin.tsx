import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { Cpu, TrendingDown, Calendar, Zap, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default function DigitalTwin() {
  const [bpan, setBpan] = useState("");
  const [horizon, setHorizon] = useState(365);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateMutation = trpc.digitalTwin.generate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setIsLoading(false);
      toast.success("Digital twin generated", { description: `${data.scenarios?.nominal?.length ?? 0} trajectory points computed` });
    },
    onError: (err) => {
      setIsLoading(false);
      toast.error("Failed to generate twin", { description: err.message });
    },
  });

  const handleGenerate = () => {
    if (!bpan.trim() || bpan.length !== 21) {
      toast.error("Invalid BPAN", { description: "BPAN must be exactly 21 characters" });
      return;
    }
    setIsLoading(true);
    generateMutation.mutate({ bpan: bpan.trim(), forecastHorizonDays: horizon });
  };

  const nominalPoints = result?.scenarios?.nominal ?? [];
  const conservativePoints = result?.scenarios?.conservative ?? [];
  const aggressivePoints = result?.scenarios?.aggressive ?? [];
  const chartData = nominalPoints.map((p: any, i: number) => ({
    day: p.day,
    nominal: Number(p.predictedSoh.toFixed(1)),
    conservative: Number((conservativePoints[i]?.predictedSoh ?? p.predictedSoh).toFixed(1)),
    aggressive: Number((aggressivePoints[i]?.predictedSoh ?? p.predictedSoh).toFixed(1)),
  }));

  const getStatusColor = (status: string) => {
    if (status === "healthy") return "text-emerald-400";
    if (status === "degrading") return "text-amber-400";
    return "text-red-400";
  };

  const getStatusIcon = (status: string) => {
    if (status === "healthy") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (status === "degrading") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <AlertTriangle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-500/10">
          <Cpu className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Battery Digital Twin</h1>
          <p className="text-sm text-muted-foreground">Physics-informed trajectory simulation with confidence intervals</p>
        </div>
        <Badge variant="outline" className="ml-auto border-violet-500/30 text-violet-400 bg-violet-500/10">v2.0</Badge>
      </div>

      {/* Input Panel */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Configure Simulation</CardTitle>
          <CardDescription>Enter a BPAN and forecast horizon to generate a digital twin trajectory</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="bpan">Battery BPAN</Label>
              <Input
                id="bpan"
                placeholder="e.g. IND-A3F-2024A01-00001"
                value={bpan}
                onChange={(e) => setBpan(e.target.value)}
                className="font-mono"
                maxLength={21}
              />
              <p className="text-xs text-muted-foreground">{bpan.length}/21 characters</p>
            </div>
            <div className="space-y-2">
              <Label>Forecast Horizon: <span className="text-violet-400 font-semibold">{horizon} days ({Math.round(horizon / 365 * 10) / 10} years)</span></Label>
              <Slider
                min={30}
                max={1825}
                step={30}
                value={[horizon]}
                onValueChange={([v]) => setHorizon(v)}
                className="mt-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>30 days</span>
                <span>5 years</span>
              </div>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={isLoading} className="bg-violet-600 hover:bg-violet-700 text-white">
            {isLoading ? (
              <><Clock className="w-4 h-4 mr-2 animate-spin" />Simulating…</>
            ) : (
              <><Cpu className="w-4 h-4 mr-2" />Generate Digital Twin</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Current SOH", value: `${result.currentSoh?.toFixed(1)}%`, icon: <Zap className="w-4 h-4 text-emerald-400" />, color: "text-emerald-400" },
              { label: "Predicted SOH (EOH)", value: `${result.scenarios?.nominal?.[result.scenarios.nominal.length - 1]?.predictedSoh?.toFixed(1) ?? "—"}%`, icon: <TrendingDown className="w-4 h-4 text-amber-400" />, color: "text-amber-400" },
              { label: "RUL", value: result.rulDaysNominal ? `${result.rulDaysNominal} days` : "N/A", icon: <Calendar className="w-4 h-4 text-blue-400" />, color: "text-blue-400" },
              { label: "Status", value: result.healthStatus ?? "—", icon: getStatusIcon(result.healthStatus), color: getStatusColor(result.healthStatus) },
            ].map((card) => (
              <Card key={card.label} className="border-border/50 bg-card/50">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    {card.icon}
                    <span className="text-xs text-muted-foreground">{card.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trajectory Chart */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-violet-400" />
                SOH Trajectory Forecast
              </CardTitle>
              <CardDescription>Predicted state-of-health with ±95% confidence interval</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="sohGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(v) => `D${v}`} />
                  <YAxis domain={[0, 100]} stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    formatter={(v: any, name: string) => [`${Number(v).toFixed(1)}%`, name === "soh" ? "Predicted SOH" : name === "upper" ? "Upper CI" : "Lower CI"]}
                    labelFormatter={(l) => `Day ${l}`}
                  />
                  <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "80% threshold", fill: "#f59e0b", fontSize: 11 }} />
                  <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "60% EOL", fill: "#ef4444", fontSize: 11 }} />
                  <Area type="monotone" dataKey="aggressive" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" fill="none" dot={false} />
                  <Area type="monotone" dataKey="conservative" stroke="#22c55e" strokeWidth={1} strokeDasharray="3 3" fill="none" dot={false} />
                  <Area type="monotone" dataKey="nominal" stroke="#8b5cf6" strokeWidth={2} fill="url(#sohGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Degradation Breakdown */}
          {result.degradationBreakdown && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Degradation Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(result.degradationBreakdown).map(([key, val]: [string, any]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                      <p className="text-sm font-semibold text-foreground">{typeof val === "number" ? `${val.toFixed(2)}%` : String(val)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
