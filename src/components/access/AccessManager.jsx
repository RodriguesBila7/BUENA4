import React, { useState, useEffect } from 'react';
import UserManager from './UserManager';
import RoleManager from './RoleManager';
import ModulePermissions from './ModulePermissions';
import SecurityPolicies from './SecurityPolicies';
import AuditViewer from './AuditViewer';
import AccountSessions from '../settings/accounts/AccountSessions';
import AccountRecovery from '../settings/accounts/AccountRecovery';
import DraggableTabs from '../common/DraggableTabs';

const styles = {
  container: { padding: '16px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)' },
  subtitle: { margin: '4px 0 0 0', fontSize: '14px', color: 'var(--color-text-muted)' },
  contentArea: { flex: 1, width: '100%', backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', boxSizing: 'border-box', overflowX: 'auto' }
};

export default function AccessManager({ currentView, onViewChange, t = (k) => k }) {
  const getInitialTab = () => {
    if (!currentView) return 'users';
    switch (currentView) {
      case 'users_roles': return 'roles';
      case 'users_permissions': return 'permissions';
      case 'users_policies': return 'policies';
      case 'users_audit': return 'audit';
      case 'users_manage':
      default: return 'users';
    }
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  useEffect(() => {
    if (currentView) {
      setActiveTab(getInitialTab());
    }
  }, [currentView]);

  const tabs = [
    { id: 'users', label: '👥 Utilizadores' },
    { id: 'roles', label: '🛡️ Perfis de Acesso' },
    { id: 'permissions', label: '📌 Permissões por Módulo' },
    { id: 'policies', label: '🔐 Políticas de Segurança' },
    { id: 'sessions', label: '🌐 Sessões Ativas' },
    { id: 'recovery', label: '🔑 Recuperação de Acessos' },
    { id: 'audit', label: '📜 Auditoria' }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (onViewChange) {
      const viewMap = {
        users: 'users_manage',
        roles: 'users_roles',
        permissions: 'users_permissions',
        policies: 'users_policies',
        sessions: 'users_manage',
        recovery: 'users_manage',
        audit: 'users_audit'
      };
      onViewChange(viewMap[tabId] || 'users_manage');
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Segurança, Utilizadores e Acessos</h2>
          <p style={styles.subtitle}>
            Central unificada de administração de utilizadores, NUIT, perfis institucionais, permissões matriciais e auditoria do SERNIC.
          </p>
        </div>
      </div>

      <DraggableTabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      <div style={styles.contentArea}>
        {activeTab === 'users' && <UserManager />}
        {activeTab === 'roles' && <RoleManager />}
        {activeTab === 'permissions' && <ModulePermissions />}
        {activeTab === 'policies' && <SecurityPolicies />}
        {activeTab === 'sessions' && <AccountSessions t={t} />}
        {activeTab === 'recovery' && <AccountRecovery t={t} />}
        {activeTab === 'audit' && <AuditViewer />}
      </div>
    </div>
  );
}
