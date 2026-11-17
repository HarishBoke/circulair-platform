# Circul-AI-r Platform — Delivery and Handoff Document

**Document Version:** 3.0 — bounded handoff refresh
**Document Date:** 17 November 2026
**Historical delivery record:** 25 July 2026 (superseded acceptance claims)
**Prepared for:** Circul-AI-r / Setoo engineering handoff
**Application URL:** https://circulair.energy
**Acceptance status:** Limited production smoke verification; broad launch blocked

## 1. Handoff Summary — Not a Sign-Off Certificate

This document records available implementation inventory and the evidence boundary for the current handoff. It does **not** confirm that all components are fully developed, tested, deployed, production-grade or operational end-to-end. The July claims of 71 completed development phases, route/procedure/tool totals and universal PASS status were historical inventory/completion assertions, not independently validated acceptance certificates. No guaranteed uptime, 100% functionality, platform-wide security/compliance or neural-model accuracy is established.

The current [RETEST_SECURITY_REPORT.md](RETEST_SECURITY_REPORT.md) is authoritative for consolidated results, known defects and verification limits; [RELEASE_GATES.md](RELEASE_GATES.md) governs release decisions. Use the dated report and evidence summary to identify the exact verified snapshot. The November 16 baseline is superseded only for specific observations supported by November 17 evidence, not for whole-module acceptance.

### 1.1 Production snapshot: recorded 17 November 2026

| Item | Evidence-backed state | Open boundary |
|---|---|---|
| Render release | Commit `54920faa9c392fa03a1689e4cbe151d67323edda` live; configuration deploy `dep-dbu0nbg8v5cc73bj680g` observed live at **08:11:24 UTC** on 17 November | Later local remediation is not deployed. |
| AutoDeploy | **Off** | No automatic rollout should be assumed. |
| Managed PostgreSQL | `DATABASE_URL` repaired; connection verified with new login/session user `circulair_runtime_20261117` (execution role `circulair_user`) | Old exposed credential remains valid, **not revoked**; external allow-all access unchanged. |
| JWT/application URL | New random 64-character JWT secret rotated; canonical `APP_URL` verified | Successful production email/password login and recovery delivery **not verified**. |
| Protective export | Render logical export ready at **07:41 UTC** on 17 November | **Not downloaded or restore-tested**; no recovery certificate. |
| Outbox schema | Additive outbox table and due index applied/verified; migration did not modify customer data | Schema readiness is not PagerDuty acceptance. |
| PagerDuty | Disabled (`false`) | No real incident/on-call message; no billable retry Cron created. |
| Limited smoke checks | Production HTTP **14/14**; anonymous telemetry handshake rejected with `Unauthorized` | Invalid-input/rejection/readiness probes do not verify successful authentication or owned workflows. |

Sources: `/home/ubuntu/retest-evidence/production-config-repair.json`, `production-after-config-repair-security-smoke.json`, `production-after-54920fa-socket.json`. No secret values are reproduced here.

### 1.2 Local-only work

The November 17 development fixes cover alert authorization, MQTT synthetic-source preservation, simulator resistance units, role-aware alert UI, environment-only PostgreSQL resolution, explicit-input admin bootstrap scripts and gateway REST transport. Final local verification is complete; these newer fixes are **not deployed to Render**. The saved development identifier is recorded in the evidence summary; the live release remains `54920faa`. Consult [RETEST_SECURITY_REPORT.md](RETEST_SECURITY_REPORT.md) for exact counts, commands, warnings and remaining defects.

Global alert-rule operations, including reads/defaults and all mutations, are administrator-only in the tested development source. Ordinary users request administrator changes. Alert acknowledgements use authenticated owner/admin context; marking read does not resolve PagerDuty. The focused local browser suite verifies real owned-alert visibility and admin-rule access; this is not live-production or platform-wide tenant acceptance. MQTT labels exclude declared synthetic traffic from paging but do not authenticate hardware or isolate all synthetic state changes. The simulator remains an uncalibrated demo.

## 2. Implementation Inventory — Historical, Not Accepted Delivery

The following inventories retain useful July navigation details. Counts, route presence, seeded rows, integration configuration and descriptive labels were **not re-counted or certified in this documentation-only refresh**. Treat each surface as unverified/blocked unless the current retest report identifies its precise accepted scope.

### 2.1 Frontend inventory

Historical frontend: React 19 SPA, TypeScript, Tailwind CSS 4, shadcn/ui and wouter. Responsive layouts/dark styling are implementation intentions; all-page, accessibility and real-device acceptance are open.

