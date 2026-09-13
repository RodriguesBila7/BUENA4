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
  const [selectedRecord, setSelectedRecord] = useState(null);

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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="sernic-spinner"></div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>A carregar fichas de desempenho individual...</p>
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
          placeholder="Pesquisar NUIT ou Nome do Funcionário..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          style={styles.input}
        />
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={styles.input}>
          <option value="">Todos os Anos</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
        </select>
      </div>

      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>NUIT</th>
              <th>Nome do Funcionário</th>
              <th>Ano Civil</th>
              <th>Objectivos (ODI)</th>
              <th>Pontuação</th>
              <th>Classificação Final</th>
              <th>Data Avaliação</th>
              <th>Avaliador</th>
              <th>Despacho</th>
              <th style={{ textAlign: 'center' }}>Ficha GDI & Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ev => {
              const cls = getClassification(ev?.score);
              const objCount = Array.isArray(ev?.objectives) ? ev.objectives.length : '-';
              return (
                <tr key={ev?.id || Math.random()} style={styles.tr}>
                  <td><strong>{ev?.employeeNip || '-'}</strong></td>
                  <td>{ev?.employeeName || '-'}</td>
                  <td><span style={styles.yearBadge}>{ev?.year || '-'}</span></td>
                  <td>
                    <span style={styles.objCountBadge}>
                      {objCount !== '-' ? `${objCount} ODI(s)` : 'Padronizado'}
                    </span>
                  </td>
                  <td><strong>{ev?.score ?? '-'}</strong> <span style={{fontSize: '11px', color: 'var(--color-text-muted)'}}>/ 20</span></td>
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
                  <td>{ev?.dispatchNumber ? <span style={{fontSize: '11px'}}>{ev.dispatchNumber}</span> : <span style={{color: 'var(--color-text-muted)', fontSize: '11px'}}>-</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button 
                        style={styles.btnViewGdi} 
                        type="button"
                        onClick={() => setSelectedRecord(ev)}
                        title="Ver Ficha Completa de Gestão de Desempenho Individual"
                      >
                        📄 Ficha GDI
                      </button>
                      {ev?.pdfBase64 && (
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
                          title="Visualizar PDF Digitalizado"
                        >
                          PDF
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="10" style={styles.empty}>Nenhuma ficha de desempenho individual encontrada para o filtro selecionado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Visualizador da Ficha GDI */}
      {selectedRecord && (
        <div style={styles.modalOverlay} onClick={() => setSelectedRecord(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--color-primary)' }}>
                  Ficha de Gestão de Desempenho Individual (GDI)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Ciclo de Avaliação Anual na Função Pública — Decreto n.º 22/2018
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={handlePrint} style={styles.btnPrint}>
                  🖨️ Imprimir Ficha
                </button>
                <button type="button" onClick={() => setSelectedRecord(null)} style={styles.btnClose}>
                  ✕ Fechar
                </button>
              </div>
            </div>

            <div style={styles.modalBody}>
              {/* Identificação do Funcionário */}
              <div style={styles.gdiSection}>
                <h4 style={styles.gdiSectionTitle}>I. Identificação do Funcionário Avaliado</h4>
                <div style={styles.gdiGrid}>
                  <div><strong>Nome Completo:</strong> {selectedRecord.employeeName || '-'}</div>
                  <div><strong>Nº Mecanográfico (NUIT):</strong> {selectedRecord.employeeNip || '-'}</div>
                  <div><strong>Ano de Exercício:</strong> {selectedRecord.year || '-'}</div>
                  <div><strong>Regime do Ciclo:</strong> {selectedRecord.period || 'Anual (Ciclo do Estado)'}</div>
                  <div><strong>Avaliador Hierárquico:</strong> {selectedRecord.evaluatorName || '-'}</div>
                  <div><strong>Cargo do Avaliador:</strong> {selectedRecord.evaluatorRole || '-'}</div>
                  <div><strong>Data da Avaliação:</strong> {selectedRecord.evaluationDate || '-'}</div>
                  <div><strong>Despacho de Homologação:</strong> {selectedRecord.dispatchNumber || 'Em tramitação'}</div>
                </div>
              </div>

              {/* Objectivos de Desempenho Individual (ODI), Resultados Esperados e Prazos */}
              <div style={styles.gdiSection}>
                <h4 style={styles.gdiSectionTitle}>II. Objectivos de Desempenho Individual (ODI), Resultados Esperados & Prazos</h4>
                {Array.isArray(selectedRecord.objectives) && selectedRecord.objectives.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.objTable}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>#</th>
                          <th>Objectivo de Desempenho Individual (ODI)</th>
                          <th>Resultados Esperados (Metas / Entregáveis)</th>
                          <th style={{ width: '110px' }}>Prazo Efectivação</th>
                          <th style={{ width: '80px' }}>Pond. (%)</th>
                          <th style={{ width: '130px' }}>Grau Cumprimento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRecord.objectives.map((obj, i) => (
                          <tr key={obj.id || i}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{i + 1}</td>
                            <td>{obj.description || '-'}</td>
                            <td>{obj.expectedResult || '-'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{obj.deadline || '-'}</td>
                            <td style={{ textAlign: 'center' }}>{obj.weight ? `${obj.weight}%` : '-'}</td>
                            <td>
                              <span style={styles.statusBadge}>
                                {obj.achievementStatus || 'Cumprido'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Objectivos individuais registados sob regime anual padronizado.
                  </p>
                )}
              </div>

              {/* Avaliação Final Anual */}
              <div style={styles.gdiSection}>
                <h4 style={styles.gdiSectionTitle}>III. Avaliação e Classificação Final Anual</h4>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>Pontuação Final Global (0 a 20):</span>
                    <strong style={{ fontSize: '24px', color: 'var(--color-primary)' }}>{selectedRecord.score ?? '-'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>Menção Qualitativa Homologada:</span>
                    {(() => {
                      const c = getClassification(selectedRecord.score);
                      return (
                        <span style={{
                          padding: '6px 14px', borderRadius: '14px', fontSize: '13px', fontWeight: '700',
                          backgroundColor: c.hexLight, color: c.hexDark, border: `1px solid ${c.hexBadge}`, display: 'inline-block'
                        }}>
                          {c.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {selectedRecord.observations && (
                  <div style={{ marginTop: '10px' }}>
                    <strong style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Apreciação da Chefia:</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', backgroundColor: 'var(--color-bg-base)', padding: '10px', borderRadius: '6px' }}>
                      {selectedRecord.observations}
                    </p>
                  </div>
                )}

                {selectedRecord.developmentPlan && (
                  <div style={{ marginTop: '10px' }}>
                    <strong style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Plano de Desenvolvimento & Capacitação:</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', backgroundColor: 'var(--color-bg-base)', padding: '10px', borderRadius: '6px' }}>
                      {selectedRecord.developmentPlan}
                    </p>
                  </div>
                )}
              </div>

              {/* Termo de Homologação e Assinaturas */}
              <div style={styles.signaturesContainer}>
                <div style={styles.signatureBox}>
                  <div style={styles.signatureLine}></div>
                  <span style={{ fontSize: '12px' }}>O Avaliado (Tomei Conhecimento)</span>
                </div>
                <div style={styles.signatureBox}>
                  <div style={styles.signatureLine}></div>
                  <span style={{ fontSize: '12px' }}>O Avaliador (Superior Hierárquico)</span>
                </div>
                <div style={styles.signatureBox}>
                  <div style={styles.signatureLine}></div>
                  <span style={{ fontSize: '12px' }}>Homologação (Director / Delegado)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  loadingContainer: { padding: '50px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' },
  errorBanner: { padding: '12px 16px', backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: '13px' },
  filters: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-base)', outline: 'none', fontSize: '13px', minWidth: '220px' },
  tableContainer: { overflowX: 'auto', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  empty: { padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' },
  yearBadge: { padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' },
  objCountBadge: { padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: 'rgba(27, 54, 93, 0.08)', color: 'var(--color-primary)' },
  btnViewGdi: { padding: '5px 12px', fontSize: '11px', fontWeight: '600', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  btnPdf: { padding: '5px 10px', fontSize: '11px', fontWeight: '600', backgroundColor: 'transparent', color: 'var(--color-text-base)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' },
  modalContent: { width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' },
  modalHeader: { padding: '18px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  btnPrint: { padding: '8px 14px', fontSize: '12px', fontWeight: '600', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  btnClose: { padding: '8px 14px', fontSize: '12px', fontWeight: '600', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer' },
  gdiSection: { backgroundColor: 'var(--color-bg-base)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--color-border)' },
  gdiSectionTitle: { margin: '0 0 12px 0', fontSize: '14px', color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' },
  gdiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '13px' },
  objTable: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '6px' },
  statusBadge: { padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#047857' },
  signaturesContainer: { display: 'flex', justifyContent: 'space-between', gap: '20px', marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed var(--color-border)', flexWrap: 'wrap' },
  signatureBox: { flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' },
  signatureLine: { width: '80%', height: '1px', backgroundColor: 'var(--color-text-muted)', marginBottom: '4px' }
};

