#!/usr/bin/env python3
"""Offline tests: synthetic identities, mount namespaces, TLS SMTP on loopback only.
MONITORING_BIN_DIR must contain checksum-verified pinned v0.35.0 binaries.
No owner mailbox, DNS, remote SMTP, production DB, ntfy or phone delivery is used.
"""
import base64
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from email import policy
from email.parser import BytesParser
from http.client import HTTPConnection
import importlib.util
import json
import os
from pathlib import Path
import re
import secrets
import socket
import socketserver
import ssl
import subprocess
import tempfile
import threading
import time
import unittest
import yaml

HERE = Path(__file__).resolve().parent
BINS = Path(os.environ['MONITORING_BIN_DIR']) if os.environ.get('MONITORING_BIN_DIR') else None
spec = importlib.util.spec_from_file_location('email_receiver', HERE/'tools/generate_email_receiver.py')
receiver = importlib.util.module_from_spec(spec); spec.loader.exec_module(receiver)


def approved():
    return {'ALERT_NOTIFICATIONS_APPROVED':'true', 'ALERT_NOTIFICATION_CONFIG_REVIEWED':'true',
        'ZOHO_SMTP_SERVER_DETAILS_REVIEWED':'true',
        'ALERT_NOTIFICATION_APPROVAL_REF':'00000000-0000-0000-0000-000000000001',
        'ZOHO_SMTP_APPROVED_HOST':'smtp.zoho.com', 'ZOHO_SMTP_ALLOWED_ORIGIN':'smtp.zoho.com:587',
        'ZOHO_SMTP_FROM':'qa-sender@yopmail.com', 'ALERT_EMAIL_TO':'aimbim@yopmail.com',
        'ZOHO_SMTP_AUTH_USERNAME':'qa-sender@yopmail.com',
        'ZOHO_SMTP_PASSWORD_FILE':receiver.PASSWORD_FILE, 'ALERT_NOTIFICATION_CONFIG_FILE':receiver.CONFIG_FILE}


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0)); return s.getsockname()[1]


def http(port, method='GET', path='/-/ready', payload=None):
    c=HTTPConnection('127.0.0.1',port,timeout=3)
    try:
        c.request(method,path,payload,{'Content-Type':'application/json'})
        r=c.getresponse(); return r.status,r.read()
    finally: c.close()


def wait_for(predicate, seconds=12):
    until=time.monotonic()+seconds
    while time.monotonic()<until:
        if predicate(): return
        time.sleep(.1)
    raise AssertionError('bounded local condition not reached')


