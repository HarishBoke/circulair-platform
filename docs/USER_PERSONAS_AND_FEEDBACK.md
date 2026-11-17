# Circul-AI-r Platform — Fictional Personas and Real-User Feedback Plan

**Document Version:** 3.0 — bounded handoff refresh
**Date:** 17 November 2026
**Prepared for:** Circul-AI-r / Setoo product and engineering handoff
**Purpose:** Seven fictional composite role groups, safe voluntary recruitment and evidence-based UAT capture
**Research status:** No actual participant recruitment, interviews, quotes, ratings, employer endorsements or sign-offs are evidenced by this document

## 1. Truthful Persona and Research Boundary

**Every profile below is a FICTIONAL COMPOSITE**, a planning aid rather than a real person or recruited participant. The personal names, employers, ages, financial losses and operational volumes in the July version were not supported by research evidence and have been removed. Generic OEM, recycler, BESS, service, regulator, manufacturer and operator descriptions imply no employer or government endorsement. Goals and pain points are **hypotheses to investigate**, not observed feedback.

No feedback has been invented. The questions, schedules, forms and workflow expectations are a proposed protocol. They cannot be counted as real UAT results or approvals. Record actual consenting participants separately under pseudonymous IDs, without representing them as the composites or implying that their employer endorses the product.

This document supersedes the July “real reviewers” and launch-score claims. Use [RETEST_SECURITY_REPORT.md](RETEST_SECURITY_REPORT.md) for current consolidated evidence and [RELEASE_GATES.md](RELEASE_GATES.md) for release decisions. Use the dated report and evidence summary to identify the exact verified snapshot. Historical feature inventories, development completion and mock/unit passes are not acceptance certificates; there is no guaranteed uptime, 100% functionality, platform-wide security/compliance or neural accuracy evidence.

### 1.1 Current product boundary for research invitations

Render commit `54920faa9c392fa03a1689e4cbe151d67323edda` is live; configuration redeploy `dep-dbu0nbg8v5cc73bj680g` was observed live on 17 November at 08:11:24 UTC. Managed PostgreSQL new login/session user `circulair_runtime_20261117`, rotated random 64-character JWT secret and canonical `APP_URL` have recorded configuration evidence. AutoDeploy is Off; the old exposed database credential remains valid and not revoked. The protective Render logical export was ready at 07:41 UTC but was not downloaded or restore-tested. The additive outbox table/index were applied and verified; PagerDuty remains disabled (`false`), with no real on-call test.

Recorded production HTTP smoke was **14/14** and anonymous telemetry handshake returned `Unauthorized`. **Successful production email/password login has not been verified.** These observations do not qualify production as a safe default user-test environment or certify provider workflows.

The November 17 development fixes cover alert authorization, MQTT synthetic-source preservation, simulator resistance units, role-aware alert UI, environment-only PostgreSQL resolution, explicit-input admin bootstrap scripts and gateway REST transport. Final local verification is complete; these newer fixes are **not deployed to Render**. The saved development identifier is recorded in the evidence summary; the live release remains `54920faa`. Consult [RETEST_SECURITY_REPORT.md](RETEST_SECURITY_REPORT.md) for exact counts, commands, warnings and remaining defects. Strix has not run; dependency advisories and broad launch blockers remain.

**Global alert rules are administrator-only in the local remediation**, including listing rules/defaults and all changes. Ordinary participants should request an administrator change; do not ask them to configure global rules themselves. Viewing/marking an account alert is not PagerDuty acknowledgement or resolution. Declared MQTT demo/test labels suppress paging but do not establish hardware identity or complete simulation data/state isolation. The simulator is an uncalibrated demo, not a battery safety model.

## 2. Seven Fictional Composite Role Groups

All tasks below are **planned, unverified or blocked** until separately executed with recorded evidence in an approved isolated staging environment. Use small synthetic fixtures; no customer datasets, live devices, real purchases or regulatory submissions. Label/disable known unsupported features rather than asking participants to pretend they work.

### Persona P1 — OEM Fleet Operations Manager (FICTIONAL COMPOSITE)

