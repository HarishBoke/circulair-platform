import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Shield, Plus, CheckCircle2, Clock, RefreshCw, FileText, Coins,
  FileDown, Download, Globe, Building2, Calendar,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  verified: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  disputed: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

const JURISDICTIONS = [
  { value: "india_cpcb" as const, label: "India - CPCB / BWMR 2016", icon: "🇮🇳" },
  { value: "eu_battery_reg" as const, label: "EU Battery Regulation 2023/1542", icon: "🇪🇺" },
  { value: "generic" as const, label: "Generic / Multi-jurisdiction", icon: "🌐" },
];

const QUARTERS = [
  { value: 1, label: "Q1 (Jan–Mar)" },
  { value: 2, label: "Q2 (Apr–Jun)" },
  { value: 3, label: "Q3 (Jul–Sep)" },
  { value: 4, label: "Q4 (Oct–Dec)" },
];

export default function EprCompliance() {
  usePageTitle("EPR Compliance");

  const [showYieldDialog, setShowYieldDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
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

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentQuarter = useMemo(() => Math.ceil((new Date().getMonth() + 1) / 3), []);

  const [exportForm, setExportForm] = useState({
    jurisdiction: "india_cpcb" as "india_cpcb" | "eu_battery_reg" | "generic",
    year: currentYear,
    quarter: currentQuarter,
    organizationName: "",
    registrationId: "",
    address: "",
    contactEmail: "",
  });

  const { data, isLoading, refetch } = trpc.epr.allTokens.useQuery({ limit: 50 });
  const { data: stats } = trpc.epr.stats.useQuery();

  const submitMutation = trpc.epr.verifyYield.useMutation({
    onSuccess: (d) => {
      toast.success(`EPR Token ${d.status === "verified" ? "issued" : "rejected"}: ${d.token.tokenId}`);
      setShowYieldDialog(false);
      refetch();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [reportYear] = useState(() => new Date().getFullYear());
  const [reportMonth] = useState(() => new Date().getMonth() + 1);
  const cpcbMutation = trpc.pdf.cpcbReport.useMutation({
    onSuccess: (d) => {
      toast.success("CPCB Form BW-3 PDF ready!", { description: "Opening in new tab..." });
      window.open(d.url, "_blank");
    },
    onError: (e: { message: string }) => toast.error("PDF generation failed", { description: e.message }),
  });

  const eprReportMutation = trpc.pdf.eprComplianceReport.useMutation({
    onSuccess: (d) => {
      toast.success("EPR Compliance Report generated!", {
        description: `${(d.sizeBytes / 1024).toFixed(0)} KB — opening in new tab...`,
      });
      window.open(d.url, "_blank");
      setShowExportDialog(false);
    },
    onError: (e: { message: string }) => toast.error("Report generation failed", { description: e.message }),
  });

  const records = data ?? [];

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">EPR Compliance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Extended Producer Responsibility · Blockchain token issuance · Regulatory reporting
          </p>
        </div>
        <div className="flex gap-2">
          {/* Export Report Dialog */}
          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export Report
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <FileDown className="w-5 h-5 text-primary" />
                  Generate EPR Compliance Report
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Jurisdiction Selection */}
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2 block">
                    Jurisdiction
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {JURISDICTIONS.map((j) => (
                      <button
                        key={j.value}
                        onClick={() => setExportForm({ ...exportForm, jurisdiction: j.value })}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          exportForm.jurisdiction === j.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border hover:border-primary/30 hover:bg-secondary/30"
                        }`}
                      >
                        <span className="text-lg">{j.icon}</span>
                        <div>
                          <div className="text-sm font-medium">{j.label}</div>
                        </div>
                        {exportForm.jurisdiction === j.value && (
                          <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Period Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">
                      <Calendar className="w-3 h-3 inline mr-1" />Year
                    </Label>
                    <select
                      value={exportForm.year}
                      onChange={(e) => setExportForm({ ...exportForm, year: parseInt(e.target.value) })}
                      className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm font-mono"
                    >
                      {Array.from({ length: 7 }, (_, i) => currentYear - 3 + i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">
                      Quarter
                    </Label>
                    <select
                      value={exportForm.quarter}
                      onChange={(e) => setExportForm({ ...exportForm, quarter: parseInt(e.target.value) })}
                      className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm font-mono"
                    >
                      {QUARTERS.map((q) => (
                        <option key={q.value} value={q.value}>{q.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Organization Details */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                      Organization Details (Optional)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="font-mono text-[10px] text-muted-foreground mb-1 block">Organization Name</Label>
                      <Input
                        placeholder="Your company name"
                        value={exportForm.organizationName}
                        onChange={(e) => setExportForm({ ...exportForm, organizationName: e.target.value })}
                        className="bg-secondary/30 border-border text-sm h-9"
                      />
                    </div>
                    <div>
                      <Label className="font-mono text-[10px] text-muted-foreground mb-1 block">Registration ID</Label>
                      <Input
                        placeholder="EPR registration number"
                        value={exportForm.registrationId}
                        onChange={(e) => setExportForm({ ...exportForm, registrationId: e.target.value })}
                        className="bg-secondary/30 border-border text-sm h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-mono text-[10px] text-muted-foreground mb-1 block">Address</Label>
                    <Input
                      placeholder="Registered address"
                      value={exportForm.address}
                      onChange={(e) => setExportForm({ ...exportForm, address: e.target.value })}
                      className="bg-secondary/30 border-border text-sm h-9"
                    />
                  </div>
                  <div>
                    <Label className="font-mono text-[10px] text-muted-foreground mb-1 block">Contact Email</Label>
                    <Input
                      type="email"
                      placeholder="compliance@company.com"
                      value={exportForm.contactEmail}
                      onChange={(e) => setExportForm({ ...exportForm, contactEmail: e.target.value })}
                      className="bg-secondary/30 border-border text-sm h-9"
                    />
                  </div>
                </div>

                {/* Preview Info */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Report Preview</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Jurisdiction:</span>{" "}
                      <span className="font-medium">{JURISDICTIONS.find((j) => j.value === exportForm.jurisdiction)?.label}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Period:</span>{" "}
                      <span className="font-medium">Q{exportForm.quarter} {exportForm.year}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">EPR Tokens:</span>{" "}
                      <span className="font-medium">{records.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Verified:</span>{" "}
                      <span className="font-medium text-primary">{stats?.verified ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={eprReportMutation.isPending}
                  onClick={() => eprReportMutation.mutate(exportForm)}
                >
                  {eprReportMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generate & Download PDF
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Submit Yield Dialog */}
          <Dialog open={showYieldDialog} onOpenChange={setShowYieldDialog}>
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
              disabled={cpcbMutation.isPending}
              onClick={() => cpcbMutation.mutate({ year: reportYear, month: reportMonth })}
            >
              <FileDown className="w-3.5 h-3.5 mr-1.5" />
              {cpcbMutation.isPending ? "Generating..." : "Export CPCB BW-3"}
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
