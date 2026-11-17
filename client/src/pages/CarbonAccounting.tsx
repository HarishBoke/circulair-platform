import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { carbonStageData } from "@/lib/numericalPresentation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Leaf, Globe, Recycle, Zap } from "lucide-react";

type CarbonResult = inferRouterOutputs<AppRouter>["carbon"]["calculate"];

export default function CarbonAccounting() {
  const [bpan, setBpan] = useState("");
  const [gridRegion, setGridRegion] = useState("IN");
  const [transportKm, setTransportKm] = useState(500);
  const [result, setResult] = useState<CarbonResult | null>(null);
  const gridQuery = trpc.carbon.getGridRegions.useQuery();

  const calcMutation = trpc.carbon.calculate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("Carbon footprint calculated", { description: `Total: ${data.totalKgCo2.toFixed(1)} kg CO₂e` });
    },
    onError: (err) => toast.error("Calculation failed", { description: err.message }),
  });

  const handleCalculate = () => {
    if (![19, 21].includes(bpan.trim().length)) {
      toast.error("Invalid BPAN", { description: "Use the complete registered 19- or 21-character BPAN" });
      return;
    }
    if (!Number.isFinite(transportKm) || transportKm < 0 || transportKm > 50000) {
      toast.error("Invalid distance", { description: "Enter a finite distance between 0 and 50,000 km" });
      return;
    }
    if (!gridQuery.data?.some((region) => region.code === gridRegion)) {
      toast.error("Grid assumptions unavailable", { description: "Choose a region returned by the server" });
      return;
    }
    setResult(null);
    calcMutation.mutate({ bpan: bpan.trim(), gridRegion, transportDistanceKm: transportKm });
  };

  const chartData = result ? carbonStageData(result) : [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <Leaf className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Carbon Accounting</h1>
          <p className="text-sm text-muted-foreground">Estimated lifecycle carbon footprint per BPAN — not a compliance declaration</p>
        </div>
        <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-400">Unverified estimate</Badge>
      </div>
      <p className="text-sm text-muted-foreground">Embedded factors and assumed 92% charging efficiency are unverified. Operational CO₂e counts all charging energy, not only losses. This is not a certified lifecycle assessment or hardware safety model.</p>

      {/* Input */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Footprint Parameters</CardTitle>
          <CardDescription>Configure the lifecycle assessment inputs for this battery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Battery BPAN</Label>
              <Input
                placeholder="Complete registered BPAN"
                value={bpan}
                onChange={(e) => setBpan(e.target.value)}
                className="font-mono"
                maxLength={21}
              />
            </div>
            <div className="space-y-2">
              <Label>Grid Region</Label>
              <Select value={gridRegion} onValueChange={setGridRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(gridQuery.data ?? []).map((r) => (
                    <SelectItem key={r.code} value={r.code}>{r.code} ({r.intensity} g CO₂e/kWh)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Transport Distance (km)</Label>
              <Input
                type="number"
                min={0}
                max={50000}
                value={transportKm}
                onChange={(e) => setTransportKm(Number(e.target.value))}
              />
            </div>
          </div>
          {gridQuery.isError && <p role="alert" className="text-sm text-red-400">Grid assumptions could not be loaded; calculation is unavailable.</p>}
          <Button onClick={handleCalculate} disabled={calcMutation.isPending || !gridQuery.data?.length} className="bg-emerald-600 hover:bg-emerald-700 text-foreground">
            <Leaf className="w-4 h-4 mr-2" />
            {calcMutation.isPending ? "Calculating…" : "Calculate Carbon Footprint"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total CO₂e", value: `${result.totalKgCo2?.toFixed(1)} kg`, icon: <Globe className="w-4 h-4 text-emerald-400" />, color: "text-emerald-400" },
              { label: "Per kWh", value: `${result.intensityKgCo2PerKwh?.toFixed(2)} kg/kWh`, icon: <Zap className="w-4 h-4 text-blue-400" />, color: "text-blue-400" },
              { label: "Compliance", value: "Not assessed", icon: <Leaf className="w-4 h-4 text-violet-400" />, color: "text-amber-400" },
              { label: "Grid Region", value: result.gridRegion ?? "—", icon: <Recycle className="w-4 h-4 text-amber-400" />, color: "text-amber-400" },
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

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Lifecycle Stage Breakdown</CardTitle>
              <CardDescription>CO₂e emissions by lifecycle stage (kg)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}kg`} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    formatter={(v: any) => [`${Number(v).toFixed(1)} kg CO₂e`, "Emissions"]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Estimate assumptions, not an invented EU rating */}
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm font-medium text-foreground">Estimate assumptions and exclusions</p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-muted-foreground">
                {result.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
