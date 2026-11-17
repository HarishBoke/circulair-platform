# Circul-AI-r Platform — QA Documentation

**Document Version:** 3.0 — bounded handoff refresh
**Date:** 17 November 2026
**Prepared for:** Circul-AI-r / Setoo engineering handoff
**Application URL:** https://circulair.energy
**QA disposition:** Final bounded local verification complete; production rollout and unrestricted launch blocked

## 1. Evidence Boundary and Current Status

This document defines a test plan and retains manual cases; it is **not an executed test ledger or acceptance certificate**. The July test totals, all-PASS security table, performance figures and real-persona UAT language are superseded. A test's expected result describes a requirement, not a verified outcome. No guaranteed uptime, 100% functionality, platform-wide security/compliance, calibrated battery safety or neural accuracy is established.

For **current totals, exact snapshots, latest typecheck/build/browser results and defects**, use [RETEST_SECURITY_REPORT.md](RETEST_SECURITY_REPORT.md). For release decisions use [RELEASE_GATES.md](RELEASE_GATES.md). Use their dated results and evidence summary to identify the exact verified snapshot. Do not hardcode an intermediate test/file count as the latest result.

### 1.1 Dated live/local distinction

| Scope | Recorded 17 November 2026 state | Limit |
|---|---|---|
| Production build | Render commit `54920faa9c392fa03a1689e4cbe151d67323edda` live; configuration redeploy `dep-dbu0nbg8v5cc73bj680g` observed live at 08:11:24 UTC | Newer local changes are not this release |
| Production config | Managed PostgreSQL/new login/session user `circulair_runtime_20261117` verified; random 64-character JWT secret rotated; canonical `APP_URL` verified; AutoDeploy Off | Old credential still valid/not revoked; external allow-all unchanged; successful email/password login not verified |
| Production smoke | Recorded **14/14** HTTP readiness/rejection checks; anonymous telemetry handshake rejected with `Unauthorized` | No successful login, owned workflow, payment, hardware or provider acceptance inferred |
| Backup/outbox | Render protective export ready 07:41 UTC; additive outbox table/due index applied and verified | Export not downloaded/restored; not complete schema/recovery acceptance |
| PagerDuty | Disabled (`false`) | No real incident/on-call test or billable retry Cron created |
| Later development repairs | Alert authorization/provenance, simulator/UI, database resolver, admin bootstrap and gateway REST fixes tested locally | Not deployed to Render; provider/hardware/full-module acceptance remains open |
| Final consolidated QA | Full local unit/typecheck/build, focused and existing Chromium, gateway offline, outbox and HTTP results recorded | Consult current report for actual counts, warnings, prior failures and verification limits |

Evidence includes the sanitized production configuration facts, rejection/readiness/socket observations, seven bounded remediation reports and final result summary. Exact machine-readable counts and command exit codes are in the evidence archive; raw logs/session traces/customer data are excluded. This plan retains manual cases rather than marking them passed merely because related automated tests ran.

Strix **did not run**. Semgrep zero matches are not proof of no vulnerabilities; dependency advisories and broad launch blockers persist. Prior browser acceptance used isolated PostgreSQL and disabled/mocked integrations; mobile Chromium emulation is not real iPhone/Safari acceptance.

## 2. Test Strategy and Inventory

| Layer | Method | Evidence requirement / boundary |
|---|---|---|
| Unit/regression | Vitest | Exact snapshot, command, environment, test/file totals and failures in current report; mocks identified |
| Data-backed integration | Isolated PostgreSQL and API callers | Readback, transaction/ownership assertions, synthetic records, no production schema mutation |
| Component/UI | Mocked render plus later browser checks | Mocked hook/access states are not network/cache/browser acceptance |
| End-to-end | Compiled QA server, desktop/mobile browser | Stable harness, explicit browser/device, separate negative/positive paths and no hidden skips |
| Real-user UAT | Consenting recruited participants in staging | Fictional composites are planning aids, not participant evidence |
| Performance | Controlled representative workload | Samples, percentiles, cache/network/config and load; no single-request SLA claim |
| Security | Source review, regressions, static/dependency scans | Resource-level authorization, failure cases and scanner limits; Strix remains a follow-up |
| Provider/hardware | Separately authorized staging accounts/devices | Real delivery/ACL/failure evidence cannot be inferred from mocks |
| Operations | Backup/restore, rollout/rollback and outage detection | Export readiness and app health response are insufficient |

