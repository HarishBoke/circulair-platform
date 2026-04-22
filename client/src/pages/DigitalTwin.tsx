import { useState, useId } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from "recharts";
import { Cpu, TrendingDown, Calendar, Zap, AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";

export default function DigitalTwin() {
  const [bpan, setBpan] = useState("");
  const [horizon, setHorizon] = useState(365); // default 12 months
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const horizonLabelId = useId();
  const bpanLabelId = useId();

  // Query real batteries from registry
  const { data: batteriesData, isLoading: batteriesLoading } = trpc.bpan.list.useQuery(
    { offset: 0, limit: 100 },
    { staleTime: 60_000 }
  );
  const batteries = batteriesData?.items ?? [];

  const generateMutation = trpc.digitalTwin.generate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setIsLoading(false);
      toast.success("Digital twin generated", {
        description: `${data.scenarios?.nominal?.length ?? 0} trajectory points computed`,
      });
    },
    onError: (err) => {
      setIsLoading(false);
      toast.error("Failed to generate twin", { description: err.message });
    },
  });

  const handleGenerate = () => {
    if (!bpan.trim()) {
      toast.error("No battery selected", { description: "Please select a battery from the list" });
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
    if (status === "healthy") return <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />;
    if (status === "degrading") return <AlertTriangle className="w-4 h-4 text-amber-400" aria-hidden="true" />;
    return <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden="true" />;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page heading */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-500/10" aria-hidden="true">
          <Cpu className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Battery Digital Twin</h1>
          <p className="text-sm text-muted-foreground">
            Physics-informed trajectory simulation with confidence intervals
          </p>
        </div>
        <Badge
          variant="outline"
          className="ml-auto border-violet-500/30 text-violet-400 bg-violet-500/10"
        >
          v2.0
        </Badge>
      </div>

      {/* Input Panel */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Configure Simulation</CardTitle>
          <CardDescription>
            Select a registered battery and set a forecast horizon to generate a digital twin trajectory
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* BPAN Selector */}
            <div className="space-y-2">
              <Label id={bpanLabelId} htmlFor="bpan-select">
                Battery (BPAN)
              </Label>
              {batteriesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Loading batteries…</span>
                </div>
              ) : batteries.length === 0 ? (
                <p className="text-sm text-muted-foreground h-10 flex items-center">
                  No registered batteries found. Register a battery first.
                </p>
              ) : (
                <Select
                  value={bpan}
                  onValueChange={setBpan}
                  aria-labelledby={bpanLabelId}
                >
                  <SelectTrigger id="bpan-select" className="font-mono">
                    <SelectValue placeholder="Select a battery…" />
                  </SelectTrigger>
                  <SelectContent>
                    {batteries.map((b: any) => (
                      <SelectItem key={b.bpan} value={b.bpan} className="font-mono">
                        <span className="font-mono">{b.bpan}</span>
                        {b.chemistry && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {b.chemistry} · {b.nominalCapacityKwh ? `${b.nominalCapacityKwh} kWh` : ""}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {bpan && (
                <p className="text-xs text-muted-foreground font-mono">Selected: {bpan}</p>
              )}
            </div>

            {/* Horizon Slider */}
            <div className="space-y-2">
              <Label id={horizonLabelId}>
                Forecast Horizon:{" "}
                <span className="text-violet-400 font-semibold">
                  {horizon} days ({Math.round((horizon / 365) * 10) / 10} years)
                </span>
              </Label>
              <Slider
                min={30}
                max={1825}
                step={30}
                value={[horizon]}
                onValueChange={([v]) => setHorizon(v)}
                className="mt-3"
                aria-labelledby={horizonLabelId}
                aria-valuemin={30}
                aria-valuemax={1825}
                aria-valuenow={horizon}
                aria-valuetext={`${horizon} days (${Math.round((horizon / 365) * 10) / 10} years)`}
              />
              <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
                <span>30 days</span>
                <span>5 years</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isLoading || !bpan}
            className="bg-violet-600 hover:bg-violet-700 text-white"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Simulating…
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4 mr-2" aria-hidden="true" />
                Generate Digital Twin
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Live region for screen readers — announces when results arrive */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {result
          ? `Digital twin generated for ${result.bpan ?? bpan}. Current SOH: ${result.currentSoh?.toFixed(1)}%. Status: ${result.healthStatus ?? "unknown"}.`
          : isLoading
          ? "Generating digital twin simulation, please wait."
          : ""}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <section aria-label="Simulation summary metrics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Current SOH",
                  value: `${result.currentSoh?.toFixed(1)}%`,
                  icon: <Zap className="w-4 h-4 text-emerald-400" aria-hidden="true" />,
                  color: "text-emerald-400",
                },
                {
                  label: "Predicted SOH (EOH)",
                  value: `${result.scenarios?.nominal?.[result.scenarios.nominal.length - 1]?.predictedSoh?.toFixed(1) ?? "—"}%`,
                  icon: <TrendingDown className="w-4 h-4 text-amber-400" aria-hidden="true" />,
                  color: "text-amber-400",
                },
                {
                  label: "Remaining Useful Life",
                  value: result.rulDaysNominal ? `${result.rulDaysNominal} days` : "N/A",
                  icon: <Calendar className="w-4 h-4 text-blue-400" aria-hidden="true" />,
                  color: "text-blue-400",
                },
                {
                  label: "Health Status",
                  value: result.healthStatus ?? "—",
                  icon: getStatusIcon(result.healthStatus),
                  color: getStatusColor(result.healthStatus),
                },
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
          </section>

          {/* Trajectory Chart */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-violet-400" aria-hidden="true" />
                SOH Trajectory Forecast
              </CardTitle>
              <CardDescription>
                Predicted state-of-health with ±95% confidence interval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Accessible data summary for screen readers */}
              <p className="sr-only">
                Chart showing SOH trajectory over {horizon} days. Nominal scenario ends at{" "}
                {chartData[chartData.length - 1]?.nominal ?? "—"}%. Conservative scenario ends at{" "}
                {chartData[chartData.length - 1]?.conservative ?? "—"}%. Aggressive scenario ends at{" "}
                {chartData[chartData.length - 1]?.aggressive ?? "—"}%.
              </p>
              <ResponsiveContainer width="100%" height={320} aria-hidden="true">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="sohGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="day"
                    stroke="#6b7280"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `D${v}`}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#6b7280"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                    }}
                    formatter={(v: any, name: string) => [
                      `${Number(v).toFixed(1)}%`,
                      name === "nominal"
                        ? "Nominal"
                        : name === "conservative"
                        ? "Conservative"
                        : "Aggressive",
                    ]}
                    labelFormatter={(l) => `Day ${l}`}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: "80% threshold", fill: "#f59e0b", fontSize: 11 }}
                  />
                  <ReferenceLine
                    y={60}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: "60% EOL", fill: "#ef4444", fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="aggressive"
                    stroke="#ef4444"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    fill="none"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="conservative"
                    stroke="#22c55e"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    fill="none"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="nominal"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#sohGradient)"
                    dot={false}
                  />
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
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(result.degradationBreakdown).map(([key, val]: [string, any]) => (
                    <div key={key} className="space-y-1">
                      <dt className="text-xs text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </dt>
                      <dd className="text-sm font-semibold text-foreground">
                        {typeof val === "number" ? `${val.toFixed(2)}%` : String(val)}
                      </dd>
                    </div>
                  ))}
                </dl>
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
                <ul className="space-y-2" aria-label="Maintenance recommendations">
                  {result.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2
                        className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0"
                        aria-hidden="true"
                      />
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
