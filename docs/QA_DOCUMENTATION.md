# Circul-AI-r Platform — Manual QA and User Acceptance Guide

**Document version:** 4.0 — 18 November 2026 boundary refresh
**Application:** https://circulair.energy
**Disposition:** Bounded engineering verification exists; manual all-role UAT, production rollout of local repairs and unrestricted launch are not accepted.

## 1. Read This Before Testing

This is a practical **manual test plan, not an executed test ledger or acceptance certificate**. An expected result is a requirement to check, not a claim that the application already meets it. No participant sessions, user ratings or sign-offs are supplied. The July all-PASS tables, invented user approvals, timing claims and blanket functionality/security claims remain superseded.

Use [USER_PERSONAS_AND_FEEDBACK.md](USER_PERSONAS_AND_FEEDBACK.md) for consenting recruitment and blank feedback forms. [RETEST_SECURITY_REPORT.md](RETEST_SECURITY_REPORT.md) and [RELEASE_GATES.md](RELEASE_GATES.md) remain engineering/release references, but check their dates and exact snapshots: an older report cannot override the later evidence boundary below. This refresh did not run the application, browser, tests or scanners; it summarizes the supplied consolidated evidence and the dated local findings. It does not authorize deployment, SQL, provider use or paid resources.

### 1.1 Production and local evidence must stay separate

| Scope | Current recorded evidence | What remains unverified or excluded |
|---|---|---|
| Production identity | Full commit **`122e209b52cdcd01f55690363193d7a09659e0c2`**, deployment **`dep-dbua7eui0phs7397qbng`**, latest read-only settings **17 November 2026 at 23:09:40 UTC**, **Set 5k / Standard / Oregon / main**, service **`srv-d87hoqcm0tmc739tv580`**, **AutoDeploy Off / PR Previews Off** | New local repairs are **unreleased; source publication status separately recorded in dated delivery evidence**; no new production login, release, SQL, resources or payment inventory. Local results do not describe the live build |
| Production native sign-in | User-native positive login returned **200 at 19:17 UTC**, repeated at **19:40 UTC** on 17 November; password hash absent from the observed response; dashboard reached | Production reload/session continuity, logout and broad cross-tenant acceptance **not yet performed**. This is one bounded positive path, not all-role AUTH acceptance |
| Final consolidated local regression | Exact Node **24.14.1 / pnpm 10.34.5**, provider-free/network-isolated run started **22:54:20 UTC**: **65 suites, 1,916 passed, 0 failed, 28 opt-in PG skipped, 1,944 collected**; typecheck exit **0** | No production/provider/hardware/UAT acceptance. The skips remain explicit. Earlier exact sterile CI-default passed the same totals plus typecheck/build **0**, worker **8/8**, Python **50/50**, before final font correction |
| Final exact CI-equivalent acceptance | Completed **23:12 UTC**: default Vitest **65 / 1,916 + 28 opt-in PG skips / 1,944**, typecheck **0**, normal build **0**, worker **8/8**, Python compile **0**, offline Python **50/50** | Final 454-file sterile snapshot, all `.env` filenames omitted; all six exits **0**. Local checks do not establish hosted CI; verify exact candidate run before release |
| Monitoring local checks | Native **9/9**; final affected Kuma/gateway container acceptance **105/105 = 97 + 8 gateway restart**, completed **23:04:33 UTC** | Nonroot/zero granted capabilities in 19 snapshots only for affected scope; ntfy/Alertmanager retain earlier positives, not fresh strict capability proof. Render disks/memory/readiness, outage/load/restore remain pending |
| Fresh Chromium / focused / HTTP | Full **178/178**, started **22:55:03 UTC**; focused **18/18**, started **22:54:22 UTC**; Getting Started **4/4**; HTTP **14/14** | Fresh guarded server per suite, one worker, zero retries/skips/flaky cases; unchanged rate budget, no MCP/CDP/existing-browser reuse. Mostly auth gates, not all-business-positive workflows; emulation not iPhone/Safari |
| Local pilot real PostgreSQL | Separate TSX and compiled-ESM runs each passed **15 acceptance groups**, using a real private QA store, native RPC and loopback REST | Private synthetic schemas only; not a production pilot, physical acquisition or manual UAT |
| Incident implementation | Separate **123 tests**: 28 guarded real local PostgreSQL with mocked sender, 35 offline and 60 adapter tests; new integration **47 tests** | These sets can overlap the consolidated suite. **Do not add them** to 1,916 or relabel the full-suite skips as passes |
| Dependency remediation | Full advisory occurrences **250 → 42**; explicit production-scope occurrences **155 → 16** | Full 42 = **3 critical, 14 high, 20 moderate, 5 low**; production scope 16 = **0 critical, 8 high, 5 moderate, 3 low**. Counts are occurrences, not unique exploits; not an audit of the live Render tree |
| Security scanners | **Strix NOT RUN**. Final selected Semgrep **23:08:48 UTC**: **294 rules / 451 targets / 10 flags / 12 parser/error entries / approximately 99.9% parsed / exit 0** | Four explicit-USER flags removed by actual changes; ten operator-controlled QA subprocess flags retained, unsuppressed. Initial **20:38 UTC, 449 targets / 14 flags / 13 errors** and **21:02 UTC, 451 / 10 / 12** snapshots preserved. No full pentest/zero-vulnerability claim |
| Infrastructure/notifications | Exact five-service proposal approved at **$53.75/month additional compute-and-three-disk baseline**; **not created, no new billing** | Uptime Kuma, Alertmanager, ntfy, guarded gateway and worker are not deployed by this evidence. Notification flags remain **OFF**; no relay, iPhone push, consented human acknowledgement or real notification test. Single-Render-provider outage blind spot persists |

