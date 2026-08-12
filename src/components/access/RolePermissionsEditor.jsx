import React, { useState, useEffect } from 'react';

const MODULES = [
  'Dashboard',
  'Funcionários',
  'Estrutura Organizacional',
  'Processos Disciplinares',
  'Efetividade (Faltas)',
  'Avaliação de Desempenho',
  'Promoção e Progressão',
  'Férias e Licenças',
  'Mudança de Carreira',
  'Provimento e Cessação',
  'Reserva e Reforma',
  'Saúde e Óbitos',
  'Transferências e Mobilidade',
  'Carreiras',
  'Categorias Funcionais',
  'Relatórios e Impressão',
  'Configurações',
  'Utilizadores',
  'Auditoria',
  'Acessos e Perfis'
];

const ACTIONS = ['Visualizar', 'Criar', 'Editar', 'Eliminar', 'Validar', 'Exportar', 'Importar', 'Imprimir', 'Administrar'];

const styles = {
  container: { padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  input: { padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '20px' },
  th: { padding: '8px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'center' },
  thLeft: { padding: '8px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-main)', textAlign: 'left', minWidth: '150px' },
  td: { padding: '8px', borderBottom: '1px solid var(--color-border)', textAlign: 'center' },
  tdLeft: { padding: '8px', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold' },
  btnRow: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnSecondary: { backgroundColor: 'transparent', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' },
};

export default function RolePermissionsEditor({ initialData, onSave, onCancel }) {
  const [role, setRole] = useState({ name: '', description: '', permissions: {} });

  useEffect(() => {
    if (initialData) {
      const existingPerms = initialData.permissions || {};
      const mergedPerms = { ...existingPerms };
      MODULES.forEach(m => {
        if (!mergedPerms[m]) mergedPerms[m] = [];
      });
      setRole({ ...initialData, permissions: mergedPerms });
    } else {
      const defaultPerms = {};
      MODULES.forEach(m => defaultPerms[m] = []);
      setRole({ name: '', description: '', permissions: defaultPerms });
    }
  }, [initialData]);

  const handleTogglePermission = (moduleName, actionName) => {
    setRole(prev => {
      const modPerms = prev.permissions[moduleName] || [];
      const newPerms = { ...prev.permissions };
      if (modPerms.includes(actionName)) {
        newPerms[moduleName] = modPerms.filter(a => a !== actionName);
      } else {
        newPerms[moduleName] = [...modPerms, actionName];
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const handleToggleRow = (moduleName) => {
    setRole(prev => {
      const modPerms = prev.permissions[moduleName] || [];
      const newPerms = { ...prev.permissions };
      if (modPerms.length === ACTIONS.length) {
        newPerms[moduleName] = []; // Deselect all
      } else {
        newPerms[moduleName] = [...ACTIONS]; // Select all
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(role);
  };

  return (
    <form style={styles.container} onSubmit={handleSubmit}>
      <h3>{initialData ? 'Editar Perfil' : 'Novo Perfil'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nome do Perfil *</label>
          <input required style={styles.input} value={role.name} onChange={e => setRole({...role, name: e.target.value})} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Descrição</label>
          <input style={styles.input} value={role.description} onChange={e => setRole({...role, description: e.target.value})} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th style={styles.thLeft}>Módulo</th>
              {ACTIONS.map(a => <th key={a} style={styles.th}>{a}</th>)}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(mod => {
              const currentPerms = role.permissions[mod] || [];
              const allChecked = currentPerms.length === ACTIONS.length;
              return (
                <tr key={mod}>
                  <td style={styles.tdLeft}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" checked={allChecked} onChange={() => handleToggleRow(mod)} />
                      {mod}
                    </label>
                  </td>
                  {ACTIONS.map(action => (
                    <td key={action} style={styles.td}>
                      <input 
                        type="checkbox" 
                        checked={currentPerms.includes(action)} 
                        onChange={() => handleTogglePermission(mod, action)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={styles.btnRow}>
        <button type="button" style={styles.btnSecondary} onClick={onCancel}>Cancelar</button>
        <button type="submit" style={styles.btnPrimary}>Guardar Perfil</button>
      </div>
    </form>
  );
}
