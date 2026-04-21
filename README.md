# Circul-AI-r — Battery Intelligence Platform

> **The Operating System for Battery Circular Economy**
>
> End-to-end traceability from cell to pack, AI-driven health prediction, real-time IoT telemetry, and regulatory compliance across 7 jurisdictions — all in one unified platform.

**Live domain:** [circulair.energy](https://circulair.energy) | **Staging:** [circulai-su7xgbwd.manus.space](https://circulai-su7xgbwd.manus.space)

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Quick Start (Local Development)](#quick-start-local-development)
5. [Environment Variables](#environment-variables)
6. [Database Schema](#database-schema)
7. [Authentication & Security](#authentication--security)
8. [API Reference](#api-reference)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Regulatory Compliance](#regulatory-compliance)
12. [Internationalisation](#internationalisation)
13. [Contributing](#contributing)

---

## Platform Overview

Circul-AI-r is a multinational battery lifecycle management platform designed for manufacturers, fleet operators, recyclers, and regulators. It tracks every battery from cell assembly through deployment, real-time monitoring, secondary-life marketplace trading, and end-of-life recycling — generating the digital documentation required by the EU Battery Regulation (2023/1542), India BIS standards, and five additional jurisdictions.

### Core Modules

| Module | Route | Description |
|---|---|---|
| **Battery Registry** | `/batteries` | BPAN-keyed battery passport, cell chemistry, manufacturer data |
| **Real-time Telemetry** | `/telemetry` | IoT data ingestion via MQTT, WebSocket streaming to dashboard |
| **AI SOH Prediction** | `/ai-soh` | ML-based State-of-Health and Remaining Useful Life forecasting |
| **Marketplace** | `/marketplace` | Secondary-life B2B/B2C listing, offer management, condition reports |
| **EPR Compliance** | `/epr-compliance` | Extended Producer Responsibility token issuance and tracking |
| **EU Battery Passport** | `/passport/EU/:id` | Public-facing digital battery passport (EU Regulation Art. 77) |
| **Warranty Management** | `/warranty` | Warranty registration, claims, and status lookup |
| **Logistics** | `/logistics` | Shipment tracking and chain-of-custody records |
| **Analytics** | `/analytics` | KPI dashboards, carbon footprint, yield verification |
| **Compliance Dashboard** | `/compliance` | Audit logs, API key management, security events |
| **AI Assistant** | `/assistant` | LLM-powered battery intelligence chat |
| **Admin Panel** | `/admin/*` | User management, feedback review, super-admin tools |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        circulair.energy                         │
│                   (Manus Hosted — CDN + TLS)                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│                    Express 4 Server (Node.js)                   │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  tRPC v11   │  │  REST API v1 │  │   MCP Server           │ │
│  │  /api/trpc  │  │  /api/v1/*   │  │   /api/mcp/*           │ │
│  │  (typed RPC)│  │  (OpenAPI)   │  │   (AI agent bridge)    │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Auth Layer                            │   │
│  │  Manus OAuth  ·  JWT cookies  ·  bcrypt passwords       │   │
│  │  Rate limiting  ·  Helmet headers  ·  CORS              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MQTT Subscriber (real-time IoT)            │   │
│  │  emqxsl broker  ·  TLS  ·  topic: CAI_/{bpan}          │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐  ┌──────────────┐  ┌──────────┐
   │  TiDB/MySQL │  │  S3 Storage  │  │  Resend  │
   │  (database) │  │  (files)     │  │  (email) │
   └─────────────┘  └──────────────┘  └──────────┘
```

**Frontend** is a React 19 SPA served by Vite in development and as static files in production. All data access goes through tRPC hooks — no raw `fetch` calls in application code.

**Real-time telemetry** flows from IoT devices → MQTT broker → `mqttSubscriber.ts` → database + Socket.io broadcast → React dashboard.

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19 |
| Styling | Tailwind CSS | 4 |
| Component library | shadcn/ui | latest |
| RPC layer | tRPC | 11 |
| Backend framework | Express | 4 |
| Database ORM | Drizzle ORM | latest |
| Database | TiDB (MySQL-compatible) | cloud |
| Real-time | Socket.io | 4 |
| IoT messaging | MQTT (emqxsl) | mqttjs |
| Authentication | Manus OAuth + JWT + bcrypt | — |
| Email | Resend | 6.10 |
| File storage | S3 (Manus built-in) | — |
| Build tool | Vite | 6 |
| Runtime | Node.js | 22 |
| Language | TypeScript | 5 |
| Testing | Vitest | 3 |
| Serialisation | SuperJSON | 2 |

---

## Quick Start (Local Development)

### Prerequisites

Node.js 22+, pnpm 10+, and access to the required environment variables (see below).

```bash
# 1. Clone the repository
git clone https://github.com/your-org/circulair-platform.git
cd circulair-platform

# 2. Install dependencies
pnpm install

# 3. Copy environment template and fill in values
cp .env.example .env
# Edit .env with your credentials

# 4. Push the database schema
pnpm db:push

# 5. Start the development server
pnpm dev
```

The server starts on `http://localhost:3000`. Vite HMR is active for the frontend.

### Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build frontend (Vite) + backend (esbuild) for production |
| `pnpm start` | Run the production build (`NODE_ENV=production`) |
| `pnpm test` | Run all 385 Vitest tests |
| `pnpm check` | TypeScript type-check without emitting |
| `pnpm format` | Prettier format all files |
| `pnpm db:push` | Generate and apply Drizzle migrations |

---

## Environment Variables

All secrets are injected at runtime by the Manus platform. For local development, create a `.env` file at the project root.

### Required — Platform Infrastructure

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing secret (min 32 chars) |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL (frontend) |
| `OWNER_OPEN_ID` | Platform owner's Manus Open ID |
| `OWNER_NAME` | Platform owner's display name |
| `BUILT_IN_FORGE_API_URL` | Manus built-in API base URL (server-side) |
| `BUILT_IN_FORGE_API_KEY` | Manus built-in API bearer token (server-side) |
| `VITE_FRONTEND_FORGE_API_URL` | Manus built-in API URL (frontend) |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus built-in API bearer token (frontend) |

### Required — Transactional Email

| Variable | Description | How to obtain |
|---|---|---|
| `RESEND_API_KEY` | Resend API key (starts with `re_`) | [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | Verified sender address | Verify domain in Resend dashboard |

### Required — IoT / MQTT

| Variable | Description |
|---|---|
| `MQTT_BROKER_URL` | MQTT broker URL (e.g. `mqtts://broker.example.com:8883`) |
| `MQTT_USERNAME` | MQTT broker username |
| `MQTT_PASSWORD` | MQTT broker password |
| `MQTT_TOPIC_PREFIX` | Topic namespace prefix (e.g. `CAI_`) |

### Optional — Analytics

| Variable | Description |
|---|---|
| `VITE_ANALYTICS_ENDPOINT` | Umami/Plausible analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website ID |

---

## Database Schema

The platform uses 35 Drizzle ORM tables across the following domains:

| Domain | Tables |
|---|---|
| **Users & Auth** | `users`, `password_reset_tokens` |
| **Battery Registry** | `batteries`, `battery_events`, `battery_cells`, `device_registry` |
| **Telemetry** | `telemetry_readings`, `soh_predictions` |
| **Marketplace** | `marketplace_listings`, `marketplace_offers` |
| **EPR** | `epr_tokens`, `epr_events` |
| **Warranty** | `warranty_records`, `warranty_claims` |
| **Logistics** | `logistics_shipments`, `logistics_events` |
| **Compliance** | `audit_logs`, `security_events`, `api_keys`, `api_usage_logs`, `webhooks` |
| **Alerts** | `alerts`, `alert_rules` |
| **Platform** | `platform_settings`, `feedback`, `wiki_articles` |

To apply schema changes:

```bash
pnpm db:push
# This runs: drizzle-kit generate && drizzle-kit migrate
```

> **Warning:** The database is not automatically backed up. Always export data before running destructive migrations in production.

---

## Authentication & Security

### Authentication Flows

The platform supports three authentication mechanisms:

**1. Manus OAuth (primary)** — Users click "Sign in with Manus" on the login page. The OAuth flow completes at `/api/oauth/callback` and sets a signed JWT session cookie.

**2. Email + Password** — Users register with an email and bcrypt-hashed password. Sessions are managed via the same JWT cookie mechanism.

**3. Password Reset** — A time-limited (15-minute) single-use token is generated and emailed via Resend. The reset link points to `/reset-password?token=<hex>`.

### Security Controls

| Control | Implementation |
|---|---|
| **Security headers** | Helmet.js (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) |
| **Rate limiting** | 120 req/min on `/api/*`; 20 req/15min on `/api/auth/*` |
| **Password hashing** | bcrypt with 12 rounds |
| **Session tokens** | JWT signed with `JWT_SECRET`, 1-year expiry, `HttpOnly` + `SameSite=Lax` cookies |
| **CSRF protection** | SameSite cookie policy + origin validation in OAuth state |
| **API key auth** | Bearer token auth on REST API v1, stored as SHA-256 hashes |
| **Audit logging** | ISO 27001 A.12.4 — all data access and mutations logged with trace IDs |
| **Role-based access** | `admin` / `user` roles; `adminProcedure` guards all admin tRPC procedures |
| **Email enumeration** | Forgot-password endpoint always returns 200 regardless of email existence |

### Role Management

To promote a user to admin, update the `role` field directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

---

## API Reference

### tRPC Procedures (`/api/trpc`)

All tRPC procedures are called via the React client using `trpc.*.useQuery()` or `trpc.*.useMutation()`. See `server/routers.ts` for the full procedure list. Key namespaces:

| Namespace | Procedures | Auth |
|---|---|---|
| `auth` | `me`, `logout`, `register`, `login` | mixed |
| `bpan` | `list`, `get`, `register`, `update`, `validate` | protected |
| `telemetry` | `latest`, `history`, `ingest`, `stats` | protected |
| `marketplace` | `list`, `get`, `createListing`, `makeOffer`, `getStats` | mixed |
| `epr` | `list`, `createToken`, `getStats`, `exportReport` | protected |
| `warranty` | `list`, `register`, `lookup`, `claim`, `getStats` | mixed |
| `alerts` | `list`, `acknowledge`, `getStats` | protected |
| `analytics` | `kpis`, `carbonFootprint`, `yieldVerification` | protected |
| `admin` | `listUsers`, `updateUserRole`, `auditLog` | admin only |
| `compliance` | `exportAuditLog`, `listApiKeys`, `createApiKey` | admin only |
| `agent` | `execute`, `batchExecute` | protected |
| `system` | `notifyOwner`, `getSettings`, `updateSettings` | mixed |

### REST API v1 (`/api/v1`)

A standard REST API is available for microservices and third-party integrations. Swagger UI is served at `/api/docs`.

Authentication: `Authorization: Bearer <api_key>`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/batteries` | List all batteries |
| `GET` | `/api/v1/batteries/:bpan` | Get battery by BPAN |
| `GET` | `/api/v1/batteries/:bpan/telemetry` | Get latest telemetry |
| `GET` | `/api/v1/batteries/:bpan/telemetry/history` | Get telemetry history |
| `POST` | `/api/v1/telemetry` | Ingest telemetry reading |
| `GET` | `/api/v1/marketplace` | List marketplace listings |
| `GET` | `/api/v1/epr` | List EPR tokens |
| `GET` | `/api/v1/stats` | Platform KPI summary |

### MCP Server (`/api/mcp`)

An [MCP-compatible](https://modelcontextprotocol.io/) endpoint allows AI agents (Claude, GPT-4, Gemini) to discover and invoke platform capabilities programmatically. Tools exposed include battery lookup, telemetry query, warranty check, and marketplace search.

---

## Testing

The platform has 385 automated tests across 26 test files, covering all critical server-side logic.

```bash
# Run all tests
pnpm test

# Run a specific test file
pnpm test server/email.test.ts

# Run with coverage
pnpm test --coverage
```

| Test File | Coverage Area |
|---|---|
| `auth.test.ts` | Login, register, JWT session |
| `auth.logout.test.ts` | Logout flow |
| `passwordReset.test.ts` | Forgot/reset password (14 tests) |
| `email.test.ts` | Resend email helper (7 tests) |
| `batterySimulator.test.ts` | SOH/RUL simulation engine |
| `telemetryIngest.test.ts` | MQTT telemetry ingestion |
| `telemetrySocket.test.ts` | Socket.io broadcast |
| `marketplaceListing.test.ts` | Listing CRUD |
| `marketplaceDetail.test.ts` | Offer submission |
| `eprPdfExport.test.ts` | PDF generation (8 tests) |
| `pdfGenerator.test.ts` | Battery passport PDF |
| `compliance.ts` tests | Audit log, API key management |
| `warranty.test.ts` | Warranty lifecycle |
| `wiki.test.ts` | Wiki article CRUD |
| `alertCooldown.ts` tests | Alert deduplication |
| `mqttSubscriber.test.ts` | MQTT connection handling |
| `mqttSecrets.test.ts` | MQTT credential management |
| `deviceProvisioning.test.ts` | Device onboarding |
| `gatewayDocs.test.ts` | Gateway documentation API |
| `enterprise.test.ts` | Enterprise features |
| `carbonFootprint.test.ts` | Carbon calculation |
| `access-gate.test.ts` | Access control |
| `adminUserManagement.test.ts` | Admin user operations |
| `feedback-review.test.ts` | Feedback workflow |
| `phase29Features.test.ts` | Platform settings |
| `agent-actions.test.ts` | AI agent execution |

---

## Deployment

The platform is hosted on **Manus** with built-in CI/CD. Deployment is triggered by clicking the **Publish** button in the Manus Management UI after saving a checkpoint.

### Production Build

```bash
pnpm build
# Output: dist/public/ (frontend) + dist/index.js (backend)

pnpm start
# Runs: NODE_ENV=production node dist/index.js
```

### Environment Configuration for Production

Ensure all environment variables listed in the [Environment Variables](#environment-variables) section are configured in the Manus Secrets panel before publishing.

### DNS Configuration

The platform is configured for the following domains:

| Domain | Purpose |
|---|---|
| `circulair.energy` | Primary production domain |
| `www.circulair.energy` | www redirect |
| `circulai-su7xgbwd.manus.space` | Auto-generated staging domain |

For full deployment instructions including DNS setup, SSL, and rollback procedures, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Regulatory Compliance

The platform is designed to support the following regulatory frameworks:

| Jurisdiction | Regulation | Status |
|---|---|---|
| 🇪🇺 European Union | EU Battery Regulation 2023/1542 | Supported |
| 🇮🇳 India | BIS Battery Standards | Supported |
| 🇨🇳 China | GB/T Battery Standards | Supported |
| 🇺🇸 United States | EPA / state-level EPR | Supported |
| 🇬🇧 United Kingdom | UK Battery Regulations | Supported |
| 🇩🇪 Germany | ElektroG / BattG | Supported |
| 🌏 Global | ISO 14040 LCA, IEC 62619 | Supported |

The compliance framework (`server/compliance.ts`) implements:

- **ISO 27001 A.12.4** — Comprehensive audit logging with data classification labels
- **SOC 2 CC6.1** — Data access logging with correlation trace IDs
- **ISO 27001 A.9** — Role-based access control matrix
- **GDPR** — Cookie consent, privacy policy, data minimisation

---

## Internationalisation

The platform supports 5 languages via `react-i18next`:

| Code | Language |
|---|---|
| `en` | English (default) |
| `de` | German |
| `fr` | French |
| `hi` | Hindi |
| `zh` | Chinese (Simplified) |

Translation files are in `shared/i18n/`. To add a new language, create `shared/i18n/<code>.json` and register it in `client/src/lib/i18n.ts`.

---

## Contributing

1. Create a feature branch from `main`.
2. Make changes following the [Build Loop](#quick-start-local-development) pattern: schema → db helpers → tRPC procedures → UI.
3. Write Vitest tests for all new server-side logic.
4. Run `pnpm check` (TypeScript) and `pnpm test` before opening a pull request.
5. All PRs require passing CI and at least one reviewer approval.

For questions, contact [support@circulair.energy](mailto:support@circulair.energy).
