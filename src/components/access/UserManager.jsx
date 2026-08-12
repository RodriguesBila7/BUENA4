import React, { useState, useMemo } from 'react';
import useAuthData from '../../hooks/useAuthData';
import useAuditLog from '../../hooks/useAuditLog';
import useOrgData from '../../hooks/useOrgData';
import { useAuth } from '../../contexts/AuthContext';
import { filterByProvincialScope, isCentralUser } from '../../utils/scopeUtils';
import UserForm from './UserForm';
import ConfirmModal from '../ConfirmModal';

const styles = {
  container: { padding: '0', backgroundColor: 'transparent', width: '100%', boxSizing: 'border-box' },
  filterRow: { display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', width: '100%' },
  input: { padding: '9px 14px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px' },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', padding: '9px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  btnAction: { backgroundColor: 'transparent', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text-main)', fontSize: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: '600' },
  td: { padding: '12px 10px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-main)' }
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
        logAction(currentUser, 'Utilizadores', 'Criar', `Criou o utilizador ${userData.username}`);
        setView('list');
      } else showModal('Erro', res?.error || 'Erro ao criar utilizador', 'alert');
    } else {
      const res = await updateUser(editingUser.id, userData);
      if (res && res.success) {
        logAction(currentUser, 'Utilizadores', 'Editar', `Atualizou o utilizador ${userData.username}`);
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
    logAction(currentUser, 'Utilizadores', 'Exportar', 'Exportou lista de utilizadores');
  };

  const handleConfirmDelegation = async (userId, userName) => {
    try {
      const res = await fetch(`/api/auth/users/${userId}/confirm-delegation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: currentUser?.name || 'Perfil Superior Central' })
      });
      if (res.ok) {
        logAction(currentUser, 'Acessos', 'Confirmar Delegação', `Confirmou o perfil secundário do utilizador ${userName}`);
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
        logAction(currentUser, 'Acessos', 'Rejeitar Delegação', `Rejeitou a delegação de poderes do utilizador ${userName}`);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{margin: 0}}>Gestão de Utilizadores</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={styles.btnAction} onClick={exportToCSV}>Exportar CSV</button>
          <button style={styles.btnPrimary} onClick={() => setView('create')}>+ Adicionar Utilizador</button>
        </div>
      </div>

      <div style={styles.filterRow}>
        <input style={{...styles.input, flex: 1}} placeholder="Pesquisar por NUIT, Nome ou Username..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <select style={styles.input} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos os Perfis</option>
          {(roles || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select style={styles.input} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os Estados (Exceto Inativo)</option>
          <option value="Ativo">Ativo</option>
          <option value="Bloqueada">Bloqueada</option>
          <option value="Inativo">Inativo (Apagados)</option>
        </select>
      </div>

      <table className="premium-table">
        <thead>
          <tr>
            <th>Utilizador (Identificação & NUIT)</th>
            <th>Contactos</th>
            <th>Perfil de Acesso & Delegação</th>
            <th>Estado</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map(u => (
            <tr key={u.id}>
              <td>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  {u.photo ? <img src={u.photo} style={{width:'34px',height:'34px',borderRadius:'50%',objectFit:'cover'}} alt=""/> : <div style={{width:'34px',height:'34px',borderRadius:'50%',backgroundColor:'#ccc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'bold'}}>👤</div>}
                  <div>
                    <div style={{fontWeight: 'bold', fontSize: '13px'}}>{u.name}</div>
                    <div style={{fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold'}}>
                      💳 NUIT: {u.nuit || u.username} {u.username && u.username !== u.nuit ? `(@${u.username})` : ''}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div>{u.email}</div>
                <div style={{fontSize: '11px', color: 'var(--color-text-muted)'}}>{u.contact}</div>
              </td>
              <td>
                <div style={{ fontWeight: 'bold' }}>{getRoleName(u.roleId)}</div>
                {u.delegatedRoleId && (
                  <div style={{
                    marginTop: '4px', fontSize: '11px', padding: '4px 8px', borderRadius: '6px',
                    backgroundColor: u.delegationStatus === 'Pendente' ? 'rgba(234, 179, 8, 0.15)' : u.delegationStatus === 'Rejeitado' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: u.delegationStatus === 'Pendente' ? '#b45309' : u.delegationStatus === 'Rejeitado' ? '#b91c1c' : '#047857',
                    border: `1px solid ${u.delegationStatus === 'Pendente' ? 'rgba(234, 179, 8, 0.3)' : u.delegationStatus === 'Rejeitado' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                    display: 'inline-block'
                  }}>
                    🔄 Secundário: <strong>{getRoleName(u.delegatedRoleId)}</strong>
                    <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: 'bold' }}>
                      {u.delegationStatus === 'Pendente' && `⏳ Pendente de Confirmação Superior (${u.delegationRequestedBy || 'Solicitado por Admin'})`}
                      {u.delegationStatus === 'Aprovado' && `✅ Confirmado por Perfil Superior (${u.delegationApprovedBy || 'Central'})`}
                      {u.delegationStatus === 'Rejeitado' && `❌ Delegação Rejeitada`}
                    </div>
                    {u.delegationStartDate && u.delegationEndDate && (
                      <div style={{ fontSize: '10px', marginTop: '2px' }}>
                        📅 {u.delegationStartDate} a {u.delegationEndDate}
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td>
                <span style={{ color: u.status === 'Ativo' ? 'green' : u.status === 'Bloqueada' ? 'orange' : 'red', fontWeight: 'bold' }}>
                  {u.status}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button style={styles.btnAction} onClick={() => { setEditingUser(u); setView('edit'); }}>Editar</button>
                  {isCentralUser(currentUser) && u.delegatedRoleId && u.delegationStatus === 'Pendente' && (
                    <>
                      <button style={{...styles.btnAction, backgroundColor: '#047857', color: '#fff', fontWeight: 'bold'}} onClick={() => handleConfirmDelegation(u.id, u.name)}>✅ Confirmar Delegação</button>
                      <button style={{...styles.btnAction, color: '#b91c1c', borderColor: '#b91c1c'}} onClick={() => handleRejectDelegation(u.id, u.name)}>❌ Rejeitar</button>
                    </>
                  )}
                  {u.status === 'Ativo' && <button style={styles.btnAction} onClick={() => updateUser(u.id, {status: 'Bloqueada'})}>Bloquear</button>}
                  {u.status === 'Bloqueada' && <button style={styles.btnAction} onClick={() => updateUser(u.id, {status: 'Ativo', failedAttempts: 0, lockedUntil: null})}>Desbloquear</button>}
                  {u.status !== 'Inativo' && (
                    <button style={{...styles.btnAction, color: 'red', borderColor: 'red'}} onClick={() => {
                      showModal('Atenção', 'Eliminar (Soft Delete) este utilizador?', 'confirm', () => deleteUser(u.id));
                    }}>Eliminar</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
