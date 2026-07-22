import React, { useState } from 'react';
import SecurityDashboard from './SecurityDashboard';
import UserManager from './UserManager';
import RoleManager from './RoleManager';
import SecurityPolicies from './SecurityPolicies';
import AuditViewer from './AuditViewer';
import ModulePermissions from './ModulePermissions';
import PermissionGuard from '../PermissionGuard';
import DraggableTabs from '../common/DraggableTabs';

const styles = {
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '24px', color: 'var(--color-primary)' }
};

export default function AccessManager({ currentView, onViewChange }) {
  const mapTab = (id) => {
    switch(id) {
      case 'users_dashboard': return 'dashboard';
      case 'users_manage': return 'users';
      case 'users_roles': return 'roles';
      case 'users_permissions': return 'permissions';
      case 'users_policies': return 'policies';
      case 'users_audit': return 'audit';
      default: return 'dashboard';
    }
  };
  const activeTab = mapTab(currentView);

  const handleTab = (tab) => {
    let id = 'users_dashboard'; // default
    if (tab === 'dashboard') id = 'users_dashboard';
    if (tab === 'users') id = 'users_manage';
    if (tab === 'roles') id = 'users_roles';
    if (tab === 'permissions') id = 'users_permissions';
    if (tab === 'policies') id = 'users_policies';
    if (tab === 'audit') id = 'users_audit';
    onViewChange(id);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Segurança e Acessos</h2>
      </div>

      <DraggableTabs
        tabs={[
          { id: 'dashboard', label: 'Dashboard de Segurança' },
          { id: 'users', label: 'Utilizadores' },
          { id: 'roles', label: 'Perfis de Acesso' },
          { id: 'permissions', label: 'Permissões por Módulo' },
          { id: 'policies', label: 'Políticas' },
          { id: 'audit', label: 'Auditoria' }
        ]}
        activeTab={activeTab}
        onTabChange={handleTab}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'dashboard' && <SecurityDashboard onNavigate={handleTab} />}
        {activeTab === 'users' && <UserManager />}
        {activeTab === 'roles' && <RoleManager />}
        {activeTab === 'permissions' && <ModulePermissions />}
        {activeTab === 'policies' && <SecurityPolicies />}
        {activeTab === 'audit' && <AuditViewer />}
      </div>
    </div>
  );
}
