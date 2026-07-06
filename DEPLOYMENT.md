# Deployment Guide - Circul-AI-r Platform

This document covers the complete production deployment process for the Circul-AI-r Battery Intelligence Platform. The **primary deployment target** is **Render.com** with **GitHub Actions CI/CD** from the **Setoos** GitHub organisation.

---

## GitHub Actions + Render CI/CD (Primary)

### Architecture

```
GitHub (Setoos/circulair-platform)
  └── push to main
        ├── GitHub Actions
        │     ├── 1. TypeScript check (pnpm check)
        │     ├── 2. Vitest tests (420 tests)
        │     ├── 3. Production build (Vite + esbuild)
        │     └── 4. Trigger Render deploy via API → poll /api/health
        └── Render.com Web Service
              ├── Node.js 22, Singapore region
              ├── Custom domain: circulair.energy
              └── MySQL/TiDB (external)
```

### Step 1 — Push to Setoos GitHub Organisation

1. Create a **private** repository at https://github.com/organizations/Setoos/repositories/new named `circulair-platform`.
2. Add the remote and push:

```bash
git remote add setoos https://github.com/Setoos/circulair-platform.git
git push setoos main
```

### Step 2 — Add GitHub Repository Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Description |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | 64-char random string (`openssl rand -hex 32`) |
| `OPENAI_API_KEY` | OpenAI API key (LLM + image + voice) |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_REGION` | S3 bucket region (e.g. `eu-west-1`) |
| `AWS_S3_BUCKET` | S3 bucket name |
| `GOOGLE_MAPS_API_KEY` | Server-side Google Maps key |
| `VITE_GOOGLE_MAPS_API_KEY` | Client-side Google Maps key |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | Verified sender address |
| `OWNER_EMAIL` | Owner email for system alerts |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `MQTT_BROKER_URL` | MQTT broker URL |
| `MQTT_USERNAME` | MQTT broker username |
| `MQTT_PASSWORD` | MQTT broker password |
| `RENDER_API_KEY` | Render API key — https://dashboard.render.com/u/settings#api-keys |
| `RENDER_SERVICE_ID` | Render service ID (format: `srv-xxxxxxxxxxxxxxxx`) |

### Step 3 — Create the Render Web Service

1. Go to https://dashboard.render.com/new/web
2. Connect the `Setoos/circulair-platform` repository
3. Configure:

| Setting | Value |
|---|---|
| Name | `circulair-platform` |
| Region | Singapore |
| Branch | `main` |
| Runtime | Node |
| Build Command | `pnpm install --frozen-lockfile && pnpm build` |
| Start Command | `node dist/index.js` |
| Health Check Path | `/api/health` |
| Auto-Deploy | Yes |

4. Add all environment variables from Step 2 in the Render dashboard, plus:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `VITE_APP_TITLE` | `Circul-AI-r Platform` |
| `OWNER_NAME` | `Setoos` |
| `MQTT_TOPIC_PREFIX` | `CAI_` |
| `RESEND_FROM_EMAIL` | `noreply@circulair.energy` |

5. After creation, copy the **Service ID** from Settings and add it as `RENDER_SERVICE_ID` in GitHub Secrets.

### Step 4 — Run Database Migrations

```bash
DATABASE_URL="mysql://..." pnpm db:push
```

### Step 5 — Register Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks → **Add endpoint**
2. URL: `https://circulair.energy/api/stripe/webhook`
3. Events: `checkout.session.completed`, `payment_intent.succeeded`, `invoice.paid`
4. Copy the signing secret → update `STRIPE_WEBHOOK_SECRET` in both GitHub Secrets and Render env vars

### CI/CD Workflow Summary

| Trigger | Jobs |
|---|---|
| Push to `main` | typecheck → test → build → deploy to Render |
| Pull request | typecheck → test → build → PR comment |
| Weekly Monday | `pnpm audit` security scan |

### Rollback via Render

1. Go to Render dashboard → **Deploys**
2. Click any previous successful deploy → **Rollback to this deploy**

Or revert the commit in GitHub and push to `main` — CI/CD redeploys automatically.

---

---

## Table of Contents

