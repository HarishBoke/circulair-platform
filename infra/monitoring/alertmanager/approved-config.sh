#!/bin/sh
# Explicit email opt-in only; no credentials/config values are printed or placed in argv.
validate_approved_config() {
  [ "${ALERT_NOTIFICATIONS_APPROVED:-false}" = true ] || return 78
  [ "${ALERT_NOTIFICATION_CONFIG_REVIEWED:-false}" = true ] || return 78
  [ "${ZOHO_SMTP_SERVER_DETAILS_REVIEWED:-false}" = true ] || return 78
  # grep anchors are line-oriented; explicitly veto newline/CR before each scalar regex.
  case "${ALERT_NOTIFICATION_APPROVAL_REF:-}" in *[!a-f0-9-]*) return 78 ;; esac
  case "${ZOHO_SMTP_APPROVED_HOST:-}" in *[!a-z0-9.]*) return 78 ;; esac
  printf '%s' "${ALERT_NOTIFICATION_APPROVAL_REF:-}" | grep -Eq '^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$' || return 78
  printf '%s' "${ZOHO_SMTP_APPROVED_HOST:-}" | grep -Eq '^(smtp|smtppro)\.zoho\.(com|eu|in|com\.au|jp|ca|com\.cn|sa)$' || return 78
  [ "${ZOHO_SMTP_ALLOWED_ORIGIN:-}" = "${ZOHO_SMTP_APPROVED_HOST}:587" ] || return 78
  for private_address in "${ZOHO_SMTP_FROM:-}" "${ALERT_EMAIL_TO:-}"; do
    case "$private_address" in *[!A-Za-z0-9._+@-]*) return 78 ;; esac
    [ "${#private_address}" -le 254 ] || return 78
    printf '%s' "$private_address" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$' || return 78
  done
  [ "${ZOHO_SMTP_AUTH_USERNAME:-}" = "$ZOHO_SMTP_FROM" ] || return 78
  [ "${ZOHO_SMTP_PASSWORD_FILE:-}" = /etc/secrets/zoho-smtp-app-password ] || return 78
  [ "${ALERT_NOTIFICATION_CONFIG_FILE:-}" = /etc/secrets/alertmanager-approved.yml ] || return 78
  for private_file in "$ALERT_NOTIFICATION_CONFIG_FILE" "$ZOHO_SMTP_PASSWORD_FILE"; do
    [ -f "$private_file" ] && [ ! -L "$private_file" ] && [ -r "$private_file" ] || return 78
    private_mode=$(stat -c %a "$private_file") || return 78
    # Provider may use group read; never world-readable/writable/executable or special bits.
    case "$private_mode" in 400|440|600|640) ;; *) return 78 ;; esac
  done
  # Zoho app passwords are not assumed to meet application Basic-password entropy rules.
  # Require one nonempty printable no-space line, bounded at 128 characters, optional LF.
  private_size=$(wc -c < "$ZOHO_SMTP_PASSWORD_FILE") || return 78
  [ "$private_size" -ge 12 ] && [ "$private_size" -le 129 ] || return 78
  [ "$(grep -c '^' "$ZOHO_SMTP_PASSWORD_FILE")" -eq 1 ] || return 78
  LC_ALL=C grep -Eq '^[!-~]{12,128}$' "$ZOHO_SMTP_PASSWORD_FILE" || return 78
  umask 077
  private_expected=$(mktemp /tmp/alertmanager-approved.XXXXXX) || return 78
  trap 'rm -f "$private_expected"' EXIT HUP INT TERM
  cat > "$private_expected" <<EOF
global:
  resolve_timeout: 5m
route:
  receiver: approved-private-zoho-email
  group_by: [alertname, incident_id, environment, application]
  group_wait: 30s
  group_interval: 1m
  repeat_interval: 4h
receivers:
  - name: approved-private-zoho-email
    email_configs:
      - to: "${ALERT_EMAIL_TO}"
        from: "${ZOHO_SMTP_FROM}"
        smarthost: "${ZOHO_SMTP_APPROVED_HOST}:587"
        hello: circulair-monitoring
        auth_username: "${ZOHO_SMTP_FROM}"
        auth_password_file: /etc/secrets/zoho-smtp-app-password
        require_tls: true
        tls_config:
          server_name: "${ZOHO_SMTP_APPROVED_HOST}"
          min_version: TLS12
        send_resolved: true
        headers:
          Subject: '{{ if eq .Status "resolved" }}Critical incident resolved{{ else }}Critical incident{{ end }}'
        text: '{{ if eq .Status "resolved" }}Alert resolved. Review the protected application incident console.{{ else }}Action required. Review the protected application incident console.{{ end }}'
        html: ""
EOF
  private_result=0
  # Exact bytes forbid other receivers, inline keys, TLS bypasses, templated addresses,
  # extra headers/links, aliases/duplicate keys and arbitrary SMTP origin/port overrides.
  cmp -s "$private_expected" "$ALERT_NOTIFICATION_CONFIG_FILE" || private_result=78
  rm -f "$private_expected"
  trap - EXIT HUP INT TERM
  return "$private_result"
}
