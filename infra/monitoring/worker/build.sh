#!/bin/sh
set -eu
# Parent must approve this compiler proposal against the combined source first.
[ "${INCIDENT_WORKER_BUILD_REVIEWED:-false}" = true ] || {
  printf '%s\n' 'incident worker build blocked: combined-source release review required' >&2
  exit 78
}
[ -f scripts/incident-worker.ts ] && [ -f shared/databaseEnv.cjs ] || exit 78
npx --yes pnpm@10.34.5 install --frozen-lockfile
# No app build, app main loop, migration, source upload, or implicit seeding.
npx --yes pnpm@10.34.5 run build:incident-worker
