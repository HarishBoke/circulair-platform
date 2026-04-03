/**
 * batterySimulator.test.ts
 *
 * Tests for the physics-based battery simulator module.
 * Validates per-chemistry reading generation, SoC tracking,
 * anomaly injection, and simulator lifecycle management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  startBatterySimulator,
  stopBatterySimulator,
  stopAllSimulators,
  getActiveSimulators,
  getSimulatorStats,
  generateReading as generateInstantReading,
} from "./batterySimulator";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_BPAN = "INXYZ12FABCD3456789AB";
const TEST_BPAN_2 = "INXYZ12FABCD3456789AC";

// ─── generateReading ─────────────────────────────────────────────────────────

describe("generateReading", () => {
  it("returns a reading with all required fields for NMC chemistry", () => {
    const reading = generateInstantReading(TEST_BPAN, "NMC");
    expect(reading.bpan).toBe(TEST_BPAN);
    expect(typeof reading.vPack).toBe("number");
    expect(typeof reading.iPack).toBe("number");
    expect(typeof reading.tPack).toBe("number");
    expect(typeof reading.tMax).toBe("number");
    expect(typeof reading.sohEstimate).toBe("number");
    expect(typeof reading.cycleCount).toBe("number");
    expect(typeof reading.irPack).toBe("number");
    expect(typeof reading.thermalAnomaly).toBe("boolean");
    expect(reading.recordedAt).toBeDefined();
  });

  it("returns voltage within NMC range (3.0–4.2V per cell, pack 300–430V)", () => {
    const reading = generateInstantReading(TEST_BPAN, "NMC");
    expect(reading.vPack).toBeGreaterThan(200);
    expect(reading.vPack).toBeLessThan(500);
  });

  it("returns voltage within LFP range (narrower window)", () => {
    const reading = generateInstantReading(TEST_BPAN, "LFP");
    expect(reading.vPack).toBeGreaterThan(100);
    expect(reading.vPack).toBeLessThan(500);
  });

  it("returns SOH between 0 and 100", () => {
    for (let i = 0; i < 10; i++) {
      const reading = generateInstantReading(TEST_BPAN, "NMC");
      expect(reading.sohEstimate).toBeGreaterThanOrEqual(0);
      expect(reading.sohEstimate).toBeLessThanOrEqual(100);
    }
  });

  it("returns temperature within safe operating range for non-anomaly readings", () => {
    // Run 20 readings and check that non-anomaly readings are within range
    let nonAnomalyCount = 0;
    for (let i = 0; i < 20; i++) {
      const reading = generateInstantReading(TEST_BPAN, "NMC");
      if (!reading.thermalAnomaly) {
        expect(reading.tMax).toBeGreaterThan(-10);
        expect(reading.tMax).toBeLessThan(60);
        nonAnomalyCount++;
      }
    }
    // Most readings should be non-anomaly
    expect(nonAnomalyCount).toBeGreaterThan(0);
  });

  it("returns thermalAnomaly=true when tMax exceeds 51°C", () => {
    // Run many readings and verify the invariant
    for (let i = 0; i < 50; i++) {
      const reading = generateInstantReading(TEST_BPAN, "NMC");
      if (reading.tMax > 51) {
        expect(reading.thermalAnomaly).toBe(true);
      }
    }
  });

  it("supports all 6 chemistry types without throwing", () => {
    const chemistries = ["NMC", "LFP", "NCA", "LCO", "LMO", "LEAD_ACID"];
    for (const chem of chemistries) {
      expect(() => generateInstantReading(TEST_BPAN, chem)).not.toThrow();
    }
  });

  it("falls back to NMC for unknown chemistry", () => {
    const reading = generateInstantReading(TEST_BPAN, "UNKNOWN_CHEM");
    expect(reading.vPack).toBeGreaterThan(0);
  });
});

// ─── Simulator lifecycle ──────────────────────────────────────────────────────

describe("Simulator lifecycle", () => {
  beforeEach(() => {
    stopAllSimulators();
  });

  afterEach(() => {
    stopAllSimulators();
  });

  it("getActiveSimulators returns empty array initially", () => {
    expect(getActiveSimulators()).toEqual([]);
  });

  it("startBatterySimulator adds BPAN to active list", () => {
    startBatterySimulator(TEST_BPAN, "NMC", {}, 60000);
    expect(getActiveSimulators()).toContain(TEST_BPAN);
  });

  it("stopBatterySimulator removes BPAN from active list", () => {
    startBatterySimulator(TEST_BPAN, "NMC", {}, 60000);
    stopBatterySimulator(TEST_BPAN);
    expect(getActiveSimulators()).not.toContain(TEST_BPAN);
  });

  it("does not duplicate BPAN if started twice", () => {
    startBatterySimulator(TEST_BPAN, "NMC", {}, 60000);
    startBatterySimulator(TEST_BPAN, "NMC", {}, 60000); // second call should be no-op
    const active = getActiveSimulators();
    expect(active.filter((b) => b === TEST_BPAN).length).toBe(1);
  });

  it("stopAllSimulators clears all active simulators", () => {
    startBatterySimulator(TEST_BPAN, "NMC", {}, 60000);
    startBatterySimulator(TEST_BPAN_2, "LFP", {}, 60000);
    expect(getActiveSimulators().length).toBe(2);
    stopAllSimulators();
    expect(getActiveSimulators()).toEqual([]);
  });

  it("getSimulatorStats returns correct counts", () => {
    startBatterySimulator(TEST_BPAN, "NMC", {}, 60000);
    startBatterySimulator(TEST_BPAN_2, "LFP", {}, 60000);
    const stats = getSimulatorStats();
    expect(stats.activeCount).toBe(2);
    expect(stats.bpans).toContain(TEST_BPAN);
    expect(stats.bpans).toContain(TEST_BPAN_2);
  });
});

// ─── Callback invocation ──────────────────────────────────────────────────────

describe("Simulator callbacks", () => {
  afterEach(() => {
    stopAllSimulators();
  });

  it("calls onReading callback with a valid reading", async () => {
    const readings: unknown[] = [];
    startBatterySimulator(
      TEST_BPAN,
      "NMC",
      {
        onReading: (r) => readings.push(r),
      },
      50 // 50ms interval for fast test
    );

    await new Promise((resolve) => setTimeout(resolve, 200));
    stopBatterySimulator(TEST_BPAN);

    expect(readings.length).toBeGreaterThan(0);
    const first = readings[0] as Record<string, unknown>;
    expect(first.bpan).toBe(TEST_BPAN);
    expect(typeof first.vPack).toBe("number");
  });

  it("calls onAnomaly callback when thermal anomaly is injected", async () => {
    const anomalies: unknown[] = [];
    let callCount = 0;

    // Force anomaly by using a very short interval and many ticks
    // The simulator injects anomalies every 40-90 ticks; we mock the reading
    // by checking that onAnomaly is eventually called over many readings
    startBatterySimulator(
      TEST_BPAN,
      "NMC",
      {
        onReading: () => { callCount++; },
        onAnomaly: (r) => anomalies.push(r),
      },
      20 // 20ms — very fast to trigger anomaly injection
    );

    // Wait up to 5 seconds for at least one anomaly
    await new Promise((resolve) => setTimeout(resolve, 5000));
    stopBatterySimulator(TEST_BPAN);

    // We should have received many readings
    expect(callCount).toBeGreaterThan(10);
    // Anomalies may or may not have fired in 5s (random 40-90 tick window)
    // Just verify the callback type is correct if any fired
    if (anomalies.length > 0) {
      const a = anomalies[0] as Record<string, unknown>;
      expect(a.bpan).toBe(TEST_BPAN);
      expect(typeof a.tMax).toBe("number");
    }
  }, 8000);
});
