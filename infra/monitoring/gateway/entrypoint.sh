#!/bin/sh
set -eu
. /opt/monitoring/guards.sh
check_port
check_bcrypt "${ALERT_PUBLISHER_PASSWORD_HASH:-}"
check_private_host "${ALERTMANAGER_PRIVATE_HOST:-}"
export ALERT_PUBLISHER_PASSWORD_HASH ALERTMANAGER_PRIVATE_HOST PORT
# Validation output may include expanded values on an error: never log it.
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || fail
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
