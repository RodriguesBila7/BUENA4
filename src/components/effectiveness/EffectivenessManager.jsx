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
import ConfirmModal from '../ConfirmModal';

export default function EffectivenessManager({ user, orgData, employeesData }) {
  const [activeTab, setActiveTab] = useState('query');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '' });
  const { records = [] } = useEffectivenessData();
  const { employees = [] } = useEmployeeData();
  const { data: hookOrgData } = useOrgData();

  const finalOrgData = orgData?.data || orgData || hookOrgData || {};
  const finalEmployees = employeesData?.employees || (Array.isArray(employeesData) ? employeesData : null) || employees || [];

  const isPrincipal = isPrimaryCentralAdmin(user) || isCentralUser(user);

  const handlePrintAll = () => {
    if (!records || records.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Não existem registos de faltas no sistema para imprimir.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }
    printAllAbsencesNationalMap({
      records,
      employees: finalEmployees,
      orgData: finalOrgData,
      user
    });
  };

  const tabs = [
    { 
      id: 'query', 
      label: 'Funcionários Faltosos',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    { 
      id: 'register', 
      label: 'Registar Faltas',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )
    },
    { 
      id: 'reports', 
      label: 'Relatórios & Impressão por Província',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      )
    },
    { 
      id: 'stats', 
      label: 'Estatísticas de Faltas',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    }
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
            title="Imprimir Mapa Consolidado Nacional com todas as direcções"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Imprimir Todas as Faltas (Todas as Direcções)</span>
          </button>
        )}
      </div>

      {/* Navegação interna do módulo */}
      <div style={styles.tabsContainer} className="tabs-container-standard">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            type="button"
            className={`module-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)} 
          >
            {tab.icon}
            <span>{tab.label}</span>
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        hideCancel={confirmModal.hideCancel}
        confirmText={confirmModal.confirmText || 'OK'}
        isDestructive={confirmModal.isDestructive}
      />
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
