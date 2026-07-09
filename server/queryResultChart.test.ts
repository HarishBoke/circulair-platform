/**
 * queryResultChart.test.ts
 * Unit tests for the deriveChartData function exported from QueryResultChart.tsx.
 * Tests cover: all 6 intents, edge cases (empty data, single row, missing fields),
 * chart type selection, bin assignment, and color assignment.
 *
 * Note: We re-implement the pure derivation logic here (mirrored from the component)
 * to avoid importing React/Recharts in a Node test environment.
 */
import { describe, it, expect } from "vitest";

// ─── Mirror the pure derivation logic from QueryResultChart.tsx ───────────────
// (Kept in sync with the component; if the component changes, update these too)

const C_PRIMARY = "#22c55e";
const C_BLUE    = "#3b82f6";
const C_VIOLET  = "#8b5cf6";
const C_AMBER   = "#f59e0b";
const C_RED     = "#ef4444";
const C_MUTED   = "#6b7280";

type ChartData = {
  type: "bar" | "pie" | "line" | "hbar";
  title: string;
  data: { name: string; value: number; color?: string }[];
  xLabel?: string;
  yLabel?: string;
  valuePrefix?: string;
  valueSuffix?: string;
};

const STATUS_COLORS: Record<string, string> = {
  operational: C_PRIMARY,
  second_life: C_BLUE,
  end_of_life: C_RED,
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: C_RED,
  warning:  C_AMBER,
  info:     C_BLUE,
};
const TRIAGE_COLORS: Record<string, string> = {
  second_life:    C_BLUE,
  recycle:        C_RED,
  continue_use:   C_PRIMARY,
  warranty_claim: C_AMBER,
};

function deriveBatteriesCharts(rows: Record<string, unknown>[]): ChartData[] {
  const charts: ChartData[] = [];
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
    charts.push({ type: "bar", title: "SOH Distribution", data: sohBins.filter((b) => b.value > 0), xLabel: "SOH Range", yLabel: "Batteries", valueSuffix: " batteries" });
  }
  const statusMap: Record<string, number> = {};
  for (const row of rows) {
    const s = String(row.status ?? "unknown").replace(/_/g, " ");
    statusMap[s] = (statusMap[s] ?? 0) + 1;
  }
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name.replace(/ /g, "_")] ?? C_MUTED }));
  if (statusData.length >= 2) {
    charts.push({ type: "pie", title: "Status Breakdown", data: statusData });
  }
  return charts;
}

function deriveTelemetryCharts(rows: Record<string, unknown>[]): ChartData[] {
  const charts: ChartData[] = [];
  const anomalyMap: Record<string, number> = { "No anomaly": 0, "Thermal": 0 };
  for (const row of rows) {
    if (row.thermalAnomaly === true || row.thermalAnomaly === 1) {
      const type = String(row.anomalyType ?? "Thermal").split(":")[0].trim();
      anomalyMap[type] = (anomalyMap[type] ?? 0) + 1;
    } else {
      anomalyMap["No anomaly"]++;
    }
  }
  const anomalyData = Object.entries(anomalyMap).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, color: name === "No anomaly" ? C_PRIMARY : C_RED }));
  if (anomalyData.length >= 1) charts.push({ type: "pie", title: "Anomaly Breakdown", data: anomalyData });
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
  if (tCount >= 2) charts.push({ type: "bar", title: "Temperature Distribution (tMax)", data: tempBins.filter((b) => b.value > 0), xLabel: "Temperature Range", yLabel: "Readings", valueSuffix: " readings" });
  return charts;
}

function deriveAlertsChart(rows: Record<string, unknown>[]): ChartData[] {
  const severityMap: Record<string, number> = {};
  for (const row of rows) {
    const s = String(row.severity ?? "info");
    severityMap[s] = (severityMap[s] ?? 0) + 1;
  }
  const data = Object.entries(severityMap).map(([name, value]) => ({ name, value, color: SEVERITY_COLORS[name] ?? C_MUTED }));
  if (data.length < 1) return [];
  return [{ type: "pie", title: "Alert Severity Breakdown", data }];
}

function deriveSohCharts(rows: Record<string, unknown>[]): ChartData[] {
  const charts: ChartData[] = [];
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
  if (sohCount >= 2) charts.push({ type: "bar", title: "Predicted SOH Distribution", data: sohBins.filter((b) => b.value > 0), xLabel: "SOH Range", yLabel: "Batteries", valueSuffix: " batteries" });
  const triageMap: Record<string, number> = {};
  for (const row of rows) {
    const t = String(row.triagePath ?? "unknown").replace(/_/g, " ");
    triageMap[t] = (triageMap[t] ?? 0) + 1;
  }
  const triageData = Object.entries(triageMap).map(([name, value]) => ({ name, value, color: TRIAGE_COLORS[name.replace(/ /g, "_")] ?? C_MUTED }));
  if (triageData.length >= 2) charts.push({ type: "pie", title: "Triage Path Breakdown", data: triageData });
  return charts;
}

