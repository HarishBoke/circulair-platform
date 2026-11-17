#!/bin/sh
set -eu
umask 077
. /opt/monitoring/guards.sh
check_port
check_render_hostname "${RENDER_EXTERNAL_HOSTNAME:-}"
# Derived from the actual provider hostname, not a guessed or placeholder deployment URL.
NTFY_BASE_URL="https://${RENDER_EXTERNAL_HOSTNAME}"
export NTFY_BASE_URL
[ "${NTFY_UPSTREAM_ENABLED:-false}" = false ] || fail
# The full server env is intentionally cleared: inherited NTFY_* cannot silently enable relay/signup.
run_native() {
  env -i PATH="$PATH" HOME=/tmp ntfy "$@"
}
mkdir -p /var/lib/ntfy
if [ ! -f /var/lib/ntfy/.admin-provisioned-v1 ]; then
  [ "${NTFY_BOOTSTRAP_APPROVED:-false}" = true ] || fail
  check_bcrypt "${NTFY_ADMIN_PASSWORD_HASH:-}"
  # Native CLI requires an initialized auth DB. Initialize on loopback, never a public listener.
  run_native serve --config /etc/ntfy/server.yml --base-url "$NTFY_BASE_URL" --listen-http 127.0.0.1:18080 >/dev/null 2>&1 &
  init=$!
  trap 'kill "$init" 2>/dev/null || true; wait "$init" 2>/dev/null || true' EXIT TERM INT
  count=0
  until [ -s /var/lib/ntfy/auth.db ]; do
    kill -0 "$init" 2>/dev/null || fail
    count=$((count + 1)); [ "$count" -le 30 ] || fail
    sleep 1
  done
  kill "$init" 2>/dev/null || true
  wait "$init" 2>/dev/null || true
  trap - EXIT TERM INT
  # --ignore-exists is intentionally not used: unexpected existing principals fail closed.
  env -i PATH="$PATH" HOME=/tmp NTFY_PASSWORD_HASH="$NTFY_ADMIN_PASSWORD_HASH" \
    ntfy user --config /etc/ntfy/server.yml add --role=admin operator >/dev/null 2>&1 || fail
  run_native access --config /etc/ntfy/server.yml everyone '*' deny >/dev/null 2>&1 || fail
  printf '%s\n' initialized > /var/lib/ntfy/.admin-provisioned-v1
fi
[ -s /var/lib/ntfy/auth.db ] || fail
unset NTFY_ADMIN_PASSWORD_HASH
exec env -i PATH="$PATH" HOME=/tmp ntfy serve --config /etc/ntfy/server.yml \
  --base-url "$NTFY_BASE_URL" --listen-http ":$PORT"