The earlier incident integration findings record Node 22 and the original pilot SQL hash; those are historical snapshots. The later consolidated Node 24 run and corrected pilot acceptance are the current boundaries above. Earlier exports/configuration/rejection smoke do not establish restoration, current credential-revocation acceptance or the missing production session tests.

Fresh browser acceptance followed a narrow Home heading font correction (**24 / 30 / 36 / 48 px**, unchanged words) for **320 px viewport / 341 px scroll-width overflow**. Preserve pre-origin **16/18** and **175/178**: two hostile-Origin 500s, malformed-auth 429 after a shared rate budget, and overflow. Post-origin **177/178** still failed only overflow; a decorative-wrapper-only attempt failed before fresh **178/178** passed. Every owned server stopped exit **0**, port **3001** closed. Fresh synthetic legacy fixtures were **21 batteries plus one informational alert per bounded fresh owner**, explicitly not official generator output; generator **412 disabled**, read-only decode **unverified**, foreign reads **404** remain unchanged.

Final affected monitoring acceptance retained container flag **`1`**, upstream and general-settings DB unchanged: Kuma sudo **4755 → 755** denied optional NSCD root startup; exact mode-755 guarded existing `setcap -r` removed only unused Caddy **`cap_net_bind_service=p`** in Kuma/gateway, one new build each with unchanged pins. **UID 1000 / UID 65534**, **CapPrm/CapEff/CapInh/CapAmb = 0** across **19** startup/restart/post-auth snapshots including before QA exec; **CapBnd not zero**, no all-OS audit. Native SQLite/Basic/socket/setup/login persistence, readiness **503 → 200**, `/livez`, **PORT 10000**, exit-78 guards, sudo denial and SIGTERM exit 0 passed; gateway 2 KB/auth-strip/query-clear/401/411/restart passed. Historical **109 = 106 pass / 3 fail**, sudo **92 = 80 pass / 12 fail**, new preflight **8 = 7 pass / 1 wrong-tag QA-oracle fail** with mount exit **125**, new raw **113 = 112 pass / 1 fail** remain separate. Cleanup **66 private files 0600 / 8 dirs 0700 / env 0600**, owned containers/mapped application-UID processes zero; new secret scan **181 files / 72 candidates / 0 matches**. Disabled cgroups do not prove 2 GB enforcement; Render disk ownership stays conditional.

Final exact sterile CI-equivalent acceptance completed **23:12 UTC**, from a **454-file** snapshot including final Home font and both Dockerfiles with all `.env` filenames omitted: default Vitest configuration (no custom setup), started **23:09:37 UTC**, **65 suites / 1,916 passed / 0 failed / 28 opt-in PostgreSQL skipped / 1,944 collected**, **61.63 seconds**; typecheck **0**, normal frontend/server/real-worker build **0**, compiled worker **8/8**, Python compile **0**, offline Python **50/50**; **all six command exits 0**. The earlier **22:54:20 UTC** guarded root run is a distinct positive snapshot, not the default-CI proof. Local checks do not establish hosted CI; verify the exact candidate run before release. Hosted CI had not started at document preparation; later source publication and hosted-run status are separately dated delivery evidence.

### 1.2 Pilot, incident and financial limits

