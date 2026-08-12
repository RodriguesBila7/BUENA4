import React, { useState } from 'react';
import useActTypesData from '../../hooks/useActTypesData';
import { useAuth } from '../../contexts/AuthContext';
import { isSecondaryUser } from '../../utils/scopeUtils';
import ConfirmModal from '../ConfirmModal';
import DraggableModal from '../common/DraggableModal';

export default function ActTypesManager() {
  const { actTypes, loading, addActType, updateActType, deleteActType } = useActTypesData();
  const { user: currentUser } = useAuth();
  const userIsSecondary = isSecondaryUser(currentUser);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, idToDelete: null });
  
  const [formData, setFormData] = useState({
    group_name: '',
    act_name: '',
    is_active: 1
  });

  const handleOpenNew = () => {
    setEditingType(null);
    setFormData({ group_name: '', act_name: '', is_active: 1 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (actType) => {
    setEditingType(actType);
    setFormData({
      group_name: actType.group_name,
      act_name: actType.act_name,
      is_active: actType.is_active
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingType) {
      await updateActType(editingType.id, formData);
    } else {
      await addActType(formData);
    }
    setIsModalOpen(false);
  };

  const handleToggleActive = async (actType) => {
    await updateActType(actType.id, { ...actType, is_active: actType.is_active === 1 ? 0 : 1 });
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, idToDelete: id });
  };

  const executeDelete = async () => {
    if (confirmModal.idToDelete) {
      await deleteActType(confirmModal.idToDelete);
      setConfirmModal({ isOpen: false, idToDelete: null });
    }
  };

  if (loading) return <div style={styles.loading}>A carregar Tipos de Acto...</div>;

  const groupedActs = actTypes.reduce((acc, act) => {
    if (!acc[act.group_name]) acc[act.group_name] = [];
    acc[act.group_name].push(act);
    return acc;
  }, {});

  return (
    <div style={styles.container}>
      {userIsSecondary && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1.5px solid #ef4444',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          color: '#991b1b',
          fontSize: '13px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '22px' }}>⛔</span>
          <div>
            <div>Acesso Restrito (Perfil Secundário / Delegado em Substituição):</div>
            <div style={{ fontWeight: 'normal', fontSize: '12px', marginTop: '2px', opacity: 0.9 }}>
              A criação, alteração e eliminação de Tipos de Actos Administrativos estão <u>bloqueadas</u> para utilizadores que operam sob perfil secundário. Apenas o Administrador titular possui competência para gerir Tipos de Actos.
            </div>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Gestão de Tipos de Actos</h2>
          <p style={styles.subtitle}>Crie e agrupe os tipos de actos administrativos usados no sistema e mostrados no menu lateral.</p>
        </div>
        <button
          style={{
            ...styles.btnAdd,
            opacity: userIsSecondary ? 0.4 : 1,
            cursor: userIsSecondary ? 'not-allowed' : 'pointer',
            backgroundColor: userIsSecondary ? '#94a3b8' : '#2563eb'
          }}
          onClick={userIsSecondary ? undefined : handleOpenNew}
          disabled={userIsSecondary}
          title={userIsSecondary ? 'Bloqueado para utilizadores operando sob perfil secundário' : ''}
        >
          + Novo Tipo de Acto
        </button>
      </div>

      <div style={styles.groupsContainer}>
        {Object.keys(groupedActs).map(group => (
          <div key={group} style={styles.groupCard}>
            <h3 style={styles.groupTitle}>{group}</h3>
            <table className="premium-table">
              <tbody>
                {groupedActs[group].map(act => (
                  <tr key={act.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: '500' }}>{act.act_name}</td>
                    <td style={{ ...styles.td, width: '100px' }}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: act.is_active === 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: act.is_active === 1 ? '#059669' : '#dc2626'
                      }}>
                        {act.is_active === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', width: '150px' }}>
                      <button
                        style={{ ...styles.btnAction, opacity: userIsSecondary ? 0.3 : 1, cursor: userIsSecondary ? 'not-allowed' : 'pointer' }}
                        onClick={userIsSecondary ? undefined : () => handleToggleActive(act)}
                        disabled={userIsSecondary}
                        title={userIsSecondary ? 'Bloqueado para perfil secundário' : ''}
                      >
                        {act.is_active === 1 ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        style={{ ...styles.btnAction, opacity: userIsSecondary ? 0.3 : 1, cursor: userIsSecondary ? 'not-allowed' : 'pointer' }}
                        onClick={userIsSecondary ? undefined : () => handleOpenEdit(act)}
                        disabled={userIsSecondary}
                        title={userIsSecondary ? 'Bloqueado para perfil secundário' : ''}
                      >
                        ✏️
                      </button>
                      <button
                        style={{ ...styles.btnAction, color: '#dc2626', opacity: userIsSecondary ? 0.3 : 1, cursor: userIsSecondary ? 'not-allowed' : 'pointer' }}
                        onClick={userIsSecondary ? undefined : () => handleDelete(act.id)}
                        disabled={userIsSecondary}
                        title={userIsSecondary ? 'Bloqueado para perfil secundário' : ''}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <DraggableModal
        isOpen={isModalOpen}
        title={editingType ? 'Editar Tipo de Acto' : 'Novo Tipo de Acto'}
        onClose={() => setIsModalOpen(false)}
        maxWidth="500px"
      >
        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Grupo (Ex: Promoções, Férias, etc.)</label>
            <input 
              type="text" required style={styles.input}
              value={formData.group_name}
              onChange={(e) => setFormData({...formData, group_name: e.target.value})}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nome do Acto (Ex: Promoção, Destacamento)</label>
            <input 
              type="text" required style={styles.input}
              value={formData.act_name}
              onChange={(e) => setFormData({...formData, act_name: e.target.value})}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-base)' }}>
              <input 
                type="checkbox" 
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
              />
              Acto Activo
            </label>
          </div>
          
          <div style={styles.modalFooter}>
            <button type="button" onClick={() => setIsModalOpen(false)} style={styles.btnCancel}>Cancelar</button>
            <button type="submit" style={styles.btnSave}>Gravar Tipo de Acto</button>
          </div>
        </form>
      </DraggableModal>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title="Eliminar Tipo de Acto"
        message="Tem a certeza que deseja eliminar este tipo de acto? Isto pode causar problemas se houver histórico registado com ele."
        confirmText="Eliminar"
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setConfirmModal({ isOpen: false, idToDelete: null })}
      />
    </div>
  );
}

const styles = {
  container: { padding: '24px' },
  loading: { padding: '24px', textAlign: 'center', color: '#64748b' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { margin: '0 0 8px 0', fontSize: '24px', color: '#1e293b' },
  subtitle: { margin: 0, fontSize: '14px', color: '#64748b' },
  btnAdd: { padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' },
  groupsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' },
  groupCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  groupTitle: { margin: '0 0 16px 0', fontSize: '16px', color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 8px', fontSize: '14px', color: '#475569' },
  badge: { padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  btnAction: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#64748b', fontSize: '13px' },
  
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modal: { backgroundColor: 'white', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  modalHeader: { padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' },
  form: { padding: '20px' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#475569' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #cbd5e0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' },
  btnCancel: { padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #cbd5e0', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
  btnSave: { padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }
};
