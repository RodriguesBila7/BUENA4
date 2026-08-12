import React, { useState, useEffect } from 'react';
import useSecuritySettings from '../../hooks/useSecuritySettings';
import useAuditLog from '../../hooks/useAuditLog';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../ConfirmModal';

const styles = {
  container: { padding: '0', backgroundColor: 'transparent', width: '100%' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', width: '100%' },
  section: { padding: '18px', border: '1px solid var(--color-border)', borderRadius: '10px', backgroundColor: 'var(--color-bg-base)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  input: { padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-base)', fontSize: '13px' },
  btnSave: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px', fontSize: '14px' }
};

export default function SecurityPolicies() {
  const { policies, updatePolicies } = useSecuritySettings();
  const { logAction } = useAuditLog();
  const { user } = useAuth();

  const [formData, setFormData] = useState(policies);

  useEffect(() => {
    if (policies) {
      setFormData(policies);
    }
  }, [policies]);

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });
  const showModal = (title, message) => setModalConfig({ isOpen: true, title, message });
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value)
    }));
  };

  const handleSave = () => {
    updatePolicies(formData);
    logAction(user, 'Acessos', 'Alterar Políticas', 'Alterou as políticas de segurança globais');
    showModal('Sucesso', 'Políticas de segurança atualizadas com sucesso!');
  };

  return (
    <div style={styles.container}>
      <h3 style={{ marginTop: 0 }}>Políticas de Segurança</h3>
      
      <div style={styles.grid}>
        <div style={styles.section}>
          <h4 style={{ margin: '0 0 15px 0', color: 'var(--color-primary)' }}>Autenticação e Sessão</h4>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Tentativas Máximas de Login</label>
            <input type="number" name="loginMaxAttempts" value={formData.loginMaxAttempts} onChange={handleChange} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tempo de Bloqueio da Conta (Minutos)</label>
            <input type="number" name="loginLockoutMinutes" value={formData.loginLockoutMinutes} onChange={handleChange} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Expiração de Sessão por Inatividade (Minutos)</label>
            <input type="number" name="sessionTimeoutMinutes" value={formData.sessionTimeoutMinutes} onChange={handleChange} style={styles.input} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
            <input type="checkbox" name="loginTwoFactorAuth" checked={formData.loginTwoFactorAuth} onChange={handleChange} />
            Exigir Autenticação de 2 Fatores (2FA)
          </label>
        </div>

        <div style={styles.section}>
          <h4 style={{ margin: '0 0 15px 0', color: 'var(--color-primary)' }}>Complexidade da Palavra-Passe</h4>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Comprimento Mínimo</label>
            <input type="number" name="pwdMinLength" value={formData.pwdMinLength} onChange={handleChange} style={styles.input} />
          </div>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', color: 'var(--color-text-main)' }}>
            <input type="checkbox" name="pwdRequireUppercase" checked={formData.pwdRequireUppercase} onChange={handleChange} />
            Exigir Letra Maiúscula
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', color: 'var(--color-text-main)' }}>
            <input type="checkbox" name="pwdRequireNumbers" checked={formData.pwdRequireNumbers} onChange={handleChange} />
            Exigir Números
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', fontSize: '13px', color: 'var(--color-text-main)' }}>
            <input type="checkbox" name="pwdRequireSpecial" checked={formData.pwdRequireSpecial} onChange={handleChange} />
            Exigir Caracteres Especiais (@, #, !)
          </label>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Expiração da Palavra-passe (Dias)</label>
            <input type="number" name="pwdExpiryDays" value={formData.pwdExpiryDays} onChange={handleChange} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Histórico de Senhas (Proibir re-uso)</label>
            <input type="number" name="pwdHistoryCount" value={formData.pwdHistoryCount} onChange={handleChange} style={styles.input} />
          </div>
        </div>
      </div>

      <button style={styles.btnSave} onClick={handleSave}>Guardar Políticas</button>

      <ConfirmModal 
        isOpen={modalConfig.isOpen} 
        title={modalConfig.title}
        message={modalConfig.message}
        hideCancel={true}
        onConfirm={closeModal}
      />
    </div>
  );
}
