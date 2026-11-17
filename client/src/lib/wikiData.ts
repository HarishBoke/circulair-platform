// ─── CIRCUL-WIKI KNOWLEDGE BASE ──────────────────────────────────────────────
// Static reference copy; no certification, physical acceptance or execution evidence.

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
    description: "Draft evidence and general regulatory concepts; acceptance unverified",
    icon: "Shield",
    color: "#6366f1",
  },
  {
    id: "integration",
    title: "Integration & APIs",
    description: "Source interfaces and integration acceptance boundaries",
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
      "Brand-agnostic battery lifecycle records with explicit development boundaries.",
    content: `## What is Circul-AI-r?

Circul-AI-r is a brand-agnostic battery record application, not a complete safety or regulatory execution system. Development workflows organize local identities, supplied telemetry, uncalibrated health estimates, warranty records, listings and draft reporting evidence.

### Evidence boundaries

- Registration and QR records are local identifiers; official BPAN enrollment not verified.
- Stored telemetry needs source provenance, units, timestamps and authorized device-to-battery binding. A record is not proof of a working physical connection.
- Deterministic SOH/RUL heuristics are uncalibrated; confidence metadata is not observed accuracy.
- Candidate triage labels are not approved safety, second-life or recycling decisions.
- Internal recycling records and local hashes are not official certificates, fulfilled obligations or blockchain receipts.
- Payments, private document publishing and legacy hardware ingestion are disabled pending separate acceptance. Metadata-only execution and training are unavailable.

Physical pilot work has not been performed here. The new local pilot is in development and not deployed; no new route is advertised as ready. Dedicated isolated data, qualified supervision, calibrated instruments and independent emergency isolation are prerequisites for separately approved physical work.`,
    tags: ["overview", "introduction", "platform", "battery", "lifecycle"],
    relatedArticles: ["bpan-system", "platform-modules", "stakeholder-guide"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 5,
    icon: "Globe",
  },
  {
    id: "bpan-system",
    title: "BPAN — Local Battery Identifier",
    category: "platform",
    summary:
      "Local identity records, legacy aliases and a separate draft; enrollment unverified.",
    content: `## BPAN — Local Battery Identifier

The app uses local battery identifiers for registration and record lookup. A generated value or format check is not official issuer allocation, regulatory conformity or proof of physical identity.

Existing records can use legacy formats. A separate 21-character draft is under review. Do not silently replace customer identifiers or discard aliases when introducing an approved canonical mapping. Official BPAN enrollment not verified.

### Review requirements

Preserve the original manufacturer serial and provenance. Confirm the exact registration contract, uniqueness, ownership and field validation with the source owner. Chemistry and capacity metadata are declarations until independently evidenced. A QR code points to a local record, not an approved government passport.

No universal manufacturer code, chemistry support list or capacity scheme is asserted here. Use an approved offline fixture before an authorized import; no seed or database operation is part of this article.`,
    tags: ["bpan", "battery-passport", "identifier", "registration"],
    relatedArticles: ["platform-overview", "battery-registration", "battery-chemistries"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 4,
    icon: "Fingerprint",
  },
  {
    id: "platform-modules",
    title: "Platform Modules and Boundaries",
    category: "platform",
    summary:
      "Record workflows are distinct from validated physical or external execution.",
    content: `## Platform Modules and Boundaries

| Area | Record workflow | Not established by the record |
|---|---|---|
| Registry | Local identity and supplied metadata | Official passport enrollment |
| Telemetry | Source-labeled records and queries | Working hardware or calibrated instruments |
| SOH/RUL | Uncalibrated deterministic estimates | Trained model accuracy or safety approval |
| Warranty | Stored terms and claims | Manufacturer acceptance or repair completion |
| Marketplace | Listings and review | Verified condition, matching or executed payment |
| Recycling | Declarations, ratios and internal records | Independently verified recovery or obligation fulfillment |
| Logistics | Shipment/request records | Carrier booking, dispatch, GPS or delivery |
| Agent | Capability and action metadata | Real execution; metadata-only actions are unavailable |
| Administration | Authorized user and configuration records | Certification, service uptime or provider delivery |

Authentication, scope and resource ownership are required independently. API presence does not establish that every capability is enabled. New development changes are not deployed or fully accepted.`,
    tags: ["modules", "architecture", "features"],
    relatedArticles: ["platform-overview", "bpan-system", "architecture-overview"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 4,
    icon: "Layers",
  },
  {
    id: "stakeholder-guide",
    title: "Stakeholder Record Review",
    category: "platform",
    summary:
      "Role names describe access workflows, not adoption, qualification or endorsement.",
    content: `## Stakeholder Record Review

Manufacturers, battery owners, service providers, recyclers and reviewers can organize authorized records according to their application role. Role labels do not prove customer adoption, professional qualification, government endorsement or access to another organization's data.

Manufacturers should preserve original identity and warranty evidence. Battery owners should distinguish measured telemetry from synthetic fixtures and heuristic estimates. Service providers need separate authorization and qualified inspection evidence. Recyclers should supply facility, mass-balance and recovery evidence rather than rely on internal token statuses. Reviewers must verify applicable regulatory requirements independently.

Marketplace declarations are not verified second-life condition; logistics records are not carrier dispatch. Consent records alone do not prove enforcement on every data-access path, and revocation cannot recall copies already exported. Server-side ownership and consent enforcement remain controlling boundaries.`,
    tags: ["stakeholders", "oem", "recycler", "government", "bess"],
    relatedArticles: ["platform-overview", "warranty-system", "marketplace-guide"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 4,
    icon: "Users",
  },

  // ── BATTERY SCIENCE ───────────────────────────────────────────────────────
  {
    id: "battery-chemistries",
    title: "Battery Chemistry Guide",
    category: "battery-science",
    summary:
      "General chemistry concepts; no pack-specific performance or safety approval.",
    content: `## Battery Chemistry Guide

| Chemistry | General characteristic |
|---|---|
| NMC | Nickel, manganese and cobalt cathode family with composition-dependent properties |
| LFP | Lithium iron phosphate cathode family |
| NCA | Nickel, cobalt and aluminium cathode family |
| LCO | Lithium cobalt oxide cathode family |
| Sodium-ion | Sodium-ion transport chemistry with design-dependent performance |
| Solid-state | Designs using a solid electrolyte; commercialization and validation vary |

Energy density, cost, cycle life and operating limits depend on cell design, pack integration, condition and test method. This guide supplies no universal numerical operating ranges or pack safety limits. A chemistry label is not evidence of a supported hardware adapter or calibrated prediction model.

Consult exact manufacturer documentation and qualified reviewers. Relative chemistry characteristics do not certify a particular battery as safe for reuse, transport, charging, repair or recycling.`,
    tags: ["chemistry", "nmc", "lfp", "nca", "sodium-ion", "solid-state"],
    relatedArticles: ["bpan-system", "soh-prediction", "battery-degradation"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 5,
    icon: "Atom",
  },
  {
    id: "battery-degradation",
    title: "Battery Degradation Mechanisms",
    category: "battery-science",
    summary:
      "General mechanisms; numerical behavior is pack- and condition-specific.",
    content: `## Battery Degradation Mechanisms

Calendar ageing occurs over time, including during storage. Cycle ageing results from use. SEI growth, lithium plating, electrolyte reactions, cathode degradation and corrosion can contribute to capacity loss and impedance change. Their prevalence depends on design, chemistry, history and operating conditions.

State of Charge is a percentage relative to a reference full capacity: 100% means fully charged and 0% means fully discharged under that reference. SOC is distinct from SOH and is not a safety certificate. High SOC, thermal exposure, C-rate and depth of discharge can influence degradation, but no generic numerical rule here is an approved operating limit.

Voltage, current, temperature, cycle count and resistance may inform investigation when measured with known units and provenance. Missing values remain unknown; explicit zero must not be overwritten by a healthy default. App SOH/RUL outputs are uncalibrated deterministic estimates, not physical capacity tests or approved lifecycle decisions.`,
    tags: ["degradation", "aging", "sei", "lithium-plating", "cycle-life"],
    relatedArticles: ["battery-chemistries", "soh-prediction", "telemetry-system"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 5,
    icon: "TrendingDown",
  },
  {
    id: "soh-prediction",
    title: "SOH and RUL Heuristic Estimates",
    category: "battery-science",
    summary:
      "Deterministic uncalibrated estimates, not a trained validated neural model.",
    content: `## SOH and RUL Heuristic Estimates

Capacity-based SOH is defined as:

> SOH (%) = Current measured capacity / Rated capacity × 100

100% indicates capacity equals the reference rating under specified test conditions. It does not mean a battery is safe. Test conditions and uncertainty must accompany physical measurements.

The app's current estimate path uses deterministic physics-based heuristics, not a validated trained neural network. SOH and RUL outputs are uncalibrated and depend on supplied assumptions. Legacy confidence and error-like metadata are not measured accuracy, observed RMSE or validated uncertainty intervals. No held-out validation or universal prediction error is established.

RUL estimates time or cycles to a specified performance threshold. Verify units and assumptions; it is not a warranty or maintenance instruction. Reuse, repurposing and recycling labels are candidates for qualified human review, not approved safety, second-life or recycling decisions. Do not control a battery or dispatch a carrier from an estimate.`,
    tags: ["soh", "prediction", "machine-learning", "rul", "triage"],
    relatedArticles: ["battery-degradation", "telemetry-system", "marketplace-guide"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 5,
    icon: "Brain",
  },
  {
    id: "telemetry-system",
    title: "Telemetry Records and Provenance",
    category: "battery-science",
    summary:
      "Schema fields do not prove live hardware, durable delivery or retention.",
    content: `## Telemetry Records and Provenance

Source fields can represent supplied voltage, current, temperature and cycle count. Actual measurements require calibrated instruments, documented units, recorded timestamps and authorized device-to-battery binding. Missing readings remain unknown; explicit zero is retained. A source label alone does not independently verify measurement provenance.

Strict device boundaries distinguish device ID, battery identity, recorded timestamp and measured source. Unsupported aliases, SOC and inferred health must not be silently persisted as physical measurements. Synthetic fixtures and measured records must remain isolated.

Legacy hardware ingestion is blocked with HTTP 503; historical source examples are not working physical acceptance evidence. No physical test was performed here, and the new local pilot is not deployed. No generic operating thresholds, retention duration, delivery frequency, latency or lifecycle-long storage guarantee is supplied.

Recorded alerts are not independent emergency protection. Use manufacturer-specific limits and qualified oversight with separate emergency isolation.`,
    tags: ["telemetry", "mqtt", "iot", "monitoring", "alerts"],
    relatedArticles: ["soh-prediction", "battery-degradation", "mqtt-integration"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 4,
    icon: "Activity",
  },

  // ── COMPLIANCE ────────────────────────────────────────────────────────────
  {
    id: "iso27001-compliance",
    title: "ISO 27001 — Candidate Controls",
    category: "compliance",
    summary:
      "General standard context; certification and control effectiveness are unverified.",
    content: `## ISO 27001 — Candidate Controls

ISO 27001 concerns an information security management system. App code and logs may be candidate evidence for access control, logging, cryptography and change review, but they do not establish an audited management system or certification.

Confirm actual route authentication, resource ownership, key scope enforcement, tenant isolation, logging coverage, retention and credential handling. A role check or input schema alone does not prove protection on every endpoint. TLS deployment and storage access policies need separate evidence.

No ISO certification, comprehensive audit coverage, data classification enforcement or security effectiveness is claimed. Independent organizational review, policy evidence, risk treatment and audit remain acceptance gates. This article is a development boundary, not an audit report.`,
    tags: ["iso27001", "security", "audit", "compliance", "encryption"],
    relatedArticles: ["soc2-compliance", "audit-logging", "data-classification"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 4,
    icon: "ShieldCheck",
  },
  {
    id: "soc2-compliance",
    title: "SOC 2 — Evidence Review Pending",
    category: "compliance",
    summary:
      "No attestation or measured availability is established by application code.",
    content: `## SOC 2 — Evidence Review Pending

SOC 2 evaluates controls against relevant trust services criteria. An attestation requires independent review and evidence across its stated scope and period; it cannot be inferred from a list of software features.

Authentication, authorization, key lifecycle, configuration changes and logs may support a candidate evidence inventory. Verify their completeness, retention, integrity and operation. Process age and current-session check ratios are not measured service availability.

No SOC 2 attestation, uptime commitment, restore acceptance, incident response delivery or continuous evidence completeness is established here. Provider notifications and operational on-call acceptance remain separate; no test notification is sent by this article.`,
    tags: ["soc2", "trust-services", "audit", "monitoring", "compliance"],
    relatedArticles: ["iso27001-compliance", "audit-logging", "security-events"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 4,
    icon: "Award",
  },
  {
    id: "epr-compliance",
    title: "Extended Producer Responsibility — Draft Records",
    category: "compliance",
    summary:
      "Internal records do not demonstrate official obligation fulfillment.",
    content: `## Extended Producer Responsibility — Draft Records

EPR assigns producers responsibilities for product end-of-life management. Applicable rules, targets, reporting periods and facility requirements vary by jurisdiction and battery category. Obtain current regulator materials and qualified review; no universal target schedule is asserted here.

The app organizes declarations, internal recycling-related records and draft exports. A verified status, computed ratio or local hash is not independent facility verification, mass-balance acceptance, official certificate, blockchain anchoring or fulfilled producer obligation.

Official BPAN enrollment not verified. No approved regulator-specific format, portal submission, government acceptance or automatic compliance is established. Carrier records do not prove collection or dispatch. Preserve supporting source evidence and report missing or rejected data rather than inventing a positive status.`,
    tags: ["epr", "recycling", "bwmr", "eu-battery-regulation", "compliance"],
    relatedArticles: ["carbon-footprint", "iso27001-compliance", "platform-overview"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 4,
    icon: "Recycle",
  },
  {
    id: "carbon-footprint",
    title: "Carbon Footprint — Estimated Evidence",
    category: "compliance",
    summary:
      "Numerical estimates require methodology, input and reporting-boundary review.",
    content: `## Carbon Footprint — Estimated Evidence

Carbon footprints quantify greenhouse gas emissions within stated system boundaries and units. App outputs are estimates, not independently verified regulatory declarations. Review inventory data, emission factors, geography, allocation, lifecycle boundary, units and uncertainty.

GHG Protocol, ISO 14067 and product environmental footprint approaches are general methodology references, not evidence that this implementation conforms to them. No accepted methodology, official performance class or universal stage-percentage breakdown is established.

Linking an estimate to a battery identity does not certify either. Preserve declared inputs and calculation assumptions and obtain qualified methodology and jurisdiction-specific review before using a draft report.`,
    tags: ["carbon", "ghg", "iso14067", "sustainability", "emissions"],
    relatedArticles: ["epr-compliance", "bpan-system", "platform-overview"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 3,
    icon: "Leaf",
  },

  // ── INTEGRATION ───────────────────────────────────────────────────────────
  {
    id: "rest-api",
    title: "REST API Contract Review",
    category: "integration",
    summary:
      "Historical catalogue entries are not verified enabled routes or request receipts.",
    content: `## REST API Contract Review

REST source interfaces exist, but historical paths and examples are not the enabled API contract. Authentication, endpoint scope, resource ownership and feature gates must be reviewed against current source. Legacy unscoped and hardware paths may return HTTP 503.

Do not assume all endpoints share one response shape or accept the same key. Confirm the exact session, API-key or strict-device boundary. A successful HTTP response is not a safety, regulatory, carrier or payment receipt.

Payments and private document publishing are disabled. Metadata-only execution and training are unavailable. The new local pilot is in development and not deployed; no new route is advertised as ready. Rate limits are configuration-dependent and may be in-process; no free tier, production entitlement or uptime guarantee is asserted.

This article makes no request and provides no runnable write example. Use separately approved offline contract fixtures first.`,
    tags: ["api", "rest", "microservices", "authentication", "endpoints"],
    relatedArticles: ["mcp-integration", "api-keys", "mqtt-integration"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 5,
    icon: "Code",
  },
  {
    id: "mcp-integration",
    title: "MCP Contract Review",
    category: "integration",
    summary:
      "Protocol and capability metadata are distinct from authorized execution.",
    content: `## MCP Contract Review

MCP is a general protocol for tools, resources and prompts. The app contains an MCP interface, but capability discovery does not prove that a tool is implemented, enabled or authorized for the current actor.

Review the actual authentication, key scopes and resource ownership before access. Do not assume the interface is public or that a generic external client package is available. No guessed tool counts, client installation or write request is provided here.

Reading a record does not validate physical condition. Logging an action does not dispatch a carrier, approve a route, train a model or execute battery control. Metadata-only execution and training are gated unavailable. No provider integration or hardware acceptance is established by this article.`,
    tags: ["mcp", "ai-agent", "protocol", "tools", "claude"],
    relatedArticles: ["rest-api", "agent-system", "platform-overview"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 5,
    icon: "Bot",
  },
  {
    id: "mqtt-integration",
    title: "MQTT — Read-Only Review Boundary",
    category: "integration",
    summary:
      "Conditional operator-approved source examples, not a working physical gateway.",
    content: `## MQTT — Read-Only Review Boundary

Historical gateway source paths exist under gateway/. They are conditional, operator-approved review examples only, not accepted firmware, connector pinouts or register maps. Physical testing not performed. Legacy hardware ingestion is blocked with HTTP 503.

Before any connection, independently approve the exact manufacturer's interface documentation, passive receive behavior, isolation design, calibrated instruments, device-to-battery binding, units, timestamps, broker access controls, topic allowlists and revocation. Dedicated isolated pilot data is required; preserve production records.

No pin guessing, register/unit scanning, control/write commands, charging, discharging or public broker production use is approved. Do not reuse an MQTT password as a REST device token. TLS configuration and QoS alone do not prove correct decoding, durable storage or delivery.

The new local pilot is in development and not deployed. Uncalibrated voltage/age heuristics are not approved SOH, safety, second-life or recycling evidence. Independent emergency isolation remains necessary.`,
    tags: ["mqtt", "iot", "bms", "telemetry", "real-time"],
    relatedArticles: ["telemetry-system", "rest-api", "architecture-overview"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 3,
    icon: "Wifi",
  },
  {
    id: "api-keys",
    title: "API Key and Ownership Review",
    category: "integration",
    summary:
      "Key contracts differ; a valid key alone does not authorize every resource.",
    content: `## API Key and Ownership Review

The application has separate key/session contracts. Confirm the exact enabled endpoint's key format, issuer, hashing/storage behavior, scopes, expiry, revocation and owner binding with its source owner. A valid key alone does not authorize every battery or organization.

Use least privilege, keep secrets out of documentation and approve rotation/revocation procedures. Do not assume historical scope names or rate tiers are current. Resource ownership and feature gates remain independent of authentication.

Strict-device ingestion additionally requires documented device/battery binding and measured provenance. It must not silently accept inferred data or another owner's records. No free tier, automatic commercial upgrade, working hardware or notification acceptance is implied by a displayed key.`,
    tags: ["api-keys", "authentication", "security", "rate-limiting"],
    relatedArticles: ["rest-api", "iso27001-compliance", "soc2-compliance"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 3,
    icon: "Key",
  },

  // ── ARCHITECTURE ──────────────────────────────────────────────────────────
  {
    id: "architecture-overview",
    title: "System Architecture — Source Boundaries",
    category: "architecture",
    summary:
      "Modular record application; deployment configuration and acceptance are separate.",
    content: `## System Architecture — Source Boundaries

The application is a modular monolith with a React client and server-side interfaces for tRPC, REST and MCP. Source modules organize records and queries; protocol presence does not establish complete feature coverage or enabled execution.

Native session authentication, API-key scopes and resource ownership have distinct contracts. Do not assume MCP is public, that every route shares one gate or that a key permits cross-tenant access. Database dialect and storage behavior depend on the configured implementation; this article supplies no connection instructions or schema completeness claim.

Physical gateways, broker access, providers, payment, publishing and regulator submission have separate acceptance boundaries. Logs and capability metadata are not execution receipts. New development changes are not deployment evidence. No uptime, restoration, safety, certification or external delivery is established here.`,
    tags: ["architecture", "tech-stack", "modular-monolith", "database"],
    relatedArticles: ["platform-modules", "security-architecture", "data-model"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 4,
    icon: "Server",
  },
  {
    id: "security-architecture",
    title: "Security Architecture — Review Gates",
    category: "architecture",
    summary:
      "Candidate technical controls require route-level and operational acceptance.",
    content: `## Security Architecture — Review Gates

Authentication, resource ownership, key scopes, input validation, headers and logs are candidate technical controls. Their presence in source does not establish universal protection, DDoS prevention or independently reviewed security.

Confirm per-resource owner isolation on reads, writes, history, attachments, exports and aggregate queries. Check deny behavior for absent, expired, revoked or incorrectly scoped credentials. Preserve honest errors rather than defaulting to healthy or successful states.

TLS, storage policy, audit coverage, restoration and provider delivery need separate acceptance. Logging an event does not prove paging, blocking, investigation or incident response occurred. No certification, comprehensive security coverage or notification test is claimed.`,
    tags: ["security", "authentication", "authorization", "encryption"],
    relatedArticles: ["iso27001-compliance", "soc2-compliance", "api-keys"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 3,
    icon: "Lock",
  },
  {
    id: "data-model",
    title: "Data Model — Reference Boundaries",
    category: "architecture",
    summary:
      "Consult current schema owners; no complete static table inventory is asserted.",
    content: `## Data Model — Reference Boundaries

Registry, telemetry, estimates, warranty, listings, recycling, documents, actions and consent are record categories. The current schema and authorized data-access owners define actual fields, relationships and dialect. Historical table counts and sample schemas are not authoritative.

Preserve local identifiers and aliases. Distinguish declared, synthetic, inferred and measured provenance; missing values remain unknown and explicit zero is retained. A status label such as verified is an internal state, not independent physical or regulatory certification.

Direct database edits bypass application ownership and validation. No credentials, seed commands, migrations or database writes are supplied here. New pilot records require isolated design and separate acceptance rather than reuse of production customer rows.`,
    tags: ["database", "schema", "tables", "drizzle", "mysql"],
    relatedArticles: ["architecture-overview", "bpan-system", "platform-modules"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 4,
    icon: "Database",
  },

  // ── OPERATIONS ────────────────────────────────────────────────────────────
  {
    id: "warranty-system",
    title: "Warranty Record Review",
    category: "operations",
    summary:
      "Stored warranty status is not issuer acceptance or a completed service claim.",
    content: `## Warranty Record Review

The app organizes supplied warranty terms, contacts and claim records. Displayed active, expired or claimed states reflect records and calculations; they do not independently prove manufacturer acceptance, coverage, repair completion or entitlement.

Confirm original issuer documents, dates, conditions, customer authorization and resource ownership. Contact-channel lookup must not be assumed public or unrestricted. A matching phone or email is not proof of identity and must not disclose another owner's records.

Warranty terms are issuer-specific; no universal coverage period or all-risk promise is made. A warranty record does not demonstrate recycling obligation fulfillment or second-life suitability. Outbound email/phone acceptance and provider delivery remain separate, unverified gates.`,
    tags: ["warranty", "multi-channel", "lookup", "claims", "customer"],
    relatedArticles: ["battery-registration", "marketplace-guide", "stakeholder-guide"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 4,
    icon: "BadgeCheck",
  },
  {
    id: "marketplace-guide",
    title: "Marketplace Listing Review",
    category: "operations",
    summary:
      "Seller declarations and estimates are not independently verified physical condition.",
    content: `## Marketplace Listing Review

The marketplace organizes asking-price and battery listing records. No SOH percentage alone qualifies a battery for reuse, refurbishment or recycling. Seller declarations and uncalibrated SOH/RUL estimates need source provenance, qualified inspection and manufacturer-specific review.

Uploaded documents are not automatically verified certificates. Warranty states need separate issuer review. Official BPAN enrollment not verified. A listing does not establish matching, buyer acceptance, carrier booking or completed delivery.

Payments and private document publishing are disabled pending separate acceptance. No completed sale, pricing accuracy, model verification or safe second-life condition is promised. Review authorized records without changing or relabeling production data as a pilot.`,
    tags: ["marketplace", "second-life", "bess", "listing", "soh"],
    relatedArticles: ["soh-prediction", "warranty-system", "stakeholder-guide"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 3,
    icon: "Store",
  },
  {
    id: "battery-registration",
    title: "Battery Registration Review",
    category: "operations",
    summary:
      "Local identity source workflows, subject to ownership and validation.",
    content: `## Battery Registration Review

Registration source workflows organize supplied manufacturer, chemistry, capacity, voltage, application and serial-number information. Accepted fields and authorization depend on the current enabled contract. Declarations require independent evidence where used for physical or regulatory decisions.

Preserve original serial numbers and legacy aliases. A generated local identity or QR code is not an official passport; official BPAN enrollment not verified. A separate 21-character draft remains subject to issuer and mapping review.

Use non-sensitive authorized offline fixtures first. Actual import requires separate approval and per-row honest acceptance/error reporting. Do not re-seed, overwrite or relabel production customer data to create a pilot. No registration operation is executed by this article.`,
    tags: ["registration", "onboarding", "csv-import", "bpan-generation"],
    relatedArticles: ["bpan-system", "warranty-system", "bulk-onboarding"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 3,
    icon: "PlusCircle",
  },
  {
    id: "agent-system",
    title: "Agent Metadata — Execution Unavailable",
    category: "operations",
    summary:
      "Action logging and capability discovery do not perform real operations.",
    content: `## Agent Metadata — Execution Unavailable

Capability lists, round/version metadata and action logs are not execution receipts. Metadata-only agent execution and batch execution are gated unavailable; they do not perform carrier dispatch, route approval, battery control, government submission or financial transactions.

Federated round/version records do not aggregate model weights or train a model. Training is gated unavailable. Healthy defaults, declared success states and invented accuracy must not be treated as operational evidence.

Any future action requires explicit actor/resource authorization, human approval where appropriate, durable idempotency and independently accepted external adapters. Safety, second-life and recycling decisions require qualified review and cannot be approved by an uncalibrated estimate. This article supplies no execution or batch-write payload.`,
    tags: ["agent", "agentic", "automation", "batch", "super-admin"],
    relatedArticles: ["mcp-integration", "rest-api", "architecture-overview"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 4,
    icon: "Cpu",
  },
  {
    id: "audit-logging",
    title: "Audit Records — Coverage Review",
    category: "operations",
    summary:
      "Logs may support investigation, not complete certification or external receipts.",
    content: `## Audit Records — Coverage Review

Audit records can capture actors, actions, timestamps and outcomes where writers are implemented. Confirm actual fields and coverage with current source rather than assuming every operation is logged, every field is populated, or all sensitive values are redacted.

An action marked successful may represent metadata or a completed local write, not real external execution. A local hash is not a blockchain receipt or immutable independently anchored evidence. Audit queries and exports require resource ownership, tenant isolation and private-document boundaries.

Retention, integrity, complete trace propagation, SIEM delivery and operational review need separate acceptance. No ISO certification, SOC 2 attestation, comprehensive logging or notification delivery is established. Preserve rejected/unknown states and raw evidence instead of inferring success.`,
    tags: ["audit", "logging", "trace-id", "siem", "compliance"],
    relatedArticles: ["iso27001-compliance", "soc2-compliance", "security-architecture"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 3,
    icon: "FileText",
  },
  {
    id: "bulk-onboarding",
    title: "Bulk Onboarding — Offline Fixture Review",
    category: "operations",
    summary:
      "Approved application import required; no seed or direct database write.",
    content: `## Bulk Onboarding — Offline Fixture Review

Historical CSV examples are not the enabled import contract. Confirm required fields, units, identifier mapping and resource ownership with the current owner. Use an isolated non-sensitive offline fixture before an authorized import.

Preserve original serial numbers and aliases; official BPAN enrollment not verified. Report row validation failures and acceptance counts honestly. A line count is not parsed CSV or a persisted-row receipt. Quoted multiline fields require a proper parser in the approved workflow.

No database seed, migration, warranty creation or import is executed here. Do not regenerate or overwrite production customer rows. Supplied capacity, voltage and condition metadata are declarations until independently measured and reviewed.`,
    tags: ["bulk", "onboarding", "csv", "import", "migration"],
    relatedArticles: ["battery-registration", "bpan-system", "warranty-system"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 3,
    icon: "Upload",
  },
  {
    id: "write-api-scope-strategy",
    title: "Write API Strategy — Not a Released Contract",
    category: "integration",
    summary:
      "Historical design ideas must not be confused with enabled routes or dispatch.",
    content: `## Write API Strategy — Not a Released Contract

This article records design boundaries, not a released write API. Historical scope names, endpoint lists, rate tiers and implementation phases must be reviewed against current enabled source; they are not operational promises.

Every future write requires authenticated actor identity, exact scopes, resource ownership, validated inputs and honest rejection behavior. Read access must not imply write access. Device writes additionally require accepted device/battery binding and measured provenance. Metadata-only execution and training remain unavailable.

Legacy hardware ingestion is blocked with HTTP 503. Payments and private document publishing are disabled. No new local pilot route is advertised as ready or deployed. Carrier dispatch, regulatory submission, notifications and automated safety approval require separate accepted adapters and authorization.

No migration notice, external bot, provider setup, credentials or test notification is performed here. Prefer approved offline fixtures; do not bypass application gates through direct database access.`,
    tags: ["api", "scopes", "write", "whatsapp", "integration", "security", "rate-limiting", "developer"],
    relatedArticles: ["api-reference", "developer-portal", "webhook-integration"],
    lastUpdated: "2026-11-18",
    readTimeMinutes: 8,
    icon: "KeyRound",
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

  return `You are a reference assistant for Circul-AI-r local battery records. The knowledge base describes development boundaries, not complete features or released physical integrations.

Available knowledge base articles:
${articleSummaries}

When answering:
- Distinguish source implementation, configuration, enabled contracts, measured evidence and separate acceptance.
- SOH/RUL and triage heuristics are uncalibrated; legacy confidence/error metadata is not observed accuracy.
- Never approve safety, second-life, recycling, battery control, carrier dispatch or regulatory fulfillment.
- Local identities are not officially enrolled passports; official BPAN enrollment not verified.
- Internal yields, statuses and local hashes are not independent certificates or blockchain receipts.
- Metadata-only execution and training are unavailable. Legacy hardware ingestion, payments and private publishing are disabled.
- The new local pilot is in development and not deployed. Do not guess or advertise a ready route.
- No physical test, provider delivery, uptime, certification or government acceptance is established.
- Do not give guessed pins/register maps, control/write commands, public broker production setup, direct database writes or seed commands.
- Preserve unknown and error states, missing values and explicit zero. Reference articles and state uncertainty honestly.`;
}
