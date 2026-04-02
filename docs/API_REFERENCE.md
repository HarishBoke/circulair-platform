# Circul-AI-r API Reference

**Version:** v1  
**Base URL:** `/api/v1`  
**Authentication:** Bearer token (API key)  
**Interactive Docs:** `/api/docs` (Swagger UI)

---

## Authentication

All API endpoints (except `/health`, `/openapi.json`, and `/docs`) require authentication via API key.

```bash
curl -H "Authorization: Bearer cai_your_api_key_here" \
     https://your-domain.com/api/v1/batteries
```

API keys are managed through the platform admin panel. Each key has:

| Property | Description |
|---|---|
| **Scopes** | Which modules/actions the key can access |
| **Rate Limit Tier** | free (10/min), standard (100/min), premium (500/min), enterprise (2000/min) |
| **Expiry** | Optional expiration date |
| **Status** | active, revoked, or expired |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 1712025600
X-Trace-Id: cai-abc123def456
X-API-Version: v1
```

---

## Response Format

All responses use JSON. Successful responses return the data directly. Error responses follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable error description"
}
```

| Status Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request — missing or invalid parameters |
| 401 | Unauthorized — missing or invalid API key |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Endpoints

### System

#### `GET /health`

Health check endpoint. No authentication required.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-04-02T12:00:00.000Z"
}
```

#### `GET /openapi.json`

OpenAPI 3.1 specification. No authentication required.

#### `GET /docs`

Swagger UI interactive documentation. No authentication required.

---

### Batteries

#### `GET /batteries`

List registered batteries with optional filtering.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 0 | Page number (0-indexed) |
| `limit` | integer | 20 | Results per page (max 100) |
| `search` | string | — | Search by BPAN, manufacturer, or model |
| `status` | string | — | Filter: operational, second_life, end_of_life, in_transit, recycling |
| `chemistry` | string | — | Filter: NMC, LFP, NCA, LCO, LMO, LMFP, Na-ion, Solid-state |

**Example:**
```bash
curl -H "Authorization: Bearer cai_xxx" \
     "https://domain.com/api/v1/batteries?status=operational&chemistry=LFP&limit=10"
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "bpan": "IN-TAT-LFP-A3-X7K9M2P4",
      "manufacturer": "Tata AutoComp",
      "chemistry": "LFP",
      "capacityKwh": "3.5",
      "currentSoh": "92.5",
      "status": "operational",
      "createdAt": "2026-01-15T10:30:00.000Z"
    }
  ],
  "total": 150
}
```

#### `GET /batteries/:bpan`

Get detailed battery information by BPAN.

**Example:**
```bash
curl -H "Authorization: Bearer cai_xxx" \
     "https://domain.com/api/v1/batteries/IN-TAT-LFP-A3-X7K9M2P4"
```

#### `GET /batteries/:bpan/telemetry`

Get latest telemetry and history for a battery.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 50 | Max history records (max 500) |

**Response:**
```json
{
  "latest": {
    "bpan": "IN-TAT-LFP-A3-X7K9M2P4",
    "voltage": "3.28",
    "current": "12.5",
    "temperature": "32.1",
    "soc": "78",
    "cycleCount": 450,
    "internalResistance": "0.045",
    "createdAt": "2026-04-02T12:00:00.000Z"
  },
  "history": [...]
}
```

#### `GET /batteries/:bpan/soh`

Get the latest AI-powered SOH prediction.

**Response:**
```json
{
  "predictedSoh": "87.3",
  "confidenceLow": "85.1",
  "confidenceHigh": "89.5",
  "rulCycles": 1200,
  "triageRecommendation": "continue_operation",
  "modelVersion": "v2.1",
  "createdAt": "2026-04-02T12:00:00.000Z"
}
```

#### `GET /batteries/:bpan/warranty`

Get warranty records for a battery with computed status.

**Response:**
```json
[
  {
    "id": 42,
    "bpan": "IN-TAT-LFP-A3-X7K9M2P4",
    "customerName": "Rajesh Kumar",
    "warrantyType": "standard",
    "coverageType": "standard",
    "warrantyStartDate": "2026-01-15T00:00:00.000Z",
    "warrantyEndDate": "2028-01-15T00:00:00.000Z",
    "effectiveStatus": "active",
    "daysRemaining": 654,
    "isInWarranty": true,
    "percentRemaining": 89.6
  }
]
```

---

### Warranty

#### `GET /warranty/lookup`

Multi-channel warranty lookup. Search by any customer contact method.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `channel` | string | Yes | bpan, serialNumber, phone, email, or whatsApp |
| `value` | string | Yes | Search value |

**Example:**
```bash
# Lookup by phone number
curl -H "Authorization: Bearer cai_xxx" \
     "https://domain.com/api/v1/warranty/lookup?channel=phone&value=+919876543210"

