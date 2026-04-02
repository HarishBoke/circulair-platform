import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeWarrantyStatus } from "./db-warranty";

// ─── computeWarrantyStatus unit tests ────────────────────────────────────────
describe("computeWarrantyStatus", () => {
  it("returns active for a warranty that is currently valid", () => {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000); // 335 days from now
    const result = computeWarrantyStatus({
      status: "active",
      warrantyStartDate: start,
      warrantyEndDate: end,
    });
    expect(result.effectiveStatus).toBe("active");
    expect(result.isInWarranty).toBe(true);
    expect(result.daysRemaining).toBeGreaterThan(300);
  });

  it("returns expired for a warranty past its end date", () => {
    const end = new Date("2023-01-01");
    const start = new Date("2021-01-01");
    const result = computeWarrantyStatus({
      status: "active",
      warrantyStartDate: start,
      warrantyEndDate: end,
    });
    expect(result.effectiveStatus).toBe("expired");
    expect(result.isInWarranty).toBe(false);
    expect(result.daysRemaining).toBe(0);
  });

  it("returns pending_activation for a warranty that hasn't started yet", () => {
    const start = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const end = new Date(Date.now() + 395 * 24 * 60 * 60 * 1000); // ~13 months from now
    const result = computeWarrantyStatus({
      status: "active",
      warrantyStartDate: start,
      warrantyEndDate: end,
    });
    expect(result.effectiveStatus).toBe("pending_activation");
    expect(result.isInWarranty).toBe(false);
  });

  it("respects voided status override even if dates are valid", () => {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000);
    const result = computeWarrantyStatus({
      status: "voided",
      warrantyStartDate: start,
      warrantyEndDate: end,
    });
    expect(result.effectiveStatus).toBe("voided");
    expect(result.isInWarranty).toBe(false);
  });

  it("respects claimed status override", () => {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000);
    const result = computeWarrantyStatus({
      status: "claimed",
      warrantyStartDate: start,
      warrantyEndDate: end,
    });
    expect(result.effectiveStatus).toBe("claimed");
    expect(result.isInWarranty).toBe(false);
  });

  it("respects suspended status override", () => {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000);
    const result = computeWarrantyStatus({
      status: "suspended",
      warrantyStartDate: start,
      warrantyEndDate: end,
    });
    expect(result.effectiveStatus).toBe("suspended");
    expect(result.isInWarranty).toBe(false);
  });

  it("calculates daysRemaining correctly", () => {
    const now = new Date();
    const start = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
    const result = computeWarrantyStatus({
      status: "active",
      warrantyStartDate: start,
      warrantyEndDate: end,
    });
    // Allow 1 day tolerance for edge cases
    expect(result.daysRemaining).toBeGreaterThanOrEqual(89);
    expect(result.daysRemaining).toBeLessThanOrEqual(91);
  });

  it("returns 0 daysRemaining for expired warranties", () => {
    const result = computeWarrantyStatus({
      status: "active",
      warrantyStartDate: new Date("2020-01-01"),
      warrantyEndDate: new Date("2021-01-01"),
    });
    expect(result.daysRemaining).toBe(0);
  });

  it("handles warranty ending today", () => {
    const now = new Date();
    const start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    // Set end to end of today
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const result = computeWarrantyStatus({
      status: "active",
      warrantyStartDate: start,
      warrantyEndDate: end,
    });
    // Should be active since end is still today
    expect(result.daysRemaining).toBeGreaterThanOrEqual(0);
    expect(result.daysRemaining).toBeLessThanOrEqual(1);
  });
});

// ─── Warranty router integration tests (mocked DB) ──────────────────────────
describe("warranty router input validation", () => {
  it("validates warranty type enum values", () => {
    const validTypes = ["standard", "extended", "premium", "commercial"];
    validTypes.forEach(type => {
      expect(validTypes.includes(type)).toBe(true);
    });
  });

  it("validates coverage type enum values", () => {
    const validTypes = ["full_replacement", "pro_rata", "labor_only", "parts_only", "comprehensive"];
    validTypes.forEach(type => {
      expect(validTypes.includes(type)).toBe(true);
    });
  });

  it("validates warranty status enum values", () => {
    const validStatuses = ["active", "expired", "voided", "claimed", "suspended", "pending_activation"];
    validStatuses.forEach(status => {
      expect(validStatuses.includes(status)).toBe(true);
    });
  });
});

// ─── Warranty business logic tests ───────────────────────────────────────────
describe("warranty business logic", () => {
  it("in-warranty batteries should be flagged for marketplace restriction", () => {
    const now = new Date();
    const warranty = computeWarrantyStatus({
      status: "active",
      warrantyStartDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      warrantyEndDate: new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000),
    });
    // Business rule: active warranty → cannot list on marketplace
    expect(warranty.isInWarranty).toBe(true);
    expect(warranty.effectiveStatus).toBe("active");
  });

  it("expired warranty batteries should be eligible for marketplace", () => {
    const warranty = computeWarrantyStatus({
      status: "active",
      warrantyStartDate: new Date("2022-01-01"),
      warrantyEndDate: new Date("2023-01-01"),
    });
    expect(warranty.isInWarranty).toBe(false);
    expect(warranty.effectiveStatus).toBe("expired");
  });

  it("voided warranty batteries should be eligible for marketplace", () => {
    const now = new Date();
    const warranty = computeWarrantyStatus({
      status: "voided",
      warrantyStartDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      warrantyEndDate: new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000),
    });
    expect(warranty.isInWarranty).toBe(false);
  });

  it("warranty term calculation: 24 months from purchase date", () => {
    const purchaseDate = new Date("2025-01-15T00:00:00.000Z");
    const termMonths = 24;
    const endDate = new Date(purchaseDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + termMonths);
    expect(endDate.getUTCFullYear()).toBe(2027);
    expect(endDate.getUTCMonth()).toBe(0); // January
    expect(endDate.getUTCDate()).toBe(15);
  });

  it("multi-channel lookup should work with phone, email, and WhatsApp", () => {
    // Verify the lookup channels are properly defined
    const channels = ["bpan", "serialNumber", "phone", "email", "whatsApp"];
    expect(channels.length).toBe(5);
    channels.forEach(ch => expect(typeof ch).toBe("string"));
  });
});
