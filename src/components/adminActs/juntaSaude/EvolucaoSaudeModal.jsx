import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../../../hooks/useResizableModal';

export default function EvolucaoSaudeModal({ isOpen, onClose, act, onSave }) {
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
  } = useResizableModal({ defaultWidth: '550px', minWidth: 400, minHeight: 300 });

  const [dataAprovacao, setDataAprovacao] = useState('');
  const [documento, setDocumento] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');

  if (!isOpen || !act) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dataAprovacao) {
      setErro('A Data de Aprovação pela Junta Médica é obrigatória.');
      return;
    }
    if (!documento) {
      setErro('É estritamente obrigatório anexar o Parecer da Junta Médica.');
      return;
    }

    onSave(act.id, {
      dataAprovacao,
      documento: documento.name,
      motivoEvolucao: motivo
    });
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
        <div 
          style={styles.header}
          onPointerDown={isMaximized ? undefined : onPointerDown}
          onDoubleClick={handleHeaderDoubleClick}
          className={isMaximized ? '' : 'drag-handle'}
          title="💡 Arraste para mover ou dê duplo clique com o rato para expandir / reduzir"
        >
          <h2 style={styles.title}>Evolução para Incapacidade Permanente</h2>
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
          <div style={styles.alertWarning}>
            <strong>Atenção:</strong> Está prestes a transferir o estado de <strong>{act.employeeName}</strong> de Baixa Temporária para Incapacidade Permanente. Esta ação exige validação documental rigorosa.
          </div>

          {erro && <div style={styles.errorAlert}>{erro}</div>}

          <div style={styles.section}>
            <label style={styles.label}>Data da Aprovação da Junta Médica</label>
            <input type="date" value={dataAprovacao} onChange={e => setDataAprovacao(e.target.value)} style={styles.input} />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Notas ou Diagnóstico Adicional</label>
            <textarea 
              value={motivo} 
              onChange={e => setMotivo(e.target.value)} 
              style={styles.textarea}
              placeholder="Ex: Em virtude do agravamento do quadro clínico..."
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Parecer da Junta Médica <span style={{color:'red'}}>* (Obrigatório)</span></label>
            <div style={styles.fileUpload}>
              <input type="file" onChange={e => setDocumento(e.target.files[0])} accept=".pdf,image/*" />
            </div>
            <span style={{fontSize: '12px', color: 'var(--color-text-muted, #64748b)'}}>O documento deve estar devidamente assinado pela comissão médica.</span>
          </div>

        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.btnCancel}>Cancelar</button>
          <button onClick={handleSubmit} style={styles.btnDanger}>Confirmar Incapacidade</button>
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
  title: { margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--color-text-main, #0f172a)' },
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
  label: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.4px' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border, #cbd5e1)', backgroundColor: 'var(--color-bg-base, #f8fafc)', color: 'var(--color-text-base, #1e293b)', fontSize: '13px', outline: 'none' },
  textarea: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border, #cbd5e1)', backgroundColor: 'var(--color-bg-base, #f8fafc)', color: 'var(--color-text-base, #1e293b)', fontSize: '13px', minHeight: '80px', resize: 'vertical', outline: 'none' },
  alertWarning: { padding: '12px 14px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #F59E0B', color: '#B45309', borderRadius: '4px', fontSize: '13px' },
  errorAlert: { padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#991B1B', borderRadius: '8px', fontSize: '13px', fontWeight: '500' },
  fileUpload: { padding: '14px', border: '2px dashed #EF4444', borderRadius: '8px', backgroundColor: 'var(--color-bg-base, #f8fafc)' },
  footer: { padding: '14px 22px', borderTop: '1px solid var(--color-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: 'var(--color-bg-base, #f8fafc)', flexShrink: 0 },
  btnCancel: { padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--color-border, #cbd5e1)', backgroundColor: '#fff', color: 'var(--color-text-base, #1e293b)', fontWeight: '600', cursor: 'pointer', fontSize: '13px' },
  btnDanger: { padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#DC2626', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '13px', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)' },
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
