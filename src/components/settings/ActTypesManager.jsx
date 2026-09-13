import React, { useState, useMemo } from 'react';
import useActTypesData from '../../hooks/useActTypesData';
import { useAuth } from '../../contexts/AuthContext';
import { isPrimaryCentralAdmin, isSecondaryUser } from '../../utils/scopeUtils';
import ConfirmModal from '../ConfirmModal';
import DraggableModal from '../common/DraggableModal';

export default function ActTypesManager() {
  const { actTypes = [], loading, addActType, updateActType, deleteActType } = useActTypesData();
  const { user: currentUser } = useAuth();
  
  const isAuthorized = isPrimaryCentralAdmin(currentUser);
  const userIsSecondary = isSecondaryUser(currentUser);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, idToDelete: null, actName: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');

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
      group_name: actType.group_name || '',
      act_name: actType.act_name || '',
      is_active: actType.is_active ?? 1
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.act_name.trim()) return;

    if (editingType) {
      await updateActType(editingType.id, formData);
    } else {
      await addActType(formData);
    }
    setIsModalOpen(false);
  };

  const handleToggleActive = async (actType) => {
    await updateActType(actType.id, { 
      ...actType, 
      is_active: actType.is_active === 1 ? 0 : 1 
    });
  };

  const handleDelete = (act) => {
    setConfirmModal({ 
      isOpen: true, 
      idToDelete: act.id, 
      actName: act.act_name 
    });
  };

  const executeDelete = async () => {
    if (confirmModal.idToDelete) {
      await deleteActType(confirmModal.idToDelete);
      setConfirmModal({ isOpen: false, idToDelete: null, actName: '' });
    }
  };

  // Filtragem e Agrupamento
  const filteredActs = useMemo(() => {
    return actTypes.filter(act => {
      const matchSearch = !searchTerm || 
        act.act_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.group_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGroup = selectedGroupFilter === 'all' || act.group_name === selectedGroupFilter;
      return matchSearch && matchGroup;
    });
  }, [actTypes, searchTerm, selectedGroupFilter]);

  const uniqueGroups = useMemo(() => {
    const groups = new Set(actTypes.map(a => a.group_name).filter(Boolean));
    return Array.from(groups);
  }, [actTypes]);

  const groupedActs = useMemo(() => {
    return filteredActs.reduce((acc, act) => {
      const g = act.group_name || 'Outros Actos';
      if (!acc[g]) acc[g] = [];
      acc[g].push(act);
      return acc;
    }, {});
  }, [filteredActs]);

  // Se não tiver autorização central
  if (!isAuthorized) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        textAlign: 'center',
        margin: '24px'
      }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ color: '#DC2626', margin: '0 0 8px 0', fontSize: '22px', fontWeight: 'bold' }}>
          Acesso Restrito ao Módulo
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', maxWidth: '560px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
          O módulo de <strong>Gestão de Tipos de Actos Administrativos</strong> é de uso restrito aos <strong>Administradores Primários Centrais</strong> (Super Administrador Principal, Chefe da DRH e Administrador Principal).
        </p>
        <div style={{
          padding: '10px 18px',
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          border: '1.5px solid rgba(220, 38, 38, 0.3)',
          borderRadius: '8px',
          color: '#DC2626',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          🔒 Regra Institucional SERNIC — Acesso Bloqueado a Perfis Locais ou Secundários
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Aviso caso utilizador esteja operando sob perfil secundário delegado */}
      {userIsSecondary && (
        <div style={{
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          border: '1.5px solid #DC2626',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          color: '#991B1B',
          fontSize: '13px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '22px' }}>⛔</span>
          <div>
            <div>Acesso Restrito (Operando sob Perfil Secundário em Substituição):</div>
            <div style={{ fontWeight: 'normal', fontSize: '12px', marginTop: '2px', opacity: 0.9 }}>
              A alteração e remoção de Tipos de Actos estão bloqueadas para o modo secundário. Apenas o Administrador titular primário pode efetuar modificações na estrutura de actos.
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={styles.title}>📑 Gestão de Tipos de Actos Administrativos</h2>
            <span style={styles.totalBadge}>{actTypes.length} Actos Registados</span>
          </div>
          <p style={styles.subtitle}>
            Configuração institucional das tipologias de actos funcionais exibidos nos módulos, wizards e no menu lateral do sistema.
          </p>
        </div>
        <button
          style={{
            ...styles.btnAdd,
            opacity: userIsSecondary ? 0.5 : 1,
            cursor: userIsSecondary ? 'not-allowed' : 'pointer'
          }}
          onClick={userIsSecondary ? undefined : handleOpenNew}
          disabled={userIsSecondary}
          onMouseEnter={(e) => { if (!userIsSecondary) e.currentTarget.style.backgroundColor = '#B91C1C'; }}
          onMouseLeave={(e) => { if (!userIsSecondary) e.currentTarget.style.backgroundColor = '#DC2626'; }}
          title={userIsSecondary ? 'Bloqueado para perfil secundário' : 'Registar novo tipo de acto'}
        >
          + Novo Tipo de Acto
        </button>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div style={styles.filterBar}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Pesquisar por nome do acto ou grupo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              style={styles.clearSearchBtn}
              title="Limpar pesquisa"
            >
              ✕
            </button>
          )}
        </div>

        <div style={styles.groupFilterPills}>
          <button
            onClick={() => setSelectedGroupFilter('all')}
            style={{
              ...styles.pillBtn,
              backgroundColor: selectedGroupFilter === 'all' ? '#DC2626' : 'var(--color-bg-base)',
              color: selectedGroupFilter === 'all' ? '#FFFFFF' : 'var(--color-text-main)',
              borderColor: selectedGroupFilter === 'all' ? '#DC2626' : 'var(--color-border)'
            }}
          >
            Todos ({actTypes.length})
          </button>
          {uniqueGroups.map(grp => (
            <button
              key={grp}
              onClick={() => setSelectedGroupFilter(grp)}
              style={{
                ...styles.pillBtn,
                backgroundColor: selectedGroupFilter === grp ? '#DC2626' : 'var(--color-bg-base)',
                color: selectedGroupFilter === grp ? '#FFFFFF' : 'var(--color-text-main)',
                borderColor: selectedGroupFilter === grp ? '#DC2626' : 'var(--color-border)'
              }}
            >
              {grp} ({actTypes.filter(a => a.group_name === grp).length})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>
          <span style={{ fontSize: '24px' }}>⏳</span>
          <span>A carregar catálogo de tipos de actos...</span>
        </div>
      ) : Object.keys(groupedActs).length === 0 ? (
        <div style={styles.emptyBox}>
          <span style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</span>
          <strong style={{ fontSize: '15px' }}>Nenhum tipo de acto encontrado</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Tente ajustar os termos de pesquisa ou o filtro de categoria selecionado.
          </p>
        </div>
      ) : (
        <div style={styles.groupsContainer}>
          {Object.keys(groupedActs).map(group => (
            <div key={group} style={styles.groupCard}>
              <div style={styles.groupHeader}>
                <h3 style={styles.groupTitle}>📁 {group}</h3>
                <span style={styles.groupCountBadge}>{groupedActs[group].length} actos</span>
              </div>
              
              <table style={styles.table}>
                <tbody>
                  {groupedActs[group].map(act => (
                    <tr key={act.id} style={styles.tr}>
                      <td style={styles.tdName}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: act.is_active === 1 ? '#10B981' : '#94A3B8'
                          }} />
                          <strong>{act.act_name}</strong>
                        </div>
                      </td>
                      <td style={styles.tdStatus}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: act.is_active === 1 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: act.is_active === 1 ? '#059669' : '#DC2626',
                          border: act.is_active === 1 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                          {act.is_active === 1 ? '✓ Activo' : '✕ Inactivo'}
                        </span>
                      </td>
                      <td style={styles.tdActions}>
                        <button
                          style={{
                            ...styles.btnAction,
                            color: act.is_active === 1 ? '#D97706' : '#059669',
                            opacity: userIsSecondary ? 0.3 : 1,
                            cursor: userIsSecondary ? 'not-allowed' : 'pointer'
                          }}
                          onClick={userIsSecondary ? undefined : () => handleToggleActive(act)}
                          disabled={userIsSecondary}
                          title={act.is_active === 1 ? 'Desativar este acto' : 'Ativar este acto'}
                        >
                          {act.is_active === 1 ? 'Pausar' : 'Activar'}
                        </button>
                        <button
                          style={{
                            ...styles.btnAction,
                            color: 'var(--color-text-main)',
                            opacity: userIsSecondary ? 0.3 : 1,
                            cursor: userIsSecondary ? 'not-allowed' : 'pointer'
                          }}
                          onClick={userIsSecondary ? undefined : () => handleOpenEdit(act)}
                          disabled={userIsSecondary}
                          title="Editar nome ou grupo"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          style={{
                            ...styles.btnAction,
                            color: '#DC2626',
                            opacity: userIsSecondary ? 0.3 : 1,
                            cursor: userIsSecondary ? 'not-allowed' : 'pointer'
                          }}
                          onClick={userIsSecondary ? undefined : () => handleDelete(act)}
                          disabled={userIsSecondary}
                          title="Eliminar este tipo de acto"
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
      )}

      {/* Modal de Criação / Edição */}
      <DraggableModal
        isOpen={isModalOpen}
        title={editingType ? '✏️ Editar Tipo de Acto' : '✨ Novo Tipo de Acto Administrativo'}
        onClose={() => setIsModalOpen(false)}
        maxWidth="500px"
      >
        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Grupo / Categoria do Acto *</label>
            <input 
              type="text" 
              required 
              placeholder="Ex: Provimento e Cessação, Férias, Disciplinar..."
              style={styles.input}
              value={formData.group_name}
              onChange={(e) => setFormData({...formData, group_name: e.target.value})}
              list="group-suggestions"
            />
            <datalist id="group-suggestions">
              {uniqueGroups.map(g => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <span style={styles.fieldHint}>
              Os actos agrupam-se na mesma categoria para organização nos relatórios e menus.
            </span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nome Oficial do Acto *</label>
            <input 
              type="text" 
              required 
              placeholder="Ex: Nomeação, Louvor, Despromoção..."
              style={styles.input}
              value={formData.act_name}
              onChange={(e) => setFormData({...formData, act_name: e.target.value})}
            />
          </div>

          <div style={{ ...styles.formGroup, backgroundColor: 'var(--color-bg-subtle)', padding: '12px', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-main)', fontWeight: '600' }}>
              <input 
                type="checkbox" 
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                style={{ width: '16px', height: '16px', accentColor: '#DC2626' }}
              />
              Acto Activo no Sistema (Disponível para seleção imediata)
            </label>
          </div>
          
          <div style={styles.modalFooter}>
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              style={styles.btnCancel}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              style={styles.btnSave}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
            >
              {editingType ? 'Salvar Alterações' : 'Criar Tipo de Acto'}
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* Modal de Confirmação de Eliminação */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title="Eliminar Tipo de Acto Administrativo"
        message={`Tem a certeza que deseja eliminar o acto "${confirmModal.actName}"? Esta ação removerá a tipologia do catálogo do sistema.`}
        confirmText="Sim, Eliminar"
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setConfirmModal({ isOpen: false, idToDelete: null, actName: '' })}
      />
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    backgroundColor: 'var(--color-bg-base)',
    minHeight: '100%'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--color-text-main)'
  },
  totalBadge: {
    fontSize: '12px',
    padding: '3px 8px',
    borderRadius: '12px',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    color: '#DC2626',
    fontWeight: '700'
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    maxWidth: '750px',
    lineHeight: '1.5'
  },
  btnAdd: {
    padding: '10px 20px',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  filterBar: {
    display: 'flex',
    gap: '14px',
    alignItems: 'center',
    marginBottom: '22px',
    flexWrap: 'wrap'
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-main)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: '12px'
  },
  groupFilterPills: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  pillBtn: {
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid var(--color-border)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '40px',
    color: 'var(--color-text-muted)',
    fontSize: '14px'
  },
  emptyBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px 20px',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '12px',
    border: '1px dashed var(--color-border)',
    textAlign: 'center',
    color: 'var(--color-text-main)'
  },
  groupsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '18px'
  },
  groupCard: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '10px',
    padding: '16px 18px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px'
  },
  groupTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-text-main)'
  },
  groupCountBadge: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: '600'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tr: {
    borderBottom: '1px solid var(--color-border)'
  },
  tdName: {
    padding: '10px 4px',
    fontSize: '13px',
    color: 'var(--color-text-main)'
  },
  tdStatus: {
    padding: '10px 4px',
    width: '90px',
    textAlign: 'center'
  },
  tdActions: {
    padding: '10px 4px',
    textAlign: 'right',
    width: '140px',
    whiteSpace: 'nowrap'
  },
  badge: {
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    display: 'inline-block'
  },
  btnAction: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 6px',
    fontSize: '11.5px',
    fontWeight: '600',
    borderRadius: '4px',
    transition: 'background-color 0.15s ease'
  },
  form: {
    padding: '16px 4px 4px'
  },
  formGroup: {
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--color-text-main)'
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-main)',
    fontSize: '13px',
    boxSizing: 'border-box',
    outline: 'none'
  },
  fieldHint: {
    fontSize: '11px',
    color: 'var(--color-text-muted)'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px'
  },
  btnCancel: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text-main)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px'
  },
  btnSave: {
    padding: '8px 20px',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '13px',
    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)',
    transition: 'all 0.2s ease'
  }
};
