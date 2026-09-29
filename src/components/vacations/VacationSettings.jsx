import React, { useState, useEffect } from 'react';
import useVacationData from '../../hooks/useVacationData';
import ConfirmModal from '../ConfirmModal';
import { ALERT_TYPES, DEFAULT_TEMPLATES } from '../../utils/vacationAlerts';

export default function VacationSettings() {
  const { settings, updateSettings } = useVacationData();
  
  const [localSettings, setLocalSettings] = useState({
    annualDays: 30,
    minMonthsForEligibility: 12,
    allowAccumulation: true,
    maxAccumulatedDays: 60,
    holidayOffset: true,
    messageTemplates: { ...DEFAULT_TEMPLATES }
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        ...settings,
        messageTemplates: {
          ...DEFAULT_TEMPLATES,
          ...(settings.messageTemplates || {})
        }
      });
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateChange = (alertType, text) => {
    setLocalSettings(prev => ({
      ...prev,
      messageTemplates: {
        ...(prev.messageTemplates || DEFAULT_TEMPLATES),
        [alertType]: text
      }
    }));
  };

  const handleResetTemplate = (alertType) => {
    setLocalSettings(prev => ({
      ...prev,
      messageTemplates: {
        ...(prev.messageTemplates || DEFAULT_TEMPLATES),
        [alertType]: DEFAULT_TEMPLATES[alertType]
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings(localSettings);
    setIsSaving(false);
    
    setConfirmModal({
      isOpen: true,
      title: 'Configurações Guardadas',
      message: 'As regras globais e os modelos de mensagens automáticas de férias foram atualizados com sucesso.',
      hideCancel: true
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={styles.title}>Parâmetros e Regras de Negócio</h3>
        <p style={styles.desc}>Configure as diretrizes legais que o sistema utilizará para validar pedidos e calcular saldos.</p>

        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Dias de Férias por Ano</label>
            <input 
              type="number" 
              value={localSettings.annualDays} 
              onChange={e => handleChange('annualDays', parseInt(e.target.value) || 0)} 
              style={styles.input} 
            />
            <span style={styles.hint}>Normalmente 30 dias na Administração Pública.</span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Meses Mínimos para Elegibilidade Integral</label>
            <input 
              type="number" 
              value={localSettings.minMonthsForEligibility} 
              onChange={e => handleChange('minMonthsForEligibility', parseInt(e.target.value) || 0)} 
              style={styles.input} 
            />
            <span style={styles.hint}>Tempo de serviço para ter direito à totalidade (ex: 12 meses).</span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Permitir Acumulação de Férias?</label>
            <select 
              value={localSettings.allowAccumulation ? 'yes' : 'no'} 
              onChange={e => handleChange('allowAccumulation', e.target.value === 'yes')} 
              style={styles.input}
            >
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Limite Máximo Acumulável (Dias)</label>
            <input 
              type="number" 
              value={localSettings.maxAccumulatedDays} 
              onChange={e => handleChange('maxAccumulatedDays', parseInt(e.target.value) || 0)} 
              style={styles.input} 
              disabled={!localSettings.allowAccumulation}
            />
            <span style={styles.hint}>Máximo de dias que um funcionário pode transitar para o ano seguinte.</span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Descontar Feriados e Fins de Semana?</label>
            <select 
              value={localSettings.holidayOffset ? 'yes' : 'no'} 
              onChange={e => handleChange('holidayOffset', e.target.value === 'yes')} 
              style={styles.input}
            >
              <option value="yes">Sim</option>
              <option value="no">Não (Conta todos os dias do calendário)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECÇÃO DE MODELOS DE MENSAGENS AUTOMÁTICAS */}
      <div style={styles.card}>
        <h3 style={styles.title}>📱 Modelos das Mensagens Automáticas de Férias</h3>
        <p style={styles.desc}>
          Personalize as mensagens oficiais enviadas para os contactos registados (WhatsApp / SMS) nos 3 momentos regulamentares.
          <br />
          <strong style={{ color: 'var(--color-primary)' }}>Variáveis dinâmicas suportadas:</strong> <code>{'{NOME}'}</code>, <code>{'{NIP}'}</code>, <code>{'{DIAS}'}</code>, <code>{'{DATA_INICIO}'}</code>, <code>{'{DATA_FIM}'}</code>, <code>{'{DATA_RETORNO}'}</code>, <code>{'{DEPARTAMENTO}'}</code>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* GATILHO 1: INÍCIO */}
          <div style={styles.templateBox}>
            <div style={styles.templateHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ ...styles.pill, backgroundColor: '#ecfdf5', color: '#059669' }}>Gatilho 1</span>
                <strong style={{ fontSize: '14px', color: 'var(--color-text-base)' }}>Mensagem de Início das Férias (Hoje)</strong>
              </div>
              <button 
                type="button" 
                onClick={() => handleResetTemplate(ALERT_TYPES.START_TODAY)} 
                style={styles.btnReset}
              >
                ↺ Restaurar Padrão
              </button>
            </div>
            <textarea 
              rows={5}
              value={localSettings.messageTemplates?.[ALERT_TYPES.START_TODAY] || ''}
              onChange={(e) => handleTemplateChange(ALERT_TYPES.START_TODAY, e.target.value)}
              style={styles.textarea}
            />
          </div>

          {/* GATILHO 2: 5 DIAS */}
          <div style={styles.templateBox}>
            <div style={styles.templateHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ ...styles.pill, backgroundColor: '#fffbeb', color: '#d97706' }}>Gatilho 2</span>
                <strong style={{ fontSize: '14px', color: 'var(--color-text-base)' }}>Mensagem de 5 Dias para o Término das Férias</strong>
              </div>
              <button 
                type="button" 
                onClick={() => handleResetTemplate(ALERT_TYPES.FIVE_DAYS_BEFORE)} 
                style={styles.btnReset}
              >
                ↺ Restaurar Padrão
              </button>
            </div>
            <textarea 
              rows={5}
              value={localSettings.messageTemplates?.[ALERT_TYPES.FIVE_DAYS_BEFORE] || ''}
              onChange={(e) => handleTemplateChange(ALERT_TYPES.FIVE_DAYS_BEFORE, e.target.value)}
              style={styles.textarea}
            />
          </div>

          {/* GATILHO 3: 1 DIA PARA REINÍCIO */}
          <div style={styles.templateBox}>
            <div style={styles.templateHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ ...styles.pill, backgroundColor: '#fef2f2', color: '#dc2626' }}>Gatilho 3</span>
                <strong style={{ fontSize: '14px', color: 'var(--color-text-base)' }}>Mensagem de 1 Dia para Reinício das Atividades (Regresso Amanhã)</strong>
              </div>
              <button 
                type="button" 
                onClick={() => handleResetTemplate(ALERT_TYPES.ONE_DAY_BEFORE_RETURN)} 
                style={styles.btnReset}
              >
                ↺ Restaurar Padrão
              </button>
            </div>
            <textarea 
              rows={5}
              value={localSettings.messageTemplates?.[ALERT_TYPES.ONE_DAY_BEFORE_RETURN] || ''}
              onChange={(e) => handleTemplateChange(ALERT_TYPES.ONE_DAY_BEFORE_RETURN, e.target.value)}
              style={styles.textarea}
            />
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={handleSave} style={styles.btnSave} disabled={isSaving}>
            {isSaving ? 'A guardar...' : 'Guardar Configurações e Modelos'}
          </button>
        </div>
      </div>


      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        hideCancel={confirmModal.hideCancel}
      />
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' },
  card: { backgroundColor: 'var(--color-bg-elevated)', borderRadius: '8px', padding: '24px', border: '1px solid var(--color-border)' },
  title: { fontSize: '18px', fontWeight: '600', color: 'var(--color-text-base)', margin: '0 0 8px 0' },
  desc: { fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 24px 0', lineHeight: '1.5' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' },
  input: { padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-base)', fontSize: '14px' },
  hint: { fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' },
  actions: { marginTop: '30px', borderTop: '1px solid var(--color-border)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' },
  btnSave: { padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  templateBox: {
    backgroundColor: 'var(--color-bg-subtle)',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  templateHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  pill: { fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' },
  btnReset: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--color-primary)',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '4px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-elevated)',
    color: 'var(--color-text-base)',
    fontSize: '13px',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    boxSizing: 'border-box'
  }
};
