# Circul-AI-r Compliance Guide

**Version:** 1.0.0  
**Applicable Standards:** ISO 27001:2022, SOC 2 Type II, GDPR, India IT Act 2000  
**Classification:** Confidential

---

## Compliance Overview

Circul-AI-r is designed to meet the security and compliance requirements of enterprise battery lifecycle management. The platform implements controls aligned with ISO 27001:2022 (Information Security Management) and SOC 2 Type II (Trust Services Criteria) to protect battery data, customer information, and operational integrity.

This document maps platform capabilities to specific compliance controls, describes the audit infrastructure, and provides guidance for compliance teams preparing for certification audits.

---

## ISO 27001:2022 Control Mapping

### Annex A Controls Implemented

| Control | Title | Platform Implementation |
|---|---|---|
| **A.5.1** | Policies for information security | Role-based access control with admin/user separation |
| **A.5.15** | Access control | Protected procedures require authentication; admin procedures require admin role |
| **A.5.23** | Information security for cloud services | S3 storage with access controls; TiDB with encrypted connections |
| **A.5.24** | Information security incident management | Security event logging with severity classification |
| **A.8.2** | Classification of information | Four-tier data classification: public, internal, confidential, restricted |
| **A.8.3** | Handling of information assets | Data classification tags on all audit log entries |
| **A.8.9** | Configuration management | Configuration change logging (ISO27001-A.12.1.2 control ref) |
| **A.8.12** | Data leakage prevention | API key scoping, rate limiting, input validation |
| **A.8.15** | Logging | Comprehensive audit trail for all platform operations |
| **A.8.16** | Monitoring activities | Real-time security event monitoring via Super Admin panel |
| **A.8.24** | Use of cryptography | JWT session signing, HMAC-SHA256 webhook signatures, TLS |
| **A.8.25** | Secure development lifecycle | TypeScript type safety, input validation via Zod schemas |

### Data Classification Tiers

| Tier | Description | Examples | Access Control |
|---|---|---|---|
| **Public** | Freely accessible information | Platform name, public API docs, warranty check results | No authentication required |
| **Internal** | General business information | Battery statistics, marketplace listings, fleet KPIs | Authenticated users |
| **Confidential** | Sensitive business data | Customer contact details, warranty records, telemetry data | Role-based access |
| **Restricted** | Highly sensitive data | API keys, audit logs, security events, user credentials | Admin-only access |

---

## SOC 2 Trust Services Criteria Mapping

### Common Criteria (CC)

| Criteria | Title | Platform Implementation |
|---|---|---|
| **CC1.1** | COSO Principle 1: Integrity and Ethical Values | Role-based access prevents unauthorized data modification |
| **CC2.1** | COSO Principle 13: Quality Information | Structured logging with SIEM-ready JSON format |
| **CC3.1** | COSO Principle 6: Risk Assessment | Security event severity classification (low/medium/high/critical) |
| **CC5.1** | COSO Principle 10: Control Activities | Input validation on all API endpoints via Zod schemas |
| **CC6.1** | Logical and Physical Access | API key authentication, OAuth sessions, protected procedures |
| **CC6.2** | Prior to Issuing Credentials | API key creation with scope definition and rate limit tiers |
| **CC6.3** | Registration and Authorization | Manus OAuth registration with verified identity |
| **CC6.6** | Restrictions on System Access | Data classification enforcement on audit log entries |
| **CC7.1** | System Monitoring | Structured logging, request tracing, security event monitoring |
| **CC7.2** | Anomaly Detection | Thermal anomaly detection, rate limit violation tracking |
| **CC7.3** | Incident Response | Security event logging with severity and recommended actions |
| **CC8.1** | Change Management | Configuration change logging with before/after values |

---

## Audit Infrastructure

### Audit Log Schema

Every auditable operation generates a log entry with the following fields:

