import React from 'react';
import DraggableModal from './common/DraggableModal';

export default function SessionTimeoutModal({ isOpen, onConfirm }) {
  return (
    <DraggableModal
      isOpen={isOpen}
      title="Sessão Expirada"
      onClose={onConfirm}
      maxWidth="420px"
    >
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div style={styles.iconContainer}>
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <p style={styles.message}>
          A sua sessão expirou devido a um longo período de inatividade. Por motivos de segurança, por favor, faça login novamente para continuar.
        </p>
        <button onClick={onConfirm} style={styles.button}>
          Fazer Login Novamente
        </button>
      </div>
    </DraggableModal>
  );
}

const styles = {
  iconContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-bg-base)',
    border: '2px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px auto',
  },
  icon: {
    width: '28px',
    height: '28px',
    color: 'var(--color-primary)',
  },
  message: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    lineHeight: '1.6',
    margin: '0 0 24px 0',
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  }
};
