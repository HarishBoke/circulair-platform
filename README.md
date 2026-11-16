# Circul-AI-r — Battery Intelligence Platform

> **The Operating System for Battery Circular Economy**
>
> Battery lifecycle traceability, health analytics, IoT telemetry, and tools for regulatory reporting. External integrations require operator configuration and validation.

**Application domain:** [circulair.energy](https://circulair.energy). Production deployment targets Render with PostgreSQL; this document does not verify live availability.

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

Circul-AI-r is a multinational battery lifecycle management platform designed for manufacturers, fleet operators, recyclers, and regulators. It tracks every battery from cell assembly through deployment, real-time monitoring, secondary-life marketplace trading, and end-of-life recycling — providing records and report templates to assist regulatory work. Operators must verify required fields, methodologies, and regulator acceptance for their jurisdiction.

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

```text
Browser: React SPA + tRPC client + Socket.io
    │ HTTPS (Render TLS termination)
    ▼
Render Node.js service: Express API + dist/public frontend
    ├── /api/auth/* — email/password login + JWT session cookies
    ├── /api/trpc — typed procedures with public/protected/admin access
    ├── /api/v1 — REST gateway with scoped API keys
    ├── /api/mcp — API-key-authenticated AI agent interface
    ├── Render PostgreSQL — Drizzle ORM
    └── Direct integrations: OpenAI, ZeptoMail, AWS S3
        Optional: operator-configured MQTT, Google Maps, Stripe
```

The frontend is served by Vite in development and Express in production. Most application data access uses tRPC hooks; login and password recovery use `/api/auth/*` HTTP routes.

Real-time telemetry flows from configured devices and an MQTT broker through `mqttSubscriber.ts` into PostgreSQL and Socket.io broadcasts. Simulated telemetry is not evidence of a working device integration.

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
| Database | Render PostgreSQL | cloud |
| Real-time | Socket.io | 4 |
| IoT messaging | MQTT (operator-configured broker) | mqttjs |
| Authentication | Email/password + JWT + bcrypt | — |
| Email | Direct ZeptoMail REST API | — |
| File storage | AWS S3 (direct SDK) | — |
| Build tool | Vite | 7 |
| Runtime | Node.js | 22 |
| Language | TypeScript | 5 |
| Testing | Vitest / Playwright | see package.json |
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

# 3. Configure local environment securely
# Set DATABASE_URL to a disposable local PostgreSQL database.
# Set JWT_SECRET and APP_URL=http://localhost:3000 (see variables below).

# 4. Review migrations, then apply to the disposable local PostgreSQL database
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
| `pnpm test` | Run the Vitest suite |
| `pnpm check` | TypeScript type-check without emitting |
| `pnpm format` | Prettier format all files |
| `pnpm db:push` | Generate and apply Drizzle migrations |

---

## Environment Variables

Configure secrets in Render's environment settings for production and in a private, untracked local environment for development. Never put service secrets in `VITE_*` variables: these are compiled into the browser bundle. See `render.yaml` for the deployment configuration.

### Required — Runtime and Authentication

| Variable | Description |
|---|---|
| `DATABASE_URL` | Explicit PostgreSQL connection URL for the intended environment; obtain securely from Render PostgreSQL |
| `JWT_SECRET` | Strong random session signing secret, at least 32 characters in production |
| `APP_URL` | Trusted application origin used for password recovery links; HTTPS in production |
| `NODE_ENV` | `production` on Render; `development` for local Vite |
| `PORT` | Assigned by Render; defaults to 3000 locally |
| `ALLOWED_APP_ORIGINS` | Optional comma-separated explicit trusted origins; avoid broad allowlists |
| `ADMIN_BOOTSTRAP_SECRET` | Optional privileged initial admin bootstrap; remove/rotate after use |

### Feature-Specific — Direct External Integrations

| Feature | Variables | Operator responsibilities |
|---|---|---|
| AI/chat, images, transcription | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_IMAGE_MODEL` | Configure OpenAI project access, model availability, billing and limits; defaults are `gpt-4o` and `dall-e-3` |
| Password reset and notifications | `ZEPTOMAIL_TOKEN`, `FROM_EMAIL`, `OWNER_EMAIL`, `OWNER_NAME` | Use the full provider authorization value; verify sender domain and the India-region account used by the current email helper |
| File uploads/downloads | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | Grant least-privilege S3 access and validate private-file delivery; uploads return a bucket URL and reads can use signed URLs |
| Maps | `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY` | Enable the required APIs and restrict keys by API and permitted application origins |
| Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY` | Configure Stripe account and signed webhook; test with non-production payments |
| IoT telemetry | `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_TOPIC_PREFIX` | Configure an authorized TLS broker, device credentials and topic namespace |

AI and storage operations fail when required credentials are absent. Email delivery is best-effort; an accepted password-reset request is not proof of email delivery. The current email helpers use ZeptoMail directly; legacy `RESEND_API_KEY`/`RESEND_FROM_EMAIL` settings do not provide automatic mail failover (`RESEND_FROM_EMAIL` is a sender-address compatibility fallback only).

### Optional — Analytics

| Variable | Description |
|---|---|
| `VITE_ANALYTICS_ENDPOINT` | Configured analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website ID |

Validate consent, retention, and provider data-processing requirements before enabling analytics.

---

## Database Schema

The platform uses PostgreSQL tables defined in `drizzle/schema.ts`. The following is a domain overview, not an exhaustive list; consult the schema for exact table and column names:

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

> **Warning:** Confirm Render PostgreSQL backup retention for the selected plan and test restoration. Review generated migrations and back up data before production changes; never run migration or seed commands against an implicit database target.

---

## Authentication & Security

### Authentication Flows

**Email + password** — `/login` calls `POST /api/auth/login`. Registration at `POST /api/auth/register` hashes passwords with bcrypt. Successful login issues a signed JWT in the `app_session_id` cookie and updates `lastSignedIn`; there is no external identity-provider redirect.

**Session reads and logout** — `GET /api/auth/me` returns 401 without a valid session. Public tRPC `auth.me` returns 200 with `result.data.json: null` when unauthenticated. `POST /api/auth/logout` and tRPC `auth.logout` clear the session cookie; they do not revoke an already copied JWT.

**Password reset** — A 15-minute single-use token is emailed through ZeptoMail. Links use the configured `APP_URL`, not untrusted request headers. Reset tokens and reset URLs are not returned in public responses.

---

### Security Controls

| Control | Implementation |
|---|---|
| **Security headers** | Helmet.js (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) |
| **Rate limiting** | 120 req/min on `/api/*`; 20 req/15min on `/api/auth/*` |
| **Password hashing** | bcrypt with 12 rounds |
| **Session tokens** | HS256 JWT signed with `JWT_SECRET`, 30-day expiry; `HttpOnly`, host-only cookie, `Secure` + `SameSite=None` over HTTPS, `SameSite=Lax` locally over HTTP |
| **Cross-origin mutations** | API middleware checks `Origin` / `Sec-Fetch-Site` against configured trusted origins; operators must review proxy/origin settings |
| **API key auth** | Bearer token auth on REST API v1, stored as SHA-256 hashes |
| **Audit logging** | Selected operations and security events logged with trace IDs; coverage and retention require operator review |
| **Role-based access** | `admin` / `user` roles; `adminProcedure` guards all admin tRPC procedures |
| **Email enumeration** | Well-formed forgot-password requests receive a generic success message for known/unknown accounts; validation and infrastructure errors may return non-200 |

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
| `auth` | `me`, `logout` (login/register use `/api/auth/*`) | public/session-aware |
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

The repository includes Vitest unit/integration tests and Playwright E2E tests. Counts and results change with the codebase; test presence does not establish production readiness or complete coverage.

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
| `email.test.ts` | Transactional email helper |
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

Production deployment targets a **Render Node.js web service with Render PostgreSQL**. The root `render.yaml` specifies:

```bash
# Build command
pnpm install --frozen-lockfile && pnpm build
# Start command (NODE_ENV=production configured in Render)
node dist/index.js
```

The build outputs `dist/public/` and `dist/index.js`. Render uses `/api/health` for database readiness: it returns 200 when PostgreSQL is reachable and 503 when degraded. It does not verify OpenAI, mail, S3, payment, or IoT functionality.

Connect the repository in Render, securely set required environment values (including all applicable `sync: false` entries), and configure the explicit PostgreSQL URL. Review and apply migrations separately; builds do not migrate the database automatically. Use the DNS values shown for the web service's custom domain, rather than copying provider-host examples.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for setup, verification, rollback, and the operational runbook.

---

## Regulatory Compliance

The platform is designed to support the following regulatory frameworks:

| Jurisdiction | Regulation | Intended reporting scope |
|---|---|---|
| 🇪🇺 European Union | EU Battery Regulation 2023/1542 | Operator validation required |
| 🇮🇳 India | BIS Battery Standards | Operator validation required |
| 🇨🇳 China | GB/T Battery Standards | Operator validation required |
| 🇺🇸 United States | EPA / state-level EPR | Operator validation required |
| 🇬🇧 United Kingdom | UK Battery Regulations | Operator validation required |
| 🇩🇪 Germany | ElektroG / BattG | Operator validation required |
| 🌏 Global | ISO 14040 LCA, IEC 62619 | Operator validation required |

The compliance framework (`server/compliance.ts`) provides audit records, security events, classification metadata, and API-key management. These are supporting controls, not proof of ISO 27001 certification, a SOC 2 Type II report, GDPR compliance, or regulator acceptance. Operators must assess control coverage, legal obligations, retention, and evidence independently. See [Compliance Guide](./docs/COMPLIANCE_GUIDE.md).

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
