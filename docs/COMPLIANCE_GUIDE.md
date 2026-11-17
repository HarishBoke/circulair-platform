# Circul-AI-r Compliance Guide

**Version:** 1.1 — claim-boundary review, 18 November 2026
**Reference Frameworks (subject to independent assessment):** ISO 27001:2022, SOC 2 Trust Services Criteria, GDPR, India IT Act 2000
**Classification:** Confidential

---

## Compliance Overview

Circul-AI-r includes application controls that can support enterprise battery lifecycle security and compliance work. This repository does not establish ISO 27001 certification, a SOC 2 Type II report, GDPR compliance, or regulator approval. Any certification/attestation claim requires independent evidence, assessed scope and an authorized auditor.

This document is a preliminary control-evidence guide, not a Statement of Applicability or audit opinion. References must be reviewed against the selected standard/version; application mechanisms alone do not satisfy organizational policies, risk assessment, physical security, vendor management, or operating-effectiveness requirements.

---

## ISO 27001:2022 Control Mapping

### Candidate Annex A Evidence Mapping

| Control | Title | Candidate evidence / remaining obligation |
|---|---|---|
| **A.5.1** | Policies for information security | Operators must create, approve and review policies; role separation is not a policy |
| **A.5.15** | Access control | Protected procedures require authentication; admin procedures require admin role |
| **A.5.23** | Information security for use of cloud services | Review Render PostgreSQL, S3, OpenAI and ZeptoMail configuration, agreements, access controls and encryption |
| **A.5.24** | Information security incident management | Selected security-event logging; incident preparation/planning and operating effectiveness require evidence |
| **A.5.12** | Classification of information | Four-tier classification metadata; confirm approved policy and coverage |
| **A.5.13** | Labelling of information | Classification tags on instrumented audit entries; verify consistent labeling |
| **A.8.9** | Configuration management | Selected change logs; retain reviewed baselines, approvals and Render deployment evidence |
| **A.8.12** | Data leakage prevention | Scoping and validation are supporting mechanisms, not a complete DLP system |
| **A.8.15** | Logging | Audit entries for instrumented operations; verify coverage, integrity and retention |
| **A.8.16** | Monitoring activities | Selected admin monitoring views; independent detection, delivery and coverage remain unverified |
| **A.8.24** | Use of cryptography | Native JWT session signing and bcrypt password hashing are source mechanisms; verify TLS, secret lifecycle and any real webhook signing independently |
| **A.8.25** | Secure development lifecycle | TypeScript type safety, input validation via Zod schemas |

### Data Classification Tiers

| Tier | Description | Examples | Access Control |
|---|---|---|---|
| **Public** | Freely accessible information | Platform name, public API docs, warranty check results | No authentication required |
| **Internal** | General business information | Battery statistics, marketplace listings, fleet KPIs | Authenticated users |
| **Confidential** | Sensitive business data | Customer contact details, warranty records, telemetry data | Role-based access |
| **Restricted** | Highly sensitive data | Key hashes, audit/security data, credential hashes | Restricted access; plaintext passwords and service secrets must never be exposed to admins |

---

Classification is metadata used by logging and access-policy review, not proof of universal row-level access enforcement. Validate public warranty/passport fields and restrict customer data explicitly.

## SOC 2 Trust Services Criteria Mapping

### Common Criteria (CC)

| Criteria | Title | Candidate application evidence (not criterion satisfaction) |
|---|---|---|
| **CC1.1** | COSO Principle 1: Integrity and Ethical Values | Requires organizational ethics/governance evidence, not just application roles |
| **CC2.1** | COSO Principle 13: Quality Information | Structured logging with SIEM-ready JSON format |
| **CC3.1** | COSO Principle 6: Risk Assessment | Requires documented risk assessment; event severity labels are only supporting input |
| **CC5.1** | COSO Principle 10: Control Activities | Zod validation on selected paths; coverage, physical limits, canonical identity and authorization need regression evidence |
| **CC6.1** | Logical and Physical Access | Scoped API keys, email/password JWT sessions and protected procedures; physical controls need provider evidence |
| **CC6.2** | Prior to Issuing Credentials | API key creation with scope definition and rate limit tiers |
| **CC6.3** | Registration and Authorization | Local email/password registration and admin/user roles; no verified external identity is established by registration |
| **CC6.6** | Restrictions on System Access | Review protected endpoints and network/provider controls; audit classification labels are not access enforcement |
| **CC7.1** | System Monitoring | Structured logging, request tracing, security event monitoring |
| **CC7.2** | Anomaly Detection | Selected thermal/rate-limit source paths; unit correctness and cross-ingest detection are not safety certification |
| **CC7.3** | Incident Response | Security event logging with severity and recommended actions |
| **CC8.1** | Change Management | Selected change logging; approvals, coverage and secret redaction must be assessed before export |

---

## Audit Infrastructure

### Audit Log Schema

Instrumented operations can generate entries with the following fields. Confirm which paths actually emit records; there is no claim that every request or mutation is audited:

