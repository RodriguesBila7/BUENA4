import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../../hooks/useResizableModal';

export default function SystemModal({ 
  isOpen, 
  title, 
  onClose, 
  children, 
  headerButtons = null, 
  footer = null, 
  width = '900px' 
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
  } = useResizableModal({ defaultWidth: width, minWidth: 420, minHeight: 280 });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

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
          <h2 style={styles.title}>{title}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {headerButtons}
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
        
        <div style={styles.content}>
          {children}
        </div>

        {footer && (
          <div style={styles.footer}>
            {footer}
          </div>
        )}

        {/* Pega de Redimensionamento com o Rato no canto inferior direito */}
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
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
    boxSizing: 'border-box'
  },
  modal: {
    backgroundColor: 'var(--color-bg-base, #ffffff)',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  header: {
    padding: '16px 22px',
    borderBottom: '1px solid var(--color-border, #e2e8f0)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-card, #f8fafc)',
    flexShrink: 0,
    cursor: 'move',
    userSelect: 'none'
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--color-text-base)',
    letterSpacing: '-0.2px',
    margin: 0
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
    color: 'var(--color-text-muted, #64748b)',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  content: {
    padding: '20px 22px',
    overflowY: 'auto',
    flex: 1,
    boxSizing: 'border-box'
  },
  footer: {
    padding: '14px 22px',
    borderTop: '1px solid var(--color-border, #e2e8f0)',
    display: 'flex',
    justifyContent: 'flex-end',
    backgroundColor: 'var(--color-bg-card, #f8fafc)',
    gap: '10px',
    flexShrink: 0
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
