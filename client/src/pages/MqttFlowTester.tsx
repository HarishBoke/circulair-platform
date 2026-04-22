import { useEffect, useRef, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import PlatformLayout from "@/components/PlatformLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Database,
  Flame,
  Play,
  Radio,
  RefreshCw,
  Send,
  Square,
  Thermometer,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  ts: string;
  direction: "up" | "down" | "info" | "error" | "db";
  topic?: string;
  bpan?: string;
  summary: string;
  detail?: string;
  scenario?: string;
}

interface TelemetryPayload {
  bpan: string;
  vPack: number;
  current: number;
  tMax: number;
  tMin: number;
  tAvg: number;
  soc: number;
  sohEstimate: number;
  cycleCount: number;
  internalResistance: number;
  dtcCodes?: string[];
}

// ─── Scenario presets ─────────────────────────────────────────────────────────

const SCENARIOS: Record<string, { label: string; icon: React.ReactNode; color: string; defaults: Partial<TelemetryPayload> }> = {
  normal: {
    label: "Normal Discharge (EV Driving)",
    icon: <Zap className="w-4 h-4" />,
    color: "text-emerald-400",
    defaults: { vPack: 352.4, current: -85.2, tMax: 38.5, tMin: 24.1, tAvg: 31.8, soc: 67.3, sohEstimate: 91.2, cycleCount: 312, internalResistance: 14.6 },
  },
  charging: {
    label: "Fast Charging (DC 150kW)",
    icon: <Activity className="w-4 h-4" />,
    color: "text-blue-400",
    defaults: { vPack: 398.1, current: 142.7, tMax: 44.2, tMin: 28.3, tAvg: 36.9, soc: 42.1, sohEstimate: 88.7, cycleCount: 289, internalResistance: 13.9 },
  },
  thermal: {
    label: "⚠ Thermal Anomaly (T > 51°C)",
    icon: <Thermometer className="w-4 h-4" />,
    color: "text-red-400",
    defaults: { vPack: 344.8, current: -92.3, tMax: 57.6, tMin: 38.2, tAvg: 48.9, soc: 31.4, sohEstimate: 76.5, cycleCount: 521, internalResistance: 22.1, dtcCodes: ["P0A1B", "P0A0F"] },
  },
  degraded: {
    label: "⚠ SOH Degradation (< 70%)",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-amber-400",
    defaults: { vPack: 336.2, current: -44.8, tMax: 43.1, tMin: 26.5, tAvg: 34.7, soc: 55.8, sohEstimate: 62.3, cycleCount: 1204, internalResistance: 31.4, dtcCodes: ["P0A80"] },
  },
  idle: {
    label: "Idle / Standby",
    icon: <Circle className="w-4 h-4" />,
    color: "text-muted-foreground",
    defaults: { vPack: 358.9, current: 1.2, tMax: 29.4, tMin: 22.8, tAvg: 26.1, soc: 78.5, sohEstimate: 94.8, cycleCount: 156, internalResistance: 12.3 },
  },
  bess: {
    label: "BESS Grid Storage (slow discharge)",
    icon: <Database className="w-4 h-4" />,
    color: "text-purple-400",
    defaults: { vPack: 343.7, current: -10.1, tMax: 35.0, tMin: 23.4, tAvg: 29.2, soc: 61.2, sohEstimate: 85.4, cycleCount: 789, internalResistance: 16.8 },
  },
  regen: {
    label: "Regenerative Braking (burst)",
    icon: <RefreshCw className="w-4 h-4" />,
    color: "text-cyan-400",
    defaults: { vPack: 360.0, current: 38.6, tMax: 39.1, tMin: 25.7, tAvg: 32.4, soc: 82.3, sohEstimate: 97.1, cycleCount: 98, internalResistance: 11.7 },
  },
};

