import React from 'react';
import UserManager from './UserManager';
import RoleManager from './RoleManager';
import SecurityPolicies from './SecurityPolicies';
import AuditViewer from './AuditViewer';
import ModulePermissions from './ModulePermissions';
import PermissionGuard from '../PermissionGuard';

const styles = {
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '24px', color: 'var(--color-primary)' },
  tabsContainer: { display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '20px' },
  tab: (active) => ({
    padding: '10px 15px',
    cursor: 'pointer',
    borderBottom: active ? '3px solid var(--color-primary)' : '3px solid transparent',
    color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
    fontWeight: active ? 'bold' : 'normal',
    transition: 'all 0.2s',
    userSelect: 'none'
  })
};

export default function AccessManager({ currentView, onViewChange }) {
  const mapTab = (id) => {
    switch(id) {
      case 'users_roles': return 'roles';
      case 'users_permissions': return 'permissions';
      case 'users_policies': return 'policies';
      case 'users_audit': return 'audit';
      case 'users_manage':
      default: return 'users';
    }
  };
  const activeTab = mapTab(currentView);

  const handleTab = (tab) => {
    let id = 'users_manage'; // default
    if(tab === 'users') id = 'users_manage';
    if(tab === 'roles') id = 'users_roles';
    if(tab === 'permissions') id = 'users_permissions';
    if(tab === 'policies') id = 'users_policies';
    if(tab === 'audit') id = 'users_audit';
    onViewChange(id);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Segurança e Acessos</h2>
      </div>

      <div style={styles.tabsContainer}>
        <div style={styles.tab(activeTab === 'users')} onClick={() => handleTab('users')}>
          Utilizadores
        </div>
        <div style={styles.tab(activeTab === 'roles')} onClick={() => handleTab('roles')}>
          Perfis de Acesso
        </div>
        <div style={styles.tab(activeTab === 'permissions')} onClick={() => handleTab('permissions')}>
          Permissões por Módulo
        </div>
        <div style={styles.tab(activeTab === 'policies')} onClick={() => handleTab('policies')}>
          Políticas
        </div>
        <div style={styles.tab(activeTab === 'audit')} onClick={() => handleTab('audit')}>
          Auditoria
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'users' && <UserManager />}
        {activeTab === 'roles' && <RoleManager />}
        {activeTab === 'permissions' && <ModulePermissions />}
        {activeTab === 'policies' && <SecurityPolicies />}
        {activeTab === 'audit' && <AuditViewer />}
      </div>
    </div>
  );
}
