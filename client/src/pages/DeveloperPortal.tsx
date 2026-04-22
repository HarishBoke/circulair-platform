import { useState, useId } from "react";
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

// Scope names follow the read:<resource> / write:<resource> convention (WCAG-neutral, but also API-contract fix)
const ALL_PERMISSIONS = [
  { id: "soh_predict",       label: "SOH Prediction",    scope: "predict:soh",         description: "Run AI state-of-health predictions" },
  { id: "bpan_validate",     label: "BPAN Validation",   scope: "read:bpan",           description: "Validate and look up battery IDs" },
  { id: "compliance_report", label: "Compliance Reports", scope: "read:compliance",     description: "Generate EPR/CPCB reports" },
  { id: "telemetry_read",    label: "Telemetry Read",    scope: "read:telemetry",      description: "Read live telemetry streams" },
  { id: "marketplace_read",  label: "Marketplace Read",  scope: "read:marketplace",    description: "Browse marketplace listings" },
  { id: "carbon_report",     label: "Carbon Reports",    scope: "read:carbon",         description: "Generate carbon footprint data" },
  { id: "digital_twin",      label: "Digital Twin",      scope: "read:digital-twin",   description: "Run digital twin simulations" },
];

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for environments without Clipboard API
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

export default function DeveloperPortal() {
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>(["soh_predict", "bpan_validate"]);
  const [rateLimit, setRateLimit] = useState(100);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revokeConfirmId, setRevokeConfirmId] = useState<number | null>(null);

  const keyNameId = useId();
  const rateLimitId = useId();
  const expiresId = useId();

  const { data: keys, refetch } = trpc.developerApi.listKeys.useQuery();

  const createMutation = trpc.developerApi.createKey.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.plaintext ?? null);
      setShowKey(false);
      setDialogOpen(false);
      setNewKeyName("");
      setSelectedPerms(["soh_predict", "bpan_validate"]);
      refetch();
      toast.success("API key created", { description: "Copy it now — it will not be shown again" });
    },
    onError: (err) => toast.error("Failed to create key", { description: err.message }),
  });

  const revokeMutation = trpc.developerApi.revokeKey.useMutation({
    onSuccess: () => {
      setRevokeConfirmId(null);
      refetch();
      toast.success("API key revoked");
    },
    onError: (err) => toast.error("Failed to revoke key", { description: err.message }),
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) { toast.error("Name required"); return; }
    if (selectedPerms.length === 0) { toast.error("Select at least one permission"); return; }
    createMutation.mutate({ name: newKeyName.trim(), permissions: selectedPerms as any[], rateLimit, expiresInDays });
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleCopy = async (text: string, label = "Copied to clipboard") => {
    try {
      await copyText(text);
      toast.success(label);
    } catch {
      toast.error("Copy failed", { description: "Please copy manually: " + text.slice(0, 20) + "…" });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page heading */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-500/10" aria-hidden="true">
          <Code2 className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Developer Portal</h1>
          <p className="text-sm text-muted-foreground">
            Manage API keys, permissions, and rate limits for programmatic access
          </p>
        </div>
        <Badge
          variant="outline"
          className="ml-auto border-orange-500/30 text-orange-400 bg-orange-500/10"
        >
          v3.0
        </Badge>
      </div>

      {/* Base URL Banner */}
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-orange-400 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Base API URL</p>
              <p className="text-sm font-mono text-foreground truncate">
                https://circulair.energy/api/v1
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Copy base API URL"
              onClick={() => handleCopy("https://circulair.energy/api/v1", "Base URL copied")}
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Pass your API key as:{" "}
            <code className="bg-muted px-1 rounded">Authorization: Bearer cai_…</code>
          </p>
        </CardContent>
      </Card>

      {/* Created Key Banner — aria-live so screen readers announce it */}
      <div aria-live="assertive" aria-atomic="true">
        {createdKey && (
          <Card className="border-emerald-500/30 bg-emerald-500/10">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span className="text-sm font-semibold text-emerald-400">
                  New API Key — copy it now, it will not be shown again
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-muted/50 p-2 rounded truncate">
                  {showKey ? createdKey : "cai_" + "•".repeat(40)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                  aria-pressed={showKey}
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Copy new API key"
                  onClick={() => handleCopy(createdKey, "API key copied")}
                >
                  <Copy className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Keys Table */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">API Keys</CardTitle>
              <CardDescription>
                {keys?.length ?? 0} key{keys?.length !== 1 ? "s" : ""} active
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                  <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  New Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor={keyNameId}>Key Name</Label>
                    <Input
                      id={keyNameId}
                      placeholder="e.g. Production Integration"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      aria-required="true"
                    />
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium leading-none">
                      Permissions
                    </legend>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-border/30 rounded-lg p-2">
                      {ALL_PERMISSIONS.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30"
                        >
                          <Checkbox
                            id={`perm-${perm.id}`}
                            checked={selectedPerms.includes(perm.id)}
                            onCheckedChange={() => togglePerm(perm.id)}
                            className="mt-0.5"
                            aria-describedby={`perm-desc-${perm.id}`}
                          />
                          <div>
                            <label
                              htmlFor={`perm-${perm.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {perm.label}
                              <span className="ml-2 font-mono text-xs text-muted-foreground">
                                ({perm.scope})
                              </span>
                            </label>
                            <p
                              id={`perm-desc-${perm.id}`}
                              className="text-xs text-muted-foreground"
                            >
                              {perm.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={rateLimitId}>Rate Limit (req/min)</Label>
                      <Input
                        id={rateLimitId}
                        type="number"
                        min={10}
                        max={10000}
                        value={rateLimit}
                        onChange={(e) => setRateLimit(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={expiresId}>Expires In (days, optional)</Label>
                      <Input
                        id={expiresId}
                        type="number"
                        min={1}
                        placeholder="Never"
                        value={expiresInDays ?? ""}
                        onChange={(e) =>
                          setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    aria-busy={createMutation.isPending}
                  >
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
              <Key className="w-8 h-8 mx-auto mb-3 opacity-30" aria-hidden="true" />
              <p className="text-sm">No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Active API keys">
              {keys.map((key: any) => (
                <li
                  key={key.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20"
                >
                  <Key className="w-4 h-4 text-orange-400 flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{key.name}</p>
                      <Badge variant="outline" className="text-xs border-border/50 font-mono">
                        {key.prefix}…
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="w-3 h-3" aria-hidden="true" />
                        {key.rateLimit}/min
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" aria-hidden="true" />
                        {key.callCount ?? 0} calls
                      </span>
                      {key.expiresAt && (
                        <span className="text-xs text-amber-400">
                          Expires {new Date(key.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {(key.permissions ?? "").split(",").slice(0, 2).map((p: string) => {
                      const match = ALL_PERMISSIONS.find((ap) => ap.id === p.trim());
                      return (
                        <Badge
                          key={p}
                          variant="outline"
                          className="text-xs border-border/50 hidden md:inline-flex font-mono"
                        >
                          {match?.scope ?? p.replace("_", ":")}
                        </Badge>
                      );
                    })}
                    {(key.permissions ?? "").split(",").length > 2 && (
                      <Badge
                        variant="outline"
                        className="text-xs border-border/50 hidden md:inline-flex"
                      >
                        +{(key.permissions ?? "").split(",").length - 2}
                      </Badge>
                    )}
                  </div>

                  {/* Revoke — use dialog-style confirmation instead of window.confirm() */}
                  {revokeConfirmId === key.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={revokeMutation.isPending}
                        aria-busy={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate({ id: key.id })}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setRevokeConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      aria-label={`Revoke API key "${key.name}"`}
                      onClick={() => setRevokeConfirmId(key.id)}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" aria-hidden="true" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="sr-only">
            Example curl commands for the Circul-AI-r REST API. Replace cai_your_key_here with your
            actual API key.
          </p>
          <pre
            className="text-xs font-mono bg-muted/30 p-4 rounded-lg overflow-x-auto text-foreground"
            aria-label="API quick-start examples"
            tabIndex={0}
          >
{`# SOH Prediction  (scope: predict:soh)
curl -X POST https://circulair.energy/api/v1/soh/predict \\
  -H "Authorization: Bearer cai_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"bpan":"IND-A3F-2024A01-00001","chemistry":"NMC"}'

# BPAN Validation  (scope: read:bpan)
curl https://circulair.energy/api/v1/bpan/validate/IND-A3F-2024A01-00001 \\
  -H "Authorization: Bearer cai_your_key_here"

# Telemetry Stream  (scope: read:telemetry)
curl https://circulair.energy/api/v1/telemetry/IND-A3F-2024A01-00001/latest \\
  -H "Authorization: Bearer cai_your_key_here"

# Carbon Footprint  (scope: read:carbon)
curl -X POST https://circulair.energy/api/v1/carbon/calculate \\
  -H "Authorization: Bearer cai_your_key_here" \\
  -d '{"bpan":"IND-A3F-2024A01-00001","gridRegion":"IN"}'`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
