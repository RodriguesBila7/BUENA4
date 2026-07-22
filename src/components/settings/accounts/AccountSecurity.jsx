import React, { useState } from 'react';

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' },
  section: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)' },
  title: { fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '16px' },
  description: { fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  label: { fontSize: '14px', fontWeight: '500', color: 'var(--color-text-base)' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)' },
  button: { padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', alignSelf: 'flex-start' },
  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }
};

export default function AccountSecurity({ t }) {
  const [twoFactor, setTwoFactor] = useState(false);

  return (
    <div className="animate-fade-in" style={styles.container}>
      
      <div style={styles.section}>
        <h3 style={styles.title}>Alterar Palavra-passe</h3>
        <p style={styles.description}>Recomendamos a utilização de uma palavra-passe forte com letras, números e símbolos.</p>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Palavra-passe atual</label>
          <input type="password" style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nova Palavra-passe</label>
          <input type="password" style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Confirmar Nova Palavra-passe</label>
          <input type="password" style={styles.input} />
        </div>
        <button style={styles.button}>Atualizar Palavra-passe</button>
      </div>

      <div style={styles.section}>
        <h3 style={styles.title}>Autenticação de Dois Fatores (2FA)</h3>
        <p style={styles.description}>Adicione uma camada extra de segurança à sua conta solicitando um código de verificação no login.</p>
        
        <div style={styles.toggleRow}>
          <div>
            <div style={{ fontWeight: '600' }}>Autenticação por Email</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Receber código no email institucional</div>
          </div>
          <button 
            onClick={() => setTwoFactor(!twoFactor)}
            style={{...styles.button, backgroundColor: twoFactor ? 'var(--color-success)' : 'transparent', color: twoFactor ? '#fff' : 'var(--color-text-muted)', border: twoFactor ? 'none' : '1px solid var(--color-border)'}}
          >
            {twoFactor ? 'Ativado' : 'Ativar'}
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.title}>Recuperação de Conta</h3>
        <p style={styles.description}>Configure os seus contactos para recuperação caso perca acesso à sua conta.</p>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Email de Recuperação (Alternativo)</label>
          <input type="email" placeholder="email@pessoal.com" style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Telefone para Recuperação</label>
          <input type="tel" placeholder="+258 84 000 0000" style={styles.input} />
        </div>
        <button style={styles.button}>Guardar Contactos</button>
      </div>

    </div>
  );
}
