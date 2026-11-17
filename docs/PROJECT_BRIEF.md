# Circul-AI-r Platform — Project Brief

**Document Version:** 3.0 — bounded handoff refresh
**Date:** 17 November 2026
**Prepared for:** Circul-AI-r / Setoo engineering handoff
**Status:** Live deployment; limited verification; unrestricted launch acceptance blocked
**Deployment:** Render web service and managed PostgreSQL
**Application URL:** https://circulair.energy

## 1. Executive Summary and Evidence Boundary

Circul-AI-r is a battery circular-economy application intended to support battery identification, lifecycle records, telemetry, health estimation, second-life listings, logistics and compliance-document workflows. The repository contains substantial implementations, demonstration interfaces and scaffolds; these are not all verified end-to-end services.

This revision supersedes the July 2026 statements of complete functionality, production-grade delivery and comprehensive security hardening. A live URL, a feature inventory, historical phase completion and automated test passes are **not acceptance certificates**. There is no evidence here supporting guaranteed uptime, 100% functionality, platform-wide security, regulatory certification or neural-network accuracy.

Use [RETEST_SECURITY_REPORT.md](RETEST_SECURITY_REPORT.md) for current consolidated test results and defects and [RELEASE_GATES.md](RELEASE_GATES.md) for release decisions. Use the dated report and evidence summary to identify the exact verified snapshot. The November 16 baseline findings remain relevant except where dated November 17 evidence explicitly changes a specific observation; do not carry forward superseded production failures or treat a narrow fix as closure of an entire module.

## 2. Verified Deployment Snapshot — 17 November 2026

| Area | Recorded state | What it does not prove |
|---|---|---|
| Render application | Commit `54920faa9c392fa03a1689e4cbe151d67323edda` is live. Configuration redeploy `dep-dbu0nbg8v5cc73bj680g` was observed live at 08:11:24 UTC on 17 November. | The later local working-tree repairs are not deployed. |
| Deployment control | Render AutoDeploy is **Off**. | A local edit, checkpoint or branch update is not an automatic production rollout. |
| Database configuration | `DATABASE_URL` uses managed PostgreSQL; new login/session user `circulair_runtime_20261117` connectivity was verified. The recorded execution role is `circulair_user`. | The old exposed credential remains valid and has **not** been revoked; exposure cleanup is incomplete. External allow-all access was unchanged. |
| Session configuration | A new random 64-character JWT secret was rotated; canonical `APP_URL` was verified. | A successful production email/password login or recovery-email delivery has not been verified. |
| Protective export | Render logical export was ready at **07:41 UTC** on 17 November. | It was **not downloaded** and **not restore-tested**. Export readiness is not a recovery exercise. |
| PagerDuty/outbox | PagerDuty is disabled (`false`). Additive outbox table and due index were applied and verified without customer-data modification by that migration. | No live incident/on-call test occurred; the additive migration does not activate delivery or validate all alert sources. |
| Limited production checks | Recorded HTTP rejection/readiness smoke passed **14/14**; anonymous `/telemetry` socket handshake was rejected with `Unauthorized`. | These are scoped smoke checks, not authenticated customer-workflow, provider, safety or launch acceptance. |

Snapshot sources: `/home/ubuntu/retest-evidence/production-config-repair.json`, `production-after-config-repair-security-smoke.json` and `production-after-54920fa-socket.json`. These contain evidence references, not instructions to reproduce production tests.

## 3. Problem and Intended Solution

Battery producers, fleet operators, service teams, second-life buyers and recyclers often need to reconcile fragmented identifiers, condition data, maintenance records and end-of-life documentation. The product aims to make those records easier to connect and review. The July commercial and regulatory assertions are product motivations, not verified market estimates or legal conclusions.

| Module | Intended function | Current acceptance boundary |
|---|---|---|
| BPAN registry | Structured battery identifier, registration and QR workflows | A 21-character creation/readback path has local evidence; incompatible 19-/21-character consumers remain a blocker. |
| IoT telemetry | MQTT ingestion and authenticated Socket.IO display | Anonymous handshake rejection is live; topic/device ownership, hardware provenance and real broker acceptance remain open. |
| SOH estimation | Physics-inspired health estimates and triage | No calibrated accuracy, neural training or safety decision evidence. Numeric and UI contract defects remain. |
| Marketplace | Listings, offers and checkout interfaces | Real-money acceptance blocked by settlement, authorization and concurrency defects. |
| EPR/compliance | Draft reports, passports and declarations | Not certification or approved regulatory submission; organization/period scope and methodology need validation. |
| Reverse logistics | Pickup, manifest and chain-of-custody records | Canonical identity, authorization and real dispatch acceptance remain open. |

## 4. Seven Stakeholder Role Groups

