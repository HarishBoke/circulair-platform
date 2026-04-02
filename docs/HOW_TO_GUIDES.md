# Circul-AI-r How-To Guides

**Version:** 1.0.0  
**Audience:** Platform users, API consumers, system administrators

---

## Table of Contents

1. [How to Register a Battery](#1-how-to-register-a-battery)
2. [How to Register a Warranty](#2-how-to-register-a-warranty)
3. [How to Check Warranty Status](#3-how-to-check-warranty-status)
4. [How to Bulk Onboard Existing Batteries](#4-how-to-bulk-onboard-existing-batteries)
5. [How to Set Up Telemetry Ingestion](#5-how-to-set-up-telemetry-ingestion)
6. [How to Use the REST API](#6-how-to-use-the-rest-api)
7. [How to Connect an AI Agent via MCP](#7-how-to-connect-an-ai-agent-via-mcp)
8. [How to Create and Manage API Keys](#8-how-to-create-and-manage-api-keys)
9. [How to List a Battery on the Marketplace](#9-how-to-list-a-battery-on-the-marketplace)
10. [How to Generate an EPR Compliance Token](#10-how-to-generate-an-epr-compliance-token)
11. [How to Use the Super Admin Panel](#11-how-to-use-the-super-admin-panel)
12. [How to Export Audit Logs for Compliance](#12-how-to-export-audit-logs-for-compliance)

---

## 1. How to Register a Battery

Registering a battery creates a unique BPAN (Battery Passport Aadhaar Number) that serves as the battery's digital identity throughout its lifecycle.

**Via the Platform UI:**

1. Log in to the platform and navigate to **BPAN Registry** in the sidebar
2. Click **Register New Battery**
3. Fill in the required fields:
   - **Manufacturer** — Company name (e.g., "Tata AutoComp")
   - **Chemistry** — Battery chemistry type (NMC, LFP, NCA, etc.)
   - **Capacity (kWh)** — Rated capacity
   - **Nominal Voltage (V)** — Rated voltage
   - **Application** — Intended use (EV, BESS, Consumer Electronics, etc.)
   - **Country of Origin** — Manufacturing country (ISO code)
4. Click **Generate BPAN** — the system automatically generates a unique BPAN
5. The battery is now registered and visible in the registry

**Via the REST API:**

```bash
curl -X POST https://your-domain.com/api/v1/batteries \
  -H "Authorization: Bearer cai_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "Tata AutoComp",
    "chemistry": "LFP",
    "capacityKwh": 3.5,
    "nominalVoltage": 3.2,
    "application": "ev_2w",
    "countryOfOrigin": "IN"
  }'
```

**Via MCP (AI Agent):**

```json
{
  "method": "tools/call",
  "params": {
    "name": "list_batteries",
    "arguments": { "status": "operational", "limit": 5 }
  }
}
```

---

## 2. How to Register a Warranty

Warranty registration links a warranty record to a battery's BPAN, capturing customer contacts, dealer information, and coverage terms.

**Steps:**

1. Navigate to **Warranty** > **Register Warranty** in the sidebar
2. **Step 1 — Battery:** Enter the BPAN or search for the battery. The system auto-fills battery details.
3. **Step 2 — Customer:** Enter customer details:
   - Name, phone number, email address, WhatsApp number
   - All contact channels enable multi-channel warranty lookup
4. **Step 3 — Dealer:** Enter dealer/service provider details:
   - Dealer name, dealer code, invoice number, purchase date
5. **Step 4 — Terms:** Select warranty terms:
   - **Warranty Type:** Standard, Extended, or Premium
   - **Coverage Type:** Standard, Comprehensive, or Limited
   - **Term Length:** 12, 24, 36, 48, or 60 months
   - The system auto-calculates the warranty end date
6. Click **Register Warranty** to complete

The warranty is now active and can be verified through any of the customer's contact channels.

---

## 3. How to Check Warranty Status

Warranty status can be checked by customers, service providers, or AI agents without requiring platform login.

**Via the Platform (Public Page):**

1. Navigate to **Warranty** > **Check Warranty** (or visit `/warranty/check` directly)
2. Select a search channel: BPAN, Serial Number, Phone, Email, or WhatsApp
3. Enter the search value and click **Check Warranty**
4. The system displays warranty status, days remaining, coverage details, and customer information

**Via the REST API:**

```bash
# Check by phone number
curl -H "Authorization: Bearer cai_xxx" \
     "https://domain.com/api/v1/warranty/lookup?channel=phone&value=+919876543210"

# Check by email
curl -H "Authorization: Bearer cai_xxx" \
     "https://domain.com/api/v1/warranty/lookup?channel=email&value=customer@example.com"

# Check by BPAN
curl -H "Authorization: Bearer cai_xxx" \
     "https://domain.com/api/v1/batteries/IN-TAT-LFP-A3-X7K9M2P4/warranty"
```

**Via MCP (AI Agent):**

```json
{
  "method": "tools/call",
  "params": {
    "name": "lookup_warranty",
    "arguments": { "channel": "phone", "value": "+919876543210" }
  }
}
```

---

## 4. How to Bulk Onboard Existing Batteries

For organizations with existing battery fleets that need to be registered on the platform.

**Manual Entry:**

1. Navigate to **Onboarding** > **Bulk Onboard** in the sidebar
2. Select the **Manual Entry** tab
3. Fill in battery details: manufacturer, chemistry, capacity, voltage, application, country
4. Optionally enable **Auto-Register Warranty** and fill in warranty details
5. Click **Register & Generate BPAN**

**CSV Import:**

1. Navigate to **Onboarding** > **Bulk Onboard**
2. Select the **CSV Import** tab
3. Prepare a CSV file with the following columns:

```csv
manufacturer,chemistry,capacityKwh,nominalVoltage,application,countryOfOrigin,serialNumber
Tata AutoComp,LFP,3.5,3.2,ev_2w,IN,TAT-2024-001
Exide Industries,NMC,5.0,3.7,bess,IN,EXD-2024-002
Amara Raja,LFP,2.8,3.2,ev_3w,IN,AMR-2024-003
```

4. Upload the CSV file
5. The system validates each row and generates BPANs automatically
6. Review the import summary and confirm

---

## 5. How to Set Up Telemetry Ingestion

The platform supports two telemetry ingestion methods: MQTT (for IoT devices) and HTTP (for BMS integrations).

**MQTT Configuration:**

Configure your BMS or IoT gateway to publish telemetry data to the platform's MQTT broker:

| Setting | Value |
|---|---|
| Broker URL | Provided in platform settings |
| Topic | `{prefix}/telemetry/{bpan}` |
| QoS | 1 (at least once) |
| Payload Format | JSON |

**Payload format:**

```json
{
  "bpan": "IN-TAT-LFP-A3-X7K9M2P4",
  "voltage": 3.28,
  "current": 12.5,
  "temperature": 32.1,
  "soc": 78,
  "cycleCount": 450,
  "internalResistance": 0.045
}
```

**HTTP Ingestion:**

```bash
curl -X POST https://your-domain.com/api/trpc/telemetry.ingest \
  -H "Content-Type: application/json" \
  -d '{
    "bpan": "IN-TAT-LFP-A3-X7K9M2P4",
    "voltage": "3.28",
    "current": "12.5",
    "temperature": "32.1",
    "soc": "78",
    "cycleCount": 450,
    "internalResistance": "0.045"
  }'
```

---

## 6. How to Use the REST API

The REST API at `/api/v1` provides microservices-compatible access to all platform features.

**Step 1:** Obtain an API key from the platform admin (see Guide #8)

**Step 2:** Explore the interactive documentation at `/api/docs` (Swagger UI)

**Step 3:** Make authenticated requests:

```bash
# List operational batteries
curl -H "Authorization: Bearer cai_your_key" \
     "https://domain.com/api/v1/batteries?status=operational"

# Get battery details
curl -H "Authorization: Bearer cai_your_key" \
     "https://domain.com/api/v1/batteries/IN-TAT-LFP-A3-X7K9M2P4"

# Check warranty
curl -H "Authorization: Bearer cai_your_key" \
     "https://domain.com/api/v1/warranty/lookup?channel=bpan&value=IN-TAT-LFP-A3-X7K9M2P4"
```

See the [API Reference](./API_REFERENCE.md) for complete endpoint documentation.

---

## 7. How to Connect an AI Agent via MCP

The MCP (Model Context Protocol) server allows AI agents to discover and invoke platform capabilities.

**Step 1:** Point your agent to the MCP endpoint: `https://your-domain.com/api/mcp`

**Step 2:** Initialize the connection:

```json
{ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {} }
```

**Step 3:** Discover available tools:

```json
{ "jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {} }
```

**Step 4:** Call tools as needed:

```json
{
  "jsonrpc": "2.0", "id": 3,
  "method": "tools/call",
  "params": { "name": "get_battery", "arguments": { "bpan": "IN-TAT-LFP-A3-X7K9M2P4" } }
}
```

See the [MCP Integration Guide](./MCP_GUIDE.md) for detailed setup instructions.

---

## 8. How to Create and Manage API Keys

API keys provide programmatic access to the REST API for microservices and external integrations.

**Creating an API Key:**

1. Log in as an admin and navigate to the platform settings
2. Go to the **API Keys** section
3. Click **Create New Key**
4. Configure the key:
   - **Name** — Descriptive name (e.g., "Production BMS Integration")
   - **Scopes** — Select which modules the key can access
   - **Rate Limit Tier** — free (10/min), standard (100/min), premium (500/min), enterprise (2000/min)
   - **Expiry** — Optional expiration date
5. Copy the generated key immediately — it is shown only once

**Revoking an API Key:**

1. Navigate to the API Keys section
2. Find the key to revoke
3. Click **Revoke** — the key is permanently invalidated

---

## 9. How to List a Battery on the Marketplace

The marketplace connects battery owners with buyers for second-life applications.

1. Navigate to **Marketplace** in the sidebar
2. Click **Create Listing**
3. Enter the battery's BPAN — the system auto-fills battery details and SOH
4. Select the listing type: Second Life, Recycling, or Refurbished
5. Set the asking price (INR) and add a description
6. Click **Create Listing**

The system automatically checks warranty status. Batteries with active warranties will receive a warning, as in-warranty batteries should typically go through the warranty claim process rather than being sold on the marketplace.

---

## 10. How to Generate an EPR Compliance Token

EPR tokens provide digital proof that recycling obligations have been met.

1. Navigate to **Compliance** > **EPR Tokens** in the sidebar
2. Click **Generate Token**
3. Enter the recycling details:
   - Battery BPAN
   - Recycler name and facility
   - Recycled weight (kg)
   - Material recovery data
4. Click **Generate** — the system creates a verifiable EPR token

---

## 11. How to Use the Super Admin Panel

The Super Admin panel provides system-wide oversight and monitoring.

1. Navigate to **Super Admin** in the sidebar (admin role required)
2. **System Overview** tab — View server health, memory usage, MQTT status, and action statistics
3. **Agent Actions** tab — Filter and search the agent action log by actor type, module, and status
4. **Live Activity** tab — Real-time feed of platform operations

---

## 12. How to Export Audit Logs for Compliance

Audit logs can be exported for compliance audits and external SIEM integration.

**Via the Platform:**

1. Navigate to **Super Admin** > **System Overview**
2. View audit statistics and recent activity
3. Use the compliance router's export functionality for CSV export

**Via the REST API:**

```bash
curl -H "Authorization: Bearer cai_admin_key" \
     "https://domain.com/api/v1/compliance/audit-logs?from=2026-01-01&to=2026-03-31&limit=1000"
```

**Via tRPC:**

```typescript
const logs = await trpc.compliance.auditLogs.query({
  from: new Date('2026-01-01'),
  to: new Date('2026-03-31'),
  limit: 1000,
});
```
