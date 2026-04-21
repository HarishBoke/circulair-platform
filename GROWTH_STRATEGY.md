# Circul-AI-r Platform: Growth Strategy
## Onboarding Playbook · Go-to-Market Sales · Next-Generation Roadmap

*Prepared April 2026 — for internal use by the Circul-AI-r founding team*

---

## Executive Summary

The global battery lifecycle management solution market reached **$13.66 billion in 2025** and is projected to grow at a CAGR of 12.93% through 2033 [1]. Three hard regulatory deadlines are creating an irreversible demand wave: the EU Digital Battery Passport mandate (18 February 2027) [2], India's Battery Pack Aadhaar Number (BPAN) framework (draft finalised Q1 2026) [3], and China's MIIT battery traceability rules (April 2026). Circul-AI-r is the only unified SaaS platform that addresses all three simultaneously while adding a live marketplace and physics-informed AI health prediction. The window to establish category leadership is the next 18 months.

---

## Part 1: Client Onboarding Playbook

### 1.1 The Five Onboarding Stages

Every client — regardless of role — moves through five stages. The platform is designed so that each stage can be completed in a single working day.

| Stage | Duration | What Happens |
|---|---|---|
| **1. Account Provisioning** | Day 1 | Admin creates organisation account, assigns platform role (OEM / Recycler / BESS Developer / Government / Service Provider), and invites team members |
| **2. Battery Inventory Import** | Day 1–2 | Upload existing fleet via CSV bulk import or connect via REST API; BPAN numbers are auto-generated for any battery without one |
| **3. Telemetry Connection** | Day 2–5 | Connect BMS/SCADA via MQTT (TLS, credentials provided in Data Integration Hub); first live readings appear within minutes |
| **4. Compliance Baseline** | Day 3–7 | Run AI SOH prediction on imported fleet; generate first CPCB BW-3 report or EU Battery Passport PDF; review EPR token balance |
| **5. Go-Live Handoff** | Day 7 | Assign alert rules, configure notification emails, enable marketplace listing if applicable; schedule 30-day check-in call |

### 1.2 Role-Specific Onboarding Paths

Different stakeholders have different Day-1 priorities. The table below maps each role to its highest-value first action on the platform.

| Role | First Action | First Value Delivered |
|---|---|---|
| **EV OEM** | Register production fleet via CSV import | BPAN QR codes for every battery; warranty tracking activated |
| **Battery Manufacturer** | Connect SCADA via MQTT | Real-time cell-level telemetry; formation cycle data captured |
| **Recycler** | Create intake batch from logistics order | EOL intake workflow; yield reconciliation; EPR token issuance |
| **BESS Developer** | Browse marketplace, set smart-match criteria | Curated second-life battery offers matching capacity and SOH requirements |
| **Service Provider** | Import service history CSV | Full service timeline per BPAN; predictive maintenance alerts activated |
| **Government / Regulator** | Access compliance dashboard | Live CPCB BW-3 status across all registered producers in jurisdiction |

### 1.3 Technical Onboarding Checklist

Provide this checklist to every new client's IT team at contract signing.

**Network & Security**
- Whitelist outbound MQTT over port 8883 (TLS) to `sd1218f1.ala.asia-southeast1.emqxsl.com`
- Confirm HTTPS egress is permitted to `circulair.energy` (port 443)
- Share MQTT credentials (username, password, topic prefix) from the Data Integration Hub

**Data Preparation**
- Export existing battery inventory to CSV with columns: serial number, chemistry, capacity (kWh), voltage (V), manufacture year/month, current status
- Prepare historical telemetry export (voltage, current, temperature, cycle count) if available — improves AI SOH confidence from 50% to 80%+

**Integration Options**

| Method | Best For | Setup Time |
|---|---|---|
| MQTT (real-time) | BMS with network connectivity | 2–4 hours |
| REST API | SCADA systems, custom integrations | 1–2 days |
| CSV Import | Legacy systems, one-time migration | 30 minutes |
| Webhook | Event-driven ERP integration | 1 day |

### 1.4 Success Metrics for Onboarding

Define these KPIs in every client contract to measure onboarding success at 30, 60, and 90 days.

- **Day 30:** 100% of existing battery inventory registered with BPAN; first AI SOH predictions run; first compliance report generated
- **Day 60:** Live MQTT telemetry streaming for ≥ 80% of active fleet; first alert rule triggered and acknowledged; first marketplace listing created (if applicable)
- **Day 90:** First EPR token issued; CPCB BW-3 submitted to regulator; NPS score collected from primary user

