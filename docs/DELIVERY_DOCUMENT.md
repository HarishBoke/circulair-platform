# Circul-AI-r Platform — Delivery and Handoff Document

**Version:** 4.0 — bounded all-user delivery record
**Document date:** 18 November 2026
**Audience:** All stakeholder users, product, engineering, security, hardware and operations owners
**Application:** https://circulair.energy
**Status:** Existing release live; candidate unreleased, source publication separately dated; no broad launch or physical-pilot sign-off

## 1. What This Handoff Delivers

This document delivers an implementation/navigation inventory, dated evidence summary, ownership expectations and practical acceptance steps. It does not certify complete functionality, security, compliance, model accuracy or availability. Historical route/table/procedure totals and July module PASS assertions are not current acceptance evidence. An unavailable action is an intentional boundary, not a completed payment, export, training, dispatch or hardware workflow.

The application runs standalone on Render with native email/password/JWT authentication and managed PostgreSQL. It is not dependent on an agent runtime, development sandbox or agent scheduler for production operation. The selected operations alternative is an all-Render open-source stack: Uptime Kuma, ntfy, private Alertmanager, a restricted Caddy publisher gateway and a durable application incident worker. Existing external adapters are inventory only until separately accepted.

No production configuration, credentials, accounts, customer rows, SQL, resources or deployment were changed by this documentation refresh. All **new remediation remains an unreleased candidate; source publication status is recorded separately in dated delivery evidence**. No new production pilot/incident SQL or new monitoring resource has been applied or created.

### 1.1 Current production identity

| Item | Verified or previously recorded fact | Not established |
|---|---|---|
| Live release | **`122e209b`** / full commit `122e209b52cdcd01f55690363193d7a09659e0c2`; deployment **`dep-dbua7eui0phs7397qbng`**, latest read-only settings verification **17 November 2026, 23:09:40 UTC**, **Set 5k / Standard / Oregon / main**, service **`srv-d87hoqcm0tmc739tv580`** | New local changes are not this deployment. Older `54920faa` statements are superseded. No new production login, release, SQL, resource or payment inventory occurred. |
| Release control | Settings read **23:09:40 UTC**: **AutoDeploy Off / PR Previews Off** | No automatic rollout or zero-downtime guarantee. |
| Existing-user native session | Successful sign-in and same-origin check **200** at **19:17 UTC**; repeat **200** at **19:40 UTC** on 17 November. Valid role/dashboard present; password hash absent. | Reload/logout, recovery delivery and cross-tenant production checks pending. No account was created/reset; session secrets and customer rows were not recorded. |
| PostgreSQL | Replacement application login/connectivity previously verified; existing managed DB retained | All-client credential retirement, narrowed ingress and production transport review not closed. Old exposed DB credential remains valid/retained. |
| Backup | Protective logical export ready **17 November, 07:41 UTC** | Not evidenced as downloaded/restored. Recovery and rollback remain unproven. |
| Legacy outbox/PagerDuty | Earlier provider-specific additive outbox/table-index readiness recorded; PagerDuty remains disabled | Not generic incident migration or notification acceptance. Old provider rows remain intact; no historical replay. |

These are dated observations, not new live checks by this document. Historical readiness/rejection checks do not replace successful owned workflows or an availability measurement window.

### 1.2 Latest local evidence — separate from production

