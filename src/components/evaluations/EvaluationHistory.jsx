import React, { useState, useMemo } from 'react';
import useEvaluationData from '../../hooks/useEvaluationData';
import useEmployeeData from '../../hooks/useEmployeeData';
import { getClassification } from '../../utils/evaluationRules';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EvaluationHistory() {
  const { evaluations } = useEvaluationData();
  const { employees } = useEmployeeData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return [];
    const lower = searchTerm.toLowerCase();
    return employees.filter(e => e.isActive !== false && (
      e.name.toLowerCase().includes(lower) || 
      e.nip.toLowerCase().includes(lower)
    )).slice(0, 10);
  }, [searchTerm, employees]);

  const history = useMemo(() => {
    if (!selectedEmpId) return [];
    return evaluations
      .filter(e => e.employeeId === selectedEmpId)
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [evaluations, selectedEmpId]);

  const chartData = useMemo(() => {
    return history.map(h => ({
      year: h.year,
      score: parseFloat(h.score)
    }));
  }, [history]);

  return (
    <div style={styles.container}>
      <div style={styles.searchSection}>
        <h3 style={styles.sectionTitle}>Selecionar Funcionário</h3>
        <input 
          type="text" 
          placeholder="Pesquisar NUIT ou Nome..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          style={styles.input}
        />
        {searchTerm && (
          <div style={styles.empList}>
            {filteredEmployees.map(emp => (
              <div 
                key={emp.id} 
                style={{...styles.empItem, ...(selectedEmpId === emp.id ? styles.empItemSelected : {})}}
                onClick={() => setSelectedEmpId(emp.id)}
              >
                <strong>{emp.nip}</strong> - {emp.name}
              </div>
            ))}
            {filteredEmployees.length === 0 && <div style={{padding: '10px', color: 'var(--color-text-muted)', fontSize: '13px'}}>Nenhum funcionário encontrado.</div>}
          </div>
        )}
      </div>

      {selectedEmpId && (
        <div style={styles.resultsSection}>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Evolução Anual da Pontuação</h3>
            <div style={{ height: 300 }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" />
                    <YAxis domain={[0, 20]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" name="Pontuação" stroke="var(--color-primary)" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={styles.emptyChart}>Sem histórico de avaliações.</div>
              )}
            </div>
          </div>

          <div style={styles.tableCard}>
            <h3 style={styles.chartTitle}>Histórico Detalhado</h3>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Ano</th>
                  <th>Período</th>
                  <th>Pontuação</th>
                  <th>Classificação</th>
                  <th>Data Avaliação</th>
                  <th>Avaliador</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {history.map(ev => {
                  const cls = getClassification(ev.score);
                  return (
                    <tr key={ev.id} style={styles.tr}>
                      <td><strong>{ev.year}</strong></td>
                      <td>{ev.period}</td>
                      <td><strong>{ev.score}</strong></td>
                      <td>
                        <span style={{
                          padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                          backgroundColor: cls.hexLight, color: cls.hexDark, border: `1px solid ${cls.hexBadge}`
                        }}>
                          {cls.label}
                        </span>
                      </td>
                      <td>{ev.evaluationDate}</td>
                      <td>{ev.evaluatorName}</td>
                      <td>{ev.status}</td>
                    </tr>
                  );
                })}
                {history.length === 0 && (
                  <tr><td colSpan="7" style={styles.empty}>Sem registos de avaliações.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '25px' },
  searchSection: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', maxWidth: '600px' },
  sectionTitle: { margin: '0 0 15px 0', fontSize: '15px', color: 'var(--color-text-base)' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', outline: 'none', fontSize: '14px', width: '100%' },
  empList: { marginTop: '10px', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-bg-base)' },
  empItem: { padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: '13px', transition: 'background-color 0.2s' },
  empItemSelected: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' },
  resultsSection: { display: 'flex', flexDirection: 'column', gap: '20px' },
  chartCard: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--color-border)' },
  tableCard: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflowX: 'auto' },
  chartTitle: { margin: '0 0 20px 0', fontSize: '15px', color: 'var(--color-text-base)', padding: '0 20px', paddingTop: '20px' },
  emptyChart: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '14px 20px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '14px 20px', color: 'var(--color-text-base)' },
  empty: { padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }
};