---

## Part 2: Go-to-Market Sales Strategy

### 2.1 Ideal Customer Profile (ICP)

The highest-conversion prospects share three characteristics: they face a hard regulatory deadline within 18 months, they manage a fleet of ≥ 500 batteries, and they currently track battery data in spreadsheets or a legacy ERP system.

**Tier 1 — Land and Expand (highest urgency)**

| Segment | Trigger | Deal Size | Sales Cycle |
|---|---|---|---|
| Indian EV OEMs (2W/3W/4W) | BPAN mandate draft finalised | ₹15–40L/year | 4–8 weeks |
| EU Industrial Battery Producers | Battery Passport mandate Feb 2027 | €50–200K/year | 8–16 weeks |
| Indian Battery Recyclers (CPCB registered) | EPR compliance audits Q3 2026 | ₹8–20L/year | 3–6 weeks |

**Tier 2 — Strategic Accounts (longer cycle, higher ACV)**

| Segment | Trigger | Deal Size | Sales Cycle |
|---|---|---|---|
| BESS Developers (grid storage) | IRA tax credit documentation requirements | $80–300K/year | 12–24 weeks |
| Mining / Black Mass processors | EU Critical Raw Materials Act traceability | €100–500K/year | 16–32 weeks |
| State Electricity Boards (India) | DISCOM battery fleet compliance | ₹25–80L/year | 20–40 weeks |

### 2.2 Pricing Architecture

A three-tier SaaS model with a marketplace transaction fee creates two revenue streams that compound as the network grows.

**Subscription Tiers**

| Tier | Price | Included | Best For |
|---|---|---|---|
| **Starter** | ₹49,999/month (≈ $600) | 500 batteries, 2 users, CSV import, basic compliance reports | Small recyclers, pilot deployments |
| **Growth** | ₹1,49,999/month (≈ $1,800) | 5,000 batteries, 10 users, MQTT telemetry, AI SOH, marketplace access | Mid-size OEMs, BESS developers |
| **Enterprise** | Custom (₹5L–25L/month) | Unlimited batteries, unlimited users, dedicated MQTT broker, white-label, SLA 99.9% | Large OEMs, government bodies, EU multinationals |

**Marketplace Transaction Fee**
A 2.5% platform fee on every completed marketplace transaction, charged to the buyer at Stripe checkout. This creates a network-effect revenue stream: every new seller attracts more buyers, which attracts more sellers.

**Professional Services**
- Onboarding & integration: ₹1.5L–5L one-time (depending on complexity)
- Compliance report preparation: ₹25,000 per report (CPCB BW-3, EU Battery Passport)
- Custom API development: ₹1,500/hour

### 2.3 Sales Motion

**Step 1 — Regulatory Hook (Week 1–2)**
Lead with the compliance deadline, not the product. The opening message is: *"Your BPAN registration deadline is approaching. We can have your entire fleet compliant in 7 days."* This creates urgency without requiring the prospect to understand the full platform.

**Step 2 — Free Compliance Audit (Week 2–3)**
Offer a free 30-minute compliance gap analysis. Import the prospect's battery inventory CSV into a sandbox environment and generate a sample CPCB BW-3 report or EU Battery Passport. Let them see their own data in the platform before any contract discussion.

**Step 3 — Pilot (Week 3–6)**
A 30-day free pilot for up to 100 batteries. No credit card required. The pilot includes MQTT connection support, one AI SOH prediction run, and one compliance report. The goal is to make the platform indispensable before the first invoice.

**Step 4 — Expansion (Month 2–6)**
After the pilot, expand to the full fleet. The natural expansion path is: CSV import → MQTT telemetry → AI predictions → marketplace listing → EPR compliance. Each step adds value and increases switching costs.

### 2.4 Competitive Positioning

The primary competitors are Circularise, Minespider/Recircle.market, and Circunomics. The differentiation is clear:

| Capability | Circul-AI-r | Circularise | Minespider | Circunomics |
|---|---|---|---|---|
| Real-time MQTT telemetry | ✅ | ❌ | ❌ | ❌ |
| Physics-informed SOH model | ✅ | ❌ | ❌ | Partial |
| Live battery marketplace | ✅ | ❌ | ✅ (Recircle) | ✅ |
| India BPAN compliance | ✅ | ❌ | ❌ | ❌ |
| EU Battery Passport | ✅ | ✅ | Partial | ❌ |
| Stripe payment settlement | ✅ | ❌ | ❌ | ❌ |
| Per-chemistry alert rules | ✅ | ❌ | ❌ | ❌ |
| Starting price | ₹49,999/mo | €3,000+/mo | Custom | Custom |

