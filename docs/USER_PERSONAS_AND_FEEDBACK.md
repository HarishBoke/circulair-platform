# Circul-AI-r Platform — Fictional Role Composites and Real-User Feedback Guide

**Document version:** 4.0 — 18 November 2026 boundary refresh
**Purpose:** Plan safe manual UAT for seven user categories; recruit real consenting reviewers and capture evidence without inventing results.
**Research status:** No real recruitment, participant session, quote, completed scorecard, consensus or sign-off is evidenced here.

## 1. What This Document Is — and Is Not

**All seven personas below are FICTIONAL COMPOSITES.** They describe possible workflows and needs to investigate, not real profiles or findings. There are no invented personal names, companies, employers, ages, operational volumes, losses or quotations. A role description implies no organization, OEM or government endorsement. Goals and pain points are hypotheses until a consenting real reviewer supplies evidence.

The earlier July “real reviewers,” average scores, approval counts and completed-UAT claims remain superseded. The previous seven specialist composites are replaced with seven broader workflow categories so public users, operators, fleet owners, recyclers, OEM reviewers, administrators and integration developers each have a practical path. Procurement, service, manufacturing and compliance interests can be captured within the appropriate category without claiming an additional real participant or certified role.

This is a **recruitment and feedback protocol, not an executed study or acceptance certificate**. A facilitator script is proposed wording, not a participant quotation. A filled research record must come from an actual consented session. Internal engineering QA must be labeled internal, not external-user research.

Use [QA_DOCUMENTATION.md](QA_DOCUMENTATION.md) for the current manual cases, expected requirements, prior unrun cases, safety rule and role-specific release criteria. [RETEST_SECURITY_REPORT.md](RETEST_SECURITY_REPORT.md) and [RELEASE_GATES.md](RELEASE_GATES.md) provide engineering/release context; check their date and exact build before using older statements. Preference or confidence cannot certify privacy, payment, hardware, physics, scientific accuracy or compliance.

### 1.1 Truthful product description for invitations

| Boundary | What the facilitator may accurately say |
|---|---|
| Production | Full commit **`122e209b52cdcd01f55690363193d7a09659e0c2`**, deployment **`dep-dbua7eui0phs7397qbng`**, latest read-only settings **17 November 2026, 23:09:40 UTC**, **Set 5k / Standard / Oregon / main**, service **`srv-d87hoqcm0tmc739tv580`**, **AutoDeploy Off / PR Previews Off**. Same bounded native login **200 at 19:17 and 19:40 UTC**, dashboard reached, password hash absent. No new production login/release/SQL/resources/payment inventory; production reload/logout and broad tenant acceptance remain unperformed |
| Local repairs | Source is an **unreleased candidate**; publication status is separately dated delivery evidence. Exact **Node 24.14.1 / pnpm 10.34.5** final root run started **22:54:20 UTC**: **65 suites / 1,916 passed / 0 failed / 28 opt-in PG skipped / 1,944 collected**, typecheck **0**. Earlier exact sterile CI-default passed same totals plus normal build **0**, worker **8/8**, Python **50/50** before font correction. Final exact sterile default-CI-equivalent acceptance completed **23:12 UTC**, six command exits **0** including build/worker/Python; hosted CI not started at preparation, verify exact candidate run before release |
| Browser evidence | Fresh Chromium **178/178**, started **22:55:03 UTC**; focused **18/18**, started **22:54:22 UTC**; Getting Started **4/4**; HTTP **14/14**. One worker, zero retries/skips/flaky cases, fresh guarded server per suite and unchanged rate budget; no MCP/CDP/existing-browser reuse. Mostly auth gates, not all-business-positive workflows or real iPhone/Safari acceptance; owned servers stopped exit **0**, port **3001** closed |
| Pilot evidence | Separate private QA PostgreSQL TSX and compiled ESM runs each passed **15 groups**, using real store/RPC/loopback REST, not production. Corrected SQL SHA-256: `edff6d0267a8b38d4f47f3c08f03d57589a989260587d41812e6482735745a3e`; nullable source CHECK corrected to require `IS TRUE`; **no new production pilot or incident SQL** |
| Incident boundary | Separate incident **123 tests** include 28 guarded real local PG with mocked sender, 35 offline and 60 adapter; new integration has **47 tests**. Do not merge these counts into full-suite totals. Same-transaction trusted-live/critical-only gating exists locally; all current `createAlert` callers remain contextless/nonpaging |
| Security | Full/production-scope advisory occurrences **250 → 42 / 155 → 16**. Residual full: **3 critical, 14 high, 20 moderate, 5 low**; production: **0 critical, 8 high, 5 moderate, 3 low**. Strix **NOT RUN**; final Semgrep **23:08:48 UTC**, **294 rules / 451 targets / 10 flags / 12 errors / approximately 99.9% parsed / exit 0**. Four explicit-USER flags removed; ten operator-controlled QA subprocess flags retained unsuppressed. Initial **20:38 UTC, 449 / 14 / 13** and post-hardening **21:02 UTC, 451 / 10 / 12** preserved; not full pentest/zero vulnerabilities |
| Money/providers | Money actions **disabled, not functional**; webhook non-2xx. In-flight inventory, retry deadlines and accountable manual reconciliation required before webhook-rejecting release; no payment inventory occurred. No provider payment, S3/private-storage, email, restore, phone, calibration or OEM-decoder acceptance; no official BPAN issued |
| Monitoring | Exact five single-instance Oregon services already approved at **$53.75/month additional compute/three-disk baseline**, not a reconfirmation or automatic increase; **not created**. Native **9/9**, final affected Kuma/gateway **105/105**, 19 nonroot/zero-granted-capability snapshots; ntfy/Alertmanager retain earlier positives, not new strict proof. Render disk/memory/readiness and restore remain pending. Receiver/relay/paging OFF; no iPhone push, consented acknowledgement or physical notification; same-Render blind spot remains |