### 2.1 Historical automated inventory

The July inventory included the following test files/areas. This is a navigation aid, not an exhaustive current list, a latest count or evidence all listed contracts pass. Check current source/report for names and scope.

| Historical file / area | Intended coverage |
|---|---|
| `server/auth.logout.test.ts`, `server/platform.test.ts` | Logout/core procedures |
| `server/telemetrySocket.test.ts`, `server/mqtt.test.ts` | Socket/subscriber behavior |
| `server/alertCooldown.test.ts`, `server/alertRules.test.ts` | Cooldown/global rules |
| `server/pdfGenerator.test.ts`, `server/eprPdf.test.ts` | PDF rendering/draft reports |
| `server/adminUsers.test.ts`, `server/agent.test.ts` | Users/role/audit and agent interfaces |
| `server/carbonClass.test.ts`, `server/i18n.test.ts` | Carbon labels/translations |
| `server/warranty.test.ts`, `server/marketplace.test.ts` | Warranty/marketplace procedures |
| `server/wikiFeedback.test.ts`, `server/email.test.ts` | Feedback and mocked email helpers |
| `server/sohModel.test.ts`, `server/simulator.test.ts` | SOH/demo model bounds |
| `server/deviceProvisioning.test.ts`, `server/gatewayPhysics.test.ts` | Device/gateway interfaces |
| `server/restApi.test.ts`, `server/triageQueue.test.ts` | REST and triage interfaces |

The November remediation evidence identifies `server/alertAuthorization.test.ts`, `server/mqttSubscriber.test.ts`, `server/batterySimulatorUnits.test.ts`, `server/databaseEnv.test.ts` and `server/adminBootstrap.test.ts`, plus gateway REST transport offline tests and unchanged PagerDuty/gateway bounds. Counts and acceptance scope belong in the current retest report. Normal project typechecking excludes tests; explicit focused strict typechecks are documented in the remediation notes. Passing assertions does not calibrate a model or certify regulatory methodology.

## 3. Manual Cases — Retained Plan, Not Results

**All cases below are unexecuted/not accepted by this document.** Known defects make some **blocked**; other cases are **unverified** until an evidence record is attached. Even when a scoped retest has evidence, its environment/steps must be matched before marking a manual case passed. Record Pass/Fail/Blocked/Not run, actual result, build/date, duration and evidence for each execution.

Use a reviewed isolated staging/QA environment with synthetic accounts and data. Do not invite users to mutate production or use production payment cards, brokers, submissions or on-call services. Admin accounts must be explicitly provisioned by an authorized administrator; do not rely on “first registrant becomes admin.” Global alert rules are **admin-only in the local repair**; ordinary users request changes. No testing below authorizes provider actions or production traffic.

### 3.1 Authentication

Production successful login/recovery remains unverified; malformed-input rejection is not positive-path acceptance.

| TC-ID | Case / safe steps | Expected requirement | Priority |
|---|---|---|---|
| AUTH-01 | Register approved synthetic account in QA | Account persists; documented session/navigation behavior, no accidental admin role | Critical |
| AUTH-02 | Email/password login with approved test identity | Valid cookie/session, dashboard access; independently verify identity and logout | Critical |
| AUTH-03 | Wrong password and malformed value types | Honest rejection, no 500, hash or account-data leak | Critical |
| AUTH-04 | Forgot password in approved email sandbox | Generic response; canonical trusted link; no token in response/log; delivery separately evidenced | High |
| AUTH-05 | Redeem synthetic reset token and try reuse/expiry | Password updated; invalid/reused/expired tokens rejected | High |
| AUTH-06 | Controlled session expiry in QA | Access denied and explicit signed-out/session-expired state | Medium |
| AUTH-07 | Sign out and retry protected request | Cookie/session no longer grants access; login route reachable | Critical |
| AUTH-08 | Ordinary user opens admin route/API | Server denies privilege; UI explains denial rather than implies empty success | High |

