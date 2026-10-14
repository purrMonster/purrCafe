import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const base={NODE_ENV:'production',APP_ENCRYPTION_KEY:'ab'.repeat(32),AUTH_TRUSTED_PROXY_CIDRS:'127.0.0.1/32',HA_ENTITIES_FILE:'/nonexistent/home.json',SERVICES_FILE:'/nonexistent/services.json',PATH:process.env.PATH};
function load(env) {
  const result=spawnSync(process.execPath,['--input-type=module','-e',"const {config}=await import('./server/config.mjs');console.log(JSON.stringify({origin:config.origin,timezone:config.timezone,locale:config.locale,entities:config.entities,services:config.services,mail:config.mail,fleetNodes:config.fleetNodes}))"],{cwd:root,env:{...base,...env},encoding:'utf8'});
  return result.status===0?{ok:true,value:JSON.parse(result.stdout)}:{ok:false,error:result.stderr};
}
test('PUBLIC_HOSTNAME derives the origin; neutral defaults; missing config files are empty',()=> {
  const {ok,value}=load({PUBLIC_HOSTNAME:'cafe.example.test'});
  assert.equal(ok,true);assert.equal(value.origin,'https://cafe.example.test');assert.equal(value.timezone,'UTC');assert.equal(value.locale,'en');
  assert.deepEqual(value.entities,[]);assert.deepEqual(value.services,[]);assert.equal(value.mail.host,'');assert.deepEqual(value.fleetNodes,[]);
});
test('conflicting or malformed address settings are rejected',()=> {
  assert.equal(load({PUBLIC_HOSTNAME:'a.example.test',PUBLIC_ORIGIN:'https://b.example.test'}).ok,false);
  assert.equal(load({PUBLIC_HOSTNAME:'https://a.example.test'}).ok,false);
  assert.equal(load({}).ok,false);
  assert.equal(load({PUBLIC_HOSTNAME:'a.example.test',MAIL_IMAP_HOST:'imap.example.test/x'}).ok,false);
});
test('Actual requires an explicit currency; fleet and mail come from settings',()=> {
  assert.equal(load({PUBLIC_HOSTNAME:'a.example.test',ACTUAL_SERVER_URL:'http://budget.internal:5006'}).ok,false);
  const {value}=load({PUBLIC_HOSTNAME:'a.example.test',ACTUAL_SERVER_URL:'http://budget.internal:5006',BUDGET_CURRENCY:'eur',FLEET_NODES:'alpha, beta',MAIL_IMAP_HOST:'imap.example.test',LOCALE:'en-GB'});
  assert.deepEqual(value.fleetNodes,['alpha','beta']);assert.equal(value.mail.host,'imap.example.test');assert.equal(value.mail.port,993);assert.equal(value.locale,'en-GB');
});
