import React, { useState, useMemo } from 'react';
import useAuthData from '../../../hooks/useAuthData';
import ConfirmModal from '../../ConfirmModal';
import DraggableModal from '../../common/DraggableModal';
import useDraggable from '../../../hooks/useDraggable';

export default function AccountList({ t }) {
  const { users, roles, addUser, updateUser } = useAuthData();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [formData, setFormData] = useState({
    id: '', name: '', username: '', email: '', contact: '', password: '', roleId: '', delegatedRoleId: '', delegationStartDate: '', delegationEndDate: '', status: 'Ativo'
  });
  const [formError, setFormError] = useState('');

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });
  const { position, onPointerDown } = useDraggable();

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(acc => 
      (acc.name && acc.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (acc.username && acc.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (acc.email && acc.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Sem Perfil';
  };

  const handleOpenCreate = () => {
    setFormError('');
    setFormData({ id: '', name: '', username: '', email: '', contact: '', password: '', roleId: roles.length > 0 ? roles[0].id : '', delegatedRoleId: '', delegationStartDate: '', delegationEndDate: '', status: 'Ativo' });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setFormError('');
    setFormData({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email || '',
      contact: user.contact || '',
      password: '', // Do not load password
      roleId: user.roleId,
      delegatedRoleId: user.delegatedRoleId || '',
      delegationStartDate: user.delegationStartDate || '',
      delegationEndDate: user.delegationEndDate || '',
      status: user.status || 'Ativo'
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleToggleStatus = (user) => {
    const newStatus = user.status === 'Ativo' ? 'Bloqueada' : 'Ativo';
    const actionName = newStatus === 'Bloqueada' ? 'bloquear' : 'desbloquear';
    
    setConfirmModal({
      isOpen: true,
      title: `${newStatus === 'Bloqueada' ? 'Bloquear' : 'Desbloquear'} Conta`,
      message: `Tem a certeza que deseja ${actionName} o acesso da conta pertencente a ${user.name}?`,
      isDestructive: newStatus === 'Bloqueada',
      onConfirm: () => {
        updateUser(user.id, { status: newStatus, lockedUntil: null, failedAttempts: 0 });
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.username || !formData.roleId) {
      setFormError('Por favor preencha todos os campos obrigatórios (*).');
      return;
    }

    if (modalMode === 'create' && !formData.password) {
      setFormError('A palavra-passe é obrigatória para novas contas.');
      return;
    }

    if (modalMode === 'create') {
      const result = addUser({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        contact: formData.contact,
        password: formData.password,
        roleId: formData.roleId,
        delegatedRoleId: formData.delegatedRoleId || null,
        delegationStartDate: formData.delegationStartDate || null,
        delegationEndDate: formData.delegationEndDate || null,
        status: formData.status
      });

      if (!result.success) {
        setFormError(result.error);
        return;
      }
    } else {
      const updatePayload = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        contact: formData.contact,
        roleId: formData.roleId,
        delegatedRoleId: formData.delegatedRoleId || null,
        delegationStartDate: formData.delegationStartDate || null,
        delegationEndDate: formData.delegationEndDate || null,
        status: formData.status
      };
      // Only update password if user typed something new
      if (formData.password.trim() !== '') {
        updatePayload.password = formData.password;
      }

      const result = updateUser(formData.id, updatePayload);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
    }

    setIsModalOpen(false);
  };

  return (
    <div className="animate-fade-in" style={styles.container}>
      {/* Header & Controls */}
      <div style={styles.header}>
        <div style={styles.searchWrapper}>
          <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Pesquisar por nome, utilizador ou email..." 
            style={styles.searchBar}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{...styles.button, backgroundColor: 'var(--color-primary)'}} onClick={handleOpenCreate}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '6px'}}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Nova Conta
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Utilizador</th>
              <th>Email</th>
              <th>Perfil de Acesso</th>
              <th>Último Login</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(acc => (
              <tr key={acc.id} style={styles.tr}>
                <td>
                  <div style={styles.userCell}>
                    <div style={styles.avatar}>{acc.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--color-text-base)' }}>{acc.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>@{acc.username}</div>
                    </div>
                  </div>
                </td>
                <td>{acc.email || '-'}</td>
                <td>
                  <span style={styles.roleBadge}>{getRoleName(acc.roleId)}</span>
                </td>
                <td>
                  <div style={{ fontSize: '12px' }}>
                    {acc.lastLogin ? new Date(acc.lastLogin).toLocaleString() : 'Nunca'}
                  </div>
                </td>
                <td>
                  <span style={styles.statusBadge(acc.status)}>{acc.status}</span>
                </td>
                <td style={{...styles.td, textAlign: 'right'}}>
                  <div style={styles.actions}>
                    <button onClick={() => handleOpenEdit(acc)} style={styles.actionBtn} title="Editar Conta">
                      ✏️ Editar
                    </button>
                    {acc.id !== 'usr_admin' && ( // Prevent blocking main admin
                      <button 
                        onClick={() => handleToggleStatus(acc)} 
                        style={{...styles.actionBtn, color: acc.status === 'Ativo' ? 'var(--color-danger)' : 'var(--color-success)'}}
                        title={acc.status === 'Ativo' ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                      >
                        {acc.status === 'Ativo' ? '🔒 Bloquear' : '🔓 Desbloq.'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="6" style={styles.empty}>
                  <div style={{ padding: '40px 0' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: 'var(--color-border)', marginBottom: '16px' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <div>Nenhuma conta encontrada.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Criação / Edição */}
      <DraggableModal
        isOpen={isModalOpen}
        title={modalMode === 'create' ? 'Criar Nova Conta' : 'Editar Conta'}
        onClose={() => setIsModalOpen(false)}
        maxWidth="520px"
      >
        <form onSubmit={handleSaveUser} style={styles.form}>
          {formError && (
            <div style={styles.errorAlert}>{formError}</div>
          )}

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nome Completo <span style={{color:'red'}}>*</span></label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={styles.input} placeholder="Ex: Mário Silva" required />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Username <span style={{color:'red'}}>*</span></label>
              <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} style={styles.input} placeholder="Ex: msilva" required />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email Corporativo</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={styles.input} placeholder="msilva@sernic.gov.mz" />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contacto Telefónico</label>
              <input type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} style={styles.input} placeholder="+258 8X XXX XXXX" />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Palavra-passe {modalMode === 'create' ? <span style={{color:'red'}}>*</span> : <span style={{fontSize:'10px', color:'var(--color-text-muted)'}}>(Preencha para alterar)</span>}</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={styles.input} placeholder="••••••••" />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Perfil de Acesso (Role) <span style={{color:'red'}}>*</span></label>
              <select value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})} style={styles.input} required>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Perfil Delegado (Substituição Temporária)</label>
              <select value={formData.delegatedRoleId} onChange={e => setFormData({...formData, delegatedRoleId: e.target.value})} style={styles.input}>
                <option value="">Nenhuma Delegação</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {formData.delegatedRoleId && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Início Delegação</label>
                  <input type="date" value={formData.delegationStartDate} onChange={(e) => {
                     const val = e.target.value;
                     if (val && !formData.delegationEndDate) {
                       const start = new Date(val);
                       start.setDate(start.getDate() + 35);
                       setFormData({...formData, delegationStartDate: val, delegationEndDate: start.toISOString().split('T')[0]});
                     } else {
                       setFormData({...formData, delegationStartDate: val});
                     }
                  }} style={styles.input} />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Fim Delegação</label>
                  <input type="date" value={formData.delegationEndDate} onChange={e => setFormData({...formData, delegationEndDate: e.target.value})} style={styles.input} />
                </div>
              </div>
            )}

            {modalMode === 'edit' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Estado da Conta <span style={{color:'red'}}>*</span></label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={styles.input} required disabled={formData.id === 'usr_admin'}>
                  <option value="Ativo">Ativo</option>
                  <option value="Bloqueada">Bloqueada</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            )}
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={() => setIsModalOpen(false)} style={styles.btnCancel}>Cancelar</button>
            <button type="submit" style={styles.btnSave}>
              {modalMode === 'create' ? 'Criar Conta' : 'Guardar Alterações'}
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* Reutilizando ConfirmModal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
  searchWrapper: { position: 'relative', flex: 1, minWidth: '300px', maxWidth: '400px' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' },
  searchBar: { width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', outline: 'none', transition: 'border-color 0.2s' },
  button: { display: 'flex', alignItems: 'center', padding: '10px 20px', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'opacity 0.2s' },
  
  tableContainer: { overflowX: 'auto', backgroundColor: 'var(--color-bg-base)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '14px 20px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' },
  tr: { transition: 'background-color 0.2s', borderBottom: '1px solid var(--color-border)' },
  td: { padding: '14px 20px', color: 'var(--color-text-base)' },
  userCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px', flexShrink: 0 },
  
  roleBadge: { padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(27, 54, 93, 0.08)', color: 'var(--color-primary)', fontSize: '11px', fontWeight: '700' },
  statusBadge: (status) => ({
    padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
    backgroundColor: status === 'Ativo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    color: status === 'Ativo' ? 'var(--color-success)' : 'var(--color-danger)'
  }),
  
  actions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  actionBtn: { padding: '6px 12px', fontSize: '12px', fontWeight: '600', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-base)', transition: 'all 0.2s' },
  empty: { textAlign: 'center', color: 'var(--color-text-muted)' },

  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' },
  modalContent: { backgroundColor: 'var(--color-bg-base)', borderRadius: '12px', width: '500px', maxWidth: '95%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out' },
  modalHeader: { padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--color-text-base)' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' },
  
  form: { display: 'flex', flexDirection: 'column' },
  formGrid: { padding: '24px', display: 'grid', gridTemplateColumns: '1fr', gap: '16px', maxHeight: '60vh', overflowY: 'auto' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-base)', outline: 'none', transition: 'border-color 0.2s', fontSize: '14px' },
  errorAlert: { margin: '20px 24px 0 24px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', borderRadius: '8px', fontSize: '13px', fontWeight: '500' },
  
  modalFooter: { padding: '20px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  btnCancel: { padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-base)', fontWeight: '600', cursor: 'pointer' },
  btnSave: { padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', fontWeight: '600', cursor: 'pointer' }
};