class ApprovalChecks(unittest.TestCase):
    def test_generator_native_schema_and_no_inline_password(self):
        config=receiver.generate(approved()); parsed=yaml.safe_load(config)
        email=parsed['receivers'][0]['email_configs'][0]
        self.assertEqual(email['html'],''); self.assertTrue(email['require_tls'])
        self.assertEqual(email['tls_config'],{'server_name':'smtp.zoho.com','min_version':'TLS12'})
        self.assertTrue(email['send_resolved']); self.assertNotIn('auth_password:',config)
        self.assertEqual(parsed['route']['repeat_interval'],'4h')
        self.assertNotIn('.Labels',config); self.assertNotIn('.Annotations',config)
        self.assertNotIn('.ExternalURL',config)
        if BINS:
            with tempfile.TemporaryDirectory() as td:
                p=Path(td)/'candidate.yml';p.write_text(config)
                subprocess.run([str(BINS/'amtool'),'check-config',str(p)],check=True,capture_output=True)

    def test_generator_denies_approval_origin_address_and_mount_changes(self):
        cases=[{}, *[{**approved(),k:v} for k,v in [
            ('ALERT_NOTIFICATIONS_APPROVED','false'),('ALERT_NOTIFICATION_CONFIG_REVIEWED','false'),
            ('ZOHO_SMTP_SERVER_DETAILS_REVIEWED','false'),('ALERT_NOTIFICATION_APPROVAL_REF','not-approved'),
            ('ZOHO_SMTP_APPROVED_HOST','smtp.zoho.com.evil.invalid'),('ZOHO_SMTP_APPROVED_HOST','127.0.0.1'),
            ('ZOHO_SMTP_ALLOWED_ORIGIN','smtp.zoho.com:25'),('ZOHO_SMTP_ALLOWED_ORIGIN','smtp.zoho.eu:587'),
            ('ZOHO_SMTP_AUTH_USERNAME','alias@example.invalid'),('ALERT_EMAIL_TO','a@example.invalid,b@example.invalid'),
            ('ALERT_EMAIL_TO','{{ .CommonLabels.email }}'),('ZOHO_SMTP_FROM','qa-sender@yopmail.com\r\nBcc: other@example.invalid'),
            ('ZOHO_SMTP_PASSWORD_FILE','/tmp/password'),('ALERT_NOTIFICATION_CONFIG_FILE','/tmp/config')]]]
        for env in cases:
            with self.subTest(case=cases.index(env)), self.assertRaises(ValueError): receiver.generate(env)

    def test_generator_private_output_and_public_repo_refusal(self):
        with tempfile.TemporaryDirectory() as td:
            env={'PATH':os.environ['PATH'],**approved()}
            r=subprocess.run(['python3',str(HERE/'tools/generate_email_receiver.py'),td],env=env,capture_output=True)
            self.assertEqual(r.returncode,0);self.assertEqual((Path(td)/'alertmanager-approved.yml').stat().st_mode&0o777,0o600)
            r=subprocess.run(['python3',str(HERE/'tools/generate_email_receiver.py'),td],env=env,capture_output=True)
            self.assertEqual(r.returncode,78)
        r=subprocess.run(['python3',str(HERE/'tools/generate_email_receiver.py'),str(HERE)],env=env,capture_output=True)
        self.assertEqual(r.returncode,78);self.assertNotIn(b'qa-sender@yopmail.com',r.stderr)

    def test_exact_validator_under_private_fixed_mounts(self):
        # Only this child mount namespace masks /etc; no host /etc or root privileges change.
        mount_script='''set -eu
mount --make-rprivate /
mount -t tmpfs tmpfs /etc
mkdir /etc/secrets
mount --bind "$1" /etc/secrets
shift
exec sh -c '. "$1"; validate_approved_config' sh "$1"
'''
        with tempfile.TemporaryDirectory() as td:
            d=Path(td);cfg=d/'alertmanager-approved.yml';key=d/'zoho-smtp-app-password'
            config=receiver.generate(approved());secret=secrets.token_urlsafe(24)
            def run(env=None,text=config,password=secret+'\n',mode=0o600,link=False):
                cfg.unlink(missing_ok=True);cfg.write_text(text);cfg.chmod(0o600)
                key.unlink(missing_ok=True);key.write_text(password);key.chmod(mode)
                if link:
                    real=d/'other';real.write_text(password);real.chmod(0o600);key.unlink();key.symlink_to(real)
                r=subprocess.run(['unshare','-Ur','-m','sh','-c',mount_script,'sh',td,str(HERE/'alertmanager/approved-config.sh')],
                    env={'PATH':os.environ['PATH'],**(env or approved())},capture_output=True,timeout=8)
                self.assertNotIn(secret.encode(),r.stdout+r.stderr); return r.returncode
            self.assertEqual(run(),0)
            self.assertEqual(run(password=secret),0)
            for mode in [0o644,0o666,0o755]: self.assertEqual(run(mode=mode),78)
            for password in ['', 'short', secret+'\nextra',secret+' ',secret+'\r\n']:
                self.assertEqual(run(password=password),78)
            self.assertEqual(run(link=True),78)
            for text in [config+'# unreviewed\n',config.replace('require_tls: true','require_tls: false'),
                config.replace('smtp.zoho.com:587','smtp.zoho.eu:587'),
                config.replace('html: ""','html: "{{ .CommonAnnotations.summary }}"'),
                config.replace('auth_password_file: '+receiver.PASSWORD_FILE,'auth_password: inline-key'),
                config+'  - name: extra\n    webhook_configs:\n      - url: https://evil.invalid\n']:
                self.assertEqual(run(text=text),78)
            for keyname in ['ALERT_NOTIFICATIONS_APPROVED','ALERT_NOTIFICATION_CONFIG_REVIEWED','ZOHO_SMTP_SERVER_DETAILS_REVIEWED']:
                self.assertEqual(run(env={**approved(),keyname:'false'}),78)
            self.assertEqual(run(env={**approved(),'ZOHO_SMTP_ALLOWED_ORIGIN':'smtp.zoho.com:465'}),78)
            for keyname,value in [('ALERT_EMAIL_TO','aimbim@yopmail.com\nBcc: other@example.invalid'),
                ('ZOHO_SMTP_APPROVED_HOST','smtp.zoho.com\nsmtp.zoho.eu'),
                ('ALERT_NOTIFICATION_APPROVAL_REF',approved()['ALERT_NOTIFICATION_APPROVAL_REF']+'\n')]:
                self.assertEqual(run(env={**approved(),keyname:value}),78)

    def test_launcher_default_off_and_opt_in_fail_closed(self):
        # Native launcher is executed with QA-only absolute file substitutions, not deployed substitutions.
        # Stub reports command/env, not liveness. Native SMTP tests below use the real binary.
        with tempfile.TemporaryDirectory() as td:
            d=Path(td); disk=d/'disk';disk.mkdir();stub=d/'alertmanager';report=d/'argv.json'
            stub.write_text('#!/usr/bin/python3\nimport json,os,sys\nprint(json.dumps({"argv":sys.argv[1:],"env":dict(os.environ)}))\n');stub.chmod(0o700)
            amtool=d/'amtool';amtool.write_text('#!/bin/sh\nexit 0\n');amtool.chmod(0o700)
            source=(HERE/'alertmanager/entrypoint.sh').read_text()
            source=source.replace('/alertmanager ]',str(disk)+' ]').replace('/bin/amtool',str(amtool)).replace('/bin/alertmanager',str(stub)).replace('/opt/monitoring/approved-config.sh',str(HERE/'alertmanager/approved-config.sh'))
            launch=d/'launch.sh';launch.write_text(source)
            env={'PATH':os.environ['PATH'],'HTTP_PROXY':'http://untrusted.invalid','ALERT_EMAIL_TO':'private-value'}
            r=subprocess.run(['sh',str(launch)],env=env,capture_output=True)
            self.assertEqual(r.returncode,0)
            self.assertEqual(json.loads(r.stdout)['argv'],['--config.file=/etc/alertmanager/alertmanager.yml','--storage.path=/alertmanager','--data.retention=120h','--web.listen-address=0.0.0.0:9093','--cluster.listen-address=','--log.level=warn'])
            for extra in [{'ALERT_NOTIFICATIONS_ENABLED':'true'},{'ALERT_NOTIFICATIONS_ENABLED':'TRUE'},
                {'INCIDENT_OUTBOX_ENABLED':'true'},{'PORT':'80'}]:
                r=subprocess.run(['sh',str(launch)],env={**env,**extra},capture_output=True)
                self.assertEqual(r.returncode,78);self.assertEqual(r.stdout,b'')
            private=d/'secrets';private.mkdir()
            (private/'alertmanager-approved.yml').write_text(receiver.generate(approved()))
            (private/'zoho-smtp-app-password').write_text(secrets.token_urlsafe(24)+'\n')
            for secret_file in private.iterdir():secret_file.chmod(0o600)
            mount_script='mount --make-rprivate /; mount -t tmpfs tmpfs /etc; mkdir /etc/secrets; mount --bind "$1" /etc/secrets; exec sh "$2"'
            enabled_env={**env,**approved(),'ALERT_NOTIFICATIONS_ENABLED':'true','SSL_CERT_FILE':'/tmp/untrusted-ca',
                'SMTP_PASSWORD_CANARY':'not-a-real-key'}
            r=subprocess.run(['unshare','-Ur','-m','sh','-c',mount_script,'sh',str(private),str(launch)],env=enabled_env,capture_output=True,timeout=8)
            self.assertEqual(r.returncode,0)
            reported=json.loads(r.stdout)
            self.assertEqual(reported['argv'][0],'--config.file=/etc/secrets/alertmanager-approved.yml')
            for denied in ['HTTP_PROXY','SSL_CERT_FILE','SMTP_PASSWORD_CANARY','ALERT_EMAIL_TO']:
                self.assertNotIn(denied,reported['env'])


class SMTPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address=True
    daemon_threads=True
    def __init__(self,context,mode='ok'):
        self.context=context;self.mode=mode;self.messages=[];self.events=[];self.connections=[]
        self.fail_remaining=0;self.password='';self.client_eofs=[];self.acks=[];self.stalls=[];self.handler_done=[];super().__init__(('127.0.0.1',0),SMTPHandler)


class SMTPHandler(socketserver.BaseRequestHandler):
    def handle(self):
        conn=self.request;conn.settimeout(120);self.server.connections.append(conn);opened=time.monotonic();mode=self.server.mode
        tls=False;authenticated=False
        def send(s): conn.sendall(s.encode()+b'\r\n')
        def line():
            raw=b''
            while not raw.endswith(b'\n'):
                b=conn.recv(1)
                if not b:self.server.client_eofs.append(time.monotonic());return b''
                raw+=b
                if len(raw)>16384:raise ValueError('bounded SMTP line')
            return raw.rstrip(b'\r\n')
        def stall():
            self.server.stalls.append((time.monotonic(),mode))
            while conn.recv(4096):pass
            self.server.client_eofs.append(time.monotonic())
        try:
            if mode=='stall':
                # Peer safety deadline is 120s; actual client termination is required.
                stall()
                return
            send('220 synthetic.invalid ESMTP')
            while True:
                raw=line()
                if not raw:break
                verb=raw.split(b' ',1)[0].upper()
                self.server.events.append((time.monotonic(),verb.decode(),tls))
                if verb in [b'EHLO',b'HELO']:
                    if not tls and self.server.mode!='no_tls':send('250-synthetic.invalid');send('250 STARTTLS')
                    else:send('250-synthetic.invalid');send('250 AUTH PLAIN')
                elif verb==b'STARTTLS':
                    if mode=='starttls_reply_stall':stall();return
                    send('220 Ready to start TLS')
                    if mode=='tls_stall':stall();return
                    conn=self.server.context.wrap_socket(conn,server_side=True)
                    conn.settimeout(120);self.server.connections.append(conn);tls=True
                elif verb==b'AUTH':
                    if mode=='auth_stall':stall();return
                    if not tls:send('538 Encryption required');continue
                    parts=raw.split(b' ')
                    data=parts[2] if len(parts)>2 else b''
                    if not data:send('334 ');data=line()
                    auth=base64.b64decode(data).split(b'\x00')
                    correct=len(auth)==3 and auth[1]==b'qa-sender@yopmail.com' and auth[2].decode()==self.server.password
                    if self.server.mode=='auth_fail' or not correct:send('535 Authentication failed')
                    else:authenticated=True;send('235 Authentication successful')
                elif verb==b'MAIL':send('250 Sender OK' if authenticated else '530 Authentication required')
                elif verb==b'RCPT':send('250 Recipient OK' if authenticated else '530 Authentication required')
                elif verb==b'DATA':
                    if mode=='data_command_stall':stall();return
                    if not authenticated:send('530 Authentication required');continue
                    send('354 End with dot');body=b''
                    while True:
                        ln=line()
                        if ln==b'.':break
                        body+=ln+b'\r\n'
                        if len(body)>65536:raise ValueError('bounded synthetic mail')
                    if self.server.fail_remaining:
                        self.server.fail_remaining-=1;send('451 Temporary synthetic delivery failure')
                    elif mode=='data_ack_stall':
                        self.server.messages.append(body);stall();return
                    else:
                        self.server.messages.append(body);send('250 Message accepted');self.server.acks.append(time.monotonic())
                elif verb==b'QUIT':
                    if mode=='quit_stall':stall();return
                    send('221 Bye');break
                else:send('250 OK')
        except (OSError,ValueError,ssl.SSLError) as error:
            self.server.events.append((time.monotonic(),"PEER_CLOSE_"+type(error).__name__,tls))
        finally:
            self.server.handler_done.append(time.monotonic())
            try:conn.close()
            except OSError:pass


