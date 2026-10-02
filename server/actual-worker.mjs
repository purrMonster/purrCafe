import { parentPort, workerData } from 'node:worker_threads';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { normalizeBudget } from './data.mjs';
let api;
try {
  api=await import('@actual-app/api');
  const {actual,dataDir,timezone,currency}=workerData;
  const cache=join(dataDir,'actual');
  await mkdir(cache,{recursive:true,mode:0o700});
  await api.init({dataDir:cache,serverURL:actual.url,...(actual.sessionToken?{sessionToken:actual.sessionToken}:{password:actual.password})});
  await api.downloadBudget(actual.syncId,actual.encryptionPassword?{password:actual.encryptionPassword}:undefined);
  await api.sync();
  const parts=new Intl.DateTimeFormat('en',{timeZone:timezone,year:'numeric',month:'2-digit'}).formatToParts();
  const month=`${parts.find(x=>x.type==='year').value}-${parts.find(x=>x.type==='month').value}`;
  const result=normalizeBudget(await api.getBudgetMonth(month),currency);
  await api.shutdown();api=null;
  parentPort.postMessage({ok:true,data:result});
} catch {
  try {await api?.shutdown();} catch {}
  parentPort.postMessage({ok:false});
}
