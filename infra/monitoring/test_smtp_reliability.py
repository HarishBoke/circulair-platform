#!/usr/bin/env python3
"""Real patched native binary, local captured SMTP only; no provider/inbox traffic.
The one-minute group interval recovery is production-relevant. Other timing
substitutions are explicitly QA-only. Capture alone is never success evidence.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import time
import unittest
import test_email_delivery as qa

EVIDENCE=Path(os.environ['SMTP_EVIDENCE_DIR']) if os.environ.get('SMTP_EVIDENCE_DIR') else None
RESULTS=[]
def metric_value(text,name):
    values=[float(value) for labels,value in re.findall(r'^'+re.escape(name)+r'(\{[^\n]*\})? ([0-9.eE+\-]+)$',text,re.M) if 'integration="email"' in labels]
    return sum(values)
def metric(port,name):
    return metric_value(qa.http(port,path='/metrics')[1].decode(),name)
def snapshot(port):
    # Pinned notify/retry_stage.go: notifications increments at pipeline entry;
    # failed increments at failed exit. Request counters count completed attempts.
    text=qa.http(port,path='/metrics')[1].decode()
    return {'readiness_http':qa.http(port)[0],'notifications':metric_value(text,'alertmanager_notifications_total'),
        'failed':metric_value(text,'alertmanager_notifications_failed_total'),'requests':metric_value(text,'alertmanager_notification_requests_total'),
        'failed_requests':metric_value(text,'alertmanager_notification_requests_failed_total')}
def save(name,record):
    RESULTS.append({'name':name,**record})
    if EVIDENCE:
        EVIDENCE.mkdir(parents=True,exist_ok=True)
        (EVIDENCE/'native-smtp-evidence.json').write_text(json.dumps({'loopback_only':True,'real_email_sent':False,'binary_sha256':hashlib.sha256((qa.BINS/'alertmanager').read_bytes()).hexdigest(),'results':RESULTS},indent=2)+'\n')

@unittest.skipUnless(qa.BINS,'Requires patched MONITORING_BIN_DIR')
class SMTPReliability(qa.NativeSMTPChecks):
    # Five inherited native redaction/TLS/auth/retry methods plus four below.
    def test_production_one_minute_interval_stall_recovers_without_restart(self):
        with self.stack('stall',group_interval='1m') as (sink,port,password,log):
            pid=sink.process.pid;self.alert(port)
            qa.wait_for(lambda:len(sink.stalls)>=1,8)
            first=sink.stalls[0][0];before=snapshot(port)
            self.assertEqual(before['readiness_http'],200);self.assertEqual(len(sink.acks),0)
            # Production 30-second complete-attempt cap. The peer itself waits 120s.
            qa.wait_for(lambda:len(sink.client_eofs)>=1,34)
            close_age=sink.client_eofs[0]-first
            self.assertGreater(close_age,28);self.assertLess(close_age,33)
            # The 1m pipeline can still retry after the 30s attempt expires.
            qa.wait_for(lambda:metric(port,'alertmanager_notification_requests_failed_total')>=1,4)
            failed=snapshot(port);self.assertGreaterEqual(failed['failed_requests'],1)
            self.assertEqual(failed['requests'],failed['failed_requests'])
            self.assertEqual(failed['readiness_http'],200);self.assertEqual(len(sink.acks),0)
            sink.mode='ok'
            # RetryStage may retry within this 1m context or next normal group flush.
            qa.wait_for(lambda:len(sink.acks)==1,80)
            qa.wait_for(lambda:metric(port,'alertmanager_notification_requests_total')>metric(port,'alertmanager_notification_requests_failed_total'),4)
            healthy=snapshot(port)
            self.assertEqual(sink.process.pid,pid);self.assertIsNone(sink.process.poll())
            self.minimized(sink.messages[-1]);self.assertLessEqual(len(sink.stalls),2)
            time.sleep(3);self.assertEqual(len(sink.acks),1)
            save(self._testMethodName,{'group_interval':'1m','group_wait':'1s QA only','production_attempt_cap_seconds':30,'peer_safety_deadline_seconds':120,'client_eof_seconds':round(close_age,3),'before':before,'after_failure':failed,'after_recovery':healthy,'same_process':True,'stalled_attempts':len(sink.stalls),'final_data_ack_count':len(sink.acks),'ack_seconds_after_first_stall':round(sink.acks[0]-first,3),'dedup_observation_seconds':3})
    def test_shutdown_cancels_stalled_native_socket(self):
        with self.stack('stall',group_interval='1m') as (sink,port,password,log):
            self.alert(port);qa.wait_for(lambda:len(sink.stalls)>=1,8)
            started=time.monotonic();sink.process.terminate();sink.process.wait(timeout=4)
            qa.wait_for(lambda:len(sink.client_eofs)>=1,3)
            self.assertEqual(len(sink.acks),0)
            save(self._testMethodName,{'shutdown_seconds':round(time.monotonic()-started,3),'client_eof':True,'final_data_ack_count':0,'exit':sink.process.returncode})
    def test_accepted_data_quit_hang_is_success_and_not_resent(self):
        with self.stack('quit_stall') as (sink,port,password,log):
            self.alert(port);qa.wait_for(lambda:len(sink.acks)==1,10)
            qa.wait_for(lambda:len(sink.client_eofs)==1,3)
            qa.wait_for(lambda:metric(port,'alertmanager_notification_requests_total')>=1,3)
            stats=snapshot(port);self.assertEqual(stats['failed'],0)
            self.assertEqual(stats['failed_requests'],0)
            self.alert(port);time.sleep(5);self.assertEqual(len(sink.acks),1)
            save(self._testMethodName,{'group_interval':'2s QA only','final_data_ack_count':1,'client_eof':True,'metrics':stats,'no_resend_observation_seconds':5})
    def test_post_data_missing_ack_ambiguous_not_success(self):
        with self.stack('data_ack_stall') as (sink,port,password,log):
            self.alert(port);qa.wait_for(lambda:len(sink.stalls)>=1,8)
            qa.wait_for(lambda:len(sink.handler_done)>=1,13)
            qa.wait_for(lambda:metric(port,'alertmanager_notifications_failed_total')>=1,4)
            self.assertGreaterEqual(len(sink.messages),1);self.assertEqual(len(sink.acks),0)
            # A second pipeline may already be in flight; total != failed then.
            # Every completed attempt must have failed, with zero DATA 250s.
            stats=snapshot(port);self.assertGreaterEqual(stats['failed_requests'],1)
            self.assertEqual(stats['requests'],stats['failed_requests'])
            self.assertEqual(stats['readiness_http'],200)
            self.assertLessEqual(len(sink.stalls),2)
            # RetryStage may wrap the verdict as the parent deadline instead.
            # Captured DATA with no final 250 remains the decisive unknown-ack evidence.
            self.assertRegex(log.read_bytes(),b'ambiguous|context deadline exceeded')
            save(self._testMethodName,{'group_interval':'2s QA only; parent timeout clamped to 10s','captured_data':len(sink.messages),'stalled_attempts':len(sink.stalls),'final_data_ack_count':0,'metrics':stats,'outcome':'ambiguous; retry can duplicate; observation bounded to first failed pipeline'})

if __name__=='__main__':unittest.main(verbosity=2)
