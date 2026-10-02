import test from 'node:test';
import assert from 'node:assert/strict';
import { identity, control, mutation, personal, seal, unseal } from './security.mjs';
import { normalizeBudget, projectWall, ready, cached, Accounts } from './data.mjs';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const groups={admin:'admins',household:'household',wall:'wall'};
test('identity requires an authorized account; wall is distinct from household',()=> {
  assert.throws(()=>identity({},groups));assert.throws(()=>identity({'remote-user':'sam','remote-groups':'unknown'},groups));
  const wall=identity({'remote-user':'display','remote-groups':'wall'},groups);assert.equal(wall.wallOnly,true);assert.throws(()=>personal(wall));
  assert.equal(identity({'remote-user':'sam','remote-groups':'household,wall'},groups).wallOnly,false);
});
test('mutation rejects cross-origin, missing intent and non-JSON requests',()=> {
  const headers={origin:'https://home.example','x-purrbrews-intent':'dashboard','content-type':'application/json'};
  assert.doesNotThrow(()=>mutation(headers,headers.origin));
  for(const altered of [{...headers,origin:'https://evil.example'},{...headers,'x-purrbrews-intent':undefined},{...headers,'content-type':'text/plain'}]) assert.throws(()=>mutation(altered,headers.origin));
});
test('controls enforce entity, action, domain and wall permissions',()=> {
  const entities=[{id:'light.room',actions:['turn_on'],wall:true,wallControl:false},{id:'lock.front',actions:['turn_on'],wall:true,wallControl:true}];
  assert.equal(control(entities,{id:'light.room',action:'turn_on'},false).domain,'light');
  assert.throws(()=>control(entities,{id:'light.room',action:'turn_off'},false));
  assert.throws(()=>control(entities,{id:'light.room',action:'turn_on'},true));
  assert.throws(()=>control(entities,{id:'lock.front',action:'turn_on'},false));
  assert.throws(()=>control(entities,{id:'light.other',action:'turn_on'},false));
});
test('AES-GCM detects tampering and uses unique nonces',()=> {
  const key='ab'.repeat(32),value={address:'a@example.invalid',password:'private-password'};
  const first=seal(value,key),second=seal(value,key);assert.notEqual(first.iv,second.iv);assert.deepEqual(unseal(first,key),value);
  assert.throws(()=>unseal({...first,tag:'00'.repeat(16)},key));assert.throws(()=>unseal(first,'cd'.repeat(32)));
});
test('stored mailboxes are encrypted, isolated by user, and deletable',async()=> {
  const dir=await mkdtemp(join(tmpdir(),'purrbrews-accounts-'));const accounts=new Accounts(dir,'ab'.repeat(32));
  try {await accounts.set('alice',{password:'secret'});assert.equal(await accounts.get('bob'),null);assert.deepEqual(await accounts.get('alice'),{password:'secret'});const [file]=await readdir(join(dir,'accounts'));assert.ok(!(await readFile(join(dir,'accounts',file),'utf8')).includes('secret'));await accounts.set('alice',null);assert.equal(await accounts.get('alice'),null);}finally {await rm(dir,{recursive:true,force:true});}
});
test('Actual amounts retain carryover and exclude income',()=> {
  const result=normalizeBudget({month:'2026-10',categoryGroups:[{is_income:true,categories:[{budgeted:999,spent:999,balance:999}]},{is_income:false,categories:[{id:'a',name:'Food',budgeted:10000,spent:-3000,balance:12000}]}]},'INR');
  assert.equal(result.assigned,10000);assert.equal(result.activity,3000);assert.equal(result.available,12000);
  assert.throws(()=>normalizeBudget({categoryGroups:[{categories:[{budgeted:NaN}]}]},'INR'));
});
test('wall projection removes categories, shortcuts and non-wall entities',()=> {
  const result=projectWall({home:ready([{id:'light.room',wall:true,wallControl:false,actions:['turn_on']},{id:'sensor.private',wall:false,actions:[]}]),budget:ready({month:'2026-10',currency:'INR',assigned:10,activity:5,available:5,categories:[{name:'Private'}]}),services:[{name:'Admin'}],user:{username:'alice'}});
  assert.equal(result.budget.data.categories,undefined);assert.equal(result.home.data.length,1);assert.deepEqual(result.home.data[0].actions,[]);assert.deepEqual(result.services,[]);assert.equal(result.user.username,undefined);
});
test('connector cache deduplicates concurrent requests',async()=> {
  let calls=0;const get=cached(10,async()=>{calls++;return ready('value');});await Promise.all([get(),get(),get()]);assert.equal(calls,1);get.clear();await get();assert.equal(calls,2);
});
