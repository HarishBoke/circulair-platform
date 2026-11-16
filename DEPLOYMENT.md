# Deployment Guide — Circul-AI-r Platform

The supported production target is a Render Node.js web service with Render PostgreSQL. The repository configuration (`render.yaml`) is the source of truth; provider accounts, secrets, migrations, DNS and feature validation remain operator responsibilities. This guide does not attest live deployment status or guarantee complete functionality.

---

## Table of Contents

1. [Render Setup](#render-setup)
2. [Deployment Architecture](#deployment-architecture)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Secrets Configuration](#secrets-configuration)
5. [DNS & Domain Setup](#dns--domain-setup)
6. [Publishing to Production](#publishing-to-production)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Rollback Procedure](#rollback-procedure)
9. [Operational Runbook](#operational-runbook)
10. [Monitoring & Alerting](#monitoring--alerting)
11. [Database Operations](#database-operations)

---

## Render Setup

1. Connect the authorized GitHub repository to Render and apply the root `render.yaml` Blueprint, or create a web service with the equivalent settings below. Do not assume a CI deployment workflow exists; the Blueprint currently enables deployment from `main`.
2. Create or select a Render PostgreSQL database in the intended environment. Obtain its connection URL securely and set `DATABASE_URL` explicitly. Do not put connection strings in source, commands, tickets or log output.
3. Configure the environment variables in [Secrets Configuration](#secrets-configuration). The Blueprint does not provision the PostgreSQL database automatically; `sync: false` values require operator input.
4. Review database migration compatibility and backups, then apply approved PostgreSQL migrations as a separate release step. Do not append database writes to the web build command.
5. Add the custom domain and DNS records indicated by Render, then deploy and perform read-only checks. Validate data-writing workflows only against a disposable local/staging database under explicit authorization.

| Web-service setting | Repository configuration |
|---|---|
| Runtime | Node.js 22 |
| Region | Singapore |
| Plan | Starter (review capacity for your workload) |
| Branch | `main` |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Start command | `node dist/index.js` |
| Environment | `NODE_ENV=production` |
| Health check | `/api/health` |
| Auto-deploy | Enabled in `render.yaml`; review release/migration coordination |

If a CI pipeline is added, gate deployment on typecheck, approved tests and a build; store Render deployment credentials only in its secret store. Never assume build success proves provider integration readiness.

### S3 Bucket Setup

The current storage helper uses AWS S3 directly, with region and bucket configured through `AWS_*` variables. Use a dedicated bucket and least-privilege credentials for only the required object prefixes. Set encryption, lifecycle/retention and logging according to the data policy.

`storagePut` returns a standard bucket URL; it does not make an object public or generate a signed download URL. `storageGet` provides a time-limited signed GET URL (one hour by default). A private bucket can therefore accept uploads while direct previews fail unless the caller uses a signed URL. Validate the actual upload/download workflow before enabling private customer documents. Keep public-access blocking on for sensitive files; do not apply blanket public-read policies as a workaround. No custom S3 endpoint or CDN URL setting is currently exposed by this helper, so arbitrary S3-compatible providers are not a documented drop-in configuration.

### Direct Provider Setup

OpenAI project credentials must permit the selected chat/image models and transcription API, with billing and limits configured. ZeptoMail needs a verified sender domain and a token for the India-region account used by `server/email.ts`; the full provider authorization value is stored in `ZEPTOMAIL_TOKEN`. Mail delivery is best-effort, with no automatic Resend failover.

For maps, enable only needed Google APIs and restrict server/browser keys appropriately. Browser `VITE_*` keys are public by design and require domain/API restrictions. For payments, use a verified Stripe account, matching webhook signing secret, and `/api/stripe/webhook`; select events based on the current handler in `server/stripe.ts` rather than an unverified list. Test payments with non-production credentials. For IoT, configure an authorized TLS MQTT broker and least-privilege device/topic credentials rather than copying a public broker host.

### Health Check

`GET /api/health` performs a PostgreSQL readiness query. It returns HTTP 200 with `status: "ok"`, `db: "connected"`, and `dbType: "postgresql"`, or HTTP 503 with `status: "degraded"` and `db: "disconnected"`. It also includes a timestamp and environment; database error details are withheld. It does not check OpenAI, ZeptoMail, S3, Maps, Stripe or MQTT. `/api/v1/health` is a public lightweight gateway response, not the Render database readiness check.

---

## Deployment Architecture

```text
Authorized GitHub repository (main)
    │ Render auto-deploy, coordinated with reviewed releases
    ▼
Render Node.js web service (TLS termination, assigned PORT)
    ├── Express APIs + React SPA: dist/index.js + dist/public/
    ├── Render PostgreSQL: explicit DATABASE_URL
    └── Direct provider calls: OpenAI, ZeptoMail, AWS S3
        Optional feature providers: Google Maps, Stripe, MQTT
```

The web build does not automatically apply database migrations, configure external-provider accounts, or validate delivery/data access. Use isolated environments and explicit configuration for each release.

---

## Pre-Deployment Checklist

Complete the applicable items before deploying. Record exceptions and unconfigured feature dependencies; do not infer full readiness from a passing build.

### Code Quality

| Check | Command | Expected |
|---|---|---|
| TypeScript type-check | `pnpm check` | 0 errors |
| Approved automated tests pass | `pnpm test` in isolated CI/local environment | Review current results and safety guards; no fixed test-count claim |
| No `console.log` in production paths | grep audit | Structured logger used |
| No hardcoded secrets | grep audit | 0 findings |

### Infrastructure

| Check | How to verify |
|---|---|
| All required secrets set | Render web-service Environment settings |
| Database schema compatible | Reviewed migrations applied to explicit PostgreSQL target; restore tested |
| ZeptoMail sender domain verified | Account dashboard and DNS verification status |
| MQTT broker reachable | Check server logs for `[MQTT] Connected` |
| Custom domain configured | DNS and TLS match records indicated by the Render web service |

### Functional (disposable test environment only)

Use authorized local/staging fixtures for login, password recovery, battery writes and telemetry ingestion. Do not create users, send mail, seed databases or mutate production data for a smoke test.

| Check | How to verify |
|---|---|
| Login flow works | Navigate to `/login`, sign in |
| Password reset sends email | Request reset, check inbox |
| Battery registration works | Create a test BPAN entry |
| Telemetry ingestion works | POST to `/api/v1/telemetry` with test data |
| EU Battery Passport renders | Navigate to `/passport/EU/TEST-001` |
| Marketplace listing visible | Navigate to `/marketplace` |

---

## Secrets Configuration

Manage production values in Render web-service **Environment** settings, with a separate private environment for local development. Never commit secrets, log them, or share credential-bearing URLs. Values become available to a new process after applying the configuration/redeploy; coordinate secret rotation with active sessions and providers.

### Required Runtime Values

| Key | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | PostgreSQL database for this environment | Obtain securely from Render PostgreSQL; choose internal URL for the appropriate Render network, external URL only for authorized external clients |
| `JWT_SECRET` | HS256 session signing | At least 32 strong random characters in production; rotating invalidates existing sessions |
| `APP_URL` | Trusted recovery-link origin | HTTPS in production; root Blueprint uses the application domain |
| `NODE_ENV` | Runtime mode | `production` |
| `PORT` | Listening port | Assigned by Render |
| `ALLOWED_APP_ORIGINS` | Optional additional trusted mutation origins | Explicit, minimal comma-separated list only |
| `ADMIN_BOOTSTRAP_SECRET` | Optional initial privilege bootstrap | Protect as a high-privilege secret; disable/rotate after use |

### Feature-Specific Values

| Feature | Keys | Notes |
|---|---|---|
| AI | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_IMAGE_MODEL` | Default chat `gpt-4o`, image `dall-e-3`; verify account/model access |
| ZeptoMail email | `ZEPTOMAIL_TOKEN`, `FROM_EMAIL` | Full authorization value; verified sender and matching India-region account |
| Owner notifications | `OWNER_EMAIL`, `OWNER_NAME` | Explicit recipient and display name; delivery is best-effort |
| S3 storage | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | Credentials and region must match the intended bucket; least privilege |
| Maps | `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY` | Restricted server key / public browser key |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY` | Matching account/environment and verified signatures |
| MQTT | `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_TOPIC_PREFIX` | Authorized TLS broker and topic permissions; optional if IoT is not enabled |
| App identity | `VITE_APP_TITLE` | Public display title; rebuild to apply |
| Analytics | `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` | Optional; assess privacy/retention requirements |

All applicable `sync: false` Blueprint entries require operator configuration. Legacy Resend variables are present in the environment object/Blueprint, but current reset/onboarding/owner helpers use ZeptoMail directly; `RESEND_FROM_EMAIL` only supplies a compatibility fallback sender address. Configuring `RESEND_API_KEY` alone will not restore mail delivery.

Missing OpenAI or storage credentials cause feature errors; mail helper failures may be reported only in logs while the forgot-password response remains generic. Validate each enabled integration separately without exposing keys or recovery tokens. Never store server secrets in `VITE_*` variables.

---

## DNS & Domain Setup

Configure `circulair.energy` and any required `www` redirect in the Render web-service custom-domain settings. At your DNS provider, enter exactly the record types and values shown for that service. Apex domains may require different record handling than subdomains; do not invent an IP or copy a generic provider hostname. Verify domain ownership, DNS propagation, TLS issuance and the final canonical origin.

### ZeptoMail Email DNS Records

1. Add the sending domain in the intended ZeptoMail account and verify the sender/Mail Agent used by `FROM_EMAIL`.
2. Copy account-specific SPF/DKIM and any return-path records from that account's dashboard. Do not reuse another account's public key or merge SPF records blindly; a domain should have one coordinated SPF policy.
3. Coordinate DMARC reporting and enforcement with every legitimate sender. Begin according to your organization's rollout policy and tighten only after reviewing delivery/authentication reports.
4. Confirm ZeptoMail verification and delivery status. DNS propagation is provider-dependent; monitor it before relying on recovery email.

SMTP/domain verification does not establish inbox delivery. Also validate token authorization, account region, quotas, sender address, and bounce handling. Keep reset links and tokens out of operator logs and tickets.

---

## Publishing to Production

### Step 1 — Approve the Release

Review the diff, typecheck/test/build results, configuration changes, and migration plan. Confirm a tested backup/restore path and exact database target. Auto-deploy is enabled in the Blueprint; coordinate or pause it when migrations need manual release ordering.

### Step 2 — Apply Approved Migrations Separately

Inspect generated PostgreSQL SQL and its data-loss/locking implications. Apply it only to the explicitly configured intended database with authorized operator credentials. The build command does not run migrations. Do not seed production or run role/password scripts as deployment health checks.

### Step 3 — Deploy on Render

Use the connected repository's approved `main` revision through Render auto-deploy, or trigger an authorized manual deploy from the web service's Deploys controls. The service builds the frontend/backend and starts `node dist/index.js` with production environment values. Check logs and `/api/health`; do not assume zero downtime or automatic reversal of database changes.

### Step 4 — Verify the Release

Perform the read-only checks below against the configured domain. Validate integrations and successful authentication/data-writing workflows in a disposable environment separately.

---

## Post-Deployment Verification

Run these read-only or safe-rejection checks after deployment. Successful production login updates account activity; use authorized test environments for login/logout success, recovery email and data mutations.

| Check | URL / Command | Expected result |
|---|---|---|
| Homepage loads | `https://circulair.energy` | Landing page renders |
| Login UI | `/login` | Local email/password form renders; no external portal required |
| Password recovery UI | `/forgot-password` | Form renders; sending/resetting is validated in an authorized test environment |
| Database readiness | `GET /api/health` | 200 connected / 503 degraded; no provider readiness guarantee |
| Session read | `GET /api/auth/me` without cookie | 401 JSON, no new session |
| tRPC session read | `GET /api/trpc/auth.me` without cookie | 200 with `result.data.json: null` |
| Swagger UI | `/api/docs` | OpenAPI UI renders |
| MCP authentication gate | `GET /api/mcp/tools` without key | 401; tool discovery requires a valid key |
| Sitemap | `/sitemap.xml` | Valid XML |
| Battery passport | `/passport/EU/TEST-001` | Renders (or 404 for unknown BPAN) |
| MQTT subscriber (if enabled) | Sanitized server logs | Authorized broker connected; timing depends on configuration/network |

---

## Rollback Procedure

If a release regresses, use Render's Deploys history to redeploy/roll back to the last known-good revision (subject to current service controls), or revert the code change in GitHub and deploy the approved revision. Check the runtime environment as well as the code revision.

A code rollback does not reverse PostgreSQL migrations, restore data, or automatically revert all environment changes. Verify schema compatibility before serving older code. Prefer forward-compatible migrations and a reviewed forward fix when possible.

### Reverting a Database Migration

1. Identify the approved schema/SQL change and its affected data.
2. Back up affected data and verify the restore plan.
3. Prepare and review a reverse/repair migration for PostgreSQL; test it on an isolated copy.
4. Apply only with an explicit authorized database target, then reconcile the schema and migration history.
5. Validate read-only health and data consistency before resuming normal traffic.

> **Warning:** Dropping a new column or restoring an older backup can lose data written after deployment. Do not run destructive reversal commands without a reviewed plan.

---

## Operational Runbook

### MQTT Subscriber Disconnects

**Symptom:** Server logs show `[MQTT] Error: read ECONNRESET` or `[MQTT] Error: Keepalive timeout`. Real-time telemetry stops updating.

**Possible cause:** Network interruption, broker downtime, invalid credentials or topic permissions. Inspect the subscriber configuration and reconnect logs rather than assuming a fixed recovery time.

**Resolution:** Check reconnect attempts, broker status, `MQTT_BROKER_URL`, username/password authorization, TLS, and topic permissions in Render Environment settings. Do not log credentials. Restart the service through Render only after diagnosing configuration and considering interruption to ingestion.

---

### Rate Limiter Logs `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`

**Symptom:** Server logs show `ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false`.

**Cause:** Render or another trusted reverse proxy supplies forwarded headers, but the Express proxy trust configuration does not match the deployment topology.

**Resolution:** Verify that `app.set('trust proxy', 1)` is applied before security middleware in `server/_core/index.ts`, and confirm one trusted proxy hop is correct for the actual topology. Do not broaden trust to arbitrary client-supplied forwarded headers.

---

### Password Reset Emails Not Delivered

**Symptom:** Users report not receiving password reset emails.

**Diagnosis steps:**

1. Check sanitized Render logs for `[ZeptoMail]` delivery errors (some older auth log labels may still mention a prior provider).
2. Verify `ZEPTOMAIL_TOKEN` is configured as the full authorization value in Render and belongs to the account/region used by the helper.
3. Verify `FROM_EMAIL` is an authorized verified sender.
4. Check ZeptoMail delivery/bounce status, account limits and provider availability.
5. Verify account-specific SPF/DKIM and coordinated DMARC records.
6. Confirm `APP_URL` is the intended trusted origin for recovery links.

**Important:** Forgot-password returns a generic response; delivery failure must be diagnosed separately. Reset URLs/tokens are not returned in public responses, including development previews, and should not be disclosed in logs or support tickets. There is no automatic mail-provider failover.

---

### High Memory / CPU Usage

**Symptom:** Server response times increase; health checks fail.

**Diagnosis:**

1. Check Render service metrics and sanitized logs for resource usage.
2. Look for runaway telemetry simulations: `GET /api/trpc/telemetry.getSimulationStatus`.
3. Check for large database queries in the audit log.

**Resolution:** In an authorized environment, stop unnecessary simulations and investigate query/pool pressure. If a restart is needed, use Render service controls and account for interrupted in-memory simulations or live connections.

---

### Database Connection Errors

**Symptom:** tRPC procedures fail, `/api/health` returns 503, or sanitized logs indicate PostgreSQL connection/authentication errors.

**Resolution:**

1. Verify the intended explicit PostgreSQL `DATABASE_URL` in Render Environment settings without printing it.
2. Check Render PostgreSQL status, network access and connection limits.
3. Confirm internal/external network selection, credentials and TLS requirements with the approved database configuration. Do not disable certificate validation or fall back to a source-embedded connection string.

---

## Monitoring & Alerting

### Built-in Analytics

Optional analytics is configured via `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID`. Verify the actual client integration, consent, cookies and provider retention before enabling tracking; configuration alone does not establish privacy compliance.

### Server Logs

The structured logger supports JSON records on stdout in production, but some paths still use plain console output. Supported structured fields include:

- `timestamp` — ISO 8601
- `level` — `debug` / `info` / `warn` / `error` / `fatal`
- `message` — human-readable description
- `service` — always `circulair-platform`
- `environment` — `production` / `development`
- `traceId` — correlation ID for request tracing
- `module` — source module (e.g. `security`, `mqtt`, `auth`)
- `dataClassification` — application classification metadata, not a certification claim

Use Render logs and any supported account/plan log streaming integration for external monitoring. Verify forwarding, redaction, access, retention and alert delivery rather than assuming a log drain is configured. Never forward passwords, provider credentials, session cookies or recovery tokens.

### Key Log Patterns to Monitor

| Pattern | Severity | Action |
|---|---|---|
| `[MQTT] Error` | Warning | Check broker connectivity |
| `[ZeptoMail]` delivery errors | Warning | Check token, region, sender verification and provider delivery status |
| `[Auth] Forgot password failed` | Error | Check database connectivity |
| `level":"fatal"` | Critical | Page on-call engineer immediately |
| `"module":"security"` | Info | Review in SIEM for anomalies |
| `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` | Warning | Verify trust proxy config |

---

## Database Operations

### Schema Migration

```bash
# After editing drizzle/schema.ts:
pnpm db:push
# This runs: drizzle-kit generate && drizzle-kit migrate
```

### Backup

Confirm Render PostgreSQL backup retention and recovery features for the selected plan. Document recovery objectives and test restoration to an isolated database. Before a destructive operation, take an authorized logical backup or approved provider backup; verify completeness, encryption, restricted storage and restoration. Supply connection credentials through a secret-managed environment, not inline command strings. A backup that has not been restored in a test is not evidence of recoverability.

### Promoting a User to Admin

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

Prefer authorized admin role-management procedures. For initial/bootstrap maintenance, use an approved PostgreSQL client against an explicit target, with change approval and audit evidence; never promote users as a production health test.

### Revoking an API Key

```sql
-- Use the application API-key revocation procedure for the current schema.
-- Do not assume legacy table/column names or edit credentials manually.
```

Use the authorized Compliance Dashboard (`/compliance`) or `compliance.apiKey.revoke`; confirm the target key and retain revocation evidence.
