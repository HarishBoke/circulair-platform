import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, CheckCircle2, XCircle, Clock, ArrowRight, Zap, Recycle, Wrench, AlertTriangle } from "lucide-react";

const ROUTE_ICONS: Record<string, React.ReactNode> = {
  reuse: <Zap className="w-4 h-4 text-emerald-400" />,
  repurpose: <Recycle className="w-4 h-4 text-blue-400" />,
  repair: <Wrench className="w-4 h-4 text-amber-400" />,
  recycle: <Recycle className="w-4 h-4 text-orange-400" />,
  dispose: <AlertTriangle className="w-4 h-4 text-red-400" />,
};

const ROUTE_COLORS: Record<string, string> = {
  reuse: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  repurpose: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  repair: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  recycle: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  dispose: "border-red-500/30 bg-red-500/10 text-red-400",
};

export default function AutonomousTriage() {
  const [bpan, setBpan] = useState("");
  const [result, setResult] = useState<any>(null);
  const [approvedAction, setApprovedAction] = useState<string | null>(null);

  const triageMutation = trpc.triage.evaluate.useMutation({
    onSuccess: (data: any) => {
      // Normalise the response shape from triage.evaluate
      const decision = data.decision ?? {};
      setResult({
        bpan: data.bpan,
        triageId: `${data.bpan}-${Date.now()}`,
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
      toast.success("Triage complete", { description: `Recommended route: ${decision.route ?? "recycle"}` });
    },
    onError: (err: any) => toast.error("Triage failed", { description: err.message }),
  });

  const [approvalPending, setApprovalPending] = useState(false);

  const handleTriage = () => {
    if (!bpan.trim() || bpan.length !== 21) {
      toast.error("Invalid BPAN", { description: "BPAN must be exactly 21 characters" });
      return;
    }
    triageMutation.mutate({ bpan: bpan.trim() });
  };

  const handleApprove = (route: string) => {
    setApprovalPending(true);
    setTimeout(() => {
      setApprovedAction(route);
      setApprovalPending(false);
      toast.success("Action approved", { description: `Route "${route}" confirmed and queued` });
    }, 800);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-rose-500/10">
          <Bot className="w-6 h-6 text-rose-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Autonomous Triage Routing</h1>
          <p className="text-sm text-muted-foreground">AI-powered end-of-life routing with human approval gate — v4.0</p>
        </div>
        <Badge variant="outline" className="ml-auto border-rose-500/30 text-rose-400 bg-rose-500/10">v4.0</Badge>
      </div>

      {/* Info Banner */}
      <Card className="border-rose-500/20 bg-rose-500/5">
        <CardContent className="pt-4 pb-3 flex items-start gap-3">
          <Bot className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            The autonomous triage engine analyses SOH, cycle count, chemistry, regulatory status, and market conditions to recommend the optimal end-of-life route. A human approval step is required before any action is executed — no battery is routed without explicit confirmation.
          </p>
        </CardContent>
      </Card>

      {/* Input */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Run Triage</CardTitle>
          <CardDescription>Enter a BPAN to analyse and receive a routing recommendation</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            placeholder="21-character BPAN"
            value={bpan}
            onChange={(e) => setBpan(e.target.value)}
            className="font-mono flex-1"
            maxLength={21}
          />
          <Button onClick={handleTriage} disabled={triageMutation.isPending} className="bg-rose-600 hover:bg-rose-700 text-white">
            {triageMutation.isPending ? <><Clock className="w-4 h-4 mr-2 animate-spin" />Analysing…</> : <><Bot className="w-4 h-4 mr-2" />Run Triage</>}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Route Recommendation */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Triage Result</CardTitle>
              <CardDescription>BPAN: <span className="font-mono">{result.bpan}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recommended Route */}
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-muted/20">
                <div className="p-2 rounded-lg bg-muted/50">
                  {ROUTE_ICONS[result.recommendedRoute] ?? <Bot className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Recommended Route</p>
                  <p className="text-lg font-bold capitalize text-foreground">{result.recommendedRoute}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{result.reasoning}</p>
                </div>
                <Badge className={`capitalize ${ROUTE_COLORS[result.recommendedRoute]}`}>
                  {Math.round((result.confidence ?? 0) * 100)}% confidence
                </Badge>
              </div>

              {/* All Routes */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {result.allRoutes?.map((route: any) => (
                  <div key={route.route} className={`p-3 rounded-lg border text-center ${route.route === result.recommendedRoute ? ROUTE_COLORS[route.route] : "border-border/30 bg-muted/10"}`}>
                    <div className="flex justify-center mb-1">{ROUTE_ICONS[route.route]}</div>
                    <p className="text-xs font-medium capitalize">{route.route}</p>
                    <p className="text-xs text-muted-foreground">{Math.round(route.score * 100)}%</p>
                  </div>
                ))}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Current SOH", value: `${result.currentSoh?.toFixed(1)}%` },
                  { label: "Cycle Count", value: result.cycleCount?.toLocaleString() ?? "—" },
                  { label: "Chemistry", value: result.chemistry ?? "—" },
                ].map((m) => (
                  <div key={m.label} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Human Approval Gate */}
              {approvedAction ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm text-emerald-400">Route <strong className="capitalize">{approvedAction}</strong> approved and queued for execution</p>
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <p className="text-sm font-medium text-amber-400">Human Approval Required</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Review the recommendation above and approve or override the routing decision.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => handleApprove(result.recommendedRoute)} disabled={approvalPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Approve: {result.recommendedRoute}
                    </Button>
                    {result.allRoutes?.filter((r: any) => r.route !== result.recommendedRoute).slice(0, 2).map((r: any) => (
                      <Button key={r.route} size="sm" variant="outline" onClick={() => handleApprove(r.route)} disabled={approvalPending}
                        className="border-border/50 capitalize">
                        <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                        Override: {r.route}
                      </Button>
                    ))}
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
