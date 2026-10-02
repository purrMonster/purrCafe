// Disposable browser verification only. Never included in the production image.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const now = new Date().toISOString();
let state = 'off';
const ready = data => ({ status: 'ready', updatedAt: now, data });
const session = { name: 'Verification fixture — fictional data', local: true, admin: true, wallOnly: false, timezone: 'Asia/Kolkata' };
const budget = { month: '2026-10', currency: 'INR', available: 1200000, assigned: 1600000, activity: 400000, categories: [{ name: 'Fictional groceries', assigned: 1600000, activity: 400000, available: 1200000 }] };
const mail = ready({ address: 'fixture@example.invalid', unread: 1, messages: [{ id: '10.1', sender: 'Verification fixture', subject: 'Fictional message — browser check', receivedAt: now, unread: true }] });
const files = new Map([['/', ['app/index.html', 'text/html']], ['/inbox', ['app/index.html', 'text/html']], ['/wall', ['app/index.html', 'text/html']], ['/settings', ['app/index.html', 'text/html']], ['/app.js', ['app/app.js', 'text/javascript']], ['/app.css', ['app/app.css', 'text/css']], ['/styles.css', ['styles.css', 'text/css']], ['/home-art.svg', ['app/home-art.svg', 'image/svg+xml']]]);
http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://127.0.0.1:4175');
  const send = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
  if (url.pathname === '/api/session') return send(session);
  if (url.pathname === '/api/mail') return send(mail);
  if (url.pathname === '/api/mail/account') return send({ connected: false });
  if (url.pathname === '/api/mail/message/10.1') return setTimeout(() => send({ subject: 'Fictional message — browser check', sender: 'Verification fixture', text: 'Plain text check: <img src="https://example.invalid/tracker">\nNo remote image should appear.' }), 1800);
  if (url.pathname === '/api/home/control' && req.method === 'POST') { for await (const chunk of req) {} state = state === 'off' ? 'on' : 'off'; return send({ message: 'Fictional device state updated.' }); }
  if (url.pathname === '/api/overview') return send({ home: ready([{ id: 'light.fixture', label: 'Fictional reading light', area: 'Test room', state, unit: '', available: true, actions: ['turn_on', 'turn_off'] }]), budget: ready(url.searchParams.has('wall') ? { ...budget, categories: undefined } : budget), fleet: ready(['sieve', 'percolator', 'cellar', 'mochaPot', 'grinder'].map(name => ({ name, state: 'up', checkedAt: now }))), services: [{ name: 'Fictional service', group: 'Verification only', note: 'Test data — no destination' }] });
  const file = files.get(url.pathname);
  if (!file) { res.writeHead(404); return res.end(); }
  try { res.setHeader('Content-Type', file[1]); res.end(await readFile(new URL(file[0], root))); } catch { res.writeHead(500); res.end(); }
}).listen(4175, '127.0.0.1', () => console.log('Fictional UI verification fixture: http://127.0.0.1:4175'));
