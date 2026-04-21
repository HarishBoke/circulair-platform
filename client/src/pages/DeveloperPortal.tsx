import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Code2, Key, Copy, Trash2, Plus, Eye, EyeOff, Globe, Zap, BarChart3, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ALL_PERMISSIONS = [
  { id: "soh_predict", label: "SOH Prediction", description: "Run AI state-of-health predictions" },
  { id: "bpan_validate", label: "BPAN Validation", description: "Validate and look up battery IDs" },
  { id: "compliance_report", label: "Compliance Reports", description: "Generate EPR/CPCB reports" },
  { id: "telemetry_read", label: "Telemetry Read", description: "Read live telemetry streams" },
  { id: "marketplace_read", label: "Marketplace Read", description: "Browse marketplace listings" },
  { id: "carbon_report", label: "Carbon Reports", description: "Generate carbon footprint data" },
  { id: "digital_twin", label: "Digital Twin", description: "Run digital twin simulations" },
];

export default function DeveloperPortal() {
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>(["soh_predict", "bpan_validate"]);
  const [rateLimit, setRateLimit] = useState(100);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: keys, refetch } = trpc.developerApi.listKeys.useQuery();

  const createMutation = trpc.developerApi.createKey.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.plaintext ?? null);
      setDialogOpen(false);
      refetch();
      toast.success("API key created", { description: "Copy it now — it will not be shown again" });
    },
    onError: (err) => toast.error("Failed to create key", { description: err.message }),
  });

  const revokeMutation = trpc.developerApi.revokeKey.useMutation({
    onSuccess: () => { refetch(); toast.success("API key revoked"); },
    onError: (err) => toast.error("Failed to revoke key", { description: err.message }),
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) { toast.error("Name required"); return; }
    if (selectedPerms.length === 0) { toast.error("Select at least one permission"); return; }
    createMutation.mutate({ name: newKeyName.trim(), permissions: selectedPerms as any[], rateLimit, expiresInDays });
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-500/10">
          <Code2 className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Developer Portal</h1>
          <p className="text-sm text-muted-foreground">Manage API keys, permissions, and rate limits for programmatic access</p>
        </div>
        <Badge variant="outline" className="ml-auto border-orange-500/30 text-orange-400 bg-orange-500/10">v3.0</Badge>
      </div>

      {/* Base URL Banner */}
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Base API URL</p>
              <p className="text-sm font-mono text-foreground truncate">https://circulair.energy/api/v1</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard("https://circulair.energy/api/v1")}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Pass your API key as: <code className="bg-muted px-1 rounded">Authorization: Bearer cai_...</code></p>
        </CardContent>
      </Card>

      {/* Created Key Banner */}
      {createdKey && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">New API Key — copy it now, it will not be shown again</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-muted/50 p-2 rounded truncate">
                {showKey ? createdKey : "cai_" + "•".repeat(40)}
              </code>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(createdKey)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys Table */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">API Keys</CardTitle>
              <CardDescription>{keys?.length ?? 0} key{keys?.length !== 1 ? "s" : ""} active</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                  <Plus className="w-4 h-4 mr-1.5" />New Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Key Name</Label>
                    <Input placeholder="e.g. Production Integration" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {ALL_PERMISSIONS.map((perm) => (
                        <div key={perm.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
                          <Checkbox
                            id={perm.id}
                            checked={selectedPerms.includes(perm.id)}
                            onCheckedChange={() => togglePerm(perm.id)}
                            className="mt-0.5"
                          />
                          <div>
                            <label htmlFor={perm.id} className="text-sm font-medium cursor-pointer">{perm.label}</label>
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Rate Limit (req/min)</Label>
                      <Input type="number" min={10} max={10000} value={rateLimit} onChange={(e) => setRateLimit(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expires In (days, optional)</Label>
                      <Input type="number" min={1} placeholder="Never" value={expiresInDays ?? ""} onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                  </div>
                  <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                    {createMutation.isPending ? "Creating…" : "Create API Key"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!keys || keys.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Key className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key: any) => (
                <div key={key.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                  <Key className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{key.name}</p>
                      <Badge variant="outline" className="text-xs border-border/50">{key.prefix}…</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="w-3 h-3" />{key.rateLimit}/min
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />{key.callCount ?? 0} calls
                      </span>
                      {key.expiresAt && (
                        <span className="text-xs text-amber-400">Expires {new Date(key.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {(key.permissions ?? "").split(",").slice(0, 2).map((p: string) => (
                      <Badge key={p} variant="outline" className="text-xs border-border/50 hidden md:inline-flex">{p.replace("_", " ")}</Badge>
                    ))}
                    {(key.permissions ?? "").split(",").length > 2 && (
                      <Badge variant="outline" className="text-xs border-border/50 hidden md:inline-flex">+{(key.permissions ?? "").split(",").length - 2}</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => { if (confirm("Revoke this API key?")) revokeMutation.mutate({ id: key.id }); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono bg-muted/30 p-4 rounded-lg overflow-x-auto text-foreground">
{`# SOH Prediction
curl -X POST https://circulair.energy/api/v1/soh/predict \\
  -H "Authorization: Bearer cai_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"bpan":"IND-A3F-2024A01-00001","chemistry":"NMC"}'

# BPAN Validation
curl https://circulair.energy/api/v1/bpan/validate/IND-A3F-2024A01-00001 \\
  -H "Authorization: Bearer cai_your_key_here"

# Carbon Footprint
curl -X POST https://circulair.energy/api/v1/carbon/calculate \\
  -H "Authorization: Bearer cai_your_key_here" \\
  -d '{"bpan":"IND-A3F-2024A01-00001","gridRegion":"IN"}'`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
