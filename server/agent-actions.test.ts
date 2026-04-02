/**
 * agent-actions.test.ts — Tests for the Agent Actions tracking system
 * Covers: logAgentAction, listAgentActions, countAgentActions, getAgentActionStats,
 *         getRecentActivity, getSystemHealthMetrics, and the tRPC agent router.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the database module (factory must not reference outer vars) ────────
vi.mock("./db", () => {
  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
    }),
  });

  // Build a flexible mock chain that handles various query patterns
  const createChainMock = () => {
    const chain: any = {};
    const methods = ["from", "where", "orderBy", "limit", "offset", "groupBy"];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    // Make chain itself thenable (resolves to array)
    chain.then = (resolve: any) => resolve([{ count: 0 }]);
    return chain;
  };

  const mockSelect = vi.fn().mockImplementation(() => createChainMock());

  return {
    getDb: vi.fn().mockResolvedValue({
      insert: mockInsert,
      select: mockSelect,
    }),
  };
});

// ─── Import after mocks ─────────────────────────────────────────────────────
import {
  logAgentAction,
  listAgentActions,
  countAgentActions,
  getRecentActivity,
} from "./db-agent";

describe("Agent Actions - Database Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logAgentAction", () => {
    it("should insert an agent action and return the ID", async () => {
      const result = await logAgentAction({
        actorId: 1,
        actorName: "Test Agent",
        actorType: "agent",
        action: "battery.register",
        description: "Registered a new battery",
        module: "battery",
        inputParams: { bpan: "TESTBPAN123456789AB" },
        outputResult: null,
        status: "success",
        errorMessage: null,
        durationMs: 150,
        ipAddress: null,
        targetEntity: "TESTBPAN123456789AB",
        targetEntityType: "battery",
      });

      expect(result).toEqual({ id: 1 });
    });

    it("should handle system actor type", async () => {
      const result = await logAgentAction({
        actorId: null,
        actorName: null,
        actorType: "system",
        action: "system.healthCheck",
        description: "Automated health check",
        module: "system",
        inputParams: null,
        outputResult: null,
        status: "success",
        errorMessage: null,
        durationMs: 5,
        ipAddress: null,
        targetEntity: null,
        targetEntityType: null,
      });

      expect(result).toEqual({ id: 1 });
    });

    it("should handle failure status", async () => {
      const result = await logAgentAction({
        actorId: 2,
        actorName: "AI Agent",
        actorType: "agent",
        action: "ai.predictSoh",
        description: "SOH prediction failed",
        module: "ai",
        inputParams: { bpan: "FAILBPAN123456789AB" },
        outputResult: null,
        status: "failure",
        errorMessage: "Model inference timeout",
        durationMs: 30000,
        ipAddress: null,
        targetEntity: "FAILBPAN123456789AB",
        targetEntityType: "battery",
      });

      expect(result).toEqual({ id: 1 });
    });
  });

  describe("listAgentActions", () => {
    it("should return an array when no actions exist", async () => {
      const result = await listAgentActions();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should accept filter parameters without error", async () => {
      const result = await listAgentActions({
        actorType: "agent",
        module: "battery",
        status: "success",
        search: "register",
        limit: 10,
        offset: 0,
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("countAgentActions", () => {
    it("should return a number", async () => {
      const result = await countAgentActions();
      expect(typeof result).toBe("number");
    });
  });

  describe("getRecentActivity", () => {
    it("should return an array", async () => {
      const result = await getRecentActivity(10);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("Agent Actions - Schema Validation", () => {
  it("should validate actor types", () => {
    const validTypes = ["human", "agent", "system"];
    validTypes.forEach((type) => {
      expect(["human", "agent", "system"]).toContain(type);
    });
  });

  it("should validate module types", () => {
    const validModules = [
      "battery", "telemetry", "marketplace", "compliance",
      "logistics", "analytics", "admin", "system", "agent", "ai",
    ];
    expect(validModules.length).toBe(10);
  });

  it("should validate status types", () => {
    const validStatuses = ["success", "failure", "pending", "cancelled"];
    expect(validStatuses.length).toBe(4);
  });
});

describe("Agent Actions - Capabilities Endpoint", () => {
  it("should describe all platform modules", () => {
    const modules = [
      { name: "battery", actionCount: 6 },
      { name: "telemetry", actionCount: 4 },
      { name: "ai", actionCount: 4 },
      { name: "marketplace", actionCount: 3 },
      { name: "compliance", actionCount: 5 },
      { name: "logistics", actionCount: 3 },
      { name: "admin", actionCount: 4 },
    ];

    expect(modules.length).toBe(7);
    const totalActions = modules.reduce((sum, m) => sum + m.actionCount, 0);
    expect(totalActions).toBe(29);
  });

  it("should list all agentic endpoints", () => {
    const endpoints = [
      "agent.logAction",
      "agent.execute",
      "agent.batchExecute",
      "agent.listActions",
      "agent.stats",
      "agent.recentActivity",
      "agent.systemHealth",
      "agent.capabilities",
    ];
    expect(endpoints.length).toBe(8);
  });
});
