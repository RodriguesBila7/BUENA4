import React, { useState } from 'react';
import ConfirmModal from '../ConfirmModal';

const styles = {
  container: { padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', height: '100%', overflowY: 'auto' },
  header: { marginBottom: '20px' },
  title: { margin: 0, fontSize: '24px', color: 'var(--color-primary)' },
  desc: { color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '5px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'var(--color-bg-element)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)' },
  cardTitle: { margin: '0 0 15px 0', fontSize: '16px', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)', fontSize: '14px' },
  infoLabel: { color: 'var(--color-text-muted)' },
  infoValue: { fontWeight: 'bold', color: 'var(--color-text-main)' },
  btnRow: { display: 'flex', gap: '10px', marginTop: '15px' },
  btnAction: { backgroundColor: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }
};

export default function SettingsSystem({ t }) {
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });
  const showModal = (title, message) => setModalConfig({ isOpen: true, title, message });
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  const handleAction = (action) => {
    showModal('Sucesso', `Ação "${action}" executada com sucesso!`);
  };

  return (
    <div className="animate-fade-in" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Sistema</h2>
        <p style={styles.desc}>Informações e manutenção do sistema e base de dados.</p>
      </div>

      <div style={styles.grid}>
        {/* Informações do Sistema */}
        <div style={styles.card}>
          <h4 style={styles.cardTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            Informações da Aplicação
          </h4>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Versão do Sistema</span>
            <span style={styles.infoValue}>v05.01.00 (Build 2026)</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Última Atualização</span>
            <span style={styles.infoValue}>28/06/2026</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Ambiente</span>
            <span style={styles.infoValue}>Produção</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Licença</span>
            <span style={{ ...styles.infoValue, color: '#28a745' }}>Ativa</span>
          </div>
          <div style={styles.btnRow}>
            <button style={styles.btnAction} onClick={() => handleAction('Verificar Atualizações')}>Verificar Atualizações</button>
          </div>
        </div>

        {/* Base de Dados */}
        <div style={styles.card}>
          <h4 style={styles.cardTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>
            Base de Dados
          </h4>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Tamanho Estimado</span>
            <span style={styles.infoValue}>452 MB</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Último Backup</span>
            <span style={styles.infoValue}>Hoje, 02:00 AM</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Estado da Conexão</span>
            <span style={{ ...styles.infoValue, color: '#28a745' }}>Online (4ms)</span>
          </div>
          <div style={styles.btnRow}>
            <button style={styles.btnAction} onClick={() => handleAction('Fazer Backup Agora')}>Fazer Backup Agora</button>
            <button style={{ ...styles.btnAction, borderColor: 'var(--color-border)', color: 'var(--color-text-main)' }} onClick={() => handleAction('Otimizar Tabelas')}>Otimizar BD</button>
          </div>
        </div>

        {/* Manutenção e Cache */}
        <div style={styles.card}>
          <h4 style={styles.cardTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 9.76l-4.15 4.15a2.5 2.5 0 1 1-3.54-3.54l4.15-4.15A6 6 0 0 1 14.7 6.3z"></path></svg>
            Manutenção e Cache
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Limpar os dados em cache pode resolver problemas de exibição, mas exigirá o recarregamento de recursos no próximo acesso.
          </p>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Cache Local Utilizado</span>
            <span style={styles.infoValue}>24.5 MB</span>
          </div>
          <div style={styles.btnRow}>
            <button style={{ ...styles.btnAction, borderColor: '#dc3545', color: '#dc3545' }} onClick={() => handleAction('Limpar Cache do Sistema')}>Limpar Cache</button>
            <button style={styles.btnAction} onClick={() => handleAction('Recarregar Aplicação')}>Recarregar</button>
          </div>
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
