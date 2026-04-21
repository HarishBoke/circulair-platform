# API Reference — Circul-AI-r Platform

This document covers all available API endpoints: the tRPC procedure layer (used by the React frontend), the REST API v1 (for third-party integrations), and the MCP server (for AI agent access).

---

## Table of Contents

1. [Authentication](#authentication)
2. [tRPC Procedures](#trpc-procedures)
3. [REST API v1](#rest-api-v1)
4. [MCP Server](#mcp-server)
5. [WebSocket / Socket.io](#websocket--socketio)
6. [MQTT Telemetry Ingestion](#mqtt-telemetry-ingestion)
7. [Error Codes](#error-codes)

---

## Authentication

### Session Authentication (tRPC / Browser)

The browser frontend authenticates via a signed JWT cookie set at login. All `protectedProcedure` calls require this cookie to be present. The cookie is `HttpOnly`, `SameSite=Lax`, and is automatically included in all same-origin requests.

To obtain a session:

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "secret" }
```

Or redirect the user to the Manus OAuth portal via `getLoginUrl()` from `client/src/const.ts`.

### API Key Authentication (REST API v1)

Third-party integrations use Bearer token authentication on the REST API.

```http
GET /api/v1/batteries
Authorization: Bearer cai_live_xxxxxxxxxxxx
```

API keys are created via the Compliance Dashboard (`/compliance`) or the `compliance.apiKey.create` tRPC procedure. Keys are stored as SHA-256 hashes — the plaintext key is only shown once at creation time.

### Password Reset Flow

```http
# Step 1 — Request reset link
POST /api/auth/forgot-password
Content-Type: application/json
{ "email": "user@example.com" }

# Step 2 — Validate token (optional, called by ResetPassword page on mount)
GET /api/auth/reset-password/validate?token=<hex>

# Step 3 — Set new password
POST /api/auth/reset-password
Content-Type: application/json
{ "token": "<hex>", "password": "newPassword123" }
```

All three endpoints return HTTP 200 regardless of whether the email exists, to prevent email enumeration.

---

## tRPC Procedures

All tRPC procedures are available at `/api/trpc` via the tRPC HTTP batch link. In the React frontend, they are called using `trpc.<namespace>.<procedure>.useQuery()` or `.useMutation()`.

The auth level column uses the following notation:

- **public** — No authentication required
- **protected** — Valid session cookie required
- **admin** — Valid session cookie + `role = 'admin'` required

### `auth` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `auth.me` | query | public | Returns current user object or null |
| `auth.logout` | mutation | public | Clears session cookie |

### `bpan` namespace (Battery Registry)

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `bpan.list` | query | protected | List all batteries with filters |
| `bpan.get` | query | protected | Get battery by BPAN |
| `bpan.generate` | mutation | protected | Generate a new BPAN identifier |
| `bpan.decode` | query | public | Decode BPAN metadata |
| `bpan.updateStatus` | mutation | protected | Update battery lifecycle status |
| `bpan.stats` | query | protected | Battery count statistics |

### `telemetry` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `telemetry.ingest` | mutation | protected | Ingest a telemetry reading |
| `telemetry.simulate` | mutation | protected | Start/stop battery simulation |
| `telemetry.latest` | query | protected | Get latest reading for a BPAN |
| `telemetry.history` | query | protected | Get historical readings |
| `telemetry.thermalAnomalies` | query | protected | Detect thermal anomaly events |
| `telemetry.predictSoh` | mutation | protected | Run AI SOH prediction |
| `telemetry.getLatestPrediction` | query | protected | Get latest SOH prediction |
| `telemetry.predictionHistory` | query | protected | Get SOH prediction history |

### `marketplace` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `marketplace.list` | query | public | List active marketplace listings |
| `marketplace.getById` | query | public | Get listing by ID |
| `marketplace.stats` | query | protected | Marketplace KPI statistics |
| `marketplace.createListing` | mutation | protected | Create a new listing |
| `marketplace.update` | mutation | protected | Update an existing listing |
| `marketplace.withdraw` | mutation | protected | Withdraw a listing |
| `marketplace.purchase` | mutation | protected | Mark listing as purchased |
| `marketplace.uploadPhoto` | mutation | protected | Upload listing photo to S3 |
| `marketplace.getPhotos` | query | protected | Get photos for a listing |
| `marketplace.deletePhoto` | mutation | protected | Delete a listing photo |
| `marketplace.myListings` | query | protected | Get current user's listings |
| `marketplace.myBatteries` | query | protected | Get batteries owned by current user |
| `marketplace.requestPickup` | mutation | protected | Request logistics pickup |
| `marketplace.makeOffer` | mutation | protected | Submit an offer on a listing |

### `logistics` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `logistics.list` | query | protected | List shipments |
| `logistics.updateStatus` | mutation | protected | Update shipment status |
| `logistics.verifyYield` | mutation | protected | Record yield verification result |

### `epr` namespace (Extended Producer Responsibility)

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `epr.listTokens` | query | protected | List EPR tokens for current user |
| `epr.allTokens` | query | protected | List all EPR tokens (admin view) |
| `epr.stats` | query | protected | EPR statistics |

### `alerts` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `alerts.list` | query | protected | List alerts with filters |
| `alerts.listAll` | query | protected | List all alerts |
| `alerts.markRead` | mutation | protected | Mark alert as read |
| `alerts.unreadCount` | query | protected | Get unread alert count |

### `documents` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `documents.upload` | mutation | protected | Upload a document to S3 |
| `documents.list` | query | protected | List documents for a battery |
| `documents.listAll` | query | protected | List all documents |

### `serviceHistory` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `serviceHistory.addRecord` | mutation | protected | Add a service record |
| `serviceHistory.history` | query | protected | Get service history for a battery |

### `aiAssistant` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `aiAssistant.createSession` | mutation | protected | Create a new chat session |
| `aiAssistant.getSessions` | query | protected | List chat sessions |
| `aiAssistant.getMessages` | query | protected | Get messages in a session |
| `aiAssistant.chat` | mutation | protected | Send a message and get AI response |

### `feedback` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `feedback.log` | mutation | public | Submit user feedback |

### `analytics` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `analytics.kpis` | query | protected | Platform KPI dashboard data |
| `analytics.batteryStats` | query | protected | Battery count and status breakdown |
| `analytics.marketStats` | query | protected | Marketplace activity statistics |
| `analytics.eprStats` | query | protected | EPR token statistics |
| `analytics.monthlyActivity` | query | protected | Monthly battery registration trend |
| `analytics.sohDistribution` | query | protected | SOH histogram data |
| `analytics.sohTrend` | query | protected | SOH trend over time |
| `analytics.chemistryDistribution` | query | protected | Chemistry type breakdown |
| `analytics.triageDistribution` | query | protected | Triage recommendation breakdown |
| `analytics.marketplaceWeekly` | query | protected | Weekly marketplace activity |

### `admin` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `admin.users` | query | admin | List all users |
| `admin.listUsers` | query | admin | List users with pagination |
| `admin.roleStats` | query | admin | User role distribution |
| `admin.updateUserRole` | mutation | admin | Promote/demote user role |
| `admin.auditLog` | query | admin | View audit log entries |

### `mqtt` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `mqtt.status` | query | protected | MQTT subscriber connection status |
| `mqtt.connect` | mutation | protected | Connect to MQTT broker |
| `mqtt.disconnect` | mutation | protected | Disconnect from MQTT broker |
| `mqtt.testPublish` | mutation | protected | Publish a test message |
| `mqtt.publish` | mutation | protected | Publish a telemetry message |
| `mqtt.startStream` | mutation | protected | Start simulated MQTT stream |
| `mqtt.stopStream` | mutation | protected | Stop simulated MQTT stream |
| `mqtt.startDemo` | mutation | protected | Start demo mode simulation |
| `mqtt.stopDemo` | mutation | protected | Stop demo mode simulation |
| `mqtt.demoStatus` | query | protected | Get demo mode status |

### `reports` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `reports.healthPassport` | mutation | protected | Generate battery health passport PDF |
| `reports.cpcbReport` | mutation | protected | Generate CPCB compliance report |
| `reports.listReports` | query | protected | List generated reports |
| `reports.eprComplianceReport` | mutation | protected | Generate EPR compliance report PDF |
| `reports.batteryComplianceCert` | mutation | protected | Generate battery compliance certificate PDF |

### `deviceProfile` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `deviceProfile.getProfiles` | query | protected | List device profiles |
| `deviceProfile.getProfile` | query | protected | Get a device profile by ID |
| `deviceProfile.upsertProfile` | mutation | protected | Create or update a device profile |

### `euPassport` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `euPassport.getEuPassport` | query | public | Get EU Battery Passport data by BPAN |
| `euPassport.declareCarbonFootprint` | mutation | protected | Declare carbon footprint data |
| `euPassport.getCarbonFootprint` | query | protected | Get carbon footprint declaration |
| `euPassport.getCarbonFootprintByBpan` | query | protected | Get carbon footprint by BPAN |
| `euPassport.declareRecycledContent` | mutation | protected | Declare recycled content |
| `euPassport.getRecycledContentByBpan` | query | protected | Get recycled content by BPAN |
| `euPassport.getRecycledContentHistory` | query | protected | Get recycled content history |

### `platformSettings` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `platformSettings.get` | query | protected | Get current user's platform settings |
| `platformSettings.save` | mutation | protected | Save platform settings |
| `platformSettings.getGlobal` | query | admin | Get global platform settings |
| `platformSettings.saveGlobal` | mutation | admin | Save global platform settings |

### `agent` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `agent.logAction` | mutation | protected | Log an agent action |
| `agent.execute` | mutation | protected | Execute an AI agent action |
| `agent.batchExecute` | mutation | protected | Execute multiple agent actions |
| `agent.capabilities` | query | public | List available agent capabilities |
| `agent.listActions` | query | admin | List all agent actions |
| `agent.stats` | query | admin | Agent action statistics |
| `agent.recentActivity` | query | admin | Recent agent activity |
| `agent.systemHealth` | query | admin | System health metrics |

### `warranty` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `warranty.register` | mutation | protected | Register a warranty |
| `warranty.getByBpan` | query | public | Get warranty by BPAN |
| `warranty.getById` | query | protected | Get warranty by ID |
| `warranty.lookup` | query | public | Public warranty lookup |
| `warranty.list` | query | protected | List warranties |
| `warranty.updateStatus` | mutation | protected | Update warranty status |
| `warranty.stats` | query | protected | Warranty statistics |
| `warranty.submitClaim` | mutation | protected | Submit a warranty claim |
| `warranty.listClaims` | query | protected | List warranty claims |
| `warranty.updateClaimStatus` | mutation | admin | Update claim status |

### `bulkOnboarding` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `bulkOnboarding.bulkImport` | mutation | protected | Bulk import batteries from CSV |
| `bulkOnboarding.getJob` | query | protected | Get import job status |
| `bulkOnboarding.listJobs` | query | protected | List import jobs |

### `compliance` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `compliance.auditLogs` | query | admin | Query audit log entries |
| `compliance.auditStats` | query | admin | Audit log statistics |
| `compliance.securityEvents` | query | admin | Query security events |
| `compliance.securityStats` | query | admin | Security event statistics |
| `compliance.dataClassificationMap` | query | admin | Data classification mapping |
| `compliance.accessControlMatrix` | query | admin | Access control matrix |
| `compliance.exportAuditLog` | mutation | admin | Export audit log as CSV |
| `compliance.apiKey.create` | mutation | admin | Create an API key |
| `compliance.apiKey.list` | query | admin | List API keys |
| `compliance.apiKey.revoke` | mutation | admin | Revoke an API key |
| `compliance.apiKey.usageStats` | query | admin | API key usage statistics |

### `wiki` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `wiki.chat` | mutation | public | Chat with the Circul Wiki AI |

### `webhook` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `webhook.create` | mutation | protected | Register a webhook endpoint |
| `webhook.list` | query | protected | List registered webhooks |
| `webhook.delete` | mutation | protected | Delete a webhook |

### `feedbackReview` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `feedbackReview.submit` | mutation | protected | Submit feedback |
| `feedbackReview.list` | query | admin | List all feedback |
| `feedbackReview.stats` | query | admin | Feedback statistics |
| `feedbackReview.articleStats` | query | protected | Article-level feedback stats |
| `feedbackReview.review` | mutation | admin | Review/resolve feedback |

### `tutorial` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `tutorial.progress` | query | protected | Get onboarding progress |
| `tutorial.complete` | mutation | protected | Mark a tutorial step complete |
| `tutorial.reset` | mutation | protected | Reset tutorial progress |
| `tutorial.steps` | query | public | List tutorial steps |
| `tutorial.stats` | query | admin | Tutorial completion statistics |

### `iotDevice` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `iotDevice.register` | mutation | protected | Register an IoT device |
| `iotDevice.list` | query | protected | List registered devices |
| `iotDevice.get` | query | protected | Get device by ID |
| `iotDevice.update` | mutation | protected | Update device metadata |
| `iotDevice.regenerateCredentials` | mutation | protected | Regenerate MQTT credentials |
| `iotDevice.delete` | mutation | protected | Delete a device |
| `iotDevice.stats` | query | protected | IoT device statistics |

### `system` namespace

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `system.notifyOwner` | mutation | protected | Send notification to platform owner |

---

## REST API v1

The REST API is available at `/api/v1` and is documented via Swagger UI at `/api/docs`. All endpoints require an API key in the `Authorization: Bearer <key>` header.

### Batteries

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/batteries` | List batteries (paginated, filterable) |
| `GET` | `/api/v1/batteries/:bpan` | Get battery details by BPAN |
| `GET` | `/api/v1/batteries/:bpan/telemetry` | Get latest telemetry reading |
| `GET` | `/api/v1/batteries/:bpan/telemetry/history` | Get telemetry history |
| `GET` | `/api/v1/batteries/:bpan/soh` | Get latest SOH prediction |

### Telemetry

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/telemetry` | Ingest a telemetry reading |

**Request body:**
```json
{
  "bpan": "CAI-EU-NMC-20240101-ABCD1234",
  "voltage": 48.2,
  "current": -12.5,
  "temperature": 28.3,
  "soc": 0.82,
  "soh": 0.94,
  "cycleCount": 142,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Marketplace

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/marketplace` | List active marketplace listings |
| `GET` | `/api/v1/marketplace/stats` | Marketplace statistics |

### EPR

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/epr` | List EPR tokens |
| `GET` | `/api/v1/epr/stats` | EPR statistics |

### Platform

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/stats` | Platform KPI summary |

### Response Format

All REST API responses follow a consistent envelope:

```json
{
  "data": { ... },
  "meta": {
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

Error responses:

```json
{
  "error": "not_found",
  "message": "Battery with BPAN 'CAI-XX-NMC-...' not found",
  "traceId": "cai-abc123xyz"
}
```

---

## MCP Server

The Model Context Protocol server at `/api/mcp` allows AI agents to discover and invoke platform capabilities using the standard MCP tool specification.

### Discovering Tools

```http
GET /api/mcp/tools
```

Returns a JSON array of available tools with their input schemas.

### Invoking a Tool

```http
POST /api/mcp/invoke
Content-Type: application/json

{
  "tool": "get_battery",
  "input": { "bpan": "CAI-EU-NMC-20240101-ABCD1234" }
}
```

### Available MCP Tools

| Tool | Description |
|---|---|
| `get_battery` | Retrieve battery details by BPAN |
| `list_batteries` | List batteries with optional filters |
| `get_telemetry` | Get latest telemetry for a battery |
| `get_telemetry_history` | Get historical telemetry readings |
| `get_soh_prediction` | Get latest SOH/RUL prediction |
| `list_marketplace` | List marketplace listings |
| `get_marketplace_stats` | Get marketplace statistics |
| `list_epr_tokens` | List EPR compliance tokens |
| `get_epr_stats` | Get EPR statistics |
| `get_battery_stats` | Get platform battery statistics |
| `lookup_warranty` | Look up warranty by BPAN |
| `list_warranties` | List warranty records |
| `get_warranty_stats` | Get warranty statistics |
| `get_platform_kpis` | Get platform KPI summary |

---

## WebSocket / Socket.io

Real-time telemetry is pushed to the browser via Socket.io at the `/telemetry` namespace.

### Connecting

```javascript
import { io } from "socket.io-client";
const socket = io("/telemetry");
```

### Subscribing to a Battery

```javascript
// Subscribe to real-time updates for a specific BPAN
socket.emit("subscribe", "CAI-EU-NMC-20240101-ABCD1234");

// Receive telemetry readings
socket.on("telemetry", (reading) => {
  console.log(reading.voltage, reading.soc, reading.temperature);
});

// Receive SOH prediction updates
socket.on("soh_update", (prediction) => {
  console.log(prediction.soh, prediction.rul);
});
```

### Unsubscribing

```javascript
socket.emit("unsubscribe", "CAI-EU-NMC-20240101-ABCD1234");
```

---

## MQTT Telemetry Ingestion

IoT devices publish telemetry to the MQTT broker using the topic pattern:

```
{MQTT_TOPIC_PREFIX}/{bpan}
```

For example, with `MQTT_TOPIC_PREFIX=CAI_`:

```
CAI_/CAI-EU-NMC-20240101-ABCD1234
```

### Payload Format

```json
{
  "voltage": 48.2,
  "current": -12.5,
  "temperature": 28.3,
  "soc": 0.82,
  "soh": 0.94,
  "cycleCount": 142,
  "ts": 1705312200000
}
```

The `ts` field is a Unix timestamp in milliseconds. If omitted, the server uses the ingestion time.

### Connection Details

| Parameter | Value |
|---|---|
| Protocol | MQTT over TLS (`mqtts://`) |
| Port | 8883 |
| QoS | 1 (at least once) |
| Authentication | Username + password |
| TLS | Required in production |

---

## Error Codes

### tRPC Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` (10001) | 401 | No valid session — redirect to login |
| `FORBIDDEN` | 403 | Insufficient role (admin required) |
| `NOT_FOUND` | 404 | Resource does not exist |
| `BAD_REQUEST` | 400 | Invalid input — check Zod validation errors |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |

### REST API Error Codes

| Code | Description |
|---|---|
| `unauthorized` | Missing or invalid API key |
| `forbidden` | API key does not have permission for this operation |
| `not_found` | Requested resource does not exist |
| `validation_error` | Request body failed schema validation |
| `rate_limited` | Too many requests — back off and retry |
| `internal_error` | Unexpected server error — include `traceId` in support requests |