### 3.2 Battery registry

Known gates: 19-/21-character contracts, canonical IDs, physical/date validation and resource authorization.

| TC-ID | Case / safe steps | Expected requirement | Priority |
|---|---|---|---|
| BAT-01 | Register one synthetic battery | Canonical identifier/ID persists and can be read back by authorized account | Critical |
| BAT-02 | Exercise identifier generator/decoder and consumers | Single agreed BPAN contract across all consumers; reject inconsistent values | Critical |
| BAT-03 | Open authorized and foreign battery detail | Correct scoped records; foreign private access denied | High |
| BAT-04 | Search/filter synthetic registry | Accurate chemistry/status/manufacturer filtering within authorized scope | High |
| BAT-05 | Import small reviewed CSV; include invalid/duplicate rows | Preview, bounded validation, correct persistence and honest partial/error reporting | High |
| BAT-06 | Generate/scan synthetic QR | Resolves to intended identifier with appropriate public/private projection | Medium |
| BAT-07 | Change synthetic lifecycle status; test forbidden transition/account | Authorized, valid atomic transition; no unsupported claim of regulatory filing | High |

### 3.3 Telemetry, alerts and simulator

Hardware ingestion/threshold acceptance is blocked/unverified. Synthetic provenance suppression is not authenticated hardware provenance or synthetic data/state isolation; simulated readings can still persist/change state. Use isolated fixtures only.

| TC-ID | Case / safe steps | Expected requirement | Priority |
|---|---|---|---|
| TEL-01 | View authorized synthetic telemetry | Correct data/timestamps/units; updates without auto-starting simulation; no asserted 2s SLA | Critical |
| TEL-02 | Authorized staging-only MQTT fixture, after broker gates | Topic/payload/device/BPAN binding and persistence; reject spoofed/revoked identity | Critical |
| TEL-03 | Inject isolated threshold fixture with PagerDuty disabled | Correct persisted alert/severity/cooldown; no page or safety certification | High |
| TEL-04 | Admin configures QA rule; ordinary user requests change and attempts denied API | Admin-only list/defaults/create/update/toggle/delete; correct evaluation; positive-ID and missing-rule errors | High |
| TEL-05 | Start isolated demo fixtures | Clearly marked simulated; correct pack/cell resistance units; known demo cutoffs/nonphysical limits disclosed | Medium |
| TEL-06 | Authorized REST ingest and unauthorized/foreign/invalid fixtures | Accepted authorized readings persist/broadcast; forbidden or invalid inputs rejected, no false-success browser ingestion | High |
| TEL-07 | Disconnect/reconnect QA browser | Accurate connection/loading/error states; empty results do not mean system health | Medium |
| TEL-08 | Ordinary/admin alert list, missing/foreign/read operation | Ordinary owner scope; admin global scope; authenticated acknowledgement predicate; denied/missing rows not reported success | Critical |
| TEL-09 | Force alert/rule/default errors; Retry and mark-read refresh | No false zero/healthy summary; proper selected query refreshed; nonadmins make no global-rule requests | High |
| TEL-10 | Demo/test/stream/source flags through MQTT callback fixtures | Declared synthetic provenance preserved and excluded from paging; no inference that unlabeled traffic is hardware-authentic | Critical |

TEL-08–10 capture newer local repairs. Integrated browser QA and staging hardware tests remain open. Mark-read is not PagerDuty acknowledgement/resolution.

### 3.4 SOH and triage

Blocked/unverified due to formula, contract and approval defects. Outcomes are model outputs, not validated accuracy or real operational recommendations.

| TC-ID | Case / safe steps | Expected requirement | Priority |
|---|---|---|---|
| SOH-01 | Run estimate on known synthetic fixture | Documented units/inputs/output fields, no crash; confidence/accuracy not invented | Critical |
| SOH-02 | Test known low-health boundary fixture | Correct documented recommendation; display/approval use same result; no real routing | High |
| SOH-03 | Read repeated prediction history | Authorized, timestamped, correct record/input binding | Medium |
| SOH-04 | Compare chemistry fixtures | Correct numerical formulas and units; differences not evidence of calibrated accuracy | High |
| SOH-05 | Check degradation/IR breakdown | Values reconcile with independently reviewed fixture calculations | Medium |

