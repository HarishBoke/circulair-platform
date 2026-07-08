import { useState, useId } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bot, CheckCircle2, XCircle, Clock, ArrowRight,
  Zap, Recycle, Wrench, AlertTriangle, RefreshCw,
} from "lucide-react";

const ROUTE_ICONS: Record<string, React.ReactNode> = {
  reuse:      <Zap      className="w-4 h-4 text-emerald-400" aria-hidden="true" />,
  repurpose:  <Recycle  className="w-4 h-4 text-blue-400"    aria-hidden="true" />,
  repair:     <Wrench   className="w-4 h-4 text-amber-400"   aria-hidden="true" />,
  recycle:    <Recycle  className="w-4 h-4 text-orange-400"  aria-hidden="true" />,
  dispose:    <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden="true" />,
};

const ROUTE_COLORS: Record<string, string> = {
  reuse:      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  repurpose:  "border-blue-500/30 bg-blue-500/10 text-blue-400",
  repair:     "border-amber-500/30 bg-amber-500/10 text-amber-400",
  recycle:    "border-orange-500/30 bg-orange-500/10 text-orange-400",
  dispose:    "border-red-500/30 bg-red-500/10 text-red-400",
};

export default function AutonomousTriage() {
  const [bpan, setBpan] = useState("");
  const [result, setResult] = useState<any>(null);
  const [approvedAction, setApprovedAction] = useState<string | null>(null);
  const [triageId, setTriageId] = useState<string>("");

  const bpanLabelId = useId();

  // Query batteries with SOH < 70% — the primary candidates for triage
  const { data: candidates, isLoading: candidatesLoading } = trpc.triage.listCandidates.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  const triageMutation = trpc.triage.evaluate.useMutation({
    onSuccess: (data: any) => {
      const decision = data.decision ?? {};
      const id = `${data.bpan}-${Date.now()}`;
      setTriageId(id);
      setResult({
        bpan: data.bpan,
        triageId: id,
        recommendedRoute: decision.route ?? "recycle",
        reasoning: decision.reasoning ?? "",
        confidence: decision.confidence ?? 0.7,
        currentSoh: data.soh,
        cycleCount: decision.cycleCount,
        chemistry: decision.chemistry,
        allRoutes: decision.allRoutes ?? [
          { route: decision.route ?? "recycle", score: decision.confidence ?? 0.7 },
        ],
      });
      setApprovedAction(null);
      toast.success("Triage complete", {
        description: `Recommended route: ${decision.route ?? "recycle"}`,
      });
    },
    onError: (err: any) => toast.error("Triage failed", { description: err.message }),
  });

  const approveMutation = trpc.triage.approve.useMutation({
    onSuccess: (data) => {
      setApprovedAction(data.approvedRoute);
      toast.success("Route approved", {
        description: `Battery ${data.bpan} routed to "${data.approvedRoute}" and recorded`,
      });
    },
    onError: (err: any) =>
      toast.error("Approval failed", { description: err.message }),
  });

  const handleTriage = () => {
    if (!bpan.trim()) {
      toast.error("No battery selected", { description: "Please select a battery from the list" });
      return;
    }
    triageMutation.mutate({ bpan: bpan.trim() });
  };

  const handleApprove = (route: string) => {
    if (!result) return;
    approveMutation.mutate({
      bpan: result.bpan,
      approvedRoute: route as any,
      triageId: result.triageId,
    });
  };

  const handleReject = () => {
    setResult(null);
    setApprovedAction(null);
    toast.info("Triage rejected", { description: "No action taken. Battery status unchanged." });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page heading */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-rose-500/10" aria-hidden="true">
          <Bot className="w-6 h-6 text-rose-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Autonomous Triage Routing</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered end-of-life routing with human approval gate — v4.0
          </p>
        </div>
        <Badge
          variant="outline"
          className="ml-auto border-rose-500/30 text-rose-400 bg-rose-500/10"
        >
          v4.0
        </Badge>
      </div>

      {/* Info Banner */}
      <Card className="border-rose-500/20 bg-rose-500/5" role="note">
        <CardContent className="pt-4 pb-3 flex items-start gap-3">
          <Bot className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">
            The autonomous triage engine analyses SOH, cycle count, chemistry, regulatory status, and
            market conditions to recommend the optimal end-of-life route. A human approval step is
            required before any action is executed — no battery is routed without explicit
            confirmation.
          </p>
        </CardContent>
      </Card>

      {/* Input */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Run Triage</CardTitle>
          <CardDescription>
            Select a battery with SOH below 70% to receive a routing recommendation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label id={bpanLabelId} htmlFor="triage-bpan-select">
              Battery (SOH &lt; 70%)
            </Label>
            {candidatesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
                <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Loading triage candidates…</span>
              </div>
            ) : !candidates || candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground h-10 flex items-center">
                No batteries below 70% SOH found. All batteries are in good health.
              </p>
            ) : (
              <Select
                value={bpan}
                onValueChange={setBpan}
                aria-labelledby={bpanLabelId}
              >
                <SelectTrigger id="triage-bpan-select" className="font-mono">
                  <SelectValue placeholder="Select a battery…" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((b: any) => (
                    <SelectItem key={b.bpan} value={b.bpan} className="font-mono">
                      <span className="font-mono">{b.bpan}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        SOH: {b.currentSoh !== null ? `${b.currentSoh.toFixed(1)}%` : "—"}
                        {b.chemistry ? ` · ${b.chemistry}` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleTriage}
              disabled={triageMutation.isPending || !bpan}
              className="bg-rose-600 hover:bg-rose-700 text-foreground"
              aria-busy={triageMutation.isPending}
            >
              {triageMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Analysing…
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" aria-hidden="true" />
                  Run Triage
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live region — announces triage results and approval outcomes to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {approvedAction
          ? `Route "${approvedAction}" approved and recorded for battery ${result?.bpan ?? bpan}.`
          : result
          ? `Triage complete for ${result.bpan}. Recommended route: ${result.recommendedRoute}. Confidence: ${Math.round((result.confidence ?? 0) * 100)}%. Human approval required.`
          : triageMutation.isPending
          ? "Analysing battery, please wait."
          : ""}
      </div>

      {/* Results */}
      {result && (
        <section aria-label="Triage result">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Triage Result</CardTitle>
              <CardDescription>
                BPAN: <span className="font-mono">{result.bpan}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recommended Route */}
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-muted/20">
                <div className="p-2 rounded-lg bg-muted/50" aria-hidden="true">
                  {ROUTE_ICONS[result.recommendedRoute] ?? (
                    <Bot className="w-4 h-4" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Recommended Route</p>
                  <p className="text-lg font-bold capitalize text-foreground">
                    {result.recommendedRoute}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{result.reasoning}</p>
                </div>
                <Badge className={`capitalize ${ROUTE_COLORS[result.recommendedRoute]}`}>
                  {Math.round((result.confidence ?? 0) * 100)}% confidence
                </Badge>
              </div>

              {/* All Routes */}
              <div
                className="grid grid-cols-2 md:grid-cols-5 gap-2"
                role="list"
                aria-label="All route scores"
              >
                {result.allRoutes?.map((route: any) => (
                  <div
                    key={route.route}
                    role="listitem"
                    className={`p-3 rounded-lg border text-center ${
                      route.route === result.recommendedRoute
                        ? ROUTE_COLORS[route.route]
                        : "border-border/30 bg-muted/10"
                    }`}
                    aria-label={`${route.route}: ${Math.round(route.score * 100)}% score${route.route === result.recommendedRoute ? " (recommended)" : ""}`}
                  >
                    <div className="flex justify-center mb-1" aria-hidden="true">
                      {ROUTE_ICONS[route.route]}
                    </div>
                    <p className="text-xs font-medium capitalize">{route.route}</p>
                    <p className="text-xs text-muted-foreground">{Math.round(route.score * 100)}%</p>
                  </div>
                ))}
              </div>

              {/* Key Metrics */}
              <dl className="grid grid-cols-3 gap-3">
                {[
                  { label: "Current SOH", value: `${result.currentSoh?.toFixed(1)}%` },
                  { label: "Cycle Count", value: result.cycleCount?.toLocaleString() ?? "—" },
                  { label: "Chemistry", value: result.chemistry ?? "—" },
                ].map((m) => (
                  <div key={m.label} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <dt className="text-xs text-muted-foreground">{m.label}</dt>
                    <dd className="text-sm font-semibold text-foreground mt-0.5">{m.value}</dd>
                  </div>
                ))}
              </dl>

              {/* Human Approval Gate */}
              {approvedAction ? (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10"
                  role="alert"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <p className="text-sm text-emerald-400">
                    Route{" "}
                    <strong className="capitalize">{approvedAction}</strong> approved and recorded
                  </p>
                </div>
              ) : (
                <div
                  className="space-y-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5"
                  role="group"
                  aria-labelledby="approval-gate-heading"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    <p
                      id="approval-gate-heading"
                      className="text-sm font-medium text-amber-400"
                    >
                      Human Approval Required
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Review the recommendation above and approve or override the routing decision.
                    This action will be recorded in the service history.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(result.recommendedRoute)}
                      disabled={approveMutation.isPending}
                      aria-busy={approveMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-foreground"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                      Approve: {result.recommendedRoute}
                    </Button>
                    {result.allRoutes
                      ?.filter((r: any) => r.route !== result.recommendedRoute)
                      .slice(0, 2)
                      .map((r: any) => (
                        <Button
                          key={r.route}
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(r.route)}
                          disabled={approveMutation.isPending}
                          aria-busy={approveMutation.isPending}
                          className="border-border/50 capitalize"
                        >
                          <ArrowRight className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                          Override: {r.route}
                        </Button>
                      ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={handleReject}
                      disabled={approveMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
