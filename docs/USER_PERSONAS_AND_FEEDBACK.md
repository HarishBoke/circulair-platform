# Circul-AI-r Platform — User Personas and Product Feedback Framework

**Document Version:** 2.0  
**Date:** July 25, 2026  
**Prepared by:** Setoo Engineering  
**Purpose:** Define real user personas, UAT workflows, and structured feedback collection for product review

---

## 1. Introduction

This document defines seven real-world user personas representing the primary stakeholders of the Circul-AI-r Platform. Each persona includes a biographical profile, their goals and pain points, the specific platform workflows they will exercise during User Acceptance Testing (UAT), and a structured feedback collection framework. The purpose is to ensure that product review is conducted from the perspective of actual end users — not abstract test cases — so that feedback is actionable, grounded, and representative of real operational needs.

---

## 2. User Personas

### Persona 1: Rajesh Mehta — OEM Fleet Manager

| Attribute | Detail |
|-----------|--------|
| **Name** | Rajesh Mehta |
| **Role** | Fleet Operations Manager |
| **Company** | Ather Energy (EV OEM, Bangalore) |
| **Age** | 38 |
| **Technical Level** | Moderate (uses dashboards, not APIs) |
| **Platform Role** | OEM |
| **Primary Goal** | Monitor 2,000+ deployed battery packs, predict failures before warranty claims |
| **Pain Points** | Currently uses Excel + manual BMS reports; no unified view of fleet health; warranty claims cost ₹4.2Cr/year |

**Primary Workflows to Test:**

1. **Bulk Onboarding:** Upload CSV of 500 batteries from existing fleet → verify all get BPANs
2. **Fleet Dashboard:** View aggregated SOH distribution, identify batteries below 70%
3. **Telemetry Monitoring:** Connect factory MQTT broker → see live voltage/temperature for 10 batteries
4. **SOH Prediction:** Run batch SOH prediction → identify batteries approaching warranty threshold
5. **Warranty Management:** Register warranties for new shipments → track active claims
6. **Alert Configuration:** Set thermal anomaly rules for NMC chemistry (T > 45°C)
7. **PDF Export:** Generate health passport for a battery being returned under warranty

**Key Questions for Rajesh:**
- Can you complete the bulk onboarding of your existing fleet in under 30 minutes?
- Does the SOH prediction give you enough confidence to make warranty decisions?
- Are the alert thresholds appropriate for your NMC battery chemistry?
- Is the dashboard view useful for your weekly fleet review meeting?
- What information is missing from the health passport PDF?

---

### Persona 2: Dr. Priya Sharma — Recycler Operations Head

| Attribute | Detail |
|-----------|--------|
| **Name** | Dr. Priya Sharma |
| **Role** | Head of Operations |
| **Company** | Attero Recycling (Noida) |
| **Age** | 42 |
| **Technical Level** | High (PhD in Materials Science, comfortable with data) |
| **Platform Role** | Recycler |
| **Primary Goal** | Maximize mineral recovery yield, maintain CPCB compliance, earn EPR tokens |
| **Pain Points** | Manual CPCB Form BW-3 filing takes 3 days; no way to verify incoming battery SOH claims; yield data scattered across SCADA systems |

**Primary Workflows to Test:**

1. **EOL Battery Intake:** Receive battery from logistics → verify BPAN → check SOH claim
2. **Yield Verification:** Enter SCADA data → compare theoretical vs actual Black Mass yield
3. **EPR Token Issuance:** Complete yield verification → receive EPR token → view in ledger
4. **CPCB Report Generation:** Generate Form BW-3 PDF for quarterly submission
5. **Compliance Dashboard:** View EPR token balance, submission deadlines, compliance status
6. **Mineral Recovery Reporting:** Track Co, Li, Ni, Mn recovery percentages per batch
7. **Document Storage:** Upload recycling certificates, access audit trail

**Key Questions for Priya:**
- Does the CPCB Form BW-3 match the latest CPCB portal format exactly?
- Is the yield verification formula correct for your specific process (hydrometallurgical)?
- Can you trace a battery from OEM registration through to your recycling certificate?
- Are EPR token issuance rules aligned with current CPCB guidelines?
- What additional fields would you need in the compliance report?