The single most defensible differentiator is the combination of **real-time telemetry + physics AI + marketplace + multi-jurisdiction compliance** in one platform. No competitor offers all four.

### 2.5 Channel Strategy

**Direct Sales (0–12 months):** Founder-led sales to the first 20 accounts. Target Indian EV OEMs (Ola Electric, Ather, Ampere) and CPCB-registered recyclers (Attero, Lohum, Metastable). These accounts validate the product and generate case studies.

**Partner Channel (12–24 months):** Sign 3–5 system integrators in each target market (India: Tata Consultancy, Wipro; EU: Capgemini, Accenture). Partners handle implementation; Circul-AI-r provides the SaaS license. Revenue split: 70/30 (platform/partner).

**Regulatory Body Partnerships (ongoing):** Engage CPCB (India), ADEME (France), and Umweltbundesamt (Germany) as reference customers. Government adoption creates a mandate for all producers in the jurisdiction to use the platform.

---

## Part 3: Next-Generation Technology Roadmap

### 3.1 Roadmap Overview

The platform is currently at **v1.0 — Compliance & Monitoring**. The roadmap to v4.0 over 36 months transforms it from a compliance tool into the operating system for the global battery circular economy.

| Version | Timeline | Theme | Key Capability Added |
|---|---|---|---|
| **v1.0** (current) | Live | Compliance & Monitoring | BPAN, MQTT, AI SOH, Marketplace, EPR |
| **v2.0** | Q3 2026 | Intelligence | Digital Twin, Federated Learning, Carbon Accounting |
| **v3.0** | Q1 2027 | Network | Multi-OEM Data Exchange, Blockchain Anchoring, API Marketplace |
| **v4.0** | Q3 2027 | Autonomy | Autonomous Triage Routing, Predictive Procurement, Solid-State Support |

### 3.2 v2.0 — Intelligence (Q3 2026)

**Battery Digital Twin**
Each registered battery gets a persistent digital twin — a live simulation model that runs in parallel with the physical battery. The twin ingests real telemetry and predicts future degradation trajectories under different usage scenarios (high C-rate, elevated temperature, deep cycling). This enables operators to answer questions like: *"If I deploy this battery in a fast-charging application for 6 more months, what will its SOH be?"*

Implementation: extend `sohModel.ts` with a time-series simulation engine; store twin state in a new `battery_twins` table; expose via `trpc.ai.simulateTwin` procedure.

**Federated Learning for Fleet SOH**
The current physics model uses per-chemistry parameters calibrated from published literature. Federated learning allows the model to improve from real cycling data across the entire client fleet without any client sharing raw data. Each client's BMS data trains a local model update; only the gradient (not the data) is shared with the central model [4]. This is the path to achieving the < 2% RMSE SLA commitment.

Implementation: a Python microservice (FastAPI) runs the federated aggregation server; the Node.js backend calls it via REST for model updates; model weights are versioned in S3.

**Carbon Accounting Module**
Calculate the carbon footprint of each battery across its lifecycle: manufacturing emissions (cell origin, chemistry), transport, operational charging emissions (grid carbon intensity by region), and end-of-life processing. Output a carbon certificate per BPAN that satisfies EU Battery Regulation Article 7 (carbon footprint declaration) [2].

### 3.3 v3.0 — Network (Q1 2027)

**Multi-OEM Data Exchange**
Enable OEMs to share battery health data with recyclers and BESS developers under controlled consent. A battery sold by OEM A to a recycler can carry its full telemetry history, SOH predictions, and service records — creating a trusted data handshake that increases the recycler's willingness to pay.

Implementation: a consent management layer on top of the existing documents table; data sharing governed by signed data-sharing agreements stored as PDF in S3.

**Blockchain Anchoring**
The current audit trail is a database simulation. v3.0 anchors every BPAN registration, SOH prediction, and EPR token issuance to a public blockchain (Polygon or Ethereum L2) as a cryptographic hash. This satisfies the EU Battery Regulation's requirement for tamper-evident records and enables regulators to verify compliance without accessing the platform directly.

