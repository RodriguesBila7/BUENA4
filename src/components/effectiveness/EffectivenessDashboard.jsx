import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import useEmployeeData from '../../hooks/useEmployeeData';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useOrgData from '../../hooks/useOrgData';

const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280', '#06B6D4'];

export default function EffectivenessDashboard() {
  const { employees } = useEmployeeData();
  const { records } = useEffectivenessData();
  const { data: orgData } = useOrgData();

  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.isActive);
  }, [employees]);

  // Estatísticas calculadas a partir dos registos de faltas
  const stats = useMemo(() => {
    const totalEmployees = activeEmployees.length;
    
    // Contagens
    let justifiedAbsences = 0;
    let unjustifiedAbsences = 0;
    let totalAbsenceDays = 0;
    
    // Agrupamento por funcionários únicos (Faltosos)
    const uniqueAbsentees = new Set();
    
    // Distribuição por Direcção
    const directorateMap = {};

    records.forEach(r => {
      uniqueAbsentees.add(r.employeeNip);
      totalAbsenceDays += (r.daysCount || 0);
      
      if (r.type === 'Falta Justificada') {
        justifiedAbsences++;
      } else {
        unjustifiedAbsences++;
      }

      const dirName = orgData?.directorates?.find(d => d.id === r.directorateId)?.name || 'Sem Direcção';
      if (!directorateMap[dirName]) {
        directorateMap[dirName] = 0;
      }
      directorateMap[dirName] += (r.daysCount || 1);
    });

    const totalFaltosos = uniqueAbsentees.size;
    
    // Dados para PieChart (Percentagem Justificadas vs Injustificadas)
    const pieData = [
      { name: 'Justificadas', value: justifiedAbsences },
      { name: 'Injustificadas', value: unjustifiedAbsences }
    ].filter(d => d.value > 0);

    // Dados para BarChart (Faltas por Direcção)
    const barData = Object.keys(directorateMap).map(dir => ({
      name: dir.length > 20 ? dir.substring(0, 17) + '...' : dir,
      'Dias de Falta': directorateMap[dir]
    })).sort((a, b) => b['Dias de Falta'] - a['Dias de Falta']).slice(0, 7); // Top 7

    return {
      totalEmployees,
      totalFaltosos,
      totalAbsenceDays,
      justifiedAbsences,
      unjustifiedAbsences,
      pieData,
      barData
    };
  }, [records, activeEmployees, orgData]);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Painel Geral de Faltas (Efetividade)</h3>
      
      {/* Indicadores Principais */}
      <div style={styles.statsGrid}>
        
        <div style={styles.statCard}>
          <div style={styles.statIconWrapper('#EEF2FF', '#4F46E5')}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.totalFaltosos}</span>
            <span style={styles.statLabel}>Funcionários Faltosos</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIconWrapper('#FEF2F2', '#EF4444')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.totalAbsenceDays}</span>
            <span style={styles.statLabel}>Dias Acumulados de Falta</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIconWrapper('#ECFDF5', '#10B981')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.justifiedAbsences}</span>
            <span style={styles.statLabel}>Registos Justificados</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIconWrapper('#FFFBEB', '#F59E0B')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{stats.unjustifiedAbsences}</span>
            <span style={styles.statLabel}>Registos Injustificados</span>
          </div>
        </div>

      </div>

      {/* Gráficos */}
      <div style={styles.chartsGrid}>
        
        {/* Distribuição por Direcção */}
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Dias de Falta por Direcção (Top 7)</h4>
          <div style={styles.chartWrapper}>
            {stats.barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis />
                  <RechartsTooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="Dias de Falta" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={styles.emptyChart}>Sem dados suficientes para apresentar.</div>
            )}
          </div>
        </div>

        {/* Tipos de Faltas */}
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Justificadas vs Injustificadas</h4>
          <div style={styles.chartWrapper}>
            {stats.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={styles.emptyChart}>Sem dados suficientes para apresentar.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    animation: 'fadeIn 0.3s'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--color-text-base)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px'
  },
  statCard: {
    backgroundColor: 'var(--color-bg-card)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  statIconWrapper: (bg, color) => ({
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: bg,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }),
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '800',
    lineHeight: '1',
    color: 'var(--color-text-base)'
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px'
  },
  chartCard: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    padding: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '400px'
  },
  chartTitle: {
    margin: '0 0 20px 0',
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-text-base)',
    textTransform: 'uppercase'
  },
  chartWrapper: {
    flex: 1,
    minHeight: '300px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyChart: {
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    fontSize: '14px'
  }
};
