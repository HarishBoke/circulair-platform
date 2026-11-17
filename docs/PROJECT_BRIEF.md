# Circul-AI-r Platform — Project Brief

**Version:** 4.0 — evidence-bounded, all-user handoff
**Document date:** 18 November 2026
**Audience:** Battery owners, manufacturers, fleet and service teams, recyclers, buyers, compliance reviewers, administrators and operators
**Application:** https://circulair.energy
**Disposition:** Existing application live; new repairs local and unreleased; physical pilot and broader launch acceptance pending

## 1. Purpose and Current Boundary

Circul-AI-r connects battery identification, lifecycle records, telemetry, health estimates, second-life listings, logistics records and draft compliance information. Its intended benefit is a clearer record of what is known about an asset, who owns it and what evidence is still missing. A record, estimate or draft is not proof of battery condition, official registration, regulatory approval or an executed external action.

The application is designed to run **standalone on Render**, using its own email/password authentication, JWT sessions and managed PostgreSQL. Normal operation does not require a development-agent session, sandbox process, agent scheduler or additional authentication vendor. Existing direct provider adapters remain subject to their own configuration and acceptance gates; this is not a claim that every provider works.

The chosen open-source monitoring and notification alternative is **Uptime Kuma, ntfy, private Alertmanager, a restricted Caddy gateway and an application-owned incident worker**, all hosted on Render. Implementation and cost approval do not mean that these services have been created or activated.

This brief replaces historical blanket completion and acceptance statements. It does not establish universal functionality, uninterrupted availability, security certification, calibrated model accuracy or battery safety. Deliberately disabled actions are restrictions, **not completed functional workflows**.

## 2. Dated Production and Development Snapshot

All verification times below are UTC. The document date is 18 November; the latest recorded checks occurred on 17 November. This documentation refresh performed no new production or browser checks.

| Area | Recorded state | Remaining boundary |
|---|---|---|
| Live Render release | Commit **`122e209b`** (`122e209b52cdcd01f55690363193d7a09659e0c2`), deployment **`dep-dbua7eui0phs7397qbng`**, latest read-only settings verification **17 November at 23:09:40 UTC**, **Set 5k / Standard / Oregon / main**, service **`srv-d87hoqcm0tmc739tv580`** | New remediation is an unreleased candidate; source publication status is recorded separately in dated delivery evidence. The older `54920faa` release is not current. No new production login, release, SQL, resource or payment-inventory action occurred. |
| Release control | Settings read **17 November at 23:09:40 UTC**: Render **AutoDeploy Off / PR Previews Off** | No local change or passing build automatically updates production. A controlled release remains pending. |
| Existing-user login | Native sign-in followed by same-origin session check returned **200** at **19:17 UTC**; repeat check returned **200** at **19:40 UTC**. Authenticated role and dashboard were present; password hash was absent from the response. | Reload, logout, recovery-email delivery and cross-tenant production acceptance remain pending. No account creation/reset or customer-record inspection was part of those checks. |
| Database and recovery | Existing Render PostgreSQL connectivity and replacement login were previously verified; protective logical export was ready on **17 November at 07:41 UTC**. | The export is not evidenced as downloaded or restore-tested. Old exposed DB credential remains valid/retained; retirement and ingress review remain open. |
| Current local regression | Exact **Node 24.14.1 / pnpm 10.34.5**; final root run started **17 November at 22:54:20 UTC**: **65 suites, 1,916 passed, 0 failed, 28 opt-in PostgreSQL cases skipped, 1,944 collected**; typecheck exit **0** | Earlier exact sterile CI-default acceptance passed the same totals, typecheck, normal frontend/server/real-worker build, worker **8/8** and Python **50/50**, before the font fix. Final exact sterile default-CI-equivalent acceptance completed **23:12 UTC**; see the distinct matching-source proof below. Local checks do not establish hosted CI; verify the exact candidate run before release, separately from production/provider/hardware/UAT acceptance. |
| Fresh browser / HTTP | Full Chromium **178/178**, started **22:55:03 UTC**; focused **18/18**, started **22:54:22 UTC**; Getting Started **4/4**; HTTP **14/14** | Fresh guarded server per suite, one worker, zero retries/skips/flaky cases; mostly auth gates, not 100% business-positive workflows or real iPhone/Safari acceptance. |
| Local pilot persistence | Actual private-QA PostgreSQL acceptance passed **15 groups each** through TSX and compiled ESM, including real store, native RPC and loopback REST. | Synthetic fixtures only; no physical battery or production pilot migration. |
| Monitoring | Native checks **9/9**; final affected Kuma/gateway container acceptance **105/105** (**97 + 8 gateway restart**), completed **23:04:33 UTC**; no resources created | Nonroot descendants and **CapPrm/CapEff/CapInh/CapAmb = 0** across 19 snapshots; **CapBnd is not zero**. Render disk ownership/memory/readiness, receiver, relay and paging remain separate gates. |
| CI/security | GitHub CI configured locally; **not started at document preparation**. Local checks do not establish hosted CI; verify the exact candidate run before release. Final selected Semgrep **23:08:48 UTC**: **294 rules / 451 targets / 10 flags / 12 parser/error entries / approximately 99.9% parsed / exit 0**. Dependency audit: **42 full-graph / 16 production-scope** occurrences | Ten operator-controlled subprocess QA flags retained, not suppressed. Initial **20:38 UTC, 14 flags / 449 targets / 13 errors** and accepted **21:02 UTC, 10 flags** preserved. Strix **not run**; no full penetration test or live-tree audit. |

