import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle, Plus, Pencil, Trash2, Zap, ChevronDown, ChevronUp,
  Thermometer, Battery, Activity, BarChart3, RefreshCw, Info,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────
type Metric = "temperature" | "voltage" | "current" | "soc" | "soh" | "cycleCount" | "internalResistance";
type Operator = "gt" | "lt" | "gte" | "lte" | "eq";
type Severity = "info" | "warning" | "critical";
type Chemistry = "LFP" | "NMC" | "NCA" | "LCO" | "LMO" | "LEAD_ACID";

const METRIC_LABELS: Record<Metric, { label: string; unit: string; icon: React.ReactNode }> = {
  temperature:       { label: "Temperature",        unit: "°C",  icon: <Thermometer className="h-3.5 w-3.5" /> },
  voltage:           { label: "Voltage",            unit: "V",   icon: <Zap className="h-3.5 w-3.5" /> },
  current:           { label: "Current",            unit: "A",   icon: <Activity className="h-3.5 w-3.5" /> },
  soc:               { label: "State of Charge",    unit: "%",   icon: <Battery className="h-3.5 w-3.5" /> },
  soh:               { label: "State of Health",    unit: "%",   icon: <BarChart3 className="h-3.5 w-3.5" /> },
  cycleCount:        { label: "Cycle Count",        unit: "cyc", icon: <RefreshCw className="h-3.5 w-3.5" /> },
  internalResistance:{ label: "Internal Resistance",unit: "mΩ",  icon: <Activity className="h-3.5 w-3.5" /> },
};

const OPERATOR_LABELS: Record<Operator, string> = {
  gt: ">", lt: "<", gte: "≥", lte: "≤", eq: "=",
};