---

### Persona 3: Marcus Weber — BESS Project Developer

| Attribute | Detail |
|-----------|--------|
| **Name** | Marcus Weber |
| **Role** | Senior Project Engineer |
| **Company** | Sonnen GmbH (Munich, Germany) |
| **Age** | 35 |
| **Technical Level** | High (electrical engineer, API-literate) |
| **Platform Role** | BESS Developer |
| **Primary Goal** | Source second-life batteries with verified SOH > 75% for C&I storage projects |
| **Pain Points** | No trusted marketplace for second-life batteries; SOH claims from sellers are unverifiable; procurement takes 3-6 months |

**Primary Workflows to Test:**

1. **Marketplace Browse:** Search for LFP batteries with SOH > 75%, capacity > 50kWh
2. **Health Passport Review:** Open listing → verify SOH prediction, telemetry history, service records
3. **Make Offer:** Submit offer with price in EUR → complete Stripe checkout
4. **EU Battery Passport:** Verify carbon footprint declaration, recycled content compliance
5. **Predictive Procurement:** Set forward order for Q4 delivery of 200kWh LFP modules
6. **API Integration:** Use REST API v1 to pull marketplace listings into internal ERP
7. **Carbon Accounting:** Verify lifecycle carbon footprint for project sustainability report

**Key Questions for Marcus:**
- Is the SOH prediction trustworthy enough to base a €50K procurement decision on?
- Does the health passport contain all the data your engineering team needs?
- Is the EU Battery Passport page compliant with Regulation 2023/1542 Article 77?
- Can you integrate the REST API with your SAP system?
- What additional filters would help you find the right batteries faster?

---

### Persona 4: Amit Patel — Service Provider Field Engineer

| Attribute | Detail |
|-----------|--------|
| **Name** | Amit Patel |
| **Role** | Field Service Engineer |
| **Company** | BatteryPool India (Mumbai) |
| **Age** | 29 |
| **Technical Level** | Moderate (uses mobile apps, configures BMS hardware) |
| **Platform Role** | Service Provider |
| **Primary Goal** | Commission new BMS devices, record service events, monitor battery health in the field |
| **Pain Points** | Currently uses WhatsApp to report service events; no structured service history; device provisioning is manual and error-prone |

**Primary Workflows to Test:**

1. **Device Provisioning:** Register new IoT gateway → link to BPAN → get MQTT credentials
2. **MQTT Flow Testing:** Use flow tester to verify device is publishing correctly
3. **Gateway Documentation:** Follow ESP32 CAN bus setup guide → commission device
4. **Service History Recording:** Log service event (battery swap, BMS firmware update)
5. **Telemetry Verification:** Confirm live readings appear within 5 seconds of device power-on
6. **Alert Response:** Receive thermal anomaly alert → acknowledge → record resolution
7. **Mobile Usage:** Complete all above workflows on a mobile phone (Android Chrome)

**Key Questions for Amit:**
- Can you provision a new device and see live data in under 10 minutes?
- Is the gateway documentation clear enough to follow without calling support?
- Does the MQTT flow tester help you diagnose connection issues in the field?
- Is the mobile experience usable on a 6-inch phone screen in bright sunlight?
- What information do you need on the service history form that is currently missing?

---

### Persona 5: Sunita Reddy — Government Regulator (CPCB)

| Attribute | Detail |
|-----------|--------|
| **Name** | Sunita Reddy |
| **Role** | Deputy Director, Hazardous Waste Management |
| **Company** | Central Pollution Control Board (Delhi) |
| **Age** | 52 |
| **Technical Level** | Low (uses government portals, basic Excel) |
| **Platform Role** | Government / Regulator |
| **Primary Goal** | Verify EPR compliance of battery producers and recyclers, audit collection efficiency |
| **Pain Points** | Receives paper-based BW-3 forms; no way to verify claims independently; audit trail is fragmented |

**Primary Workflows to Test:**

1. **Compliance Dashboard:** View all registered producers/recyclers and their EPR status
2. **EPR Token Verification:** Check EPR token ledger for a specific recycler
3. **CPCB Report Audit:** Download Form BW-3 PDF → verify against CPCB portal fields
4. **Battery Traceability:** Trace a battery from OEM registration through recycling
5. **Collection Efficiency:** View collection targets vs actual for each producer
6. **EU Battery Passport (reference):** View public passport page for cross-border batteries

