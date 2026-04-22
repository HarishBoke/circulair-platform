import { useState, useId } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Code2, Key, Copy, Trash2, Plus, Eye, EyeOff, Globe, Zap, BarChart3, Shield, Webhook, CheckCircle2, AlertCircle, Download, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

function SdkDownloadSection() {
  const { data: sdks } = trpc.developerApi.getSdkDownloadUrls.useQuery();
  const [activeTab, setActiveTab] = useState<"typescript" | "python">("typescript");

  const sdk = sdks?.[activeTab];

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-400" aria-hidden="true" />
          SDK Downloads
        </CardTitle>
        <CardDescription>
          Auto-generated from the OpenAPI 3.1 spec - typed clients for TypeScript and Python
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language tabs */}
        <div className="flex gap-2" role="tablist" aria-label="SDK language">
          {(["typescript", "python"] as const).map((lang) => (
            <button
              key={lang}
              role="tab"
              aria-selected={activeTab === lang}
              onClick={() => setActiveTab(lang)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === lang
                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {lang === "typescript" ? "TypeScript / JS" : "Python"}
            </button>
          ))}
        </div>

        {sdk && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-sm font-semibold text-foreground">{sdk.name} <Badge variant="outline" className="ml-2 text-xs">{sdk.version}</Badge></p>
                <p className="text-sm text-muted-foreground mt-1">{sdk.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Size: {sdk.sizeKb} KB · Generated: {new Date(sdk.generatedAt).toLocaleDateString()}
                </p>
              </div>
              <a
                href={sdk.downloadUrl}
                download={sdk.filename}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors flex-shrink-0"
                aria-label={`Download ${sdk.name} SDK ZIP`}
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Download ZIP
              </a>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Install</p>
              <pre className="text-xs font-mono bg-muted/30 p-3 rounded-lg text-foreground overflow-x-auto">{sdk.installCommand}</pre>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quickstart</p>
              <pre className="text-xs font-mono bg-muted/30 p-3 rounded-lg text-foreground overflow-x-auto whitespace-pre-wrap">{sdk.quickstart}</pre>
            </div>

            <div className="flex gap-3 text-xs text-muted-foreground pt-1">
              <a href="/api-reference" className="hover:text-orange-400 underline underline-offset-2">API Reference</a>
              <a href="/mcp-server" className="hover:text-orange-400 underline underline-offset-2">MCP Server Docs</a>
              <a href="/api/v1/openapi.json" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 underline underline-offset-2">OpenAPI Spec</a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
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

  // Webhook state
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["soh.updated"]);
  const [deleteWebhookConfirmId, setDeleteWebhookConfirmId] = useState<number | null>(null);

  const keyNameId = useId();
  const rateLimitId = useId();
  const expiresId = useId();
  const webhookNameId = useId();
  const webhookUrlId = useId();

  const { data: keys, refetch } = trpc.developerApi.listKeys.useQuery();
  const { data: webhooks, refetch: refetchWebhooks } = trpc.webhook.list.useQuery();

  const createWebhookMutation = trpc.webhook.create.useMutation({
    onSuccess: () => {
      setWebhookDialogOpen(false);
      setWebhookName("");
      setWebhookUrl("");
      setWebhookEvents(["soh.updated"]);
      refetchWebhooks();
      toast.success("Webhook registered", { description: "Events will be delivered to your endpoint." });
    },
    onError: (err) => toast.error("Failed to register webhook", { description: err.message }),
  });

  const deleteWebhookMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      setDeleteWebhookConfirmId(null);
      refetchWebhooks();
      toast.success("Webhook deleted");
    },
    onError: (err) => toast.error("Failed to delete webhook", { description: err.message }),
  });

  const WEBHOOK_EVENTS = [
    { id: "soh.updated",       label: "SOH Updated",         description: "Fired when a battery's SOH is recalculated" },
    { id: "triage.completed",  label: "Triage Completed",    description: "Fired when a triage decision is approved" },
    { id: "telemetry.alert",   label: "Telemetry Alert",     description: "Fired when an alert threshold is breached" },
    { id: "battery.registered",label: "Battery Registered",  description: "Fired when a new BPAN is registered" },
    { id: "marketplace.offer", label: "Marketplace Offer",   description: "Fired when a new offer is placed on a listing" },
    { id: "compliance.report", label: "Compliance Report",   description: "Fired when a compliance report is generated" },
  ];

  const toggleWebhookEvent = (eventId: string) => {
    setWebhookEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    );
  };

  const handleCreateWebhook = () => {
    if (!webhookName.trim()) { toast.error("Webhook name required"); return; }
    if (!webhookUrl.trim()) { toast.error("Endpoint URL required"); return; }
    if (webhookEvents.length === 0) { toast.error("Select at least one event"); return; }
    try { new URL(webhookUrl); } catch { toast.error("Invalid URL", { description: "Must be a valid https:// URL" }); return; }
    createWebhookMutation.mutate({ name: webhookName.trim(), url: webhookUrl.trim(), events: webhookEvents });
  };

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
    createMutation.mutate({ name: newKeyName.trim(), permissions: selectedPerms as any[], rateLimit, expiresInDays, origin: window.location.origin });
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

      {/* Webhook Management */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="w-4 h-4 text-orange-400" aria-hidden="true" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Receive push notifications when platform events occur — no polling required
              </CardDescription>
            </div>
            <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
                  <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Register Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Register Webhook Endpoint</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor={webhookNameId}>Webhook Name</Label>
                    <Input
                      id={webhookNameId}
                      placeholder="e.g. Partner SOH Listener"
                      value={webhookName}
                      onChange={(e) => setWebhookName(e.target.value)}
                      aria-required="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={webhookUrlId}>Endpoint URL</Label>
                    <Input
                      id={webhookUrlId}
                      type="url"
                      placeholder="https://your-service.example.com/webhooks/circulair"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      aria-required="true"
                      aria-describedby="webhook-url-hint"
                    />
                    <p id="webhook-url-hint" className="text-xs text-muted-foreground">
                      Must be a publicly reachable HTTPS endpoint. We'll POST JSON payloads with an
                      HMAC-SHA256 signature in the <code className="bg-muted px-1 rounded">X-Circulair-Signature</code> header.
                    </p>
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium leading-none">Events to Subscribe</legend>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-border/30 rounded-lg p-2">
                      {WEBHOOK_EVENTS.map((ev) => (
                        <div key={ev.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
                          <Checkbox
                            id={`wh-ev-${ev.id}`}
                            checked={webhookEvents.includes(ev.id)}
                            onCheckedChange={() => toggleWebhookEvent(ev.id)}
                            className="mt-0.5"
                          />
                          <div>
                            <label htmlFor={`wh-ev-${ev.id}`} className="text-sm font-medium cursor-pointer">
                              {ev.label}
                              <span className="ml-2 font-mono text-xs text-muted-foreground">({ev.id})</span>
                            </label>
                            <p className="text-xs text-muted-foreground">{ev.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                  <Button
                    onClick={handleCreateWebhook}
                    disabled={createWebhookMutation.isPending}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    aria-busy={createWebhookMutation.isPending}
                  >
                    {createWebhookMutation.isPending ? "Registering…" : "Register Webhook"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!webhooks || webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="w-8 h-8 mx-auto mb-3 opacity-30" aria-hidden="true" />
              <p className="text-sm">No webhooks registered yet.</p>
              <p className="text-xs mt-1">Register an endpoint to receive push notifications.</p>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Registered webhooks">
              {(webhooks as any[]).map((wh) => (
                <li
                  key={wh.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20"
                >
                  <div className="mt-0.5">
                    {wh.status === "active" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-label="Active" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" aria-label={wh.status} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{wh.name}</p>
                    <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">{wh.url}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(wh.events as string[]).map((ev: string) => (
                        <Badge key={ev} variant="outline" className="text-xs border-border/50 font-mono">
                          {ev}
                        </Badge>
                      ))}
                    </div>
                    {wh.lastDeliveryAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last delivery: {new Date(wh.lastDeliveryAt).toLocaleString()}
                        {wh.totalFailures > 0 && (
                          <span className="ml-2 text-amber-400">{wh.totalFailures} failure{wh.totalFailures !== 1 ? "s" : ""}</span>
                        )}
                      </p>
                    )}
                  </div>
                  {deleteWebhookConfirmId === wh.id ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={deleteWebhookMutation.isPending}
                        onClick={() => deleteWebhookMutation.mutate({ webhookId: wh.id })}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDeleteWebhookConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
                      aria-label={`Delete webhook "${wh.name}"`}
                      onClick={() => setDeleteWebhookConfirmId(wh.id)}
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

      {/* SDK Downloads */}
      <SdkDownloadSection />

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
