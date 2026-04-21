import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingUp, ShoppingCart, Calendar, Zap, Plus, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const CHEMISTRY_OPTIONS = ["LFP", "NMC", "NCA", "LCO", "LMO", "LEAD_ACID", "SOLID_STATE"];

export default function PredictiveProcurement() {
  const [horizonMonths, setHorizonMonths] = useState(12);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    targetSohMin: 70, targetSohMax: 90, chemistry: "NMC", minCapacityKwh: 10,
    quantity: 1, deliveryMonth: new Date().toISOString().slice(0, 7), maxPricePerKwh: 150,
  });

  const { data: forecast, isLoading: forecastLoading, refetch: refetchForecast } = trpc.procurement.forecastSupply.useQuery({ horizonMonths });
  const { data: orders, refetch: refetchOrders } = trpc.procurement.listForwardOrders.useQuery();

  const createOrderMutation = trpc.procurement.createForwardOrder.useMutation({
    onSuccess: () => {
      setOrderDialogOpen(false);
      refetchOrders();
      toast.success("Forward order created", { description: "You will be notified when matching batteries become available" });
    },
    onError: (err: any) => toast.error("Failed to create order", { description: err.message }),
  });

  const handleCreateOrder = () => {
    createOrderMutation.mutate({
      ...orderForm,
      chemistry: orderForm.chemistry as any,
    });
  };

  const STATUS_COLORS: Record<string, string> = {
    open: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    matched: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    fulfilled: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    cancelled: "border-red-500/30 bg-red-500/10 text-red-400",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-500/10">
          <TrendingUp className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Predictive Procurement</h1>
          <p className="text-sm text-muted-foreground">Supply pipeline forecasting and forward battery purchase orders — v4.0</p>
        </div>
        <Badge variant="outline" className="ml-auto border-violet-500/30 text-violet-400 bg-violet-500/10">v4.0</Badge>
      </div>

      {/* Forecast Controls */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Supply Pipeline Forecast</CardTitle>
              <CardDescription>Projected battery availability based on current fleet SOH degradation curves</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Horizon</Label>
              <Select value={String(horizonMonths)} onValueChange={(v) => { setHorizonMonths(Number(v)); refetchForecast(); }}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 6, 12, 18, 24].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} months</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {forecastLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Calculating supply pipeline…</div>
          ) : forecast ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Batteries", value: (forecast as any).totalBatteries ?? 0, icon: <Zap className="w-4 h-4 text-violet-400" /> },
                  { label: "EOL in 12 months", value: (forecast as any).eolIn12Months ?? 0, icon: <Clock className="w-4 h-4 text-amber-400" /> },
                  { label: "Available Now", value: (forecast as any).availableNow ?? 0, icon: <ShoppingCart className="w-4 h-4 text-emerald-400" /> },
                  { label: "Avg SOH", value: `${((forecast as any).avgSoh ?? 0).toFixed(1)}%`, icon: <TrendingUp className="w-4 h-4 text-blue-400" /> },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-2 mb-1">{stat.icon}<p className="text-xs text-muted-foreground">{stat.label}</p></div>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Monthly Forecast Table */}
              {(forecast as any).monthlyForecast && (forecast as any).monthlyForecast.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Month</th>
                        <th className="text-right py-2 pr-4 text-muted-foreground font-medium">Reaching EOL</th>
                        <th className="text-right py-2 pr-4 text-muted-foreground font-medium">Repurpose Ready</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Recycle Ready</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(forecast as any).monthlyForecast.slice(0, 12).map((row: any) => (
                        <tr key={row.month} className="border-b border-border/10 hover:bg-muted/10">
                          <td className="py-2 pr-4 font-mono text-foreground">{row.month}</td>
                          <td className="py-2 pr-4 text-right text-amber-400">{row.reachingEol ?? 0}</td>
                          <td className="py-2 pr-4 text-right text-blue-400">{row.repurposeReady ?? 0}</td>
                          <td className="py-2 text-right text-orange-400">{row.recycleReady ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">No batteries in your fleet to forecast.</div>
          )}
        </CardContent>
      </Card>

      {/* Forward Orders */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Forward Purchase Orders</CardTitle>
              <CardDescription>Pre-commit to battery purchases when supply meets your criteria</CardDescription>
            </div>
            <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                  <Plus className="w-4 h-4 mr-1.5" />New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Forward Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Min SOH (%)</Label>
                      <Input type="number" min={0} max={100} value={orderForm.targetSohMin}
                        onChange={(e) => setOrderForm((f) => ({ ...f, targetSohMin: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max SOH (%)</Label>
                      <Input type="number" min={0} max={100} value={orderForm.targetSohMax}
                        onChange={(e) => setOrderForm((f) => ({ ...f, targetSohMax: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Chemistry</Label>
                    <Select value={orderForm.chemistry} onValueChange={(v) => setOrderForm((f) => ({ ...f, chemistry: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CHEMISTRY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Min Capacity (kWh)</Label>
                      <Input type="number" min={1} value={orderForm.minCapacityKwh}
                        onChange={(e) => setOrderForm((f) => ({ ...f, minCapacityKwh: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" min={1} max={1000} value={orderForm.quantity}
                        onChange={(e) => setOrderForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Delivery Month</Label>
                      <Input type="month" value={orderForm.deliveryMonth}
                        onChange={(e) => setOrderForm((f) => ({ ...f, deliveryMonth: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Price ($/kWh)</Label>
                      <Input type="number" min={1} value={orderForm.maxPricePerKwh}
                        onChange={(e) => setOrderForm((f) => ({ ...f, maxPricePerKwh: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <Button onClick={handleCreateOrder} disabled={createOrderMutation.isPending} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                    {createOrderMutation.isPending ? "Creating…" : "Create Forward Order"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!orders || (orders as any[]).length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShoppingCart className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No forward orders yet. Create one to pre-commit to future battery supply.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(orders as any[]).map((order: any) => (
                <div key={order.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                  <Calendar className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{order.chemistry ?? "Any"} — SOH {order.targetSohMin}–{order.targetSohMax}%</p>
                      <Badge className={`text-xs capitalize ${STATUS_COLORS[order.status] ?? ""}`}>{order.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Qty: {order.quantity} · Min {order.minCapacityKwh ?? "—"} kWh · Deliver by {order.deliveryMonth} · Max ${order.maxPricePerKwh ?? "—"}/kWh
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
