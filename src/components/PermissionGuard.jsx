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

  const defaultFallback = (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      backgroundColor: 'var(--color-bg-card)',
      borderRadius: '12px',
      border: '1px solid var(--color-border)',
      margin: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
      <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-text-base)', marginBottom: '8px' }}>
        Acesso Não Autorizado
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', maxWidth: '450px', margin: '0 auto' }}>
        O seu perfil atual não tem permissão para <strong>{action || 'acessar'}</strong> o módulo de <strong>{module || 'Sistema'}</strong>. Contacte o Administrador se necessitar de acesso.
      </p>
    </div>
  );

  return fallback !== null ? fallback : defaultFallback;
}
