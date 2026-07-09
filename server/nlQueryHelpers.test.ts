/**
 * nlQueryHelpers.test.ts
 * Unit tests for the pure helper functions used by NaturalLanguageSearch:
 * - CSV export formatting
 * - localStorage history persistence
 * - Value formatting utilities
 *
 * These are pure-logic tests that do not require a DOM or DB.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Inline the helpers under test (mirrored from NaturalLanguageSearch.tsx) ──
// We test the logic in isolation without importing the React component.

const MAX_HISTORY = 8;
const LS_HISTORY_KEY = "cai_nl_query_history";

function loadHistory(storage: Record<string, string>): string[] {
  try {
    const raw = storage[LS_HISTORY_KEY];
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[], storage: Record<string, string>) {
  storage[LS_HISTORY_KEY] = JSON.stringify(history);
}

function addToHistory(query: string, prev: string[]): string[] {
  return [query, ...prev.filter((h) => h !== query)].slice(0, MAX_HISTORY);
}

function formatValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (
    key.includes("At") || key.includes("Date") ||
    key === "createdAt" || key === "recordedAt" || key === "predictedAt"
  ) {
    try { return new Date(val as string).toLocaleDateString(); } catch { return String(val); }
  }
  if (
    key.includes("Soh") || key === "currentSoh" || key === "sohEstimate" ||
    key === "predictedSoh" || key === "confidence"
  ) {
    const n = parseFloat(String(val));
    return isNaN(n) ? String(val) : `${n.toFixed(1)}%`;
  }
  if (key.includes("Kwh") || key === "capacityKwh") {
    return `${parseFloat(String(val)).toFixed(1)} kWh`;
  }
  if (key.includes("Price") || key.includes("Inr")) {
    return `₹${Number(val).toLocaleString("en-IN")}`;
  }
  if (key === "tMax" || key === "tPack") return `${parseFloat(String(val)).toFixed(1)}°C`;
  if (key === "vPack") return `${parseFloat(String(val)).toFixed(1)}V`;
  return String(val);
}

function buildCsvContent(results: Record<string, unknown>[]): string {
  if (results.length === 0) return "";
  const columns = Object.keys(results[0]);
  const header = columns.join(",");
  const rows = results.map((row) =>
    columns.map((col) => {
      const val = row[col];
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

function formatHeader(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("NaturalLanguageSearch — localStorage history", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
  });

  it("loads empty array when localStorage is empty", () => {
    expect(loadHistory(storage)).toEqual([]);
  });

  it("loads previously saved history", () => {
    storage[LS_HISTORY_KEY] = JSON.stringify(["query A", "query B"]);
    expect(loadHistory(storage)).toEqual(["query A", "query B"]);
  });

  it("returns empty array when localStorage value is invalid JSON", () => {
    storage[LS_HISTORY_KEY] = "not-json{{";
    expect(loadHistory(storage)).toEqual([]);
  });

  it("saves and reloads history correctly", () => {
    const history = ["Show batteries below 80% SOH", "List thermal anomalies"];
    saveHistory(history, storage);
    expect(loadHistory(storage)).toEqual(history);
  });

  it("addToHistory prepends new query at the front", () => {
    const prev = ["old query"];
    const next = addToHistory("new query", prev);
    expect(next[0]).toBe("new query");
    expect(next[1]).toBe("old query");
  });

  it("addToHistory deduplicates — moves existing query to front", () => {
    const prev = ["query A", "query B", "query C"];
    const next = addToHistory("query B", prev);
    expect(next[0]).toBe("query B");
    expect(next).toHaveLength(3);
    expect(next.filter((q) => q === "query B")).toHaveLength(1);
  });

  it("addToHistory caps history at MAX_HISTORY entries", () => {
    const prev = Array.from({ length: MAX_HISTORY }, (_, i) => `query ${i}`);
    const next = addToHistory("overflow query", prev);
    expect(next).toHaveLength(MAX_HISTORY);
    expect(next[0]).toBe("overflow query");
  });

  it("addToHistory with empty previous returns single-item array", () => {
    const next = addToHistory("first query", []);
    expect(next).toEqual(["first query"]);
  });
});

describe("NaturalLanguageSearch — formatValue", () => {
  it("returns — for null values", () => {
    expect(formatValue("anyKey", null)).toBe("—");
  });

  it("returns — for undefined values", () => {
    expect(formatValue("anyKey", undefined)).toBe("—");
  });

  it("formats boolean true as 'Yes'", () => {
    expect(formatValue("thermalAnomaly", true)).toBe("Yes");
  });

  it("formats boolean false as 'No'", () => {
    expect(formatValue("thermalAnomaly", false)).toBe("No");
  });

  it("formats SOH values with one decimal and % suffix", () => {
    expect(formatValue("currentSoh", "85.678")).toBe("85.7%");
    expect(formatValue("predictedSoh", 72)).toBe("72.0%");
    expect(formatValue("confidence", "0.92")).toBe("0.9%");
  });

  it("formats kWh values with one decimal and kWh suffix", () => {
    expect(formatValue("capacityKwh", "30.5")).toBe("30.5 kWh");
    expect(formatValue("totalKwh", 100)).toBe("100.0 kWh");
  });

  it("formats INR price values with ₹ prefix and locale formatting", () => {
    const result = formatValue("askPriceInr", 85000);
    expect(result).toContain("₹");
    expect(result).toContain("85");
  });

  it("formats temperature fields with °C suffix", () => {
    expect(formatValue("tMax", "52.5")).toBe("52.5°C");
    expect(formatValue("tPack", 48)).toBe("48.0°C");
  });

  it("formats voltage field with V suffix", () => {
    expect(formatValue("vPack", "400.0")).toBe("400.0V");
  });

  it("returns string representation for unknown keys", () => {
    expect(formatValue("chemistry", "NMC")).toBe("NMC");
    expect(formatValue("bpan", "INBAT001A1KKINA5ABCA0001")).toBe("INBAT001A1KKINA5ABCA0001");
  });
});

describe("NaturalLanguageSearch — CSV export", () => {
  it("returns empty string for empty results", () => {
    expect(buildCsvContent([])).toBe("");
  });

  it("builds correct CSV header from result keys", () => {
    const results = [{ bpan: "INBAT001", chemistry: "NMC", currentSoh: "85.0" }];
    const csv = buildCsvContent(results);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("bpan,chemistry,currentSoh");
  });

  it("builds correct CSV data rows", () => {
    const results = [
      { bpan: "INBAT001", chemistry: "NMC", currentSoh: "85.0" },
      { bpan: "INBAT002", chemistry: "LFP", currentSoh: "72.5" },
    ];
    const csv = buildCsvContent(results);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toBe("INBAT001,NMC,85.0");
    expect(lines[2]).toBe("INBAT002,LFP,72.5");
  });

  it("wraps values containing commas in double quotes", () => {
    const results = [{ message: "High temp, check battery" }];
    const csv = buildCsvContent(results);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"High temp, check battery"');
  });

  it("escapes double quotes inside values", () => {
    const results = [{ note: 'Battery "A" failed' }];
    const csv = buildCsvContent(results);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"Battery ""A"" failed"');
  });

  it("handles null and undefined values as empty strings", () => {
    const results = [{ bpan: "INBAT001", chemistry: null, currentSoh: undefined }];
    const csv = buildCsvContent(results as Record<string, unknown>[]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("INBAT001,,");
  });

  it("handles multiple rows with mixed types", () => {
    const results = [
      { bpan: "INBAT001", soh: 85, active: true },
      { bpan: "INBAT002", soh: 72, active: false },
    ];
    const csv = buildCsvContent(results);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("INBAT001,85,true");
    expect(lines[2]).toBe("INBAT002,72,false");
  });
});

describe("NaturalLanguageSearch — formatHeader", () => {
  it("converts camelCase to Title Case with spaces", () => {
    expect(formatHeader("currentSoh")).toBe("Current Soh");
    expect(formatHeader("capacityKwh")).toBe("Capacity Kwh");
    expect(formatHeader("createdAt")).toBe("Created At");
  });

  it("capitalizes first letter", () => {
    expect(formatHeader("bpan")).toBe("Bpan");
    expect(formatHeader("chemistry")).toBe("Chemistry");
  });

  it("handles already-capitalized keys", () => {
    expect(formatHeader("BPAN")).toBe("B P A N");
  });
});
