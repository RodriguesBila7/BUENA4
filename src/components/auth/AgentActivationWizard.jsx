import React, { useState, useEffect } from 'react';
import {
  validateNuitAndCode,
  verifyEmployeePhone,
  generateFinalSmsConfirmationCode,
  finalizeAccountActivation
} from '../../services/agentActivationService';

export default function AgentActivationWizard({ employees = [], updateEmployee, onLoginSuccess, onCancel }) {
  const [step, setStep] = useState(1); // 1: NUIT + Codigo, 2: Telefone, 3: Nova Senha, 4: SMS Final
  const [nuit, setNuit] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [smsCode, setSmsCode] = useState('');
  
  const [identifiedEmp, setIdentifiedEmp] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulatedSmsAlert, setSimulatedSmsAlert] = useState(null);

  // ─── GESTÃO DO CRONÓMETRO DE 15 MINUTOS (COMEÇA AO ACEDER AO APLICATIVO) ──────
  const [countdownExpiresAt, setCountdownExpiresAt] = useState(() => {
    // Ao aceder ao assistente, inicializa o teto máximo de 15 minutos
    return new Date(Date.now() + 15 * 60 * 1000).toISOString();
  });
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);

  useEffect(() => {
    if (!countdownExpiresAt) return;

    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(countdownExpiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        setError('O tempo limite de 15 minutos deste código expirou. Por motivos de segurança, solicite um novo código junto da DRH.');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [countdownExpiresAt]);

  const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

  const formattedCountdown = () => {
    if (remainingSeconds === null) return '15:00';
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ─── INTEGRAÇÃO COM OS BOTÕES NATIVOS DE VOLTAR E SEGUIR DO TELEMÓVEL ──────
  const goToStep = (nextStep, pushHistory = true) => {
    setStep(nextStep);
    setError('');
    if (pushHistory && typeof window !== 'undefined') {
      window.history.pushState({ view: 'agent_code', step: nextStep }, '');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Assegurar que o histórico tem o passo 1 registrado
    if (!window.history.state || window.history.state.view !== 'agent_code') {
      window.history.pushState({ view: 'agent_code', step: 1 }, '');
    }

    const handlePopState = (event) => {
      const state = event.state;
      if (!state || state.view !== 'agent_code') {
        // O utilizador usou o botão nativo "Voltar" do telemóvel para sair do assistente
        if (onCancel) onCancel();
        return;
      }

      const targetStep = state.step || 1;
      setStep(targetStep);
      setError('');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onCancel]);

  const handleNativeBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else if (step > 1) {
      goToStep(step - 1, false);
    } else if (onCancel) {
      onCancel();
    }
  };

  // ─── PASSO 1: Validar NUIT + Código Inicial ────────────────────────────────
  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (isExpired) {
      setError('O tempo limite de 15 minutos expirou. Solicite um novo código à DRH.');
      return;
    }
    setError('');
    const res = validateNuitAndCode(nuit, accessCode, employees);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setIdentifiedEmp(res.employee);
    if (res.expiresAt) {
      setCountdownExpiresAt(res.expiresAt);
    }
    goToStep(2);
  };

  // ─── PASSO 2: Validar Número de Telefone Principal ─────────────────────────
  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (isExpired) {
      setError('O tempo limite de 15 minutos expirou. Solicite um novo código à DRH.');
      return;
    }
    setError('');
    const res = verifyEmployeePhone(identifiedEmp, phone);
    if (!res.success) {
      setError(res.error);
      return;
    }
    goToStep(3);
  };

  // ─── PASSO 3: Submeter Nova Senha e Gerar Código SMS ───────────────────────
  const handleStep3Submit = (e) => {
    e.preventDefault();
    if (isExpired) {
      setError('O tempo limite de 15 minutos expirou. Solicite um novo código à DRH.');
      return;
    }
    setError('');

    if (newPassword.length < 5) {
      setError('A palavra-passe deve ter pelo menos 5 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As palavras-passe não coincidem. Por favor, verifique.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Gerar e "enviar" o novo código SMS
      const generatedSms = generateFinalSmsConfirmationCode(identifiedEmp.id, phone);
      
      // Simulação visual de recebimento do SMS no telemóvel
      setSimulatedSmsAlert({
        phone: phone || identifiedEmp.phone,
        code: generatedSms
      });

      goToStep(4);
    }, 600);
  };

  // ─── PASSO 4: Validar Código SMS Final e Entrar ────────────────────────────
  const handleStep4Submit = async (e) => {
    e.preventDefault();
    if (isExpired) {
      setError('O tempo limite de 15 minutos expirou. Solicite um novo código à DRH.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await finalizeAccountActivation(identifiedEmp, newPassword, smsCode, updateEmployee);
      setLoading(false);

      if (!res.success) {
        setError(res.error);
        return;
      }

      // Sucesso total! Efetua o login direto e entra no Portal
      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } catch {
      setLoading(false);
      setError('Erro ao processar ativação de conta. Tente novamente.');
    }
  };

  return (
    <div style={styles.wizardCard}>
      {/* CABEÇALHO DO WIZARD COM BARRAS E CRONÓMETRO */}
      <div style={styles.wizardHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={styles.badgeStep}>Passo {step} de 4</div>
          
          {/* CRONÓMETRO DE 15 MINUTOS */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '16px',
            fontSize: '11px',
            fontWeight: '800',
            backgroundColor: isExpired ? '#fef2f2' : remainingSeconds < 180 ? '#fffbeb' : '#ecfdf5',
            color: isExpired ? '#dc2626' : remainingSeconds < 180 ? '#d97706' : '#059669',
            border: isExpired ? '1px solid #fecaca' : remainingSeconds < 180 ? '1px solid #fde68a' : '1px solid #a7f3d0'
          }}>
            <span>⏱️</span>
            <span>{isExpired ? 'Expirado' : `Válido por ${formattedCountdown()}`}</span>
          </div>
        </div>

        <h3 style={styles.wizardTitle}>
          {step === 1 && '🔑 Ativação por Código de Acesso'}
          {step === 2 && '📱 Confirmação de Identidade por Telefone'}
          {step === 3 && '🔒 Definição de Nova Senha Pessoal'}
          {step === 4 && '✉️ Confirmação Final de Segurança (SMS)'}
        </h3>
        <p style={styles.wizardSub}>
          {step === 1 && 'Insira o seu NUIT e o código temporário recebido por SMS, WhatsApp ou Email da DRH (validade de 15 minutos).'}
          {step === 2 && 'Confirme o número de telefone principal registado no seu cadastro oficial do SERNIC.'}
          {step === 3 && 'Crie a sua palavra-passe definitiva para aceder ao sistema.'}
          {step === 4 && 'Introduza o código de confirmação final que acabámos de enviar por SMS.'}
        </p>

        {/* BARRA DE PROGRESSO */}
        <div style={styles.progressBarBg}>
          <div style={{ ...styles.progressBarFill, width: `${(step / 4) * 100}%` }}></div>
        </div>
      </div>

      {/* ERROS */}
      {error && (
        <div style={styles.errorBox}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* SIMULAÇÃO DE SMS RECEBIDA (ALERTA NO TOPO) */}
      {simulatedSmsAlert && step === 4 && (
        <div style={styles.smsAlertBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#059669', fontSize: '13px' }}>📨 SMS Recebido (SERNIC DRH)</strong>
            <span style={{ fontSize: '11px', color: '#666' }}>Agora mesmo</span>
          </div>
          <div style={{ fontSize: '13px', margin: '4px 0', color: '#111' }}>
            SERNIC: O seu código de confirmação final para ativação de senha é: 
            <strong style={{ fontSize: '15px', color: '#BA1B1D', letterSpacing: '2px', marginLeft: '6px' }}>
              {simulatedSmsAlert.code}
            </strong>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          FORMULÁRIO PASSO 1: NUIT + CÓDIGO TEMPORÁRIO
         ────────────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>NUIT ou NIP do Funcionário:</label>
            <input
              type="text"
              placeholder="Ex: 118744025 ou 175580"
              value={nuit}
              onChange={e => setNuit(e.target.value)}
              style={styles.input}
              required
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Código de Acesso Temporário (6 dígitos):</label>
            <input
              type="text"
              placeholder="Ex: 749201 (conforme SMS/WhatsApp recebido)"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
              style={{ ...styles.input, letterSpacing: '2px', fontWeight: 'bold' }}
              maxLength={10}
              required
            />
            <span style={styles.hint}>
              ⏱️ A validade de 15 minutos é acionada assim que entra no aplicativo.
            </span>
          </div>

          <div style={styles.btnRow}>
            <button type="button" onClick={handleNativeBack} style={styles.btnSecondary}>
              Voltar ao Login
            </button>
            <button type="submit" disabled={isExpired} style={{ ...styles.btnPrimary, opacity: isExpired ? 0.6 : 1 }}>
              Validar Código ➔
            </button>
          </div>
        </form>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          FORMULÁRIO PASSO 2: CONFIRMAR NÚMERO DE TELEFONE
         ────────────────────────────────────────────────────────────────── */}
      {step === 2 && identifiedEmp && (
        <form onSubmit={handleStep2Submit} style={styles.form}>
          <div style={styles.agentCardSummary}>
            <div style={styles.avatarMini}>
              {identifiedEmp.photo ? (
                <img src={identifiedEmp.photo} alt={identifiedEmp.name} style={styles.avatarImg} />
              ) : (
                identifiedEmp.name?.charAt(0).toUpperCase() || 'A'
              )}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-text-base)' }}>
                {identifiedEmp.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                NIP: {identifiedEmp.nip || 'N/A'} • NUIT: {identifiedEmp.nuit}
              </div>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Número de Telefone Principal Registado:</label>
            <input
              type="tel"
              placeholder="Ex: 841234567 ou +258 84 123 4567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={styles.input}
              required
              autoFocus
            />
            <span style={styles.hint}>
              Para validação de segurança, confirme o número de telemóvel associado ao seu registo no SERNIC.
            </span>
          </div>

          <div style={styles.btnRow}>
            <button type="button" onClick={handleNativeBack} style={styles.btnSecondary}>
              ⬅ Voltar
            </button>
            <button type="submit" disabled={isExpired} style={{ ...styles.btnPrimary, opacity: isExpired ? 0.6 : 1 }}>
              Confirmar Telefone ➔
            </button>
          </div>
        </form>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          FORMULÁRIO PASSO 3: DEFINIÇÃO DE NOVA PALAVRA-PASSE
         ────────────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <form onSubmit={handleStep3Submit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nova Palavra-Passe:</label>
            <input
              type="password"
              placeholder="Digite a sua nova senha pessoal"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={styles.input}
              required
              minLength={5}
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Repetir Nova Palavra-Passe:</label>
            <input
              type="password"
              placeholder="Confirme a nova senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={styles.input}
              required
              minLength={5}
            />
            <span style={styles.hint}>
              Ao avançar, o sistema enviará um novo código por SMS para validar o seu telemóvel.
            </span>
          </div>

          <div style={styles.btnRow}>
            <button type="button" onClick={handleNativeBack} style={styles.btnSecondary}>
              ⬅ Voltar
            </button>
            <button type="submit" disabled={loading || isExpired} style={{ ...styles.btnPrimary, opacity: isExpired ? 0.6 : 1 }}>
              {loading ? 'A Enviar SMS...' : 'Submeter e Gerar Código SMS ➔'}
            </button>
          </div>
        </form>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          FORMULÁRIO PASSO 4: CÓDIGO SMS FINAL (CONFIRMAÇÃO 2FA)
         ────────────────────────────────────────────────────────────────── */}
      {step === 4 && (
        <form onSubmit={handleStep4Submit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Código SMS de 6 dígitos:</label>
            <input
              type="text"
              placeholder="• • • • • •"
              value={smsCode}
              onChange={e => setSmsCode(e.target.value)}
              style={{ ...styles.input, textAlign: 'center', fontSize: '20px', letterSpacing: '6px', fontWeight: '800' }}
              maxLength={6}
              required
              autoFocus
            />
            <span style={styles.hint}>
              Introduza o código final de 6 dígitos enviado por SMS para o número {phone || identifiedEmp?.phone}.
            </span>
          </div>

          <div style={styles.btnRow}>
            <button type="button" onClick={handleNativeBack} style={styles.btnSecondary}>
              ⬅ Alterar Senha
            </button>
            <button type="submit" disabled={loading || isExpired} style={{ ...styles.btnPrimary, opacity: isExpired ? 0.6 : 1 }}>
              {loading ? 'A Ativar Conta...' : '✓ Confirmar e Entrar no Portal'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const styles = {
  wizardCard: {
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    borderRadius: '16px',
    padding: '28px 24px',
    boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
    border: '1px solid var(--color-border, #cbd5e1)',
    width: '100%',
    maxWidth: '480px',
    margin: '0 auto',
    boxSizing: 'border-box'
  },
  wizardHeader: { marginBottom: '20px' },
  badgeStep: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    backgroundColor: 'rgba(186, 27, 29, 0.1)',
    color: '#BA1B1D',
    fontSize: '11px',
    fontWeight: '800'
  },
  wizardTitle: {
    margin: '6px 0 4px 0',
    fontSize: '17px',
    fontWeight: '800',
    color: 'var(--color-text-base, #0f172a)'
  },
  wizardSub: {
    margin: '0 0 14px 0',
    fontSize: '12.5px',
    color: 'var(--color-text-muted, #64748b)',
    lineHeight: '1.4'
  },
  progressBarBg: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--color-border, #e2e8f0)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#BA1B1D',
    transition: 'width 0.3s ease'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--color-text-base, #334155)'
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #cbd5e1)',
    backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
    color: 'var(--color-text-base, #0f172a)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  hint: { fontSize: '11px', color: 'var(--color-text-muted, #64748b)', marginTop: '2px' },
  btnRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginTop: '10px'
  },
  btnPrimary: {
    padding: '11px 18px',
    backgroundColor: '#BA1B1D',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
    flex: 1,
    boxShadow: '0 4px 14px rgba(186, 27, 29, 0.35)',
    transition: 'all 0.2s ease'
  },
  btnSecondary: {
    padding: '11px 16px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted, #64748b)',
    border: '1px solid var(--color-border, #cbd5e1)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '14px'
  },
  smsAlertBox: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    padding: '12px 14px',
    borderRadius: '10px',
    marginBottom: '14px',
    animation: 'fadeIn 0.3s ease-out'
  },
  agentCardSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: 'rgba(186, 27, 29, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(186, 27, 29, 0.15)'
  },
  avatarMini: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: '#BA1B1D',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '15px',
    overflow: 'hidden'
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' }
};
