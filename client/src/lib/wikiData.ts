// ─── CIRCUL-WIKI KNOWLEDGE BASE ──────────────────────────────────────────────
// DeepWiki-inspired structured knowledge base for the Circul-AI-r platform

export interface WikiArticle {
  id: string;
  title: string;
  category: WikiCategory;
  summary: string;
  content: string; // Markdown content
  tags: string[];
  relatedArticles: string[]; // IDs of related articles
  diagram?: string; // Mermaid diagram code
  lastUpdated: string;
  readTimeMinutes: number;
  icon: string; // Lucide icon name
}

export type WikiCategory =
  | "platform"
  | "battery-science"
  | "compliance"
  | "integration"
  | "architecture"
  | "operations";

export interface WikiCategoryInfo {
  id: WikiCategory;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export const WIKI_CATEGORIES: WikiCategoryInfo[] = [
  {
    id: "platform",
    title: "Platform Guide",
    description: "Core platform features, modules, and workflows",
    icon: "LayoutDashboard",
    color: "#10b981",
  },
  {
    id: "battery-science",
    title: "Battery Science",
    description: "Chemistry, degradation, SOH prediction, and lifecycle",
    icon: "Zap",
    color: "#f59e0b",
  },
  {
    id: "compliance",
    title: "Compliance & Regulation",
    description: "ISO 27001, SOC 2, EPR, BWMR, EU Battery Regulation",
    icon: "Shield",
    color: "#6366f1",
  },
  {
    id: "integration",
    title: "Integration & APIs",
    description: "REST API, MCP server, MQTT, webhooks, microservices",
    icon: "Plug",
    color: "#ec4899",
  },
  {
    id: "architecture",
    title: "Architecture",
    description: "System design, data model, security, scalability",
    icon: "Boxes",
    color: "#14b8a6",
  },
  {
    id: "operations",
    title: "Operations",
    description: "Onboarding, warranty, marketplace, logistics",
    icon: "Settings",
    color: "#f97316",
  },
];

// ─── ARTICLES ────────────────────────────────────────────────────────────────

export const WIKI_ARTICLES: WikiArticle[] = [
  // ── PLATFORM ──────────────────────────────────────────────────────────────
  {
    id: "platform-overview",
    title: "What is Circul-AI-r?",
    category: "platform",
    summary:
      "Circul-AI-r is the operating system for the battery circular economy — a unified platform that tracks batteries from cell manufacturing to material recovery.",
    content: `## What is Circul-AI-r?

Circul-AI-r is an enterprise-grade **Battery Intelligence Platform** that provides end-to-end traceability, AI-driven health prediction, regulatory compliance, and a second-life marketplace — all in one unified system.

### The Problem We Solve

The global battery industry faces a critical challenge: once a battery leaves the factory, its lifecycle becomes opaque. Manufacturers lose visibility, recyclers cannot verify battery history, and regulators lack the data needed to enforce environmental obligations. This opacity leads to:

- **Safety risks** from batteries with unknown degradation profiles entering second-life applications
- **Compliance gaps** where producers cannot demonstrate Extended Producer Responsibility (EPR) fulfillment
- **Economic waste** as batteries with remaining useful life are prematurely recycled instead of remarketed

### How Circul-AI-r Works

The platform assigns every battery a unique **BPAN (Battery Passport Aadhaar Number)** — a digital identity that follows the battery through six lifecycle stages:

1. **Manufacture** — Battery is registered with chemistry, capacity, and origin data
2. **Deploy** — Battery enters service; warranty is registered with customer contacts
3. **Monitor** — Real-time IoT telemetry tracks voltage, temperature, SOC, and cycle count
4. **Predict** — AI models estimate State of Health (SOH) and Remaining Useful Life (RUL)
5. **Remarket** — Batteries with remaining life are listed on the second-life marketplace
6. **Recycle** — End-of-life batteries generate EPR compliance tokens

### Key Stakeholders

| Stakeholder | Primary Value |
|---|---|
| **OEMs / Manufacturers** | Full lifecycle visibility, warranty management, compliance reporting |
| **Recyclers** | Verified battery history, material composition data, EPR token generation |
| **Government / Regulators** | EPR compliance tracking, environmental impact data, policy enforcement |
| **BESS Operators** | Second-life battery sourcing with verified SOH and warranty status |

### Platform Architecture

Circul-AI-r is built as a modular monolith with three API protocols:
- **tRPC** for the internal web application (type-safe, real-time)
- **REST API** at \`/api/v1\` for external microservices integration
- **MCP Server** at \`/api/mcp\` for AI agent integration`,
    tags: ["overview", "introduction", "platform", "battery", "lifecycle"],
    relatedArticles: ["bpan-system", "platform-modules", "stakeholder-guide"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 5,
    icon: "Globe",
  },
  {
    id: "bpan-system",
    title: "BPAN — Battery Passport Aadhaar Number",
    category: "platform",
    summary:
      "BPAN is the unique digital identity assigned to every battery, encoding its origin, chemistry, and capacity in a standardized 21-character format.",
    content: `## BPAN — Battery Passport Aadhaar Number

The BPAN is the foundational identifier of the Circul-AI-r platform. Every registered battery receives a unique BPAN that encodes critical metadata and serves as the primary key for all lifecycle operations.

### BPAN Format

\`\`\`
{Country}-{Manufacturer}-{Chemistry}-{CapacityCode}-{UniqueID}
Example: IN-TAT-LFP-A3-X7K9M2P4
\`\`\`

| Segment | Description | Example |
|---|---|---|
| Country | ISO 3166-1 alpha-2 country code | IN (India) |
| Manufacturer | 3-letter manufacturer code | TAT (Tata AutoComp) |
| Chemistry | Battery chemistry identifier | LFP (Lithium Iron Phosphate) |
| Capacity Code | Capacity range code (A1-A8) | A3 (5-10 kWh) |
| Unique ID | 8-character alphanumeric | X7K9M2P4 |

### Capacity Codes

| Code | Range | Typical Application |
|---|---|---|
| A1 | 0-1 kWh | Consumer electronics, IoT |
| A2 | 1-5 kWh | E-bikes, power tools |
| A3 | 5-10 kWh | E-rickshaws, 2-wheelers |
| A4 | 10-25 kWh | 3-wheelers, light EVs |
| A5 | 25-50 kWh | 4-wheeler EVs |
| A6 | 50-100 kWh | Premium EVs, buses |
| A7 | 100-500 kWh | Commercial BESS |
| A8 | 500+ kWh | Grid-scale storage |

### Supported Chemistries

| Code | Full Name | Key Properties |
|---|---|---|
| NMC | Nickel Manganese Cobalt | High energy density, moderate cost |
| LFP | Lithium Iron Phosphate | Long cycle life, thermal stability, low cost |
| NCA | Nickel Cobalt Aluminum | Highest energy density, premium EVs |
| LCO | Lithium Cobalt Oxide | Consumer electronics, compact |
| LMO | Lithium Manganese Oxide | Power tools, medical devices |
| LMFP | Lithium Manganese Iron Phosphate | Next-gen, balanced performance |
| Na-ion | Sodium Ion | Low cost, abundant materials |
| Solid-state | Solid State | Emerging, highest theoretical density |

### How BPAN is Generated

1. User submits battery registration with manufacturer, chemistry, capacity, and origin
2. System validates all fields against the supported chemistry and application lists
3. Country code is extracted from the country of origin
4. Manufacturer code is generated from the first 3 characters (uppercased)
5. Capacity code is computed from the kWh value
6. Unique ID is generated using cryptographically secure random characters
7. All segments are joined with hyphens to form the complete BPAN

### BPAN in the Ecosystem

The BPAN serves as the universal key across all platform modules:
- **Telemetry** — IoT data is indexed by BPAN
- **SOH Prediction** — AI models are queried by BPAN
- **Warranty** — Warranty records are linked to BPAN
- **Marketplace** — Listings reference the battery's BPAN
- **Compliance** — EPR tokens are tied to BPAN
- **Logistics** — Shipments track batteries by BPAN`,
    tags: ["bpan", "battery-passport", "identifier", "registration"],
    relatedArticles: ["platform-overview", "battery-registration", "battery-chemistries"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 4,
    icon: "Fingerprint",
  },
  {
    id: "platform-modules",
    title: "Platform Modules Overview",
    category: "platform",
    summary:
      "Circul-AI-r consists of 10 core modules covering the complete battery lifecycle from registration to recycling.",
    content: `## Platform Modules

Circul-AI-r is organized into 10 core modules, each responsible for a specific aspect of battery lifecycle management.

### Module Map

| Module | Purpose | Key Operations |
|---|---|---|
| **BPAN Registry** | Battery registration and identity | Register, search, view battery passport |
| **Telemetry** | Real-time IoT data ingestion | MQTT/HTTP ingestion, live monitoring, alerts |
| **SOH Prediction** | AI-powered health assessment | SOH estimation, RUL prediction, triage |
| **Warranty** | Warranty lifecycle management | Register, check, claim, multi-channel lookup |
| **Marketplace** | Second-life battery trading | List, browse, warranty-gated listings |
| **Compliance** | Regulatory compliance | EPR tokens, carbon footprint, audit logs |
| **Logistics** | Shipment tracking | Create, track, update shipments |
| **Onboarding** | Bulk battery import | CSV import, auto-BPAN, batch warranty |
| **Agent** | AI agent operations | Action logging, batch execution, capabilities |
| **Admin** | System administration | User management, API keys, system health |

### Module Dependencies

\`\`\`
BPAN Registry ──→ Telemetry ──→ SOH Prediction
     │                              │
     ├──→ Warranty                  ├──→ Marketplace
     │                              │
     ├──→ Logistics                 └──→ Compliance
     │
     └──→ Onbo
arding
\`\`\`

The BPAN Registry is the foundation — every other module depends on battery identity. Telemetry feeds SOH Prediction, which drives Marketplace eligibility and Compliance reporting.`,
    tags: ["modules", "architecture", "features"],
    relatedArticles: ["platform-overview", "bpan-system", "architecture-overview"],
    diagram: `graph TD
    A[BPAN Registry] --> B[Telemetry]
    B --> C[SOH Prediction]
    A --> D[Warranty]
    C --> E[Marketplace]
    C --> F[Compliance]
    A --> G[Logistics]
    A --> H[Onboarding]
    F --> I[EPR Tokens]
    E --> J[Second-Life]`,
    lastUpdated: "2026-04-01",
    readTimeMinutes: 4,
    icon: "Layers",
  },
  {
    id: "stakeholder-guide",
    title: "Stakeholder Guide",
    category: "platform",
    summary:
      "How different stakeholders — OEMs, recyclers, government bodies, and BESS operators — use the platform for their specific needs.",
    content: `## Stakeholder Guide

Circul-AI-r serves four primary stakeholder groups, each with distinct workflows and value propositions.

### OEMs & Battery Manufacturers

**Primary Goal:** Full lifecycle visibility and compliance reporting

| Workflow | Description |
|---|---|
| Battery Registration | Register each battery with BPAN at point of manufacture |
| Warranty Management | Register warranties with customer contacts at point of sale |
| Telemetry Monitoring | Track fleet health through IoT data ingestion |
| SOH Analytics | Monitor degradation patterns across product lines |
| Compliance Reporting | Generate EPR tokens and carbon footprint declarations |

### Recyclers & Material Recovery

**Primary Goal:** Verified battery history for safe, efficient recycling

| Workflow | Description |
|---|---|
| Battery Verification | Look up BPAN to verify chemistry, capacity, and history |
| SOH Assessment | Check remaining useful life before processing |
| EPR Token Generation | Generate compliance tokens after recycling |
| Material Tracking | Report recovered materials and yields |

### Government & Regulators

**Primary Goal:** Policy enforcement and environmental compliance

| Workflow | Description |
|---|---|
| EPR Compliance Audit | Verify producer obligations are met |
| Fleet Analytics | Monitor battery population by chemistry, region, status |
| Environmental Impact | Track carbon footprints and recycling rates |
| Audit Trail | Access comprehensive audit logs for investigations |

### BESS Operators

**Primary Goal:** Source verified second-life batteries

| Workflow | Description |
|---|---|
| Marketplace Browsing | Find batteries with verified SOH for BESS applications |
| SOH Verification | Check AI-predicted health before purchase |
| Warranty Check | Verify warranty status before acquisition |
| Integration | Use REST API or MCP for automated procurement |`,
    tags: ["stakeholders", "oem", "recycler", "government", "bess"],
    relatedArticles: ["platform-overview", "warranty-system", "marketplace-guide"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 4,
    icon: "Users",
  },

  // ── BATTERY SCIENCE ───────────────────────────────────────────────────────
  {
    id: "battery-chemistries",
    title: "Battery Chemistry Guide",
    category: "battery-science",
    summary:
      "Comprehensive guide to lithium-ion battery chemistries — NMC, LFP, NCA, LCO, and emerging technologies like sodium-ion and solid-state.",
    content: `## Battery Chemistry Guide

Understanding battery chemistry is essential for lifecycle management. Each chemistry has distinct characteristics that affect performance, safety, degradation, and end-of-life handling.

### Chemistry Comparison

| Property | NMC | LFP | NCA | LCO | Na-ion |
|---|---|---|---|---|---|
| Energy Density (Wh/kg) | 150-220 | 90-160 | 200-260 | 150-200 | 100-160 |
| Cycle Life | 1000-2000 | 2000-5000 | 500-1000 | 500-1000 | 1000-3000 |
| Thermal Stability | Moderate | Excellent | Low | Low | Good |
| Cost ($/kWh) | $100-130 | $70-100 | $120-150 | $150-200 | $50-80 |
| Cobalt Content | Yes | No | Yes | Yes | No |
| Operating Temp (°C) | -20 to 60 | -20 to 60 | -20 to 55 | 0 to 45 | -20 to 60 |

### NMC (Nickel Manganese Cobalt)

NMC batteries offer a balanced combination of energy density, power capability, and cycle life. They dominate the EV market, with variants like NMC 811 (80% Ni, 10% Mn, 10% Co) pushing toward higher energy density while reducing cobalt dependence.

**Best for:** Passenger EVs, premium BESS, power tools

### LFP (Lithium Iron Phosphate)

LFP batteries prioritize safety and longevity over energy density. Their excellent thermal stability makes them ideal for applications where safety is paramount. The absence of cobalt reduces cost and supply chain risk.

**Best for:** E-rickshaws, 2-wheelers, stationary storage, budget EVs

### NCA (Nickel Cobalt Aluminum)

NCA offers the highest energy density among commercial chemistries, making it the choice for premium EVs where range is critical. However, it requires sophisticated thermal management.

**Best for:** Long-range EVs, high-performance applications

### Emerging Technologies

**Sodium-Ion:** Uses abundant sodium instead of lithium, dramatically reducing cost. Ideal for grid-scale storage where energy density is less critical.

**Solid-State:** Replaces liquid electrolyte with solid material, theoretically enabling higher energy density and improved safety. Still in early commercialization.

**LMFP:** Adds manganese to LFP for higher voltage and energy density while maintaining safety advantages.`,
    tags: ["chemistry", "nmc", "lfp", "nca", "sodium-ion", "solid-state"],
    relatedArticles: ["bpan-system", "soh-prediction", "battery-degradation"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 5,
    icon: "Atom",
  },
  {
    id: "battery-degradation",
    title: "Battery Degradation Mechanisms",
    category: "battery-science",
    summary:
      "How batteries degrade over time — calendar aging, cycle aging, SEI growth, lithium plating, and the factors that accelerate capacity loss.",
    content: `## Battery Degradation Mechanisms

Battery degradation is the gradual loss of capacity and power capability over time. Understanding degradation mechanisms is critical for accurate SOH prediction and lifecycle management.

### Primary Degradation Modes

| Mode | Cause | Effect | Reversible? |
|---|---|---|---|
| SEI Growth | Electrolyte decomposition at anode | Capacity loss, impedance rise | No |
| Lithium Plating | Fast charging at low temperature | Capacity loss, safety risk | Partially |
| Cathode Degradation | Structural changes in cathode | Power fade, capacity loss | No |
| Electrolyte Decomposition | High temperature exposure | Gas generation, capacity loss | No |
| Current Collector Corrosion | Over-discharge | Internal resistance rise | No |

### Calendar Aging vs. Cycle Aging

**Calendar Aging** occurs simply from the passage of time, even when the battery is not in use. It is accelerated by high temperature and high state of charge. A battery stored at 100% SOC and 45°C will degrade significantly faster than one stored at 50% SOC and 25°C.

**Cycle Aging** is caused by repeated charge-discharge cycles. It is accelerated by high C-rates (fast charging/discharging), deep depth of discharge, and extreme temperatures.

### Factors Affecting Degradation Rate

| Factor | Impact | Mitigation |
|---|---|---|
| Temperature | +10°C doubles degradation rate | Active thermal management |
| SOC Window | Wider window = faster degradation | Limit to 20-80% SOC |
| C-Rate | Higher rates = more stress | Moderate charging speeds |
| Depth of Discharge | Deeper cycles = more wear | Shallow cycling when possible |
| Calendar Time | Continuous degradation | Minimize storage at high SOC |

### Degradation in the Platform

Circul-AI-r tracks degradation through telemetry data:
- **Voltage curves** reveal capacity fade
- **Internal resistance** measurements indicate power fade
- **Cycle count** tracks cumulative wear
- **Temperature history** identifies thermal stress events

The SOH prediction engine uses these signals to estimate current health and predict remaining useful life.`,
    tags: ["degradation", "aging", "sei", "lithium-plating", "cycle-life"],
    relatedArticles: ["battery-chemistries", "soh-prediction", "telemetry-system"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 5,
    icon: "TrendingDown",
  },
  {
    id: "soh-prediction",
    title: "AI-Powered SOH Prediction",
    category: "battery-science",
    summary:
      "How the platform uses machine learning to estimate State of Health and predict Remaining Useful Life from telemetry data.",
    content: `## AI-Powered SOH Prediction

State of Health (SOH) is the single most important metric for battery lifecycle management. It determines whether a battery should continue in service, be remarketed for second-life applications, or be recycled.

### What is SOH?

SOH is expressed as a percentage of the battery's current capacity relative to its rated capacity:

> **SOH (%) = (Current Capacity / Rated Capacity) × 100**

A new battery starts at 100% SOH. As it degrades, SOH decreases. Industry convention considers a battery at end-of-first-life when SOH drops below 80%.

### Prediction Model

The platform's SOH prediction engine analyzes multiple telemetry signals:

| Input Feature | What It Reveals |
|---|---|
| Voltage patterns | Capacity fade, cell imbalance |
| Current profiles | Usage patterns, stress levels |
| Temperature history | Thermal degradation exposure |
| Cycle count | Cumulative mechanical stress |
| Internal resistance | Power capability degradation |
| Charge/discharge curves | Electrochemical health |

### Triage Recommendations

Based on predicted SOH, the engine generates lifecycle recommendations:

| SOH Range | Recommendation | Action |
|---|---|---|
| 80-100% | Continue Operation | Normal monitoring |
| 60-79% | Enhanced Monitoring | Increase telemetry frequency |
| 40-59% | Second-Life Candidate | List on marketplace |
| 20-39% | Recycling Recommended | Initiate EPR process |
| 0-19% | Urgent Recycling | Priority disposal |

### Confidence Intervals

Every prediction includes a confidence interval (low and high bounds) that reflects the model's certainty. Wider intervals indicate less certainty, typically due to limited telemetry data or unusual degradation patterns.

### RUL Prediction

Remaining Useful Life (RUL) estimates how many more charge-discharge cycles the battery can sustain before reaching the end-of-life threshold. This is critical for:
- **OEMs** planning warranty reserves
- **BESS operators** evaluating second-life battery value
- **Recyclers** scheduling collection logistics`,
    tags: ["soh", "prediction", "machine-learning", "rul", "triage"],
    relatedArticles: ["battery-degradation", "telemetry-system", "marketplace-guide"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 5,
    icon: "Brain",
  },
  {
    id: "telemetry-system",
    title: "Real-Time Telemetry System",
    category: "battery-science",
    summary:
      "How the platform ingests, processes, and stores real-time battery telemetry data from IoT devices via MQTT and HTTP.",
    content: `## Real-Time Telemetry System

The telemetry system is the data backbone of the platform, collecting real-time operational data from batteries in the field.

### Data Points Collected

| Parameter | Unit | Typical Range | Update Frequency |
|---|---|---|---|
| Voltage | V | 2.5-4.2 (per cell) | Every 30s |
| Current | A | -100 to +100 | Every 30s |
| Temperature | °C | -20 to 60 | Every 60s |
| State of Charge | % | 0-100 | Every 60s |
| Cycle Count | — | 0-10,000+ | On change |
| Internal Resistance | Ω | 0.01-1.0 | Every 300s |

### Ingestion Methods

**MQTT (Preferred for IoT)**

MQTT is the recommended protocol for BMS and IoT gateway integration. The platform subscribes to a configurable topic prefix:

\`\`\`
Topic: {MQTT_TOPIC_PREFIX}/telemetry/{bpan}
QoS: 1 (at least once)
Payload: JSON
\`\`\`

**HTTP (REST API)**

For systems that cannot use MQTT, the platform accepts telemetry via HTTP POST:

\`\`\`
POST /api/v1/batteries/{bpan}/telemetry
Content-Type: application/json
\`\`\`

### Alert System

The platform generates alerts when telemetry values exceed safe thresholds:

| Alert Type | Trigger | Severity |
|---|---|---|
| Over-temperature | Temperature > 55°C | Critical |
| Under-voltage | Voltage < 2.5V per cell | High |
| Over-current | Current exceeds rated max | High |
| Rapid SOC drop | SOC drops > 20% in 5 minutes | Medium |
| Cycle anomaly | Unusual charge/discharge pattern | Low |

### Data Retention

Telemetry data is stored in the platform database with the following retention:
- **Raw data** — 90 days at full resolution
- **Aggregated data** — Hourly averages retained indefinitely
- **Alerts** — Retained indefinitely for compliance audit trail`,
    tags: ["telemetry", "mqtt", "iot", "monitoring", "alerts"],
    relatedArticles: ["soh-prediction", "battery-degradation", "mqtt-integration"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 4,
    icon: "Activity",
  },

  // ── COMPLIANCE ────────────────────────────────────────────────────────────
  {
    id: "iso27001-compliance",
    title: "ISO 27001 Compliance",
    category: "compliance",
    summary:
      "How the platform implements ISO 27001:2022 information security controls — audit logging, access control, data classification, and encryption.",
    content: `## ISO 27001:2022 Compliance

ISO 27001 is the international standard for Information Security Management Systems (ISMS). Circul-AI-r implements controls from Annex A to protect battery data, customer information, and operational integrity.

### Key Controls Implemented

| Control | Title | Implementation |
|---|---|---|
| A.5.1 | Information security policies | Role-based access (admin/user) |
| A.5.15 | Access control | Protected procedures, API key scoping |
| A.8.2 | Information classification | 4-tier data classification system |
| A.8.15 | Logging | Comprehensive audit trail |
| A.8.16 | Monitoring | Real-time security event monitoring |
| A.8.24 | Cryptography | JWT signing, TLS, HMAC-SHA256 |

### Data Classification

| Tier | Description | Examples |
|---|---|---|
| **Public** | Freely accessible | Platform docs, warranty check |
| **Internal** | General business data | Battery stats, marketplace |
| **Confidential** | Sensitive data | Customer contacts, telemetry |
| **Restricted** | Highly sensitive | API keys, audit logs, credentials |

### Audit Trail

Every platform operation generates an audit log entry with:
- **Trace ID** — Unique correlation ID (format: \`cai-{uuid}\`)
- **Actor** — User, agent, system, or API key
- **Action** — Operation identifier
- **Data Classification** — Classification tier of accessed data
- **Duration** — Operation execution time
- **Status** — Success, error, or denied`,
    tags: ["iso27001", "security", "audit", "compliance", "encryption"],
    relatedArticles: ["soc2-compliance", "audit-logging", "data-classification"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 4,
    icon: "ShieldCheck",
  },
  {
    id: "soc2-compliance",
    title: "SOC 2 Type II Compliance",
    category: "compliance",
    summary:
      "How the platform meets SOC 2 Trust Services Criteria for security, availability, processing integrity, confidentiality, and privacy.",
    content: `## SOC 2 Type II Compliance

SOC 2 Type II evaluates an organization's controls over an extended period (typically 6-12 months) against the Trust Services Criteria.

### Trust Services Criteria Mapping

| Criteria | Title | Implementation |
|---|---|---|
| CC6.1 | Logical Access | OAuth, API keys, role-based procedures |
| CC6.2 | Credential Management | API key lifecycle (create, rotate, revoke) |
| CC6.3 | Registration | Manus OAuth with verified identity |
| CC7.1 | System Monitoring | Structured logging, security events |
| CC7.2 | Anomaly Detection | Thermal anomaly detection, rate limiting |
| CC7.3 | Incident Response | Security event classification and alerting |
| CC8.1 | Change Management | Configuration change logging |

### Continuous Monitoring

The platform provides continuous evidence generation through:
1. **Audit logs** — Every operation is logged with actor, action, and timestamp
2. **Security events** — Classified by severity (low/medium/high/critical)
3. **Access logs** — API key usage tracking with rate limit enforcement
4. **Configuration changes** — Before/after values recorded for all config changes

### Audit Preparation

For SOC 2 audits, the platform provides:
- Audit log export (CSV) for the review period
- Security event summary by severity and type
- API key lifecycle documentation
- Access control evidence through role-based procedures`,
    tags: ["soc2", "trust-services", "audit", "monitoring", "compliance"],
    relatedArticles: ["iso27001-compliance", "audit-logging", "security-events"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 4,
    icon: "Award",
  },
  {
    id: "epr-compliance",
    title: "Extended Producer Responsibility (EPR)",
    category: "compliance",
    summary:
      "How the platform supports EPR compliance — tracking producer obligations, generating recycling tokens, and reporting to regulatory bodies.",
    content: `## Extended Producer Responsibility (EPR)

EPR is a policy approach that holds battery producers financially and operationally responsible for the end-of-life management of their products.

### India Battery Waste Management Rules (2022)

India's BWMR requires battery producers to:
1. **Register** with the Central Pollution Control Board (CPCB)
2. **Collect** a percentage of batteries sold for recycling
3. **Recycle** through authorized facilities
4. **Report** annually on collection and recycling rates

### How Circul-AI-r Supports EPR

| Requirement | Platform Feature |
|---|---|
| Producer Registration | BPAN links every battery to its manufacturer |
| Collection Tracking | Logistics module tracks battery collection |
| Recycling Verification | EPR tokens generated after recycling |
| CPCB Reporting | Data export compatible with CPCB format |

### EPR Token System

EPR tokens are digital certificates that prove recycling obligations have been met:

1. Battery reaches end-of-life (SOH < 20%)
2. Recycler processes the battery at an authorized facility
3. Recycler reports recovered materials and weight
4. Platform generates a verifiable EPR token
5. Token is linked to the battery's BPAN for traceability

### EU Battery Regulation (2023/1542)

The platform's BPAN system aligns with the EU Battery Regulation requirements for:
- **Digital Battery Passport** — Unique identifier with lifecycle data
- **Carbon Footprint Declaration** — GHG Protocol compliant
- **Due Diligence** — Supply chain traceability
- **End-of-Life Management** — Second-life and recycling tracking`,
    tags: ["epr", "recycling", "bwmr", "eu-battery-regulation", "compliance"],
    relatedArticles: ["carbon-footprint", "iso27001-compliance", "platform-overview"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 4,
    icon: "Recycle",
  },
  {
    id: "carbon-footprint",
    title: "Carbon Footprint Declaration",
    category: "compliance",
    summary:
      "How the platform calculates and reports battery carbon footprints aligned with GHG Protocol and ISO 14067.",
    content: `## Carbon Footprint Declaration

The carbon footprint module calculates the lifecycle greenhouse gas emissions of each battery, supporting regulatory compliance and sustainability reporting.

### Methodology

The platform supports three calculation methodologies:

| Methodology | Standard | Scope |
|---|---|---|
| GHG Protocol | Corporate Standard | Scope 1, 2, 3 emissions |
| ISO 14067 | Product Carbon Footprint | Cradle-to-gate |
| PEF | EU Product Environmental Footprint | Full lifecycle |

### Emission Categories

| Category | Description | Typical Share |
|---|---|---|
| Raw Materials | Mining, refining cathode/anode materials | 40-60% |
| Cell Manufacturing | Energy for cell assembly, formation | 15-25% |
| Pack Assembly | Module and pack integration | 5-10% |
| Transportation | Logistics from factory to deployment | 5-10% |
| Use Phase | Electricity for charging (grid mix dependent) | 10-30% |
| End of Life | Recycling or disposal | 2-5% |

### Performance Classes

| Class | CO₂ (kg/kWh) | Rating |
|---|---|---|
| A | < 50 | Excellent |
| B | 50-75 | Good |
| C | 75-100 | Average |
| D | > 100 | Below Average |

### Integration with BPAN

Every battery's carbon footprint is linked to its BPAN and accessible through:
- Battery passport detail page
- REST API endpoint
- MCP tool for AI agent queries`,
    tags: ["carbon", "ghg", "iso14067", "sustainability", "emissions"],
    relatedArticles: ["epr-compliance", "bpan-system", "platform-overview"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 3,
    icon: "Leaf",
  },

  // ── INTEGRATION ───────────────────────────────────────────────────────────
  {
    id: "rest-api",
    title: "REST API Guide",
    category: "integration",
    summary:
      "Complete guide to the REST API at /api/v1 — authentication, endpoints, rate limiting, and code examples.",
    content: `## REST API Guide

The REST API at \`/api/v1\` provides microservices-compatible access to all platform features. It is designed for external integrations that prefer traditional REST over tRPC.

### Authentication

All API requests require a Bearer token:

\`\`\`
Authorization: Bearer cai_your_api_key_here
\`\`\`

API keys are managed through the platform admin panel or the tRPC \`apiKey.create\` procedure.

### Base URL

\`\`\`
https://your-domain.com/api/v1
\`\`\`

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /batteries | List batteries with filters |
| GET | /batteries/:bpan | Get battery details |
| GET | /batteries/:bpan/telemetry | Get latest telemetry |
| GET | /batteries/:bpan/soh | Get SOH prediction |
| GET | /batteries/:bpan/warranty | Get warranty status |
| GET | /warranty/lookup | Multi-channel warranty lookup |
| GET | /warranty/stats | Warranty statistics |
| GET | /marketplace | Browse marketplace listings |
| GET | /marketplace/stats | Marketplace statistics |
| GET | /compliance/epr | List EPR tokens |
| GET | /compliance/epr/stats | EPR statistics |
| GET | /stats/batteries | Fleet statistics |

### Rate Limiting

| Tier | Requests/Minute | Use Case |
|---|---|---|
| Free | 10 | Development and testing |
| Standard | 100 | Production applications |
| Premium | 500 | High-volume integrations |
| Enterprise | 2000 | Mission-critical systems |

### Response Format

All responses follow a consistent JSON structure:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": {
    "traceId": "cai-abc123",
    "timestamp": "2026-04-01T12:00:00Z"
  }
}
\`\`\`

### Error Handling

\`\`\`json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Battery not found"
  }
}
\`\`\`

### Interactive Documentation

Visit \`/api/docs\` for the Swagger UI with interactive endpoint testing.`,
    tags: ["api", "rest", "microservices", "authentication", "endpoints"],
    relatedArticles: ["mcp-integration", "api-keys", "mqtt-integration"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 5,
    icon: "Code",
  },
  {
    id: "mcp-integration",
    title: "MCP Server Integration",
    category: "integration",
    summary:
      "How to connect AI agents to the platform using the Model Context Protocol — tools, resources, prompts, and configuration.",
    content: `## MCP Server Integration

The MCP (Model Context Protocol) server at \`/api/mcp\` enables AI agents to discover and invoke platform capabilities through a standardized interface.

### What is MCP?

MCP is an open standard that provides a universal contract for AI agent interaction. Instead of writing custom API integrations for each AI system, MCP provides three primitives:

| Primitive | Count | Description |
|---|---|---|
| **Tools** | 20 | Executable functions (get battery, check warranty, etc.) |
| **Resources** | 5 | Bulk data access (battery registry, warranties, etc.) |
| **Prompts** | 4 | Pre-built context packages for report generation |

### Quick Start

\`\`\`bash
# Discover tools
curl -X POST /api/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Call a tool
curl -X POST /api/mcp -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_battery","arguments":{"bpan":"IN-TAT-LFP-A3-X7K9M2P4"}}}'
\`\`\`

### Available Tools

| Category | Tools |
|---|---|
| Battery Registry | get_battery, list_batteries, get_battery_stats |
| Telemetry | get_telemetry, get_telemetry_history |
| SOH | get_soh_prediction |
| Warranty | check_warranty, lookup_warranty, get_warranty_stats |
| Marketplace | list_marketplace, get_marketplace_stats |
| Compliance | get_epr_stats, list_epr_tokens |
| Analytics | get_platform_kpis, get_audit_stats, get_security_stats |
| Agent | log_agent_action, get_agent_activity |

### Configuring Claude Desktop

\`\`\`json
{
  "mcpServers": {
    "circulair": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-client-http"],
      "env": { "MCP_SERVER_URL": "https://your-domain.com/api/mcp" }
    }
  }
}
\`\`\``,
    tags: ["mcp", "ai-agent", "protocol", "tools", "claude"],
    relatedArticles: ["rest-api", "agent-system", "platform-overview"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 5,
    icon: "Bot",
  },
  {
    id: "mqtt-integration",
    title: "MQTT IoT Integration",
    category: "integration",
    summary:
      "How to connect BMS and IoT gateways to the platform via MQTT for real-time telemetry ingestion.",
    content: `## MQTT IoT Integration

MQTT is the recommended protocol for connecting Battery Management Systems (BMS) and IoT gateways to the platform for real-time telemetry ingestion.

### Connection Configuration

| Setting | Value |
|---|---|
| Protocol | MQTT 3.1.1 / 5.0 |
| Transport | TLS (mqtts://) recommended |
| QoS | 1 (at least once delivery) |
| Topic Format | \`{prefix}/telemetry/{bpan}\` |

### Payload Format

\`\`\`json
{
  "bpan": "IN-TAT-LFP-A3-X7K9M2P4",
  "voltage": 3.28,
  "current": 12.5,
  "temperature": 32.1,
  "soc": 78,
  "cycleCount": 450,
  "internalResistance": 0.045
}
\`\`\`

### Security

- Always use TLS (mqtts://) in production
- Authenticate with username/password credentials
- Use unique client IDs per device
- Implement last-will messages for disconnect detection

### Monitoring

The platform provides MQTT connection status in the Super Admin panel:
- Connection state (connected/disconnected)
- Messages received count
- Last message timestamp
- Subscription status`,
    tags: ["mqtt", "iot", "bms", "telemetry", "real-time"],
    relatedArticles: ["telemetry-system", "rest-api", "architecture-overview"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 3,
    icon: "Wifi",
  },
  {
    id: "api-keys",
    title: "API Key Management",
    category: "integration",
    summary:
      "How to create, manage, and secure API keys for REST API access — scoping, rate limits, rotation, and revocation.",
    content: `## API Key Management

API keys provide programmatic access to the REST API for microservices and external integrations.

### Key Format

\`\`\`
cai_{32-character-random-string}
Example: cai_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
\`\`\`

Keys are generated using cryptographically secure random bytes and stored as SHA-256 hashes in the database.

### Key Lifecycle

| State | Description |
|---|---|
| **Active** | Valid and accepting requests |
| **Expired** | Past expiration date, automatically rejected |
| **Revoked** | Manually invalidated, permanently disabled |

### Scoping

API keys can be scoped to specific modules:

| Scope | Access |
|---|---|
| batteries:read | Read battery data |
| telemetry:read | Read telemetry data |
| warranty:read | Read warranty data |
| marketplace:read | Read marketplace data |
| compliance:read | Read compliance data |
| all:read | Read all data |

### Best Practices

1. **Rotate keys regularly** — Create new keys and revoke old ones periodically
2. **Use minimum scopes** — Only grant access to required modules
3. **Set expiration dates** — Avoid indefinite keys
4. **Monitor usage** — Track request counts and error rates per key
5. **Revoke immediately** — If a key is compromised, revoke it instantly`,
    tags: ["api-keys", "authentication", "security", "rate-limiting"],
    relatedArticles: ["rest-api", "iso27001-compliance", "soc2-compliance"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 3,
    icon: "Key",
  },

  // ── ARCHITECTURE ──────────────────────────────────────────────────────────
  {
    id: "architecture-overview",
    title: "System Architecture",
    category: "architecture",
    summary:
      "High-level architecture of the Circul-AI-r platform — client layer, server layer, API protocols, data access, and infrastructure.",
    content: `## System Architecture

Circul-AI-r follows a **modular monolith** architecture that provides the organizational benefits of microservices while maintaining the operational simplicity of a single deployment unit.

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui |
| API (Internal) | tRPC 11 with Superjson |
| API (External) | Express REST with OpenAPI 3.1 |
| API (AI Agents) | MCP JSON-RPC 2.0 |
| Server | Express 4, Node.js 22 |
| Database | MySQL (TiDB) with Drizzle ORM |
| Storage | S3-compatible object storage |
| Real-time | Socket.io, MQTT |
| Auth | Manus OAuth with JWT sessions |

### Three API Protocols

The platform exposes three API protocols, all backed by the same business logic:

| Protocol | Path | Use Case | Auth |
|---|---|---|---|
| tRPC | /api/trpc | Internal web app | OAuth session |
| REST | /api/v1 | External microservices | API key |
| MCP | /api/mcp | AI agents | None (public) |

### Module Boundaries

Each module owns its data access layer and business logic. Modules communicate through shared database access rather than inter-service calls:

| Module | Data Layer | Tables |
|---|---|---|
| BPAN | db.ts | batteries, telemetry_data, soh_predictions |
| Warranty | db-warranty.ts | warranty_records |
| Compliance | compliance.ts | audit_logs, epr_tokens |
| Agent | db-agent.ts | agent_actions |

### Database Schema

The platform uses 16 tables organized by module, with Drizzle ORM providing type-safe database access and migration management.`,
    tags: ["architecture", "tech-stack", "modular-monolith", "database"],
    relatedArticles: ["platform-modules", "security-architecture", "data-model"],
    diagram: `graph TB
    subgraph Client
        A[React 19 SPA]
        B[tRPC Client]
        C[Socket.io]
    end
    subgraph Server
        D[Express 4]
        E[tRPC Router]
        F[REST Gateway]
        G[MCP Server]
    end
    subgraph Data
        H[(MySQL/TiDB)]
        I[(S3 Storage)]
        J[MQTT Broker]
    end
    A --> B --> E --> H
    A --> C --> D
    F --> H
    G --> H
    D --> I
    J --> D`,
    lastUpdated: "2026-04-01",
    readTimeMinutes: 4,
    icon: "Server",
  },
  {
    id: "security-architecture",
    title: "Security Architecture",
    category: "architecture",
    summary:
      "Defense-in-depth security model — transport encryption, security headers, rate limiting, input validation, authentication, and audit logging.",
    content: `## Security Architecture

Circul-AI-r implements a defense-in-depth security model with multiple layers of protection.

### Defense Layers

| Layer | Implementation | Purpose |
|---|---|---|
| Transport | TLS (HTTPS) | Encrypt data in transit |
| Headers | Helmet.js | CSP, HSTS, X-Frame-Options |
| Rate Limiting | express-rate-limit | Prevent abuse and DDoS |
| Input Validation | Zod schemas | Prevent injection attacks |
| Authentication | JWT + API keys | Verify identity |
| Authorization | Role-based + scope-based | Enforce access control |
| Audit | Comprehensive logging | Detect and investigate |
| Monitoring | Security events | Real-time alerting |

### Authentication Flows

**Web Application (OAuth):**
\`\`\`
User → Login → Manus OAuth → Callback → JWT Cookie → Protected Procedures
\`\`\`

**REST API (API Key):**
\`\`\`
Client → Bearer Token → Gateway → Key Validation → Scope Check → Handler
\`\`\`

### Security Event Classification

| Severity | Examples | Response |
|---|---|---|
| Low | Successful login, profile update | Log only |
| Medium | Failed login, API key created | Log + monitor |
| High | Multiple failures, unauthorized access | Log + alert |
| Critical | Breach attempt, mass data export | Log + alert + block |`,
    tags: ["security", "authentication", "authorization", "encryption"],
    relatedArticles: ["iso27001-compliance", "soc2-compliance", "api-keys"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 3,
    icon: "Lock",
  },
  {
    id: "data-model",
    title: "Data Model Reference",
    category: "architecture",
    summary:
      "Complete database schema reference — all 16 tables with column definitions, relationships, and indexing strategy.",
    content: `## Data Model Reference

The platform uses 16 tables in a MySQL (TiDB) database, managed through Drizzle ORM.

### Table Overview

| Table | Module | Purpose | Key Columns |
|---|---|---|---|
| users | Auth | Platform users | id, openId, name, email, role |
| batteries | BPAN | Battery registry | id, bpan, manufacturer, chemistry, status |
| telemetry_data | Telemetry | IoT readings | id, bpan, voltage, current, temperature, soc |
| soh_predictions | SOH | AI predictions | id, bpan, predictedSoh, rulCycles |
| warranty_records | Warranty | Warranty data | id, bpan, customerPhone, customerEmail, status |
| marketplace_listings | Marketplace | Listings | id, batteryId, listingType, priceInr |
| audit_logs | Compliance | Audit trail | id, traceId, actorType, action, module |
| epr_tokens | Compliance | EPR certificates | id, batteryId, recyclerName, status |
| carbon_footprints | Compliance | Carbon data | id, batteryId, totalCo2Kg, performanceClass |
| agent_actions | Agent | Agent tracking | id, actorType, action, module, status |
| api_keys | Admin | API keys | id, name, keyHash, scopes, rateLimitTier |
| shipments | Logistics | Shipments | id, batteryId, fromLocation, toLocation |
| alerts | Telemetry | Alert system | id, bpan, alertType, severity |
| bulk_onboarding_jobs | Onboarding | Batch imports | id, totalBatteries, successCount |
| webhook_subscriptions | Integration | Webhooks | id, url, events, status |
| sessions | Auth | User sessions | id, userId, token, expiresAt |

### Relationships

\`\`\`
users (1) ──→ (N) batteries
batteries (1) ──→ (N) telemetry_data
batteries (1) ──→ (N) soh_predictions
batteries (1) ──→ (1) warranty_records
batteries (1) ──→ (N) marketplace_listings
batteries (1) ──→ (N) epr_tokens
batteries (1) ──→ (N) carbon_footprints
batteries (1) ──→ (N) shipments
batteries (1) ──→ (N) alerts
\`\`\``,
    tags: ["database", "schema", "tables", "drizzle", "mysql"],
    relatedArticles: ["architecture-overview", "bpan-system", "platform-modules"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 4,
    icon: "Database",
  },

  // ── OPERATIONS ────────────────────────────────────────────────────────────
  {
    id: "warranty-system",
    title: "Warranty Management System",
    category: "operations",
    summary:
      "Complete guide to warranty registration, multi-channel lookup, claim workflow, and warranty impact on platform operations.",
    content: `## Warranty Management System

The warranty system provides end-to-end warranty lifecycle management with multi-channel customer verification.

### Why Warranty Matters

In the Indian battery market, warranty verification is a high-volume operation. Battery providers receive inquiries through phone calls, WhatsApp messages, and emails daily. The platform eliminates manual lookup by enabling instant verification through any contact channel.

### Warranty Types

| Type | Description | Typical Term |
|---|---|---|
| Standard | Basic manufacturer warranty | 12-24 months |
| Extended | Paid extended coverage | 24-48 months |
| Premium | Comprehensive all-risk | 36-60 months |

### Multi-Channel Lookup

Customers and service providers can verify warranty using five channels:

| Channel | Example | Use Case |
|---|---|---|
| BPAN | IN-TAT-LFP-A3-X7K9M2P4 | Technical lookup |
| Serial Number | TAT-2024-001 | Label-based lookup |
| Phone | +919876543210 | Customer call-in |
| Email | customer@example.com | Email inquiry |
| WhatsApp | +919876543210 | WhatsApp message |

### Warranty Status Engine

| Status | Description | In Warranty? |
|---|---|---|
| Active | Within warranty period | Yes |
| Expired | Past end date | No |
| Voided | Invalidated (tampering, etc.) | No |
| Claimed | Claim processed | No |
| Pending Activation | Start date in future | No |

### Platform Impact

Warranty status affects other modules:
- **Marketplace:** In-warranty batteries receive a warning when listed
- **Battery Detail:** Warranty status shown on passport page
- **Compliance:** Warranty claims count toward EPR tracking`,
    tags: ["warranty", "multi-channel", "lookup", "claims", "customer"],
    relatedArticles: ["battery-registration", "marketplace-guide", "stakeholder-guide"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 4,
    icon: "BadgeCheck",
  },
  {
    id: "marketplace-guide",
    title: "Second-Life Marketplace",
    category: "operations",
    summary:
      "How the marketplace connects battery owners with buyers for second-life applications — listing, warranty gates, and SOH verification.",
    content: `## Second-Life Marketplace

The marketplace module connects battery owners with buyers seeking verified second-life batteries for BESS, backup power, and other applications.

### Listing Types

| Type | Description | Typical SOH |
|---|---|---|
| Second Life | Batteries suitable for less demanding applications | 40-79% |
| Refurbished | Batteries that have been reconditioned | 60-90% |
| Recycling | Batteries at end of useful life | < 40% |

### Creating a Listing

1. Enter the battery's BPAN
2. System auto-fills battery details and current SOH
3. Select listing type
4. Set asking price (INR)
5. Add description

### Warranty Gate

The marketplace enforces a warranty check on all listings:
- **In-warranty batteries** receive a prominent warning
- The rationale: customers with active warranties should use the warranty claim process
- Listings are not blocked but clearly flagged

### SOH Verification

Every marketplace listing includes the AI-predicted SOH:
- Predicted SOH percentage
- Confidence interval
- Triage recommendation
- Last telemetry timestamp

This gives buyers confidence in the battery's actual condition, unlike traditional second-hand markets where battery health is unknown.`,
    tags: ["marketplace", "second-life", "bess", "listing", "soh"],
    relatedArticles: ["soh-prediction", "warranty-system", "stakeholder-guide"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 3,
    icon: "Store",
  },
  {
    id: "battery-registration",
    title: "Battery Registration Guide",
    category: "operations",
    summary:
      "Step-by-step guide to registering batteries — single registration, bulk onboarding, and auto-BPAN generation.",
    content: `## Battery Registration Guide

Battery registration is the first step in the lifecycle management process. Every battery must be registered to receive a BPAN.

### Single Registration

1. Navigate to **BPAN Registry** > **Register New Battery**
2. Fill in required fields:
   - Manufacturer name
   - Chemistry type
   - Capacity (kWh)
   - Nominal voltage (V)
   - Application type
   - Country of origin
3. Click **Generate BPAN**

### Bulk Onboarding

For organizations with existing battery fleets:

**Manual Entry:**
- Register one battery at a time with optional warranty auto-registration

**CSV Import:**
Prepare a CSV with columns:
\`\`\`csv
manufacturer,chemistry,capacityKwh,nominalVoltage,application,countryOfOrigin,serialNumber
\`\`\`

Upload the file and the system will:
1. Validate each row
2. Generate BPANs automatically
3. Optionally create warranty records
4. Report success/failure for each battery

### Auto-BPAN Generation

The system parses manufacturer, chemistry, and capacity to automatically generate compliant BPANs. Serial numbers from the original manufacturer are preserved as additional identifiers for cross-referencing.`,
    tags: ["registration", "onboarding", "csv-import", "bpan-generation"],
    relatedArticles: ["bpan-system", "warranty-system", "bulk-onboarding"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 3,
    icon: "PlusCircle",
  },
  {
    id: "agent-system",
    title: "Agentic Operations",
    category: "operations",
    summary:
      "How AI agents interact with the platform — action logging, batch execution, capability discovery, and the Super Admin monitoring panel.",
    content: `## Agentic Operations

The platform is designed to be fully agentic — every operation can be triggered and tracked by AI agents.

### Agent Action Logging

Every agent operation is logged with:

| Field | Description |
|---|---|
| Actor Type | user, agent, system, api_key |
| Action | Operation identifier |
| Module | Platform module |
| Description | Human-readable description |
| Input/Output | Sanitized parameters and results |
| Status | success, error, pending |
| Duration | Execution time in milliseconds |

### Available Agent Endpoints

| Endpoint | Description |
|---|---|
| agent.logAction | Log an agent action |
| agent.execute | Execute a platform operation |
| agent.batchExecute | Execute multiple operations |
| agent.listActions | List action history |
| agent.stats | Action statistics |
| agent.recentActivity | Live activity feed |
| agent.systemHealth | System health check |
| agent.capabilities | List all capabilities |

### Super Admin Panel

The Super Admin panel at \`/admin/system\` provides:
- **System Overview** — Server health, memory, MQTT status
- **Agent Actions** — Filterable action log
- **Live Activity** — Real-time operation feed

### Batch Execution

Agents can execute multiple operations in a single call:
\`\`\`json
{
  "actions": [
    { "type": "check_warranty", "params": { "bpan": "..." } },
    { "type": "get_soh", "params": { "bpan": "..." } },
    { "type": "list_marketplace", "params": {} }
  ]
}
\`\`\``,
    tags: ["agent", "agentic", "automation", "batch", "super-admin"],
    relatedArticles: ["mcp-integration", "rest-api", "architecture-overview"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 4,
    icon: "Cpu",
  },
  {
    id: "audit-logging",
    title: "Audit Logging System",
    category: "operations",
    summary:
      "How the platform's audit logging system works — trace IDs, actor tracking, data classification, and SIEM integration.",
    content: `## Audit Logging System

The audit logging system provides comprehensive traceability for all platform operations, supporting ISO 27001 and SOC 2 compliance requirements.

### Audit Log Entry Structure

| Field | Type | Description |
|---|---|---|
| traceId | string | Unique correlation ID (cai-{uuid}) |
| actorType | enum | user, agent, system, api_key |
| actorId | string | Identifier of the actor |
| action | string | Operation identifier |
| module | enum | Platform module |
| dataClassification | enum | public, internal, confidential, restricted |
| ipAddress | string | Client IP address |
| inputSummary | JSON | Sanitized input (PII redacted) |
| outputSummary | JSON | Operation result |
| status | enum | success, error, denied |
| durationMs | integer | Execution time |

### Trace ID Propagation

Every request receives a unique trace ID (format: \`cai-{uuid}\`) that propagates through all operations triggered by that request. This enables end-to-end request tracing across modules.

### Data Classification Tags

Every audit entry is tagged with a data classification tier:
- **Public** — No sensitive data accessed
- **Internal** — General business data
- **Confidential** — Customer PII, telemetry
- **Restricted** — Credentials, security events

### SIEM Integration

Audit logs are available in SIEM-ready JSON format through:
1. tRPC procedure: \`compliance.auditLogs\`
2. REST endpoint: \`/api/v1/compliance/audit-logs\`
3. CSV export from the Super Admin panel`,
    tags: ["audit", "logging", "trace-id", "siem", "compliance"],
    relatedArticles: ["iso27001-compliance", "soc2-compliance", "security-architecture"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 3,
    icon: "FileText",
  },
  {
    id: "bulk-onboarding",
    title: "Bulk Battery Onboarding",
    category: "operations",
    summary:
      "How to migrate existing battery fleets to the platform — CSV import format, auto-BPAN generation, and batch warranty registration.",
    content: `## Bulk Battery Onboarding

The bulk onboarding module enables organizations to migrate existing battery fleets to the platform efficiently.

### CSV Import Format

\`\`\`csv
manufacturer,chemistry,capacityKwh,nominalVoltage,application,countryOfOrigin,serialNumber
Tata AutoComp,LFP,3.5,3.2,ev_2w,IN,TAT-2024-001
Exide Industries,NMC,5.0,3.7,bess,IN,EXD-2024-002
Amara Raja,LFP,2.8,3.2,ev_3w,IN,AMR-2024-003
\`\`\`

### Required Fields

| Field | Type | Description |
|---|---|---|
| manufacturer | string | Company name |
| chemistry | string | NMC, LFP, NCA, etc. |
| capacityKwh | number | Rated capacity |
| nominalVoltage | number | Rated voltage |
| application | string | ev_2w, bess, etc. |
| countryOfOrigin | string | ISO country code |

### Optional Fields

| Field | Type | Description |
|---|---|---|
| serialNumber | string | Manufacturer serial |
| modelNumber | string | Model identifier |

### Auto-BPAN Generation

For each row in the CSV:
1. System validates all fields
2. Generates a unique BPAN from manufacturer, chemistry, and capacity
3. Preserves the original serial number as an additional identifier
4. Creates the battery record in the registry

### Batch Warranty Registration

When enabled, the import process also creates warranty records:
- Warranty type and terms are specified once for the entire batch
- Customer details can be provided per-battery or batch-wide
- Warranty start date defaults to the import date

### Job Tracking

Each bulk import creates a job record with:
- Total batteries in the batch
- Success and failure counts
- Error log for failed rows
- Job status (processing, completed, failed)`,
    tags: ["bulk", "onboarding", "csv", "import", "migration"],
    relatedArticles: ["battery-registration", "bpan-system", "warranty-system"],
    lastUpdated: "2026-04-01",
    readTimeMinutes: 3,
    icon: "Upload",
  },
];

// ─── SEARCH FUNCTION ─────────────────────────────────────────────────────────

export function searchWiki(query: string): WikiArticle[] {
  if (!query.trim()) return [];
  const terms = query.toLowerCase().split(/\s+/);
  return WIKI_ARTICLES.filter((article) => {
    const searchText = `${article.title} ${article.summary} ${article.content} ${article.tags.join(" ")}`.toLowerCase();
    return terms.every((term) => searchText.includes(term));
  }).sort((a, b) => {
    // Prioritize title matches
    const aTitle = terms.some((t) => a.title.toLowerCase().includes(t)) ? 1 : 0;
    const bTitle = terms.some((t) => b.title.toLowerCase().includes(t)) ? 1 : 0;
    return bTitle - aTitle;
  });
}

// ─── GET RELATED ARTICLES ────────────────────────────────────────────────────

export function getRelatedArticles(articleId: string): WikiArticle[] {
  const article = WIKI_ARTICLES.find((a) => a.id === articleId);
  if (!article) return [];
  return article.relatedArticles
    .map((id) => WIKI_ARTICLES.find((a) => a.id === id))
    .filter(Boolean) as WikiArticle[];
}

// ─── GET ARTICLES BY CATEGORY ────────────────────────────────────────────────

export function getArticlesByCategory(category: WikiCategory): WikiArticle[] {
  return WIKI_ARTICLES.filter((a) => a.category === category);
}

// ─── AI CHAT SYSTEM PROMPT ───────────────────────────────────────────────────

export function getWikiSystemPrompt(): string {
  const articleSummaries = WIKI_ARTICLES.map(
    (a) => `- **${a.title}** (${a.category}): ${a.summary}`
  ).join("\n");

  return `You are CirculWiki AI, the intelligent assistant for the Circul-AI-r Battery Intelligence Platform. You have deep knowledge of:

1. The Circul-AI-r platform — all modules, features, and workflows
2. Battery science — chemistries, degradation, SOH prediction, lifecycle management
3. Regulatory compliance — ISO 27001, SOC 2, EPR, BWMR, EU Battery Regulation
4. Integration — REST API, MCP server, MQTT, webhooks
5. Architecture — system design, data model, security

Available knowledge base articles:
${articleSummaries}

When answering questions:
- Be specific and reference platform features by name
- Use tables for comparisons
- Provide code examples for API/integration questions
- Reference relevant articles for further reading
- If unsure, say so and suggest where to find the answer
- Keep responses concise but comprehensive`;
}
