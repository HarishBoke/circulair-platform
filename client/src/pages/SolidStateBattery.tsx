import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Thermometer, Activity, TrendingUp, Info } from "lucide-react";

const SOLID_STATE_SPECS = [
  { label: "Chemistry", value: "SOLID_STATE (Li-metal / sulfide electrolyte)" },
  { label: "Nominal Voltage", value: "3.85 V/cell" },
  { label: "Capacity Fade (calendar)", value: "0.5% per year (vs 2–4% Li-ion)" },
  { label: "Capacity Fade (cycle)", value: "0.008% per cycle (vs 0.02–0.05%)" },
  { label: "Max C-rate", value: "5C charge / 10C discharge" },
  { label: "Operating Temperature", value: "−40°C to +85°C" },
  { label: "Thermal Runaway Risk", value: "Near-zero (solid electrolyte)" },
  { label: "Energy Density", value: "400–500 Wh/kg (2× NMC)" },
  { label: "Cycle Life", value: "3,000–5,000 cycles at 80% EOL" },
  { label: "BPAN Chemistry Code", value: "S (reserved)" },
];

const ALERT_THRESHOLDS = [
  { metric: "Temperature", warning: "> 70°C", critical: "> 85°C", unit: "°C" },
  { metric: "Voltage (cell)", warning: "< 3.2V or > 4.3V", critical: "< 3.0V or > 4.5V", unit: "V" },
  { metric: "SOH", warning: "< 75%", critical: "< 60%", unit: "%" },
  { metric: "Internal Resistance", warning: "> 2× baseline", critical: "> 3× baseline", unit: "mΩ" },
  { metric: "Dendrite Indicator", warning: "IR spike > 15%", critical: "IR spike > 30%", unit: "" },
];

export default function SolidStateBattery() {
  const { data: batteries } = trpc.bpan.list.useQuery({ chemistry: "SOLID_STATE", limit: 20, offset: 0 });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Zap className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solid-State Battery Support</h1>
          <p className="text-sm text-muted-foreground">Next-generation solid-state chemistry parameters, telemetry metrics, and alert thresholds — v4.0</p>
        </div>
        <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-400 bg-amber-500/10">v4.0</Badge>
      </div>

      {/* Info Banner */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4 pb-3 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Solid-state batteries use a solid electrolyte instead of liquid, eliminating thermal runaway risk and enabling 2× energy density. The Circul-AI-r physics model has been updated with solid-state degradation parameters: Arrhenius calendar aging at 0.5%/year, Wöhler cycle fade at 0.008%/cycle, and dendrite formation detection via internal resistance spike monitoring.
          </p>
        </CardContent>
      </Card>

      {/* Registered Solid-State Batteries */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Registered Solid-State Batteries</CardTitle>
          <CardDescription>Batteries in your fleet with SOLID_STATE chemistry</CardDescription>
        </CardHeader>
        <CardContent>
          {!batteries || (batteries as any).batteries?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No solid-state batteries registered yet.</p>
              <p className="text-xs mt-1">Register a battery with chemistry code "S" (SOLID_STATE) via the BPAN Registry.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(batteries as any).batteries?.map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-mono font-medium">{b.bpan}</p>
                    <p className="text-xs text-muted-foreground">{b.capacityKwh} kWh · {b.voltageV}V · {b.cellOriginCountry}</p>
                  </div>
                  <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">SOLID_STATE</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chemistry Specifications */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base">Chemistry Specifications</CardTitle>
          </div>
          <CardDescription>Physics model parameters for solid-state batteries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SOLID_STATE_SPECS.map((spec) => (
              <div key={spec.label} className="flex items-start gap-2 p-3 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{spec.label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{spec.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base">Default Alert Thresholds</CardTitle>
          </div>
          <CardDescription>Pre-configured alert rule defaults for solid-state batteries. Customise in Alert Rules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Metric</th>
                  <th className="text-left py-2 pr-4 text-amber-400 font-medium">Warning</th>
                  <th className="text-left py-2 text-red-400 font-medium">Critical</th>
                </tr>
              </thead>
              <tbody>
                {ALERT_THRESHOLDS.map((t) => (
                  <tr key={t.metric} className="border-b border-border/10 hover:bg-muted/10">
                    <td className="py-2 pr-4 font-medium text-foreground">{t.metric}</td>
                    <td className="py-2 pr-4 text-amber-400">{t.warning}</td>
                    <td className="py-2 text-red-400">{t.critical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Comparative Advantage */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <CardTitle className="text-base">Solid-State vs Li-ion Comparison</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Property</th>
                  <th className="text-left py-2 pr-4 text-amber-400 font-medium">Solid-State</th>
                  <th className="text-left py-2 text-blue-400 font-medium">NMC Li-ion</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Energy Density", "400–500 Wh/kg", "200–250 Wh/kg"],
                  ["Calendar Fade", "0.5%/year", "2–4%/year"],
                  ["Cycle Fade", "0.008%/cycle", "0.02–0.05%/cycle"],
                  ["Thermal Runaway", "Near-zero risk", "Moderate risk"],
                  ["Operating Temp", "−40°C to +85°C", "−20°C to +60°C"],
                  ["Cycle Life", "3,000–5,000", "1,000–2,000"],
                  ["Fast Charge", "5C capable", "1–2C typical"],
                  ["Cost (2025)", "$350–500/kWh", "$120–180/kWh"],
                ].map(([prop, ss, nmc]) => (
                  <tr key={prop} className="border-b border-border/10 hover:bg-muted/10">
                    <td className="py-2 pr-4 font-medium text-foreground">{prop}</td>
                    <td className="py-2 pr-4 text-amber-400">{ss}</td>
                    <td className="py-2 text-blue-400">{nmc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
