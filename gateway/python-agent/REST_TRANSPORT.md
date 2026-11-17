# Battery connection pilot: read-only gateway and REST boundary

**18 November 2026 — preparation only. No battery, broker, application API or production database was contacted.** This is not a hardware-installation or safety certificate. The deployed source remains the parent's verified release `122e209b52cdcd01f55690363193d7a09659e0c2`; these new local repairs have not been deployed.

## What can run safely now

From the repository root, run only these finite offline tests; they do not install dependencies, listen on a port, start the application or call a device:

```sh
cd /home/ubuntu/circulair-platform
env -i PATH="$PATH" HOME=/home/ubuntu NODE_ENV=test \
  ./node_modules/.bin/vitest run \
  server/mqttSubscriber.test.ts server/deviceProvisioning.test.ts \
  server/deviceIngestionBoundary.test.ts server/deviceRestBoundary.test.ts \
  --maxWorkers=1 --minWorkers=1
env -i PATH="$PATH" HOME=/home/ubuntu \
  python3 -B -m unittest discover -s gateway/python-agent \
  -p 'test_rest_transport.py' -v
```

Python tests import the real agent under a non-main name, replace Requests, MQTT and Modbus with inert doubles, and guard sockets/DNS. They preserve HTTPS validation and explicitly test zero/unknown separation, strict identity, unsupported estimate rejection and sanitized failures. They are not physical battery tests. Do **not** run `circul_air_host_agent.py`'s main loop as a starter command.

## Open-source route, without proprietary fleet or cloud coupling

Reuse the repository's existing **PyModbus** for a documented read-only Modbus interface, **Requests** for an approved local HTTPS read interface, and **Paho MQTT** only after broker authentication/ACL gates. These are existing source dependencies, not newly installed packages. A supported manufacturer/operator export can also be examined offline with Python's standard CSV tools. This selection is based on existing repository interfaces, not a comparative claim of universal superiority.

There is no verified CAN reader in the inspected gateway files. If the approved interface is CAN, a separately reviewed SocketCAN/python-can adapter and authorized signal definition/DBC are required; do not invent IDs, scaling or transmit frames. No CAN package was installed or hardware interface configured here. Legacy hardcoded register maps are examples, not accepted physical profiles. The agent's operational main loop is unconditionally disabled; no environment approval flag bypasses missing provisioning and ingestion receipt. Do not open a pack, prescribe wiring, alter protective functions, charge/discharge it, or select electrical settings from this document.

## Hardware/profile facts required before a physical connection

Obtain the owner's consent and a qualified operator's approval; identify the physical battery serial/asset tag, exact registry BPAN and owner ID, and the individual gateway/device ID. Confirm interface type and the operator-approved read-only access method. For Modbus, supply the actual address/unit identifier, supported read function, approved register map, byte/word order, signedness, scale factors, invalid/sentinel values, units and permitted sampling rate. For HTTPS, supply the final trusted URL, expected certificate identity/CA, authentication method and documented response fields. For CAN, supply authorized receive-only configuration and signal definitions.

A signed/versioned physical profile must define permissible **measurement acceptance ranges**, sensor positions, calibration/uncertainty, current sign convention, timestamp origin, clock synchronization, maximum reading age and missing-value semantics. These data-quality envelopes are not safety cutoffs; no numerical operating envelope is prescribed here. Capture firmware/interface versions and evidence references. Obtain local retention/privacy approval and a stop/escalation plan from the responsible operator. Never record tokens/passwords in the evidence bundle.

## Server/provisioning sequence — not yet executable end to end

1. Review and reconcile `/home/ubuntu/boundary-remediation/2026-11-18/devices-routers.v4a.patch` and `devices-db.v4a.patch` with other central changes. They are exact **unapplied** V4A proposals. The router proposal owner-scopes list/get/stats, projects credentials out of SQL, disables unimplemented registration/change/rotation/delete and gates broker management to admins. The DB proposal makes heartbeat timestamp-only for an already active individual device; BPAN-wide heartbeat becomes a no-op. Existing customers/devices are retained. Until these patches are reviewed and released, old central routes remain vulnerable; UI disablement alone is not backend authorization.
2. Implement an additive persisted device ↔ exact battery/owner ↔ API-key ↔ approved hardware-profile mapping with uniqueness/foreign keys and explicit provisioning approval. Existing `pending` records are not accepted mappings. Protect any recoverable broker secret; routine reads must never expose it. Create no account or rotate/revoke credentials during this task. An authorized administrator must perform future provisioning through a separately reviewed process, not current disabled UI controls.
3. Implement the `VerifiedRestIngestAdapter` in `server/deviceIngestionBoundary.ts`. Its resolution must read persisted mapping, not trust `deviceId` supplied by the request. Its commit must recheck active API key/device/ownership/profile in **one transaction**, preserve reading identity/time/provenance, return the actual positive reading ID, and heartbeat only that still-active device without changing status. Key/device revocation races and tenant transfer must fail closed. Add an idempotency/receipt design before any replay; automatic buffer replay is currently disabled and old buffer files are not deleted.
4. Review additive schema/migration design for provenance, measured-vs-estimated flags, device ID, raw/normalized fields, recorded/received timestamps, profile version and correlation/reading ID. No migration is supplied or applied here. SOC/SOH estimates and unsupported fields/aliases are rejected by the current strict ingest contract instead of silently lost. Do not label upstream estimates as measured. Cross-ingest alert rules and pack/cell units require separate verification before using alerts for decisions.
5. A future owner-scoped API key must have `telemetry:write` (and `telemetry:read` only if required), `active` status and expiry. REST auth is **`Authorization: Bearer <cai_... API key>`**, not `X-Device-Token`, native login JWT or MQTT password. Never put the key in a URL, command history, logs, screenshots or customer email. Existing developer-portal permission names differ; reconcile them explicitly rather than treating any key as ingest-enabled.
6. For MQTT, configure one approved TLS broker destination server-side (`mqtts`/`wss`, certificate verification on, no userinfo/query credentials), then provision a per-device principal and exact ACL. Future topic shape is `<prefix>/<exact-BPAN>/<deviceId>`. Prove topic, payload and authenticated publisher identity binding, rotation/revocation denial, and that a publisher cannot impersonate a different device. A standard subscriber does not receive authenticated publisher identity; topic/payload agreement alone is insufficient. MQTT operational ingestion and startup are **closed** until that proof and atomic adapter exist.
7. Perform staging two-owner negative tests, expired/revoked key/device tests, heartbeat-after-revocation, forged BPAN/device/topic, stale/future dates, NaN/fractional cycles, min/max inversion, explicit zero and missing metrics. Only then approve a controlled release and separately authorize the physical pilot. AutoDeploy and paging remain unchanged by this task.