The native **`/local-battery-pilot`** is owner-scoped and uses UUID/local identifiers. The profile is created once; append-only records and irreversible device revocation require planned fixtures, not editing or resetting accepted records. Provisioning shows an **`lp1_` credential once in a read-only UI field**; it is an ingestion credential, not a general user session or proof of hardware. Never copy a token, hash, cookie or private connection string into evidence. If a one-time credential is lost, record that state and use a separately approved replacement-device procedure, not credential recovery from logs.

`BMS_REPORTED` is a required declaration, **not physical-label inspection, genuine owner attestation, authentic BMS acquisition, calibrated measurement or battery safety proof**. No hardware adapter/OEM decoder acceptance or official BPAN issuance is established. Official allocation/verification remains unverified; local labels must not look official.

The corrected pilot SQL SHA-256 is:

```text
edff6d0267a8b38d4f47f3c08f03d57589a989260587d41812e6482735745a3e
```

The direct database CHECK now requires `(payload->>'source' = 'BMS_REPORTED') IS TRUE`; the original nullable CHECK allowed missing/JSON-null source through SQL defense-in-depth. Final private-schema acceptance covered the correction. **No new pilot or incident SQL has been applied to production.** This document supplies no migration command or authorization.

The new incident enqueue is same-transaction and requires server-owned trusted-live context plus critical severity and the other approval/ownership gates. **Every current `createAlert` caller is contextless/nonpaging**, even if flags were later enabled. The pilot does not produce automatically pageable alerts. Caller-supplied `BMS_REPORTED`/live fields cannot create hardware trust. All notification flags stay OFF. Account “mark read” is not human on-call acknowledgement or incident recovery.

**Money actions are disabled, not functional.** Existing payment webhook behavior is non-2xx while disabled; manual reconciliation is required pending the release gate. Do not infer settlement, refunds or payout acceptance from a disabled action or success-looking page. No provider payment, S3/private-storage, email delivery, restoration, phone delivery, hardware calibration or OEM-decoder acceptance is established. Draft reports and labels are not regulatory approvals or physical certifications.

In-flight checkout/payment inventory, provider retry deadlines and accountable manual reconciliation are required **before a webhook-rejecting release**; no production payment inventory or reconciliation execution occurred. The approved five single-instance Oregon resources remain **$53.75** additional baseline without reconfirmation or automatic increase; existing charges, tax, metered usage and separately charged backup/maintenance are excluded.

## 2. Safe Manual UAT Setup

A facilitator must prepare an approved isolated QA/staging environment or a clearly labeled prototype, identify its exact build, and use synthetic data only. Production is **not the default UAT environment**. A later owner-authorized bounded production session test needs a separate scope; this plan does not request one.

Prepare the following before recruiting or starting any case:

1. Record build/snapshot, date/time/timezone, browser/version, OS/device, real device versus emulation, provider/feature mode and assigned role. “Latest” without an identifier is insufficient.
2. Provide two synthetic owners, **A and B**, with different assets; an explicitly approved QA admin; and least-privilege operator/recycler/OEM/developer accounts as required. Role-group names in this guide are workflow categories, not proof that an account enum or every permission exists. Have the owner verify actual permissions first. Do not auto-promote a registrant or share an admin login.
3. Prepare an owned record, a foreign private record, a missing UUID, an empty dataset, explicit zero readings, omitted/unknown measurements and a clearly draft/nonofficial public sample. Use expected fixture values, not customer IDs.
4. Keep external providers and notifications OFF/mocked. Do not submit payments/webhooks, send email/push, change broker/Render settings, connect hardware, apply SQL, upload to real storage or file a regulatory report. If a task needs those actions, mark **Blocked** and escalate for a separate approval.
5. Use only approved disposable QA fixtures for mutations and negative cases. Never reset private append-only pilot tables to make a case pass. A facilitator may use a reviewed fixture/harness in isolated QA; ordinary participants must not run raw SQL, shell commands or API probes.
6. Obtain consent and explain the stop rule. Recording is OFF unless separately consented. Record sanitized evidence IDs, not tokens, raw traffic or identifiable screenshots.

### Safety rule — force STOP

**STOP immediately** on a participant request, privacy/security exposure, unexpected external action, live hardware contact, dangerous recommendation or unexpected financial state. Stop capture if a secret appears; secure the evidence and notify the authorized owner without copying the secret into a bug report. Do not continue by bypassing permissions or enabling flags.

