#!/bin/sh
# Source without tracing. Errors intentionally do not include values.
set -eu
fail() { printf '%s\n' 'monitoring startup blocked: invalid or missing approved configuration' >&2; exit 78; }
check_port() {
  case "${PORT:-}" in ''|*[!0-9]*) fail ;; esac
  [ "$PORT" -ge 1024 ] && [ "$PORT" -le 65535 ] || fail
}
check_bcrypt() {
  # Cost 12-16 only; reject plaintext, whitespace, placeholders and weak hashes.
  printf '%s' "$1" | grep -Eq '^\$2[aby]\$(12|13|14|15|16)\$[./A-Za-z0-9]{53}$' || fail
}
check_private_host() {
  # The input is provider-injected fromService.host, not a URL or a request value.
  printf '%s' "$1" | grep -Eq '^circulair-alertmanager(-[a-z0-9]+)?(\.internal)?$' || fail
}
check_render_hostname() {
  printf '%s' "$1" | grep -Eq '^circulair-notify(-[a-z0-9]+)?\.onrender\.com$' || fail
}
