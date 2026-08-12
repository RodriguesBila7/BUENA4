import React, { useState } from 'react';
import useAuthData from '../../hooks/useAuthData';
import useAuditLog from '../../hooks/useAuditLog';
import useOrgData from '../../hooks/useOrgData';
import { useAuth } from '../../contexts/AuthContext';
import { filterByProvincialScope } from '../../utils/scopeUtils';
import UserForm from './UserForm';
import ConfirmModal from '../ConfirmModal';

const styles = {
  container: { padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  filterRow: { display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' },
  input: { padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)' },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnAction: { backgroundColor: 'transparent', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', color: 'var(--color-text-main)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '10px', textAlign: 'left', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' },
  td: { padding: '10px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-main)' }
};

export default function UserManager() {
  const { users, roles, addUser, updateUser, deleteUser } = useAuthData();
  const { logAction } = useAuditLog();
  const { data: orgData } = useOrgData();
  const { user: currentUser } = useAuth();

  const [view, setView] = useState('list'); // 'list', 'create', 'edit'
  const [editingUser, setEditingUser] = useState(null);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'alert', action: null });

  const showModal = (title, message, type, action = null) => {
    setModalConfig({ isOpen: true, title, message, type, action });
  };

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
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

  if (view === 'create' || view === 'edit') {
    return <UserForm initialData={view === 'edit' ? editingUser : null} onSave={handleSave} onCancel={() => setView('list')} />;
  }

  const filteredUsers = users.filter(u => {
    if(u.status === 'Inativo' && filterStatus !== 'Inativo') return false; // Hide inactive by default unless specifically filtered
    const q = searchTerm.toLowerCase();
    const mSearch = (u.nuit && u.nuit.toLowerCase().includes(q)) || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    const mRole = filterRole ? u.roleId === filterRole : true;
    const mStatus = filterStatus ? u.status === filterStatus : true;
    return mSearch && mRole && mStatus;
  });

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
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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
            <th>Perfil de Acesso</th>
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
              <td>{getRoleName(u.roleId)}</td>
              <td>
                <span style={{ color: u.status === 'Ativo' ? 'green' : u.status === 'Bloqueada' ? 'orange' : 'red', fontWeight: 'bold' }}>
                  {u.status}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={styles.btnAction} onClick={() => { setEditingUser(u); setView('edit'); }}>Editar</button>
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
