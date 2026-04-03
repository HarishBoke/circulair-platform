import { describe, it, expect, vi } from "vitest";

// Mock storagePut to avoid real S3 calls
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.pdf", key: "test.pdf" }),
}));

// Test the PDF generator functions directly
describe("EPR PDF Generator", () => {
  it("generateEprComplianceReportPdf returns a Buffer", async () => {
    const { generateEprComplianceReportPdf } = await import("./pdfGenerator");
    const result = await generateEprComplianceReportPdf({
      jurisdiction: "india_cpcb",
      reportPeriod: { year: 2026, quarter: 1 },
      organization: {
        name: "Test Corp",
        registrationId: "EPR-2026-001",
        address: "123 Test St",
        contactEmail: "test@example.com",
      },
      batteries: [
        {
          bpan: "INTAT01BFKKIN5AABB0001",
          chemistry: "NMC",
          capacityKwh: "50",
          status: "operational",
          currentSoh: "92.5",
          manufacturer: "TAT",
          registeredAt: new Date("2025-06-15"),
        },
      ],
      eprTokens: [
        {
          tokenId: "EPR-TKN-001",
          bpan: "INTAT01BFKKIN5AABB0001",
          weightKg: 45.5,
          chemistry: "NMC",
          status: "verified",
          issuedAt: new Date("2026-01-10"),
        },
      ],
      yieldVerifications: [
        {
          bpan: "INTAT01BFKKIN5AABB0001",
          blackMassKg: 30.2,
          lithiumRecoveredKg: 2.1,
          cobaltRecoveredKg: 5.3,
          nickelRecoveredKg: 8.7,
          verifiedAt: new Date("2026-01-15"),
        },
      ],
      stats: {
        totalBatteries: 10,
        operationalCount: 7,
        secondLifeCount: 2,
        endOfLifeCount: 1,
        totalEprTokens: 5,
        totalWeightKg: 200,
        totalYieldKg: 150,
        complianceRate: 95.5,
      },
      generatedAt: new Date(),
      generatedBy: "Test User",
    });
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(100);
  });

  it("generateEprComplianceReportPdf handles EU jurisdiction", async () => {
    const { generateEprComplianceReportPdf } = await import("./pdfGenerator");
    const result = await generateEprComplianceReportPdf({
      jurisdiction: "eu_battery_reg",
      reportPeriod: { year: 2026, quarter: 2 },
      organization: { name: "EU Test GmbH" },
      batteries: [],
      eprTokens: [],
      yieldVerifications: [],
      stats: {
        totalBatteries: 0, operationalCount: 0, secondLifeCount: 0,
        endOfLifeCount: 0, totalEprTokens: 0, totalWeightKg: 0,
        totalYieldKg: 0, complianceRate: 100,
      },
      generatedAt: new Date(),
      generatedBy: "EU Admin",
    });
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(100);
  });

  it("generateEprComplianceReportPdf handles generic jurisdiction", async () => {
    const { generateEprComplianceReportPdf } = await import("./pdfGenerator");
    const result = await generateEprComplianceReportPdf({
      jurisdiction: "generic",
      reportPeriod: { year: 2025, quarter: 4 },
      organization: { name: "Global Recyclers" },
      batteries: [],
      eprTokens: [],
      yieldVerifications: [],
      stats: {
        totalBatteries: 0, operationalCount: 0, secondLifeCount: 0,
        endOfLifeCount: 0, totalEprTokens: 0, totalWeightKg: 0,
        totalYieldKg: 0, complianceRate: 100,
      },
      generatedAt: new Date(),
      generatedBy: "System",
    });
    expect(result).toBeInstanceOf(Buffer);
  });

  it("generateEprComplianceReportPdf handles many batteries and tokens", async () => {
    const { generateEprComplianceReportPdf } = await import("./pdfGenerator");
    const batteries = Array.from({ length: 25 }, (_, i) => ({
      bpan: `INTAT01BFKKIN5AABB${String(i).padStart(4, "0")}`,
      chemistry: i % 2 === 0 ? "NMC" : "LFP",
      capacityKwh: String(40 + i),
      status: i < 20 ? "operational" : "end_of_life",
      currentSoh: String(90 - i * 2),
      manufacturer: "TAT",
      registeredAt: new Date("2025-01-01"),
    }));
    const tokens = Array.from({ length: 10 }, (_, i) => ({
      tokenId: `EPR-TKN-${String(i).padStart(3, "0")}`,
      bpan: batteries[i]!.bpan,
      weightKg: 40 + i * 5,
      chemistry: batteries[i]!.chemistry,
      status: i < 8 ? "verified" : "pending",
      issuedAt: new Date("2026-02-01"),
    }));
    const result = await generateEprComplianceReportPdf({
      jurisdiction: "india_cpcb",
      reportPeriod: { year: 2026, quarter: 1 },
      organization: { name: "Large Corp" },
      batteries,
      eprTokens: tokens,
      yieldVerifications: [],
      stats: {
        totalBatteries: 25, operationalCount: 20, secondLifeCount: 3,
        endOfLifeCount: 2, totalEprTokens: 10, totalWeightKg: 500,
        totalYieldKg: 400, complianceRate: 80,
      },
      generatedAt: new Date(),
      generatedBy: "Admin",
    });
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(500);
  });

  it("generateBatteryComplianceCertPdf returns a Buffer", async () => {
    const { generateBatteryComplianceCertPdf } = await import("./pdfGenerator");
    const result = await generateBatteryComplianceCertPdf({
      battery: {
        bpan: "INTAT01BFKKIN5AABB0001",
        chemistry: "NMC",
        capacityKwh: "50",
        manufacturer: "TAT",
        model: "PowerCell 50",
        status: "operational",
        currentSoh: "92.5",
        registeredAt: new Date("2025-06-15"),
      },
      eprTokens: [
        {
          tokenId: "EPR-TKN-001",
          weightKg: 45.5,
          status: "verified",
          issuedAt: new Date("2026-01-10"),
        },
      ],
      serviceHistory: [
        {
          serviceType: "maintenance",
          description: "Routine cell balancing",
          performedAt: new Date("2025-12-01"),
          performedBy: "Tech Team",
        },
      ],
      complianceStatus: "compliant",
      generatedAt: new Date(),
      generatedBy: "Test User",
    });
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(100);
  });

  it("generateBatteryComplianceCertPdf handles non-compliant status", async () => {
    const { generateBatteryComplianceCertPdf } = await import("./pdfGenerator");
    const result = await generateBatteryComplianceCertPdf({
      battery: {
        bpan: "INTAT01BFKKIN5AABB0002",
        chemistry: "LFP",
        capacityKwh: "30",
        manufacturer: "BYD",
        model: null,
        status: "end_of_life",
        currentSoh: "45.0",
        registeredAt: new Date("2024-01-01"),
      },
      eprTokens: [],
      serviceHistory: [],
      complianceStatus: "non_compliant",
      generatedAt: new Date(),
      generatedBy: "Admin",
    });
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(100);
  });

  it("generateBatteryComplianceCertPdf handles pending status", async () => {
    const { generateBatteryComplianceCertPdf } = await import("./pdfGenerator");
    const result = await generateBatteryComplianceCertPdf({
      battery: {
        bpan: "INTAT01BFKKIN5AABB0003",
        chemistry: "NCA",
        capacityKwh: "75",
        manufacturer: "PANA",
        model: "NCR21700",
        status: "second_life",
        currentSoh: "68.0",
        registeredAt: new Date("2025-03-01"),
      },
      eprTokens: [
        { tokenId: "EPR-TKN-X", weightKg: 20, status: "pending", issuedAt: new Date() },
      ],
      serviceHistory: [
        { serviceType: "inspection", description: "Annual inspection", performedAt: new Date(), performedBy: "Inspector" },
        { serviceType: "repair", description: "Module replacement", performedAt: new Date(), performedBy: "Tech" },
      ],
      complianceStatus: "pending",
      generatedAt: new Date(),
      generatedBy: "System",
    });
    expect(result).toBeInstanceOf(Buffer);
  });

  it("generateBatteryComplianceCertPdf handles empty service history", async () => {
    const { generateBatteryComplianceCertPdf } = await import("./pdfGenerator");
    const result = await generateBatteryComplianceCertPdf({
      battery: {
        bpan: "INTAT01BFKKIN5AABB0004",
        chemistry: "LMO",
        capacityKwh: "10",
        manufacturer: "LG",
        model: null,
        status: "operational",
        currentSoh: "99.0",
        registeredAt: new Date(),
      },
      eprTokens: [],
      serviceHistory: [],
      complianceStatus: "pending",
      generatedAt: new Date(),
      generatedBy: "Auto",
    });
    expect(result).toBeInstanceOf(Buffer);
  });
});
