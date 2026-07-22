import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import useAdminActsData from '../../hooks/useAdminActsData';

const COLORS = ['#1B365D', '#3182CE', '#E53E3E', '#D69E2E', '#38A169', '#805AD5', '#DD6B20', '#319795'];

export default function AdminActsDashboard() {
  const { stats } = useAdminActsData();

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Dashboard de Actos Administrativos</h2>
      
      {/* Top Cards */}
      <div style={styles.cardsGrid}>
        <div style={styles.card}>
          <div style={styles.cardIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '24px', height: '24px'}}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Total de Actos Registados</div>
            <div style={styles.cardValue}>{stats.total}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '24px', height: '24px'}}>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
             </svg>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Promoções Realizadas</div>
            <div style={styles.cardValue}>{stats.promotions}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '24px', height: '24px'}}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
             </svg>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Progressões Realizadas</div>
            <div style={styles.cardValue}>{stats.progressions}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '24px', height: '24px'}}>
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="14" x2="21" y2="3"></line>
                <polyline points="8 21 3 21 3 16"></polyline>
                <line x1="20" y1="10" x2="3" y2="21"></line>
             </svg>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Mudanças de Carreira</div>
            <div style={styles.cardValue}>{stats.careerChanges}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '24px', height: '24px'}}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
             </svg>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Funcionários na Reserva / Reformados</div>
            <div style={styles.cardValue}>{stats.retirements}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '24px', height: '24px'}}>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
             </svg>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Afastados por Motivos de Saúde / Óbitos</div>
            <div style={styles.cardValue}>{stats.healthIssues}</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={styles.chartsContainer}>
        {/* Organizacional - Provincias */}
        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>Atos Administrativos por Província</h3>
          <div style={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.provinceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.provinceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temporal - Evolução Mensal */}
        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>Evolução Mensal (2026)</h3>
          <div style={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="Atos" stroke="#1B365D" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: 'var(--color-bg-base)',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    animation: 'fadeIn 0.3s'
  },
  pageTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--color-text-base)'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },
  card: {
    backgroundColor: 'var(--color-bg-card)',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default'
  },
  cardIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    backgroundColor: 'rgba(27, 54, 93, 0.08)',
    color: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  cardLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--color-text-base)',
    lineHeight: '1'
  },
  chartsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '24px'
  },
  chartBox: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    padding: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column'
  },
  chartTitle: {
    margin: '0 0 20px 0',
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-text-base)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  chartArea: {
    height: '350px',
    width: '100%'
  }
};
