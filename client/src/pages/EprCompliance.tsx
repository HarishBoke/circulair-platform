import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Plus, CheckCircle2, Clock, RefreshCw, FileText, Coins, FileDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  verified: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  disputed: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

export default function EprCompliance() {
  usePageTitle("EPR Compliance");

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

  const { data, isLoading, refetch } = trpc.epr.allTokens.useQuery({ limit: 50 });
  const { data: stats } = trpc.epr.stats.useQuery();

  const submitMutation = trpc.epr.verifyYield.useMutation({
    onSuccess: (d) => {
      toast.success(`EPR Token ${d.status === "verified" ? "issued" : "rejected"}: ${d.token.tokenId}`);
      setShowDialog(false);
      refetch();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [reportYear] = useState(() => new Date().getFullYear());
  const [reportMonth] = useState(() => new Date().getMonth() + 1);
  const pdfMutation = trpc.pdf.cpcbReport.useMutation({
    onSuccess: (d) => {
      toast.success("CPCB Form BW-3 PDF ready!", { description: "Opening in new tab..." });
      window.open(d.url, "_blank");
    },
    onError: (e: { message: string }) => toast.error("PDF generation failed", { description: e.message }),
  });
  const records = data ?? [];

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">EPR Compliance</h1>
          <p className="text-muted-foreground text-sm mt-1">Extended Producer Responsibility · Blockchain token issuance · CPCB reporting</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Submit Yield Record
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Submit Yield Verification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">BPAN</Label>
                <Input
                  placeholder="21-character BPAN"
                  value={form.bpan}
                  onChange={(e) => setForm({ ...form, bpan: e.target.value.toUpperCase() })}
                  className="bg-secondary/30 border-border font-mono text-sm h-9"
                  maxLength={21}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "actualYieldKg", label: "Actual Yield (kg)" },
                  { key: "theoreticalYieldKg", label: "Theoretical Yield (kg)" },
                  { key: "blackMassKg", label: "Black Mass (kg)" },
                  { key: "lithiumRecoveredKg", label: "Lithium (kg)" },
                  { key: "cobaltRecoveredKg", label: "Cobalt (kg)" },
                  { key: "nickelRecoveredKg", label: "Nickel (kg)" },
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
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="font-mono text-[9px] text-muted-foreground mb-1">Yield Ratio Preview</div>
                <div className={`font-display text-lg font-bold ${form.theoreticalYieldKg > 0 && (form.actualYieldKg / form.theoreticalYieldKg) >= 0.85 ? "text-primary" : "text-destructive"}`}>
                  {form.theoreticalYieldKg > 0 ? `${((form.actualYieldKg / form.theoreticalYieldKg) * 100).toFixed(1)}%` : "—"}
                </div>
                <div className="font-mono text-[9px] text-muted-foreground">≥85% required for token issuance</div>
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate(form)}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit & Issue EPR Token"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: records.length, icon: FileText },
          { label: "Verified Tokens", value: stats?.verified ?? 0, icon: CheckCircle2 },
          { label: "Pending Review", value: stats?.pending ?? 0, icon: Clock },
          { label: "Total Yield (kg)", value: `${((stats?.totalYieldKg ?? 0) / 1000).toFixed(1)}t`, icon: Coins },
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

      {/* Blockchain Info */}
      <div className="bg-card border border-primary/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-display text-sm font-bold text-primary mb-1">Hyperledger Fabric Smart Contracts</div>
            <p className="text-xs text-foreground/70">
              All EPR compliance records are anchored to the Hyperledger Fabric blockchain via smart contracts, providing immutable audit trails. EPR credit tokens are automatically issued upon verification of recycling yields against CPCB norms (≥85% yield ratio).
            </p>
            <div className="flex flex-wrap gap-4 mt-3">
              {[
                { label: "Network", value: "Hyperledger Fabric v2.5" },
                { label: "Channel", value: "circulair-epr-channel" },
                { label: "Chaincode", value: "EPRTokenCC v1.2" },
                { label: "Consensus", value: "PBFT" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="font-mono text-[9px] text-muted-foreground">{item.label}</div>
                  <div className="font-mono text-xs text-primary">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-display text-sm font-bold">EPR Token Records</h3>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{records.length} total tokens</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border h-8 text-xs"
              disabled={pdfMutation.isPending}
              onClick={() => pdfMutation.mutate({ year: reportYear, month: reportMonth })}
            >
              <FileDown className="w-3.5 h-3.5 mr-1.5" />
              {pdfMutation.isPending ? "Generating..." : "Export CPCB BW-3"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border h-8">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["BPAN", "Token ID", "Status", "Actual Yield", "Yield Ratio", "Blockchain TX", "Date"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary/50 rounded animate-pulse w-16" /></td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No EPR records yet. Submit recycling data to issue tokens.</p>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{r.bpan}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] text-chart-2">{r.tokenId ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`font-mono text-[9px] capitalize ${STATUS_STYLES[r.status] ?? ""}`}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{Number(r.actualYieldKg ?? 0).toFixed(2)} kg</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs ${Number(r.yieldRatio ?? 0) >= 0.85 ? "text-primary" : "text-destructive"}`}>
                        {(Number(r.yieldRatio ?? 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] text-muted-foreground truncate max-w-24 block">
                        {r.blockchainTxHash ? `${r.blockchainTxHash.slice(0, 10)}...` : "—"}
                      </span>
                    </td>
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
