import React, { useMemo } from 'react';
import useEvaluationData from '../../hooks/useEvaluationData';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import { getClassification } from '../../utils/evaluationRules';
import { filterByProvincialScope } from '../../utils/scopeUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function EvaluationDashboard({ user }) {
  const { evaluations = [], loading: loadingEvals, error: errorEvals } = useEvaluationData();
  const { employees = [], loading: loadingEmps } = useEmployeeData();
  const { data: orgData } = useOrgData();
  
  const currentYear = new Date().getFullYear().toString();

  const stats = useMemo(() => {
    const rawEmployees = Array.isArray(employees) ? employees : [];
    const scopedEmployees = user ? filterByProvincialScope(rawEmployees, user, orgData) : rawEmployees;
    const activeEmployees = scopedEmployees.filter(e => e && e.isActive !== false);
    const totalEmployees = activeEmployees.length;
    
    const rawEvaluations = Array.isArray(evaluations) ? evaluations : [];
    const scopedEvaluations = user ? filterByProvincialScope(rawEvaluations, user, orgData) : rawEvaluations;
    const evalsThisYear = scopedEvaluations.filter(e => e && String(e.year) === String(currentYear));
    const evaluatedCount = evalsThisYear.length;
    const pendingCount = Math.max(0, totalEmployees - evaluatedCount);
    const percentComplete = totalEmployees > 0 ? ((evaluatedCount / totalEmployees) * 100).toFixed(1) : '0.0';

    let totalScore = 0;
    const distribution = {
      'Excelente': 0,
      'Muito Bom': 0,
      'Bom': 0,
      'Suficiente': 0,
      'Medíocre': 0
    };

    evalsThisYear.forEach(ev => {
      const s = parseFloat(ev?.score || 0);
      if (!isNaN(s)) {
        totalScore += s;
      }
      const cls = getClassification(ev?.score)?.label || 'Não Avaliado';
      if (distribution[cls] !== undefined) {
        distribution[cls]++;
      }
    });

    const averageScore = evaluatedCount > 0 ? (totalScore / evaluatedCount).toFixed(1) : '0.0';

    const pieData = Object.keys(distribution).map(key => ({
      name: key,
      value: distribution[key],
      color: getClassification(key === 'Excelente' ? 20 : key === 'Muito Bom' ? 18 : key === 'Bom' ? 15 : key === 'Suficiente' ? 12 : 5).hexBadge
    })).filter(d => d.value > 0);

    return {
      totalEmployees, evaluatedCount, pendingCount, percentComplete, averageScore, pieData, distribution
    };
  }, [evaluations, employees, orgData, user, currentYear]);

  if (loadingEvals && loadingEmps) {
    return (
      <div style={styles.loadingContainer}>
        <div className="sernic-spinner"></div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>A carregar indicadores de avaliação...</p>
      </div>
    );
  }

  if (errorEvals) {
    return (
      <div style={styles.errorBanner}>
        <span style={{ fontSize: '20px' }}>⚠️</span>
        <div>
          <strong style={{ display: 'block', color: '#b91c1c' }}>Aviso ao carregar dados de avaliação</strong>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{errorEvals}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Cards de Indicadores Gerais da GDI */}
      <div style={styles.gridCards}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total no Efetivo</div>
          <div style={styles.cardValue}>{stats.totalEmployees}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Fichas GDI ({currentYear})</div>
          <div style={{...styles.cardValue, color: 'var(--color-success)'}}>{stats.evaluatedCount}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Pendentes no Ciclo</div>
          <div style={{...styles.cardValue, color: 'var(--color-warning)'}}>{stats.pendingCount}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Adesão ao Ciclo Anual</div>
          <div style={styles.cardValue}>{stats.percentComplete}%</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Média Global GDI ({currentYear})</div>
          <div style={{...styles.cardValue, color: 'var(--color-primary)'}}>{stats.averageScore} / 20</div>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        {/* Gráfico de Barras */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Classificações Homologadas ({currentYear}) — Dec. 22/2018</h3>
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
  loadingContainer: { padding: '50px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' },
  errorBanner: { padding: '16px 20px', margin: '20px', backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '12px' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' },
  cardTitle: { fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardValue: { fontSize: '28px', fontWeight: '800', color: 'var(--color-text-base)' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' },
  chartCard: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)' },
  chartTitle: { margin: '0 0 20px 0', fontSize: '15px', color: 'var(--color-text-base)' },
  emptyChart: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic' }
};
