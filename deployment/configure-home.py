"""Select existing Home Assistant entities privately, with read-only actions."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from urllib.parse import urlsplit

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', required=True)
parser.add_argument('--entities', required=True, help='Comma-separated real entity IDs.')
args = parser.parse_args()
url = args.url.rstrip('/')
parsed = urlsplit(url)
if parsed.scheme not in ['http', 'https'] or not parsed.hostname or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
    raise SystemExit('Use a Home Assistant HTTP(S) origin without credentials or a path.')
ids = [value.strip() for value in args.entities.split(',')]
if not ids or len(ids) > 64 or len(set(ids)) != len(ids) or any(not re.fullmatch(r'[a-z_]+\.[a-z0-9_]+', value) or value.startswith(('zone.', 'person.', 'device_tracker.')) for value in ids):
    raise SystemExit('Use unique non-location entity IDs, up to 64.')
root = Path(__file__).resolve().parent.parent
os.chdir(root)
override_path = root / 'compose.cafe.local.yaml'
override_text = override_path.read_text()
expected = "services:\n  purrbrews-dashboard:\n    labels:\n      traefik.http.routers.purrbrews-dashboard.rule: 'Host(`cafe.${DOMAIN}`)'"
try:
    override = json.loads(override_text)
except json.JSONDecodeError:
    if override_text.strip() != expected:
        raise SystemExit('Custom YAML override detected. Configure its entity-file environment manually to preserve your changes.')
    override = {'services': {'purrbrews-dashboard': {'labels': {'traefik.http.routers.purrbrews-dashboard.rule': 'Host(`cafe.${DOMAIN}`)'}}}}
override['services']['purrbrews-dashboard'].setdefault('environment', {})['HA_ENTITIES_FILE'] = '/app/config/home.local.json'
code = """import {config} from './server/config.mjs';import {json} from './server/connectors.mjs';
try {if(!config.ha.token)throw new Error();const [ids,url]=process.argv.slice(2);
const states=await json(url+'/api/states',{headers:{Authorization:'Bearer '+config.ha.token}});
if(!Array.isArray(states))throw new Error();
const selected=ids.split(',').map(id=>{const state=states.find(s=>s.entity_id===id);if(!state)throw new Error();
return {id,label:String(state.attributes?.friendly_name||id).slice(0,100),area:'Home',wall:true,actions:[]};});
console.log(JSON.stringify(selected));}catch{console.error('Home Assistant authentication failed or a selected entity was not found. No settings changed.');process.exit(1);}"""
result = subprocess.run(['docker', 'exec', '-i', 'purrbrews-cafe-purrbrews-dashboard-1', 'node', '--input-type=module', '-', ','.join(ids), url], input=code, capture_output=True, text=True)
if result.returncode:
    raise SystemExit('Home Assistant authentication failed or a selected entity was not found. No settings changed.')
entities = json.loads(result.stdout)
env_path = root / '.env'
original = env_path.read_text()
matches = list(re.finditer(r'^HA_URL=.*$', original, re.MULTILINE))
if len(matches) > 1:
    raise SystemExit('Duplicate HA_URL settings: resolve these first.')
updated = re.sub(r'^HA_URL=.*$', lambda match: 'HA_URL=' + url, original, flags=re.MULTILINE) if matches else original.rstrip() + '\nHA_URL=' + url + '\n'
excludes = root / '.git/info/exclude'
with excludes.open('a') as handle:
    handle.write('\n/config/home.local.json*\n/compose.cafe.local.yaml*\n')

def save_private(path, text):
    if path.exists():
        backup = path.with_name(path.name + '.backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
        fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as handle:
            handle.write(path.read_text())
    fd, temporary = tempfile.mkstemp(prefix=path.name + '.tmp-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as handle:
            handle.write(text)
        os.chmod(temporary, 0o600 if path.name.startswith('.env') else 0o644)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

save_private(env_path, updated)
save_private(root / 'config/home.local.json', json.dumps(entities, indent=2) + '\n')
save_private(override_path, json.dumps(override, indent=2) + '\n')
compose = ['docker', 'compose', '-p', 'purrbrews-cafe', '-f', 'compose.yaml', '-f', 'compose.cafe.local.yaml']
subprocess.run(compose + ['config', '--quiet'], check=True)
subprocess.run(compose + ['up', '-d', '--force-recreate', 'purrbrews-dashboard'], check=True)
print('Selected ' + str(len(entities)) + ' existing entities read-only. Private configuration backed up; credentials preserved.')
