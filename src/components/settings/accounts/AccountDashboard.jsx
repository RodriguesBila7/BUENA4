import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['var(--color-primary)', 'var(--color-text-muted)', 'var(--color-danger)', 'var(--color-warning)', 'var(--color-success)'];

const styles = {
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' },
  kpiCard: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  kpiTitle: { fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '12px' },
  kpiTotal: { fontSize: '32px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '12px' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' },
  chartCard: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)' },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '20px' },
  chartWrapper: { height: '250px' }
};

export default function AccountDashboard({ t }) {
  // Dados estáticos simulados conforme requisitos
  const kpis = {
    total: 124, active: 110, inactive: 5, blocked: 3, pending: 4, expired: 2
  };

  const chartData = [
    { name: t('acc_active') || 'Ativas', value: kpis.active },
    { name: t('acc_inactive') || 'Inativas', value: kpis.inactive },
    { name: t('acc_blocked') || 'Bloqueadas', value: kpis.blocked },
    { name: t('acc_pending') || 'Pendentes', value: kpis.pending }
  ];

  const barData = [
    { name: 'Seg', logins: 120 },
    { name: 'Ter', logins: 132 },
    { name: 'Qua', logins: 101 },
    { name: 'Qui', logins: 145 },
    { name: 'Sex', logins: 90 },
  ];

  return (
    <div className="animate-fade-in">
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <h3 style={styles.kpiTitle}>{t('acc_total') || 'Total Contas'}</h3>
          <div style={styles.kpiTotal}>{kpis.total}</div>
        </div>
        <div style={styles.kpiCard}>
          <h3 style={styles.kpiTitle}>{t('acc_active') || 'Ativas'}</h3>
          <div style={{...styles.kpiTotal, color: 'var(--color-success)'}}>{kpis.active}</div>
        </div>
        <div style={styles.kpiCard}>
          <h3 style={styles.kpiTitle}>{t('acc_blocked') || 'Bloqueadas'}</h3>
          <div style={{...styles.kpiTotal, color: 'var(--color-danger)'}}>{kpis.blocked}</div>
        </div>
        <div style={styles.kpiCard}>
          <h3 style={styles.kpiTitle}>{t('acc_pending') || 'Pendentes'}</h3>
          <div style={{...styles.kpiTotal, color: 'var(--color-warning)'}}>{kpis.pending}</div>
        </div>
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Estado das Contas</h3>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Logins da Semana</h3>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                <Bar dataKey="logins" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
