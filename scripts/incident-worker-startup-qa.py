#!/usr/bin/env python3
"""Finite, provider-free acceptance of the compiled worker and reviewed entrypoint.

Run after `pnpm run build:incident-worker`. This does not migrate a database,
resolve database credentials, send notifications or run the application server.
"""
from pathlib import Path
import json
import os
import shutil
import signal
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / 'infra/monitoring/worker/dist/incident-worker.mjs'
NODE = shutil.which('node')
if not NODE or not ARTIFACT.is_file():
    raise SystemExit('worker_qa_requires_node_and_compiled_artifact')

cases = []
with tempfile.TemporaryDirectory(prefix='incident-worker-qa-') as home:
    base = {'PATH':str(Path(NODE).parent)+':/usr/bin:/bin', 'HOME':home,
            'NODE_ENV':'production', 'DOTENV_CONFIG_PATH':'/dev/null'}

    def check(name, command, extra, expected):
        result = subprocess.run(command, cwd=ROOT, env={**base, **extra},
                                capture_output=True, text=True, timeout=12)
        if result.returncode != expected:
            raise AssertionError((name, 'unexpected_exit', result.returncode))
        cases.append({'case':name,'passed':True,'exit':result.returncode})

    check('default_one_cycle_without_credentials', [NODE,str(ARTIFACT)], {}, 0)
    check('unapproved_native_daemon_denied', [NODE,str(ARTIFACT),'--daemon'], {}, 1)
    check('missing_render_ownership_denied', ['/bin/sh','infra/monitoring/worker/entrypoint.sh'], {}, 78)
    check('missing_release_review_denied', ['/bin/sh','infra/monitoring/worker/entrypoint.sh'],
          {'RENDER':'true','INCIDENT_RENDER_WORKER_APPROVED':'true'}, 78)
    for outbox, transport in [('true','false'),('false','true')]:
        check('mixed_flags_denied_'+outbox+'_'+transport,
              ['/bin/sh','infra/monitoring/worker/entrypoint.sh'],
              {'RENDER':'true','INCIDENT_RENDER_WORKER_APPROVED':'true',
               'INCIDENT_WORKER_RELEASE_REVIEWED':'true','INCIDENT_OUTBOX_ENABLED':outbox,
               'OPEN_SOURCE_ALERTING_ENABLED':transport}, 78)
    check('live_without_notification_consent_denied', ['/bin/sh','infra/monitoring/worker/entrypoint.sh'],
          {'RENDER':'true','INCIDENT_RENDER_WORKER_APPROVED':'true','INCIDENT_WORKER_RELEASE_REVIEWED':'true',
           'INCIDENT_OUTBOX_ENABLED':'true','OPEN_SOURCE_ALERTING_ENABLED':'true'}, 78)

    daemon = subprocess.Popen(['/bin/sh','infra/monitoring/worker/entrypoint.sh'], cwd=ROOT,
        env={**base,'RENDER':'true','INCIDENT_RENDER_WORKER_APPROVED':'true',
             'INCIDENT_WORKER_RELEASE_REVIEWED':'true','INCIDENT_OUTBOX_ENABLED':'false',
             'OPEN_SOURCE_ALERTING_ENABLED':'false'}, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        time.sleep(1)
        if daemon.poll() is not None:
            raise AssertionError('approved_disabled_daemon_exited_early')
        daemon.send_signal(signal.SIGTERM)
        stdout, _ = daemon.communicate(timeout=5)
        summaries = [json.loads(line) for line in stdout.splitlines() if line.startswith('{')]
        if daemon.returncode != 0 or not any(s.get('enabled') is False and s.get('attempted') == 0 for s in summaries):
            raise AssertionError('disabled_daemon_summary_or_shutdown_failed')
        cases.append({'case':'approved_disabled_daemon_sigterm','passed':True,'exit':0})
    finally:
        if daemon.poll() is None:
            daemon.kill()
            daemon.communicate()

print(json.dumps({'node':subprocess.check_output([NODE,'--version'],text=True).strip(),
                  'passed':len(cases),'failed':0,'cases':cases,
                  'database_configuration':'absent','notifications_enabled':False}, separators=(',',':')))
