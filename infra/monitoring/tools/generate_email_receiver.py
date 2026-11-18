#!/usr/bin/env python3
"""Offline Zoho email candidate only. Never connects, sends or activates.
Private sender/recipient config is emitted outside the public repository; the
application-specific SMTP password is referenced by a fixed secret-file mount.
"""
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[3]
CONFIG_FILE = '/etc/secrets/alertmanager-approved.yml'
PASSWORD_FILE = '/etc/secrets/zoho-smtp-app-password'
# Host family is a safety ceiling, NOT discovery of the owner's account server.
# Actual exact regional/account-type host must be copied from Zoho's account settings.
HOST = r'(?:smtp|smtppro)\.zoho\.(?:com|eu|in|com\.au|jp|ca|com\.cn|sa)'
ADDRESS = r'[A-Za-z0-9][A-Za-z0-9._+-]{0,63}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+'

def generate(env):
    for key in ['ALERT_NOTIFICATIONS_APPROVED', 'ALERT_NOTIFICATION_CONFIG_REVIEWED', 'ZOHO_SMTP_SERVER_DETAILS_REVIEWED']:
        if env.get(key) != 'true':
            raise ValueError('Separate email configuration and account-server review required')
    if not re.fullmatch(r'[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}', env.get('ALERT_NOTIFICATION_APPROVAL_REF', '')):
        raise ValueError('Approval reference required')
    host = env.get('ZOHO_SMTP_APPROVED_HOST', '')
    if not re.fullmatch(HOST, host) or env.get('ZOHO_SMTP_ALLOWED_ORIGIN') != f'{host}:587':
        raise ValueError('Exact reviewed Zoho SMTP origin required')
    sender, recipient = env.get('ZOHO_SMTP_FROM', ''), env.get('ALERT_EMAIL_TO', '')
    if not re.fullmatch(ADDRESS, sender) or not re.fullmatch(ADDRESS, recipient) or max(len(sender), len(recipient)) > 254:
        raise ValueError('One plain approved sender and recipient required')
    if env.get('ZOHO_SMTP_AUTH_USERNAME') != sender:
        raise ValueError('Sender must be the authenticated mailbox; aliases require a separate change')
    if env.get('ZOHO_SMTP_PASSWORD_FILE') != PASSWORD_FILE or env.get('ALERT_NOTIFICATION_CONFIG_FILE') != CONFIG_FILE:
        raise ValueError('Fixed private Render mounts required')
    return f'''global:
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
      - to: "{recipient}"
        from: "{sender}"
        smarthost: "{host}:587"
        hello: circulair-monitoring
        auth_username: "{sender}"
        auth_password_file: {PASSWORD_FILE}
        require_tls: true
        tls_config:
          server_name: "{host}"
          min_version: TLS12
        send_resolved: true
        headers:
          Subject: '{{{{ if eq .Status "resolved" }}}}Critical incident resolved{{{{ else }}}}Critical incident{{{{ end }}}}'
        text: '{{{{ if eq .Status "resolved" }}}}Alert resolved. Review the protected application incident console.{{{{ else }}}}Action required. Review the protected application incident console.{{{{ end }}}}'
        html: ""
'''

def main():
    if len(sys.argv) != 2:
        raise ValueError('Specify private output outside the repository')
    output = Path(sys.argv[1]).resolve()
    if output == ROOT or ROOT in output.parents:
        raise ValueError('Cannot write private email configuration in the public repository')
    config = generate(os.environ)
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    if output.stat().st_mode & 0o077:
        raise ValueError('Output directory must be private')
    fd = os.open(output / 'alertmanager-approved.yml', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f:
        f.write(config)
    print('Offline email candidate written; not activated')

if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError):
        print('Email receiver generation blocked: private output and explicit approved inputs required', file=sys.stderr)
        sys.exit(78)
