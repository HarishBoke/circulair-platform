import { beforeEach, describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const page = {
    setDefaultTimeout: vi.fn(), setDefaultNavigationTimeout: vi.fn(),
    setJavaScriptEnabled: vi.fn().mockResolvedValue(undefined),
    setBypassServiceWorker: vi.fn().mockResolvedValue(undefined),
    setRequestInterception: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(), setContent: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 mock-pdf-content")),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const browser = { newPage: vi.fn().mockResolvedValue(page), close: vi.fn().mockResolvedValue(undefined) };
  return { page, browser, launch: vi.fn().mockResolvedValue(browser) };
});

// ─── Mock puppeteer-core so tests don't launch Chromium ───────────────────────
vi.mock("puppeteer-core", () => ({ default: { launch: mocks.launch } }));

beforeEach(() => vi.clearAllMocks());

// ─── Mock storage so we don't need S3 credentials ─────────────────────────────
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://cdn.example.com/test-passport.pdf",
    key: "test/test-passport.pdf",
  }),
}));

import {
  generateHealthPassportPdf,
  generateCpcbReportPdf,
  generateEprComplianceReportPdf,
  generateBatteryComplianceCertPdf,
  type HealthPassportData,
  type CpcbReportData,
} from "./pdfGenerator";
import { escapeDocumentText } from "./documentSecurity";

// ─── Sample test data ──────────────────────────────────────────────────────────
const sampleBattery: HealthPassportData["battery"] = {
  bpan: "INMH1C3KL1A5B0001",
  chemistry: "NMC",
  capacityKwh: "75.00",
  voltageV: "400",
  cellOriginCountry: "South Korea",
  manufacturerId: "MH1",
  mfgYear: 2024,
  mfgMonth: 3,
  mfgDay: 15,
  status: "operational",
  currentSoh: "87.50",
  recyclabilityPct: "92.00",
  lithiumPct: "5.80",
  cobaltPct: "12.00",
  nickelPct: "33.00",
  manganesePct: "0.00",
  carbonFootprintKgCo2: "8500.00",
  vehicleId: "MH12AB1234",
  countryCode: "IN",
  cycleCount: 850,
  disassemblyMethod: null,
  lastServiceDate: null,
};

const samplePrediction: NonNullable<HealthPassportData["latestPrediction"]> = {
  sohEstimate: "87.50",
  rulDays: 450,
  triageDecision: "direct_reuse",
  confidence: "94.20",
  predictedAt: new Date("2024-03-15"),
};

const sampleTelemetry: NonNullable<HealthPassportData["latestTelemetry"]> = {
  voltageV: "398.50",
  currentA: "45.20",
  temperatureC: "38.50",
  internalResistanceOhm: "1.25",
  recordedAt: new Date("2024-03-15"),
};

const sampleServiceHistory: HealthPassportData["serviceHistory"] = [
  {
    servicedAt: new Date("2024-02-10"),
    serviceType: "inspection",
    technicianName: "Rajesh Kumar",
    sohBefore: "89.00",
    sohAfter: "87.50",
    notes: "Routine inspection — all cells within spec",
  },
];

