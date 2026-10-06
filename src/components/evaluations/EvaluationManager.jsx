import React, { useState } from 'react';
import EvaluationDashboard from './EvaluationDashboard';
import EvaluationForm from './EvaluationForm';
import EvaluationList from './EvaluationList';
import EvaluationHistory from './EvaluationHistory';
import EvaluationStats from './EvaluationStats';
import EvaluationReports from './EvaluationReports';
import EvaluationSettings from './EvaluationSettings';
import ErrorBoundary from '../common/ErrorBoundary';

export default function EvaluationManager({ user, orgData, employeesData }) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('sernic_evaluations_active_tab') || 'list';
  });

  React.useEffect(() => {
    if (activeTab) {
      localStorage.setItem('sernic_evaluations_active_tab', activeTab);
    }
  }, [activeTab]);

  const handleSubTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('sernic_evaluations_active_tab', tabId);
  };

  const perms = user?.permissions || user?.roleDetails?.permissions || {};
  const isSuperAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(user?.roleId || user?.role) || user?.username === 'admin' || perms.all === true;
  
  // Obter permissões do módulo de Gestão de Desempenho Individual (com suporte retroativo)
  const evalPerms = perms['Gestão de Desempenho Individual'] || perms['Gestao de Desempenho Individual'] || perms['Avaliação de Desempenho'] || perms['Avaliacao de Desempenho'] || (isSuperAdmin ? ['Visualizar', 'Criar', 'Editar', 'Eliminar', 'Validar', 'Exportar', 'Importar', 'Imprimir', 'Administrar'] : ['Visualizar']);
  const canCreate = isSuperAdmin || evalPerms.includes('Criar');
  const canAdmin = isSuperAdmin || evalPerms.includes('Administrar') || evalPerms.includes('Editar');

  const tabs = [
    {
      id: 'list',
      label: 'Avaliações Anuais',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      )
    },
    ...(canCreate ? [{
      id: 'new',
      label: 'Nova Avaliação',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )
    }] : []),
    {
      id: 'dashboard',
      label: 'Dashboard & Métricas',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      )
    },
    {
      id: 'history',
      label: 'Histórico',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    },
    {
      id: 'stats',
      label: 'Estatísticas',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: canAdmin ? 'Configurações' : 'Configurações 👁️',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Gestão de Desempenho Individual</h2>
          <p style={styles.desc}>Avaliação anual de desempenho, acompanhamento de metas funcionais e homologação de classificações de serviço.</p>
        </div>
      </div>

      <div style={styles.tabsContainer} className="tabs-container-standard">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            type="button"
            className={`module-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleSubTabChange(tab.id)} 
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.contentArea}>
        <ErrorBoundary>
          {activeTab === 'list' && <EvaluationList user={user} orgData={orgData} employeesData={employeesData} onGoToNew={() => handleSubTabChange('new')} />}
          {activeTab === 'new' && <EvaluationForm user={user} orgData={orgData} employeesData={employeesData} onSave={() => handleSubTabChange('list')} onCancel={() => handleSubTabChange('list')} />}
          {activeTab === 'dashboard' && <EvaluationDashboard user={user} orgData={orgData} employeesData={employeesData} />}
          {activeTab === 'history' && <EvaluationHistory user={user} orgData={orgData} employeesData={employeesData} />}
          {activeTab === 'stats' && <EvaluationStats user={user} orgData={orgData} employeesData={employeesData} />}
          {activeTab === 'reports' && <EvaluationReports user={user} orgData={orgData} employeesData={employeesData} />}
          {activeTab === 'settings' && <EvaluationSettings user={user} orgData={orgData} employeesData={employeesData} canAdmin={canAdmin} />}
        </ErrorBoundary>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '10px 24px 30px 24px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-in-out' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '24px', fontWeight: '800', color: 'var(--color-text-base)', margin: '0 0 4px 0' },
  desc: { color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 },
  tabsContainer: { display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', flexWrap: 'wrap' },
  contentArea: { width: '100%', minHeight: '500px' }
};
