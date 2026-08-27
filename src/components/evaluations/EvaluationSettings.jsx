import React, { useState, useEffect } from 'react';
import { DEFAULT_CRITERIA, getCriteria } from '../../utils/evaluationRules';
import ConfirmModal from '../ConfirmModal';

export default function EvaluationSettings({ user, canAdmin = true }) {
  const [criteria, setCriteria] = useState([]);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    setCriteria(getCriteria());
  }, []);

  const handleChange = (index, field, value) => {
    if (!canAdmin) return;
    const updated = [...criteria];
    updated[index][field] = parseFloat(value) || 0;
    setCriteria(updated);
  };

  const handleSave = () => {
    if (!canAdmin) {
      setAlertModal({ isOpen: true, message: 'O seu perfil não tem permissão para alterar as configurações do sistema.' });
      return;
    }

    // Basic validation: make sure intervals are logical
    for (const c of criteria) {
      if (c.min > c.max) {
        setAlertModal({ isOpen: true, message: `O valor mínimo para '${c.label}' não pode ser maior que o valor máximo.` });
        return;
      }
    }

    localStorage.setItem('sernic_evaluation_criteria', JSON.stringify(criteria));
    setAlertModal({ isOpen: true, message: 'Configurações de critérios gravadas com sucesso!' });
  };

  const handleReset = () => {
    if (!canAdmin) {
      setAlertModal({ isOpen: true, message: 'O seu perfil não tem permissão para alterar as configurações do sistema.' });
      return;
    }
    setCriteria(DEFAULT_CRITERIA);
    localStorage.removeItem('sernic_evaluation_criteria');
    setAlertModal({ isOpen: true, message: 'Critérios restaurados para os valores padrão.' });
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={styles.title}>Configurações de Critérios da Avaliação</h3>
          <p style={styles.description}>Parametrizar as faixas de pontuação associadas a cada classificação para o Decreto n.º 22/2018.</p>
        </div>
        {!canAdmin && (
          <span style={styles.readonlyBadge}>Modo de Consulta (Apenas Leitura)</span>
        )}
      </div>

      <div style={styles.card}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Classificação</th>
              <th>Pontuação Mínima</th>
              <th>Pontuação Máxima</th>
              <th>Cor de Destaque</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((c, index) => (
              <tr key={index} style={styles.tr}>
                <td>
                  <span style={{
                    padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                    backgroundColor: c.hexLight, color: c.hexDark, border: `1px solid ${c.hexBadge}`
                  }}>
                    {c.label}
                  </span>
                </td>
                <td>
                  <input 
                    type="number" 
                    value={c.min} 
                    min="0" 
                    max="20" 
                    step="0.1" 
                    disabled={!canAdmin}
                    onChange={(e) => handleChange(index, 'min', e.target.value)}
                    style={{...styles.input, ...(canAdmin ? {} : styles.disabledInput)}}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    value={c.max} 
                    min="0" 
                    max="20" 
                    step="0.1" 
                    disabled={!canAdmin}
                    onChange={(e) => handleChange(index, 'max', e.target.value)}
                    style={{...styles.input, ...(canAdmin ? {} : styles.disabledInput)}}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: c.hexBadge }}></div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{c.hexBadge}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {canAdmin && (
          <div style={styles.footer}>
            <button onClick={handleReset} style={styles.btnReset} type="button">Restaurar Padrões</button>
            <button onClick={handleSave} style={styles.btnSave} type="button">Gravar Configurações</button>
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={alertModal.isOpen} 
        title="Configurações"
        message={alertModal.message}
        onConfirm={() => setAlertModal({ isOpen: false, message: '' })}
        hideCancel={true}
        confirmText="OK"
      />
    </div>
  );
}

const styles = {
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' },
  title: { margin: 0, color: 'var(--color-primary)' },
  description: { margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '14px' },
  readonlyBadge: { backgroundColor: 'rgba(27, 54, 93, 0.1)', color: 'var(--color-primary)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' },
  th: { textAlign: 'left', padding: '14px 20px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '14px 20px', color: 'var(--color-text-base)' },
  input: { padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', outline: 'none', fontSize: '13px', width: '80px' },
  disabledInput: { opacity: 0.6, cursor: 'not-allowed', backgroundColor: 'var(--color-bg-card)' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' },
  btnSave: { padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' },
  btnReset: { padding: '10px 20px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', border: '1px solid var(--color-border)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }
};
