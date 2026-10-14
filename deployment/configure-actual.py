"""Interactively configure Actual Budget in .env without exposing credentials."""
import getpass
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import read_env, recreate, update_env  # noqa: E402

if not sys.stdin.isatty():
    raise SystemExit('Run this helper in an interactive terminal; hidden credential input requires one.')
current = read_env()
updates = {}
if not current.get('ACTUAL_SERVER_URL'):
    server = input('Actual backend URL reachable from the container (e.g. http://actual-server:5006): ').strip().rstrip('/')
    parsed = urlsplit(server)
    if parsed.scheme not in ['http', 'https'] or not parsed.hostname or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
        raise SystemExit('Use an HTTP(S) origin without credentials or a path.')
    updates['ACTUAL_SERVER_URL'] = server
sync_id = input('Actual budget Sync ID: ').strip()
if not re.fullmatch(r'[a-zA-Z0-9_-]{1,128}', sync_id):
    raise SystemExit('Invalid Sync ID. Copy it from Settings > Show advanced settings > Sync ID.')
token = getpass.getpass('Actual session token (paste; input is hidden): ').strip()
if not token or len(token) > 4096 or any(c in token for c in '\r\n\0"\''):
    raise SystemExit('Invalid token. Copy just the token value, without surrounding quotes.')
default_currency = current.get('BUDGET_CURRENCY', '')
currency = (input('Budget currency' + (' [' + default_currency + ']' if default_currency else ' (e.g. EUR)') + ': ').strip() or default_currency).upper()
if not re.fullmatch(r'[A-Z]{3}', currency):
    raise SystemExit('Use a three-letter currency code.')
encryption = getpass.getpass('Budget end-to-end encryption password (Enter if not enabled): ')
if any(c in encryption for c in '\r\n\0\''):
    raise SystemExit('This helper cannot encode that password. Configure it manually in .env.')

updates.update({'ACTUAL_SYNC_ID': sync_id, 'ACTUAL_SESSION_TOKEN': "'" + token + "'",
                'ACTUAL_PASSWORD': '', 'ACTUAL_ENCRYPTION_PASSWORD': "'" + encryption + "'" if encryption else '',
                'BUDGET_CURRENCY': currency})
update_env(updates)
print('Actual settings saved privately. No secret values printed. Original .env backed up.')
recreate()
print('Dashboard recreated. Open it to check the Actual connection.')
