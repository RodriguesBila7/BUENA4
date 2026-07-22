import React from 'react';

const styles = {
  container: { maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)' },
  title: { fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '16px' },
  description: { fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '20px' },
  searchBar: { padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '400px', marginBottom: '20px' },
  actionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  actionBox: { border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  btnPrimary: { padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  btnOutline: { padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }
};

export default function AccountRecovery({ t }) {
  return (
    <div className="animate-fade-in" style={styles.container}>
      
      <div style={styles.card}>
        <h3 style={styles.title}>Painel de Recuperação de Contas (Admin)</h3>
        <p style={styles.description}>Utilize este painel para auxiliar utilizadores que perderam acesso às suas contas ou cujas contas foram bloqueadas.</p>
        
        <input type="text" placeholder="Pesquisar utilizador (Nome, Username ou Email)..." style={styles.searchBar} />

        <div style={styles.actionGrid}>
          <div style={styles.actionBox}>
            <div style={{ fontWeight: 'bold' }}>Reposição de Palavra-passe</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Envia um link seguro para o email do utilizador para redefinir a senha.</div>
            <button style={styles.btnPrimary}>Enviar Link de Reposição</button>
          </div>

          <div style={styles.actionBox}>
            <div style={{ fontWeight: 'bold' }}>Desbloqueio de Conta</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Desbloqueia contas suspensas por excesso de tentativas falhadas.</div>
            <button style={styles.btnOutline}>Desbloquear Conta</button>
          </div>

          <div style={styles.actionBox}>
            <div style={{ fontWeight: 'bold' }}>Reenvio de Ativação</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Reenvia o email com as instruções iniciais de ativação de conta.</div>
            <button style={styles.btnOutline}>Reenviar Ativação</button>
          </div>

          <div style={styles.actionBox}>
            <div style={{ fontWeight: 'bold' }}>Auditoria de Acesso</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Verificar o histórico recente de tentativas de login do utilizador.</div>
            <button style={styles.btnOutline}>Ver Registos</button>
          </div>
        </div>
      </div>

    </div>
  );
}
