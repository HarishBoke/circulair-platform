/**
 * QueryResultChart.tsx
 * Automatically selects and renders the most appropriate Recharts chart
 * for a given NL query intent and result dataset.
 *
 * Chart strategy per intent:
 *  batteries   → Bar chart: SOH distribution in 5 bins (< 60, 60-70, 70-80, 80-90, 90-100)
 *                + Pie chart: status breakdown (operational / second_life / end_of_life)
 *  telemetry   → Bar chart: anomaly count by type; fallback line chart of tMax over time
 *  alerts      → Pie chart: severity breakdown (critical / warning / info)
 *  soh         → Bar chart: predicted SOH distribution in 5 bins
 *                + Bar chart: triage path breakdown
 *  marketplace → Bar chart: listing price distribution (₹ buckets)
 *  summary     → Horizontal bar chart: key platform metrics side-by-side
 */
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { ChevronDown, ChevronUp, BarChart2 } from "lucide-react";

// ─── Design tokens (match platform dark theme) ────────────────────────────────
const C_PRIMARY   = "#22c55e";   // green-500
const C_BLUE      = "#3b82f6";   // blue-500
const C_VIOLET    = "#8b5cf6";   // violet-500
const C_AMBER     = "#f59e0b";   // amber-500
const C_RED       = "#ef4444";   // red-500
const C_MUTED     = "#6b7280";   // gray-500
const C_GRID      = "rgba(255,255,255,0.06)";
const C_TICK      = "#9ca3af";   // gray-400

const SEVERITY_COLORS: Record<string, string> = {
  critical: C_RED,
  warning:  C_AMBER,
  info:     C_BLUE,
};

const STATUS_COLORS: Record<string, string> = {
  operational: C_PRIMARY,
  second_life: C_BLUE,
  end_of_life: C_RED,
};

const TRIAGE_COLORS: Record<string, string> = {
  second_life:    C_BLUE,
  recycle:        C_RED,
  continue_use:   C_PRIMARY,
  warranty_claim: C_AMBER,
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type ChartData = {
  type: "bar" | "pie" | "line" | "hbar";
  title: string;
  data: { name: string; value: number; color?: string }[];
  xLabel?: string;
  yLabel?: string;
  valuePrefix?: string;
  valueSuffix?: string;
};

// ─── Chart data derivation ────────────────────────────────────────────────────
/**
 * Derives one or two ChartData objects from the raw query results.
 * Returns an empty array when there is not enough data to chart.
 */
export function deriveChartData(
  intent: string,
  results: Record<string, unknown>[],
  summaryStats?: Record<string, unknown> | null,
): ChartData[] {
  if (intent === "summary" && summaryStats) {
    return deriveSummaryChart(summaryStats);
  }
  if (results.length < 2) return [];

  switch (intent) {
    case "batteries":   return deriveBatteriesCharts(results);
    case "telemetry":   return deriveTelemetryCharts(results);
    case "alerts":      return deriveAlertsChart(results);
    case "soh":         return deriveSohCharts(results);
    case "marketplace": return deriveMarketplaceChart(results);
    default:            return [];
  }
}

// ── batteries ─────────────────────────────────────────────────────────────────
function deriveBatteriesCharts(rows: Record<string, unknown>[]): ChartData[] {
  const charts: ChartData[] = [];

  // SOH distribution
  const sohBins = [
    { name: "< 60%",   min: 0,  max: 60,  value: 0, color: C_RED },
    { name: "60–70%",  min: 60, max: 70,  value: 0, color: C_AMBER },
    { name: "70–80%",  min: 70, max: 80,  value: 0, color: "#eab308" },
    { name: "80–90%",  min: 80, max: 90,  value: 0, color: C_BLUE },
    { name: "90–100%", min: 90, max: 101, value: 0, color: C_PRIMARY },
  ];
  let sohCount = 0;
  for (const row of rows) {
    const soh = parseFloat(String(row.currentSoh ?? row.sohEstimate ?? ""));
    if (!isNaN(soh)) {
      sohCount++;
      const bin = sohBins.find((b) => soh >= b.min && soh < b.max);
      if (bin) bin.value++;
    }
  }
  if (sohCount >= 2) {
    charts.push({
      type: "bar",
      title: "SOH Distribution",
      data: sohBins.filter((b) => b.value > 0),
      xLabel: "SOH Range",
      yLabel: "Batteries",
      valueSuffix: " batteries",
    });
  }

  // Status breakdown
  const statusMap: Record<string, number> = {};
  for (const row of rows) {
    const s = String(row.status ?? "unknown").replace(/_/g, " ");
    statusMap[s] = (statusMap[s] ?? 0) + 1;
  }
  const statusData = Object.entries(statusMap).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name.replace(/ /g, "_")] ?? C_MUTED,
  }));
  if (statusData.length >= 2) {
    charts.push({
      type: "pie",
      title: "Status Breakdown",
      data: statusData,
    });
  }

  return charts;
}

