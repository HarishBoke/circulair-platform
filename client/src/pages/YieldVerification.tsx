import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FlaskConical, Plus, CheckCircle2, XCircle, RefreshCw, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  verified: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  disputed: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

export default function YieldVerification() {
  usePageTitle("Yield Verification");

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    bpan: "",
    batteryId: 0,
    actualYieldKg: 0,
    theoreticalYieldKg: 0,
    blackMassKg: 0,
    lithiumRecoveredKg: 0,
    cobaltRecoveredKg: 0,
    nickelRecoveredKg: 0,
  });

  // Reuse the EPR verifyYield endpoint for yield verification
  const { data: tokens, isLoading, refetch } = trpc.epr.allTokens.useQuery({ limit: 50 });
  const { data: stats } = trpc.epr.stats.useQuery();

  const verifyMutation = trpc.epr.verifyYield.useMutation({
    onSuccess: (d) => {
      toast.success(`Yield ${d.status}: ratio ${(d.yieldRatio * 100).toFixed(1)}%`);
      setShowDialog(false);
      refetch();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const records = tokens ?? [];

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Yield Verification</h1>
          <p className="text-muted-foreground text-sm mt-1">SCADA-integrated material yield verification · Black mass · Precious metal recovery</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Submit Yield
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Submit Material Yield Data</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">BPAN</Label>
                <Input
                  placeholder="19-character BPAN"
                  value={form.bpan}
                  onChange={(e) => setForm({ ...form, bpan: e.target.value.toUpperCase() })}
                  className="bg-secondary/30 border-border font-mono text-sm h-9"
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "actualYieldKg", label: "Actual Yield (kg)" },
                  { key: "theoreticalYieldKg", label: "Theoretical (kg)" },
                  { key: "blackMassKg", label: "Black Mass (kg)" },
                  { key: "lithiumRecoveredKg", label: "Li Recovered (kg)" },
                  { key: "cobaltRecoveredKg", label: "Co Recovered (kg)" },
                  { key: "nickelRecoveredKg", label: "Ni Recovered (kg)" },
                ].map((f) => (
                  <div key={f.key}>
                    <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">{f.label}</Label>
                    <Input
                      type="number" step="0.01"
                      value={(form as unknown as Record<string, number>)[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: parseFloat(e.target.value) || 0 })}
                      className="bg-secondary/30 border-border font-mono text-sm h-9"
                    />
                  </div>
                ))}
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
                <div className="font-mono text-[9px] text-muted-foreground">Yield Analysis Preview</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="font-mono text-[9px] text-muted-foreground">Yield Ratio</div>
                    <div className={`font-display text-base font-bold ${form.theoreticalYieldKg > 0 && (form.actualYieldKg / form.theoreticalYieldKg) >= 0.85 ? "text-primary" : "text-destructive"}`}>
                      {form.theoreticalYieldKg > 0 ? `${((form.actualYieldKg / form.theoreticalYieldKg) * 100).toFixed(1)}%` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] text-muted-foreground">Status</div>
                    <div className={`font-mono text-xs font-bold ${form.theoreticalYieldKg > 0 && (form.actualYieldKg / form.theoreticalYieldKg) >= 0.85 ? "text-primary" : "text-destructive"}`}>
                      {form.theoreticalYieldKg > 0 ? ((form.actualYieldKg / form.theoreticalYieldKg) >= 0.85 ? "PASS" : "FAIL") : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] text-muted-foreground">Threshold</div>
                    <div className="font-mono text-xs text-muted-foreground">≥85%</div>
                  </div>
                </div>
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate(form)}
              >
                {verifyMutation.isPending ? "Verifying..." : "Submit Yield Verification"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Verifications", value: records.length, icon: FlaskConical },
          { label: "Passed (≥85%)", value: records.filter((r) => r.status === "verified").length, icon: CheckCircle2 },
          { label: "Failed (<85%)", value: records.filter((r) => r.status === "rejected").length, icon: XCircle },
          { label: "Total Yield", value: `${((stats?.totalYieldKg ?? 0) / 1000).toFixed(1)}t`, icon: BarChart3 },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{s.label}</span>
              <s.icon className="w-4 h-4 text-primary/50" />
            </div>
            <div className="font-display text-2xl font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
          </div>
        ))}
      </div>

      {/* Material Recovery Breakdown */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Material Recovery Summary
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Black Mass", key: "blackMassKg", color: "text-foreground" },
            { label: "Lithium", key: "lithiumRecoveredKg", color: "text-primary" },
            { label: "Cobalt", key: "cobaltRecoveredKg", color: "text-chart-2" },
            { label: "Nickel", key: "nickelRecoveredKg", color: "text-chart-3" },
            { label: "Total Yield", key: "actualYieldKg", color: "text-chart-4" },
          ].map((mat) => {
            const total = records.reduce((sum, r) => sum + Number((r as Record<string, unknown>)[mat.key] ?? 0), 0);
            return (
              <div key={mat.label} className="bg-secondary/30 rounded-xl p-3">
                <div className="font-mono text-[9px] text-muted-foreground mb-1">{mat.label}</div>
                <div className={`font-display text-xl font-bold ${mat.color}`}>{total.toFixed(1)} kg</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-display text-sm font-bold">Verification Records</h3>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{records.length} total records</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border h-8">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["BPAN", "Status", "Actual (kg)", "Theoretical (kg)", "Yield Ratio", "Black Mass (kg)", "Li (kg)", "Date"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary/50 rounded animate-pulse w-16" /></td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <FlaskConical className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No yield verification records yet.</p>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{r.bpan}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`font-mono text-[9px] capitalize ${STATUS_STYLES[r.status] ?? ""}`}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{Number(r.actualYieldKg ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{Number(r.theoreticalYieldKg ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs ${Number(r.yieldRatio ?? 0) >= 0.85 ? "text-primary" : "text-destructive"}`}>
                        {(Number(r.yieldRatio ?? 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{Number(r.blackMassKg ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{Number(r.lithiumRecoveredKg ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