No local unit, real private-database or native-infrastructure result is a recruited-user session. The 28 full-suite skips are explicit opt-in cases, separately executed successfully in the bounded incident work; they are not ignored failures and must not be relabeled as full-suite passes.

The Home heading preserves words at **24 / 30 / 36 / 48 px**, fixing **320 px viewport / 341 px scroll-width overflow**. Preserve pre-origin **16/18** and **175/178** (two hostile-Origin 500s, shared-budget malformed-auth 429 and overflow), post-origin **177/178** (overflow only), and failed decorative-wrapper-only attempt; narrow font fix passed the fresh **178/178**. Synthetic legacy fixtures were **21 batteries plus one informational alert per bounded fresh owner**, explicitly not official generator output; generator stays **412 disabled**, read-only decode unverified and foreign reads **404**.

Final affected monitoring changes only removed Kuma sudo setuid (**4755 → 755**) and unused Caddy **`cap_net_bind_service=p`** via existing guarded `setcap -r` in Kuma/gateway, exact pins preserved, one new build each. Container flag **`1`**, upstream/settings DB unchanged. **CapPrm/CapEff/CapInh/CapAmb = 0** for nonroot descendants across 19 initial/restart/post-auth snapshots, including pre-QA exec; **CapBnd is not zero**, not an all-OS audit. Preserve prior **109 = 106 pass / 3 fail**, sudo **92 = 80 pass / 12 fail**, new preflight **8 = 7 pass / 1 wrong-tag QA-oracle fail** with mount exit **125**, and new raw **113 = 112 pass / 1 fail**. Cleanup **66 private files 0600 / 8 dirs 0700 / env 0600**, owned containers/mapped application-UID processes zero; new secret scan **181 files / 72 candidates / 0 matches**. Disabled cgroups do not prove 2 GB enforcement; actual native details remain in the [monitoring guide](../infra/monitoring/README.md).

**`/local-battery-pilot`** is owner-only, uses UUID/local profiles created once and displays an **`lp1_` ingestion credential once in a read-only field**; later device lists must not expose tokens/hashes. There is no accepted hardware adapter. `BMS_REPORTED` is a declaration, not physical inspection, genuine BMS acquisition, calibration or verified-live paging eligibility. Append-only records/revocation do not prove physical shutdown. Local labels/passports are nonofficial. No automatic paging is produced by the current pilot or contextless alert callers, even if flags were later enabled.

