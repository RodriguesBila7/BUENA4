import React from 'react';

const MODULES = [
  'Dashboard',
  'Funcionários',
  'Estrutura Organizacional',
  'Processos Disciplinares',
  'Efetividade (Faltas)',
  'Avaliação de Desempenho',
  'Promoção e Progressão',
  'Férias e Licenças',
  'Mudança de Carreira',
  'Provimento e Cessação',
  'Reserva e Reforma',
  'Saúde e Óbitos',
  'Transferências e Mobilidade',
  'Carreiras',
  'Categorias Funcionais',
  'Relatórios e Impressão',
  'Configurações',
  'Utilizadores',
  'Auditoria',
  'Acessos e Perfis'
];

const styles = {
  container: { padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', minHeight: '400px', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '20px', color: 'var(--color-primary)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  card: { padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-element)' },
  cardTitle: { margin: '0 0 10px 0', fontSize: '16px', color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' },
  roleList: { listStyle: 'none', padding: 0, margin: 0 },
  roleItem: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: 'var(--color-text-base)' },
  badge: { backgroundColor: 'var(--color-primary-light, rgba(0, 102, 204, 0.1))', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }
};

export default function ModulePermissions() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Permissões por Módulo</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Visão geral de acesso por módulo do sistema.</p>
      </div>

      <div style={styles.grid}>
        {MODULES.map(mod => (
          <div key={mod} style={styles.card}>
            <h4 style={styles.cardTitle}>{mod}</h4>
            <ul style={styles.roleList}>
              <li style={styles.roleItem}>
                <span>Super Admin</span>
                <span style={styles.badge}>Acesso Total</span>
              </li>
              <li style={styles.roleItem}>
                <span>Gestor de RH</span>
                <span style={styles.badge}>Leitura / Escrita</span>
              </li>
              <li style={styles.roleItem}>
                <span>Utilizador Padrão</span>
                <span style={{ ...styles.badge, backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-text-muted)' }}>Leitura</span>
              </li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
