import { useState, useId, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bot, CheckCircle2, XCircle, RefreshCw, Zap, Recycle, Wrench, AlertTriangle,
  ChevronDown, ChevronUp, ListChecks,
} from "lucide-react";

type RouteId = "reuse" | "repurpose" | "repair" | "recycle" | "dispose";

const ROUTE_ICONS: Record<string, React.ReactNode> = {
  reuse:      <Zap           className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />,
  repurpose:  <Recycle       className="w-3.5 h-3.5 text-blue-400"    aria-hidden="true" />,
  repair:     <Wrench        className="w-3.5 h-3.5 text-amber-400"   aria-hidden="true" />,
  recycle:    <Recycle       className="w-3.5 h-3.5 text-orange-400"  aria-hidden="true" />,
  dispose:    <AlertTriangle className="w-3.5 h-3.5 text-red-400"     aria-hidden="true" />,
};

const ROUTE_COLORS: Record<string, string> = {
  reuse:      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  repurpose:  "border-blue-500/30 bg-blue-500/10 text-blue-400",
  repair:     "border-amber-500/30 bg-amber-500/10 text-amber-400",
  recycle:    "border-orange-500/30 bg-orange-500/10 text-orange-400",
  dispose:    "border-red-500/30 bg-red-500/10 text-red-400",
};

const ALL_ROUTES: RouteId[] = ["reuse", "repurpose", "repair", "recycle", "dispose"];

function sohColor(soh: number) {
  if (soh >= 60) return "text-amber-400";
  if (soh >= 40) return "text-orange-400";
  return "text-red-400";
}

