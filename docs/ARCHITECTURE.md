# Circul-AI-r Architecture Documentation

**Version:** 1.0.0  
**Last Updated:** April 2026  
**Classification:** Internal

---

## System Architecture

Circul-AI-r follows a **modular monolith** architecture that provides the organizational benefits of microservices (clear module boundaries, independent data access layers) while maintaining the operational simplicity of a single deployment unit. The platform exposes three API protocols — tRPC (internal), REST (external), and MCP (AI agents) — all backed by the same business logic.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  React 19    │  │  Tailwind 4  │  │  shadcn/ui   │              │
│  │  SPA         │  │  Styling     │  │  Components  │              │
│  └──────┬───────┘  └──────────────┘  └──────────────┘              │
│         │                                                            │
│  ┌──────┴───────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  tRPC Client │  │  Socket.io   │  │  Wouter      │              │
│  │  (Type-safe) │  │  (Realtime)  │  │  (Routing)   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘              │
└─────────┼──────────────────┼────────────────────────────────────────┘
          │                  │
          │ HTTP/JSON        │ WebSocket
          │                  │
┌─────────┼──────────────────┼────────────────────────────────────────┐
│         │    SERVER LAYER  │                                         │
│         │                  │                                         │
│  ┌──────┴───────────────────┴──────────────────────────────────┐    │
│  │                    Express 4 Server                          │    │
│  │                                                              │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐            │    │
│  │  │  Security  │  │  CORS      │  │  Rate      │            │    │
│  │  │  Headers   │  │  Middleware │  │  Limiting  │            │    │
│  │  └────────────┘  └────────────┘  └────────────┘            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    API PROTOCOLS                               │   │
│  │                                                                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │  /api/trpc   │  │  /api/v1     │  │  /api/mcp    │       │   │
│  │  │  tRPC 11     │  │  REST/OpenAPI│  │  MCP JSON-RPC│       │   │
│  │  │  Internal    │  │  External    │  │  AI Agents   │       │   │
│  │  │  Type-safe   │  │  API Key Auth│  │  20 Tools    │       │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │   │
│  │         └─────────────────┼─────────────────┘                │   │
│  └───────────────────────────┼──────────────────────────────────┘   │
│                              │                                       │
│  ┌───────────────────────────┼──────────────────────────────────┐   │
│  │                 BUSINESS LOGIC LAYER                           │   │
│  │                                                                │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │   │
│  │  │  BPAN  │ │Warranty│ │Marketpl│ │Complnce│ │ Agent  │    │   │
│  │  │ Module │ │ Module │ │ Module │ │ Module │ │ Module │    │   │
│  │  └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘    │   │
│  │       └──────────┼──────────┼──────────┼──────────┘          │   │
│  └──────────────────┼──────────┼──────────┼─────────────────────┘   │
│                     │          │          │                           │
│  ┌──────────────────┼──────────┼──────────┼─────────────────────┐   │
│  │           DATA ACCESS LAYER (Drizzle ORM)                     │   │
│  │                                                                │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐              │   │
│  │  │  db.ts     │  │ db-warranty│  │  db-agent   │              │   │
│  │  │  (Core)    │  │  (Warranty)│  │  (Agent)    │              │   │
│  │  └────────────┘  └────────────┘  └────────────┘              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              CROSS-CUTTING CONCERNS                            │   │
│  │                                                                │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐              │   │
│  │  │  Audit Log │  │ Structured │  │  Security  │              │   │
│  │  │ (ISO27001) │  │  Logger    │  │  Events    │              │   │
│  │  └────────────┘  └────────────┘  └────────────┘              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                               │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  MySQL   │  │    S3    │  │   MQTT   │  │ Socket.io│           │
│  │ (TiDB)   │  │ Storage  │  │  Broker  │  │ Realtime │           │
│  │          │  │          │  │          │  │          │           │
│  │ 16 Tables│  │ Files &  │  │ IoT      │  │ Live     │           │
│  │ Drizzle  │  │ Documents│  │ Telemetry│  │ Updates  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module Boundaries

Each module owns its data access layer and business logic. Modules communicate through shared database access (via Drizzle ORM) rather than inter-service calls, which eliminates network latency and distributed transaction complexity.

| Module | Files | Tables | Responsibilities |
|---|---|---|---|
| **BPAN** | db.ts, routers.ts | batteries, telemetry_data, soh_predictions, carbon_footprints | Battery registration, BPAN generation, telemetry, SOH |
| **Warranty** | db-warranty.ts, routers.ts | warranty_records | Warranty registration, lookup, claims, status engine |
| **Marketplace** | db.ts, routers.ts | marketplace_listings | Second-life listings, pricing, warranty gates |
| **Compliance** | compliance.ts, routers.ts | audit_logs, epr_tokens | Audit logging, EPR tokens, security events |
| **Agent** | db-agent.ts, routers.ts | agent_actions | Agent action logging, execution, batch operations |
| **Logistics** | db.ts, routers.ts | shipments | Shipment tracking, status updates |
| **Admin** | routers.ts | users, api_keys | User management, API key lifecycle |
| **API Gateway** | apiGateway.ts | — | REST API, OpenAPI spec, rate limiting |
| **MCP Server** | mcpServer.ts | — | MCP protocol, tool/resource/prompt handlers |

