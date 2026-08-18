import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../../../hooks/useResizableModal';

export default function RegistoSaudeModal({ isOpen, onClose, employees, onSave }) {
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
  } = useResizableModal({ defaultWidth: '650px', minWidth: 420, minHeight: 320 });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [tipoDoenca, setTipoDoenca] = useState('Temporária');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [documento, setDocumento] = useState(null);
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setSearchTerm('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setErro('Por favor, selecione um funcionário.');
      return;
    }
    if (!dataInicio) {
      setErro('A data de início é obrigatória.');
      return;
    }
    if (tipoDoenca === 'Permanente' && !documento) {
      setErro('Para casos de Doença Permanente/Incapacidade é OBRIGATÓRIO anexar o Relatório da Junta Médica.');
      return;
    }

    onSave({
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      employeeNip: selectedEmployee.nip,
      tipoCondicao: tipoDoenca,
      dataInicio,
      dataFim,
      motivo,
      documento: documento ? documento.name : null,
      status: 'Em Baixa'
    });
  };

  const searchResults = searchTerm.length > 2 
    ? (employees || []).filter(e => 
        e.isActive && 
        e.healthStatus !== 'Baixa Médica' &&
        ((e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
         (e.nip || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
         (e.nuit || '').toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

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
          <h2 style={styles.title}>Registar Baixa ou Junta Médica</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={toggleMaximize}
              style={styles.expandBtn}
              title={isMaximized ? "Reduzir Tamanho (Restaurar)" : "Modo Expandir (Tela Cheia)"}
            >
              {isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
            </button>
            <button onClick={onClose} style={styles.closeBtn} title="Fechar">×</button>
          </div>
        </div>

        <div style={styles.content}>
          {erro && <div style={styles.errorAlert}>{erro}</div>}

          {!selectedEmployee ? (
            <div style={styles.section}>
              <label style={styles.label}>1. Selecionar Funcionário</label>
              <input 
                type="text" 
                placeholder="Pesquisar por Nome ou NUIT..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={styles.input}
              />
              {searchResults.length > 0 && (
                <div style={styles.searchResults}>
                  {searchResults.map(emp => (
                    <div key={emp.id} style={styles.searchItem} onClick={() => handleSelectEmployee(emp)}>
                      <strong>{emp.name}</strong> (NUIT: {emp.nip || emp.nuit || '-'})
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={styles.section}>
              <div style={styles.selectedEmp}>
                <span>Funcionário Selecionado: <strong>{selectedEmployee.name}</strong></span>
                <button onClick={() => setSelectedEmployee(null)} style={styles.changeBtn}>Alterar</button>
              </div>
            </div>
          )}

          <div style={styles.section}>
            <label style={styles.label}>2. Tipo de Condição</label>
            <div style={styles.radioGroup}>
              <label style={tipoDoenca === 'Temporária' ? styles.radioSelected : styles.radio}>
                <input 
                  type="radio" 
                  checked={tipoDoenca === 'Temporária'} 
                  onChange={() => setTipoDoenca('Temporária')} 
                  style={{display: 'none'}}
                />
                Baixa Médica (Temporária)
              </label>
              <label style={tipoDoenca === 'Permanente' ? styles.radioSelectedDanger : styles.radio}>
                <input 
                  type="radio" 
                  checked={tipoDoenca === 'Permanente'} 
                  onChange={() => setTipoDoenca('Permanente')} 
                  style={{display: 'none'}}
                />
                Incapacidade (Junta Médica)
              </label>
            </div>
            {tipoDoenca === 'Permanente' && (
              <div style={styles.alertDanger}>
                <strong>Atenção:</strong> Ao declarar Incapacidade Permanente, o funcionário será retirado da escala de serviço ativo e será obrigatória a anexação do Parecer da Junta Médica.
              </div>
            )}
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Data de Início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>Data Prevista Fim {tipoDoenca === 'Permanente' && '(Opcional)'}</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={styles.input} />
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Motivo / Diagnóstico (Opcional)</label>
            <textarea 
              value={motivo} 
              onChange={e => setMotivo(e.target.value)} 
              style={styles.textarea}
              placeholder="Descreva brevemente o motivo da baixa..."
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Documento Comprovativo {tipoDoenca === 'Permanente' && <span style={{color:'red'}}>* (Obrigatório)</span>}</label>
            <div style={styles.fileUpload}>
              <input type="file" onChange={e => setDocumento(e.target.files[0])} />
            </div>
          </div>

        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.btnCancel}>Cancelar</button>
          <button onClick={handleSubmit} style={styles.btnSubmit}>Registar Condição</button>
        </div>

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
    backgroundColor: 'var(--color-bg-card, #ffffff)', 
    borderRadius: '14px', 
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  header: { 
    padding: '16px 22px', 
    borderBottom: '1px solid var(--color-border, #e2e8f0)', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-base, #f8fafc)',
    cursor: 'move',
    userSelect: 'none',
    flexShrink: 0
  },
  title: { margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--color-text-main, #0f172a)' },
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
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: 'var(--color-text-muted, #64748b)', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' },
  content: { padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', boxSizing: 'border-box' },
  section: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  col: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.4px' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border, #cbd5e1)', backgroundColor: 'var(--color-bg-base, #f8fafc)', color: 'var(--color-text-base, #1e293b)', fontSize: '13px', outline: 'none' },
  textarea: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border, #cbd5e1)', backgroundColor: 'var(--color-bg-base, #f8fafc)', color: 'var(--color-text-base, #1e293b)', fontSize: '13px', minHeight: '80px', resize: 'vertical', outline: 'none' },
  searchResults: { maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--color-border, #cbd5e1)', borderRadius: '8px', marginTop: '4px' },
  searchItem: { padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border, #e2e8f0)', fontSize: '13px' },
  selectedEmp: { padding: '12px 16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1e40af', fontSize: '13px' },
  changeBtn: { padding: '4px 10px', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3B82F6', cursor: 'pointer', fontWeight: '600', fontSize: '12px' },
  radioGroup: { display: 'flex', gap: '12px' },
  radio: { flex: 1, padding: '10px', textAlign: 'center', borderRadius: '8px', border: '1px solid var(--color-border, #cbd5e1)', cursor: 'pointer', fontWeight: '600', color: 'var(--color-text-muted, #64748b)', fontSize: '13px' },
  radioSelected: { flex: 1, padding: '10px', textAlign: 'center', borderRadius: '8px', border: '2px solid #F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)', cursor: 'pointer', fontWeight: '700', color: '#D97706', fontSize: '13px' },
  radioSelectedDanger: { flex: 1, padding: '10px', textAlign: 'center', borderRadius: '8px', border: '2px solid #EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', cursor: 'pointer', fontWeight: '700', color: '#B91C1C', fontSize: '13px' },
  alertDanger: { padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #EF4444', color: '#991B1B', borderRadius: '4px', fontSize: '12px', marginTop: '6px' },
  errorAlert: { padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#991B1B', borderRadius: '8px', fontSize: '13px', fontWeight: '500' },
  fileUpload: { padding: '14px', border: '2px dashed var(--color-border, #cbd5e1)', borderRadius: '8px', backgroundColor: 'var(--color-bg-base, #f8fafc)' },
  footer: { padding: '14px 22px', borderTop: '1px solid var(--color-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: 'var(--color-bg-base, #f8fafc)', flexShrink: 0 },
  btnCancel: { padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--color-border, #cbd5e1)', backgroundColor: '#fff', color: 'var(--color-text-base, #1e293b)', fontWeight: '600', cursor: 'pointer', fontSize: '13px' },
  btnSubmit: { padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#F59E0B', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '13px', boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)' },
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
