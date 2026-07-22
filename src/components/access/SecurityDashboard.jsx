import React from 'react';
import useAuthData from '../../hooks/useAuthData';
import useAuditLog from '../../hooks/useAuditLog';

const styles = {
  container: { padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'var(--color-bg-base)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' },
  cardTitle: { fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, textTransform: 'uppercase', fontWeight: 'bold' },
  cardValue: { fontSize: '32px', margin: 0, color: 'var(--color-primary)', fontWeight: 'bold' },
  dangerValue: { color: '#d32f2f' }
};

export default function SecurityDashboard() {
  const { users } = useAuthData();
  const { logs } = useAuditLog();

  const activeUsers = users.filter(u => u.status === 'Ativo').length;
  const lockedUsers = users.filter(u => u.status === 'Bloqueada').length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayLogins = logs.filter(l => l.action === 'Login' && l.result === 'Sucesso' && l.date === today).length;
  const failedLogins = logs.filter(l => l.action === 'Login' && l.result === 'Falha').length;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h4 style={styles.cardTitle}>Utilizadores Ativos</h4>
        <p style={styles.cardValue}>{activeUsers}</p>
      </div>
      <div style={styles.card}>
        <h4 style={styles.cardTitle}>Contas Bloqueadas</h4>
        <p style={{...styles.cardValue, ...(lockedUsers > 0 ? styles.dangerValue : {})}}>{lockedUsers}</p>
      </div>
      <div style={styles.card}>
        <h4 style={styles.cardTitle}>Logins Hoje</h4>
        <p style={styles.cardValue}>{todayLogins}</p>
      </div>
      <div style={styles.card}>
        <h4 style={styles.cardTitle}>Tentativas Falhadas (Total)</h4>
        <p style={{...styles.cardValue, ...(failedLogins > 0 ? styles.dangerValue : {})}}>{failedLogins}</p>
      </div>
    </div>
  );
}