| Attribute | Planning hypothesis |
|---|---|
| Organization type | Generic EV OEM / fleet operator; no named employer |
| Platform role group | OEM |
| Technical context | Dashboard/CSV user; limited API experience |
| Goal hypothesis | Reconcile registered packs, review condition and prepare service/warranty decisions |
| Pain-point hypothesis | Fragmented spreadsheets/BMS exports and unclear asset identifiers |

**Planned tasks:** Import a small synthetic fleet CSV with reviewed valid/invalid rows; find a registered pack and review its identifier; explore fleet filters and known synthetic telemetry; inspect a health estimate with explicit model limitations; review a synthetic warranty record; **request an administrator** thermal-rule change; review a sample draft health passport. Do not connect a factory broker or make a real safety/warranty decision.

**Known boundary:** BPAN downstream contracts, lifecycle authorization, warranties and SOH calibration remain blocked/unverified. Live telemetry/safety thresholds are not certified. Administrator handling of the requested rule is a separate controlled QA task.

**Neutral questions:** Which fields would you need to identify this pack? What do you think the estimate means, and what independent evidence would you require before a decision? How would you request a threshold change? Where did you become uncertain or need help?

### Persona P2 — Recycler Operations Lead (FICTIONAL COMPOSITE)

| Attribute | Planning hypothesis |
|---|---|
| Organization type | Generic battery recycler / material-recovery operator |
| Platform role group | Recycler |
| Technical context | Process-data and audit-document user |
| Goal hypothesis | Reconcile intake, recovery evidence and draft reporting |
| Pain-point hypothesis | Separate process measurements, identifiers and reporting records |

**Planned tasks:** Trace a synthetic intake record; inspect the canonical battery ID/BPAN; enter approved synthetic yield fixtures only after engineering validation; review a draft ledger and draft CPCB-style report; identify missing mineral recovery/context fields; review synthetic recycling-certificate metadata with privacy expectations.

**Known boundary:** Repeated/negative yield credit, atomicity, canonical IDs, private documents, organization/period scope and report methodology remain blockers. Draft tokens are not official credits; PDF generation is not regulatory acceptance. No filing or process-system connection occurs.

**Neutral questions:** What evidence would you need to reconcile an intake and yield? Which report fields are absent or ambiguous? How would you detect repeated credit? Do not ask for confirmation that a draft is legally compliant without a qualified independent review.

### Persona P3 — BESS Project/Procurement Engineer (FICTIONAL COMPOSITE)

| Attribute | Planning hypothesis |
|---|---|
| Organization type | Generic stationary-storage developer / second-life buyer |
| Platform role group | BESS Developer |
| Technical context | Engineering/specification reviewer; may understand APIs |
| Goal hypothesis | Compare candidate second-life assets and evidence quality |
| Pain-point hypothesis | Inconsistent condition claims, units and supporting records |

**Planned tasks:** Browse synthetic listings with chemistry/capacity/SOH filters; inspect sample passport/telemetry/service evidence; prepare a nonbinding offer draft without checkout; list integration fields needed for an internal procurement system; review advanced forward-order/carbon screens as labeled scaffolds only.

**Known boundary:** Settlement, authorization, reservation, currency/refund/payout and foreign-battery/photo controls block real-money use. SOH accuracy, carbon methodology, forward matching and SDK/interface claims are unverified. No purchase, payment, reservation or external ERP connection is made.

**Neutral questions:** What would make a condition claim credible to you? Which units or filters were unclear? What would you need before approving procurement? Which missing evidence stopped you? Do not solicit trust in an unvalidated estimate as proof of accuracy.

### Persona P4 — Field Service Engineer (FICTIONAL COMPOSITE)

| Attribute | Planning hypothesis |
|---|---|
| Organization type | Generic battery maintenance / field-service provider |
| Platform role group | Service Provider |
| Technical context | Mobile-first technician; may configure BMS hardware |
| Goal hypothesis | Locate assigned asset, review telemetry and record service history |
| Pain-point hypothesis | Unstructured service notes and ambiguous device-to-pack binding |

**Planned tasks:** On an approved mobile device, locate a synthetic assigned pack; follow a written/sample provisioning flow without broker changes or real credentials; review gateway/flow-tester instructions; add a synthetic service note only after canonical-ID gates; inspect a synthetic account alert and mark read in isolated QA; report missing fields and connection/error messaging. If a rule needs changing, request an administrator.