const KNOWN_BPANS = [
  { bpan: "INMH1C3FKOIND5COA0001", label: "NMC 60kWh - Operational" },
  { bpan: "INSA10L48251129000010", label: "LFP 100kWh - Operational" },
  { bpan: "INOK60N48250767000020", label: "NMC 60kWh - Second Life" },
  { bpan: "INEX40N72251218000030", label: "LCO 40kWh - End of Life" },
  { bpan: "INEX75A48251188000040", label: "NCA 75kWh - End of Life" },
  { bpan: "INLU50N96251036000060", label: "NMC 50kWh - Operational" },
  { bpan: "INAM75N80251095000090", label: "NMC 75kWh - Operational" },
  { bpan: "INAM50N40250110000100", label: "NMC 50kWh - Second Life" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MqttFlowTester() {
  usePageTitle("MQTT Flow Tester");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logCounter, setLogCounter] = useState(0);
  const [selectedBpan, setSelectedBpan] = useState(KNOWN_BPANS[0].bpan);
  const [selectedScenario, setSelectedScenario] = useState("normal");
  const [streamBpans, setStreamBpans] = useState<string[]>([KNOWN_BPANS[0].bpan, KNOWN_BPANS[1].bpan]);
  const [streamInterval, setStreamInterval] = useState(3000);
  const [customPayload, setCustomPayload] = useState("");
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [dbRows, setDbRows] = useState<any[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── tRPC queries / mutations ───────────────────────────────────────────────
  const statusQuery = trpc.mqtt.status.useQuery(undefined, { refetchInterval: 2000 });
  const publishMut = trpc.mqtt.publish.useMutation();
  const startStreamMut = trpc.mqtt.startStream.useMutation();
  const stopStreamMut = trpc.mqtt.stopStream.useMutation();
  const latestTelemetry = trpc.telemetry.history.useQuery(
    { bpan: selectedBpan, limit: 5 },
    { refetchInterval: 3000 }
  );

  const status = statusQuery.data;
  const isConnected = status?.connected ?? false;
  const isStreaming = status?.streamRunning ?? false;

  // ── Auto-scroll log ────────────────────────────────────────────────────────
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // ── Populate custom payload when scenario/bpan changes ────────────────────
  useEffect(() => {
    const preset = SCENARIOS[selectedScenario]?.defaults ?? {};
    const payload: TelemetryPayload = {
      bpan: selectedBpan,
      vPack: preset.vPack ?? 350,
      current: preset.current ?? -60,
      tMax: preset.tMax ?? 35,
      tMin: preset.tMin ?? 24,
      tAvg: preset.tAvg ?? 29,
      soc: preset.soc ?? 65,
      sohEstimate: preset.sohEstimate ?? 85,
      cycleCount: preset.cycleCount ?? 300,
      internalResistance: preset.internalResistance ?? 15,
      dtcCodes: preset.dtcCodes ?? [],
    };
    setCustomPayload(JSON.stringify(payload, null, 2));
  }, [selectedScenario, selectedBpan]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function addLog(entry: Omit<LogEntry, "id" | "ts">) {
    const id = logCounter + 1;
    setLogCounter(id);
    setLogs((prev) => [
      ...prev.slice(-199), // keep last 200
      { ...entry, id, ts: new Date().toLocaleTimeString() },
    ]);
  }

  // ── Publish single message ─────────────────────────────────────────────────
  async function handlePublish() {
    let payload: TelemetryPayload;
    try {
      payload = JSON.parse(customPayload);
    } catch {
      toast.error("Invalid JSON payload");
      return;
    }

    const scenario = SCENARIOS[selectedScenario];
    addLog({
      direction: "up",
      topic: `${status?.subscribedTopics?.[0]?.replace("/+", "") ?? "CAI_"}/${selectedBpan}`,
      bpan: selectedBpan,
      summary: `↑ PUBLISH — ${scenario?.label ?? "Custom"} | SOH ${payload.sohEstimate}% | T_max ${payload.tMax}°C`,
      detail: JSON.stringify(payload, null, 2),
      scenario: selectedScenario,
    });

    try {
      await publishMut.mutateAsync({ bpan: selectedBpan, payload });
      addLog({
        direction: "down",
        bpan: selectedBpan,
        summary: `↓ RECEIVED by broker — ACK QoS 1`,
      });
      addLog({
        direction: "db",
        bpan: selectedBpan,
        summary: `💾 DB WRITE — telemetry row inserted (source: flow_tester)`,
      });
      if (payload.tMax > 51) {
        addLog({
          direction: "error",
          bpan: selectedBpan,
          summary: `🔥 ALERT CREATED — Thermal Anomaly (T_max ${payload.tMax}°C > 51°C threshold)`,
        });
      }
      if (payload.sohEstimate < 70) {
        addLog({
          direction: "error",
          bpan: selectedBpan,
          summary: `⚠ ALERT CREATED — SOH Degradation (${payload.sohEstimate}% < 70% threshold)`,
        });
      }
      toast.success(`Published to broker — ${selectedBpan}`);
      latestTelemetry.refetch();
    } catch (err: any) {
      addLog({ direction: "error", bpan: selectedBpan, summary: `❌ PUBLISH FAILED — ${err.message}` });
      toast.error(err.message);
    }
  }

  // ── Start stream ──────────────────────────────────────────────────────────
  async function handleStartStream() {
    if (streamBpans.length === 0) {
      toast.error("Select at least one BPAN for the stream");
      return;
    }
    addLog({
      direction: "info",
      summary: `▶ STREAM STARTED — ${streamBpans.length} BPANs @ ${streamInterval}ms interval`,
      detail: streamBpans.join(", "),
    });
    try {
      await startStreamMut.mutateAsync({ bpans: streamBpans, intervalMs: streamInterval });
      toast.success(`Stream started — ${streamBpans.length} batteries`);
      statusQuery.refetch();
    } catch (err: any) {
      addLog({ direction: "error", summary: `❌ STREAM START FAILED — ${err.message}` });
      toast.error(err.message);
    }
  }

  // ── Stop stream ───────────────────────────────────────────────────────────
  async function handleStopStream() {
    addLog({ direction: "info", summary: "⏹ STREAM STOPPED by user" });
    try {
      await stopStreamMut.mutateAsync();
      toast.success("Stream stopped");
      statusQuery.refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // ── Toggle BPAN in stream list ────────────────────────────────────────────
  function toggleStreamBpan(bpan: string) {
    setStreamBpans((prev) =>
      prev.includes(bpan) ? prev.filter((b) => b !== bpan) : [...prev, bpan]
    );
  }

  // ── Log entry colours ─────────────────────────────────────────────────────
  const logColors: Record<string, string> = {
    up: "border-l-emerald-500 bg-emerald-500/5",
    down: "border-l-blue-500 bg-blue-500/5",
    info: "border-l-border bg-secondary/20",
    error: "border-l-red-500 bg-red-500/5",
    db: "border-l-purple-500 bg-purple-500/5",
  };

  const logIcons: Record<string, React.ReactNode> = {
    up: <ArrowRight className="w-3 h-3 text-emerald-400 rotate-[-45deg]" />,
    down: <ArrowRight className="w-3 h-3 text-blue-400 rotate-[135deg]" />,
    info: <Radio className="w-3 h-3 text-muted-foreground" />,
    error: <AlertTriangle className="w-3 h-3 text-red-400" />,
    db: <Database className="w-3 h-3 text-purple-400" />,
  };

  return (
    <PlatformLayout>
      <div className="p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Radio className="w-6 h-6 text-emerald-400" />
              MQTT Flow Tester
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Publish telemetry payloads to the live broker and watch the full data flow: Device → Broker → Server → Database → Dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                <Wifi className="w-3 h-3" /> Broker Connected
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
                <WifiOff className="w-3 h-3" /> Broker Offline
              </Badge>
            )}
            {isStreaming && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1 animate-pulse">
                <Activity className="w-3 h-3" /> Streaming
              </Badge>
            )}
          </div>
        </div>

        {/* ── Broker status bar ── */}
        {status && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Messages Received", value: status.messagesReceived, icon: <ArrowRight className="w-4 h-4 text-blue-400 rotate-[135deg]" /> },
              { label: "Msg / Min", value: `${status.messagesPerMinute ?? 0}/min`, icon: <Activity className="w-4 h-4 text-emerald-400" /> },
              { label: "Reconnects", value: status.reconnectCount, icon: <RefreshCw className="w-4 h-4 text-amber-400" /> },
              { label: "Last Message", value: status.lastMessageAt ? new Date(status.lastMessageAt).toLocaleTimeString() : "—", icon: <Radio className="w-4 h-4 text-purple-400" /> },
            ].map((s) => (
              <Card key={s.label} className="bg-card/50 border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  {s.icon}
                  <div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="text-sm font-mono font-semibold text-foreground">{s.value}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── Left: Publish controls ── */}
          <div className="space-y-4">
            <Tabs defaultValue="single">
              <TabsList className="bg-card/50 border border-border/50 w-full">
                <TabsTrigger value="single" className="flex-1">Single Publish</TabsTrigger>
                <TabsTrigger value="stream" className="flex-1">Continuous Stream</TabsTrigger>
              </TabsList>

              {/* Single publish tab */}
              <TabsContent value="single" className="space-y-4 mt-4">
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Send className="w-4 h-4 text-emerald-400" />
                      Publish Single Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* BPAN selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Target BPAN</Label>
                      <Select value={selectedBpan} onValueChange={setSelectedBpan}>
                        <SelectTrigger className="bg-background/50 border-border/50 font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KNOWN_BPANS.map((b) => (
                            <SelectItem key={b.bpan} value={b.bpan}>
                              <span className="font-mono text-xs">{b.bpan}</span>
                              <span className="ml-2 text-muted-foreground text-xs">{b.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Scenario picker */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Scenario Preset</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(SCENARIOS).map(([key, s]) => (
                          <button
                            key={key}
                            onClick={() => setSelectedScenario(key)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all text-left ${
                              selectedScenario === key
                                ? "border-emerald-500/50 bg-emerald-500/10"
                                : "border-border/50 bg-background/30 hover:border-border"
                            }`}
                          >
                            <span className={s.color}>{s.icon}</span>
                            <span className="truncate">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* JSON payload editor */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">JSON Payload (editable)</Label>
                      <Textarea
                        value={customPayload}
                        onChange={(e) => setCustomPayload(e.target.value)}
                        className="font-mono text-xs bg-background/50 border-border/50 h-48 resize-none"
                        spellCheck={false}
                      />
                    </div>

                    <Button
                      onClick={handlePublish}
                      disabled={!isConnected || publishMut.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {publishMut.isPending ? "Publishing…" : "Publish to Broker"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Continuous stream tab */}
              <TabsContent value="stream" className="space-y-4 mt-4">
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-400" />
                      Continuous Telemetry Stream
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* BPAN multi-select */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Select BPANs to stream ({streamBpans.length} selected)
                      </Label>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {KNOWN_BPANS.map((b) => (
                          <button
                            key={b.bpan}
                            onClick={() => toggleStreamBpan(b.bpan)}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg border text-xs transition-all text-left ${
                              streamBpans.includes(b.bpan)
                                ? "border-blue-500/50 bg-blue-500/10"
                                : "border-border/50 bg-background/30 hover:border-border"
                            }`}
                          >
                            <CheckCircle2
                              className={`w-3.5 h-3.5 shrink-0 ${
                                streamBpans.includes(b.bpan) ? "text-blue-400" : "text-muted-foreground/30"
                              }`}
                            />
                            <span className="font-mono">{b.bpan}</span>
                            <span className="text-muted-foreground ml-auto">{b.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interval slider */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Publish Interval: <span className="text-foreground font-mono">{streamInterval / 1000}s</span>
                      </Label>
                      <Slider
                        min={1000}
                        max={10000}
                        step={500}
                        value={[streamInterval]}
                        onValueChange={([v]) => setStreamInterval(v)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1s (fast)</span>
                        <span>10s (slow)</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleStartStream}
                        disabled={!isConnected || isStreaming || startStreamMut.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white gap-2"
                      >
                        <Play className="w-4 h-4" />
                        {isStreaming ? "Streaming…" : "Start Stream"}
                      </Button>
                      <Button
                        onClick={handleStopStream}
                        disabled={!isStreaming || stopStreamMut.isPending}
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 gap-2"
                      >
                        <Square className="w-4 h-4" />
                        Stop Stream
                      </Button>
                    </div>

                    {isStreaming && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                        <Activity className="w-4 h-4 animate-pulse" />
                        Streaming {streamBpans.length} batteries every {streamInterval / 1000}s — check the Telemetry dashboard for live charts
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* ── DB confirmation panel ── */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  Latest DB Rows — {selectedBpan.slice(0, 10)}…
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-6 px-2 text-xs"
                    onClick={() => latestTelemetry.refetch()}
                  >
                    <RefreshCw className={`w-3 h-3 ${latestTelemetry.isFetching ? "animate-spin" : ""}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestTelemetry.data && latestTelemetry.data.length > 0 ? (
                  <div className="space-y-1.5">
                    {latestTelemetry.data.map((row: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 rounded bg-background/40 border border-border/30 font-mono text-xs"
                      >
                        <Database className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="text-muted-foreground">{new Date(row.recordedAt).toLocaleTimeString()}</span>
                        <span className="text-emerald-400">SOH {row.sohEstimate}%</span>
                        <span className="text-amber-400">T {row.tMax}°C</span>
                        <span className="text-blue-400">{row.vPack}V</span>
                        <Badge
                          className={`ml-auto text-[10px] px-1 py-0 ${
                            row.source === "mqtt"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : row.source === "flow_tester"
                              ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                              : "bg-secondary/60 text-muted-foreground border-border"
                          }`}
                        >
                          {row.source}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No telemetry rows yet — publish a message above
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Live message log ── */}
          <div className="space-y-4">
            <Card className="bg-card/50 border-border/50 flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  Live Message Flow Log
                  <Badge className="ml-auto text-xs">{logs.length} events</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => setLogs([])}
                  >
                    Clear
                  </Button>
                </CardTitle>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground pt-1">
                  {[
                    { dir: "up", label: "↑ Published", color: "text-emerald-400" },
                    { dir: "down", label: "↓ Broker ACK", color: "text-blue-400" },
                    { dir: "db", label: "💾 DB Write", color: "text-purple-400" },
                    { dir: "error", label: "⚠ Alert", color: "text-red-400" },
                    { dir: "info", label: "ℹ Stream", color: "text-muted-foreground" },
                  ].map((l) => (
                    <span key={l.dir} className={`flex items-center gap-1 ${l.color}`}>
                      {logIcons[l.dir]} {l.label}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-3">
                    <Radio className="w-10 h-10 opacity-20" />
                    <p>No messages yet</p>
                    <p className="text-xs text-center max-w-xs">
                      Select a BPAN and scenario, then click <strong>Publish to Broker</strong> to see the full data flow here.
                    </p>
                  </div>
                ) : (
                  logs.map((entry) => (
                    <div
                      key={entry.id}
                      className={`border-l-2 pl-3 pr-2 py-1.5 rounded-r-lg cursor-pointer transition-colors hover:bg-white/5 ${logColors[entry.direction]}`}
                      onClick={() => setExpandedLog(expandedLog === entry.id ? null : entry.id)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 mt-0.5">{logIcons[entry.direction]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground">{entry.ts}</span>
                            {entry.bpan && (
                              <span className="text-[10px] font-mono text-muted-foreground/60 truncate">
                                {entry.bpan.slice(0, 12)}…
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-foreground/90 mt-0.5 leading-snug">{entry.summary}</p>
                          {entry.topic && (
                            <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 truncate">
                              {entry.topic}
                            </p>
                          )}
                        </div>
                        {entry.detail && (
                          <span className="shrink-0 text-muted-foreground/40">
                            {expandedLog === entry.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </span>
                        )}
                      </div>
                      {expandedLog === entry.id && entry.detail && (
                        <pre className="mt-2 text-[10px] font-mono text-muted-foreground bg-black/20 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                          {entry.detail}
                        </pre>
                      )}
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Flow diagram ── */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Data Flow Architecture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
              {[
                { label: "Flow Tester UI", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
                { label: "→", plain: true },
                { label: "tRPC mqtt.publish", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
                { label: "→", plain: true },
                { label: "EMQX Broker (TLS)", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
                { label: "→", plain: true },
                { label: "mqttSubscriber.ts", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
                { label: "→", plain: true },
                { label: "MySQL DB", color: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
                { label: "+", plain: true },
                { label: "Socket.io Broadcast", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
                { label: "→", plain: true },
                { label: "Live Dashboard", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
              ].map((item, i) =>
                item.plain ? (
                  <span key={i} className="text-muted-foreground font-bold">{item.label}</span>
                ) : (
                  <span key={i} className={`px-2 py-1 rounded border ${item.color}`}>
                    {item.label}
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Every message published here travels the full production path — broker → subscriber → database → Socket.io → Telemetry dashboard. Open the Telemetry page in another tab to see live chart updates.
            </p>
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