**No hardware trial** may start until separately authorized qualified specialists establish pack/chemistry-specific voltage, current, temperature, charge/discharge, isolation, emergency-stop and operating limits, authenticated acquisition/decoder behavior and a reviewed safe procedure. Demo bounds, QA envelopes, SOH scores or user confidence do not establish those limits. Do not induce a thermal event, charge/discharge a pack or make a real routing/warranty/procurement decision in this UAT.

### How to execute a table row

Give the participant its task goal without click-by-click coaching. Record the steps actually attempted and expected versus actual outcome. A facilitator handles controlled failures/foreign fixtures only in approved QA. If a control, route or permission is missing, record **Blocked** rather than simulating success. Attach the Section 8 record before changing a case status.

**Every manual case in Sections 3–6 is Not run by this document**, unless an execution record is subsequently attached. Cases requiring unavailable providers/hardware/money or an unapproved environment are **Blocked**. Related automated tests do not execute these manual cases.

The **54 new manual cases** remain **NOT RUN**; all seven personas remain fictional and all feedback scorecards blank. Fresh browser/container passes do not fill these records.

## 3. Shared Tasks for Every Role

Public reviewers perform only public/synthetic tasks; account-specific steps apply after explicit role provisioning. Run these with each relevant role and device scope, not once and then claim all users passed.

| ID | Participant task / safe procedure | Expected requirement | Priority |
|---|---|---|---|
| UAT-C01 | Open the public entry page; find sign-in and explain what is public/private | Clear navigation, no private account/asset data; no blanket “all healthy” or certification claim | High |
| UAT-C02 | Sign in using the assigned QA identity; identify the account and destination | Correct assigned role/account, dashboard reachable, no password/hash/token leakage | Critical |
| UAT-C03 | Reload the signed-in page, navigate away/back, then sign out and revisit a protected route | Documented session continuity before logout; protected access denied after logout with a useful sign-in state | Critical |
| UAT-C04 | Try one approved wrong-password/malformed-input fixture | Honest bounded rejection, no 500 or account/hash disclosure; no brute-force/load test | High |
| UAT-C05 | Open owned A asset, then facilitator-supplied B private asset/missing UUID | Owned read works; foreign/missing access safely denied with no private fields, not false empty success | Critical |
| UAT-C06 | Compare fixtures with zero, missing measurements and no records | `0` remains zero; missing/unknown is not fabricated zero/SOH; empty data is not system health | Critical |
| UAT-C07 | Observe a facilitator-controlled request failure; use Retry | Loading, denied, missing, failed and empty states distinguishable; retry refreshes the correct data | High |
| UAT-C08 | Locate purchase/checkout/payout controls or a supplied disabled-money screen without submitting | Money actions stay disabled and explain the limit; no fake paid order or success claim | Critical |
| UAT-C09 | Read a public draft label/passport; compare with an approved private-document fixture | UUID/local/draft versus official claims clear; private files/metadata not exposed to unauthorized roles | Critical |
| UAT-C10 | Inspect a status/health view and explain what is measured | Disabled/unconfigured/unknown states honest; no “healthy” from empty counts or mere HTTP 200 | High |
| UAT-C11 | Use keyboard, zoom and the chosen mobile/assistive setup to complete one task | Controls readable/focus usable; exact barriers and device scope recorded, not blanket WCAG/iPhone acceptance | High |
| UAT-C12 | Submit one synthetic feedback item only if the approved capture path works; otherwise use the restricted form | Honest success/error and authorized readback; absence of feedback is not proof there are no issues | Medium |

## 4. Practical Role-Specific Tasks

These are seven workflow categories covering public users, operators, fleet owners, recyclers, OEM reviewers, administrators and integration developers. See the fictional composites and neutral prompts in the companion document. Complete the common tasks appropriate to the role **and** the role tasks below. No fictional profile is a participant or sign-off.

### 4.1 Public / prospective user

| ID | Task | Expected requirement | Priority |
|---|---|---|---|
| PUB-01 | While signed out, inspect the approved public sample and follow its local/draft label | Minimal public projection; no owner contacts, private readings, storage links or official BPAN implication | Critical |
| PUB-02 | Follow sign-in from a protected pilot/private-document destination without entering a real identity | Useful authentication boundary; no partial private content exposed before sign-in | Critical |
| PUB-03 | Explain empty marketplace/status and disabled payment notices in your own words | “Unavailable/unknown/disabled” is not interpreted as zero assets, provider health or paid settlement | High |
| PUB-04 | On chosen desktop/mobile setup, find limitations, feedback and safe next steps | Clear draft/model/safety limitations; no promise of hardware trial, certification or guaranteed uptime | High |

