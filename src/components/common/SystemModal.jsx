import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import useDraggable from '../../hooks/useDraggable';

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
  const { position, onPointerDown } = useDraggable();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div 
        style={{ ...styles.modal, maxWidth: width, transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <div style={styles.header} onPointerDown={onPointerDown} className="drag-handle">
          <h2 style={styles.title}>{title}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {headerButtons}
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
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
      </div>
    </div>,
    document.body
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '5vh 20px',
    overflowY: 'auto'
  },
  modal: {
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '12px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    overflow: 'hidden'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-card)',
    flexShrink: 0
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--color-primary)',
    margin: 0
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'flex-end',
    backgroundColor: 'var(--color-bg-card)',
    gap: '10px'
  }
};
