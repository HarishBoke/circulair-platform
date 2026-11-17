import { z } from "zod";

/** Local contract, not an issuer API. Source: supplied Draft PDF pp.12,20,22,27–32,43–46. */
export const BPAN_CONTRACT_VERSION = "circulair-bpan/1" as const;
export const BPAN_DRAFT_FORMAT = "supplied-draft-21/v1" as const;
export const BPAN_LOCAL_PILOT_LABEL = "Local pilot identifier — not issued or registered by an official BPAN authority";
export const BPAN_REGISTRATION_BLOCKED_REASON = "Production registration is disabled pending contract integration, issuer-status verification, and owned-record authorization.";
export const BPAN_DRAFT_ALPHABET_CONFLICT = "Draft section 7.5 excludes 0 and Q; annex examples/tables use them. This is annex-table preview compatibility only, not official alphabet/check-symbol validation.";
export const DRAFT_SECTION_75_SYMBOLS = "ABCDEFGHJKLMNPRSTUVWXYZ123456789";
export type BpanFormat = typeof BPAN_DRAFT_FORMAT | "legacy-project-19/read-only" | "legacy-project-21/read-only";

/** Compatibility is shape-only, not regulatory validation. Never normalize stored identities. */
export const bpanReadSchema = z.string().regex(/^(?:[A-Z0-9]{19}|[A-Z0-9]{21})$/, "Expected an exact 19- or 21-character existing local identifier");
export function isBpanReadIdentifier(value: unknown): value is string {
  return bpanReadSchema.safeParse(value).success;
}

// These are table-specific symbols, not a newly invented universal BPAN alphabet.
export const DRAFT_YEAR_CODES = "123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const DRAFT_MONTH_CODES = "ABCDEFGHJKLM";
export const DRAFT_DAY_CODES = "123456789ABCDEFGHJKLMNPQRSTUVWX";
export const DRAFT_FACTORY_CODES = DRAFT_YEAR_CODES;
export const DRAFT_PARAMETER_CODES = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";
const YEAR_CODES = DRAFT_YEAR_CODES;
const DAY_CODES = DRAFT_DAY_CODES;
const PARAMETER_CODES = DRAFT_PARAMETER_CODES;
export const draftChemistryOptions = [
  { code: "A", label: "Lead acid" }, { code: "B", label: "Nickel-cadmium" },
  { code: "C", label: "Nickel-metal hydride" }, { code: "D", label: "Sodium-ion" },
  { code: "E", label: "LFP" }, { code: "F", label: "NMC" },
] as const;
export const draftExtinguisherOptions = [
  { code: "A", label: "Class A (draft metadata only)" }, { code: "B", label: "Class B (draft metadata only)" },
  { code: "C", label: "Class C (draft metadata only)" }, { code: "D", label: "Class D (draft metadata only)" },
  { code: "E", label: "Class K (draft metadata only)" },
] as const;
/** Deliberately bounded pilot subset of Table 16, not a global issuer registry. */
export const draftCountryOptions = [
  ...["MA", "MB", "MC", "MD", "ME", "MY", "MZ", "M0"].map(code => ({ code, label: "India (draft code)" })),
  ...["KL", "KM", "KN", "KP", "KQ", "KR"].map(code => ({ code, label: "South Korea (draft code)" })),
];

export function isRealManufacturingDate(year: number, month: number, day: number): boolean {
  if (![year, month, day].every(Number.isInteger) || year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1]!;
}

