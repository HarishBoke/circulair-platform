# Circul-AI-r Platform — Complete Guide

**Version:** 1.0.0  
**Last Updated:** November 2026
**Classification:** Internal

---

## What is Circul-AI-r?

Circul-AI-r is an **AI-powered battery lifecycle intelligence platform** that provides end-to-end management for lithium-ion batteries — from manufacturing and deployment through monitoring, second-life remarketing, and responsible recycling. Its recordkeeping and reporting tools can assist work under India's Battery Waste Management Rules (2022), the EU Battery Regulation (2023/1542), and sustainability standards. Actual compliance depends on source data, operator controls, legal review and regulator acceptance; the platform does not confer certification.

The platform assigns every battery a unique **BPAN (Battery Passport Aadhaar Number)** — a 21-character digital identity that tracks the battery across its entire lifecycle, much like India's Aadhaar system tracks citizens. This BPAN becomes the single source of truth for all battery data: telemetry, warranty, ownership transfers, compliance records, and end-of-life disposition.

---

## Who Uses Circul-AI-r?

| Stakeholder | Primary Use Cases | Key Features |
|---|---|---|
| **OEMs / Manufacturers** | Register batteries, generate BPANs, declare carbon footprints, manage warranties | BPAN Registry, Warranty Registration, Carbon Footprint Declaration |
| **Fleet Operators** | Monitor battery health, receive predictive alerts, plan maintenance | Real-time Telemetry, SOH Prediction, Alert System |
| **Recyclers** | Verify battery provenance, claim EPR tokens, track yield | EPR Compliance, Yield Verification, Material Recovery |
| **BESS Developers** | Source second-life batteries, verify SOH, negotiate pricing | Marketplace, Battery Passport Lookup, SOH Reports |
| **Government / Regulators** | Audit compliance, verify EPR obligations, access fleet data | Compliance Dashboard, Audit Logs, CPCB Reports |
| **Service Providers** | Register warranties, process claims, manage service records | Warranty System, Service History, Customer Contacts |
| **AI Agents** | Automate battery checks, warranty lookups, compliance reporting | REST API, MCP Server, Agent Action Logging |

---

## Core Features

### 1. Battery Passport (BPAN) Registry

Every battery registered on the platform receives a unique BPAN following the format:

```
IN-MFR-CHM-CAP-XXXXXXXX
│  │   │   │   └── 8-char unique identifier
│  │   │   └────── Capacity code (A1-A8)
│  │   └────────── Chemistry code (NMC/LFP/NCA/etc.)
│  └────────────── Manufacturer code (3 chars)
└───────────────── Country code (ISO 3166-1)
```

The BPAN encodes the battery's origin, chemistry, and capacity in a human-readable format while maintaining a unique identifier for database lookups. Registration captures manufacturer details, model number, production date, and initial specifications.

### 2. Real-Time Telemetry & IoT Integration

The platform ingests battery telemetry data via MQTT (for IoT devices) and HTTP (for BMS integrations). Monitored parameters include voltage, current, temperature, state of charge (SOC), cycle count, and internal resistance. Data is processed in real-time with Socket.io broadcasting for live dashboard updates.

Thermal anomaly detection runs continuously, flagging batteries that exceed safe operating temperature ranges. The alert system uses configurable thresholds and cooldown periods to prevent alert fatigue.

### 3. AI-Powered SOH Prediction

The platform uses machine learning models to predict battery State of Health (SOH) and Remaining Useful Life (RUL). Predictions are generated from telemetry history and include confidence intervals. The triage engine uses SOH predictions to recommend lifecycle actions:

| SOH Range | Triage Recommendation | Action |
|---|---|---|
| 80-100% | Continue Operation | Normal monitoring |
| 60-79% | Enhanced Monitoring | Increase telemetry frequency |
| 40-59% | Second-Life Candidate | List on marketplace |
| 20-39% | Recycling Recommended | Initiate EPR process |
| 0-19% | Urgent Recycling | Priority disposal |

### 4. Warranty Management

The warranty system provides complete lifecycle management from registration through claims resolution. Key capabilities include:

**Registration:** Multi-step form capturing battery details, customer contacts (phone, WhatsApp, email), dealer information, invoice data, and warranty terms. Supports standard, extended, and premium coverage types with configurable term lengths (12-60 months).

**Multi-Channel Lookup:** Customers and service providers can verify warranty status using any of five channels — BPAN, serial number, phone number, email address, or WhatsApp number. The public-facing warranty check page requires no authentication.

**Warranty Status Engine:** Automatically computes effective warranty status based on registration dates, coverage type, and claim history. Status values include active, expired, voided, and claimed, with days-remaining calculation.

**Claim Workflow:** Structured claim process with evidence upload, SOH verification, assignment routing, and resolution tracking. Resolution types include replacement, repair, refund, pro-rata credit, and rejection.

**Platform Integration:** Warranty status is integrated into marketplace listings (in-warranty batteries are flagged), battery detail views, and compliance reporting.

### 5. Second-Life Marketplace

The marketplace connects battery owners with buyers for second-life applications. Listings include SOH verification, pricing (spot price in INR), and battery passport data. The platform enforces warranty gates — batteries with active warranties receive warnings when listed for second-life sale.

### 6. Bulk Battery Onboarding

For organizations with existing battery fleets, the bulk onboarding system supports CSV import and manual entry with automatic BPAN generation. The system parses manufacturer serial numbers, chemistry types, capacity ratings, and origin data to generate compliant BPANs. Optional warranty auto-registration creates warranty records for each onboarded battery.

### 7. EPR Compliance & Carbon Footprint

