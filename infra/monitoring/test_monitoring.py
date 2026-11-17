#!/usr/bin/env python3
"""Monitoring-only offline tests. Network operations are LOOPBACK ONLY.
Default: python3 infra/monitoring/test_monitoring.py
Requires PyYAML and jsonschema; optional MONITORING_BIN_DIR enables official binary checks.
Never imports application modules, resolves production hosts, or publishes notifications.
"""
import base64
from decimal import Decimal
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import threading
import time
import unittest
import yaml
import jsonschema

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BINS = Path(os.environ['MONITORING_BIN_DIR']) if os.environ.get('MONITORING_BIN_DIR') else None

def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def request(port, method, path, data=None, headers=None):
    c = http.client.HTTPConnection('127.0.0.1', port, timeout=4)
    try:
        c.request(method, path, data, headers or {})
        r = c.getresponse()
        body = r.read()
        return r.status, body
    finally:
        c.close()

def wait_http(port, path='/healthz'):
    for _ in range(50):
        try:
            return request(port, 'GET', path)
        except OSError:
            time.sleep(0.1)
    raise AssertionError('loopback server failed to start')

class StaticChecks(unittest.TestCase):
    def test_blueprint_schema_and_exact_approval(self):
        blueprint = yaml.safe_load((REPO / 'render.monitoring.yaml').read_text())
        schema = json.loads((HERE / 'evidence/render-blueprint.schema.json').read_text())
        jsonschema.validate(blueprint, schema)
        self.assertEqual(set(blueprint), {'services'})
        resources = blueprint['services']
        self.assertEqual(len(resources), 5)
        expected = {'circulair-uptime': ('web', '1c-2g', '/app/data'),
                    'circulair-notify': ('web', '0.5c-512mb', '/var/lib/ntfy'),
                    'circulair-alertmanager': ('pserv', '0.5c-512mb', '/alertmanager'),
                    'circulair-alert-gateway': ('web', '0.5c-512mb', None),
                    'circulair-incident-worker': ('worker', '0.5c-512mb', None)}
        self.assertEqual({s['name'] for s in resources}, set(expected))
        for s in resources:
            kind, plan, mount = expected[s['name']]
            self.assertEqual((s['type'], s['plan'], s['region'], s['numInstances'], s['autoDeployTrigger']),
                             (kind, plan, 'oregon', 1, 'off'))
            self.assertNotIn('domains', s)
            self.assertNotIn('scaling', s)
            self.assertNotIn('preDeployCommand', s)
            if mount:
                self.assertEqual(s['disk']['mountPath'], mount)
                self.assertEqual(s['disk']['sizeGB'], 1)
            else:
                self.assertNotIn('disk', s)
            if s['runtime'] == 'docker':
                self.assertEqual(s['dockerContext'], 'infra/monitoring')
        worker = next(s for s in resources if s['type'] == 'worker')
        env = {e['key']: e for e in worker['envVars']}
        self.assertEqual(env['DATABASE_URL'], {'key': 'DATABASE_URL', 'sync': False})
        for k in ['INCIDENT_OUTBOX_ENABLED', 'OPEN_SOURCE_ALERTING_ENABLED', 'ALERT_NOTIFICATIONS_ENABLED',
                  'INCIDENT_WORKER_BUILD_REVIEWED', 'INCIDENT_WORKER_RELEASE_REVIEWED']:
            self.assertEqual(env[k]['value'], 'false')
        self.assertEqual(Decimal(25) + Decimal(7)*4 + Decimal('0.25')*3, Decimal('53.75'))

    def test_image_pins_match_every_dockerfile(self):
        pins = json.loads((HERE / 'image-pins.json').read_text())
        self.assertEqual(pins['platform'], 'linux/amd64')
        self.assertEqual({k: v['tag'] for k,v in pins['images'].items()},
                         {'kuma': '2.5.12', 'ntfy': 'v2.38.1', 'alertmanager': 'v0.35.0', 'caddy': '2.11.9'})
        refs = {v['reference'] for v in pins['images'].values()}
        count = 0
        for f in HERE.glob('*/Dockerfile'):
            for line in f.read_text().splitlines():
                if line.startswith('FROM '):
                    self.assertTrue(line.startswith('FROM --platform=linux/amd64 '))
                    ref = line.split()[2]
                    self.assertIn(ref, refs)
                    self.assertRegex(ref, r':[^@]+@sha256:[a-f0-9]{64}$')
                    count += 1
        self.assertEqual(count, 5)

    def test_shell_and_python_and_js_syntax(self):
        for f in HERE.rglob('*.sh'):
            subprocess.run(['sh', '-n', str(f)], check=True, capture_output=True)
        for f in HERE.rglob('*.py'):
            compile(f.read_text(), str(f), 'exec')
        subprocess.run(['node', '--check', str(HERE/'kuma/readiness.cjs')], check=True, capture_output=True)
        subprocess.run(['node', str(HERE/'kuma/readiness.test.cjs')], check=True, capture_output=True)

    def test_guards_fail_closed(self):
        guards = str(HERE/'tools/guards.sh')
        cases = [('check_port', {'PORT': '0'}), ('check_port', {'PORT': '80'}),
                 ('check_port', {'PORT': '10000;echo leak'}),
                 ('check_bcrypt "$INPUT"', {'INPUT': 'plaintext-password'}),
                 ('check_private_host "$INPUT"', {'INPUT': 'https://user:pass@example.com/x'}),
                 ('check_private_host "$INPUT"', {'INPUT': 'example.com'}),
                 ('check_private_host "$INPUT"', {'INPUT': 'circulair-alertmanager:9093'}),
                 ('check_render_hostname "$INPUT"', {'INPUT': 'circulair-notify.onrender.com@evil.example'})]
        for command, env in cases:
            r = subprocess.run(['sh', '-c', f'. "{guards}"; {command}'], env={'PATH': os.environ['PATH'], **env}, capture_output=True)
            self.assertEqual(r.returncode, 78)
            self.assertNotIn(env.get('INPUT', '').encode(), r.stderr) if env.get('INPUT') else None
        for command, env in [('check_port', {'PORT': '10000'}),
                             ('check_private_host "$INPUT"', {'INPUT': 'circulair-alertmanager-ab12.internal'}),
                             ('check_render_hostname "$INPUT"', {'INPUT': 'circulair-notify-ab12.onrender.com'})]:
            self.assertEqual(subprocess.run(['sh','-c',f'. "{guards}"; {command}'], env={'PATH':os.environ['PATH'],**env}, capture_output=True).returncode, 0)
        for name in ['kuma', 'gateway', 'ntfy', 'worker']:
            r = subprocess.run(['sh', str(HERE/name/'entrypoint.sh')], env={'PATH': os.environ['PATH']}, capture_output=True)
            self.assertNotEqual(r.returncode, 0)
        r = subprocess.run(['sh', str(HERE/'worker/build.sh')], env={'PATH': os.environ['PATH']}, capture_output=True)
        self.assertEqual(r.returncode, 78)

    def test_safe_off_configs_and_bootstrap_gates(self):
        ntfy = yaml.safe_load((HERE/'ntfy/server.yml').read_text())
        self.assertEqual(ntfy['auth-default-access'], 'deny-all')
        self.assertEqual(ntfy['auth-file'], '/var/lib/ntfy/auth.db')
        for k in ['upstream-base-url', 'firebase-key-file', 'web-push-private-key', 'smtp-sender-addr']:
            self.assertEqual(ntfy[k], '')
        self.assertFalse(ntfy['enable-signup'])
        self.assertEqual(ntfy['web-root'], 'disable')
        am = yaml.safe_load((HERE/'alertmanager/alertmanager.yml').read_text())
        self.assertEqual(am['receivers'], [{'name': 'notifications-disabled'}])
        self.assertEqual(am['route']['group_by'], ['alertname','incident_id','environment','application'])
        kuma = (HERE/'kuma/entrypoint.sh').read_text()
        self.assertIn('UPTIME_KUMA_HOST=127.0.0.1', kuma)
        self.assertIn('KUMA_BOOTSTRAP_WINDOW_APPROVED', kuma)
        self.assertIn('check_bcrypt', kuma)
        self.assertNotIn('UK_INITIAL_ADMIN_', kuma)
        ready = (HERE/'kuma/readiness.cjs').read_text()
        self.assertIn('OPEN_READONLY', ready)
        self.assertIn('KUMA_BOOTSTRAP_COMPLETE', ready)
        self.assertIn('disableAuth', ready)

    def test_receiver_generator_requires_separate_consent(self):
        spec = importlib.util.spec_from_file_location('receiver', HERE/'tools/generate_receiver.py')
        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        with self.assertRaises(ValueError): m.generate({})
        approved = {'ALERT_NOTIFICATIONS_APPROVED':'true',
            'ALERT_NOTIFICATION_APPROVAL_REF':'00000000-0000-0000-0000-000000000001',
            'NTFY_APPROVED_RENDER_HOSTNAME':'circulair-notify-synthetic.onrender.com',
            'NTFY_APPROVED_TOPIC':'synthetic_topic_123456',
            'NTFY_PUBLISHER_TOKEN_FILE':'/etc/secrets/ntfy-publisher-token'}
        config, template = m.generate(approved)
        am = yaml.safe_load(config)
        hook = am['receivers'][0]['webhook_configs'][0]
        self.assertTrue(hook['send_resolved'])
        self.assertFalse(hook['http_config']['follow_redirects'])
        self.assertIn('credentials_file', hook['http_config']['authorization'])
        self.assertNotIn('credentials:', config)
        self.assertNotIn('Annotations', template)
        self.assertNotIn('Labels', template)
        self.assertNotIn('externalURL', template)

