import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── STRUCTURED LOGGER TESTS ────────────────────────────────────────────────

describe("Structured Logger", () => {
  it("logger module exports expected functions", async () => {
    const mod = await import("./structuredLogger");
    expect(mod.logger).toBeDefined();
    expect(mod.logger.debug).toBeTypeOf("function");
    expect(mod.logger.info).toBeTypeOf("function");
    expect(mod.logger.warn).toBeTypeOf("function");
    expect(mod.logger.error).toBeTypeOf("function");
    expect(mod.logger.fatal).toBeTypeOf("function");
  });

  it("createScopedLogger returns scoped methods", async () => {
    const { createScopedLogger } = await import("./structuredLogger");
    const scoped = createScopedLogger({ traceId: "test-123", module: "bpan" });
    expect(scoped.debug).toBeTypeOf("function");
    expect(scoped.info).toBeTypeOf("function");
    expect(scoped.warn).toBeTypeOf("function");
    expect(scoped.error).toBeTypeOf("function");
    expect(scoped.timer).toBeTypeOf("function");
  });

  it("createTimer measures elapsed time", async () => {
    const { createTimer } = await import("./structuredLogger");
    const timer = createTimer("test-operation", { module: "test" });
    // Simulate some work
    await new Promise(r => setTimeout(r, 10));
    const duration = timer.end({ key: "value" });
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(typeof duration).toBe("number");
  });

  it("logSecurityEvent does not throw", async () => {
    const { logSecurityEvent } = await import("./structuredLogger");
    expect(() => logSecurityEvent("Test security event", {
      userId: 1,
      traceId: "test-trace",
      controlRef: "ISO27001-A.12.4.1",
    })).not.toThrow();
  });

  it("logDataAccess does not throw", async () => {
    const { logDataAccess } = await import("./structuredLogger");
    expect(() => logDataAccess("Test data access", {
      userId: 1,
      traceId: "test-trace",
      dataClassification: "confidential",
    })).not.toThrow();
  });

  it("logConfigChange does not throw", async () => {
    const { logConfigChange } = await import("./structuredLogger");
    expect(() => logConfigChange("Test config change", {
      userId: 1,
      traceId: "test-trace",
    })).not.toThrow();
  });
});

// ─── COMPLIANCE MODULE TESTS ────────────────────────────────────────────────

describe("Compliance Module", () => {
  it("exports expected functions", async () => {
    const mod = await import("./compliance");
    expect(mod.writeAuditLog).toBeTypeOf("function");
    expect(mod.writeSecurityEvent).toBeTypeOf("function");
    expect(mod.generateTraceId).toBeTypeOf("function");
    expect(mod.getAuditStats).toBeTypeOf("function");
    expect(mod.getSecurityStats).toBeTypeOf("function");
  });

  it("generateTraceId produces valid format", async () => {
    const { generateTraceId } = await import("./compliance");
    const traceId = generateTraceId();
    expect(traceId).toMatch(/^cai-/);
    expect(traceId.length).toBeGreaterThan(5);
  });

  it("generateTraceId produces unique IDs", async () => {
    const { generateTraceId } = await import("./compliance");
    const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()));
    expect(ids.size).toBe(100);
  });
});

// ─── API GATEWAY TESTS ─────────────────────────────────────────────────────

describe("API Gateway", () => {
  it("exports createApiGateway function", async () => {
    const mod = await import("./apiGateway");
    expect(mod.createApiGateway).toBeTypeOf("function");
  });

  it("createApiGateway returns an Express router", async () => {
    const { createApiGateway } = await import("./apiGateway");
    const router = createApiGateway();
    expect(router).toBeDefined();
    // Express routers have a stack property
    expect((router as any).stack).toBeDefined();
  });
});

// ─── MCP SERVER TESTS ───────────────────────────────────────────────────────

describe("MCP Server", () => {
  it("exports createMcpRouter function", async () => {
    const mod = await import("./mcpServer");
    expect(mod.createMcpRouter).toBeTypeOf("function");
  });

  it("createMcpRouter returns an Express router", async () => {
    const { createMcpRouter } = await import("./mcpServer");
    const router = createMcpRouter();
    expect(router).toBeDefined();
    expect((router as any).stack).toBeDefined();
  });
});

// ─── WARRANTY STATUS ENGINE TESTS ───────────────────────────────────────────

describe("Warranty Status Engine — computeWarrantyStatus", () => {
  it("exports computeWarrantyStatus function", async () => {
    const { computeWarrantyStatus } = await import("./db-warranty");
    expect(computeWarrantyStatus).toBeTypeOf("function");
  });

  it("returns active for warranty within period", async () => {
    const { computeWarrantyStatus } = await import("./db-warranty");
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000); // 335 days from now
    const result = computeWarrantyStatus({
      warrantyStartDate: start,
      warrantyEndDate: end,
      status: "active",
    });
    expect(result.effectiveStatus).toBe("active");
    expect(result.isInWarranty).toBe(true);
    expect(result.daysRemaining).toBeGreaterThan(300);
  });

  it("returns expired for warranty past end date", async () => {
    const { computeWarrantyStatus } = await import("./db-warranty");
    const start = new Date("2023-01-01");
    const end = new Date("2024-01-01");
    const result = computeWarrantyStatus({
      warrantyStartDate: start,
      warrantyEndDate: end,
      status: "active",
    });
    expect(result.effectiveStatus).toBe("expired");
    expect(result.isInWarranty).toBe(false);
    expect(result.daysRemaining).toBe(0);
  });

  it("returns voided when status is voided regardless of dates", async () => {
    const { computeWarrantyStatus } = await import("./db-warranty");
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000);
    const result = computeWarrantyStatus({
      warrantyStartDate: start,
      warrantyEndDate: end,
      status: "voided",
    });
    expect(result.effectiveStatus).toBe("voided");
    expect(result.isInWarranty).toBe(false);
  });

  it("calculates daysRemaining correctly for mid-warranty battery", async () => {
    const { computeWarrantyStatus } = await import("./db-warranty");
    const now = new Date();
    const start = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000); // ~6 months ago
    const end = new Date(now.getTime() + 183 * 24 * 60 * 60 * 1000); // ~6 months from now
    const result = computeWarrantyStatus({
      warrantyStartDate: start,
      warrantyEndDate: end,
      status: "active",
    });
    expect(result.effectiveStatus).toBe("active");
    expect(result.isInWarranty).toBe(true);
    expect(result.daysRemaining).toBeGreaterThan(170);
    expect(result.daysRemaining).toBeLessThan(200);
  });
});

// ─── DOCUMENTATION FILES TESTS ──────────────────────────────────────────────

describe("Documentation Files", () => {
  const fs = require("fs");
  const path = require("path");
  const docsDir = path.join(__dirname, "..", "docs");

  const expectedFiles = [
    "PLATFORM_GUIDE.md",
    "API_REFERENCE.md",
    "MCP_GUIDE.md",
    "COMPLIANCE_GUIDE.md",
    "HOW_TO_GUIDES.md",
    "FEATURES.md",
    "ARCHITECTURE.md",
  ];

  for (const file of expectedFiles) {
    it(`${file} exists and has substantial content`, () => {
      const filePath = path.join(docsDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content.length).toBeGreaterThan(5000);
      // Should have a title
      expect(content).toMatch(/^# /m);
    });
  }
});
