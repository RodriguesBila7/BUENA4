import React, { useState } from 'react';
import AccountDashboard from './AccountDashboard';
import AccountList from './AccountList';
import AccountSecurity from './AccountSecurity';
import AccountSessions from './AccountSessions';
import AccountRecovery from './AccountRecovery';
import AccountHistory from './AccountHistory';
import AccountPolicies from './AccountPolicies';
import DraggableTabs from '../../common/DraggableTabs';

const styles = {
  container: { padding: '30px', animation: 'fadeIn 0.4s ease-out' },
  header: { marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' },
  description: { color: 'var(--color-text-muted)', fontSize: '15px' },
  contentArea: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', minHeight: '500px' }
};

export default function AccountManager({ t }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: t('acc_tab_dashboard') || 'Dashboard' },
    { id: 'list', label: t('acc_tab_list') || 'Contas' },
    { id: 'security', label: t('acc_tab_security') || 'Segurança' },
    { id: 'sessions', label: t('acc_tab_sessions') || 'Sessões' },
    { id: 'recovery', label: t('acc_tab_recovery') || 'Recuperação' },
    { id: 'history', label: t('acc_tab_history') || 'Histórico' },
    { id: 'policies', label: t('acc_tab_policies') || 'Políticas' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{t('acc_title') || 'Gestão de Contas'}</h2>
          <p style={styles.description}>{t('acc_desc') || 'Central de administração do ciclo de vida das contas do sistema.'}</p>
        </div>
      </div>

      <DraggableTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div style={styles.contentArea}>
        {activeTab === 'dashboard' && <AccountDashboard t={t} />}
        {activeTab === 'list' && <AccountList t={t} />}
        {activeTab === 'security' && <AccountSecurity t={t} />}
        {activeTab === 'sessions' && <AccountSessions t={t} />}
        {activeTab === 'recovery' && <AccountRecovery t={t} />}
        {activeTab === 'history' && <AccountHistory t={t} />}
        {activeTab === 'policies' && <AccountPolicies t={t} />}
      </div>
    </div>
  );
}
