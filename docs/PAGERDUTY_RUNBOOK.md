# PagerDuty incident alerts on Circul-AI-r

The native adapter is deployed in Render commit `54920faa`; the reviewed additive PostgreSQL outbox table and due index were applied and verified on 17 November 2026. **PagerDuty is not activated.** `PAGERDUTY_ENABLED=false` was verified in the running process after the approved PostgreSQL/JWT configuration redeploy. The Events v2 routing key/region, intended on-call service and actual delivery remain unverified. No live test incident or on-call notification has been sent.

## What triggers a page

New critical application alerts created through `createAlert` enter a durable PostgreSQL outbox when `PAGERDUTY_ENABLED=true` and a valid routing key is configured. Warning/info alerts are not paged. Explicit demo/simulated flags, demo/test/simulator sources and demo/test types are excluded. A newer development repair preserves those labels through MQTT persistence/alert metadata and marks streams/test publishers synthetic, but it is not yet a verified Render code release. The adapter cannot infer provenance that a producer omits or authenticate hardware origin. Broker ACLs, identity binding, simulation-state isolation and safety thresholds remain activation gates.

The adapter sends a trigger event to PagerDuty's Events API v2.[1] An Events API 202 response is recorded as `accepted`, not “delivered to the on-call engineer.” PagerDuty service rules, escalation policies, schedules and responder preferences control actual notifications.[2] Validate those in the PagerDuty service before relying on paging.

Deduplication keys identify the application host, environment and persisted alert ID. Retries of one alert reuse its key. Different alert rows are separate events; broader incident grouping is controlled in PagerDuty. Existing application cooldown logic does not guarantee every repeated condition is collapsed. Reading an in-app alert does **not** acknowledge or resolve its PagerDuty incident. Acknowledge/resolve in PagerDuty after operational verification; automatic recovery/resolution and incident-state synchronization are not implemented.

## Configure and deploy safely

1. In PagerDuty, select the intended service and create or inspect an **Events API v2** integration. Confirm its escalation policy and on-call schedule. Obtain its 32-character integration/routing key.[1]
2. Store the key as the server-side Render environment variable `PAGERDUTY_ROUTING_KEY`. Do not put it in source, a frontend `VITE_` variable, URLs, tickets or chat. Use `PAGERDUTY_REGION=us` or `eu` to match the account region.[4] `PAGERDUTY_ENVIRONMENT=production` and `APP_URL=https://circulair.energy` define incident namespace and authenticated app links.
3. The approved production environment repair is complete: new managed PostgreSQL login, canonical APP_URL and 64-character rotated JWT secret were verified. The old database login remains valid for rollback and must not be revoked until all legitimate clients are checked and revocation approved. Environment-only source cleanup is locally tested but not yet released to Render; its controlled rollout remains required. The drain command refuses implicit fallback or MySQL URLs.
4. A protective Render logical export was created at 07:41 UTC on 17 November and confirmed ready; it was not downloaded or restore-tested. The checksum-reviewed `drizzle/pagerduty-outbox.sql` was applied to production in a bounded transaction, and the outbox table/index verified present. It creates only the outbox, constraints and index. Do not run the legacy MySQL migration or force a schema push over customer data.
5. Deploy the tested commit to Render with `PAGERDUTY_ENABLED=false`. Verify `/api/health`, authentication, PostgreSQL schema, incident status access and logs. Resolve remaining alert-source/authorization and safety-rule defects in the release gates before enabling live paging.
6. Change `PAGERDUTY_ENABLED=true` only after those gates and the intended service are verified. The configuration in `render.yaml` defaults to false. Enabling starts paging for new eligible alerts, not a backfill of historical alerts.
7. For durable retries after restarts, optionally create the Render-native Cron service described below. No Cron service has been created by this task. A controlled live test incident needs explicit approval because it may contact the on-call team.

The web process attempts immediate delivery after the alert/outbox transaction commits. If the process is interrupted, the outbox persists; a later drain recovers it. Without the retry Cron service or an operator-run drain, delivery recovery is not guaranteed after a web-process restart.

## Render-native retry processing

`render.pagerduty.yaml` is an optional separate Blueprint for a finite Cron job running once each minute:

```sh
pnpm exec tsx scripts/process-pagerduty.ts
```

