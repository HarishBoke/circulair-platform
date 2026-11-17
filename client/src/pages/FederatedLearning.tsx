import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, RefreshCw, TrendingUp, CheckCircle2, Clock, Cpu } from "lucide-react";

export default function FederatedLearning() {
  // Training is unavailable: do not call metadata-only model/update endpoints.

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/10">
          <Brain className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Federated Learning</h1>
          <p className="text-sm text-muted-foreground">Metadata-only prototype — training and secure aggregation unavailable</p>
        </div>
        <Badge variant="outline" className="ml-auto border-cyan-500/30 text-cyan-400 bg-cyan-500/10">Unavailable</Badge>
      </div>

      {/* Info Banner */}
      <Card className="border-cyan-500/20 bg-cyan-500/5">
        <CardContent className="pt-4 pb-3 flex items-start gap-3">
          <Brain className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            The reviewed source only stores round/version metadata. No model weights, training or secure averaging are implemented. No validated accuracy or telemetry privacy guarantee follows from this prototype.
          </p>
        </CardContent>
      </Card>

      {/* Model Status */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Training Status — Unavailable</CardTitle>
              <CardDescription>No trained model or validated accuracy metrics</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            No trained model status is available. Contribution is disabled until a validated,
            authorized model-training and update pipeline is implemented.
          </p>
          <Button size="sm" disabled title="No real training pipeline is implemented">
            Training unavailable
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
