/**
 * MqttBrokerPanel.tsx
 *
 * Live MQTT broker connection manager.
 * Shows real-time connection status, message rate, subscribed topics,
 * error log, and provides connect/disconnect/test controls.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Wifi, WifiOff, RefreshCw, Zap, AlertTriangle,
  CheckCircle2, Activity, Terminal, Send, Eye, EyeOff,
} from "lucide-react";

export default function MqttBrokerPanel() {
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testBpan, setTestBpan] = useState("INHB30N40250627A000101");
  const [form, setForm] = useState({
    brokerUrl: "",
    username: "",
    password: "",
    topicPrefix: "circulair/telemetry",
  });

  // Poll status every 3 seconds
  const { data: status, isLoading, refetch } = trpc.mqtt.status.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const connectMutation = trpc.mqtt.connect.useMutation({
    onSuccess: () => {
      toast.success("MQTT subscriber started — connecting to broker...");
      setShowForm(false);
      setTimeout(() => refetch(), 1500);
    },
    onError: (err) => toast.error(`Connect failed: ${err.message}`),
  });

  const disconnectMutation = trpc.mqtt.disconnect.useMutation({
    onSuccess: () => {
      toast.info("MQTT subscriber disconnected");
      refetch();
    },
    onError: (err) => toast.error(`Disconnect failed: ${err.message}`),
  });

  const testMutation = trpc.mqtt.testPublish.useMutation({
    onSuccess: () => toast.success(`Test message published for ${testBpan}`),
    onError: (err) => toast.error(`Test publish failed: ${err.message}`),
  });

  if (isLoading) {
    return (
      <Card className="border-border bg-muted/50">
        <CardContent className="pt-6 pb-6 flex items-center justify-center gap-2 text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading MQTT status...</span>
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.connected ?? false;
  const hasUrl = !!status?.brokerUrl;

  return (
    <div className="space-y-4">
      {/* Status Header Card */}
      <Card className={`border ${isConnected ? "border-emerald-500/30 bg-emerald-500/5" : hasUrl ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/50"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              {isConnected
                ? <Wifi className="w-5 h-5 text-emerald-400" />
                : <WifiOff className="w-5 h-5 text-muted-foreground" />
              }
              MQTT Broker Connection
            </CardTitle>
            <div className="flex items-center gap-2">
              {isConnected && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse inline-block" />
                  Connected
                </Badge>
              )}
              {!isConnected && hasUrl && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse inline-block" />
                  Reconnecting ({status?.reconnectCount ?? 0}x)
                </Badge>
              )}
              {!isConnected && !hasUrl && (
                <Badge className="bg-slate-500/20 text-muted-foreground border-slate-500/30 text-xs">
                  Not Configured
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Broker URL</p>
              <p className="text-xs font-mono text-foreground truncate" title={status?.brokerUrl || "—"}>
                {status?.brokerUrl || <span className="text-muted-foreground">Not set</span>}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Messages Received</p>
              <p className="text-sm font-bold text-foreground">{status?.messagesReceived?.toLocaleString() ?? 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Rate (last 60s)</p>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <p className="text-sm font-bold text-foreground">{status?.messagesPerMinute ?? 0} msg/min</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Last Message</p>
              <p className="text-xs font-mono text-foreground">
                {status?.lastMessageAt
                  ? new Date(status.lastMessageAt).toLocaleTimeString()
                  : <span className="text-muted-foreground">—</span>
                }
              </p>
            </div>
          </div>

          {/* Subscribed topics */}
          {isConnected && (status?.subscribedTopics?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Subscribed Topics</p>
              <div className="flex flex-wrap gap-1.5">
                {status!.subscribedTopics.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs border-primary/30 text-primary font-mono">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Error log */}
          {(status?.errors?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Recent Errors
              </p>
              <div className="rounded-lg bg-[#0d1117] border border-border p-3 max-h-32 overflow-y-auto">
                {status!.errors.slice(-5).map((e, i) => (
                  <p key={i} className="text-xs font-mono text-amber-400/80 leading-relaxed">{e}</p>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {!isConnected && (
              <Button
                size="sm"
                onClick={() => setShowForm(!showForm)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Wifi className="w-3.5 h-3.5 mr-1.5" />
                {showForm ? "Hide Form" : "Connect to Broker"}
              </Button>
            )}
            {isConnected && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowForm(!showForm)}
                  className="border-border"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reconnect / Change Broker
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <WifiOff className="w-3.5 h-3.5 mr-1.5" />
                  Disconnect
                </Button>
              </>
            )}
            {hasUrl && !isConnected && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => connectMutation.mutate({})}
                disabled={connectMutation.isPending}
                className="border-border"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${connectMutation.isPending ? "animate-spin" : ""}`} />
                Retry Connection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connect Form */}
      {showForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              Broker Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Broker URL <span className="text-destructive">*</span></Label>
                <Input
                  value={form.brokerUrl}
                  onChange={(e) => setForm({ ...form, brokerUrl: e.target.value })}
                  placeholder="mqtt://broker.hivemq.com:1883  or  mqtts://broker:8883"
                  className="bg-muted/50 border-border font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">mqtt://</code> for plain TCP,{" "}
                  <code className="bg-muted px-1 rounded">mqtts://</code> for TLS.
                  Free public brokers: <code className="bg-muted px-1 rounded">mqtt://broker.hivemq.com:1883</code>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Username (optional)</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="device_user"
                  className="bg-muted/50 border-border text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Password (optional)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="bg-muted/50 border-border text-sm pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Topic Prefix</Label>
                <Input
                  value={form.topicPrefix}
                  onChange={(e) => setForm({ ...form, topicPrefix: e.target.value })}
                  placeholder="circulair/telemetry"
                  className="bg-muted/50 border-border font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Platform subscribes to <code className="bg-muted px-1 rounded">{form.topicPrefix || "circulair/telemetry"}/+</code> (wildcard for all BPANs).
                  Devices publish to <code className="bg-muted px-1 rounded">{form.topicPrefix || "circulair/telemetry"}/{"<BPAN>"}</code>.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => connectMutation.mutate(form)}
                disabled={!form.brokerUrl || connectMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {connectMutation.isPending
                  ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Connecting...</>
                  : <><Wifi className="w-3.5 h-3.5 mr-1.5" />Connect</>
                }
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Publish */}
      {isConnected && (
        <Card className="border-border bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Test Message Publisher
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Publish a synthetic telemetry reading to verify the full pipeline:
              MQTT broker → server subscriber → database → Socket.io live dashboard.
            </p>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Target BPAN</Label>
                <Input
                  value={testBpan}
                  onChange={(e) => setTestBpan(e.target.value)}
                  maxLength={21}
                  placeholder="21-character BPAN"
                  className="bg-muted/50 border-border font-mono text-sm"
                />
              </div>
              <Button
                onClick={() => testMutation.mutate({ bpan: testBpan })}
                disabled={testBpan.length !== 21 || testMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
              >
                {testMutation.isPending
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <><Zap className="w-3.5 h-3.5 mr-1.5" />Publish Test</>
                }
              </Button>
            </div>
            {testMutation.isSuccess && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Test message published. Check the Telemetry page to see the live reading appear.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick start guide when not connected */}
      {!isConnected && (
        <Card className="border-border bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Start — Free Public Broker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              To test without your own broker, use the free HiveMQ public broker. No account needed.
            </p>
            <div className="rounded-lg bg-[#0d1117] border border-border p-3 text-xs font-mono text-green-400 space-y-1">
              <p>Broker URL: <span className="text-white">mqtt://broker.hivemq.com:1883</span></p>
              <p>Username: <span className="text-muted-foreground">(leave empty)</span></p>
              <p>Password: <span className="text-muted-foreground">(leave empty)</span></p>
              <p>Topic Prefix: <span className="text-white">circulair/telemetry</span></p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setForm({ brokerUrl: "mqtt://broker.hivemq.com:1883", username: "", password: "", topicPrefix: "circulair/telemetry" });
                setShowForm(true);
              }}
              variant="outline"
              className="border-border text-xs"
            >
              <Wifi className="w-3.5 h-3.5 mr-1.5" />
              Use HiveMQ Public Broker
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
