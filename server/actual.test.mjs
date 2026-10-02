import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('Actual native engine reads a disposable offline budget inside a worker',async()=> {
  const dir=await mkdtemp(join(tmpdir(),'purrbrews-actual-'));
  try {
    const result=await new Promise((resolve,reject)=> {
      const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads'); (async()=>{let api;try{api=await import('@actual-app/api');await api.init({dataDir:workerData});await api.runImport('Disposable verification budget',async()=>{});const month=await api.getBudgetMonth('2026-10');await api.shutdown();parentPort.postMessage({ok:true,groups:Array.isArray(month.categoryGroups),month:month.month});}catch{try{await api?.shutdown();}catch{}parentPort.postMessage({ok:false});}})();`,{eval:true,workerData:dir,stdout:true,stderr:true});
      worker.stdout.resume();worker.stderr.resume();
      const timer=setTimeout(()=>{worker.terminate();reject(new Error('Actual offline check timed out'));},30000);
      worker.once('message',message=>{clearTimeout(timer);worker.terminate().then(()=>resolve(message));});
      worker.once('error',error=>{clearTimeout(timer);reject(error);});
    });
    assert.equal(result.ok,true);assert.equal(result.groups,true);assert.equal(result.month,'2026-10');
  } finally {await rm(dir,{recursive:true,force:true});}
});
