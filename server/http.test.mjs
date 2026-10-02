import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import http from 'node:http';
async function unusedPort() {const server=http.createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function launch(trusted,homeFile,dir,haUrl) {
  const port=await unusedPort();
  const child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:String(port),PUBLIC_ORIGIN:'https://dashboard.example',APP_ENCRYPTION_KEY:'ab'.repeat(32),AUTH_TRUSTED_PROXY_CIDRS:trusted,HA_ENTITIES_FILE:homeFile,DATA_DIR:dir,HA_URL:haUrl,HA_TOKEN:'fixture-token',ACTUAL_SERVER_URL:'',ACTUAL_SYNC_ID:'',ACTUAL_PASSWORD:'',ACTUAL_SESSION_TOKEN:'',GATUS_URL:'',DOMAIN:''},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timed out')),10000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('exit',()=>{clearTimeout(timer);reject(new Error('Server exited during startup'));});});
  return {child,url:`http://127.0.0.1:${port}`};
}
test('HTTP routes enforce proxy trust, wall privacy, CSRF and real control allowlists',async()=> {
  const dir=await mkdtemp(join(tmpdir(),'purrbrews-http-')),homeFile=join(dir,'home.json');
  let commands=0;
  const upstream=http.createServer((request,response)=>{response.setHeader('Content-Type','application/json');if(request.url==='/api/states') response.end(JSON.stringify([{entity_id:'light.room',state:'on',attributes:{secret:'not-exposed'},last_updated:new Date().toISOString()}]));else {commands++;response.end('[]');}});
  upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
  await writeFile(homeFile,JSON.stringify([{id:'light.room',label:'Room',actions:['turn_on','turn_off'],wall:true,wallControl:false}]));
  let live,untrusted;
  const household={'Remote-User':'alice','Remote-Groups':'purrbrews_household'};
  const wall={'Remote-User':'display','Remote-Groups':'purrbrews_wall_display'};
  try {
    const haUrl=`http://127.0.0.1:${upstream.address().port}`;
    live=await launch('127.0.0.1/32',homeFile,dir,haUrl);
    assert.equal((await fetch(`${live.url}/api/session`)).status,401);
    const overview=await (await fetch(`${live.url}/api/overview`,{headers:household})).json();
    assert.equal(overview.home.data[0].state,'on');assert.equal(overview.home.data[0].attributes,undefined);
    const display=await (await fetch(`${live.url}/api/overview`,{headers:wall})).json();assert.deepEqual(display.services,[]);assert.deepEqual(display.home.data[0].actions,[]);
    for(const path of ['/inbox','/settings','/api/mail','/api/mail/account']) assert.equal((await fetch(`${live.url}${path}`,{headers:wall})).status,403);
    const commandHeaders={...household,Origin:'https://dashboard.example','Content-Type':'application/json','X-Purrbrews-Intent':'dashboard'};
    assert.equal((await fetch(`${live.url}/api/home/control`,{method:'POST',headers:{...commandHeaders,Origin:'https://other.example'},body:JSON.stringify({id:'light.room',action:'turn_off'})})).status,403);
    assert.equal((await fetch(`${live.url}/api/home/control`,{method:'POST',headers:commandHeaders,body:JSON.stringify({id:'light.other',action:'turn_off'})})).status,403);
    assert.equal((await fetch(`${live.url}/api/home/control`,{method:'POST',headers:commandHeaders,body:JSON.stringify({id:'light.room',action:'turn_off'})})).status,200);assert.equal(commands,1);
    assert.equal((await fetch(`${live.url}/.env`,{headers:household})).status,404);
    untrusted=await launch('192.0.2.1/32',homeFile,dir,haUrl);
    assert.equal((await fetch(`${untrusted.url}/api/session`,{headers:household})).status,401);assert.equal((await fetch(`${untrusted.url}/healthz`)).status,200);
  } finally {
    const children=[live?.child,untrusted?.child].filter(Boolean);const exits=children.map(child=>once(child,'exit'));children.forEach(child=>child.kill());await Promise.all(exits);await new Promise(resolve=>upstream.close(resolve));await rm(dir,{recursive:true,force:true});
  }
});
