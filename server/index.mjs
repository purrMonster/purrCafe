import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import proxyaddr from 'proxy-addr';
import { config } from './config.mjs';
import { HttpError, identity, personal, mutation, control } from './security.mjs';
import { Accounts, missing, unavailable, projectWall } from './data.mjs';
import { connectors, mailList, mailMessage, withMailbox } from './connectors.mjs';

const trust=config.local?()=>false:proxyaddr.compile(config.trusted);
const sources=connectors(config), accounts=new Accounts(config.dataDir,config.key);
const mailBusy=new Set(), rates=new Map();
function limit(key,max) {
  const now=Date.now();
  if(rates.size>2000) for(const [key,value] of rates) if(value.until<now) rates.delete(key);
  const record=rates.get(key);
  if(record && record.until>now) {if(++record.count>max) throw new HttpError(429,'Too many requests. Try again in a minute.');}
  else rates.set(key,{count:1,until:now+60000});
}
async function body(request) {
  let size=0; const chunks=[];
  for await(const chunk of request) {size+=chunk.length;if(size>8192) throw new HttpError(413,'Request is too large.');chunks.push(chunk);}
  try {const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();return parsed;}
  catch {throw new HttpError(400,'Invalid JSON request.');}
}
async function mailbox(user,work) {
  personal(user);
  if(mailBusy.has(user.username) || mailBusy.size>=8) throw new HttpError(429,'A mail request is already running. Try again shortly.');
  mailBusy.add(user.username);
  try {return await work();} finally {mailBusy.delete(user.username);}
}
const staticFiles=new Map([
 ['/','app/index.html'],['/inbox','app/index.html'],['/wall','app/index.html'],['/settings','app/index.html'],
 ['/app.js','app/app.js'],['/app.css','app/app.css'],['/styles.css','styles.css'],
 ['/home-art.svg','app/home-art.svg'],
 ...['index.html','dashboard-overview.html','dashboard-inbox.html','wall-display.html','styles.css','mockups.js'].map(name=>[`/previews/${name}`,name])
]);
const csp="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
const server=http.createServer({maxHeaderSize:16384},async(request,response)=> {
  response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');
  response.setHeader('Referrer-Policy','no-referrer');response.setHeader('X-Frame-Options','DENY');
  response.setHeader('Content-Security-Policy',csp);response.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(!config.local) response.setHeader('Strict-Transport-Security','max-age=31536000');
  function send(data,status=200) {response.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});response.end(JSON.stringify(data));}
  try {
    const url=new URL(request.url,config.origin), pathname=url.pathname;
    if(pathname==='/healthz' && ['GET','HEAD'].includes(request.method)) return send({status:'ok'});
    if(!['GET','HEAD','POST','DELETE'].includes(request.method)) throw new HttpError(405,'Method not allowed.');
    let user;
    if(config.local) user={username:'local-developer',name:'Local developer',admin:true,wallOnly:false};
    else {
      if(!trust(request.socket.remoteAddress,0)) throw new HttpError(401,'Access this dashboard through the configured authentication proxy.');
      user=identity(request.headers,config.groups);
    }
    limit(`request:${user.username}`,180);
    if(['POST','DELETE'].includes(request.method)) {mutation(request.headers,config.origin);limit(`write:${user.username}`,15);}
    if(pathname==='/api/session' && request.method==='GET') return send({...user,local:config.local,timezone:config.timezone});
    if(pathname==='/api/overview' && request.method==='GET') {
      const [home,budget,fleet]=await Promise.all([sources.home(),sources.budget(),sources.fleet()]);
      const data={user,home,budget,fleet,services:config.services.filter(item=>!item.admin || user.admin)};
      return send(user.wallOnly || url.searchParams.get('wall')==='1'?projectWall(data):data);
    }
    if(pathname==='/api/home/control' && request.method==='POST') {
      const action=control(config.entities,await body(request),user.wallOnly);
      const snapshot=await sources.home();
      if(!snapshot.data?.find(item=>item.id===action.entity.id)?.available) throw new HttpError(503,'This device is unavailable.');
      await sources.action(action.domain,action.service,action.entity.id);
      return send({message:'Command accepted. Device state will refresh from Home Assistant.'});
    }
    if(pathname==='/api/mail' && request.method==='GET') return await mailbox(user,async()=> {
      const account=await accounts.get(user.username);
      if(!account) return send(missing('Connect your Purelymail mailbox in settings.'));
      try {return send(await mailList(account));} catch {return send(unavailable('Mail could not be reached or authenticated. Check your mailbox settings.'));}
    });
    if(pathname.startsWith('/api/mail/message/') && request.method==='GET') return await mailbox(user,async()=> {
      const account=await accounts.get(user.username);
      if(!account) throw new HttpError(409,'Connect your mailbox first.');
      try {return send(await mailMessage(account,pathname.slice('/api/mail/message/'.length)));}
      catch(error) {if(error instanceof HttpError) throw error;throw new HttpError(502,'This message could not be loaded.');}
    });
    if(pathname==='/api/mail/account' && request.method==='GET') {
      personal(user);const account=await accounts.get(user.username);return send({connected:Boolean(account),address:account?.address || null});
    }
    if(pathname==='/api/mail/account' && request.method==='POST') return await mailbox(user,async()=> {
      const input=await body(request);
      if(typeof input.address!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.address) || input.address.length>254 || typeof input.password!=='string' || !input.password || input.password.length>1024) throw new HttpError(400,'Enter your mailbox address and password.');
      const account={address:input.address.trim(),password:input.password};
      try {await withMailbox(account,async()=>{});} catch {throw new HttpError(422,'Mailbox authentication failed. Check the address and password.');}
      await accounts.set(user.username,account);return send({message:'Your mailbox is connected.'});
    });
    if(pathname==='/api/mail/account' && request.method==='DELETE') return await mailbox(user,async()=>{await accounts.set(user.username,null);return send({message:'Mailbox disconnected and saved credentials removed.'});});
    if(user.wallOnly && pathname==='/') {response.writeHead(302,{Location:'/wall'});return response.end();}
    if(user.wallOnly && ['/inbox','/settings'].includes(pathname)) throw new HttpError(403,'This page is unavailable to the wall display.');
    const file=staticFiles.get(pathname);
    if(!file || !['GET','HEAD'].includes(request.method)) throw new HttpError(404,'Page not found.');
    // Mockups have inline presentation styles; live surfaces use the stricter policy.
    if(pathname.startsWith('/previews/')) response.setHeader('Content-Security-Policy',csp.replace("style-src 'self'","style-src 'self' 'unsafe-inline'"));
    const content=await readFile(resolve(file));
    const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html';
    response.writeHead(200,{'Content-Type':`${type}; charset=utf-8`});response.end(request.method==='HEAD'?undefined:content);
  } catch(error) {
    const status=error instanceof HttpError?error.status:500;
    send({error:error instanceof HttpError?error.message:'The dashboard could not complete this request.'},status);
    if(status===500) console.error('Dashboard request failed. Check configuration and data-volume access.');
  }
});
server.requestTimeout=30000;server.headersTimeout=15000;
server.listen(config.port,config.host,()=>console.log(`Purrbrews dashboard listening on ${config.host}:${config.port}${config.local?' (local development, authentication disabled)':''}`));
server.on('error',()=>{console.error('Dashboard server could not start. Check the port and listen address.');process.exitCode=1;});
async function stop() {server.close();setTimeout(()=>process.exit(0),10000).unref();try {await sources.close();} catch {} }
process.on('SIGTERM',stop);process.on('SIGINT',stop);
