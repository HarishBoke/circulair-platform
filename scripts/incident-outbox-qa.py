#!/usr/bin/env python3
"""Finite outbox PostgreSQL QA. No inherited secrets, production URLs or external network.

sudo is used only to create an owned child network namespace and bring up its
loopback interface. The child drops to the caller UID/GID before PostgreSQL,
fixture generation or Vitest. Host networking and existing clusters are untouched.
"""
from pathlib import Path
import argparse
import ctypes
import hashlib
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
PG = Path('/usr/lib/postgresql/16/bin')
PREFIX = 'guarded PostgreSQL incident outbox (all sends mocked)'
FILES = (
    'scripts/incident-outbox-qa.py', 'scripts/incident-outbox-schema-qa.ts',
    'server/incidentOutbox.test.ts', 'server/incidentOutbox.ts',
    'server/incidentRouter.ts', 'scripts/incident-worker.ts',
    'drizzle/schema.ts', 'drizzle/incidentSchema.ts',
    'drizzle/open-source-incidents.sql', 'pnpm-lock.yaml', '.github/workflows/ci.yml',
    'server/incidentOutboxSchema.test.ts', 'scripts/test_incident_outbox_qa.py',
)


def evaluate_report(report):
    """Require actual assertions, not a successful process exit with skipped tests."""
    assertions = [a for suite in report.get('testResults', []) for a in suite.get('assertionResults', [])]
    guarded = [a for a in assertions if PREFIX in a.get('ancestorTitles', [])]
    counts = {'total': len(assertions), 'passed': sum(a.get('status') == 'passed' for a in assertions),
              'guarded_total': len(guarded), 'guarded_passed': sum(a.get('status') == 'passed' for a in guarded)}
    ok = (report.get('success') is True and counts == {
        'total': 63, 'passed': 63, 'guarded_total': 28, 'guarded_passed': 28}
        and len({a.get('fullName') for a in guarded}) == 28
        and report.get('numFailedTests') == 0 and report.get('numPendingTests') == 0)
    return ok, counts, [{'title': a['title'], 'status': a['status']} for a in guarded]


def group_exists(group):
    try:
        os.killpg(group, 0)
        return True
    except ProcessLookupError:
        return False


def wait_group_exit(process, seconds=2):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline and group_exists(process.pid):
        process.poll()
        try:
            while os.waitpid(-process.pid, os.WNOHANG)[0]:
                pass  # reap exited orphaned workers adopted by the namespace subreaper
        except ChildProcessError:
            pass
        time.sleep(0.05)
    return not group_exists(process.pid)


def terminate_group(process):
    """Signal only a new session owned by this phase, including fork descendants."""
    for sig in (signal.SIGTERM, signal.SIGKILL):
        if not group_exists(process.pid):
            break
        os.killpg(process.pid, sig)
        wait_group_exit(process)
    process.wait(timeout=5)
    if group_exists(process.pid):
        raise RuntimeError('Owned phase process group did not exit')


def phase(command, env, timeout, input_text=None, log=None, allow_background=False):
    process = subprocess.Popen(command, cwd=ROOT, env=env, text=True,
        stdin=subprocess.PIPE if input_text is not None else subprocess.DEVNULL,
        stdout=log if log is not None else subprocess.PIPE, stderr=subprocess.STDOUT,
        start_new_session=True)
    try:
        output, _ = process.communicate(input=input_text, timeout=timeout)
    except BaseException:
        terminate_group(process)
        raise
    if process.returncode != 0 or not allow_background:
        if not wait_group_exit(process):
            terminate_group(process)
            if process.returncode == 0:
                raise RuntimeError('Successful phase left owned descendants')
    return process.returncode, output


def capture(command, env, timeout=15):
    code, output = phase(command, env, timeout)
    if code:
        raise RuntimeError('Owned QA phase failed')
    return output.strip()


def command_log(command, path, env, timeout, input_text=None, allow_background=False):
    with path.open('w') as log:
        return phase(command, env, timeout, input_text, log, allow_background)[0]


def postmaster_absent(pid):
    if pid is None:
        return True
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline and Path(f'/proc/{pid}').exists():
        try:
            os.waitpid(pid, os.WNOHANG)
        except ChildProcessError:
            pass
        time.sleep(0.05)
    return not Path(f'/proc/{pid}').exists()


def stop_owned_cluster(work, out, env):
    pid_file = work / 'data/postmaster.pid'
    pid = int(pid_file.read_text().splitlines()[0]) if pid_file.exists() else None
    result = {}
    try:
        result['fast_shutdown_exit'] = command_log([str(PG / 'pg_ctl'), '-D', str(work / 'data'),
            '-m', 'fast', '-w', 'stop'], out / 'shutdown.log', env, 30)
    except Exception as error:
        result['fast_shutdown_failure_kind'] = type(error).__name__
    fast_clean = not pid_file.exists() and postmaster_absent(pid)
    if result.get('fast_shutdown_exit') != 0 or not fast_clean:
        try:
            result['immediate_shutdown_exit'] = command_log([str(PG / 'pg_ctl'), '-D', str(work / 'data'),
                '-m', 'immediate', '-w', 'stop'], out / 'shutdown-immediate.log', env, 15)
        except Exception as error:
            result['immediate_shutdown_failure_kind'] = type(error).__name__
    result['owned_postmaster_pid_absent'] = not pid_file.exists()
    result['owned_postmaster_process_absent'] = postmaster_absent(pid)
    # Fallback cleanup never turns a failed fast shutdown into a passing QA run.
    result['shutdown_exit'] = 0 if result.get('fast_shutdown_exit') == 0 and fast_clean else 1
    result['cleanup_complete'] = result['owned_postmaster_pid_absent'] and result['owned_postmaster_process_absent']
    return result


