#!/usr/bin/env node

import http from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DB_TMP = `${DB_FILE}.tmp`;

const SAVE_VERSION = '2';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mid': 'audio/midi',
};

let db = null;

function freshDb() {
  return { version: SAVE_VERSION, accounts: {}, heroes: {} };
}

async function loadDb() {
  try {
    const parsed = JSON.parse(await readFile(DB_FILE, 'utf8'));
    if (parsed && parsed.version === SAVE_VERSION && parsed.accounts && parsed.heroes) {
      db = parsed;
      return;
    }
    console.log(`[server] db version ${parsed?.version} != ${SAVE_VERSION}: wiping saves`);
  } catch {
  }
  db = freshDb();
  await persistDb();
}

async function persistDb() {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_TMP, JSON.stringify(db));
  await rename(DB_TMP, DB_FILE);
}

function saneName(name) {
  return (
    typeof name === 'string' && name.length >= 4 && name.length <= 40 &&
    !/[\/\\\u0000-\u001f]/.test(name)
  );
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not Found');
  }
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts[0] !== 'api') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    await serveStatic(req, res, url.pathname);
    return;
  }

  if (parts[1] === 'ping' && req.method === 'GET') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (parts[1] === 'migrate' && req.method === 'GET') {
    await loadDb();
    sendJson(res, 200, { version: db.version });
    return;
  }

  if (parts[1] === 'login' && req.method === 'POST') {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, { status: 'bad-request' });
      return;
    }
    const { name, digest } = body ?? {};
    if (!saneName(name) || typeof digest !== 'string' || digest.length < 2) {
      sendJson(res, 403, { status: 'bad-name' });
      return;
    }
    const known = db.accounts[name];
    if (known === undefined) {
      db.accounts[name] = digest;
      await persistDb();
      console.log(`[server] account created: ${name}`);
      sendJson(res, 200, { status: 'created' });
      return;
    }
    sendJson(res, 200, { status: known === digest ? 'ok' : 'wrong' });
    return;
  }

  if (parts[1] === 'hero') {
    const name = decodeURIComponent(parts.slice(2).join('/'));
    if (!saneName(name)) {
      sendJson(res, 403, { status: 'bad-name' });
      return;
    }
    if (req.method === 'GET') {
      const hero = db.heroes[name];
      if (hero === undefined) {
        res.writeHead(404, { 'Cache-Control': 'no-store' }).end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(hero);
      return;
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      if (!body.startsWith('{')) {
        res.writeHead(400).end();
        return;
      }
      db.heroes[name] = body;
      await persistDb();
      res.writeHead(204).end();
      return;
    }
    res.writeHead(405).end();
    return;
  }

  res.writeHead(404).end();
}

export function startServer(port = Number(process.env.RD_PORT ?? 8000), host = process.env.RD_HOST ?? '127.0.0.1') {
  const server = http.createServer((req, res) => {
    route(req, res).catch((e) => {
      console.error('[server] request failed:', e);
      if (!res.headersSent) res.writeHead(500).end();
    });
  });
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      console.log(`RustyDagger server: http://${host}:${port}/  (saves in ${DB_FILE})`);
      resolve(server);
    });
  });
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  await loadDb();
  await startServer();
}