1. [Independent Deployment (Render / Railway / Docker)](#independent-deployment)
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

## Independent Deployment

The platform is fully portable and runs 100% without Manus infrastructure when the following independent API keys are configured. Every Manus-specific service has a graceful fallback:

| Service | Independent key | Fallback (Manus hosting only) |
|---|---|---|
| LLM (GPT-4o) | `OPENAI_API_KEY` | Manus Forge proxy |
| Image generation (DALL-E 3) | `OPENAI_API_KEY` | Manus Forge proxy |
| Voice transcription (Whisper) | `OPENAI_API_KEY` | Manus Forge proxy |
| File storage | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_S3_BUCKET` | Manus Forge proxy |
| Maps (server) | `GOOGLE_MAPS_API_KEY` | Manus Forge proxy |
| Maps (client) | `VITE_GOOGLE_MAPS_API_KEY` | Manus Forge proxy |
| Email notifications | `RESEND_API_KEY` | Manus Forge webhook |

### Required Environment Variables

```bash
# Core
DATABASE_URL=mysql://user:password@host:3306/circulair?ssl={"rejectUnauthorized":true}
JWT_SECRET=<openssl rand -hex 32>
OWNER_EMAIL=owner@yourdomain.com

# AI features (LLM + image gen + voice)
OPENAI_API_KEY=sk-...

# File storage (AWS S3 or S3-compatible)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=circulair-storage

# Maps
GOOGLE_MAPS_API_KEY=AIza...
VITE_GOOGLE_MAPS_API_KEY=AIza...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# IoT (optional)
MQTT_BROKER_URL=mqtts://broker.hivemq.cloud:8883
MQTT_USERNAME=circulair
MQTT_PASSWORD=...
MQTT_TOPIC_PREFIX=circulair/batteries
```

### Render.com Deployment

1. Push this repo to GitHub.
2. Create a new **Web Service** on Render, connect your repo.
3. **Build Command:** `pnpm install && pnpm build && pnpm db:push`
4. **Start Command:** `node dist/server/index.js`
5. **Health Check Path:** `/api/health`
6. Add all environment variables above in the Render dashboard.
7. Create a **MySQL** database (or use PlanetScale/TiDB Cloud) and set `DATABASE_URL`.

### Railway.app Deployment

1. Connect your GitHub repo to Railway.
2. Add a MySQL plugin and copy the `DATABASE_URL`.
3. Set all environment variables in the Railway dashboard.
4. Railway auto-detects `pnpm build` and `node dist/server/index.js`.

### Docker Deployment

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
```

```bash
docker build -t circulair-platform .
docker run -p 3000:3000 --env-file .env circulair-platform
```

### S3 Bucket Setup

Create a public-read S3 bucket for file storage:

```bash
# Create bucket
aws s3 mb s3://circulair-storage --region us-east-1

# Enable public read (for direct URL access without presigning)
aws s3api put-bucket-policy --bucket circulair-storage --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::circulair-storage/*"
  }]
}'

# Disable block public access
aws s3api put-public-access-block --bucket circulair-storage \
  --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
```

> **S3 alternatives:** Cloudflare R2, MinIO, Backblaze B2 - all are S3-compatible and work with the same `AWS_*` env vars.

### Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create a new API key.
3. Enable these APIs: Maps JavaScript API, Geocoding API, Places API (New), Directions API, Distance Matrix API.
4. Restrict the key to your domain (HTTP referrers for `VITE_GOOGLE_MAPS_API_KEY`, IP for `GOOGLE_MAPS_API_KEY`).

### Health Check

```
GET /api/health
```

Returns `{ "status": "ok", "version": "1.0.0", "uptime": 12345 }`. Use this as the health check path in Render/Railway.

---

---

## Deployment Architecture

The platform is hosted on **Manus** — a managed Node.js hosting environment with built-in TLS termination, CDN, database, and S3 storage. The deployment model is:

```
Developer machine
    │
    │  git push → main branch
    ▼
GitHub (user_github remote)
    │
    │  auto-sync on checkpoint save
    ▼
Manus Sandbox (build + test)
    │
    │  Publish button click
    ▼
Manus Production Runtime
    ├── Express server (Node.js 22, PORT auto-assigned)
    ├── Static frontend (dist/public/, served by Express)
    ├── TiDB database (managed, always-on)
    └── S3 storage (managed, CDN-backed)
```

There is no Docker, no Kubernetes, and no manual server provisioning required. All infrastructure is managed by the Manus platform.

---

## Pre-Deployment Checklist

Complete every item before clicking Publish.

### Code Quality

| Check | Command | Expected |
|---|---|---|
| TypeScript type-check | `pnpm check` | 0 errors |
| All tests pass | `pnpm test` | 385/385 passing |
| No `console.log` in production paths | grep audit | Structured logger used |
| No hardcoded secrets | grep audit | 0 findings |

### Infrastructure

| Check | How to verify |
|---|---|
| All required secrets set | Manus → Settings → Secrets |
| Database schema up to date | `pnpm db:push` ran after last schema change |
| Resend sender domain verified | Resend dashboard → Domains |
| MQTT broker reachable | Check server logs for `[MQTT] Connected` |
| Custom domain DNS propagated | `dig circulair.energy` returns Manus IP |

### Functional

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

All secrets are managed through the Manus Secrets panel (Settings → Secrets in the Management UI). **Never commit secrets to the repository.**

### Setting a Secret

1. Open the Manus Management UI.
2. Navigate to **Settings → Secrets**.
3. Click **Add Secret**, enter the key name and value.
4. The secret is immediately available as a `process.env.*` variable in the server.

### Required Secrets for Production

| Key | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Manus (auto-injected) | Do not override |
| `JWT_SECRET` | Manus (auto-injected) | Min 32 chars, rotate annually |
| `VITE_APP_ID` | Manus (auto-injected) | Do not override |
| `OAUTH_SERVER_URL` | Manus (auto-injected) | Do not override |
| `VITE_OAUTH_PORTAL_URL` | Manus (auto-injected) | Do not override |
| `OWNER_OPEN_ID` | Manus (auto-injected) | Do not override |
| `OWNER_NAME` | Manus (auto-injected) | Do not override |
| `BUILT_IN_FORGE_API_URL` | Manus (auto-injected) | Do not override |
| `BUILT_IN_FORGE_API_KEY` | Manus (auto-injected) | Do not override |
| `VITE_FRONTEND_FORGE_API_URL` | Manus (auto-injected) | Do not override |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus (auto-injected) | Do not override |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) | Rotate if compromised |
| `RESEND_FROM_EMAIL` | Your verified Resend domain | e.g. `noreply@circulair.energy` |
| `MQTT_BROKER_URL` | MQTT broker provider | e.g. `mqtts://broker.emqx.io:8883` |
| `MQTT_USERNAME` | MQTT broker dashboard | — |
| `MQTT_PASSWORD` | MQTT broker dashboard | Rotate quarterly |
| `MQTT_TOPIC_PREFIX` | Your configuration | e.g. `CAI_` |