**API Marketplace**
Open the platform's data layer to third-party developers via a public API marketplace. Charge per-call fees for SOH prediction, BPAN validation, and compliance report generation. This creates a developer ecosystem and a new revenue stream without adding sales headcount.

### 3.4 v4.0 — Autonomy (Q3 2027)

**Autonomous Triage Routing**
Today, the AI recommends a triage path (direct reuse / module repurposing / material recycling) and a human decides. In v4.0, the platform autonomously routes batteries: it creates a marketplace listing, matches a buyer, initiates a logistics pickup request, and generates all compliance documents — with human approval required only for transactions above a configurable threshold.

**Predictive Procurement for BESS Developers**
Analyse the platform's marketplace supply pipeline and predict battery availability 3–6 months ahead. BESS developers can place forward purchase orders at today's price for batteries that will reach their target SOH range in the future. This is the battery equivalent of commodity futures trading.

**Solid-State Battery Support**
Solid-state batteries entered pilot production in 2026 [5] and will reach commercial scale by 2028. They require fundamentally different health monitoring: no liquid electrolyte degradation, different failure modes (dendrite growth, interface delamination), and higher operating voltages. v4.0 adds solid-state chemistry parameters to `sohModel.ts` and new telemetry metrics (interface resistance, lithium plating index).

### 3.5 Infrastructure Scaling Plan

The current architecture (single Node.js server + TiDB) handles approximately 10,000 concurrent MQTT messages per second. Scaling to enterprise requires:

| Milestone | Battery Count | Architecture Change |
|---|---|---|
| 0–50,000 batteries | Current | Single server, TiDB serverless |
| 50,000–500,000 batteries | Q4 2026 | Horizontal Node.js scaling, Redis pub/sub for Socket.io, read replicas |
| 500,000–5M batteries | Q2 2027 | Kafka for MQTT ingestion, TimescaleDB for telemetry, CDN for PDF exports |
| 5M+ batteries | Q4 2027 | Multi-region deployment (India, EU, Singapore), data residency compliance |

---

## Part 4: 90-Day Action Plan

The following 12 actions, executed in order, will take the platform from launch to first 10 paying clients.

| Week | Action | Owner | Success Metric |
|---|---|---|---|
| 1–2 | Claim Stripe sandbox; verify Resend DNS for circulair.energy | Technical | Emails land in inbox; test payment completes |
| 1–2 | Identify 20 target Indian EV OEMs and recyclers by name | Sales | Prospect list with LinkedIn profiles and CPCB registration numbers |
| 2–3 | Publish a 500-word LinkedIn article: *"India's BPAN deadline: what EV OEMs need to do now"* | Marketing | 500+ views, 20+ connection requests from target segment |
| 3–4 | Run free compliance audits for 5 warm prospects | Sales | 5 pilot agreements signed |
| 4–6 | Onboard 5 pilot clients; achieve Day-7 go-live for each | Customer Success | 5 clients with live MQTT telemetry |
| 6–8 | Collect 3 written case studies (one OEM, one recycler, one BESS developer) | Marketing | Case studies published on circulair.energy |
| 8–10 | Submit to 2 Indian startup accelerators (NASSCOM, iSPIRT) and 1 EU programme (EIC Accelerator) | Fundraising | Applications submitted |
| 10–12 | Convert 3 of 5 pilots to paid Starter or Growth plan | Sales | First MRR > ₹3L |

---

## References

[1]: https://www.linkedin.com/pulse/battery-life-cycle-management-solution-market-research-4zycf "Battery Life Cycle Management Solution Market Research — LinkedIn"
[2]: https://digiprodpass.com/blogs/battery-passport-deadlines-2027 "EU Battery Passport Deadlines: How to Prepare for 2027 — DigiprodPass"
[3]: https://timesofindia.indiatimes.com/business/india-business/ev-ecosystem-reform-govt-proposes-aadhaar-like-id-for-batteries-aims-to-boost-traceability-recycling/articleshow/126320747.cms "EV ecosystem reform: Govt proposes Aadhaar-like ID for batteries — Times of India"
[4]: https://xlescience.org/index.php/IJASIS/article/view/679 "Explainable AI-Based Battery Management System with Federated Learning — XLE Science"
[5]: https://to7motor.com/solid-state-batteries-2026-commercial-reality "Solid-State Batteries 2026: How the Technology Is Finally Reaching Commercial Reality — To7Motor"
