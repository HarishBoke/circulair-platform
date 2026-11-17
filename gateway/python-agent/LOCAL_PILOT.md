# Local physical-battery pilot — bounded implementation handoff

**18 November 2026. Development only; no actual battery connection, physical measurement, external telemetry transmission or production migration has been performed.** Actual local PostgreSQL and loopback API acceptance have passed using explicitly synthetic fixtures, not physical battery data. This feature is separate from legacy BPAN/battery tables and defaults disabled. It is not an official enrollment, safety control, certification, capacity/SOH test or full-fleet validation.

## Integration and authorization gate

Central native RPC, REST, page and schema-discovery mounts are now implemented and compile-tested. The corrected additive `drizzle/local-pilot.sql` SHA256 is `edff6d0267a8b38d4f47f3c08f03d57589a989260587d41812e6482735745a3e`. Real PostgreSQL exposed an absent/null JSON-source CHECK bug; the current SQL explicitly requires `(payload->>'source' = 'BMS_REPORTED') IS TRUE`. The earlier checksum is retained only as historical evidence, not the current migration-review basis. Obtain separate production migration, enablement and exact-source release acceptance. Do not run `db:push` against customer data as a shortcut. The SQL changes only four new pilot tables, two functions and four triggers; it neither modifies nor populates old `batteries`, telemetry or customer rows. Existing manufacturer serials and legacy aliases are not rewritten, truncated, remapped or inferred. Physical serials need not be globally unique.

The native tRPC mount is `pilot: localPilotRouter` inside the existing `appRouter`. Auth uses the existing authenticated `ctx.user.id` only; even admins remain owner-scoped. No new auth vendor or platform runtime service is added. `pilot.createAsset`, `listAssets`, `getAsset`, `provisionDevice`, `listDevices`, `revokeDevice`, `latestReadings` are authenticated; foreign/missing assets are uniformly `NOT_FOUND`. The distinct page is `/local-battery-pilot` under the existing authenticated platform layout. A native user creates and reads their own asset, not a fake BPAN in the old table. Asset creation and consent/provenance insertion are one transaction with real positive inserted IDs and an actual UUID.

The pilot REST router is mounted at `/api/v1/pilot` **before the 50 MB global JSON parser and `/api/v1` legacy gateway**. Its own raw JSON parser is limited to 8192 bytes, noncompressed UTF-8 JSON with bounded depth and duplicate-key rejection. It is not behind the existing legacy API-key middleware: it has an independent, immutable asset-scoped device-Bearer credential. Unknown fields and inferred/ref/synthetic measurements are rejected, not relabelled.

`LOCAL_PILOT_ENABLED` must be absent or not exactly `true` until reviewed schema + native authentication acceptance are approved. Enabling the flag never runs migrations or connects hardware. Status reports `physicalAcceptance: not_established` independently of the flag. Production remains the existing Render release until a separately approved controlled exact-source Render release; no alternative production host is part of this design.

## Before representing a real pack

Owner and qualified operator must confirm intact external-condition/serial match, documented chemistry/ratings, approved external interface, decoder revision, current sign convention, consent, risk assessment, procedure revision, bounded observation duration and safe stop/emergency method. Unknown or conflicting critical facts mean hold. No generic CAN pinouts/register maps, universal protective limits, contactor/reset/charge/discharge commands or hardware probing are supplied. A documented interface-specific capture adapter is still needed; this file sender does not read CAN, Modbus, Bluetooth or any physical battery. Use maintained ecosystem libraries (existing Express/Zod/Drizzle/PostgreSQL and Python Requests) rather than a guessed vendor cloud or automatic gateway main loop. Adapter and dependency-version acceptance remain separate gates.

The accepted reading min/max envelope is supplied by the qualified operator from pack documentation and the approved procedure. It validates ingestion plausibility; it is **not a protective cutoff or safe operating instruction**. No automatic paging, notification, lifecycle update, control action, simulation or AI/SOH inference follows from a reading.

## Asset JSON for the operator page / `pilot.createAsset`

This is a **template, not executable physical evidence**. Replace all placeholders with source-supported values; replace numeric placeholders with actual JSON numbers. Do not submit a fixture as a physical asset. Optional manufacturer/model can be omitted if unknown. Unsupported material/carbon/official fields remain absent or null; no issuer is minted.

```json
{
  "manufacturerSerial": "<exact intact-pack manufacturer serial; preserve case/spacing>",
  "chemistry": "<documented chemistry>",
  "nominalVoltage": {"value": "<actual numeric rated voltage>", "unit": "V"},
  "ratedCapacity": {"value": "<actual numeric rated capacity>", "unit": "Ah"},
  "specificationEvidence": "<restricted source/evidence reference>",
  "specificationRevision": "<supplier specification revision>",
  "interfaceDescription": "<approved external BMS interface; no inferred pinout>",
  "interfaceRevision": "<documented interface/map revision>",
  "procedureRevision": "<approved operator procedure revision>",
  "currentSignConvention": "<documented sign convention>",
  "units": {"vPack": "V", "iPack": "A", "tPack": "degC", "socReported": "%"},
  "acceptedReadingEnvelope": {
    "vPack": {"min": "<approved numeric min>", "max": "<approved numeric max>"}
  },
  "ownerAttestation": {"consent": true, "attestedAt": "<actual ISO8601 with timezone>", "evidenceReference": "<restricted consent reference>"},
  "provenance": {"source": "physical-label-and-owner-attestation", "observedAt": "<actual ISO8601 with timezone>", "evidenceReference": "<restricted physical-label observation reference>"}
}
```

