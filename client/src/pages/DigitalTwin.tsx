import { useState, useId } from "react";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { twinChartData, comparisonChartData, daysToMarkerLabel } from "@/lib/numericalPresentation";
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
import { Cpu, TrendingDown, Calendar, Zap, Clock, RefreshCw, GitCompare, ArrowLeftRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type Outputs = inferRouterOutputs<AppRouter>;

export default function DigitalTwin() {
  const [bpan, setBpan] = useState("");
  const [bpanB, setBpanB] = useState("");
  const [horizon, setHorizon] = useState(365); // default 12 months
  const [result, setResult] = useState<Outputs["digitalTwin"]["generate"] | null>(null);
  const [compareResult, setCompareResult] = useState<Outputs["digitalTwin"]["compare"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const horizonLabelId = useId();
  const bpanLabelId = useId();
  const bpanBLabelId = useId();
  const compareSwitchId = useId();

  // Query real batteries from registry
  const { data: batteriesData, isLoading: batteriesLoading } = trpc.bpan.list.useQuery(
    { offset: 0, limit: 100 },
    { staleTime: 60_000 }
  );
  const batteries = batteriesData?.items ?? [];

  const compareMutation = trpc.digitalTwin.compare.useMutation({
    onSuccess: (data) => {
      setCompareResult(data);
      setIsLoading(false);
      toast.success("Comparison complete", {
        description: `Side-by-side forecast for ${data.a.bpan} vs ${data.b.bpan}`,
      });
    },
    onError: (err) => {
      setIsLoading(false);
      toast.error("Comparison failed", { description: err.message });
    },
  });

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
    if (compareMode) {
      if (!bpanB.trim()) {
        toast.error("Second battery not selected", { description: "Select a second battery to compare" });
        return;
      }
      if (bpan === bpanB) {
        toast.error("Select two different batteries", { description: "Both BPANs must be different for comparison" });
        return;
      }
      setIsLoading(true);
      setCompareResult(null);
      compareMutation.mutate({ bpanA: bpan.trim(), bpanB: bpanB.trim(), forecastHorizonDays: horizon });
    } else {
      setIsLoading(true);
      setResult(null);
      generateMutation.mutate({ bpan: bpan.trim(), forecastHorizonDays: horizon });
    }
  };

  const chartData = result ? twinChartData(result) : [];

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
            Uncalibrated scenario estimates — not hardware safety or accuracy certification
          </p>
        </div>
        <Badge
          variant="outline"
          className="ml-auto border-violet-500/30 text-violet-400 bg-violet-500/10"
        >
          Demo / uncalibrated
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">Scenarios assume future usage and temperature, not measured conditions. Current SOH must have a verified source. No calibrated confidence interval, hardware control or cutoff protection is provided.</p>

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
                    {batteries.map((b) => (
                      <SelectItem key={b.bpan} value={b.bpan} className="font-mono">
                        <span className="font-mono">{b.bpan}</span>
                        {b.chemistry && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {b.chemistry} · {b.capacityKwh != null ? `${b.capacityKwh} kWh` : "capacity unknown"}
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

          {/* Comparison Mode Toggle */}
          <div className="flex items-center gap-3 py-1">
            <Switch
              id={compareSwitchId}
              checked={compareMode}
              onCheckedChange={(v) => {
                setCompareMode(v);
                setCompareResult(null);
                setResult(null);
              }}
              aria-label="Enable comparison mode"
            />
            <label htmlFor={compareSwitchId} className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
              <GitCompare className="w-4 h-4 text-violet-400" aria-hidden="true" />
              Compare two batteries side-by-side
            </label>
          </div>

          {/* Second BPAN selector (comparison mode only) */}
          {compareMode && (
            <div className="space-y-2">
              <Label id={bpanBLabelId} htmlFor="bpan-b-select">
                Second Battery (BPAN B)
              </Label>
              {batteriesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
                  <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Loading batteries…</span>
                </div>
              ) : (
                <Select value={bpanB} onValueChange={setBpanB} aria-labelledby={bpanBLabelId}>
                  <SelectTrigger id="bpan-b-select" className="font-mono">
                    <SelectValue placeholder="Select second battery…" />
                  </SelectTrigger>
                  <SelectContent>
                    {batteries.filter((b) => b.bpan !== bpan).map((b) => (
                      <SelectItem key={b.bpan} value={b.bpan} className="font-mono">
                        <span className="font-mono">{b.bpan}</span>
                        {b.chemistry && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {b.chemistry} · {b.capacityKwh != null ? `${b.capacityKwh} kWh` : "capacity unknown"}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isLoading || !bpan || (compareMode && !bpanB)}
            className="bg-violet-600 hover:bg-violet-700 text-foreground"
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
          ? `Digital twin generated for ${result.bpan ?? bpan}. Current SOH: ${result.currentSoh?.toFixed(1)}%. Uncalibrated estimate; safety status not assessed.`
          : isLoading
          ? "Generating digital twin simulation, please wait."
          : ""}
      </div>

      {/* Comparison Results */}
      {compareMode && compareResult && (
        <section aria-label="Side-by-side comparison results">
          {/* aria-live announcement */}
          <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
            Comparison complete. Battery A: {compareResult.a.bpan}, SOH {compareResult.a.currentSoh?.toFixed(1)}%.
            Battery B: {compareResult.b.bpan}, SOH {compareResult.b.currentSoh?.toFixed(1)}%.
          </div>

          <div className="flex items-center gap-2 mb-4">
            <ArrowLeftRight className="w-5 h-5 text-violet-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">Comparison Results</h2>
            <Badge variant="outline" className="border-violet-500/30 text-violet-400 bg-violet-500/10 ml-auto">
              {compareResult.forecastHorizonDays} day horizon
            </Badge>
          </div>

          {/* Side-by-side summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {(["a", "b"] as const).map((key) => {
              const side = compareResult[key];
              const pts = side.forecast?.scenarios?.nominal ?? [];
              const endSoh = pts[pts.length - 1]?.soh;
              return (
                <Card key={key} className={`border-border/50 ${key === "a" ? "bg-violet-500/5" : "bg-blue-500/5"}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${key === "a" ? "bg-violet-400" : "bg-blue-400"}`} aria-hidden="true" />
                      Battery {key.toUpperCase()}: {side.bpan}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-xs text-muted-foreground">Current SOH</dt>
                        <dd className="text-lg font-bold text-foreground">{side.currentSoh?.toFixed(1)}%</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">SOH at End of Horizon</dt>
                        <dd className="text-lg font-bold text-foreground">{endSoh?.toFixed(1) ?? "—"}%</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Chemistry</dt>
                        <dd className="text-sm font-medium text-foreground">{side.chemistry}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Capacity</dt>
                        <dd className="text-sm font-medium text-foreground">{side.capacityKwh} kWh</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Days to 80% marker (estimate)</dt>
                        <dd className="text-sm font-medium text-foreground">
                          {daysToMarkerLabel(side.forecast.rulDaysNominal)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Model status</dt>
                        <dd className="text-sm font-medium text-amber-400">Demo / uncalibrated</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Overlaid comparison chart */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-violet-400" aria-hidden="true" />
                SOH Trajectory Comparison
              </CardTitle>
              <CardDescription>
                Nominal forecast for both batteries overlaid — violet = Battery A, blue = Battery B
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Accessible summary for screen readers */}
              <p className="sr-only">
                Comparison chart. Battery A ({compareResult.a.bpan}) nominal SOH ends at{" "}
                {(compareResult.a.forecast?.scenarios?.nominal ?? []).at(-1)?.soh?.toFixed(1) ?? "—"}%.
                Battery B ({compareResult.b.bpan}) nominal SOH ends at{" "}
                {(compareResult.b.forecast?.scenarios?.nominal ?? []).at(-1)?.soh?.toFixed(1) ?? "—"}%.
              </p>
              {(() => {
                const chartData = comparisonChartData(compareResult.a.forecast, compareResult.b.forecast);
                return (
                  <ResponsiveContainer width="100%" height={320} aria-hidden="true">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(v) => `D${v}`} />
                      <YAxis domain={[0, 100]} stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                        formatter={(v: any, name: string) => [
                          `${Number(v).toFixed(1)}%`,
                          name === "batteryA" ? `Battery A (${compareResult.a.bpan})` : `Battery B (${compareResult.b.bpan})`,
                        ]}
                        labelFormatter={(l) => `Day ${l}`}
                      />
                      <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "80%", fill: "#f59e0b", fontSize: 10 }} />
                      <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "60% reference only", fill: "#ef4444", fontSize: 10 }} />
                      <Line type="monotone" dataKey="batteryA" stroke="#8b5cf6" strokeWidth={2} dot={false} name="batteryA" />
                      <Line type="monotone" dataKey="batteryB" stroke="#3b82f6" strokeWidth={2} dot={false} name="batteryB" />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Single-mode Results */}
      {!compareMode && result && (<>
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
                  value: `${result.scenarios?.nominal?.[result.scenarios.nominal.length - 1]?.soh?.toFixed(1) ?? "—"}%`,
                  icon: <TrendingDown className="w-4 h-4 text-amber-400" aria-hidden="true" />,
                  color: "text-amber-400",
                },
                {
                  label: "Days to 80% marker (estimate)",
                  value: daysToMarkerLabel(result.rulDaysNominal),
                  icon: <Calendar className="w-4 h-4 text-blue-400" aria-hidden="true" />,
                  color: "text-blue-400",
                },
                {
                  label: "Model status",
                  value: "Demo / uncalibrated",
                  icon: <Cpu className="w-4 h-4 text-amber-400" aria-hidden="true" />,
                  color: "text-amber-400",
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
                Estimated scenarios, not a statistical confidence interval; 80% and 60% markers are illustrative only
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
                    label={{ value: "80% illustrative marker", fill: "#f59e0b", fontSize: 11 }}
                  />
                  <ReferenceLine
                    y={60}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: "60% reference only", fill: "#ef4444", fontSize: 11 }}
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

          <Card className="border-border/50 bg-card/50">
            <CardHeader><CardTitle className="text-base">Uncalibrated model assumptions</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">Model: {result.modelVersion}. Evaluated: {result.evaluationDate}. Accuracy and hardware safety status are unknown.</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {result.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
              </ul>
            </CardContent>
          </Card>
       </>)}
    </div>
  );
}
