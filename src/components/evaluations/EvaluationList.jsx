import React, { useState, useMemo } from 'react';
import useEvaluationData from '../../hooks/useEvaluationData';
import useOrgData from '../../hooks/useOrgData';
import { getClassification } from '../../utils/evaluationRules';
import { filterByProvincialScope } from '../../utils/scopeUtils';

export default function EvaluationList({ user }) {
  const { evaluations = [], loading, error } = useEvaluationData();
  const { data: orgData } = useOrgData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const filtered = useMemo(() => {
    const rawList = Array.isArray(evaluations) ? evaluations : [];
    const scopedList = user ? filterByProvincialScope(rawList, user, orgData) : rawList;

    return scopedList.filter(e => {
      if (!e) return false;
      if (filterYear && String(e.year) !== String(filterYear)) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        const name = String(e.employeeName || '').toLowerCase();
        const nip = String(e.employeeNip || '').toLowerCase();
        if (!name.includes(lower) && !nip.includes(lower)) return false;
      }
      return true;
    }).sort((a, b) => {
      const dateA = a?.createdAt || a?.evaluationDate || '';
      const dateB = b?.createdAt || b?.evaluationDate || '';
      return dateB.localeCompare(dateA);
    });
  }, [evaluations, user, orgData, searchTerm, filterYear]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="sernic-spinner"></div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>A carregar avaliações...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {error}</span>
        </div>
      )}

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
              const cls = getClassification(ev?.score);
              return (
                <tr key={ev?.id || Math.random()} style={styles.tr}>
                  <td><strong>{ev?.employeeNip || '-'}</strong></td>
                  <td>{ev?.employeeName || '-'}</td>
                  <td>{ev?.year || '-'}</td>
                  <td><strong>{ev?.score ?? '-'}</strong></td>
                  <td>
                    <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                      backgroundColor: cls.hexLight, color: cls.hexDark, border: `1px solid ${cls.hexBadge}`
                    }}>
                      {cls.label}
                    </span>
                  </td>
                  <td>{ev?.evaluationDate || '-'}</td>
                  <td>{ev?.evaluatorName || '-'}</td>
                  <td>{ev?.status || '-'}</td>
                  <td>
                    {ev?.pdfBase64 ? (
                      <button 
                        style={styles.btnPdf} 
                        type="button"
                        onClick={() => {
                          try {
                            const pdfWindow = window.open("");
                            if (pdfWindow) {
                              pdfWindow.document.write(`<iframe width='100%' height='100%' style='border:none' src='${ev.pdfBase64}'></iframe>`);
                            }
                          } catch {
                            // ignore popup block
                          }
                        }}
                      >
                        Ver PDF
                      </button>
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
  loadingContainer: { padding: '50px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' },
  errorBanner: { padding: '12px 16px', backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: '13px' },
  filters: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-base)', outline: 'none', fontSize: '13px', minWidth: '200px' },
  tableContainer: { overflowX: 'auto', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  empty: { padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' },
  btnPdf: { padding: '4px 10px', fontSize: '11px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};
