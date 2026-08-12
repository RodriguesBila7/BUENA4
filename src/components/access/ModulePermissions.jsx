import React from 'react';
import useAuthData from '../../hooks/useAuthData';

const MODULES = [
  'Dashboard', 'Funcionários', 'Estrutura Organizacional', 'Processos Disciplinares',
  'Efetividade (Faltas)', 'Avaliação de Desempenho', 'Promoção e Progressão',
  'Férias e Licenças', 'Mudança de Carreira', 'Provimento e Cessação',
  'Reserva e Reforma', 'Saúde e Óbitos', 'Transferências e Mobilidade',
  'Carreiras', 'Categorias Funcionais', 'Relatórios e Impressão', 'Configurações',
  'Utilizadores', 'Auditoria', 'Acessos e Perfis'
];

const styles = {
  container: { padding: '0', backgroundColor: 'transparent', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '20px', color: 'var(--color-primary)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', width: '100%' },
  card: { padding: '18px', borderRadius: '10px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
  cardTitle: { margin: '0 0 12px 0', fontSize: '15px', color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', fontWeight: 'bold' },
  roleList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  roleItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--color-text-base)' },
  badge: (hasFull) => ({
    backgroundColor: hasFull ? 'rgba(4, 120, 87, 0.1)' : 'rgba(27, 54, 93, 0.1)',
    color: hasFull ? '#047857' : 'var(--color-primary)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 'bold'
  })
};

export default function ModulePermissions() {
  const { roles } = useAuthData();

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Permissões Matriciais por Módulo</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Visão geral em tempo real dos perfis autorizados para cada módulo do sistema.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        {MODULES.map(mod => {
          const matchingRoles = (roles || []).filter(r => {
            const perms = r.permissions || {};
            if (perms.all === true) return true;
            const modPerms = perms[mod];
            return Array.isArray(modPerms) ? modPerms.length > 0 : Boolean(modPerms);
          });

          return (
            <div key={mod} style={styles.card}>
              <h4 style={styles.cardTitle}>📌 {mod}</h4>
              <ul style={styles.roleList}>
                {matchingRoles.map(r => {
                  const perms = r.permissions || {};
                  const modPerms = perms[mod] || [];
                  const isFull = perms.all === true || (Array.isArray(modPerms) && modPerms.length >= 9);
                  const summaryText = isFull 
                    ? 'Acesso Total' 
                    : (Array.isArray(modPerms) ? `${modPerms.length} Ações` : 'Ativo');

                  return (
                    <li key={r.id} style={styles.roleItem}>
                      <span><strong>{r.name}</strong></span>
                      <span style={styles.badge(isFull)}>{summaryText}</span>
                    </li>
                  );
                })}
                {matchingRoles.length === 0 && (
                  <li style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Nenhum perfil com permissão configurada.
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
