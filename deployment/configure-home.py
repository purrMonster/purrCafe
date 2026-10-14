"""Select existing Home Assistant entities (read-only) into config/home.json."""
import argparse
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, node_in_container, recreate, update_env, write_private  # noqa: E402

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', help='Home Assistant origin reachable from the container; keeps the current HA_URL if omitted.')
parser.add_argument('--entities', required=True, help='Comma-separated real entity IDs.')
args = parser.parse_args()
if args.url:
    url = args.url.rstrip('/')
    parsed = urlsplit(url)
    if parsed.scheme not in ['http', 'https'] or not parsed.hostname or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
        raise SystemExit('Use a Home Assistant HTTP(S) origin without credentials or a path.')
ids = [value.strip() for value in args.entities.split(',')]
if not ids or len(ids) > 64 or len(set(ids)) != len(ids) or any(not re.fullmatch(r'[a-z_]+\.[a-z0-9_]+', value) or value.startswith(('zone.', 'person.', 'device_tracker.')) for value in ids):
    raise SystemExit('Use unique non-location entity IDs, up to 64.')

code = """import {config} from './server/config.mjs';import {json} from './server/connectors.mjs';
try {const [ids,given]=process.argv.slice(2);const url=given||config.ha.url;if(!config.ha.token||!url)throw new Error();
const states=await json(url+'/api/states',{headers:{Authorization:'Bearer '+config.ha.token}});
if(!Array.isArray(states))throw new Error();
const selected=ids.split(',').map(id=>{const state=states.find(s=>s.entity_id===id);if(!state)throw new Error();
return {id,label:String(state.attributes?.friendly_name||id).slice(0,100),area:'Home',wall:true,actions:[]};});
console.log(JSON.stringify(selected));}catch{process.exit(1);}"""
result = node_in_container(code, ','.join(ids), args.url.rstrip('/') if args.url else '', capture_output=True)
if result.returncode:
    raise SystemExit('Home Assistant authentication failed or a selected entity was not found. No settings changed.')
entities = json.loads(result.stdout)
if args.url:
    update_env({'HA_URL': args.url.rstrip('/')})
write_private(ROOT / 'config/home.json', json.dumps(entities, indent=2) + '\n', mode=0o644)
recreate()
print('Selected ' + str(len(entities)) + ' existing entities read-only into config/home.json (ignored by Git). Add actions by hand after review.')