### 4.2 Operator / field-service user

| ID | Task | Expected requirement | Priority |
|---|---|---|---|
| OPS-01 | Find the assigned synthetic asset; compare identifier, latest timestamp and units with fixture | Correct authorized asset binding; recorded versus received time clear; zero and absent values preserved | Critical |
| OPS-02 | Inspect an owned alert, mark read if supported, then examine a failed/empty alert state | Owner scope and refreshed state; mark-read not paging acknowledgement; failure not zero/healthy summary | High |
| OPS-03 | Request a global threshold change; attempt only the approved denied UI path | Ordinary operator cannot list/change global rules; useful request/escalation route, no privilege workaround | Critical |
| OPS-04 | Review disconnected/revoked-device instructions without connecting hardware | Honest connection state and STOP instructions; no instruction to reuse revoked credentials or trust a demo as physical proof | Critical |

### 4.3 Fleet owner / asset owner

| ID | Task | Expected requirement | Priority |
|---|---|---|---|
| FLT-01 | In `/local-battery-pilot`, create one disposable QA profile from the reviewed fixture and reopen it | Positive UUID/local identity persists once for the owner; profile/label nonofficial; no editable/resettable append-only promise | Critical |
| FLT-02 | Review the provisioned-device flow and latest readings using the approved pilot fixture | Credential shown once in read-only UI; later lists omit token/hash; no missing data replaced by zeros | Critical |
| FLT-03 | Revoke the disposable device; refresh devices/readings and explain the result | Revocation visible and irreversible/idempotent as documented; historic readings retained; no claim of physical disconnection | Critical |
| FLT-04 | Switch to B owner and try A profile/devices/readings/revoke through facilitator-controlled paths | All private reads/mutations denied, including a foreign admin fixture; fleet scope not inferred from role title | Critical |

### 4.4 Recycler / recovery-evidence reviewer

| ID | Task | Expected requirement | Priority |
|---|---|---|---|
| REC-01 | Trace one synthetic intake to its authorized identifier and approved private evidence | Consistent scoped identity; private document denied to foreign/public user; missing evidence explicit | Critical |
| REC-02 | Compare positive/zero/invalid/repeated synthetic yield examples; mutate only an approved QA fixture if supported | Units and validation clear; negative/repeated credit cannot appear as success; unavailable write is Blocked | Critical |
| REC-03 | Review a draft reporting ledger for organization, reporting period and provenance | Scope and unknowns visible; no official credit, certificate or filed-report claim | High |
| REC-04 | Review a proposed lifecycle transition and prohibited foreign/invalid transition | Permission/validity enforced, atomic readback if executed; no real processing, transfer or safety decision | Critical |

### 4.5 OEM / manufacturing-quality reviewer

| ID | Task | Expected requirement | Priority |
|---|---|---|---|
| OEM-01 | Inspect a small synthetic batch/CSV preview with valid, duplicate and invalid identifiers | Agreed canonical contract across consumers; precise row errors/readback; no official BPAN allocation claim | Critical |
| OEM-02 | Compare a draft passport, reported readings, omitted metrics and a model estimate | Source/units clear; reported versus estimated/unknown distinct; no calibrated SOH or hardware-authenticity claim | Critical |
| OEM-03 | Review synthetic warranty/service and draft carbon/recycled-content inputs | Authorized scoped records and units/dates; private customer details hidden; no regulatory or warranty acceptance inferred | High |
| OEM-04 | Explain what real decoder/calibration/acquisition evidence would be required before use | Missing physical/OEM acceptance explicitly recorded; review ends before hardware/procurement/production integration | Critical |

### 4.6 Administrator / platform operations

| ID | Task | Expected requirement | Priority |
|---|---|---|---|
| ADMIN-01 | Sign in as explicitly provisioned QA admin; compare ordinary/admin global rule access using disposable rules | Correct scoped authority and honest errors; no production change or final-admin lockout | Critical |
| ADMIN-02 | View native incident status with gates OFF; try a preapproved command expecting denial | Configuration-only status, `databaseReady:false`; empty items/counts **not** health proof; commands fail closed, no SQL/sender use inferred | Critical |
| ADMIN-03 | Review disabled notification infrastructure and a tabletop outage scenario | Five services not assumed created; no relay/push/ack delivery claim; Render-wide blind spot and human escalation needs stated | High |
| ADMIN-04 | Review synthetic audit/feedback access and money-disabled reconciliation instructions | Restricted sanitized records; honest submission/error state; manual reconciliation owner identified, no live payment/webhook action | Critical |