`ratedCapacity.unit` accepts `Ah` or `kWh` without conversion/inference. Optional envelopes are `iPack` (A), `tPack` (degC), `socReported` (%); define one min/max pair for every supplied reading metric, never guess missing limits. The profile fixes supported units explicitly. SOC is a **BMS-reported estimate**, not calibrated reference SOC/SOH. Nominal ratings are sourced specifications, not measured readings. The server fixes `namespace: LOCAL_PILOT`, `version: local-pilot-asset/1`, a generated local `assetRef`, the native owner, and `officialBpan: null`, `officialAllocationStatus: null`, `officialVerification: unverified`. Physical observations/consent are also separately persisted in append-only provenance. Official registration is intentionally not supported by this route; the supplied BPAN guideline is draft, 21 characters, not evidence of issuer allocation.

In the UI select the returned asset, enter a documented device name and capture/decoder revision, then provision. `pilot.provisionDevice` input is `{assetRef, name, captureRevision}`. Its return is `{device, token}` with the actual device UUID/ID. A cryptographic 256-bit `lp1_` token is returned only in this authenticated provisioning result and shown once. Store it privately, copy only to an approved secret environment and hide it. Lists/revoke never select or return credential hashes or plaintext tokens. Revocation is permanent for that device. Provision a distinct reviewed device if needed; mapping cannot be edited. Old readings are retained and heartbeat cannot reactivate a revoked device.

## Actual reading REST contract

After integration/approval, the path is:

```text
POST /api/v1/pilot/assets/<actual local assetRef UUID>/readings
Authorization: Bearer <once-issued lp1_ token>
Content-Type: application/json
```

Do not use a native login JWT, OAuth token, legacy API key, MQTT password, X-Device-Token or an official/legacy BPAN alias here. Asset identity is only in the path and authenticated immutable device mapping. Payload example placeholders must be replaced by **actual captured data**, not random/example voltages:

```json
{
  "sampleId": "<UUID assigned once at capture and reused on retry>",
  "recordedAt": "<actual captured ISO8601 time with timezone>",
  "source": "BMS_REPORTED",
  "captureRevision": "<exact provisioned decoder/capture revision>",
  "metrics": {"vPack": "<actual finite numeric BMS-reported pack voltage>"},
  "units": {"vPack": "V"}
}
```

Only actual supplied BMS-reported metrics are included. Zero is preserved; absent readings are unknown, never filled with defaults. Every metric must have its exact matching unit and approved envelope. Optional current/temperature/SOC are kept explicitly BMS-reported, not calibrated reference, simulated or derived measured data. Source class is a declaration with capture evidence, **not proof that a token holder really connected a physical pack**. Reference comparisons belong in a separate signed local observation worksheet, not this endpoint.

New samples must be no more than 5 minutes old or 30 seconds future at server transaction time. Clock/source checks and owner/device binding are rechecked while locked. The transaction locks device then asset, checks revocation, profile and decoder, inserts reading and active-only heartbeat, and returns only after commit. A successful new receipt is `201 {readingId: <actual positive integer>, assetRef, sampleId, duplicate:false}`. Exact retry is `200` with the original ID and `duplicate:true` even if later stale (no new sample/heartbeat); same UUID with a different payload or device returns `409 pilot_sample_payload_conflict`. Revoked/wrong tokens are `401`; malformed JSON/types/fields/units `400`; media `415`; bytes `413`; freshness/envelope/revision `422`; disabled/unavailable/unconfirmed persistence `503`. No unpersisted fake receipt is returned. Retain exact sample UUID, capture time and payload on retries.

## Finite capture-file validation and explicit later sending

The operator creates a consented finite JSONL capture through a separately approved read-only external interface. Retain raw original capture separately, its decoder version and timestamps. This script does **not** acquire hardware data or automatically publish it. Create a local validation-profile file from the persisted approved profile and issued device revision:

```json
{
  "assetRef": "<actual assetRef UUID>",
  "captureRevision": "<exact provisioned capture revision>",
  "units": {"vPack":"V","iPack":"A","tPack":"degC","socReported":"%"},
  "acceptedReadingEnvelope": {"vPack":{"min":"<approved numeric min>","max":"<approved numeric max>"}}
}
```

Use the gateway environment's reviewed locked Requests installation; no installs or downloads were performed by this implementation. Run from the repository root with actual local files:

```bash
python3 -B gateway/python-agent/pilot_replay.py \
  --capture /approved/local/capture.jsonl --profile /approved/local/profile.json \
  --max-samples 20 --max-seconds 30
```