The full dependency breakdown is **3 critical, 14 high, 20 moderate, 5 low** for the full graph; **0 critical, 8 high, 5 moderate, 3 low** for production scope. These are advisory occurrences, not demonstrated exploit counts or a clean-security certificate.

The final Home heading preserves all words with responsive font sizes **24 / 30 / 36 / 48 px**, fixing **320 px viewport / 341 px scroll-width overflow**. Earlier pre-origin **16/18** and **175/178** failures remain: two hostile-Origin 500s, malformed-auth 429 after shared rate budget, and overflow. Post-origin **177/178** failed only overflow; a decorative-wrapper-only attempt also failed before the narrow font fix passed fresh **178/178**. Final suites kept the unchanged rate budget, used no MCP/CDP or existing browser, and all owned servers stopped with exit **0**, port **3001** closed. Fresh synthetic legacy fixtures used **21 batteries plus one informational alert per bounded fresh owner**, explicitly not official generator output; generator remains disabled **412**, read-only decode unverified and foreign read **404**.

Final exact sterile CI-equivalent acceptance completed **23:12 UTC**, from a **454-file** snapshot including final Home font and both Dockerfiles with all `.env` filenames omitted: default Vitest configuration (no custom setup), started **23:09:37 UTC**, **65 suites / 1,916 passed / 0 failed / 28 opt-in PostgreSQL skipped / 1,944 collected**, **61.63 seconds**; typecheck **0**, normal frontend/server/real-worker build **0**, compiled worker **8/8**, Python compile **0**, offline Python **50/50**; **all six command exits 0**. The earlier **22:54:20 UTC** guarded root run is a distinct positive snapshot, not the default-CI proof. Local checks do not establish hosted CI; verify the exact candidate run before release. Hosted CI had not started at document preparation; later source publication and hosted-run status are separately dated delivery evidence.

## 3. Users, Ownership and Responsibilities

The seven stakeholder groups describe business workflows, **not seven independently verified permission systems**. Native authenticated identity, server-side ownership and explicit administrator entitlement determine access. A manufacturer name, registrant, regulator label, API argument or device's own declaration does not confer permission.

| User group | Intended work | Access and acceptance expectation |
|---|---|---|
| OEM / fleet owner | Register and review assets, service and warranty records | Own or explicitly authorized records; estimates require independent evidence before operational decisions. |
| Battery manufacturer | Associate production specifications, local identifiers and declarations | Authorized records only; official BPAN allocation and declarations remain unverified. |
| Recycler | Review intake, yield evidence and draft reporting | Authorized records; no official credit issuance or filing inferred from an internal status. |
| BESS developer / buyer | Compare second-life candidate records and nonbinding offers | Published/authorized information only; real purchase, payment and settlement remain unavailable. |
| Service provider | Review assigned assets, devices and service history | Assignment/ownership must be enforced by the server; no hardware commissioning implied. |
| Government / compliance reviewer | Review approved read-only draft information | No automatic global access, agency endorsement or official approval. |
| Platform administrator | Manage approved users, global rules and operational review | Explicit admin role; privilege is audited and does not override local-pilot ownership. |