### 4.7 Integration developer / API reviewer

An authorized facilitator supplies prepared, synthetic loopback requests. Do not use production endpoints, customer credentials, shell/SQL probing or external networks in participant sessions.

| ID | Task | Expected requirement | Priority |
|---|---|---|---|
| DEV-01 | Review pilot profile/device/read contracts and the native session versus `lp1_` credential distinction | Owner-only native operations; ingestion scope clear; no credential/hash in read/list evidence | Critical |
| DEV-02 | Observe a prepared accepted reading, exact replay and changed replay in approved loopback QA | **201** new / **200** exact duplicate with same positive receipt / **409** changed same-sample payload; actual result recorded | Critical |
| DEV-03 | Observe prepared missing/wrong/foreign/revoked credential cases and strict invalid payload examples | **401** unauthorized; schema/media/body/time errors honest, no fallback/fake receipt or foreign write | Critical |
| DEV-04 | Review disabled feature/incident status and declared `BMS_REPORTED` versus trusted-live context | Pilot feature-off operations fail closed; caller declarations cannot enable incident paging; no hardware adapter or automatic page implied | Critical |

## 5. Pilot and Incident Boundary Cases — Engineering-Facilitated Manual Plan

The **separate real PostgreSQL pilot automation already exercised** positive receipts, owned RPC, foreign-admin denial, duplicate conflicts, real revocation lock orderings, trigger/FK protections and strict REST boundaries. That does not mark these manual workflows complete. Use an approved fixture/harness; participants do not manage database locks or SQL.

| ID | Safe observation/task | Expected requirement | Priority |
|---|---|---|---|
| PIL-01 | Feature OFF versus approved isolated feature ON status/read | OFF reports disabled; operations unavailable (native SERVICE_UNAVAILABLE / REST 503), not fabricated data | Critical |
| PIL-02 | Create/read one profile and attempt an unsupported second edit/reset path | Owner UUID profile persists once; append-only constraint explained; no official namespace/allocation/verified claim | Critical |
| PIL-03 | Provision disposable device; leave and reopen list | `lp1_` credential available once only; subsequent response/list excludes credential/hash; no screenshot of it | Critical |
| PIL-04 | Read explicit `vPack=0`, `iPack=0`, `socReported=0` and absent temperature/SOH | Zeros preserved; omitted measurements remain unknown/absent; correct units/timestamps and positive receipt ID | Critical |
| PIL-05 | Observe new/replayed/changed/cross-device same-sample requests | 201/200 same receipt/409 as appropriate; no duplicate committed reading | Critical |
| PIL-06 | Observe reviewed parallel duplicate and conflicting-device fixture results | One new receipt; duplicates share its ID; conflict does not become a successful second reading | Critical |
| PIL-07 | Observe controlled revoke-before-ingest and ingest-before-revoke scenarios | No reading after completed revocation; an earlier locked ingest may commit once before revoke; later ingestion 401; no exactly-once/hardware shutdown claim | Critical |
| PIL-08 | Observe exact 8,192-byte valid JSON and 8,193-byte declared/chunked fixtures | 8,192 accepted under valid contract; 8,193 returns 413; no unbounded body test or production flood | High |
| PIL-09 | Review strict malformed/duplicate-key/null/wrong-source/unit/time/media examples | 400 schema/JSON, 415 media/compression, 422 time/range as documented; no fake success. Clock-controlled boundary evidence not a live 1ms claim | High |
| PIL-10 | Inspect sanitized acceptance evidence for append-only/FK/source constraints | Corrected CHECK rejects missing/null source; immutable rows and ownership mappings protected; no participant SQL or production migration | Critical |
| INC-01 | Ordinary/signed-out user opens incident status/command through approved QA fixture | Mounted admin boundary denies **FORBIDDEN** before DB access; no incident/private metadata leak | Critical |
| INC-02 | QA admin observes OFF status and a denied OFF command | `databaseReady:false`, configuration metadata only; command CONFLICT; no disabled-mode review bypass or notification | Critical |
| INC-03 | Review current contextless alert/pilot fixture with notification flags kept OFF | Ordinary alert cannot auto-page; declaration/mark-read cannot become verified live provenance or recovery | Critical |
| INC-04 | Tabletop an ambiguous delivery/recovery and provider-wide outage | Explicit human evidence/escalation and limitations; no assumed iPhone push, acknowledgement, recovery, exactly-once delivery or independent provider monitoring | High |

## 6. Earlier Manual Cases — Still Unrun, Not Superseded by Automation

