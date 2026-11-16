# Circul-AI-r retest and security report

**Circul-AI-r is not yet ready to be certified fully functional or secure for unrestricted production use.** The retest found important security and workflow defects despite the historical automated tests passing. Prioritized fixes are implemented and tested locally, but have not been pushed to GitHub main or deployed to Render. Production still accepts an anonymous telemetry socket handshake and returns HTTP 500 for a malformed login email object.

Assessment date: 16 November 2026. Reviewed baseline: `27427a49d986dd2b3e1fcc7d0d641319d88825e4`, also observed on GitHub main. The Render deployed commit was not independently verified because its dashboard requires sign-in.

## Actual test results

- **Automated unit/regression tests:** the latest suite passed 590 tests across 41 files, up from the initial 551-test remediation snapshot and 518-test baseline. Original added security regressions include six real local Socket.IO connection/subscription tests, authentication and recovery checks, webhook ownership, and unpaid purchase rejection. PagerDuty adds configuration, privacy, deduplication, retry/outbox and administrator authorization regressions.
- **TypeScript:** passed, including the new guarded QA tests. **Production build:** passed. Large frontend chunk warnings remain; these checks do not establish production performance or availability.
- **Latest existing browser suite:** 177 passed and 1 failed out of 178 Chromium tests against the new compiled production-mode QA server, after updating obsolete OAuth/authentication checks. The failure read 22 characters of temporary loading text before the Getting Started auth gate finished rendering. The test now awaits the actual sign-in screen, clicks its action and verifies the email/password login route. A targeted follow-up passed both desktop and mobile Chromium checks, with no skips or flaky results. This is not represented as a fresh 178/178 full-suite pass; the delivered runtime code is unchanged by this test-only correction.
- **New data-backed desktop/mobile suite:** all 14 passed, with no skips or flaky results. It verified real registration/session creation, battery persistence/readback, cross-account webhook deletion protection, unpaid purchase rejection, hostile-origin rejection, authenticated dashboard rendering, alert-filter opening and homepage viewport fit. Mobile testing used Chromium device emulation, not real iPhone hardware or Safari.
- **Local HTTP security smoke:** 14 of 14 passed. **Production HTTP smoke:** 13 of 14 passed; malformed login returned 500 rather than the expected 400. The corresponding fix is local only.
- **Anonymous telemetry handshake comparison:** production accepted; patched QA rejected with `Unauthorized`. The production check did not subscribe to battery rooms, ingest readings or retrieve customer telemetry.
- **Semgrep:** selected OWASP Top 10 and secrets rules ran successfully; the latest scan after PagerDuty/runtime cleanup covered 111 rules and 247 files with zero findings. Independent source review nevertheless found serious issues that these rules missed. Zero matches is not a clean security bill.
- **Dependency audit after removing unused `html-pdf-node`:** metadata reported 9 critical, 102 high, 118 moderate and 21 low advisory occurrences. Before removal, the corresponding values were 9, 114, 119 and 21. These are dependency-path/advisory occurrences, not a count of proven exploitable application vulnerabilities. The remaining audit contains 229 advisory records and still requires remediation.

The historical 176-check Chromium run passed 174 checks, with two shared-traffic HTTP 429 failures that passed an isolated targeted rerun. An earlier dev-server browser run produced 159 passes and 17 failures while code reloads interrupted requests. A subsequent QA attempt incorrectly launched TypeScript source with production static-file resolution, producing 404 pages; that harness was corrected to `node dist/index.js`. A desktop filter test initially selected the language dropdown instead of the chemistry filter and was corrected. The first Getting Started follow-up passed desktop but could not launch the default mobile WebKit browser because its executable was not installed; the subsequent explicit Chromium desktop/mobile configuration passed 2/2. These diagnostic runs are not treated as fresh full-suite acceptance results. Production rate limits were not weakened to make tests pass.

## Security tooling and safe test boundaries

**No Strix scan ran.** The official open-source setup requires Docker and a supported LLM credential.[1] [2] Docker and the Strix CLI were absent, and `STRIX_LLM`/`LLM_API_KEY` were not configured. The application's OpenAI credential was not repurposed for a scanner. Strix Cloud was not used and application source was not uploaded to it. Running Strix remains a separate follow-up in an appropriately configured, authorized environment.

The assessment actually performed Semgrep scanning, dependency advisory auditing, focused source/control-flow review, low-impact HTTP checks, real local socket regressions, and isolated data-backed browser/API tests. Six dedicated reviewers covered battery lifecycle, marketplace/payments, warranty/health, compliance/documents, AI workflows and realtime/device integrations. Their detailed reports identify source-confirmed defects separately from conditional or live-unverified risks.