Extended Producer Responsibility (EPR) compliance tracking with token generation, recycling verification, and yield reporting. Carbon-footprint declarations include methodology labels and performance-classification fields. Selecting GHG Protocol, ISO 14067, EU PEF, or GBA does not establish methodological conformity; calculations, boundaries and evidence require independent review.

### 8. Logistics & Supply Chain

Shipment tracking for battery transfers between lifecycle stages. Supports status tracking from created through in-transit, delivered, and completed stages with location data.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React 19)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Dashboard │  │ Registry │  │ Warranty  │  │ Marketplace│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └──────────────┴──────────────┴──────────────┘         │
│                        tRPC Client                           │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    SERVER (Express 4)                         │
│                             │                                │
│  ┌──────────────────────────┼──────────────────────────┐    │
│  │              /api/trpc   │   tRPC Router             │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │    │
│  │  │  BPAN  │ │Warranty│ │  Agent │ │Complnce│       │    │
│  │  │ Router │ │ Router │ │ Router │ │ Router │       │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  /api/v1 (REST)  │  │  /api/mcp (MCP)  │                 │
│  │  OpenAPI 3.1     │  │  JSON-RPC 2.0    │                 │
│  │  API Key Auth    │  │  20 Tools        │                 │
│  │  Rate Limiting   │  │  5 Resources     │                 │
│  │  Swagger UI      │  │  4 Prompts       │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Audit Logger    │  │  Structured Log  │                 │
│  │  Classifications │  │  SIEM-Ready      │                 │
│  │  Security Events │  │  Trace IDs       │                 │
│  └──────────────────┘  └──────────────────┘                 │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │    S3    │  │   MQTT   │  │ Socket.io│   │
│  │ (Render) │  │ Storage  │  │  Broker  │  │ Realtime │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui | UI framework and component library |
| Routing | Wouter | Client-side routing |
| API Client | tRPC 11 with Superjson | End-to-end type-safe API calls |
| Server | Express 4, Node.js 22 | HTTP server and middleware |
| API Layer | tRPC + REST (OpenAPI 3.1) + MCP | Multi-protocol API access |
| Database | Render PostgreSQL via Drizzle ORM | Relational data storage |
| File Storage | Direct AWS S3 SDK | Document and media storage; private-file delivery must be configured |
| Real-time | Socket.io | Live telemetry broadcasting |
| IoT | MQTT | Device telemetry ingestion |
| Auth | Email/password + 30-day JWT session cookie | Authentication and authorization |
| AI | Direct OpenAI integration (`invokeLLM`) | AI-assisted prediction, triage and chat; validate outputs |
| Email | Direct ZeptoMail REST API | Password reset, onboarding and owner notifications |
| Hosting | Render Node.js web service | API + SPA; configuration in root `render.yaml` |

---

## Getting Started

### For Platform Users

1. **Sign in** at `/login` using your registered email and password; no external identity portal is required
2. **Register your first battery** via the BPAN Registry page
3. **Set up telemetry** by configuring your BMS to send MQTT data
4. **Register warranties** for customer-facing battery products
5. **Monitor fleet health** through the Dashboard and Alerts pages

### For API Consumers (Microservices)

1. Request an **API key** from the platform admin
2. Access the **Swagger UI** at `/api/docs` for interactive documentation
3. Authenticate using `Authorization: Bearer <your_api_key>`
4. Start with the public `/api/v1/health` for gateway connectivity; `/api/health` separately reports PostgreSQL readiness
5. See the [API Reference](../API.md) for endpoint documentation

### For AI Agent Integration (MCP)

1. Configure your agent to connect to `/api/mcp` with `Authorization: Bearer <api_key>`
2. Send a `tools/list` request to discover available tools
3. Use `tools/call` to invoke platform capabilities
4. See the [MCP Integration Guide](./MCP_GUIDE.md) for detailed setup

---

## Security & Compliance

The application provides supporting security mechanisms, not ISO 27001 certification, a SOC 2 Type II attestation, or guaranteed regulatory compliance.

| Control Area | Application mechanism | Operator verification |
|---|---|---|
| Audit logging | Trace IDs, audit entries, security events | Confirm coverage, access restrictions, export integrity and retention |
| Access control | JWT-protected procedures, admin role and scoped API keys | Review role assignments, permissions and public endpoints |
| Data classification | Public/internal/confidential/restricted metadata | Classification labels alone do not enforce all data access |
| Transport security | Render TLS, secure cookies over HTTPS | Validate proxy and origin settings; storage/database encryption must be verified |
| Change management | Selected configuration-change records | Retain deployment approvals and migration review evidence |
| Incident response | Event classification and best-effort owner mail | Configure notification recipients and test escalation separately |

For control evidence and readiness limitations, see [Compliance Guide](./COMPLIANCE_GUIDE.md).

### External Integration Setup

Administrators configure server-side secrets in Render; the application does not supply provider accounts or credentials. Set `DATABASE_URL` for Render PostgreSQL, a strong `JWT_SECRET`, and trusted `APP_URL`. OpenAI features need `OPENAI_API_KEY` and available models; password reset and owner mail need `ZEPTOMAIL_TOKEN`, a verified `FROM_EMAIL`, and `OWNER_EMAIL`; files need S3 credentials, bucket and region. The current mail helper targets the India-region ZeptoMail account and has no automatic provider failover.

Maps, Stripe and MQTT require their own restricted keys, webhook signatures or broker credentials when used. A green database health check does not prove those integrations work. Missing configuration or provider outages can disable individual features; do not treat demo or simulated data as an end-to-end production test. See [Deployment Guide](../DEPLOYMENT.md) for setup, private-file delivery limitations, validation and rollback.

---

## Support & Contact

For technical support, API access requests, or compliance inquiries, contact the platform administration team through the Super Admin panel or the configured notification channels.
