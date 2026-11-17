#!/usr/bin/env python3
"""Offline only: emits future review candidates, never starts a server or publishes.
Output must be outside the PUBLIC repository. No credentials are embedded in YAML.
Install token as a Render secret file only after separate approval.
"""
import json
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[3]

def generate(env):
    if env.get('ALERT_NOTIFICATIONS_APPROVED') != 'true':
        raise ValueError('Notification approval required')
    if not re.fullmatch(r'[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}', env.get('ALERT_NOTIFICATION_APPROVAL_REF', '')):
        raise ValueError('Approval reference required')
    host = env.get('NTFY_APPROVED_RENDER_HOSTNAME', '')
    if not re.fullmatch(r'circulair-notify(?:-[a-z0-9]+)?\.onrender\.com', host):
        raise ValueError('Approved real Render hostname required')
    topic = env.get('NTFY_APPROVED_TOPIC', '')
    if not re.fullmatch(r'[A-Za-z0-9_-]{16,64}', topic):
        raise ValueError('Exact approved private topic required')
    token_file = env.get('NTFY_PUBLISHER_TOKEN_FILE', '')
    if token_file != '/etc/secrets/ntfy-publisher-token':
        raise ValueError('Approved Render secret-file mount required')
    # Override the built-in template with a fixed minimized template. No labels, annotations,
    # identities, externalURL, links, customer data or request text are interpolated.
    template = '''title: |-
  {{ if eq .status "resolved" }}Critical incident resolved{{ else }}Critical incident{{ end }}
message: |-
  {{ if eq .status "resolved" }}Recovery recorded. Review the protected application incident console.{{ else }}Action required. Review the protected application incident console.{{ end }}
priority: "4"
'''
    # Standard native Alertmanager webhook fields are serialized only over approved TLS to ntfy.
    # ntfy transforms them for phone presentation; input adapter must still enforce minimized payload.
    config = f'''global:
  resolve_timeout: 5m
route:
  receiver: approved-private-ntfy
  group_by: [alertname, incident_id, environment, application]
  group_wait: 30s
  group_interval: 1m
  repeat_interval: 4h
receivers:
  - name: approved-private-ntfy
    webhook_configs:
      - url: "https://{host}/{topic}?template=alertmanager"
        send_resolved: true
        max_alerts: 1
        timeout: 6s
        http_config:
          follow_redirects: false
          authorization:
            type: Bearer
            credentials_file: {token_file}
'''
    return config, template

def main():
    if len(sys.argv) != 2:
        raise ValueError('Specify a private output directory outside the repository')
    output = Path(sys.argv[1]).resolve()
    if output == ROOT or ROOT in output.parents:
        raise ValueError('Cannot write notification configuration into the public repository')
    config, template = generate(os.environ)
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    for name, text in [('alertmanager.approved-candidate.yml', config), ('alertmanager.yml', template)]:
        fd = os.open(output / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as f:
            f.write(text)
    print('Offline receiver candidate written; not activated')

if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError):
        print('Receiver generation blocked: approval, inputs or private output required', file=sys.stderr)
        sys.exit(78)
