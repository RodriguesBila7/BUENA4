import React from 'react';

const HISTORY = [
  { id: 1, date: '2026-06-28 14:30', user: 'jsilva', action: 'Login bem-sucedido', module: 'Autenticação', ip: '192.168.1.45', type: 'success' },
  { id: 2, date: '2026-06-27 16:45', user: 'admin', action: 'Alteração de Perfil (Utilizador -> Gestor)', module: 'Administração', ip: '10.0.0.1', type: 'info' },
  { id: 3, date: '2026-06-25 09:12', user: 'rcosta', action: 'Tentativa de login falhada (Senha incorreta)', module: 'Autenticação', ip: '41.220.10.5', type: 'error' },
  { id: 4, date: '2026-06-25 09:15', user: 'rcosta', action: 'Conta bloqueada automaticamente (Max tentativas)', module: 'Segurança', ip: '41.220.10.5', type: 'error' },
  { id: 5, date: '2026-06-20 10:00', user: 'admin', action: 'Criação de Conta', module: 'Administração', ip: '10.0.0.1', type: 'success' },
];

const styles = {
  container: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)' },
  title: { fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '20px' },
  timeline: { borderLeft: '2px solid var(--color-border)', marginLeft: '10px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  item: { position: 'relative' },
  dot: (type) => ({
    position: 'absolute', left: '-27px', top: '4px', width: '12px', height: '12px', borderRadius: '50%',
    backgroundColor: type === 'error' ? 'var(--color-danger)' : (type === 'success' ? 'var(--color-success)' : 'var(--color-info)'),
    border: '2px solid var(--color-bg-card)'
  }),
  date: { fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 'bold' },
  action: { fontSize: '14px', color: 'var(--color-text-base)', fontWeight: '500', margin: '4px 0' },
  meta: { fontSize: '12px', color: 'var(--color-text-muted)' }
};

export default function AccountHistory({ t }) {
  return (
    <div className="animate-fade-in" style={styles.container}>
      <h3 style={styles.title}>Histórico de Ciclo de Vida e Auditoria (Global)</h3>
      
      <div style={styles.timeline}>
        {HISTORY.map(log => (
          <div key={log.id} style={styles.item}>
            <div style={styles.dot(log.type)}></div>
            <div style={styles.date}>{log.date}</div>
            <div style={styles.action}>{log.action}</div>
            <div style={styles.meta}>Utilizador alvo: <strong>{log.user}</strong> | IP: {log.ip} | Módulo: {log.module}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
