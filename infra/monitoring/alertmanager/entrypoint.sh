#!/bin/sh
set -eu
# This pinned image runs as nobody. Render disk ownership must be verified before release.
[ "${INCIDENT_OUTBOX_ENABLED:-false}" = false ] || exit 78
[ "${PORT:-9093}" = 9093 ] || exit 78
[ -w /alertmanager ] || exit 78
config=/etc/alertmanager/alertmanager.yml
case "${ALERT_NOTIFICATIONS_ENABLED:-false}" in
  false) ;; # Original OFF mode: never inspect or adopt private notification mounts.
  true)
    . /opt/monitoring/approved-config.sh
    validate_approved_config >/dev/null 2>&1 || exit 78
    config=/etc/secrets/alertmanager-approved.yml
    ;;
  *) exit 78 ;;
esac
/bin/amtool check-config "$config" >/dev/null 2>&1 || exit 78
if [ "${ALERT_NOTIFICATIONS_ENABLED:-false}" = true ]; then
  # Drop inherited proxy, TLS CA overrides, credentials and private review metadata.
  exec env -i PATH="$PATH" HOME=/tmp /bin/alertmanager --config.file="$config" \
    --storage.path=/alertmanager --data.retention=120h \
    --web.listen-address=0.0.0.0:9093 --cluster.listen-address= \
    --log.level=warn
fi
exec /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/alertmanager --data.retention=120h \
  --web.listen-address=0.0.0.0:9093 --cluster.listen-address= \
  --log.level=warn