---

## Database Schema

The platform uses 16 tables organized by module:

### Core Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | Platform users | id, openId, name, email, role (admin/user) |
| `batteries` | Battery registry | id, bpan, manufacturer, chemistry, capacityKwh, status |
| `telemetry_data` | IoT telemetry | id, bpan, voltage, current, temperature, soc, cycleCount |
| `soh_predictions` | AI predictions | id, bpan, predictedSoh, rulCycles, triageRecommendation |

### Warranty Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `warranty_records` | Warranty registrations | id, bpan, customerName, customerPhone, customerEmail, customerWhatsApp, warrantyType, status |

### Marketplace Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `marketplace_listings` | Second-life listings | id, batteryId, listingType, priceInr, status |

### Compliance Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `audit_logs` | Audit trail | id, traceId, actorType, action, module, dataClassification, status |
| `epr_tokens` | EPR compliance | id, batteryId, recyclerName, recycledWeightKg, status |
| `carbon_footprints` | Carbon declarations | id, batteryId, totalCo2Kg, methodology, performanceClass |

### Operations Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `agent_actions` | Agent tracking | id, actorType, action, module, status |
| `api_keys` | API key management | id, name, keyHash, scopes, rateLimitTier, status |
| `shipments` | Logistics | id, batteryId, fromLocation, toLocation, status |
| `alerts` | Alert system | id, bpan, alertType, severity, status |
| `bulk_onboarding_jobs` | Batch imports | id, totalBatteries, successCount, status |

---

## API Protocol Comparison

| Aspect | tRPC (/api/trpc) | REST (/api/v1) | MCP (/api/mcp) |
|---|---|---|---|
| **Use Case** | Frontend, internal services | External microservices | AI agents |
| **Auth** | OAuth session cookie | API key (Bearer token) | None (public) |
| **Type Safety** | End-to-end TypeScript | OpenAPI 3.1 spec | JSON Schema |
| **Transport** | HTTP POST | HTTP GET/POST | JSON-RPC 2.0 |
| **Rate Limiting** | Session-based | Tier-based (10-2000/min) | None |
| **Documentation** | TypeScript types | Swagger UI | tools/list |
| **Serialization** | Superjson | JSON | JSON |

---

## Security Architecture

### Authentication Flow

```
User → Login Page → Manus OAuth → Callback → JWT Session Cookie → Protected Procedures
```

### API Key Flow

```
Client → Authorization Header → API Gateway → Key Validation → Scope Check → Rate Limit → Handler
```

### Defense Layers

| Layer | Implementation |
|---|---|
| **Transport** | TLS encryption (HTTPS) |
| **Headers** | Helmet.js security headers (CSP, HSTS, X-Frame-Options) |
| **Rate Limiting** | express-rate-limit with tiered limits |
| **Input Validation** | Zod schemas on all tRPC procedures |
| **Authentication** | JWT sessions (tRPC), API keys (REST) |
| **Authorization** | Role-based (admin/user), scope-based (API keys) |
| **Audit** | Comprehensive audit logging for all operations |
| **Monitoring** | Security event classification and alerting |

---

## Deployment Architecture

The platform is deployed as a single Node.js process that serves both the API server and the React SPA. This simplifies deployment and reduces infrastructure complexity.

**Runtime Requirements:**

| Component | Requirement |
|---|---|
| Node.js | 22.x LTS |
| Database | MySQL 8.0+ or TiDB |
| Storage | S3-compatible object storage |
| MQTT Broker | MQTT 3.1.1+ (optional, for IoT) |

**Environment Variables:**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing secret |
| `VITE_APP_ID` | OAuth application ID |
| `OAUTH_SERVER_URL` | OAuth backend URL |
| `MQTT_BROKER_URL` | MQTT broker connection (optional) |
| `MQTT_USERNAME` | MQTT authentication (optional) |
| `MQTT_PASSWORD` | MQTT authentication (optional) |
| `MQTT_TOPIC_PREFIX` | MQTT topic prefix (optional) |

---

## Scalability Considerations

### Horizontal Scaling

The modular monolith can be decomposed into independent microservices if scaling requirements demand it. Each module's data access layer is already isolated, making extraction straightforward:

1. **Battery Service** — BPAN registry, telemetry, SOH prediction
2. **Warranty Service** — Warranty registration, lookup, claims
3. **Marketplace Service** — Listings, pricing, transactions
4. **Compliance Service** — Audit logging, EPR tokens, security events
5. **Gateway Service** — REST API, MCP server, rate limiting

### Database Scaling

TiDB provides horizontal scaling for the database layer. For MySQL deployments, read replicas can be added for query-heavy modules (telemetry, analytics).

### IoT Scaling

MQTT broker can be clustered for high-volume telemetry ingestion. The platform's MQTT subscriber processes messages asynchronously, preventing backpressure on the main server.

---

## Monitoring & Observability

| Layer | Tool | Purpose |
|---|---|---|
| **Application** | Structured Logger | JSON-formatted logs with trace IDs |
| **Security** | Audit Logger | ISO 27001 compliant audit trail |
| **Performance** | Timer utilities | Request duration tracking |
| **Real-time** | Socket.io | Live telemetry and activity feeds |
| **Health** | /api/v1/health | System health check endpoint |
