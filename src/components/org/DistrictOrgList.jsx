import React, { useState, useMemo } from 'react';
import useOrgData from '../../hooks/useOrgData';
import useEmployeeData from '../../hooks/useEmployeeData';
import ConfirmModal from '../ConfirmModal';
import CrudActionButtons from '../common/CrudActionButtons';

export default function DistrictOrgList({ data, t }) {
  const { 
    updateDistrict, toggleDistrictStatus,
    addSection, updateSection, deleteSection, toggleStatus
  } = useOrgData();

  const { employees } = useEmployeeData();

  const [selectedProvId, setSelectedProvId] = useState('');
  const [editingDistId, setEditingDistId] = useState(null);
  const [distNotes, setDistNotes] = useState('');
  const [distStatus, setDistStatus] = useState('Ativo');

  // Expanded District accordion
  const [expandedDistId, setExpandedDistId] = useState(null);

  // Section CRUD states
  const [editingSecId, setEditingSecId] = useState(null);
  const [secName, setSecName] = useState('');
  const [newSecName, setNewSecName] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null, isDestructive: false });

  // Filtrar Direções Provinciais ativas
  const provincialDirs = useMemo(() => {
    return (data.directorates || []).filter(d => d.province && d.isActive);
  }, [data.directorates]);

  // Filtrar distritos da Direção Provincial selecionada
  const districts = useMemo(() => {
    if (!selectedProvId) return [];
    return (data.districtDirectorates || []).filter(d => d.provincialDirectorateId === selectedProvId);
  }, [selectedProvId, data.districtDirectorates]);

  const handleEditNotes = (dist) => {
    setEditingDistId(dist.id);
    setDistNotes(dist.notes || '');
    setDistStatus(dist.status || 'Ativo');
  };

  const handleSaveDistrict = async (distId) => {
    const success = await updateDistrict(distId, distNotes, distStatus);
    if (success) {
      setEditingDistId(null);
    } else {
      setErrorMsg('Erro ao guardar as alterações.');
    }
  };

  const handleToggleDistrict = async (distId) => {
    await toggleDistrictStatus(distId);
  };

  // Secções CRUD
  const handleAddSection = async (distId) => {
    if (!newSecName.trim()) return;
    const secId = 'sec_dist_' + distId.substring(5) + '_' + Date.now().toString(36);
    // parentType === 'districtId' para secções vinculadas directamente a Direções Distritais
    const success = await addSection(distId, newSecName.trim(), 'districtId');
    if (success) {
      setNewSecName('');
    } else {
      setErrorMsg('Erro ao criar secção.');
    }
  };

  const handleEditSection = (sec) => {
    setEditingSecId(sec.id);
    setSecName(sec.name);
  };

  const handleSaveSectionName = async (sec) => {
    if (!secName.trim()) return;
    const success = await updateSection(sec.id, secName.trim(), sec.districtDirectorateId, 'districtId');
    if (success) {
      setEditingSecId(null);
    } else {
      setErrorMsg('Erro ao atualizar secção.');
    }
  };

  const requestDeleteSec = (sec) => {
    // Verificar se tem funcionários
    const hasEmployees = employees.some(emp => emp.sectionId === sec.id && emp.isActive);
    if (hasEmployees) {
      setConfirmModal({
        isOpen: true,
        title: 'Exclusão Bloqueada',
        message: 'Esta secção não pode ser excluída porque possui funcionários ativos alocados a ela. Transfira os funcionários antes de a eliminar.',
        isDestructive: false,
        action: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Eliminação',
      message: `Tem a certeza que deseja eliminar a secção "${sec.name}"? Esta ação não pode ser desfeita.`,
      isDestructive: true,
      action: () => executeDeleteSec(sec.id)
    });
  };

  const executeDeleteSec = async (secId) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    const success = await deleteSection(secId);
    if (!success) {
      setErrorMsg('Erro ao eliminar a secção.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Seletor Provincial */}
      <div style={styles.headerCard}>
        <h3 style={styles.cardTitle}>Gerir Estrutura Distrital</h3>
        <div style={styles.formGroup}>
          <label style={styles.label}>Selecione a Direção Provincial</label>
          <select 
            value={selectedProvId} 
            onChange={(e) => {
              setSelectedProvId(e.target.value);
              setExpandedDistId(null);
              setEditingDistId(null);
            }} 
            style={styles.select}
          >
            <option value="">-- Escolha uma Direção Provincial --</option>
            {provincialDirs.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.province})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedProvId ? (
        <div style={styles.listSection}>
          <h4 style={styles.sectionTitle}>Direções Distritais Associadas</h4>
          
          {districts.length > 0 ? (
            <div style={styles.accordionContainer}>
              {districts.map(dist => {
                const isExpanded = expandedDistId === dist.id;
                const isEditing = editingDistId === dist.id;
                const distSecs = (data.sections || []).filter(s => s.districtDirectorateId === dist.id);

                return (
                  <div key={dist.id} style={styles.accCard}>
                    {/* Header */}
                    <div style={styles.accHeader} onClick={() => !isEditing && setExpandedDistId(isExpanded ? null : dist.id)}>
                      <div style={styles.accTitleCol}>
                        <span style={styles.accName}>{dist.name}</span>
                        <span style={styles.accCode}>{dist.code}</span>
                      </div>
                      
                      <div style={styles.accMetaCol}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: dist.status === 'Ativo' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: dist.status === 'Ativo' ? '#10B981' : '#EF4444'
                        }}>
                          {dist.status}
                        </span>
                        
                        <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
                          {!isEditing ? (
                            <>
                              <button onClick={() => handleEditNotes(dist)} style={styles.btnAction} title="Editar Observações">✎</button>
                              <button onClick={() => handleToggleDistrict(dist.id)} style={styles.btnAction} title="Activar/Desactivar">⏻</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleSaveDistrict(dist.id)} style={styles.btnSave}>Gravar</button>
                              <button onClick={() => setEditingDistId(null)} style={styles.btnCancel}>Cancelar</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Editor Form (if editing notes/status inline) */}
                    {isEditing && (
                      <div style={styles.editorBox}>
                        <div style={styles.editorGrid}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Estado</label>
                            <select value={distStatus} onChange={(e) => setDistStatus(e.target.value)} style={styles.select}>
                              <option value="Ativo">Ativo</option>
                              <option value="Inativo">Inativo</option>
                            </select>
                          </div>
                          <div style={{ ...styles.formGroup, flex: 2 }}>
                            <label style={styles.label}>Observações / Notas</label>
                            <input 
                              type="text" 
                              value={distNotes} 
                              onChange={(e) => setDistNotes(e.target.value)} 
                              style={styles.input} 
                              placeholder="Adicione observações..."
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expandable Section Panel (Accordion Body) */}
                    {isExpanded && !isEditing && (
                      <div style={styles.accBody}>
                        {dist.notes && (
                          <div style={styles.notesBox}>
                            <strong>Notas:</strong> {dist.notes}
                          </div>
                        )}

                        <h5 style={styles.subTitle}>Secções da Direção Distrital</h5>
                        
                        {/* List Secções */}
                        <div style={styles.secsList}>
                          {distSecs.map(sec => {
                            const isSecEditing = editingSecId === sec.id;

                            return (
                              <div key={sec.id} style={styles.secItem}>
                                {isSecEditing ? (
                                  <div style={styles.secEditRow}>
                                    <input 
                                      type="text" 
                                      value={secName} 
                                      onChange={(e) => setSecName(e.target.value)} 
                                      onKeyDown={(e) => e.key === 'Enter' && handleSaveSectionName(sec)}
                                      style={styles.inputCompact}
                                    />
                                    <button onClick={() => handleSaveSectionName(sec)} style={styles.btnSaveCompact}>✓</button>
                                    <button onClick={() => setEditingSecId(null)} style={styles.btnCancelCompact}>✕</button>
                                  </div>
                                ) : (
                                  <>
                                    <span style={styles.secTextName}>{sec.name}</span>
                                    <CrudActionButtons 
                                      onEdit={() => handleEditSection(sec)}
                                      onDelete={() => requestDeleteSec(sec)}
                                      extraButtons={
                                        <button onClick={() => toggleStatus('sections', sec.id)} style={styles.btnSecAction} title="Toggle status">
                                          <span style={{ color: sec.isActive ? '#10B981' : '#EF4444' }}>⏻</span>
                                        </button>
                                      }
                                    />
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Add Section Form */}
                        <div style={styles.addSecRow}>
                          <input 
                            type="text" 
                            value={newSecName} 
                            onChange={(e) => setNewSecName(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSection(dist.id)}
                            placeholder="Nome da nova secção..." 
                            style={styles.inputCompact}
                          />
                          <button onClick={() => handleAddSection(dist.id)} style={styles.btnAddSec}>Adicionar Secção</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.noData}>Nenhum distrito configurado para esta Província.</div>
          )}
        </div>
      ) : (
        <div style={styles.placeholderContainer}>
          <p>Escolha uma Direção Provincial no menu para visualizar e gerir as respetivas Direções Distritais oficiais.</p>
        </div>
      )}

      {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        isDestructive={confirmModal.isDestructive} 
        action={confirmModal.action} 
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    animation: 'fadeIn 0.3s ease'
  },
  headerCard: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--color-text-base)',
    marginBottom: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '400px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    marginBottom: '8px'
  },
  select: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    fontSize: '14px'
  },
  input: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    fontSize: '14px'
  },
  listSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  accordionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  accCard: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
  },
  accHeader: {
    padding: '18px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgba(0,0,0,0.01)',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: 'rgba(0,0,0,0.02)'
    }
  },
  accTitleCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  accName: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--color-text-base)'
  },
  accCode: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    fontWeight: '600'
  },
  accMetaCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  badge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  btnAction: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--color-border)',
      color: 'var(--color-text-base)'
    }
  },
  btnSave: {
    padding: '6px 12px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  btnCancel: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  editorBox: {
    padding: '16px 24px',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'rgba(0,0,0,0.005)'
  },
  editorGrid: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end'
  },
  accBody: {
    padding: '24px',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    animation: 'slideDown 0.2s ease'
  },
  notesBox: {
    padding: '12px 16px',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '6px',
    borderLeft: '4px solid var(--color-primary)',
    marginBottom: '20px',
    fontSize: '13px'
  },
  subTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px'
  },
  secsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px'
  },
  secItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px'
  },
  secTextName: {
    fontSize: '13px',
    color: 'var(--color-text-base)'
  },
  secActions: {
    display: 'flex',
    gap: '10px'
  },
  btnSecAction: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    padding: '2px 4px'
  },
  secEditRow: {
    display: 'flex',
    gap: '8px',
    width: '100%'
  },
  inputCompact: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    fontSize: '13px',
    flex: '1'
  },
  btnSaveCompact: {
    padding: '8px 12px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  btnCancelCompact: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-base)',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  addSecRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px'
  },
  btnAddSec: {
    padding: '8px 16px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  noData: {
    padding: '30px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
    fontStyle: 'italic'
  },
  placeholderContainer: {
    padding: '60px 20px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-card)',
    border: '1px dashed var(--color-border)',
    borderRadius: '8px'
  },
  errorBox: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: 'rgba(239,68,68,0.1)',
    color: '#EF4444',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500'
  }
};
