/**
 * Jurisdiction Registry
 *
 * This is the single source of truth for every regulatory framework the platform supports.
 * To add a new country or continent: add one entry to JURISDICTIONS and implement the
 * corresponding adapter in server/regulatory/{code}.adapter.ts — no other files need changing.
 *
 * Design principles:
 *  - Each jurisdiction is identified by a short ISO-style code (e.g. "EU", "IN", "CN")
 *  - Metadata drives UI rendering (labels, flags, compliance deadlines)
 *  - `passportIdPrefix` defines the URL namespace for public passport pages
 *  - `idFieldName` is the human-readable name for the battery ID in that jurisdiction
 *  - `mandatoryFrom` is null if the regulation is not yet mandatory
 *  - `dataResidencyRegion` maps to a database region for data isolation
 */

export type DataResidencyRegion = "in" | "eu" | "cn" | "us" | "global";

export interface JurisdictionMeta {
  /** Short ISO-style code used as the primary key throughout the system */
  code: string;
  /** Human-readable name shown in the UI */
  name: string;
  /** Continent grouping for UI organisation */
  continent: "Asia" | "Europe" | "Americas" | "Oceania" | "Africa";
  /** ISO 3166-1 alpha-2 country code(s) covered (array for multi-country like EU) */
  countryCodes: string[];
  /** Default currency for this jurisdiction */
  defaultCurrency: string;
  /** Default locale (BCP 47) */
  defaultLocale: string;
  /** URL prefix for public passport pages: /passport/{passportIdPrefix}/{id} */
  passportIdPrefix: string;
  /** Human-readable name for the battery ID in this jurisdiction */
  idFieldName: string;
  /** Short description of the regulatory framework */
  regulationName: string;
  /** Link to the official regulation text */
  regulationUrl: string;
  /** Date from which the battery passport / digital ID is mandatory (null = not yet mandatory) */
  mandatoryFrom: string | null;
  /** Whether this jurisdiction requires a public-facing battery passport page */
  requiresPublicPassport: boolean;
  /** Whether this jurisdiction requires outbound sync to a government platform */
  requiresGovSync: boolean;
  /** Data residency region for user personal data */
  dataResidencyRegion: DataResidencyRegion;
  /** Whether this jurisdiction is currently active/enabled on the platform */
  enabled: boolean;
}