| Category | Historical pages | Key routes | Acceptance limitation |
|---|---:|---|---|
| Authentication | 4 | `/login`, `/register`, `/forgot-password`, `/reset-password` | Successful production login/recovery unverified |
| Dashboard/overview | 2 | `/dashboard`, `/analytics` | Data isolation and KPI correctness require tests |
| Battery management | 4 | `/batteries`, `/batteries/register`, `/batteries/:bpan`, `/onboarding` | BPAN contracts/canonical IDs remain blockers |
| Telemetry/IoT | 5 | `/telemetry`, `/data-integration`, `/mqtt-flow-tester`, `/device-provisioning`, `/demo` | Broker/device/safety acceptance open |
| AI/prediction | 4 | `/ai-soh`, `/digital-twin`, `/federated-learning`, `/autonomous-triage` | Formula, contract and scaffold blockers |
| Marketplace | 5 | `/marketplace`, `/marketplace/create`, `/marketplace/:id`, `/marketplace/orders`, `/marketplace/payment-success` | No real-money acceptance; success page is not settlement evidence |
| Compliance | 4 | `/epr-compliance`, `/compliance`, `/carbon-accounting`, `/passport/EU/:localId` | Draft/demo outputs, not certification |
| Logistics | 2 | `/logistics`, `/yield-verification` | Identity, authorization, yield/dispatch blockers |
| Warranty | 3 | `/warranty`, `/warranty/register`, `/warranty/check` | Public privacy and claim-route blockers |
| Admin | 4 | `/admin/users`, `/admin/system`, `/admin/feedback`, `/settings/platform` | Explicit privilege/audit verification required |
| Developer | 5 | `/developer-hub`, `/developer-portal`, `/api-reference`, `/mcp-server`, `/gateway-docs` | Scopes, interfaces/SDK claims unverified |
| Knowledge/help | 4 | `/wiki`, `/getting-started`, `/faq`, `/glossary` | Workflow/translation acceptance not implied |
| Public/legal | 5 | `/`, `/how-it-works`, `/privacy`, `/terms`, `/coming-soon` | Claims/legal review still required |
| Other | 5 | `/alerts`, `/alert-rules`, `/documents`, `/service-history`, `/health` | Local UI/admin fixes; broader data/privacy gates remain |

The July total of 56 routes is a historical navigation claim, not a current exhaustive count or proof that 56 workflows work.

### 2.2 Backend inventory

Historical backend: Express with tRPC and REST v1. Procedure totals below describe the earlier inventory, not verified current counts or authorization across every surface.

| Router | Historical procedures | Intended purpose |
|---|---:|---|
| `auth` | 2 | Session identity/logout |
| `bpan` | 8 | Registry, BPAN generation |
| `telemetry` | 5 | Ingestion/history/statistics |
| `soh` | 4 | Prediction/triage/history |
| `marketplace` | 14 | Listings/offers/photos/orders |
| `logistics` | 6 | Shipment/dispatch/tracking |
| `epr` | 7 | Tokens/draft reports |
| `warranty` | 8 | Registration/claims/check/dashboard |
| `alerts` | 5 | Owner/admin alert operations (new bounded repair local) |
| `alertRules` | 7 | Global rules/defaults (admin-only local repair) |
| `analytics` | 4 | KPIs/charts |
| `documents` | 4 | Upload/list/download/delete |
| `wiki`, `wikiFeedback` | 4 each | Articles/chat and feedback |
| `admin` | 6 | Users/roles/audit |
| `agent` | 8 | Agent interfaces; actual execution unverified |
| `mqtt`, `device` | 7 each | Broker/demo and provisioning |
| `regulatory` | 6 | Declarations |
| `platformSettings` | 3 | Locale/currency/jurisdictions |
| `pdf` | 4 | Draft passports/reports/certificates |
| `system` | 2 | Owner notice/health |
| `triage` | 5 | Queue/approval scaffold |
| `tutorial` | 3 | Progress/complete/reset |

| Method | REST endpoint inventory | Intended purpose |
|---|---|---|
| GET | `/api/v1/batteries` | Paginated battery list |
| GET | `/api/v1/batteries/:bpan` | Battery detail |
| POST | `/api/v1/batteries` | Register battery |
| GET | `/api/v1/batteries/:bpan/telemetry` | Telemetry history |
| POST | `/api/v1/batteries/:bpan/telemetry` | Ingestion |
| GET | `/api/v1/batteries/:bpan/soh` | Predictions |
| GET | `/api/v1/marketplace/listings` | Listings |
| GET | `/api/v1/compliance/epr-tokens` | Token records |
| GET | `/api/v1/warranty/:bpan` | Warranty lookup (privacy gate open) |
| GET | `/api/docs` | OpenAPI documentation UI |

The historical MCP claim was 20 tools; all-tool behavior and current count were not revalidated. Disabled unpaid purchase and rejected browser-socket ingestion must not be documented as functional buying/ingestion paths.

