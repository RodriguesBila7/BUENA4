import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function AdminActsAnalytics({ acts, title }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const availableYears = useMemo(() => {
    const years = new Set(acts.map(act => (act.date || act.actDate || new Date().toISOString()).substring(0, 4)));
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort().reverse();
  }, [acts]);

  const stats = useMemo(() => {
    const actsThisYear = acts.filter(act => (act.date || act.actDate || '').startsWith(selectedYear));
    const currentMonth = new Date().toISOString().substring(0, 7);
    const actsThisMonth = acts.filter(act => (act.date || act.actDate || '').startsWith(currentMonth));
    
    // Processamento Mensal para Gráfico de Barras/Linhas
    const monthlyCounts = {
      'Jan': 0, 'Fev': 0, 'Mar': 0, 'Abr': 0, 'Mai': 0, 'Jun': 0,
      'Jul': 0, 'Ago': 0, 'Set': 0, 'Out': 0, 'Nov': 0, 'Dez': 0
    };
    
    const statusCounts = {};
    const typeCounts = {};

    actsThisYear.forEach(act => {
      // Mês
      const dateStr = act.date || act.actDate;
      if (dateStr) {
        const monthIndex = parseInt(dateStr.substring(5, 7), 10) - 1;
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyCounts[monthNames[monthIndex]]++;
        }
      }

      // Status
      const status = act.status || 'Concluído';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Type
      const type = act.actType || act.type || 'Geral';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const monthlyData = Object.keys(monthlyCounts).map(month => ({
      name: month,
      processos: monthlyCounts[month]
    }));

    const statusData = Object.keys(statusCounts).map(status => ({
      name: status,
      value: statusCounts[status]
    }));

    const typeData = Object.keys(typeCounts).map(type => ({
      name: type,
      value: typeCounts[type]
    }));

    return {
      total: acts.length,
      thisYear: actsThisYear.length,
      thisMonth: actsThisMonth.length,
      monthlyData,
      statusData,
      typeData
    };
  }, [acts, selectedYear]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Estatísticas Analíticas {title ? `- ${title}` : ''}</h2>
        <select 
          value={selectedYear} 
          onChange={e => setSelectedYear(e.target.value)}
          style={styles.select}
        >
          {availableYears.map(year => (
            <option key={year} value={year}>Ano {year}</option>
          ))}
        </select>
      </div>

      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiTitle}>Total Histórico</div>
          <div style={styles.kpiValue}>{stats.total}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiTitle}>Processos em {selectedYear}</div>
          <div style={{...styles.kpiValue, color: 'var(--color-primary)'}}>{stats.thisYear}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiTitle}>Neste Mês</div>
          <div style={{...styles.kpiValue, color: '#10B981'}}>{stats.thisMonth}</div>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Evolução Mensal ({selectedYear})</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#666'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#666'}} />
                <RechartsTooltip cursor={{fill: '#f5f5f5'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="processos" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Distribuição por Tipo ({selectedYear})</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={stats.typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {stats.typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {stats.statusData.length > 1 && (
        <div style={{...styles.chartCard, marginTop: '20px'}}>
          <h3 style={styles.chartTitle}>Estado dos Processos ({selectedYear})</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={stats.statusData} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: '#f5f5f5'}} contentStyle={{borderRadius: '8px'}} />
                <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20}>
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index+2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', padding: '10px 0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '20px', fontWeight: '600', color: 'var(--color-text-main)', margin: 0 },
  select: { padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', outline: 'none', cursor: 'pointer', fontWeight: '500' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
  kpiCard: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  kpiTitle: { fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: '500', textTransform: 'uppercase' },
  kpiValue: { fontSize: '32px', fontWeight: '700', color: 'var(--color-text-main)' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' },
  chartCard: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  chartTitle: { fontSize: '16px', fontWeight: '600', color: 'var(--color-text-main)', margin: '0 0 20px 0' },
};