**Key Questions for Sunita:**
- Is the compliance dashboard understandable without technical training?
- Does the Form BW-3 match the format your office currently accepts?
- Can you independently verify a recycler's EPR token claim?
- Is the audit trail sufficient for your annual compliance review?
- What additional regulatory fields are required for your jurisdiction?

---

### Persona 6: Thomas Fischer — Battery Manufacturer (EU)

| Attribute | Detail |
|-----------|--------|
| **Name** | Thomas Fischer |
| **Role** | Quality & Compliance Manager |
| **Company** | VARTA AG (Ellwangen, Germany) |
| **Age** | 45 |
| **Technical Level** | Moderate (uses SAP, compliance tools) |
| **Platform Role** | Battery Manufacturer |
| **Primary Goal** | Comply with EU Battery Regulation 2023/1542 before February 2027 deadline |
| **Pain Points** | Carbon footprint calculation is complex; recycled content tracking requires supply chain data; no single system covers all Article 77 requirements |

**Primary Workflows to Test:**

1. **Battery Registration:** Register production batch with manufacturing data
2. **Carbon Footprint Declaration:** Enter 4 lifecycle stages → get performance class (A-E)
3. **Recycled Content Declaration:** Enter Co, Li, Ni, Pb percentages → verify EU 2031 targets
4. **EU Battery Passport Generation:** Verify public passport page has all required fields
5. **QR Code Generation:** Generate QR codes for production batch → verify scan resolves to passport
6. **Multi-language Support:** Switch to German → verify all compliance labels are translated
7. **API Integration:** Use REST API to push production data from SAP

**Key Questions for Thomas:**
- Does the carbon footprint calculator align with the EU delegated act methodology?
- Are the recycled content thresholds correct for 2027 vs 2031 targets?
- Does the EU Battery Passport page contain all Article 77 mandatory fields?
- Can you generate passports in bulk for a production batch of 10,000 cells?
- Is the German translation accurate for regulatory terminology?

---

### Persona 7: Vikram Singh — Platform Administrator

| Attribute | Detail |
|-----------|--------|
| **Name** | Vikram Singh |
| **Role** | Platform Operations Lead |
| **Company** | Setoo (Platform Operator) |
| **Age** | 33 |
| **Technical Level** | High (full-stack developer, DevOps) |
| **Platform Role** | Admin |
| **Primary Goal** | Ensure platform stability, manage user access, monitor system health |
| **Pain Points** | Needs visibility into all platform operations; must respond to incidents quickly; user role management should be auditable |

**Primary Workflows to Test:**

1. **User Management:** List all users → change role → verify audit log entry
2. **System Health:** Check super admin dashboard → verify DB, MQTT, API status
3. **Alert Rules Management:** Create/edit/disable alert rules for different chemistries
4. **Feedback Review:** Review wiki feedback submissions → approve/reject/merge
5. **Platform Settings:** Configure default locale, currency, active jurisdictions
6. **API Key Management:** Create API key for external integration → set scopes → monitor usage
7. **Incident Response:** Detect anomaly in logs → trace to specific battery → resolve alert

**Key Questions for Vikram:**
- Is the super admin dashboard giving you real-time visibility into system health?
- Can you trace a user's actions through the audit log for compliance purposes?
- Is the role management workflow auditable enough for ISO 27001?
- What monitoring/alerting capabilities are missing for production operations?
- Can you onboard a new client (create account, assign role) in under 5 minutes?

---

## 3. UAT Execution Plan

### 3.1 UAT Schedule

| Phase | Duration | Personas | Focus |
|-------|----------|----------|-------|
| **Week 1** | 5 days | Rajesh (OEM), Priya (Recycler) | Core workflows: registration, telemetry, compliance |
| **Week 2** | 5 days | Marcus (BESS), Thomas (Manufacturer) | Marketplace, EU compliance, API integration |
| **Week 3** | 3 days | Amit (Service), Sunita (Government) | Field operations, regulatory audit |
| **Week 4** | 2 days | Vikram (Admin) | Platform operations, security audit |
| **Week 5** | 3 days | All personas | Cross-functional scenarios, edge cases |

