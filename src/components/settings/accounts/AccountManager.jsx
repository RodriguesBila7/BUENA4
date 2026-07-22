import React, { useState } from 'react';
import AccountDashboard from './AccountDashboard';
import AccountList from './AccountList';
import AccountSecurity from './AccountSecurity';
import AccountSessions from './AccountSessions';
import AccountRecovery from './AccountRecovery';
import AccountHistory from './AccountHistory';
import AccountPolicies from './AccountPolicies';

const styles = {
  container: { padding: '30px', animation: 'fadeIn 0.4s ease-out' },
  header: { marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' },
  description: { color: 'var(--color-text-muted)', fontSize: '15px' },
  tabsContainer: { display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' },
  tab: (active) => ({
    padding: '12px 20px', background: 'transparent', border: 'none', 
    color: active ? 'var(--color-primary)' : 'var(--color-text-muted)', 
    fontSize: '14px', fontWeight: '600', cursor: 'pointer', 
    borderBottom: active ? '3px solid var(--color-primary)' : '3px solid transparent', 
    transition: 'all 0.2s', whiteSpace: 'nowrap', userSelect: 'none'
  }),
  contentArea: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', minHeight: '500px' }
};

export default function AccountManager({ t }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{t('acc_title') || 'Gestão de Contas'}</h2>
        <p style={styles.description}>{t('acc_desc') || 'Central de administração do ciclo de vida das contas do sistema.'}</p>
      </div>

      <div style={styles.tabsContainer}>
        <div style={styles.tab(activeTab === 'dashboard')} onClick={() => setActiveTab('dashboard')}>
          {t('acc_tab_dashboard') || 'Dashboard'}
        </div>
        <div style={styles.tab(activeTab === 'list')} onClick={() => setActiveTab('list')}>
          {t('acc_tab_list') || 'Contas'}
        </div>
        <div style={styles.tab(activeTab === 'security')} onClick={() => setActiveTab('security')}>
          {t('acc_tab_security') || 'Segurança'}
        </div>
        <div style={styles.tab(activeTab === 'sessions')} onClick={() => setActiveTab('sessions')}>
          {t('acc_tab_sessions') || 'Sessões'}
        </div>
        <div style={styles.tab(activeTab === 'recovery')} onClick={() => setActiveTab('recovery')}>
          {t('acc_tab_recovery') || 'Recuperação'}
        </div>
        <div style={styles.tab(activeTab === 'history')} onClick={() => setActiveTab('history')}>
          {t('acc_tab_history') || 'Histórico'}
        </div>
        <div style={styles.tab(activeTab === 'policies')} onClick={() => setActiveTab('policies')}>
          {t('acc_tab_policies') || 'Políticas'}
        </div>
      </div>

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
