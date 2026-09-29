import React, { useState } from 'react';
import VacationDashboard from './VacationDashboard';
import VacationPlan from './VacationPlan';
import VacationRequests from './VacationRequests';
import VacationManagement from './VacationManagement';
import VacationHistory from './VacationHistory';
import VacationSettings from './VacationSettings';
import VacationAlerts from './VacationAlerts';
import DraggableTabs from '../common/DraggableTabs';

export default function VacationManager() {
  const [activeTab, setActiveTab] = useState('management');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard Geral' },
    { id: 'management', label: 'Gestão de Férias' },
    { id: 'alerts', label: '📢 Alertas & Mensagens' },
    { id: 'requests', label: 'Solicitações / Aprovações' },
    { id: 'plan', label: 'Plano Anual' },
    { id: 'history', label: 'Histórico de Férias e Licenças' },
    { id: 'settings', label: 'Configurações' }
  ];

  return (
    <div style={styles.container}>
      <DraggableTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div style={styles.contentArea}>
        {activeTab === 'dashboard' && <VacationDashboard />}
        {activeTab === 'management' && <VacationManagement />}
        {activeTab === 'alerts' && <VacationAlerts onGoToSettings={() => setActiveTab('settings')} />}
        {activeTab === 'requests' && <VacationRequests />}
        {activeTab === 'plan' && <VacationPlan />}
        {activeTab === 'history' && <VacationHistory />}
        {activeTab === 'settings' && <VacationSettings />}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' },
  contentArea: { marginTop: '10px', width: '100%' }
};
