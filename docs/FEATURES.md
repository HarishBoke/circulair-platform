# Circul-AI-r Feature Documentation

**Version:** 1.0.0  
**Last Updated:** April 2026

---

## Feature Matrix

| Feature | Module | Access | API | MCP | Status |
|---|---|---|---|---|---|
| Battery Registration (BPAN) | bpan | All users | Yes | Yes | Production |
| Real-Time Telemetry | telemetry | All users | Yes | Yes | Production |
| MQTT IoT Ingestion | telemetry | System | — | — | Production |
| AI SOH Prediction | soh | All users | Yes | Yes | Production |
| Triage Engine | soh | All users | — | — | Production |
| Warranty Registration | warranty | All users | Yes | Yes | Production |
| Warranty Check (Public) | warranty | Public | Yes | Yes | Production |
| Warranty Claims | warranty | All users | — | — | Production |
| Bulk Battery Onboarding | onboarding | Admin | — | — | Production |
| Second-Life Marketplace | marketplace | All users | Yes | Yes | Production |
| EPR Compliance Tokens | compliance | All users | Yes | Yes | Production |
| Carbon Footprint Declaration | compliance | All users | — | — | Production |
| Logistics Tracking | logistics | All users | — | — | Production |
| Alert System | telemetry | All users | — | — | Production |
| Super Admin Panel | admin | Admin only | — | — | Production |
| Agent Action Tracking | agent | Admin/Agent | Yes | Yes | Production |
| REST API Gateway | api | API key | Yes | — | Production |
| MCP Server | mcp | Public | — | Yes | Production |
| Audit Logging (ISO 27001) | compliance | Admin | Yes | Yes | Production |
| Security Event Monitoring | compliance | Admin | Yes | Yes | Production |
| API Key Management | apiKey | Admin | — | — | Production |
| Webhook Subscriptions | webhook | Admin | — | — | Production |
| Structured Logging | system | System | — | — | Production |
| User Administration | admin | Admin | — | — | Production |
| AI Chat Assistant | ai | All users | — | — | Production |

---

## Feature Details

### Battery Passport (BPAN) Registry

The BPAN Registry is the core module of the platform. Every battery registered receives a unique 21-character identifier that encodes its origin, chemistry, and capacity.

**BPAN Format:** `{Country}-{Manufacturer}-{Chemistry}-{Capacity}-{UniqueID}`

**Supported Chemistries:**

| Code | Chemistry | Common Applications |
|---|---|---|
| NMC | Nickel Manganese Cobalt | EVs, Power Tools |
| LFP | Lithium Iron Phosphate | EVs, BESS, E-Rickshaws |
| NCA | Nickel Cobalt Aluminum | High-performance EVs |
| LCO | Lithium Cobalt Oxide | Consumer Electronics |
| LMO | Lithium Manganese Oxide | Power Tools, Medical |
| LMFP | Lithium Manganese Iron Phosphate | Next-gen EVs |
| Na-ion | Sodium Ion | Low-cost BESS |
| Solid-state | Solid State | Emerging Technology |

**Capacity Codes:**

| Code | Range |
|---|---|
| A1 | 0-1 kWh |
| A2 | 1-5 kWh |
| A3 | 5-10 kWh |
| A4 | 10-25 kWh |
| A5 | 25-50 kWh |
| A6 | 50-100 kWh |
| A7 | 100-500 kWh |
| A8 | 500+ kWh |

**Application Types:** EV 2-Wheeler, EV 3-Wheeler, EV 4-Wheeler, EV Bus, BESS, Consumer Electronics, Industrial, Telecom, Solar Storage, Medical, Marine, Aerospace

---

### Warranty Management System

The warranty system provides end-to-end warranty lifecycle management with multi-channel customer verification.

**Warranty Types:**

| Type | Description | Typical Term |
|---|---|---|
| Standard | Basic manufacturer warranty | 12-24 months |
| Extended | Paid extended coverage | 24-48 months |
| Premium | Comprehensive all-risk coverage | 36-60 months |

**Coverage Types:**

| Coverage | Includes |
|---|---|
| Standard | Manufacturing defects, premature capacity loss |
| Comprehensive | Standard + accidental damage, thermal events |
| Limited | Specific components only (cells, BMS, connectors) |

**Warranty Status Engine:**

The platform automatically computes warranty status based on registration dates and claim history:

- **Active** — Within warranty period, no claims that void coverage
- **Expired** — Past warranty end date
- **Voided** — Warranty invalidated (e.g., tampering, unauthorized modification)
- **Claimed** — Warranty claim has been processed

**Multi-Channel Lookup:**

Customers and service providers can verify warranty status using five channels:

1. **BPAN** — Battery Passport Aadhaar Number
2. **Serial Number** — Manufacturer serial number
3. **Phone** — Customer phone number
4. **Email** — Customer email address
5. **WhatsApp** — Customer WhatsApp number

