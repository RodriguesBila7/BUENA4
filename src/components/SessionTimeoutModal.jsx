import React, { useEffect, useState } from 'react';

export default function SessionTimeoutModal({ isOpen, onConfirm }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.iconContainer}>
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 style={styles.title}>Sessão Expirada</h2>
        <p style={styles.message}>
          A sua sessão expirou devido a um longo período de inatividade. Por motivos de segurança, por favor, faça login novamente para continuar.
        </p>
        <button onClick={onConfirm} style={styles.button}>
          Fazer Login Novamente
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2147483647, // Maximo possível
    animation: 'fadeIn 0.3s ease',
  },
  modal: {
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    borderRadius: '16px',
    padding: '35px 30px',
    width: '90%',
    maxWidth: '420px',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    animation: 'slideUp 0.4s ease',
  },
  iconContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-bg-base, #f7fafc)',
    border: '2px solid var(--color-border, #e2e8f0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px auto',
  },
  icon: {
    width: '28px',
    height: '28px',
    color: 'var(--color-text-muted, #4a5568)',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--color-text-base, #1a202c)',
    margin: '0 0 12px 0',
  },
  message: {
    fontSize: '14px',
    color: 'var(--color-text-muted, #4a5568)',
    lineHeight: '1.6',
    margin: '0 0 30px 0',
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--color-primary, #1B365D)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  }
};
