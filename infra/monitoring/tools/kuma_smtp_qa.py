#!/usr/bin/env python3
"""Pinned native SMTP regression only; no Kuma server, monitors or provider traffic."""
from pathlib import Path
import argparse
import json
import os
import shutil
import subprocess
import uuid

HERE = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--native-root', help='Existing verified immutable image filesystem; otherwise extract with Docker')
    args = parser.parse_args()
    out = Path(args.output).resolve()
    repo = HERE.parents[1]
    if out.exists() or out == repo or repo in out.parents:
        raise SystemExit('Fresh external QA output is required')
    out.mkdir(mode=0o700, parents=True)
    fixtures = out / 'fixtures'
    fixtures.mkdir(mode=0o700)
    pins = json.loads((HERE / 'image-pins.json').read_text())
    image = pins['images']['kuma']['reference']
    container = None
    try:
        if args.native_root:
            native = Path(args.native_root).resolve()
            node = native / 'usr/local/bin/node'
            app = native / 'app'
        else:
            container = 'circulair-kuma-smtp-qa-' + uuid.uuid4().hex[:12]
            subprocess.run(['docker', 'pull', image], check=True, timeout=300)
            subprocess.run(['docker', 'create', '--name', container, '--network', 'none', image], check=True, timeout=30, stdout=subprocess.DEVNULL)
            app = out / 'app'
            node = out / 'native-node'
            subprocess.run(['docker', 'cp', container + ':/app', str(app)], check=True, timeout=180)
            subprocess.run(['docker', 'cp', container + ':/usr/local/bin/node', str(node)], check=True, timeout=30)
            subprocess.run(['docker', 'rm', container], check=True, timeout=30, stdout=subprocess.DEVNULL)
            container = None
        if json.loads((app / 'package.json').read_text())['version'] != pins['images']['kuma']['tag']:
            raise SystemExit('Pinned Kuma version mismatch')
        with (out / 'certificate-generation.log').open('w') as log:
            subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost', '-keyout', str(fixtures / 'sink-key.pem'), '-out', str(fixtures / 'sink-cert.pem')], stdout=log, stderr=subprocess.STDOUT, check=True, timeout=30)
        for file in fixtures.iterdir():
            file.chmod(0o600)
        env = {'PATH': os.defpath, 'HOME': str(out), 'NODE_EXTRA_CA_CERTS': str(fixtures / 'sink-cert.pem')}
        results = []
        for name, script, extra_ca in [('full', 'test-smtp.cjs', True), ('untrusted-tls', 'test-untrusted-tls.cjs', False)]:
            run_env = dict(env)
            if not extra_ca:
                run_env.pop('NODE_EXTRA_CA_CERTS')
            with (out / (name + '.log')).open('w') as log:
                result = subprocess.run([str(node), str(HERE / 'kuma' / script), str(app), str(out)], env=run_env, stdout=log, stderr=subprocess.STDOUT, timeout=220)
            results.append({'suite': name, 'exit': result.returncode})
            print('\n'.join((out / (name + '.log')).read_text(errors='replace').splitlines()[-4:]), flush=True)
            if result.returncode:
                break
        (out / 'result.json').write_text(json.dumps({'pinned_image': image, 'native_version': json.loads((app / 'package.json').read_text())['version'], 'server_started': False, 'provider_access': False, 'suites': results}, indent=2) + '\n')
        return 0 if len(results) == 2 and all(row['exit'] == 0 for row in results) else 1
    finally:
        if container:
            subprocess.run(['docker', 'rm', container], timeout=30, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # Never retain an extra full image filesystem once the finite tests end.
        if not args.native_root and (out / 'app').exists():
            shutil.rmtree(out / 'app')
        if (fixtures / 'sink-key.pem').exists():
            (fixtures / 'sink-key.pem').unlink()


if __name__ == '__main__':
    raise SystemExit(main())
