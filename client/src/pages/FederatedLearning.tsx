import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, RefreshCw, TrendingUp, CheckCircle2, Clock, Cpu } from "lucide-react";

export default function FederatedLearning() {
  const { data: modelStatus, isLoading, refetch } = trpc.federatedLearning.getModelStatus.useQuery();

  const submitUpdateMutation = trpc.federatedLearning.submitLocalUpdate.useMutation({
    onSuccess: (data: any) => {
      refetch();
      toast.success("Local update submitted", { description: `Round ${data.round} — delta applied` });
    },
    onError: (err: any) => toast.error("Update failed", { description: err.message }),
  });

  const model = modelStatus as any;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/10">
          <Brain className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Federated Learning</h1>
          <p className="text-sm text-muted-foreground">Privacy-preserving distributed SOH model training across fleet operators — v2.0</p>
        </div>
        <Badge variant="outline" className="ml-auto border-cyan-500/30 text-cyan-400 bg-cyan-500/10">v2.0</Badge>
      </div>

      {/* Info Banner */}
      <Card className="border-cyan-500/20 bg-cyan-500/5">
        <CardContent className="pt-4 pb-3 flex items-start gap-3">
          <Brain className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Federated learning allows each fleet operator to improve the global SOH model using their own battery data without sharing raw telemetry. Only model weight deltas are transmitted — your data never leaves your infrastructure. The global model aggregates updates from all participants using secure averaging.
          </p>
        </CardContent>
      </Card>

      {/* Model Status */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Global Model Status</CardTitle>
              <CardDescription>Current federated model version and accuracy metrics</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading model status…</div>
          ) : model ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Model Version", value: model.version ?? "physics-v1.0", icon: <Cpu className="w-4 h-4 text-cyan-400" /> },
                  { label: "Training Round", value: model.round ?? 1, icon: <RefreshCw className="w-4 h-4 text-blue-400" /> },
                  { label: "RMSE", value: model.rmse ? `${(model.rmse * 100).toFixed(2)}%` : "< 2.0%", icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
                  { label: "Participants", value: model.participants ?? 1, icon: <CheckCircle2 className="w-4 h-4 text-violet-400" /> },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-2 mb-1">{stat.icon}<p className="text-xs text-muted-foreground">{stat.label}</p></div>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Accuracy by Chemistry */}
              {model.accuracyByChemistry && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Accuracy by Chemistry</p>
                  <div className="space-y-2">
                    {Object.entries(model.accuracyByChemistry).map(([chem, acc]: [string, any]) => (
                      <div key={chem} className="flex items-center gap-3">
                        <span className="text-xs font-mono w-20 text-foreground">{chem}</span>
                        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(acc * 100, 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{(acc * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Local Update */}
              <div className="p-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />Contribute to Round {(model.round ?? 1) + 1}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Submit your fleet's local model update to improve global accuracy</p>
                  </div>
                  <Button size="sm" onClick={() => submitUpdateMutation.mutate({})} disabled={submitUpdateMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    {submitUpdateMutation.isPending ? "Submitting…" : "Submit Update"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">No model status available.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
