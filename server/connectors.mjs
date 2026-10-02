import { Worker } from 'node:worker_threads';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { ready, missing, unavailable, cached, normalizeFleet } from './data.mjs';
import { HttpError } from './security.mjs';
export async function json(url,options={}) {
  const response = await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error('Upstream request failed.');
  const chunks=[];let size=0;
  for await(const chunk of response.body) {
    size+=chunk.length;
    if(size>5_000_000) throw new Error('Upstream response too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function connectors(config) {
  const home = cached(10,async()=> {
    if(!config.ha.url || !config.ha.token || !config.entities.length) return missing('Configure Home Assistant and select your entities.');
    try {
      const states = await json(`${config.ha.url}/api/states`,{headers:{Authorization:`Bearer ${config.ha.token}`}});
      if (!Array.isArray(states)) throw new Error('Invalid states.');
      return ready(config.entities.map(item=> {
        const state = states.find(state=>state.entity_id === item.id);
        return {...item,state:state?.state || 'unavailable',unit:String(state?.attributes?.unit_of_measurement || '').slice(0,20),updatedAt:state?.last_updated || null,available:Boolean(state && !['unknown','unavailable'].includes(state.state))};
      }));
    } catch { return unavailable('Home Assistant could not be reached or authenticated.'); }
  });
  let actualWorker;
  const budget = cached(300,async()=> {
    const actual=config.actual;
    if(!actual.url || !actual.syncId || (!actual.sessionToken && !actual.password)) return missing('Configure the Actual server, Sync ID, and authentication.');
    return new Promise(resolve=> {
      const worker=new Worker(new URL('./actual-worker.mjs',import.meta.url),{workerData:{actual,dataDir:config.dataDir,timezone:config.timezone,currency:config.currency},stdout:true,stderr:true});
      actualWorker=worker;
      // Provider logs are suppressed: they may contain tokens or budget contents.
      worker.stdout.resume();worker.stderr.resume();
      let settled=false;
      const finish=result=> {
        if(settled) return;settled=true;clearTimeout(timer);
        worker.terminate().finally(()=> {if(actualWorker===worker) actualWorker=null;resolve(result);});
      };
      const failure=()=>finish(unavailable('Actual Budget sync failed or timed out. Check credentials, Sync ID, and server access.'));
      const timer=setTimeout(failure,60000);
      worker.once('message',message=>message.ok?finish(ready(message.data)):failure());
      worker.once('error',failure);worker.once('exit',failure);
    });
  });
  const fleet=cached(30,async()=> {
    if(!config.gatus.url) return missing('Configure a backend connection to Gatus.');
    try {
      const data=await json(`${config.gatus.url}/api/v1/endpoints/statuses`,{headers:config.gatus.authorization?{Authorization:config.gatus.authorization}:{}});
      if(!Array.isArray(data)) throw new Error('Invalid Gatus statuses.');
      return ready(normalizeFleet(data,config.fleetKeys));
    } catch { return unavailable('Gatus could not be reached or authenticated.'); }
  });
  return {home,budget,fleet,async action(domain,service,id) {
    if(!config.ha.url || !config.ha.token) throw new HttpError(503,'Home Assistant is not configured.');
    try { await json(`${config.ha.url}/api/services/${domain}/${service}`,{method:'POST',headers:{Authorization:`Bearer ${config.ha.token}`,'Content-Type':'application/json'},body:JSON.stringify({entity_id:id})});home.clear(); }
    catch { throw new HttpError(502,'The device command could not be confirmed. Check Home Assistant before retrying.'); }
  },async close() { if(actualWorker) await actualWorker.terminate(); }};
}
export async function withMailbox(account,work,{createClient=options=>new ImapFlow(options),timeoutMs=45000}={}) {
  const client=createClient({host:'imap.purelymail.com',port:993,secure:true,auth:{user:account.address,pass:account.password},logger:false,connectionTimeout:12000,greetingTimeout:12000,socketTimeout:20000,disableAutoIdle:true});
  let timeout;
  const interrupted=new Promise((resolve,reject)=> {
    // ImapFlow emits errors after connect; an unhandled event would stop Node.
    client.on('error',()=>reject(new Error('Mailbox connection interrupted.')));
    client.on('close',()=>reject(new Error('Mailbox connection closed.')));
    timeout=setTimeout(()=>reject(new Error('Mailbox request timed out.')),timeoutMs);
  });
  try {
    return await Promise.race([interrupted,(async()=> {
      await client.connect();
      const lock=await client.getMailboxLock('INBOX',{readOnly:true});
      try { return await work(client); } finally {lock.release();}
    })()]);
  } finally { clearTimeout(timeout);client.close(); }
}
export async function mailList(account,options) {
  return withMailbox(account,async client=> {
    const unseen=await client.search({seen:false},{uid:true});
    const exists=client.mailbox.exists;
    const messages=[];
    if(exists) for await (const message of client.fetch(`${Math.max(1,exists-24)}:*`,{envelope:true,flags:true,uid:true})) {
      const date=message.envelope?.date;
      messages.push({id:`${client.mailbox.uidValidity}.${message.uid}`,sender:String(message.envelope?.from?.[0]?.name || message.envelope?.from?.[0]?.address || 'Unknown sender').slice(0,200),subject:String(message.envelope?.subject || '(No subject)').slice(0,300),receivedAt:Number.isFinite(date?.getTime?.())?date.toISOString():null,unread:!message.flags.has('\\Seen')});
    }
    if(!Array.isArray(unseen)) throw new Error('Unread count could not be read.');
    return ready({address:account.address,unread:unseen.length,messages:messages.reverse()});
  },options);
}
export async function mailMessage(account,id,options) {
  if(!/^\d{1,10}\.\d{1,10}$/.test(id) || id.split('.').some(value=>Number(value)<1 || Number(value)>4294967295)) throw new HttpError(400,'Invalid message id.');
  return withMailbox(account,async client=> {
    const [validity,uid]=id.split('.');
    if(String(client.mailbox.uidValidity)!==validity) throw new HttpError(409,'The inbox changed. Refresh the message list.');
    const meta=await client.fetchOne(uid,{size:true},{uid:true});
    if(!meta) throw new HttpError(404,'Message is no longer available.');
    if(!Number.isSafeInteger(meta.size) || meta.size<0) throw new HttpError(502,'Message size could not be confirmed.');
    if(meta.size>1_000_000) throw new HttpError(413,'This message is too large for the preview. Open it in your mail client.');
    const download=await client.download(uid,undefined,{uid:true,maxBytes:1_000_001});
    if(!download.content) throw new HttpError(404,'Message is no longer available.');
    const chunks=[];let size=0;
    for await(const chunk of download.content) {
      size+=chunk.length;
      if(size>1_000_000) throw new HttpError(413,'Message exceeds the preview limit.');
      chunks.push(chunk);
    }
    const parsed=await simpleParser(Buffer.concat(chunks),{skipTextToHtml:true});
    return {subject:String(parsed.subject || '(No subject)'),sender:String(parsed.from?.text || 'Unknown sender'),text:String(parsed.text || 'This message has no text preview. Open it in your mail client.').slice(0,50000)};
  },options);
}
