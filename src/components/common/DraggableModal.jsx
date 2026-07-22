import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import useDraggable from '../../hooks/useDraggable';

export default function DraggableModal({
  isOpen,
  title,
  onClose,
  children,
  maxWidth = '500px',
  icon = null
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
        style={{
          ...styles.modal,
          maxWidth,
          transform: `translate(${position.x}px, ${position.y}px)`
        }}
        onPointerDown={onPointerDown}
      >
        <div style={styles.header} className="drag-handle">
          <div style={styles.titleContainer}>
            {icon && <span style={styles.icon}>{icon}</span>}
            <h3 style={styles.title}>{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div style={styles.body}>
          {children}
        </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    animation: 'fadeIn 0.25s ease'
  },
  modal: {
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    color: 'var(--color-text-base, #1e293b)',
    borderRadius: '16px',
    width: '92%',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--color-border, #e2e8f0)',
    border: '1px solid var(--color-border, #e2e8f0)',
    overflow: 'hidden',
    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: '18px 24px',
    borderBottom: '1px solid var(--color-border, #e2e8f0)',
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'grab',
    userSelect: 'none'
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--color-primary, #1B365D)'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--color-text-base, #1e293b)',
    letterSpacing: '-0.01em'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    fontWeight: '400',
    cursor: 'pointer',
    color: 'var(--color-text-muted, #94a3b8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    transition: 'all 0.15s ease'
  },
  body: {
    padding: '24px',
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    maxHeight: '80vh',
    overflowY: 'auto'
  }
};
