import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Share2, Plus, Shield, Users, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const DATA_SCOPES = [
  { id: "telemetry", label: "Real-time Telemetry", description: "Live voltage, current, temperature readings" },
  { id: "soh_predictions", label: "SOH Predictions", description: "AI-generated health and RUL forecasts" },
  { id: "compliance_reports", label: "Compliance Reports", description: "CPCB, EU, MIIT regulatory documents" },
  { id: "battery_passport", label: "Battery Passport", description: "Full lifecycle provenance and chemistry data" },
  { id: "carbon_data", label: "Carbon Accounting", description: "Lifecycle CO₂ footprint and Scope 3 data" },
] as const;

type DataScope = typeof DATA_SCOPES[number]["id"];

export default function DataSharing() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ recipientOrgId: "", recipientOrgName: "", expiresInDays: 90, bpanFilter: "", scopes: [] as DataScope[] });

  const { data: consents, refetch } = trpc.dataSharing.listConsents.useQuery();

  const grantMutation = trpc.dataSharing.grantConsent.useMutation({
    onSuccess: () => { setDialogOpen(false); refetch(); toast.success("Data sharing agreement created"); },
    onError: (err: any) => toast.error("Failed to create agreement", { description: err.message }),
  });

  const revokeMutation = trpc.dataSharing.revokeConsent.useMutation({
    onSuccess: () => { refetch(); toast.success("Agreement revoked"); },
    onError: (err: any) => toast.error("Failed to revoke", { description: err.message }),
  });

  const toggleScope = (scope: DataScope) => {
    setForm((f) => ({ ...f, scopes: f.scopes.includes(scope) ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope] }));
  };

  const handleGrant = () => {
    if (!form.recipientOrgId || !form.recipientOrgName || form.scopes.length === 0) {
      toast.error("Please fill in all required fields and select at least one data scope");
      return;
    }
    grantMutation.mutate({ recipientOrgId: form.recipientOrgId, recipientOrgName: form.recipientOrgName, dataScope: form.scopes, expiresInDays: form.expiresInDays, bpanFilter: form.bpanFilter || undefined });
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    rejected: "border-red-500/30 bg-red-500/10 text-red-400",
    revoked: "border-border bg-secondary/40 text-muted-foreground",
    expired: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Share2 className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Multi-OEM Data Exchange</h1>
          <p className="text-sm text-muted-foreground">Consent-based battery data sharing across organisations — v3.0</p>
        </div>
        <Badge variant="outline" className="ml-auto border-blue-500/30 text-blue-400 bg-blue-500/10">v3.0</Badge>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4 pb-3 flex items-start gap-3">
          <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Data sharing agreements allow you to grant other organisations controlled access to your battery data. You choose exactly which data categories to share, which batteries to include, and when the agreement expires. You can revoke access at any time.
          </p>
        </CardContent>
      </Card>

      {/* Agreements List */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Data Sharing Agreements</CardTitle>
              <CardDescription>Organisations you have granted data access to</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-foreground">
                  <Plus className="w-4 h-4 mr-1.5" />New Agreement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Create Data Sharing Agreement</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Recipient Organisation Name <span className="text-red-400">*</span></Label>
                    <Input placeholder="e.g. Tata Motors Ltd" value={form.recipientOrgName}
                      onChange={(e) => setForm((f) => ({ ...f, recipientOrgName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Organisation ID / Domain <span className="text-red-400">*</span></Label>
                    <Input placeholder="e.g. tata-motors or tatamotors.com" value={form.recipientOrgId}
                      onChange={(e) => setForm((f) => ({ ...f, recipientOrgId: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>BPAN Filter (optional)</Label>
                    <Input placeholder="Leave blank to share all batteries" value={form.bpanFilter}
                      onChange={(e) => setForm((f) => ({ ...f, bpanFilter: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expires in (days)</Label>
                    <Input type="number" min={1} max={365} value={form.expiresInDays}
                      onChange={(e) => setForm((f) => ({ ...f, expiresInDays: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Scopes <span className="text-red-400">*</span></Label>
                    <div className="space-y-2">
                      {DATA_SCOPES.map((scope) => (
                        <div key={scope.id} className="flex items-start gap-3 p-2 rounded border border-border/30 hover:bg-muted/20">
                          <Checkbox id={scope.id} checked={form.scopes.includes(scope.id)}
                            onCheckedChange={() => toggleScope(scope.id)} className="mt-0.5" />
                          <div>
                            <label htmlFor={scope.id} className="text-sm font-medium cursor-pointer">{scope.label}</label>
                            <p className="text-xs text-muted-foreground">{scope.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleGrant} disabled={grantMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-foreground">
                    {grantMutation.isPending ? "Creating…" : "Create Agreement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!consents || (consents as any[]).length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No data sharing agreements yet.</p>
              <p className="text-xs mt-1">Create an agreement to share battery data with partner organisations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(consents as any[]).map((consent: any) => {
                const scopes = (() => { try { return JSON.parse(consent.scope); } catch { return []; } })();
                return (
                  <div key={consent.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                    <Share2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{consent.requestMessage?.replace("Org: ", "").split(" (")[0] ?? "Unknown Org"}</p>
                        <Badge className={`text-xs capitalize ${STATUS_COLORS[consent.status] ?? ""}`}>{consent.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scopes.map((s: string) => (
                          <Badge key={s} variant="outline" className="text-xs border-border/40">{s.replace(/_/g, " ")}</Badge>
                        ))}
                      </div>
                      {consent.expiresAt && (
                        <p className="text-xs text-muted-foreground mt-1">Expires: {new Date(consent.expiresAt).toLocaleDateString()}</p>
                      )}
                    </div>
                    {consent.status !== "revoked" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => revokeMutation.mutate({ id: consent.id })} disabled={revokeMutation.isPending}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
