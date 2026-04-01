/**
 * Regulatory Profile Types
 *
 * These types define the contract that every jurisdiction adapter must satisfy.
 * A battery can carry multiple regulatory profiles simultaneously — one per target market.
 *
 * Architecture:
 *   BatteryRecord
 *     └── regulatoryProfiles: RegulatoryProfile[]
 *           ├── EuRegulatoryProfile   (EU Battery Regulation 2023/1542)
 *           ├── InRegulatoryProfile   (India BPAN)
 *           ├── CnRegulatoryProfile   (China NEV MIIT)
 *           ├── UsRegulatoryProfile   (US IRA supply chain docs)
 *           └── GbRegulatoryProfile   (UK UKCA — future)
 *
 * To add a new jurisdiction:
 *   1. Add a new interface extending BaseRegulatoryProfile
 *   2. Add it to the RegulatoryProfile union type
 *   3. Implement the adapter in server/regulatory/{code}.adapter.ts
 */

// ---------------------------------------------------------------------------
// Base — shared across all jurisdictions
// ---------------------------------------------------------------------------

export type ComplianceStatus =
  | "compliant"
  | "non_compliant"
  | "pending"
  | "not_applicable"
  | "data_incomplete";

export interface BaseRegulatoryProfile {
  /** Jurisdiction code — matches JURISDICTIONS registry key */
  jurisdiction: string;
  /** Battery ID in this jurisdiction's format */
  localId: string | null;
  /** Overall compliance status for this jurisdiction */
  status: ComplianceStatus;
  /** ISO 8601 timestamp of last compliance check */
  lastCheckedAt: string | null;
  /** Free-text notes from the compliance officer */
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Carbon Footprint (shared across EU, UK, and future jurisdictions)
// ---------------------------------------------------------------------------

export interface CarbonFootprintDeclaration {
  /** Total lifecycle GHG in kg CO₂ equivalent */
  totalKgCo2e: number;
  /** Raw material acquisition and pre-processing stage */
  rawMaterialKgCo2e: number;
  /** Main production stage */
  productionKgCo2e: number;
  /** Distribution and storage stage */
  distributionKgCo2e: number;
  /** End-of-life stage */
  endOfLifeKgCo2e: number;
  /** EU Carbon Footprint Performance Class: A (best) to E (worst) */
  performanceClass: "A" | "B" | "C" | "D" | "E" | null;
  /** ISO 8601 date of the declaration */
  declaredAt: string;
  /** Name of the certifying body (if third-party verified) */
  certifyingBody: string | null;
  /** Methodology used: GHG_PROTOCOL | ISO_14067 | EU_PEF | GBA */
  methodology: "GHG_PROTOCOL" | "ISO_14067" | "EU_PEF" | "GBA";
}

// ---------------------------------------------------------------------------
// Recycled Content (EU mandatory, tracked globally)
// ---------------------------------------------------------------------------

export interface RecycledContentDeclaration {
  /** % recycled cobalt by weight */
  cobaltPct: number | null;
  /** % recycled lithium by weight */
  lithiumPct: number | null;
  /** % recycled nickel by weight */
  nickelPct: number | null;
  /** % recycled lead by weight */
  leadPct: number | null;
  /** ISO 8601 date of the declaration */
  declaredAt: string;
  /** Certifying body for recycled content claims */
  certifyingBody: string | null;
}

// ---------------------------------------------------------------------------
// Supply Chain Due Diligence (EU mandatory from 2027, US IRA required)
// ---------------------------------------------------------------------------

export interface MineralOriginRecord {
  mineral: "cobalt" | "lithium" | "nickel" | "manganese" | "graphite" | "other";
  /** ISO 3166-1 alpha-2 country code of origin */
  countryOfOrigin: string;
  /** Name of the mine or processing facility */
  sourceName: string | null;
  /** Whether this source is on the EU conflict minerals list */
  conflictFree: boolean;
  /** Whether this source qualifies for US IRA domestic/FTA partner credit */
  iraQualified: boolean;
}

// ---------------------------------------------------------------------------
// EU Battery Regulation 2023/1542
// ---------------------------------------------------------------------------

export interface EuRegulatoryProfile extends BaseRegulatoryProfile {
  jurisdiction: "EU";
  /** EU Battery Passport unique identifier (UUID format) */
  passportId: string | null;
  carbonFootprint: CarbonFootprintDeclaration | null;
  recycledContent: RecycledContentDeclaration | null;
  mineralOrigins: MineralOriginRecord[];
  /** Whether the battery meets EU safety requirements (IEC 62619) */
  safetyCompliant: boolean | null;
  /** Whether the battery has a valid CE marking */
  ceMarking: boolean | null;
  /** State of Health at time of placing on EU market (%) */
  sohAtMarketPlacement: number | null;
  /** Disassembly instructions document URL */
  disassemblyInstructionsUrl: string | null;
  /** End-of-life collection point information */
  eolCollectionInfo: string | null;
}

// ---------------------------------------------------------------------------
// India BPAN
// ---------------------------------------------------------------------------

export interface InRegulatoryProfile extends BaseRegulatoryProfile {
  jurisdiction: "IN";
  /** 21-character Battery Pack Aadhaar Number */
  bpan: string | null;
  /** EPR registration number of the producer */
  eprRegistrationNumber: string | null;
  /** CPCB compliance status */
  cpcbCompliant: boolean | null;
  /** PLI scheme eligibility */
  pliEligible: boolean | null;
}

// ---------------------------------------------------------------------------
// China NEV Battery MIIT
// ---------------------------------------------------------------------------

export interface CnRegulatoryProfile extends BaseRegulatoryProfile {
  jurisdiction: "CN";
  /** MIIT-assigned digital battery ID */
  miitId: string | null;
  /** Whether data has been synced to the MIIT national platform */
  miitSyncStatus: "synced" | "pending" | "failed" | "not_required";
  /** ISO 8601 timestamp of last successful MIIT sync */
  lastMiitSyncAt: string | null;
  /** China recycling category: A (direct reuse) | B (cascade use) | C (material recovery) */
  recyclingCategory: "A" | "B" | "C" | null;
}

// ---------------------------------------------------------------------------
// US IRA Supply Chain Documentation
// ---------------------------------------------------------------------------

export interface UsRegulatoryProfile extends BaseRegulatoryProfile {
  jurisdiction: "US";
  /** Whether the battery qualifies for the IRA Clean Vehicle Tax Credit */
  iraQualified: boolean | null;
  /** % of critical mineral value from US or FTA partner countries */
  criticalMineralPct: number | null;
  /** % of battery component value manufactured in North America */
  batteryComponentPct: number | null;
  mineralOrigins: MineralOriginRecord[];
  /** IRS Form 8936 documentation reference */
  irsDocumentRef: string | null;
}

// ---------------------------------------------------------------------------
// UK Battery Regulation (post-Brexit)
// ---------------------------------------------------------------------------

export interface GbRegulatoryProfile extends BaseRegulatoryProfile {
  jurisdiction: "GB";
  /** UKCA marking status */
  ukcaMarking: boolean | null;
  /** UK Responsible Person registration number */
  ukResponsiblePersonRef: string | null;
}

// ---------------------------------------------------------------------------
// Union type — add new jurisdiction profiles here
// ---------------------------------------------------------------------------

export type RegulatoryProfile =
  | EuRegulatoryProfile
  | InRegulatoryProfile
  | CnRegulatoryProfile
  | UsRegulatoryProfile
  | GbRegulatoryProfile;

// ---------------------------------------------------------------------------
// Compliance check result — returned by each adapter's checkCompliance()
// ---------------------------------------------------------------------------

export interface ComplianceCheckResult {
  jurisdiction: string;
  status: ComplianceStatus;
  /** List of missing or non-compliant data fields */
  issues: ComplianceIssue[];
  /** Next regulatory deadline relevant to this battery */
  nextDeadline: { label: string; date: string } | null;
  checkedAt: string;
}

export interface ComplianceIssue {
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
}

// ---------------------------------------------------------------------------
// Adapter interface — every jurisdiction adapter must implement this
// ---------------------------------------------------------------------------

export interface JurisdictionAdapter {
  /** Jurisdiction code this adapter handles */
  readonly jurisdictionCode: string;

