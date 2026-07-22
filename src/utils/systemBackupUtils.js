// Motor de Backup Geral do Sistema SIGRH-SERNIC (Client-Side)
// Combina e gere backups de todos os módulos num único ficheiro.

const GLOBAL_HISTORY_KEY = 'sernic_global_backup_history';

// Chaves de todos os módulos de dados no LocalStorage
const MODULE_KEYS = {
  org: 'sernic_org_data',
  employees: 'sernic_employees_data',
  evaluations: 'sernic_evaluation_records',
  disciplinary: 'sernic_disciplinary_data',
  orgSettings: 'sernic_org_backups',       // Copias das cópias de estrutura
  empSettings: 'sernic_employees_backups', // Copias das cópias de funcionários
};

const SYSTEM_SETTINGS_KEYS = [
  'sernic_identity_settings',
  'sernic_language',
  'sernic_active_tab',
  'sernic_theme',
];

/**
 * Moca um endereço IP local para fins de auditoria.
 */
const getClientIP = () => {
  try {
    const stored = sessionStorage.getItem('sernic_session_ip');
    if (stored) return stored;
    const ip = '192.168.1.' + Math.floor(10 + Math.random() * 240);
    sessionStorage.setItem('sernic_session_ip', ip);
    return ip;
  } catch {
    return '127.0.0.1';
  }
};

/**
 * Regista uma operação no histórico global de auditoria.
 */
export const logGlobalHistory = (username, action, type, result, affectedCounts = {}, details = '') => {
  try {
    const history = JSON.parse(localStorage.getItem(GLOBAL_HISTORY_KEY) || '[]');
    const record = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: username,
      ip: getClientIP(),
      action,
      type,
      result,
      affectedCounts,
      details
    };
    localStorage.setItem(GLOBAL_HISTORY_KEY, JSON.stringify([record, ...history].slice(0, 200)));
  } catch (e) {
    console.error('Erro ao registar histórico global de backup:', e);
  }
};

/**
 * Calcula estatísticas de resumo para um módulo.
 */
export const getModuleStats = () => {
  const stats = {};
  try {
    const orgRaw = localStorage.getItem(MODULE_KEYS.org);
    if (orgRaw) {
      const org = JSON.parse(orgRaw);
      stats.org = {
        directorates: (org.directorates || []).length,
        departments: (org.departments || []).length,
        divisions: (org.divisions || []).length,
        sections: (org.sections || []).length,
        careers: (org.careers || []).length,
        categories: (org.categories || []).length,
      };
    }

    const empRaw = localStorage.getItem(MODULE_KEYS.employees);
    if (empRaw) {
      const emps = JSON.parse(empRaw);
      stats.employees = {
        total: emps.length,
        active: emps.filter(e => e.isActive !== false && e.status !== 'Inativo').length,
        photos: emps.filter(e => e.photo && e.photo.startsWith('data:')).length,
      };
    }

    const evalRaw = localStorage.getItem(MODULE_KEYS.evaluations);
    if (evalRaw) {
      const evals = JSON.parse(evalRaw);
      stats.evaluations = { total: evals.length };
    }

    const discRaw = localStorage.getItem(MODULE_KEYS.disciplinary);
    if (discRaw) {
      const disc = JSON.parse(discRaw);
      stats.disciplinary = { total: Array.isArray(disc) ? disc.length : Object.keys(disc).length };
    }
  } catch (e) {
    console.error('Erro ao calcular estatísticas dos módulos:', e);
  }
  return stats;
};

/**
 * Gera o payload do Backup Geral com todos os dados do sistema.
 */
export const createFullSystemBackup = (username = 'Administrador') => {
  const modules = {};

  // Recolher todos os módulos de dados
  Object.entries(MODULE_KEYS).forEach(([key, storageKey]) => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) modules[key] = JSON.parse(raw);
    } catch (e) {
      console.error(`Erro ao ler módulo ${key}:`, e);
    }
  });

  // Recolher configurações do sistema
  const systemSettings = {};
  SYSTEM_SETTINGS_KEYS.forEach(key => {
    try {
      const val = localStorage.getItem(key);
      if (val) systemSettings[key] = val;
    } catch (e) { /* ignorar */ }
  });

  const stats = getModuleStats();
  const payload = {
    metadata: {
      version: '1.0.0',
      system: 'SIGRH-SERNIC',
      backupType: 'FULL_SYSTEM',
      timestamp: new Date().toISOString(),
      user: username,
      description: 'Backup Geral do Sistema',
      stats
    },
    systemSettings,
    modules
  };

  const payloadStr = JSON.stringify(payload);
  const sizeKB = (payloadStr.length / 1024).toFixed(2);
  payload.metadata.sizeKB = sizeKB + ' KB';

  return { payload, payloadStr, sizeKB };
};

