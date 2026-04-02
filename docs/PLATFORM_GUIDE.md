# Circul-AI-r Platform — Complete Guide

**Version:** 1.0.0  
**Last Updated:** April 2026  
**Classification:** Internal

---

## What is Circul-AI-r?

Circul-AI-r is an **AI-powered battery lifecycle intelligence platform** that provides end-to-end management for lithium-ion batteries — from manufacturing and deployment through monitoring, second-life remarketing, and responsible recycling. The platform is built to comply with India's Battery Waste Management Rules (2022), the EU Battery Regulation (2023/1542), and global sustainability standards.

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

Extended Producer Responsibility (EPR) compliance tracking with token generation, recycling verification, and yield reporting. Carbon footprint declarations follow GHG Protocol, ISO 14067, EU PEF, and GBA methodologies with performance classification (A-E grades).

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
│  │  ISO 27001       │  │  SIEM-Ready      │                 │
│  │  SOC 2           │  │  Trace IDs       │                 │
│  └──────────────────┘  └──────────────────┘                 │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  MySQL   │  │    S3    │  │   MQTT   │  │ Socket.io│   │
│  │ (TiDB)   │  │ Storage  │  │  Broker  │  │ Realtime │   │
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
| Database | MySQL (TiDB) via Drizzle ORM | Relational data storage |
| File Storage | S3-compatible | Document and media storage |
| Real-time | Socket.io | Live telemetry broadcasting |
| IoT | MQTT | Device telemetry ingestion |
| Auth | Manus OAuth + JWT sessions | Authentication and authorization |
| AI | LLM integration (invokeLLM) | SOH prediction, triage, chat |

---

## Getting Started

### For Platform Users

1. **Sign in** using the Manus OAuth login on the landing page
2. **Register your first battery** via the BPAN Registry page
3. **Set up telemetry** by configuring your BMS to send MQTT data
4. **Register warranties** for customer-facing battery products
5. **Monitor fleet health** through the Dashboard and Alerts pages

### For API Consumers (Microservices)

1. Request an **API key** from the platform admin
2. Access the **Swagger UI** at `/api/docs` for interactive documentation
3. Authenticate using `Authorization: Bearer <your_api_key>`
4. Start with `/api/v1/health` to verify connectivity
5. See the [API Reference](./API_REFERENCE.md) for complete endpoint documentation

### For AI Agent Integration (MCP)

1. Configure your agent to connect to the MCP endpoint at `/api/mcp`
2. Send a `tools/list` request to discover available tools
3. Use `tools/call` to invoke platform capabilities
4. See the [MCP Integration Guide](./MCP_GUIDE.md) for detailed setup

---

## Security & Compliance

The platform implements security controls aligned with **ISO 27001:2022** and **SOC 2 Type II** requirements:

| Control Area | ISO 27001 | SOC 2 | Implementation |
|---|---|---|---|
| Audit Logging | A.12.4 | CC7.2 | Comprehensive audit trail for all operations |
| Access Control | A.9 | CC6.1 | Role-based access with API key scoping |
| Data Classification | A.8.2 | CC6.6 | Four-tier classification (public/internal/confidential/restricted) |
| Security Monitoring | A.12.4.1 | CC7.2 | Dedicated security event log with SIEM-ready format |
| Encryption | A.10 | CC6.1 | TLS in transit, encrypted at rest |
| Change Management | A.12.1.2 | CC8.1 | Configuration change logging |
| Incident Response | A.16 | CC7.3 | Security event severity classification |

For detailed compliance documentation, see [Compliance Guide](./COMPLIANCE_GUIDE.md).

---

## Support & Contact

For technical support, API access requests, or compliance inquiries, contact the platform administration team through the Super Admin panel or the configured notification channels.