Current local repairs use current-owner predicates for battery details/history and scoped private data. Global alert rules and global analytics are admin-only; ordinary users request rule changes. An alert's read status is not incident acknowledgement or recovery. Every alternative API and user-facing positive path still needs its own accepted scope; these controls are not platform-wide tenant certification.

Product owns scope and claims; engineering owns contracts and regression; operations owns release, credentials, backups and monitoring. An asset owner, qualified hardware operator and safety lead must approve a physical pilot. Compliance methodology needs qualified review. A research coordinator owns voluntary user feedback and consent. These are responsibilities to assign, not invented named approvers or signed acceptance.

## 4. Architecture and Component Status

The retained architecture is a React 19 / TypeScript SPA using Tailwind CSS, shadcn/ui and wouter; an Express / tRPC backend with bounded REST and MCP surfaces; Drizzle and Render PostgreSQL; and Socket.IO, MQTT and direct provider adapters where applicable. Inventory describes source, not every deployed behavior.

| Component | Implemented or repaired locally | Disabled, unverified or still gated |
|---|---|---|
| Authentication and dashboard | Native JWT/password flow; existing-user production success and bounded fresh local Chromium/focused checks recorded. Real returned counts and explicit unknown/error states retained locally. | Production reload/logout, recovery delivery, real-device/Safari and broader owner-positive workflows pending; auth gates do not complete them. |
| Registry and lifecycle | Shared 19-/21-character read compatibility, canonical related IDs and current-owner checks. | Legacy/local identifiers are not official BPAN enrollment. Real lifecycle and ownership-transfer acceptance remains bounded. |
| Private warranty/declarations | Actor-scoped helpers, canonical identity, bounded histories and transactional claim handling; draft/pending declaration labels. | Public contact lookup/publication and unsupported issuer/sync actions unavailable; issuer adjudication and real-provider acceptance not established. |
| Local battery pilot | Native owner-only page and RPC; separate asset/device/readings store; once-issued credential and irreversible revocation. | Defaults Off; production migration/release and genuine BMS acquisition not accepted. |
| Legacy telemetry/MQTT | Read-only broker presentation without anonymous-broker forms; strict validation and synthetic-write restrictions. | Operational legacy ingestion lacks a verified acquisition adapter and is unavailable. Topic matching or a source label is not authenticated hardware provenance. |
| Alerts and incidents | Admin global rules; owner alert views; durable generic incident hook in the same `createAlert` transaction; native admin incident router. | Both delivery flags Off; all current alert callers lack trusted live context and are nonpaging. No sender runs inside the request transaction. |
| SOH, carbon and digital twin | Bounded unit/formula and presentation repairs; zero versus unknown preserved; deterministic estimates/scenarios labeled uncalibrated. | No validated prediction accuracy, safety cutoff or regulatory methodology; triage approval, training and autonomous execution unavailable. |
| Analytics and health | No fabricated uptime/CO2/warranty metrics. Health performs an actual PostgreSQL `SELECT 1` locally and distinguishes provider states not checked. | A current health snapshot is not uptime history or proof that email, storage, MQTT, payments or AI work. |
| Marketplace/logistics | Historical listing, offer, order and manual logistics record interfaces retained with restrictions. | Money actions, real settlement/payout/refund and automatic carrier dispatch unavailable; records do not prove delivery. |
| Compliance/blockchain | Draft records and content-hash-only comparison. | No external chain anchoring, official credits, regulatory filing or certification. |
| Documents/AI/export/developer tools | Historical interfaces and bounded renderer/ownership controls retained; unsupported private/actorless paths fail closed. | Private publication/download, generated AI exports/answers and unsupported SDK/execution need separate acceptance. Mock PDF bytes do not prove real browser rendering. |
| Release/operations | Environment-only DB resolver, real worker build, configured CI and completed affected local container acceptance. | Hosted exact-candidate CI, controlled Render release, restore exercise and Render/provider acceptance pending. |

## 5. Local Physical-Battery Pilot: What Exists and What Does Not

The distinct page is **`/local-battery-pilot`** in the native authenticated layout. It is mounted in local source, **not a live-ready feature at the production URL**. An authenticated owner can create an asset with a local `assetRef` UUID, source-supported profile and consent/provenance references; provision/list devices; read their own readings; and revoke a device. A foreign administrator is still denied. No legacy battery record is silently rewritten or converted into an official identifier.

