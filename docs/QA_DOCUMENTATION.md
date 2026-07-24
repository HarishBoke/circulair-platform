# Circul-AI-r Platform — QA Documentation

**Document Version:** 2.0  
**Date:** July 25, 2026  
**Prepared by:** Setoo Engineering  
**Platform:** [https://circulair.energy](https://circulair.energy)

---

## 1. QA Overview

This document defines the quality assurance framework for the Circul-AI-r Platform, including test strategy, automated test coverage, manual test cases, acceptance criteria, and the user acceptance testing (UAT) protocol for real user personas. The platform currently maintains **420+ automated tests** across 28 test files with zero TypeScript errors.

---

## 2. Test Strategy

### 2.1 Testing Pyramid

The Circul-AI-r platform follows a layered testing approach:

| Layer | Tool | Coverage | Purpose |
|-------|------|----------|---------|
| Unit Tests | Vitest | 420+ tests | Individual functions, utilities, models |
| Integration Tests | Vitest + tRPC | Included above | API procedure correctness, DB interactions |
| Component Tests | Manual | Per feature | UI component behavior verification |
| End-to-End Tests | Manual UAT | Per persona | Full workflow validation by real users |
| Performance Tests | curl + timing | Per endpoint | Response time < 3s target |
| Security Tests | Manual + automated | CSP, rate limit | Vulnerability scanning |

### 2.2 Automated Test Inventory

| Test File | Tests | Module Covered |
|-----------|-------|----------------|
| `server/auth.logout.test.ts` | 1 | Authentication logout |
| `server/platform.test.ts` | 23 | Core platform procedures |
| `server/telemetrySocket.test.ts` | 15 | WebSocket telemetry |
| `server/mqtt.test.ts` | 19 | MQTT subscriber logic |
| `server/alertCooldown.test.ts` | 17 | Alert deduplication |
| `server/pdfGenerator.test.ts` | 14 | PDF generation |
| `server/adminUsers.test.ts` | 23 | Admin user management |
| `server/carbonClass.test.ts` | 32 | Carbon performance class |
| `server/i18n.test.ts` | 26 | Internationalization |
| `server/warranty.test.ts` | 17 | Warranty procedures |
| `server/agent.test.ts` | 12 | Agentic operations |
| `server/wikiFeedback.test.ts` | 16 | Wiki feedback system |
| `server/marketplace.test.ts` | 18 | Marketplace CRUD |
| `server/alertRules.test.ts` | 19 | Dynamic alert rules |
| `server/email.test.ts` | 7 | Email helper (mocked) |
| `server/sohModel.test.ts` | 16 | Physics SOH model |
| `server/simulator.test.ts` | 16 | Battery simulator |
| `server/deviceProvisioning.test.ts` | 10 | IoT device management |
| `server/eprPdf.test.ts` | 8 | EPR compliance PDF |
| `server/restApi.test.ts` | 14 | REST API v1 endpoints |
| `server/gatewayPhysics.test.ts` | 18 | Gateway firmware validation |
| `server/triageQueue.test.ts` | 8 | Triage approval workflow |
| Additional test files | 65+ | Various modules |

---

## 3. Manual Test Cases

### 3.1 Authentication Module

| TC-ID | Test Case | Steps | Expected Result | Priority |
|-------|-----------|-------|-----------------|----------|
| AUTH-01 | User registration | 1. Navigate to /register 2. Enter name, email, password 3. Submit | Account created, redirect to /login with success toast | Critical |
| AUTH-02 | User login | 1. Navigate to /login 2. Enter email/password 3. Submit | JWT cookie set, redirect to /dashboard | Critical |
| AUTH-03 | Invalid login | 1. Navigate to /login 2. Enter wrong password 3. Submit | Error message "Invalid email or password" | Critical |
| AUTH-04 | Forgot password | 1. Click "Forgot password?" 2. Enter email 3. Submit | Success message, email sent (if Resend verified) | High |
| AUTH-05 | Reset password | 1. Click reset link from email 2. Enter new password 3. Submit | Password updated, redirect to /login | High |
| AUTH-06 | Session expiry | 1. Login 2. Wait for JWT expiry 3. Navigate | Toast "Session expired", redirect to /login | Medium |
| AUTH-07 | Logout | 1. Click user avatar 2. Click "Sign Out" | Cookie cleared, redirect to /login | Critical |
| AUTH-08 | Role-based access | 1. Login as non-admin 2. Navigate to /admin/users | Access denied or redirect | High |

### 3.2 Battery Registry Module

| TC-ID | Test Case | Steps | Expected Result | Priority |
|-------|-----------|-------|-----------------|----------|
| BAT-01 | Register single battery | 1. Navigate to /batteries/register 2. Fill all fields 3. Submit | BPAN generated, battery appears in registry | Critical |
| BAT-02 | BPAN format validation | 1. Register battery 2. Check BPAN format | 21-character alphanumeric, encodes manufacturer/chemistry/capacity | Critical |
| BAT-03 | Battery detail view | 1. Click battery in registry 2. View detail page | Full lifecycle timeline, telemetry, SOH, warranty displayed | High |
| BAT-04 | Battery search | 1. Enter search term in registry 2. Apply filters | Results filtered by chemistry, status, manufacturer | High |
| BAT-05 | Bulk CSV import | 1. Navigate to /onboarding 2. Upload CSV 3. Preview 4. Confirm | All batteries registered with auto-BPANs, progress shown | High |
| BAT-06 | QR code generation | 1. Open battery detail 2. Click QR code button | Scannable QR code displayed with BPAN URL | Medium |
| BAT-07 | Battery status change | 1. Open battery detail 2. Change status to "End of Life" | Status updated, EPR reporting triggered | High |

### 3.3 Telemetry Module

| TC-ID | Test Case | Steps | Expected Result | Priority |
|-------|-----------|-------|-----------------|----------|
| TEL-01 | Live telemetry display | 1. Navigate to /telemetry 2. Select battery 3. Start monitoring | Live voltage, temperature, current charts update every 2s | Critical |
| TEL-02 | MQTT message ingestion | 1. Publish MQTT message to broker 2. Check telemetry page | Reading appears in live chart and DB within 3s | Critical |
| TEL-03 | Thermal anomaly alert | 1. Send temperature > threshold 2. Check alerts | Alert created, toast notification, cooldown starts | High |
| TEL-04 | Alert rule evaluation | 1. Configure custom rule 2. Send violating reading | Alert fires based on custom threshold | High |
| TEL-05 | Demo mode | 1. Navigate to /demo 2. Click "Start All" | Simulated readings for all batteries, realistic physics curves | Medium |
| TEL-06 | REST telemetry ingest | 1. POST to /api/v1/batteries/:bpan/telemetry 2. Check dashboard | Reading persisted and broadcast via Socket.io | High |
| TEL-07 | Connection status indicator | 1. View telemetry page 2. Disconnect network 3. Reconnect | Status shows connected → disconnected → reconnecting → connected | Medium |

### 3.4 AI SOH Prediction Module

| TC-ID | Test Case | Steps | Expected Result | Priority |
|-------|-----------|-------|-----------------|----------|
| SOH-01 | SOH prediction | 1. Navigate to /ai-soh 2. Select battery 3. Run prediction | SOH %, RUL cycles, confidence interval, triage path displayed | Critical |
| SOH-02 | Triage routing | 1. Run prediction on battery with SOH < 60% | Triage path = "Material Recycling" | High |
| SOH-03 | Prediction history | 1. Run multiple predictions 2. View history | All predictions listed with timestamps | Medium |
| SOH-04 | Chemistry-specific model | 1. Predict SOH for NMC battery 2. Predict for LFP | Different degradation curves per chemistry | High |
| SOH-05 | Breakdown display | 1. Run prediction 2. Check breakdown | Calendar fade, cycle fade, IR correction shown | Medium |

### 3.5 Marketplace Module

| TC-ID | Test Case | Steps | Expected Result | Priority |
|-------|-----------|-------|-----------------|----------|
| MKT-01 | Create listing | 1. Navigate to /marketplace/create 2. Select battery 3. Set price 4. Upload photos 5. Submit | Listing appears in marketplace browse | Critical |
| MKT-02 | Browse marketplace | 1. Navigate to /marketplace 2. Apply filters | Listings filtered by chemistry, SOH, price range | High |
| MKT-03 | Make offer | 1. Open listing detail 2. Click "Make Offer" 3. Enter amount 4. Submit | Offer recorded, Stripe checkout opens in new tab | Critical |
| MKT-04 | Stripe payment | 1. Complete Stripe checkout (4242 4242 4242 4242) | Payment success page, order created | Critical |
| MKT-05 | My orders | 1. Navigate to /marketplace/orders | All user's completed purchases listed | High |
| MKT-06 | Withdraw listing | 1. Go to "My Listings" tab 2. Click "Withdraw" | Listing removed from browse, status updated | Medium |

### 3.6 Compliance Module

| TC-ID | Test Case | Steps | Expected Result | Priority |
|-------|-----------|-------|-----------------|----------|
| COM-01 | CPCB Form BW-3 export | 1. Navigate to /epr-compliance 2. Click "Export Report" 3. Select India CPCB 4. Fill details 5. Generate | PDF downloaded with all regulatory fields | Critical |
| COM-02 | EU Battery Passport | 1. Navigate to /passport/EU/:localId (public URL) | Public passport page with carbon, recycled content, SOH | Critical |
| COM-03 | Carbon footprint declaration | 1. Open battery detail 2. Fill 4 lifecycle stages 3. Submit | Carbon class (A-E) calculated, declaration stored | High |
| COM-04 | Recycled content declaration | 1. Open battery detail 2. Fill material percentages 3. Submit | EU threshold compliance shown | High |
| COM-05 | EPR token issuance | 1. Complete yield verification 2. Check EPR tokens | Token issued with audit trail | High |
| COM-06 | Compliance dashboard | 1. Navigate to /compliance | Per-jurisdiction status cards, active/pending/overdue | High |

### 3.7 Warranty Module

| TC-ID | Test Case | Steps | Expected Result | Priority |
|-------|-----------|-------|-----------------|----------|
| WAR-01 | Register warranty | 1. Navigate to /warranty/register 2. Fill all fields 3. Submit | Warranty record created, linked to BPAN | Critical |
| WAR-02 | Public warranty check | 1. Navigate to /warranty/check 2. Enter BPAN or phone 3. Search | Warranty status displayed (active/expired/voided) | Critical |
| WAR-03 | Warranty claim | 1. Open warranty dashboard 2. Initiate claim 3. Describe issue | Claim created with status tracking | High |
| WAR-04 | Warranty expiry calculation | 1. Register warranty with known dates 2. Check status | Days remaining calculated correctly | Medium |

### 3.8 Admin Module

| TC-ID | Test Case | Steps | Expected Result | Priority |
|-------|-----------|-------|-----------------|----------|
| ADM-01 | User role management | 1. Navigate to /admin/users 2. Change user role 3. Save | Role updated, audit log entry created | Critical |
| ADM-02 | Self-demotion guard | 1. Try to remove own admin access | Error: "Cannot remove your own admin access" | High |
| ADM-03 | Last-admin guard | 1. Try to demote the only admin | Error: "Cannot demote the last admin" | High |
| ADM-04 | Audit log | 1. Navigate to /admin/users 2. Click "Audit Log" tab | Full history of role changes with timestamps | High |
| ADM-05 | Platform settings | 1. Navigate to /settings/platform 2. Change locale/currency 3. Save | Settings persisted, UI reflects changes | Medium |
| ADM-06 | Super admin dashboard | 1. Navigate to /admin/system | System health, MQTT status, user growth, API usage displayed | Medium |

### 3.9 Cross-Cutting Concerns

| TC-ID | Test Case | Steps | Expected Result | Priority |
|-------|-----------|-------|-----------------|----------|
| XC-01 | Mobile responsiveness | 1. Open any page on mobile viewport (375px) | Layout adapts, sidebar collapses, content readable | Critical |
| XC-02 | Rate limiting | 1. Send 121 requests to /api/ within 1 minute | 429 Too Many Requests after 120th | High |
| XC-03 | CSP headers | 1. Check response headers in production | Content-Security-Policy header present | High |
| XC-04 | 404 handling | 1. Navigate to /nonexistent-page | Custom 404 page with back-to-dashboard link | Medium |
| XC-05 | Error boundary | 1. Trigger a component error | Error boundary catches, shows fallback UI | Medium |
| XC-06 | Cookie consent | 1. First visit to platform | Cookie consent banner appears | Medium |
| XC-07 | Language switching | 1. Click language selector 2. Choose German | UI labels switch to German translations | Medium |
| XC-08 | Dark theme consistency | 1. Navigate through all pages | Consistent dark theme, no white flashes, readable text | High |
| XC-09 | WCAG 2.1 AA | 1. Tab through page 2. Check focus rings 3. Check contrast | Visible focus rings, 4.5:1 contrast ratio, skip-to-content link | High |
| XC-10 | Session persistence | 1. Login 2. Close browser 3. Reopen | Session maintained via httpOnly cookie | High |

---

## 4. Performance Benchmarks

| Endpoint | Target | Measured | Status |
|----------|--------|----------|--------|
| GET /api/health | < 500ms | ~200ms | PASS |
| GET / (homepage) | < 2s | ~1.5s | PASS |
| GET /api/trpc/bpan.list | < 3s | ~2.5s | PASS |
| POST /api/auth/login | < 2s | ~1s | PASS |
| POST /api/v1/batteries/:bpan/telemetry | < 1s | ~500ms | PASS |
| WebSocket connection | < 3s | ~1s | PASS |
| PDF generation | < 15s | ~8s | PASS |

---

## 5. Security Test Cases

| SEC-ID | Test Case | Expected Result | Status |
|--------|-----------|-----------------|--------|
| SEC-01 | SQL injection in search | Input sanitized, no DB error | PASS (Drizzle ORM parameterized) |
| SEC-02 | XSS in user input | HTML escaped in output | PASS (React auto-escaping) |
| SEC-03 | CSRF protection | JWT in httpOnly cookie, SameSite=Lax | PASS |
| SEC-04 | Brute force login | Rate limited to 20 req/15min on /api/auth/ | PASS |
| SEC-05 | Unauthorized API access | 401 Unauthorized without valid JWT | PASS |
| SEC-06 | Role escalation | Non-admin cannot access admin procedures | PASS (adminProcedure guard) |
| SEC-07 | Password storage | bcrypt hash (12 rounds), never stored in plaintext | PASS |
| SEC-08 | JWT token expiry | Tokens expire, session invalidated | PASS |
| SEC-09 | File upload validation | Only allowed MIME types, size limits enforced | PASS |
| SEC-10 | HTTPS enforcement | All traffic redirected to HTTPS | PASS (Render managed) |

---

## 6. Regression Test Protocol

When any code change is made, the following regression protocol must be followed:

1. **Run automated tests:** `pnpm test` — all 420+ tests must pass
2. **TypeScript check:** `pnpm check` — zero errors required
3. **Manual smoke test:** Login → Dashboard → Register Battery → View Telemetry → Run SOH → Check Marketplace
4. **Health endpoint:** Verify `GET /api/health` returns `{"status":"ok","db":"connected","dbType":"postgresql"}`
5. **Mobile check:** Verify responsive layout on 375px viewport

---

## 7. Bug Reporting Template

When reporting bugs during UAT, use the following template:

```markdown
## Bug Report

**Reporter:** [Name / Role]
**Date:** [YYYY-MM-DD]
**Severity:** [Critical / High / Medium / Low]
**Environment:** [Production / Staging]
**Browser:** [Chrome / Firefox / Safari / Edge + version]
**Device:** [Desktop / Mobile + OS]

### Description
[Clear description of the issue]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Screenshots / Video
[Attach if applicable]

### Additional Context
[Any relevant logs, error messages, or observations]
```

---

## 8. UAT Sign-Off Criteria

The platform is considered UAT-complete when:

1. All **Critical** priority test cases pass (100%)
2. All **High** priority test cases pass (> 95%)
3. All **Medium** priority test cases pass (> 90%)
4. No unresolved Critical or High severity bugs remain
5. Each user persona has completed their primary workflow end-to-end
6. Performance benchmarks are met for all critical endpoints
7. Security test cases all pass
8. Mobile responsiveness verified on iOS Safari and Android Chrome

---

## 9. Defect Severity Classification

| Severity | Definition | SLA |
|----------|-----------|-----|
| **Critical** | System down, data loss, security breach, payment failure | Fix within 4 hours |
| **High** | Major feature broken, workflow blocked, incorrect data | Fix within 24 hours |
| **Medium** | Feature partially broken, workaround available, UI issue | Fix within 72 hours |
| **Low** | Cosmetic issue, minor UX improvement, documentation gap | Fix in next release |

---

*End of QA Documentation*