Final exact sterile CI-equivalent acceptance completed **23:12 UTC**, from a **454-file** snapshot including final Home font and both Dockerfiles with all `.env` filenames omitted: default Vitest configuration (no custom setup), started **23:09:37 UTC**, **65 suites / 1,916 passed / 0 failed / 28 opt-in PostgreSQL skipped / 1,944 collected**, **61.63 seconds**; typecheck **0**, normal frontend/server/real-worker build **0**, compiled worker **8/8**, Python compile **0**, offline Python **50/50**; **all six command exits 0**. The earlier **22:54:20 UTC** guarded root run is a distinct positive snapshot, not the default-CI proof. Local checks do not establish hosted CI; verify the exact candidate run before release. Hosted CI had not started at document preparation; later source publication and hosted-run status are separately dated delivery evidence.

## 2. Seven Fictional Composite Role Categories

The manual cases referenced below are **Not run** until separately executed and recorded on an approved build. Where a feature/environment is unavailable or a safety/provider gate is unmet, record **Blocked**. A role category is not an account-permission guarantee: provision and verify the actual least-privilege role before testing, and never substitute admin to make an ordinary-user task succeed.

All **54 new manual cases remain NOT RUN**; all **seven personas are fictional**, and all scorecards remain blank. Local browser/container acceptance is not actual UAT.

### P1 — Public / Prospective User (FICTIONAL COMPOSITE)

**Context hypothesis:** Someone evaluating the public site or a shared sample without a platform account. Technical experience may vary. They may need to understand what a public label means before deciding whether to request access.

**Need hypotheses:** Clear sign-in, minimal public information, readable limitations and a way to report confusion. Ambiguous empty screens, local identifiers or impressive-looking labels may be mistaken for verified evidence.

**Planned manual tasks:** PUB-01–04 and applicable UAT-C01/C08–12. Review an approved synthetic public sample, find sign-in from a private destination, distinguish public from private fields, and explain draft/nonofficial/unknown/disabled-money labels. No private data or account mutation.

**Neutral prompts:** “What do you think this label proves?” “Which information should be public?” “What would you expect to happen next?” “How would you tell that a feature is unavailable rather than successful?”

**Boundary:** No official BPAN/passport, purchase, public private-document access or guaranteed availability claim. Understanding the page does not certify it.

### P2 — Operator / Field-Service User (FICTIONAL COMPOSITE)

**Context hypothesis:** Someone reviewing an assigned asset, telemetry or service information, possibly on mobile. This could include a technician or operational coordinator; no employer or actual reviewer is asserted.

**Need hypotheses:** Correct asset binding, clear timestamps/units, useful connection/errors and a safe escalation path. Missing readings and empty alerts might otherwise be interpreted as zero measurements or healthy equipment.

**Planned manual tasks:** OPS-01–04 plus relevant shared sign-in, ownership, zero/unknown, error and mobile cases. Find an assigned synthetic asset; review known readings; mark an owned alert read only in approved QA; request, rather than make, a global threshold change; review revoked/disconnected instructions without a device connection.

**Neutral prompts:** “How do you know which asset this is?” “What does an absent reading tell you?” “What would you do if this connection failed?” “Who should approve a threshold change?”

**Boundary:** Ordinary operators cannot manage global rules. Mark-read is not on-call acknowledgement/recovery. No real device commissioning, thermal event, BMS trust or safety recommendation is accepted.

### P3 — Fleet Owner / Asset Owner (FICTIONAL COMPOSITE)

**Context hypothesis:** Someone responsible for a small or larger asset group who needs to create a local record and manage authorized access. Fleet/procurement interests can be explored without assuming operational scale.

**Need hypotheses:** One unambiguous local identity, owner-private records, a clear one-time credential flow, accurate readings and understood revocation. Local UUIDs and a source declaration could be mistaken for official identification or physical proof.

**Planned manual tasks:** FLT-01–04 plus shared auth/ownership/error tasks. Create one disposable profile at `/local-battery-pilot`; reopen it; review a prepared device/reading fixture; observe the one-time read-only credential UI without capturing it; revoke a disposable device; compare A versus B ownership, including a foreign admin fixture handled by the facilitator.

**Neutral prompts:** “What identity was created, and is it official?” “What would you do if the one-time credential was lost?” “Which records remain after revocation?” “What does this source declaration establish—and not establish?”