Production checks used low traffic and read-only or invalid-input/rejection probes. No successful customer-data mutations, brute-force campaign, payment capture, recovery-email blast, SMS/WhatsApp delivery, broker redirection or internal-network exploitation was performed. Data-writing tests used a fresh localhost PostgreSQL database with reviewed additive CREATE statements for 46 baseline tables plus the PagerDuty outbox, totaling 47. No production migration or destructive schema operation was performed. External MQTT, AI, email, S3, Stripe and PagerDuty integrations were disabled or network-mocked in QA; passing QA therefore does not certify those providers.

## Implemented and verified locally

**Authentication and recovery.** Login/registration now reject malformed value types and passwords above bcrypt's 72-byte boundary. JWT signing requires a configured secret, with a minimum production length of 32 characters; session identity validates a safe integer subject and matching database user. Password-reset links use the canonical trusted application URL instead of attacker-controlled Origin/Referer values. Recovery tokens/links are no longer returned in development responses or copied into owner audit notices. `auth.me` omits the password hash. Cookie lifetime matches the 30-day JWT, and HTTP localhost uses Lax cookies while HTTPS retains Secure cookies. Session reads no longer write `lastSignedIn` on every request.

**Request and readiness protection.** Mutating API requests reject untrusted or opaque origins and cross-site fetch metadata. Read-only session checks no longer consume the login brute-force limiter, though the general API traffic limiter still applies. Readiness executes `SELECT 1` and returns 503 when the database is unavailable, rather than declaring an allocated connection object healthy.

**Ownership and payment bypass.** Webhook deletion includes both the webhook ID and current user ID in its SQL predicate; the two-account real-data regression confirms a foreign row remains intact. The legacy direct `marketplace.purchase` endpoint is disabled with FORBIDDEN because it could mark a listing sold without payment. Disabling that bypass is not certification of the newer checkout/settlement flow.

**Realtime integrity.** Socket handshakes require a valid server-side session and approved origin. Battery-room subscriptions require ownership or administrator entitlement. Ordinary users cannot subscribe to the global anomaly feed. Viewing a battery no longer automatically starts a simulator or persists synthetic readings. Browser socket ingestion is deliberately rejected with an honest error rather than acknowledging an unpersisted reading. These are safe restrictions; they do not implement or certify a complete hardware telemetry pipeline.

**UI and dependencies.** Three invalid empty Radix Select item values were replaced with nonempty `all` sentinels, and the actual chemistry/metric dropdowns opened successfully on desktop and mobile emulation. The obsolete, unused PDF dependency was removed. Generated browser outputs are ignored to keep future snapshots cleaner.

**Deployment independence.** The remaining development-runtime plugin, debug collector and unused provider/auth adapters were removed. Runtime/public-source checks found no remaining references to the removed provider in client/server/shared code, the manifest or Vite configuration. Operator docs and obsolete OAuth tests now describe standalone JWT email/password authentication and direct OpenAI, S3 and email integrations on Render/PostgreSQL. These changes are local, not evidence that the live deployment has been updated.

Baseline review findings locally addressed include MP-01, RT-01, RT-07, RT-10, the automatic simulation component of B04, and the false-success behavior of RT-16 by disabling browser ingestion. Other findings in the baseline module reviews remain open unless specifically identified above. Their baseline line numbers are not line numbers for the patched snapshot.

## Remaining release blockers

### Render configuration and exposed credentials

Credential-bearing PostgreSQL fallbacks remain in `server/db.ts` and `drizzle.config.ts`, with additional historical credential locations recorded privately. The fallbacks currently mask incompatible MySQL/TiDB environment configuration. Removing them before correcting Render's environment could stop the live application. Do not interpret their temporary preservation as an acceptable final configuration.

Restore Render dashboard access, establish valid environment-only PostgreSQL configuration, rotate the exposed database credential and any exposed deployment token/hook, then remove the embedded fallbacks and verify a controlled rollout. Reconcile `render.yaml` and the checked-in MySQL migration with the actual PostgreSQL architecture. Back up production first and verify rollback access. No credential values are included in the deliverables. The historical claim that all TiDB records were migrated was not revalidated with current source/target row reconciliation during this assessment.

### Tenant isolation and private data

The remaining source-confirmed authorization gaps include public full warranty/customer lookup, unscoped private document metadata/download URLs, assistant conversation access by another user's session ID, device credential access/mutations, global broker management, alert-rule mutations, alert reads/acknowledgements, battery lifecycle changes and regulatory declarations. Authentication alone does not provide resource-level authorization. Complete owner/organization/role predicates and public-field projections across every alternative API surface, then repeat two-account and administrator regressions.

