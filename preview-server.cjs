// Optional, dependency-free server for the local design previews.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const port = Number(process.argv[2] || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Choose a port between 1 and 65535.');
  process.exit(1);
}
const files = {
  'index.html': 'text/html',
  'dashboard-overview.html': 'text/html',
  'dashboard-inbox.html': 'text/html',
  'wall-display.html': 'text/html',
  'styles.css': 'text/css',
  'mockups.js': 'text/javascript'
};

const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!Object.hasOwn(files, file)) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const content = await fs.readFile(path.join(__dirname, file));
    response.writeHead(200, {
      'Content-Type': `${files[file]}; charset=utf-8`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(500).end('Preview file could not be read.');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is in use. Try: node preview-server.cjs ${port + 1}`
    : 'The preview server could not start.');
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Purrbrews previews: http://127.0.0.1:${port}/index.html`);
  console.log('Press Ctrl+C to stop. All displayed data is illustrative.');
});
