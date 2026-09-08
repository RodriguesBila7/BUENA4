// Utilitário de Gestão de Backups para a Estrutura Orgânica (Client-Side)

const BACKUP_KEY = 'sernic_org_backups';
const HISTORY_KEY = 'sernic_org_backup_history';
const ORG_DATA_KEY = 'sernic_org_data';
const MAX_AUTO_BACKUPS = 10;

/**
 * Cria um objeto de backup contendo dados da estrutura orgânica e metadados.
 * @param {object} orgData - Dados da estrutura orgânica
 * @param {string} username - Utilizador que realiza a operação
 * @param {string} description - Descrição da cópia
 * @returns {object}
 */
export const createBackupPayload = (orgData, username = 'Sistema', description = 'Backup Manual') => {
  return {
    metadata: {
      version: '1.0.0',
      system: 'SIGRH-SERNIC',
      timestamp: new Date().toISOString(),
      user: username,
      description
    },
    data: orgData
  };
};

/**
 * Valida o payload de backup para garantir integridade referencial e estrutura correta.
 * @param {object} payload - O objeto de backup importado
 * @returns {object} { isValid: boolean, error?: string, counts?: object }
 */
export const validateBackupPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, error: 'O ficheiro de backup não é um objeto válido.' };
  }

  if (!payload.metadata || !payload.data) {
    return { isValid: false, error: 'Formato do backup inválido. Chaves metadata ou data não encontradas.' };
  }

  const { data } = payload;
  const requiredKeys = ['directorates', 'departments', 'divisions', 'sections', 'careers', 'categories'];
  for (const key of requiredKeys) {
    if (!data[key] || !Array.isArray(data[key])) {
      return { isValid: false, error: `A chave '${key}' está em falta ou não é uma lista válida.` };
    }
  }

  // Validar Integridade Referencial
  const dirIds = new Set(data.directorates.map(d => d.id));
  const depIds = new Set(data.departments.map(d => d.id));
  const divIds = new Set(data.divisions.map(d => d.id));
  const carIds = new Set(data.careers.map(c => c.id));

  // Departamentos -> Direções
  for (const dep of data.departments) {
    if (!dirIds.has(dep.directorateId)) {
      return { isValid: false, error: `Integridade corrompida: O departamento '${dep.name}' refere-se a uma Direção inexistente.` };
    }
  }

  // Divisões -> Departamentos ou Direcções
  for (const div of data.divisions) {
    if (div.departmentId && !depIds.has(div.departmentId)) {
      return { isValid: false, error: `Integridade corrompida: A repartição '${div.name}' refere-se a um Departamento inexistente.` };
    }
    if (!div.departmentId && (!div.directorateId || !dirIds.has(div.directorateId))) {
      return { isValid: false, error: `Integridade corrompida: A repartição '${div.name}' refere-se a uma Direcção inexistente.` };
    }
  }

  // Secções -> Divisões ou Departamentos
  for (const sec of data.sections) {
    if (sec.divisionId && !divIds.has(sec.divisionId)) {
      return { isValid: false, error: `Integridade corrompida: A secção '${sec.name}' refere-se a uma Repartição inexistente.` };
    }
    if (sec.departmentId && !depIds.has(sec.departmentId)) {
      return { isValid: false, error: `Integridade corrompida: A secção '${sec.name}' refere-se a um Departamento inexistente.` };
    }
  }

  // Categorias -> Carreiras
  for (const cat of data.categories) {
    if (!carIds.has(cat.careerId)) {
      return { isValid: false, error: `Integridade corrompida: A categoria '${cat.name}' refere-se a uma Carreira inexistente.` };
    }
  }

  return {
    isValid: true,
    counts: {
      directorates: data.directorates.length,
      departments: data.departments.length,
      divisions: data.divisions.length,
      sections: data.sections.length,
      careers: data.careers.length,
      categories: data.categories.length
    }
  };
};

/**
 * Executa a restauração simulando uma transação com Rollback.
 * @param {object} payload - O backup validado
 * @param {string} username - Utilizador operador
 * @returns {boolean}
 */
export const restoreBackupTransaction = (payload, username = 'Sistema') => {
  const backupValidation = validateBackupPayload(payload);
  if (!backupValidation.isValid) {
    logHistoryRecord(username, 'Restauração de Backup', 'Erro', `Falha na validação: ${backupValidation.error}`);
    throw new Error(backupValidation.error);
  }

  const previousState = localStorage.getItem(ORG_DATA_KEY);

  try {
    // Escrever no LocalStorage (Commit)
    localStorage.setItem(ORG_DATA_KEY, JSON.stringify(payload.data));
    logHistoryRecord(username, 'Restauração de Backup', 'Sucesso', `Restaurado com sucesso. Contagem: Dír: ${backupValidation.counts.directorates}, Dep: ${backupValidation.counts.departments}`);
    return true;
  } catch (err) {
    // Rollback em caso de falha crítica de escrita
    if (previousState) {
      localStorage.setItem(ORG_DATA_KEY, previousState);
    }
    logHistoryRecord(username, 'Restauração de Backup', 'Erro', `Falha crítica durante gravação: ${err.message}`);
    throw err;
  }
};

/**
 * Regista o histórico de operações de Backup e Restauro.
 */
export const logHistoryRecord = (username, action, result, details = '') => {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const record = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: username,
      action,
      type: action.includes('Restauração') ? 'Restauração' : 'Backup',
      result,
      details
    };
    localStorage.setItem(HISTORY_KEY, JSON.stringify([record, ...history].slice(0, 100))); // Limite de 100 logs
  } catch (e) {
    console.error("Erro ao gravar histórico de backup:", e);
  }
};

/**
 * Guarda um backup interno (automático ou manual) na lista local rotativa.
 */
export const saveInternalBackup = (orgData, username = 'Sistema', description = 'Auto-Backup') => {
  try {
    const backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    const payload = createBackupPayload(orgData, username, description);
    
    // Calcular tamanho aproximado do payload
    const str = JSON.stringify(payload);
    const sizeKB = (str.length / 1024).toFixed(2) + ' KB';

    const backupRecord = {
      id: crypto.randomUUID(),
      timestamp: payload.metadata.timestamp,
      user: payload.metadata.user,
      description: payload.metadata.description,
      size: sizeKB,
      payload
    };

    // Adicionar e truncar para o máximo de backups auto-guardados
    const nextBackups = [backupRecord, ...backups];
    if (description.includes('Auto-Backup') || description.includes('automático')) {
      const autos = nextBackups.filter(b => b.description.includes('Auto-Backup'));
      const manuals = nextBackups.filter(b => !b.description.includes('Auto-Backup'));
      
      const limitedAutos = autos.slice(0, MAX_AUTO_BACKUPS);
      localStorage.setItem(BACKUP_KEY, JSON.stringify([...manuals, ...limitedAutos]));
    } else {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(nextBackups));
    }

    logHistoryRecord(username, `Criação de Backup (${description})`, 'Sucesso', `Tamanho: ${sizeKB}`);
    return backupRecord;
  } catch (e) {
    logHistoryRecord(username, `Criação de Backup (${description})`, 'Erro', e.message);
    console.error("Erro ao guardar backup interno:", e);
  }
};