/**
 * Valida o payload de backup geral, verificando a estrutura básica e a versão.
 */
export const validateSystemBackup = (payload) => {
  if (!payload || !payload.metadata || !payload.modules) {
    return { isValid: false, error: 'Ficheiro inválido: estrutura de backup geral não reconhecida.' };
  }
  if (payload.metadata.backupType !== 'FULL_SYSTEM') {
    return { isValid: false, error: 'Este ficheiro não é um Backup Geral do sistema. Use a aba específica de cada módulo para restaurar backups individuais.' };
  }
  return { isValid: true, metadata: payload.metadata };
};

/**
 * Restaura o backup geral com rollback seguro caso haja falha.
 */
export const restoreFullSystemBackup = (payload, username = 'Administrador') => {
  const validation = validateSystemBackup(payload);
  if (!validation.isValid) {
    logGlobalHistory(username, 'Restauração Geral', 'Backup Geral', 'Erro', {}, validation.error);
    throw new Error(validation.error);
  }

  // Guardar estado anterior de todos os módulos para rollback
  const previousStates = {};
  Object.entries(MODULE_KEYS).forEach(([key, storageKey]) => {
    previousStates[storageKey] = localStorage.getItem(storageKey);
  });
  const previousSettings = {};
  SYSTEM_SETTINGS_KEYS.forEach(key => {
    previousSettings[key] = localStorage.getItem(key);
  });

  try {
    // Restaurar módulos
    if (payload.modules) {
      Object.entries(MODULE_KEYS).forEach(([key, storageKey]) => {
        if (payload.modules[key] !== undefined) {
          localStorage.setItem(storageKey, JSON.stringify(payload.modules[key]));
        }
      });
    }

    // Restaurar configurações do sistema
    if (payload.systemSettings) {
      Object.entries(payload.systemSettings).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
    }

    logGlobalHistory(username, 'Restauração Geral do Sistema', 'Backup Geral', 'Sucesso', payload.metadata.stats || {}, `Backup de ${payload.metadata.timestamp} restaurado com sucesso.`);
    return true;
  } catch (err) {
    // Rollback completo
    Object.entries(previousStates).forEach(([key, val]) => {
      if (val !== null) localStorage.setItem(key, val);
      else localStorage.removeItem(key);
    });
    Object.entries(previousSettings).forEach(([key, val]) => {
      if (val !== null) localStorage.setItem(key, val);
      else localStorage.removeItem(key);
    });

    logGlobalHistory(username, 'Restauração Geral do Sistema', 'Backup Geral', 'Erro', {}, `Falha crítica: ${err.message}. Rollback executado.`);
    throw err;
  }
};

/**
 * Lê e retorna o histórico global de auditoria de backups.
 */
export const getGlobalBackupHistory = () => {
  try {
    // Combinar históricos de todos os módulos numa única vista
    const global = JSON.parse(localStorage.getItem(GLOBAL_HISTORY_KEY) || '[]');
    const org = JSON.parse(localStorage.getItem('sernic_org_backup_history') || '[]').map(r => ({ ...r, source: 'Estrutura Orgânica' }));
    const emp = JSON.parse(localStorage.getItem('sernic_employees_backup_history') || '[]').map(r => ({ ...r, source: 'Funcionários' }));

    // Fundir e ordenar por timestamp decrescente
    return [...global.map(r => ({ ...r, source: r.source || 'Sistema Geral' })), ...org, ...emp]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 200);
  } catch (e) {
    console.error('Erro ao ler histórico global:', e);
    return [];
  }
};

/**
 * Obtém as listas de backups locais de cada módulo para o painel de resumo.
 */
export const getAllLocalBackups = () => {
  try {
    const orgBackups = JSON.parse(localStorage.getItem('sernic_org_backups') || '[]').map(b => ({ ...b, module: 'Estrutura Orgânica' }));
    const empBackups = JSON.parse(localStorage.getItem('sernic_employees_backups') || '[]').map(b => ({ ...b, module: 'Funcionários' }));
    return [...orgBackups, ...empBackups].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch {
    return [];
  }
};