**Boundary:** Profile creation is once-only/append-only, not an editable production registry. No physical-label attestation, accepted hardware adapter, real procurement/payment or physical shutdown proof. Use fixture credential handling, not real tokens in notes.

### P4 — Recycler / Recovery-Evidence Reviewer (FICTIONAL COMPOSITE)

**Context hypothesis:** Someone reconciling intake, recovery evidence or a draft report. A compliance-oriented reviewer may join under this category in a personal/authorized usability capacity, without agency endorsement.

**Need hypotheses:** Scoped identifiers, evidence provenance, units, reporting period and organization context. Repeated credits, omitted measurements or draft documents may be misleading.

**Planned manual tasks:** REC-01–04 plus privacy/zero/unknown/error tasks. Trace a synthetic intake and approved private evidence; compare positive/zero/invalid/repeated yield fixtures; review a draft ledger; inspect an authorized versus prohibited lifecycle transition. Writes occur only if the owner has approved a validated disposable QA fixture.

**Neutral prompts:** “What evidence would you need to reconcile this intake?” “Can you identify organization and period?” “How would you detect a repeated entry?” “Which fields or documents should not be public?”

**Boundary:** No real processing/transport, official credit, certificate, regulatory filing or process-safety approval. A missing workflow is Blocked, not a fictional completed report.

### P5 — OEM / Manufacturing-Quality Reviewer (FICTIONAL COMPOSITE)

**Context hypothesis:** Someone reviewing manufacturing identifiers, sample batch imports, warranty/service evidence or draft declarations. This role can include engineering, quality or compliance experience without claiming any OEM relationship.

**Need hypotheses:** Consistent identifiers across consumers, precise import errors, reported versus estimated data and explicit evidence gaps. Model output may otherwise be interpreted as calibrated SOH or a real BMS measurement.

**Planned manual tasks:** OEM-01–04 plus shared ownership/privacy/zero/unknown cases. Inspect reviewed valid/invalid/duplicate synthetic CSV rows; compare reported, missing and estimated metrics; review draft passport/warranty/service and known-unit declaration fixtures; describe the decoder/acquisition/calibration evidence needed before operational use.

**Neutral prompts:** “Which identifier would you use downstream?” “Which values are measurements, estimates or unknown?” “What source or unit is missing?” “What independent acceptance is needed before using this with real equipment?”

**Boundary:** No OEM decoder/hardware calibration, scientific accuracy, actual warranty claim, ERP connection, official BPAN allocation or regulatory acceptance. No confidential production or customer export is requested.

### P6 — Administrator / Platform Operations (FICTIONAL COMPOSITE)

**Context hypothesis:** Someone accountable for access, audit, feedback and operational interpretation. This is not a real named staff reviewer or assumed authorization to change production.

**Need hypotheses:** Clear privilege boundaries, honest disabled/unknown health, auditability and explicit incident/reconciliation responsibilities. Empty status counts may otherwise appear healthy.

**Planned manual tasks:** ADMIN-01–04 and INC-01–04 with an explicitly provisioned QA admin. Compare ordinary/admin global-rule permissions using disposable fixtures; view default-off incident status and denied commands; inspect sanitized synthetic audit/feedback; discuss manual money reconciliation and a provider-wide outage tabletop.

**Neutral prompts:** “Which state is measured versus configured or unknown?” “What does `databaseReady:false` mean?” “What evidence would you need before enabling delivery or declaring recovery?” “Who owns reconciliation and escalation?”

**Boundary:** OFF status is configuration-only, not live DB health; mounted OFF commands fail closed, including destination review. No production role/settings/SQL, five-service creation, paging, relay, phone push or human acknowledgement test. Render remains a single-provider blind spot.

### P7 — Integration Developer / API Reviewer (FICTIONAL COMPOSITE)

**Context hypothesis:** Someone evaluating the native and ingestion contract for a possible future integration. Technical experience may vary; willingness to review documentation does not establish an implemented integration.

**Need hypotheses:** Clear session/device-auth separation, exact error/receipt semantics, bounded wire schema and honest trust limits. An authenticated submitted value might be mistaken for trusted physical acquisition.

