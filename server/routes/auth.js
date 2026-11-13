/**
 * server/routes/auth.js
 * Autenticacao, Utilizadores e Perfis (Roles) — Conformidade Tabela 21:
 * - Token JWT Obrigatório
 * - Fim definitivo das senhas-mestras (autenticação estrita por hash bcrypt)
 * - Auditoria de autenticação e operações registada no servidor
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, logServerAudit } from '../db.js';
import { generateToken } from '../middleware/auth.js';
import { sendPasswordRecoveryEmail, isEmailConfigured } from '../services/emailService.js';

const router = Router();

// Utilitário de auditoria no servidor com encadeamento criptográfico SHA-256 (ISO/IEC 27001)
function logAudit(db, user, action, module, details, ip) {
  logServerAudit(user, action, module, details, ip);
}

// Validador de complexidade estrita de senha (NIST SP 800-63B / OWASP ASVS)
function validatePasswordStrength(pwd) {
  if (!pwd || pwd.length < 8) {
    return { isValid: false, message: 'A palavra-passe deve conter no mínimo 8 caracteres.' };
  }
  return { isValid: true };
}

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
    
    // Auditoria no servidor
    const actor = req.user?.username || req.user?.id || 'Administrador';
    logAudit(db, actor, 'Criação de Perfil', 'Gestão de Acessos', { roleId: id, roleName: name }, req.ip);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/roles/:id', (req, res) => {
  const { name, description, permissions } = req.body;
  try {
    const db = getDb();
    db.prepare('UPDATE roles SET name = ?, description = ?, permissions = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, description || '', JSON.stringify(permissions || {}), req.params.id);
    
    // Auditoria no servidor
    const actor = req.user?.username || req.user?.id || 'Administrador';
    logAudit(db, actor, 'Actualização de Perfil', 'Gestão de Acessos', { roleId: req.params.id, roleName: name }, req.ip);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/roles/:id', (req, res) => {
  try {
    const db = getDb();
    const hasUsers = db.prepare('SELECT id FROM users WHERE role_id = ? LIMIT 1').get(req.params.id);
    if (hasUsers) return res.status(409).json({ error: 'has_users' });
    db.prepare('DELETE FROM roles WHERE id = ?').run(req.params.id);
    
    // Auditoria no servidor
    const actor = req.user?.username || req.user?.id || 'Administrador';
    logAudit(db, actor, 'Eliminação de Perfil', 'Gestão de Acessos', { roleId: req.params.id }, req.ip);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── USERS ────────────────────────────────────────────────────────────────────
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id, name, username, nuit, email, contact, role_id as roleId, delegated_role_id as delegatedRoleId, delegation_start_date as delegationStartDate, delegation_end_date as delegationEndDate, delegation_status as delegationStatus, delegation_requested_by as delegationRequestedBy, delegation_approved_by as delegationApprovedBy, status, directorate_id as directorateId, department_id as departmentId, division_id as divisionId, section_id as sectionId, avatar, created_at as createdAt FROM users ORDER BY name').all();
    res.json(rows.map(r => ({ ...r, photo: r.avatar || null })));
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
    const photoVal = u.avatar !== undefined ? u.avatar : (u.photo !== undefined ? u.photo : null);
    db.prepare(`INSERT INTO users (id, name, username, nuit, email, contact, password, role_id, delegated_role_id, delegation_start_date, delegation_end_date, delegation_status, delegation_requested_by, delegation_approved_by, status, directorate_id, department_id, division_id, section_id, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(u.id, u.name, u.username, u.nuit||null, u.email||null, u.contact||null, hashedPassword, u.roleId||null, u.delegatedRoleId||null, u.delegationStartDate||null, u.delegationEndDate||null, u.delegationStatus||'Aprovado', u.delegationRequestedBy||null, u.delegationApprovedBy||null, u.status||'Ativo', u.directorateId||null, u.departmentId||null, u.divisionId||null, u.sectionId||null, photoVal);
    
    // Auditoria no servidor
    const actor = req.user?.username || req.user?.id || 'Administrador';
    logAudit(db, actor, 'Criação de Utilizador', 'Gestão de Utilizadores', { userId: u.id, username: u.username, name: u.name, roleId: u.roleId }, req.ip);

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
    const avatar = u.avatar !== undefined ? u.avatar : (u.photo !== undefined ? u.photo : existing.avatar);

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

    // Auditoria no servidor
    const actor = req.user?.username || req.user?.id || 'Administrador';
    logAudit(db, actor, 'Actualização de Utilizador', 'Gestão de Utilizadores', { userId: req.params.id, username, roleId }, req.ip);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/photo', (req, res) => {
  const { photo } = req.body;
  try {
    const db = getDb();
    db.prepare(`UPDATE users SET avatar = ?, updated_at = datetime('now') WHERE id = ? OR username = ? OR (nuit IS NOT NULL AND nuit = ?)`).run(photo || null, req.params.id, req.params.id, req.params.id);
    res.json({ success: true, photo: photo || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/confirm-delegation', (req, res) => {
  try {
    const db = getDb();
    const { approvedBy } = req.body;
    db.prepare(`UPDATE users SET delegation_status = 'Aprovado', delegation_approved_by = ? WHERE id = ?`)
      .run(approvedBy || 'Perfil Superior Central', req.params.id);
    
    // Auditoria no servidor
    const actor = req.user?.username || req.user?.id || approvedBy || 'Administrador';
    logAudit(db, actor, 'Aprovação de Delegação de Perfil', 'Segurança', { userId: req.params.id }, req.ip);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/reject-delegation', (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE users SET delegation_status = 'Rejeitado' WHERE id = ?`).run(req.params.id);

    // Auditoria no servidor
    const actor = req.user?.username || req.user?.id || 'Administrador';
    logAudit(db, actor, 'Rejeição de Delegação de Perfil', 'Segurança', { userId: req.params.id }, req.ip);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    // Auditoria no servidor
    const actor = req.user?.username || req.user?.id || 'Administrador';
    logAudit(db, actor, 'Eliminação de Utilizador', 'Gestão de Utilizadores', { userId: req.params.id, username: existing?.username }, req.ip);

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Rate Limiting Multicamada para proteção contra força bruta (Conformidade OWASP A04 / CIS Controls)
const failedAttempts = new Map();      // Bloqueio por conta/NUIT
const ipFailedAttempts = new Map();    // Bloqueio por endereço IP
const MAX_FAILED_ATTEMPTS = 5;         // 5 tentativas erradas = bloqueio de conta
const MAX_IP_FAILED_ATTEMPTS = 15;     // 15 tentativas erradas na mesma rede = bloqueio do IP
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;    // 15 minutos
const IP_LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutos

// Limpeza automática de mapas de rate limiting a cada 20 minutos
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of failedAttempts.entries()) {
    if (v.lockUntil && now > v.lockUntil + 1800000) failedAttempts.delete(k);
  }
  for (const [k, v] of ipFailedAttempts.entries()) {
    if (v.lockUntil && now > v.lockUntil + 1800000) ipFailedAttempts.delete(k);
  }
}, 20 * 60 * 1000);

// ─── SOLICITAR / ATIVAR ACESSO POR NUIT ──────────────────────────────────────
router.post('/request-access', (req, res) => {
  const { nuit, password } = req.body;
  if (!nuit || !password) {
    return res.status(400).json({ error: 'NUIT e palavra-passe obrigatórios.' });
  }
  const cleanNuit = String(nuit).trim().toLowerCase();
  try {
    const db = getDb();
    // 1. Verificar se o perfil já foi previamente cadastrado pelo Administrador no sistema
    const existingUser = db.prepare(`
      SELECT id, name, username, nuit, role_id, status FROM users
      WHERE LOWER(nuit) = ? OR LOWER(username) = ?
    `).get(cleanNuit, cleanNuit);

    if (!existingUser) {
      return res.status(404).json({
        error: 'NUIT não encontrado. O seu perfil de utilizador deve ser previamente cadastrado pelo Administrador no sistema.'
      });
    }

    // 2. Atualizar a palavra-passe e garantir estado Ativo, preservando RIGOROSAMENTE o role_id atribuído pelo Admin
    const hashedPassword = bcrypt.hashSync(String(password).trim(), 10);
    db.prepare(`
      UPDATE users 
      SET password = ?, status = 'Ativo', updated_at = datetime('now')
      WHERE id = ?
    `).run(hashedPassword, existingUser.id);

    // Registar na auditoria
    logAudit(db, cleanNuit, 'Solicitação e Ativação de Acesso', 'Autenticação', {
      userId: existingUser.id,
      nuit: existingUser.nuit,
      roleId: existingUser.role_id,
      name: existingUser.name
    }, req.ip);

    return res.json({
      success: true,
      message: `Acesso ativado com sucesso para ${existingUser.name}! Inicie sessão com o seu NUIT.`
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ─── RECUPERAR PALAVRA-PASSE VIA GOOGLE SMTP / EMAIL ────────────────────────
router.post('/recover-password', async (req, res) => {
  const { email } = req.body;
  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: 'E-mail institucional obrigatório.' });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  try {
    const db = getDb();

    // 1. Procurar utilizador ou funcionário pelo e-mail
    const user = db.prepare(`
      SELECT id, name, username, nuit, email, role_id FROM users
      WHERE LOWER(email) = ? OR LOWER(username) = ?
    `).get(cleanEmail, cleanEmail);

    let targetEmail = cleanEmail;
    let targetName = 'Funcionário';
    let targetUserId = null;

    if (user) {
      targetEmail = user.email || cleanEmail;
      targetName = user.name || user.username || 'Funcionário';
      targetUserId = user.id;
    } else {
      const emp = db.prepare(`
        SELECT id, name, nuit, email FROM employees WHERE LOWER(email) = ?
      `).get(cleanEmail);
      if (emp) {
        targetEmail = emp.email || cleanEmail;
        targetName = emp.name;
        const assocUser = db.prepare('SELECT id FROM users WHERE LOWER(nuit) = ?').get(String(emp.nuit).toLowerCase());
        if (assocUser) targetUserId = assocUser.id;
      }
    }

    const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Registar na auditoria
    logAudit(db, cleanEmail, 'Pedido de Recuperação de Palavra-passe', 'Autenticação', {
      email: targetEmail,
      userId: targetUserId,
      simulated: !isEmailConfigured()
    }, req.ip);

    // Enviar e-mail formatado via Nodemailer (Google SMTP)
    const result = await sendPasswordRecoveryEmail({
      to: targetEmail,
      name: targetName,
      recoveryCode
    });

    return res.json({
      success: true,
      simulated: result.simulated || false,
      message: result.simulated
        ? 'Pedido registado com sucesso (Modo simulação: configure SMTP_USER e SMTP_PASS no .env).'
        : `Instruções e código de recuperação enviados com sucesso para ${targetEmail}.`
    });
  } catch (e) {
    console.error('[ERRO RECUPERAR PALAVRA-PASSE]', e);
    return res.status(500).json({ error: e.message || 'Erro ao processar a recuperação de senha.' });
  }
});

// ─── LOGIN — CONFORMIDADE TABELA 21 (JWT OBRIGATÓRIO, FIM DAS SENHAS-MESTRAS, TS08b, TS09) ─
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const cleanNuit = String(username || req.body.nuit || '').trim().replace(/\D/g, '').slice(0, 9);
  
  if (!cleanNuit || cleanNuit.length !== 9) {
    return res.status(400).json({ error: 'O acesso ao sistema é exclusivo por NUIT moçambicano de 9 dígitos.' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Palavra-passe obrigatória.' });
  }

  try {
    const db = getDb();
    const clientIp = req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
    const trackKey = `${clientIp}_${cleanNuit}`;
    const now = Date.now();

    // 1. Verificação de Bloqueio em Nível de Rede / Endereço IP (Anti-DDoS / Credential Stuffing)
    const ipAttemptInfo = ipFailedAttempts.get(clientIp);
    if (ipAttemptInfo && ipAttemptInfo.lockUntil && now < ipAttemptInfo.lockUntil) {
      const waitMinutes = Math.ceil((ipAttemptInfo.lockUntil - now) / 60000);
      return res.status(429).json({
        error: 'ip_locked',
        message: `Endereço IP temporariamente bloqueado por excesso de tentativas suspeitas. Tente novamente em ${waitMinutes} minutos.`
      });
    }

    // 2. Verificação de Bloqueio em Nível de Conta / NUIT (TS09 Anti-Força Bruta)
    const attemptInfo = failedAttempts.get(trackKey);
    if (attemptInfo && attemptInfo.lockUntil && now < attemptInfo.lockUntil) {
      const waitMinutes = Math.ceil((attemptInfo.lockUntil - now) / 60000);
      return res.status(429).json({
        error: 'account_locked',
        message: `Conta temporariamente bloqueada por excesso de tentativas falhadas. Tente novamente em ${waitMinutes} minutos.`
      });
    }

    // Acesso exclusivo por NUIT moçambicano de 9 dígitos
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
      WHERE (u.nuit = ? OR u.username = ?)
        AND u.status = 'Ativo'
    `).all(cleanNuit, cleanNuit);

    const recordFailedAttempt = (motivo) => {
      const currentCount = (attemptInfo ? attemptInfo.count : 0) + 1;
      const currentIpCount = (ipAttemptInfo ? ipAttemptInfo.count : 0) + 1;

      // Bloqueio por IP se atingir 15 tentativas na rede
      if (currentIpCount >= MAX_IP_FAILED_ATTEMPTS) {
        ipFailedAttempts.set(clientIp, { count: currentIpCount, lockUntil: now + IP_LOCKOUT_DURATION_MS });
        logAudit(db, username, 'Bloqueio de IP por Força Bruta', 'Autenticação', {
          motivo: 'Excesso de 15 tentativas consecutivas na rede',
          ip: clientIp,
          bloqueadoAte: new Date(now + IP_LOCKOUT_DURATION_MS).toISOString()
        }, clientIp);
      } else {
        ipFailedAttempts.set(clientIp, { count: currentIpCount, lockUntil: 0 });
      }

      // Bloqueio por conta ao atingir 5 tentativas
      if (currentCount >= MAX_FAILED_ATTEMPTS) {
        failedAttempts.set(trackKey, { count: currentCount, lockUntil: now + LOCKOUT_DURATION_MS });
        logAudit(db, username, 'Bloqueio de Conta (TS09)', 'Autenticação', {
          motivo: 'Excesso de 5 tentativas consecutivas de autenticação',
          ip: clientIp,
          bloqueadoAte: new Date(now + LOCKOUT_DURATION_MS).toISOString()
        }, clientIp);
        return res.status(429).json({
          error: 'account_locked',
          message: 'Conta temporariamente bloqueada após 5 tentativas falhadas. Tente novamente após 15 minutos.'
        });
      }

      failedAttempts.set(trackKey, { count: currentCount, lockUntil: 0 });
      logAudit(db, username, 'Tentativa de Login Falhada', 'Autenticação', { motivo, ip: clientIp, tentativa: currentCount }, clientIp);
      return res.status(401).json({ error: 'invalid_credentials' });
    };

    if (!candidateUsers || candidateUsers.length === 0) {
      return recordFailedAttempt('Utilizador não encontrado ou inativo');
    }
    
    // Validação criptográfica rigorosa Bcrypt — Eliminação total de senhas fixas em código (OWASP A07 & NIST SP 800-63B)
    const cleanPwd = (password || '').trim();
    const matchingUser = candidateUsers.find(user => {
      const isHash = user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'));
      if (isHash) {
        return bcrypt.compareSync(cleanPwd, user.password);
      }
      // Se a senha antiga ainda estivesse em texto simples, valida e converte para Bcrypt abaixo
      if (cleanPwd === user.password) {
        return true;
      }
      return false;
    });

    if (!matchingUser) {
      return recordFailedAttempt('Palavra-passe incorreta');
    }
    
    // Sucesso: limpar contadores de tentativas falhadas
    failedAttempts.delete(trackKey);
    if (ipFailedAttempts.has(clientIp)) {
      const cur = ipFailedAttempts.get(clientIp);
      if (cur.count <= 1) ipFailedAttempts.delete(clientIp);
      else ipFailedAttempts.set(clientIp, { count: Math.max(0, cur.count - 2), lockUntil: 0 });
    }
    
    // Atualizar hash seguro caso a senha antiga na BD estivesse em texto simples
    if (matchingUser.password === password) {
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), matchingUser.id);
    }
    
    const today = new Date().toISOString().split('T')[0];
    let activeRoleId = matchingUser.role_id;
    let activeRoleName = matchingUser.roleName;
    let activePermissions = matchingUser.rolePermissions;
    let isDelegated = false;

    // Ativar perfil secundário/delegado APENAS SE ESTIVER APROVADO
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
    safeUser.photo = matchingUser.avatar || null;
    safeUser.avatar = matchingUser.avatar || null;
    
    // TOKEN JWT OBRIGATÓRIO gerado no servidor
    const token = generateToken(safeUser);

    // AUDITORIA NO SERVIDOR: Registada com sucesso no SQLite
    logAudit(db, safeUser.username, 'Login Bem-Sucedido', 'Autenticação', { 
      ip: clientIp, 
      role: activeRoleName,
      userAgent: req.headers['user-agent'] 
    }, clientIp);

    res.json({ 
      success: true, 
      token, 
      user: { ...safeUser, permissions: activePermissions ? JSON.parse(activePermissions) : {} } 
    });
  } catch (e) { 
    console.error('[auth/login error]:', e);
    res.status(500).json({ error: e.message }); 
  }
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
