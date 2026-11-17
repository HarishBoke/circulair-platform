# Circul-AI-r release gates after retest

Updated 17 November 2026. This retest does not certify 100% product functionality, security, compliance or uninterrupted availability. Historical completion checkboxes and mocked tests are not acceptance certificates.

## Completed production repair

Render commit `54920faa9c392fa03a1689e4cbe151d67323edda` is observed live. After explicit user approval, a protective Render logical export was confirmed ready, a new managed PostgreSQL credential created while preserving the original, DATABASE_URL corrected, JWT rotated to a cryptographically random 64-character secret, canonical APP_URL configured and PagerDuty kept false. Controlled configuration deployment `dep-dbu0nbg8v5cc73bj680g` reached live. The running service's new PostgreSQL session login and configuration were verified without printing secrets. The reviewed additive outbox table/index were applied and verified. Auto-Deploy remains Off.

Post-repair safe production HTTP checks passed 14/14. Correct anonymous telemetry handshake was rejected with Unauthorized. **Successful existing-user production email/password login remains unverified** and is the next immediate gate. No seeded passwords were reset or production QA user created.

## Infrastructure and credentials

Environment-only source cleanup and matching local unit/typecheck/build/browser verification are complete, together with explicit-input bootstrap and gateway transport repairs. Save/identify the tested development snapshot and perform a controlled fallback-free release only after authentication/release gates are reviewed. Do not confuse it with live `54920faa`. Retire the old exposed database login only after all clients are verified and separate approval; rotate the exposed deploy hook/token under a separate gate. Broad external database ingress remains unchanged and needs a legitimate-client inventory before narrowing.

The protective export is inside Render, not downloaded or restore-tested. Verify restoration to an isolated instance and rollback access. Reconcile render.yaml and legacy MySQL artifacts with actual PostgreSQL without rerunning destructive migrations. Historical TiDB migration row reconciliation was not repeated.

## Security

New development fixes restrict global alert/rule procedures to admins and acknowledgements to atomic owner/admin scope; role-aware UI uses owner alert queries and explicit global-rule access notices. Verify their controlled rollout. They do not establish platform-wide tenant isolation.

Complete resource authorization for battery lifecycle, warranty/customer lookup, assistant conversations, device credentials/broker management, regulatory declarations and private documents/downloads. Escape untrusted PDF HTML and restrict renderer script/network access. Validate private S3 and webhook destination protections.

Fix offer/listing binding, seller acceptance, atomic reservation, idempotent monotonic payment settlement, amount/currency, refunds/payouts and misleading success UI before accepting real money. The legacy unpaid purchase is disabled, not a payment certification.

Triage dependency advisories with compatible upgrades and regression evidence. The fresh selected Semgrep scan ran 286 rules across 366 files with zero findings and11 partial-parser warnings; this does not prove security. Three prior findings led to bootstrap-hash and gateway-transport repairs. Strix has not run; supply a supported scanner environment/credentials separately without repurposing app keys.

## Functional and hardware acceptance

Unify19-/21-character BPAN contracts across consumers; derive canonical battery identity rather than accept batteryId0/mismatches. Validate dates, physical limits and zeros; fix repeat/negative yield credits and revocation undone by heartbeat. Broker ACLs, device/topic/payload ownership, threshold units and real telemetry remain unverified.

New synthetic-label preservation suppresses pages for marked demo/test traffic, not every simulator state write or falsely labelled publisher. The simulator pack/cell resistance units are corrected in development, but it remains uncalibrated and lacks cutoff protection; extreme lead-acid outputs can be nonphysical. Do not use it as a safety model.

Correct carbon conversion, cycle percent units, digital-twin formulas and triage/UI contracts. Replace unsupported accuracy, blockchain, uptime and compliance claims with evidence or demo/unknown states. Implement or disable metadata-only training/actions, carrier dispatch, SDK downloads and matching workflows.

Verify recovery-email delivery, authorized private storage, Render PDF browser provisioning and real broker/hardware/provider integration using dedicated staging identities. No customer messages or real transactions were sent during this assessment.

## PagerDuty and availability

Adapter deployed and production outbox migrated; live paging remains disabled. Configure routing key/region securely, verify intended PagerDuty escalation/on-call service, release and validate new source/authorization controls, and resolve safety-rule gates before activation. Obtain separate approval for a live test incident or billable native retry Cron. Neither has occurred. Reading an alert does not resolve PagerDuty.

Independent uptime detection is still required because a failed app/database may be unable to persist its own alert. Agree measured availability objectives, validate responder delivery, test restore/failover and monitor integration/backlog failure. Do not promise never-down operation.

## Real-user acceptance

The seven persona profiles are fictional composites, not real interviewed users or employer endorsements. Recruit consenting representatives, use safe staging data, record task success/time and evidence-linked blockers, and collect voluntary feedback. No real-user feedback or acceptance signatures exist yet. See USER_PERSONAS_AND_FEEDBACK.md for the procedure.

## Release sequence

Final matching-code QA is complete; the handoff checkpoint/evidence summary identifies the development snapshot. Verify an authorized existing production login; inspect GitHub main and Render's intended commit; perform a controlled code release only after gates are reviewed; then repeat production readiness, authentication and owned-resource checks. Keep PagerDuty disabled and old credentials available until their distinct gates are met. Restore automatic deploys only after release control is deliberately reviewed.
