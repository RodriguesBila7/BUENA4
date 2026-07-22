// Utilitário de Gestão de Backups para a Ficha de Funcionários (Client-Side)

const EMP_BACKUP_KEY = 'sernic_employees_backups';
const EMP_HISTORY_KEY = 'sernic_employees_backup_history';
const EMP_DATA_KEY = 'sernic_employees_data';
const ORG_DATA_KEY = 'sernic_org_data';
const MAX_AUTO_BACKUPS = 10;

/**
 * Moca um endereço IP local para fins de auditoria em ambiente de demonstração.
 */
const getClientIP = () => {
  return '192.168.21.' + Math.floor(10 + Math.random() * 240);
};

/**
 * Cria um objeto de backup contendo dados dos funcionários e metadados.
 */
export const createEmployeeBackupPayload = (employeesData, username = 'Sistema', description = 'Backup Manual') => {
  // Contar fotos associadas (fotos em base64 comecam com "data:image")
  const photoCount = employeesData.filter(emp => emp.photo && emp.photo.startsWith('data:')).length;
  
  return {
    metadata: {
      version: '1.0.0',
      system: 'SIGRH-SERNIC',
      timestamp: new Date().toISOString(),
      user: username,
      description,
      employeeCount: employeesData.length,
      photoCount
    },
    data: {
      employees: employeesData
    }
  };
};

/**
 * Valida o payload de backup dos funcionários contra a estrutura organizacional atual.
 */
export const validateEmployeeBackupPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, error: 'O ficheiro de backup não é um objeto válido.' };
  }

  if (!payload.metadata || !payload.data) {
    return { isValid: false, error: 'Formato do backup inválido. Chaves metadata ou data não encontradas.' };
  }

  const { data } = payload;
  if (!data.employees || !Array.isArray(data.employees)) {
    return { isValid: false, error: 'A chave "employees" está em falta ou não é uma lista de funcionários válida.' };
  }

  // Obter a Estrutura Organizacional Ativa da Instituição
  let activeOrg = { directorates: [], departments: [], divisions: [], sections: [], careers: [], categories: [] };
  try {
    const savedOrg = localStorage.getItem(ORG_DATA_KEY);
    if (savedOrg) {
      activeOrg = JSON.parse(savedOrg);
    }
  } catch (e) {
    console.error("Erro ao carregar estrutura organizacional para validação referencial", e);
  }

  const dirIds = new Set((activeOrg.directorates || []).map(d => d.id));
  const depIds = new Set((activeOrg.departments || []).map(d => d.id));
  const divIds = new Set((activeOrg.divisions || []).map(d => d.id));
  const secIds = new Set((activeOrg.sections || []).map(s => s.id));
  const carIds = new Set((activeOrg.careers || []).map(c => c.id));
  const catIds = new Set((activeOrg.categories || []).map(c => c.id));

  // Validar campos obrigatórios e Integridade Referencial para cada funcionário
  const hasOrgData = dirIds.size > 0;
  for (const emp of data.employees) {
    if (!emp.id || !emp.nip || !emp.name) {
      return { isValid: false, error: `Dados corrompidos: Funcionário em falta com campos críticos obrigatórios (id, nip, nome).` };
    }

    if (hasOrgData) {
      // Validar Direcção
      if (emp.directorateId && !dirIds.has(emp.directorateId)) {
        return { isValid: false, error: `Integridade referencial quebrada: O funcionário '${emp.name}' refere-se a uma Direção inexistente na Estrutura Orgânica atual (ID: ${emp.directorateId}).` };
      }

      // Validar Departamento
      if (emp.departmentId && !depIds.has(emp.departmentId)) {
        return { isValid: false, error: `Integridade referencial quebrada: O funcionário '${emp.name}' refere-se a um Departamento inexistente na Estrutura Orgânica atual (ID: ${emp.departmentId}).` };
      }

      // Validar Repartição
      if (emp.divisionId && !divIds.has(emp.divisionId)) {
        return { isValid: false, error: `Integridade referencial quebrada: O funcionário '${emp.name}' refere-se a uma Repartição inexistente na Estrutura Orgânica atual (ID: ${emp.divisionId}).` };
      }

      // Validar Secção
      if (emp.sectionId && !secIds.has(emp.sectionId)) {
        return { isValid: false, error: `Integridade referencial quebrada: O funcionário '${emp.name}' refere-se a uma Secção inexistente na Estrutura Orgânica atual (ID: ${emp.sectionId}).` };
      }

      // Validar Carreira
      if (emp.careerId && !carIds.has(emp.careerId)) {
        return { isValid: false, error: `Integridade referencial quebrada: O funcionário '${emp.name}' refere-se a uma Carreira inexistente na Estrutura Orgânica atual (ID: ${emp.careerId}).` };
      }

      // Validar Categoria
      if (emp.categoryId && !catIds.has(emp.categoryId)) {
        return { isValid: false, error: `Integridade referencial quebrada: O funcionário '${emp.name}' refere-se a uma Categoria inexistente na Estrutura Orgânica atual (ID: ${emp.categoryId}).` };
      }
    }
  }

  const photoCount = data.employees.filter(emp => emp.photo && emp.photo.startsWith('data:')).length;
  const docCount = data.employees.filter(emp => emp.documents || emp.document || emp.files || emp.file).length;

  return {
    isValid: true,
    counts: {
      employees: data.employees.length,
      photos: photoCount,
      documents: docCount,
      timestamp: payload.metadata.timestamp,
      user: payload.metadata.user
    }
  };
};