export default function TriageQueue() {
  const headingId = useId();
  const selectAllId = useId();

  const { data: queue, isLoading, refetch } = trpc.triage.listQueue.useQuery(
    undefined,
    { staleTime: 30_000 }
  );

  // Per-row state: selected + route override
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [routeOverrides, setRouteOverrides] = useState<Record<string, RouteId>>({});
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set());
  const [approvedBpans, setApprovedBpans] = useState<Set<string>>(new Set());

  const bulkApproveMutation = trpc.triage.bulkApprove.useMutation({
    onSuccess: (data) => {
      setApprovedBpans((prev) => {
        const next = new Set(prev);
        data.results.filter((r) => r.success).forEach((r) => next.add(r.bpan));
        return next;
      });
      setSelected(new Set());
      refetch();
      if (data.failed > 0) {
        toast.warning(`${data.succeeded} approved, ${data.failed} failed`, {
          description: "Some batteries could not be updated. Check the console for details.",
        });
      } else {
        toast.success(`${data.succeeded} batter${data.succeeded === 1 ? "y" : "ies"} approved`, {
          description: "Routing decisions recorded and battery statuses updated.",
        });
      }
    },
    onError: (err) => toast.error("Bulk approval failed", { description: err.message }),
  });

  type QueueItem = NonNullable<typeof queue>[number];
  const pending: QueueItem[] = useMemo(
    () => (queue ?? []).filter((b: QueueItem) => !approvedBpans.has(b.bpan)),
    [queue, approvedBpans]
  );

  const allSelected = pending.length > 0 && selected.size === pending.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((b) => b.bpan)));
    }
  };

  const toggleOne = (bpan: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(bpan) ? next.delete(bpan) : next.add(bpan);
      return next;
    });
  };

  const toggleReasoning = (bpan: string) => {
    setExpandedReasoning((prev) => {
      const next = new Set(prev);
      next.has(bpan) ? next.delete(bpan) : next.add(bpan);
      return next;
    });
  };

  const handleBulkApprove = () => {
    if (selected.size === 0) return;
    const decisions = Array.from(selected).map((bpan: string) => {
      const item = pending.find((b: QueueItem) => b.bpan === bpan)!;
      const route = (routeOverrides[bpan] ?? item.recommendedRoute) as RouteId;
      return {
        bpan,
        approvedRoute: route,
        triageId: `queue-${bpan}-${Date.now()}`,
      };
    });
    bulkApproveMutation.mutate({ decisions });
  };

  const handleRejectSelected = () => {
    setSelected(new Set());
    toast.info("Selection cleared", { description: "No routing decisions were recorded." });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page heading */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-rose-500/10" aria-hidden="true">
          <ListChecks className="w-6 h-6 text-rose-400" />
        </div>
        <div>
          <h1 id={headingId} className="text-2xl font-bold text-foreground">
            Triage Approval Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Batch-process routing decisions for batteries with SOH below 70%
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10">
            {pending.length} pending
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Refresh queue"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-rose-500/20 bg-rose-500/5" role="note">
        <CardContent className="pt-4 pb-3 flex items-start gap-3">
          <Bot className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">
            Each row shows the AI-recommended route. You can override the route per battery using the
            dropdown, then select multiple batteries and approve them in one action. All decisions are
            recorded in the service history and update battery status immediately.
          </p>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="text-sm font-medium text-amber-400">
            {selected.size} batter{selected.size === 1 ? "y" : "ies"} selected
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleBulkApprove}
              disabled={bulkApproveMutation.isPending}
              aria-busy={bulkApproveMutation.isPending}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              {bulkApproveMutation.isPending ? "Approving…" : `Approve ${selected.size}`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={handleRejectSelected}
              disabled={bulkApproveMutation.isPending}
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Queue Table */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              <CardDescription>
                Batteries with SOH &lt; 70% awaiting routing decision
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Loading queue…</span>
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-3 opacity-30" aria-hidden="true" />
              <p className="text-sm font-medium">Queue is empty</p>
              <p className="text-xs mt-1">All batteries are above 70% SOH or have been processed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                aria-labelledby={headingId}
                aria-rowcount={pending.length + 1}
              >
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th scope="col" className="w-10 px-4 py-3 text-left">
                      <Checkbox
                        id={selectAllId}
                        checked={allSelected}
                        aria-checked={someSelected ? "mixed" : allSelected}
                        onCheckedChange={toggleAll}
                        aria-label={allSelected ? "Deselect all batteries" : "Select all batteries"}
                      />
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      BPAN
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      SOH
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">
                      Chemistry
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">
                      Capacity
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      AI Recommendation
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      Route Override
                    </th>
                    <th scope="col" className="w-10 px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      <span className="sr-only">Reasoning</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((item: QueueItem, idx: number) => {
                    const isChecked = selected.has(item.bpan);
                    const override = routeOverrides[item.bpan];
                    const displayRoute = override ?? item.recommendedRoute;
                    const isExpanded = expandedReasoning.has(item.bpan);
                    const rowId = `row-${item.bpan}`;
                    return (
                      <>
                        <tr
                          key={item.bpan}
                          id={rowId}
                          className={`border-b border-border/30 transition-colors ${
                            isChecked ? "bg-rose-500/5" : "hover:bg-muted/10"
                          }`}
                          aria-selected={isChecked}
                          aria-rowindex={idx + 2}
                        >
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleOne(item.bpan)}
                              aria-label={`Select battery ${item.bpan}`}
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-foreground">
                            {item.bpan}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${sohColor(item.currentSoh)}`}>
                              {item.currentSoh.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                            {item.chemistry}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                            {item.capacityKwh} kWh
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={`capitalize text-xs gap-1 ${ROUTE_COLORS[item.recommendedRoute]}`}
                            >
                              {ROUTE_ICONS[item.recommendedRoute]}
                              {item.recommendedRoute}
                              <span className="ml-1 opacity-70">
                                {Math.round(item.confidence * 100)}%
                              </span>
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={override ?? ""}
                              onValueChange={(v) =>
                                setRouteOverrides((prev) => ({ ...prev, [item.bpan]: v as RouteId }))
                              }
                            >
                              <SelectTrigger
                                className="h-7 text-xs w-32"
                                aria-label={`Override route for battery ${item.bpan}`}
                              >
                                <SelectValue placeholder="Use AI rec." />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_ROUTES.map((r) => (
                                  <SelectItem key={r} value={r} className="text-xs capitalize">
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label={
                                isExpanded
                                  ? `Collapse reasoning for ${item.bpan}`
                                  : `Expand reasoning for ${item.bpan}`
                              }
                              aria-expanded={isExpanded}
                              aria-controls={`reasoning-${item.bpan}`}
                              onClick={() => toggleReasoning(item.bpan)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr
                            key={`${item.bpan}-reasoning`}
                            id={`reasoning-${item.bpan}`}
                            className="border-b border-border/20 bg-muted/5"
                            aria-label={`Reasoning for battery ${item.bpan}`}
                          >
                            <td colSpan={8} className="px-6 py-3">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                <span className="font-medium text-foreground mr-2">AI Reasoning:</span>
                                {item.reasoning}
                              </p>
                              {override && (
                                <p className="text-xs text-amber-400 mt-1">
                                  Route overridden from{" "}
                                  <span className="capitalize font-medium">{item.recommendedRoute}</span>{" "}
                                  to{" "}
                                  <span className="capitalize font-medium">{override}</span>
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* aria-live status for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {bulkApproveMutation.isPending
          ? `Approving ${selected.size} batteries, please wait.`
          : bulkApproveMutation.isSuccess
          ? `Approval complete. ${bulkApproveMutation.data?.succeeded ?? 0} batteries processed.`
          : ""}
      </div>
    </div>
  );
}
