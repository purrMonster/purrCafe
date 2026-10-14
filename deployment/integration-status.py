"""Check integration status inside the dashboard, printing statuses rather than private data."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import node_in_container  # noqa: E402

code = """import {config} from './server/config.mjs';
import {connectors} from './server/connectors.mjs';
const sources=connectors(config);
console.log(JSON.stringify({configured:{homeUrl:!!config.ha.url,homeToken:!!config.ha.token,
selectedEntities:config.entities.length,actualUrl:!!config.actual.url,actualSyncId:!!config.actual.syncId,
actualAuthentication:!!(config.actual.sessionToken||config.actual.password),mailServer:!!config.mail.host,
gatusUrl:!!config.gatus.url,fleetNodes:config.fleetNodes.length}}));
try {for(const name of ['home','budget','fleet']) {
const result=await sources[name]();
console.log(JSON.stringify({source:name,status:result.status,message:result.message||null}));
}} finally {await sources.close();}
"""
node_in_container(code, check=True)
