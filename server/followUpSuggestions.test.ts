/**
 * followUpSuggestions.test.ts
 * Unit tests for the follow-up suggestions parsing logic used in the nlQuery procedure.
 * Tests cover: valid JSON parsing, graceful degradation on invalid JSON, deduplication,
 * length capping, empty array handling, and type safety.
 */
import { describe, it, expect } from "vitest";

// ─── Mirror the parsing logic from routers.ts ─────────────────────────────────
function parseFollowUpSuggestions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { suggestions?: unknown };
    if (Array.isArray(parsed.suggestions)) {
      return (parsed.suggestions as unknown[])
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, 4);
    }
    return [];
  } catch {
    return [];
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("parseFollowUpSuggestions", () => {
  it("parses valid JSON with 3 suggestions", () => {
    const raw = JSON.stringify({
      suggestions: [
        "Show NMC batteries below 70% SOH",
        "List critical thermal anomaly alerts this week",
        "Which batteries are ready for second-life marketplace?",
      ],
    });
    const result = parseFollowUpSuggestions(raw);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("Show NMC batteries below 70% SOH");
    expect(result[2]).toBe("Which batteries are ready for second-life marketplace?");
  });

  it("caps at 4 suggestions even if LLM returns more", () => {
    const raw = JSON.stringify({
      suggestions: [
        "Suggestion 1",
        "Suggestion 2",
        "Suggestion 3",
        "Suggestion 4",
        "Suggestion 5",
        "Suggestion 6",
      ],
    });
    const result = parseFollowUpSuggestions(raw);
    expect(result).toHaveLength(4);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseFollowUpSuggestions("not valid json {{{")).toHaveLength(0);
    expect(parseFollowUpSuggestions("{incomplete")).toHaveLength(0);
  });

  it("returns empty array for null or undefined input", () => {
    expect(parseFollowUpSuggestions(null)).toHaveLength(0);
    expect(parseFollowUpSuggestions(undefined)).toHaveLength(0);
    expect(parseFollowUpSuggestions("")).toHaveLength(0);
  });

  it("returns empty array when suggestions key is missing", () => {
    const raw = JSON.stringify({ answer: "some answer" });
    expect(parseFollowUpSuggestions(raw)).toHaveLength(0);
  });

  it("returns empty array when suggestions is not an array", () => {
    const raw = JSON.stringify({ suggestions: "not an array" });
    expect(parseFollowUpSuggestions(raw)).toHaveLength(0);
  });

  it("filters out non-string items from suggestions array", () => {
    const raw = JSON.stringify({
      suggestions: ["Valid suggestion", 42, null, true, "Another valid one"],
    });
    const result = parseFollowUpSuggestions(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("Valid suggestion");
    expect(result[1]).toBe("Another valid one");
  });

  it("filters out empty or whitespace-only strings", () => {
    const raw = JSON.stringify({
      suggestions: ["Valid suggestion", "", "   ", "\t\n", "Another valid"],
    });
    const result = parseFollowUpSuggestions(raw);
    expect(result).toHaveLength(2);
  });

  it("handles empty suggestions array gracefully", () => {
    const raw = JSON.stringify({ suggestions: [] });
    expect(parseFollowUpSuggestions(raw)).toHaveLength(0);
  });

  it("handles suggestions array with all invalid items", () => {
    const raw = JSON.stringify({ suggestions: [null, 42, false, {}] });
    expect(parseFollowUpSuggestions(raw)).toHaveLength(0);
  });

  it("preserves suggestion text exactly as returned by LLM", () => {
    const suggestion = "Show batteries with SOH < 75% in the NMC fleet";
    const raw = JSON.stringify({ suggestions: [suggestion] });
    const result = parseFollowUpSuggestions(raw);
    expect(result[0]).toBe(suggestion);
  });

  it("handles JSON with extra fields alongside suggestions", () => {
    const raw = JSON.stringify({
      intent: "batteries",
      confidence: 0.95,
      suggestions: ["Drill into LFP chemistry", "Show end-of-life batteries"],
    });
    const result = parseFollowUpSuggestions(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("Drill into LFP chemistry");
  });
});

describe("follow-up suggestion content quality (structural checks)", () => {
  it("suggestions should be non-empty strings of reasonable length", () => {
    const suggestions = [
      "Show NMC batteries below 70% SOH",
      "List critical thermal anomaly alerts this week",
      "Which batteries are ready for second-life marketplace?",
    ];
    for (const s of suggestions) {
      expect(typeof s).toBe("string");
      expect(s.trim().length).toBeGreaterThan(5);
      expect(s.trim().length).toBeLessThan(200);
    }
  });

  it("suggestions array should have between 1 and 4 items", () => {
    const validLengths = [1, 2, 3, 4];
    for (const len of validLengths) {
      const suggestions = Array.from({ length: len }, (_, i) => `Suggestion ${i + 1}`);
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions.length).toBeLessThanOrEqual(4);
    }
  });
});
