# Circul-AI-r release gates after retest

This retest does not certify 100% product functionality. Historical checkbox and mock-test pass counts are not an acceptance certificate.

## Infrastructure and credentials

Render dashboard sign-in is required. Rotate the previously embedded PostgreSQL credential and any exposed Render token/deploy hook. Set a valid environment-only RENDER_DATABASE_URL or DATABASE_URL, verify connectivity, then remove the embedded fallback from server/db.ts and drizzle.config.ts and redeploy. Do not publish a fallback-free build before the production environment is corrected. Reconcile render.yaml and the checked-in MySQL migration with the actual PostgreSQL deployment without rerunning destructive migrations over live data. Keep backups and verify rollback access.

## Security

Complete resource-level authorization across battery lifecycle, warranty, assistant conversations, device credentials, alerts/rules, compliance documents, and payment objects. Current-user redaction, recovery-link protection, cross-origin mutation checks, owner-scoped webhook deletion, and realtime hardening address specific defects only. They do not establish tenant isolation for the entire application.

Fix remaining payment offer/listing binding, seller acceptance, concurrency/reservation, webhook idempotency, settlement state, currency and refund logic before accepting real money. The legacy unpaid direct-purchase mutation is disabled; that is not a complete payment certification.

Triage and remediate remaining dependency advisories with compatible upgrades and regression evidence. Scanner zero-matches is not proof of no vulnerabilities.

## Functional acceptance

Unify 19-/21-character BPAN contracts across generation, decoder, warranties, MQTT and advanced consumers. Resolve and authorize canonical battery IDs server-side rather than storing frontend batteryId=0. Validate actual calendar dates, physical limits and zero-valued measurements.

Correct carbon-unit conversion, SOH/twin model formulas and UI contracts. Replace unsupported neural-network accuracy, blockchain verification, uptime and compliance claims with measured results or honest demo/unknown states. Implement or disable metadata-only federated training, action execution, claim routes, carrier dispatch, SDK downloads and matching notifications until the actual workflows exist.

Verify email recovery delivery, private S3 storage/download authorization, Render PDF-browser provisioning, real MQTT broker ACLs/device provisioning and hardware telemetry using dedicated staging/test identities. No customer messages or financial transactions were sent in this assessment.

## Messaging

The requested phrase “pager messages” remains unconfirmed. Working in-app alerts, PagerDuty paging, and SMS/WhatsApp delivery are different features. No external messaging or recurring monitoring has been enabled without that scope and channel configuration.

## Deployment

A development checkpoint is not a Render deployment. Confirm the actual Render commit, environment and logs, then rerun production health, authentication and authorized staging workflows. Do not claim that local fixes are live until deployment evidence exists.
