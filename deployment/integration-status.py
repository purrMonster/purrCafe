"""Check integration status inside Cafe, printing statuses rather than private data."""
import subprocess

code = """import {config} from './server/config.mjs';
import {connectors} from './server/connectors.mjs';
const sources=connectors(config);
console.log(JSON.stringify({configured:{homeUrl:!!config.ha.url,homeToken:!!config.ha.token,
selectedEntities:config.entities.length,actualUrl:!!config.actual.url,actualSyncId:!!config.actual.syncId,
actualAuthentication:!!(config.actual.sessionToken||config.actual.password),gatusUrl:!!config.gatus.url}}));
try {for(const name of ['home','budget','fleet']) {
const result=await sources[name]();
console.log(JSON.stringify({source:name,status:result.status,message:result.message||null}));
}} finally {await sources.close();}
"""
subprocess.run(['docker', 'exec', '-i', 'purrbrews-cafe-purrbrews-dashboard-1',
                'node', '--input-type=module'], input=code, text=True, check=True)
