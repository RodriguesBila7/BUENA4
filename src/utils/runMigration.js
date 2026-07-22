/**
 * Utilitário para migrar dados do localStorage para o novo backend SQLite.
 * Para usar: importe esta função e chame-a uma vez. Pode ser acionada via console do browser.
 */

export const runFullMigration = async () => {
  console.log('Iniciando migração do localStorage para SQLite...');

  // 1. Organização
  try {
    const savedOrg = localStorage.getItem('sernic_org_data');
    if (savedOrg) {
      const orgData = JSON.parse(savedOrg);
      const res = await fetch('/api/org/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgData)
      });
      console.log('Migração Organização:', await res.json());
    }
  } catch (e) { console.error('Erro org:', e); }

  // 2. Auth (Roles e Users)
  try {
    const roles = JSON.parse(localStorage.getItem('sernic_roles') || '[]');
    const users = JSON.parse(localStorage.getItem('sernic_users') || '[]');
    if (roles.length || users.length) {
      const res = await fetch('/api/auth/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles, users })
      });
      console.log('Migração Auth:', await res.json());
    }
  } catch (e) { console.error('Erro auth:', e); }

  // 3. Funcionários
  try {
    const employees = JSON.parse(localStorage.getItem('sernic_employees_data') || '[]');
    if (employees.length) {
      const res = await fetch('/api/employees/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees })
      });
      console.log('Migração Funcionários:', await res.json());
    }
  } catch (e) { console.error('Erro funcionários:', e); }

  // 4. Módulos genéricos
  const migrateGeneric = async (storageKey, endpoint) => {
    try {
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (records.length) {
        const res = await fetch(`/api/${endpoint}/migrate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records })
        });
        console.log(`Migração ${endpoint}:`, await res.json());
      }
    } catch (e) { console.error(`Erro ${endpoint}:`, e); }
  };

  await migrateGeneric('sernic_admin_acts', 'admin-acts');
  await migrateGeneric('sernic_disciplinary_data', 'disciplinary');
  await migrateGeneric('sernic_transfers_data', 'transfers');
  await migrateGeneric('sernic_evaluation_records', 'evaluations');
  await migrateGeneric('sernic_effectiveness_records', 'effectiveness');
  
  // Settings
  try {
    const settings = {
      theme: localStorage.getItem('sernic_theme'),
      security: JSON.parse(localStorage.getItem('sernic_security_settings') || '{}')
    };
    if (settings.security && Object.keys(settings.security).length) {
      const res = await fetch(`/api/security`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.security)
      });
      console.log('Migração Settings Segurança:', await res.json());
    }
  } catch (e) { console.error('Erro settings:', e); }

  console.log('✅ Migração concluída com sucesso!');
};

// Tornar disponível globalmente para poder chamar a partir da consola do Chrome
window.runFullMigration = runFullMigration;