Default is offline dry-run, with **zero DNS/HTTP/hardware traffic**. No token or origin is needed. For archived captures only, add `--allow-stale-dry-run`; this relaxes stale validation offline and never rewrites timestamps or enables sending. Future timestamps are still rejected. File size <=8 MiB, JSONL sample <=8192 bytes, max samples 1–1000 and max duration 1–300 seconds; failures stop rather than silently skipping/truncating. All samples are locally validated before any send. There is no retry/main loop, hardware probe, broker, implicit simulator, notification or replay-buffer mutation.

Only after explicit approved HTTPS transmission and released API acceptance, place the once-issued token privately in `LOCAL_PILOT_DEVICE_TOKEN` (not shell command arguments/history). An interactive terminal can use a hidden prompt without printing the secret:

```bash
read -rsp 'Approved device token: ' LOCAL_PILOT_DEVICE_TOKEN; printf '\n'
export LOCAL_PILOT_DEVICE_TOKEN
python3 -B gateway/python-agent/pilot_replay.py \
  --capture /approved/local/fresh-capture.jsonl --profile /approved/local/profile.json \
  --max-samples 20 --max-seconds 30 --send \
  --origin https://APPROVED_RENDER_CUSTOM_DOMAIN \
  --approved-origin https://APPROVED_RENDER_CUSTOM_DOMAIN
unset LOCAL_PILOT_DEVICE_TOKEN
```

Replace both uppercase origin placeholders with the **same explicitly approved lowercase canonical public HTTPS origin**. There is no hard-coded production sender destination. HTTPS verification is always on, redirects/compressed capture and implicit proxy/netrc/CA overrides are off, private/loopback/link-local DNS targets are rejected. Errors do not log token, URL, raw capture or response contents. Output is only bounded counts/mode/acceptance state. The duration limit is checked between operations and while streaming receipts; blocked OS DNS/TLS/read calls may take their underlying resolver/network timeout, so this is not a hard real-time safety timer. Public DNS is checked before Requests resolves the hostname; DNS-rebinding prevention against an actively malicious approved origin remains an integration threat-model gate. Do not approve untrusted origins. No HTTP call was made in the development/offline tests.

## Explicit isolated PostgreSQL test gate

`scripts/local-pilot-qa.ts` is **not** a general migration runner. It has no production URL fallback, embedded password or env-file loading. It requires `QA_LOCAL=1`, an explicitly approved mode-0600 caller-owned `LOCAL_PILOT_QA_CREDENTIAL_FILE` containing solely a PostgreSQL URL for exact `127.0.0.1:5432/circulair_qa` with existing dedicated credentials, no query/fragment, two distinct approved positive QA fixture IDs and the corrected exact SQL SHA256. It checks actual server/database identity, creates a fresh random `qa_pilot_*` schema with no `public` fallback, copies only `public.users` structure and creates two labelled synthetic namespace users. The exact migration, foreign keys and trigger functions bind to that private namespace. It never creates/resets public accounts, edits customer rows, prints credentials or deletes existing namespaces. It retains only its new labelled synthetic namespace fixtures and verifies the public relation/function catalog fingerprint is unchanged. Do not invent credentials or reset existing accounts.

```bash
QA_LOCAL=1 \
LOCAL_PILOT_QA_CREDENTIAL_FILE=/explicitly/approved/local-qa-url-file \
LOCAL_PILOT_QA_OWNER_A=<approved_existing_fixture_id> \
LOCAL_PILOT_QA_OWNER_B=<different_approved_existing_fixture_id> \
LOCAL_PILOT_QA_SQL_SHA256=edff6d0267a8b38d4f47f3c08f03d57589a989260587d41812e6482735745a3e \
./node_modules/.bin/tsx scripts/local-pilot-qa.ts
```

Without those approved inputs it stops before any connection. Actual TypeScript and compiled-ESM executions each passed 15 real PostgreSQL acceptance groups. These cover native router/store persistence, owner-versus-foreign-admin denial, credential redaction, zeros versus missing metrics, positive committed receipts, duplicate/conflict concurrency, both observed revocation lock orderings, immutable mappings/append-only rows, foreign keys, strict JSON and declared/chunked 8192/8193-byte limits. Each final namespace contained two assets, two provenance rows, three devices, eight committed readings and three permanently revoked devices. The synthetic wire source follows the contract but does not establish physical provenance. Loopback API acceptance is not an approved-origin HTTPS or live pack test.

## Still not accepted

Production additive SQL migration, controlled exact-source Render release, the new pilot's native logged-in browser journey and approved-origin HTTPS/API acceptance remain open. The exact frozen pnpm dependency graph, source compilation and clean app/worker build passed locally; this is not GitHub CI or Render deployment acceptance. Physical interface adapter/procedure, chemistry/ratings/condition/limits, qualified operator/owner sign-off, first actual finite BMS captures and calibrated reference comparisons remain separate. Official BPAN notification/allocation/enrollment and safety/SOH/certification are unresolved. No 100%, every-gate-closed, always-available or actual-connection claim is made.
