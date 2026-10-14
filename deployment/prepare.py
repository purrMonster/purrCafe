"""Diagnose a deployment without printing secrets, and fill first-run settings.

Every value that names your infrastructure is passed on the command line or
read from .env on the server; nothing environment-specific lives in this file.
"""
import argparse
import ipaddress
import json
from pathlib import Path
import re
import secrets
import subprocess
import sys
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import SERVICE, compose, read_env, update_env  # noqa: E402

HOSTNAME = re.compile(r'^(?=.{1,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$', re.I)
parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
parser.add_argument('--repair-unused-key', action='store_true', help='Generate APP_ENCRYPTION_KEY, only if no mailbox is saved yet.')
parser.add_argument('--configure-proxy', metavar='CONTAINER', nargs='?', const='traefik',
                    help='Fill an empty AUTH_TRUSTED_PROXY_CIDRS from this proxy container (default: traefik) on PROXY_NETWORK.')
parser.add_argument('--hostname', help='Set PUBLIC_HOSTNAME, e.g. dashboard.example.com.')
parser.add_argument('--domain', help='Set DOMAIN for service shortcuts, e.g. example.com.')
parser.add_argument('--actual-backend-url', help='Replace only the Actual backend URL, preserving credentials.')
args = parser.parse_args()


def inspect():
    code = """const fs=require('node:fs'); const p='/app/data/accounts';
const key=process.env.APP_ENCRYPTION_KEY||'';
console.log(JSON.stringify({keyValid:/^[a-f0-9]{64}$/i.test(key),keyEmpty:!key,
savedAccountFiles:fs.existsSync(p)?fs.readdirSync(p).length:0}));"""
    result = compose('run', '--rm', '--no-deps', '--entrypoint', 'node', SERVICE, '-e', code,
                     capture_output=True, text=True, check=True)
    return json.loads(result.stdout.strip().splitlines()[-1])


for name, value in [('--hostname', args.hostname), ('--domain', args.domain)]:
    if value and not HOSTNAME.fullmatch(value):
        raise SystemExit(name + ' must be a bare hostname without scheme or path.')
settings = {}
if args.hostname:
    settings['PUBLIC_HOSTNAME'] = args.hostname
if args.domain:
    settings['DOMAIN'] = args.domain
if args.actual_backend_url:
    value = args.actual_backend_url.rstrip('/')
    parsed = urlsplit(value)
    if parsed.scheme not in ['http', 'https'] or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path:
        raise SystemExit('Use a backend HTTP(S) origin without credentials or a path.')
    settings['ACTUAL_SERVER_URL'] = value
if settings and update_env(settings):
    print('Updated ' + ', '.join(settings) + '; .env backed up privately.')

if args.configure_proxy:
    env = read_env()
    if env.get('AUTH_TRUSTED_PROXY_CIDRS'):
        print('Preserved the existing proxy trust setting.')
    else:
        network = env.get('PROXY_NETWORK') or 'proxy'
        result = subprocess.run(['docker', 'inspect', args.configure_proxy], capture_output=True, text=True, check=True)
        networks = json.loads(result.stdout)[0]['NetworkSettings']['Networks']
        if network not in networks:
            raise SystemExit('Container ' + args.configure_proxy + ' is not attached to network ' + network + '.')
        address = str(ipaddress.IPv4Address(networks[network]['IPAddress'])) + '/32'
        update_env({'AUTH_TRUSTED_PROXY_CIDRS': address})
        print('Trusted only the current proxy IPv4 /32; original .env backed up privately.')

info = inspect()
print(json.dumps(info, indent=2))
if args.repair_unused_key and not info['keyValid']:
    if info['savedAccountFiles']:
        raise SystemExit('Refusing to change the key: saved account files exist. Restore the original key.')
    update_env({'APP_ENCRYPTION_KEY': secrets.token_hex(32)})
    print('Generated a new key on this server. Original .env backed up privately; no secret values printed.')
    info = inspect()
    if not info['keyValid']:
        raise SystemExit('Container still receives an invalid key. Check exported environment overrides.')
    print('Encryption key verified in the container environment.')
if not info['keyValid']:
    raise SystemExit('Key is invalid. Use --repair-unused-key only for a deployment with no saved accounts.')
compose('run', '--rm', '--no-deps', '--entrypoint', 'node', SERVICE, '-e',
        "import('./server/config.mjs').then(()=>console.log('Startup configuration valid.'))", check=True)
