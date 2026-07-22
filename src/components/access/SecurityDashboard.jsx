import React from 'react';
import useAuthData from '../../hooks/useAuthData';
import useAuditLog from '../../hooks/useAuditLog';

const styles = {
  container: { padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'var(--color-bg-base)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  cardTitle: { fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' },
  cardValue: { fontSize: '32px', margin: 0, color: 'var(--color-primary)', fontWeight: 'bold' },
  dangerValue: { color: 'var(--color-danger, #d32f2f)' },
  cardFooter: { fontSize: '12px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontWeight: '600' }
};

export default function SecurityDashboard({ onNavigate }) {
  const { users = [] } = useAuthData();
  const { logs = [] } = useAuditLog();

  const activeUsers = users.filter(u => u.status === 'Ativo').length;
  const lockedUsers = users.filter(u => u.status === 'Bloqueada').length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayLogins = logs.filter(l => l.action === 'Login' && l.result === 'Sucesso' && l.date === today).length;
  const failedLogins = logs.filter(l => l.action === 'Login' && l.result === 'Falha').length;

  return (
    <div style={styles.container}>
      <div 
        style={styles.card} 
        onClick={() => onNavigate && onNavigate('users')}
        title="Ver lista de utilizadores"
      >
        <h4 style={styles.cardTitle}>Utilizadores Ativos</h4>
        <p style={styles.cardValue}>{activeUsers}</p>
        <span style={styles.cardFooter}>Ver Utilizadores →</span>
      </div>

      <div 
        style={styles.card} 
        onClick={() => onNavigate && onNavigate('users')}
        title="Ver contas bloqueadas"
      >
        <h4 style={styles.cardTitle}>Contas Bloqueadas</h4>
        <p style={{...styles.cardValue, ...(lockedUsers > 0 ? styles.dangerValue : {})}}>{lockedUsers}</p>
        <span style={styles.cardFooter}>Gerir Acessos →</span>
      </div>

      <div 
        style={styles.card} 
        onClick={() => onNavigate && onNavigate('audit')}
        title="Ver registo de auditoria"
      >
        <h4 style={styles.cardTitle}>Logins Hoje</h4>
        <p style={styles.cardValue}>{todayLogins}</p>
        <span style={styles.cardFooter}>Ver Auditoria →</span>
      </div>

      <div 
        style={styles.card} 
        onClick={() => onNavigate && onNavigate('audit')}
        title="Ver tentativas falhadas na auditoria"
      >
        <h4 style={styles.cardTitle}>Tentativas Falhadas (Total)</h4>
        <p style={{...styles.cardValue, ...(failedLogins > 0 ? styles.dangerValue : {})}}>{failedLogins}</p>
        <span style={styles.cardFooter}>Ver Auditoria →</span>
      </div>
    </div>
  );
}
