import React, { useState, useEffect } from 'react';

const MODULES = [
  'Dashboard',
  'Funcionários',
  'Estrutura Organizacional',
  'Contencioso Laboral',
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
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '10px' },
  th: { padding: '8px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'center', cursor: 'pointer', userSelect: 'none' },
  thLeft: { padding: '8px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-main)', textAlign: 'left', minWidth: '150px' },
  td: { padding: '8px', borderBottom: '1px solid var(--color-border)', textAlign: 'center' },
  tdLeft: { padding: '8px', borderBottom: '1px solid var(--color-border)', fontWeight: 'bold' },
  btnRow: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnSecondary: { backgroundColor: 'transparent', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' },
};

const OFFICIAL_ROLES = [
  {
    level: '1º Nível',
    name: 'Super Administrador Principal',
    description: 'Chefe da Direcção de Recursos Humanos (Acesso Total e Confirmação Final de Actos)'
  },
  {
    level: '2º Nível',
    name: 'Super Administrador',
    description: 'Chefe do Departamento de Gestão de Pessoal'
  },
  {
    level: '3º Nível',
    name: 'Administrador Principal',
    description: 'Técnico Central de Recursos Humanos'
  },
  {
    level: '4º Nível',
    name: 'Administrador',
    description: 'Chefes dos Departamentos Provinciais de Recursos Humanos e Apoio Administrativo'
  },
  {
    level: 'Específico',
    name: 'Técnico de Pensões e Reserva',
    description: 'RH Central - Específico para Reserva e Reforma'
  },
  {
    level: 'Específico',
    name: 'Técnico de Saúde e Óbitos',
    description: 'RH Central - Específico para Saúde e Óbitos'
  },
  {
    level: '5º Nível',
    name: 'Usuário',
    description: 'Adjuntos dos Administradores (Podem substituir Usuários Administrativos)'
  }
];

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
        newPerms[moduleName] = []; // Desmarcar linha
      } else {
        newPerms[moduleName] = [...ACTIONS]; // Selecionar linha
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const handleToggleColumn = (actionName) => {
    setRole(prev => {
      const newPerms = { ...prev.permissions };
      const allHaveAction = MODULES.every(m => (newPerms[m] || []).includes(actionName));
      
      MODULES.forEach(m => {
        const modPerms = newPerms[m] || [];
        if (allHaveAction) {
          newPerms[m] = modPerms.filter(a => a !== actionName);
        } else {
          if (!modPerms.includes(actionName)) {
            newPerms[m] = [...modPerms, actionName];
          }
        }
      });
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSelectAll = () => {
    const allPerms = {};
    MODULES.forEach(m => {
      allPerms[m] = [...ACTIONS];
    });
    setRole(prev => ({ ...prev, permissions: allPerms }));
  };

  const handleDeselectAll = () => {
    const emptyPerms = {};
    MODULES.forEach(m => {
      emptyPerms[m] = [];
    });
    setRole(prev => ({ ...prev, permissions: emptyPerms }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(role);
  };

  return (
    <form style={styles.container} onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>{initialData ? 'Editar Perfil' : 'Novo Perfil'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nome do Perfil (Nível & Cargo Oficial) *</label>
          <select
            required
            style={{ ...styles.input, fontWeight: 'bold', cursor: 'pointer' }}
            value={OFFICIAL_ROLES.some(r => r.name === role.name) ? role.name : (role.name ? 'custom' : '')}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'custom') {
                setRole(prev => ({ ...prev, name: '' }));
              } else {
                const matched = OFFICIAL_ROLES.find(r => r.name === val);
                
                // Se for um perfil provincial (Administrador ou Usuário), predefinir a matriz com os 10 módulos autorizados do SERNIC
                let newPerms = { ...role.permissions };
                if (val === 'Administrador' || val === 'Usuário') {
                  const ALLOWED = ['Dashboard', 'Funcionários', 'Contencioso Laboral', 'Processos Disciplinares', 'Efetividade (Faltas)', 'Avaliação de Desempenho', 'Férias e Licenças', 'Saúde e Óbitos', 'Transferências e Mobilidade', 'Relatórios e Impressão', 'Configurações'];
                  MODULES.forEach(m => {
                    newPerms[m] = ALLOWED.includes(m) ? [...ACTIONS] : [];
                  });
                } else if (val.includes('Super')) {
                  MODULES.forEach(m => { newPerms[m] = [...ACTIONS]; });
                }

                setRole(prev => ({
                  ...prev,
                  name: val,
                  description: matched ? matched.description : prev.description,
                  permissions: newPerms
                }));
              }
            }}
          >
            <option value="">-- Seleccionar Perfil Oficial --</option>
            {OFFICIAL_ROLES.map(r => (
              <option key={r.name} value={r.name}>
                [{r.level}] {r.name}
              </option>
            ))}
            <option value="custom">✍️ Outro / Perfil Personalizado...</option>
          </select>

          {(!OFFICIAL_ROLES.some(r => r.name === role.name) || role.name === '') && (
            <input
              type="text"
              placeholder="Escreva o nome do perfil..."
              required
              style={{ ...styles.input, marginTop: '8px' }}
              value={role.name}
              onChange={e => setRole({ ...role, name: e.target.value })}
            />
          )}
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Descrição Institucional</label>
          <input style={styles.input} value={role.description} onChange={e => setRole({...role, description: e.target.value})} placeholder="Descrição do perfil e atribuições..." />
        </div>
      </div>

      {/* Barra Profissional de Ações Globais: Selecionar Todos / Desmarcar Todos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🛡️ Matriz Institucional de Permissões por Módulo
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleSelectAll}
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#047857',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            title="Marcar todas as permissões de todos os módulos"
          >
            ✅ Selecionar Todos
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#b91c1c',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            title="Desmarcar todas as permissões da matriz"
          >
            ❌ Desmarcar Todos
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="premium-table" style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thLeft}>Módulo</th>
              {ACTIONS.map(action => (
                <th
                  key={action}
                  style={styles.th}
                  onClick={() => handleToggleColumn(action)}
                  title={`Clique para marcar/desmarcar a coluna "${action}" em todos os módulos`}
                >
                  {action} ⇅
                </th>
              ))}
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
