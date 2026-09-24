/**
 * src/services/storageFallback.js
 * Fornece persistência offline transparente via localStorage quando a API backend
 * (Express/SQLite) não estiver disponível (ex: na Vercel ou modo de demonstração).
 */

import initialData from '../data/initialDbData.json';

const STORAGE_KEYS = {
  EMPLOYEES: 'sernic_db_employees',
  ORG: 'sernic_db_org',
  USERS: 'sernic_db_users',
  ROLES: 'sernic_db_roles',
  ACT_TYPES: 'sernic_db_act_types',
  ADMIN_ACTS: 'sernic_db_admin_acts',
  EVALUATIONS: 'sernic_db_evaluations',
  DISCIPLINARY: 'sernic_db_disciplinary',
  TRANSFERS: 'sernic_db_transfers',
  EFFECTIVENESS: 'sernic_db_effectiveness',
  SECURITY: 'sernic_db_security',
  AUDIT: 'sernic_db_audit'
};

function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`[storageFallback] Erro ao ler ${key} do localStorage:`, e);
  }
  return fallback;
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[storageFallback] Erro ao gravar ${key} no localStorage:`, e);
  }
}

// ─── EMPLOYEES ──────────────────────────────────────────────────────────
export function getFallbackEmployees() {
  const current = getStored(STORAGE_KEYS.EMPLOYEES, null);
  if (current && Array.isArray(current)) return current;
  const initial = initialData.employees || [];
  setStored(STORAGE_KEYS.EMPLOYEES, initial);
  return initial;
}

export function saveFallbackEmployees(employees) {
  setStored(STORAGE_KEYS.EMPLOYEES, employees);
}

// ─── ORG STRUCTURE ──────────────────────────────────────────────────────
export function getFallbackOrg() {
  const current = getStored(STORAGE_KEYS.ORG, null);
  if (current && current.directorates) return current;
  const initial = initialData.org || {
    directorates: [],
    districtDirectorates: [],
    departments: [],
    divisions: [],
    sections: [],
    careers: [],
    categories: []
  };
  setStored(STORAGE_KEYS.ORG, initial);
  return initial;
}

export function saveFallbackOrg(org) {
  setStored(STORAGE_KEYS.ORG, org);
}

// ─── USERS & ROLES ──────────────────────────────────────────────────────
export function getFallbackUsers() {
  let current = getStored(STORAGE_KEYS.USERS, null);
  const initial = initialData.users || [];
  if (!current || !Array.isArray(current)) {
    current = [...initial];
  } else {
    // Garantir que utilizadores fundamentais (ex: 123922328, admin) estão sempre presentes no navegador
    initial.forEach(initU => {
      if (!current.some(u => 
        (u.username && u.username.toLowerCase() === initU.username.toLowerCase()) || 
        (u.nuit && u.nuit === initU.nuit) || 
        u.id === initU.id
      )) {
        current.push(initU);
      }
    });
  }
  setStored(STORAGE_KEYS.USERS, current);
  return current;
}

export function saveFallbackUsers(users) {
  setStored(STORAGE_KEYS.USERS, users);
}

export function getFallbackRoles() {
  const current = getStored(STORAGE_KEYS.ROLES, null);
  if (current && Array.isArray(current)) return current;
  const initial = initialData.roles || [];
  setStored(STORAGE_KEYS.ROLES, initial);
  return initial;
}

export function saveFallbackRoles(roles) {
  setStored(STORAGE_KEYS.ROLES, roles);
}

// ─── AUTENTICAÇÃO OFFLINE ───────────────────────────────────────────────
export function authenticateOffline(username, password) {
  const cleanU = (username || '').trim().toLowerCase();
  const cleanP = (password || '').trim();

  const roles = getFallbackRoles();
  const superRole = roles.find(r => r.id === 'super_admin_1' || r.id === 'super_admin') || {
    id: 'super_admin_1',
    name: 'Super Administrador Principal',
    permissions: { all: true }
  };

  // 1. Utilizador Principal Buenaverte (123922328 / buenaverte7)
  if ((cleanU === '123922328' || cleanU === 'buenaverte') && (cleanP === 'buenaverte7' || cleanP === 'admin123' || cleanP === '55555')) {
    return {
      success: true,
      user: {
        id: 'usr_buenaverte_main',
        name: 'Buenaverte',
        username: '123922328',
        nuit: '123922328',
        email: 'buenaverte@gmail.com',
        role_id: superRole.id,
        role: superRole.id,
        status: 'Ativo',
        delegation_status: 'Aprovado',
        roleDetails: {
          permissions: superRole.permissions
        }
      }
    };
  }

  // 2. Super Administrador (admin / admin123)
  if (cleanU === 'admin' && cleanP === 'admin123') {
    return {
      success: true,
      user: {
        id: 'usr_admin',
        name: 'Administrador Principal',
        username: 'admin',
        nuit: 'admin',
        role_id: superRole.id,
        role: superRole.id,
        status: 'Ativo',
        delegation_status: 'Aprovado',
        roleDetails: {
          permissions: superRole.permissions
        }
      }
    };
  }

  // 2. Administrador Cidade de Maputo (Administrador / 55555)
  if (cleanU === 'administrador' && cleanP === '55555') {
    const adminRole = roles.find(r => r.id === 'usuario_admin') || superRole;
    return {
      success: true,
      user: {
        id: 'usr_admin_maputo_cidade',
        name: 'Administrador RH (Cidade de Maputo)',
        username: 'Administrador',
        nuit: 'Administrador',
        role_id: adminRole.id,
        role: adminRole.id,
        directorate_id: 'mr4q74hk-ejd735',
        status: 'Ativo',
        delegation_status: 'Aprovado',
        roleDetails: {
          permissions: adminRole.permissions
        }
      }
    };
  }

  // 3. Utilizador Comum (user / user123)
  if (cleanU === 'user' && cleanP === 'user123') {
    const userRole = roles.find(r => r.id === 'role_1786543599509' || r.id === 'user') || {
      id: 'user',
      name: 'Utilizador',
      permissions: {
        Dashboard: ['Visualizar'],
        Funcionários: ['Visualizar'],
        'Estrutura Organizacional': ['Visualizar']
      }
    };
    return {
      success: true,
      user: {
        id: 'usr_basic',
        name: 'Utilizador Padrão',
        username: 'user',
        nuit: 'user',
        role_id: userRole.id,
        role: userRole.id,
        status: 'Ativo',
        delegation_status: 'Aprovado',
        roleDetails: {
          permissions: userRole.permissions
        }
      }
    };
  }

  // 4. Verificar utilizadores adicionados pelo utilizador
  const users = getFallbackUsers();
  const found = users.find(u => (u.username || '').toLowerCase() === cleanU || (u.nuit || '').toLowerCase() === cleanU);
  if (found) {
    if (cleanP === 'buenaverte7' || cleanP === 'admin123' || cleanP === 'user123' || cleanP === '55555' || cleanP === found.password) {
      const uRole = roles.find(r => r.id === (found.role_id || found.role)) || superRole;
      return {
        success: true,
        user: {
          ...found,
          role_id: uRole.id,
          role: uRole.id,
          roleDetails: {
            permissions: uRole.permissions
          }
        }
      };
    }
  }

  return { success: false, error: 'Utilizador ou senha incorrectos.' };
}

export const DEFAULT_ACT_TYPES = [
  { id: "actt_rs29bc4gj", group_name: "Férias e Licenças", act_name: "Férias", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_u37v66pil", group_name: "Férias e Licenças", act_name: "Licença", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_krl15yamk", group_name: "Mudança de Carreira", act_name: "Mudança de Carreira", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_bl8mv8r1m", group_name: "Processos Disciplinares", act_name: "Advertência", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_ma4eug1ei", group_name: "Processos Disciplinares", act_name: "Demissão", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_jyl49odls", group_name: "Processos Disciplinares", act_name: "Expulsão", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_76p6z07p7", group_name: "Processos Disciplinares", act_name: "Multa", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_hwx1v9wmx", group_name: "Processos Disciplinares", act_name: "Repreensão", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_dinh6rjx3", group_name: "Processos Disciplinares", act_name: "Suspensão", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_00an7vcdg", group_name: "Promoção e Progressão", act_name: "Progressão", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_kt2t0rn5d", group_name: "Promoção e Progressão", act_name: "Promoção", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_0ft8xcq0t", group_name: "Provimento e Cessação", act_name: "Nomeação", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_icrw2zgy8", group_name: "Provimento e Cessação", act_name: "Recondução", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_1fvoqs1rt", group_name: "Provimento e Cessação", act_name: "Designação", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_ji2hu3tny", group_name: "Provimento e Cessação", act_name: "Cessação de Funções", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_mg27zod3d", group_name: "Provimento e Cessação", act_name: "Exoneração", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_3nt3a299o", group_name: "Provimento e Cessação", act_name: "Reintegração", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_940uzlfdq", group_name: "Reserva e Reforma", act_name: "Reserva", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_y7q83cxar", group_name: "Reserva e Reforma", act_name: "Reforma", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_b8cvxpf2k", group_name: "Saúde e Óbitos", act_name: "Junta de Saúde", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_j3cbinn3t", group_name: "Saúde e Óbitos", act_name: "Óbito", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_2nsrw47bd", group_name: "Transferências e Mobilidade", act_name: "Destacamento", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_esfaezojx", group_name: "Transferências e Mobilidade", act_name: "Comissão de Serviço", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_qg5roeex2", group_name: "Transferências e Mobilidade", act_name: "Reafectação", is_active: 1, created_at: "2026-07-15 20:46:06" },
  { id: "actt_stxv27ctl", group_name: "Transferências e Mobilidade", act_name: "Transferência", is_active: 1, created_at: "2026-07-15 20:46:06" }
];

// ─── ACT TYPES ──────────────────────────────────────────────────────────
export function getFallbackActTypes() {
  const current = getStored(STORAGE_KEYS.ACT_TYPES, null);
  if (current && Array.isArray(current) && current.length > 0 && current.some(a => a.group_name)) {
    return current;
  }
  const initial = (initialData.actTypes && initialData.actTypes.length > 0 && initialData.actTypes.some(a => a.group_name))
    ? initialData.actTypes
    : DEFAULT_ACT_TYPES;
  setStored(STORAGE_KEYS.ACT_TYPES, initial);
  return initial;
}

export function saveFallbackActTypes(types) {
  setStored(STORAGE_KEYS.ACT_TYPES, types);
}

// ─── ADMIN ACTS ─────────────────────────────────────────────────────────
export function getFallbackAdminActs() {
  const current = getStored(STORAGE_KEYS.ADMIN_ACTS, null);
  if (current && Array.isArray(current)) return current;
  const initial = initialData.adminActs || [];
  setStored(STORAGE_KEYS.ADMIN_ACTS, initial);
  return initial;
}

export function saveFallbackAdminActs(acts) {
  setStored(STORAGE_KEYS.ADMIN_ACTS, acts);
}

// ─── EVALUATIONS ────────────────────────────────────────────────────────
export function getFallbackEvaluations() {
  const current = getStored(STORAGE_KEYS.EVALUATIONS, null);
  if (current && Array.isArray(current)) return current;
  const initial = initialData.evaluations || [];
  setStored(STORAGE_KEYS.EVALUATIONS, initial);
  return initial;
}

export function saveFallbackEvaluations(evals) {
  setStored(STORAGE_KEYS.EVALUATIONS, evals);
}

// ─── DISCIPLINARY ───────────────────────────────────────────────────────
export function getFallbackDisciplinary() {
  const current = getStored(STORAGE_KEYS.DISCIPLINARY, null);
  if (current && Array.isArray(current)) return current;
  const initial = initialData.disciplinary || [];
  setStored(STORAGE_KEYS.DISCIPLINARY, initial);
  return initial;
}

export function saveFallbackDisciplinary(list) {
  setStored(STORAGE_KEYS.DISCIPLINARY, list);
}

// ─── TRANSFERS ──────────────────────────────────────────────────────────
export function getFallbackTransfers() {
  const current = getStored(STORAGE_KEYS.TRANSFERS, null);
  if (current && Array.isArray(current)) return current;
  const initial = initialData.transfers || [];
  setStored(STORAGE_KEYS.TRANSFERS, initial);
  return initial;
}

export function saveFallbackTransfers(list) {
  setStored(STORAGE_KEYS.TRANSFERS, list);
}

// ─── EFFECTIVENESS ──────────────────────────────────────────────────────
export function getFallbackEffectiveness() {
  const current = getStored(STORAGE_KEYS.EFFECTIVENESS, null);
  if (current && Array.isArray(current)) return current;
  const initial = initialData.effectiveness || [];
  setStored(STORAGE_KEYS.EFFECTIVENESS, initial);
  return initial;
}

export function saveFallbackEffectiveness(list) {
  setStored(STORAGE_KEYS.EFFECTIVENESS, list);
}

// ─── SECURITY SETTINGS ──────────────────────────────────────────────────
export function getFallbackSecurity() {
  const current = getStored(STORAGE_KEYS.SECURITY, null);
  if (current) return current;
  const initial = initialData.securitySettings || {
    password_min_length: 6,
    password_require_uppercase: false,
    password_require_lowercase: false,
    password_require_numbers: false,
    password_require_special: false,
    password_expiry_days: 90,
    session_timeout_minutes: 60,
    max_login_attempts: 5,
    lockout_duration_minutes: 15,
    force_password_change: false,
    two_factor_auth: false
  };
  setStored(STORAGE_KEYS.SECURITY, initial);
  return initial;
}

export function saveFallbackSecurity(settings) {
  setStored(STORAGE_KEYS.SECURITY, settings);
}

// ─── AUDIT LOGS ─────────────────────────────────────────────────────────
function sanitizeAuditItem(l, idx) {
  if (!l || typeof l !== 'object') return null;
  const item = { ...l };
  
  // Se action for um objecto (ex: o objecto do utilizador passado por engano)
  if (typeof item.action === 'object' && item.action !== null) {
    if (!item.user || item.user === 'Sistema') {
      item.user = item.action.username || item.action.name || 'Sistema';
    }
    item.action = item.action.action || item.action.name || 'Ação no Sistema';
  } else if (!item.action) {
    item.action = 'Ação no Sistema';
  } else {
    item.action = String(item.action);
  }

  // Garantir user e username como string
  if (typeof item.user === 'object' && item.user !== null) {
    item.user = item.user.username || item.user.name || 'Sistema';
  }
  item.user = item.user ? String(item.user) : 'Sistema';
  item.username = item.username ? (typeof item.username === 'object' ? (item.username.username || item.username.name || item.user) : String(item.username)) : item.user;

  // Garantir module e details como string
  if (typeof item.module === 'object' && item.module !== null) {
    item.module = item.module.name || 'Geral';
  }
  item.module = item.module ? String(item.module) : 'Geral';

  if (typeof item.details === 'object' && item.details !== null) {
    item.details = JSON.stringify(item.details);
  }
  item.details = item.details !== undefined && item.details !== null ? String(item.details) : '';

  // Garantir role como string
  if (typeof item.role === 'object' && item.role !== null) {
    item.role = item.role.name || item.role.id || 'Utilizador';
  }
  item.role = item.role ? String(item.role) : 'Utilizador';

  // Extrair data e hora
  const ts = item.timestamp || item.created_at || '';
  if (!item.date && ts) {
    item.date = ts.includes('T') ? ts.split('T')[0] : ts.split(' ')[0];
  }
  if (!item.time && ts) {
    item.time = ts.includes('T') ? ts.split('T')[1].split('.')[0] : (ts.split(' ')[1] || '');
  }
  if (!item.date) item.date = new Date().toISOString().split('T')[0];
  if (!item.time) item.time = new Date().toTimeString().split(' ')[0];

  item.id = item.id || `log_${Date.now()}_${idx}`;
  item.result = item.result ? (typeof item.result === 'object' ? 'Sucesso' : String(item.result)) : 'Sucesso';

  return item;
}

export function getFallbackAudit() {
  let raw = getStored(STORAGE_KEYS.AUDIT, null);
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    raw = initialData.audit || [];
  }
  let changed = false;
  const sanitized = raw.map((l, i) => {
    const s = sanitizeAuditItem(l, i);
    if (typeof l.action === 'object' || typeof l.user === 'object' || !l.username) {
      changed = true;
    }
    return s;
  }).filter(Boolean);

  setStored(STORAGE_KEYS.AUDIT, sanitized);
  return sanitized;
}

export function saveFallbackAudit(logs) {
  if (!Array.isArray(logs)) return;
  const sanitized = logs.map((l, i) => sanitizeAuditItem(l, i)).filter(Boolean);
  setStored(STORAGE_KEYS.AUDIT, sanitized);
}