| Check | Current recorded result | Scope/limit |
|---|---|---|
| Exact toolchain | **Node 24.14.1**, **pnpm 10.34.5** | Earlier Node 22 or Node24-target-only findings are superseded for this final run. |
| Final full root regression | Started **17 November at 22:54:20 UTC**: **65 suites passed; 1,916 passed; 0 failed; 28 opt-in PostgreSQL cases skipped; 1,944 collected**; exit **0** | Isolated fixtures/doubles and permitted local loopback, not full provider/production/UAT acceptance. The 28 skips remain explicit. |
| Final typecheck | Exit **0** after narrow Home font fix | Compilation is not workflow acceptance. |
| Earlier exact sterile CI-default acceptance | Vitest **65 suites / 1,916 passed + 28 opt-in PG skipped**, typecheck **0**, normal frontend/server/**real incident-worker** build **0**, worker **8/8**, Python **50/50** | Accepted before final font correction. Large-chunk/peer/deprecation warnings remain; not hosted GitHub CI or a released build. |
| Final exact CI-equivalent acceptance | Completed **23:12 UTC**: default Vitest **65 / 1,916 + 28 opt-in PG skips / 1,944**, typecheck **0**, normal build **0**, worker **8/8**, Python compile **0**, offline Python **50/50** | Sterile 454-file final application/infra snapshot, all `.env` filenames omitted; six command exits **0**. Local checks are not hosted GitHub CI. |
| Local pilot PostgreSQL | **15 acceptance groups each** in actual TSX and compiled ESM execution | Real private-QA store/native RPC/loopback REST, synthetic assets/readings only. |
| Incident PostgreSQL | Earlier isolated module acceptance **123/123**, including **28 real PostgreSQL cases** and mocked delivery; later mounted integration **47 local cases** | The final full root run did not repeat those 28 real-PG cases. Mounted integration uses controlled DB leaves; no phone delivery. |
| Monitoring native / affected containers | Native **9/9**; final affected Kuma/gateway **105/105** (**97 + 8 gateway restart**), completed **23:04:33 UTC** | Completed bounded local image/native acceptance; ntfy/Alertmanager retain prior positives, not fresh strict capability proof. Render disk/memory/readiness and receiver acceptance pending. |
| Remaining-copy focused check | **83/83** across public-copy and health-observation suites | Actual-page mocks/structural checks, not combined browser acceptance. |
| Fresh browser/HTTP | Chromium **178/178**, started **22:55:03 UTC**; focused **18/18**, started **22:54:22 UTC**; Getting Started **4/4**; HTTP **14/14** | One worker, no retries/skips/flaky cases; fresh guarded server per suite, unchanged rate budget, no MCP/CDP/existing-browser reuse. Mostly auth gates, not all-business-positive or iPhone/Safari acceptance. Owned servers stopped exit **0**, port **3001** closed. |
| GitHub CI | Configured locally; hosted run not started at document preparation | Local checks do not establish hosted CI; verify the exact candidate run before release. Source publication/hosted-run status is separately dated delivery evidence. |

The dependency manifest/workspace/lock were adopted together locally and frozen-installed. Their matched audit remains **42 full-graph occurrences (3 critical, 14 high, 20 moderate, 5 low)** and **16 production-scope occurrences (0 critical, 8 high, 5 moderate, 3 low)**. This is not a new audit of the installed production tree. Strix **NOT RUN**; no full penetration test or security certification is asserted.

Final selected Semgrep completed **17 November at 23:08:48 UTC**, exit **0**: **294 rules / 451 targets / 10 flags / 12 parser/error entries / approximately 99.9% parsed**. The ten operator-controlled monitoring-QA subprocess flags remain auditable and unsuppressed. Preserve initial **20:38 UTC, 449 targets / 14 flags / 13 errors** and post-hardening **21:02 UTC, 451 targets / 10 flags / 12 errors**; four explicit-USER flags were removed by the actual image changes, not waived.

The Home heading keeps its words at responsive font sizes **24 / 30 / 36 / 48 px**, fixing **320 px viewport / 341 px scroll-width overflow**. Preserve pre-origin **16/18** and **175/178** (two hostile-Origin 500s, malformed-auth 429 under shared rate budget and overflow), post-origin **177/178** (only overflow), and the failed decorative-wrapper-only attempt. The narrow font fix then passed fresh **178/178**. Fresh synthetic legacy fixtures used **21 batteries plus one informational alert per bounded fresh owner**; these are explicitly not official generator output. Generator remains disabled **412**, decode is read-only/unverified and foreign reads **404**.

Final exact sterile CI-equivalent acceptance completed **23:12 UTC**, from a **454-file** snapshot including final Home font and both Dockerfiles with all `.env` filenames omitted: default Vitest configuration (no custom setup), started **23:09:37 UTC**, **65 suites / 1,916 passed / 0 failed / 28 opt-in PostgreSQL skipped / 1,944 collected**, **61.63 seconds**; typecheck **0**, normal frontend/server/real-worker build **0**, compiled worker **8/8**, Python compile **0**, offline Python **50/50**; **all six command exits 0**. The earlier **22:54:20 UTC** guarded root run is a distinct positive snapshot, not the default-CI proof. Local checks do not establish hosted CI; verify the exact candidate run before release. Hosted CI had not started at document preparation; later source publication and hosted-run status are separately dated delivery evidence.

## 2. People, Ownership and Access

The seven business groups are OEM/fleet owner, battery manufacturer, recycler, BESS developer/buyer, service provider, government/compliance reviewer and platform administrator. They are workflow categories, not evidence that every route implements a distinct permission set. Only server-derived native identity, approved ownership/assignment and explicit admin privilege may grant access.

| Responsibility | Owner to assign | Expected boundary |
|---|---|---|
| Product scope and public claims | Product owner | Maintain truthful implemented/unavailable/draft labels; approve the specific release scope. |
| Application contracts and regression | Engineering/release owner | Identify exact candidate, include new files, verify positive/negative workflows and retain warnings/failures. |
| Identity, privacy and security | Security/data owner | Review tenant/resource boundaries, exposure retirement, dependency decisions and restricted evidence. |
| Deployment and recovery | Operations owner | Correct Render workspace, budget, manual release, backup/restore, monitoring and rollback. |
| Physical asset and acquisition | Asset owner + qualified operator + safety lead | Consent, approved passive interface, documented envelope, calibrated references and stop procedure. |
| Compliance/methodology | Qualified reviewer | Assess draft units/scope/evidence; do not infer government/issuer approval. |
| Real-user acceptance | Research coordinator + consenting users | Safe isolated tasks, actual outcomes and consented feedback; no fictional sign-off. |

Current local battery/history/private helpers use current-owner or explicitly authorized admin context. Global alert rules and global analytics are admin-only. Ordinary users request rule changes rather than configure global rules. Local-pilot assets remain **owner-only even for foreign admins**. Reading an alert is not acknowledging or resolving an incident. Every alternative REST/MCP surface still requires accepted access scope; some actorless paths are deliberately unavailable.

No real-user interviews, quotes, scores, employer endorsements or acceptance signatures have been supplied. Use the [persona and consent protocol](USER_PERSONAS_AND_FEEDBACK.md), not fabricated reviewer identities.

## 3. Retained Architecture and Navigation Inventory

The retained stack is React 19, TypeScript, Tailwind CSS, shadcn/ui and wouter; Express/tRPC with bounded REST v1/MCP; Drizzle and Render PostgreSQL; Socket.IO/MQTT and direct storage/email/payment/maps/AI adapters. Provider presence and route existence are not delivery evidence. Historical entity lists are not current schema counts, migration reconciliation or production seed totals.

### 3.1 User-facing navigation

Routes below are source/navigation inventory, not a promise that every action is accepted on the live release. The new local pilot route is not yet live-ready.

| Area | Useful routes | Current local boundary / next acceptance |
|---|---|---|
| Authentication | `/login`, `/register`, `/forgot-password`, `/reset-password` | Existing-user production positive login recorded; new-source reload/logout/recovery and authorized QA registration remain to accept. |
| Overview | `/dashboard`, `/analytics`, `/health` | Returned values/error states retained; global analytics admin-only; no fabricated uptime/CO2/warranty KPI. Health is a PostgreSQL `SELECT 1`/provider-state snapshot, not uptime history. |
| Registry | `/batteries`, `/batteries/register`, `/batteries/:bpan`, `/onboarding` | Shared 19-/21-character reads, canonical IDs and current-owner repairs; official BPAN enrollment unverified. |
| Local pilot | `/local-battery-pilot` | Mounted native owner-only asset/profile/device/readings/revoke workflow in local source; defaults Off, unreleased. |
| IoT/telemetry | `/telemetry`, `/data-integration`, `/mqtt-flow-tester`, `/device-provisioning`, `/demo` | Broker UI read-only without anonymous quick-start forms; legacy operational ingestion/provisioning or synthetic operational writes unavailable. No verified hardware adapter. |
| Alerts | `/alerts`, `/alert-rules` | Owner alert views and admin global rules; no read-as-recovery behavior; live paging Off. |
| Estimates/advanced features | `/ai-soh`, `/digital-twin`, `/federated-learning`, `/autonomous-triage` | Deterministic estimates/scenarios uncalibrated; training, autonomous execution and triage approvals unavailable. |
| Marketplace | `/marketplace`, `/marketplace/create`, `/marketplace/:id`, `/marketplace/orders`, `/marketplace/payment-success` | Authorized/reference records only as permitted; money/settlement actions unavailable. Success-page navigation is not payment evidence. |
| Compliance | `/epr-compliance`, `/compliance`, `/carbon-accounting`, `/passport/EU/:localId` | Draft/self-declared information; private/public publication restricted. No official credit, filing or approved methodology. |
| Logistics/yield | `/logistics`, `/yield-verification` | Manual records and pending evidence; no actual carrier dispatch, physical processing or issued credit. |
| Warranty/service | `/warranty`, `/warranty/register`, `/warranty/check`, `/service-history` | Owner-scoped private records locally repaired; public customer lookup/unsupported claim UX unavailable, issuer acceptance open. |
| Administration | `/admin/users`, `/admin/system`, `/admin/feedback`, `/settings/platform` | Explicit admin access and audit required; errors are not fabricated empty success. |
| Documents/developer | `/documents`, `/developer-hub`, `/developer-portal`, `/api-reference`, `/mcp-server`, `/gateway-docs` | Historical catalogs/restricted APIs; unsupported private export/publication, SDK/download and actorless tools unavailable. |
| Help/public | `/wiki`, `/getting-started`, `/faq`, `/glossary`, `/`, `/how-it-works`, `/privacy`, `/terms`, `/coming-soon` | Reference material, not workflow approval; older legal/guide claims need owner review. |

### 3.2 Backend, data and integrations

Native routers cover auth, registry, telemetry, SOH, marketplace, logistics, EPR, warranty, alerts/rules, analytics, documents, wiki/feedback, administration, devices/MQTT, regulatory/settings, PDF, system, triage and tutorial. The local source additionally mounts **`pilot`** and admin-only **`incidents`**. Historical REST references include `/api/v1/batteries`, battery detail/telemetry/SOH, marketplace listings, EPR/warranty and `/api/docs`; endpoint presence does not certify accepted scope. The pilot has its separate `/api/v1/pilot` boundary before the legacy gateway and large global JSON parser. No current router/procedure/tool total is certified here.

Retained data areas include users, batteries, telemetry, predictions, listings/offers/photos, logistics, draft EPR/yield, alerts/rules, service history, documents/warranties, declarations/profiles/settings, device/auth/payment metadata and audit/tutorial/triage/onboarding records. Synthetic seed examples were removed as delivery counts. New pilot and generic-incident schemas are separate additive review artifacts, **not reconciled production migrations**. Customer/legacy records and old provider queue rows are retained.

| Component | Exact implemented local status | Unavailable/unverified |
|---|---|---|
| Native auth | Existing JWT/password contract, sanitized session DTO; bounded fresh browser checks passed | Production reload/logout, broader owner-positive and full tenant acceptance pending. |
| Registry/private records | Canonical IDs, current-owner SQL predicates; actor-scoped warranty/regulatory/document boundaries | Public private-data projections, ownership-transfer behavior and every alternative API not broadly certified. |
| MQTT/Socket.IO | Authentication/rejection and controlled validation/ownership restrictions; read-only broker presentation | Anonymous broker instructions removed; actual publisher identity, ACL/hardware and operational acquisition not accepted. |
| Numeric models | Carbon/unit and twin/SOH contract repairs; explicit zero/unknown and demo/not-assessed metadata | No calibrated model, official carbon methodology, safe control decision or validated forecasting error. |
| Blockchain/EPR | Local content hash; draft/pending evidence | No external anchoring, official credits or obligation fulfillment. |
| Payment/maps/email/storage/AI adapters | Historical direct adapter inventory and local fail-closed/renderer safeguards | Real settlement, inbox delivery, private storage/PDF renderer, carrier dispatch and generated AI/export acceptance pending or disabled. |
| Release | Environment-only PostgreSQL resolution; normal frontend/server/real-worker build; `.github/workflows/ci.yml` configured | Local checks do not establish hosted CI; verify the exact candidate run before release. No new controlled Render release. |

Warnings and failures are retained in evidence. Restricting unsupported paths is useful risk reduction but does not make the underlying product fully functional.

## 4. Physical-Pilot Delivery Boundary

### 4.1 Implemented owner workflow

The native `/local-battery-pilot` page uses the existing authenticated platform layout. Its methods create/list/get an owner's local asset, provision/list a device, return latest readings and revoke a device. `assetRef` is a UUID, not an invented official BPAN. Profile and consent/provenance insert together; legacy identifiers and customer battery rows are not rewritten. A foreign account, including a foreign admin, cannot bypass ownership.

The page returns an **`lp1_` token once** on device provisioning. Lists/revoke do not return plaintext or credential hashes. Credentials stay private. Mapping is immutable; revocation is permanent and cannot be undone by a heartbeat. Record/profile/reading retention is append-only within the reviewed pilot contract.

Readings use `POST /api/v1/pilot/assets/<assetRef>/readings` with the asset-scoped device Bearer token, not a native login JWT or old broker/API credential. Strict JSON is limited to **8,192 bytes**, checks units, profile envelope, capture revision, timestamps and source, preserves explicit zeros and omits unknown metrics. Receipts follow commit: **201** new reading, **200** exact duplicate with original ID, **409** changed/cross-device replay conflict, **401** wrong/foreign/revoked token. A missing persistence result is not success.

### 4.2 Actual software/database acceptance

Both actual TSX and compiled ESM runs passed **15 private-QA PostgreSQL groups**. They exercised the real store and native RPC, actual loopback REST, positive IDs/readback, two-owner denial including foreign admin, concurrent idempotency, both lock orderings of revocation, append-only/mapping/FK triggers, malformed JSON/UTF-8, exact 8,192-byte acceptance and 8,193-byte rejection, range/revision/time checks and zero versus omitted fields. These are genuine software/persistence results, not a mere connection guard or mocked SQL claim.

Current `drizzle/local-pilot.sql` SHA-256:

```text
edff6d0267a8b38d4f47f3c08f03d57589a989260587d41812e6482735745a3e
```

This corrected checksum supersedes `9f1643…0b86`; missing/null `payload.source` was explicitly rejected after a PostgreSQL nullable-CHECK correction. Approve the **corrected** CREATE-only artifact and target schema/ownership/grants/retention once; schema discovery or `db:push` is not a substitute. Existing tables/collisions require a reviewed forward migration, not a reset. **No new production pilot SQL has run.**

### 4.3 What is still missing

Every accepted sample was synthetic QA data. `BMS_REPORTED` remains a declaration, not verified physical acquisition; `physicalAcceptance` is **`not_established`**, official BPAN/allocation **unverified**, and defaults remain **Off**. No pack was connected, no genuine BMS capture was acquired and no calibrated reference comparison was performed. The pilot does not automatically page, infer SOH, change lifecycle or control hardware.

Use the [repository pilot guide](../gateway/python-agent/LOCAL_PILOT.md) for profile/token/reading and finite capture-file guidance. Its earlier central-mount and guard-only QA statements are superseded by this document; ask the release owner for the current controlled operator run sheet before using QA/migration commands. The default file validator is offline and finite; it is not a CAN/Modbus/Bluetooth capture adapter. Origin/TLS acceptance and actual sending require separate review. Keep genuine captures and signed comparison worksheets restricted, not in public Git.

Physical entry needs the actual owner's consent, qualified operator/safety lead, documented chemistry/ratings/condition/serial, passive interface and decoder, approved sample count/duration, units and pack-specific envelopes, calibrated instrument IDs/tolerances and emergency readiness. No generic pinout, charge/discharge instruction, universal cutoff or hazardous fault test is delivered. Stop on uncertain identity/interface, suspect asset, unexpected temperature/current, privacy exposure or unintended action.

## 5. Selected Open-Source Monitoring and Incidents

### 5.1 Exactly approved resources, not yet created

All five are **Oregon, one instance each**, with AutoDeploy Off. Compute/disk figures are the approved additional baseline, not a total invoice or new price check by this document.

| Name / component | Render type | CPU / RAM | Persistent disk | USD/month compute + disk |
|---|---|---|---|---:|
| `circulair-uptime` / Uptime Kuma | Web | 1 CPU / 2 GB | 1 GB `/app/data` | 25.00 + 0.25 = **25.25** |
| `circulair-notify` / ntfy | Web | 0.5 CPU / 512 MB | 1 GB `/var/lib/ntfy` | 7.00 + 0.25 = **7.25** |
| `circulair-alertmanager` | Private service | 0.5 CPU / 512 MB | 1 GB `/alertmanager` | 7.00 + 0.25 = **7.25** |
| `circulair-alert-gateway` / Caddy | Web | 0.5 CPU / 512 MB | None; Render edge TLS | **7.00** |
| `circulair-incident-worker` | Background worker | 0.5 CPU / 512 MB | None; existing PostgreSQL | **7.00** |
| **Approved additional baseline** | **Five instances** | | **Three 1 GB disks** | **53.75** |

Existing application/PostgreSQL/workspace charges, tax, metered usage and separately charged backup/maintenance are excluded. No new database, sixth service, automatic upsizing, extra disk, workspace increase, purchased domain or alternate hosting provider is authorized. **No resource has been created yet.** Creation approval does not authorize bootstrap, SQL, receiver installation, live activation, relay metadata disclosure or a test notification.

### 5.2 Durable application behavior now integrated locally

The new generic incident hook is integrated into the actual **same `createAlert` transaction**: insert alert, validate/enqueue eligible incident/delivery through that transaction and return the actual inserted alert. Persistence failure rolls back together. There is no network sender in that transaction, no in-request fire-and-forget and no historical backfill. Old PagerDuty data is neither deleted nor replayed/rerouted.

Native **admin-only `incidents.status`, `resolve`, `approveDestination`, `retryDeadLetter`, `releaseQuarantine`** are mounted locally. Default-Off admin status returns configuration-only information with zero DB commands; default-Off commands return sanitized **`CONFLICT`** before DB access. Anonymous/ordinary access is denied. Later gated access still rechecks persisted admin role; there is no disabled-mode review bypass.

Both incident delivery flags remain Off. Eligible enqueue requires an explicitly trusted, server-owned live acquisition context, ownership/provenance, activation and matching durable destination approval. **All current alert callers omit this context and remain nonpaging.** User JSON, a source label, HTTPS or pilot `BMS_REPORTED` does not establish verified live acquisition.

Versioned durable deliveries, leases/fences, refresh, accountable resolve, bounded retry/dead letters and destination quarantine are implemented/tested locally. Reading/acknowledging an app alert or silencing Alertmanager does not prove recovery. Ambiguous remote sends can require continuing explicit resolution repair; no exactly-once delivery, guaranteed remote ordering or physical-recovery claim is made. The generic incident CREATE-only SQL remains separately reviewed, **not applied in production**.

The **real worker**, not a sleeping placeholder, is now produced by the normal local build at `infra/monitoring/worker/dist/incident-worker.mjs`. Default execution is one finite cycle. An approved but delivery-disabled daemon uses a **15-second** idle loop, performs no DB work and exits gracefully on SIGTERM. Current build/runtime evidence supersedes earlier guide statements that the normal build omitted the worker. Runtime configuration is a startup snapshot; changes require reviewed restart. Disabled creation is not activation or permission to attach production DB credentials.

### 5.3 Service, phone and outage limitations

Pinned infrastructure/native checks passed **9/9**; final affected local Kuma/gateway acceptance completed **105/105** (**97 + 8 gateway restart**). Kuma's root-owned sudo **4755 → 755** prevents the optional NSCD root daemon while retaining container flag **`1`**, upstream code, sudoers and general-settings DB. Only unused Caddy **`cap_net_bind_service=p`** was removed from both binaries with existing build-time `setcap -r` and mode-755 guards; exact pins and entrypoints remained, one new build each. Kuma **UID 1000** and gateway **UID 65534** descendants had **CapPrm/CapEff/CapInh/CapAmb = 0** across **19** startup/restart/post-auth snapshots including pre-QA-exec checks; **CapBnd is not zero**, and this is not an all-OS escalation audit.

Kuma's native SQLite, Basic/socket/setup/admin login persistence, readiness **503 → 200**, `/livez`, **PORT 10000**, four exit-78 guards, sudo denial and SIGTERM exit 0 passed. Gateway fixed-path authenticated **2,048-byte** acceptance, header stripping/query clearing, oversize 413, anonymous 401, unframed/chunked 411 and restart passed against loopback only. ntfy/Alertmanager were unchanged, not rebuilt/retested for new strict granted-capability proof; they retain prior bootstrap/ACL/persistence/health positives. UI/admin remain private. Render disk ownership, deployed readiness, actual memory limits, restore and provider acceptance remain pending; local cgroups were disabled, so no 2 GB enforcement is claimed.

Monitoring history stays separate: initial **109 = 106 pass / 3 fail**, sudo raw **92 = 80 pass / 12 fail**, new preflight **8 = 7 pass / 1 wrong-tag QA-oracle fail** with mount exit **125** interruption, new raw **113 = 112 pass / 1 fail**. No cumulative-all-passed claim. Final cleanup verified **66 private files 0600 / 8 directories 0700 / env 0600**, no owned containers/mapped application-UID processes; new-evidence secret scan **181 files / 72 candidates / 0 matches**. No resources were created.

The installed candidate receiver is **Off**, not a working ntfy publisher. Never enable producers against an Off receiver merely because Alertmanager accepts HTTP. Receiver/template adoption, live acquisition, destination, paging and actual recipient tests remain separate approvals.

Instant iPhone wake-up may require a separate consented **`ntfy.sh` relay / APNs / Firebase** path exposing hashed-topic, message-ID and timing metadata. Relay consent is not supplied. No actual phone paging or human acknowledgement occurred. Record HTTP acceptance, server processing, phone display, responder acknowledgement and genuine recovery as separate outcomes.

Kuma is separate from the app/DB process, but every hosted component shares Render's provider-wide blind spot and single-instance pilot limits. No external cloud service is being silently added. A health snapshot, lost refresh or watchdog timeout is not verified physical recovery; uptime percentages require a defined measurement window, exclusions and gaps.

Use the [monitoring operator guide](../infra/monitoring/README.md), [open-source incident guide](OPEN_SOURCE_ALERTING.md) and [separate monitoring Blueprint](../render.monitoring.yaml) as review material, **not permission to apply**. Earlier worker/mount proposals in these guides are superseded locally; receiver/activation and operational gates remain intact. The [PagerDuty runbook](PAGERDUTY_RUNBOOK.md) is legacy reference, not the selected rollout path.

## 6. All-User and Operator Acceptance Checklist

This is a **step-by-step plan, not a completed ledger or new authorization**. Use an approved isolated staging/QA environment with synthetic data for mutations; production checks require a separately approved narrow scope and existing-user participation. Assign an owner and record **Pass / Fail / Blocked / Not run**, expected/actual result, UTC time, exact source/deployment, device/provider mode and sanitized evidence for each step. Never mark an unavailable workflow functionally passed.

### A. Before any user session — release owner and facilitator

- [ ] Identify the candidate separately from live `122e209b`; retain new files, exact dependency graph and matching test/build records. No push/deploy is implied.
- [ ] Agree each user's task, role and owned synthetic records; use an explicitly authorized admin fixture where needed. No first-user auto-promotion, production seed, password reset or impersonation.
- [ ] Explain unavailable/draft/uncalibrated features and keep money, providers, hardware, paging and customer-data export Off unless separately authorized.
- [ ] Obtain voluntary participation/notes consent and specific retention dates. Recording/quotes/recontact require separate consent; credentials never enter shared evidence.

### B. Every user — native access and ownership

- [ ] Sign in through the native flow; verify expected role/dashboard and a sanitized session response without password hash. Record the actual positive result, not only rejection checks.
- [ ] Reload and revisit an agreed protected page; verify genuine session continuation and loading/error states.
- [ ] Read the user's own approved records and verify exact IDs, returned values, explicit zero and unknown/missing values. Empty or errored responses must not imply health or success.
- [ ] In the approved two-account test, attempt a known foreign synthetic resource and verify uniform denial/no private fields, including alternate API surfaces. Do not inspect real foreign customer records.
- [ ] Sign out; verify the prior session no longer grants protected access. Production reload/logout/cross-tenant steps remain pending until separately executed.
- [ ] Test recovery only with an approved isolated recipient/action; generic API response is not inbox delivery. Record provider outcome separately.

### C. Role-specific tasks — only implemented, approved scope

- [ ] OEM/manufacturer: create/read a small approved synthetic asset and source-supported profile; preserve exact serial/aliases and state that official BPAN is unverified. Test canonical ID and owner-positive/foreign-negative results.
- [ ] Service user: read assigned/owned history and alerts; request global rule changes from an admin. No broker configuration, device commissioning or automatic physical action.
- [ ] Recycler/reviewer: reconcile authorized draft intake/yield/report fields, organization/period and units. Record missing evidence; do not treat hash/status/token as issued credit or filing.
- [ ] Buyer/BESS user: compare authorized candidate information without checkout, reservation or payment. Money and settlement acceptance remain blocked, not simulated success.
- [ ] Warranty/declaration user: verify scoped positive records and denied foreign access, dates/terms/zero values and draft/pending status; unsupported public lookup/issuer/export paths stay unavailable.
- [ ] Admin: verify ordinary-user denial and approved admin-positive global rule/analytics behavior in QA; verify errors/retry and audit. Admin must not bypass pilot asset ownership.
- [ ] Any user: inspect estimate, blockchain and health labels; confirm uncalibrated/content-hash-only/current-snapshot states and no fabricated uptime, credits or auto-dispatch.
- [ ] Record actual usability, device/accessibility barriers, elapsed task time, assistance and blockers; do not invent feedback or aggregate absent ratings.

### D. Local pilot — operator and asset owner, after software approvals

- [ ] Review the corrected SQL checksum, actual target schema/FKs/grants, name collisions, retention and irreversible revocation. Obtain distinct migration/enablement authorization; no `db:push`, legacy reset or production fixture copy.
- [ ] Verify default-Off behavior before DB work; review the 15-group TSX and ESM records and run any required current candidate acceptance in the approved private QA namespace only.
- [ ] In approved QA, use native owner-positive create/list/profile/provision/read/revoke; verify foreign-admin denial and once-only token visibility without logging its value.
- [ ] Verify 201/200/409/401 receipts, readback/concurrency, exact JSON limit, units/zeros/time/revision, append-only triggers and both revocation orderings. These are software checks, not hardware approval.
- [ ] Before a genuine capture, obtain asset-specific consent, qualified operator/safety lead, passive interface/decoder, calibrated reference/tolerances, finite sample/duration and emergency readiness. Hold if any critical input is missing.
- [ ] Validate a finite approved file offline first. Acquire/send genuine BMS data only under separately approved physical and HTTPS scopes; preserve raw capture/evidence privately. No charging/discharging, control commands, unsafe fault injection or automatic paging.
- [ ] Separately record capture provenance, API receipt, database readback and signed reference comparison. Keep official BPAN, SOH calibration and physical acceptance unverified until their own evidence exists.

### E. Operations — before release, resource creation or paging

- [ ] Review completed affected local container startup/persistence/auth/port/readiness evidence; still verify actual Render disk ownership, memory/readiness and the authorized workspace, exact five names, repository/revision and Oregon plans/disks. The **$53.75** baseline is already approved, not a new cost-confirmation request; stop on mismatch without upsizing or taking over existing resources.
- [ ] Run configured [GitHub CI](../.github/workflows/ci.yml) for the reviewed source before relying on it. Current local configuration is not a green GitHub run.
- [ ] Verify a usable protected backup and exercise restore/rollback in an explicitly approved isolated target with outbound actions Off. Export-ready status alone does not pass recovery.
- [ ] Inventory all legitimate clients/rollback access before separately approved old credential/hook retirement or ingress changes. Do not revoke a shared role or reset customer accounts as a documentation step.
- [ ] Inventory in-flight payment/checkout obligations, retry deadlines and accountable manual reconciliation before a webhook-rejecting release. No production payment inventory or reconciliation execution is supplied.
- [ ] Obtain explicit controlled app-release approval; verify exact Render commit/deployment and repeat agreed readiness/native login/owner checks afterward. Keep AutoDeploy Off unless a later policy decision changes it.
- [ ] Only after prerequisites, create exactly the approved five resources under operator authority; perform guarded native bootstrap and private auth/ACL checks. Resource creation is not SQL or paging activation.
- [ ] Separately approve generic incident SQL, trusted server-owned live acquisition, destination/evidence retention and activation. Verify disabled status/commands and real admin access; never promote caller-provided live metadata.
- [ ] Adopt/validate a receiver only under separate notification approval; obtain named-recipient and any iPhone relay metadata consent. Exercise a controlled synthetic delivery/failure/resolve test with a stop rule; distinguish server acceptance, phone display, human acknowledgement and verified recovery.
- [ ] Define measured uptime, queue/dead-letter/refresh lag, worker/DB health and recovery evidence. Acknowledge the same-Render blind spot; no unsupported availability guarantee.
- [ ] Review residual advisories, renderer/storage/provider gates and scoped security findings. Strix is not run; a full penetration test remains unperformed.

## 7. Release, Recovery and Acceptance Decision

The latest software runs support review of a bounded candidate, **not unrestricted launch**. Fresh local browser and affected container gates passed only their recorded scope. Critical pending gates are production session/reload/logout and broader owner-positive/tenant acceptance; corrected pilot/incident migration review; Render disk/memory/readiness; hosted GitHub CI; controlled exact-source release; protected restore/rollback; all-client old credential retirement; financial inventory/manual reconciliation; physical acquisition/calibration; receiver/live-context/paging and iPhone consent/recipient evidence; and remaining dependency/security decisions.

A future acceptance decision must name actual approvers, date, deployed snapshot, agreed tested workflows, evidence, exclusions and unresolved issues. Product, engineering/security, operations and qualified physical/compliance owners sign only their own scope. Receipt of this document is not acceptance. Fictional personas, local mock passes or disabled actions cannot supply missing sign-off.

Backups of the three proposed monitoring disks and existing PostgreSQL require consistent private handling, restricted/encrypted storage and a same-version restore with writers/publishers Off. Software rollback does not reverse SQL or reconstruct persistent state. No daily-backup coverage, recovery objective, capacity, SLA or response-time promise is inferred without measured evidence and named ownership.

## 8. Documentation and Evidence Access

Start with the [project brief](PROJECT_BRIEF.md), [QA plan and record templates](QA_DOCUMENTATION.md), [persona/feedback protocol](USER_PERSONAS_AND_FEEDBACK.md) and [release gates](RELEASE_GATES.md). QA/persona/gates and the [retest report](RETEST_SECURITY_REPORT.md) share this final evidence boundary and retain clearly dated historical snapshots. Their planned cases and unresolved requirements remain useful; older identity/totals are not current evidence. They do not authorize a release or production test.

The [local pilot guide](../gateway/python-agent/LOCAL_PILOT.md), [legacy gateway transport guidance](../gateway/python-agent/REST_TRANSPORT.md), [monitoring guide](../infra/monitoring/README.md) and [incident guide](OPEN_SOURCE_ALERTING.md) travel with the repository. Obtain current reviewed operator instructions where these retain earlier mount/build/guard-only proposals. [Architecture](ARCHITECTURE.md), [platform guide](PLATFORM_GUIDE.md), [how-to guides](HOW_TO_GUIDES.md), [API reference](API_REFERENCE.md), [MCP guide](MCP_GUIDE.md) and [compliance guide](COMPLIANCE_GUIDE.md) are reference inventories, not certifications.

Ask the release owner for a **sanitized dated evidence package** through the approved team document channel. Useful records include `production-positive-login-122e209.json`, `production-session-check-122e209.json`, the `remediation-final-*` logs, central/dependency/incident integration findings, pilot TSX/ESM acceptance and corrected SQL proof, remaining-claims focused evidence and monitoring native/container status. Older per-subject findings are superseded only where later matching evidence changes a specific fact. Exclude private connection files, tokens, cookies, secrets, raw customer data and unredacted traces. Private sandbox paths are not the only means by which users receive the handoff.