### 3.5 Marketplace

**Real-money launch blocked.** Use no checkout/payment in real-user sessions; if separately authorized engineering tests use Stripe, prove isolated test mode first. The former public test-card instruction does not authorize payment activity. A payment-success page is not evidence of paid settlement.

| TC-ID | Case / safe steps | Expected requirement | Priority |
|---|---|---|---|
| MKT-01 | Create synthetic listing and photos in QA | Only authorized battery; correct persistence and owner-scoped photo mutation | Critical |
| MKT-02 | Browse/filter synthetic listings | Correct chemistry/SOH/price filters; condition claims explicitly qualified | High |
| MKT-03 | Review synthetic offer draft without payment | Exact listing/offer/seller/amount/currency binding; approved acceptance state before checkout | Critical |
| MKT-04 | Separately approved test-mode payment harness only | Atomic reservation, authenticated webhook, idempotent monotonic settlement, refund/payout behavior; unpaid path rejected | Critical |
| MKT-05 | Review synthetic orders/negative success case | Only user's real test-settled orders; unpaid/failed/canceled page cannot claim success | High |
| MKT-06 | Withdraw synthetic listing; try foreign mutation | Authorized status change; foreign deletion/update rejected | Medium |

### 3.6 Compliance and declarations

Draft/test documents only; **no regulatory submissions, certification or official endorsement**. Numeric/methodology, period/organization scope and output-field gates remain.

| TC-ID | Case / safe steps | Expected requirement | Priority |
|---|---|---|---|
| COM-01 | Generate synthetic CPCB-style BW-3 draft in QA | Fields/scope reconcile with fixture; independently reviewed format; clearly not filed/approved | Critical |
| COM-02 | Review synthetic public EU passport | Minimal authorized public projection; required-field gaps recorded, not marked compliant | Critical |
| COM-03 | Enter known lifecycle carbon fixtures | Correct unit conversion, independently reviewed methodology and authorized persistence | High |
| COM-04 | Enter synthetic recycled-content fixture | Correct material units/validation; qualified jurisdiction/date thresholds, not certification | High |
| COM-05 | Test positive/zero/negative/repeated yield in QA | No negative/repeated credit, atomic authorized writes and canonical battery ID | High |
| COM-06 | Review scoped draft compliance dashboard | Correct organization/period data; unknown/not verified shown honestly | High |

### 3.7 Warranty

Blocked/unverified public lookup privacy, canonical identity and claim-route behavior.

| TC-ID | Case / safe steps | Expected requirement | Priority |
|---|---|---|---|
| WAR-01 | Register synthetic warranty against canonical battery | Authorized valid dates/specification and persisted ID/BPAN binding | Critical |
| WAR-02 | Search synthetic BPAN/phone fixtures without real PII | Only approved minimal public fields; no customer contact/address leakage | Critical |
| WAR-03 | Try synthetic claim workflow | Genuine authorized persistence/status; absent routes blocked, not fake success | High |
| WAR-04 | Exercise known date/expiry cases | Correct valid calendar arithmetic and timezone assumptions | Medium |

### 3.8 Administration

Use explicitly approved QA admin fixtures; no production roles, brokers or settings are changed.

| TC-ID | Case / safe steps | Expected requirement | Priority |
|---|---|---|---|
| ADM-01 | Change approved test user role | Authorized change; complete audit/readback; ordinary mutation denied | Critical |
| ADM-02 | Attempt self-demotion in QA | Documented self-access guard, no accidental lockout | High |
| ADM-03 | Attempt last-admin demotion in QA | Guard against removing final authorized admin | High |
| ADM-04 | Inspect synthetic audit trail | Accurate actor/action/time and restricted access; no secrets | High |
| ADM-05 | Change QA locale/currency and restore fixture | Authorized persistence/readback, correct UI; no regulator/payment readiness implied | Medium |
| ADM-06 | View QA system dashboard | Measured/unknown provider states; no fabricated uptime or green health from empty data | Medium |

### 3.9 Cross-cutting

