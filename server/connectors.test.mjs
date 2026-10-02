import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { Readable } from 'node:stream';
import http from 'node:http';
import { withMailbox, mailList, mailMessage, json } from './connectors.mjs';
import { normalizeFleet, cached, ready, normalizeBudget } from './data.mjs';
class FakeMail extends EventEmitter {
  mailbox={uidValidity:10n,exists:1}; closed=false; released=false; raw=Buffer.from('From: Friend <friend@example.invalid>\r\nSubject: A small note\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nHello household.');
  async connect() {}
  async getMailboxLock(name,options) {assert.equal(name,'INBOX');assert.equal(options.readOnly,true);return {release:()=>{this.released=true;}};}
  close() {this.closed=true;this.emit('close');}
  async search() {return [1];}
  async *fetch() {yield {uid:1,flags:new Set(),envelope:{from:[{name:'Friend'}],subject:'Note',date:new Date('invalid')}};}
  async fetchOne() {return {size:this.raw.length};}
  async download(uid,part,options) {assert.equal(uid,'1');assert.equal(part,undefined);assert.deepEqual(options,{uid:true,maxBytes:1_000_001});return {content:Readable.from([this.raw])};}
}
const account={address:'test@example.invalid',password:'fixture'};
function options(client,timeoutMs=1000) {return {timeoutMs,createClient:settings=>{assert.equal(settings.host,'imap.purelymail.com');assert.equal(settings.secure,true);assert.equal(settings.port,993);assert.equal(settings.logger,false);return client;}};}
test('mail uses TLS and a read-only mailbox, and handles malformed dates',async()=> {
  const client=new FakeMail(),result=await mailList(account,options(client));assert.equal(result.data.unread,1);assert.equal(result.data.messages[0].receivedAt,null);assert.equal(client.released,true);assert.equal(client.closed,true);
});
test('mail stream and errors clean up without an unhandled event',async()=> {
  const client=new FakeMail();await assert.rejects(withMailbox(account,async()=>{queueMicrotask(()=>client.emit('error',new Error('socket fixture')));return new Promise(()=>{});},options(client)),/interrupted/);assert.equal(client.closed,true);
});
test('mail operation has an overall deadline even while data keeps arriving',async()=> {
  const client=new FakeMail();await assert.rejects(withMailbox(account,async()=>new Promise(()=>{}),options(client,15)),/timed out/);assert.equal(client.closed,true);
});
test('message download is bounded and UID validity is enforced',async()=> {
  let client=new FakeMail();const message=await mailMessage(account,'10.1',options(client));assert.equal(message.subject,'A small note');assert.match(message.text,/Hello household/);
  client=new FakeMail();await assert.rejects(mailMessage(account,'11.1',options(client)),error=>error.status===409);
  client=new FakeMail();client.raw=Buffer.alloc(1_000_001);await assert.rejects(mailMessage(account,'10.1',options(client)),error=>error.status===413);
  await assert.rejects(mailMessage(account,'0.0'),error=>error.status===400);
});
test('stream limit catches a source that grows after the size check',async()=> {
  const client=new FakeMail();client.raw=Buffer.alloc(1_000_001);client.fetchOne=async()=>({size:20});await assert.rejects(mailMessage(account,'10.1',options(client)),error=>error.status===413);assert.equal(client.closed,true);
});
test('Gatus handles ordering, malformed timestamps, stale and future readings',()=> {
  const now=Date.now(),at=offset=>new Date(now+offset).toISOString();
  const data=[{name:'Percolator',key:'fleet_apps',results:[{timestamp:'invalid',success:true},{timestamp:at(-40000),success:false},{timestamp:at(-10000),success:true}]},{name:'cellar',results:[{timestamp:at(-400000),success:true}]},{name:'sieve',results:[{timestamp:at(90000),success:true}]}];
  const states=normalizeFleet(data,{percolator:'fleet_apps'},now);assert.equal(states.find(x=>x.name==='percolator').state,'up');assert.equal(states.find(x=>x.name==='cellar').state,'unknown');assert.equal(states.find(x=>x.name==='sieve').state,'unknown');assert.equal(states.find(x=>x.name==='grinder').state,'unknown');
});
test('invalidation during a read triggers a fresh read for the next caller',async()=> {
  let release,calls=0;const first=new Promise(resolve=>release=resolve);const get=cached(10,async()=>{calls++;return calls===1?first:ready('new state');});const old=get();await Promise.resolve();get.clear();const fresh=get();release(ready('old state'));assert.equal((await old).data,'old state');assert.equal((await fresh).data,'new state');assert.equal(calls,2);
});
test('Actual rejects null or overflowing financial amounts',()=> {
  const raw=categories=>({month:'2026-10',categoryGroups:[{categories}]});assert.throws(()=>normalizeBudget(raw([{name:'Invalid',budgeted:null,spent:0,balance:0}]),'INR'));
  assert.throws(()=>normalizeBudget(raw([1,2].map(id=>({id,name:'Large',budgeted:Number.MAX_SAFE_INTEGER,spent:0,balance:0}))),'INR'));
});
test('upstream responses reject redirects and oversized bodies',async()=> {
  const server=http.createServer((request,response)=>{if(request.url==='/redirect'){response.writeHead(302,{Location:'/large'});response.end();}else response.end(Buffer.alloc(5_000_001));});server.listen(0,'127.0.0.1');await once(server,'listening');
  try {const base=`http://127.0.0.1:${server.address().port}`;await assert.rejects(json(`${base}/redirect`));await assert.rejects(json(`${base}/large`),/too large/);}finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