// ─── Health Passport PDF Tests ─────────────────────────────────────────────────
describe("generateHealthPassportPdf", () => {
  it("returns a Buffer", async () => {
    const result = await generateHealthPassportPdf({
      battery: sampleBattery,
      latestPrediction: samplePrediction,
      latestTelemetry: sampleTelemetry,
      serviceHistory: sampleServiceHistory,
      generatedAt: new Date(),
      generatedBy: "Test User",
    } as any);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a buffer starting with PDF magic bytes", async () => {
    const result = await generateHealthPassportPdf({
      battery: sampleBattery,
      latestPrediction: samplePrediction,
      latestTelemetry: sampleTelemetry,
      serviceHistory: [],
      generatedAt: new Date(),
      generatedBy: "Test User",
    } as any);
    expect(result.toString().startsWith("%PDF")).toBe(true);
  });

  it("works without optional telemetry and prediction", async () => {
    const result = await generateHealthPassportPdf({
      battery: sampleBattery,
      latestPrediction: null,
      latestTelemetry: null,
      serviceHistory: [],
      generatedAt: new Date(),
      generatedBy: "System",
    } as any);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("works with empty service history", async () => {
    const result = await generateHealthPassportPdf({
      battery: sampleBattery,
      latestPrediction: samplePrediction,
      latestTelemetry: sampleTelemetry,
      serviceHistory: [],
      generatedAt: new Date(),
      generatedBy: "System",
    } as any);
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});

// ─── CPCB Report PDF Tests ─────────────────────────────────────────────────────
describe("generateCpcbReportPdf", () => {
  const sampleCpcbData: CpcbReportData = {
    reportPeriod: { year: 2024, month: 3 },
    organization: { name: "Test Recycler Pvt Ltd" },
    generatedAt: new Date("2024-03-31"),
    generatedBy: "Test System",
    eprTokens: [
      {
        tokenId: "EPR-2024-001",
        bpan: "INMH1C3KL1A5B0001",
        weightKg: "850.00",
        chemistry: null,
        status: "verified",
        issuedAt: new Date("2024-03-01"),
      },
    ] as any,
    yieldVerifications: [
      {
        bpan: "INMH1C3KL1A5B0001",
        blackMassKg: "820.00",
        lithiumRecoveredKg: "45.00",
        cobaltRecoveredKg: "98.00",
        nickelRecoveredKg: "270.00",
        verifiedAt: new Date("2024-03-01"),
      },
    ] as any,
    stats: {
      totalBatteries: 40,
      operationalCount: 22,
      secondLifeCount: 10,
      endOfLifeCount: 8,
      totalEprTokens: 22,
      totalWeightKg: 12000,
      totalYieldKg: 15000,
    },
  };

  it("returns a Buffer", async () => {
    const result = await generateCpcbReportPdf(sampleCpcbData);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a buffer starting with PDF magic bytes", async () => {
    const result = await generateCpcbReportPdf(sampleCpcbData);
    expect(result.toString().startsWith("%PDF")).toBe(true);
  });

  it("works with empty EPR token list", async () => {
    const result = await generateCpcbReportPdf({
      ...sampleCpcbData,
      eprTokens: [],
      yieldVerifications: [],
      stats: {
        totalBatteries: 0,
        operationalCount: 0,
        secondLifeCount: 0,
        endOfLifeCount: 0,
        totalEprTokens: 0,
        totalWeightKg: 0,
        totalYieldKg: 0,
      },
    });
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("handles multiple EPR tokens", async () => {
    const result = await generateCpcbReportPdf({
      ...sampleCpcbData,
      eprTokens: [
        { tokenId: "EPR-001", bpan: "BPAN001", weightKg: "100", chemistry: null, status: "verified", issuedAt: new Date() },
        { tokenId: "EPR-002", bpan: "BPAN002", weightKg: "200", chemistry: null, status: "pending", issuedAt: new Date() },
        { tokenId: "EPR-003", bpan: "BPAN003", weightKg: "150", chemistry: null, status: "verified", issuedAt: new Date() },
      ] as any,
      generatedAt: new Date(),
      generatedBy: "Test",
    });
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});

// ─── Interface validation tests ────────────────────────────────────────────────
describe("HealthPassportData interface", () => {
  it("accepts all required fields", () => {
    const data: HealthPassportData = {
      battery: sampleBattery,
      latestTelemetry: sampleTelemetry,
      latestPrediction: samplePrediction,
      serviceHistory: sampleServiceHistory,
      generatedAt: new Date(),
      generatedBy: "Test",
    };
    expect(data.battery.bpan).toBe("INMH1C3KL1A5B0001");
    expect(data.battery.chemistry).toBe("NMC");
    expect(data.latestPrediction?.sohEstimate).toBe("87.50");
  });

  it("accepts optional fields as undefined", () => {
    const data: HealthPassportData = {
      battery: sampleBattery,
      generatedAt: new Date(),
      generatedBy: "System",
    };
    expect(data.latestTelemetry).toBeUndefined();
    expect(data.latestPrediction).toBeUndefined();
    expect(data.serviceHistory).toBeUndefined();
  });
});

describe("CpcbReportData interface", () => {
  it("accepts all required fields", () => {
    const data: CpcbReportData = {
      reportPeriod: { year: 2024, month: 3 },
      organization: { name: "Test Org" },
      eprTokens: [] as any,
      yieldVerifications: [] as any,
      generatedAt: new Date(),
      generatedBy: "System",
      stats: {
        totalBatteries: 0,
        operationalCount: 0,
        secondLifeCount: 0,
        endOfLifeCount: 0,
        totalEprTokens: 0,
        totalWeightKg: 0,
        totalYieldKg: 0,
      },
    };
    expect(data.reportPeriod.year).toBe(2024);
    expect(data.organization.name).toBe("Test Org");
  });
});

const attack = `<img src="https://invalid.example/resource" onerror='alert(1)'><script>unsafe()</script>&`;
function renderedHtml(): string { return mocks.page.setContent.mock.calls[0][0] as string; }
function expectEscapedOutput() {
  expect(renderedHtml()).toContain(escapeDocumentText(attack));
  expect(renderedHtml()).not.toContain(attack);
  expect(renderedHtml()).not.toContain("<script>");
  expect(renderedHtml()).not.toContain("<img ");
  expect(renderedHtml()).not.toContain("@import");
  expect(renderedHtml()).not.toContain("fonts.googleapis.com");
  expect(renderedHtml()).toContain("REVIEW REQUIRED");
  expect(renderedHtml()).not.toContain("blockchain-verified");
  expect(renderedHtml()).not.toContain("OFFICIAL DOCUMENT");
}

describe("PDF security policy — mocked renderer and storage only", () => {
  it("escapes battery identity, user name, triage, and service notes including nested fragments", async () => {
    await generateHealthPassportPdf({
      battery: { ...sampleBattery, bpan: attack, chemistry: attack, manufacturerId: attack, vehicleId: attack, disassemblyMethod: attack, countryCode: attack, cellOriginCountry: attack, status: attack },
      latestPrediction: { ...samplePrediction, triageDecision: attack },
      serviceHistory: [{ ...sampleServiceHistory![0], notes: attack, technicianName: attack, serviceType: attack }],
      generatedBy: attack, generatedAt: new Date("2026-11-18"),
    });
    expectEscapedOutput();
    expect(renderedHtml()).toContain("<tbody>");
    expect(renderedHtml()).toContain("<td>&lt;img");
    expect(renderedHtml()).not.toContain("&lt;td&gt;");
  });

  it("escapes CPCB organization/identifiers and ledger values; does not certify zero evidence", async () => {
    await generateCpcbReportPdf({
      reportPeriod: { year: 2026, month: 11 },
      organization: { name: attack, gstin: attack, cpcbId: attack },
      generatedBy: attack, generatedAt: new Date("2026-11-18"),
      eprTokens: [{ tokenId: attack, bpan: attack, chemistry: attack, weightKg: 1, status: attack, issuedAt: new Date() }],
      yieldVerifications: [{ bpan: attack, blackMassKg: 1, lithiumRecoveredKg: null, cobaltRecoveredKg: null, nickelRecoveredKg: null, verifiedAt: new Date() }],
      stats: { totalBatteries: 0, operationalCount: 0, secondLifeCount: 0, endOfLifeCount: 0, totalEprTokens: 0, totalWeightKg: 0, totalYieldKg: 0 },
    });
    expectEscapedOutput();
    expect(renderedHtml()).not.toContain("obligations for");
    expect(renderedHtml()).toContain("Unsigned draft");
  });

  it("escapes EPR organization/contact, chemistry grouping, inventory and token data", async () => {
    await generateEprComplianceReportPdf({
      jurisdiction: "generic", reportPeriod: { year: 2026, quarter: 4 },
      organization: { name: attack, registrationId: attack, address: attack, contactEmail: attack },
      generatedBy: attack, generatedAt: new Date("2026-11-18"),
      batteries: [{ bpan: attack, chemistry: attack, capacityKwh: 1, status: attack, currentSoh: 90, manufacturer: attack, registeredAt: new Date() }],
      eprTokens: [{ tokenId: attack, bpan: attack, chemistry: attack, weightKg: 1, status: attack, issuedAt: new Date() }],
      yieldVerifications: [{ bpan: attack, blackMassKg: 1, lithiumRecoveredKg: null, cobaltRecoveredKg: null, nickelRecoveredKg: null, verifiedAt: new Date() }],
      stats: { totalBatteries: 0, operationalCount: 0, secondLifeCount: 0, endOfLifeCount: 0, totalEprTokens: 0, totalWeightKg: 0, totalYieldKg: 0, complianceRate: 100 },
    });
    expectEscapedOutput();
    expect(renderedHtml()).not.toContain('class="compliance-rate">100%');
    expect(renderedHtml()).toContain('class="compliance-rate">Not evaluated');
    expect(renderedHtml()).toContain("Legal compliance: not evaluated");
  });

  it("escapes certificate model/manufacturer, service descriptions and performed-by subfragments", async () => {
    await generateBatteryComplianceCertPdf({
      battery: { bpan: attack, chemistry: attack, capacityKwh: 1, status: attack, currentSoh: 90, manufacturer: attack, model: attack, registeredAt: new Date() },
      generatedBy: attack, generatedAt: new Date("2026-11-18"), complianceStatus: "compliant",
      eprTokens: [{ tokenId: attack, weightKg: 1, status: attack, issuedAt: new Date() }],
      serviceHistory: [{ serviceType: attack, description: attack, performedBy: attack, performedAt: new Date() }],
    });
    expectEscapedOutput();
    expect(renderedHtml()).not.toContain("CERTIFIED");
    expect(renderedHtml()).toContain("REVIEW REQUIRED — UNSIGNED");
  });

  it("disables scripts before content, denies every request, bounds operations, and retains sandbox", async () => {
    await generateHealthPassportPdf({ battery: sampleBattery, generatedBy: "Offline Test", generatedAt: new Date() });
    expect(mocks.page.setJavaScriptEnabled).toHaveBeenCalledWith(false);
    expect(mocks.page.setRequestInterception).toHaveBeenCalledWith(true);
    expect(mocks.page.setBypassServiceWorker).toHaveBeenCalledWith(true);
    expect(mocks.page.setJavaScriptEnabled.mock.invocationCallOrder[0]).toBeLessThan(mocks.page.setContent.mock.invocationCallOrder[0]);
    expect(mocks.page.on.mock.invocationCallOrder[0]).toBeLessThan(mocks.page.setContent.mock.invocationCallOrder[0]);
    const requestHandler = mocks.page.on.mock.calls.find(([event]) => event === "request")![1];
    const abort = vi.fn().mockResolvedValue(undefined);
    requestHandler({ abort });
    expect(abort).toHaveBeenCalledWith("blockedbyclient");
    const options = mocks.launch.mock.calls[0][0] as { args: string[]; timeout: number; protocolTimeout: number; userDataDir: string };
    expect(options.args).not.toContain("--no-sandbox");
    expect(options.args).not.toContain("--disable-setuid-sandbox");
    expect(options.timeout).toBe(10_000);
    expect(options.protocolTimeout).toBe(10_000);
    expect(renderedHtml()).toContain("Content-Security-Policy");
    expect(renderedHtml()).toContain("default-src 'none'");
    expect(mocks.page.close).toHaveBeenCalledOnce();
    expect(mocks.browser.close).toHaveBeenCalledOnce();
  });
});
