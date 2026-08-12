import React, { useState } from 'react';
import useAuthData from '../../hooks/useAuthData';
import useAuditLog from '../../hooks/useAuditLog';
import { useAuth } from '../../contexts/AuthContext';
import RolePermissionsEditor from './RolePermissionsEditor';
import ConfirmModal from '../ConfirmModal';

const styles = {
  container: { padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px', fontSize: '13px' },
  th: { padding: '10px', textAlign: 'left', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' },
  td: { padding: '10px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-main)' },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnAction: { backgroundColor: 'transparent', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', color: 'var(--color-text-main)' },
};

export default function RoleManager() {
  const { roles, addRole, updateRole, deleteRole } = useAuthData();
  const { logAction } = useAuditLog();
  const { user: currentUser } = useAuth();

  const [view, setView] = useState('list'); // 'list', 'create', 'edit'
  const [editingRole, setEditingRole] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'alert', action: null });

  const showModal = (title, message, type, action = null) => {
    setModalConfig({ isOpen: true, title, message, type, action });
  };

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  const handleSave = async (roleData) => {
    if (view === 'create') {
      const res = await addRole(roleData);
      if (res && res.success) {
        logAction(currentUser, 'Acessos', 'Criar Perfil', `Criou o perfil ${roleData.name}`);
        setView('list');
      } else showModal('Erro', res?.error || 'Erro ao criar perfil', 'alert');
    } else {
      const res = await updateRole(editingRole.id, roleData);
      if (res && res.success) {
        logAction(currentUser, 'Acessos', 'Editar Perfil', `Atualizou o perfil ${roleData.name}`);
        setView('list');
      } else showModal('Erro', res?.error || 'Erro ao atualizar perfil', 'alert');
    }
  };

  if (view === 'create' || view === 'edit') {
    return <RolePermissionsEditor initialData={view === 'edit' ? editingRole : null} onSave={handleSave} onCancel={() => setView('list')} />;
  }

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{margin: 0}}>Gestão de Perfis de Acesso</h3>
        <button style={styles.btnPrimary} onClick={() => setView('create')}>+ Adicionar Perfil</button>
      </div>
      
      <table className="premium-table">
        <thead>
          <tr>
            <th>Nome do Perfil</th>
            <th>Descrição</th>
            <th>Nº de Módulos Permitidos</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(r => {
            const modulesCount = Object.keys(r.permissions || {}).filter(k => r.permissions[k] && r.permissions[k].length > 0).length;
            return (
              <tr key={r.id}>
                <td><strong>{r.name}</strong></td>
                <td>{r.description}</td>
                <td>{modulesCount} Módulos</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={styles.btnAction} onClick={() => { setEditingRole(r); setView('edit'); }}>Editar Permissões</button>
                    {r.id !== 'super_admin' && r.id !== 'super_admin_1' && (
                      <button style={{...styles.btnAction, color: 'red', borderColor: 'red'}} onClick={() => {
                        showModal('Atenção', 'Eliminar este perfil?', 'confirm', async () => {
                          const res = await deleteRole(r.id);
                          if (res && res.success) {
                            logAction(currentUser, 'Acessos', 'Eliminar Perfil', `Eliminou o perfil ${r.name}`);
                          } else showModal('Erro', res?.error || 'Erro ao eliminar perfil', 'alert');
                        });
                      }}>Eliminar</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
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
