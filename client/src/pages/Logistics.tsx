import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Truck, Plus, MapPin, Clock, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  dispatched: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  in_transit: "bg-primary/10 text-primary border-primary/20",
  delivered: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Logistics() {
  usePageTitle("Logistics");

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState({
    bpan: "",
    batteryId: 0,
    pickupAddress: "",
    deliveryAddress: "",
    pickupType: "standard" as "standard" | "hazmat" | "urgent",
    requestedPickupDate: "",
  });

  const { data, isLoading, refetch } = trpc.logistics.list.useQuery({ limit: 20, offset: 0 });
  const createMutation = trpc.logistics.requestPickup.useMutation({
    onSuccess: () => { toast.success("Pickup requested! SLA: 24–48 hours."); setShowCreateDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const orders = data?.items ?? [];
  const total = data?.total ?? 0;

  const getSlaStatus = (requestedAt: Date, status: string) => {
    if (status === "delivered") return { label: "Delivered", ok: true };
    const hours = (Date.now() - new Date(requestedAt).getTime()) / 3600000;
    if (hours > 48) return { label: `${hours.toFixed(0)}h (SLA BREACH)`, ok: false };
    if (hours > 24) return { label: `${hours.toFixed(0)}h (Warning)`, ok: false };
    return { label: `${hours.toFixed(0)}h`, ok: true };
  };

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Reverse Logistics</h1>
          <p className="text-muted-foreground text-sm mt-1">Hazmat dispatch · GPS chain-of-custody · 24/48h SLA monitoring</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Request Pickup
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Request Battery Pickup</DialogTitle>
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
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Pickup Type</Label>
                <Select value={form.pickupType} onValueChange={(v) => setForm({ ...form, pickupType: v as "standard" | "hazmat" | "urgent" })}>
                  <SelectTrigger className="bg-secondary/30 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="standard">Standard Pickup</SelectItem>
                    <SelectItem value="hazmat">Hazmat Dispatch</SelectItem>
                    <SelectItem value="urgent">Urgent (Thermal Event)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Pickup Address</Label>
                <Input
                  placeholder="Full pickup address"
                  value={form.pickupAddress}
                  onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
                  className="bg-secondary/30 border-border text-sm h-9"
                />
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Delivery Address</Label>
                <Input
                  placeholder="Recycler / BESS facility address"
                  value={form.deliveryAddress}
                  onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                  className="bg-secondary/30 border-border text-sm h-9"
                />
              </div>
              <div>
                <Label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 block">Requested Pickup Date</Label>
                <Input
                  type="date"
                  value={form.requestedPickupDate}
                  onChange={(e) => setForm({ ...form, requestedPickupDate: e.target.value })}
                  className="bg-secondary/30 border-border font-mono text-sm h-9"
                />
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate({
                  bpan: form.bpan,
                  batteryId: form.batteryId,
                  pickupAddress: form.pickupAddress,
                  deliveryAddress: form.deliveryAddress,
                  slaTier: form.pickupType === "urgent" ? "24h" : "48h",
                  notes: form.pickupType === "hazmat" ? "HAZMAT: Special handling required" : undefined,
                })}
              >
                {createMutation.isPending ? "Requesting..." : "Submit Pickup Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* SLA Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: total, icon: Truck, color: "text-foreground" },
          { label: "In Transit", value: orders.filter((o) => o.status === "in_transit").length, icon: MapPin, color: "text-primary" },
          { label: "Pending", value: orders.filter((o) => o.status === "pending").length, icon: Clock, color: "text-chart-4" },
          { label: "SLA Breaches", value: orders.filter((o) => {
            if (o.status === "delivered") return false;
            const hours = (Date.now() - new Date(o.requestedAt).getTime()) / 3600000;
            return hours > 48;
          }).length, icon: AlertTriangle, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color} opacity-50`} />
            </div>
            <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-display text-sm font-bold">Logistics Orders</h3>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{total} total orders</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border h-8">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["BPAN", "Type", "Status", "Pickup Address", "Tracking", "SLA", "Requested"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary/50 rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No logistics orders yet.</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const sla = getSlaStatus(order.requestedAt, order.status);
                  return (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-3 font-mono text-xs text-primary">{order.bpan}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`font-mono text-[9px] ${order.slaTier === "24h" ? "bg-destructive/10 text-destructive border-destructive/20" : "border-border"}`}>
                          SLA {order.slaTier ?? "48h"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`font-mono text-[9px] capitalize ${STATUS_STYLES[order.status] ?? ""}`}>
                          {order.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground truncate max-w-32 block">{order.pickupAddress ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-primary">{order.shipmentId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {sla.ok ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <AlertTriangle className="w-3 h-3 text-destructive" />}
                          <span className={`font-mono text-[10px] ${sla.ok ? "text-primary" : "text-destructive"}`}>{sla.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {new Date(order.requestedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
