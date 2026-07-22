/**
 * server/routes/generic.js
 * Rotas genericas para modulos que armazenam dados como JSON (documents):
 * - admin-acts
 * - disciplinary
 * - transfers
 * - evaluations
 * - effectiveness
 * - audit
 * - settings
 */

import { Router } from 'express';
import { getDb } from '../db.js';

/**
 * Cria um router CRUD simples para uma tabela que guarda registos como JSON.
 * A tabela deve ter: id TEXT PRIMARY KEY, data TEXT NOT NULL
 */
export function createGenericRouter(tableName) {
  const router = Router();

  // GET /api/<module>
  router.get('/', (req, res) => {
    try {
      const db = getDb();
      const rows = db.prepare(`SELECT id, data, created_at, updated_at FROM ${tableName} ORDER BY created_at DESC`).all();
      res.json(rows.map(r => ({ ...JSON.parse(r.data), id: r.id, _createdAt: r.created_at, _updatedAt: r.updated_at })));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/<module>/:id
  router.get('/:id', (req, res) => {
    try {
      const db = getDb();
      const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(req.params.id);
      if (!row) return res.status(404).json({ error: 'not_found' });
      res.json({ ...JSON.parse(row.data), id: row.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/<module>
  router.post('/', (req, res) => {
    const record = req.body;
    if (!record.id) return res.status(400).json({ error: 'id obrigatorio' });
    try {
      const db = getDb();
      db.prepare(`INSERT INTO ${tableName} (id, data) VALUES (?, ?)`).run(record.id, JSON.stringify(record));
      res.json({ success: true, id: record.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT /api/<module>/:id
  router.put('/:id', (req, res) => {
    try {
      const db = getDb();
      db.prepare(`UPDATE ${tableName} SET data = ?, updated_at = datetime('now') WHERE id = ?`).run(JSON.stringify(req.body), req.params.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/<module>/:id
  router.delete('/:id', (req, res) => {
    try {
      const db = getDb();
      db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(req.params.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/<module>/migrate — importar array do localStorage
  router.post('/migrate', (req, res) => {
    const { records } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Array esperado' });
    const db = getDb();
    const migrate = db.transaction((list) => {
      let count = 0;
      list.forEach(r => {
        if (!r.id) return;
        db.prepare(`INSERT OR IGNORE INTO ${tableName} (id, data) VALUES (?, ?)`).run(r.id, JSON.stringify(r));
        count++;
      });
      return count;
    });
    try { res.json({ success: true, migrated: migrate(records) }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
}

// ─── Configuracoes (key-value) ────────────────────────────────────────────────
export const settingsRouter = Router();

settingsRouter.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM app_settings').all();
    const obj = {};
    rows.forEach(r => { try { obj[r.key] = JSON.parse(r.value); } catch { obj[r.key] = r.value; } });
    res.json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

settingsRouter.put('/', (req, res) => {
  const settings = req.body;
  const db = getDb();
  const upsert = db.transaction((obj) => {
    Object.entries(obj).forEach(([key, value]) => {
      db.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(key, JSON.stringify(value));
    });
  });
  try { upsert(settings); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

settingsRouter.post('/migrate', (req, res) => {
  const settings = req.body;
  const db = getDb();
  try {
    Object.entries(settings || {}).forEach(([key, value]) => {
      db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Auditoria ────────────────────────────────────────────────────────────────
export const auditRouter = Router();

auditRouter.get('/', (req, res) => {
  try {
    const db = getDb();
    const { limit = 500, module, user } = req.query;
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];
    if (module) { query += ' AND module = ?'; params.push(module); }
    if (user)   { query += ' AND user = ?';   params.push(user); }
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Number(limit));
    res.json(db.prepare(query).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

auditRouter.post('/', (req, res) => {
  const { user, action, module, details } = req.body;
  if (!user || !action || !module) return res.status(400).json({ error: 'user, action, module obrigatorios' });
  try {
    const db = getDb();
    
    // Capturar IP real e User-Agent
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const enrichedDetails = details ? `${details} | IP: ${ip} | UA: ${userAgent}` : `IP: ${ip} | UA: ${userAgent}`;

    const result = db.prepare('INSERT INTO audit_log (user, action, module, details) VALUES (?, ?, ?, ?)').run(user, action, module, enrichedDetails);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Seguranca ────────────────────────────────────────────────────────────────
export const securityRouter = Router();

securityRouter.get('/', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT data FROM security_settings WHERE id = 1').get();
    res.json(row ? JSON.parse(row.data) : {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

securityRouter.put('/', (req, res) => {
  try {
    const db = getDb();
    db.prepare("INSERT INTO security_settings (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data").run(JSON.stringify(req.body));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
