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
      <div style={styles.subTabsContainer} className="tabs-container-standard">
        <button 
          type="button"
          onClick={() => setActiveSubTab('dashboard')} 
          className={`module-tab ${activeSubTab === 'dashboard' ? 'active' : ''}`}
        >
          📊 Dashboard Distrital
        </button>
        <button 
          type="button"
          onClick={() => setActiveSubTab('list')} 
          className={`module-tab ${activeSubTab === 'list' ? 'active' : ''}`}
        >
          📍 Direções Distritais & Secções
        </button>
        <button 
          type="button"
          onClick={() => setActiveSubTab('queries')} 
          className={`module-tab ${activeSubTab === 'queries' ? 'active' : ''}`}
        >
          🔍 Consultas & Pesquisa
        </button>
        <button 
          type="button"
          onClick={() => setActiveSubTab('organogram')} 
          className={`module-tab ${activeSubTab === 'organogram' ? 'active' : ''}`}
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
