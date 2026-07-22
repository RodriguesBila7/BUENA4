import React, { useMemo } from 'react';
import useEvaluationData from '../../hooks/useEvaluationData';
import useEmployeeData from '../../hooks/useEmployeeData';
import { getClassification } from '../../utils/evaluationRules';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function EvaluationDashboard() {
  const { evaluations } = useEvaluationData();
  const { employees } = useEmployeeData();
  
  const currentYear = new Date().getFullYear().toString();

  const stats = useMemo(() => {
    const activeEmployees = employees.filter(e => e.isActive !== false);
    const totalEmployees = activeEmployees.length;
    
    const evalsThisYear = evaluations.filter(e => e.year === currentYear);
    const evaluatedCount = evalsThisYear.length;
    const pendingCount = totalEmployees - evaluatedCount;
    const percentComplete = totalEmployees > 0 ? ((evaluatedCount / totalEmployees) * 100).toFixed(1) : 0;

    let totalScore = 0;
    const distribution = {
      'Excelente': 0,
      'Muito Bom': 0,
      'Bom': 0,
      'Suficiente': 0,
      'Medíocre': 0
    };

    evalsThisYear.forEach(ev => {
      totalScore += parseFloat(ev.score);
      const cls = getClassification(ev.score).label;
      if (distribution[cls] !== undefined) {
        distribution[cls]++;
      }
    });

    const averageScore = evaluatedCount > 0 ? (totalScore / evaluatedCount).toFixed(1) : 0;

    const pieData = Object.keys(distribution).map(key => ({
      name: key,
      value: distribution[key],
      color: getClassification(key === 'Excelente' ? 20 : key === 'Muito Bom' ? 18 : key === 'Bom' ? 15 : key === 'Suficiente' ? 12 : 5).hexBadge
    })).filter(d => d.value > 0);

    return {
      totalEmployees, evaluatedCount, pendingCount, percentComplete, averageScore, pieData, distribution
    };
  }, [evaluations, employees, currentYear]);

  return (
    <div style={styles.container}>
      {/* Cards de Indicadores Gerais */}
      <div style={styles.gridCards}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total de Funcionários</div>
          <div style={styles.cardValue}>{stats.totalEmployees}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Avaliados em {currentYear}</div>
          <div style={{...styles.cardValue, color: 'var(--color-success)'}}>{stats.evaluatedCount}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Pendentes</div>
          <div style={{...styles.cardValue, color: 'var(--color-warning)'}}>{stats.pendingCount}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Progresso</div>
          <div style={styles.cardValue}>{stats.percentComplete}%</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Média Geral ({currentYear})</div>
          <div style={{...styles.cardValue, color: 'var(--color-primary)'}}>{stats.averageScore} / 20</div>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        {/* Gráfico de Barras */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Distribuição das Classificações ({currentYear})</h3>
          <div style={{ height: 300 }}>
            {stats.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.pieData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Funcionários" radius={[4, 4, 0, 0]}>
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={styles.emptyChart}>Sem avaliações registadas este ano.</div>
            )}
          </div>
        </div>

        {/* Gráfico Circular */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Proporção de Classificações</h3>
          <div style={{ height: 300 }}>
            {stats.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={styles.emptyChart}>Sem dados para apresentar.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '25px' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' },
  cardTitle: { fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardValue: { fontSize: '28px', fontWeight: '800', color: 'var(--color-text-base)' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' },
  chartCard: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)' },
  chartTitle: { margin: '0 0 20px 0', fontSize: '15px', color: 'var(--color-text-base)' },
  emptyChart: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic' }
};