export const JURISDICTIONS: Record<string, JurisdictionMeta> = {
  EU: {
    code: "EU",
    name: "European Union",
    continent: "Europe",
    countryCodes: [
      "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU",
      "IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
    ],
    defaultCurrency: "EUR",
    defaultLocale: "en-EU",
    passportIdPrefix: "eu",
    idFieldName: "EU Battery Passport ID",
    regulationName: "EU Battery Regulation 2023/1542",
    regulationUrl: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1542",
    mandatoryFrom: "2027-02-18",
    requiresPublicPassport: true,
    requiresGovSync: false,
    dataResidencyRegion: "eu",
    enabled: true,
  },

  IN: {
    code: "IN",
    name: "India",
    continent: "Asia",
    countryCodes: ["IN"],
    defaultCurrency: "INR",
    defaultLocale: "en-IN",
    passportIdPrefix: "in",
    idFieldName: "Battery Pack Aadhaar Number (BPAN)",
    regulationName: "Battery Pack Aadhaar (BPAN) System",
    regulationUrl: "https://psa.gov.in/CMS/web/sites/default/files/publication/Battery%20Pack%20Aadhaar%20Guideline.pdf",
    mandatoryFrom: null, // Draft as of 2026 — update when notified
    requiresPublicPassport: false,
    requiresGovSync: true, // Will sync to PSA portal when live
    dataResidencyRegion: "in",
    enabled: true,
  },

  CN: {
    code: "CN",
    name: "China",
    continent: "Asia",
    countryCodes: ["CN"],
    defaultCurrency: "CNY",
    defaultLocale: "zh-CN",
    passportIdPrefix: "cn",
    idFieldName: "NEV Battery Digital ID (MIIT)",
    regulationName: "China NEV Battery Traceability (MIIT)",
    regulationUrl: "https://www.miit.gov.cn/",
    mandatoryFrom: "2026-04-01",
    requiresPublicPassport: false,
    requiresGovSync: true, // Mandatory outbound sync to MIIT national platform
    dataResidencyRegion: "cn",
    enabled: true,
  },

  US: {
    code: "US",
    name: "United States",
    continent: "Americas",
    countryCodes: ["US"],
    defaultCurrency: "USD",
    defaultLocale: "en-US",
    passportIdPrefix: "us",
    idFieldName: "Battery Serial Number",
    regulationName: "US Inflation Reduction Act (IRA) — Supply Chain Documentation",
    regulationUrl: "https://www.irs.gov/inflation-reduction-act-of-2022",
    mandatoryFrom: "2022-08-16", // IRA enacted; documentation requirements active
    requiresPublicPassport: false,
    requiresGovSync: false,
    dataResidencyRegion: "us",
    enabled: true,
  },

  GB: {
    code: "GB",
    name: "United Kingdom",
    continent: "Europe",
    countryCodes: ["GB"],
    defaultCurrency: "GBP",
    defaultLocale: "en-GB",
    passportIdPrefix: "gb",
    idFieldName: "UK Battery ID",
    regulationName: "UK Battery Regulation (post-Brexit, UKCA)",
    regulationUrl: "https://www.legislation.gov.uk/",
    mandatoryFrom: null, // In development — broadly follows EU framework
    requiresPublicPassport: false,
    requiresGovSync: false,
    dataResidencyRegion: "eu", // UK-EU adequacy in place; EU region sufficient
    enabled: true,
  },

  TH: {
    code: "TH",
    name: "Thailand",
    continent: "Asia",
    countryCodes: ["TH"],
    defaultCurrency: "THB",
    defaultLocale: "th-TH",
    passportIdPrefix: "th",
    idFieldName: "TISI Certificate Number",
    regulationName: "Thailand TISI Safety Certification",
    regulationUrl: "https://www.tisi.go.th/",
    mandatoryFrom: null,
    requiresPublicPassport: false,
    requiresGovSync: false,
    dataResidencyRegion: "global",
    enabled: false, // Enable when ASEAN expansion begins
  },

  ID: {
    code: "ID",
    name: "Indonesia",
    continent: "Asia",
    countryCodes: ["ID"],
    defaultCurrency: "IDR",
    defaultLocale: "id-ID",
    passportIdPrefix: "id",
    idFieldName: "SNI Certificate Number",
    regulationName: "Indonesia SNI Safety Certification",
    regulationUrl: "https://www.bsn.go.id/",
    mandatoryFrom: null,
    requiresPublicPassport: false,
    requiresGovSync: false,
    dataResidencyRegion: "global",
    enabled: false,
  },

  AU: {
    code: "AU",
    name: "Australia",
    continent: "Oceania",
    countryCodes: ["AU", "NZ"],
    defaultCurrency: "AUD",
    defaultLocale: "en-AU",
    passportIdPrefix: "au",
    idFieldName: "Battery Serial Number",
    regulationName: "Australia Battery Product Stewardship",
    regulationUrl: "https://www.dcceew.gov.au/environment/protection/waste/product-stewardship/batteries",
    mandatoryFrom: null,
    requiresPublicPassport: false,
    requiresGovSync: false,
    dataResidencyRegion: "global",
    enabled: false,
  },
} as const;

/** Returns only the jurisdictions that are currently enabled on the platform */
export function getEnabledJurisdictions(): JurisdictionMeta[] {
  return Object.values(JURISDICTIONS).filter((j) => j.enabled);
}

/** Returns the jurisdiction metadata for a given code, or throws if not found */
export function getJurisdiction(code: string): JurisdictionMeta {
  const j = JURISDICTIONS[code.toUpperCase()];
  if (!j) throw new Error(`Unknown jurisdiction code: ${code}`);
  return j;
}

/** Returns all jurisdictions for a given continent */
export function getJurisdictionsByContinent(continent: JurisdictionMeta["continent"]): JurisdictionMeta[] {
  return Object.values(JURISDICTIONS).filter((j) => j.continent === continent);
}

/** Returns the jurisdiction code for a given ISO 3166-1 alpha-2 country code */
export function getJurisdictionByCountry(countryCode: string): JurisdictionMeta | undefined {
  return Object.values(JURISDICTIONS).find((j) =>
    j.countryCodes.includes(countryCode.toUpperCase())
  );
}