These are intended workflow groups, not a guarantee that every API surface enforces the stated access model. Personas in [USER_PERSONAS_AND_FEEDBACK.md](USER_PERSONAS_AND_FEEDBACK.md) are fictional composites, not recruited reviewers or employer endorsements.

| Role group | Intended primary workflow | Authorization expectation to verify |
|---|---|---|
| OEM / vehicle manufacturer | Fleet registration, condition review and warranties | Own/authorized organization batteries only |
| Battery manufacturer | Production registration, QR and declarations | Authorized production records only |
| Recycler | Intake, yield evidence and draft EPR reports | Authorized recycling records; no repeated/negative credits |
| BESS developer | Browse second-life assets and evaluate offers | Authorized listings/offers; no real payments during UAT |
| Service provider | Service records and device/telemetry review | Assigned assets and devices only |
| Government / regulator | Review authorized draft compliance information | Read-only, minimal public projections; no implied official approval |
| Platform administrator | User access, audit, settings and global rules | Explicit administrator entitlement and audited privileged actions |

**Global alert rules are administrator-only in the local remediation**, including reading rules/defaults and creating, updating, toggling or deleting rules. Ordinary users should request an administrator change rather than configure global rules themselves. Owner-scoped alert reads/acknowledgements and explicit administrator operations have bounded local tests; these newer controls are not yet a live-production claim. Marking an alert read does not acknowledge or resolve a PagerDuty incident.

## 5. Technical Inventory

The historical architecture describes React 19, TypeScript, Tailwind CSS 4, shadcn/ui and wouter on the frontend; Node.js, Express, tRPC and Drizzle on the backend; managed PostgreSQL; Socket.IO and MQTT; and provider adapters for storage, email, AI and payments. Provider configuration or adapter presence does not prove provider delivery or operational readiness. The built-in/provider labels in older documents should not be read as a requirement for a managed agent runtime: the application uses standalone JWT email/password authentication and direct integrations.

| Layer | Inventory / direction | Qualification |
|---|---|---|
| Frontend | React SPA and responsive layouts | Real-device/Safari, accessibility and all-page acceptance remain unverified. |
| Backend | Express, tRPC, REST v1, MCP surfaces | All alternative surfaces need resource-level authorization review. |
| Database | Render PostgreSQL | Environment-only resolver is locally tested; its controlled production rollout remains open. Historical embedded fallback behavior must not be relied on. |
| Telemetry | MQTT subscriber, Socket.IO namespace, alert engine | Synthetic labeling is not authenticated device provenance. |
| SOH/AI | Physics-inspired formulas and qualitative assistant | Not a trained/calibrated neural model or validated safety system. |
| External adapters | S3, transactional email, payment, maps, MQTT and AI | Provider/hardware tests require separately authorized staging identities. |
| Release process | Controlled Render release from reviewed source | AutoDeploy Off; no uptime/zero-downtime promise. |

JWT cookies, password hashing, origin checks, security headers, rate limits, readiness queries and audit facilities are specific controls with scoped evidence. Their presence does not establish complete tenant isolation, secure private storage, safe PDF rendering or absence of exploitable dependencies.

## 6. Historical Feature Inventory — Not Production Acceptance

The following retains the July inventory for navigation and planning. “Core” describes historical development grouping, not current completion. Unless the current retest report documents acceptance for a particular environment and workflow, treat it as **unverified or blocked**. Route availability, seeded examples and mock tests are insufficient.

### 6.1 Core inventory

1. BPAN registry, structured identifiers and QR codes — downstream identity contracts blocked.
2. Battery lifecycle transitions — resource authorization and atomic writes need acceptance.
3. MQTT telemetry and Socket.IO dashboard — hardware/broker acceptance unverified.
4. Alert rules and thresholds — local admin-only repair; safety-rule acceptance open.
5. Physics-inspired SOH prediction — calibration/numeric correctness blocked.
6. Reuse/repurposing/recycling triage — recommendation and durable approval defects open.
7. Marketplace listings, photos and checkout — real-money release blocked.
8. Logistics manifests, pickup and tracking — real dispatch/identity acceptance unverified.
9. Draft CPCB-style reports and EU battery-passport interface — not regulatory certification.
10. Carbon declarations — known unit/methodology defects remain.
11. Recycled-content declarations — thresholds, scope and legal interpretation unverified.
12. Warranty registration, claims and public lookup — privacy/claim workflow blockers remain.
13. Bulk CSV onboarding — bounded synthetic-data UAT required.
14. Assistant and BPAN decoding — conversation authorization and contract blockers remain.
15. Documents and storage adapters — private metadata/download authorization blocked.
16. PDF exports — untrusted HTML/network/browser hardening and provider acceptance open.
17. Jurisdiction configuration (historically EU, IN, CN, US, UK, TH, ID) — not seven certified regimes.
18. Currency options (historically 30+) — not settled multi-currency payment evidence.
19. Language options (historically EN, DE, FR, ZH, HI) — translation completeness unverified.
20. CirculWiki and feedback interfaces — no real-user feedback evidence supplied.
21. Getting Started tutorial — retain current test-report limitations.
22. Admin users/audit — test all privilege and resource boundaries.
23. Locale/currency/timezone/jurisdiction settings — authorization/persistence acceptance required.
24. Developer portal/API key interface — scope enforcement and SDK availability unverified.
25. REST API v1/OpenAPI inventory — endpoint presence is not workflow acceptance.
26. MCP interface (historically 20 tools) — count and all-tool behavior not revalidated here.

