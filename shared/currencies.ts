/**
 * Currency Registry
 *
 * Single source of truth for every currency the platform supports.
 * To add a new currency: add one entry here — the rest of the system
 * (display formatting, exchange rate fetching, marketplace pricing) picks it up automatically.
 *
 * All monetary values in the database are stored in USD (base currency).
 * Display conversion happens at the presentation layer using live exchange rates.
 */

export interface CurrencyMeta {
  /** ISO 4217 currency code */
  code: string;
  /** Human-readable name */
  name: string;
  /** Unicode currency symbol */
  symbol: string;
  /** BCP 47 locale used for Intl.NumberFormat formatting */
  locale: string;
  /** Number of decimal places (0 for JPY/KRW/IDR, 2 for most others) */
  decimals: number;
  /** Whether the symbol appears before (true) or after (false) the amount */
  symbolBefore: boolean;
  /** Continent / region grouping for UI organisation */
  region: string;
}

export const CURRENCIES: Record<string, CurrencyMeta> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    locale: "en-US",
    decimals: 2,
    symbolBefore: true,
    region: "Americas",
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    locale: "de-DE",
    decimals: 2,
    symbolBefore: false,
    region: "Europe",
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    locale: "en-GB",
    decimals: 2,
    symbolBefore: true,
    region: "Europe",
  },
  INR: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    locale: "en-IN",
    decimals: 2,
    symbolBefore: true,
    region: "Asia",
  },
  CNY: {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    locale: "zh-CN",
    decimals: 2,
    symbolBefore: true,
    region: "Asia",
  },
  JPY: {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    locale: "ja-JP",
    decimals: 0,
    symbolBefore: true,
    region: "Asia",
  },
  KRW: {
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    locale: "ko-KR",
    decimals: 0,
    symbolBefore: true,
    region: "Asia",
  },
  IDR: {
    code: "IDR",
    name: "Indonesian Rupiah",
    symbol: "Rp",
    locale: "id-ID",
    decimals: 0,
    symbolBefore: true,
    region: "Asia",
  },
  THB: {
    code: "THB",
    name: "Thai Baht",
    symbol: "฿",
    locale: "th-TH",
    decimals: 2,
    symbolBefore: true,
    region: "Asia",
  },
  VND: {
    code: "VND",
    name: "Vietnamese Dong",
    symbol: "₫",
    locale: "vi-VN",
    decimals: 0,
    symbolBefore: false,
    region: "Asia",
  },
  AUD: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    locale: "en-AU",
    decimals: 2,
    symbolBefore: true,
    region: "Oceania",
  },
  SGD: {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    locale: "en-SG",
    decimals: 2,
    symbolBefore: true,
    region: "Asia",
  },
} as const;

/** The internal base currency — all DB monetary values are stored in this */
export const BASE_CURRENCY = "USD";

/** Returns all supported currency codes as an array */
export function getSupportedCurrencyCodes(): string[] {
  return Object.keys(CURRENCIES);
}

/** Returns the currency metadata for a given code, or throws if not found */
export function getCurrency(code: string): CurrencyMeta {
  const c = CURRENCIES[code.toUpperCase()];
  if (!c) throw new Error(`Unknown currency code: ${code}`);
  return c;
}

/**
 * Formats a monetary amount using the Intl.NumberFormat API.
 * Works in both Node.js (18+) and browser environments.
 *
 * @param amountInBaseCurrency - Amount in USD (base currency)
 * @param targetCurrency - ISO 4217 code of the display currency
 * @param exchangeRate - Rate to convert from USD to targetCurrency
 */
export function formatCurrency(
  amountInBaseCurrency: number,
  targetCurrency: string,
  exchangeRate: number
): string {
  const meta = getCurrency(targetCurrency);
  const converted = amountInBaseCurrency * exchangeRate;
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(converted);
}

/** Returns currencies grouped by region for UI selectors */
export function getCurrenciesByRegion(): Record<string, CurrencyMeta[]> {
  const grouped: Record<string, CurrencyMeta[]> = {};
  for (const c of Object.values(CURRENCIES)) {
    if (!grouped[c.region]) grouped[c.region] = [];
    grouped[c.region].push(c);
  }
  return grouped;
}
