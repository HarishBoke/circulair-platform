import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BPAN_CONTRACT_VERSION, BPAN_DRAFT_FORMAT, BPAN_LOCAL_PILOT_LABEL,
  bpanPilotRegistrationSchema, bpanReadSchema, createLocalBpanPreview, decodeLocalBpan,
  decodeDraftParameter, encodeDraftParameter, isRealManufacturingDate,
  localPilotAssetSchema, optionalBpanDecimal, resolveOwnedBatteryIdentity,
} from "../shared/bpanContract";

const draft = {
  countryCode: "MY", manufacturerId: "008", capacityCode: "A6", chemistryCode: "F" as const,
  voltageCode: "KK", cellOriginCode: "KL", extinguisherClass: "C" as const,
  mfgYear: 2025, mfgMonth: 4, mfgDay: 17, factoryCode: "8", serialNumber: "0001",
};

describe("versioned local BPAN contract", () => {
  it("reproduces supplied Draft p22 without asserting official allocation or persistence", () => {
    const preview = createLocalBpanPreview(draft);
    expect(preview.bpan).toBe("MY008A6FKK KLC1DH80001".replace(" ", ""));
    expect(preview.bpan).toHaveLength(21);
    expect(preview.contractVersion).toBe(BPAN_CONTRACT_VERSION);
    expect(preview.format).toBe(BPAN_DRAFT_FORMAT);
    expect(preview.persisted).toBe(false);
    expect(preview.officialStatus).toBe("not_verified");
    expect(preview.label).toBe(BPAN_LOCAL_PILOT_LABEL);
    const decoded = decodeLocalBpan(preview.bpan, preview.format)!;
    expect(decoded).toMatchObject({ mfgYear: 2025, mfgMonth: 4, mfgDay: 17, capacityKwh: 30, voltageV: 307, chemistry: "NMC", serialNumber: "0001", legacyReadOnly: false });
    expect(decoded.segments).toEqual({ bmi: "MY008", bds: "A6FKKKLC", bi: "1DH80001" });
  });
  it("does not certify the conflicting section-7.5 and annex alphabets", () => {
    const preview = createLocalBpanPreview(draft);
    expect(preview.warnings[0]).toContain("excludes 0 and Q");
    expect(preview.warnings[0]).toContain("not official");
    expect(decodeLocalBpan(preview.bpan, BPAN_DRAFT_FORMAT)?.warnings).toContain(preview.warnings[0]);
  });
  it("does not infer a draft version from a 21-character string", () => {
    const preview = createLocalBpanPreview(draft);
    const decoded = decodeLocalBpan(preview.bpan)!;
    expect(decoded.format).toBe("legacy-project-21/read-only");
    expect(decoded.mfgYear).toBeNull();
    expect(decoded.chemistry).toBeNull();
  });
  it("preserves legacy 19 identity without serial invention or identity rewrite", () => {
    const id = "NLABC2L48JP22101200";
    expect(id).toHaveLength(19);
    const result = decodeLocalBpan(id)!;
    expect(result.format).toBe("legacy-project-19/read-only");
    expect(result.bpan).toBe(id);
    expect(result.serialNumber).toBe("");
    expect(result.mfgYear).toBeNull();
    expect(result.capacityKwh).toBeNull();
    expect(decodeLocalBpan(id, BPAN_DRAFT_FORMAT)).toBeNull();
  });
  it("preserves legacy generated 21-character segments but does not guess decade/specifications", () => {
    const id = "INABC C3FKOIND5COA0001".replace(" ", "");
    const result = decodeLocalBpan(id)!;
    expect(result.bpan).toBe(id);
    expect(result.segments).toEqual({ bmi: "INABC", bds: "C3FKOIND", bi: "5COA0001" });
    expect(result.mfgYear).toBeNull();
    expect(result.voltageV).toBeNull();
    expect(decodeLocalBpan(id, BPAN_DRAFT_FORMAT)).toBeNull();
  });
  it.each(["", "A".repeat(20), "A".repeat(22), "a".repeat(19), "?".repeat(21), " " + "A".repeat(19)])("rejects invalid exact read shape %j", value => {
    expect(bpanReadSchema.safeParse(value).success).toBe(false);
    expect(decodeLocalBpan(value)).toBeNull();
  });
  it("uses different draft year symbols rather than the old final year digit", () => {
    const first = createLocalBpanPreview(draft);
    const second = createLocalBpanPreview({ ...draft, mfgYear: 2035 });
    expect(first.bpan).not.toBe(second.bpan);
    expect(second.bpan[13]).toBe("B");
    expect(decodeLocalBpan(second.bpan, BPAN_DRAFT_FORMAT)?.mfgYear).toBe(2035);
  });
  it("roundtrips every supported real draft date including leap years", () => {
    for (let year = 2025; year <= 2057; year++) {
      for (let month = 1; month <= 12; month++) {
        for (let day = 1; day <= 31; day++) {
          if (!isRealManufacturingDate(year, month, day)) continue;
          const preview = createLocalBpanPreview({ ...draft, mfgYear: year, mfgMonth: month, mfgDay: day });
          expect(decodeLocalBpan(preview.bpan, BPAN_DRAFT_FORMAT)).toMatchObject({ mfgYear: year, mfgMonth: month, mfgDay: day });
        }
      }
    }
  });
  it.each([
    { mfgYear: 2024 }, { mfgYear: 2058 }, { mfgYear: 2026.1 }, { mfgMonth: 0 },
    { mfgMonth: 13 }, { mfgDay: 0 }, { mfgMonth: 2, mfgDay: 31 }, { mfgYear: 2025, mfgMonth: 2, mfgDay: 29 },
    { countryCode: "IN" }, { manufacturerId: "?12" }, { manufacturerId: "I01" },
    { capacityCode: "ZZ?" }, { voltageCode: "00" }, { chemistryCode: "G" }, { extinguisherClass: "Z" },
    { factoryCode: "0" }, { serialNumber: "ABCD" }, { lithiumPct: -1 }, { recyclabilityPct: 101 },
    { carbonFootprintKgCo2: -1 }, { carbonFootprintKgCo2: Infinity }, { lithiumPct: 60, cobaltPct: 50 },
  ])("rejects unsupported or fabricated registration metadata %j", invalid => {
    expect(bpanPilotRegistrationSchema.safeParse({ ...draft, ...invalid }).success).toBe(false);
  });
  it("preserves zero vs omitted decimals", () => {
    const preview = createLocalBpanPreview({ ...draft, lithiumPct: 0, carbonFootprintKgCo2: 0 });
    expect(preview.data.lithiumPct).toBe(0);
    expect(preview.data.carbonFootprintKgCo2).toBe(0);
    expect(preview.data.cobaltPct).toBeUndefined();
    expect(optionalBpanDecimal(0)).toBe("0");
    expect(optionalBpanDecimal(undefined)).toBeNull();
    expect(optionalBpanDecimal(null)).toBeNull();
    expect(() => optionalBpanDecimal(NaN)).toThrow();
  });
  it.each([ ["AA", 1], ["A6", 30], ["KK", 307], ["KL", 308], ["ND", 400], ["Z9", 792], ["1A", 793], ["1H", 800], ["2A", 817], ["9Q", 999], ["9R", 1000] ] as const)("matches Table 45 code %s to %i", (code, value) => {
    expect(decodeDraftParameter(code)).toBe(value);
    expect(encodeDraftParameter(value)).toBe(code);
  });
  it("roundtrips all 1000 parameter codes with table-specific mixed radix", () => {
    for (let value = 1; value <= 1000; value++) expect(decodeDraftParameter(encodeDraftParameter(value))).toBe(value);
    for (const code of ["00", "11", "9S", "AI", "AO", "AQ?"]) expect(decodeDraftParameter(code)).toBeNull();
    for (const value of [0, 1001, 1.5, NaN]) expect(() => encodeDraftParameter(value)).toThrow();
  });
  it("keeps unallocated physical asset identity separate from official BPAN and manufacturer serial", () => {
    const asset = localPilotAssetSchema.parse({ namespace: "LOCAL_PILOT", version: "local-pilot-asset/1", assetReference: "d8d3f806-1b3a-4afe-887a-584b3a940e25", manufacturerSerial: "PHYSICAL-SERIAL-001", provenance: { source: "physical-label-and-owner-attestation", recordedAt: "2026-11-18T00:00:00Z", evidenceReference: "restricted-local/pack-01" }, officialBpan: null, officialStatus: "unallocated" });
    expect(asset.officialBpan).toBeNull();
    expect(localPilotAssetSchema.safeParse({ ...asset, officialBpan: createLocalBpanPreview(draft).bpan }).success).toBe(false);
  });
});

