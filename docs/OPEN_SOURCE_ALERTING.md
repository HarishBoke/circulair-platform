# Durable open-source incidents — Render-only and default Off

Updated 18 November 2026. The generic incident store, native administrator router and same-transaction alert integration are implemented in development. They are not production-migrated, enabled or released. No message or test incident has been sent. PagerDuty was declined; its existing rows remain retained and inactive, with no replay or reinterpretation. Runtime processing belongs to the approved Render background worker, not Manus scheduling, Forge, a browser timer or request-owned fire-and-forget work.

Latest read-only Render settings **17 November at 23:09:40 UTC**: **Set 5k**, application **`srv-d87hoqcm0tmc739tv580`**, **Standard / Oregon**, repository **main**, full live commit **`122e209b52cdcd01f55690363193d7a09659e0c2`**, deployment **`dep-dbua7eui0phs7397qbng`**; **AutoDeploy Off / PR Previews Off**. Same existing-user positives at **19:17 / 19:40 UTC**, no new production login/release/SQL/resources/payment inventory. Candidate unreleased; source publication status recorded separately in dated delivery evidence. Local checks do not establish hosted CI; verify the exact candidate run before release.

Final exact sterile CI-equivalent acceptance completed **23:12 UTC**, from a **454-file** snapshot including final Home font and both Dockerfiles with all `.env` filenames omitted: default Vitest configuration (no custom setup), started **23:09:37 UTC**, **65 suites / 1,916 passed / 0 failed / 28 opt-in PostgreSQL skipped / 1,944 collected**, **61.63 seconds**; typecheck **0**, normal frontend/server/real-worker build **0**, compiled worker **8/8**, Python compile **0**, offline Python **50/50**; **all six command exits 0**. The earlier **22:54:20 UTC** guarded root run is a distinct positive snapshot, not the default-CI proof. Local checks do not establish hosted CI; verify the exact candidate run before release. Hosted CI had not started at document preparation; later source publication and hosted-run status are separately dated delivery evidence.

## Exact approved stack

The approved new single-instance Oregon resources total **USD 53.75/month additional compute/disk baseline**: `circulair-uptime`, web 1 CPU/2 GB at USD 25 plus 1 GB `/app/data` at USD 0.25; `circulair-notify`, web 0.5 CPU/512 MB at USD 7 plus 1 GB `/var/lib/ntfy` at USD 0.25; `circulair-alertmanager`, private 0.5 CPU/512 MB at USD 7 plus 1 GB `/alertmanager` at USD 0.25; `circulair-alert-gateway`, web 0.5 CPU/512 MB at USD 7 without disk; `circulair-incident-worker`, worker 0.5 CPU/512 MB at USD 7 using existing PostgreSQL without another disk/database.

Existing app/database/workspace charges, tax and metered overages are excluded. No sixth service, autosizing increase, new database, domain, workspace upgrade or other provider is approved. No new monitoring resources exist at this snapshot. Cost approval does not authorize production SQL, live notification or iPhone relay activation. Read [Release gates](RELEASE_GATES.md) before any creation or activation.

The intended flow is Render application transaction → existing Render PostgreSQL incident/delivery store → Render worker → authenticated Render HTTPS gateway → private Render Alertmanager → authenticated Render ntfy. Kuma observes approved public readiness independently of application incident persistence, but shares Render's provider-wide outage failure domain. This is not high availability or an implemented on-call roster/escalation product.

## Actual integration

`server/db.ts` now returns the exact inserted alert and awaits `enqueueIncidentForAlert` inside the same transaction. Old declined-provider enqueue/immediate-drain hooks are not invoked for new alerts; old tables/data/code remain intact. `server/routers.ts` mounts `incidents: createIncidentRouter(...)` in the native app router, and schema discovery includes `drizzle/incidentSchema.ts`. No whole-project SQL push or automatic startup migration is performed.

The optional `LiveCriticalContext` is trusted server-owned acquisition/authentication state, never request JSON or metadata. All current alert callers remain contextless/nonpaging. `LOCAL_PILOT` BMS-reported readings, a Bearer token, HTTPS or an operator declaration are not verified physical hardware provenance and do not automatically page. A future live producer must be separately reviewed, enforce persisted tenant/asset ownership and source vetoes, and supply the enumerated `availability|telemetry|security|operational` category.

