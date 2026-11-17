#!/bin/sh
set -eu
# This pinned image runs as nobody. Render disk ownership must be verified before release.
[ "${ALERT_NOTIFICATIONS_ENABLED:-false}" = false ] || exit 78
[ "${INCIDENT_OUTBOX_ENABLED:-false}" = false ] || exit 78
[ "${PORT:-9093}" = 9093 ] || exit 78
[ -w /alertmanager ] || exit 78
/bin/amtool check-config /etc/alertmanager/alertmanager.yml >/dev/null 2>&1 || exit 78
exec /bin/alertmanager --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/alertmanager --data.retention=120h \
  --web.listen-address=0.0.0.0:9093 --cluster.listen-address= \
  --log.level=warn
