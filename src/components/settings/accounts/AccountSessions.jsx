import React from 'react';

const SESSIONS = [
  { id: 1, device: 'Windows PC - Chrome', ip: '192.168.1.45', location: 'Maputo, MZ', time: 'Ativo agora', current: true },
  { id: 2, device: 'iPhone 13 - Safari', ip: '41.220.10.5', location: 'Matola, MZ', time: 'Última atividade há 2 horas', current: false },
  { id: 3, device: 'MacBook Pro - Firefox', ip: '10.0.0.8', location: 'Maputo, MZ', time: 'Última atividade ontem', current: false },
];

const styles = {
  container: { maxWidth: '900px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  buttonDanger: { padding: '10px 16px', backgroundColor: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' },
  infoCol: { flex: 1, marginLeft: '16px' },
  deviceLabel: { fontWeight: 'bold', fontSize: '16px', color: 'var(--color-text-base)', display: 'flex', alignItems: 'center', gap: '10px' },
  currentBadge: { fontSize: '10px', backgroundColor: 'var(--color-success)', color: 'white', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' },
  metaData: { fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' },
  actionBtn: { padding: '8px 12px', backgroundColor: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text-base)' }
};

export default function AccountSessions({ t }) {
  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Sessões Ativas</h3>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '14px' }}>Dispositivos com sessão iniciada atualmente.</p>
        </div>
        <button style={styles.buttonDanger}>Encerrar Todas as Outras Sessões</button>
      </div>

      <div>
        {SESSIONS.map(sess => (
          <div key={sess.id} style={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={styles.iconBox}>
                {sess.device.includes('iPhone') ? '📱' : '💻'}
              </div>
              <div style={styles.infoCol}>
                <div style={styles.deviceLabel}>
                  {sess.device}
                  {sess.current && <span style={styles.currentBadge}>Sessão Atual</span>}
                </div>
                <div style={styles.metaData}>
                  IP: {sess.ip} • Localização: {sess.location}
                </div>
                <div style={{...styles.metaData, color: sess.current ? 'var(--color-success)' : 'var(--color-text-muted)'}}>
                  {sess.time}
                </div>
              </div>
            </div>
            {!sess.current && (
              <button style={styles.actionBtn}>Encerrar Sessão</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