The store checks activation time, trusted live-critical source, persisted owner/user, transaction-local alert identity and synthetic vetoes; historical scans/backfills cannot create new incidents. Random incident/delivery UUIDs are not derived from customer/device/alert identifiers. Arbitrary titles, messages, telemetry, documents and secrets are not stored in delivery payloads or sent to the phone. Only minimized opaque incident identity, category and stable timestamps reach the adapter.

The native router exposes administrator status, resolution, destination approval, dead-letter retry and quarantine release. There is no send/test endpoint. Default-off admin status is metadata-only and does not resolve a database or construct a pool; disabled commands conflict with zero database work. Anonymous and ordinary users are forbidden. Enabled views/commands recheck the persisted administrator role inside a transaction rather than trusting a forged role field. Resolution requires an enumerated verified reason and an opaque UUID evidence reference; the accountable operator, not the software, verifies physical recovery evidence. Reading an alert or silencing Alertmanager never resolves the incident.

## Build and disabled operation

The normal root `pnpm run build` includes `pnpm run build:incident-worker`. That script uses the reviewed installed esbuild/node-postgres/Drizzle graph and emits a standalone external-dependency ESM artifact:

```sh
pnpm install --frozen-lockfile
pnpm run build:incident-worker
node infra/monitoring/worker/dist/incident-worker.mjs --once
```

Default one-cycle execution exits immediately when disabled, with no database credentials/resolution or provider request. Runtime dependencies must remain installed because the bundle uses `--packages=external`. The worker service build/start uses `infra/monitoring/worker/build.sh` and `entrypoint.sh`, not the web application main loop. Build and release-review booleans ship false in the Blueprint and are technical operator gates, not authorization inferred from a filename.

An approved disabled Render daemon requires `RENDER=true`, `INCIDENT_RENDER_WORKER_APPROVED=true`, `INCIDENT_WORKER_RELEASE_REVIEWED=true` and the actual artifact, with both delivery flags false. It emits a sanitized disabled summary, attempts zero deliveries and sleeps until shutdown; SIGTERM exits cleanly. This is the real application worker, not a substituted fake heartbeat. Mixed flags are rejected. Flags are snapshotted at startup, so reviewed changes require a restart.

## Separate migration and notification activation

The exact additive artifact is `drizzle/open-source-incidents.sql`, SHA256 `e61310067e36e1f9ac32f7e65beb1d0cb489d0a78652d81d6d16bd5359186c4f`. It defines four new `oss_incident_*` tables and four indexes, with references to existing users/alerts. Obtain separate production approval and read-only collision/schema/grant preflight, apply exact bytes in a bounded controlled transaction and verify definitions. `IF NOT EXISTS` is not proof of a correct pre-existing table. No old alert/provider row is imported, rewritten or deleted.

Keep the following Off/unset until explicit activation acceptance:

```dotenv
OPEN_SOURCE_ALERTING_ENABLED=false
INCIDENT_OUTBOX_ENABLED=false
ALERT_NOTIFICATIONS_ENABLED=false
INCIDENT_ACTIVATION_AT=
INCIDENT_ACTIVATION_APPROVAL_REF=
INCIDENT_REFRESH_SECONDS=60
```

Activation requires canonical UTC milliseconds time, an approved opaque evidence UUID, the correct HTTPS gateway/app origins, enumerated environment, high-entropy publisher Basic credentials and a durable matching destination fingerprint. `incidents.approveDestination` records the authenticated actor and reviewed evidence but does not toggle flags or send. The native router itself remains gated until enabled configuration is valid. Deployment/approval sequencing must therefore be deliberate; missing configuration/approval leaves queued work unclaimed rather than discarded.

A fingerprint changes with destination, application origin, environment, username or password. Changed destinations quarantine previously pinned incidents and deliveries; they are never rerouted. Quarantine release only resumes the exact original pin. Credential rotation to a new fingerprint needs a separately reviewed old-destination closure/migration plan. No automatic rebind is exposed.

The current Alertmanager receiver is `notifications-disabled`. Never activate a producer/outbox against it: HTTP acceptance without a configured receiver is not delivery. The offline receiver/template generator creates a candidate only under explicit notification approval and private-file constraints. Its current output is not adopted automatically, and notification-enabled native image/config changes require actual separate acceptance. Create a regular write-only publisher and distinct read-only subscriber/token for one approved private topic; do not use the bootstrap administrator credential on a phone or worker.

