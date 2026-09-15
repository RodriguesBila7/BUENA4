import React, { useState } from 'react';
import EffectivenessForm from './EffectivenessForm';
import EffectivenessQuery from './EffectivenessQuery';
import EffectivenessReports from './EffectivenessReports';
import EffectivenessStats from './EffectivenessStats';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import { isPrimaryCentralAdmin, isCentralUser } from '../../utils/scopeUtils';
import { printAllAbsencesNationalMap } from './printAllEffectiveness';

export default function EffectivenessManager({ user, orgData, employeesData }) {
  const [activeTab, setActiveTab] = useState('query');
  const { records = [] } = useEffectivenessData();
  const { employees = [] } = useEmployeeData();
  const { data: hookOrgData } = useOrgData();

  const finalOrgData = orgData?.data || orgData || hookOrgData || {};
  const finalEmployees = employeesData?.employees || (Array.isArray(employeesData) ? employeesData : null) || employees || [];

  const isPrincipal = isPrimaryCentralAdmin(user) || isCentralUser(user);

  const handlePrintAll = () => {
    printAllAbsencesNationalMap({
      records,
      employees: finalEmployees,
      orgData: finalOrgData,
      user
    });
  };

  const tabs = [
    { id: 'query', label: '📋 Funcionários Faltosos' },
    { id: 'register', label: '✍️ Registar Faltas' },
    { id: 'reports', label: '🖨️ Relatórios & Impressão por Província' },
    { id: 'stats', label: '📊 Estatísticas de Faltas' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Módulo de Efetividade (Gestão de Faltas)</h2>
        </div>
        {isPrincipal && (
          <button 
            onClick={handlePrintAll}
            style={styles.btnPrintAll}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
          >
            🖨️ Imprimir Todas as Faltas (Todas as Direcções)
          </button>
        )}
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
        {activeTab === 'query' && (
          <EffectivenessQuery 
            user={user}
            orgData={orgData}
            employeesData={employeesData}
            onGoToRegister={() => setActiveTab('register')} 
          />
        )}
        {activeTab === 'register' && (
          <EffectivenessForm 
            user={user}
            orgData={orgData}
            employeesData={employeesData}
            onRegistrationComplete={() => setActiveTab('query')} 
          />
        )}
        {activeTab === 'reports' && (
          <EffectivenessReports 
            user={user}
            orgData={orgData}
            employeesData={employeesData}
          />
        )}
        {activeTab === 'stats' && (
          <EffectivenessStats 
            user={user}
            orgData={orgData}
            employeesData={employeesData}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '10px 24px 30px 24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '24px', fontWeight: '800', color: 'var(--color-text-base)', margin: '0 0 4px 0' },
  desc: { color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 },
  tabsContainer: { display: 'flex', gap: '10px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', flexWrap: 'wrap' },
  tab: { 
    padding: '9px 18px', 
    background: 'transparent', 
    border: '1px solid transparent', 
    borderRadius: '8px',
    color: 'var(--color-text-muted)', 
    fontSize: '13.5px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    transition: 'all 0.2s', 
    outline: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  activeTab: {
    padding: '9px 18px', 
    backgroundColor: 'var(--color-primary, #DC2626)', 
    border: '1px solid var(--color-primary, #DC2626)', 
    borderRadius: '8px',
    color: '#FFFFFF', 
    fontSize: '13.5px', 
    fontWeight: '700', 
    cursor: 'pointer', 
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
    transition: 'all 0.2s', 
    outline: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  contentArea: { marginTop: '14px' },
  btnPrintAll: {
    padding: '9px 18px',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  }
};