**Known boundary:** Device credential authorization, revocation/heartbeat, topic/payload identity and service ID/BPAN contracts remain blocked. No real device is commissioned or thermal event induced. Browser ingestion intentionally rejects unsupported writes; mark-read does not resolve an on-call incident.

**Neutral questions:** At what point did you know which pack/device you were viewing? What would help diagnose a failed connection? Could you distinguish loading, failure and no alerts? Which mobile controls or instructions were difficult?

### Persona P5 — Compliance/Regulatory Reviewer (FICTIONAL COMPOSITE)

| Attribute | Planning hypothesis |
|---|---|
| Organization type | Generic oversight/compliance office; no named agency affiliation |
| Platform role group | Government / Regulator |
| Technical context | Portal/document reviewer, varied technical experience |
| Goal hypothesis | Understand traceability and evidence underlying draft reports |
| Pain-point hypothesis | Inconsistent fields, periods, organizations and audit provenance |

**Planned tasks:** Review an authorized read-only synthetic compliance dashboard; inspect draft ledger/report fields; trace an example pack through authorized lifecycle records; identify collection-target/actual gaps; inspect a synthetic public passport and distinguish public from private fields.

**Known boundary:** Global all-time reporting, authorization, credit legitimacy and methodology remain unresolved. Participation is personal/role-based usability research unless explicitly authorized otherwise; it is not government approval, certification, a regulatory audit or a submission.

**Neutral questions:** Which evidence would you need to verify this draft claim independently? Can you identify reporting organization and period? Which fields should never be public? What review questions remain unanswered?

### Persona P6 — Battery Manufacturing Quality/Compliance Manager (FICTIONAL COMPOSITE)

| Attribute | Planning hypothesis |
|---|---|
| Organization type | Generic battery/cell manufacturer |
| Platform role group | Battery Manufacturer |
| Technical context | Production-data, quality and compliance workflow user |
| Goal hypothesis | Associate production data, declarations and draft passports |
| Pain-point hypothesis | Supply-chain evidence and manufacturing identifiers in separate systems |

**Planned tasks:** Register a small synthetic production batch; review carbon/recycled-content inputs using known fixtures; inspect a clearly draft passport and sample QR; explore language labels; identify required integration fields from a static API example. No real ERP upload or regulated declaration occurs.

**Known boundary:** Numeric units, methodology, period/organization scope, thresholds/legal interpretation, BPAN consumers and API scope remain unverified/blocked. No regulatory deadline, complete mandatory-field claim or batch-capacity guarantee is certified by this session.

**Neutral questions:** Which inputs have a known source, and which need clarification? What unit/reference would you expect? Which labels need specialist translation review? What independent review would be needed before using the draft operationally?

### Persona P7 — Platform Operations Administrator (FICTIONAL COMPOSITE)

| Attribute | Planning hypothesis |
|---|---|
| Organization type | Generic platform operator; not a real named staff reviewer |
| Platform role group | Platform Admin |
| Technical context | Access, audit, monitoring and operational workflow user |
| Goal hypothesis | Understand system state and safely administer authorized users/rules |
| Pain-point hypothesis | Misleading green/empty states, unclear privileges and incident provenance |

**Planned tasks:** With an explicitly approved QA admin account, inspect synthetic users/audit; perform a reviewed reversible role change without removing the last admin; compare owner vs global alerts; list/create/edit/toggle/delete a QA global rule and test errors/Retry; inspect clearly mocked/unknown provider statuses and feedback queue; discuss outage/recovery expectations from a tabletop scenario.

**Known boundary:** No production roles/settings, broker configuration, routing key, incident or Cron is changed. PagerDuty stays disabled. Real browser/cache/API acceptance of the newer alert UI is open. Synthetic provenance is not hardware trust; empty results do not prove health. No ISO/security/availability certification is implied.

**Neutral questions:** Can you tell what is measured, unavailable or merely configured? Can you identify the scope of a rule change? What evidence would you need before enabling paging or declaring recovery? Which actions need additional approval/audit context?

## 3. Practical Voluntary Real-User Recruitment

### 3.1 Recruitment plan

A designated research coordinator should recruit **actual willing adults from each of the seven role groups** through authorized professional contacts, opt-in communities or permission-based outreach. Do not scrape personal contact lists, impersonate employers/regulators or infer participation from a public biography. These composites are not named recruitment targets.