## Privacy, native service and phone gates

The gateway permits authenticated POST `/api/v2/alerts` only. It rejects anonymous, other-method/path, oversize or unframed/chunked requests before upstream, uses a fixed private Alertmanager host/path, strips Authorization/Proxy-Authorization/Cookie and clears queries. Exactly 2048 framed bytes are allowed; framed 2049 bytes receive 413, and absent Content-Length/chunked framing receives 411. Render edge TLS is used; no ACME disk, public Alertmanager UI or gateway admin API is enabled. Gateway health proves liveness only.

Kuma's native setup/socket/UI are guarded by separate operator Basic auth. Native admin setup is supported through its real first-run flow, not fabricated v3 initial-admin variables or direct database insertion. `/livez` supports initial process startup; `/healthz` remains 503 until an active native admin, enabled native authentication and bootstrap completion are all verified. ntfy persists auth/cache, uses deny-all anonymous ACLs, and leaves signup, web UI, attachments, SMTP, Firebase, web push and upstream relay Off. Native setup must not reset an existing principal on ordinary reboot.

Instant self-hosted iPhone wakeup may require the ntfy.sh upstream poll relay plus Firebase/APNs, disclosing hashed topic/message identifiers and timing metadata. That consent and a controlled phone/responder test have not occurred. Notification HTTP acceptance is not phone display or a human acknowledgement. Same-Render monitoring and single-instance disks cannot guarantee continuous observation, autoscaling or zero downtime. Keep sensitive backups encrypted/private and test restoration with writers stopped or supported SQLite backup semantics; redeploying an image does not reconstruct disk state.

## Ordering and honest failure behavior

Incidents use one stable UUID/start and increasing action versions; each delivery version is unique and destination-pinned. Refresh interval is validated to 30–180 seconds, default 60. Open incidents refresh, while a verified resolution creates a persistent explicit resolve action with stable end time and never automatically reopens.

Claims lock incident before delivery, use `FOR UPDATE SKIP LOCKED`, random lease tokens, monotonic lease generation and 120-second expiry. Send/completion and resolution share the incident/delivery lock order. Adapter HTTP timeout is six seconds, dispatcher await bound 6.5 seconds, database lock timeout one second, statement timeout two seconds and idle transaction bound ten seconds. The worker pool is at most two connections, with a three-second connect timeout, five sequential deliveries per cycle and 15-second sleep. Capacity/backlog/DB budget and verified TLS remain production checks.

Database failure after HTTP acceptance rolls back bookkeeping and leaves the lease recoverable. Expired claims fence the old generation and record ambiguity. Retry backoff is bounded to one hour; eight attempts reach a visible dead letter. Operator retries are audited. Destination changes quarantine rather than silently reroute. Resolution encountering a busy lock conflicts honestly and must be retried.

There is no exactly-once or guaranteed external causal-ordering claim: a canceled/timed-out HTTP request may complete upstream after a local resolve. Durable `resolve_pending` and explicit repair retry/refresh preserve that ambiguity, including after an accepted resolve; they do not prove remote lateness has ended. Repair may continue indefinitely and can cause additional traffic/duplicates. A separate independently reviewed retirement policy is required before stopping it. Lost refresh/heartbeat is never verified physical recovery. Dead-letter and repair backlog require independent operator visibility.

## Actual acceptance and remaining gates

Focused incident acceptance passed **35 offline + 28 guarded actual private-PG with mocked sender + 60 adapter = 123**; central actual-router/transaction tests added **47**. Final root run started **22:54:20 UTC**, exact **Node 24.14.1 / pnpm 10.34.5**, **65 suites / 1,916 passed / 0 failed / 28 opt-in PG skipped / 1,944 collected**, typecheck **0**. Do not add overlapping focused totals or relabel skips as full-suite passes. Earlier exact sterile CI-default passed same Vitest totals/typecheck plus normal frontend/server/real-worker build **0**, worker **8/8**, Python **50/50**, before final font correction. Final exact sterile default-CI-equivalent acceptance completed **23:12 UTC**, all six command exits **0**; source publication/hosted CI are separately dated evidence, not an assumed hosted green run. Pilot remains **15 TSX + 15 ESM** real-private-PG groups with two synthetic namespace users and no public customer writes; corrected pilot hash `edff6d0267a8b38d4f47f3c08f03d57589a989260587d41812e6482735745a3e` unchanged.