**Planned manual tasks:** DEV-01–04 and approved PIL observation cases. Review local profile/credential contracts; observe synthetic loopback prepared new/replayed/changed readings; inspect revoked/foreign/invalid requests; explain disabled-feature behavior and why `BMS_REPORTED` or caller “live” claims cannot auto-page.

**Neutral prompts:** “What does a 201 versus 200 receipt mean?” “Which response distinguishes a changed replay?” “How should a client handle revocation or missing data?” “What server-owned acquisition evidence is absent?”

**Boundary:** Use only reviewed disposable fixtures supplied by an authorized facilitator. No production requests, raw SQL, copied credentials, external integration, hardware adapter or notification activation. Real-store engineering passes are separate from this manual review.

## 3. Recruit Actual Consenting Reviewers

### 3.1 Recommended small exploratory round — not a completed sample

An authorized research coordinator should **recommend one or two consenting real reviewers per category**, then review gaps and recruit more only as needed. This is a proposed exploratory target, not an achieved count, statistically representative sample or claim of market consensus. Recruit varied technical experience and relevant desktop/mobile/accessibility needs. Include a public/non-specialist perspective rather than only insiders.

Use permission-based professional contacts or opt-in communities after outreach approval. Do not scrape contact lists, impersonate employers or infer consent from a public biography. For OEM/recycler reviewers, relevant experience is sufficient; do not publish company identities as endorsements. For an unavailable role, report **not recruited**. An internal QA tester can provide internal findings but cannot fill an external-reviewer gap under a false label.

Suggested minimal screener fields are role category, recent relevant workflow experience in broad terms, preferred device/language, optional accessibility accommodation, availability and any confidentiality/workplace-permission constraints. Do not request names of customers, credentials, employee IDs, asset/BPAN lists, commercially sensitive figures or proof via a private production export. Contact details belong in a separate restricted recruitment record, not the shared scorecard.

No invitations, appointments, compensation, participant recruitment or messages have been arranged by this document. Compensation, if approved, must be disclosed before consent and must not depend on a positive rating or successful completion.

### 3.2 Invitation template — send only after authorization

> We are inviting volunteers with experience in [role-relevant workflow], or public users interested in understanding the site, to a 30–45 minute exploratory usability review of Circul-AI-r. We will use an approved isolated test environment with synthetic data or a clearly labeled prototype. Several features are incomplete, disabled or unverified; this is not a certified safety, payment or regulatory system. Participation is voluntary: you may skip a task, decline recording or stop at any time without affecting services or employment. We will not request customer data, credentials, real payments, broker changes, hardware operation, regulatory submissions or on-call tests. Before the session, we will explain data use and retention and ask for separate consent for notes, recording, quotations and follow-up. Participation does not imply employer endorsement. If interested, reply through the approved channel with your role category and availability.

This proposed text is not a sent invitation or a real-user quote.

### 3.3 Consent and data minimization

Before outreach/session capture, an accountable owner must set the organizer/contact, purpose, audience, restricted storage location/access, **specific retention and deletion dates**, withdrawal/deletion procedure and any anonymization limits. Do not invent a privacy guarantee or leave raw recordings indefinitely retained.

Obtain separate affirmative decisions for participation, note-taking, screen/audio/video recording, quotation use and follow-up. Recording is OFF by default; declining it must not exclude an otherwise eligible reviewer. Explain any workplace-permission concern and allow a participant to decline confidential tasks. No consent for usability research authorizes production mutations, payments, notifications, SQL or hardware trials.

Assign a pseudonymous participant ID. Keep contact and consent evidence restricted and separate from workflow findings. Shared records contain role/build/date/device, task observations and sanitized evidence IDs only. Exclude personal names, faces, email/phone/address, employer-sensitive information, customer identifiers, credentials, tokens, hashes, cookies, private URLs and raw traces. Prefer text observations or tightly redacted screenshots to recordings. Any quotation must be actual, verifiable, separately permissioned and attributed only at the approved pseudonymous level; never reconstruct or blend statements into a supposed quote.

If sensitive data appears, **STOP capture**, secure the material, notify the authorized owner and follow the approved deletion/redaction process. Do not upload raw evidence to a public issue or the feedback UI. Honor stop/withdrawal requests according to the notice; record the handling without publishing identity details.

