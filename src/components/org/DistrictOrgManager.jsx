import React, { useState } from 'react';
import DistrictDashboard from './DistrictDashboard';
import DistrictOrgList from './DistrictOrgList';
import DistrictQueries from './DistrictQueries';
import DistrictOrganogram from './DistrictOrganogram';

export default function DistrictOrgManager({ data, t }) {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');

  return (
    <div style={styles.container}>
      {/* Sub Tabs */}
      <div style={styles.subTabsContainer}>
        <button 
          onClick={() => setActiveSubTab('dashboard')} 
          style={activeSubTab === 'dashboard' ? styles.activeSubTab : styles.subTab}
        >
          📊 Dashboard Distrital
        </button>
        <button 
          onClick={() => setActiveSubTab('list')} 
          style={activeSubTab === 'list' ? styles.activeSubTab : styles.subTab}
        >
          📍 Direções Distritais & Secções
        </button>
        <button 
          onClick={() => setActiveSubTab('queries')} 
          style={activeSubTab === 'queries' ? styles.activeSubTab : styles.subTab}
        >
          🔍 Consultas & Pesquisa
        </button>
        <button 
          onClick={() => setActiveSubTab('organogram')} 
          style={activeSubTab === 'organogram' ? styles.activeSubTab : styles.subTab}
        >
          🌳 Organograma Interativo
        </button>
      </div>

      {/* Content Area */}
      <div style={styles.subContentArea}>
        {activeSubTab === 'dashboard' && <DistrictDashboard data={data} t={t} />}
        {activeSubTab === 'list' && <DistrictOrgList data={data} t={t} />}
        {activeSubTab === 'queries' && <DistrictQueries data={data} t={t} />}
        {activeSubTab === 'organogram' && <DistrictOrganogram data={data} t={t} />}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  subTabsContainer: {
    display: 'flex',
    gap: '10px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px',
    flexWrap: 'wrap'
  },
  subTab: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    color: 'var(--color-text-muted)',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      color: 'var(--color-text-base)',
      backgroundColor: 'rgba(0,0,0,0.02)'
    }
  },
  activeSubTab: {
    padding: '8px 16px',
    backgroundColor: 'var(--color-primary-light, rgba(59, 130, 246, 0.1))',
    border: '1px solid var(--color-primary)',
    color: 'var(--color-primary)',
    fontSize: '13px',
    fontWeight: '700',
    borderRadius: '6px',
    cursor: 'default'
  },
  subContentArea: {
    marginTop: '10px'
  }
};