/** Exact Table 45 values 1–1000. Numeric first-symbol rows have letters-only second symbols. */
export function decodeDraftParameter(code: string): number | null {
  if (code.length !== 2) return null;
  const first = PARAMETER_CODES.indexOf(code[0]!);
  const second = PARAMETER_CODES.indexOf(code[1]!);
  if (first < 0 || second < 0) return null;
  const letters = PARAMETER_CODES.replace(/[0-9]/g, "").length;
  if (first >= letters && second >= letters) return null;
  const value = first < letters ? first * PARAMETER_CODES.length + second + 1
    : letters * PARAMETER_CODES.length + (first - letters) * letters + second + 1;
  return value <= 1000 ? value : null;
}
export function encodeDraftParameter(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 1000) throw new Error("Draft Table 45 supports integer values 1–1000 only");
  const index = value - 1;
  const letters = PARAMETER_CODES.replace(/[0-9]/g, "").length;
  const boundary = letters * PARAMETER_CODES.length;
  if (index < boundary) return PARAMETER_CODES[Math.floor(index / PARAMETER_CODES.length)]! + PARAMETER_CODES[index % PARAMETER_CODES.length]!;
  const numericIndex = index - boundary;
  return PARAMETER_CODES[letters + Math.floor(numericIndex / letters)]! + PARAMETER_CODES[numericIndex % letters]!;
}
const countryCodeSchema = z.string().refine(code => draftCountryOptions.some(option => option.code === code), "Country code is outside the verified local-pilot subset of draft Table 16");
const parameterCodeSchema = z.string().refine(code => decodeDraftParameter(code) !== null, "Unsupported draft Table 45 code");
const percentageSchema = z.number().finite().min(0).max(100).optional();
export const bpanPilotRegistrationSchema = z.object({
  countryCode: countryCodeSchema,
  manufacturerId: z.string().regex(/^[A-HJ-NP-Z0-9]{3}$/, "Three draft-style symbols required; assignment is unverified"),
  capacityCode: parameterCodeSchema,
  chemistryCode: z.enum(["A", "B", "C", "D", "E", "F"]),
  voltageCode: parameterCodeSchema,
  cellOriginCode: countryCodeSchema,
  extinguisherClass: z.enum(["A", "B", "C", "D", "E"]),
  mfgYear: z.number().int().min(2025).max(2057),
  mfgMonth: z.number().int().min(1).max(12),
  mfgDay: z.number().int().min(1).max(31),
  factoryCode: z.string().length(1).refine(code => YEAR_CODES.includes(code), "Unsupported factory symbol in draft Table 23"),
  serialNumber: z.string().regex(/^\d{4}$/, "Draft sequential number must contain four digits"),
  recyclabilityPct: percentageSchema, lithiumPct: percentageSchema, cobaltPct: percentageSchema,
  nickelPct: percentageSchema, manganesePct: percentageSchema,
  carbonFootprintKgCo2: z.number().finite().min(0).optional(),
}).strict().superRefine((value, ctx) => {
  if (!isRealManufacturingDate(value.mfgYear, value.mfgMonth, value.mfgDay)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mfgDay"], message: "Manufacturing date is not a real calendar date" });
  }
  const total = [value.lithiumPct, value.cobaltPct, value.nickelPct, value.manganesePct].reduce<number>((sum, v) => sum + (v ?? 0), 0);
  if (total > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lithiumPct"], message: "Reported material fractions exceed 100%" });
});
export type BpanPilotRegistration = z.input<typeof bpanPilotRegistrationSchema>;

export function createLocalBpanPreview(input: BpanPilotRegistration) {
  const data = bpanPilotRegistrationSchema.parse(input);
  const bpan = `${data.countryCode}${data.manufacturerId}${data.capacityCode}${data.chemistryCode}${data.voltageCode}${data.cellOriginCode}${data.extinguisherClass}${YEAR_CODES[data.mfgYear - 2025]}${DRAFT_MONTH_CODES[data.mfgMonth - 1]}${DAY_CODES[data.mfgDay - 1]}${data.factoryCode}${data.serialNumber}`;
  return { contractVersion: BPAN_CONTRACT_VERSION, format: BPAN_DRAFT_FORMAT, bpan, label: BPAN_LOCAL_PILOT_LABEL, officialStatus: "not_verified" as const, persisted: false as const, warnings: [BPAN_DRAFT_ALPHABET_CONFLICT], data };
}

/** Worksheet contract for an unallocated physical asset. Not compatible with the old bpan column/API. */
export const localPilotAssetSchema = z.object({
  namespace: z.literal("LOCAL_PILOT"),
  version: z.literal("local-pilot-asset/1"),
  assetReference: z.string().uuid(),
  manufacturerSerial: z.string().min(1).max(200),
  provenance: z.object({
    source: z.literal("physical-label-and-owner-attestation"),
    recordedAt: z.string().datetime({ offset: true }),
    evidenceReference: z.string().min(1).max(200),
  }).strict(),
  officialBpan: z.null(),
  officialStatus: z.literal("unallocated"),
}).strict();

export interface DecodedLocalBpan {
  contractVersion: typeof BPAN_CONTRACT_VERSION;
  format: BpanFormat;
  bpan: string;
  label: string;
  officialStatus: "not_verified";
  legacyReadOnly: boolean;
  countryCode: string; manufacturerId: string; capacityCode: string; chemistryCode: string;
  voltageCode: string; cellOriginCode: string; extinguisherClass: string;
  yearCode: string; monthCode: string; dayCode: string; factoryCode: string; serialNumber: string;
  mfgYear: number | null; mfgMonth: number | null; mfgDay: number | null;
  capacityKwh: number | null; voltageV: number | null; chemistry: string | null;
  segments: { bmi: string; bds: string; bi: string };
  warnings: string[];
}

/** Length cannot distinguish the two 21-character meanings. Draft decoding requires explicit version metadata. */
export function decodeLocalBpan(bpan: string, declaredFormat?: BpanFormat): DecodedLocalBpan | null {
  if (!isBpanReadIdentifier(bpan)) return null;
  const format = declaredFormat ?? (bpan.length === 19 ? "legacy-project-19/read-only" : "legacy-project-21/read-only");
  const is19 = format === "legacy-project-19/read-only";
  if (bpan.length !== (is19 ? 19 : 21)) return null;
  const bdsEnd = is19 ? 12 : 13;
  const result: DecodedLocalBpan = {
    contractVersion: BPAN_CONTRACT_VERSION, format, bpan, label: BPAN_LOCAL_PILOT_LABEL,
    officialStatus: "not_verified", legacyReadOnly: format !== BPAN_DRAFT_FORMAT,
    countryCode: bpan.slice(0, 2), manufacturerId: bpan.slice(2, 5),
    capacityCode: bpan.slice(5, is19 ? 6 : 7), chemistryCode: bpan.slice(is19 ? 6 : 7, is19 ? 7 : 8),
    voltageCode: bpan.slice(is19 ? 7 : 8, is19 ? 9 : 10), cellOriginCode: bpan.slice(is19 ? 9 : 10, is19 ? 11 : 12),
    extinguisherClass: bpan.slice(is19 ? 11 : 12, bdsEnd),
    yearCode: bpan.slice(bdsEnd, is19 ? 14 : 14), monthCode: bpan.slice(14, is19 ? 16 : 15),
    dayCode: bpan.slice(is19 ? 16 : 15, is19 ? 18 : 16), factoryCode: bpan.slice(is19 ? 18 : 16, is19 ? 19 : 17),
    serialNumber: is19 ? "" : bpan.slice(17),
    mfgYear: null, mfgMonth: null, mfgDay: null, capacityKwh: null, voltageV: null, chemistry: null,
    segments: { bmi: bpan.slice(0, 5), bds: bpan.slice(5, bdsEnd), bi: bpan.slice(bdsEnd) },
    warnings: ["No issuer-assignment or check-symbol verification is available from this contract."],
  };
  if (format === BPAN_DRAFT_FORMAT) {
    result.warnings.push(BPAN_DRAFT_ALPHABET_CONFLICT);
    const year = YEAR_CODES.indexOf(result.yearCode) + 2025;
    const month = DRAFT_MONTH_CODES.indexOf(result.monthCode) + 1;
    const day = DAY_CODES.indexOf(result.dayCode) + 1;
    const parsed = bpanPilotRegistrationSchema.safeParse({
      countryCode: result.countryCode, manufacturerId: result.manufacturerId,
      capacityCode: result.capacityCode, chemistryCode: result.chemistryCode, voltageCode: result.voltageCode,
      cellOriginCode: result.cellOriginCode, extinguisherClass: result.extinguisherClass,
      mfgYear: year, mfgMonth: month, mfgDay: day, factoryCode: result.factoryCode, serialNumber: result.serialNumber,
    });
    if (YEAR_CODES.indexOf(result.yearCode) < 0 || !parsed.success) return null;
    result.mfgYear = year; result.mfgMonth = month; result.mfgDay = day;
    result.capacityKwh = decodeDraftParameter(result.capacityCode); result.voltageV = decodeDraftParameter(result.voltageCode);
    result.chemistry = draftChemistryOptions.find(option => option.code === result.chemistryCode)!.label;
  } else {
    // Existing-row metadata is authoritative; the older generator lost the decade and used incompatible tables.
    result.warnings.push(is19 ? "Legacy 19-character project layout; consult the stored row for date/specifications." : "Legacy 21-character project layout; date/chemistry cannot be inferred authoritatively. Consult the stored row.");
  }
  return result;
}

export function bpanFormatLabel(bpan: string): string {
  return bpan.length === 19 ? "Legacy project 19 · read compatibility" : bpan.length === 21 ? "Project 21 · version/assignment unverified" : "Unrecognized project identity · manual review";
}

/** Dependency-injected owned-row resolver. No DB import or traffic; fail closed, no caller-ID substitution. */
export async function resolveOwnedBatteryIdentity<T extends { id: number; bpan: string; ownerId: number | null }>(
  lookup: (bpan: string) => Promise<T | undefined | null>, actor: { id: number; role?: string },
  input: { bpan: string; batteryId?: number },
): Promise<T> {
  const bpan = bpanReadSchema.parse(input.bpan);
  const battery = await lookup(bpan);
  if (!battery || battery.bpan !== bpan || !Number.isSafeInteger(battery.id) || battery.id <= 0 || !Number.isSafeInteger(actor.id) || actor.id <= 0 || (actor.role !== "admin" && battery.ownerId !== actor.id)) {
    throw new Error("Battery unavailable for this actor");
  }
  if (input.batteryId !== undefined && (!Number.isSafeInteger(input.batteryId) || input.batteryId <= 0 || input.batteryId !== battery.id)) {
    throw new Error("Caller battery identity does not match the owned row");
  }
  return battery;
}

/** Preserve explicit zero vs unknown; used by proposed persistence integrations. */
export function optionalBpanDecimal(value: number | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  if (!Number.isFinite(value)) throw new Error("Non-finite decimal");
  return String(value);
}
