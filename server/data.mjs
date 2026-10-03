import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { seal, unseal, userKey } from './security.mjs';
export class Accounts {
  constructor(dir,key) { this.dir = join(dir,'accounts'); this.key = key; this.writes = new Map(); }
  async get(user) {
    await this.writes.get(userKey(user));
    try { return unseal(JSON.parse(await readFile(join(this.dir,`${userKey(user)}.json`),'utf8')),this.key); }
    catch(error) { if(error.code === 'ENOENT') return null; throw error; }
  }
  async set(user,value) {
    const id = userKey(user);
    const work = (this.writes.get(id) || Promise.resolve()).catch(()=>{}).then(async()=> {
      await mkdir(this.dir,{recursive:true,mode:0o700});
      const file = join(this.dir,`${id}.json`);
      if (value === null) { await unlink(file).catch(error=>{if(error.code !== 'ENOENT') throw error;}); return; }
      const temp = `${file}.${randomBytes(6).toString('hex')}.tmp`;
      await writeFile(temp,JSON.stringify(seal(value,this.key)),{mode:0o600,flag:'wx'});
      await rename(temp,file);
    });
    this.writes.set(id,work);
    try { await work; } finally { if(this.writes.get(id) === work) this.writes.delete(id); }
  }
}
export function cached(seconds,loader) {
  let value, expires=0, pending, generation=0, pendingGeneration=0;
  const get = async()=> {
    if (value && Date.now()<expires) return value;
    if (pending) {if(pendingGeneration===generation) return pending;await pending;return get();}
    const started=generation;
    pendingGeneration=started;
    pending = Promise.resolve().then(loader).then(result=>{if(started===generation){value=result;expires=Date.now()+(result.status==='ready'?seconds:5)*1000;}return result;}).finally(()=>{pending=null;});
    return pending;
  };
  get.clear = ()=>{expires=0;generation++;};
  return get;
}
export const ready = data => ({status:'ready',data,updatedAt:new Date().toISOString()});
export const missing = message => ({status:'not_configured',data:null,updatedAt:null,message});
export const unavailable = message => ({status:'unavailable',data:null,updatedAt:null,message});
export function normalizeBudget(raw,currency) {
  const categories = raw.categoryGroups.filter(group=>!group.is_income).flatMap(group=>group.categories || []).map(cat=>{
    if(![cat.budgeted,cat.spent,cat.balance].every(Number.isSafeInteger)) throw new Error('Unsupported Actual amount format.');
    return {id:cat.id,name:String(cat.name),assigned:cat.budgeted,activity:-cat.spent,available:cat.balance};
  });
  if (!categories.every(cat=>[cat.assigned,cat.activity,cat.available].every(Number.isSafeInteger))) throw new Error('Unsupported Actual amount format.');
  const totals={assigned:categories.reduce((n,c)=>n+c.assigned,0),activity:categories.reduce((n,c)=>n+c.activity,0),available:categories.reduce((n,c)=>n+c.available,0)};
  if(!Object.values(totals).every(Number.isSafeInteger)) throw new Error('Budget totals exceed safe integer limits.');
  return {month:raw.month,currency,categories,...totals};
}
export function normalizeFleet(data,keys={},now=Date.now()) {
  return ['sieve','percolator','cellar','mochaPot','grinder'].map(name=> {
    const item=data.find(item=>keys[name]?item.key===keys[name]:String(item.name).toLowerCase()===name.toLowerCase());
    if(!item) return {name,state:'unknown',checkedAt:null};
    const results=(Array.isArray(item.results)?item.results:[]).filter(result=>Number.isFinite(Date.parse(result?.timestamp))).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp));
    const latest=results[0],age=now-Date.parse(latest?.timestamp);
    const valid=Number.isFinite(age) && age>=-60000 && age<300000;
    return {name,state:!valid?'unknown':latest.success===true?'up':latest.success===false?'down':'unknown',checkedAt:latest?.timestamp || null};
  });
}
export function weatherReading(attributes={}) {
  if(!attributes || typeof attributes!=='object') return null;
  const temperature=attributes.temperature,humidity=attributes.humidity;
  if(typeof temperature!=='number' || !Number.isFinite(temperature)) return null;
  return {temperature,unit:['°C','°F'].includes(attributes.temperature_unit)?attributes.temperature_unit:'',humidity:typeof humidity==='number' && Number.isFinite(humidity) && humidity>=0 && humidity<=100?humidity:null};
}
export function projectWall(data) {
  const budget = data.budget.data;
  return {...data,home:{...data.home,data:data.home.data?.filter(item=>item.wall).map(item=>({...item,actions:item.wallControl?item.actions:[]})) || null},budget:{...data.budget,data:budget?{month:budget.month,currency:budget.currency,assigned:budget.assigned,activity:budget.activity,available:budget.available}:null},services:[],user:{name:'Household display',wallOnly:true,admin:false}};
}
