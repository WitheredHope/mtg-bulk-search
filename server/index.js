// Minimal zero-dependency API + static file server.
// Replaces Supabase: card lists and set groups are stored in a JSON file
// (DATA_DIR/db.json), and the built frontend is served from ../dist.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// ---------- storage ----------

const loadDb = () => {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { cardLists: [], setGroups: [] };
  }
};

const saveDb = (db) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
};

let db = loadDb();

// ---------- helpers ----------

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 5_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });

// ---------- API ----------

const handleApi = async (req, res, pathname) => {
  const listMatch = pathname.match(/^\/api\/lists(?:\/([^/]+))?$/);
  const groupMatch = pathname.match(/^\/api\/set-groups(?:\/([^/]+))?$/);

  if (listMatch) {
    const id = listMatch[1];

    if (req.method === 'GET' && !id) {
      const lists = [...db.cardLists].sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      );
      return sendJson(res, 200, lists);
    }

    if (req.method === 'POST' && !id) {
      const body = await readBody(req);
      if (!body.name || !Array.isArray(body.cards)) {
        return sendJson(res, 400, { error: 'name and cards are required' });
      }
      const now = new Date().toISOString();
      const list = {
        id: crypto.randomUUID(),
        name: body.name,
        cards: body.cards,
        created_at: now,
        updated_at: now,
      };
      db.cardLists.push(list);
      saveDb(db);
      return sendJson(res, 201, list);
    }

    if (req.method === 'PUT' && id) {
      const body = await readBody(req);
      const list = db.cardLists.find((l) => l.id === id);
      if (!list) return sendJson(res, 404, { error: 'List not found' });
      if (body.name !== undefined) list.name = body.name;
      if (body.cards !== undefined) list.cards = body.cards;
      list.updated_at = new Date().toISOString();
      saveDb(db);
      return sendJson(res, 200, list);
    }

    if (req.method === 'DELETE' && id) {
      const before = db.cardLists.length;
      db.cardLists = db.cardLists.filter((l) => l.id !== id);
      if (db.cardLists.length === before) {
        return sendJson(res, 404, { error: 'List not found' });
      }
      saveDb(db);
      return sendJson(res, 200, { ok: true });
    }
  }

  if (groupMatch) {
    const id = groupMatch[1];

    if (req.method === 'GET' && !id) {
      return sendJson(res, 200, db.setGroups);
    }

    if (req.method === 'POST' && !id) {
      const body = await readBody(req);
      if (!body.name) {
        return sendJson(res, 400, { error: 'name is required' });
      }
      const group = {
        id: crypto.randomUUID(),
        name: body.name,
        sets: Array.isArray(body.sets) ? body.sets : [],
      };
      db.setGroups.push(group);
      saveDb(db);
      return sendJson(res, 201, group);
    }

    if (req.method === 'PUT' && id) {
      const body = await readBody(req);
      const group = db.setGroups.find((g) => g.id === id);
      if (!group) return sendJson(res, 404, { error: 'Group not found' });
      if (body.name !== undefined) group.name = body.name;
      if (body.sets !== undefined) group.sets = body.sets;
      saveDb(db);
      return sendJson(res, 200, group);
    }

    if (req.method === 'DELETE' && id) {
      const before = db.setGroups.length;
      db.setGroups = db.setGroups.filter((g) => g.id !== id);
      if (db.setGroups.length === before) {
        return sendJson(res, 404, { error: 'Group not found' });
      }
      saveDb(db);
      return sendJson(res, 200, { ok: true });
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
};

// ---------- static files ----------

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const serveStatic = (res, pathname) => {
  const safePath = path
    .normalize(pathname)
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');
  let filePath = path.join(DIST_DIR, safePath);

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback: let React Router handle the route
    filePath = path.join(DIST_DIR, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    return res.end('Not found — did you run "npm run build"?');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
};

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
    } else if (req.method === 'GET') {
      serveStatic(res, pathname);
    } else {
      res.writeHead(405);
      res.end('Method not allowed');
    }
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`mtg-bulk-search running at http://localhost:${PORT}`);
  console.log(`Data stored in ${DB_FILE}`);
});
