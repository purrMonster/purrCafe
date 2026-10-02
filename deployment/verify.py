"""Read-only checks of the deployed Cafe container and HTTPS entry point."""
import json
import subprocess
import time
import urllib.error
import urllib.request

name = 'purrbrews-cafe-purrbrews-dashboard-1'
deadline = time.monotonic() + 45
while True:
    result = subprocess.run(['docker', 'inspect', name], capture_output=True, text=True, check=True)
    container = json.loads(result.stdout)[0]
    if container['State'].get('Health', {}).get('Status') == 'healthy':
        break
    if time.monotonic() >= deadline:
        raise SystemExit('Container did not become healthy within 45 seconds. Inspect its logs.')
    time.sleep(1)
environment = dict(item.split('=', 1) for item in container['Config']['Env'] if '=' in item)
print('Container health:', container['State'].get('Health', {}).get('Status', 'unknown'))
print('Restart count:', container['RestartCount'])
code = """Promise.all(['/healthz','/api/session'].map(async p=>{
const r=await fetch('http://127.0.0.1:4174'+p,{redirect:'manual'});
console.log(p+': HTTP '+r.status); if(r.status!==(p==='/healthz'?200:401))process.exitCode=1;
})).catch(()=>{console.error('Internal HTTP check failed');process.exitCode=1});"""
subprocess.run(['docker', 'exec', name, 'node', '-e', code], check=True)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

origin = environment['PUBLIC_ORIGIN']
opener = urllib.request.build_opener(NoRedirect)
for route in ['/', '/api/session']:
    try:
        response = opener.open(origin + route, timeout=15)
        status = response.status
        response.close()
    except urllib.error.HTTPError as error:
        status = error.code
        error.close()
    except (urllib.error.URLError, TimeoutError) as error:
        print('HTTPS ' + route + ': unreachable or TLS/DNS validation failed:', str(error))
        raise SystemExit(1)
    print('HTTPS ' + route + ': HTTP ' + str(status))
    if status not in [301, 302, 303, 307, 308, 401, 403]:
        raise SystemExit('Expected Authelia redirect or access denial for an unauthenticated HTTPS request.')
print('HTTPS responds without bypassing TLS verification; authenticated browser checks remain required.')