// ── telemetry ─────────────────────────────────────────────────────────────────
function deriveTelemetryCharts(rows: Record<string, unknown>[]): ChartData[] {
  const charts: ChartData[] = [];

  // Anomaly type breakdown
  const anomalyMap: Record<string, number> = { "No anomaly": 0, "Thermal": 0 };
  for (const row of rows) {
    if (row.thermalAnomaly === true || row.thermalAnomaly === 1) {
      const type = String(row.anomalyType ?? "Thermal").split(":")[0].trim();
      anomalyMap[type] = (anomalyMap[type] ?? 0) + 1;
    } else {
      anomalyMap["No anomaly"]++;
    }
  }
  const anomalyData = Object.entries(anomalyMap)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: name === "No anomaly" ? C_PRIMARY : C_RED,
    }));
  if (anomalyData.length >= 1) {
    charts.push({
      type: "pie",
      title: "Anomaly Breakdown",
      data: anomalyData,
    });
  }

  // Temperature distribution (tMax bins)
  const tempBins = [
    { name: "< 30°C",  min: 0,  max: 30,  value: 0, color: C_PRIMARY },
    { name: "30–40°C", min: 30, max: 40,  value: 0, color: C_BLUE },
    { name: "40–50°C", min: 40, max: 50,  value: 0, color: C_AMBER },
    { name: "50–60°C", min: 50, max: 60,  value: 0, color: "#f97316" },
    { name: "> 60°C",  min: 60, max: 999, value: 0, color: C_RED },
  ];
  let tCount = 0;
  for (const row of rows) {
    const t = parseFloat(String(row.tMax ?? row.tPack ?? ""));
    if (!isNaN(t)) {
      tCount++;
      const bin = tempBins.find((b) => t >= b.min && t < b.max);
      if (bin) bin.value++;
    }
  }
  if (tCount >= 2) {
    charts.push({
      type: "bar",
      title: "Temperature Distribution (tMax)",
      data: tempBins.filter((b) => b.value > 0),
      xLabel: "Temperature Range",
      yLabel: "Readings",
      valueSuffix: " readings",
    });
  }

  return charts;
}

// ── alerts ────────────────────────────────────────────────────────────────────
function deriveAlertsChart(rows: Record<string, unknown>[]): ChartData[] {
  const severityMap: Record<string, number> = {};
  for (const row of rows) {
    const s = String(row.severity ?? "info");
    severityMap[s] = (severityMap[s] ?? 0) + 1;
  }
  const data = Object.entries(severityMap).map(([name, value]) => ({
    name,
    value,
    color: SEVERITY_COLORS[name] ?? C_MUTED,
  }));
  if (data.length < 1) return [];
  return [{
    type: "pie",
    title: "Alert Severity Breakdown",
    data,
  }];
}

