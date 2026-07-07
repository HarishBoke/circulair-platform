/**
 * NaturalLanguageSearch.tsx
 * A natural language search bar for the AI analytics dashboard.
 * Users can type plain-English questions about battery data and get
 * LLM-powered answers with structured result tables.
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Sparkles, ChevronDown, ChevronUp, Clock, X,
  Battery, Activity, AlertTriangle, ShoppingCart, BarChart2, Loader2,
} from "lucide-react";

// ─── Suggested queries ────────────────────────────────────────────────────────
const SUGGESTED_QUERIES = [
  { label: "Batteries below 80% SOH", icon: Battery, query: "Show me all batteries with SOH below 80%" },
  { label: "Thermal anomalies", icon: AlertTriangle, query: "List recent thermal anomaly alerts" },
  { label: "End-of-life batteries", icon: Battery, query: "Which batteries are at end of life?" },
  { label: "Critical alerts", icon: AlertTriangle, query: "Show critical severity alerts" },
  { label: "NMC battery fleet", icon: Battery, query: "Show all NMC chemistry batteries" },
  { label: "Platform summary", icon: BarChart2, query: "Give me a platform-wide summary" },
  { label: "Marketplace listings", icon: ShoppingCart, query: "Show recent marketplace listings" },
  { label: "SOH predictions", icon: Activity, query: "Show latest SOH predictions under 70%" },
];

// ─── Intent badge colors ──────────────────────────────────────────────────────
const INTENT_COLORS: Record<string, string> = {
  batteries: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  telemetry: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  alerts: "bg-red-500/15 text-red-400 border-red-500/30",
  soh: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  marketplace: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  summary: "bg-primary/15 text-primary border-primary/30",
};

const INTENT_LABELS: Record<string, string> = {
  batteries: "Battery Registry",
  telemetry: "Telemetry",
  alerts: "Alerts",
  soh: "SOH Predictions",
  marketplace: "Marketplace",
  summary: "Platform Summary",
};

// ─── Result table renderer ────────────────────────────────────────────────────
function ResultTable({ results, intent }: { results: Record<string, unknown>[]; intent: string }) {
  if (results.length === 0) return null;

  const columns = Object.keys(results[0]).filter((k) => k !== "id");

  const formatValue = (key: string, val: unknown): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (key.includes("At") || key.includes("Date") || key === "createdAt" || key === "recordedAt" || key === "predictedAt") {
      try { return new Date(val as string).toLocaleDateString(); } catch { return String(val); }
    }
    if (key.includes("Soh") || key === "currentSoh" || key === "sohEstimate" || key === "predictedSoh" || key === "confidence") {
      const n = parseFloat(String(val));
      return isNaN(n) ? String(val) : `${n.toFixed(1)}%`;
    }
    if (key.includes("Kwh") || key === "capacityKwh") {
      return `${parseFloat(String(val)).toFixed(1)} kWh`;
    }
    if (key.includes("Price") || key.includes("Inr")) {
      return `₹${Number(val).toLocaleString("en-IN")}`;
    }
    if (key === "tMax" || key === "tPack") {
      return `${parseFloat(String(val)).toFixed(1)}°C`;
    }
    if (key === "vPack") {
      return `${parseFloat(String(val)).toFixed(1)}V`;
    }
    return String(val);
  };

  const formatHeader = (key: string): string =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();

  return (
    <div className="overflow-x-auto rounded-lg border border-border mt-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-mono text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {formatHeader(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 text-foreground/80 whitespace-nowrap font-mono">
                  {col === "bpan" ? (
                    <span className="text-primary font-semibold">{String(row[col])}</span>
                  ) : col === "severity" ? (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                      String(row[col]) === "critical" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                      String(row[col]) === "warning" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                      "bg-blue-500/15 text-blue-400 border-blue-500/30"
                    }`}>
                      {String(row[col])}
                    </span>
                  ) : col === "status" ? (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                      String(row[col]) === "operational" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                      String(row[col]) === "second_life" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
                      "bg-red-500/15 text-red-400 border-red-500/30"
                    }`}>
                      {String(row[col]).replace(/_/g, " ")}
                    </span>
                  ) : (
                    formatValue(col, row[col])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Summary stats renderer ───────────────────────────────────────────────────
function SummaryStats({ stats }: { stats: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
      {Object.entries(stats).map(([key, val]) => (
        <div key={key} className="bg-muted/20 border border-border rounded-lg p-3">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
            {key.replace(/([A-Z])/g, " $1").trim()}
          </div>
          <div className="space-y-1">
            {typeof val === "object" && val !== null
              ? Object.entries(val as Record<string, unknown>).slice(0, 4).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                    <span className="font-mono text-foreground/80">{String(v ?? "—")}</span>
                  </div>
                ))
              : <span className="text-sm font-bold">{String(val)}</span>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function NaturalLanguageSearch() {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const nlQuery = trpc.analytics.nlQuery.useMutation();

  const handleSubmit = (q?: string) => {
    const searchQuery = (q ?? query).trim();
    if (!searchQuery) return;
    setShowSuggestions(false);
    setShowResults(true);
    setHistory((prev) => [searchQuery, ...prev.filter((h) => h !== searchQuery)].slice(0, 5));
    nlQuery.mutate({ query: searchQuery });
    if (!q) setQuery(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.closest(".nl-search-container")?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const result = nlQuery.data;
  const isLoading = nlQuery.isPending;
  const hasError = nlQuery.isError;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border/50">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-display text-sm font-semibold">AI Battery Query</span>
        <span className="text-xs text-muted-foreground ml-1">Ask anything about your battery data</span>
      </div>

      {/* Search bar */}
      <div className="nl-search-container relative px-4 py-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder='e.g. "Show batteries below 80% SOH" or "List thermal anomalies"'
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
              aria-label="Natural language battery query"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            onClick={() => handleSubmit()}
            disabled={!query.trim() || isLoading}
            size="sm"
            className="px-4 shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="ml-1.5 hidden sm:inline">{isLoading ? "Querying…" : "Ask AI"}</span>
          </Button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div className="absolute left-4 right-4 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
            {history.length > 0 && (
              <div className="px-3 py-2 border-b border-border/50">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Recent
                </div>
                {history.map((h) => (
                  <button
                    key={h}
                    onClick={() => { setQuery(h); handleSubmit(h); }}
                    className="w-full text-left px-2 py-1.5 text-xs text-foreground/80 hover:bg-muted/50 rounded transition-colors truncate"
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
            <div className="px-3 py-2">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Suggested Queries
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {SUGGESTED_QUERIES.map((s) => (
                  <button
                    key={s.query}
                    onClick={() => { setQuery(s.query); handleSubmit(s.query); }}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground/80 hover:bg-muted/50 rounded transition-colors text-left"
                  >
                    <s.icon className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion chips (always visible) */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {SUGGESTED_QUERIES.slice(0, 5).map((s) => (
          <button
            key={s.query}
            onClick={() => { setQuery(s.query); handleSubmit(s.query); }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/60 bg-muted/20 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/5 transition-all"
          >
            <s.icon className="w-3 h-3" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Results section */}
      {(result || isLoading || hasError) && (
        <div className="border-t border-border/50">
          {/* Result header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/10">
            <div className="flex items-center gap-2 flex-wrap">
              {result && (
                <>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${INTENT_COLORS[result.intent] ?? "bg-muted text-muted-foreground border-border"}`}>
                    {INTENT_LABELS[result.intent] ?? result.intent}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {result.totalCount} result{result.totalCount !== 1 ? "s" : ""}
                    {result.results.length < result.totalCount && ` (showing ${result.results.length})`}
                  </span>
                </>
              )}
              {isLoading && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analyzing query…
                </span>
              )}
              {hasError && (
                <span className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  Query failed — please try again
                </span>
              )}
            </div>
            {result && (
              <button
                onClick={() => setShowResults((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showResults ? "Collapse results" : "Expand results"}
              >
                {showResults ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* AI answer */}
          {result && showResults && (
            <div className="px-4 pb-4 space-y-3">
              {/* LLM answer */}
              <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground/90 leading-relaxed">{result.answer}</p>
                </div>
              </div>

              {/* Active filters */}
              {Object.entries(result.filters).some(([k, v]) => v != null && k !== "limit") && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(result.filters)
                    .filter(([k, v]) => v != null && k !== "limit")
                    .map(([k, v]) => (
                      <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/30 border border-border text-[10px] font-mono text-muted-foreground">
                        {k}: <span className="text-foreground/70">{String(v)}</span>
                      </span>
                    ))}
                </div>
              )}

              {/* Results table or summary */}
              {result.summaryStats ? (
                <SummaryStats stats={result.summaryStats} />
              ) : result.results.length > 0 ? (
                <ResultTable results={result.results} intent={result.intent} />
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No matching records found for this query.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