### 3.2 UAT Environment

| Parameter | Value |
|-----------|-------|
| URL | https://circulair.energy |
| Database | Production (PostgreSQL on Render) |
| Test payment card | 4242 4242 4242 4242 (Stripe test mode) |
| MQTT broker | EMQX Cloud (test credentials provided) |
| Admin access | First registered user auto-promoted |
| Test data | 40 batteries, 480 telemetry readings pre-seeded |

### 3.3 UAT Entry Criteria

Before UAT begins, the following must be confirmed:

1. All 420+ automated tests passing
2. Zero TypeScript errors
3. Health endpoint returning `{"status":"ok","db":"connected","dbType":"postgresql"}`
4. All personas have registered accounts with correct platform roles assigned
5. Test MQTT broker credentials distributed to relevant personas
6. Stripe test mode confirmed active
7. Mobile devices available for responsive testing

---

## 4. Feedback Collection Framework

### 4.1 Feedback Categories

Each persona will provide feedback across six dimensions:

| Dimension | Description | Rating Scale |
|-----------|-------------|--------------|
| **Functionality** | Does the feature work correctly end-to-end? | 1-5 (Broken → Flawless) |
| **Usability** | Is the workflow intuitive without training? | 1-5 (Confusing → Effortless) |
| **Performance** | Is the response time acceptable? | 1-5 (Unusable → Instant) |
| **Completeness** | Are all required fields/data present? | 1-5 (Major gaps → Complete) |
| **Accuracy** | Is the data/calculation correct? | 1-5 (Wrong → Verified) |
| **Mobile Experience** | Does it work well on mobile? | 1-5 (Broken → Native-like) |

### 4.2 Feedback Form Template

Each persona completes this form after testing each workflow:

```
═══════════════════════════════════════════════════
CIRCUL-AI-R PLATFORM — USER FEEDBACK FORM
═══════════════════════════════════════════════════

Reviewer Name: _________________________________
Role / Persona: _________________________________
Date: __________________________________________
Workflow Tested: ________________________________
Device Used: [ ] Desktop  [ ] Mobile  [ ] Tablet
Browser: _______________________________________

─── RATINGS (1-5) ───────────────────────────────

Functionality:    [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]
Usability:        [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]
Performance:      [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]
Completeness:     [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]
Accuracy:         [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]
Mobile Experience:[ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]

─── QUALITATIVE FEEDBACK ────────────────────────

What worked well?
__________________________________________________
__________________________________________________

What was confusing or difficult?
__________________________________________________
__________________________________________________

What is missing that you need?
__________________________________________________
__________________________________________________

Would you use this in production today? [ ] Yes [ ] No
If No, what must be fixed first?
__________________________________________________

─── BUGS FOUND ──────────────────────────────────

Bug 1: ___________________________________________
Severity: [ ] Critical [ ] High [ ] Medium [ ] Low
Steps: ___________________________________________

Bug 2: ___________________________________________
Severity: [ ] Critical [ ] High [ ] Medium [ ] Low
Steps: ___________________________________________

─── FEATURE REQUESTS ────────────────────────────

Request 1: _______________________________________
Priority: [ ] Must-have [ ] Nice-to-have [ ] Future

Request 2: _______________________________________
Priority: [ ] Must-have [ ] Nice-to-have [ ] Future

═══════════════════════════════════════════════════
```

### 4.3 In-Platform Feedback (CirculWiki)

The platform includes a built-in feedback system accessible from the CirculWiki knowledge base. Users can submit feedback with:

- **Star rating** (1-5)
- **Feedback type:** Helpful, Not Helpful, Suggest Edit, Flag Outdated, Flag Inaccurate, Request Topic, General
- **Free-text comment**
- **Admin review workflow:** Pending → Approved / Rejected / Merged

This system is accessible at `/admin/feedback` for administrators.

### 4.4 Feedback Aggregation

After each UAT phase, feedback is aggregated into a scorecard:

| Persona | Functionality | Usability | Performance | Completeness | Accuracy | Mobile | Overall |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Rajesh (OEM) | /5 | /5 | /5 | /5 | /5 | /5 | /5 |
| Priya (Recycler) | /5 | /5 | /5 | /5 | /5 | /5 | /5 |
| Marcus (BESS) | /5 | /5 | /5 | /5 | /5 | /5 | /5 |
| Amit (Service) | /5 | /5 | /5 | /5 | /5 | /5 | /5 |
| Sunita (Gov) | /5 | /5 | /5 | /5 | /5 | /5 | /5 |
| Thomas (Mfg) | /5 | /5 | /5 | /5 | /5 | /5 | /5 |
| Vikram (Admin) | /5 | /5 | /5 | /5 | /5 | /5 | /5 |
| **Average** | **/5** | **/5** | **/5** | **/5** | **/5** | **/5** | **/5** |

**UAT Pass Threshold:** Overall average ≥ 3.5/5 with no Critical bugs unresolved.

---

## 5. Feedback-to-Action Pipeline

### 5.1 Triage Process

All feedback is triaged within 24 hours of submission:

| Priority | Criteria | Action |
|----------|----------|--------|
| **P0 — Blocker** | Prevents workflow completion, data loss, security issue | Fix immediately, hotfix deploy |
| **P1 — Critical** | Major feature broken, workaround exists but painful | Fix within current sprint |
| **P2 — Important** | Feature gap identified by multiple personas | Schedule for next sprint |
| **P3 — Enhancement** | Nice-to-have improvement, single persona request | Add to backlog |
| **P4 — Cosmetic** | Visual polish, minor UX tweak | Fix when convenient |

### 5.2 Feedback Review Meeting

After each UAT phase, a feedback review meeting is held:

- **Attendees:** Product Owner, Engineering Lead, UAT Coordinator
- **Inputs:** Aggregated feedback scorecard, bug list, feature requests
- **Outputs:** Prioritized action items, sprint plan updates, persona communication

### 5.3 Persona Communication

Each persona receives a response within 48 hours of submitting feedback:

1. **Acknowledgement:** "Thank you for your feedback on [workflow]. We have logged [N] items."
2. **Action plan:** "The following items will be addressed: [list with timeline]"
3. **Follow-up:** "We have deployed fixes for [items]. Please re-test at your convenience."

---

## 6. Cross-Persona Scenarios

These scenarios test interactions between multiple personas:

| Scenario | Personas Involved | Workflow |
|----------|-------------------|----------|
| **Battery Lifecycle** | Rajesh → Amit → Marcus → Priya | OEM registers → Service maintains → BESS buys → Recycler processes |
| **Compliance Audit** | Thomas → Sunita | Manufacturer declares carbon footprint → Regulator verifies |
| **Marketplace Transaction** | Rajesh → Marcus | OEM lists EOL battery → BESS developer purchases |
| **Warranty Claim** | Rajesh → Amit | OEM detects degradation → Service provider investigates → Claim filed |
| **EPR Token Flow** | Priya → Sunita | Recycler completes yield → Token issued → Regulator audits |

---

## 7. Success Criteria for Product Launch

The product is considered ready for commercial launch when:

| Criterion | Threshold | Measurement |
|-----------|-----------|-------------|
| UAT overall score | ≥ 3.5/5 | Aggregated persona ratings |
| Critical bugs | 0 open | Bug tracker |
| High bugs | ≤ 3 open (with workarounds) | Bug tracker |
| Persona sign-off | 5/7 personas approve | Written confirmation |
| Core workflow completion | 100% for all personas | UAT execution log |
| Performance | All endpoints < 3s (p95) | Performance benchmarks |
| Security | All SEC tests pass | Security audit |
| Accessibility | WCAG 2.1 AA compliant | Accessibility audit |
| Documentation | All guides reviewed by personas | Feedback forms |

---

## 8. Post-Launch Feedback Channels

After launch, ongoing feedback is collected through:

| Channel | Audience | Frequency |
|---------|----------|-----------|
| In-app feedback (CirculWiki) | All users | Continuous |
| Monthly NPS survey | All active users | Monthly |
| Quarterly business review | Enterprise clients | Quarterly |
| Support ticket analysis | All users | Weekly |
| Usage analytics | Platform team | Daily |
| Feature request board | All users | Continuous |

---

*End of User Personas and Feedback Framework*
