'use strict';
// Uses the exact pinned Kuma SQLite driver. Never writes users/settings or prints DB content.
const http = require('node:http');
const sqlite3 = require('/app/node_modules/@louislam/sqlite3');
const dbFile = '/app/data/kuma.db';
function nativeReady() {
  return new Promise(resolve => {
    const db = new sqlite3.Database(dbFile, sqlite3.OPEN_READONLY, err => {
      if (err) { resolve(false); return; }
      db.all('SELECT id FROM user WHERE active = 1 LIMIT 1', [], (userErr, users) => {
        if (userErr || !users || users.length !== 1) { db.close(); resolve(false); return; }
        db.get('SELECT value FROM setting WHERE key = ?', ['disableAuth'], (settingErr, row) => {
          let authDisabled = false;
          try { authDisabled = row ? JSON.parse(row.value) !== false : false; }
          catch { authDisabled = true; }
          db.close(); resolve(!settingErr && !authDisabled);
        });
      });
    });
  });
}
function reachable() {
  return new Promise(resolve => {
    const req = http.get('http://127.0.0.1:3001/', { timeout: 1500 }, response => {
      response.resume(); resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}
http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method) || !['/livez', '/healthz'].includes(req.url)) {
    res.writeHead(404); res.end(); return;
  }
  let ok = await reachable();
  if (req.url === '/healthz') ok = ok && process.env.KUMA_BOOTSTRAP_COMPLETE === 'true' && await nativeReady();
  res.writeHead(ok ? 200 : 503, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
  res.end(ok ? 'ok' : 'not ready');
}).listen(3002, '127.0.0.1');
