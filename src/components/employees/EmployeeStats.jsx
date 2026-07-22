import React from 'react';

export default function EmployeeStats({ stats, isLoading }) {
  if (isLoading) {
    return <div style={styles.loading}>A calcular estatísticas...</div>;
  }

  if (!stats) return null;

  return (
    <div style={styles.container}>
      <h4 style={styles.sectionTitle}>Indicadores Globais</h4>
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.label}>Total Filtrado</div>
          <div style={styles.value}>{stats.total}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.label}>Ativos</div>
          <div style={{...styles.value, color: '#48bb78'}}>{stats.active}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.label}>Inativos</div>
          <div style={{...styles.value, color: '#a0aec0'}}>{stats.inactive}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.label}>Homens / Mulheres</div>
          <div style={{...styles.value, color: '#4299e1'}}>{stats.demographics.male} / <span style={{color: '#ed64a6'}}>{stats.demographics.female}</span></div>
        </div>
        <div style={styles.card}>
          <div style={styles.label}>Idade (Média/Min/Max)</div>
          <div style={styles.value}>{stats.demographics.avgAge} / {stats.demographics.minAge} / {stats.demographics.maxAge}</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { marginBottom: '24px' },
  loading: { padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px' },
  sectionTitle: { fontSize: '15px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' },
  card: { backgroundColor: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' },
  value: { fontSize: '24px', fontWeight: '700', color: 'var(--color-text-base)' }
};