---

## DNS & Domain Setup

The platform is configured for `circulair.energy` and `www.circulair.energy`. DNS records must point to the Manus hosting infrastructure.

### Required DNS Records

Add the following records at your DNS provider (e.g. Cloudflare, Route 53):

| Type | Name | Value | TTL |
|---|---|---|---|
| `CNAME` | `@` (or `circulair.energy`) | Provided by Manus domain panel | 300 |
| `CNAME` | `www` | Provided by Manus domain panel | 300 |

The exact CNAME target is shown in the Manus Management UI under **Settings → Domains**.

### Resend Email DNS Records

To prevent password reset emails from landing in spam, you must add four DNS records to `circulair.energy`. These records authorise Resend to send on your behalf and prevent spoofing.

**Step 1 — Add the domain in Resend**

1. Log in to [resend.com/domains](https://resend.com/domains) and click **Add Domain**.
2. Enter `circulair.energy` (or `send.circulair.energy` if you prefer a subdomain for isolation).
3. Resend will display the exact record values for your account. The DKIM public key is unique per account and must be copied from the dashboard — never use a value from a third-party guide.

**Step 2 — Add DNS records at your registrar**

| Type | Name | Value | Notes |
|---|---|---|---|
| `TXT` | `circulair.energy` | `v=spf1 include:_spf.resend.com ~all` | Authorises Resend IPs to send |
| `TXT` | `resend._domainkey.circulair.energy` | *(copy from Resend dashboard)* | 2048-bit RSA DKIM public key |
| `MX` | `send.circulair.energy` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) | Bounce/complaint return path |
| `TXT` | `_dmarc.circulair.energy` | `v=DMARC1; p=none; rua=mailto:dmarc@circulair.energy` | Start with `p=none` during rollout |