### 2.3 Historical schema and seed inventory

The earlier “28 tables with full referential integrity” assertion was not verified. This table preserves the listed entities and synthetic seed examples, **not production row counts or migration reconciliation**. The baseline retest described a larger isolated QA schema; the current production outbox addition is separately verified above. Use reviewed schema/migration evidence rather than assuming this historical list is exhaustive.

| Historical entity | Intended purpose | Historical seed example only |
|---|---|---|
| `users` | Accounts/roles | Dynamic |
| `batteries` | Registry | 40 |
| `telemetry_readings` | Sensor/demo data | 480+ |
| `soh_predictions` | Health outputs | 25 |
| `marketplace_listings` | Listings | 18 |
| `marketplace_offers`, `listing_photos` | Offers/photos | Dynamic |
| `logistics_orders` | Shipment records | 20 |
| `epr_tokens` | Draft token records | 22 |
| `alerts` | Alerts | 35 |
| `alert_rules` | Global rules | Dynamic |
| `service_history` | Maintenance records | 89 |
| `documents`, `warranty_records` | Files/warranties | Dynamic |
| `carbon_footprint_declarations`, `recycled_content_declarations` | Draft declarations | Dynamic |
| `regulatory_profiles`, `platform_settings` | Configuration | Dynamic |
| `role_audit_log`, `agent_actions` | Audit/action metadata | Dynamic |
| `iot_devices`, `password_reset_tokens` | Device/auth records | Dynamic |
| `stripe_payment_intents` | Payment metadata | Dynamic |
| `wiki_feedback`, `tutorial_progress`, `triage_jobs`, `bulk_onboarding_jobs` | Workflows | Dynamic |
| `marketplace_listings_currency` | Historical currency inventory entry | Existence/current schema not revalidated |

The additive PagerDuty outbox table/index are not evidence of full-table referential integrity, complete data migration or historic seed totals in production.

### 2.4 Realtime/provider inventory

| Component | Implementation intention | Verification boundary |
|---|---|---|
| Socket.IO | Authenticated live telemetry | Live anonymous rejection recorded; ownership tests are scoped, not broad tenant certification |
| MQTT subscriber | Device ingestion | Local provenance declarations preserved; ACL/topic/payload/BPAN/device trust unresolved |
| Alert engine/cooldown | Thresholds and deduplication | In-memory/DB paths need safety, durability and ingest-consistency acceptance |
| Simulator | Demo telemetry | Pack/cell resistance corrected locally; not calibrated physics or safety protection |
| Stripe | Checkout/webhook adapter | Historical test-sandbox label not reverified; real payments blocked |
| Resend/email | Transactional/recovery adapter | Delivery/domain acceptance unverified |
| S3 | Storage adapter | Private object/metadata/download authorization unverified; no blanket “active/secure” claim |
| EMQX | MQTT broker adapter | No real broker/hardware acceptance in new repairs |
| Maps | Location interface | Current delivery/credentials unverified |
| AI assistant | Direct AI integration and qualitative outputs | Provider delivery, isolation and numeric accuracy unverified |
| PagerDuty | Events API v2/outbox implementation | Disabled; mocked delivery tests are not on-call acceptance |

### 2.5 Documentation inventory

README.md, DEPLOYMENT.md and API.md in the project root and PLATFORM_GUIDE.md, FEATURES.md, COMPLIANCE_GUIDE.md, API_REFERENCE.md, MCP_GUIDE.md, ARCHITECTURE.md and HOW_TO_GUIDES.md under `docs/` were listed historically. They are reference/inventory documents, not ISO 27001, SOC 2, GDPR or battery-regulation certificates. Review stale deployment, feature and compliance instructions against current evidence before use.

This handoff includes refreshed project, delivery, QA and persona documents, together with the retest report, release gates, PagerDuty runbook and sanitized evidence summary.

## 3. Deployment and Configuration Handoff

The former hardcoded database fallback is removed from the tested development source. PostgreSQL resolution now requires a valid explicit environment URL, with reviewed priority and fail-closed behavior. Both admin scripts require validated operator-supplied identity/password inputs, create fresh hashes and print no dynamic credentials; neither script was executed. Their conflict path can promote/reset the explicitly named account and must be used only under separate account-change authorization. Old credentials remain in source history and valid until controlled revocation. Historical MySQL/TiDB migration assumptions are not recovery design.

The historical “24 variables configured” total and all-provider readiness are unverified. Relevant configuration names include `DATABASE_URL`/`RENDER_DATABASE_URL`, `JWT_SECRET`, `APP_URL`, payment/webhook, email, MQTT and storage keys plus disabled PagerDuty settings. No values, passwords, signed URLs or tokens belong in public handoff documents.