For an initial exploratory round, propose one or two consenting participants per group, then review gaps and seek more only if needed. This is a recruitment target, not a achieved sample or statistically representative study. Include varied technical experience, organization scale and mobile/desktop needs. If a role cannot be recruited, record “not recruited,” do not fabricate ratings or substitute an internal tester as external-user evidence. Engineering QA may proceed separately under its own label.

Use a short screener: role category; recent relevant workflow experience; preferred device/language; accessibility accommodation; availability; voluntary participation and confidentiality constraints. Ask no customer names, credentials, employee identifiers or commercially sensitive figures. Store contact details separately from pseudonymous research records with restricted access. Do not collect an employer name unless truly necessary and separately consented; never publish it as endorsement.

### 3.2 Invitation template — send only after outreach authorization

> We are inviting volunteers who work with [role-relevant battery workflow] to a 30–45 minute exploratory usability session for Circul-AI-r. You would use an isolated test environment with synthetic data or review a prototype. Several workflows are incomplete or blocked; this is not a certified production, safety or regulatory system. Participation is optional, you may skip questions or stop at any time, and your decision will not affect access to services or employment. We will not ask for customer data, credentials, payments, broker changes, regulatory submissions or on-call tests. We will explain data use and request separate consent before any recording. Your participation does not imply employer endorsement. If interested, please reply through the approved contact channel with your role category and availability.

The coordinator must disclose any approved compensation before consent and make clear it is not contingent on positive feedback. No compensation, invitations or appointments have been arranged by this document.

### 3.3 Consent checklist and data handling

Before the session, provide a plain-language notice stating the organizer/contact, purpose, test environment, approximate duration, tasks and blocked features, voluntary nature, stop/skip/withdrawal procedure, data collected, intended audience, storage/access controls and **specific retention/deletion dates**. An owner must set these dates before recruitment; they are not silently open-ended.

Obtain affirmative consent to participate, separately to notes, separately to screen/audio/video recording (off by default), and separately to any quotation or future follow-up. A refusal to record must not exclude otherwise eligible participants. Ask whether workplace permission is required and avoid confidentiality conflicts. Do not solicit confidential customer/employer information. Confirm the participant understands there are **no real payments, broker changes, regulatory submissions or on-call tests**. If any proposed task exceeds that boundary, stop and seek a separate owner-approved engineering test, not expanded implied participant consent.

Record consent date/version and a participant ID; keep personal contact/consent records restricted and separate from workflow findings. Explain how to request withdrawal/deletion and any stated anonymization limit before consent. Delete raw recordings according to the agreed policy and verify access permissions before sharing evidence. Redact PII and sensitive information from notes, logs and screenshots: names, faces, emails/phones, addresses, customer BPANs, credentials, cookies, tokens, private URLs and employer-sensitive data. If accidental exposure occurs, stop capture, secure the material, notify the authorized owner and follow the approved removal process; do not upload raw screenshots to a public issue.

## 4. Environment, Entry Gates and Facilitator Script

### 4.1 Safe session setup

| Setup item | Required preparation |
|---|---|
| Environment | Owner-approved isolated staging/QA or prototype; **not production by default** |
| Data | Small synthetic fixtures with agreed expected results; no July seed count assumed current |
| Accounts | Explicit assigned role; approved separate admin; no first-registrant auto-promotion assumption |
| Providers | Disabled/mocked; no real Stripe checkout, broker publication/configuration, government filing, on-call message or live device operation |
| Blocked features | Clearly labeled demo/scaffold/unknown or disabled; facilitator records blocked rather than simulates success |
| Build/evidence | Identify local snapshot/commit and provider mode; consult current retest report and QA_DOCUMENTATION.md |
| Consent/capture | Written notice and affirmative consent; recording only if separately opted in; tested redaction process |
| Safety/stop rule | Stop on security/privacy issue, unexpected external action, distress or participant request; log blocker without unsafe probing |

Full UAT for advertised workflows is gated by unresolved defects; narrowly scoped research on safe staging/prototypes can be approved separately without implying product acceptance. An intermediate passing unit run is not sufficient UAT entry evidence for all modules.

### 4.2 Facilitator script (30–45 minute proposal, not a completed schedule)