Provisioning returns an `lp1_` device token **once**. Lists expose neither the token nor its stored hash. The asset-scoped REST reading path is `/api/v1/pilot/assets/<assetRef>/readings`, separate from login JWTs, old API keys and MQTT credentials. It has an **8,192-byte** strict JSON limit, matching units/profile/revision, preserved zeros, transaction-confirmed receipts and duplicate/conflict handling. Private-QA evidence covers **201** new receipt, **200** exact retry, **409** conflicting replay and **401** wrong/revoked token, concurrency, append-only triggers and both revocation lock orderings.

The corrected review-only SQL is `drizzle/local-pilot.sql`, SHA-256 **`edff6d0267a8b38d4f47f3c08f03d57589a989260587d41812e6482735745a3e`**. The older `9f1643…0b86` checksum is superseded after a missing/null-source database CHECK correction. Its 15-group TSX and ESM acceptance uses actual local PostgreSQL and synthetic fixtures, not hardware. There has been **no new production pilot or incident SQL**.

`LOCAL_PILOT`, `officialVerification: unverified` and `physicalAcceptance: not_established` remain explicit. `BMS_REPORTED` is a token holder's declaration, **not verified hardware acquisition**. Ingestion envelopes are plausibility checks, not protective operating limits. Readings do not automatically page, change lifecycle, control equipment or establish SOH.

Use the repository [local pilot guide](../gateway/python-agent/LOCAL_PILOT.md) for profile, token, reading and offline capture-file guidance. It describes the implemented native mounts and actual private-PostgreSQL acceptance; obtain the current reviewed operator run sheet before executing QA or migration commands. The file sender does not read a physical CAN/Modbus/Bluetooth interface. A qualified operator must supply an approved passive capture adapter, asset-specific documentation, calibrated reference/tolerances and a safe stop procedure. No actual battery has been connected or measured, and no real physical feedback exists.

## 6. Chosen Open-Source Operations Alternative

The intended chain is **Render app transaction → existing PostgreSQL incident store → Render worker → restricted Caddy HTTPS publisher ingress → private Alertmanager → authenticated ntfy**. Kuma separately observes the approved readiness endpoint; it is independent of the app process but shares Render's provider-wide outage blind spot.

Exactly **five new Oregon resources, one instance each**, were approved at an additional **USD 53.75/month** compute/disk baseline:

| Resource | Type and size | Compute + disk USD/month |
|---|---|---:|
| `circulair-uptime` / Uptime Kuma | Web, 1 CPU / 2 GB; 1 GB disk | 25.00 + 0.25 = 25.25 |
| `circulair-notify` / ntfy | Web, 0.5 CPU / 512 MB; 1 GB disk | 7.00 + 0.25 = 7.25 |
| `circulair-alertmanager` | Private, 0.5 CPU / 512 MB; 1 GB disk | 7.00 + 0.25 = 7.25 |
| `circulair-alert-gateway` / Caddy | Web, 0.5 CPU / 512 MB; no disk | 7.00 |
| `circulair-incident-worker` | Worker, 0.5 CPU / 512 MB; existing PostgreSQL, no disk | 7.00 |
| **Additional baseline** | **Five instances and three 1 GB disks** | **53.75** |

Existing app/PostgreSQL/workspace charges, taxes, metered usage and separately charged backup/maintenance are excluded. No extra resource, new database, automatic upsizing, workspace upgrade or domain purchase is authorized. **None of the five resources has been created.** Creation approval is not migration, activation, notification or bootstrap approval.

The real worker artifact is now part of the normal local build, not a placeholder. Its default is one finite cycle; an approved but delivery-disabled daemon idles at **15 seconds**, performs no DB work and exits gracefully on SIGTERM. Native admin incident status is configuration-only with zero DB access while gates are Off; commands fail closed with `CONFLICT`. Current producers remain contextless/nonpaging. Old PagerDuty rows are retained inactive with no historical replay or rerouting.

