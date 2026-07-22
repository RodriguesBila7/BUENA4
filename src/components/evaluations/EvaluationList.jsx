import React, { useState, useMemo } from 'react';
import useEvaluationData from '../../hooks/useEvaluationData';
import { getClassification } from '../../utils/evaluationRules';

export default function EvaluationList() {
  const { evaluations } = useEvaluationData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const filtered = useMemo(() => {
    return evaluations.filter(e => {
      if (filterYear && e.year !== filterYear) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        if (!e.employeeName.toLowerCase().includes(lower) && !e.employeeNip.toLowerCase().includes(lower)) return false;
      }
      return true;
    }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }, [evaluations, searchTerm, filterYear]);

  return (
    <div style={styles.container}>
      <div style={styles.filters}>
        <input 
          type="text" 
          placeholder="Pesquisar NUIT ou Nome..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          style={styles.input}
        />
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={styles.input}>
          <option value="">Todos os Anos</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>
      </div>

      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>NUIT</th>
              <th>Nome do Funcionário</th>
              <th>Ano</th>
              <th>Pontuação</th>
              <th>Classificação</th>
              <th>Data Avaliação</th>
              <th>Avaliador</th>
              <th>Estado</th>
              <th>Documento</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ev => {
              const cls = getClassification(ev.score);
              return (
                <tr key={ev.id} style={styles.tr}>
                  <td><strong>{ev.employeeNip}</strong></td>
                  <td>{ev.employeeName}</td>
                  <td>{ev.year}</td>
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
                  <td>
                    {ev.pdfBase64 ? (
                      <button style={styles.btnPdf} onClick={() => {
                        const pdfWindow = window.open("");
                        pdfWindow.document.write(`<iframe width='100%' height='100%' src='${ev.pdfBase64}'></iframe>`);
                      }}>Ver PDF</button>
                    ) : (
                      <span style={{color: 'var(--color-text-muted)', fontSize: '11px'}}>Sem Anexo</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="9" style={styles.empty}>Nenhuma avaliação encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  filters: { display: 'flex', gap: '15px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-base)', outline: 'none', fontSize: '13px', minWidth: '200px' },
  tableContainer: { overflowX: 'auto', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '14px 20px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '14px 20px', color: 'var(--color-text-base)' },
  empty: { padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' },
  btnPdf: { padding: '4px 10px', fontSize: '11px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};

