# Circul-AI-r Platform — Project Brief

**Document Version:** 2.0  
**Date:** July 2026  
**Prepared by:** Setoo Engineering  
**Status:** Production — Live at [circulair.energy](https://circulair.energy)  
**Deployment:** Render (Web Service + PostgreSQL)

---

## 1. Executive Summary

Circul-AI-r is an end-to-end **Battery Circular Economy Platform** that provides complete lifecycle intelligence for lithium-ion and lead-acid batteries — from cell manufacturing through deployment, monitoring, second-life remarketing, and material recovery. The platform combines real-time IoT telemetry, AI-driven State of Health (SOH) prediction, multi-jurisdiction regulatory compliance, and a live second-life battery marketplace into a single unified SaaS product.

The platform is **production-deployed** at [circulair.energy](https://circulair.energy), running on Render infrastructure (web service + PostgreSQL database), with 420+ automated tests, zero TypeScript errors, and comprehensive security hardening (CSP, rate limiting, HSTS, trust proxy).

---

## 2. Problem Statement

The global battery industry faces a critical challenge: **there is no unified system** to track batteries from manufacturing through end-of-life, predict remaining useful life, ensure regulatory compliance across jurisdictions, and facilitate second-life trading. This results in:

- **Regulatory non-compliance** — EU Battery Regulation 2023/1542 mandates digital battery passports by February 2027; India's CPCB requires EPR reporting; China's MIIT mandates NEV traceability.
- **Stranded assets** — Batteries with 60-80% SOH are scrapped instead of being repurposed for stationary storage, representing billions in lost value.
- **Safety risks** — Without real-time telemetry and anomaly detection, thermal runaway events go undetected until catastrophic failure.
- **Fragmented data** — Battery data is siloed across OEMs, recyclers, regulators, and service providers with no interoperability.

---

## 3. Solution Overview

Circul-AI-r addresses these challenges through six integrated modules:

| Module | Function | Key Capability |
|--------|----------|----------------|
| **BPAN Registry** | Unique battery identification | 21-character structured identifier (Battery Pack Aadhaar Number) |
| **IoT Telemetry** | Real-time monitoring | MQTT broker integration, Socket.io live dashboard, configurable alert rules |
| **AI SOH Prediction** | Health forecasting | Physics-informed electrochemical model (Arrhenius + Wohler), triage routing |
| **Marketplace** | Second-life trading | Listing, offers, Stripe payment, SOH-based pricing |
| **EPR Compliance** | Regulatory reporting | CPCB Form BW-3, EU Battery Passport, carbon footprint declaration |
| **Reverse Logistics** | End-of-life management | Pickup dispatch, hazmat manifest, chain-of-custody, SLA monitoring |

---

## 4. Target Users and Stakeholder Roles

The platform serves 7 distinct stakeholder roles, each with a tailored dashboard and scoped data access:

| Role | Primary Workflow | Access Level |
|------|-----------------|--------------|
| **OEM / Vehicle Manufacturer** | Register batteries, monitor fleet telemetry, manage warranties, track SOH | Full read/write on own batteries |
| **Battery Manufacturer** | Production registration, QR code generation, carbon/recycled content declarations | Write on production data |
| **Recycler** | EOL intake, yield verification, EPR token management, CPCB reporting | Write on recycling data |
| **BESS Developer** | Marketplace procurement, SOH-based asset valuation, forward orders | Read marketplace, write offers |
| **Service Provider** | Field telemetry, service history recording, device provisioning | Write on service records |
| **Government / Regulator** | Compliance dashboard, EPR token ledger, CPCB reports, EU passport verification | Read-only compliance view |
| **Platform Admin** | User management, system health, platform settings, audit log | Full system access |

---

## 5. Technical Architecture

### 5.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, shadcn/ui, wouter |
| Backend | Node.js, Express 4, tRPC 11, Drizzle ORM |
| Database | PostgreSQL (Render) |
| Real-time | Socket.io (WebSocket), MQTT v5 (EMQX Cloud) |
| AI/ML | Physics-informed SOH model (Arrhenius + Wohler), LLM for qualitative triage |
| Storage | AWS S3 (documents, PDFs, photos) |
| Payments | Stripe (checkout sessions, webhooks) |
| Email | Resend (transactional emails) |
| Hosting | Render (web service + PostgreSQL, auto-deploy from GitHub) |
| CI/CD | GitHub → Render auto-deploy on push to main |

### 5.2 Infrastructure

- **Web Service:** Render Standard instance (1 vCPU, 512MB RAM)
- **Database:** Render PostgreSQL (internal networking, no SSL required)
- **MQTT Broker:** EMQX Cloud (Asia-Southeast-1, TLS)
- **Domain:** circulair.energy (custom domain on Render)
- **CDN:** Render edge caching for static assets

### 5.3 Security Posture

- JWT session authentication with httpOnly cookies
- Content Security Policy (CSP) enforced in production
- Rate limiting: 120 req/min API, 20 req/15min auth endpoints
- HSTS headers enabled
- Password hashing with bcrypt (12 rounds)
- Role-based access control (7 platform roles + admin/user system roles)
- Structured audit logging with correlation IDs

---

## 6. Feature Inventory (Production-Ready)

### Core Platform (v1.0 — Complete)

1. BPAN Registry with 21-char structured identifier and QR codes
2. Battery lifecycle management (Operational → Second Life → End of Life)
3. Real-time MQTT telemetry with Socket.io live dashboard
4. Configurable alert rules (7 metrics, per-chemistry thresholds)
5. AI SOH prediction with physics-informed electrochemical model
6. Triage routing (Direct Reuse / Module Repurposing / Material Recycling)
7. Second-life marketplace with photo gallery and Stripe payments
8. Reverse logistics with hazmat manifest and GPS tracking
9. EPR compliance (CPCB Form BW-3 PDF, EU Battery Passport)
10. Carbon footprint declaration (EU Battery Regulation Annex II)
11. Recycled content declaration (EU 2031 targets)
12. Warranty management (registration, claims, public check)
13. Bulk battery onboarding (CSV import with auto-BPAN)
14. AI assistant (natural language queries, BPAN decoding)
15. Document storage (S3-backed, role-gated)
16. PDF export (health passports, compliance reports, certificates)
17. Multi-jurisdiction compliance (EU, IN, CN, US, UK, TH, ID)
18. Multi-currency marketplace (30+ currencies)
19. Internationalization (5 languages: EN, DE, FR, ZH, HI)
20. CirculWiki knowledge base with feedback collection
21. Interactive getting-started tutorial
22. Admin user management with audit log
23. Platform settings (locale, currency, timezone, jurisdictions)
24. Developer portal with API key management
25. REST API v1 with OpenAPI 3.1 documentation
26. MCP (Model Context Protocol) server with 20 tools

### Next-Gen Features (v2.0–v4.0 — Scaffolded)

27. Digital Twin (battery trajectory forecasting)
28. Carbon Accounting (lifecycle carbon calculation)
29. Federated Learning (distributed SOH model training)
30. Blockchain Audit (SHA-256 hash anchoring)
31. Data Sharing (multi-OEM consent management)
32. Autonomous Triage (AI-driven routing with approval queue)
33. Predictive Procurement (forward order matching)
34. Solid-State Battery Support (new chemistry parameters)

---

## 7. Deployment Architecture

```
GitHub (main branch)
    │
    ▼ (auto-deploy on push)
Render Web Service ──── circulair.energy
    │
    ├── Express Server (port 10000)
    │   ├── tRPC API (/api/trpc/*)
    │   ├── REST API v1 (/api/v1/*)
    │   ├── Stripe Webhook (/api/stripe/webhook)
    │   ├── Auth Routes (/api/auth/*)
    │   └── MCP Server (/api/mcp)
    │
    ├── Socket.io (WebSocket, /telemetry namespace)
    │
    └── Vite Static Build (React SPA)

Render PostgreSQL ──── Internal networking (dpg-*)
EMQX Cloud ──── MQTT Broker (mqtts://)
AWS S3 ──── File Storage (documents, photos, PDFs)
Resend ──── Transactional Email
Stripe ──── Payment Processing
```

---

## 8. Testing and Quality

| Metric | Value |
|--------|-------|
| Automated tests | 420+ (Vitest) |
| TypeScript errors | 0 |
| Test files | 28 |
| Test coverage areas | Auth, MQTT, telemetry, SOH model, carbon class, alert rules, marketplace, admin, PDF generation, email |
| Security headers | CSP, HSTS, X-Content-Type-Options, X-Frame-Options |
| Rate limiting | 120 req/min API, 20 req/15min auth |
| Database connection | Retry logic (5 attempts), pool error handling, auto-reconnection |

---

## 9. Project Timeline

| Phase | Period | Deliverable |
|-------|--------|-------------|
| Foundation & Core Modules | Feb–Mar 2026 | BPAN, Telemetry, SOH, Marketplace, Logistics, EPR |
| Real-time & IoT | Mar 2026 | Socket.io, MQTT integration, alert rules |
| Enterprise Features | Mar–Apr 2026 | Admin panel, compliance, i18n, multi-currency |
| Auth & Security | Apr 2026 | JWT auth, password reset, CSP, rate limiting |
| Documentation & Polish | Apr–May 2026 | README, API docs, deployment guide, CirculWiki |
| Advanced AI & v2.0 | May–Jun 2026 | Physics SOH model, digital twin, carbon accounting |
| Render Migration | Jul 2026 | Full PostgreSQL migration, production hardening |

---

## 10. Success Metrics

| KPI | Target | Current |
|-----|--------|---------|
| Platform uptime | > 99.5% | Monitored via Render |
| API response time (p95) | < 3 seconds | < 2.9s (verified) |
| Test pass rate | 100% | 100% (420/420) |
| TypeScript errors | 0 | 0 |
| Security vulnerabilities (critical) | 0 | 0 |
| Supported jurisdictions | 7 | 7 (EU, IN, CN, US, UK, TH, ID) |
| Supported languages | 5 | 5 (EN, DE, FR, ZH, HI) |
| Supported currencies | 30+ | 30+ |
| Battery chemistries supported | 7 | 7 (NMC, LFP, NCA, LCO, LMO, LEAD_ACID, SOLID_STATE) |

---

## 11. Known Limitations and Future Work

| Area | Current State | Planned Resolution |
|------|--------------|-------------------|
| Government API sync | Architecturally wired, not live | Requires CPCB/MIIT API credentials |
| Multi-tenancy | Single instance, shared data | Tenant-scoping layer needed for enterprise |
| SOH model accuracy | Physics-informed simulation | Real CNN-LSTM training on cycling data |
| Offline support | Not implemented | PWA service worker planned |
| Mobile app | Responsive web only | No native app requirement |

---

## 12. Contact and Ownership

| Role | Entity |
|------|--------|
| Product Owner | Setoo (www.setoo.co) |
| Platform | Circul-AI-r (circulair.energy) |
| Repository | GitHub (CI/CD via Render) |
| Support | Platform admin panel |

---

*This document is maintained as part of the Circul-AI-r platform documentation suite. For technical details, see API.md, DEPLOYMENT.md, and README.md in the project root.*