Native monitoring checks **9/9**; final affected Kuma/gateway container acceptance completed **23:04:33 UTC**, **105/105 = 97 + 8 gateway restart**. Kuma root-owned sudo **4755 → 755** prevents optional native NSCD root startup; container flag **`1`**, upstream code, sudoers/settings DB unchanged. Existing mode-755-guarded build-time `setcap -r` removed only unused Caddy **`cap_net_bind_service=p`** from both binaries; exact pins preserved, one new build each. Nonroot **UID 1000 / UID 65534** descendants showed **CapPrm/CapEff/CapInh/CapAmb = 0** across **19** startup/restart/post-auth snapshots, including pre-QA exec. **CapBnd not zero**, no all-OS audit. Native SQLite/Basic/socket/setup/admin login persistence, readiness **503 → 200**, `/livez`, **PORT 10000**, original four exit-78 guards, sudo denial and SIGTERM **0** passed; gateway 2 KB/auth-strip/query-clear/anonymous **401**/unframed-and-chunked **411**/restart passed. ntfy/Alertmanager unchanged, retain prior positives, not new strict capability proof.

Preserve initial **109 = 106 pass / 3 fail**, sudo raw **92 = 80 pass / 12 fail**, new preflight **8 = 7 pass / 1 wrong-tag QA-oracle fail** with rootless mount exit **125** interruption; new raw **113 = 112 pass / 1 fail**, not cumulative all-passed. Final cleanup **66 private files 0600 / 8 dirs 0700 / env 0600**, owned containers/mapped application-UID processes zero; new-evidence secret scan **181 files / 72 candidates / 0 matches**. Disabled cgroups do not establish 2 GB enforcement; Render mounted-disk ownership remains conditional.

Final selected Semgrep **23:08:48 UTC**, exit **0**, **294 rules / 451 targets / 10 flags / 12 parser/error entries / approximately 99.9% parsed**; ten operator-controlled QA subprocess flags retained unsuppressed. Initial **20:38 UTC, 449 / 14 / 13** and accepted post-hardening **21:02 UTC, 451 / 10 / 12** preserved; four explicit-USER flags removed. Strix **NOT RUN**, no full pentest or zero-vulnerability claim. Dependencies remain **42 full (3 critical / 14 high / 20 moderate / 5 low)**, **16 production (0 critical / 8 high / 5 moderate / 3 low)** occurrences, not exploit counts/live-tree audit.

Fresh Chromium **178/178** started **22:55:03 UTC**, focused **18/18** started **22:54:22 UTC**, Getting Started **4/4**, HTTP **14/14**: one worker, zero retries/skips/flaky cases, fresh guarded server per suite, unchanged rate budget, no MCP/CDP/existing browser; owned servers stopped **0**, port **3001** closed. Mostly auth gates, not all-positive business or real iPhone/Safari. Home font **24 / 30 / 36 / 48 px** preserves words and fixes **320 px viewport / 341 px scroll-width overflow**; preserve pre-origin **16/18 / 175/178** (two hostile-Origin 500s, shared-budget malformed-auth 429, overflow), post-origin **177/178** (overflow only) and failed decorative-wrapper-only attempt. Synthetic legacy **21 batteries plus one informational alert per bounded fresh owner** are not official generator output; generator **412 disabled**, read-only decode unverified, foreign read **404** unchanged.

Correct-workspace creation, Render disk/memory/readiness, exact hosted CI/release, production migration, native receiver/trusted live producer, private least-privilege tokens, restore and phone/responder acceptance remain separate. No automatic phone paging, official BPAN, hardware adapter, receiver consent, physical capture or UAT exists; **54 new manual cases NOT RUN / seven fictional personas / scorecards blank**. In-flight financial inventory/manual reconciliation remains required before webhook-rejecting release, not performed. Already approved **$53.75** five-single-instance-Oregon baseline is not a reconfirmation or automatic increase; existing charges/tax/usage/separately charged backup/maintenance excluded. See [QA](QA_DOCUMENTATION.md), [Retest report](RETEST_SECURITY_REPORT.md), [monitoring guide](../infra/monitoring/README.md) and [Release gates](RELEASE_GATES.md).
