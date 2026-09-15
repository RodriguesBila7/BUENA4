import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../hooks/useResizableModal';

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar', 
  isDestructive = false, 
  hideCancel = false,
  hasInput = false,
  inputValue = '',
  onInputChange = null,
  placeholder = 'Escreva aqui...',
  inputType = 'textarea'
}) {
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
  } = useResizableModal({ defaultWidth: '460px', minWidth: 340, minHeight: 220 });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const overlayProps = getOverlayProps(onCancel);

  return ReactDOM.createPortal(
    <div 
      style={styles.overlay}
      onMouseDown={overlayProps.onMouseDown}
      onClick={overlayProps.onClick}
    >
      <div 
        ref={modalRef}
        style={{ ...styles.modal, ...modalStyle }}
      >
        <div 
          style={styles.header} 
          className={isMaximized ? '' : 'drag-handle'} 
          onPointerDown={isMaximized ? undefined : onPointerDown}
          onDoubleClick={handleHeaderDoubleClick}
          title="💡 Arraste para mover ou dê duplo clique com o rato para expandir / reduzir"
        >
          <h3 style={styles.title}>{title || 'Atenção'}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={toggleMaximize}
              style={styles.expandBtn}
              title={isMaximized ? "Reduzir Tamanho (Restaurar)" : "Modo Expandir (Tela Cheia)"}
            >
              {isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
            </button>
            <button onClick={onCancel} style={styles.closeBtn}>×</button>
          </div>
        </div>
        <div style={styles.body}>
          <p style={styles.message}>{message}</p>
          {hasInput && (
            inputType === 'textarea' ? (
              <textarea
                value={inputValue}
                onChange={(e) => onInputChange && onInputChange(e.target.value)}
                placeholder={placeholder}
                style={styles.modalInput}
              />
            ) : (
              <input
                type={inputType}
                value={inputValue}
                onChange={(e) => onInputChange && onInputChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={inputType === 'password' ? 'new-password' : 'off'}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                style={{...styles.modalInput, minHeight: '40px'}}
              />
            )
          )}
        </div>
        <div style={styles.footer}>
          {!hideCancel && (
            <button 
              type="button" 
              onClick={onCancel} 
              style={styles.btnCancel}
            >
              {cancelText}
            </button>
          )}
          <button 
            type="button"
            onClick={() => {
              if (onConfirm) {
                onConfirm();
              } else if (onCancel) {
                onCancel();
              }
            }} 
            style={isDestructive ? styles.btnDestructive : styles.btnConfirm}
          >
            {confirmText}
          </button>
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
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 99999, animation: 'fadeIn 0.2s ease',
    padding: '20px',
    boxSizing: 'border-box'
  },
  modal: {
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    borderRadius: '14px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border, #e2e8f0)',
    backgroundColor: 'var(--color-bg-base, #f8fafc)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    cursor: 'move',
    userSelect: 'none',
    flexShrink: 0
  },
  title: { margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--color-text-main, #2d3748)', letterSpacing: '0.2px' },
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
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-muted, #a0aec0)', padding: '4px 8px', borderRadius: '6px' },
  body: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', boxSizing: 'border-box' },
  message: { margin: 0, fontSize: '14px', color: 'var(--color-text-base, #4a5568)', lineHeight: '1.5' },
  modalInput: {
    width: '100%',
    minHeight: '80px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #cbd5e0)',
    backgroundColor: 'var(--color-bg-base, #ffffff)',
    color: 'var(--color-text-base, #2d3748)',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  footer: {
    padding: '14px 20px',
    backgroundColor: 'var(--color-bg-base, #f8fafc)',
    borderTop: '1px solid var(--color-border, #e2e8f0)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    flexShrink: 0
  },
  btnCancel: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid var(--color-border, #cbd5e0)',
    backgroundColor: 'var(--color-bg-subtle, #ffffff)',
    color: 'var(--color-text-base, #4a5568)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  btnConfirm: {
    padding: '8px 18px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'var(--color-primary, #3182ce)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  btnDestructive: {
    padding: '8px 18px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#e53e3e',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(229, 62, 62, 0.2)'
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
