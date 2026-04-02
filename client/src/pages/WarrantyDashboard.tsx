import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, ShieldCheck, ShieldX, Plus, Search, Download, Clock,
  AlertTriangle, CheckCircle2, XCircle, Pause, BarChart3,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10",
  expired: "text-red-400 bg-red-500/10",
  voided: "text-orange-400 bg-orange-500/10",
  claimed: "text-blue-400 bg-blue-500/10",
  suspended: "text-yellow-400 bg-yellow-500/10",
  pending_activation: "text-gray-400 bg-gray-500/10",
};

export default function WarrantyDashboard() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  const stableInput = useMemo(() => ({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
    limit,
    offset: page * limit,
  }), [statusFilter, search, page]);

  const listQuery = trpc.warranty.list.useQuery(stableInput);
  const statsQuery = trpc.warranty.stats.useQuery();

  const totalPages = Math.ceil((listQuery.data?.total ?? 0) / limit);

  // CSV export
  const handleExport = () => {
    if (!listQuery.data?.records.length) return;
    const headers = ["ID", "BPAN", "Customer", "Phone", "Email", "Status", "Type", "Term (mo)", "Purchase Date", "End Date", "Claims"];
    const rows = listQuery.data.records.map((r: any) => [
      r.id, r.bpan, r.customerName, r.customerPhone || "", r.customerEmail || "",
      r.effectiveStatus, r.warrantyType, r.warrantyTermMonths,
      r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString() : "",
      r.warrantyEndDate ? new Date(r.warrantyEndDate).toLocaleDateString() : "",
      r.totalClaims ?? 0,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "warranty_records.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" /> Warranty Management
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track, manage, and verify battery warranties</p>
        </div>
        <div className="flex gap-2">
          <Link href="/warranty/check">
            <Button variant="outline" size="sm" className="text-xs">
              <Search className="w-3.5 h-3.5 mr-1" /> Check Warranty
            </Button>
          </Link>
          <Link href="/warranty/register">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Register Warranty
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total", value: statsQuery.data?.total ?? 0, icon: BarChart3, color: "text-primary" },
          { label: "Active", value: statsQuery.data?.byStatus?.find((s: any) => s.status === "active")?.count ?? 0, icon: ShieldCheck, color: "text-emerald-400" },
          { label: "Expired", value: statsQuery.data?.byStatus?.find((s: any) => s.status === "expired")?.count ?? 0, icon: ShieldX, color: "text-red-400" },
          { label: "Claimed", value: statsQuery.data?.byStatus?.find((s: any) => s.status === "claimed")?.count ?? 0, icon: CheckCircle2, color: "text-blue-400" },
          { label: "Voided", value: statsQuery.data?.byStatus?.find((s: any) => s.status === "voided")?.count ?? 0, icon: XCircle, color: "text-orange-400" },
          { label: "Pending", value: statsQuery.data?.byStatus?.find((s: any) => s.status === "pending_activation")?.count ?? 0, icon: Clock, color: "text-gray-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</span>
            </div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by BPAN, name, phone, email, invoice..."
            className="bg-card border-border h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] bg-card border-border h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
            <SelectItem value="claimed">Claimed</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending_activation">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleExport}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">Loading warranties...</p>
          </div>
        ) : !listQuery.data?.records.length ? (
          <div className="p-12 text-center">
            <Shield className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">No warranty records found</p>
            <p className="text-xs text-muted-foreground mb-4">Register your first warranty to get started</p>
            <Link href="/warranty/register">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Register Warranty
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">BPAN</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Days Left</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Claims</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {listQuery.data.records.map((r: any) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/batteries/${r.bpan}`}>
                      <td className="px-4 py-3 font-mono text-xs">{r.bpan}</td>
                      <td className="px-4 py-3 text-xs">{r.customerName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.customerPhone || r.customerEmail || r.customerWhatsApp || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[r.effectiveStatus] ?? STATUS_COLORS.expired}`}>
                          {r.effectiveStatus === "active" && <ShieldCheck className="w-3 h-3" />}
                          {r.effectiveStatus === "expired" && <ShieldX className="w-3 h-3" />}
                          {r.effectiveStatus === "voided" && <AlertTriangle className="w-3 h-3" />}
                          {r.effectiveStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{r.warrantyType}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${r.daysRemaining > 90 ? "text-emerald-400" : r.daysRemaining > 30 ? "text-amber-400" : "text-red-400"}`}>
                          {r.daysRemaining}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{r.totalClaims ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.warrantyEndDate ? new Date(r.warrantyEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Showing {page * limit + 1}–{Math.min((page + 1) * limit, listQuery.data.total)} of {listQuery.data.total}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
