import React, { useState, useMemo } from 'react';
import useAuthData from '../../../hooks/useAuthData';
import useEmployeeData from '../../../hooks/useEmployeeData';
import useOrgData from '../../../hooks/useOrgData';
import ConfirmModal from '../../ConfirmModal';
import DraggableModal from '../../common/DraggableModal';
import useDraggable from '../../../hooks/useDraggable';
import { showToast } from '../../common/Toast';

export default function AccountList({ t }) {
  const { users, roles, addUser, updateUser, deleteUser } = useAuthData();
  const { employees } = useEmployeeData();
  const { data: orgData } = useOrgData();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // State para Pesquisa/Seleção de Funcionário no Modal
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  
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

  // Lista de funcionários filtrados para o dropdown do modal
  const filteredEmployeesList = useMemo(() => {
    const list = employees || [];
    if (!empSearchQuery.trim()) return list;
    const q = empSearchQuery.toLowerCase();
    return list.filter(emp => {
      const nameMatch = emp.name && emp.name.toLowerCase().includes(q);
      const nipMatch = emp.nip && String(emp.nip).toLowerCase().includes(q);
      const nuitMatch = emp.nuit && String(emp.nuit).toLowerCase().includes(q);
      return nameMatch || nipMatch || nuitMatch;
    });
  }, [employees, empSearchQuery]);

  const getDirectorateName = (directorateId) => {
    if (!orgData?.directorates) return '';
    const dir = orgData.directorates.find(d => String(d.id) === String(directorateId));
    return dir ? dir.name : '';
  };

  // Filtered Users na tabela principal
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(acc => {
      const matchText = (acc.name && acc.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                        (acc.username && acc.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (acc.email && acc.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchRole = roleFilter ? String(acc.roleId) === String(roleFilter) : true;
      return matchText && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Sem Perfil';
  };

  const handleOpenCreate = () => {
    setFormError('');
    setEmpSearchQuery('');
    setSelectedEmpId('');
    setFormData({ id: '', name: '', username: '', email: '', contact: '', password: '', roleId: roles.length > 0 ? roles[0].id : '', delegatedRoleId: '', delegationStartDate: '', delegationEndDate: '', status: 'Ativo' });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setFormError('');
    setEmpSearchQuery('');
    setSelectedEmpId('');
    setFormData({
      id: user.id || '',
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      contact: user.contact || '',
      password: '', // Do not load password
      roleId: user.roleId || '',
      delegatedRoleId: user.delegatedRoleId || '',
      delegationStartDate: user.delegationStartDate || '',
      delegationEndDate: user.delegationEndDate || '',
      status: user.status || 'Ativo'
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSelectEmployee = (empId) => {
    setSelectedEmpId(empId);
    if (!empId) return;

    const emp = (employees || []).find(e => String(e.id) === String(empId));
    if (emp) {
      // Sugerir username com base no nome do funcionário
      const nameParts = (emp.name || '').trim().split(' ').filter(Boolean);
      let suggestedUsername = '';
      if (nameParts.length >= 2) {
        suggestedUsername = `${nameParts[0]}${nameParts[nameParts.length - 1]}`;
      } else if (nameParts.length === 1) {
        suggestedUsername = nameParts[0];
      }
      suggestedUsername = suggestedUsername.replace(/[^a-zA-Z0-9]/g, '');

      // Sugerir email se não existir
      const suggestedEmail = emp.email || emp.contactEmail || (suggestedUsername ? `${suggestedUsername.toLowerCase()}@sernic.gov.mz` : '');
      const suggestedPhone = emp.phone || emp.contacto || emp.mobile || '';

      setFormData(prev => ({
        ...prev,
        name: emp.name || prev.name,
        username: prev.username || suggestedUsername || prev.username,
        email: suggestedEmail || prev.email,
        contact: suggestedPhone || prev.contact
      }));
    }
  };

  const handleToggleStatus = (user) => {
    const newStatus = user.status === 'Ativo' ? 'Bloqueada' : 'Ativo';
    const actionName = newStatus === 'Bloqueada' ? 'bloquear' : 'desbloquear';
    
    setConfirmModal({
      isOpen: true,
      title: `${newStatus === 'Bloqueada' ? 'Bloquear' : 'Desbloquear'} Conta`,
      message: `Tem a certeza que deseja ${actionName} o acesso da conta pertencente a ${user.name}?`,
      isDestructive: newStatus === 'Bloqueada',
      onConfirm: async () => {
        const res = await updateUser(user.id, { status: newStatus, lockedUntil: null, failedAttempts: 0 });
        if (res && res.success) {
          showToast(`Conta ${newStatus === 'Bloqueada' ? 'bloqueada' : 'desbloqueada'} com sucesso!`, 'success');
        } else {
          showToast(res?.error || 'Erro ao alterar estado da conta', 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteUser = (user) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Conta',
      message: `Tem a certeza que deseja ELIMINAR a conta de ${user.name}? Esta ação não pode ser desfeita.`,
      isDestructive: true,
      onConfirm: async () => {
        const res = await deleteUser(user.id);
        if (res && res.success) {
          showToast('Conta eliminada com sucesso!', 'success');
        } else {
          showToast(res?.error || 'Erro ao eliminar conta', 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSaveUser = async (e) => {
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

    try {
      if (modalMode === 'create') {
        const result = await addUser({
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

        if (!result || !result.success) {
          setFormError(result?.error || 'Erro ao criar conta.');
          return;
        }
        showToast('Nova conta criada com sucesso!', 'success');
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
        if (formData.password && formData.password.trim() !== '') {
          updatePayload.password = formData.password;
        }

        const result = await updateUser(formData.id, updatePayload);
        if (!result || !result.success) {
          setFormError(result?.error || 'Erro ao atualizar conta.');
          return;
        }
        showToast('Conta atualizada com sucesso!', 'success');
      }

      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Erro ao guardar dados da conta.');
    }
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

        {/* Filtro por Perfil (Role) */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-base)',
            color: 'var(--color-text-base)',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="">Todos os Perfis de Acesso</option>
          {roles.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ ...styles.button, backgroundColor: 'var(--color-primary)' }} onClick={handleOpenCreate}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
                    <div style={styles.avatar}>{acc.name ? acc.name.charAt(0).toUpperCase() : 'U'}</div>
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
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  <div style={styles.actions}>
                    <button onClick={() => handleOpenEdit(acc)} style={styles.actionBtn} title="Editar Conta">
                      ✏️ Editar
                    </button>
                    {acc.id !== 'usr_admin' && (
                      <>
                        <button 
                          onClick={() => handleToggleStatus(acc)} 
                          style={{ ...styles.actionBtn, color: acc.status === 'Ativo' ? 'var(--color-danger)' : 'var(--color-success)' }}
                          title={acc.status === 'Ativo' ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                        >
                          {acc.status === 'Ativo' ? '🔒 Bloquear' : '🔓 Desbloq.'}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(acc)} 
                          style={{ ...styles.actionBtn, color: '#e53e3e', borderColor: '#feb2b2' }}
                          title="Eliminar Conta"
                        >
                          🗑️ Eliminar
                        </button>
                      </>
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
        maxWidth="660px"
      >
        <form onSubmit={handleSaveUser} style={styles.form}>
          {formError && (
            <div style={styles.errorAlert}>{formError}</div>
          )}

          <div style={styles.formGrid}>
            {/* PESQUISA E SELEÇÃO DE FUNCIONÁRIO (PREENCHIMENTO AUTOMÁTICO) */}
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(27, 54, 93, 0.06)',
              border: '1px solid var(--color-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔍 Pesquisar & Selecionar Funcionário (Auto-preencher)
              </label>

              <input
                type="text"
                placeholder="Filtrar por nome, NUIT ou NIP..."
                value={empSearchQuery}
                onChange={(e) => setEmpSearchQuery(e.target.value)}
                style={{ ...styles.input, fontSize: '13px', backgroundColor: 'var(--color-bg-base)' }}
              />

              <select
                value={selectedEmpId}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                style={{ ...styles.input, fontWeight: 'bold', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', cursor: 'pointer' }}
              >
                <option value="">-- Seleccionar da Lista ({filteredEmployeesList.length} funcionários) --</option>
                {filteredEmployeesList.map(emp => {
                  const dirName = getDirectorateName(emp.directorateId);
                  return (
                    <option key={emp.id} value={emp.id}>
                      👤 {emp.name} {emp.nip ? `(NIP: ${emp.nip})` : (emp.nuit ? `(NUIT: ${emp.nuit})` : '')} {dirName ? `- ${dirName}` : ''}
                    </option>
                  );
                })}
              </select>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                💡 Ao selecionar um funcionário, Nome Completo, Email e Contacto serão preenchidos automaticamente.
              </p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nome Completo <span style={{ color: 'red' }}>*</span></label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={styles.input} placeholder="Ex: Mário Silva" required />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Username <span style={{ color: 'red' }}>*</span></label>
              <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} style={styles.input} placeholder="Ex: msilva" required />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email Corporativo</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={styles.input} placeholder="msilva@sernic.gov.mz" />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contacto Telefónico</label>
              <input type="text" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} style={styles.input} placeholder="+258 8X XXX XXXX" />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Palavra-passe {modalMode === 'create' ? <span style={{ color: 'red' }}>*</span> : <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>(Preencha para alterar)</span>}</label>
              <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} style={styles.input} placeholder="••••••••" />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Perfil de Acesso (Role) <span style={{ color: 'red' }}>*</span></label>
              <select value={formData.roleId} onChange={e => setFormData({ ...formData, roleId: e.target.value })} style={styles.input} required>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Perfil Delegado (Substituição Temporária)</label>
              <select value={formData.delegatedRoleId} onChange={e => setFormData({ ...formData, delegatedRoleId: e.target.value })} style={styles.input}>
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
                       setFormData({ ...formData, delegationStartDate: val, delegationEndDate: start.toISOString().split('T')[0] });
                     } else {
                       setFormData({ ...formData, delegationStartDate: val });
                     }
                  }} style={styles.input} />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Fim Delegação</label>
                  <input type="date" value={formData.delegationEndDate} onChange={e => setFormData({ ...formData, delegationEndDate: e.target.value })} style={styles.input} />
                </div>
              </div>
            )}

            {modalMode === 'edit' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Estado da Conta <span style={{ color: 'red' }}>*</span></label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} style={styles.input} required disabled={formData.id === 'usr_admin'}>
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
  
  form: { display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' },
  formGrid: { padding: '4px 0 16px 0', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '68vh', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', width: '100%' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-base)', outline: 'none', transition: 'border-color 0.2s', fontSize: '14px' },
  errorAlert: { margin: '0 0 16px 0', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', borderRadius: '8px', fontSize: '13px', fontWeight: '500', boxSizing: 'border-box' },
  
  modalFooter: { paddingTop: '16px', marginTop: '8px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%', boxSizing: 'border-box' },
  btnCancel: { padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-base)', fontWeight: '600', cursor: 'pointer' },
  btnSave: { padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', fontWeight: '600', cursor: 'pointer' }
};