### 6.2 Advanced/scaffolded inventory

27. Digital twin forecasting — numeric/UI defects; not accepted forecasting.
28. Carbon accounting — unit/methodology defects; not certified accounting.
29. Federated learning — metadata/scaffold, not proven distributed training.
30. Blockchain audit — hash/block displays do not establish external chain verification.
31. Multi-party data sharing — tenant/consent enforcement unverified.
32. Autonomous triage — execution/approval workflow not accepted.
33. Predictive procurement — forward-order matching/notifications not accepted.
34. Solid-state chemistry parameters — not experimentally validated chemistry support.

Unsupported interfaces must be clearly labeled demo/scaffold/unknown or disabled before a broader release.

## 7. Local Remediation and QA Boundary

The November 17 development fixes cover alert authorization, MQTT synthetic-source preservation, simulator resistance units, role-aware alert UI, environment-only PostgreSQL resolution, explicit-input admin bootstrap scripts and gateway REST transport. Final local verification is complete; these newer fixes are **not deployed to Render**. The saved development identifier is recorded in the evidence summary; the live release remains `54920faa`. Consult [RETEST_SECURITY_REPORT.md](RETEST_SECURITY_REPORT.md) for exact counts, commands, warnings and remaining defects.

MQTT source labels preserve synthetic declarations for paging exclusion but are not hardware authentication; synthetic data/state isolation remains incomplete. The simulator fixes a pack/cell resistance-unit error but remains uncalibrated with known nonphysical edge cases. Role-aware alert UI has focused local desktop/mobile browser evidence, not a controlled production rollout or whole-module acceptance.

Strix did not run. Semgrep zero matches do not establish security. Dependency advisories persist. Prior local/browser suites used isolated data, mocked/disabled providers and mobile Chromium emulation, not full live provider certification or real iPhone/Safari acceptance.

## 8. Release Blockers and Measurement Plan

| Area | Remaining gate |
|---|---|
| Credentials and recovery | Release the tested environment-only source; revoke old exposed credentials only after client checks/approval; download protected export and exercise restore/rollback. |
| Authentication | Verify successful production email/password login and separately authorized recovery delivery; configuration repair alone is not proof. |
| Authorization/privacy | Complete two-account/organization/admin tests for warranties, assistant sessions, documents, devices, lifecycle, declarations, listings and all alternative surfaces. |
| Payments | Bind offer/listing/seller/amount/currency, reservations, idempotent monotonic settlement, refunds and payout before any real-money acceptance. |
| Battery safety/data | Canonical IDs/BPAN, physical/date validation, atomic writes, yield credits, revocation and broker ACL/topic/device binding. |
| Model/compliance | Correct carbon/SOH/twin/triage formulas and contracts; independently validate methodology; remove unsupported accuracy/compliance claims. |
| Operations | Measured availability, external outage detection, recovery tests and real provider delivery; PagerDuty stays disabled pending its own gates. |
| Security tooling | Triage dependency advisories; authorized Strix follow-up in a suitable environment, not an assumed completed scan. |

Performance, availability, accessibility, regulatory coverage, currencies, languages and model accuracy are **targets or inventories**, not measured current KPIs in this brief. Establish the metric, workload, environment, sample period, source and owner before publishing a result. Historical July development phases remain historical records, not signed acceptance or evidence of migration reconciliation.

## 9. Ownership and Related Documents

Product/engineering ownership remains with Circul-AI-r / Setoo. Release sign-off, operational runbooks and incident policy require explicit owner approval. This handoff includes the brief, delivery inventory, QA plan, persona research protocol, retest report, release gates and PagerDuty runbook; it does not establish commercial acceptance.

See [DELIVERY_DOCUMENT.md](DELIVERY_DOCUMENT.md) for handoff inventory, [QA_DOCUMENTATION.md](QA_DOCUMENTATION.md) for unexecuted/manual cases and [USER_PERSONAS_AND_FEEDBACK.md](USER_PERSONAS_AND_FEEDBACK.md) for safe voluntary recruitment. Historical API, architecture and deployment guides are navigation aids and must be checked against the current source and release gates before use.
