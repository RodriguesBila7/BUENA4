import React, { useState } from 'react';
import DisciplinaryDashboard from './DisciplinaryDashboard';
import DisciplinaryList from './DisciplinaryList';

export default function DisciplinaryManager({ orgData, employeesData, user, onNavigateTab }) {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Processos Disciplinares</h2>
          <p style={styles.desc}>Gestão, tramitação de despachos e execução de sanções disciplinares.</p>
        </div>
      </div>

      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveTab('list')} 
          style={activeTab === 'list' ? styles.activeTab : styles.tab}
        >
          📋 Listagem & Despachos
        </button>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={activeTab === 'dashboard' ? styles.activeTab : styles.tab}
        >
          📊 Dashboard & Estatísticas
        </button>
      </div>

      <div style={styles.contentArea}>
        {activeTab === 'list' && (
          <DisciplinaryList 
            orgData={orgData} 
            employeesData={employeesData} 
            user={user} 
            onNavigateTab={onNavigateTab} 
          />
        )}
        {activeTab === 'dashboard' && (
          <DisciplinaryDashboard 
            orgData={orgData} 
            employeesData={employeesData} 
            user={user} 
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '30px', animation: 'fadeIn 0.4s ease-out' },
  header: { marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' },
  desc: { color: 'var(--color-text-muted)', fontSize: '15px' },
  tabsContainer: { display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' },
  tab: { padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid transparent', transition: 'all 0.2s' },
  activeTab: { padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid var(--color-primary)', transition: 'all 0.2s' },
  contentArea: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', minHeight: '500px' },
};
