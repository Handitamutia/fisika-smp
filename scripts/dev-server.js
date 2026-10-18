import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 3000);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp'
};

function loadEnvFile() {
  const path = join(root, '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
  }
}

function responseAdapter(response) {
  return {
    status(code) { response.statusCode = code; return this; },
    json(data) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(data));
    }
  };
}

async function serveApi(request, response, pathname) {
  const name = pathname.slice('/api/'.length);
  if (!/^[a-z-]+$/.test(name)) return false;
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks).toString('utf8');
    request.body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ success: false, message: 'JSON tidak valid.' }));
    return true;
  }

  try {
    const module = await import(`../api/${name}.js`);
    await module.default(request, responseAdapter(response));
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      response.statusCode = 404;
      response.end('Not found');
      return true;
    }
    console.error('Local API error:', error);
    response.statusCode = 500;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ success: false, message: 'Terjadi kesalahan pada server lokal.' }));
  }
  return true;
}

loadEnvFile();
createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname.startsWith('/api/')) {
    await serveApi(request, response, pathname);
    return;
  }

  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const path = normalize(join(root, requested));
  if (!path.startsWith(`${root}\\`) || !existsSync(path) || !statSync(path).isFile()) {
    response.statusCode = 404;
    response.end('Not found');
    return;
  }
  response.setHeader('Content-Type', mimeTypes[extname(path)] || 'application/octet-stream');
  createReadStream(path).pipe(response);
}).listen(port, () => {
  console.log(`Server lokal siap di http://localhost:${port}`);
  console.log('Tekan Ctrl+C untuk menghentikan server.');
});
