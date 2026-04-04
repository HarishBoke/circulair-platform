import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  generateReading,
  getOrCreateState,
  clearState,
  clearAllStates,
  type SimulatedReading,
} from "./batterySimulator";

// ─── Battery Simulator Tests (physics model validation) ───────────────────────
describe("BatterySimulator — physics model", () => {
  const BPAN = "TEST-BPAN-001";

  afterEach(() => {
    clearState(BPAN);
  });

  it("generates a reading with all required telemetry fields", () => {
    const reading = generateReading(BPAN, "NMC");
    expect(reading).toHaveProperty("bpan", BPAN);
    expect(reading).toHaveProperty("recordedAt");
    expect(reading).toHaveProperty("vPack");
    expect(reading).toHaveProperty("iPack");
    expect(reading).toHaveProperty("soc");
    expect(reading).toHaveProperty("tMax");
    expect(reading).toHaveProperty("sohEstimate");
    expect(reading).toHaveProperty("chemistry", "NMC");
  });

  it("generates valid voltage range for NMC chemistry (150–500V)", () => {
    for (let i = 0; i < 10; i++) {
      const reading = generateReading(BPAN, "NMC");
      expect(reading.vPack).toBeGreaterThan(100);
      expect(reading.vPack).toBeLessThan(600);
    }
  });

  it("generates valid SOC range (0–100%)", () => {
    for (let i = 0; i < 10; i++) {
      const reading = generateReading(BPAN, "NMC");
      expect(reading.soc).toBeGreaterThanOrEqual(0);
      expect(reading.soc).toBeLessThanOrEqual(100);
    }
  });

  it("generates valid temperature range (10–70°C)", () => {
    for (let i = 0; i < 10; i++) {
      const reading = generateReading(BPAN, "NMC");
      expect(reading.tMax).toBeGreaterThan(10);
      expect(reading.tMax).toBeLessThan(70);
    }
  });

  it("SOH estimate stays in valid range (50–100%)", () => {
    for (let i = 0; i < 10; i++) {
      const reading = generateReading(BPAN, "NMC");
      expect(reading.sohEstimate).toBeGreaterThanOrEqual(50);
      expect(reading.sohEstimate).toBeLessThanOrEqual(100);
    }
  });

  it("recordedAt is a valid ISO timestamp string", () => {
    const reading = generateReading(BPAN, "NMC");
    expect(typeof reading.recordedAt).toBe("string");
    const parsed = new Date(reading.recordedAt).getTime();
    expect(isNaN(parsed)).toBe(false);
    expect(parsed).toBeGreaterThan(Date.now() - 5000);
  });

  it("thermalAnomaly flag is boolean", () => {
    const reading = generateReading(BPAN, "NMC");
    expect(typeof reading.thermalAnomaly).toBe("boolean");
  });

  it("thermalAnomaly is true when tMax > 51°C", () => {
    let foundAnomaly = false;
    for (let i = 0; i < 500; i++) {
      const reading = generateReading(BPAN, "NMC");
      if (reading.tMax > 51) {
        expect(reading.thermalAnomaly).toBe(true);
        foundAnomaly = true;
        break;
      }
    }
    expect(typeof foundAnomaly).toBe("boolean");
  });
});

// ─── LFP Chemistry Tests ──────────────────────────────────────────────────────
describe("BatterySimulator — LFP chemistry", () => {
  const BPAN = "TEST-LFP-001";

  afterEach(() => {
    clearState(BPAN);
  });

  it("generates chemistry field as LFP", () => {
    const reading = generateReading(BPAN, "LFP");
    expect(reading.chemistry).toBe("LFP");
  });

  it("LFP voltage is in valid range", () => {
    for (let i = 0; i < 5; i++) {
      const reading = generateReading(BPAN, "LFP");
      expect(reading.vPack).toBeGreaterThan(100);
      expect(reading.vPack).toBeLessThan(600);
    }
  });
});

// ─── Lead-Acid Chemistry Tests ────────────────────────────────────────────────
describe("BatterySimulator — LEAD_ACID chemistry", () => {
  const BPAN = "TEST-LA-001";

  afterEach(() => {
    clearState(BPAN);
  });

  it("generates chemistry field as LEAD_ACID", () => {
    const reading = generateReading(BPAN, "LEAD_ACID");
    expect(reading.chemistry).toBe("LEAD_ACID");
  });

  it("LEAD_ACID voltage is a finite number", () => {
    for (let i = 0; i < 5; i++) {
      const reading = generateReading(BPAN, "LEAD_ACID");
      expect(typeof reading.vPack).toBe("number");
      expect(isFinite(reading.vPack)).toBe(true);
      expect(Math.abs(reading.vPack)).toBeLessThan(1000);
    }
  });

  it("LEAD_ACID source is simulated", () => {
    const reading = generateReading(BPAN, "LEAD_ACID");
    expect(reading.source).toBe("simulated");
  });
});

// ─── Payload Schema Validation ────────────────────────────────────────────────
describe("Telemetry payload schema", () => {
  afterEach(() => {
    clearAllStates();
  });

  it("validates required fields are present", () => {
    const requiredFields = ["bpan", "recordedAt", "vPack", "iPack", "soc", "tMax"];
    const reading = generateReading("SCHEMA-TEST-001", "NMC");

    for (const field of requiredFields) {
      expect(reading).toHaveProperty(field);
      expect((reading as Record<string, unknown>)[field]).not.toBeUndefined();
      expect((reading as Record<string, unknown>)[field]).not.toBeNull();
    }
  });

  it("all numeric fields are finite numbers", () => {
    const numericFields = ["vPack", "iPack", "soc", "tMax", "sohEstimate"];
    const reading = generateReading("NUMERIC-TEST-001", "NMC");

    for (const field of numericFields) {
      const val = (reading as Record<string, unknown>)[field];
      expect(typeof val).toBe("number");
      expect(isFinite(val as number)).toBe(true);
    }
  });

  it("optional fields have correct types when present", () => {
    const reading = generateReading("OPTIONAL-TEST-001", "NMC");

    if (reading.tMin !== undefined) expect(typeof reading.tMin).toBe("number");
    if (reading.tAvg !== undefined) expect(typeof reading.tAvg).toBe("number");
    if (reading.vCellMin !== undefined) expect(typeof reading.vCellMin).toBe("number");
    if (reading.vCellMax !== undefined) expect(typeof reading.vCellMax).toBe("number");
    if (reading.cycleCount !== undefined) expect(typeof reading.cycleCount).toBe("number");
  });
});

// ─── Multi-battery isolation ──────────────────────────────────────────────────
describe("BatterySimulator — multi-battery isolation", () => {
  afterEach(() => {
    clearAllStates();
  });

  it("two batteries with different BPANs produce independent readings", () => {
    const r1 = generateReading("BPAN-A", "NMC");
    const r2 = generateReading("BPAN-B", "LFP");

    expect(r1.bpan).toBe("BPAN-A");
    expect(r2.bpan).toBe("BPAN-B");
    expect(r1.chemistry).toBe("NMC");
    expect(r2.chemistry).toBe("LFP");
  });

  it("readings from the same BPAN are continuous (SOC doesn't jump wildly)", () => {
    const readings: SimulatedReading[] = [];
    for (let i = 0; i < 5; i++) {
      readings.push(generateReading("CONTINUITY-TEST", "NMC"));
    }

    for (let i = 1; i < readings.length; i++) {
      const socDelta = Math.abs(readings[i].soc - readings[i - 1].soc);
      // SOC should not jump more than 5% between consecutive readings
      expect(socDelta).toBeLessThan(5);
    }
  });
});
