/**
 * DemoMode.tsx
 *
 * One-click demo dashboard for investor walkthroughs and pilot demos.
 * Starts the physics-based battery simulator for all registered batteries,
 * shows live telemetry stats per battery, and provides a global anomaly feed.
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Play, Square, Activity, Zap, Thermometer, Battery, AlertTriangle,
  RefreshCw, ExternalLink, Cpu, Radio, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveReading {
  bpan: string;
  vPack: number;
  iPack: number;
  tMax: number;
  sohEstimate: number;
  thermalAnomaly: boolean;
  anomalyType?: string;
  soc?: number;
  chemistry?: string;
  recordedAt: string;
}

interface AnomalyEvent {
  bpan: string;
  tMax: number;
  message: string;
  recordedAt: string;
}

// ─── Chemistry colour map ─────────────────────────────────────────────────────

const CHEM_COLOUR: Record<string, string> = {
  NMC: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LFP: "bg-green-500/20 text-green-400 border-green-500/30",
  NCA: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  LCO: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  LMO: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LEAD_ACID: "bg-secondary/60 text-muted-foreground border-border",
};

function chemBadge(chem: string) {
  return CHEM_COLOUR[chem] ?? "bg-secondary/60 text-muted-foreground border-border";
}

// ─── SOH colour ───────────────────────────────────────────────────────────────

function sohColour(soh: number): string {
  if (soh >= 80) return "text-emerald-400";
  if (soh >= 65) return "text-yellow-400";
  if (soh >= 50) return "text-orange-400";
  return "text-red-400";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DemoMode() {
  const [isRunning, setIsRunning] = useState(false);
  const [liveReadings, setLiveReadings] = useState<Map<string, LiveReading>>(new Map());
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [msgCount, setMsgCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // ── tRPC ──────────────────────────────────────────────────────────────────
  const { data: batteries } = trpc.bpan.list.useQuery({ limit: 50, offset: 0 });
  const { data: demoStats, refetch: refetchStats } = trpc.mqtt.demoStatus.useQuery(undefined, {
    refetchInterval: isRunning ? 3000 : false,
  });

  const startDemo = trpc.mqtt.startDemo.useMutation({
    onSuccess: (data) => {
      setIsRunning(true);
      toast.success(`Demo started — ${data.started} batteries simulating`);
      refetchStats();
    },
    onError: (err) => toast.error(`Failed to start demo: ${err.message}`),
  });

  const stopDemo = trpc.mqtt.stopDemo.useMutation({
    onSuccess: (data) => {
      setIsRunning(false);
      setLiveReadings(new Map());
      toast.info(`Demo stopped — ${data.stopped} simulators shut down`);
      refetchStats();
    },
    onError: (err) => toast.error(`Failed to stop demo: ${err.message}`),
  });

  // ── Socket.io — subscribe to all battery rooms ────────────────────────────
  useEffect(() => {
    if (!isRunning || !batteries?.items?.length) return;

    const socket = io("/telemetry", {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      // Subscribe to all battery rooms
      for (const battery of batteries.items) {
        socket.emit("subscribe", { bpan: battery.bpan, chemistry: battery.chemistry ?? "NMC" });
      }
      // Subscribe to global anomaly feed
      socket.emit("subscribe:anomalies");
    });

    socket.on("telemetry:reading", (reading: LiveReading) => {
      setLiveReadings((prev) => {
        const next = new Map(prev);
        next.set(reading.bpan, reading);
        return next;
      });
      setMsgCount((c) => c + 1);
    });

    socket.on("telemetry:anomaly", (anomaly: AnomalyEvent) => {
      setAnomalies((prev) => [anomaly, ...prev].slice(0, 20));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isRunning, batteries?.items]);

  // ── Sync isRunning with demoStats ─────────────────────────────────────────
  useEffect(() => {
    if (demoStats && demoStats.activeCount > 0 && !isRunning) {
      setIsRunning(true);
    }
  }, [demoStats]);

  const batteryList = batteries?.items ?? [];
  const activeCount = demoStats?.activeCount ?? 0;
  const anomalyCount = anomalies.length;
  const thermalCount = Array.from(liveReadings.values()).filter((r) => r.thermalAnomaly).length;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white p-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Radio className="w-4 h-4 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Demo Mode</h1>
              {isRunning && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  LIVE
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              Physics-based battery simulator — realistic electrochemical models per chemistry
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isRunning ? (
              <Button
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => stopDemo.mutate()}
                disabled={stopDemo.isPending}
              >
                <Square className="w-4 h-4 mr-2" />
                {stopDemo.isPending ? "Stopping…" : "Stop Demo"}
              </Button>
            ) : (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => startDemo.mutate({ intervalMs: 2000 })}
                disabled={startDemo.isPending || batteryList.length === 0}
              >
                <Play className="w-4 h-4 mr-2" />
                {startDemo.isPending ? "Starting…" : `Start Demo (${batteryList.length} batteries)`}
              </Button>
            )}
          </div>
        </div>

        {/* ── KPI row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Active Simulators", value: activeCount,
              icon: <Cpu className="w-5 h-5 text-emerald-400" />,
              colour: "text-emerald-400",
            },
            {
              label: "Messages Received", value: msgCount.toLocaleString(),
              icon: <Activity className="w-5 h-5 text-blue-400" />,
              colour: "text-blue-400",
            },
            {
              label: "Thermal Anomalies", value: thermalCount,
              icon: <Thermometer className="w-5 h-5 text-red-400" />,
              colour: thermalCount > 0 ? "text-red-400" : "text-muted-foreground",
            },
            {
              label: "Anomaly Events", value: anomalyCount,
              icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
              colour: anomalyCount > 0 ? "text-amber-400" : "text-muted-foreground",
            },
          ].map((kpi) => (
            <Card key={kpi.label} className="bg-background/60 border-slate-700/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  {kpi.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`text-xl font-bold ${kpi.colour}`}>{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Live battery grid ─────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground/90 uppercase tracking-wider">
                Live Battery Readings
              </h2>
              {isRunning && (
                <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Streaming at 2s
                </span>
              )}
            </div>

            {batteryList.length === 0 ? (
              <Card className="bg-background/60 border-slate-700/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No batteries registered. <Link href="/bpan/register" className="text-emerald-400 underline">Register a battery</Link> first.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {batteryList.map((battery) => {
                  const live = liveReadings.get(battery.bpan);
                  const isActive = demoStats?.bpans.includes(battery.bpan) ?? false;

                  return (
                    <Card
                      key={battery.bpan}
                      className={`bg-background/60 border transition-all duration-300 ${
                        live?.thermalAnomaly
                          ? "border-red-500/50 shadow-red-500/10 shadow-lg"
                          : isActive
                          ? "border-emerald-500/30"
                          : "border-slate-700/50"
                      }`}
                    >
                      <CardHeader className="pb-2 pt-3 px-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-mono text-muted-foreground">{battery.bpan}</p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">{battery.manufacturerId} · {battery.capacityKwh} kWh</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge className={`text-xs border ${chemBadge(battery.chemistry)}`}>
                              {battery.chemistry}
                            </Badge>
                            {live?.thermalAnomaly && (
                              <Badge className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                                ⚠ HOT
                              </Badge>
                            )}
                            {isActive && !live?.thermalAnomaly && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="px-4 pb-3">
                        {live ? (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-blue-400 shrink-0" />
                              <span className="text-muted-foreground">Voltage</span>
                              <span className="ml-auto font-mono text-blue-300">{live.vPack.toFixed(1)} V</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Activity className="w-3 h-3 text-purple-400 shrink-0" />
                              <span className="text-muted-foreground">Current</span>
                              <span className="ml-auto font-mono text-purple-300">{live.iPack > 0 ? "+" : ""}{live.iPack.toFixed(1)} A</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Thermometer className={`w-3 h-3 shrink-0 ${live.thermalAnomaly ? "text-red-400" : "text-orange-400"}`} />
                              <span className="text-muted-foreground">T_max</span>
                              <span className={`ml-auto font-mono ${live.thermalAnomaly ? "text-red-400 font-bold" : "text-orange-300"}`}>
                                {live.tMax.toFixed(1)} °C
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Battery className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="text-muted-foreground">SOH</span>
                              <span className={`ml-auto font-mono ${sohColour(live.sohEstimate)}`}>
                                {live.sohEstimate.toFixed(1)}%
                              </span>
                            </div>
                            {live.soc !== undefined && (
                              <div className="col-span-2 mt-1">
                                <div className="flex items-center justify-between text-xs text-muted-foreground/70 mb-0.5">
                                  <span>SoC</span>
                                  <span>{live.soc.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-secondary/70 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      live.soc > 60 ? "bg-emerald-500" : live.soc > 30 ? "bg-yellow-500" : "bg-red-500"
                                    }`}
                                    style={{ width: `${live.soc}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground/70 italic py-2">
                            {isRunning ? "Waiting for first reading…" : "Start demo to see live data"}
                          </div>
                        )}

                        <div className="mt-2 pt-2 border-t border-slate-700/50">
                          <Link href={`/bpan/${battery.bpan}`}>
                            <button className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                              View detail <ExternalLink className="w-3 h-3" />
                            </button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Anomaly feed ─────────────────────────────────────────────── */}
          <div>
            <h2 className="text-sm font-semibold text-foreground/90 uppercase tracking-wider mb-3">
              Live Anomaly Feed
            </h2>
            <Card className="bg-background/60 border-slate-700/50 h-[calc(100vh-320px)] overflow-hidden flex flex-col">
              <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <CardTitle className="text-sm text-foreground/90">Anomaly Events</CardTitle>
                  {anomalies.length > 0 && (
                    <Badge className="ml-auto bg-red-500/20 text-red-400 border border-red-500/30 text-xs">
                      {anomalies.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                {anomalies.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground/70 text-sm">
                    {isRunning ? "No anomalies detected yet" : "Start demo to monitor anomalies"}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {anomalies.map((a, i) => (
                      <div key={i} className="px-4 py-3 hover:bg-secondary/40 transition-colors">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-foreground/90 truncate">{a.bpan}</p>
                            <p className="text-xs text-red-400 mt-0.5">{a.tMax.toFixed(1)}°C</p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{a.message}</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                              {new Date(a.recordedAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Quick links ─────────────────────────────────────────────── */}
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-2">Quick Links</p>
              {[
                { href: "/bpan", label: "Battery Registry" },
                { href: "/telemetry", label: "Telemetry Dashboard" },
                { href: "/alerts", label: "Alerts" },
                { href: "/marketplace", label: "Marketplace" },
                { href: "/epr-compliance", label: "EPR Compliance" },
              ].map((link) => (
                <Link key={link.href} href={link.href}>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/40 hover:bg-secondary/70 transition-colors cursor-pointer">
                    <span className="text-xs text-foreground/90">{link.label}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/70" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Simulator info ───────────────────────────────────────────────── */}
        <Separator className="my-6 bg-secondary/70/50" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground/70">
          <div>
            <p className="font-semibold text-muted-foreground mb-1">Physics Model</p>
            <p>Per-chemistry OCV curves, SoC Coulomb counting, thermal inertia, IR growth with age</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground mb-1">Anomaly Injection</p>
            <p>Thermal spikes (52–65°C), voltage sag, high-current events — injected every 40–90 ticks</p>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground mb-1">Chemistries</p>
            <p>NMC, LFP, NCA, LCO, LMO, LEAD_ACID — each with distinct voltage windows and cycle life</p>
          </div>
        </div>
      </div>
    </div>
  );
}
