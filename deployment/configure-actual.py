"""Interactively configure Actual on percolator without exposing credentials."""
import getpass
import os
from pathlib import Path
import re
import subprocess
import tempfile
from datetime import datetime, timezone

root = Path(__file__).resolve().parent.parent
path = root / '.env'
original = path.read_text()
sync_id = input('Actual budget Sync ID: ').strip()
if not re.fullmatch(r'[a-zA-Z0-9_-]{1,128}', sync_id):
    raise SystemExit('Invalid Sync ID. Copy it from Settings > Show advanced settings > Sync ID.')
token = getpass.getpass('Actual session token (paste; input is hidden): ').strip()
if not token or len(token) > 4096 or any(c in token for c in '\r\n\0\"\''):
    raise SystemExit('Invalid token. Copy just the token value, without surrounding quotes.')
currency = input('Budget currency [INR]: ').strip().upper() or 'INR'
if not re.fullmatch(r'[A-Z]{3}', currency):
    raise SystemExit('Use a three-letter currency code.')
encryption = getpass.getpass('Budget end-to-end encryption password (Enter if not enabled): ')
if any(c in encryption for c in '\r\n\0\''):
    raise SystemExit('This helper cannot encode that password. Configure it manually in .env.')

updates = {'ACTUAL_SYNC_ID': sync_id, 'ACTUAL_SESSION_TOKEN': "'" + token + "'",
           'ACTUAL_PASSWORD': '', 'ACTUAL_ENCRYPTION_PASSWORD': "'" + encryption + "'" if encryption else '',
           'BUDGET_CURRENCY': currency}
server = re.search(r'^ACTUAL_SERVER_URL=(.*)$', original, re.MULTILINE)
if not server or not server.group(1).strip().strip('\"\''):
    updates['ACTUAL_SERVER_URL'] = 'http://actualbudget:5006'
updated = original
for setting, value in updates.items():
    matches = list(re.finditer(r'^' + setting + r'=.*$', updated, re.MULTILINE))
    if len(matches) > 1:
        raise SystemExit('Duplicate setting: ' + setting + '. Resolve it in .env first.')
    updated = re.sub(r'^' + setting + r'=.*$', lambda match: setting + '=' + value,
                     updated, flags=re.MULTILINE) if matches else updated.rstrip() + '\n' + setting + '=' + value + '\n'
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
print('Actual settings saved privately. No secret values printed. Original .env backed up.')
os.chdir(root)
compose = ['docker', 'compose', '-p', 'purrbrews-cafe', '-f', 'compose.yaml']
if (root / 'compose.cafe.local.yaml').exists():
    compose += ['-f', 'compose.cafe.local.yaml']
subprocess.run(compose + ['up', '-d', '--force-recreate', 'purrbrews-dashboard'], check=True)
print('Cafe recreated. Open the dashboard to check the Actual connection.')
