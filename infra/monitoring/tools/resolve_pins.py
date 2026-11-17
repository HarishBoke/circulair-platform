#!/usr/bin/env python3
"""Read-only public registry/release downloads. No Render API; no source upload.
Writes public metadata into evidence and pins; binaries remain outside the repo.
Requires requests. Re-run only during an explicitly reviewed version update.
"""
import argparse
import hashlib
import json
from pathlib import Path
import tarfile
import requests

ROOT = Path(__file__).resolve().parents[1]
IMAGES = [('kuma', 'louislam/uptime-kuma', '2.5.12'),
          ('ntfy', 'binwiederhier/ntfy', 'v2.38.1'),
          ('alertmanager', 'prom/alertmanager', 'v0.35.0'),
          ('caddy', 'library/caddy', '2.11.9')]
ACCEPT = ', '.join(['application/vnd.oci.image.index.v1+json',
                   'application/vnd.docker.distribution.manifest.list.v2+json',
                   'application/vnd.oci.image.manifest.v1+json',
                   'application/vnd.docker.distribution.manifest.v2+json'])

def get(url, **kwargs):
    r = requests.get(url, timeout=120, **kwargs)
    r.raise_for_status()
    return r

def resolve():
    pins = {'schema_version': 1, 'platform': 'linux/amd64', 'images': {}}
    for name, repo, tag in IMAGES:
        token = get('https://auth.docker.io/token', params={
            'service': 'registry.docker.io', 'scope': f'repository:{repo}:pull'}).json()['token']
        headers = {'Authorization': 'Bearer ' + token, 'Accept': ACCEPT}
        base = f'https://registry-1.docker.io/v2/{repo}'
        r = get(f'{base}/manifests/{tag}', headers=headers)
        tag_digest = 'sha256:' + hashlib.sha256(r.content).hexdigest()
        if r.headers.get('Docker-Content-Digest') != tag_digest:
            raise ValueError('registry digest header mismatch')
        manifest = r.json()
        digest = tag_digest
        if 'manifests' in manifest:
            matches = [m for m in manifest['manifests'] if m.get('platform', {}).get('os') == 'linux'
                       and m.get('platform', {}).get('architecture') == 'amd64']
            if len(matches) != 1:
                raise ValueError(f'{name}: expected exactly one amd64 manifest')
            digest = matches[0]['digest']
            r = get(f'{base}/manifests/{digest}', headers=headers)
            if 'sha256:' + hashlib.sha256(r.content).hexdigest() != digest:
                raise ValueError('platform manifest mismatch')
            manifest = r.json()
        cfg = get(f"{base}/blobs/{manifest['config']['digest']}", headers=headers)
        if 'sha256:' + hashlib.sha256(cfg.content).hexdigest() != manifest['config']['digest']:
            raise ValueError('image configuration mismatch')
        config = cfg.json()
        if (config.get('os'), config.get('architecture')) != ('linux', 'amd64'):
            raise ValueError('wrong architecture')
        pins['images'][name] = {'repository': 'docker.io/' + repo, 'tag': tag,
            'tag_digest': tag_digest, 'amd64_digest': digest,
            'reference': f'docker.io/{repo}:{tag}@{digest}',
            'config_digest': manifest['config']['digest'],
            'runtime': {k: config['config'].get(k) for k in ['User', 'Entrypoint', 'Cmd', 'WorkingDir']},
            'verified_at': r.headers.get('Date'),
            'source': f'https://registry-1.docker.io/v2/{repo}/manifests/{tag}'}
        print(name + ': exact tag exists; linux/amd64 digest verified', flush=True)
    (ROOT / 'image-pins.json').write_text(json.dumps(pins, indent=2) + '\n')

def binaries(dest):
    dest.mkdir(parents=True, exist_ok=True)
    releases = [('caddy', 'caddyserver/caddy', 'v2.11.9', 'caddy_2.11.9_linux_amd64.tar.gz'),
                ('alertmanager', 'prometheus/alertmanager', 'v0.35.0', 'alertmanager-0.35.0.linux-amd64.tar.gz'),
                ('ntfy', 'binwiederhier/ntfy', 'v2.38.1', 'ntfy_2.38.1_linux_amd64.tar.gz')]
    checks = []
    for name, repo, tag, filename in releases:
        release = get(f'https://api.github.com/repos/{repo}/releases/tags/{tag}').json()
        assets = release['assets']
        asset = next(a for a in assets if a['name'] == filename)
        data = get(asset['browser_download_url']).content
        actual = 'sha256:' + hashlib.sha256(data).hexdigest()
        expected = asset.get('digest')
        if expected is None:
            checksum_asset = next(a for a in assets if 'checksums' in a['name'].lower() or a['name'] == 'sha256sums.txt')
            line = next(l for l in get(checksum_asset['browser_download_url']).text.splitlines() if l.split()[-1].lstrip('*') == filename)
            expected = 'sha256:' + line.split()[0]
        if actual != expected:
            raise ValueError(f'{name}: release checksum mismatch')
        archive = dest / filename
        archive.write_bytes(data)
        with tarfile.open(archive) as t:
            for member in t.getmembers():
                if member.isfile() and Path(member.name).name in ['caddy', 'amtool', 'alertmanager', 'ntfy']:
                    target = dest / Path(member.name).name
                    target.write_bytes(t.extractfile(member).read())
                    target.chmod(0o700)
        checks.append({'name': name, 'tag': tag, 'asset': filename,
                       'sha256': actual, 'source': asset['browser_download_url'],
                       'verification': 'official release asset digest/checksum matched'})
        print(name + ': matching official amd64 binary checksum verified', flush=True)
    (ROOT / 'evidence' / 'binary-checksums.json').write_text(json.dumps(checks, indent=2) + '\n')

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--binaries', type=Path)
    args = p.parse_args()
    resolve()
    if args.binaries:
        binaries(args.binaries)
