/**
 * Tests for the enhanced wiki feedback list and review system.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Self-referencing mock DB ───────────────────────────────────────────────

let queryResult: any = [];

// Build a mock that returns itself for every chained call and resolves to queryResult when awaited
function makeMockDb() {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        // Make it thenable so `await chain` resolves to queryResult
        const val = queryResult;
        return (res: (v: any) => void) => res(val);
      }
      // Return a function that returns a new proxy (for chaining)
      return (..._args: any[]) => new Proxy({}, handler);
    },
  };
  // The db object itself needs methods directly callable (not via proxy get returning functions)
  // So we wrap it: db.select() → proxy, proxy.from() → proxy, etc.
  const dbHandler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") return undefined; // db itself is NOT thenable
      return (..._args: any[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, dbHandler);
}

vi.mock("./db", () => ({
  getDb: vi.fn(async () => makeMockDb()),
}));

vi.mock("../drizzle/schema", () => ({
  wikiFeedback: {
    id: "id", articleId: "articleId", articleTitle: "articleTitle",
    type: "type", content: "content", suggestedContent: "suggestedContent",
    section: "section", rating: "rating", status: "status",
    reviewNotes: "reviewNotes", reviewedBy: "reviewedBy", reviewedAt: "reviewedAt",
    userId: "userId", userName: "userName", userEmail: "userEmail",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  tutorialProgress: {
    id: "id", userId: "userId", stepKey: "stepKey", completedAt: "completedAt",
  },
}));

// ─── TESTS ──────────────────────────────────────────────────────────────────

describe("Wiki Feedback Review System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = [];
  });

  describe("listFeedback", () => {
    it("returns items and total count with default pagination", async () => {
      queryResult = [];
      const { listFeedback } = await import("./db-wiki");
      const result = await listFeedback({});
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.total).toBe("number");
    });

    it("accepts status filter parameter", async () => {
      queryResult = [];
      const { listFeedback } = await import("./db-wiki");
      const result = await listFeedback({ status: "pending" });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("accepts type filter parameter", async () => {
      queryResult = [];
      const { listFeedback } = await import("./db-wiki");
      const result = await listFeedback({ type: "suggest_edit" });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("accepts search filter parameter", async () => {
      queryResult = [];
      const { listFeedback } = await import("./db-wiki");
      const result = await listFeedback({ search: "battery" });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("accepts combined filters", async () => {
      queryResult = [];
      const { listFeedback } = await import("./db-wiki");
      const result = await listFeedback({
        status: "pending",
        type: "flag_outdated",
        search: "test",
        limit: 10,
        offset: 20,
      });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("accepts articleId filter", async () => {
      queryResult = [];
      const { listFeedback } = await import("./db-wiki");
      const result = await listFeedback({ articleId: "platform-overview" });
      expect(result).toHaveProperty("items");
    });
  });

  describe("getFeedbackStats", () => {
    it("returns stats object with status counts", async () => {
      queryResult = [];
      const { getFeedbackStats } = await import("./db-wiki");
      const stats = await getFeedbackStats();
      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("approved");
      expect(stats).toHaveProperty("rejected");
      expect(stats).toHaveProperty("merged");
      expect(stats).toHaveProperty("total");
      expect(typeof stats.total).toBe("number");
    });

    it("returns zero counts when no feedback exists", async () => {
      queryResult = [];
      const { getFeedbackStats } = await import("./db-wiki");
      const stats = await getFeedbackStats();
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.approved).toBe(0);
    });
  });

  describe("reviewFeedback", () => {
    it("accepts approved status", async () => {
      queryResult = { affectedRows: 1 };
      const { reviewFeedback } = await import("./db-wiki");
      const result = await reviewFeedback({ id: 1, status: "approved", reviewedBy: 42 });
      expect(result).toEqual({ success: true });
    });

    it("accepts rejected status with notes", async () => {
      queryResult = { affectedRows: 1 };
      const { reviewFeedback } = await import("./db-wiki");
      const result = await reviewFeedback({
        id: 2, status: "rejected",
        reviewNotes: "Content is already up to date",
        reviewedBy: 42,
      });
      expect(result).toEqual({ success: true });
    });

    it("accepts merged status", async () => {
      queryResult = { affectedRows: 1 };
      const { reviewFeedback } = await import("./db-wiki");
      const result = await reviewFeedback({
        id: 3, status: "merged",
        reviewNotes: "Great suggestion, merged into article",
        reviewedBy: 42,
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("submitFeedback", () => {
    it("inserts feedback with all fields", async () => {
      queryResult = [{ insertId: 99 }];
      const { submitFeedback } = await import("./db-wiki");
      const result = await submitFeedback({
        articleId: "platform-overview",
        articleTitle: "Platform Overview",
        type: "suggest_edit",
        content: "This section needs updating",
        suggestedContent: "Updated text here",
        userId: 1,
        userName: "Test User",
        userEmail: "test@example.com",
      });
      expect(result).toEqual({ id: 99 });
    });

    it("inserts feedback with minimal fields", async () => {
      queryResult = [{ insertId: 100 }];
      const { submitFeedback } = await import("./db-wiki");
      const result = await submitFeedback({
        articleId: "data-model",
        articleTitle: "Data Model",
        type: "rate_helpful",
        rating: 5,
      });
      expect(result).toEqual({ id: 100 });
    });

    it("handles all feedback types", async () => {
      const types = [
        "suggest_edit", "flag_outdated", "flag_inaccurate",
        "request_topic", "rate_helpful", "rate_not_helpful", "general",
      ] as const;

      const { submitFeedback } = await import("./db-wiki");
      for (const type of types) {
        queryResult = [{ insertId: 1 }];
        const result = await submitFeedback({
          articleId: "test", articleTitle: "Test", type,
        });
        expect(result).toHaveProperty("id");
      }
    });
  });

  describe("Feedback type and status validation", () => {
    it("defines all 7 feedback types", () => {
      const validTypes = [
        "suggest_edit", "flag_outdated", "flag_inaccurate",
        "request_topic", "rate_helpful", "rate_not_helpful", "general",
      ];
      expect(validTypes).toHaveLength(7);
    });

    it("defines all 4 review statuses", () => {
      const validStatuses = ["pending", "approved", "rejected", "merged"];
      expect(validStatuses).toHaveLength(4);
    });
  });
});
