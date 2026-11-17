# Circul-AI-r retest and security report

**Circul-AI-r is not yet certified fully functional, secure or ready for unrestricted production use.** Commit `54920faa9c392fa03a1689e4cbe151d67323edda` is confirmed live on Render. The approved PostgreSQL/JWT configuration repair and additive PagerDuty outbox migration are complete. Additional alert authorization, synthetic-source, simulator and UI repairs remain development changes until a separately verified code release. PagerDuty is disabled.

Assessment updated: 17 November 2026. Original reviewed baseline: `27427a49d986dd2b3e1fcc7d0d641319d88825e4`. The original six module reviews describe that baseline; their line numbers and unresolved findings must not be confused with the patched source.

## Production repair and release evidence

Render sign-in restored dashboard access. On 17 November, Render showed commit `54920faa` live, matching GitHub main. Earlier documentation saying this checkpoint was local only is superseded by that observation; no new assistant main push was needed to establish the existing deployment.

Inspection found `DATABASE_URL` still configured for MySQL and the configured JWT secret shorter than the new 32-character production minimum. The application was surviving through an embedded PostgreSQL fallback. Those were real configuration blockers, not proof of reliable successful login.

After the user's explicit approval of staged repair and user sign-outs, a protective Render logical export was created at 07:41 UTC and confirmed ready. A new managed PostgreSQL default credential was created while preserving the original login for rollback. The web service was configured with its new internal PostgreSQL URL, a cryptographically random 64-character JWT secret, `APP_URL=https://circulair.energy` and `PAGERDUTY_ENABLED=false`. Unrelated variables were retained. Auto-Deploy was changed to Off before controlled work.

The existing commit was redeployed as `dep-dbu0nbg8v5cc73bj680g` and reached live at 08:11 UTC. Read-only Render shell checks verified the new `session_user=circulair_runtime_20261117`, the database `circulair_production`, JWT length 64, canonical app URL and paging disabled. PostgreSQL's `current_user=circulair_user` is the inherited execution role, not the login identity. This distinction confirms the new credential authenticated successfully.

The reviewed `drizzle/pagerduty-outbox.sql` was checksum-verified and applied in a transaction with bounded lock and statement timeouts. The table and due index were verified present. Only additive schema statements ran; the migration did not change customer rows. Temporary browser credential-transfer storage was cleared. The original credential is still valid, and database external allow-all rules remain unchanged. Neither old-credential revocation nor deploy-hook rotation was included in the approved repair.

The backup remains inside Render: it was not downloaded or restored, so restore readiness is not established. Render documents logical exports and point-in-time recovery separately.[3] Credential retirement should follow verification that all legitimate clients use the new login.[4]

**Successful production email/password login is still unverified.** No production QA account was created and no seeded passwords were reset. An authorized existing user's sign-in and session check are required before accepting authentication as repaired end to end. JWT rotation invalidates prior sessions, as approved.

## Actual test results

The final matching-source isolated unit/regression run passed **1007/1007 tests across 45 files**. It includes 103 new alert-authorization, 21 new MQTT-provenance, 49 deterministic simulator, 130 database-environment and 114 admin-bootstrap regressions. Project typecheck and a clean-environment production build both exited 0. Build warnings remain (including large chunks); no performance or secure-bundle certificate is implied. Three legacy access-gate variable-presence assertions require explicitly synthetic local fixture values; their presence is not authentication-security evidence. The first isolated attempt passed 890/893 and failed only those omitted-variable assertions; supplying QA fixtures produced 893/893 before the 114 bootstrap cases were added. Failed evidence was retained, not erased.

The final existing desktop Chromium suite (files 01–10, one worker, retries 0) passed **178/178**, with no skipped or flaky tests. Targeted Getting Started and Demo sign-in gates passed **4/4** across desktop/mobile Chromium. Prior full runs recorded 177/178: first a Getting Started loading race and later a Demo body-length assertion while authentication was resolving. Corrected tests await the real sign-in gate and validate login navigation; neither starts simulation or proves authenticated demo functionality. Many historical tests are public page-load or shallow conditional checks, not full workflow/authorization coverage.

The final expanded data-backed desktop/mobile suite passed **18/18**, including real owned alert visibility, owner-ID scope, no global alert requests for ordinary users, explicit rule restrictions and admin filters. Its first 16/18 run incorrectly assumed battery registration generated no alert; the repaired assertion checks the real registration alert instead of weakening ownership checks. Mobile coverage is Chromium device emulation, not actual iPhone hardware or Safari.

The guarded real localhost PostgreSQL outbox regression passed against the final QA runtime: atomic insertion, warning exclusion, accepted-no-resend and concurrent lease deduplication. Network was mocked; no PagerDuty incident was sent. An earlier missing-environment attempt stopped at the safety guard and is not counted as passed. Final local rejection/readiness HTTP checks passed 14/14. The separate Python gateway REST offline suite passed 18/18 test methods with additional URL and all 300–399 redirect subcases; device, DNS, broker and HTTP dependencies were mocked.