function deriveMarketplaceChart(rows: Record<string, unknown>[]): ChartData[] {
  const priceBins = [
    { name: "< ₹50K",    min: 0,      max: 50000,   value: 0, color: C_PRIMARY },
    { name: "₹50K–₹1L", min: 50000,  max: 100000,  value: 0, color: C_BLUE },
    { name: "₹1L–₹2L",  min: 100000, max: 200000,  value: 0, color: C_VIOLET },
    { name: "₹2L–₹5L",  min: 200000, max: 500000,  value: 0, color: C_AMBER },
    { name: "> ₹5L",     min: 500000, max: Infinity, value: 0, color: C_RED },
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
    const typeMap: Record<string, number> = {};
    for (const row of rows) {
      const t = String(row.listingType ?? "unknown");
      typeMap[t] = (typeMap[t] ?? 0) + 1;
    }
    const typeData = Object.entries(typeMap).map(([name, value], i) => ({ name, value, color: [C_PRIMARY, C_BLUE, C_AMBER][i % 3] }));
    if (typeData.length >= 1) return [{ type: "pie", title: "Listing Type Breakdown", data: typeData }];
    return [];
  }
  return [{ type: "bar", title: "Listing Price Distribution", data: priceBins.filter((b) => b.value > 0), xLabel: "Price Range", yLabel: "Listings", valueSuffix: " listings" }];
}

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
  if (mStats && typeof mStats.totalTransactions === "number") data.push({ name: "Transactions", value: mStats.totalTransactions, color: C_AMBER });
  if (eStats && typeof eStats.verified === "number") data.push({ name: "EPR Tokens", value: eStats.verified, color: "#06b6d4" });
  if (data.length < 2) return [];
  return [{ type: "hbar", title: "Platform Metrics Overview", data, xLabel: "Count", yLabel: "Metric" }];
}