Kuma sudo **4755 → 755** prevents the optional native NSCD root daemon without changing container flag **`1`**, upstream code, sudoers or general-settings DB. Existing build-time `setcap -r` removed only unused Caddy **`cap_net_bind_service=p`** from Kuma and gateway with exact 755 guards; pins stayed unchanged, one new build each. Their final native startup/restart/auth/readiness/ingress/SIGTERM checks passed **105/105**; ntfy/Alertmanager retain prior positives, not new strict capability proof. Prior **109 = 106 pass / 3 fail** and sudo **92 = 80 pass / 12 fail** remain immutable; new preflight **8 = 7 pass / 1 wrong-tag QA-oracle fail** and mount exit **125** interruption remain separate; new raw **113 = 112 pass / 1 fail**, not cumulative all-passed. Cleanup: **66 private files 0600 / 8 directories 0700 / env 0600**, no owned containers/mapped application-UID processes; new secret scan **181 files / 72 candidates / 0 matches**. Disabled cgroups do not prove 2 GB enforcement; Render disk ownership remains conditional, not an all-OS audit.

Alertmanager's receiver, live-context activation and paging remain Off. HTTP acceptance does not establish phone display, human acknowledgement or physical recovery. Instant iPhone ntfy wake-up may need a separate consented `ntfy.sh` relay/APNs/Firebase path carrying hashed-topic, message-ID and timing metadata. That consent is not supplied, and no actual phone paging has occurred. See the [monitoring operator guide](../infra/monitoring/README.md) and [open-source incident guide](OPEN_SOURCE_ALERTING.md); their earlier mount/build proposals are superseded by the local status above, not an instruction to activate them.

## 7. Acceptance and Next Decisions

The next decision is a **bounded release-candidate review**, not unrestricted launch. Users should follow the [delivery document's acceptance checklist](DELIVERY_DOCUMENT.md#6-all-user-and-operator-acceptance-checklist), with an authorized operator and an agreed isolated scope. Owner-positive workflows must work as well as denied paths; turning a feature Off does not pass its functional acceptance.

Critical pending gates are production native session/reload/logout acceptance; broader owner/admin/cross-tenant positive and negative tests; corrected pilot and incident SQL review; Render runtime/disk/memory acceptance; hosted GitHub CI on reviewed source; controlled release/post-release checks; protected restore/rollback; old credential retirement after all-client approval; physical capture/calibration; notification/relay consent and real recipient evidence; remaining dependency/security review; and in-flight financial inventory/manual reconciliation before a webhook-rejecting release. No such payment inventory has run.

No real-user recruitment, interviews, feedback scores, endorsements or acceptance signatures are evidenced. The seven [persona groups and feedback protocol](USER_PERSONAS_AND_FEEDBACK.md) remain planning tools. Product feedback cannot waive engineering, privacy, financial, safety or compliance gates.

## 8. Portable Documentation and Evidence

Start with [DELIVERY_DOCUMENT.md](DELIVERY_DOCUMENT.md), [QA_DOCUMENTATION.md](QA_DOCUMENTATION.md), [USER_PERSONAS_AND_FEEDBACK.md](USER_PERSONAS_AND_FEEDBACK.md) and [RELEASE_GATES.md](RELEASE_GATES.md). The QA, persona, release-gate and [retest report](RETEST_SECURITY_REPORT.md) now share this final evidence boundary and retain dated historical snapshots; use their detailed cases and unresolved requirements without treating older release/login/test totals as current. Neither the brief nor a linked checklist is a sign-off certificate.

[ARCHITECTURE.md](ARCHITECTURE.md), [PLATFORM_GUIDE.md](PLATFORM_GUIDE.md), [API_REFERENCE.md](API_REFERENCE.md), [MCP_GUIDE.md](MCP_GUIDE.md), [HOW_TO_GUIDES.md](HOW_TO_GUIDES.md) and [COMPLIANCE_GUIDE.md](COMPLIANCE_GUIDE.md) are navigation/reference material that must be checked for dated instructions. Legacy [PagerDuty guidance](PAGERDUTY_RUNBOOK.md) is historical, not the selected activation plan.

Ask the release owner for the sanitized, dated evidence package through the team's approved documentation channel. It should include release/session records, the `remediation-final-*` logs, pilot TSX/ESM records, incident integration/outbox findings and monitoring evidence, tied to the exact source snapshot. Repository-relative links above travel with the source handoff; private sandbox paths, credentials and raw customer/session records are not required user access routes.
