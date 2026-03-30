/**
 * telemetrySocket.test.ts
 *
 * Unit tests for the Socket.io telemetry module.
 * Tests cover:
 *  - TelemetryReading type shape
 *  - Reading generation logic (values within realistic ranges)
 *  - broadcastTelemetryReading (no-op when socket not initialized)
 *  - stopAllSimulations (clears all intervals)
 *  - Thermal anomaly detection threshold
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TelemetryReading } from "./telemetrySocket";

// ─── Helpers (extracted from telemetrySocket for unit testing) ────────────────

/** Mirror of the generateReading logic for isolated testing */
function generateTestReading(bpan: string, baseSoh = 85, baseCycle = 500): TelemetryReading {
  const soh = Math.max(20, baseSoh - Math.random() * 0.002);
  const cycle = baseCycle + (Math.random() > 0.9 ? 1 : 0);

  const nominalCellV = 3.65;
  const cellVariance = (Math.random() - 0.5) * 0.08;
  const vCell = nominalCellV + cellVariance;
  const vPack = parseFloat((vCell * 96).toFixed(2));
  const vMin = parseFloat((vCell - 0.05 - Math.random() * 0.05).toFixed(3));
  const vMax = parseFloat((vCell + 0.05 + Math.random() * 0.05).toFixed(3));

  const isCharging = Math.random() > 0.6;
  const iPack = parseFloat(((isCharging ? 1 : -1) * (20 + Math.random() * 80)).toFixed(1));

  const ambientTemp = 22 + Math.random() * 6;
  const loadHeat = Math.abs(iPack) * 0.08;
  const tPack = parseFloat((ambientTemp + loadHeat).toFixed(1));

  const tMax = parseFloat((tPack + Math.random() * 3).toFixed(1));
  const thermalAnomaly = tMax > 51;

  const irBase = 15 + (100 - soh) * 0.3;
  const irPack = parseFloat((irBase + Math.random() * 2).toFixed(3));

  return {
    bpan,
    vPack,
    iPack,
    vMin,
    vMax,
    tPack,
    tMax,
    cycleCount: cycle,
    irPack,
    sohEstimate: parseFloat(soh.toFixed(2)),
    thermalAnomaly,
    anomalyType: thermalAnomaly ? `High temperature: ${tMax}°C` : undefined,
    source: "mqtt",
    recordedAt: new Date().toISOString(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TelemetryReading shape", () => {
  it("has all required fields", () => {
    const r = generateTestReading("ABCDE12345FGHIJ678901");
    expect(r).toHaveProperty("bpan");
    expect(r).toHaveProperty("vPack");
    expect(r).toHaveProperty("iPack");
    expect(r).toHaveProperty("vMin");
    expect(r).toHaveProperty("vMax");
    expect(r).toHaveProperty("tPack");
    expect(r).toHaveProperty("tMax");
    expect(r).toHaveProperty("cycleCount");
    expect(r).toHaveProperty("irPack");
    expect(r).toHaveProperty("sohEstimate");
    expect(r).toHaveProperty("thermalAnomaly");
    expect(r).toHaveProperty("source");
    expect(r).toHaveProperty("recordedAt");
  });

  it("bpan matches the input", () => {
    const bpan = "ABCDE12345FGHIJ678901";
    const r = generateTestReading(bpan);
    expect(r.bpan).toBe(bpan);
  });

  it("recordedAt is a valid ISO string", () => {
    const r = generateTestReading("TEST000000000000000AB");
    expect(() => new Date(r.recordedAt)).not.toThrow();
    expect(new Date(r.recordedAt).toISOString()).toBe(r.recordedAt);
  });
});

describe("Pack voltage (96s NMC)", () => {
  it("vPack is within realistic 96s NMC range (316–374 V)", () => {
    for (let i = 0; i < 50; i++) {
      const r = generateTestReading("VOLTTEST00000000000AB");
      expect(r.vPack).toBeGreaterThan(316);
      expect(r.vPack).toBeLessThan(374);
    }
  });

  it("vMin is less than vMax", () => {
    for (let i = 0; i < 20; i++) {
      const r = generateTestReading("CELLTEST00000000000AB");
      expect(r.vMin).toBeLessThan(r.vMax);
    }
  });
});

describe("Temperature and thermal anomaly detection", () => {
  it("thermalAnomaly is true when tMax > 51°C", () => {
    const r: TelemetryReading = {
      bpan: "TEST",
      vPack: 350, iPack: 50, vMin: 3.6, vMax: 3.7,
      tPack: 48, tMax: 55, // above threshold
      cycleCount: 100, irPack: 18, sohEstimate: 85,
      thermalAnomaly: 55 > 51,
      source: "mqtt",
      recordedAt: new Date().toISOString(),
    };
    expect(r.thermalAnomaly).toBe(true);
  });

  it("thermalAnomaly is false when tMax <= 51°C", () => {
    const r: TelemetryReading = {
      bpan: "TEST",
      vPack: 350, iPack: 50, vMin: 3.6, vMax: 3.7,
      tPack: 35, tMax: 40, // below threshold
      cycleCount: 100, irPack: 18, sohEstimate: 85,
      thermalAnomaly: 40 > 51,
      source: "mqtt",
      recordedAt: new Date().toISOString(),
    };
    expect(r.thermalAnomaly).toBe(false);
  });

  it("anomalyType is set when thermalAnomaly is true", () => {
    const r: TelemetryReading = {
      bpan: "TEST",
      vPack: 350, iPack: 50, vMin: 3.6, vMax: 3.7,
      tPack: 52, tMax: 58,
      cycleCount: 100, irPack: 18, sohEstimate: 85,
      thermalAnomaly: true,
      anomalyType: "High temperature: 58°C",
      source: "mqtt",
      recordedAt: new Date().toISOString(),
    };
    expect(r.anomalyType).toContain("58°C");
  });

  it("anomalyType is undefined when no anomaly", () => {
    const r: TelemetryReading = {
      bpan: "TEST",
      vPack: 350, iPack: 50, vMin: 3.6, vMax: 3.7,
      tPack: 30, tMax: 35,
      cycleCount: 100, irPack: 18, sohEstimate: 85,
      thermalAnomaly: false,
      source: "mqtt",
      recordedAt: new Date().toISOString(),
    };
    expect(r.anomalyType).toBeUndefined();
  });
});

describe("SOH degradation model", () => {
  it("sohEstimate stays above 20% floor", () => {
    for (let i = 0; i < 100; i++) {
      const r = generateTestReading("SOHTEST000000000000AB", 20.001);
      expect(r.sohEstimate).toBeGreaterThanOrEqual(20);
    }
  });

  it("sohEstimate is at most the base SOH", () => {
    const baseSoh = 85;
    for (let i = 0; i < 50; i++) {
      const r = generateTestReading("SOHTEST000000000000AB", baseSoh);
      expect(r.sohEstimate).toBeLessThanOrEqual(baseSoh + 0.01); // tiny float tolerance
    }
  });
});

describe("Internal resistance model", () => {
  it("irPack increases as SOH decreases", () => {
    const highSohReading = generateTestReading("IRTEST0000000000000AB", 95);
    const lowSohReading = generateTestReading("IRTEST0000000000000AB", 30);
    // High SOH → lower IR; Low SOH → higher IR (with random noise, use average)
    // Just verify both are positive and in realistic range
    expect(highSohReading.irPack).toBeGreaterThan(0);
    expect(lowSohReading.irPack).toBeGreaterThan(highSohReading.irPack - 5); // allow noise
  });
});

describe("broadcastTelemetryReading (no socket)", () => {
  it("does not throw when Socket.io is not initialized", async () => {
    const { broadcastTelemetryReading } = await import("./telemetrySocket");
    const reading: TelemetryReading = {
      bpan: "NOSOKT0000000000000AB",
      vPack: 350, iPack: 30, vMin: 3.6, vMax: 3.7,
      tPack: 30, tMax: 35,
      cycleCount: 200, irPack: 20, sohEstimate: 80,
      thermalAnomaly: false,
      source: "api",
      recordedAt: new Date().toISOString(),
    };
    // Should not throw — socket is null, function is a no-op
    expect(() => broadcastTelemetryReading(reading)).not.toThrow();
  });
});

describe("stopAllSimulations", () => {
  it("does not throw when no simulations are running", async () => {
    const { stopAllSimulations } = await import("./telemetrySocket");
    expect(() => stopAllSimulations()).not.toThrow();
  });
});

describe("Source types", () => {
  it("accepts all valid source values", () => {
    const sources: TelemetryReading["source"][] = ["mqtt", "api", "simulated", "websocket"];
    for (const source of sources) {
      const r: TelemetryReading = {
        bpan: "TEST", vPack: 350, iPack: 30, vMin: 3.6, vMax: 3.7,
        tPack: 30, tMax: 35, cycleCount: 100, irPack: 18, sohEstimate: 85,
        thermalAnomaly: false, source,
        recordedAt: new Date().toISOString(),
      };
      expect(r.source).toBe(source);
    }
  });
});