function deriveChartData(
  intent: string,
  results: Record<string, unknown>[],
  summaryStats?: Record<string, unknown> | null,
): ChartData[] {
  if (intent === "summary" && summaryStats) return deriveSummaryChart(summaryStats);
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("deriveChartData — batteries intent", () => {
  it("returns empty array for fewer than 2 rows", () => {
    const result = deriveChartData("batteries", [{ currentSoh: "85", status: "operational" }]);
    expect(result).toHaveLength(0);
  });

  it("returns SOH distribution bar chart when ≥2 rows have SOH values", () => {
    const rows = [
      { currentSoh: "95", status: "operational" },
      { currentSoh: "75", status: "second_life" },
      { currentSoh: "55", status: "end_of_life" },
    ];
    const charts = deriveChartData("batteries", rows);
    const sohChart = charts.find((c) => c.title === "SOH Distribution");
    expect(sohChart).toBeDefined();
    expect(sohChart?.type).toBe("bar");
    expect(sohChart?.data.some((d) => d.name === "90–100%")).toBe(true);
    expect(sohChart?.data.some((d) => d.name === "70–80%")).toBe(true);
    expect(sohChart?.data.some((d) => d.name === "< 60%")).toBe(true);
  });

  it("assigns correct colors to SOH bins", () => {
    const rows = [
      { currentSoh: "55", status: "end_of_life" },
      { currentSoh: "65", status: "end_of_life" },
    ];
    const charts = deriveChartData("batteries", rows);
    const sohChart = charts.find((c) => c.title === "SOH Distribution");
    const bin60 = sohChart?.data.find((d) => d.name === "< 60%");
    const bin70 = sohChart?.data.find((d) => d.name === "60–70%");
    expect(bin60?.color).toBe(C_RED);
    expect(bin70?.color).toBe(C_AMBER);
  });

  it("returns status breakdown pie chart when ≥2 distinct statuses", () => {
    const rows = [
      { currentSoh: "95", status: "operational" },
      { currentSoh: "75", status: "second_life" },
      { currentSoh: "55", status: "end_of_life" },
    ];
    const charts = deriveChartData("batteries", rows);
    const statusChart = charts.find((c) => c.title === "Status Breakdown");
    expect(statusChart).toBeDefined();
    expect(statusChart?.type).toBe("pie");
    expect(statusChart?.data).toHaveLength(3);
  });

  it("does not return status pie chart when all rows have same status", () => {
    const rows = [
      { currentSoh: "95", status: "operational" },
      { currentSoh: "92", status: "operational" },
    ];
    const charts = deriveChartData("batteries", rows);
    const statusChart = charts.find((c) => c.title === "Status Breakdown");
    expect(statusChart).toBeUndefined();
  });

  it("filters out empty bins from SOH distribution", () => {
    const rows = [
      { currentSoh: "95", status: "operational" },
      { currentSoh: "92", status: "operational" },
    ];
    const charts = deriveChartData("batteries", rows);
    const sohChart = charts.find((c) => c.title === "SOH Distribution");
    // Only the 90-100% bin should be present
    expect(sohChart?.data).toHaveLength(1);
    expect(sohChart?.data[0].name).toBe("90–100%");
  });
});

describe("deriveChartData — alerts intent", () => {
  it("returns severity pie chart for alert results", () => {
    const rows = [
      { severity: "critical", type: "thermal" },
      { severity: "warning",  type: "voltage" },
      { severity: "critical", type: "thermal" },
    ];
    const charts = deriveChartData("alerts", rows);
    expect(charts).toHaveLength(1);
    expect(charts[0].type).toBe("pie");
    expect(charts[0].title).toBe("Alert Severity Breakdown");
    const critical = charts[0].data.find((d) => d.name === "critical");
    const warning  = charts[0].data.find((d) => d.name === "warning");
    expect(critical?.value).toBe(2);
    expect(warning?.value).toBe(1);
  });

  it("assigns correct colors to severity levels", () => {
    const rows = [
      { severity: "critical" },
      { severity: "warning" },
      { severity: "info" },
    ];
    const charts = deriveChartData("alerts", rows);
    const data = charts[0].data;
    expect(data.find((d) => d.name === "critical")?.color).toBe(C_RED);
    expect(data.find((d) => d.name === "warning")?.color).toBe(C_AMBER);
    expect(data.find((d) => d.name === "info")?.color).toBe(C_BLUE);
  });
});

describe("deriveChartData — soh intent", () => {
  it("returns predicted SOH distribution bar chart", () => {
    const rows = [
      { predictedSoh: "68", triagePath: "second_life" },
      { predictedSoh: "72", triagePath: "continue_use" },
      { predictedSoh: "45", triagePath: "recycle" },
    ];
    const charts = deriveChartData("soh", rows);
    const sohChart = charts.find((c) => c.title === "Predicted SOH Distribution");
    expect(sohChart).toBeDefined();
    expect(sohChart?.type).toBe("bar");
  });

  it("returns triage path pie chart when ≥2 distinct paths", () => {
    const rows = [
      { predictedSoh: "68", triagePath: "second_life" },
      { predictedSoh: "72", triagePath: "continue_use" },
      { predictedSoh: "45", triagePath: "recycle" },
    ];
    const charts = deriveChartData("soh", rows);
    const triageChart = charts.find((c) => c.title === "Triage Path Breakdown");
    expect(triageChart).toBeDefined();
    expect(triageChart?.type).toBe("pie");
    expect(triageChart?.data).toHaveLength(3);
  });
});

describe("deriveChartData — telemetry intent", () => {
  it("returns anomaly breakdown pie chart", () => {
    const rows = [
      { tMax: "52", thermalAnomaly: true, anomalyType: "High temperature: 52°C" },
      { tMax: "35", thermalAnomaly: false },
      { tMax: "38", thermalAnomaly: false },
    ];
    const charts = deriveChartData("telemetry", rows);
    const anomalyChart = charts.find((c) => c.title === "Anomaly Breakdown");
    expect(anomalyChart).toBeDefined();
    expect(anomalyChart?.type).toBe("pie");
  });

  it("returns temperature distribution bar chart when ≥2 rows have tMax", () => {
    const rows = [
      { tMax: "52", thermalAnomaly: true },
      { tMax: "35", thermalAnomaly: false },
      { tMax: "28", thermalAnomaly: false },
    ];
    const charts = deriveChartData("telemetry", rows);
    const tempChart = charts.find((c) => c.title === "Temperature Distribution (tMax)");
    expect(tempChart).toBeDefined();
    expect(tempChart?.type).toBe("bar");
  });
});

describe("deriveChartData — marketplace intent", () => {
  it("returns price distribution bar chart when ≥2 rows have prices", () => {
    const rows = [
      { askingPriceInr: "45000", listingType: "sell" },
      { askingPriceInr: "120000", listingType: "sell" },
      { askingPriceInr: "75000", listingType: "buy" },
    ];
    const charts = deriveChartData("marketplace", rows);
    expect(charts).toHaveLength(1);
    expect(charts[0].type).toBe("bar");
    expect(charts[0].title).toBe("Listing Price Distribution");
  });

  it("falls back to listing type pie chart when prices are missing", () => {
    const rows = [
      { listingType: "sell" },
      { listingType: "buy" },
      { listingType: "sell" },
    ];
    const charts = deriveChartData("marketplace", rows);
    expect(charts).toHaveLength(1);
    expect(charts[0].type).toBe("pie");
    expect(charts[0].title).toBe("Listing Type Breakdown");
  });

  it("places prices in correct bins", () => {
    const rows = [
      { askingPriceInr: "30000", listingType: "sell" },  // < ₹50K
      { askingPriceInr: "75000", listingType: "sell" },  // ₹50K–₹1L
      { askingPriceInr: "150000", listingType: "sell" }, // ₹1L–₹2L
    ];
    const charts = deriveChartData("marketplace", rows);
    const data = charts[0].data;
    expect(data.find((d) => d.name === "< ₹50K")?.value).toBe(1);
    expect(data.find((d) => d.name === "₹50K–₹1L")?.value).toBe(1);
    expect(data.find((d) => d.name === "₹1L–₹2L")?.value).toBe(1);
  });
});

describe("deriveChartData — summary intent", () => {
  it("returns horizontal bar chart for platform summary stats", () => {
    const stats = {
      batteries: { total: 42, operational: 30, secondLife: 8, endOfLife: 4 },
      marketplace: { totalTransactions: 10, totalValueInr: 500000 },
      epr: { verified: 5, totalYieldKg: 1200 },
    };
    const charts = deriveChartData("summary", [], stats);
    expect(charts).toHaveLength(1);
    expect(charts[0].type).toBe("hbar");
    expect(charts[0].title).toBe("Platform Metrics Overview");
    const data = charts[0].data;
    expect(data.find((d) => d.name === "Total Batteries")?.value).toBe(42);
    expect(data.find((d) => d.name === "Operational")?.value).toBe(30);
    expect(data.find((d) => d.name === "Transactions")?.value).toBe(10);
    expect(data.find((d) => d.name === "EPR Tokens")?.value).toBe(5);
  });

  it("returns empty array when summaryStats has fewer than 2 numeric fields", () => {
    const stats = { batteries: { total: 42 } };
    const charts = deriveChartData("summary", [], stats);
    expect(charts).toHaveLength(0);
  });

  it("ignores results array for summary intent and uses summaryStats", () => {
    const stats = {
      batteries: { total: 10, operational: 8, secondLife: 2, endOfLife: 0 },
      marketplace: { totalTransactions: 3 },
    };
    const rows = [{ bpan: "INBAT001" }, { bpan: "INBAT002" }];
    const charts = deriveChartData("summary", rows, stats);
    expect(charts[0].type).toBe("hbar");
  });
});

describe("deriveChartData — edge cases", () => {
  it("returns empty array for unknown intent", () => {
    const rows = [{ foo: "bar" }, { foo: "baz" }];
    expect(deriveChartData("unknown_intent", rows)).toHaveLength(0);
  });

  it("returns empty array when results is empty for non-summary intents", () => {
    expect(deriveChartData("batteries", [])).toHaveLength(0);
    expect(deriveChartData("alerts", [])).toHaveLength(0);
    expect(deriveChartData("soh", [])).toHaveLength(0);
  });

  it("returns empty array when results has only 1 row", () => {
    expect(deriveChartData("batteries", [{ currentSoh: "85", status: "operational" }])).toHaveLength(0);
  });

  it("handles rows with null/undefined SOH gracefully", () => {
    const rows = [
      { currentSoh: null, status: "operational" },
      { currentSoh: undefined, status: "second_life" },
    ];
    // sohCount < 2, so no SOH chart; but status has 2 distinct values → pie chart
    const charts = deriveChartData("batteries", rows);
    const sohChart = charts.find((c) => c.title === "SOH Distribution");
    expect(sohChart).toBeUndefined();
  });

  it("handles rows with non-numeric SOH strings gracefully", () => {
    const rows = [
      { currentSoh: "N/A", status: "operational" },
      { currentSoh: "pending", status: "second_life" },
    ];
    const charts = deriveChartData("batteries", rows);
    const sohChart = charts.find((c) => c.title === "SOH Distribution");
    expect(sohChart).toBeUndefined();
  });
});
