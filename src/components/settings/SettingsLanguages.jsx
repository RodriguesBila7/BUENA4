import React, { useState } from 'react';
import ConfirmModal from '../ConfirmModal';

const styles = {
  container: { padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', height: '100%', overflowY: 'auto' },
  header: { marginBottom: '20px' },
  title: { margin: 0, fontSize: '24px', color: 'var(--color-primary)' },
  desc: { color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '5px' },
  formCard: { backgroundColor: 'var(--color-bg-element)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '20px' },
  formGroup: { marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  select: { padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px' },
  btnRow: { display: 'flex', gap: '10px', marginTop: '20px' },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};

export default function SettingsLanguages({ t, language, setLanguage }) {
  const [localLang, setLocalLang] = useState(language || 'pt');
  const [region, setRegion] = useState('mz');
  const [timezone, setTimezone] = useState('Africa/Maputo');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });
  const showModal = (title, message) => setModalConfig({ isOpen: true, title, message });
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  const handleSave = () => {
    if (setLanguage && localLang !== language) {
      setLanguage(localLang);
    }
    showModal('Sucesso', 'Configurações de Idioma e Região guardadas com sucesso!');
  };

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Idiomas e Região</h2>
        <p style={styles.desc}>Configure o idioma do sistema, fuso horário e formatos de data.</p>
      </div>

      <div style={styles.formCard}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Idioma do Sistema</label>
            <select style={styles.select} value={localLang} onChange={e => setLocalLang(e.target.value)}>
              <option value="pt">Português (PT)</option>
              <option value="en">English (EN)</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Região Padrão</label>
            <select style={styles.select} value={region} onChange={e => setRegion(e.target.value)}>
              <option value="mz">Moçambique</option>
              <option value="pt">Portugal</option>
              <option value="br">Brasil</option>
              <option value="us">Estados Unidos</option>
              <option value="uk">Reino Unido</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Fuso Horário</label>
            <select style={styles.select} value={timezone} onChange={e => setTimezone(e.target.value)}>
              <option value="Africa/Maputo">Africa/Maputo (GMT+2)</option>
              <option value="Europe/Lisbon">Europe/Lisbon (GMT+0)</option>
              <option value="America/Sao_Paulo">America/Sao_Paulo (GMT-3)</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Formato de Data</label>
            <select style={styles.select} value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
              <option value="DD/MM/YYYY">DD/MM/YYYY (Ex: 28/06/2026)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (Ex: 06/28/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (Ex: 2026-06-28)</option>
            </select>
          </div>
        </div>

        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handleSave}>Guardar Idioma e Região</button>
        </div>
      </div>

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
