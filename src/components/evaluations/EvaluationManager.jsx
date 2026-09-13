import React, { useState } from 'react';
import EvaluationDashboard from './EvaluationDashboard';
import EvaluationForm from './EvaluationForm';
import EvaluationList from './EvaluationList';
import EvaluationHistory from './EvaluationHistory';
import EvaluationStats from './EvaluationStats';
import EvaluationReports from './EvaluationReports';
import EvaluationSettings from './EvaluationSettings';
import ErrorBoundary from '../common/ErrorBoundary';

export default function EvaluationManager({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const perms = user?.permissions || user?.roleDetails?.permissions || {};
  const isSuperAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(user?.roleId || user?.role) || user?.username === 'admin' || perms.all === true;
  
  // Obter permissões do módulo de Gestão de Desempenho Individual (com suporte retroativo)
  const evalPerms = perms['Gestão de Desempenho Individual'] || perms['Gestao de Desempenho Individual'] || perms['Avaliação de Desempenho'] || perms['Avaliacao de Desempenho'] || (isSuperAdmin ? ['Visualizar', 'Criar', 'Editar', 'Eliminar', 'Validar', 'Exportar', 'Importar', 'Imprimir', 'Administrar'] : ['Visualizar']);
  const canCreate = isSuperAdmin || evalPerms.includes('Criar');
  const canAdmin = isSuperAdmin || evalPerms.includes('Administrar') || evalPerms.includes('Editar');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Gestão de Desempenho Individual (GDI)</h2>
          <p style={styles.subtitle}>Ciclo Anual de Desempenho: Objectivos Individuais (ODI), Resultados Esperados, Prazos de Efectivação e Avaliação Final (Decreto n.º 22/2018 / EGFAE)</p>
        </div>
      </div>

      <div style={styles.tabs}>
        <button 
          className={`evaluation-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          type="button"
        >
          Painel GDI
        </button>
        {canCreate && (
          <button 
            className={`evaluation-tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
            type="button"
          >
            Novo Registo / Plano GDI
          </button>
        )}
        <button 
          className={`evaluation-tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
          type="button"
        >
          Fichas Individuais (GDI)
        </button>
        <button 
          className={`evaluation-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          type="button"
        >
          Histórico do Ciclo
        </button>
        <button 
          className={`evaluation-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
          type="button"
        >
          Estatísticas & Metas
        </button>
        <button 
          className={`evaluation-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
          type="button"
        >
          Relatórios & Fichas
        </button>
        <button 
          className={`evaluation-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          type="button"
        >
          Critérios e Escala {canAdmin ? '' : '👁️'}
        </button>
      </div>

      <div style={styles.content}>
        <ErrorBoundary>
          {activeTab === 'dashboard' && <EvaluationDashboard user={user} />}
          {activeTab === 'new' && <EvaluationForm user={user} onSave={() => setActiveTab('list')} />}
          {activeTab === 'list' && <EvaluationList user={user} />}
          {activeTab === 'history' && <EvaluationHistory user={user} />}
          {activeTab === 'stats' && <EvaluationStats user={user} />}
          {activeTab === 'reports' && <EvaluationReports user={user} />}
          {activeTab === 'settings' && <EvaluationSettings user={user} canAdmin={canAdmin} />}
        </ErrorBoundary>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { margin: 0, fontSize: '24px', color: 'var(--color-primary)' },
  subtitle: { margin: '5px 0 0 0', color: 'var(--color-text-muted)', fontSize: '14px' },
  tabs: { display: 'flex', gap: '10px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', overflowX: 'auto' },
  content: { flex: 1, backgroundColor: 'var(--color-bg-base)', borderRadius: '12px', minHeight: '400px' }
};
