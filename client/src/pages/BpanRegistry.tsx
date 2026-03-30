import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Battery, Plus, Search, QrCode, ChevronRight, RefreshCw } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  operational: "bg-primary/10 text-primary border-primary/20",
  second_life: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  end_of_life: "bg-destructive/10 text-destructive border-destructive/20",
  in_transit: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  recycling: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

export default function BpanRegistry() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [chemistry, setChemistry] = useState("all");
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const { data, isLoading, refetch } = trpc.bpan.list.useQuery({
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    chemistry: chemistry !== "all" ? chemistry : undefined,
    limit: LIMIT,
    offset,
  });

  const batteries = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">BPAN Registry</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Battery Pack Aadhaar Number registry · <span className="text-primary font-mono">{total.toLocaleString()}</span> batteries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Link href="/batteries/register">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Register Battery
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search BPAN, manufacturer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            className="pl-9 bg-card border-border font-mono text-sm h-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setOffset(0); }}>
          <SelectTrigger className="w-36 bg-card border-border h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="operational">Operational</SelectItem>
            <SelectItem value="second_life">Second Life</SelectItem>
            <SelectItem value="end_of_life">End of Life</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="recycling">Recycling</SelectItem>
          </SelectContent>
        </Select>
        <Select value={chemistry} onValueChange={(v) => { setChemistry(v); setOffset(0); }}>
          <SelectTrigger className="w-32 bg-card border-border h-9 text-sm">
            <SelectValue placeholder="Chemistry" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Chemistry</SelectItem>
            <SelectItem value="NMC">NMC</SelectItem>
            <SelectItem value="LFP">LFP</SelectItem>
            <SelectItem value="NCA">NCA</SelectItem>
            <SelectItem value="LCO">LCO</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["BPAN", "Chemistry", "Capacity", "SOH", "Status", "Origin", "Mfg Date", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary/50 rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : batteries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Battery className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No batteries found.</p>
                    <Link href="/batteries/register">
                      <Button size="sm" className="mt-4 bg-primary text-primary-foreground">Register First Battery</Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                batteries.map((b) => {
                  const soh = Number(b.currentSoh ?? 100);
                  const sohColor = soh > 75 ? "text-primary" : soh > 50 ? "text-chart-4" : "text-destructive";
                  return (
                    <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-3.5 h-3.5 text-muted-foreground/40" />
                          <span className="font-mono text-xs text-primary">{b.bpan}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-chart-2">{b.chemistry}</span></td>
                      <td className="px-4 py-3"><span className="font-mono text-xs">{b.capacityKwh} kWh</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${soh > 75 ? "bg-primary" : soh > 50 ? "bg-chart-4" : "bg-destructive"}`} style={{ width: `${soh}%` }} />
                          </div>
                          <span className={`font-mono text-xs ${sohColor}`}>{soh.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`font-mono text-[9px] capitalize ${STATUS_STYLES[b.status] ?? ""}`}>
                          {b.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{b.cellOriginCountry}</span></td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {b.mfgYear}-{String(b.mfgMonth).padStart(2, "0")}-{String(b.mfgDay).padStart(2, "0")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/batteries/${b.bpan}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="font-mono text-[10px] text-muted-foreground">Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="h-7 text-xs border-border">Previous</Button>
              <Button variant="outline" size="sm" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)} className="h-7 text-xs border-border">Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
