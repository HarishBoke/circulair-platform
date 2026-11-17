#!/bin/sh
set -eu
# Real application-owned worker; paid creation does not authorize notification activation.
[ "${RENDER:-}" = true ] && [ "${INCIDENT_RENDER_WORKER_APPROVED:-false}" = true ] || exit 78
[ "${INCIDENT_WORKER_RELEASE_REVIEWED:-false}" = true ] || exit 78
[ -f infra/monitoring/worker/dist/incident-worker.mjs ] || exit 78
case "${INCIDENT_OUTBOX_ENABLED:-false}:${OPEN_SOURCE_ALERTING_ENABLED:-false}" in
  false:false)
    # The actual worker's disabled daemon does not resolve credentials or connect to PostgreSQL.
    ;;
  true:true)
    [ "${ALERT_NOTIFICATIONS_ENABLED:-false}" = true ] || exit 78
    [ -n "${INCIDENT_ACTIVATION_AT:-}" ] && [ -n "${INCIDENT_ACTIVATION_APPROVAL_REF:-}" ] || exit 78
    [ -n "${DATABASE_URL:-}${RENDER_DATABASE_URL:-}" ] || exit 78
    [ "${ALERTMANAGER_USERNAME:-}" = publisher ] || exit 78
    ;;
  *) exit 78 ;;
esac
exec node infra/monitoring/worker/dist/incident-worker.mjs --daemon
