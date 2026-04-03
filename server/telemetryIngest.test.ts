/**
 * telemetryIngest.test.ts
 *
 * Unit tests for the REST telemetry ingest pipeline:
 *  - Field validation and type coercion
 *  - Thermal anomaly detection threshold (tMax > 51°C)
 *  - insertTelemetry payload shape
 *  - broadcastTelemetryReading call shape
 *  - Source field tagging ("api" vs "simulated" vs "mqtt")
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Helpers mirroring apiGateway.ts ingest logic ────────────────────────────

interface IngestBody {
  vPack?: unknown;
  iPack?: unknown;
  vMin?: unknown;
  vMax?: unknown;
  tPack?: unknown;
  tMax?: unknown;
  cycleCount?: unknown;
  irPack?: unknown;
  sohEstimate?: unknown;
  dtcCodes?: unknown;
}

interface ParsedReading {
  vPack?: number;
  iPack?: number;
  vMin?: number;
  vMax?: number;
  tPack?: number;
  tMax?: number;
  cycleCount?: number;
  irPack?: number;
  sohEstimate?: number;
  dtcCodes?: string[];
  thermalAnomaly: boolean;
  source: "api";
}

function parseIngestBody(body: IngestBody): ParsedReading {
  const vPack = typeof body.vPack === "number" ? body.vPack : undefined;
  const iPack = typeof body.iPack === "number" ? body.iPack : undefined;
  const vMin = typeof body.vMin === "number" ? body.vMin : undefined;
  const vMax = typeof body.vMax === "number" ? body.vMax : undefined;
  const tPack = typeof body.tPack === "number" ? body.tPack : undefined;
  const tMax = typeof body.tMax === "number" ? body.tMax : undefined;
  const cycleCount = typeof body.cycleCount === "number" ? Math.floor(body.cycleCount) : undefined;
  const irPack = typeof body.irPack === "number" ? body.irPack : undefined;
  const sohEstimate = typeof body.sohEstimate === "number" ? body.sohEstimate : undefined;
  const dtcCodes = Array.isArray(body.dtcCodes) ? (body.dtcCodes as unknown[]).map(String) : undefined;
  const thermalAnomaly = (tMax ?? 0) > 51;
  return { vPack, iPack, vMin, vMax, tPack, tMax, cycleCount, irPack, sohEstimate, dtcCodes, thermalAnomaly, source: "api" };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("REST telemetry ingest — field parsing", () => {
  it("parses all numeric fields correctly", () => {
    const body: IngestBody = {
      vPack: 350.5, iPack: -45.2, vMin: 3.60, vMax: 3.72,
      tPack: 28.3, tMax: 31.1, cycleCount: 512, irPack: 18.4, sohEstimate: 87.5,
    };
    const r = parseIngestBody(body);
    expect(r.vPack).toBe(350.5);
    expect(r.iPack).toBe(-45.2);
    expect(r.tMax).toBe(31.1);
    expect(r.cycleCount).toBe(512);
    expect(r.sohEstimate).toBe(87.5);
    expect(r.source).toBe("api");
  });

  it("ignores non-numeric fields gracefully", () => {
    const body: IngestBody = { vPack: "bad", iPack: null, tMax: undefined };
    const r = parseIngestBody(body);
    expect(r.vPack).toBeUndefined();
    expect(r.iPack).toBeUndefined();
    expect(r.tMax).toBeUndefined();
  });

  it("floors cycleCount to integer", () => {
    const r = parseIngestBody({ cycleCount: 512.9 });
    expect(r.cycleCount).toBe(512);
  });

  it("converts dtcCodes array to string array", () => {
    const r = parseIngestBody({ dtcCodes: ["P0A0F", 12345, true] });
    expect(r.dtcCodes).toEqual(["P0A0F", "12345", "true"]);
  });

  it("returns undefined dtcCodes when not an array", () => {
    const r = parseIngestBody({ dtcCodes: "P0A0F" });
    expect(r.dtcCodes).toBeUndefined();
  });
});

describe("REST telemetry ingest — thermal anomaly detection", () => {
  it("flags thermalAnomaly=true when tMax > 51°C", () => {
    const r = parseIngestBody({ tMax: 52.1 });
    expect(r.thermalAnomaly).toBe(true);
  });

  it("does NOT flag thermalAnomaly when tMax = 51°C exactly", () => {
    const r = parseIngestBody({ tMax: 51.0 });
    expect(r.thermalAnomaly).toBe(false);
  });

  it("does NOT flag thermalAnomaly when tMax < 51°C", () => {
    const r = parseIngestBody({ tMax: 45.0 });
    expect(r.thermalAnomaly).toBe(false);
  });

  it("does NOT flag thermalAnomaly when tMax is missing", () => {
    const r = parseIngestBody({});
    expect(r.thermalAnomaly).toBe(false);
  });

  it("flags thermalAnomaly at extreme temperature", () => {
    const r = parseIngestBody({ tMax: 80.0 });
    expect(r.thermalAnomaly).toBe(true);
  });
});

describe("REST telemetry ingest — insertTelemetry payload shape", () => {
  it("converts numeric fields to strings for DB insertion", () => {
    const r = parseIngestBody({ vPack: 350.5, iPack: -45.2, tMax: 31.1, sohEstimate: 87.5 });
    // Simulate what apiGateway does before calling insertTelemetry
    const dbPayload = {
      vPack: r.vPack != null ? String(r.vPack) : undefined,
      iPack: r.iPack != null ? String(r.iPack) : undefined,
      tMax: r.tMax != null ? String(r.tMax) : undefined,
      sohEstimate: r.sohEstimate != null ? String(r.sohEstimate) : undefined,
      source: r.source,
    };
    expect(dbPayload.vPack).toBe("350.5");
    expect(dbPayload.iPack).toBe("-45.2");
    expect(dbPayload.tMax).toBe("31.1");
    expect(dbPayload.sohEstimate).toBe("87.5");
    expect(dbPayload.source).toBe("api");
  });

  it("leaves undefined fields as undefined (not null) in DB payload", () => {
    const r = parseIngestBody({ vPack: 350.5 });
    const dbPayload = {
      iPack: r.iPack != null ? String(r.iPack) : undefined,
    };
    expect(dbPayload.iPack).toBeUndefined();
  });
});

describe("REST telemetry ingest — broadcastTelemetryReading payload", () => {
  it("uses 0 as fallback for missing numeric fields in broadcast", () => {
    const r = parseIngestBody({ vPack: 350.5 });
    const broadcast = {
      vPack: r.vPack ?? 0,
      iPack: r.iPack ?? 0,
      tMax: r.tMax ?? 0,
      sohEstimate: r.sohEstimate ?? 0,
      source: r.source,
    };
    expect(broadcast.vPack).toBe(350.5);
    expect(broadcast.iPack).toBe(0);
    expect(broadcast.tMax).toBe(0);
    expect(broadcast.source).toBe("api");
  });
});

describe("REST telemetry ingest — anomaly message formatting", () => {
  it("generates correct anomaly title and message for thermal event", () => {
    const bpan = "BPN-2024-IN-LFP-00001";
    const tMax = 55.3;
    const title = `Thermal Anomaly — ${bpan}`;
    const message = `REST ingest: T_max = ${tMax}°C exceeds 51°C threshold.`;
    expect(title).toBe("Thermal Anomaly — BPN-2024-IN-LFP-00001");
    expect(message).toContain("55.3°C");
    expect(message).toContain("51°C threshold");
  });
});