# Lookup by email
curl -H "Authorization: Bearer cai_xxx" \
     "https://domain.com/api/v1/warranty/lookup?channel=email&value=customer@example.com"
```

#### `GET /warranty/stats`

Get warranty statistics.

**Response:**
```json
{
  "total": 1250,
  "active": 980,
  "expired": 200,
  "claimed": 45,
  "voided": 25,
  "averageTermMonths": 24,
  "claimRate": "3.6%"
}
```

---

### Marketplace

#### `GET /marketplace`

List second-life battery marketplace listings.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 0 | Page number |
| `limit` | integer | 20 | Results per page (max 100) |
| `listingType` | string | — | Filter: second_life, recycling, refurbished |

#### `GET /marketplace/stats`

Get marketplace statistics.

---

### Compliance

#### `GET /compliance/epr`

List EPR compliance tokens.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 20 | Results per page (max 100) |

#### `GET /compliance/epr/stats`

Get EPR compliance statistics.

---

### Analytics

#### `GET /stats/batteries`

Get fleet-wide battery statistics.

**Response:**
```json
{
  "total": 5000,
  "byChemistry": { "LFP": 2500, "NMC": 1800, "NCA": 700 },
  "byStatus": { "operational": 3500, "second_life": 800, "recycling": 200 },
  "averageSoh": 82.4
}
```

---

## tRPC API (Internal)

For frontend and internal service communication, the platform uses tRPC at `/api/trpc`. This provides end-to-end type safety with TypeScript. Available routers:

| Router | Procedures | Description |
|---|---|---|
| `auth` | me, logout | Authentication state |
| `bpan` | generate, list, get, validate, updateStatus | Battery passport management |
| `telemetry` | ingest, latest, history, thermalAnomalies | IoT telemetry |
| `soh` | predict, latest, history | AI SOH prediction |
| `marketplace` | createListing, list, getStats | Second-life marketplace |
| `logistics` | create, list, updateStatus | Shipment tracking |
| `epr` | createToken, list, stats | EPR compliance |
| `warranty` | register, lookup, list, stats, claim, updateStatus | Warranty management |
| `onboarding` | bulkImport, listJobs | Bulk battery onboarding |
| `agent` | logAction, execute, batchExecute, listActions, stats, recentActivity, systemHealth, capabilities | Agent operations |
| `compliance` | auditLogs, auditStats, securityEvents, securityStats, exportAuditLog | Compliance monitoring |
| `apiKey` | create, list, revoke, usageStats | API key management |
| `webhook` | create, list, delete | Webhook subscriptions |
| `admin` | listUsers, updateUserRole, roleStats, roleAuditLog | User administration |
| `analytics` | kpis | Platform KPIs |

---

## Webhooks

Subscribe to platform events for real-time notifications. Webhook payloads are signed with HMAC-SHA256 for verification.

**Payload format:**
```json
{
  "event": "battery.registered",
  "data": { ... },
  "timestamp": "2026-04-02T12:00:00.000Z"
}
```

**Verification:**
```javascript
const crypto = require('crypto');
const signature = crypto.createHmac('sha256', webhookSecret)
  .update(requestBody)
  .digest('hex');
const isValid = signature === req.headers['x-webhook-signature'];
```

**Available events:** battery.registered, battery.status_changed, warranty.registered, warranty.claimed, warranty.expired, marketplace.listing_created, epr.token_created, telemetry.anomaly_detected, soh.prediction_generated

---

## Error Codes

| Code | Description |
|---|---|
| `unauthorized` | Missing or invalid API key |
| `not_found` | Resource does not exist |
| `bad_request` | Missing or invalid parameters |
| `rate_limit_exceeded` | Too many requests |
| `internal_error` | Server-side error |
| `forbidden` | Insufficient permissions for this action |
