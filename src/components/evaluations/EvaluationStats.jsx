import React, { useMemo, useState } from 'react';
import useEvaluationData from '../../hooks/useEvaluationData';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import { getClassification } from '../../utils/evaluationRules';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function EvaluationStats() {
  const { evaluations } = useEvaluationData();
  const { employees } = useEmployeeData();
  const { data: orgData } = useOrgData();

  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const stats = useMemo(() => {
    const filteredEvals = filterYear ? evaluations.filter(e => e.year === filterYear) : evaluations;
    
    const byDirectorate = {};
    const byGender = { 'Masculino': 0, 'Feminino': 0 };
    const byClass = { 'Excelente': 0, 'Muito Bom': 0, 'Bom': 0, 'Suficiente': 0, 'Medíocre': 0 };

    if (orgData.directorates) {
      orgData.directorates.forEach(d => {
        byDirectorate[d.id] = { name: d.name, sum: 0, count: 0 };
      });
    }

    filteredEvals.forEach(ev => {
      const emp = employees.find(e => e.id === ev.employeeId);
      const score = parseFloat(ev.score);
      const cls = getClassification(ev.score).label;
      
      if (byClass[cls] !== undefined) byClass[cls]++;

      if (emp) {
        if (emp.gender === 'M' || emp.gender === 'Masculino') byGender['Masculino']++;
        if (emp.gender === 'F' || emp.gender === 'Feminino') byGender['Feminino']++;

        if (emp.directorateId && byDirectorate[emp.directorateId]) {
          byDirectorate[emp.directorateId].sum += score;
          byDirectorate[emp.directorateId].count++;
        }
      }
    });

    const dirData = Object.values(byDirectorate)
      .filter(d => d.count > 0)
      .map(d => ({
        name: d.name,
        media: parseFloat((d.sum / d.count).toFixed(1))
      }))
      .sort((a,b) => b.media - a.media);

    const genderData = [
      { name: 'Masculino', value: byGender['Masculino'], color: '#3182ce' },
      { name: 'Feminino', value: byGender['Feminino'], color: '#e53e3e' }
    ].filter(d => d.value > 0);

    const classData = Object.keys(byClass).map(key => ({
      name: key,
      value: byClass[key],
      color: getClassification(key === 'Excelente' ? 20 : key === 'Muito Bom' ? 18 : key === 'Bom' ? 15 : key === 'Suficiente' ? 12 : 5).hexBadge
    })).filter(d => d.value > 0);

    return { dirData, genderData, classData, total: filteredEvals.length };
  }, [evaluations, employees, orgData, filterYear]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Análise Estatística de Desempenho</h3>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={styles.select}>
          <option value="">Todos os Anos</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>
      </div>

      {stats.total === 0 ? (
        <div style={styles.empty}>Nenhum dado encontrado para o período selecionado.</div>
      ) : (
        <div style={styles.grid}>
          {/* Média por Direcção */}
          <div style={styles.cardFull}>
            <h4 style={styles.cardTitle}>Média de Pontuação por Direcção</h4>
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dirData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{fontSize: 11}} />
                  <YAxis domain={[0, 20]} />
                  <Tooltip />
                  <Bar dataKey="media" name="Média (0-20)" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribuição por Gênero */}
          <div style={styles.cardHalf}>
            <h4 style={styles.cardTitle}>Avaliações por Gênero</h4>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.genderData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribuição de Classificações */}
          <div style={styles.cardHalf}>
            <h4 style={styles.cardTitle}>Geral das Classificações</h4>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.classData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.classData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-card)', padding: '15px 20px', borderRadius: '12px', border: '1px solid var(--color-border)' },
  select: { padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', outline: 'none', fontSize: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  cardFull: { gridColumn: '1 / -1', backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)' },
  cardHalf: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)' },
  cardTitle: { margin: '0 0 20px 0', fontSize: '15px', color: 'var(--color-text-base)', textAlign: 'center' },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)' }
};
