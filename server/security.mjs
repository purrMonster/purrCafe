import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function identity(headers, groups) {
  const username = headers['remote-user'];
  if (typeof username !== 'string' || !/^[\w@.+-]{1,128}$/.test(username)) throw new HttpError(401, 'Sign in through Authelia.');
  const memberships = String(headers['remote-groups'] || '').split(',').map(x => x.trim());
  const admin = memberships.includes(groups.admin);
  const personal = admin || memberships.includes(groups.household);
  if (!personal && !memberships.includes(groups.wall)) throw new HttpError(403, 'This account does not have dashboard access.');
  return { username, name: String(headers['remote-name'] || username).slice(0,128), admin, wallOnly: !personal };
}
export function personal(user) { if (user.wallOnly) throw new HttpError(403, 'Personal data is unavailable to the wall display.'); }
export function mutation(headers, origin) {
  if (headers.origin !== origin || headers['x-purrbrews-intent'] !== 'dashboard') throw new HttpError(403, 'Send this request from the dashboard.');
  if (!String(headers['content-type']).startsWith('application/json')) throw new HttpError(415, 'Use a JSON request.');
}
export function control(configured, body, wallOnly) {
  const entity = configured.find(item => item.id === body.id);
  if (!entity || !entity.actions.includes(body.action) || (wallOnly && (!entity.wall || !entity.wallControl))) throw new HttpError(403, 'This device action is not allowed.');
  const domain = entity.id.split('.')[0];
  if (!['light','switch','fan','scene','media_player'].includes(domain)) throw new HttpError(403, 'This device domain is not allowed.');
  return { domain, service: body.action === 'activate' ? 'turn_on' : body.action, entity };
}
export function userKey(username) { return createHash('sha256').update(username).digest('hex'); }
export function seal(value, hexKey) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', Buffer.from(hexKey,'hex'), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), ciphertext: ciphertext.toString('hex') };
}
export function unseal(record, hexKey) {
  const cipher = createDecipheriv('aes-256-gcm',Buffer.from(hexKey,'hex'),Buffer.from(record.iv,'hex'));
  cipher.setAuthTag(Buffer.from(record.tag,'hex'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(record.ciphertext,'hex')),cipher.final()]).toString('utf8'));
}