// ── soh ───────────────────────────────────────────────────────────────────────
function deriveSohCharts(rows: Record<string, unknown>[]): ChartData[] {
  const charts: ChartData[] = [];

  // Predicted SOH distribution
  const sohBins = [
    { name: "< 60%",   min: 0,  max: 60,  value: 0, color: C_RED },
    { name: "60–70%",  min: 60, max: 70,  value: 0, color: C_AMBER },
    { name: "70–80%",  min: 70, max: 80,  value: 0, color: "#eab308" },
    { name: "80–90%",  min: 80, max: 90,  value: 0, color: C_BLUE },
    { name: "90–100%", min: 90, max: 101, value: 0, color: C_PRIMARY },
  ];
  let sohCount = 0;
  for (const row of rows) {
    const soh = parseFloat(String(row.predictedSoh ?? ""));
    if (!isNaN(soh)) {
      sohCount++;
      const bin = sohBins.find((b) => soh >= b.min && soh < b.max);
      if (bin) bin.value++;
    }
  }
  if (sohCount >= 2) {
    charts.push({
      type: "bar",
      title: "Predicted SOH Distribution",
      data: sohBins.filter((b) => b.value > 0),
      xLabel: "SOH Range",
      yLabel: "Batteries",
      valueSuffix: " batteries",
    });
  }

  // Triage path breakdown
  const triageMap: Record<string, number> = {};
  for (const row of rows) {
    const t = String(row.triagePath ?? "unknown").replace(/_/g, " ");
    triageMap[t] = (triageMap[t] ?? 0) + 1;
  }
  const triageData = Object.entries(triageMap).map(([name, value]) => ({
    name,
    value,
    color: TRIAGE_COLORS[name.replace(/ /g, "_")] ?? C_MUTED,
  }));
  if (triageData.length >= 2) {
    charts.push({
      type: "pie",
      title: "Triage Path Breakdown",
      data: triageData,
    });
  }

  return charts;
}

// ── marketplace ───────────────────────────────────────────────────────────────
function deriveMarketplaceChart(rows: Record<string, unknown>[]): ChartData[] {
  // Price distribution in ₹ buckets
  const priceBins = [
    { name: "< ₹50K",      min: 0,      max: 50000,  value: 0, color: C_PRIMARY },
    { name: "₹50K–₹1L",   min: 50000,  max: 100000, value: 0, color: C_BLUE },
    { name: "₹1L–₹2L",    min: 100000, max: 200000, value: 0, color: C_VIOLET },
    { name: "₹2L–₹5L",    min: 200000, max: 500000, value: 0, color: C_AMBER },
    { name: "> ₹5L",       min: 500000, max: Infinity, value: 0, color: C_RED },
  ];
  let priceCount = 0;
  for (const row of rows) {
    const price = parseFloat(String(row.askingPriceInr ?? row.askPriceInr ?? row.priceInr ?? ""));
    if (!isNaN(price)) {
      priceCount++;
      const bin = priceBins.find((b) => price >= b.min && price < b.max);
      if (bin) bin.value++;
    }
  }
  if (priceCount < 2) {
    // Fallback: listing type breakdown
    const typeMap: Record<string, number> = {};
    for (const row of rows) {
      const t = String(row.listingType ?? "unknown");
      typeMap[t] = (typeMap[t] ?? 0) + 1;
    }
    const typeData = Object.entries(typeMap).map(([name, value], i) => ({
      name,
      value,
      color: [C_PRIMARY, C_BLUE, C_AMBER][i % 3],
    }));
    if (typeData.length >= 1) {
      return [{ type: "pie", title: "Listing Type Breakdown", data: typeData }];
    }
    return [];
  }
  return [{
    type: "bar",
    title: "Listing Price Distribution",
    data: priceBins.filter((b) => b.value > 0),
    xLabel: "Price Range",
    yLabel: "Listings",
    valueSuffix: " listings",
  }];
}

