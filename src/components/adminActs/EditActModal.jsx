import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../../hooks/useResizableModal';

export default function EditActModal({ act, onClose, onSave }) {
  const [mounted, setMounted] = useState(false);

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
  } = useResizableModal({ defaultWidth: '550px', minWidth: 380, minHeight: 280 });
  
  const [formData, setFormData] = useState({
    date: act?.date || act?.actDate || '',
    despacho: act?.despacho || act?.dispatchNumber || '',
    br: act?.br || '',
    description: act?.description || (act?.details?.description) || ''
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!act || !mounted) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const updatedAct = {
      ...act,
      date: formData.date,
      despacho: formData.despacho,
      br: formData.br,
      description: formData.description,
      ...(act.details ? { details: { ...act.details, description: formData.description } } : {})
    };
    onSave(updatedAct);
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
          className={isMaximized ? '' : 'drag-handle'} 
          onPointerDown={isMaximized ? undefined : onPointerDown}
          onDoubleClick={handleHeaderDoubleClick}
          title="💡 Arraste para mover ou dê duplo clique com o rato para expandir / reduzir"
        >
          <h2 style={styles.title}>Editar Registo: {act.actType}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        
        <div style={styles.empInfo}>
          <strong>{act.employeeNip || act.employeeId}</strong> - {act.employeeName || 'Desconhecido'}
        </div>

        <div style={styles.content}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Data do Registo</label>
            <input 
              type="date" 
              name="date"
              value={formData.date}
              onChange={handleChange}
              style={styles.input} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nº do Despacho (Opcional)</label>
            <input 
              type="text" 
              name="despacho"
              value={formData.despacho}
              onChange={handleChange}
              placeholder="Ex: 120/DRH/2026"
              style={styles.input} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Boletim da República (Opcional)</label>
            <input 
              type="text" 
              name="br"
              value={formData.br}
              onChange={handleChange}
              placeholder="Ex: BR 45, III Série"
              style={styles.input} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Observações / Descrição</label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              style={styles.textarea} 
            />
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.btnCancel}>Cancelar</button>
          <button onClick={handleSave} style={styles.btnSave}>Gravar Alterações</button>
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
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
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
  title: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '700',
    color: 'var(--color-text-main, #0f172a)'
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
    color: 'var(--color-text-muted, #64748b)',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  empInfo: {
    padding: '10px 22px',
    backgroundColor: 'var(--color-bg-base, #f8fafc)',
    borderBottom: '1px solid var(--color-border, #e2e8f0)',
    fontSize: '13px',
    color: 'var(--color-primary, #1B365D)'
  },
  content: {
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    flex: 1,
    overflowY: 'auto',
    boxSizing: 'border-box'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted, #64748b)'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #cbd5e1)',
    backgroundColor: 'var(--color-bg-base, #f8fafc)',
    color: 'var(--color-text-base, #1e293b)',
    fontSize: '13px',
    outline: 'none'
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #cbd5e1)',
    backgroundColor: 'var(--color-bg-base, #f8fafc)',
    color: 'var(--color-text-base, #1e293b)',
    fontSize: '13px',
    resize: 'vertical',
    outline: 'none'
  },
  footer: {
    padding: '14px 22px',
    borderTop: '1px solid var(--color-border, #e2e8f0)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    backgroundColor: 'var(--color-bg-base, #f8fafc)',
    flexShrink: 0
  },
  btnCancel: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid var(--color-border, #cbd5e1)',
    backgroundColor: '#fff',
    color: 'var(--color-text-base, #1e293b)',
    cursor: 'pointer',
    fontSize: '13px'
  },
  btnSave: {
    padding: '8px 18px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'var(--color-primary, #1B365D)',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px'
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
