import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, chmodSync, symlinkSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { guardedPilotQaUrl, guardedPilotQaCredentialFile, REVIEWED_PILOT_SQL_SHA256, ACCEPTANCE_PILOT_SQL_SHA256 } from "../scripts/local-pilot-qa";
describe("explicit local pilot PostgreSQL hard guard (no connections)", () => {
  it("accepts solely explicit exact local QA credentials", () => expect(guardedPilotQaUrl("postgresql://qa_fixture:synthetic_test_only@127.0.0.1:5432/circulair_qa", "1")).toContain("127.0.0.1:5432/circulair_qa"));
  for (const raw of [undefined,"","postgresql://qa_fixture:synthetic_test_only@localhost:5432/circulair_qa","postgresql://qa_fixture:synthetic_test_only@127.0.0.1:5432/customer","postgresql://qa_fixture:synthetic_test_only@remote.example.org:5432/circulair_qa","postgresql://qa_fixture:synthetic_test_only@127.0.0.1:5433/circulair_qa","postgresql://qa_fixture@127.0.0.1:5432/circulair_qa","postgresql://qa_fixture:synthetic_test_only@127.0.0.1:5432/circulair_qa?host=remote.example.org","postgresql://qa_fixture:synthetic_test_only@127.0.0.1:5432/circulair_qa#fragment","mysql://qa_fixture:synthetic_test_only@127.0.0.1:5432/circulair_qa"])
    it(`refuses unsafe target variant ${String(raw).split(":")[0]}`, () => expect(() => guardedPilotQaUrl(raw,"1")).toThrow());
  it("requires explicit QA_LOCAL approval regardless of valid shape", () => expect(() => guardedPilotQaUrl("postgresql://qa_fixture:synthetic_test_only@127.0.0.1:5432/circulair_qa", undefined)).toThrow());
  it("reads only a same-user regular 0600 credential file and refuses symlinks", () => {
    const dir = mkdtempSync(join(tmpdir(), "pilot-guard-"));
    try {
      const file = join(dir, "private"), link = join(dir, "link");
      writeFileSync(file, "synthetic test fixture only\n", { mode: 0o600 });
      expect(guardedPilotQaCredentialFile(file)).toBe("synthetic test fixture only\n");
      chmodSync(file, 0o644); expect(() => guardedPilotQaCredentialFile(file)).toThrow("pilot_qa_private_credential_file_required");
      chmodSync(file, 0o600); symlinkSync(file, link); expect(() => guardedPilotQaCredentialFile(link)).toThrow("pilot_qa_private_credential_file_required");
      expect(() => guardedPilotQaCredentialFile(undefined)).toThrow("pilot_qa_private_credential_file_required");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("binds the acceptance SQL to its explicitly revised checksum, retaining the original review basis", () => {
    const sql = readFileSync(new URL("../drizzle/local-pilot.sql", import.meta.url), "utf8");
    expect(createHash("sha256").update(sql).digest("hex")).toBe(ACCEPTANCE_PILOT_SQL_SHA256);
    expect(REVIEWED_PILOT_SQL_SHA256).toBe("9f1643faab94e2719a467674037b363b9682e0cd893dff81c1e0ae5b891d0b86");
    expect(ACCEPTANCE_PILOT_SQL_SHA256).not.toBe(REVIEWED_PILOT_SQL_SHA256);
    expect(sql).toContain("(payload->>'source' = 'BMS_REPORTED') IS TRUE");
    const mapping = readFileSync(new URL("../drizzle/pilotSchema.ts", import.meta.url), "utf8");
    expect(mapping).toContain("->>'source' = 'BMS_REPORTED') IS TRUE");
  });
});