// ── summary ───────────────────────────────────────────────────────────────────
function deriveSummaryChart(stats: Record<string, unknown>): ChartData[] {
  const data: { name: string; value: number; color: string }[] = [];
  const bStats = stats.batteries as Record<string, unknown> | undefined;
  const mStats = stats.marketplace as Record<string, unknown> | undefined;
  const eStats = stats.epr as Record<string, unknown> | undefined;

  if (bStats) {
    if (typeof bStats.total === "number") data.push({ name: "Total Batteries", value: bStats.total, color: C_PRIMARY });
    if (typeof bStats.operational === "number") data.push({ name: "Operational", value: bStats.operational, color: C_BLUE });
    if (typeof bStats.secondLife === "number") data.push({ name: "Second Life", value: bStats.secondLife, color: C_VIOLET });
    if (typeof bStats.endOfLife === "number") data.push({ name: "End of Life", value: bStats.endOfLife, color: C_RED });
  }
  if (mStats && typeof mStats.totalTransactions === "number") {
    data.push({ name: "Transactions", value: mStats.totalTransactions, color: C_AMBER });
  }
  if (eStats && typeof eStats.verified === "number") {
    data.push({ name: "EPR Tokens", value: eStats.verified, color: "#06b6d4" });
  }

  if (data.length < 2) return [];
  return [{
    type: "hbar",
    title: "Platform Metrics Overview",
    data,
    xLabel: "Count",
    yLabel: "Metric",
  }];
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function CustomTooltip({
  active, payload, label, valuePrefix = "", valueSuffix = "",
}: {
  active?: boolean;
  payload?: { value: number; name?: string; fill?: string }[];
  label?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      {label && <div className="font-mono text-muted-foreground mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill ?? C_PRIMARY }} />
          <span className="text-foreground font-semibold">
            {valuePrefix}{p.value.toLocaleString()}{valueSuffix}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color?: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.payload.color ?? C_PRIMARY }} />
        <span className="text-foreground font-semibold">{p.name}</span>
        <span className="text-muted-foreground ml-1">{p.value.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ─── Individual chart renderers ───────────────────────────────────────────────
function BarChartView({ chart }: { chart: ChartData }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chart.data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: C_TICK, fontSize: 10, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: C_TICK, fontSize: 10, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          content={<CustomTooltip valueSuffix={chart.valueSuffix ?? ""} valuePrefix={chart.valuePrefix ?? ""} />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={48}>
          {chart.data.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? C_PRIMARY} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function HBarChartView({ chart }: { chart: ChartData }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, chart.data.length * 36)}>
      <BarChart
        data={chart.data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 80, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: C_TICK, fontSize: 10, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: C_TICK, fontSize: 10, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          width={76}
        />
        <Tooltip
          content={<CustomTooltip valueSuffix={chart.valueSuffix ?? ""} valuePrefix={chart.valuePrefix ?? ""} />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={24}>
          {chart.data.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? C_PRIMARY} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const RADIAN = Math.PI / 180;
function renderCustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) {
  if (percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontFamily="monospace">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function PieChartView({ chart }: { chart: ChartData }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chart.data}
          cx="50%"
          cy="50%"
          outerRadius={72}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
        >
          {chart.data.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? C_PRIMARY} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ color: C_TICK, fontSize: 10, fontFamily: "monospace" }}>{value}</span>
          )}
          iconSize={8}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function QueryResultChart({
  intent,
  results,
  summaryStats,
}: {
  intent: string;
  results: Record<string, unknown>[];
  summaryStats?: Record<string, unknown> | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const charts = deriveChartData(intent, results, summaryStats);

  if (charts.length === 0) return null;

  return (
    <div className="mt-3 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand chart" : "Collapse chart"}
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Visual Summary
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {charts.map((c) => c.title).join(" · ")}
          </span>
        </div>
        {collapsed
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        }
      </button>

      {/* Charts grid */}
      {!collapsed && (
        <div className={`p-3 grid gap-4 ${charts.length >= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
          {charts.map((chart, i) => (
            <div key={i}>
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                {chart.title}
              </div>
              {chart.type === "pie"  && <PieChartView chart={chart} />}
              {chart.type === "bar"  && <BarChartView chart={chart} />}
              {chart.type === "hbar" && <HBarChartView chart={chart} />}
              {chart.type === "line" && <BarChartView chart={chart} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
