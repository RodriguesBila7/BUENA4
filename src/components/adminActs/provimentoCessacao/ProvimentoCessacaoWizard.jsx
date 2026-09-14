import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../../../hooks/useResizableModal';
import { showToast } from '../../common/Toast';

export default function ProvimentoCessacaoWizard({ 
  onClose, 
  onSave, 
  employees = [], 
  orgData = {}, 
  currentUser, 
  isPrimary, 
  preSelectedEmp = null,
  initialActType = 'Nomeação'
}) {
  const {
    modalRef,
    position,
    onPointerDown,
    isMaximized,
    toggleMaximize,
    handleResizePointerDown,
    handleHeaderDoubleClick,
    getOverlayProps,
    modalStyle
  } = useResizableModal({ defaultWidth: '740px', minWidth: 460, minHeight: 320 });

  const [actType, setActType] = useState(initialActType);
  const [selectedEmpId, setSelectedEmpId] = useState(preSelectedEmp?.id || '');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Specific Form fields
  const [actDate, setActDate] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRole, setNewRole] = useState('');
  const [posteriorRole, setPosteriorRole] = useState('Técnico de Investigação');
  const [directorateId, setDirectorateId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [brNumber, setBrNumber] = useState('');
  const [reason, setReason] = useState('');
  const [observations, setObservations] = useState('');
  const [despacho, setDespacho] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedEmployee = useMemo(() => {
    return employees.find(e => String(e.id) === String(selectedEmpId)) || preSelectedEmp;
  }, [employees, selectedEmpId, preSelectedEmp]);

  // Filtrar lista de funcionários para seleção
  const filteredEmployees = useMemo(() => {
    if (!searchFilter.trim()) return employees.slice(0, 15);
    const term = searchFilter.toLowerCase();
    return employees.filter(e => 
      e.name?.toLowerCase().includes(term) || 
      e.nuit?.includes(term) || 
      e.id?.includes(term)
    ).slice(0, 20);
  }, [employees, searchFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmpId) {
      showToast('Por favor, seleccione um funcionário para o processo.', 'warning');
      return;
    }
    if (!actDate) {
      showToast('A data do acto é obrigatória.', 'warning');
      return;
    }
    if (actType === 'Nomeação' && !newRole.trim()) {
      showToast('Por favor, informe o Novo Cargo / Função de Nomeação.', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        employeeNuit: selectedEmployee.nuit || selectedEmployee.id,
        actType,
        actDate,
        despacho: isPrimary ? despacho.trim() : '',
        isSecondary: !isPrimary,
        userResponsible: currentUser?.username || 'admin',
        userRole: currentUser?.roleTitle || (isPrimary ? 'Super Administrador Principal' : 'Usuário Secundário'),
        details: {
          newRole: newRole.trim(),
          previousRole: selectedEmployee?.extra_data?.role || selectedEmployee?.role || 'Sem Cargo de Liderança',
          posteriorRole: posteriorRole.trim(),
          newDirectorateId: directorateId || null,
          newDepartmentId: departmentId || null,
          newSectionId: sectionId || null,
          effectiveDate,
          brNumber: brNumber.trim(),
          reason: reason.trim(),
          observations: observations.trim(),
          categoryName: selectedEmployee?.categoryName || ''
        }
      };

      const res = await onSave(payload);
      if (res && res.success) {
        showToast(`Processo de ${actType} criado com sucesso!`, 'success');
        onClose();
      } else {
        showToast(res?.error || 'Erro ao criar processo.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Erro de ligação com o servidor.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const overlayProps = getOverlayProps(onClose);

  return ReactDOM.createPortal(
    <div 
      style={styles.overlay}
      onMouseDown={overlayProps.onMouseDown}
      onClick={overlayProps.onClick}
    >
      <div 
        ref={modalRef}
        style={{ 
          ...styles.modal, 
          ...modalStyle
        }} 
      >
        {/* Header com Drag Handle, Duplo Clique e Maximizar */}
        <div 
          style={styles.header} 
          onPointerDown={isMaximized ? undefined : onPointerDown} 
          onDoubleClick={handleHeaderDoubleClick}
          className={isMaximized ? '' : 'drag-handle'}
          title="💡 Arraste para mover ou dê duplo clique com o rato para expandir / reduzir"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>
              {actType === 'Nomeação' ? '👔' : actType === 'Cessação de Funções' ? '🛑' : '🔄'}
            </span>
            <div>
              <h3 style={styles.title}>Novo Processo de Provimento e Cessação</h3>
              <p style={styles.subtitle}>Formulação de proposta de acto administrativo funcional</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={toggleMaximize}
              style={styles.expandBtn}
              title={isMaximized ? "Reduzir Tamanho (Restaurar)" : "Modo Expandir (Tela Cheia)"}
            >
              {isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
            </button>
            <button onClick={onClose} style={styles.closeBtn} title="Fechar">✕</button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.scrollableArea}>
            {/* 1. Tipo de Acto */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Tipo de Processo *</label>
              <div style={styles.typeSelectorRow}>
                {['Nomeação', 'Cessação de Funções', 'Reintegração'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActType(t)}
                    style={{
                      ...styles.typeBtn,
                      backgroundColor: actType === t ? '#DC2626' : '#F1F5F9',
                      color: actType === t ? '#FFFFFF' : '#334155',
                      fontWeight: actType === t ? '700' : '500',
                      border: actType === t ? '1px solid #DC2626' : '1px solid #CBD5E1'
                    }}
                  >
                    {t === 'Nomeação' ? '👔 Nomeação' : t === 'Cessação de Funções' ? '🛑 Cessação de Funções' : '🔄 Reintegração'}
                  </button>
                ))}
              </div>
            </div>

            {/* Aviso Institucional de Regras e Níveis */}
            <div style={!isPrimary ? styles.secondaryNotice : styles.primaryNotice}>
              <span style={{ fontSize: '16px' }}>{!isPrimary ? '🛡️' : '⚖️'}</span>
              <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                {!isPrimary ? (
                  <>
                    <strong>Perfil Secundário / Local:</strong> O processo será criado com o estado <strong>"Pendente de Despacho"</strong>. A finalização só ocorrerá após a inserção do Despacho pela DRH e a aprovação vinculativa dos 3 perfis centrais.
                  </>
                ) : (
                  <>
                    <strong>Administração Central (DRH):</strong> Pode inserir o Despacho oficial neste formulário. A homologação final do processo dependerá da <strong>Tripla Aprovação Obrigatória</strong> (Chefe da DRH, Chefe de Gestão de Pessoal e Técnico Central).
                  </>
                )}
              </div>
            </div>

            {/* 2. Selecção de Funcionário */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Selecção do Funcionário Alvo *</label>
              {!selectedEmployee ? (
                <div>
                  <input
                    type="text"
                    placeholder="🔍 Pesquisar por Nome, NUIT ou ID..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    style={styles.input}
                  />
                  <div style={styles.empSearchResults}>
                    {filteredEmployees.map(emp => (
                      <div 
                        key={emp.id} 
                        onClick={() => setSelectedEmpId(emp.id)}
                        style={styles.empSearchItem}
                      >
                        <div>
                          <strong>{emp.name}</strong>
                          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>
                            NUIT: {emp.nuit || '-'} • {emp.categoryName || 'Geral'} • {emp.role || 'Sem Cargo'}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          style={styles.selectEmpBtn}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                        >
                          Seleccionar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={styles.selectedEmpCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0F172A' }}>{selectedEmployee.name}</strong>
                      <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>
                        NUIT: {selectedEmployee.nuit || '-'} • Categoria: {selectedEmployee.categoryName || '-'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: '600' }}>
                        Cargo Atual: {selectedEmployee.extra_data?.role || selectedEmployee.role || 'Sem Cargo de Liderança'}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSelectedEmpId('')} 
                      style={styles.changeEmpBtn}
                    >
                      Alterar Funcionário
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Campos Específicos por Tipo de Acto */}
            <div style={styles.grid2}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Data da Proposta do Acto *</label>
                <input
                  type="date"
                  value={actDate}
                  onChange={e => setActDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Data Efectiva Prevista *</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            {actType === 'Nomeação' && (
              <>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Novo Cargo / Função de Liderança *</label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    placeholder="Ex: Chefe de Secção de Instrução Processual, Chefe de Brigada Operativa..."
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.grid2}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Direcção de Afectação</label>
                    <select
                      value={directorateId}
                      onChange={e => setDirectorateId(e.target.value)}
                      style={styles.select}
                    >
                      <option value="">-- Manter Direcção Actual --</option>
                      {(orgData?.directorates || []).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Número do Boletim da República (BR)</label>
                    <input
                      type="text"
                      value={brNumber}
                      onChange={e => setBrNumber(e.target.value)}
                      placeholder="Ex: BR nº 34, I Série de 2026"
                      style={styles.input}
                    />
                  </div>
                </div>
              </>
            )}

            {actType === 'Cessação de Funções' && (
              <>
                <div style={styles.grid2}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Cargo Cessado</label>
                    <input
                      type="text"
                      value={selectedEmployee?.extra_data?.role || selectedEmployee?.role || 'Cargo de Direcção / Chefia'}
                      disabled
                      style={{ ...styles.input, backgroundColor: '#F1F5F9', color: '#64748B' }}
                    />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Função Posterior do Funcionário</label>
                    <input
                      type="text"
                      value={posteriorRole}
                      onChange={e => setPosteriorRole(e.target.value)}
                      placeholder="Ex: Técnico de Investigação Criminal"
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Número do Boletim da República (BR)</label>
                  <input
                    type="text"
                    value={brNumber}
                    onChange={e => setBrNumber(e.target.value)}
                    placeholder="Ex: BR nº 34, I Série de 2026"
                    style={styles.input}
                  />
                </div>
              </>
            )}

            {actType === 'Reintegração' && (
              <>
                <div style={styles.grid2}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Situação Anterior do Funcionário</label>
                    <input
                      type="text"
                      value={selectedEmployee?.status || 'Inativo / Suspenso / Demitido'}
                      disabled
                      style={{ ...styles.input, backgroundColor: '#F1F5F9', color: '#64748B' }}
                    />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Cargo / Função de Reintegração</label>
                    <input
                      type="text"
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                      placeholder="Ex: Agente de Investigação Operativa"
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Fundamentação Legal / Decisão Administrativa / Judicial</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Ex: Decisão favorável do Tribunal Administrativo ou Despacho de Reabilitação..."
                    style={styles.input}
                  />
                </div>
              </>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Motivo / Fundamentação do Pedido</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Descreva a fundamentação ou conveniência de serviço para este acto..."
                rows={2}
                style={styles.textarea}
              />
            </div>

            {/* Inserção de Despacho (Exclusivo para Usuário Primário) */}
            {isPrimary && (
              <div style={styles.despachoFieldBox}>
                <label style={{ ...styles.label, color: '#DC2626' }}>📜 Despacho da Direcção de Recursos Humanos (Opcional na Criação)</label>
                <textarea
                  value={despacho}
                  onChange={e => setDespacho(e.target.value)}
                  placeholder="Se já possuir o despacho emitido, insira aqui para avançar o processo directamente para a fase de Tripla Aprovação..."
                  rows={3}
                  style={styles.textarea}
                />
              </div>
            )}
          </div>

          {/* Rodapé de Ações */}
          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={isSubmitting}>
              Cancelar
            </button>
            <button 
              type="submit" 
              style={styles.submitBtn} 
              disabled={isSubmitting}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
            >
              {isSubmitting ? 'A Gravar...' : '🚀 Submeter Processo'}
            </button>
          </div>
        </form>

        {/* Handle de redimensionamento por mouse no canto inferior direito */}
        {!isMaximized && (
          <div 
            onPointerDown={handleResizePointerDown}
            style={styles.resizeHandle}
            title="Arraste com o rato para expandir ou reduzir livremente"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="14" y1="3" x2="3" y2="14" />
              <line x1="14" y1="8" x2="8" y2="14" />
              <line x1="14" y1="13" x2="13" y2="14" />
            </svg>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backdropFilter: 'blur(4px)',
    boxSizing: 'border-box'
  },
  modal: {
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  header: {
    padding: '16px 22px',
    borderBottom: '1px solid var(--color-border, #E5E7EB)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-card, #F8FAFC)',
    cursor: 'move',
    userSelect: 'none',
    flexShrink: 0
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: '#64748B',
  },
  expandBtn: {
    background: 'rgba(37, 99, 235, 0.08)',
    border: '1px solid rgba(37, 99, 235, 0.25)',
    color: '#2563eb',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    transition: 'all 0.15s ease'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#64748B',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  scrollableArea: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxSizing: 'border-box'
  },
  typeSelectorRow: {
    display: 'flex',
    gap: '8px',
  },
  typeBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  primaryNotice: {
    display: 'flex',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '8px',
    color: '#1E40AF',
  },
  secondaryNotice: {
    display: 'flex',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: '8px',
    color: '#B45309',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  select: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #CBD5E1)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    backgroundColor: 'var(--color-bg-base, #FFFFFF)',
    color: 'var(--color-text-base)',
  },
  textarea: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #CBD5E1)',
    fontSize: '13px',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    resize: 'vertical',
    outline: 'none',
    backgroundColor: 'var(--color-bg-base, #FFFFFF)',
    color: 'var(--color-text-base)',
  },
  empSearchResults: {
    maxHeight: '160px',
    overflowY: 'auto',
    border: '1px solid var(--color-border, #CBD5E1)',
    borderRadius: '8px',
    marginTop: '6px',
    backgroundColor: 'var(--color-bg-base)',
  },
  empSearchItem: {
    padding: '8px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border, #F1F5F9)',
    cursor: 'pointer',
    backgroundColor: 'var(--color-bg-base, #FFFFFF)',
    color: 'var(--color-text-base)',
  },
  selectEmpBtn: {
    padding: '5px 12px',
    backgroundColor: 'var(--color-primary, #DC2626)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  selectedEmpCard: {
    padding: '12px 14px',
    backgroundColor: 'var(--color-bg-subtle, #F8FAFC)',
    border: '1px solid var(--color-border, #CBD5E1)',
    borderRadius: '8px',
    color: 'var(--color-text-base)',
  },
  changeEmpBtn: {
    padding: '4px 10px',
    backgroundColor: 'var(--color-bg-base, #FFFFFF)',
    color: 'var(--color-primary, #DC2626)',
    border: '1px solid var(--color-border, #FCA5A5)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  despachoFieldBox: {
    padding: '12px',
    backgroundColor: 'var(--color-bg-subtle, #F0FDF4)',
    border: '1px solid var(--color-border, #BBF7D0)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  footer: {
    padding: '14px 20px',
    borderTop: '1px solid var(--color-border, #E5E7EB)',
    backgroundColor: 'var(--color-bg-card, #F8FAFC)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    flexShrink: 0
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid var(--color-border, #D1D5DB)',
    backgroundColor: 'var(--color-bg-subtle, #FFFFFF)',
    color: 'var(--color-text-base, #374151)',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '9px 22px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)',
    transition: 'all 0.2s ease',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: '18px',
    height: '18px',
    cursor: 'se-resize',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    zIndex: 10
  }
};
