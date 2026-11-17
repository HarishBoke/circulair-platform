#!/usr/bin/env python3
"""Download public official assets using already-reviewed checksum evidence; no pin changes.
Usage: python3 infra/monitoring/tools/download_test_binaries.py /tmp/monitoring-bin
Never calls Render or uploads files. Requires requests.
"""
import hashlib
import io
import json
from pathlib import Path
import sys
import tarfile
import requests

root = Path(__file__).resolve().parents[1]
if len(sys.argv) != 2:
    raise SystemExit('Specify a binary output directory outside the repository')
out = Path(sys.argv[1]).resolve()
repo = root.parents[1]
if out == repo or repo in out.parents:
    raise SystemExit('Binaries must remain outside the public repository')
out.mkdir(parents=True, exist_ok=True)
for asset in json.loads((root/'evidence/binary-checksums.json').read_text()):
    url = asset['source']
    if not url.startswith('https://github.com/') or '/releases/download/' not in url:
        raise SystemExit('Non-release source rejected')
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    data = response.content
    if 'sha256:' + hashlib.sha256(data).hexdigest() != asset['sha256']:
        raise SystemExit('Binary checksum mismatch')
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        for member in archive.getmembers():
            name = Path(member.name).name
            if member.isfile() and name in ['caddy','amtool','alertmanager','ntfy']:
                destination = out / name
                destination.write_bytes(archive.extractfile(member).read())
                destination.chmod(0o700)
    print(asset['name'] + ': reviewed official checksum matched', flush=True)
