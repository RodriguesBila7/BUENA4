import { Router } from 'express';
import { getDb } from '../db.js';
import { requireSystemSettingsPermission } from '../middleware/auth.js';

const router = Router();

function denySecondaryUsers(req, res, next) {
  const isSecondaryHeader = req.headers['x-is-secondary'] === 'true' || req.headers['x-secondary'] === 'true';
  const hasDelegatedRole = req.user && req.user.delegatedRole;

  if (isSecondaryHeader || (hasDelegatedRole && (req.headers['x-user-role'] === req.user.delegatedRole || req.user.isSecondaryActive))) {
    return res.status(403).json({
      error: 'Acesso Negado (403 Forbidden)',
      message: 'Utilizadores a operar sob perfil secundário / delegado não possuem permissão para criar, alterar ou eliminar Tipos de Actos Administrativos.'
    });
  }
  next();
}

// GET all act types
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM act_types ORDER BY group_name ASC, act_name ASC').all();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new act type
router.post('/', requireSystemSettingsPermission, denySecondaryUsers, (req, res) => {
  try {
    const db = getDb();
    const { group_name, act_name, is_active } = req.body;
    const id = 'actt_' + Math.random().toString(36).substr(2, 9);
    
    db.prepare('INSERT INTO act_types (id, group_name, act_name, is_active) VALUES (?, ?, ?, ?)')
      .run(id, group_name, act_name, is_active === undefined ? 1 : is_active);
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update act type
router.put('/:id', requireSystemSettingsPermission, denySecondaryUsers, (req, res) => {
  try {
    const db = getDb();
    const { group_name, act_name, is_active } = req.body;
    
    db.prepare('UPDATE act_types SET group_name = ?, act_name = ?, is_active = ? WHERE id = ?')
      .run(group_name, act_name, is_active, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE act type
router.delete('/:id', requireSystemSettingsPermission, denySecondaryUsers, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM act_types WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
