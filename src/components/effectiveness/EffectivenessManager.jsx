import React, { useState } from 'react';
import EffectivenessForm from './EffectivenessForm';
import EffectivenessQuery from './EffectivenessQuery';
import EffectivenessReports from './EffectivenessReports';
import EffectivenessStats from './EffectivenessStats';

export default function EffectivenessManager() {
  const [activeTab, setActiveTab] = useState('query');

  const tabs = [
    { id: 'query', label: 'Funcionários Faltosos' },
    { id: 'register', label: 'Registar Faltas' },
    { id: 'stats', label: 'Estatísticas de Faltas' },
    { id: 'reports', label: 'Relatórios de Assiduidade' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Módulo de Efetividade (Gestão de Faltas)</h2>
          <p style={styles.desc}>Controlo, registo e relatórios de faltas justificadas e injustificadas da Função Pública.</p>
        </div>
      </div>

      {/* Navegação interna do módulo */}
      <div style={styles.tabsContainer}>
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            style={activeTab === tab.id ? styles.activeTab : styles.tab}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.contentArea}>
        {activeTab === 'query' && <EffectivenessQuery onGoToRegister={() => setActiveTab('register')} />}
        {activeTab === 'register' && <EffectivenessForm onRegistrationComplete={() => setActiveTab('query')} />}
        {activeTab === 'reports' && <EffectivenessReports />}
        {activeTab === 'stats' && <EffectivenessStats />}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '10px 24px 30px 24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '24px', fontWeight: '800', color: 'var(--color-text-base)', margin: '0 0 4px 0' },
  desc: { color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 },
  tabsContainer: { display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '2px', flexWrap: 'wrap' },
  tab: { padding: '10px 18px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid transparent', transition: 'all 0.2s', outline: 'none' },
  activeTab: { padding: '10px 18px', background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: '700', cursor: 'pointer', borderBottom: '3px solid var(--color-primary)', transition: 'all 0.2s', outline: 'none' },
  contentArea: { marginTop: '10px' }
};
