import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wrench, Plus, Search, RefreshCw, Calendar, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  inspection: "Inspection",
  maintenance: "Maintenance",
  repair: "Repair",
  replacement: "Replacement",
  eol_assessment: "EOL Assessment",
  triage: "Triage",
};

export default function ServiceHistory() {
  usePageTitle("Service History");

  const [bpanSearch, setBpanSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    bpan: "",
    batteryId: 0,
    serviceType: "inspection" as "inspection" | "maintenance" | "repair" | "replacement" | "eol_assessment" | "triage",
    technicianName: "",
    location: "",
    notes: "",
    sohBefore: "" as string,
    sohAfter: "" as string,
  });

  // We query by BPAN; show empty state if no BPAN entered
  const { data: records, isLoading, refetch } = trpc.service.history.useQuery(
    { bpan: bpanSearch },
    { enabled: bpanSearch.length >= 5 }
  );

  const createMutation = trpc.service.addRecord.useMutation({
    onSuccess: () => { toast.success("Service record logged!"); setShowDialog(false); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const displayRecords = records ?? [];

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Service History</h1>
          <p className="text-muted-foreground text-sm mt-1">Battery maintenance records · Disassembly methods · Field technician logs</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Log Service
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Log Service Record</DialogTitle>
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
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Service Type</Label>
                <Select value={form.serviceType} onValueChange={(v) => setForm({ ...form, serviceType: v as typeof form.serviceType })}>
                  <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Technician</Label>
                  <Input value={form.technicianName} onChange={(e) => setForm({ ...form, technicianName: e.target.value })} className="bg-secondary/30 border-border text-sm h-9" placeholder="Name" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-secondary/30 border-border text-sm h-9" placeholder="Facility / City" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">SOH Before (%)</Label>
                  <Input type="number" value={form.sohBefore} onChange={(e) => setForm({ ...form, sohBefore: e.target.value })} className="bg-secondary/30 border-border font-mono text-sm h-9" />
                </div>
                <div>
                  <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">SOH After (%)</Label>
                  <Input type="number" value={form.sohAfter} onChange={(e) => setForm({ ...form, sohAfter: e.target.value })} className="bg-secondary/30 border-border font-mono text-sm h-9" />
                </div>
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-secondary/30 border-border text-sm h-9" placeholder="Service notes..." />
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate({
                  bpan: form.bpan,
                  batteryId: form.batteryId,
                  serviceType: form.serviceType,
                  technicianName: form.technicianName || undefined,
                  location: form.location || undefined,
                  notes: form.notes || undefined,
                  sohBefore: form.sohBefore ? parseFloat(form.sohBefore) : undefined,
                  sohAfter: form.sohAfter ? parseFloat(form.sohAfter) : undefined,
                })}
              >
                {createMutation.isPending ? "Logging..." : "Log Service Record"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Records Found", value: displayRecords.length, icon: Wrench },
          { label: "This Month", value: displayRecords.filter((r) => new Date(r.servicedAt).getMonth() === new Date().getMonth()).length, icon: Calendar },
          { label: "Avg SOH Improvement", value: displayRecords.filter((r) => r.sohBefore && r.sohAfter).length > 0 ? `+${(displayRecords.filter((r) => r.sohBefore && r.sohAfter).reduce((sum, r) => sum + (Number(r.sohAfter) - Number(r.sohBefore)), 0) / displayRecords.filter((r) => r.sohBefore && r.sohAfter).length).toFixed(1)}%` : "—", icon: DollarSign },
          { label: "Unique Batteries", value: new Set(displayRecords.map((r) => r.bpan)).size, icon: Wrench },
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

      {/* Search */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Enter BPAN to search service history..."
            value={bpanSearch}
            onChange={(e) => setBpanSearch(e.target.value.toUpperCase())}
            className="pl-9 bg-card border-border font-mono text-sm h-9"
            maxLength={21}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border h-9" disabled={!bpanSearch}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Records Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["BPAN", "Service Type", "Technician", "Location", "SOH Before", "SOH After", "Notes", "Date"].map((h) => (
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
              ) : !bpanSearch ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Enter a BPAN above to view service history.</p>
                  </td>
                </tr>
              ) : displayRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Wrench className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No service records found for this BPAN.</p>
                  </td>
                </tr>
              ) : (
                displayRecords.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{r.bpan}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-[9px] border-border">
                        {SERVICE_TYPE_LABELS[r.serviceType] ?? r.serviceType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.technicianName ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.location ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.sohBefore ? `${Number(r.sohBefore).toFixed(1)}%` : "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.sohAfter ? `${Number(r.sohAfter).toFixed(1)}%` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{r.notes ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(r.servicedAt).toLocaleDateString()}
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