| Field | Type | Description |
|---|---|---|
| `traceId` | string | Correlation ID from `generateTraceId()` (format: `cai-` plus 16-character nanoid); not a UUID |
| `actorType` | enum | human, agent, system, api_key in the writer interface |
| `userId`, `apiKeyId` | integer / nullable | Separate actor identifiers; not a universal `actorId` field |
| `action` | string | Operation identifier (e.g., `bpan.generate`, `warranty.register`) |
| `module` | string / optional | Caller-supplied module label; not a verified universal coverage enum |
| `dataClassification` | enum | public, internal, confidential, restricted |
| `ipAddress` | string | Client IP address |
| `userAgent` | string | Client user agent string |
| `inputSummary` | JSON | Input summary; verify redaction per caller before retention/export |
| `outputSummary` | JSON | Operation result summary |
| `status` | enum | success, failure, denied, error in the writer interface |
| `errorMessage` | string | Error details (if status is error) |
| `durationMs` | integer | Operation execution time in milliseconds |
| `createdAt` | datetime | UTC timestamp |

### Security Event Schema

Security-relevant events are logged separately with severity classification:

| Severity | Examples |
|---|---|
| **Low** | Successful login, password change, profile update |
| **Medium** | Failed login attempt, API key created, role change |
| **High** | Multiple failed logins, API key revoked, unauthorized access attempt |
| **Critical** | Data breach attempt, system compromise indicator, mass data export |

### Accessing Audit Data

Audit data is available through authorized admin screens and tRPC procedures such as `compliance.auditLogs`, `compliance.securityEvents`, and `compliance.exportAuditLog`. Confirm the current router and deployed OpenAPI specification before designing any external export/SIEM route; do not assume an undocumented REST audit endpoint exists.

### Log Retention

Audit records are stored in PostgreSQL, with CSV export available. This is not a guaranteed retention period or tamper-proof archive. Operators must establish retention/deletion rules, storage limits, restricted access, backup coverage and restore testing. Review personal data in exports; neither CSV export nor a configured provider implies an immutable audit store.

---

## API Key Security

### Key Generation

The compliance key generator uses `cai_` plus a 32-character nanoid; the developer-marketplace generator uses `cai_live_` plus 48 hex characters from 24 cryptographically random bytes. These are separate source contracts/stores, not interchangeable credential types. Both helpers hash keys with SHA-256 and return plaintext at creation; routine list paths, endpoint scope and one-time display require independent verification. Do not create, rotate or revoke customer credentials as part of a claim or connection test.

### Key Lifecycle

| State | Description |
|---|---|
| **Active** | Validation still requires the matching hash and intended endpoint/store/scope |
| **Expired** | The compliance validator rejects a past `expiresAt`; verify every consumer and store separately |
| **Revoked** | The compliance validator requires active status; broker/device revocation is a separate unverified control |

### Rate Limiting

| Tier | Requests/Minute | Use Case |
|---|---|---|
| Free | 10 | Development and testing |
| Standard | 100 | Production applications |
| Premium | 500 | High-volume integrations |
| Enterprise | 2000 | Mission-critical systems |

The REST gateway uses an in-process rate-limit store. Per-process counters do not establish shared multi-instance enforcement; verify restart behavior, scope, coverage and event logging before assigning a control status.

---

## Regulatory Compliance

### India Battery Waste Management Rules (2022)

The source contains candidate BWMR record workflows. Their correctness, permitted use and regulator acceptance remain unverified:

- **EPR Token Generation** — Internal recycling/EPR records, not independently validated proof of obligations met
- **Producer Records** — Manufacturer metadata is not government producer registration or an approved BPAN-standard determination
- **Collection Records** — Logistics rows record declared status; no verified carrier booking, GPS source or transport SLA is established
- **Declared Recovery** — Manual yield inputs are not independent measurement, SCADA verification or regulatory credit assurance
- **CPCB Reporting** — Report templates for review against current regulator submission requirements

### EU Battery Regulation (2023/1542)

The platform's Battery Passport (BPAN) records can support work in these areas; mandatory content, methodology, deadlines and regulator acceptance require independent validation:

- **Local Identity / Passport Records** — Local battery identification and QR records; official BPAN enrollment not verified. Existing 19-character app codes are legacy/local aliases, not the supplied 21-character draft contract (BMI 5 + BDS 8 + BI 8). Official issuer and portal allocation are unconfirmed; preserve legacy aliases during reviewed canonical mapping.
- **Carbon Footprint Declaration** — Methodology-labelled records; conformity with GHG Protocol or ISO 14067 is not independently established
- **Supply Chain Records** — Identity links alone do not establish due-diligence conformity, provenance assurance or complete traceability
- **End-of-Life Management** — Second-life and recycling tracking

---

## Incident Response

### Security Event Workflow

