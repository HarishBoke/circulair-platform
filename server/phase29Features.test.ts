/**
 * Phase 29 Tests — Carbon Badge, Multi-Currency Marketplace, i18n
 */
import { describe, it, expect } from "vitest";

// ─── Carbon Class Badge (shared calculator) ─────────────────────────────────
import { calculatePerformanceClass, CLASS_LABELS, CLASS_COLORS } from "../shared/carbonClass";

describe("Carbon class badge on registry list", () => {
  it("should return correct class label for each grade", () => {
    expect(CLASS_LABELS.A).toBeTruthy();
    expect(CLASS_LABELS.E).toBeTruthy();
    expect(typeof CLASS_LABELS.A).toBe("string");
  });

  it("should return color objects for each class", () => {
    expect(CLASS_COLORS.A).toBeDefined();
    expect(CLASS_COLORS.A.bg).toBeTruthy();
    expect(CLASS_COLORS.B.text).toBeTruthy();
    expect(CLASS_COLORS.E.border).toBeTruthy();
  });

  it("should calculate A class for very low carbon intensity", () => {
    // totalKgCo2e=5, capacityKwh=10 → 0.5 kg/kWh, well below A threshold
    expect(calculatePerformanceClass(5, 10, "NMC")).toBe("A");
    expect(calculatePerformanceClass(5, 10, "LFP")).toBe("A");
  });

  it("should calculate E class for very high carbon intensity", () => {
    // totalKgCo2e=2000, capacityKwh=10 → 200 kg/kWh, well above D threshold
    expect(calculatePerformanceClass(2000, 10, "NMC")).toBe("E");
    expect(calculatePerformanceClass(2000, 10, "LFP")).toBe("E");
  });

  it("should handle unknown chemistry with DEFAULT thresholds", () => {
    const result = calculatePerformanceClass(500, 10, "UNKNOWN_CHEM");
    expect(["A", "B", "C", "D", "E"]).toContain(result);
  });

  it("should handle very low intensity as class A", () => {
    // totalKgCo2e=10, capacityKwh=10 → 1 kg/kWh
    expect(calculatePerformanceClass(10, 10, "NMC")).toBe("A");
  });

  it("should return E for zero capacity", () => {
    expect(calculatePerformanceClass(100, 0, "NMC")).toBe("E");
  });
});

// ─── Multi-Currency (shared currency registry) ──────────────────────────────
import { CURRENCIES, type CurrencyMeta } from "../shared/currencies";

describe("Multi-currency marketplace support", () => {
  it("should have INR as a supported currency", () => {
    expect(CURRENCIES.INR).toBeDefined();
    expect(CURRENCIES.INR.code).toBe("INR");
    expect(CURRENCIES.INR.symbol).toBe("₹");
  });

  it("should have EUR as a supported currency", () => {
    expect(CURRENCIES.EUR).toBeDefined();
    expect(CURRENCIES.EUR.code).toBe("EUR");
    expect(CURRENCIES.EUR.symbol).toBe("€");
  });

  it("should have USD as a supported currency", () => {
    expect(CURRENCIES.USD).toBeDefined();
    expect(CURRENCIES.USD.code).toBe("USD");
    expect(CURRENCIES.USD.symbol).toBe("$");
  });

  it("should have at least 8 currencies for multinational support", () => {
    expect(Object.keys(CURRENCIES).length).toBeGreaterThanOrEqual(8);
  });

  it("each currency should have required fields", () => {
    for (const [code, meta] of Object.entries(CURRENCIES)) {
      const c = meta as CurrencyMeta;
      expect(c.code).toBe(code);
      expect(c.symbol).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.locale).toBeTruthy();
      expect(typeof c.decimals).toBe("number");
    }
  });

  it("should format INR correctly using Intl", () => {
    const inr = CURRENCIES.INR;
    const formatted = new Intl.NumberFormat(inr.locale, {
      style: "currency",
      currency: inr.code,
      maximumFractionDigits: inr.decimals,
    }).format(50000);
    expect(formatted).toContain("50");
  });

  it("should format EUR correctly using Intl", () => {
    const eur = CURRENCIES.EUR;
    const formatted = new Intl.NumberFormat(eur.locale, {
      style: "currency",
      currency: eur.code,
      maximumFractionDigits: eur.decimals,
    }).format(1234.56);
    expect(formatted).toContain("1");
  });

  it("should format JPY with zero decimals", () => {
    const jpy = CURRENCIES.JPY;
    expect(jpy.decimals).toBe(0);
    const formatted = new Intl.NumberFormat(jpy.locale, {
      style: "currency",
      currency: jpy.code,
      maximumFractionDigits: jpy.decimals,
    }).format(10000);
    expect(formatted).not.toContain(".");
  });
});

// ─── i18n Translation Files ─────────────────────────────────────────────────
import en from "../shared/i18n/en.json";
import de from "../shared/i18n/de.json";
import fr from "../shared/i18n/fr.json";
import zh from "../shared/i18n/zh.json";
import hi from "../shared/i18n/hi.json";

describe("i18n translation files", () => {
  const translations = { en, de, fr, zh, hi };

  it("should have all 5 language files", () => {
    expect(Object.keys(translations)).toHaveLength(5);
  });

  it("English should have common.save", () => {
    expect((en as any).common?.save).toBeTruthy();
  });

  it("all languages should have the same top-level keys as English", () => {
    const enKeys = Object.keys(en).sort();
    for (const [lang, data] of Object.entries(translations)) {
      if (lang === "en") continue;
      const langKeys = Object.keys(data).sort();
      expect(langKeys).toEqual(enKeys);
    }
  });

  it("all languages should have common.save defined", () => {
    for (const [, data] of Object.entries(translations)) {
      expect((data as any).common?.save).toBeTruthy();
    }
  });

  it("German translation should differ from English", () => {
    expect((de as any).common?.save).toBeTruthy();
    expect((de as any).common?.save).not.toBe((en as any).common?.save);
  });
});

// ─── Jurisdiction Registry ──────────────────────────────────────────────────
import { JURISDICTIONS } from "../shared/jurisdictions";

describe("Jurisdiction registry for multinational support", () => {
  it("should have EU jurisdiction", () => {
    expect(JURISDICTIONS.EU).toBeDefined();
    expect(JURISDICTIONS.EU.name).toContain("European");
  });

  it("should have India jurisdiction", () => {
    expect(JURISDICTIONS.IN).toBeDefined();
  });

  it("should have at least 5 jurisdictions", () => {
    expect(Object.keys(JURISDICTIONS).length).toBeGreaterThanOrEqual(5);
  });

  it("each jurisdiction should have required metadata", () => {
    for (const [code, j] of Object.entries(JURISDICTIONS)) {
      expect(j.code).toBe(code);
      expect(j.name).toBeTruthy();
      expect(j.continent).toBeTruthy();
    }
  });
});