## 4. Session Setup and Facilitation

### 4.1 Entry checklist

| Item | Required before the session |
|---|---|
| Scope | Owner-approved isolated QA/staging or prototype; production not the default; explicit unverified/blocked features |
| Build | Exact local snapshot/build, date/time/timezone and feature/provider mode. New local repairs not announced as live |
| Accounts/data | Verified least-privilege roles; synthetic A/B owners/foreign/missing/zero/unknown fixtures; explicitly approved separate admin |
| Providers | OFF/mocked: no money, email/storage provider, broker, push/on-call, government filing or live hardware operation |
| Tasks | Two or three role-appropriate cases plus necessary shared cases; approved expected fixture results; facilitator handles any controlled errors/API fixtures |
| Consent/evidence | Plain-language notice, separate choices, retention/deletion dates, restricted records and tested redaction procedure |
| Safety | STOP procedure and owner escalation; no bypasses, no raw SQL, no copying one-time tokens into evidence |

**Force STOP** on participant request, privacy/security exposure, unexpected money/provider action, live hardware contact, distress or a dangerous recommendation. **No hardware trial until qualified specialists separately establish pack-specific operating limits, authenticated acquisition/OEM-decoder behavior and a reviewed emergency-stop/safe procedure.** QA envelope checks, a source declaration, model output or user ratings are not physical safety certification.

Global rules remain administrator-only in the local repair. An ordinary reviewer requests a change; only an approved QA admin handles a reversible disposable rule task. Do not enable notification flags or send a test page to make the demo appear complete. The one-time `lp1_` field can be observed with fixture handling but must never be captured in screenshots/notes.

### 4.2 Proposed 30–45 minute facilitator script

1. **Introduction/consent, about five minutes:** Explain that the design is being tested, not the participant; features may be blocked; synthetic data only; skip/stop is permitted. Confirm participation and notes consent, and separately any recording. Verify accommodations.
2. **Context, about five minutes:** Ask about broad workflow needs without customer/employer secrets. Do not read a fictional composite as the participant's biography or encourage them to match it.
3. **Two or three tasks, about 15–25 minutes:** Give a neutral goal such as “Find the sample asset and tell me which evidence you would need next.” Record build, case and start rule. Observe without coaching; think-aloud is optional. Record assistance and pauses. At a missing/unsafe path, stop and mark Blocked, then ask about expectations without pretending the workflow succeeded.
4. **Debrief, about five minutes:** Ask what was expected, what happened, where uncertainty occurred and what is missing. Invite optional anchored ratings only for experienced dimensions. Read back observations for correction; do not pressure a positive score or launch approval.
5. **Close:** Explain agreed follow-up/deletion channels. Give only approved next steps, no unagreed fixes/deploy dates. Thank the reviewer regardless of criticism or completion.

## 5. Blank Research Forms — Fill Only from Actual Evidence

These templates contain **no completed responses or invented scores**. Leave unknown/unanswered fields blank; use N/A or Not tested explicitly when appropriate. Missing rating is not zero. Behavioral outcome and expected-versus-actual evidence come before ratings.

### 5.1 Restricted recruitment and consent reference

Keep this record restricted; share only participant ID and consent reference with the findings.

```markdown
## Recruitment / Consent Record — blank
Participant ID:
Internal reviewer or external consenting reviewer:
Actual role category / broad relevant experience:
Authorized recruitment channel / coordinator:
Invitation date (if actually sent):
Session scheduled date (if actually agreed):
Restricted contact-record reference (no contact details here):
Workplace permission/confidentiality constraints (minimal):
Device/language / optional accommodation:
Notice version / consent date/time/timezone:
Participation consent decision:
Notes consent decision:
Recording consent decision (OFF until affirmative separate consent):
Quotation-use consent decision:
Follow-up consent decision:
Compensation disclosure reference (if approved):
Access owner / restricted storage reference:
Retention/deletion date:
Withdrawal/deletion procedure reference:
Recruitment status: Not invited / Invited / Declined / Scheduled / Consented / Withdrawn
```

### 5.2 Per-task feedback and evidence record

