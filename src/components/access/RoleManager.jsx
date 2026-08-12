import React, { useState, useMemo } from 'react';
import useAuthData from '../../hooks/useAuthData';
import useAuditLog from '../../hooks/useAuditLog';
import { useAuth } from '../../contexts/AuthContext';
import RolePermissionsEditor from './RolePermissionsEditor';
import ConfirmModal from '../ConfirmModal';
import DraggableModal from '../common/DraggableModal';
import { showToast } from '../common/Toast';

const HIERARCHY_ORDER = {
  'Super Administrador Principal': 1,
  'Super Administrador': 2,
  'Administrador Principal': 3,
  'Administrador': 4,
  'Técnico de Pensões e Reserva': 5,
  'Técnico de Saúde e Óbitos': 6,
  'Usuário': 7
};

const getLevelInfo = (roleName) => {
  switch (roleName) {
    case 'Super Administrador Principal':
      return { level: '1º Nível (DRH)', icon: '👑', color: '#991b1b', bg: '#fef2f2', border: '#fca5a5' };
    case 'Super Administrador':
      return { level: '2º Nível (Gestão Pessoal)', icon: '⭐', color: '#1e40af', bg: '#eff6ff', border: '#93c5fd' };
    case 'Administrador Principal':
      return { level: '3º Nível (Central RH)', icon: '🛡️', color: '#065f46', bg: '#ecfdf5', border: '#6ee7b7' };
    case 'Administrador':
      return { level: '4º Nível (Provincial)', icon: '🏛️', color: '#6b21a8', bg: '#faf5ff', border: '#d8b4fe' };
    case 'Técnico de Pensões e Reserva':
      return { level: 'Específico (Reserva)', icon: '📜', color: '#9a3412', bg: '#fff7ed', border: '#ffedd5' };
    case 'Técnico de Saúde e Óbitos':
      return { level: 'Específico (Saúde)', icon: '⚕️', color: '#075985', bg: '#f0f9ff', border: '#bae6fd' };
    case 'Usuário':
      return { level: '5º Nível (Adjunto)', icon: '👥', color: '#334155', bg: '#f8fafc', border: '#cbd5e1' };
    default:
      return { level: 'Personalizado', icon: '🔹', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };
  }
};

const styles = {
  container: { padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' },
  statCard: { backgroundColor: 'var(--color-bg-card)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  statTitle: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' },
  statValue: { fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary)' },
  controlsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' },
  searchBar: { padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px', width: '280px' },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' },
  btnAction: { backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text-base)', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  badge: (info) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: info.color,
    backgroundColor: info.bg,
    border: `1px solid ${info.border}`
  })
};

