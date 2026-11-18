#!/usr/bin/env python3
"""Offline tests for the fail-closed outbox QA assertion verifier; no DB/network."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location('outbox_qa', Path(__file__).with_name('incident-outbox-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def complete_report():
    return {'success': True, 'numFailedTests': 0, 'numPendingTests': 0,
            'testResults': [{'assertionResults': [
                {'title': f'case {i}', 'fullName': f'case {i}', 'status': 'passed',
                 'ancestorTitles': [qa.PREFIX] if i < 28 else ['offline contract']}
                for i in range(63)]}]}


class AssertionGateTests(unittest.TestCase):
    def test_accepts_exact_63_passed_including_28_guarded(self):
        ok, counts, cases = qa.evaluate_report(complete_report())
        self.assertTrue(ok)
        self.assertEqual(counts, {'total': 63, 'passed': 63, 'guarded_total': 28, 'guarded_passed': 28})
        self.assertEqual(len(cases), 28)

    def test_rejects_empty_or_missing_report(self):
        self.assertFalse(qa.evaluate_report({})[0])

    def test_rejects_offline_only_success_with_28_skips(self):
        report = complete_report()
        report['numPendingTests'] = 28
        for case in report['testResults'][0]['assertionResults'][:28]:
            case['status'] = 'pending'
        self.assertFalse(qa.evaluate_report(report)[0])

    def test_rejects_one_guarded_skip_even_if_success_true(self):
        report = complete_report()
        report['testResults'][0]['assertionResults'][0]['status'] = 'pending'
        self.assertFalse(qa.evaluate_report(report)[0])

    def test_rejects_one_offline_skip(self):
        report = complete_report()
        report['testResults'][0]['assertionResults'][-1]['status'] = 'pending'
        self.assertFalse(qa.evaluate_report(report)[0])

    def test_rejects_failed_assertion(self):
        report = complete_report()
        report['testResults'][0]['assertionResults'][0]['status'] = 'failed'
        self.assertFalse(qa.evaluate_report(report)[0])

    def test_rejects_reported_failure_or_pending_summary(self):
        for key in ('numFailedTests', 'numPendingTests'):
            report = complete_report()
            report[key] = 1
            self.assertFalse(qa.evaluate_report(report)[0])

    def test_rejects_false_success(self):
        report = complete_report()
        report['success'] = False
        self.assertFalse(qa.evaluate_report(report)[0])

    def test_rejects_wrong_inventory(self):
        report = complete_report()
        report['testResults'][0]['assertionResults'].pop()
        self.assertFalse(qa.evaluate_report(report)[0])

    def test_rejects_missing_guarded_group(self):
        report = complete_report()
        report['testResults'][0]['assertionResults'][0]['ancestorTitles'] = ['offline contract']
        self.assertFalse(qa.evaluate_report(report)[0])

    def test_rejects_duplicate_guarded_full_name(self):
        report = complete_report()
        report['testResults'][0]['assertionResults'][1]['fullName'] = 'case 0'
        self.assertFalse(qa.evaluate_report(report)[0])


class PhaseLifecycleTests(unittest.TestCase):
    def run_phase(self, process, has_group=False):
        with patch.object(qa.subprocess, 'Popen', return_value=process), \
             patch.object(qa, 'group_exists', return_value=has_group), \
             patch.object(qa, 'wait_group_exit', return_value=not has_group), \
             patch.object(qa, 'terminate_group') as cleanup:
            result = qa.phase(['owned-phase'], {}, 1)
            return result, cleanup.call_count

    def test_normal_exit_does_not_signal_other_processes(self):
        process = Mock(returncode=0)
        process.communicate.return_value = ('synthetic output', None)
        result, calls = self.run_phase(process)
        self.assertEqual(result, (0, 'synthetic output'))
        self.assertEqual(calls, 0)

    def test_failed_phase_reaps_its_owned_descendants(self):
        process = Mock(returncode=1)
        process.communicate.return_value = ('synthetic failure', None)
        result, calls = self.run_phase(process, True)
        self.assertEqual(result[0], 1)
        self.assertEqual(calls, 1)

    def test_timeout_and_interruption_reap_descendants_before_raising(self):
        for error in (subprocess.TimeoutExpired('owned-phase', 1), InterruptedError('synthetic interrupt')):
            process = Mock(returncode=None)
            process.communicate.side_effect = error
            with patch.object(qa.subprocess, 'Popen', return_value=process), \
                 patch.object(qa, 'terminate_group') as cleanup:
                with self.assertRaises(type(error)):
                    qa.phase(['owned-phase'], {}, 1)
                cleanup.assert_called_once_with(process)

    def test_success_with_leftover_descendants_fails_after_cleanup(self):
        process = Mock(returncode=0)
        process.communicate.return_value = ('', None)
        with patch.object(qa.subprocess, 'Popen', return_value=process), \
             patch.object(qa, 'group_exists', return_value=True), \
             patch.object(qa, 'wait_group_exit', return_value=False), \
             patch.object(qa, 'terminate_group') as cleanup:
            with self.assertRaises(RuntimeError):
                qa.phase(['owned-phase'], {}, 1)
            cleanup.assert_called_once_with(process)


class ClusterShutdownTests(unittest.TestCase):
    def run_shutdown(self, fast_result, immediate_result=None, fast_removes=False, fallback_removes=True):
        with tempfile.TemporaryDirectory(prefix='outbox-cleanup-unit-') as directory:
            work = Path(directory)
            (work / 'data').mkdir()
            pid = work / 'data/postmaster.pid'
            pid.write_text('123456789\n')
            modes = []

            def fake_command(command, *args, **kwargs):
                mode = command[command.index('-m') + 1]
                modes.append(mode)
                value = fast_result if mode == 'fast' else immediate_result
                if (mode == 'fast' and fast_removes) or (mode == 'immediate' and fallback_removes):
                    pid.unlink(missing_ok=True)
                if isinstance(value, Exception):
                    raise value
                return value

            with patch.object(qa, 'command_log', side_effect=fake_command), \
                 patch.object(qa, 'postmaster_absent', side_effect=lambda unused: not pid.exists()):
                return qa.stop_owned_cluster(work, work, {}), modes

    def test_clean_fast_shutdown_passes_without_fallback(self):
        result, modes = self.run_shutdown(0, fast_removes=True)
        self.assertEqual(modes, ['fast'])
        self.assertEqual(result['shutdown_exit'], 0)
        self.assertTrue(result['cleanup_complete'])

    def test_nonzero_fast_uses_immediate_cleanup_but_stays_failed(self):
        result, modes = self.run_shutdown(1, 0)
        self.assertEqual(modes, ['fast', 'immediate'])
        self.assertEqual(result['shutdown_exit'], 1)
        self.assertTrue(result['cleanup_complete'])

    def test_fast_timeout_uses_immediate_cleanup_but_stays_failed(self):
        result, modes = self.run_shutdown(subprocess.TimeoutExpired('owned-pg', 30), 0)
        self.assertEqual(modes, ['fast', 'immediate'])
        self.assertEqual(result['shutdown_exit'], 1)
        self.assertTrue(result['cleanup_complete'])

    def test_failed_fallback_does_not_claim_cleanup(self):
        result, modes = self.run_shutdown(1, 1, fallback_removes=False)
        self.assertEqual(modes, ['fast', 'immediate'])
        self.assertFalse(result['cleanup_complete'])
        self.assertEqual(result['shutdown_exit'], 1)

    def test_timed_out_fallback_does_not_claim_cleanup(self):
        result, modes = self.run_shutdown(1, subprocess.TimeoutExpired('owned-pg', 15), fallback_removes=False)
        self.assertEqual(modes, ['fast', 'immediate'])
        self.assertFalse(result['cleanup_complete'])

    def test_zero_exit_without_real_shutdown_requires_fallback_and_fails(self):
        result, modes = self.run_shutdown(0, 0, fast_removes=False)
        self.assertEqual(modes, ['fast', 'immediate'])
        self.assertTrue(result['cleanup_complete'])
        self.assertEqual(result['shutdown_exit'], 1)


if __name__ == '__main__':
    unittest.main()