**Safe production HTTP checks after the configuration redeploy passed 14/14**, including query-backed PostgreSQL readiness and malformed login rejection with HTTP 400. The correct production `/telemetry` namespace at `/api/socket.io` rejected an anonymous handshake with `Unauthorized`. No customer telemetry rooms were subscribed to. Historical 13/14 HTTP and accepted anonymous-socket findings are superseded by these verified newer results, not erased from the assessment history.

A wider fresh selected Semgrep OWASP/secrets scan initially reported three findings: two embedded bootstrap bcrypt hashes and a gateway plaintext HTTP request. Those bounded paths were repaired without executing admin scripts or contacting devices. The final scan ran **286 rules across 366 files, zero findings**, with **11 partial-parser warnings** and approximately 99.9% parsed lines. Its reported Git-target limitation is retained; the new security files are present in scanned-path evidence. Zero findings is not a penetration-test or security certificate. The historical dependency audit remains 9 critical, 102 high, 118 moderate and 21 low advisory occurrences across 229 records; these are dependency-path/advisory occurrences, not demonstrated exploit counts.

## Security tooling and test boundaries

**No Strix scan ran.** Its official setup requires Docker and supported LLM configuration.[1] [2] Docker/Strix and scanner credentials were unavailable. The application's OpenAI key was not repurposed for scanning; Strix Cloud was not used and source was not uploaded there.

Actual methods were selected Semgrep rules, dependency auditing, focused source/control-flow review, low-impact production rejection/readiness probes, real local Socket.IO regressions and isolated data-backed browser/API tests. Six reviewers covered battery lifecycle, marketplace/payments, warranty/health, compliance/documents, AI workflows and realtime/device integrations.

Data-writing QA uses dedicated localhost PostgreSQL `circulair_qa`, with external MQTT, AI, email, S3, Stripe and PagerDuty disabled or mocked. The database has 46 baseline tables plus the outbox. Production actions were limited to the approved credential/configuration/deployment/backup/additive-schema repair and low-impact probes. No customer-message blast, payment capture, broker redirection, internal-network exploit, destructive migration or live on-call test was performed. Passing mocked-provider QA does not establish provider acceptance.

## Implemented controls and their limits

Authentication rejects malformed value types and bcrypt-overlength passwords; JWT signing requires a configured production secret of at least 32 characters. Session identity validates the integer subject and matching user, and current-user responses omit password hashes. Recovery uses canonical trusted URLs and no longer returns tokens/links or copies them into audit notices. Cookie and JWT lifetimes match. Session reads no longer update last-sign-in on every request.

Mutations reject untrusted/opaque origins and cross-site fetch metadata. Read-only session checks no longer consume the login brute-force limiter. Readiness actually executes `SELECT 1`. Webhook deletion includes the authenticated owner in its SQL predicate. The legacy unpaid direct-purchase mutation is disabled; that does not certify the newer checkout/settlement flow.

Telemetry socket handshakes require an approved origin and a valid native session. Battery rooms require ownership or administrator entitlement, and ordinary users cannot join the global anomaly feed. Viewing telemetry no longer starts simulation or persists synthetic readings. Browser ingestion is rejected honestly instead of acknowledging unpersisted data. Those are restrictions, not a complete validated hardware pipeline.

The additional development repair restricts global alert lists and every global alert-rule procedure to administrators. Alert acknowledgements derive owner/admin scope from authenticated context and use one atomic scoped UPDATE with RETURNING. Foreign, unowned and nonexistent rows receive the same NOT_FOUND response. Positive PostgreSQL integer IDs are validated. The UI uses owner-scoped alert queries for ordinary users, explains global-rule administrator access and reports request failures instead of “all systems nominal.” These newer changes are not yet live on Render.

MQTT demo/test/simulator source labels and literal synthetic flags now survive persistence and alert metadata in development; streams and server-owned test publishers are marked synthetic. That prevents explicitly marked synthetic critical alerts from paging. It does **not** authenticate hardware origin or isolate every simulation write: missing/misleading labels, topic identity, broker ACLs, heartbeat/cooldown and EOL changes remain risks.

The simulator's resistance was incorrectly applied as a per-cell drop and then multiplied by the series count. The dimensional repair applies pack resistance once. All 49 deterministic regression cases failed before the fix and passed afterward; unchanged gateway bounds were not widened. This is still an uncalibrated demo model. A stressed lead-acid case can produce negative voltage because cutoff/protection behavior is absent. It must not drive safety decisions.

The unused PDF dependency and remaining external-agent runtime/debug/auth/provider adapters were removed in the deployed checkpoint. Authentication is native JWT email/password, with direct service integrations. Runtime cleanup is not evidence that every configured external provider works.