1. **Introduction and consent, about 5 minutes:** “We are testing the design, not you. Some features are incomplete. Please do not enter real customer data or credentials. You can skip a task or stop at any time. We will use synthetic data and will not make payments, change brokers, submit reports or send on-call alerts. May I confirm your participation and note-taking consent? Recording is optional and separate.” Verify any requested accommodation.
2. **Context, about 5 minutes:** Ask about the participant's typical workflow without personal/customer/employer-sensitive details. Identify information they normally need; do not read the fictional profile as their biography.
3. **Two or three tasks, about 15–25 minutes:** State a neutral outcome, e.g. “Find the sample pack and tell me what evidence you would need next,” not “Click this working feature.” Start the timer when the task is understood; allow think-aloud optionally. Observe without coaching; if help is needed, record the intervention. Stop at a blocked/unsafe boundary. A task not attempted is not a failure or pass.
4. **Debrief, about 5 minutes:** Ask “What did you expect?”, “What actually happened?”, “Where did you become uncertain?”, “What is missing?” and “What would need to change before use?” Do not pressure a positive score or a launch approval. Read back findings for correction.
5. **Close:** Explain next steps, consented follow-up channel and deletion/withdrawal contact. Do not promise fixes or deployment dates that the owner has not agreed. Thank the participant regardless of criticism or completion.

For an ordinary persona encountering alert thresholds, use: “If you need a global rule changed, describe your request to an administrator.” For the admin composite/task, use approved isolated QA changes only. If a feature is unavailable, record the blocker and ask about the expected workflow rather than pretending completion.

## 5. Feedback Capture — Blank Templates, No Invented Results

### 5.1 Required session/workflow record

Capture expected vs actual behavior, completion time and blocker/severity for **every attempted task**, including assisted, abandoned or blocked tasks. Ratings are optional and cannot replace behavioral evidence.

```markdown
## Session / Workflow Feedback
Participant ID (pseudonym):
Role group (P1–P7; actual experience, not composite identity):
Consent notice version/date and restricted record reference:
Notes consent: Yes / No
Recording consent: Yes / No (off unless separately approved)
Quote/recontact consent: separate Yes / No fields
Session date/time/timezone; facilitator:
Environment, build/local snapshot/deployed commit (if relevant):
Browser/version, OS/device; real hardware or emulation:
Provider mode: disabled / mocked / isolated test
Workflow / QA case ID; synthetic fixture:

Task goal and expected result:
Steps actually attempted:
Actual result (observed, not assumed):
Outcome: Completed / Completed with assistance / Failed / Blocked / Not attempted
Completion time (seconds/minutes; start/end rule, pauses recorded):
Assistance/interventions:
Blocker and severity: None / Critical / High / Medium / Low
Reproducibility / scope / safety stop reason:
Participant comment (verbatim only if recorded and separately consented for use):
Facilitator observation (separate from participant quote):
Hypothesis / interpretation (clearly labeled, not a fact):
Optional rating and N/A / not tested:
What is missing / suggested improvement:
Sanitized screenshot/log evidence reference (PII/secrets redacted):
Owner / defect ID / proposed action / retest status:
Follow-up permission/reference; retention/deletion date:
```

A missing rating is N/A, not zero. A blocked feature is not “tested successfully.” A quote must be actual, accurately attributed to a pseudonym with appropriate permission; do not reconstruct a quote from a composite or blend multiple participants into purported evidence.

### 5.2 Optional feedback dimensions

| Dimension | Prompt | Qualification |
|---|---|---|
| Functionality | Did the attempted task complete as expected? | Record actual outcome first |
| Usability | Where was the path unclear or assistance needed? | Record time/intervention; optional 1–5 |
| Performance | Did waiting interfere with your task? | Perception is not a p95 benchmark |
| Completeness | Which information/action was missing? | Separate feature request from defect |
| Accuracy | Which value could you check against known evidence? | User confidence is not scientific/regulatory validation |
| Mobile/accessibility | Which controls/readability barriers occurred? | Specify device/assistive technology and scope |

### 5.3 Collection channels and backup capture