describe("owned-row identity (mock lookup only)", () => {
  const row = { id: 42, bpan: createLocalBpanPreview(draft).bpan, ownerId: 7 };
  const lookup = async () => row;
  it("derives canonical ID from owned row when caller omits duplicate ID", async () => {
    expect(await resolveOwnedBatteryIdentity(lookup, { id: 7 }, { bpan: row.bpan })).toBe(row);
  });
  it("accepts matching compatibility caller ID without replacing canonical row", async () => {
    expect(await resolveOwnedBatteryIdentity(lookup, { id: 7 }, { bpan: row.bpan, batteryId: 42 })).toBe(row);
  });
  it.each([0, 43, -1, 42.1, NaN])("rejects zero/mismatched caller ID %j before persistence", async batteryId => {
    await expect(resolveOwnedBatteryIdentity(lookup, { id: 7 }, { bpan: row.bpan, batteryId })).rejects.toThrow("does not match");
  });
  it("denies other owner and unowned rows", async () => {
    await expect(resolveOwnedBatteryIdentity(lookup, { id: 8 }, { bpan: row.bpan })).rejects.toThrow("unavailable");
    await expect(resolveOwnedBatteryIdentity(async () => ({ ...row, ownerId: null }), { id: 7 }, { bpan: row.bpan })).rejects.toThrow("unavailable");
  });
  it("permits explicit admin exception but not other roles", async () => {
    expect(await resolveOwnedBatteryIdentity(lookup, { id: 8, role: "admin" }, { bpan: row.bpan })).toBe(row);
    await expect(resolveOwnedBatteryIdentity(lookup, { id: 8, role: "manufacturer" }, { bpan: row.bpan })).rejects.toThrow("unavailable");
  });
  it("rejects missing row, invalid canonical ID, and wrong lookup result", async () => {
    await expect(resolveOwnedBatteryIdentity(async () => undefined, { id: 7 }, { bpan: row.bpan })).rejects.toThrow("unavailable");
    await expect(resolveOwnedBatteryIdentity(async () => ({ ...row, id: 0 }), { id: 7 }, { bpan: row.bpan })).rejects.toThrow("unavailable");
    await expect(resolveOwnedBatteryIdentity(async () => ({ ...row, bpan: "A".repeat(19) }), { id: 7 }, { bpan: row.bpan })).rejects.toThrow("unavailable");
  });
});