@unittest.skipUnless(BINS,'Requires pinned MONITORING_BIN_DIR')
class NativeSMTPChecks(unittest.TestCase):
    @contextmanager
    def stack(self,mode='ok',trust=True,group_interval='2s'):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td);key=d/'tls.key';cert=d/'tls.crt'
            subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(key),'-out',str(cert),'-days','1',
                '-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],check=True,capture_output=True)
            ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);ctx.minimum_version=ssl.TLSVersion.TLSv1_2;ctx.load_cert_chain(cert,key)
            sink=SMTPServer(ctx,mode);sink.password=secrets.token_urlsafe(24)
            t=threading.Thread(target=sink.serve_forever,daemon=True);t.start()
            password=d/'password';password.write_text(sink.password+'\n');password.chmod(0o600)
            # QA-only transport + interval substitutions: approved production generator never permits loopback/CA override.
            config=yaml.safe_load(receiver.generate(approved()));route=config['route']
            route.update(group_wait='1s',group_interval=group_interval,repeat_interval='1h')
            email=config['receivers'][0]['email_configs'][0]
            email.update(smarthost=f'127.0.0.1:{sink.server_address[1]}',auth_password_file=str(password))
            email['tls_config']={'server_name':'localhost','min_version':'TLS12',**({'ca_file':str(cert)} if trust else {})}
            cfg=d/'config.yml';cfg.write_text(yaml.safe_dump(config,sort_keys=False));port=free_port()
            log=d/'alertmanager.log';f=log.open('wb')
            p=subprocess.Popen([str(BINS/'alertmanager'),'--config.file='+str(cfg),'--storage.path='+str(d/'state'),
                '--web.listen-address=127.0.0.1:'+str(port),'--cluster.listen-address=','--log.level=warn'],
                env={'PATH':os.environ['PATH'],'HOME':td},stdout=f,stderr=f)
            sink.process=p
            sink.log=log
            try:
                wait_for(lambda: self.ready(port),8)
                yield sink,port,password,log
            finally:
                p.terminate()
                try:p.wait(timeout=4)
                except subprocess.TimeoutExpired:p.kill();p.wait(timeout=4)
                f.close()
                sink.shutdown();sink.server_close()
                for conn in sink.connections:
                    try:conn.shutdown(socket.SHUT_RDWR);conn.close()
                    except OSError:pass
                t.join(timeout=2)
                self.assertNotIn(sink.password.encode(),log.read_bytes())

    @staticmethod
    def ready(port):
        try:return http(port)[0]==200
        except OSError:return False

    def alert(self,port,resolved=False):
        now=datetime.now(timezone.utc)
        payload=[{'labels':{'alertname':'ApplicationCriticalIncident','incident_id':'00000000-0000-0000-0000-000000000099',
            'environment':'production','application':'https://synthetic-app.invalid','canary':'PRIVATE_LABEL_CANARY'},
            'annotations':{'summary':'PRIVATE_BODY_CANARY','tenant':'PRIVATE_ID_CANARY'},
            'startsAt':(now-timedelta(minutes=1)).isoformat(),
            'endsAt':(now-timedelta(seconds=1) if resolved else now+timedelta(minutes=4)).isoformat(),
            'generatorURL':'https://PRIVATE_URL_CANARY.invalid'}]
        self.assertEqual(http(port,'POST','/api/v2/alerts',json.dumps(payload))[0],200)

    def minimized(self,raw,resolved=False):
        mail=BytesParser(policy=policy.default).parsebytes(raw)
        self.assertEqual(str(mail['Subject']),'Critical incident resolved' if resolved else 'Critical incident')
        self.assertEqual(str(mail['To']),'aimbim@yopmail.com');self.assertEqual(str(mail['From']),'qa-sender@yopmail.com')
        body=mail.get_body(preferencelist=('plain',)).get_content().strip()
        self.assertEqual(body,('Alert resolved.' if resolved else 'Action required.')+' Review the protected application incident console.')
        self.assertIsNone(mail.get_body(preferencelist=('html',)))
        for canary in [b'PRIVATE_LABEL_CANARY',b'PRIVATE_BODY_CANARY',b'PRIVATE_ID_CANARY',b'PRIVATE_URL_CANARY']:
            self.assertNotIn(canary,raw)
        self.assertNotIn(b'References:',raw);self.assertNotIn(b'In-Reply-To:',raw)

    def test_real_native_firing_resolved_tls_and_redaction(self):
        with self.stack() as (sink,port,password,log):
            self.alert(port);wait_for(lambda:len(sink.acks)==1)
            self.minimized(sink.messages[0]);self.alert(port,True)
            wait_for(lambda:len(sink.acks)==2);self.minimized(sink.messages[1],True)
            self.assertTrue(all(tls for _,verb,tls in sink.events if verb=='AUTH'))
            self.assertTrue(all(tls for _,verb,tls in sink.events if verb=='DATA'))

    def test_auth_failure_retries_without_false_delivery_then_file_rotation(self):
        with self.stack('auth_fail') as (sink,port,password,log):
            self.alert(port);wait_for(lambda:sum(verb=='AUTH' for _,verb,_ in sink.events)>=2,15)
            self.assertEqual(sink.messages,[])
            self.assertFalse(any(verb=='DATA' for _,verb,_ in sink.events))
            new_password=secrets.token_urlsafe(24);sink.password=new_password;password.write_text(new_password+'\n');sink.mode='ok'
            wait_for(lambda:len(sink.acks)==1,20);self.minimized(sink.messages[0])
            self.assertLessEqual(sum(verb=='AUTH' for _,verb,_ in sink.events),12)

    def test_transient_data_failure_bounded_retry_and_no_duplicate(self):
        with self.stack() as (sink,port,password,log):
            sink.fail_remaining=1;self.alert(port)
            wait_for(lambda:len(sink.acks)==1,18);self.minimized(sink.messages[0])
            attempts=sum(verb=='DATA' for _,verb,_ in sink.events)
            self.assertGreaterEqual(attempts,2);self.assertLessEqual(attempts,8)
            self.alert(port);time.sleep(3);self.assertEqual(len(sink.messages),1)

    def test_no_starttls_never_authenticates_or_delivers(self):
        with self.stack('no_tls') as (sink,port,password,log):
            self.alert(port);wait_for(lambda:sum(verb=='EHLO' for _,verb,_ in sink.events)>=2,15)
            self.assertEqual(sink.messages,[]);self.assertFalse(any(verb=='AUTH' for _,verb,_ in sink.events))

    def test_untrusted_certificate_never_authenticates_or_delivers(self):
        with self.stack(trust=False) as (sink,port,password,log):
            self.alert(port);wait_for(lambda:any(verb=='STARTTLS' for _,verb,_ in sink.events))
            time.sleep(1);self.assertEqual(sink.messages,[]);self.assertFalse(any(verb=='AUTH' for _,verb,_ in sink.events))


if __name__=='__main__':
    unittest.main(verbosity=2)
