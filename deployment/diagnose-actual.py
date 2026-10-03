"""Read a disposable Actual cache; report only failure stage and safe error code."""
import subprocess

code = r"""import {config} from './server/config.mjs';
import {Worker} from 'node:worker_threads';
import {mkdtemp,rm,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
if(!config.actual.url || !config.actual.syncId || !config.actual.sessionToken){
console.log(JSON.stringify({status:'not_configured'}));process.exit(1);}
try {await access(config.dataDir,constants.W_OK);console.log('Data directory writable: true');}
catch {console.log('Data directory writable: false');}
const dir=await mkdtemp(join(tmpdir(),'cafe-actual-diagnose-'));
const workerCode=`const {parentPort,workerData}=require('node:worker_threads');
(async()=>{let api,stage='authenticate';try{
api=await import('@actual-app/api');
const a=workerData.actual;
await api.init({dataDir:workerData.dir,serverURL:a.url,sessionToken:a.sessionToken});
stage='download';await api.downloadBudget(a.syncId,a.encryptionPassword?{password:a.encryptionPassword}:undefined);
stage='sync';await api.sync();
stage='read-month';const parts=new Intl.DateTimeFormat('en',{timeZone:workerData.timezone,year:'numeric',month:'2-digit'}).formatToParts();
const month=parts.find(p=>p.type==='year').value+'-'+parts.find(p=>p.type==='month').value;
const data=await api.getBudgetMonth(month);
stage='normalize';const {normalizeBudget}=await import('file:///app/server/data.mjs');normalizeBudget(data,workerData.currency);
await api.shutdown();api=null;parentPort.postMessage({status:'ready',stage:'complete'});
}catch(error){const allowed=new Set(['token-expired','network-failure','budget-not-found','missing-key','decrypt-failure','invalid-password','internal','download-failure','out-of-sync-migrations','file-has-new-key','sync-error','SQLITE_BUSY','SQLITE_READONLY']);
const reason=allowed.has(error.code)?error.code:stage==='normalize'?'invalid-budget-shape':'unclassified';
try{await api?.shutdown();}catch{}parentPort.postMessage({status:'failed',stage,reason});}})();`;
let worker;
try {
const result=await new Promise((resolve)=>{
worker=new Worker(workerCode,{eval:true,execArgv:[],workerData:{actual:config.actual,dir,timezone:config.timezone,currency:config.currency},stdout:true,stderr:true});
worker.stdout.resume();worker.stderr.resume();
const timer=setTimeout(()=>resolve({status:'failed',stage:'worker',reason:'timeout'}),75000);
worker.once('message',message=>{clearTimeout(timer);resolve(message);});
worker.once('error',()=>{clearTimeout(timer);resolve({status:'failed',stage:'worker',reason:'unclassified'});});
worker.once('exit',()=>{clearTimeout(timer);resolve({status:'failed',stage:'worker',reason:'early-exit'});});
});
console.log(JSON.stringify(result));
}finally{await worker?.terminate();await rm(dir,{recursive:true,force:true});}
"""
subprocess.run(['docker', 'exec', '-i', 'purrbrews-cafe-purrbrews-dashboard-1',
                'node', '--input-type=module'], input=code, text=True, check=True)