Give the Cron service the same verified PostgreSQL URL, PagerDuty routing key, region, environment and APP_URL as the web service. Its enable flag also defaults to false; turn it on only after verification. It processes at most ten due rows per run and exits. It does not use a sandbox daemon, an in-process recurring timer or an external agent runtime.

Render guarantees at most one active run per Cron service, but database leases also protect against a web-process drain overlapping it.[3] Render documents a **$1/month minimum per Cron service**, plus active compute billing.[3] Applying the optional Blueprint creates a billable service; review costs and approve creation first. At ten rows per minute, sustained incident bursts need capacity/backlog monitoring rather than an unlimited delivery promise.

## Failure and retry behavior

The outbox states are `pending`, `sending`, `accepted` and `failed`. Atomic PostgreSQL `FOR UPDATE SKIP LOCKED` claims establish two-minute leases. Completed updates require the matching lease token, so a stale worker cannot overwrite a later attempt. Interrupted leases become eligible for recovery. Each row has a maximum of eight claimed delivery attempts.

Network/timeouts, HTTP 429 and HTTP 5xx are retried with exponential delay from one minute up to one hour, honoring bounded `Retry-After`. HTTP 400/401/403 and unexpected non-202 success codes are terminal failures; check configuration/payload rather than resending indefinitely.[2] Events use HTTPS with a six-second request timeout and disallow redirects. Delivery is at-least-once under interruption; deduplication applies to currently open PagerDuty alerts, not a universal exactly-once incident guarantee.[1]

Only a routing-key fingerprint is stored. Rotating the key quarantines queued rows for the old integration as `routing_key_changed`, instead of silently sending them to a different service. Review/requeue those rows deliberately with operator approval. Failed rows are not automatically resurrected. Retain outbox/audit records according to your operational data-retention policy.

## Status API and logging

Administrators can query the tRPC procedure `pagerDuty.status`, for example through the authenticated app API at `/api/trpc/pagerDuty.status`. Anonymous and ordinary users are denied. Status reports enable/configuration flags, region/environment, schema readiness and counts by outbox state; it never returns the routing key.

For a direct HTTP query, use the administrator's existing HttpOnly session cookie and the project's standard tRPC request conventions. Never paste cookies into shared documentation or logs. `outboxReady=false` is a real configuration/database failure, not a green health result.

Structured logs use `pagerduty.delivery`, `pagerduty.immediate_drain_failed`, `pagerduty.drain` and `pagerduty.drain_failed`. Delivery logs contain only delivery/alert IDs, attempt number, outcome code and HTTP status. They omit free-text alert messages, user identifiers, private contacts, arbitrary metadata, device credentials, tokens, routing keys and upstream response bodies. Stored payloads likewise omit free-text title/message and allow only canonical battery identifiers and selected numeric telemetry.

## Tested evidence and limitations

Unit tests cover configuration opt-in, invalid keys/regions, critical-only filtering, marked demo exclusion, stable deduplication, environment isolation, privacy, response/retry classification, key-rotation quarantine and admin status authorization. A guarded real-PostgreSQL test proved atomic alert/outbox insertion, warning exclusion, no resend after acceptance and concurrent drainer lease deduplication. All external requests were mocked; those tests do not demonstrate real PagerDuty acceptance or on-call delivery.

Run the isolated database regression only with `QA_LOCAL=1` and the dedicated localhost `circulair_qa` database. It refuses production hosts. Development runtime configuration may share the intended Render database, but security/data-writing tests must not mutate customer data.

This integration pages persisted application critical alerts. It is **not an external uptime detector**: if the application or PostgreSQL is down before an alert can be persisted, it cannot page its own outage reliably. Configure an independent uptime/availability monitor against the query-backed health endpoint and connect that monitor to the appropriate PagerDuty service. That separate monitor has not been configured here.

The integration provides controls useful for secure operation; it does not by itself establish ISO 27001 or SOC 2 certification, legal compliance, complete tenant isolation or uninterrupted availability. The broader security and functional release gates remain applicable.

## References

[1]: https://docs.pagerduty.com/developer/send-alert-event "PagerDuty Events v2 alert payload and deduplication"
[2]: https://docs.pagerduty.com/developer/events-api-v2-overview "PagerDuty asynchronous acceptance, notification behavior and retry rules"
[3]: https://render.com/docs/cronjobs "Render native Cron scheduling, concurrency and billing"
[4]: https://support.pagerduty.com/main/docs/service-regions "PagerDuty US and EU login and API endpoints"
