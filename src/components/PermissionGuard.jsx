import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function PermissionGuard({ module, action, children, fallback = null }) {
  const { user } = useAuth();

  if (!user) return fallback;

  // Super Admin nativo ou perfis administrativos principais com acesso total
  const isSuperAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(user.roleId || user.role) || user.username === 'admin';
  if (isSuperAdmin) return children;

  const perms = user.permissions || user.roleDetails?.permissions || {};
  
  // Se possuir permissão total explícita
  if (perms.all === true) {
    return children;
  }

  // Se for utilizador apenas de consulta e a ação for visualizar
  if (perms.view_only === true && action === 'Visualizar') {
    return children;
  }

  // Verifica as permissões estruturadas legadas {"Modulo": ["Visualizar", "Criar"]}
  const modulePerms = perms[module] || [];
  if (modulePerms.includes(action)) {
    return children;
  }

  return fallback;
}
