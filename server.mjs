#!/usr/bin/env node

import http from 'node:http';
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = process.env.RD_DB
  ? path.resolve(process.env.RD_DB)
  : path.join(DATA_DIR, 'db.sqlite');

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

function initDb() {
  mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS accounts (
      name   TEXT PRIMARY KEY,
      digest TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS heroes (
      name TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mail (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      dest     TEXT NOT NULL,
      label    TEXT NOT NULL,
      contents TEXT NOT NULL,
      created  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS clans (
      name    TEXT PRIMARY KEY,
      leader  TEXT NOT NULL,
      ability TEXT NOT NULL DEFAULT 'None'
    );
    CREATE TABLE IF NOT EXISTS scores (
      name  TEXT PRIMARY KEY,
      rank  TEXT NOT NULL,
      updated TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const version = db.prepare('SELECT value FROM meta WHERE key = ?').get('version')?.value;
  if (version !== SAVE_VERSION) {
    for (const table of ['accounts', 'heroes', 'mail', 'clans', 'scores']) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  }
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('version', SAVE_VERSION);
  return db;
}

function saneName(name) {
  return (
    typeof name === 'string' && name.length >= 4 && name.length <= 40 &&
    !/[\/\\\u0000-\u001f]/.test(name)
  );
}

function today() {
  const now = new Date();
  const mm = `${now.getMonth() + 1}`.padStart(2, '0');
  const dd = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}/${mm}/${dd}`;
}

function clanOfHero(heroData) {
  const m = /\{=\|Clan\|([^}|]*)\}/.exec(heroData ?? '');
  const clan = m?.[1]?.trim();
  return clan && clan.length >= 1 ? clan : null;
}

function levelOfHero(heroData) {
  const m = /\{#\|Level\|(\d+)\}/.exec(heroData ?? '');
  return m ? Number(m[1]) : 0;
}

function clanRoster(clan) {
  const heroes = db.prepare('SELECT name, data FROM heroes').all();
  const members = heroes.filter((h) => clanOfHero(h.data) === clan);
  let power = 0;
  for (const m of members) power += levelOfHero(m.data);
  return { members: members.length, power };
}

function rankFields(rank) {
  const body = rank.replace(/^\{(?:itList|~)\|/, '').replace(/\}[\s\S]*$/, '');
  return body.split('|').map((f) => f.trim());
}

function num(fields, ix) {
  const n = Number(fields[ix]);
  return Number.isFinite(n) ? n : 0;
}

function buildRankings() {
  const rows = db.prepare('SELECT rank FROM scores').all().map((r) => r.rank);
  const boards = [[], [], [], []];
  for (const rank of rows) {
    const f = rankFields(rank);
    if (f.length < 11) continue;
    boards[0].push({ rank, key: num(f, 3) });
    boards[1].push({ rank, key: num(f, 4) });
    boards[2].push({ rank, key: num(f, 1) });
    boards[3].push({ rank, key: num(f, 7) });
  }
  const order = boards.map((b) =>
    b.sort((a, c) => c.key - a.key).map((e) => e.rank)
  );
  const clanRows = [];
  for (const clan of db.prepare('SELECT name, leader FROM clans').all()) {
    const { members, power } = clanRoster(clan.name);
    clanRows.push(`{itList|${clan.name}|${clan.leader}|${members}|${power}|${clan.leader}}`);
  }
  const lists = order.map((rows2) => `{~|Rank|${rows2.join('|')}}`);
  lists.push(`{~|Rank|${clanRows.join('|')}}`);
  return lists.join('\n');
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendText(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
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

async function readJson(req) {
  return JSON.parse(await readBody(req));
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
    sendJson(res, 200, { version: SAVE_VERSION });
    return;
  }

  if (parts[1] === 'login' && req.method === 'POST') {
    let body;
    try {
      body = await readJson(req);
    } catch {
      sendJson(res, 400, { status: 'bad-request' });
      return;
    }
    const { name, digest } = body ?? {};
    if (!saneName(name) || typeof digest !== 'string' || digest.length < 2) {
      sendJson(res, 403, { status: 'bad-name' });
      return;
    }
    const known = db.prepare('SELECT digest FROM accounts WHERE name = ?').get(name);
    if (known === undefined) {
      db.prepare('INSERT INTO accounts (name, digest) VALUES (?, ?)').run(name, digest);
      console.log(`[server] account created: ${name}`);
      sendJson(res, 200, { status: 'created' });
      return;
    }
    sendJson(res, 200, { status: known.digest === digest ? 'ok' : 'wrong' });
    return;
  }

  if (parts[1] === 'find' && req.method === 'GET') {
    const name = decodeURIComponent(parts.slice(2).join('/'));
    if (!saneName(name)) {
      sendText(res, 403, 'Error: bad name');
      return;
    }
    const best =
      db.prepare('SELECT name, rank FROM scores').all()
        .map((s) => ({ name: s.name, fame: num(rankFields(s.rank), 4) }))
        .sort((a, b) => b.fame - a.fame)[0]?.name ?? '0';
    let leader = '';
    const clan = clanOfHero(db.prepare('SELECT data FROM heroes WHERE name = ?').get(name)?.data);
    if (clan) {
      const row = db.prepare('SELECT leader FROM clans WHERE name = ?').get(clan);
      if (row) leader = row.leader;
    }
    sendText(res, 200, `${today()}|${best}|${leader}|`);
    return;
  }

  if (parts[1] === 'hero') {
    const name = decodeURIComponent(parts.slice(2).join('/'));
    if (!saneName(name)) {
      sendText(res, 403, 'Error: bad name');
      return;
    }
    if (req.method === 'GET') {
      const row = db.prepare('SELECT data FROM heroes WHERE name = ?').get(name);
      if (row === undefined) {
        res.writeHead(404, { 'Cache-Control': 'no-store' }).end();
        return;
      }
      sendText(res, 200, row.data);
      return;
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      if (!body.startsWith('{')) {
        res.writeHead(400).end();
        return;
      }
      db.prepare('INSERT INTO heroes (name, data) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET data = excluded.data').run(name, body);
      res.writeHead(204).end();
      return;
    }
    res.writeHead(405).end();
    return;
  }

  if (parts[1] === 'mail') {
    if (req.method === 'GET' && parts[2] === 'list') {
      const name = decodeURIComponent(parts.slice(3).join('/'));
      if (!saneName(name)) {
        sendJson(res, 403, { error: 'bad name' });
        return;
      }
      const rows = db.prepare('SELECT id, label FROM mail WHERE dest = ? ORDER BY id').all(name);
      sendJson(res, 200, rows.map((r) => ({ id: r.id, label: r.label })));
      return;
    }
    if (req.method === 'POST' && parts[2] === 'send') {
      const body = await readJson(req);
      const { from, dest, label, contents } = body ?? {};
      if (!saneName(dest) || typeof contents !== 'string' || !contents.startsWith('{')) {
        sendText(res, 400, 'Error: malformed mail');
        return;
      }
      db.prepare('INSERT INTO mail (dest, label, contents) VALUES (?, ?, ?)').run(
        dest,
        String(label ?? 'Package').slice(0, 60),
        contents
      );
      console.log(`[server] mail from ${from ?? '?'} to ${dest}`);
      sendText(res, 200, '');
      return;
    }
    if (req.method === 'POST' && parts[2] === 'take') {
      const body = await readJson(req);
      const { name, id } = body ?? {};
      if (!saneName(name) || !Number.isInteger(id) || id < 1) {
        sendText(res, 400, 'Error: bad take');
        return;
      }
      const row = db.prepare('SELECT id, contents FROM mail WHERE dest = ? AND id = ?').get(name, id);
      if (row === undefined) {
        sendText(res, 404, 'Error: no such mail');
        return;
      }
      db.prepare('DELETE FROM mail WHERE id = ?').run(row.id);
      sendText(res, 200, row.contents);
      return;
    }
    res.writeHead(405).end();
    return;
  }

  if (parts[1] === 'clan') {
    if (req.method === 'GET') {
      const clan = decodeURIComponent(parts.slice(2).join('/')).trim();
      const row = db.prepare('SELECT * FROM clans WHERE name = ? COLLATE NOCASE').get(clan);
      if (row === undefined) {
        sendText(res, 200, '');
        return;
      }
      const { members, power } = clanRoster(row.name);
      sendText(res, 200, `${row.leader}|${members}|${power}|${row.ability}`);
      return;
    }
    if (req.method === 'POST' && parts[2] === 'make') {
      const { name, clan } = await readJson(req);
      if (!saneName(name) || typeof clan !== 'string' || clan.trim().length < 2) {
        sendText(res, 400, 'Error: bad clan');
        return;
      }
      const exists = db.prepare('SELECT 1 FROM clans WHERE name = ? COLLATE NOCASE').get(clan.trim());
      if (exists) {
        sendText(res, 200, 'Error: clan already exists');
        return;
      }
      db.prepare('INSERT INTO clans (name, leader) VALUES (?, ?)').run(clan.trim(), name);
      console.log(`[server] clan created: ${clan.trim()} by ${name}`);
      sendText(res, 200, '');
      return;
    }
    if (req.method === 'POST' && parts[2] === 'kill') {
      const { name, clan } = await readJson(req);
      const row = db.prepare('SELECT * FROM clans WHERE name = ? COLLATE NOCASE').get(String(clan ?? '').trim());
      if (row === undefined) {
        sendText(res, 200, 'Error: no such clan');
        return;
      }
      if (row.leader !== name) {
        sendText(res, 200, 'Error: only the leader may disband');
        return;
      }
      db.prepare('DELETE FROM clans WHERE name = ?').run(row.name);
      console.log(`[server] clan disbanded: ${row.name}`);
      sendText(res, 200, '');
      return;
    }
    res.writeHead(405).end();
    return;
  }

  if (parts[1] === 'rank') {
    if (req.method === 'GET') {
      sendText(res, 200, buildRankings());
      return;
    }
    if (req.method === 'POST' && parts[2] === 'score') {
      const { name, rank } = await readJson(req);
      if (!saneName(name) || typeof rank !== 'string' || !rank.startsWith('{')) {
        sendText(res, 400, 'Error: bad score');
        return;
      }
      db.prepare('INSERT INTO scores (name, rank, updated) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(name) DO UPDATE SET rank = excluded.rank, updated = excluded.updated').run(name, rank);
      sendText(res, 200, '');
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
  initDb();
  await startServer();
}

export { initDb, DB_FILE };