def interrupt(_signum, _frame):
    raise InterruptedError('QA interrupted; owned cluster cleanup required')


def child(args):
    if os.geteuid() != 0 or args.caller_uid <= 0 or args.caller_gid < 0:
        raise SystemExit('Only a namespace child dropping to a nonroot caller is allowed')
    if os.readlink('/proc/self/ns/net') == args.parent_netns:
        raise SystemExit('A distinct owned network namespace is required')
    subprocess.run(['/usr/sbin/ip', 'link', 'set', 'lo', 'up'], check=True, timeout=10,
                   env={'PATH': os.defpath})
    links = json.loads(subprocess.check_output(['/usr/sbin/ip', '-j', 'link'], text=True, timeout=10))
    if [link['ifname'] for link in links] != ['lo']:
        raise SystemExit('Only isolated loopback networking is allowed')
    os.setgroups([])
    os.setgid(args.caller_gid)
    os.setuid(args.caller_uid)
    if os.geteuid() != args.caller_uid or os.getegid() != args.caller_gid:
        raise SystemExit('Caller privilege drop failed')
    # Reap orphaned tsx/Vitest forks and backgrounded owned postmaster on cleanup.
    if ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) != 0:
        raise SystemExit('Owned child subreaper setup failed')
    signal.signal(signal.SIGTERM, interrupt)
    signal.signal(signal.SIGINT, interrupt)
    out = Path(args.output)
    work = Path(tempfile.mkdtemp(prefix='circulair-outbox-qa-', dir='/tmp'))
    socket = work / 'socket'
    home = work / 'home'
    socket.mkdir(mode=0o700)
    home.mkdir(mode=0o700)
    env = {'PATH': os.defpath, 'HOME': str(home), 'LANG': 'C.UTF-8', 'NODE_ENV': 'test',
           'CI': 'true', 'NO_COLOR': '1', 'DOTENV_CONFIG_PATH': '/dev/null',
           'JWT_SECRET': 'isolated-ci-signing-key-never-use-in-production',
           'DATABASE_URL': '', 'RENDER_DATABASE_URL': '',
           'OPEN_SOURCE_ALERTING_ENABLED': 'false', 'INCIDENT_OUTBOX_ENABLED': 'false',
           'PAGERDUTY_ENABLED': 'false', 'CASHFREE_SANDBOX_ENABLED': 'false',
           'TEST_INCIDENT_PG_URL': 'postgresql://outbox_qa_operator@127.0.0.1:5432/circulair_qa'}
    started = False
    result = {'fresh_synthetic_cluster': True, 'isolated_loopback_namespace': True,
              'no_external_network_interface': True, 'nonroot_uid': os.geteuid(),
              'production_access': False, 'provider_access': False, 'senders_mocked': True,
              'source_sha256': {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in FILES}}
    try:
        result['head_sha'] = capture(['/usr/bin/git', 'rev-parse', 'HEAD'], env)
        result['working_tree_clean'] = not capture(['/usr/bin/git', 'status', '--porcelain'], env)
        result['node_version'] = capture([args.node, '--version'], env)
        result['postgres_version'] = capture([str(PG / 'postgres'), '--version'], env)
        result['package_manager_declared'] = json.loads((ROOT / 'package.json').read_text())['packageManager']
        if result['node_version'] != 'v24.14.1' or not result['postgres_version'].startswith('postgres (PostgreSQL) 16.'):
            raise RuntimeError('Reviewed Node 24.14.1 and PostgreSQL 16 are required')
        print('Outbox QA: private namespace, caller privileges, fresh PostgreSQL 16', flush=True)
        if command_log([str(PG / 'initdb'), '-D', str(work / 'data'), '-A', 'trust',
                        '--no-locale', '--encoding=UTF8', '--username=outbox_qa_operator'],
                       out / 'initdb.log', env, 60):
            raise RuntimeError('Fresh cluster initialization failed')
        if command_log([str(PG / 'pg_ctl'), '-D', str(work / 'data'), '-l', str(work / 'postgres.log'),
                        '-o', f'-k {socket} -h 127.0.0.1 -p 5432 -F', '-w', 'start'],
                       out / 'startup.log', env, 30, allow_background=True):
            raise RuntimeError('Owned cluster startup failed')
        started = True
        psql = [str(PG / 'psql'), '-X', '-v', 'ON_ERROR_STOP=1', '-h', str(socket),
                '-U', 'outbox_qa_operator', '-d', 'postgres']
        if command_log(psql, out / 'database.log', env, 15, 'CREATE DATABASE circulair_qa;\n'):
            raise RuntimeError('Synthetic database creation failed')
        schema = capture([args.node, str(ROOT / 'node_modules/tsx/dist/cli.mjs'),
                          str(ROOT / 'scripts/incident-outbox-schema-qa.ts')], env, 30)
        (out / 'base-schema.sql').write_text(schema + '\n')
        result['base_schema_sha256'] = hashlib.sha256((schema + '\n').encode()).hexdigest()
        psql[-1] = 'circulair_qa'
        if command_log(psql, out / 'schema.log', env, 15, schema):
            raise RuntimeError('Source-derived synthetic schema bootstrap failed')
        print('Outbox QA: executing 63 cases, including all 28 PostgreSQL cases', flush=True)
        result['test_exit'] = command_log([args.node, str(ROOT / 'node_modules/vitest/vitest.mjs'),
            'run', 'server/incidentOutbox.test.ts', '--maxWorkers=1', '--minWorkers=1', '--no-cache',
            '--reporter=verbose', '--reporter=json', f'--outputFile={out / "vitest.json"}'],
            out / 'tests.log', env, 120)
        report = json.loads((out / 'vitest.json').read_text())
        result['assertions_verified'], result['counts'], cases = evaluate_report(report)
        (out / 'guarded-cases.json').write_text(json.dumps(cases, indent=2) + '\n')
        if result['test_exit'] or not result['assertions_verified']:
            raise RuntimeError('Outbox assertions failed, skipped or changed inventory')
        # afterAll must remove its synthetic random schema even when assertions passed.
        cleanup_query = "SELECT count(*) FROM pg_namespace WHERE nspname LIKE 'qa_oss_%';"
        raw = capture(psql + ['-tA', '-c', cleanup_query], env)
        result['owned_test_schemas_removed'] = raw == '0'
        if not result['owned_test_schemas_removed']:
            raise RuntimeError('Owned outbox test schema was not removed')
    except Exception as error:
        # Never echo subprocess/provider/connection payloads.
        result['failure_kind'] = type(error).__name__
        print('Outbox QA failed; inspect synthetic evidence for the failing stage', flush=True)
    finally:
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        if started or (work / 'data/postmaster.pid').exists():
            result.update(stop_owned_cluster(work, out, env))
        else:
            result['shutdown_exit'] = 0
            result['owned_postmaster_pid_absent'] = True
            result['owned_postmaster_process_absent'] = True
            result['cleanup_complete'] = True
        if result.get('cleanup_complete'):
            shutil.rmtree(work)
        result['owned_cluster_directory_removed'] = not work.exists()
        result['success'] = (result.get('test_exit') == 0 and result.get('assertions_verified') is True
            and result.get('owned_test_schemas_removed') is True and result.get('shutdown_exit') == 0
            and result.get('owned_postmaster_pid_absent') is True
            and result.get('owned_postmaster_process_absent') is True
            and result['owned_cluster_directory_removed'] and 'failure_kind' not in result)
        (out / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
        print('Outbox QA: ' + ('PASS 63/63; guarded 28/28; cleanup verified' if result['success']
                                    else 'FAIL (including skip/cleanup checks)'), flush=True)
    return 0 if result['success'] else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, help='Fresh evidence directory outside repository')
    parser.add_argument('--namespace-child', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--caller-uid', type=int, default=-1, help=argparse.SUPPRESS)
    parser.add_argument('--caller-gid', type=int, default=-1, help=argparse.SUPPRESS)
    parser.add_argument('--parent-netns', default='', help=argparse.SUPPRESS)
    parser.add_argument('--node', default='', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.namespace_child:
        return child(args)
    out = Path(args.output).resolve()
    if os.geteuid() == 0 or out == ROOT or ROOT in out.parents or out.exists():
        raise SystemExit('Nonroot caller and fresh external output are required')
    node = shutil.which('node')
    if not node or not all((PG / name).is_file() for name in ('initdb', 'pg_ctl', 'psql', 'postgres')):
        raise SystemExit('Node and PostgreSQL 16 tools are required')
    out.mkdir(mode=0o700, parents=True)
    command = ['/usr/bin/sudo', '-n', '/usr/bin/unshare', '--net', '--', sys.executable,
        str(Path(__file__).resolve()), '--namespace-child', '--output', str(out),
        '--caller-uid', str(os.getuid()), '--caller-gid', str(os.getgid()),
        '--parent-netns', os.readlink('/proc/self/ns/net'), '--node', str(Path(node).resolve())]
    process = subprocess.Popen(command, cwd=ROOT,
        env={'PATH': os.defpath, 'LANG': 'C.UTF-8'}, start_new_session=True)
    signal.signal(signal.SIGTERM, interrupt)
    signal.signal(signal.SIGINT, interrupt)
    try:
        return process.wait(timeout=360)
    except (subprocess.TimeoutExpired, InterruptedError):
        # Signal only our child group, then allow its finally block to stop owned PG.
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=60)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=10)
        print('Owned namespace runner exceeded its complete budget; QA is failed', flush=True)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
