import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Every deployment-specific value comes from the environment or a mounted
// config file. Nothing here should name a real host, domain, node or provider.
const env = process.env;
export const root = fileURLToPath(new URL('../', import.meta.url));
const local = process.argv.includes('--local');
if (local && env.NODE_ENV === 'production') throw new Error('Local mode cannot run in production.');

function url(value) {
  if (!value) return null;
  const parsed = new URL(value);
  if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Use HTTP(S) service URLs without embedded credentials.');
  return parsed.toString().replace(/\/$/,'');
}
const hostnamePattern = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
function hostname(name, value) {
  if (value && !hostnamePattern.test(value)) throw new Error(`${name} must be a hostname, without scheme or path.`);
  return value || '';
}
function list(value) { return String(value || '').split(',').map(x=>x.trim()).filter(Boolean); }
function jsonFile(path, fallback) {
  try { return JSON.parse(readFileSync(path,'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw new Error(`Could not read ${path}: ${error.message}`); }
}

const port = Number(env.PORT || 4174);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');

// PUBLIC_HOSTNAME is the single source for the dashboard's address; Compose
// uses the same value for the Traefik router. PUBLIC_ORIGIN remains supported.
const publicHostname = hostname('PUBLIC_HOSTNAME', env.PUBLIC_HOSTNAME);
const derivedOrigin = publicHostname ? `https://${publicHostname}` : '';
if (env.PUBLIC_ORIGIN && derivedOrigin && url(env.PUBLIC_ORIGIN) !== derivedOrigin) throw new Error('PUBLIC_ORIGIN and PUBLIC_HOSTNAME disagree. Set only PUBLIC_HOSTNAME.');
const origin = url(env.PUBLIC_ORIGIN || derivedOrigin || (local ? `http://127.0.0.1:${port}` : ''));
if (!origin || new URL(origin).origin !== origin) throw new Error('Set PUBLIC_HOSTNAME (or PUBLIC_ORIGIN as a full origin without a path).');
if (!local && new URL(origin).protocol !== 'https:') throw new Error('Live mode requires an HTTPS origin.');

const key = env.APP_ENCRYPTION_KEY || '';
if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('Generate APP_ENCRYPTION_KEY: a 32-byte hex encryption key.');
const trusted = list(env.AUTH_TRUSTED_PROXY_CIDRS);
if (!local && !trusted.length) throw new Error('Configure the trusted reverse-proxy IP/CIDR.');
const domain = hostname('DOMAIN', env.DOMAIN);

const entitiesFile = resolve(root, env.HA_ENTITIES_FILE || 'config/home.json');
const entities = jsonFile(entitiesFile, []);
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

const timezone = env.TIMEZONE || 'UTC';
new Intl.DateTimeFormat('en',{timeZone:timezone}).format();
const locale = env.LOCALE || 'en';
if (!Intl.NumberFormat.supportedLocalesOf([locale]).length) throw new Error('LOCALE must be a supported BCP 47 locale, e.g. en-GB.');

const actual = {url:url(env.ACTUAL_SERVER_URL),sessionToken:env.ACTUAL_SESSION_TOKEN,password:env.ACTUAL_PASSWORD,syncId:env.ACTUAL_SYNC_ID,encryptionPassword:env.ACTUAL_ENCRYPTION_PASSWORD};
if (actual.sessionToken && actual.password) throw new Error('Choose either Actual session token or password authentication.');
const currency = (env.BUDGET_CURRENCY || '').toUpperCase();
if (currency) new Intl.NumberFormat('en',{style:'currency',currency}).format(0);
else if (actual.url) throw new Error('Set BUDGET_CURRENCY (e.g. EUR) when Actual is configured.');

const mailPort = Number(env.MAIL_IMAP_PORT || 993);
if (!Number.isInteger(mailPort) || mailPort < 1 || mailPort > 65535) throw new Error('Invalid MAIL_IMAP_PORT.');
const mail = {host:hostname('MAIL_IMAP_HOST', env.MAIL_IMAP_HOST),port:mailPort,provider:String(env.MAIL_PROVIDER_NAME || '').slice(0,40)};

const services = jsonFile(resolve(root, env.SERVICES_FILE || 'config/services.json'), []);
if (!Array.isArray(services)) throw new Error('SERVICES_FILE must contain a JSON array.');
for (const item of services) {
  if (item.url) item.url = url(item.url);
  else if (item.host && domain) item.url = `https://${hostname('service host', item.host)}.${domain}`;
}

const fleetKeys = env.GATUS_FLEET_KEYS ? JSON.parse(env.GATUS_FLEET_KEYS) : {};
if (!fleetKeys || typeof fleetKeys !== 'object' || Array.isArray(fleetKeys)) throw new Error('GATUS_FLEET_KEYS must be a JSON object.');

export const config = {
  local, port, origin, host:local ? '127.0.0.1' : env.HOST || '127.0.0.1', key, trusted, domain, entities, timezone, locale, currency,
  dataDir:resolve(root, env.DATA_DIR || 'data'),
  groups:{admin:env.AUTH_ADMIN_GROUP || 'purrbrews_admins',household:env.AUTH_HOUSEHOLD_GROUP || 'purrbrews_household',wall:env.AUTH_WALL_GROUP || 'purrbrews_wall_display'},
  ha:{url:url(env.HA_URL),token:env.HA_TOKEN},
  actual, mail,
  gatus:{url:url(env.GATUS_URL),authorization:env.GATUS_AUTHORIZATION},
  fleetNodes:list(env.FLEET_NODES).slice(0,24),
  fleetKeys, services
};