Performance, access, mobile and header checks have limited previous evidence only; not blanket all-platform passes.

| TC-ID | Case / safe steps | Expected requirement | Priority |
|---|---|---|---|
| XC-01 | 375px viewport and separate approved real-device checks | Readable/no overflow; specify browser/hardware; emulation not hardware acceptance | Critical |
| XC-02 | Isolated QA rate-limit harness | Documented configured limits/exemptions and honest 429; no production flood | High |
| XC-03 | Inspect headers at specified environment/routes | Intended CSP/HSTS/type/frame controls and functional policy; presence alone not security proof | High |
| XC-04 | Unknown route | Honest not-found UI with safe navigation | Medium |
| XC-05 | Controlled component exception | Error state/retry, no data leak or false success | Medium |
| XC-06 | Consent flow with approved privacy policy | Recorded policy/choices and behavior; no compliance certificate inferred | Medium |
| XC-07 | Change language on selected workflows | Labels and technical terminology reviewed; missing translations recorded | Medium |
| XC-08 | Theme navigation | Contrast/readability and no distracting flashes | High |
| XC-09 | Keyboard/screen-reader/contrast audit | Measured findings against chosen WCAG criteria; no blanket AA claim without full audit | High |
| XC-10 | Session reopen/expiry/revocation fixtures | Correct cookie/session policy with secure HTTPS behavior and explicit failure state | High |

## 4. Performance Plan — Targets Only

The July point estimates and PASS labels are not current benchmarks. Proposed targets below require agreed workload, build, region, browser/network, warm/cold cache, sample size, percentile, error rate and provider mode before reporting a measurement. No production uptime or p95 claim is inferred from one smoke response.

| Surface | Historical target to review | Current benchmark evidence |
|---|---|---|
| `/api/health` | < 500ms | Not established for representative workload |
| Homepage | < 2s | Not established |
| Scoped registry | < 3s | Not established |
| Successful login | < 2s | Production positive path not verified |
| Telemetry ingest | < 1s | Hardware/ingest acceptance open |
| Authorized socket connect | < 3s | Not a full capacity benchmark |
| PDF generation | < 15s | Browser/storage and untrusted-content gates open |

## 5. Security Cases — Plan, Not Blanket PASS

Architecture choices such as an ORM, React escaping or an httpOnly cookie do not by themselves prove SQL-injection, XSS or CSRF protection across the application.

| SEC-ID | Test requirement | Current disposition |
|---|---|---|
| SEC-01 | Parameterized queries; hostile search/input across alternate surfaces | Broad verification open; source patterns alone insufficient |
| SEC-02 | Output escaping, including PDF user HTML; browser script/network restriction | PDF blocker remains |
| SEC-03 | Origin/fetch-metadata protection and cookie policy on mutation surfaces | Specific controls implemented; all-surface acceptance open |
| SEC-04 | Login throttling without session-read false lockout | Scoped evidence only; verify isolated harness |
| SEC-05 | Anonymous/invalid auth plus cross-account resource ownership | Production rejection smoke limited; many resource blockers remain |
| SEC-06 | Ordinary/admin escalation and global rule denial | Alert repair local only; broader role/resource acceptance open |
| SEC-07 | Password/JWT handling, no hash/token leakage, old credential revocation | JWT rotated; old database credential still valid |
| SEC-08 | Expiry, invalid identity, recovery replay and cookie consistency | Scoped local evidence; successful production session path unverified |
| SEC-09 | Upload MIME/size/content and private storage/download authorization | Private document/S3 gate remains |
| SEC-10 | HTTPS/header behavior and intended CSP without misleading claims | Recorded smoke headers only; not all-route security certification |
| SEC-11 | MQTT ACL/device/topic/payload identity and revocation | Not fixed by declared provenance suppression |
| SEC-12 | Payment binding/reservation/idempotency/currency/refund | Real-money launch blocked |
| SEC-13 | Synthetic paging exclusion and alert-source authorization | Local focused regressions; PagerDuty disabled; no on-call test |
| SEC-14 | Dependency remediation and scanner review | Advisories persist; Strix not run; Semgrep zero matches not a certificate |

## 6. Regression and Retest Protocol

