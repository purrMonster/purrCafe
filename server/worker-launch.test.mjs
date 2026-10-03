import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

test('Actual worker launch ignores stdin-only parent flags',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'cafe-worker-launch-'));
  try {
    const file=join(dir,'fixture.mjs');
    await writeFile(file,"import {parentPort} from 'node:worker_threads';parentPort.postMessage(process.execArgv);");
    const source=`import {Worker} from 'node:worker_threads';import {actualWorkerOptions} from ${JSON.stringify(new URL('./connectors.mjs',import.meta.url).href)};const worker=new Worker(${JSON.stringify(file)},actualWorkerOptions({}));worker.stdout.resume();worker.stderr.resume();worker.once('error',()=>process.exit(1));worker.once('message',args=>{console.log(JSON.stringify(args));worker.terminate();});`;
    const result=await promisify(execFile)(process.execPath,['--input-type=module','--eval',source],{timeout:15000});
    assert.deepEqual(JSON.parse(result.stdout.trim()),[]);
  } finally {await rm(dir,{recursive:true,force:true});}
});