describe("owned-page static offline safety guards (not browser acceptance)", () => {
  const page = (name: string) => readFileSync(new URL(`../client/src/pages/${name}.tsx`, import.meta.url), "utf8");
  it("registration does not invoke mutation or imply persisted official allocation", () => {
    const source = page("BpanRegister");
    expect(source).not.toContain("trpc.bpan.generate");
    expect(source).not.toContain("mutation.mutate");
    expect(source).toContain("createLocalBpanPreview");
    expect(source).toContain("BPAN_REGISTRATION_BLOCKED_REASON");
    expect(source).not.toContain("Battery Registered!");
  });
  it("detail never creates a socket or simulator and gates official certification", () => {
    const source = page("BpanDetail");
    expect(source).not.toMatch(/useTelemetrySocket\s*\(/g);
    expect(source).not.toContain("trpc.telemetry.simulate");
    expect(source).not.toContain("trpc.pdf.batteryComplianceCert");
    expect(source).toContain("battery.bpan !== bpan");
  });
  it("registry retains existing row identity and labels read compatibility", () => {
    const source = page("BpanRegistry");
    expect(source).toContain("bpanFormatLabel(b.bpan)");
    expect(source).toContain("not an official BPAN registry");
    expect(source).not.toContain("slice(0, 19)");
  });
});