export default function RoleManager() {
  const { roles, users, addRole, updateRole, deleteRole } = useAuthData();
  const { logAction } = useAuditLog();
  const { user: currentUser } = useAuth();

  const [view, setView] = useState('list'); // 'list', 'create', 'edit'
  const [editingRole, setEditingRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  // Modal State
  const [previewRole, setPreviewRole] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'alert', action: null });

  const showModal = (title, message, type, action = null) => {
    setModalConfig({ isOpen: true, title, message, type, action });
  };

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  // Lista Ordenada Hierarquicamente
  const sortedAndFilteredRoles = useMemo(() => {
    const list = [...(roles || [])];
    list.sort((a, b) => (HIERARCHY_ORDER[a.name] || 99) - (HIERARCHY_ORDER[b.name] || 99));

    return list.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchText = (r.name && r.name.toLowerCase().includes(q)) || (r.description && r.description.toLowerCase().includes(q));
      const info = getLevelInfo(r.name);
      const matchLevel = levelFilter ? info.level.includes(levelFilter) : true;
      return matchText && matchLevel;
    });
  }, [roles, searchQuery, levelFilter]);

  // Contadores KPi
  const totalRoles = roles.length;
  const adminRolesCount = roles.filter(r => (HIERARCHY_ORDER[r.name] || 99) <= 4).length;
  const specRolesCount = roles.filter(r => getLevelInfo(r.name).level.includes('Específico')).length;
  const totalAssignedUsers = (users || []).length;

  const handleSave = async (roleData) => {
    if (view === 'create') {
      const res = await addRole(roleData);
      if (res && res.success) {
        logAction(currentUser, 'Acessos', 'Criar Perfil', `Criou o perfil ${roleData.name}`);
        showToast('Perfil criado com sucesso!', 'success');
        setView('list');
      } else showModal('Erro', res?.error || 'Erro ao criar perfil', 'alert');
    } else {
      const res = await updateRole(editingRole.id, roleData);
      if (res && res.success) {
        logAction(currentUser, 'Acessos', 'Editar Perfil', `Atualizou o perfil ${roleData.name}`);
        showToast('Perfil atualizado com sucesso!', 'success');
        setView('list');
      } else showModal('Erro', res?.error || 'Erro ao atualizar perfil', 'alert');
    }
  };

  const handleDuplicate = (r) => {
    setEditingRole({
      name: `${r.name} (Cópia)`,
      description: `Cópia baseada no perfil ${r.name}`,
      permissions: { ...r.permissions }
    });
    setView('create');
  };

  if (view === 'create' || view === 'edit') {
    return <RolePermissionsEditor initialData={view === 'edit' ? editingRole : (editingRole || null)} onSave={handleSave} onCancel={() => { setEditingRole(null); setView('list'); }} />;
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* KPI Summary Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Total de Perfis</div>
          <div style={styles.statValue}>{totalRoles}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Perfis Administrativos</div>
          <div style={{ ...styles.statValue, color: 'var(--color-primary)' }}>{adminRolesCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Perfis Específicos</div>
          <div style={{ ...styles.statValue, color: '#c2410c' }}>{specRolesCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Utilizadores Associados</div>
          <div style={{ ...styles.statValue, color: '#047857' }}>{totalAssignedUsers}</div>
        </div>
      </div>

      {/* Controls & Search */}
      <div style={styles.controlsRow}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Pesquisar perfil ou descrição..."
            style={styles.searchBar}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{ ...styles.searchBar, width: '180px', cursor: 'pointer' }}
          >
            <option value="">Todos os Níveis</option>
            <option value="1º Nível">1º Nível (DRH)</option>
            <option value="2º Nível">2º Nível (Gestão Pessoal)</option>
            <option value="3º Nível">3º Nível (Central RH)</option>
            <option value="4º Nível">4º Nível (Provincial)</option>
            <option value="Específico">Específico</option>
            <option value="5º Nível">5º Nível (Adjunto)</option>
          </select>
        </div>

        <button style={styles.btnPrimary} onClick={() => { setEditingRole(null); setView('create'); }}>
          <span>+</span> Adicionar Perfil
        </button>
      </div>

      {/* Official Roles Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Nível Hierárquico</th>
              <th>Nome do Perfil</th>
              <th>Descrição Institucional</th>
              <th>Módulos Permitidos</th>
              <th>Utilizadores</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredRoles.map(r => {
              const info = getLevelInfo(r.name);
              const modulesCount = Object.keys(r.permissions || {}).filter(k => r.permissions[k] && r.permissions[k].length > 0).length;
              const assignedUsersCount = (users || []).filter(u => String(u.roleId) === String(r.id)).length;

              return (
                <tr key={r.id}>
                  <td>
                    <span style={styles.badge(info)}>
                      <span>{info.icon}</span> {info.level}
                    </span>
                  </td>
                  <td><strong>{r.name}</strong></td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '12px', maxWidth: '300px' }}>{r.description}</td>
                  <td>
                    <span style={{ fontWeight: 'bold', color: modulesCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      {modulesCount} Módulos
                    </span>
                  </td>
                  <td>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: assignedUsersCount > 0 ? 'rgba(4, 120, 87, 0.1)' : 'var(--color-bg-base)', color: assignedUsersCount > 0 ? '#047857' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 'bold' }}>
                      👤 {assignedUsersCount} {assignedUsersCount === 1 ? 'Utilizador' : 'Utilizadores'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button style={styles.btnAction} onClick={() => setPreviewRole(r)} title="Visualizar Matriz de Permissões">
                        👁️ Matriz
                      </button>
                      <button style={styles.btnAction} onClick={() => { setEditingRole(r); setView('edit'); }} title="Editar Permissões">
                        ✏️ Editar
                      </button>
                      <button style={styles.btnAction} onClick={() => handleDuplicate(r)} title="Duplicar Perfil">
                        📋 Duplicar
                      </button>
                      {r.id !== 'super_admin' && r.id !== 'super_admin_1' && (
                        <button
                          style={{ ...styles.btnAction, color: '#e53e3e', borderColor: '#feb2b2' }}
                          title="Eliminar Perfil"
                          onClick={() => {
                            if (assignedUsersCount > 0) {
                              showModal('Atenção', `Não é possível eliminar o perfil "${r.name}" porque existem ${assignedUsersCount} utilizador(es) associados. Reatribua os utilizadores primeiro.`, 'alert');
                              return;
                            }
                            showModal('Atenção', `Tem a certeza que deseja eliminar o perfil "${r.name}"?`, 'confirm', async () => {
                              const res = await deleteRole(r.id);
                              if (res && res.success) {
                                logAction(currentUser, 'Acessos', 'Eliminar Perfil', `Eliminou o perfil ${r.name}`);
                                showToast('Perfil eliminado com sucesso!', 'success');
                              } else showModal('Erro', res?.error || 'Erro ao eliminar perfil', 'alert');
                            });
                          }}
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedAndFilteredRoles.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                  Nenhum perfil encontrado para a pesquisa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Visualização da Matriz de Permissões */}
      <DraggableModal
        isOpen={!!previewRole}
        title={`Matriz de Permissões - ${previewRole?.name || ''}`}
        onClose={() => setPreviewRole(null)}
        maxWidth="700px"
      >
        {previewRole && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
              <strong>Descrição:</strong> {previewRole.description}
            </p>
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <table className="premium-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Módulo</th>
                    <th>Ações Permitidas</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(previewRole.permissions || {}).map(mod => {
                    const actions = previewRole.permissions[mod];
                    if (!actions || actions.length === 0) return null;
                    return (
                      <tr key={mod}>
                        <td><strong>{mod}</strong></td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {actions.map(act => (
                              <span key={act} style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(27,54,93,0.1)', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 'bold' }}>
                                {act}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setPreviewRole(null)} style={{ ...styles.btnPrimary, padding: '8px 16px' }}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </DraggableModal>

      <ConfirmModal 
        isOpen={modalConfig.isOpen} 
        title={modalConfig.title}
        message={modalConfig.message}
        hideCancel={modalConfig.type === 'alert'}
        onConfirm={() => {
          if (modalConfig.action) modalConfig.action();
          closeModal();
        }}
        onCancel={closeModal}
      />
    </div>
  );
}
