/**
 * server/routes/auth.js
 * Autenticacao, Utilizadores e Perfis (Roles)
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';

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
    const rows = db.prepare('SELECT id, name, username, nuit, email, contact, role_id as roleId, delegated_role_id as delegatedRoleId, delegation_start_date as delegationStartDate, delegation_end_date as delegationEndDate, delegation_status as delegationStatus, delegation_requested_by as delegationRequestedBy, delegation_approved_by as delegationApprovedBy, status, directorate_id as directorateId, department_id as departmentId, division_id as divisionId, section_id as sectionId, avatar, created_at as createdAt FROM users ORDER BY name').all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/users', (req, res) => {
  const u = req.body;
  if (!u.id || !u.username || !u.password) return res.status(400).json({ error: 'id, username, password obrigatorios' });
  try {
    const db = getDb();
    const dup = db.prepare('SELECT id FROM users WHERE username = ? OR (nuit IS NOT NULL AND nuit = ? AND nuit != \'\')').get(u.username, u.nuit || '');
    if (dup) return res.status(409).json({ error: 'duplicate_username' });
    const hashedPassword = bcrypt.hashSync(u.password, 10);
    db.prepare(`INSERT INTO users (id, name, username, nuit, email, contact, password, role_id, delegated_role_id, delegation_start_date, delegation_end_date, delegation_status, delegation_requested_by, delegation_approved_by, status, directorate_id, department_id, division_id, section_id, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(u.id, u.name, u.username, u.nuit||null, u.email||null, u.contact||null, hashedPassword, u.roleId||null, u.delegatedRoleId||null, u.delegationStartDate||null, u.delegationEndDate||null, u.delegationStatus||'Aprovado', u.delegationRequestedBy||null, u.delegationApprovedBy||null, u.status||'Ativo', u.directorateId||null, u.departmentId||null, u.divisionId||null, u.sectionId||null, u.avatar||null);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', (req, res) => {
  const u = req.body;
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'user_not_found' });

    const name = u.name !== undefined ? u.name : existing.name;
    const username = u.username !== undefined ? u.username : existing.username;
    const nuit = u.nuit !== undefined ? u.nuit : existing.nuit;
    const email = u.email !== undefined ? u.email : existing.email;
    const contact = u.contact !== undefined ? u.contact : existing.contact;
    const roleId = u.roleId !== undefined ? u.roleId : existing.role_id;
    const delegatedRoleId = u.delegatedRoleId !== undefined ? u.delegatedRoleId : existing.delegated_role_id;
    const delegationStartDate = u.delegationStartDate !== undefined ? u.delegationStartDate : existing.delegation_start_date;
    const delegationEndDate = u.delegationEndDate !== undefined ? u.delegationEndDate : existing.delegation_end_date;
    const delegationStatus = u.delegationStatus !== undefined ? u.delegationStatus : existing.delegation_status;
    const delegationRequestedBy = u.delegationRequestedBy !== undefined ? u.delegationRequestedBy : existing.delegation_requested_by;
    const delegationApprovedBy = u.delegationApprovedBy !== undefined ? u.delegationApprovedBy : existing.delegation_approved_by;
    const status = u.status !== undefined ? u.status : existing.status;
    const directorateId = u.directorateId !== undefined ? u.directorateId : existing.directorate_id;
    const departmentId = u.departmentId !== undefined ? u.departmentId : existing.department_id;
    const divisionId = u.divisionId !== undefined ? u.divisionId : existing.division_id;
    const sectionId = u.sectionId !== undefined ? u.sectionId : existing.section_id;
    const avatar = u.avatar !== undefined ? u.avatar : existing.avatar;

    if (username && username !== existing.username) {
      const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.id);
      if (dup) return res.status(409).json({ error: 'duplicate_username' });
    }

    const fields = `name = ?, username = ?, nuit = ?, email = ?, contact = ?, role_id = ?, delegated_role_id = ?, delegation_start_date = ?, delegation_end_date = ?, delegation_status = ?, delegation_requested_by = ?, delegation_approved_by = ?, status = ?, directorate_id = ?, department_id = ?, division_id = ?, section_id = ?, avatar = ?, updated_at = datetime('now')`;
    const params = [name, username, nuit||null, email||null, contact||null, roleId||null, delegatedRoleId||null, delegationStartDate||null, delegationEndDate||null, delegationStatus||'Aprovado', delegationRequestedBy||null, delegationApprovedBy||null, status||'Ativo', directorateId||null, departmentId||null, divisionId||null, sectionId||null, avatar||null];

    if (u.password && u.password.trim() !== '') {
      const hashedPassword = bcrypt.hashSync(u.password, 10);
      db.prepare(`UPDATE users SET ${fields}, password = ? WHERE id = ?`).run(...params, hashedPassword, req.params.id);
    } else {
      db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...params, req.params.id);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/confirm-delegation', (req, res) => {
  try {
    const db = getDb();
    const { approvedBy } = req.body;
    db.prepare(`UPDATE users SET delegation_status = 'Aprovado', delegation_approved_by = ? WHERE id = ?`)
      .run(approvedBy || 'Perfil Superior Central', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/reject-delegation', (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE users SET delegation_status = 'Rejeitado' WHERE id = ?`).run(req.params.id);
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
    const candidateUsers = db.prepare(`
      SELECT 
        u.id, u.name, u.username, u.nuit, u.email, u.contact, u.password, u.status, u.avatar,
        u.role_id, u.delegated_role_id, u.delegation_start_date, u.delegation_end_date,
        u.delegation_status as delegationStatus, u.delegation_requested_by as delegationRequestedBy, u.delegation_approved_by as delegationApprovedBy,
        u.directorate_id as directorateId, u.department_id as departmentId, 
        u.division_id as divisionId, u.section_id as sectionId,
        r.name as roleName, r.permissions as rolePermissions,
        dr.name as delegatedRoleName, dr.permissions as delegatedRolePermissions
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      LEFT JOIN roles dr ON u.delegated_role_id = dr.id
      WHERE (LOWER(u.username) = LOWER(?) OR LOWER(u.nuit) = LOWER(?) OR LOWER(u.email) = LOWER(?) OR LOWER(r.name) = LOWER(?) OR LOWER(r.id) = LOWER(?))
        AND u.status = 'Ativo'
    `).all(username, username, username, username, username);
    
    if (!candidateUsers || candidateUsers.length === 0) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    
    // Encontrar o utilizador cuja palavra-passe coincide com a palavra-passe fornecida
    const cleanPwd = (password || '').trim();
    const matchingUser = candidateUsers.find(user => {
      // Aceita senhas padrão mestras de administrador/gestor
      const isAdm = user.username?.toLowerCase() === 'admin' || user.role_id === 'super_admin' || user.role_id === 'super_admin_1' || user.role_id === 'usuario_admin';
      if (isAdm && (cleanPwd === 'admin123' || cleanPwd === '55555' || cleanPwd === 'admin')) {
        return true;
      }
      return user.password.startsWith('$2a$') || user.password.startsWith('$2b$') 
        ? bcrypt.compareSync(cleanPwd, user.password)
        : cleanPwd === user.password;
    });

    if (!matchingUser) return res.status(401).json({ error: 'invalid_credentials' });
    
    // Atualizar hash se a senha na BD estava em texto simples
    if (matchingUser.password === password) {
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), matchingUser.id);
    }
    
    const today = new Date().toISOString().split('T')[0];
    let activeRoleId = matchingUser.role_id;
    let activeRoleName = matchingUser.roleName;
    let activePermissions = matchingUser.rolePermissions;
    let isDelegated = false;

    // Ativar perfil secundario/delegado APENAS SE ESTIVER APROVADO pelos perfis superiores
    const isApproved = matchingUser.delegationStatus === 'Aprovado' || !matchingUser.delegationStatus;

    if (isApproved && matchingUser.delegated_role_id && matchingUser.delegation_start_date && matchingUser.delegation_end_date) {
      if (today >= matchingUser.delegation_start_date && today <= matchingUser.delegation_end_date) {
        activeRoleId = matchingUser.delegated_role_id;
        activeRoleName = matchingUser.delegatedRoleName;
        activePermissions = matchingUser.delegatedRolePermissions;
        isDelegated = true;
      }
    }
    
    const { password: _, ...safeUser } = matchingUser;
    safeUser.roleId = activeRoleId;
    safeUser.role = activeRoleId; 
    safeUser.roleName = activeRoleName;
    safeUser.isDelegated = isDelegated;
    
    res.json({ success: true, user: { ...safeUser, permissions: activePermissions ? JSON.parse(activePermissions) : {} } });
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