PDF templates also interpolate unescaped user HTML into a JavaScript-enabled browser with unrestricted resource requests. Escape content and restrict script/network execution before exporting untrusted inputs. Internal-network exploitability was not exercised. Private S3 access and webhook destination protections need separate validation.

### Real-money marketplace

Checkout still needs exact offer/listing binding and seller acceptance, validated amount/currency, atomic reservations, webhook idempotency and monotonic settlement, conflict handling, verified success UI, and a defined seller payout/refund flow. Foreign-battery listing and photo-deletion authorization also remain open. Do not accept real money based on page-load tests or a passing unit suite. The existing payment-success page's unconditional success message is not payment evidence.

### Battery lifecycle and safety workflows

Unify the 19-/21-character BPAN contracts across generation, decoder, service, warranties, advanced features and MQTT. The real-data regression proves a 21-character battery can be created/read; it does not prove that incompatible downstream modules accept it. Service, pickup, yield and warranty paths must derive canonical battery identity server-side rather than accepting a frontend `batteryId=0` or mismatched ID/BPAN.

Correct date/specification/range validation, preserve meaningful zero values and make multi-step writes atomic. Resolve negative/repeated yield-credit issuance. Device revocation must not be undone by heartbeats. MQTT topic/payload/device identity binding, cell-versus-pack voltage thresholds, persisted thermal alerts and rule behavior across ingest paths still require correction and real broker/hardware tests.

### AI, carbon and misleading feature claims

The source review confirmed a carbon conversion error by a factor of 1,000, a cycle-degradation percent-unit error, digital-twin forecasts that can increase SOH incorrectly, and response-field mismatches that can crash or empty advanced UIs. Triage displays/approves the wrong fallback recommendation and lacks durable authorized approval state. These require calibrated numeric fixtures and end-to-end contract tests, not merely bounded-output assertions.

Blockchain hashes/blocks, compliance certification, neural-network accuracy, federation/training, agent execution, carrier dispatch, forward-order matching and some SDK/integration interfaces are fabricated, metadata-only, absent or unverified. Implement the actual workflows or label/disable them clearly. Organization/period compliance reports currently use global all-time data. The health portal's green cards and uptime/incident claims are not provider measurements; the improved `/api/health` only establishes a database query, not all integrations.

## Pager messages and availability

The user confirmed **PagerDuty incident alerts**. A native Events API v2 adapter, atomic alert/outbox persistence, privacy-minimized payloads, stable per-alert deduplication, bounded retries and administrator-only status are now implemented. A real localhost PostgreSQL test proved atomic insertion, warning exclusion, no resend after accepted status and concurrency-safe leases; its network was mocked and no on-call message was sent. The full 14-check desktop/mobile suite passed again against the new build with PagerDuty and all external integrations explicitly disabled.

The integration remains disabled until the routing key/region, additive production migration, alert-source/authorization controls and intended PagerDuty service are verified on Render. A separate optional Render-native retry Cron template is provided but has not been created; Render documents a minimum monthly charge of $1 per Cron service plus active compute billing. The runbook records official sources and exact setup/rollback gates. This implementation pages persisted critical application alerts, not application/database outages that prevent persistence; independent uptime detection still needs configuration. Reading an alert does not resolve a PagerDuty incident.

No retest can guarantee that a service will never stop working. A credible availability claim needs measured monitoring, alert delivery, backups, restore exercises, integration failure handling, controlled deployments and an agreed service objective. Those operational checks and provider/hardware acceptance tests are still open.

## Delivery and next release gate

The tested remediation is a development snapshot, not a Render release. There was no explicit GitHub main push or Render deployment in this assessment. Restore Render sign-in, correct and rotate configuration, resolve the remaining priority blockers, and establish an authorized staging acceptance matrix before launching all advertised features. Confirm the actual deployed commit and rerun production health, login/recovery and safe owned-resource workflows after deployment.

The accompanying archive contains this report, release gates, the PagerDuty runbook and safe standalone migration/optional Cron template, the retest plan, the Strix feasibility record, six baseline module reviews, and sanitized machine-readable result summaries. It deliberately excludes secret environment files, application source/history, customer records, session traces and raw logs. Detailed reviews are technical remediation evidence, not live-exploit or integration certificates.

## References

[1]: https://github.com/usestrix/strix "Strix official open-source repository and setup requirements"
[2]: https://docs.strix.ai/ "Strix official documentation"