const SEVERITY_CONFIG: Record<Severity, { label: string; className: string }> = {
  info:     { label: "Info",     className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  warning:  { label: "Warning",  className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  critical: { label: "Critical", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const CHEMISTRY_COLORS: Record<Chemistry, string> = {
  NMC:      "bg-purple-500/15 text-purple-400 border-purple-500/30",
  LFP:      "bg-green-500/15 text-green-400 border-green-500/30",
  NCA:      "bg-orange-500/15 text-orange-400 border-orange-500/30",
  LCO:      "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  LMO:      "bg-pink-500/15 text-pink-400 border-pink-500/30",
  LEAD_ACID:"bg-secondary/50 text-muted-foreground border-border",
};

// ─── Rule Form ────────────────────────────────────────────────────────────────
interface RuleFormData {
  name: string;
  description: string;
  metric: Metric;
  operator: Operator;
  threshold: string;
  severity: Severity;
  chemistry: Chemistry | "";
  bpan: string;
  enabled: boolean;
}

const EMPTY_FORM: RuleFormData = {
  name: "", description: "", metric: "temperature", operator: "gt",
  threshold: "", severity: "warning", chemistry: "", bpan: "", enabled: true,
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AlertRules() {
  const [filterChemistry, setFilterChemistry] = useState<string>("");
  const [filterMetric, setFilterMetric] = useState<string>("");
  const [filterEnabled, setFilterEnabled] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDefaults, setShowDefaults] = useState(false);
  const [selectedChemistry, setSelectedChemistry] = useState<Chemistry>("NMC");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RuleFormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: rulesData, isLoading } = trpc.alertRules.list.useQuery({
    chemistry: filterChemistry || undefined,
    metric: filterMetric || undefined,
    enabled: filterEnabled === "all" ? undefined : filterEnabled === "enabled",
    limit: 200,
    offset: 0,
  });

  const { data: defaults } = trpc.alertRules.getDefaults.useQuery();

  // Mutations
  const createMutation = trpc.alertRules.create.useMutation({
    onSuccess: () => {
      utils.alertRules.list.invalidate();
      toast.success("Alert rule created");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.alertRules.update.useMutation({
    onSuccess: () => {
      utils.alertRules.list.invalidate();
      toast.success("Alert rule updated");
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = trpc.alertRules.toggle.useMutation({
    onMutate: async ({ id, enabled }) => {
      await utils.alertRules.list.cancel();
      const prev = utils.alertRules.list.getData({ limit: 200, offset: 0 });
      utils.alertRules.list.setData({ limit: 200, offset: 0 }, (old) =>
        old ? { ...old, items: old.items.map((r) => r.id === id ? { ...r, enabled } : r) } : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.alertRules.list.setData({ limit: 200, offset: 0 }, ctx.prev);
      toast.error("Failed to toggle rule");
    },
    onSettled: () => utils.alertRules.list.invalidate(),
  });

  const deleteMutation = trpc.alertRules.delete.useMutation({
    onSuccess: () => {
      utils.alertRules.list.invalidate();
      toast.success("Alert rule deleted");
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Filtered rules (client-side search on top of server filter)
  const rules = useMemo(() => {
    if (!rulesData?.items) return [];
    if (!searchQuery) return rulesData.items;
    const q = searchQuery.toLowerCase();
    return rulesData.items.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q) ||
      (r.bpan ?? "").toLowerCase().includes(q)
    );
  }, [rulesData, searchQuery]);

  // Handlers
  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(rule: typeof rules[0]) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      description: rule.description ?? "",
      metric: rule.metric as Metric,
      operator: rule.operator as Operator,
      threshold: String(rule.threshold),
      severity: rule.severity as Severity,
      chemistry: (rule.chemistry ?? "") as Chemistry | "",
      bpan: rule.bpan ?? "",
      enabled: rule.enabled,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const threshold = parseFloat(form.threshold);
    if (isNaN(threshold)) { toast.error("Threshold must be a number"); return; }
    if (!form.name.trim()) { toast.error("Rule name is required"); return; }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      metric: form.metric,
      operator: form.operator,
      threshold,
      severity: form.severity,
      chemistry: (form.chemistry || undefined) as Chemistry | undefined,
      bpan: form.bpan.trim() || undefined,
      enabled: form.enabled,
    };

    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function applyDefault(def: { metric: string; operator: string; threshold: number; severity: string; name: string }) {
    setForm({
      ...EMPTY_FORM,
      name: def.name,
      metric: def.metric as Metric,
      operator: def.operator as Operator,
      threshold: String(def.threshold),
      severity: def.severity as Severity,
      chemistry: selectedChemistry,
    });
    setDialogOpen(true);
    setShowDefaults(false);
  }

  const metricUnit = METRIC_LABELS[form.metric]?.unit ?? "";

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
              Alert Rule Configuration
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Define per-battery, per-chemistry, or platform-wide threshold rules for telemetry metrics.
              Rules replace hard-coded thresholds and are evaluated in real time by the MQTT subscriber.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowDefaults(!showDefaults)}>
              {showDefaults ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              Chemistry Defaults
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New Rule
            </Button>
          </div>
        </div>

        {/* Chemistry Defaults Panel */}
        {showDefaults && defaults && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-yellow-400">
                Recommended Defaults by Chemistry
              </CardTitle>
              <CardDescription className="text-xs">
                Click any row to pre-fill the create form. Select a chemistry to filter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap mb-4">
                {(["NMC", "LFP", "NCA", "LCO", "LMO", "LEAD_ACID"] as Chemistry[]).map((c) => (
                  <Button
                    key={c}
                    variant={selectedChemistry === c ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setSelectedChemistry(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
              <div className="grid gap-2">
                {(defaults[selectedChemistry] ?? []).map((def, i) => (
                  <button
                    key={i}
                    onClick={() => applyDefault(def)}
                    className="flex items-center justify-between text-left px-3 py-2 rounded-md border border-border hover:bg-accent/50 transition-colors text-sm"
                  >
                    <span className="font-medium">{def.name}</span>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <span>{METRIC_LABELS[def.metric as Metric]?.label}</span>
                      <span className="font-mono">{OPERATOR_LABELS[def.operator as Operator]} {def.threshold} {METRIC_LABELS[def.metric as Metric]?.unit}</span>
                      <Badge variant="outline" className={`text-xs ${SEVERITY_CONFIG[def.severity as Severity]?.className}`}>
                        {def.severity}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Rules", value: rulesData?.total ?? 0, color: "text-foreground" },
            { label: "Active", value: rules.filter((r) => r.enabled).length, color: "text-green-400" },
            { label: "Disabled", value: rules.filter((r) => !r.enabled).length, color: "text-muted-foreground" },
            { label: "Critical", value: rules.filter((r) => r.severity === "critical").length, color: "text-red-400" },
          ].map((s) => (
            <Card key={s.label} className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 h-8 text-sm"
          />
          <Select value={filterChemistry} onValueChange={setFilterChemistry}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="All chemistries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All chemistries</SelectItem>
              {(["NMC", "LFP", "NCA", "LCO", "LMO", "LEAD_ACID"] as Chemistry[]).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMetric} onValueChange={setFilterMetric}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="All metrics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All metrics</SelectItem>
              {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
                <SelectItem key={m} value={m}>{METRIC_LABELS[m].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEnabled} onValueChange={setFilterEnabled}>
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rules Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Loading rules...
              </div>
            ) : rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 opacity-30" />
                <p className="text-sm">No alert rules configured yet.</p>
                <Button size="sm" variant="outline" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" /> Create your first rule
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 pl-4">On</TableHead>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id} className={!rule.enabled ? "opacity-50" : ""}>
                      <TableCell className="pl-4">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, enabled: v })}
                          className="scale-75"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{rule.name}</div>
                        {rule.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-48">{rule.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          {METRIC_LABELS[rule.metric as Metric]?.icon}
                          <span>{METRIC_LABELS[rule.metric as Metric]?.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                          {OPERATOR_LABELS[rule.operator as Operator]} {Number(rule.threshold).toLocaleString()} {METRIC_LABELS[rule.metric as Metric]?.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${SEVERITY_CONFIG[rule.severity as Severity]?.className}`}>
                          {SEVERITY_CONFIG[rule.severity as Severity]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rule.bpan ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-xs font-mono max-w-28 truncate">
                                {rule.bpan}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Battery-specific: {rule.bpan}</TooltipContent>
                          </Tooltip>
                        ) : rule.chemistry ? (
                          <Badge variant="outline" className={`text-xs ${CHEMISTRY_COLORS[rule.chemistry as Chemistry]}`}>
                            {rule.chemistry}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Platform-wide</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(rule.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Banner */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="flex gap-3 p-4">
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong className="text-blue-400">Rule priority:</strong> Battery-specific rules (BPAN) take precedence over chemistry rules, which take precedence over platform-wide rules.</p>
              <p><strong className="text-blue-400">Hard-coded threshold removed:</strong> The previous T &gt; 51 °C hard-coded thermal anomaly check has been replaced by these configurable rules. Create a temperature rule to restore that behaviour with your preferred threshold.</p>
              <p><strong className="text-blue-400">Real-time evaluation:</strong> Rules are evaluated on every MQTT telemetry message and every tRPC telemetry.ingest call. Triggered rules create alerts with the configured severity.</p>
            </div>
          </CardContent>
        </Card>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(EMPTY_FORM); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId !== null ? "Edit Alert Rule" : "Create Alert Rule"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Rule Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. NMC High Temperature Warning"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description..."
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Metric *</Label>
                  <Select value={form.metric} onValueChange={(v) => setForm((f) => ({ ...f, metric: v as Metric }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          <div className="flex items-center gap-2">
                            {METRIC_LABELS[m].icon}
                            {METRIC_LABELS[m].label} ({METRIC_LABELS[m].unit})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Operator *</Label>
                  <Select value={form.operator} onValueChange={(v) => setForm((f) => ({ ...f, operator: v as Operator }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(OPERATOR_LABELS) as Operator[]).map((op) => (
                        <SelectItem key={op} value={op}>
                          {OPERATOR_LABELS[op]} ({op})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Threshold * ({metricUnit})</Label>
                  <Input
                    type="number"
                    value={form.threshold}
                    onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                    placeholder={`Value in ${metricUnit}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Severity *</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v as Severity }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["info", "warning", "critical"] as Severity[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          <Badge variant="outline" className={`text-xs mr-2 ${SEVERITY_CONFIG[s].className}`}>{s}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Chemistry Scope</Label>
                  <Select value={form.chemistry} onValueChange={(v) => setForm((f) => ({ ...f, chemistry: v as Chemistry | "" }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Platform-wide" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Platform-wide (all)</SelectItem>
                      {(["NMC", "LFP", "NCA", "LCO", "LMO", "LEAD_ACID"] as Chemistry[]).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Battery BPAN (optional)</Label>
                  <Input
                    value={form.bpan}
                    onChange={(e) => setForm((f) => ({ ...f, bpan: e.target.value.toUpperCase() }))}
                    placeholder="19-char BPAN"
                    maxLength={19}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
                />
                <Label className="cursor-pointer">Rule enabled</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId !== null ? "Save Changes" : "Create Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteConfirmId !== null} onOpenChange={(o) => { if (!o) setDeleteConfirmId(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Alert Rule</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will permanently delete the rule and stop it from triggering alerts. This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId !== null && deleteMutation.mutate({ id: deleteConfirmId })}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