The historical CirculWiki feedback interface includes rating/type/comment and an admin review queue at `/admin/feedback`; its end-to-end persistence/access acceptance must be verified before relying on it. Use the restricted pseudonymous template as a fallback. Never assume empty in-app feedback means no issues or successful submission. Do not publish raw recordings or screenshots in the app. Proposed post-launch surveys/support reviews require separate authorization and privacy handling; no existing NPS, enterprise reviews, analytics cadence or participant channel is asserted.

### 5.4 Role coverage ledger — not a scorecard of approvals

| Role group | Recruitment/session evidence | Workflow results / blockers | Status at this document refresh |
|---|---|---|---|
| P1 OEM | Not supplied | Not supplied | Planned; no verified participant |
| P2 Recycler | Not supplied | Not supplied | Planned; no verified participant |
| P3 BESS developer | Not supplied | Not supplied | Planned; no verified participant |
| P4 Service provider | Not supplied | Not supplied | Planned; no verified participant |
| P5 Government/regulatory reviewer | Not supplied | Not supplied | Planned; no verified participant |
| P6 Battery manufacturer | Not supplied | Not supplied | Planned; no verified participant |
| P7 Platform administrator | Not supplied | Not supplied | Planned; no verified participant |

Only replace these cells with linked actual consenting-session evidence. Report attempted/completed/blocked task denominators, assistance, time ranges and recruitment gaps. Do not average absent ratings or use a small exploratory sample as representative market validation.

## 6. Feedback-to-Action and Retest

Separate observed defects, participant suggestions, facilitator hypotheses and source-confirmed pre-existing blockers. Have product, engineering and research owners review sanitized records, assign severity/owner and agree a response; the former automatic 24-/48-hour promises are not verified SLAs.

| Severity | Handling proposal |
|---|---|
| Critical | Stop affected use/test; notify authorized owner for security, data loss, financial or dangerous outcome |
| High | Primary workflow blocked/major incorrect data; prioritize before broader release |
| Medium | Partial failure with safe workaround; track and schedule |
| Low | Cosmetic/usability/documentation; prioritize with owner |

No feedback item independently authorizes a hotfix, payment, broker change or deploy. After a reviewed fix, identify whether it is local, checkpointed or actually deployed, then repeat the same safe task with consented follow-up and recorded expected/actual outcome. Communicate only agreed actions: acknowledge the issue, give its reference/owner and explain whether a fix is planned, locally tested or deployed. Do not announce a local fix as live.

## 7. Cross-Role Scenarios — Synthetic and Gated

| Scenario | Role groups | Proposed isolated sequence | Boundary |
|---|---|---|---|
| Battery lifecycle | OEM → Service → BESS → Recycler | Register → record service → evaluate listing → review intake | No real purchase, transport or processing; canonical-ID/authorization gates |
| Compliance review | Manufacturer → Regulatory reviewer | Draft declaration → independent field/evidence review | Not official approval/submission |
| Marketplace review | OEM → BESS | Synthetic listing → nonbinding offer review | Payment/settlement blocked |
| Warranty investigation | OEM → Service | Synthetic condition review → draft service/claim review | No validated safety decision; claim route/privacy gates |
| Yield/ledger review | Recycler → Regulatory reviewer | Reviewed synthetic yield → draft ledger evidence | No official credits; repeated/negative credit blockers |
| Rule request | Ordinary role → Admin | Describe threshold need → approved QA admin evaluates change | No ordinary global-rule control; no live on-call test |

A discussion/prototype walkthrough is not an executed end-to-end workflow. Mark stages unavailable/blocked honestly.

## 8. Acceptance and Launch Boundary

No recruited participant or composite has approved this product in the supplied evidence. The July average-score, “five of seven personas approve,” endpoint timing and blanket accessibility/security thresholds do not constitute current launch criteria. Real participant preference is useful research input but cannot waive credential, privacy, payment, hardware, safety, numeric/model, compliance, backup or availability blockers.

Owner-approved UAT acceptance must be tied to actual consenting sessions, a specific tested build/environment, agreed workflow scope, expected-vs-actual execution records, completion time and blockers, resolved/retested defects, stated exclusions and the current release gates. Clearly label or disable unverified/scaffolded workflows. Broader launch requires the report/gates and independent engineering/operational/provider/methodology evidence. This document is a recruitment and feedback plan, **not evidence of recruitment, launch readiness, employer endorsement or regulatory certification**.