```markdown
## Session / Task Feedback — blank
Session ID / execution ID:
Participant pseudonym:
Actual role category (P1–P7) / permissions verified:
Internal QA or external reviewer:
Restricted consent reference / notice version/date:
Session date/time/timezone / facilitator:
Environment / exact build or local snapshot / deployed identifier if applicable:
Browser/version / OS / device / real hardware or emulation:
Provider/feature mode (disabled / mocked / approved isolated fixture):
QA case ID / synthetic fixture IDs:

Task goal:
Expected result:
Steps actually attempted:
Actual result (observed; include zero/unknown/empty/error distinction):
Execution status: Pass / Fail / Blocked / Not run
Participant outcome: Completed unaided / Completed with assistance / Failed / Blocked / Not attempted
Completion time / start-end rule / pauses:
Assistance/interventions:
Severity: Critical / High / Medium / Low / None
Safety STOP reason (if any):
Reproducibility / affected role and scope:
Sanitized evidence ID (NO tokens, hashes, cookies, PII or private URLs):
Participant comment (actual only; quotation permission required for quotation use):
Facilitator observation (separate):
Interpretation/hypothesis (explicitly labeled):
Missing information / suggested improvement:
Optional scorecard reference / N/A or Not tested:
Responsible owner / defect ID / proposed next action:
Retest build/date / actual result / evidence ID:
Follow-up permission reference / retention/deletion date:
```

A false-success screen is recorded as actual behavior, not a completed payment or successful persistence. A completed usability task may still reveal defects. A facilitator interpretation is not a participant quote. No consent or score may be inferred from attendance, silence or a fictional persona.

### 5.3 Standard optional feedback scorecard — anchored, unfilled

Use **1–5**, **N/A**, **Not tested** or **Declined**. Apply a score only to the task actually experienced. Intermediate scores 2 and 4 lie between the stated anchors. Do not assign fake consensus or average absent ratings; a small exploratory scorecard is not representative market validation.

| Dimension | 1 anchor | 3 anchor | 5 anchor | What it does not prove |
|---|---|---|---|---|
| Task completion / functionality | Task could not complete as expected | Completed only partly or with material workaround | Completed as expected in this task | Whole-platform functionality or settlement |
| Ease of use | Could not find/understand path without substantial help | Noticeable confusion or some help | Clear path without help | Complete accessibility compliance |
| Information completeness | Essential task information missing | Some useful information missing | Information sufficient for this limited task | Complete mandatory regulatory fields |
| State/label clarity | Could not distinguish error/empty/unknown/disabled/draft | Some states ambiguous | States and nonofficial limits clear | Actual provider health or physical proof |
| Responsiveness perception | Waiting prevented progress | Noticeable waiting but progress possible | Waiting did not interfere | p95/capacity/uptime benchmark |
| Device/accessibility experience | Controls unreadable/unusable in this setup | Barriers requiring workaround | No barrier observed in this task/setup | All-device, Safari/iPhone or WCAG certification |
| Evidence clarity / reported-versus-estimated | Sources/units/unknowns could not be understood | Some evidence or distinction unclear | Evidence and limits understood for this task | Scientific accuracy, safety or trustworthiness of measurement |

Fill a fresh copy per task; the rating column below is intentionally blank.

| Dimension | Rating: 1–5 / N/A / Not tested / Declined | Reason / observed example / evidence ID |
|---|---|---|
| Task completion / functionality | | |
| Ease of use | | |
| Information completeness | | |
| State/label clarity | | |
| Responsiveness perception | | |
| Device/accessibility experience | | |
| Evidence clarity | | |

```markdown
## Scorecard Header / Debrief — blank
Participant pseudonym / session / task ID:
Build / date / role / browser/device:
Behavioral outcome and completion time:
Linked expected-versus-actual record / sanitized evidence ID:
Most important missing item:
What must change before this limited workflow is useful:
Additional comment (not a reconstructed quote):
Facilitator correction/read-back confirmation (if given):
```

### 5.4 Role coverage ledger — no approvals claimed

No recruitment or session evidence has been supplied for these categories. Replace a cell only with linked real consented-session evidence, not a composite narrative or internal test total.