All prior IDs below remain **Not run in this manual plan**. Provider/hardware/money or unresolved-methodology/privacy prerequisites make the corresponding cases **Blocked until approved**. No old case is silently marked Pass. Execute the detailed requirement with the same Section 8 record; common/role cases above are additional user-facing coverage, not substitutes for API, privacy or scientific acceptance.

| Retained IDs | Requirement to verify manually in approved QA | Prerequisite / boundary |
|---|---|---|
| AUTH-01–08 | Registration without accidental admin; correct login/identity; invalid auth; recovery delivery; expiry/reuse; session expiry; logout; ordinary/admin denial | AUTH-02 has only the bounded production login observation in Section 1, **not** full manual acceptance. Reload/logout/all-role/cross-tenant remain open. Email/recovery delivery separately blocked |
| BAT-01–07 | Register/read canonical battery; agreed generator/decoder contract; owned/foreign detail; scoped search; invalid/duplicate CSV; QR projection; valid/forbidden lifecycle change | Identifier consumers, dates/physical inputs and resource ownership require exact fixtures; local UUID is not official BPAN |
| TEL-01–10 | Timestamp/unit display; authenticated ingest/binding; threshold persistence/cooldown; admin-only rules; labeled demo bounds; REST denials; reconnect states; scoped alert reads/mark-read; error/Retry; synthetic paging veto | No hardware, broker or paging acceptance. Synthetic declarations suppressing paging are not acquisition proof; demo/state isolation and physical safety not established |
| SOH-01–05 | Known-input estimate contract; boundary recommendation consistency; authorized history; chemistry/unit formulas; independently checked degradation/IR calculations | Uncalibrated model; no real routing or claimed scientific accuracy; qualified methodology review required |
| MKT-01–06 | Authorized listing/photos; qualified browse/filter; bound nonbinding offer; atomic authenticated test settlement/refunds; honest order states; foreign withdrawal denial | **Money disabled**. MKT-04 and real settlement acceptance Blocked; no cards/webhooks/payouts in UAT; reconciliation remains required |
| COM-01–06 | Draft report field/scope reconciliation; minimal public passport; carbon unit/methodology; material validation; zero/negative/repeated yield; organization/period dashboard | Drafts only, no filing/credits/certification; methodology and private-data gates cannot be waived by preference |
| WAR-01–04 | Authorized canonical battery warranty; minimal public lookup without PII; genuine claim persistence; date/timezone/expiry correctness | Synthetic data only; absent route is Blocked; no real claim or customer contact upload |
| ADM-01–06 | Approved audited role change; self/final-admin guard; restricted audit; reversible locale/currency fixture; measured/unknown dashboard states | Explicit QA admin only; no production roles/settings, provider enabling or money action |
| XC-01–10 | Chosen viewport/real device; controlled rate limits; headers; not-found; exception/Retry; consent; language; theme; measured accessibility; session reopening/expiry/revocation | No production load; emulation not real-device proof; no blanket WCAG/security/uptime claim |
| SEC-01–14 | Alternate-surface hostile input; output/PDF escaping; origin/cookie policy; bounded throttling; resource/role denial; secret handling; session/recovery; private uploads; HTTPS/headers; MQTT identity/revoke; payment binding; source/paging isolation; dependency/scanner review | Controlled engineering fixtures only; no broad cross-tenant production acceptance, fresh scanner certificate, S3/provider/hardware/payment acceptance supplied |

Historical automated test-file inventories are navigation aids, not current counts or an all-feature pass. Freeze the exact integrated source and retain command outputs/skips/warnings in engineering evidence before linking a manual record to it.

## 7. Performance and Security Reporting

No production p95, capacity, guaranteed uptime or full accessibility/security benchmark is established. For any manual waiting-time observation, record task start/end, pauses, assistance, browser/device/network and whether cache was warm. Perceived speed is feedback, not a service-level measurement.

A later controlled performance study must agree workload, sample count, region, build, provider mode, percentiles and error rate before interpreting timings for health, login, registry, ingest, socket or PDF routes. A single 200 response or passing build is not an SLA. An ORM, React escaping, httpOnly cookies, dependency reductions or zero historical Semgrep findings are not all-surface security certification.

## 8. Blank Test / Defect Record

Use one record per case and role/device execution. Store restricted evidence by ID; do not include personal names, employer/customer data, private URLs, raw logs, credentials, tokens, hashes or cookies. Consent/contact records are kept separately. If no safe evidence capture exists, record the limitation without exposing data.

