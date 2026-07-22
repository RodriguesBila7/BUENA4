import React, { useState, useEffect } from 'react';
import useSecuritySettings from '../../../hooks/useSecuritySettings';
import useAuditLog from '../../../hooks/useAuditLog';
import { useAuth } from '../../../contexts/AuthContext';
import ConfirmModal from '../../ConfirmModal';

const styles = {
  container: { maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)' },
  title: { fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '16px' },
  formRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' },
  label: { fontWeight: '500', color: 'var(--color-text-base)', fontSize: '14px' },
  subLabel: { fontSize: '12px', color: 'var(--color-text-muted)' },
  input: { padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', width: '80px', textAlign: 'center', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)' },
  select: { padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)' },
  button: { padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', alignSelf: 'flex-start', marginTop: '20px' }
};

export default function AccountPolicies({ t }) {
  const { policies: globalPolicies, updatePolicies } = useSecuritySettings();
  const { logAction } = useAuditLog();
  const { user } = useAuth();

  const [policies, setPolicies] = useState({
    minLength: 8,
    complexity: 'high',
    maxAttempts: 3,
    sessionTimeout: 5,
    force2FA: false,
    autoLogout: true,
    maxSessions: 1,
    multipleDevices: false
  });

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    if (globalPolicies) {
      setPolicies(prev => ({
        ...prev,
        minLength: globalPolicies.minLength ?? globalPolicies.pwdMinLength ?? prev.minLength,
        complexity: globalPolicies.complexity ?? prev.complexity,
        maxAttempts: globalPolicies.maxAttempts ?? globalPolicies.loginMaxAttempts ?? prev.maxAttempts,
        sessionTimeout: globalPolicies.sessionTimeout ?? globalPolicies.sessionTimeoutMinutes ?? prev.sessionTimeout,
        force2FA: globalPolicies.force2FA ?? globalPolicies.loginTwoFactorAuth ?? prev.force2FA,
        autoLogout: globalPolicies.autoLogout ?? prev.autoLogout,
        maxSessions: globalPolicies.maxSessions ?? prev.maxSessions,
        multipleDevices: globalPolicies.multipleDevices ?? prev.multipleDevices
      }));
    }
  }, [globalPolicies]);

  const handleSave = async () => {
    const updatedGlobal = {
      ...globalPolicies,
      minLength: Number(policies.minLength),
      pwdMinLength: Number(policies.minLength),
      complexity: policies.complexity,
      maxAttempts: Number(policies.maxAttempts),
      loginMaxAttempts: Number(policies.maxAttempts),
      sessionTimeout: Number(policies.sessionTimeout),
      sessionTimeoutMinutes: Number(policies.sessionTimeout),
      force2FA: policies.force2FA,
      loginTwoFactorAuth: policies.force2FA,
      autoLogout: policies.autoLogout,
      maxSessions: Number(policies.maxSessions),
      multipleDevices: policies.multipleDevices
    };

    const result = await updatePolicies(updatedGlobal);
    if (result.success) {
      if (logAction) {
        logAction(user, 'Definições', 'Alterar Políticas', 'Alterou as políticas globais de conta');
      }
      setModalConfig({ isOpen: true, title: 'Sucesso', message: 'Políticas de segurança globais atualizadas com sucesso!' });
    } else {
      setModalConfig({ isOpen: true, title: 'Erro', message: 'Erro ao guardar políticas: ' + (result.error || '') });
    }
  };

  return (
    <div className="animate-fade-in" style={styles.container}>
      
      <div style={styles.card}>
        <h3 style={styles.title}>Políticas de Palavra-passe</h3>
        
        <div style={styles.formRow}>
          <div>
            <div style={styles.label}>Comprimento Mínimo</div>
            <div style={styles.subLabel}>Número mínimo de caracteres exigidos.</div>
          </div>
          <input type="number" value={policies.minLength} onChange={(e) => setPolicies({...policies, minLength: e.target.value})} style={styles.input} />
        </div>

        <div style={styles.formRow}>
          <div>
            <div style={styles.label}>Complexidade Obrigatória</div>
            <div style={styles.subLabel}>Nível de exigência (Maiúsculas, Números, Símbolos).</div>
          </div>
          <select value={policies.complexity} onChange={(e) => setPolicies({...policies, complexity: e.target.value})} style={styles.select}>
            <option value="low">Baixa (Apenas Letras/Números)</option>
            <option value="medium">Média (+ Maiúsculas)</option>
            <option value="high">Alta (+ Símbolos Especiais)</option>
          </select>
        </div>

        <div style={styles.formRow}>
          <div>
            <div style={styles.label}>Bloqueio Automático</div>
            <div style={styles.subLabel}>Nº máximo de tentativas falhadas antes de bloquear a conta.</div>
          </div>
          <input type="number" value={policies.maxAttempts} onChange={(e) => setPolicies({...policies, maxAttempts: e.target.value})} style={styles.input} />
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.title}>Políticas de Sessão e Autenticação</h3>
        
        <div style={styles.formRow}>
          <div>
            <div style={styles.label}>Tempo Máximo de Inatividade (Minutos)</div>
            <div style={styles.subLabel}>Tempo de inatividade antes de forçar o logout automático.</div>
          </div>
          <input type="number" value={policies.sessionTimeout} onChange={(e) => setPolicies({...policies, sessionTimeout: e.target.value})} style={styles.input} />
        </div>

        <div style={styles.formRow}>
          <div>
            <div style={styles.label}>Logout Automático</div>
            <div style={styles.subLabel}>Encerrar sessão automaticamente após o tempo máximo de inatividade.</div>
          </div>
          <input type="checkbox" checked={policies.autoLogout} onChange={(e) => setPolicies({...policies, autoLogout: e.target.checked})} style={{width: '20px', height: '20px'}} />
        </div>

        <div style={styles.formRow}>
          <div>
            <div style={styles.label}>Máximo de Sessões Simultâneas</div>
            <div style={styles.subLabel}>Quantas sessões ativas o utilizador pode ter em simultâneo.</div>
          </div>
          <input type="number" value={policies.maxSessions} onChange={(e) => setPolicies({...policies, maxSessions: e.target.value})} style={styles.input} />
        </div>

        <div style={styles.formRow}>
          <div>
            <div style={styles.label}>Permitir Múltiplos Dispositivos</div>
            <div style={styles.subLabel}>Permite o login em diferentes computadores ou telemóveis ao mesmo tempo.</div>
          </div>
          <input type="checkbox" checked={policies.multipleDevices} onChange={(e) => setPolicies({...policies, multipleDevices: e.target.checked})} style={{width: '20px', height: '20px'}} />
        </div>

        <div style={styles.formRow}>
          <div>
            <div style={styles.label}>Forçar 2FA Global</div>
            <div style={styles.subLabel}>Obrigar todos os utilizadores a configurar Autenticação de Dois Fatores.</div>
          </div>
          <input type="checkbox" checked={policies.force2FA} onChange={(e) => setPolicies({...policies, force2FA: e.target.checked})} style={{width: '20px', height: '20px'}} />
        </div>
      </div>

      <button style={styles.button} onClick={handleSave}>Guardar Políticas Globais</button>

      <ConfirmModal 
        isOpen={modalConfig.isOpen} 
        title={modalConfig.title}
        message={modalConfig.message}
        hideCancel={true}
        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </div>
  );
}
