import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Leaf, Download, FileText, Globe, Factory, Truck, Recycle, Zap } from "lucide-react";

const GRID_REGIONS = [
  { value: "IN", label: "India (0.82 kg CO₂/kWh)" },
  { value: "EU", label: "EU Average (0.23 kg CO₂/kWh)" },
  { value: "CN", label: "China (0.58 kg CO₂/kWh)" },
  { value: "US", label: "USA (0.39 kg CO₂/kWh)" },
  { value: "AU", label: "Australia (0.55 kg CO₂/kWh)" },
  { value: "RENEWABLE", label: "Renewable (0.02 kg CO₂/kWh)" },
];

export default function CarbonAccounting() {
  const [bpan, setBpan] = useState("");
  const [gridRegion, setGridRegion] = useState("IN");
  const [transportKm, setTransportKm] = useState(500);
  const [result, setResult] = useState<any>(null);

  const calcMutation = trpc.carbon.calculate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("Carbon footprint calculated", { description: `Total: ${data.totalKgCo2.toFixed(1)} kg CO₂e` });
    },
    onError: (err) => toast.error("Calculation failed", { description: err.message }),
  });

  const handleCalculate = () => {
    if (!bpan.trim() || bpan.length !== 19) {
      toast.error("Invalid BPAN", { description: "BPAN must be exactly 19 characters" });
      return;
    }
    calcMutation.mutate({ bpan: bpan.trim(), gridRegion, transportDistanceKm: transportKm });
  };

  const stageColors: Record<string, string> = {
    manufacturing: "#6366f1",
    charging: "#22c55e",
    transport: "#f59e0b",
    endOfLife: "#ef4444",
  };

  const chartData = result ? [
    { name: "Manufacturing", value: result.breakdown?.manufacturing ?? 0, color: stageColors.manufacturing },
    { name: "Charging", value: result.breakdown?.charging ?? 0, color: stageColors.charging },
    { name: "Transport", value: result.breakdown?.transport ?? 0, color: stageColors.transport },
    { name: "End of Life", value: result.breakdown?.endOfLife ?? 0, color: stageColors.endOfLife },
  ] : [];

  const getRatingColor = (rating: string) => {
    if (rating === "A" || rating === "A+") return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (rating === "B") return "text-blue-400 border-blue-500/30 bg-blue-500/10";
    if (rating === "C") return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <Leaf className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Carbon Accounting</h1>
          <p className="text-sm text-muted-foreground">EU Article 7 compliant lifecycle carbon footprint per BPAN</p>
        </div>
        <Badge variant="outline" className="ml-auto border-emerald-500/30 text-emerald-400 bg-emerald-500/10">EU Art. 7</Badge>
      </div>

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
                placeholder="19-character BPAN"
                value={bpan}
                onChange={(e) => setBpan(e.target.value)}
                className="font-mono"
                maxLength={19}
              />
            </div>
            <div className="space-y-2">
              <Label>Grid Region</Label>
              <Select value={gridRegion} onValueChange={setGridRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRID_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
          <Button onClick={handleCalculate} disabled={calcMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-foreground">
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
              { label: "EU Compliant", value: result.euCompliant ? "Yes" : "No", icon: <Leaf className="w-4 h-4 text-violet-400" />, color: result.euCompliant ? "text-emerald-400" : "text-red-400" },
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

          {/* EU Rating Badge */}
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">EU Battery Regulation Article 7 Rating</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Based on lifecycle carbon footprint per kWh of rated capacity</p>
                </div>
                <Badge className={`text-2xl font-bold px-4 py-2 ${getRatingColor(result.euRating)}`}>
                  {result.euRating}
                </Badge>
              </div>
              {result.complianceNotes && (
                <p className="text-xs text-muted-foreground mt-3 p-3 bg-muted/30 rounded-lg">{result.complianceNotes}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
