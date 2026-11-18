#!/usr/bin/env python3
"""Finite synthetic recovery QA. Never reads application/provider/database configuration."""
from pathlib import Path
import argparse
import json
import os
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True, help='Fresh evidence directory outside repository')
    args = parser.parse_args()
    out = Path(args.output).resolve()
    if out == ROOT or ROOT in out.parents or out.exists():
        raise SystemExit('Fresh external output is required')
    if os.geteuid() == 0:
        raise SystemExit('Run local PostgreSQL QA as a nonroot user')
    out.mkdir(mode=0o700, parents=True)
    node = shutil.which('node')
    pg = Path('/usr/lib/postgresql/16/bin')
    if not node or not all((pg / name).is_file() for name in ('initdb', 'pg_ctl')):
        raise SystemExit('Node and local PostgreSQL 16 tools are required')
    work = Path(tempfile.mkdtemp(prefix='circulair-reset-qa-', dir='/tmp'))
    socket = work / 'socket'
    socket.mkdir(mode=0o700)
    home = work / 'home'
    home.mkdir(mode=0o700)
    env = {'PATH': os.defpath, 'HOME': str(home), 'LANG': 'C.UTF-8', 'NODE_ENV': 'test', 'CI': 'true', 'JWT_SECRET': 'isolated-ci-signing-key-never-use-in-production', 'DOTENV_CONFIG_PATH': '/dev/null', 'PASSWORD_RECOVERY_PG_TESTS': 'true', 'PASSWORD_RECOVERY_QA_SOCKET': str(socket)}
    started = False
    result = {'only_unix_socket': True, 'fresh_synthetic_cluster': True, 'production_access': False, 'provider_access': False}
    try:
        with (out / 'initdb.log').open('w') as log:
            subprocess.run([str(pg / 'initdb'), '-D', str(work / 'data'), '-A', 'trust', '--no-locale', '--encoding=UTF8', '--username=reset_qa_operator'], env=env, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=60)
        with (out / 'startup.log').open('w') as log:
            subprocess.run([str(pg / 'pg_ctl'), '-D', str(work / 'data'), '-l', str(work / 'postgres.log'), '-o', f"-k {socket} -h '' -p 5432 -F", '-w', 'start'], env=env, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=30)
        started = True
        with (out / 'tests.log').open('w') as log:
            test = subprocess.run([node, str(ROOT / 'node_modules/vitest/vitest.mjs'), 'run', 'server/passwordRecovery.test.ts', '--maxWorkers=1', '--minWorkers=1', '--no-cache'], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=90)
        result['test_exit'] = test.returncode
        print('\n'.join((out / 'tests.log').read_text(errors='replace').splitlines()[-10:]), flush=True)
    finally:
        if started or (work / 'data/postmaster.pid').exists():
            with (out / 'shutdown.log').open('w') as log:
                stop = subprocess.run([str(pg / 'pg_ctl'), '-D', str(work / 'data'), '-m', 'fast', '-w', 'stop'], env=env, stdout=log, stderr=subprocess.STDOUT, timeout=30)
            result['shutdown_exit'] = stop.returncode
            result['owned_postmaster_pid_absent'] = not (work / 'data/postmaster.pid').exists()
        (out / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
        if result.get('shutdown_exit') == 0 or not started:
            shutil.rmtree(work)
    return 0 if result.get('test_exit') == 0 and result.get('shutdown_exit') == 0 and result.get('owned_postmaster_pid_absent') else 1


if __name__ == '__main__':
    raise SystemExit(main())
