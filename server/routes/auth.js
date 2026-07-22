/**
 * server/routes/auth.js
 * Autenticacao, Utilizadores e Perfis (Roles)
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { generateToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// ─── ROLES ────────────────────────────────────────────────────────────────────
router.get('/roles', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM roles ORDER BY name').all();
    res.json(rows.map(r => ({ ...r, permissions: JSON.parse(r.permissions) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/roles', (req, res) => {
  const { id, name, description, permissions } = req.body;
  if (!name || !id) return res.status(400).json({ error: 'id e name obrigatorios' });
  try {
    const db = getDb();
    db.prepare('INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)').run(id, name, description || '', JSON.stringify(permissions || {}));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/roles/:id', (req, res) => {
  const { name, description, permissions } = req.body;
  try {
    const db = getDb();
    db.prepare('UPDATE roles SET name = ?, description = ?, permissions = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, description || '', JSON.stringify(permissions || {}), req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/roles/:id', (req, res) => {
  try {
    const db = getDb();
    const hasUsers = db.prepare('SELECT id FROM users WHERE role_id = ? LIMIT 1').get(req.params.id);
    if (hasUsers) return res.status(409).json({ error: 'has_users' });
    db.prepare('DELETE FROM roles WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── USERS ────────────────────────────────────────────────────────────────────
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id, name, username, email, contact, role_id as roleId, delegated_role_id as delegatedRoleId, delegation_start_date as delegationStartDate, delegation_end_date as delegationEndDate, status, directorate_id as directorateId, department_id as departmentId, division_id as divisionId, section_id as sectionId, avatar, created_at as createdAt FROM users ORDER BY name').all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/users', (req, res) => {
  const u = req.body;
  if (!u.id || !u.username || !u.password) return res.status(400).json({ error: 'id, username, password obrigatorios' });
  try {
    const db = getDb();
    const dup = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
    if (dup) return res.status(409).json({ error: 'duplicate_username' });
    const hashedPassword = bcrypt.hashSync(u.password, 10);
    db.prepare(`INSERT INTO users (id, name, username, email, contact, password, role_id, delegated_role_id, delegation_start_date, delegation_end_date, status, directorate_id, department_id, division_id, section_id, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(u.id, u.name, u.username, u.email||null, u.contact||null, hashedPassword, u.roleId||null, u.delegatedRoleId||null, u.delegationStartDate||null, u.delegationEndDate||null, u.status||'Ativo', u.directorateId||null, u.departmentId||null, u.divisionId||null, u.sectionId||null, u.avatar||null);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', (req, res) => {
  const u = req.body;
  try {
    const db = getDb();
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(u.username, req.params.id);
    if (dup) return res.status(409).json({ error: 'duplicate_username' });
    const fields = `name = ?, username = ?, email = ?, contact = ?, role_id = ?, delegated_role_id = ?, delegation_start_date = ?, delegation_end_date = ?, status = ?, directorate_id = ?, department_id = ?, division_id = ?, section_id = ?, avatar = ?, updated_at = datetime('now')`;
    const params = [u.name, u.username, u.email||null, u.contact||null, u.roleId||null, u.delegatedRoleId||null, u.delegationStartDate||null, u.delegationEndDate||null, u.status||'Ativo', u.directorateId||null, u.departmentId||null, u.divisionId||null, u.sectionId||null, u.avatar||null, req.params.id];
    if (u.password) {
      const hashedPassword = bcrypt.hashSync(u.password, 10);
      db.prepare(`UPDATE users SET ${fields}, password = ? WHERE id = ?`).run(...params.slice(0,-1), hashedPassword, req.params.id);
    } else {
      db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...params);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username e password obrigatorios' });
    try {
      const db = getDb();
      const user = db.prepare(`
        SELECT 
          u.id, u.name, u.username, u.email, u.contact, u.password, u.status, u.avatar,
          u.role_id, u.delegated_role_id, u.delegation_start_date, u.delegation_end_date,
          u.directorate_id as directorateId, u.department_id as departmentId, 
          u.division_id as divisionId, u.section_id as sectionId,
          r.name as roleName, r.permissions as rolePermissions,
          dr.name as delegatedRoleName, dr.permissions as delegatedRolePermissions
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        LEFT JOIN roles dr ON u.delegated_role_id = dr.id
        WHERE u.username = ? AND u.status = 'Ativo'
      `).get(username);
      
      if (!user) return res.status(401).json({ error: 'invalid_credentials' });
      
      const isValid = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') 
        ? bcrypt.compareSync(password, user.password)
        : password === user.password;
  
      if (!isValid) return res.status(401).json({ error: 'invalid_credentials' });
      
      if (password === user.password && isValid) {
          db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), user.id);
      }
      
      const today = new Date().toISOString().split('T')[0];
      let activeRoleId = user.role_id;
      let activeRoleName = user.roleName;
      let activePermissions = user.rolePermissions;
      let isDelegated = false;

      if (user.delegated_role_id && user.delegation_start_date && user.delegation_end_date) {
        if (today >= user.delegation_start_date && today <= user.delegation_end_date) {
          activeRoleId = user.delegated_role_id;
          activeRoleName = user.delegatedRoleName;
          activePermissions = user.delegatedRolePermissions;
          isDelegated = true;
        }
      }
      
      const { password: _, ...safeUser } = user;
      safeUser.roleId = activeRoleId;
      safeUser.role = activeRoleId; 
      safeUser.roleName = activeRoleName;
      safeUser.isDelegated = isDelegated;
      
      const token = generateToken(user);
      res.json({ success: true, token, user: { ...safeUser, permissions: activePermissions ? JSON.parse(activePermissions) : {} } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── MIGRATE — importar do localStorage ────────────────────────────────────────
router.post('/migrate', (req, res) => {
  const { users, roles } = req.body;
  const db = getDb();
  const migrate = db.transaction(() => {
    let counts = { roles: 0, users: 0 };
    (roles || []).forEach(r => {
      try {
        db.prepare('INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)').run(r.id, r.name, r.description||'', JSON.stringify(r.permissions||{}));
        counts.roles++;
      } catch(e) { console.warn('Role ignorado:', r.id, e.message); }
    });
    (users || []).forEach(u => {
      try {
        const hashedPassword = bcrypt.hashSync(u.password || 'admin', 10);
        db.prepare(`INSERT OR IGNORE INTO users (id, name, username, email, contact, password, role_id, status, directorate_id, department_id, division_id, section_id, avatar)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(u.id, u.name, u.username, u.email||null, u.contact||null, hashedPassword, u.roleId||null, u.status||'Ativo', u.directorateId||null, u.departmentId||null, u.divisionId||null, u.sectionId||null, u.avatar||null);
        counts.users++;
      } catch(e) { console.warn('User ignorado:', u.username, e.message); }
    });
    return counts;
  });
  try { res.json({ success: true, counts: migrate() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