## Exact future REST payload/path — specification, not a successful connection

`POST /api/v1/batteries/<exact-registered-BPAN>/telemetry`, Content-Type `application/json`, Bearer API key as above. The body BPAN must exactly match the path; never truncate 21-character BPANs. A 19-character legacy syntax is accepted only if it resolves to a real authorized record.

```json
{
  "bpan": "<EXACT_REGISTERED_BPAN>",
  "deviceId": "<PROVISIONED_DEVICE_ID>",
  "recordedAt": "<ACTUAL_ISO_8601_TIME_WITH_OFFSET>",
  "source": "measured",
  "vPack": "<NUMERIC_MEASURED_VALUE_NOT_A_STRING>"
}
```

The placeholders are intentionally **not executable JSON telemetry**; replace them only with genuine values from the approved profile. Supported numeric fields are `vPack` (V), `iPack` (A with documented sign), `vMin/vMax` (cell V), `tPack/tMax` (°C), `irPack` (mΩ), `cycleCount` (nonnegative integer); bounded DTC strings are optional. At least one reading is required. Omit unknown values; numeric zero is not unknown. Arbitrary `batteryId`, inferred fields, SOC/SOH estimates and demo/test/simulation labels are rejected. Acceptance additionally requires a range for **every provided metric** in the approved profile and a fresh timestamp (initial implementation: at most five minutes old or thirty seconds future; revisit against the approved clock policy). Broad storage bounds are not physical operating recommendations.

Today a malformed/unsupported payload returns `400`; a correctly shaped request with an authorized scope still returns `503 verified_device_ingestion_unavailable` because no persisted adapter is installed. MQTT creates no operational reading, alert, heartbeat, lifecycle transition or broadcast. A future `201` must include `persisted: true` and the actual positive `readingId`; broker queue acknowledgement must never be presented as that receipt. The host agent currently normalizes approved source reads for the contract but does **not** implement platform REST submission; add a separately tested HTTPS sender after mapping/provenance gates, rather than assuming this document added it.

## A few local battery tests after the gates — operator-controlled, not performed

For a first consenting asset, use only its already approved external read interface. The qualified operator should (1) record physical serial/BPAN/device mapping and compare one passive snapshot with the host's displayed/exported values, preserving uncertainty and unknowns; (2) collect a small bounded set of passive snapshots at the approved rate to verify units, timestamps and loss/reconnect behavior without imposing charge/discharge activity; (3) disconnect the data path and verify no false success/heartbeat or stale replay, then test staging revocation with inert fixtures before reauthorizing it. Confirm exact persisted reading IDs and source/profile evidence for each accepted snapshot. Stop on identity mismatch, invalid/out-of-envelope data, authentication failure, operator concern or unavailable receipt. Do not interpret these checks as capacity, cycle-life, SOH accuracy or battery-safety certification.

## HTTPS transport preserved

`HOST_API_URL` has no fallback. The source-reader validates the absolute final HTTPS URL without DNS before requesting; only literal `localhost`, `127.0.0.1` and `[::1]` have the local simulator HTTP exception. Non-loopback HTTP, URL userinfo/fragments, malformed authorities/ports, whitespace/control/backslash input and invalid escapes are refused. Requests keep `verify=True`, `allow_redirects=False`, `timeout=10`; every 300–399 response is rejected. Errors exclude URLs, tokens, upstream bodies and traceback. HTTPS is operator-configured, not a general SSRF allowlist; no response-size cap or strict total wall-clock deadline has been added. The 10-second timeout is a connect/read inactivity timeout. Credential/privacy and resource limits for all future readers/transports remain review gates.
