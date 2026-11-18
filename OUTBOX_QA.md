# Incident outbox PostgreSQL QA gate

The offline application suite deliberately does not start databases. Its 28 guarded incident-outbox cases must also execute in the dedicated `scripts/incident-outbox-qa.py` CI stage. A green offline command alone is not outbox acceptance. The seven recovery database cases have their separate `password-recovery-qa.py` stage.

## Finite isolated execution

From the repository, with the reviewed Node 24.14.1 runtime, installed frozen pnpm 10.34.5 dependency graph, PostgreSQL 16 binaries at `/usr/lib/postgresql/16/bin`, Linux `ip`/`unshare` and noninteractive sudo available:

```sh
python3 -B scripts/test_incident_outbox_qa.py
python3 -B scripts/incident-outbox-qa.py --output /absolute/fresh/external/evidence
```

The output must be new and outside the repository; invoke as a nonroot user. This runner never resolves application database/provider variables. It creates a child network namespace containing only loopback, then drops to the caller numeric UID/GID before PostgreSQL, schema generation or tests. The host network, existing PostgreSQL services and production records are not changed. The new cluster listens at its own isolated `127.0.0.1:5432`; only that synthetic `circulair_qa` endpoint is supplied to the unchanged target guard. No application or provider secrets are inherited, and there is no external network interface. All delivery adapters in the suite are mocked.

The offline TypeScript fixture derives empty `public.users`/`public.alerts` definitions from current Drizzle source: every column/type/nullability, static default, primary key and unique constraint. It is an integration bootstrap, **not a full production schema export or migration validation**. It excludes foreign keys, checks, non-unique indexes, policies, triggers and client update callbacks; current source has no users/alerts foreign keys. Unsupported new definitions fail rather than being guessed. The existing integration suite clones these empty definitions into its random owned schema, supplies synthetic IDs, and applies incident SQL only there. No production migration is performed or requested.

## Fail-closed requirements

The stage requires a real JSON assertion report: **63 total passed, including 28 distinct guarded PostgreSQL cases, zero failed or skipped**. A missing QA target, missing report, skipped assertion, changed inventory or unsuccessful test process fails this stage. It does not use `continue-on-error` or suppress test assertions. The 35 offline incident cases overlap the full offline application stage; do not count them as new unique coverage.

Phase subprocesses have independent process groups and bounded termination/reaping. The namespace child is a subreaper for owned orphaned workers. Graceful fork-worker teardown is allowed before a persistent descendant becomes a failed cleanup check. PostgreSQL must stop; its PID file and process must disappear, its random test schemas must be gone, and its owned temporary cluster directory must be removed. Fast-stop failure/timeout triggers a bounded immediate-stop fallback but retains a failed QA status, even if fallback cleanup succeeds. Failed cleanup never becomes a pass. Only owned processes, groups and directories are targeted.

`result.json` records candidate HEAD, dirty/clean state, source and dependency-lock fingerprints, runtime versions, assertion counts and cleanup outcome. `guarded-cases.json` enumerates the 28 results. CI uploads an explicit allowlist of synthetic JSON/log/SQL files for 14 days, including evidence on failure; no environment files, credentials, private keys, database exports or cluster data are uploaded.

## Release boundary

This gate closes missing automated database coverage only after the exact candidate CI run passes. It does **not** activate incident producers/outbox/notifications, deploy to Render, send an email, or establish exactly-once delivery. Keep production gates OFF pending authorized live Zoho inbox, destination/privacy review, firing/resolved delivery, Render disk/network/memory acceptance and controlled outage/recovery acceptance. The previously fulfilled production migrations must not be rerun.

The original skipped-test review and earlier passes remain historical evidence. Execution details and the exact hosted commit/run should be recorded in the delivery addendum, not inferred from a directory date or a different commit's log.