**Step 3 — Verify in Resend**

Return to the Resend Domains dashboard and click **Verify DNS Records**. DNS propagation typically takes 5–30 minutes but can take up to 48 hours. The domain status will change from `pending` to `verified` once all records are detected. Use [dnschecker.org](https://dnschecker.org) to monitor propagation.

**Step 4 — Upgrade DMARC policy after 2 weeks**

Once you have confirmed that emails are reaching inboxes and headers show `dmarc=pass`, upgrade the DMARC policy to `p=quarantine` to improve deliverability reputation and unlock BIMI eligibility:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@circulair.energy
```

Verify domain status in the [Resend dashboard](https://resend.com/domains) before going live.

### DNS Propagation

DNS changes can take up to 48 hours to propagate globally. Use `dig circulair.energy` or [dnschecker.org](https://dnschecker.org) to verify propagation before announcing the domain publicly.

---

## Publishing to Production

### Step 1 — Save a Checkpoint

A checkpoint must exist before the Publish button becomes active.

```
Manus Management UI → (any page) → Save Checkpoint button
```

Or via the AI assistant: ask to "save a checkpoint".

### Step 2 — Verify the Checkpoint

The checkpoint card shows a live screenshot of the current state. Review it to confirm the UI looks correct before publishing.

### Step 3 — Click Publish

```
Manus Management UI → Header → Publish button
```

The publish process:

1. Runs `pnpm build` (Vite frontend + esbuild backend).
2. Deploys the build to the production runtime.
3. Runs database migrations if schema has changed.
4. Switches traffic to the new deployment (zero-downtime).

### Step 4 — Verify Production

Navigate to `https://circulair.energy` and complete the [Post-Deployment Verification](#post-deployment-verification) checklist.

---

## Post-Deployment Verification

Run these checks immediately after every production deployment.

| Check | URL / Command | Expected result |
|---|---|---|
| Homepage loads | `https://circulair.energy` | Landing page renders |
| Login works | `/login` | OAuth and password login both succeed |
| Password reset | `/forgot-password` | Email delivered within 60 seconds |
| API health | `GET /api/v1/stats` with valid API key | 200 JSON response |
| tRPC health | `GET /api/trpc/auth.me` | 401 (unauthenticated, expected) |
| Swagger UI | `/api/docs` | OpenAPI UI renders |
| MCP endpoint | `GET /api/mcp/tools` | JSON tool list |
| Sitemap | `/sitemap.xml` | Valid XML |
| Battery passport | `/passport/EU/TEST-001` | Renders (or 404 for unknown BPAN) |
| MQTT subscriber | Server logs | `[MQTT] Connected` within 30 seconds |

---

## Rollback Procedure

If a deployment introduces a regression, roll back to the previous checkpoint immediately.

### Via Management UI (Recommended)

1. Open Manus Management UI.
2. Click **⋯ (More) → Version history**.
3. Find the last known-good checkpoint.
4. Click **Rollback** on that checkpoint.

The rollback restores the exact code and configuration from that checkpoint. Database schema changes are **not** automatically reversed — if a migration was applied, it must be manually reverted.

### Reverting a Database Migration

If a schema migration must be reverted:

1. Identify the change in `drizzle/schema.ts`.
2. Write a reverse migration SQL manually.
3. Execute it via the Manus Database panel (Settings → Database → SQL console).
4. Update `drizzle/schema.ts` to match the reverted state.
5. Run `pnpm db:push` to sync the ORM.

> **Warning:** Data written to new columns after a migration may be lost if the column is dropped. Always back up affected tables before reverting.

---

## Operational Runbook

### MQTT Subscriber Disconnects

**Symptom:** Server logs show `[MQTT] Error: read ECONNRESET` or `[MQTT] Error: Keepalive timeout`. Real-time telemetry stops updating.

**Cause:** Network interruption between the server and the MQTT broker. The subscriber has automatic reconnection with exponential backoff.

**Resolution:** The subscriber reconnects automatically within 30–60 seconds. If it does not reconnect after 5 minutes, check `MQTT_BROKER_URL`, `MQTT_USERNAME`, and `MQTT_PASSWORD` in the Secrets panel. Restart the server if credentials are correct but the connection remains down.

---

### Rate Limiter Logs `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`

**Symptom:** Server logs show `ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false`.

**Cause:** The Manus reverse proxy sets `X-Forwarded-For` headers, but Express `trust proxy` is not configured.

**Resolution:** The `trust proxy` setting is configured in `server/security.ts`. If the warning reappears after a deployment, verify that `app.set('trust proxy', 1)` is called before `applySecurityMiddleware(app)` in `server/_core/index.ts`.

---

### Password Reset Emails Not Delivered

**Symptom:** Users report not receiving password reset emails.

**Diagnosis steps:**

1. Check server logs for `[Resend]` entries — look for `Failed to send` or `Exception sending`.
2. Verify `RESEND_API_KEY` is set and valid in the Secrets panel.
3. Verify `RESEND_FROM_EMAIL` matches a verified domain in the [Resend dashboard](https://resend.com/domains).
4. Check the Resend dashboard → Logs for delivery status and bounce reasons.
5. Verify SPF, DKIM, and DMARC DNS records are correctly set.

**Fallback:** In development/staging mode, the reset token is returned in the API response body (`resetUrl` field) so testing can proceed without email delivery.

---

### High Memory / CPU Usage

**Symptom:** Server response times increase; health checks fail.

**Diagnosis:**

1. Check the Manus Dashboard panel for resource usage graphs.
2. Look for runaway telemetry simulations: `GET /api/trpc/telemetry.getSimulationStatus`.
3. Check for large database queries in the audit log.

**Resolution:** Stop any active simulations via the Demo Mode page (`/demo`). If the issue persists, restart the server from the Manus Dashboard.

---

### Database Connection Errors

**Symptom:** tRPC procedures return 500 errors; logs show `ECONNREFUSED` or `ER_ACCESS_DENIED`.

**Resolution:**

1. Verify `DATABASE_URL` is set correctly in the Secrets panel.
2. Check TiDB Cloud dashboard for cluster status.
3. Verify the connection string includes SSL parameters if required by the cluster.

---

## Monitoring & Alerting

### Built-in Analytics

The platform integrates with Umami/Plausible analytics (configured via `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID`). Page views and unique visitors are tracked without cookies.

### Server Logs

Structured JSON logs are emitted to stdout in production. Each log entry includes:

- `timestamp` — ISO 8601
- `level` — `debug` / `info` / `warn` / `error` / `fatal`
- `message` — human-readable description
- `service` — always `circulair-platform`
- `environment` — `production` / `development`
- `traceId` — correlation ID for request tracing
- `module` — source module (e.g. `security`, `mqtt`, `auth`)
- `dataClassification` — ISO 27001 classification label

Logs can be forwarded to a SIEM (Splunk, Datadog, Elastic) by configuring a log drain in the Manus Dashboard.

### Key Log Patterns to Monitor

| Pattern | Severity | Action |
|---|---|---|
| `[MQTT] Error` | Warning | Check broker connectivity |
| `[Resend] Failed` | Warning | Check API key and domain verification |
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

The Manus-managed TiDB database does not have automatic point-in-time recovery exposed to users. Before any destructive operation:

```bash
# Export critical tables via the Manus Database panel
# Settings → Database → Export → Select tables → Download CSV/SQL
```

### Promoting a User to Admin

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

Execute via the Manus Database panel (Settings → Database → SQL console).

### Revoking an API Key

```sql
UPDATE api_keys SET revokedAt = NOW() WHERE keyPrefix = 'cai_xxxx';
```

Or use the Compliance Dashboard in the platform UI (`/compliance`).
