"""Diagnose deployment without printing secrets; repair an unused encryption key."""
import argparse
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import tempfile
from datetime import datetime, timezone

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repair-unused-key', action='store_true')
parser.add_argument('--configure-proxy', action='store_true', help='Fill an empty trust setting from Traefik on the proxy network.')
parser.add_argument('--configure-domain-from-fleet', action='store_true', help='Replace example hostnames using the existing percolator domain.')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
os.chdir(root)
compose = ['docker', 'compose', '-p', 'purrbrews-cafe', '-f', 'compose.yaml']
if (root / 'compose.cafe.local.yaml').exists():
    compose += ['-f', 'compose.cafe.local.yaml']

def inspect():
    code = """const fs=require('node:fs'); const p='/app/data/accounts';
const key=process.env.APP_ENCRYPTION_KEY||'';
console.log(JSON.stringify({keyValid:/^[a-f0-9]{64}$/i.test(key),keyEmpty:!key,
savedAccountFiles:fs.existsSync(p)?fs.readdirSync(p).length:0}));"""
    result = subprocess.run(compose + ['run', '--rm', '--no-deps', '--entrypoint', 'node',
                                      'purrbrews-dashboard', '-e', code],
                            capture_output=True, text=True, check=True)
    return json.loads(result.stdout.strip())

info = inspect()
print(json.dumps(info, indent=2))
if args.repair_unused_key and not info['keyValid']:
    if info['savedAccountFiles']:
        raise SystemExit('Refusing to change the key: saved account files exist. Restore the original key.')
    path = root / '.env'
    original = path.read_text()
    matches = list(re.finditer(r'^APP_ENCRYPTION_KEY=.*$', original, re.MULTILINE))
    if len(matches) > 1:
        raise SystemExit('Duplicate encryption-key settings: resolve these manually.')
    key = secrets.token_hex(32)
    updated = re.sub(r'^APP_ENCRYPTION_KEY=.*$', 'APP_ENCRYPTION_KEY=' + key,
                     original, flags=re.MULTILINE) if matches else original.rstrip() + '\nAPP_ENCRYPTION_KEY=' + key + '\n'
    backup = root / ('.env.backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as handle:
        handle.write(original)
    fd, temporary = tempfile.mkstemp(prefix='.env.tmp-', dir=root)
    try:
        with os.fdopen(fd, 'w') as handle:
            handle.write(updated)
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print('Generated a new key on this server. Original .env backed up privately; no secret values printed.')
    info = inspect()
    if not info['keyValid']:
        raise SystemExit('Container still receives an invalid key. Check exported environment overrides.')
    print('Encryption key verified in the container environment.')

if not info['keyValid']:
    raise SystemExit('Key is invalid. Use --repair-unused-key only for a deployment with no saved accounts.')
if args.configure_domain_from_fleet:
    domain = None
    for fleet_path in [Path('/opt/purrbrews/.env'), Path('/opt/purrbrews/stacks/percolator/.env.local')]:
        if fleet_path.exists():
            match = re.search(r'^DOMAIN=(.*)$', fleet_path.read_text(), re.MULTILINE)
            if match:
                domain = match.group(1).strip().strip('\"\'')
    if not domain or not re.fullmatch(r'[a-zA-Z0-9.-]+', domain) or domain.endswith('.example'):
        raise SystemExit('No usable DOMAIN in the existing fleet settings.')
    path = root / '.env'
    original = path.read_text()
    updated = original
    for setting, value in [('DOMAIN', domain), ('PUBLIC_ORIGIN', 'https://cafe.' + domain)]:
        matches = list(re.finditer(r'^' + setting + r'=(.*)$', updated, re.MULTILINE))
        if len(matches) > 1:
            raise SystemExit('Duplicate hostname settings: resolve these manually.')
        existing = matches[0].group(1).strip().strip('\"\'') if matches else ''
        if existing and 'your-domain.example' not in existing:
            print('Preserved existing ' + setting + '.')
            continue
        updated = re.sub(r'^' + setting + r'=.*$', setting + '=' + value, updated,
                         flags=re.MULTILINE) if matches else updated.rstrip() + '\n' + setting + '=' + value + '\n'
    if updated != original:
        backup = root / ('.env.backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
        fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as handle:
            handle.write(original)
        fd, temporary = tempfile.mkstemp(prefix='.env.tmp-', dir=root)
        try:
            with os.fdopen(fd, 'w') as handle:
                handle.write(updated)
            os.chmod(temporary, 0o600)
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        print('Replaced example hostnames using the server-local fleet domain; .env backed up privately.')
if args.configure_proxy:
    path = root / '.env'
    original = path.read_text()
    matches = list(re.finditer(r'^AUTH_TRUSTED_PROXY_CIDRS=(.*)$', original, re.MULTILINE))
    if len(matches) > 1:
        raise SystemExit('Duplicate proxy trust settings: resolve these manually.')
    existing = matches[0].group(1).strip().strip('\"\'') if matches else ''
    if not existing:
        result = subprocess.run(['docker', 'inspect', 'traefik'], capture_output=True, text=True, check=True)
        address = json.loads(result.stdout)[0]['NetworkSettings']['Networks']['proxy']['IPAddress']
        address = str(ipaddress.IPv4Address(address)) + '/32'
        updated = re.sub(r'^AUTH_TRUSTED_PROXY_CIDRS=.*$', 'AUTH_TRUSTED_PROXY_CIDRS=' + address,
                         original, flags=re.MULTILINE) if matches else original.rstrip() + '\nAUTH_TRUSTED_PROXY_CIDRS=' + address + '\n'
        backup = root / ('.env.backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
        fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as handle:
            handle.write(original)
        fd, temporary = tempfile.mkstemp(prefix='.env.tmp-', dir=root)
        try:
            with os.fdopen(fd, 'w') as handle:
                handle.write(updated)
            os.chmod(temporary, 0o600)
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        print('Trusted only the current Traefik proxy IPv4 /32; original .env backed up privately.')
    else:
        print('Preserved the existing proxy trust setting.')
subprocess.run(compose + ['run', '--rm', '--no-deps', '--entrypoint', 'node',
                         'purrbrews-dashboard', '-e',
                         "import('./server/config.mjs').then(()=>console.log('Startup configuration valid.'))"], check=True)
