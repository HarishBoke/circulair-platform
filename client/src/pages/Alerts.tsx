import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, AlertTriangle, Info, CheckCircle2, RefreshCw, Thermometer, Zap, Truck, Shield } from "lucide-react";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  info: "bg-primary/10 text-primary border-primary/20",
  success: "bg-chart-2/10 text-chart-2 border-chart-2/20",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  thermal_anomaly: Thermometer,
  eol_detected: Zap,
  logistics_dispatch: Truck,
  epr_token_issued: Shield,
  soh_degradation: AlertTriangle,
  compliance_deadline: Bell,
  default: Info,
};

export default function Alerts() {
  const [severity, setSeverity] = useState("all");
  const [read, setRead] = useState("all");

  const { data, isLoading, refetch } = trpc.alerts.listAll.useQuery({ limit: 100 });

  const markReadMutation = trpc.alerts.markRead.useMutation({
    onSuccess: () => { toast.success("Alert marked as read"); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const allAlerts = data ?? [];
  const alerts = allAlerts.filter((a: { severity: string; read: boolean }) => {
    const sevMatch = severity === "all" || a.severity === severity;
    const readMatch = read === "all" || (read === "unread" && !a.read) || (read === "read" && a.read);
    return sevMatch && readMatch;
  });
  const unreadCount = allAlerts.filter((a: { read: boolean }) => !a.read).length;

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Alerts & Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Thermal anomalies · EOL detection · Logistics · EPR tokens · Compliance deadlines
          </p>
        </div>
        <div className="flex gap-2">

          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border h-8">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Unread", value: unreadCount, color: "text-chart-4", icon: Bell },
          { label: "Critical", value: allAlerts.filter((a: { severity: string }) => a.severity === "critical").length, color: "text-destructive", icon: AlertTriangle },
          { label: "Warnings", value: allAlerts.filter((a: { severity: string }) => a.severity === "warning").length, color: "text-chart-4", icon: AlertTriangle },
          { label: "Total", value: allAlerts.length, color: "text-foreground", icon: Info },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color} opacity-50`} />
            </div>
            <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-36 bg-card border-border h-9 text-sm"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Success</SelectItem>
          </SelectContent>
        </Select>
        <Select value={read} onValueChange={setRead}>
          <SelectTrigger className="w-32 bg-card border-border h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-20" />
          ))
        ) : alerts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display text-lg font-bold mb-2">No Alerts</h3>
            <p className="text-muted-foreground text-sm">All systems nominal. No alerts matching your filters.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const IconComp = TYPE_ICONS[alert.type] ?? TYPE_ICONS.default;
            return (
              <div
                key={alert.id}
                className={`bg-card border rounded-xl p-4 flex items-start gap-4 transition-all ${!alert.read ? "border-primary/20 bg-primary/5" : "border-border"}`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${SEVERITY_STYLES[alert.severity] ?? "bg-muted/10"}`}>
                  <IconComp className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-sm font-bold">{alert.title}</span>
                        <Badge variant="outline" className={`font-mono text-[9px] capitalize ${SEVERITY_STYLES[alert.severity] ?? ""}`}>
                          {alert.severity}
                        </Badge>
                        {!alert.read && (
                          <Badge variant="outline" className="font-mono text-[9px] bg-chart-4/10 text-chart-4 border-chart-4/20">
                            NEW
                          </Badge>
                        )}
                      </div>
                      {alert.bpan && (
                        <div className="font-mono text-[10px] text-primary mt-0.5">BPAN: {alert.bpan}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                      {!alert.read && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2 border-border"
                          onClick={() => markReadMutation.mutate({ id: alert.id })}
                          disabled={markReadMutation.isPending}
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{alert.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