| Category | Recruitment / session evidence | Current research status |
|---|---|---|
| P1 Public | Not supplied | No verified participant/session |
| P2 Operator | Not supplied | No verified participant/session |
| P3 Fleet owner | Not supplied | No verified participant/session |
| P4 Recycler | Not supplied | No verified participant/session |
| P5 OEM reviewer | Not supplied | No verified participant/session |
| P6 Administrator | Not supplied | No verified participant/session |
| P7 Integration developer | Not supplied | No verified participant/session |

For a real round, report invitations/consents/sessions separately; attempted, completed unaided, assisted, failed and blocked tasks with their denominators; time ranges; device/build scope; Critical/High blockers and missing role recruitment. Do not publish a “seven personas approved” result or count hypothetical tasks as sessions. No aggregate score is calculated here.

## 6. Capture Channels and Feedback-to-Action

The historical in-app feedback interface and `/admin/feedback` queue must have current authorized submission/readback/access and error handling verified before they are the record of truth. Empty feedback is not proof of no issues. Use the restricted pseudonymous forms as fallback; do not put raw recordings or secrets in the app. No post-launch survey, NPS, push/reminder channel or regular outreach schedule is created by this document.

Separate **observed defect**, **actual participant suggestion**, **facilitator hypothesis** and **source-confirmed pre-existing blocker**. Link each item to its task/build/evidence ID, assign a responsible owner and review scope/severity. Proposed handling is:

| Severity | Handling |
|---|---|
| Critical | Force STOP for security/privacy exposure, data loss, financial integrity or dangerous outcome; notify authorized owner and protect evidence |
| High | Primary workflow blocked/major incorrect data; remediate and retest before affected release |
| Medium | Partial failure with safe workaround; record limitations and agree priority |
| Low | Cosmetic/usability/documentation issue; record and prioritize |

These are not response-time promises. Feedback does not authorize a hotfix, Git change, payment, broker/Render change, SQL, notification or deployment. Tell the reviewer whether an action is proposed, locally repaired or actually released; never call an unreleased local repair live. Retest the same safe task on an identified build, with renewed/valid consent for follow-up and a new expected-versus-actual record. Keep unresolved issues visible rather than replacing them with a positive rating.

## 7. Safe Cross-Role Review and Acceptance

| Synthetic scenario | Proposed reviewers / sequence | Boundary |
|---|---|---|
| Public/private label | Public → Fleet owner → OEM | Review minimal public sample and authorized detailed evidence; no official BPAN or private disclosure |
| Ownership and device revoke | Fleet owner → Operator → Developer | Review owner record, known readings and revoked-loopback response; no live adapter or physical shutdown |
| Draft recovery reporting | OEM → Recycler | Review known-unit declaration/intake and scoped draft evidence; no official credit/certificate/submission |
| Threshold request | Operator → Admin | Describe need, then approved QA admin evaluates disposable rule; no ordinary global permission or page |
| Integration/error semantics | Developer → Fleet owner | Prepared synthetic receipt/replay/error demonstration and explain credential scope; no external production integration |
| Status and outage | Admin → Other roles | Tabletop disabled/unknown health, manual escalation and reconciliation; no created monitoring resources or push/ack test |

A discussion/prototype review is not an executed end-to-end workflow. Mark each stage Completed, Blocked or Not attempted only from actual evidence; do not stitch fictional profiles into a purported lifecycle acceptance.

Role-specific acceptance requirements are in [QA_DOCUMENTATION.md, Section 9](QA_DOCUMENTATION.md#9-role-specific-entry-and-release-criteria). Safe limited research requires scope/consent/fixtures; advertised workflow release requires actual role results, two-account/admin privacy checks, relevant resolved/retested blockers, exact released-build identification and accountable sign-off. Fresh bounded browser/affected container checks passed, but production reload/logout/broad tenant and owner-positive tests remain open. Hosted exact-candidate CI, Render disk/memory/readiness, provider/private-storage/email/payment inventory/reconciliation/restore/phone and hardware/OEM/calibration/official-label gates need separate acceptance; resource-cost approval is not activation or notification authorization.

No actual reviewer or fictional composite has approved launch in the supplied evidence. Ratings measure limited experience, not physics or regulatory validity. Do not use participant confidence, a small sample, old scanner results or passing local tests to waive security, money, physical safety, backup or provider-outage risks. This guide records **no recruitment completion, user consensus, employer endorsement, certification or launch sign-off**.