@unittest.skipUnless(BINS, 'Set MONITORING_BIN_DIR for checksum-verified official binaries')
class BinaryChecks(unittest.TestCase):
    def test_kuma_caddy_guard_blocks_direct_setup_and_socket(self):
        caddy = str(BINS/'caddy')
        password = base64.urlsafe_b64encode(os.urandom(24)).decode()
        hashed = subprocess.run([caddy,'hash-password'],input=(password+'\n').encode(),check=True,capture_output=True).stdout.decode().strip()
        env = {**os.environ,'PORT':str(free_port()),'KUMA_UI_PASSWORD_HASH':hashed}
        calls = []
        class Mock(BaseHTTPRequestHandler):
            def do_GET(self):
                calls.append({'path':self.path,'headers':dict(self.headers)})
                self.send_response(200); self.end_headers(); self.wfile.write(b'synthetic')
            def log_message(self,*args): pass
        server = ThreadingHTTPServer(('127.0.0.1',0),Mock)
        threading.Thread(target=server.serve_forever,daemon=True).start()
        with tempfile.TemporaryDirectory() as td:
            config = (HERE/'kuma/Caddyfile').read_text().replace(':{$PORT} {','http://127.0.0.1:{$PORT} {').replace('http://127.0.0.1:3001',f'http://127.0.0.1:{server.server_port}')
            p=Path(td)/'Caddyfile'; p.write_text(config)
            log=open(Path(td)/'caddy.log','wb')
            process=subprocess.Popen([caddy,'run','--config',str(p),'--adapter','caddyfile'],env=env,stdout=log,stderr=log)
            try:
                port=int(env['PORT']); self.assertEqual(wait_http(port,'/setup')[0],401)
                self.assertEqual(request(port,'GET','/')[0],401)
                self.assertEqual(request(port,'GET','/socket.io/?EIO=4&transport=websocket',headers={'Connection':'Upgrade','Upgrade':'websocket'})[0],401)
                self.assertEqual(calls,[])
                auth='Basic '+base64.b64encode(('operator:'+password).encode()).decode()
                self.assertEqual(request(port,'GET','/setup',headers={'Authorization':auth})[0],200)
                self.assertEqual(len(calls),1)
                self.assertNotIn('Authorization',calls[0]['headers'])
            finally:
                process.terminate(); process.wait(timeout=5); log.close(); server.shutdown(); server.server_close()

    def test_caddy_configs_and_gateway_loopback_enforcement(self):
        password = base64.urlsafe_b64encode(os.urandom(24)).decode()
        caddy = str(BINS/'caddy')
        hash_result = subprocess.run([caddy,'hash-password'], input=(password+'\n').encode(), capture_output=True, check=True)
        hashed = hash_result.stdout.decode().strip()
        env = {**os.environ,'PORT':str(free_port()),'ALERTMANAGER_PRIVATE_HOST':'circulair-alertmanager',
               'ALERT_PUBLISHER_PASSWORD_HASH':hashed,'KUMA_UI_PASSWORD_HASH':hashed}
        for name in ['gateway','kuma']:
            subprocess.run([caddy,'validate','--config',str(HERE/name/'Caddyfile'),'--adapter','caddyfile'], env=env, check=True, capture_output=True)
        calls = []
        class Mock(BaseHTTPRequestHandler):
            def do_POST(self):
                calls.append({'path':self.path,'headers':dict(self.headers),
                              'body':self.rfile.read(int(self.headers.get('Content-Length', 0)))})
                self.send_response(200); self.end_headers(); self.wfile.write(b'accepted')
            def log_message(self, *args): pass
        server = ThreadingHTTPServer(('127.0.0.1',0), Mock)
        threading.Thread(target=server.serve_forever,daemon=True).start()
        with tempfile.TemporaryDirectory() as td:
            config = (HERE/'gateway/Caddyfile').read_text().replace('http://{$ALERTMANAGER_PRIVATE_HOST}:9093', f'http://127.0.0.1:{server.server_port}').replace(':{$PORT} {', 'http://127.0.0.1:{$PORT} {')
            p = Path(td)/'Caddyfile'; p.write_text(config)
            log = open(Path(td)/'caddy.log','wb')
            process = subprocess.Popen([caddy,'run','--config',str(p),'--adapter','caddyfile'],env=env,stdout=log,stderr=log)
            try:
                port = int(env['PORT']); self.assertEqual(wait_http(port)[0],200)
                authorization = 'Basic '+base64.b64encode(('publisher:'+password).encode()).decode()
                headers = {'Authorization':authorization,'Content-Type':'application/json'}
                self.assertEqual(request(port,'POST','/api/v2/alerts',b'[]')[0],401)
                for method, path in [('GET','/api/v2/alerts'),('POST','/api/v2/silences'),('POST','/-/reload'),('GET','/'),('PUT','/api/v2/alerts')]:
                    self.assertEqual(request(port,method,path,b'[]',headers)[0],404)
                self.assertEqual(request(port,'POST','/api/v2/alerts',b'x'*2049,headers)[0],413)
                self.assertEqual(len(calls),0)
                self.assertEqual(request(port,'POST','/api/v2/alerts',b'x'*2048,headers)[0],200)
                self.assertEqual(len(calls),1)
                calls.clear()
                self.assertEqual(request(port,'POST','/api/v2/alerts?untrusted=1',b'[]',headers)[0],200)
                self.assertEqual(len(calls),1)
                self.assertEqual(calls[0]['path'],'/api/v2/alerts')
                self.assertNotIn('Authorization',calls[0]['headers'])
                self.assertNotIn('Proxy-Authorization',calls[0]['headers'])
                self.assertEqual(calls[0]['body'],b'[]')
                calls.clear()
                # All chunked/unframed publishers are rejected BEFORE upstream (411),
                # a stricter policy than streaming part of an oversize body then returning 413.
                # This is a synthetic loopback payload to a mock, never an alert to a real service.
                c = http.client.HTTPConnection('127.0.0.1',port,timeout=4)
                try:
                    c.request('POST','/api/v2/alerts',iter([b'x'*2049]),headers,encode_chunked=True)
                    r=c.getresponse(); r.read(); self.assertEqual(r.status,411)
                finally:
                    c.close()
                self.assertEqual(calls, [])
            finally:
                process.terminate(); process.wait(timeout=5); log.close(); server.shutdown(); server.server_close()

    def test_amtool_and_ntfy_native_deny_all(self):
        subprocess.run([str(BINS/'amtool'),'check-config',str(HERE/'alertmanager/alertmanager.yml')],check=True,capture_output=True)
        with tempfile.TemporaryDirectory() as td:
            config = yaml.safe_load((HERE/'ntfy/server.yml').read_text())
            config['cache-file']=td+'/cache.db'; config['auth-file']=td+'/auth.db'
            port=free_port(); config['listen-http']=f'127.0.0.1:{port}'; config['base-url']=f'http://127.0.0.1:{port}'
            p=Path(td)/'server.yml'; p.write_text(yaml.safe_dump(config))
            log=open(Path(td)/'ntfy.log','wb')
            ntfy=str(BINS/'ntfy')
            process=subprocess.Popen([ntfy,'serve','--config',str(p)], env={'PATH':os.environ['PATH'],'HOME':td},stdout=log,stderr=log)
            try:
                self.assertEqual(wait_http(port,'/v1/health')[0],200)
                self.assertEqual(request(port,'GET','/synthetic_topic/json?poll=1')[0],403)
                self.assertEqual(request(port,'GET','/')[0],404)
                self.assertEqual(request(port,'POST','/v1/account',b'{}',{'Content-Type':'application/json'})[0],400)
            finally:
                process.terminate(); process.wait(timeout=5); log.close()
            # Local auth DB writes only; no topic publish and no live notification test.
            password_hash=subprocess.run([str(BINS/'caddy'),'hash-password'],input=(base64.urlsafe_b64encode(os.urandom(24)).decode()+'\n').encode(),capture_output=True,check=True).stdout.decode().strip()
            env={'PATH':os.environ['PATH'],'HOME':td,'NTFY_PASSWORD_HASH':password_hash}
            subprocess.run([ntfy,'user','--config',str(p),'add','--role=admin','operator'],env=env,check=True,capture_output=True)
            subprocess.run([ntfy,'access','--config',str(p),'everyone','*','deny'],env={'PATH':os.environ['PATH'],'HOME':td},check=True,capture_output=True)

if __name__ == '__main__':
    unittest.main(verbosity=2)
