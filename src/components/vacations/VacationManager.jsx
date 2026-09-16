import React, { useState } from 'react';
import VacationManagement from './VacationManagement';
import VacationDashboard from './VacationDashboard';
import VacationPlan from './VacationPlan';
import VacationRequests from './VacationRequests';
import VacationHistory from './VacationHistory';
import VacationSettings from './VacationSettings';
import DraggableTabs from '../common/DraggableTabs';

export default function VacationManager() {
  const [activeTab, setActiveTab] = useState('management');

  const tabs = [
    { id: 'management', label: 'Gestão de Férias' },
    { id: 'dashboard', label: 'Dashboard Geral' },
    { id: 'plan', label: 'Plano Anual' },
    { id: 'requests', label: 'Solicitações / Aprovações' },
    { id: 'history', label: 'Histórico de Férias e Licenças' },
    { id: 'settings', label: 'Configurações' }
  ];

  return (
    <div style={styles.container}>
      <DraggableTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div style={styles.contentArea}>
        {activeTab === 'management' && <VacationManagement />}
        {activeTab === 'dashboard' && <VacationDashboard />}
        {activeTab === 'plan' && <VacationPlan />}
        {activeTab === 'requests' && <VacationRequests />}
        {activeTab === 'history' && <VacationHistory />}
        {activeTab === 'settings' && <VacationSettings />}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '24px', fontWeight: '800', color: 'var(--color-text-base)', margin: '0 0 4px 0' },
  desc: { color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 },
  tabsContainer: { display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '2px', flexWrap: 'wrap' },
  tab: { padding: '10px 18px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid transparent', transition: 'all 0.2s', outline: 'none' },
  activeTab: { padding: '10px 18px', background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: '700', cursor: 'pointer', borderBottom: '3px solid var(--color-primary)', transition: 'all 0.2s', outline: 'none' },
  contentArea: { marginTop: '10px', width: '100%' }
};
