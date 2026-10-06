import React, { useState, useEffect } from 'react';
import useVacationData from '../../hooks/useVacationData';
import ConfirmModal from '../ConfirmModal';

export default function VacationSettings() {
  const { settings, updateSettings } = useVacationData();
  
  const [localSettings, setLocalSettings] = useState({
    annualDays: 30,
    minMonthsForEligibility: 12,
    allowAccumulation: true,
    maxAccumulatedDays: 60,
    holidayOffset: true
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings(localSettings);
    setIsSaving(false);
    
    setConfirmModal({
      isOpen: true,
      title: 'Configurações Guardadas',
      message: 'As regras globais de gestão de férias foram atualizadas com sucesso.',
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

        <div style={styles.actions}>
          <button onClick={handleSave} style={styles.btnSave} disabled={isSaving}>
            {isSaving ? 'A guardar...' : 'Guardar Configurações'}
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
  btnSave: { padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }
};