/**
 * Regista o histórico de operações de backup na auditoria.
 */
export const logEmployeeHistoryRecord = (username, action, result, affectedRecords = 0, details = '') => {
  try {
    const history = JSON.parse(localStorage.getItem(EMP_HISTORY_KEY) || '[]');
    const record = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: username,
      ip: getClientIP(),
      action,
      type: action.includes('Restauração') ? 'Restauração' : 'Backup',
      result,
      affectedRecords,
      details
    };
    localStorage.setItem(EMP_HISTORY_KEY, JSON.stringify([record, ...history].slice(0, 100))); // Limite 100 logs
  } catch (e) {
    console.error("Erro ao gravar auditoria do backup de funcionários:", e);
  }
};

/**
 * Executa a restauração completa dos funcionários sob rollback seguro.
 */
export const restoreEmployeeBackupTransaction = (payload, username = 'Sistema') => {
  const validation = validateEmployeeBackupPayload(payload);
  if (!validation.isValid) {
    logEmployeeHistoryRecord(username, 'Restauração de Backup', 'Erro', 0, `Validação falhou: ${validation.error}`);
    throw new Error(validation.error);
  }

  const previousState = localStorage.getItem(EMP_DATA_KEY);

  try {
    // Escrever no LocalStorage (Commit)
    localStorage.setItem(EMP_DATA_KEY, JSON.stringify(payload.data.employees));
    logEmployeeHistoryRecord(
      username, 
      'Restauração de Backup', 
      'Sucesso', 
      validation.counts.employees, 
      `Importação concluída. Fotos restauradas: ${validation.counts.photos}`
    );
    return true;
  } catch (err) {
    // Rollback para estado intacto
    if (previousState) {
      localStorage.setItem(EMP_DATA_KEY, previousState);
    }
    logEmployeeHistoryRecord(username, 'Restauração de Backup', 'Erro', 0, `Falha crítica: ${err.message}`);
    throw err;
  }
};

/**
 * Cria e guarda uma cópia interna rotativa dos funcionários.
 */
export const saveInternalEmployeeBackup = (employeesData, username = 'Sistema', description = 'Auto-Backup') => {
  try {
    const backups = JSON.parse(localStorage.getItem(EMP_BACKUP_KEY) || '[]');
    const payload = createEmployeeBackupPayload(employeesData, username, description);
    
    // Calcular tamanho do payload
    const str = JSON.stringify(payload);
    const sizeKB = (str.length / 1024).toFixed(2) + ' KB';

    const backupRecord = {
      id: crypto.randomUUID(),
      timestamp: payload.metadata.timestamp,
      user: payload.metadata.user,
      employeeCount: payload.metadata.employeeCount,
      size: sizeKB,
      description: payload.metadata.description,
      payload
    };

    // Adicionar e truncar rotação de backups automáticos
    const nextBackups = [backupRecord, ...backups];
    if (description.includes('Auto-Backup')) {
      const autos = nextBackups.filter(b => b.description.includes('Auto-Backup'));
      const manuals = nextBackups.filter(b => !b.description.includes('Auto-Backup'));
      
      const limitedAutos = autos.slice(0, MAX_AUTO_BACKUPS);
      localStorage.setItem(EMP_BACKUP_KEY, JSON.stringify([...manuals, ...limitedAutos]));
    } else {
      localStorage.setItem(EMP_BACKUP_KEY, JSON.stringify(nextBackups));
    }

    logEmployeeHistoryRecord(username, `Criação de Backup (${description})`, 'Sucesso', payload.metadata.employeeCount, `Tamanho: ${sizeKB}`);
    return backupRecord;
  } catch (e) {
    logEmployeeHistoryRecord(username, `Criação de Backup (${description})`, 'Erro', 0, e.message);
    console.error("Erro ao guardar backup interno de funcionários:", e);
  }
};