The gateway REST reader now requires an explicitly configured HTTPS endpoint except exact loopback HTTP, refuses URL userinfo/fragments/malformed endpoints, disables redirects, verifies TLS and logs fixed errors. Its offline 18-case retest is not live device/TLS acceptance. Other gateway readers, payload limits, topic ownership and broker configuration remain outside that transport fix. The dormant admin scripts retain their pre-existing unverified database TLS options; they must not be used as production provisioning merely because offline validation passed.

## Remaining launch blockers

Environment-only resolution is complete in the tested development source: four embedded PostgreSQL URL literals were removed from runtime, Drizzle and both admin entrypoints; malformed selected PostgreSQL configuration fails closed with fixed URL-free errors. The four-entrypoint scan is not a repository/history-wide secret audit. Both ESM admin scripts now require explicit validated server-side bootstrap identity/password, use fresh salted hashes, have no fixed identity/hash and produce static logs. Offline initializer/structural tests do not execute their SQL; their conflict path can reset/promote an explicitly named existing user and needs separate authorization before use. Old database credentials and historical seeded credentials remain exposed in history until safely retired; no customer account was reset. All-client checks, separate revocation/hook-rotation approval, legacy deployment-artifact reconciliation and backup restoration remain open. Database external ingress is still broadly allowed.

Complete resource-level authorization across warranty/customer lookup, private documents/downloads, assistant conversations, device credentials/broker management, battery lifecycle and regulatory declarations. The new alert controls fix bounded paths, not whole-platform tenant isolation. PDF templates interpolate unescaped user HTML into a script-enabled browser with unrestricted resource requests; content escaping and script/network restrictions remain open. Private S3 and webhook destination protections need separate validation.

Real-money marketplace acceptance requires exact offer/listing binding and seller acceptance, validated amount/currency, atomic reservations, idempotent monotonic webhook settlement, conflict handling, verified success UI and defined payout/refund behavior. Foreign-battery listing/photo authorization also remains open. Do not accept real money on the strength of page-load or mocked tests.

Unify 19-/21-character BPAN contracts across decoder, service, warranty, advanced modules and MQTT. Derive canonical battery identity server-side instead of accepting mismatched IDs or `batteryId=0`. Correct physical/calendar/range validation, meaningful zeros, atomic multi-step writes, negative/repeated yield credits and revocation undone by heartbeat. Hardware topic/payload/device ownership, pack/cell thresholds and rule behavior require real staging validation.

Carbon conversion is off by a factor of 1,000 in reviewed paths; cycle degradation has a percent-unit error; digital-twin forecasts and triage/UI contracts remain defective. Blockchain verification, compliance certification, neural accuracy, federated training, autonomous actions, carrier dispatch, matching and some SDK interfaces are fabricated, metadata-only, absent or unverified. Implement them or label/disable them. Global all-time compliance data is not organization/period reporting. The public health/uptime claims are not measured provider availability.

## PagerDuty and availability

Native Events v2 delivery, privacy-minimized events, stable deduplication, bounded retries, atomic durable outbox persistence and admin-only status are implemented. The production outbox schema is now present, but **PagerDuty remains disabled**, with no routing key, live incident or on-call notification verified.

Activation still requires secure routing-key/region configuration, review of source/authorization/safety gates, the intended service's escalation policy and a separately approved live test. The optional native Render retry Cron template has not been created; it is billable and needs separate approval. Reading an in-app alert does not acknowledge or resolve PagerDuty. The runbook defines setup, failure handling and rollback.

The integration pages persisted application alerts, not outages that prevent persistence. Independent uptime detection, alert-delivery validation, provider/hardware acceptance, measured availability objectives and restore exercises remain open. No test can guarantee that the service will never stop working.

## Handoff

The observed live release remains `54920faa` with the completed configuration/schema repair. The newer tested source is delivered as a development checkpoint identified in the archive's evidence summary, not a controlled Render release. Auto-Deploy remains Off. Existing-user production sign-in is the next immediate authentication gate; no impersonation session or production QA account was created.

Project brief, delivery inventory, QA guide and persona feedback instructions are refreshed. Persona profiles are fictional composites, not recruited or interviewed people; no real-user feedback has been collected. The sanitized archive includes final derived summaries, baseline reviews and dated remediation notes, but excludes environment files, customer records, source/history, session traces and raw logs. Baseline findings remain open unless a bounded dated fix explicitly supersedes them; technical reviews and automated passes are not compliance/provider certificates.

## References

[1]: https://github.com/usestrix/strix "Strix official open-source repository and setup requirements"
[2]: https://docs.strix.ai/ "Strix official documentation"
[3]: https://render.com/docs/postgresql-backups "Render PostgreSQL backups, logical exports and point-in-time recovery"
[4]: https://render.com/docs/postgresql-credentials "Render managed PostgreSQL credential rotation and login roles"