  /**
   * Validates and normalises a battery's regulatory profile for this jurisdiction.
   * Returns a list of compliance issues (empty = fully compliant).
   */
  checkCompliance(profile: RegulatoryProfile, batteryData: BatteryComplianceInput): ComplianceCheckResult;

  /**
   * Generates the public-facing passport data object for this jurisdiction.
   * Returns null if this jurisdiction does not require a public passport.
   */
  generatePassportData(profile: RegulatoryProfile, batteryData: BatteryComplianceInput): PassportPublicData | null;

  /**
   * Returns the URL path for the public passport page.
   * Returns null if this jurisdiction does not have a public passport.
   */
  getPassportUrl(localId: string): string | null;
}

// ---------------------------------------------------------------------------
// Input type for compliance checks — subset of battery data needed by adapters
// ---------------------------------------------------------------------------

export interface BatteryComplianceInput {
  bpan: string;
  chemistry: string;
  capacityKwh: number;
  voltageV: number;
  weightKg: number | null;
  manufacturerName: string;
  manufacturerCountry: string;
  manufacturedAt: string | null;
  currentSoh: number | null;
  targetMarkets: string[];
}

// ---------------------------------------------------------------------------
// Public passport data — what is shown on the public-facing passport page
// ---------------------------------------------------------------------------

export interface PassportPublicData {
  passportId: string;
  jurisdiction: string;
  generatedAt: string;
  /** General information section */
  general: {
    batteryId: string;
    chemistry: string;
    capacityKwh: number;
    voltageV: number;
    manufacturerName: string;
    manufacturerCountry: string;
    manufacturedAt: string | null;
    currentSoh: number | null;
  };
  /** Carbon footprint section (null if not declared) */
  carbonFootprint: {
    totalKgCo2e: number;
    performanceClass: string | null;
    methodology: string;
    declaredAt: string;
  } | null;
  /** Recycled content section (null if not declared) */
  recycledContent: {
    cobaltPct: number | null;
    lithiumPct: number | null;
    nickelPct: number | null;
    leadPct: number | null;
    declaredAt: string;
  } | null;
  /** End-of-life information */
  endOfLife: {
    disassemblyInstructionsUrl: string | null;
    collectionInfo: string | null;
  } | null;
}
