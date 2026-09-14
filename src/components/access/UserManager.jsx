import React, { useState, useMemo } from 'react';
import useAuthData from '../../hooks/useAuthData';
import useAuditLog from '../../hooks/useAuditLog';
import useOrgData from '../../hooks/useOrgData';
import { useAuth } from '../../contexts/AuthContext';
import { filterByProvincialScope, isCentralUser, formatProvincialRoleName } from '../../utils/scopeUtils';
import UserForm from './UserForm';
import ConfirmModal from '../ConfirmModal';

const styles = {
  container: { padding: '0', backgroundColor: 'transparent', width: '100%', boxSizing: 'border-box' },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap', width: '100%' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px' },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  btnAction: { backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text-main)', fontSize: '12px', transition: 'all 0.15s ease' },
  tableWrapper: { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '10px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', marginBottom: '16px' },
  table: { width: '100%', minWidth: '1080px', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px' },
  th: { padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '11.5px', letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap', backgroundColor: 'var(--color-bg-card)' },
  td: { padding: '12px 16px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-main)', verticalAlign: 'middle' }
};

export default function UserManager() {
  const { users = [], roles = [], addUser, updateUser, deleteUser } = useAuthData();
  const { logAction } = useAuditLog();
  const { data: orgData } = useOrgData();
  const { user: currentUser } = useAuth();

  const [view, setView] = useState('list'); // 'list', 'create', 'edit'
  const [editingUser, setEditingUser] = useState(null);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'alert', action: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 1. Filtrar utilizadores com base no escopo provincial/central
  const scopedUsers = useMemo(() => {
    return filterByProvincialScope(users || [], currentUser, orgData);
  }, [users, currentUser, orgData]);

  // 2. Aplicar pesquisa e filtros de tabela
  const filteredUsers = useMemo(() => {
    const list = Array.isArray(scopedUsers) ? scopedUsers : [];
    return list.filter(u => {
      if (!u) return false;
      if (u.status === 'Inativo' && filterStatus !== 'Inativo') return false;
      const q = (searchTerm || '').toLowerCase();
      const mSearch = (u.nuit && u.nuit.toLowerCase().includes(q)) || (u.name && u.name.toLowerCase().includes(q)) || (u.username && u.username.toLowerCase().includes(q));
      const mRole = filterRole ? u.roleId === filterRole : true;
      const mStatus = filterStatus ? u.status === filterStatus : true;
      return mSearch && mRole && mStatus;
    });
  }, [scopedUsers, filterStatus, searchTerm, filterRole]);

  const showModal = (title, message, type, action = null) => {
    setModalConfig({ isOpen: true, title, message, type, action });
  };

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  const getRoleName = (roleId) => {
    const role = (roles || []).find(r => r.id === roleId);
    return role ? role.name : roleId;
  };

  const handleSave = async (userData) => {
    if (view === 'create') {
      const res = await addUser(userData);
      if (res && res.success) {
        logAction('Criar Utilizador', 'Utilizadores', `Criou o utilizador ${userData.username}`);
        setView('list');
      } else showModal('Erro', res?.error || 'Erro ao criar utilizador', 'alert');
    } else {
      const res = await updateUser(editingUser.id, userData);
      if (res && res.success) {
        logAction('Editar Utilizador', 'Utilizadores', `Atualizou o utilizador ${userData.username}`);
        setView('list');
      } else showModal('Erro', res?.error || 'Erro ao atualizar utilizador', 'alert');
    }
  };

  const exportToCSV = () => {
    const header = ['ID,Nome,Username,Email,Perfil,Estado,Criado_Em'];
    const rows = filteredUsers.map(u => 
      `${u.id},"${u.name}",${u.username},${u.email},"${getRoleName(u.roleId)}",${u.status},${u.createdAt}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-');
    link.setAttribute("download", `utilizadores_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logAction('Exportar Utilizadores', 'Utilizadores', 'Exportou lista de utilizadores');
  };

  const handleConfirmDelegation = async (userId, userName) => {
    try {
      const res = await fetch(`/api/auth/users/${userId}/confirm-delegation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: currentUser?.name || 'Perfil Superior Central' })
      });
      if (res.ok) {
        logAction('Confirmar Delegação', 'Acessos', `Confirmou o perfil secundário do utilizador ${userName}`);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectDelegation = async (userId, userName) => {
    try {
      const res = await fetch(`/api/auth/users/${userId}/reject-delegation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        logAction('Rejeitar Delegação', 'Acessos', `Rejeitou a delegação de poderes do utilizador ${userName}`);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (view === 'create' || view === 'edit') {
    return <UserForm initialData={view === 'edit' ? editingUser : null} onSave={handleSave} onCancel={() => setView('list')} />;
  }

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--color-primary)' }}>Gestão de Utilizadores</h3>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)', backgroundColor: 'rgba(179, 38, 30, 0.08)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(179, 38, 30, 0.2)' }}>
            {filteredUsers.length} utilizador(es)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={styles.btnAction} onClick={exportToCSV}>📥 Exportar CSV</button>
          <button style={styles.btnPrimary} onClick={() => setView('create')}>+ Adicionar Utilizador</button>
        </div>
      </div>

      <div style={styles.filterRow}>
        <input style={{ ...styles.input, flex: 1, minWidth: '220px' }} placeholder="Pesquisar por NUIT, Nome ou Username..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <select style={{ ...styles.input, minWidth: '160px' }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos os Perfis</option>
          {(roles || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select style={{ ...styles.input, minWidth: '170px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os Estados (Exceto Inativo)</option>
          <option value="Ativo">Ativo</option>
          <option value="Bloqueada">Bloqueada</option>
          <option value="Inativo">Inativo (Apagados)</option>
        </select>
      </div>

      <div style={styles.tableWrapper}>
        <table className="premium-table" style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '26%', minWidth: '250px' }}>Utilizador (Identificação & NUIT)</th>
              <th style={{ ...styles.th, width: '21%', minWidth: '190px' }}>Contactos</th>
              <th style={{ ...styles.th, width: '28%', minWidth: '270px' }}>Perfil & Delegação</th>
              <th style={{ ...styles.th, width: '10%', minWidth: '100px', textAlign: 'center' }}>Estado</th>
              <th style={{ ...styles.th, width: '15%', minWidth: '180px', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ ...styles.td, textAlign: 'center', padding: '26px', color: 'var(--color-text-muted)' }}>
                  Nenhum utilizador encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {u.photo ? (
                        <img src={u.photo} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-border)', flexShrink: 0 }} alt="" />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-bg-card)', border: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 'bold', flexShrink: 0 }}>
                          👤
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--color-text-base)', whiteSpace: 'nowrap' }}>{u.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(179, 38, 30, 0.08)',
                            color: 'var(--color-primary)',
                            border: '1px solid rgba(179, 38, 30, 0.2)',
                            whiteSpace: 'nowrap'
                          }}>
                            💳 NUIT: {u.nuit || u.username}
                          </span>
                          {u.username && u.username !== u.nuit && (
                            <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                              (@{u.username})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-text-base)', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px' }}>✉️</span>
                        <span>{u.email || 'Não informado'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px' }}>📞</span>
                        <span>{u.contact || 'Sem contacto'}</span>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '700', fontSize: '12px', color: 'var(--color-primary)', backgroundColor: 'var(--color-bg-card)', padding: '3px 8px', borderRadius: '5px', border: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                      🛡️ {formatProvincialRoleName(getRoleName(u.roleId), u.directorateId, orgData)}
                    </div>
                    {u.delegatedRoleId && (
                      <div style={{
                        marginTop: '5px',
                        fontSize: '10.5px',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        backgroundColor: u.delegationStatus === 'Pendente' ? 'rgba(234, 179, 8, 0.12)' : u.delegationStatus === 'Rejeitado' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: u.delegationStatus === 'Pendente' ? '#b45309' : u.delegationStatus === 'Rejeitado' ? '#b91c1c' : '#047857',
                        border: `1px solid ${u.delegationStatus === 'Pendente' ? 'rgba(234, 179, 8, 0.3)' : u.delegationStatus === 'Rejeitado' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        lineHeight: '1.4'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                          <span>🔄 Secundário:</span>
                          <strong>{formatProvincialRoleName(getRoleName(u.delegatedRoleId), u.directorateId, orgData)}</strong>
                        </div>
                        <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: '600' }}>
                          {u.delegationStatus === 'Pendente' && `⏳ Aguarda Conformidade (${u.delegationRequestedBy || 'Admin Provincial'})`}
                          {u.delegationStatus === 'Aprovado' && `✅ Concedida (${u.delegationApprovedBy || 'Central'})`}
                          {u.delegationStatus === 'Rejeitado' && `❌ Recusada`}
                        </div>
                        {u.delegationStartDate && u.delegationEndDate && (
                          <div style={{ fontSize: '9.5px', marginTop: '2px', opacity: 0.85, whiteSpace: 'nowrap' }}>
                            📅 {u.delegationStartDate} a {u.delegationEndDate}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      backgroundColor: u.status === 'Ativo' ? 'rgba(16, 185, 129, 0.12)' : u.status === 'Bloqueada' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: u.status === 'Ativo' ? '#047857' : u.status === 'Bloqueada' ? '#b45309' : '#b91c1c',
                      border: `1px solid ${u.status === 'Ativo' ? 'rgba(16, 185, 129, 0.3)' : u.status === 'Bloqueada' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                      <button style={{ ...styles.btnAction, fontWeight: '600' }} onClick={() => { setEditingUser(u); setView('edit'); }} title="Editar Utilizador">
                        ✏️ Editar
                      </button>
                      {isCentralUser(currentUser) && u.delegatedRoleId && u.delegationStatus === 'Pendente' && (
                        <>
                          <button style={{ ...styles.btnAction, backgroundColor: '#047857', color: '#fff', fontWeight: 'bold', borderColor: '#047857' }} onClick={() => handleConfirmDelegation(u.id, u.name)}>
                            ✍️ Confirmar
                          </button>
                          <button style={{ ...styles.btnAction, color: '#b91c1c', borderColor: '#b91c1c' }} onClick={() => handleRejectDelegation(u.id, u.name)}>
                            ❌ Recusar
                          </button>
                        </>
                      )}
                      {u.status === 'Ativo' && (
                        <button style={{ ...styles.btnAction, color: '#b45309', borderColor: 'rgba(245, 158, 11, 0.4)' }} onClick={() => updateUser(u.id, { status: 'Bloqueada' })} title="Bloquear Acesso">
                          🔒 Bloquear
                        </button>
                      )}
                      {u.status === 'Bloqueada' && (
                        <button style={{ ...styles.btnAction, color: '#047857', borderColor: 'rgba(16, 185, 129, 0.4)' }} onClick={() => updateUser(u.id, { status: 'Ativo', failedAttempts: 0, lockedUntil: null })} title="Desbloquear Acesso">
                          🔓 Desbloquear
                        </button>
                      )}
                      {u.status !== 'Inativo' && (
                        <button style={{ ...styles.btnAction, color: '#b91c1c', borderColor: 'rgba(239, 68, 68, 0.4)' }} onClick={() => {
                          showModal('Atenção', 'Eliminar (Soft Delete) este utilizador?', 'confirm', () => deleteUser(u.id));
                        }} title="Eliminar">
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
