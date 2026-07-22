import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import useDraggable from '../hooks/useDraggable';

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
  const { position, onPointerDown } = useDraggable();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay}>
      <div 
        style={{ ...styles.modal, transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <div style={styles.header} className="drag-handle" onPointerDown={onPointerDown}>
            <h3 style={styles.title}>{title || 'Atenção'}</h3>
          <button onClick={onCancel} style={styles.closeBtn}>×</button>
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
                style={{...styles.modalInput, minHeight: '40px'}}
              />
            )
          )}
        </div>
        <div style={styles.footer}>
          {!hideCancel && <button onClick={onCancel} style={styles.btnCancel}>{cancelText}</button>}
          <button onClick={onConfirm} style={isDestructive ? styles.btnDestructive : styles.btnConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(2px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, animation: 'fadeIn 0.2s ease'
  },
  modal: {
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    borderRadius: '12px',
    width: '95%', maxWidth: '420px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    overflow: 'hidden', animation: 'slideUp 0.3s ease'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border, #e2e8f0)',
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    cursor: 'move'
  },
  title: { margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--color-text-main, #2d3748)', letterSpacing: '0.2px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--color-text-muted, #a0aec0)', transition: 'color 0.2s' },
  body: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--color-bg-card, #ffffff)' },
  message: { margin: 0, fontSize: '14px', color: 'var(--color-text-base, #4a5568)', lineHeight: '1.5' },
  modalInput: {
    width: '100%',
    minHeight: '80px',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border, #e2e8f0)',
    backgroundColor: 'var(--color-bg-base, #f7fafc)',
    color: 'var(--color-text-main, #2d3748)',
    fontSize: '13px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s'
  },
  footer: {
    padding: '16px 20px',
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    borderTop: '1px solid var(--color-border, #e2e8f0)',
    display: 'flex', justifyContent: 'flex-end', gap: '12px'
  },
  btnCancel: {
    padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--color-border, #cbd5e0)',
    backgroundColor: 'transparent', color: 'var(--color-text-main, #4a5568)',
    fontWeight: '600', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s'
  },
  btnConfirm: {
    padding: '10px 16px', borderRadius: '6px', border: 'none',
    backgroundColor: 'var(--color-primary, #1B365D)', color: '#ffffff',
    fontWeight: '600', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  btnDestructive: {
    padding: '10px 16px', borderRadius: '6px', border: 'none',
    backgroundColor: '#e53e3e', color: '#ffffff',
    fontWeight: '600', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  }
};
