# Circul-AI-r Architecture Documentation

**Version:** 1.0.0  
**Last Updated:** November 2026
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
│  │  │ (Trace IDs) │  │  Logger    │  │  Events    │              │   │
│  │  └────────────┘  └────────────┘  └────────────┘              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                               │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │PostgreSQL│  │    S3    │  │   MQTT   │  │ Socket.io│           │
│  │ (Render) │  │ Storage  │  │  Broker  │  │ Realtime │           │
│  │          │  │          │  │          │  │          │           │
│  │  Schema  │  │ Files &  │  │ IoT      │  │ Live     │           │
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

The PostgreSQL schema is defined in `drizzle/schema.ts`; the following tables are a module overview, not an exhaustive inventory. Use the schema for exact SQL identifiers and current columns:

### Core Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | Platform users | id, openId (local identifier), name, email, passwordHash, role (admin/user) |
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
| **Auth** | Email/password JWT session cookie | Scoped API key (Bearer token) | API key, with tool scope checks |
| **Type Safety** | End-to-end TypeScript | OpenAPI 3.1 spec | JSON Schema |
| **Transport** | HTTP GET queries / POST mutations | HTTP GET/POST | JSON-RPC 2.0 over HTTP |
| **Rate Limiting** | Shared API/IP limits | Shared API/IP + key-tier limits | Shared API/IP middleware; review key-limit enforcement |
| **Documentation** | TypeScript types | Swagger UI | tools/list |
| **Serialization** | Superjson | JSON | JSON |

---

## Security Architecture

### Authentication Flow

```
User → /login → POST /api/auth/login → bcrypt verification
     → 30-day JWT session cookie → Database user lookup → Protected Procedures
```

The session cookie is `app_session_id`, host-only and `HttpOnly`. Over HTTPS it is `Secure` with `SameSite=None`; local HTTP uses `SameSite=Lax`. Cross-origin API mutations are checked against trusted application origins. Logout clears the cookie but does not revoke a copied token. REST `/api/auth/me` returns 401 without a session; tRPC `auth.me` returns null.

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
| **Audit** | Audit and security event logging for instrumented operations; coverage must be reviewed |
| **Monitoring** | Security event classification and alerting |

---

## Deployment Architecture

The supported production target is a Render Node.js web service backed by Render PostgreSQL. A single process serves the Express API and React SPA. The root `render.yaml` builds with `pnpm install --frozen-lockfile && pnpm build`, starts `node dist/index.js`, and checks `/api/health`. Schema migrations are a separate reviewed operator step, not part of the web build.

**Runtime Requirements:**

| Component | Requirement |
|---|---|
| Node.js | 22.x LTS |
| Database | Render PostgreSQL (disposable PostgreSQL locally) |
| Storage | AWS S3 with server-side credentials, required for file features |
| MQTT Broker | MQTT 3.1.1+ (optional, for IoT) |

**Environment Variables:**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Explicit PostgreSQL URL for the intended environment |
| `JWT_SECRET` | Session cookie signing secret |
| `APP_URL` | Trusted application origin for recovery links (HTTPS in production) |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_IMAGE_MODEL` | Direct OpenAI models and project access |
| `ZEPTOMAIL_TOKEN`, `FROM_EMAIL`, `OWNER_EMAIL` | Direct ZeptoMail delivery and owner notifications |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | Direct AWS S3 file storage |
| `MQTT_BROKER_URL` | MQTT broker connection (optional) |
| `MQTT_USERNAME` | MQTT authentication (optional) |
| `MQTT_PASSWORD` | MQTT authentication (optional) |
| `MQTT_TOPIC_PREFIX` | MQTT topic prefix (optional) |

---

Provider integrations require separate accounts, sender/domain verification, storage permissions, and model/API access. OpenAI and S3 operations can fail when unconfigured; mail is best-effort and does not automatically fail over to another provider. See [Deployment Guide](../DEPLOYMENT.md) for configuration and S3 private-file limitations.

## Scalability Considerations

### Horizontal Scaling

The modular monolith can be decomposed into independent microservices if scaling requirements demand it. Each module's data access layer is already isolated, making extraction straightforward:

1. **Battery Service** — BPAN registry, telemetry, SOH prediction
2. **Warranty Service** — Warranty registration, lookup, claims
3. **Marketplace Service** — Listings, pricing, transactions
4. **Compliance Service** — Audit logging, EPR tokens, security events
5. **Gateway Service** — REST API, MCP server, rate limiting

### Database Scaling

Size the Render PostgreSQL plan for telemetry volume and retention. Consider indexing, partitioning, query optimization and connection-pool limits before scaling. Read replicas or service extraction require additional architecture work; they are not configured automatically by the current code.

### IoT Scaling

A broker may support clustering, but multiple application instances need explicit coordination to avoid duplicate MQTT ingestion. Socket.io state and simulations are process-local; horizontal web scaling requires a shared adapter/coordination design and load testing.

---

## Monitoring & Observability

| Layer | Tool | Purpose |
|---|---|---|
| **Application** | Structured Logger | JSON-formatted logs with trace IDs |
| **Security** | Audit Logger | Supporting audit evidence; not ISO 27001 certification |
| **Performance** | Timer utilities | Request duration tracking |
| **Real-time** | Socket.io | Live telemetry and activity feeds |
| **Health** | /api/health | PostgreSQL readiness (200 connected, 503 degraded); no external-provider checks |
