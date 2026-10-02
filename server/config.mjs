import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const env = process.env;
const local = process.argv.includes('--local');
if (local && env.NODE_ENV === 'production') throw new Error('Local mode cannot run in production.');
function url(value) {
  if (!value) return null;
  const parsed = new URL(value);
  if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Use HTTP(S) service URLs without embedded credentials.');
  return parsed.toString().replace(/\/$/,'');
}
const port = Number(env.PORT || 4174);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
const origin = url(env.PUBLIC_ORIGIN || (local ? `http://127.0.0.1:${port}` : ''));
if (!origin || new URL(origin).origin !== origin) throw new Error('PUBLIC_ORIGIN must be a full origin without a path.');
if (!local && new URL(origin).protocol !== 'https:') throw new Error('Live mode requires an HTTPS PUBLIC_ORIGIN.');
const key = env.APP_ENCRYPTION_KEY || '';
if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('Generate APP_ENCRYPTION_KEY: a 32-byte hex encryption key.');
const trusted = String(env.AUTH_TRUSTED_PROXY_CIDRS || '').split(',').map(x=>x.trim()).filter(Boolean);
if (!local && !trusted.length) throw new Error('Configure the trusted Traefik proxy IP/CIDR.');
const domain = env.DOMAIN || '';
if (domain && !/^[a-z0-9.-]+$/i.test(domain)) throw new Error('DOMAIN must be a hostname.');
const entities = JSON.parse(readFileSync(resolve(env.HA_ENTITIES_FILE || 'config/home.json'),'utf8'));
if (!Array.isArray(entities) || entities.length > 64) throw new Error('Configure at most 64 home entities.');
const ids = new Set();
for (const item of entities) {
  if (!/^[a-z_]+\.[a-z0-9_]+$/.test(item.id) || ids.has(item.id)) throw new Error('Each home entity needs a unique id.');
  ids.add(item.id); item.label = String(item.label || item.id).slice(0,100); item.area = String(item.area || 'Home').slice(0,100);
  item.actions ||= [];
  if (!Array.isArray(item.actions) || item.actions.some(action=> !['turn_on','turn_off','activate'].includes(action))) throw new Error('Use explicit turn_on, turn_off or scene activate actions.');
  if (item.actions.length && !['light','switch','fan','scene','media_player'].includes(item.id.split('.')[0])) throw new Error('Unsafe control domain.');
  if (item.actions.some(action => item.id.startsWith('scene.') ? action !== 'activate' : action === 'activate')) throw new Error('Activate is only allowed for scenes.');
  item.wall = item.wall === true; item.wallControl = item.wallControl === true;
}
const timezone = env.TIMEZONE || 'Asia/Kolkata';
new Intl.DateTimeFormat('en',{timeZone:timezone}).format();
const currency = env.BUDGET_CURRENCY || 'INR';
new Intl.NumberFormat('en',{style:'currency',currency}).format(0);
export const config = {
  local, port, origin, host:local ? '127.0.0.1' : env.HOST || '127.0.0.1', key, trusted, domain, entities, timezone, currency,
  dataDir:resolve(env.DATA_DIR || 'data'),
  groups:{admin:env.AUTH_ADMIN_GROUP || 'purrbrews_admins',household:env.AUTH_HOUSEHOLD_GROUP || 'purrbrews_household',wall:env.AUTH_WALL_GROUP || 'purrbrews_wall_display'},
  ha:{url:url(env.HA_URL),token:env.HA_TOKEN},
  actual:{url:url(env.ACTUAL_SERVER_URL),sessionToken:env.ACTUAL_SESSION_TOKEN,password:env.ACTUAL_PASSWORD,syncId:env.ACTUAL_SYNC_ID,encryptionPassword:env.ACTUAL_ENCRYPTION_PASSWORD},
  gatus:{url:url(env.GATUS_URL),authorization:env.GATUS_AUTHORIZATION},
  fleetKeys:env.GATUS_FLEET_KEYS?JSON.parse(env.GATUS_FLEET_KEYS):{},
  services:JSON.parse(readFileSync(resolve(env.SERVICES_FILE || 'config/services.json'),'utf8'))
};
if (config.actual.sessionToken && config.actual.password) throw new Error('Choose either Actual session token or password authentication.');
for (const item of config.services) {
  if (item.url) item.url = url(item.url);
  if (item.host && domain) item.url = `https://${item.host}.${domain}`;
}
export function currentMonth() {
  const parts = new Intl.DateTimeFormat('en',{timeZone:timezone,year:'numeric',month:'2-digit'}).formatToParts();
  return `${parts.find(x=>x.type==='year').value}-${parts.find(x=>x.type==='month').value}`;
}
