#!/bin/sh
set -eu
. /opt/monitoring/guards.sh
check_port
check_bcrypt "${KUMA_UI_PASSWORD_HASH:-}"
# Initial setup is only reachable behind mandatory Basic auth, with explicit operator consent.
[ "${KUMA_BOOTSTRAP_COMPLETE:-false}" = true ] || [ "${KUMA_BOOTSTRAP_WINDOW_APPROVED:-false}" = true ] || fail
export UPTIME_KUMA_HOST=127.0.0.1 UPTIME_KUMA_PORT=3001 DATA_DIR=/app/data
export UPTIME_KUMA_DB_TYPE=sqlite
unset HOST UPTIME_KUMA_SSL_KEY SSL_KEY UPTIME_KUMA_SSL_CERT SSL_CERT
unset UPTIME_KUMA_DEBUG_INSPECTOR SQL_LOG UPTIME_KUMA_LOG_RESPONSE_BODY_MONITOR_ID
unset NOTIFICATION_PROXY UPTIME_KUMA_CLOUDFLARED_TOKEN
[ "${UPTIME_KUMA_WS_ORIGIN_CHECK:-cors-like}" = cors-like ] || fail
export UPTIME_KUMA_WS_ORIGIN_CHECK=cors-like
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || fail
cd /app
node /opt/monitoring/patch-smtp.cjs --check || fail
node server/server.js &
kuma=$!
node /opt/monitoring/readiness.cjs &
ready=$!
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
proxy=$!
cleanup() { kill "$proxy" "$ready" "$kuma" 2>/dev/null || true; wait "$proxy" "$ready" "$kuma" 2>/dev/null || true; }
trap 'cleanup; exit 0' TERM INT
# Finite child liveness supervision, not an incident polling loop.
while kill -0 "$kuma" 2>/dev/null && kill -0 "$ready" 2>/dev/null && kill -0 "$proxy" 2>/dev/null; do sleep 1; done
cleanup
exit 1