| Field | Type | Description |
|---|---|---|
| `traceId` | string | Unique correlation ID for request tracing (format: `cai-{uuid}`) |
| `actorType` | enum | user, agent, system, api_key |
| `actorId` | string | User ID, API key ID, or system identifier |
| `action` | string | Operation identifier (e.g., `bpan.generate`, `warranty.register`) |
| `module` | enum | Platform module: bpan, warranty, marketplace, compliance, etc. |
| `dataClassification` | enum | public, internal, confidential, restricted |
| `ipAddress` | string | Client IP address |
| `userAgent` | string | Client user agent string |
| `inputSummary` | JSON | Sanitized input parameters (PII redacted) |
| `outputSummary` | JSON | Operation result summary |
| `status` | enum | success, error, denied |
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

Audit logs are accessible through three channels:

1. **Super Admin Panel** — Visual dashboard at `/admin/system` with filtering, search, and export
2. **tRPC Procedures** — `compliance.auditLogs`, `compliance.securityEvents` for programmatic access
3. **REST API** — `/api/v1/compliance/audit-logs` for external SIEM integration

### Log Retention

Audit logs are retained in the database indefinitely. For compliance with specific retention requirements, the platform supports CSV export of audit data for archival to external storage systems.

---

## API Key Security

### Key Generation

API keys follow the format `cai_{32-character-random-string}` and are generated using cryptographically secure random bytes. Keys are stored as SHA-256 hashes in the database — the plaintext key is shown only once at creation time.

### Key Lifecycle

| State | Description |
|---|---|
| **Active** | Key is valid and can be used for authentication |
| **Expired** | Key has passed its expiration date; automatically rejected |
| **Revoked** | Key has been manually revoked by an admin; permanently invalid |

### Rate Limiting

| Tier | Requests/Minute | Use Case |
|---|---|---|
| Free | 10 | Development and testing |
| Standard | 100 | Production applications |
| Premium | 500 | High-volume integrations |
| Enterprise | 2000 | Mission-critical systems |

Rate limit violations are logged as security events with medium severity.

---

## Regulatory Compliance

### India Battery Waste Management Rules (2022)

The platform supports compliance with India's BWMR through:

- **EPR Token Generation** — Digital proof of recycling obligations met
- **Producer Registration** — Battery manufacturer identification via BPAN
- **Collection Tracking** — Logistics module tracks battery collection and transport
- **Recycling Verification** — Yield reporting and material recovery documentation
- **CPCB Reporting** — Data export compatible with Central Pollution Control Board requirements

### EU Battery Regulation (2023/1542)

The platform's Battery Passport (BPAN) system aligns with the EU Battery Regulation requirements for:

- **Digital Battery Passport** — Unique identifier with lifecycle data
- **Carbon Footprint Declaration** — GHG Protocol and ISO 14067 compliant
- **Due Diligence** — Supply chain traceability through BPAN
- **End-of-Life Management** — Second-life and recycling tracking

---

## Incident Response

### Security Event Workflow

1. **Detection** — Automated monitoring flags anomalous activity
2. **Classification** — Events are assigned severity (low/medium/high/critical)
3. **Notification** — Critical events trigger owner notifications via `notifyOwner()`
4. **Investigation** — Audit logs provide full trace from request to response
5. **Resolution** — Actions taken are logged with resolution details
6. **Review** — Post-incident review using audit trail data

### Compliance Reporting

The platform provides the following compliance reports:

| Report | Frequency | Content |
|---|---|---|
| Audit Log Summary | On-demand | Total entries, status breakdown, module distribution |
| Security Event Summary | On-demand | Event counts by severity and type |
| API Key Usage | On-demand | Key activity, rate limit violations |
| Data Access Report | On-demand | Access patterns by data classification tier |

---

## Preparing for Certification

### ISO 27001 Audit Preparation

1. Review the control mapping table above and verify each control is operational
2. Export audit logs for the review period using the compliance dashboard
3. Document the data classification policy and verify classification tags are applied
4. Review API key lifecycle management and verify expired/revoked keys are rejected
5. Verify security event monitoring is active and notifications are configured

### SOC 2 Type II Audit Preparation

1. Demonstrate continuous monitoring over the audit period using audit log statistics
2. Show access control enforcement through role-based procedure protection
3. Provide evidence of change management through configuration change logs
4. Demonstrate incident response capability through security event workflow
5. Show data integrity controls through input validation and type safety
