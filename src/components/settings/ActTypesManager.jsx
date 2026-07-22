import React, { useState } from 'react';
import useActTypesData from '../../hooks/useActTypesData';
import ConfirmModal from '../ConfirmModal';
import DraggableModal from '../common/DraggableModal';

export default function ActTypesManager() {
  const { actTypes, loading, addActType, updateActType, deleteActType } = useActTypesData();
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
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Gestão de Tipos de Actos</h2>
          <p style={styles.subtitle}>Crie e agrupe os tipos de actos administrativos usados no sistema e mostrados no menu lateral.</p>
        </div>
        <button style={styles.btnAdd} onClick={handleOpenNew}>+ Novo Tipo de Acto</button>
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
                        backgroundColor: act.is_active === 1 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: act.is_active === 1 ? '#10B981' : '#EF4444'
                      }}>
                        {act.is_active === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', width: '150px' }}>
                      <button style={styles.btnAction} onClick={() => handleToggleActive(act)}>
                        {act.is_active === 1 ? 'Desativar' : 'Ativar'}
                      </button>
                      <button style={styles.btnAction} onClick={() => handleOpenEdit(act)}>✏️</button>
                      <button style={{ ...styles.btnAction, color: '#EF4444' }} onClick={() => handleDelete(act.id)}>🗑️</button>
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
            <label style={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                style={styles.checkbox}
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
  container: { padding: '24px', backgroundColor: 'var(--color-bg-base)', minHeight: '100%' },
  loading: { padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: 'var(--color-text-base)' },
  subtitle: { margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' },
  btnAdd: { padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  groupsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' },
  groupCard: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' },
  groupTitle: { margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: 'var(--color-text-base)', borderBottom: '2px solid var(--color-border)', paddingBottom: '8px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '12px 8px', fontSize: '14px', color: 'var(--color-text-base)' },
  badge: { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  btnAction: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'var(--color-text-muted)', fontSize: '13px' },
  
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)' },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-base)', fontWeight: '500' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' },
  btnCancel: { padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-base)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  btnSave: { padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }
};