This is a proposed protocol, not an instruction executed by this refresh.

1. Freeze and identify the reviewed local snapshot; record untracked/uncheckpointed changes and separately identify the deployed Render commit/configuration.
2. Use an isolated reviewed PostgreSQL QA database and explicitly disabled/mocked external providers. Never copy secret values or customer data into evidence.
3. Run full unit/regression suite, project and relevant test-source typechecks and production build after final resolver/configuration cleanup. Record all failures/warnings and exact commands in the current retest report; do not substitute a focused rerun for a full-suite result.
4. Run compiled-server data-backed desktop/mobile browser suites. Check ordinary/admin alert query selection, no nonadmin global rule requests, error/Retry/read refresh and no false healthy summaries. Record browser/hardware and timing/harness limitations.
5. Add two-account/admin, numeric-unit, canonical-ID and atomicity fixtures for remaining blockers. Verify both negative and positive paths and every alternative API surface.
6. Obtain explicit staging/provider authorization for delivery/hardware tests; mock passes are not provider passes. No real-user payments, broker changes, regulatory submissions or on-call tests.
7. Only after release gates and deployment authorization: verify protective export/restore/rollback, controlled rollout, actual live commit/config and safe post-release checks. Successful production email/password login remains a separate unverified gate.
8. Finalize report/gates with failures, exclusions and unresolved issues. Do not rewrite observations as guaranteed functionality/security.

## 7. Bug and Execution Record Template

Use a participant/test ID rather than a personal name in the shared record. Redact PII, credentials, customer identifiers, emails/phones, private URLs and screenshots before attachment.

```markdown
## Test / Bug Record
Test ID / case ID:
Participant pseudonym / role group (if applicable):
Consent reference (if applicable; restricted record, not personal details):
Date/time and timezone:
Environment / local snapshot / deployed commit / config-deploy ID:
Browser/version, OS/device (real hardware or emulation):
Data fixture and provider mode (mocked/disabled/test):
Status: Pass / Fail / Blocked / Not run
Completion time (seconds/minutes); assistance required:

Steps performed:
1.
2.
Expected result:
Actual result (including error/state; do not infer from empty data):
Blocker and severity: Critical / High / Medium / Low / None
Reproducibility and affected scope:
Sanitized evidence path / screenshot (PII and secrets redacted):
Owner / linked defect / next action / retest evidence:
```

## 8. UAT Entry, Exit and Sign-Off

[USER_PERSONAS_AND_FEEDBACK.md](USER_PERSONAS_AND_FEEDBACK.md) defines seven **fictional composite** role groups and practical voluntary recruitment/consent. No actual recruitment, quotes, feedback scores or participant sign-off evidence was supplied. A profile or planned workflow cannot be counted as a completed UAT session.

Entry requires an approved isolated environment, explicit test roles, synthetic data, clear disabled/blocked features, current engineering QA evidence, safe facilitator script, consent and an owner-approved scope. Production should not be the default UAT database.

Exit requires real recorded expected-vs-actual results, completion times and blocker/severity per agreed critical workflow; resolved/retested blocking defects; two-account/admin privacy tests; measured performance and device/accessibility scope; independently reviewed methodology where relevant; and explicit owner approval tied to the deployed snapshot and current release gates. No average score, fictional-persona approval or historical percentage can waive a security/payment/safety blocker. Deferred/unverified features must remain labeled or disabled. This handoff does not record UAT completion or launch sign-off.

## 9. Severity and Triage — Not Guaranteed Response Times

| Severity | Meaning | Proposed action |
|---|---|---|
| Critical | Security exposure, data loss, dangerous outcome or financial integrity failure | Stop affected test/use; notify authorized owner immediately; protect evidence |
| High | Primary workflow blocked, major incorrect data or privacy concern | Prioritize before broader release; owner sets remediation/retest plan |
| Medium | Partial failure with a safe workaround | Schedule fix and record workaround/limits |
| Low | Cosmetic/documentation/usability issue | Track with owner and review priority |

The former four-/24-/72-hour SLAs were not verified commitments. Assign named responsible owners and agreed response expectations; never imply an automatic hotfix/deployment authorization from a bug report.