This multi-channel approach is critical for the Indian market where battery providers receive warranty inquiries through phone calls, WhatsApp messages, and emails. The platform eliminates the need for manual lookup by enabling instant verification through any contact channel.

**Warranty Impact on Platform:**

Warranty status is integrated across the platform:

- **Marketplace:** In-warranty batteries receive a warning when listed for second-life sale. The rationale is that customers with active warranties should use the warranty claim process rather than selling the battery.
- **Battery Detail:** Warranty status is displayed on the battery passport page.
- **Compliance:** Warranty claims count toward EPR obligation tracking.

---

### AI-Powered SOH Prediction

The SOH prediction engine uses machine learning to estimate battery State of Health and Remaining Useful Life from telemetry data.

**Input Features:**

- Voltage patterns and degradation trends
- Current draw profiles
- Temperature history and thermal events
- Cycle count and depth of discharge patterns
- Internal resistance measurements

**Output:**

| Field | Description |
|---|---|
| Predicted SOH (%) | Current health estimate |
| Confidence Interval | Low and high bounds |
| RUL (cycles) | Estimated remaining useful life |
| Triage Recommendation | Lifecycle action recommendation |

**Triage Recommendations:**

| SOH Range | Recommendation | Description |
|---|---|---|
| 80-100% | Continue Operation | Battery is healthy, normal monitoring |
| 60-79% | Enhanced Monitoring | Increase telemetry frequency, watch trends |
| 40-59% | Second-Life Candidate | Consider marketplace listing for BESS/backup |
| 20-39% | Recycling Recommended | Initiate EPR process, contact recycler |
| 0-19% | Urgent Recycling | Priority disposal, safety concern |

---

### Microservices API (REST)

The REST API at `/api/v1` provides a microservices-compatible interface for organizations that prefer traditional REST over tRPC.

**Key Characteristics:**

- **OpenAPI 3.1 Specification** — Machine-readable API contract at `/api/v1/openapi.json`
- **Swagger UI** — Interactive documentation at `/api/docs`
- **API Key Authentication** — Bearer token with configurable scopes and rate limits
- **Rate Limiting** — Four tiers from 10 to 2000 requests per minute
- **Request Tracing** — Every request gets a unique trace ID in the `X-Trace-Id` header
- **Versioned** — API version in URL path (`/api/v1/`) for backward compatibility

**Available Endpoints:**

| Category | Endpoints |
|---|---|
| Batteries | GET /batteries, GET /batteries/:bpan, GET /batteries/:bpan/telemetry, GET /batteries/:bpan/soh, GET /batteries/:bpan/warranty |
| Warranty | GET /warranty/lookup, GET /warranty/stats |
| Marketplace | GET /marketplace, GET /marketplace/stats |
| Compliance | GET /compliance/epr, GET /compliance/epr/stats |
| Analytics | GET /stats/batteries |

---

### MCP Server (Model Context Protocol)

The MCP server at `/api/mcp` enables AI agents to interact with the platform using the standardized Model Context Protocol.

**Capabilities:**

| Primitive | Count | Description |
|---|---|---|
| Tools | 20 | Executable functions for battery lookup, warranty check, etc. |
| Resources | 5 | Bulk data access for batteries, warranties, marketplace, etc. |
| Prompts | 4 | Pre-built context packages for report generation |

**Use Cases:**

- AI agents performing automated battery health checks
- Chatbots answering customer warranty inquiries
- Automated compliance reporting
- Fleet management decision support
- Predictive maintenance scheduling

---

### Compliance & Audit System

The compliance system implements controls aligned with ISO 27001:2022 and SOC 2 Type II.

**Audit Logging:**

Every platform operation generates an audit log entry with:
- Trace ID for request correlation
- Actor identification (user, agent, system, API key)
- Action identifier and module
- Data classification tag
- Input/output summaries
- Duration and status

**Security Event Monitoring:**

Security-relevant events are classified by severity:
- **Low:** Successful operations, routine access
- **Medium:** Failed attempts, configuration changes
- **High:** Repeated failures, unauthorized access attempts
- **Critical:** Potential breach indicators, mass data operations

**Data Classification:**

Four-tier classification system applied to all data:
- **Public:** Platform documentation, public warranty check
- **Internal:** Battery statistics, marketplace listings
- **Confidential:** Customer data, warranty records, telemetry
- **Restricted:** API keys, audit logs, security events

---

### Bulk Battery Onboarding

For organizations migrating existing battery fleets to the platform.

**Supported Methods:**

1. **Manual Entry** — Single battery registration with optional warranty
2. **CSV Import** — Batch import with automatic BPAN generation

**CSV Format:**

```csv
manufacturer,chemistry,capacityKwh,nominalVoltage,application,countryOfOrigin,serialNumber
```

**Auto-BPAN Generation:**

The system parses each battery's manufacturer, chemistry, and capacity to automatically generate a compliant BPAN. Serial numbers are preserved as additional identifiers.

**Optional Warranty Auto-Registration:**

When enabled, the bulk import process automatically creates warranty records for each onboarded battery using the specified warranty terms.