AutoDeploy is Off. Any future release requires explicit owner authorization, reviewed changes, final test/build evidence, protective export/rollback access, environment checks, a controlled deployment and post-release scoped checks. No guaranteed zero-downtime update is claimed. Render readiness showing a successful database query does not prove email, storage, MQTT, AI, payments or external uptime monitoring.

## 4. Acceptance Matrix — Replace July Blanket PASS Claims

| Criterion | Current disposition | Required evidence |
|---|---|---|
| Application/readiness accessible | **Limited verification** | Recorded 17 November homepage/readiness smoke, not uptime history |
| Registration/login/recovery | **Production successful login unverified** | Authorized successful login/session/logout and separate recovery-delivery test |
| Battery registration/BPAN | **Local bounded evidence; downstream blocked** | Canonical identity across all consumers and ownership/validation tests |
| Telemetry/alerts | **Partially restricted; newer fixes local** | Owned/admin browser tests, real staging broker/hardware and safety-rule acceptance |
| SOH/triage/advanced AI | **Blocked/unverified** | Calibrated fixtures, correct contracts and durable authorized state; no neural claim |
| Marketplace/payments | **Blocked for real money** | Binding, currency, reservation, idempotency, settlement, payouts/refunds and privacy tests |
| EPR/passport/carbon | **Draft/demo; blocked for certification** | Correct scope/units and independent regulatory/methodology review |
| Role/tenant isolation | **Incomplete** | Every private surface and alternative API tested with two accounts/admin |
| Responsive/accessibility | **Unverified beyond scoped emulation** | Real-device/Safari and accessibility review; no blanket WCAG claim |
| Unit/build/typecheck/browser | **Final local runs passed; bounded acceptance only** | Current retest report and exact snapshot/configuration, not historical totals |
| Security | **Open blockers** | Credential revocation, resource/PDF/storage/payment hardening, advisory remediation and authorized scanner follow-up |
| Documentation | **Current handoff refreshed** | Remaining historical guides/public claims require review; documents are not functionality evidence |
| Backup/recovery | **Export ready only** | Protected download and restore/rollback exercise |
| PagerDuty/availability | **Disabled; acceptance open** | Runbook gates, intended service, authorized test and independent outage detection |

Strix has **not run**. Dependency advisories remain. Passing focused tests or Semgrep zero matches does not close broad security gates.

## 5. Operational Responsibilities — Proposals, Not SLAs

| Responsibility | Suggested owner/action | Current limitation |
|---|---|---|
| Health/availability | Operations: measure application and external uptime separately | No measured service objective or uptime guarantee established |
| Backup/restore | Operations: protect export, download and practice restore | Export-ready state only; restore not tested |
| Credentials | Engineering/operations: rotate and then revoke old exposed credentials with rollback plan | Old DB credential still valid |
| Dependencies/security | Engineering: triage compatible updates and regressions | Advisories and launch blockers persist |
| Provider delivery | Operations/product: authorize staging identities and failure tests | Mocked/disabled tests do not certify providers |
| Incident delivery | Operations: follow PAGERDUTY_RUNBOOK.md | PagerDuty false; no live on-call test |
| Scaling/performance | Engineering: define representative load and resource metrics | July user/device/database thresholds are planning ideas, not capacity measurements |

Historical claims of daily backup coverage, automatic log rotation, fully operational CI/CD or pre-verified scale are not carried forward without service-specific evidence and ownership.

## 6. Handover Checklist and Sign-Off Boundary

| Item | Handoff status |
|---|---|
| Repository and historical inventory | Available reference; not full feature acceptance |
| Live Render build/configuration | Recorded specific commit/config deploy above |
| Later development repairs | Tested locally and included in the handoff checkpoint; not deployed to Render |
| Database/outbox | New login connectivity and additive table/index verified; broad migration/rows not certified |
| Old exposed credentials | Still valid; revocation gate open |
| Protective export | Ready, not downloaded/restored |
| Tests/security scans | Consult current retest report; no Strix run or clean-security certificate |
| Integrations | Provider/hardware acceptance open; PagerDuty disabled |
| Admin access | Use explicit authorized provisioning; do not rely on first-user auto-promotion |
| UAT/feedback | Fictional composites only; no recruited-participant approval evidence |
| Commercial launch | **Not signed off**; release gates remain |

Acknowledging receipt of this handoff is not acceptance of functionality, safety, regulatory compliance or availability. No pilot/commercial readiness sign-off is inferred. A future sign-off must name the responsible approver, date, deployed snapshot, tested scope, exclusions, unresolved issues and evidence links, and must satisfy the current release gates. Do not backdate signatures or imply fictional personas approved delivery.