```markdown
## Manual Test / Defect Record
Execution ID:
Case ID / linked earlier case (if applicable):
Participant pseudonym / actual role category (or internal QA, explicitly labeled):
Restricted consent reference / notice version / date:
Date/time/timezone:
Environment / exact build or local snapshot / deployed identifier if relevant:
Browser/version / OS / device / real hardware or emulation:
Assigned role / permissions verified by:
Synthetic fixture IDs / provider and feature mode:

Task goal:
Expected result:
Steps actually performed:
1.
2.
Actual result (observed, including zeros/unknowns/error):
Execution status: Pass / Fail / Blocked / Not run
Participant outcome: Completed unaided / Completed with assistance / Failed / Blocked / Not attempted
Time / start-end rule / pauses:
Assistance given:
Severity: Critical / High / Medium / Low / None
Safety STOP reason (if any):
Reproducibility / affected role and scope:
Sanitized evidence ID (no tokens, hashes, cookies or private URLs):
Linked defect / responsible owner / next action:
Retest build/date / actual result / evidence ID:
Retention/deletion date / access owner:
```

A successful task can still produce a usability defect; a blocked task is neither a pass nor a false failure. No result or rating may be filled from a fictional composite. Optional anchored ratings and the blank recruitment ledger are in the companion document.

| Severity | Meaning and handling |
|---|---|
| Critical | Security/privacy exposure, data loss, dangerous recommendation or financial integrity failure: **STOP** affected test/use and notify the authorized owner |
| High | Primary workflow blocked or major incorrect data: assign owner and remediate/retest before affected release |
| Medium | Partial failure with safe workaround: document limits and agree priority |
| Low | Cosmetic/documentation/usability issue: record and review |

These are triage proposals, not response-time SLAs or automatic hotfix/deployment authorization.

## 9. Role-Specific Entry and Release Criteria

Safe exploratory research may be approved on a narrow QA/prototype scope while broader launch is blocked. Before a session, the owner must approve environment, actual roles, fixtures, consent, evidence retention, disabled features and STOP procedure. Missing role permission is a blocker, not an invitation to use admin instead.

| Role | Required recorded exit evidence for its agreed scope | Cannot be inferred from it |
|---|---|---|
| Public | Public/private projection and sign-in boundary; readable nonofficial/draft/disabled labels; device/accessibility findings | Official passport/BPAN, private-file security on all routes or production availability |
| Operator | Assigned asset binding, timestamps/units/zero-versus-unknown, scoped alert read, error/Retry and ordinary global-rule denial | Hardware identity/calibration, safe threshold, on-call acknowledgement or recovery |
| Fleet owner | Own profile creation/read, credential-once/list redaction, readings, revoke and foreign-owner/admin denial | Production pilot schema, physical ownership/label proof, hardware shutdown or official allocation |
| Recycler | Scoped intake/private evidence, valid/invalid/repeated-yield behavior and draft organization/period clarity | Process safety, legally valid credit/certificate or regulatory filing |
| OEM | Identifier/import contract, reported/estimated distinctions, private warranty/service access and draft units/methodology | Decoder/OEM/calibration acceptance, model accuracy, production ERP integration or certification |
| Administrator | Actual role checks, audited QA changes, default-off incident status/commands, honest unknown health, restricted feedback and reconciliation procedure | Deployed five-service monitoring, provider-outage independence, push/phone/restore or human acknowledgement acceptance |
| Integration developer | Native versus device auth, actual receipts/replays/errors/revoke, strict wire contract and feature-off behavior on the tested build | Production SQL/deployment, trusted live acquisition, automatic paging or end-to-end provider acceptance |

Release requires expected-versus-actual records for the agreed critical workflows, consenting real role reviewers where user acceptance is claimed, two-account/admin privacy checks, resolved and retested Critical/High blockers affecting that scope, measured device/accessibility/performance limits, and explicit accountable owner approval tied to the **released build** and current release gates. Local fixes must not be described as live.

For the wider release, retain missing production reload/logout/broad cross-tenant and owner-positive checks; preserve completed bounded fresh browser/affected container evidence; verify hosted exact-candidate CI before release; review residual scanner/dependency risks; separately approve exact pilot/incident SQL, Render disks/memory/readiness, acquisition/decoder/calibration, provider/storage/email/payment inventory/reconciliation, restore/rollback, notification consent/human evidence and outage monitoring as applicable. Infrastructure creation approval is not activation or notification authorization. No score or preference waives security, money, physical safety or regulatory gates. This document records **no UAT completion or launch sign-off**.