1. **Detection** — Review instrumented security events and configured monitors; confirm detection coverage
2. **Classification** — Events are assigned severity (low/medium/high/critical)
3. **Notification** — `notifyOwner()` sends best-effort ZeptoMail when explicitly invoked and configured; verify call coverage and escalation, not guaranteed critical-event delivery
4. **Investigation** — Correlate available audit records and application logs; investigate any gaps in request/response coverage
5. **Resolution** — Operators must document actual actions and evidence; an agent action log is not proof that the action executed
6. **Review** — Operators must conduct and retain post-incident review; selected audit entries are supporting evidence only

### Compliance Reporting

Candidate reporting views and exports require source-to-output verification; this table is not a claim that each report is implemented or accepted:

| Report | Frequency | Content |
|---|---|---|
| Audit Log Summary | On-demand | Total entries, status breakdown, module distribution |
| Security Event Summary | On-demand | Event counts by severity and type |
| API Key Usage | On-demand | Key activity, rate limit violations |
| Data Access Report | On-demand | Access patterns by data classification tier |

---

### Hosting and External-Provider Evidence

Production targets Render with PostgreSQL. Operators configure secrets in Render and obtain separate accounts/access for direct OpenAI, ZeptoMail and AWS S3 integrations. Review processor agreements, data residency/retention, least-privilege credentials, sender verification and backup/encryption evidence. The current ZeptoMail helper uses the India-region API; verify this matches the account and data-transfer requirements. `APP_URL` governs recovery links; API origin checks and secure session cookies depend on correct proxy/origin configuration. Missing credentials or best-effort mail failures can interrupt controls. A passing `/api/health` checks PostgreSQL connectivity only. See [Deployment Guide](../DEPLOYMENT.md).


## Capability and Pilot Boundaries

**Release evidence:** production is independently hosted on Render with PostgreSQL and native JWT/bcrypt authentication. The dated release-gate snapshot is superseded only for live release identification by `/home/ubuntu/retest-evidence/RENDER_RELEASE_ADDENDUM.md`: commit `122e209b52cdcd01f55690363193d7a09659e0c2`, deployment `dep-dbua7eui0phs7397qbng`. This guide's new source corrections have not been deployed. AutoDeploy remains Off and live paging remains disabled according to that evidence; no current remote check was performed for this review.

| Subject | Factual state / required evidence |
|---|---|
| SOH / RUL | Deterministic physics-based estimates; no validated neural inference, measured RMSE or calibration dataset is established. Confidence/error metadata must not be presented as validated accuracy. |
| Triage / agent actions | Recommendations need qualified human approval. Metadata/action logging is not execution, a durable decision gate or a safety control. |
| Federated learning | Round/version metadata only in the reviewed source; no weight-delta training or secure aggregation. Contribution must remain unavailable until a real validated pipeline exists. |
| Blockchain / EPR | Local hashing and generated transaction-like values are demo/unanchored data. Hash equality is not a verifiable chain receipt, immutable history, recognized EPR credit or legal obligation calculation. |
| Government integration | Jurisdiction metadata and templates are not installed adapters or successful authority submission. A caller-supplied `synced` or `compliant` label is not verification. |
| Identity / physical telemetry | Canonical BPAN, device/topic/payload ownership, units, zeros, timestamp and source provenance require pilot acceptance. No gateway installation or physical connection is certified by offline tests. |
| Carrier / matching / SDK | Logistics and forward-order records do not prove carrier dispatch or automated matching. SDK metadata/links are not downloaded, package-installed or contract-tested artifacts. |
| Availability / incident delivery | Independent measurement, restore/failover and responder delivery are not accepted. Process uptime and current-session probe ratios are not service uptime. Paging is disabled; no availability guarantee is made. |
| Security / privacy | Authentication does not establish platform-wide tenant isolation. Document visibility/expiry, public projections, export redaction and provider access need authorization evidence. |

A physical pilot must start with an approved, read-only connection protocol and isolated pilot records. Preserve existing customer rows and avoid production database access. Calibrated instruments, manufacturer limits, qualified supervision and a separate emergency isolation method are prerequisites for any local battery measurement. Do not issue credits, collect real payments, dispatch carriers, submit government reports, send customer notifications or enable remote battery control as part of the connection pilot. Offline/mock results establish only the exercised software behavior; no physical tests were run in this claim review.

## Preparing for Certification

### ISO 27001 Audit Preparation

1. Have a qualified assessor validate mapping/version, define audit scope, perform risk assessment and approve a Statement of Applicability
2. Export audit logs for the review period using the compliance dashboard
3. Document the data classification policy and verify classification tags are applied
4. Review API key lifecycle management and verify expired/revoked keys are rejected
5. Verify security event monitoring is active and notifications are configured

### SOC 2 Type II Audit Preparation

1. Demonstrate continuous monitoring over the audit period using audit log statistics
2. Prove resource/tenant authorization with allowed and denied cases; procedure authentication or roles alone are insufficient
3. Provide evidence of change management through configuration change logs
4. Demonstrate incident response capability through security event workflow
5. Show data integrity controls through input validation and type safety

Certification readiness also requires policies, training, vendor/physical controls, incident exercises, restore tests, and independent operating-effectiveness evidence. Type safety, logs, and report templates alone are insufficient.
