/**
 * API Marketplace — Developer Portal Key Management
 * Handles API key generation, hashing, rate-limit tracking, and permission scoping.
 */

import crypto from "crypto";

export type ApiPermission =
  | "soh_predict"
  | "bpan_validate"
  | "compliance_report"
  | "telemetry_read"
  | "marketplace_read"
  | "carbon_report"
  | "digital_twin";

export const ALL_PERMISSIONS: ApiPermission[] = [
  "soh_predict",
  "bpan_validate",
  "compliance_report",
  "telemetry_read",
  "marketplace_read",
  "carbon_report",
  "digital_twin",
];

export const PERMISSION_LABELS: Record<ApiPermission, string> = {
  soh_predict: "SOH Prediction",
  bpan_validate: "BPAN Validation",
  compliance_report: "Compliance Reports",
  telemetry_read: "Telemetry Read",
  marketplace_read: "Marketplace Read",
  carbon_report: "Carbon Footprint",
  digital_twin: "Digital Twin",
};

export interface GeneratedApiKey {
  /** Full plaintext key — show ONCE, never store */
  plaintext: string;
  /** SHA-256 hash to store in DB */
  hash: string;
  /** First 12 chars for display (e.g. "cai_live_a1b2") */
  prefix: string;
}

/**
 * Generate a new API key with the format: cai_live_{32 random hex chars}
 */
export function generateApiKey(): GeneratedApiKey {
  const random = crypto.randomBytes(24).toString("hex");
  const plaintext = `cai_live_${random}`;
  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  const prefix = plaintext.slice(0, 13); // "cai_live_" + 4 chars
  return { plaintext, hash, prefix };
}

/**
 * Hash an incoming API key for DB lookup.
 */
export function hashApiKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

/**
 * Parse permissions string from DB (comma-separated) to array.
 */
export function parsePermissions(permissionsStr: string): ApiPermission[] {
  return permissionsStr
    .split(",")
    .map((p) => p.trim())
    .filter((p) => ALL_PERMISSIONS.includes(p as ApiPermission)) as ApiPermission[];
}

/**
 * Serialize permissions array to DB string.
 */
export function serializePermissions(permissions: ApiPermission[]): string {
  return permissions.join(",");
}

/**
 * Check if a key has a specific permission.
 */
export function hasPermission(permissionsStr: string, required: ApiPermission): boolean {
  const perms = parsePermissions(permissionsStr);
  return perms.includes(required);
}

export interface ApiUsageStats {
  totalCalls: number;
  monthlyCalls: number;
  remainingHourly: number;
  rateLimit: number;
  lastUsedAt: Date | null;
}
