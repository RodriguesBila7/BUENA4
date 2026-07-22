import React, { useState, useMemo } from 'react';
import useVacationData from '../../hooks/useVacationData';
import useEmployeeData from '../../hooks/useEmployeeData';

export default function VacationHistory() {
  const { requests, calculateEmployeeBalance } = useVacationData();
  const { employees } = useEmployeeData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return employees.filter(e => 
      e.name.toLowerCase().includes(term) || (e.nip && e.nip.toLowerCase().includes(term))
    ).slice(0, 8);
  }, [searchTerm, employees]);

  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || null;
  }, [selectedEmpId, employees]);

  const empRequests = useMemo(() => {
    if (!selectedEmpId) return [];
    return requests.filter(r => r.employeeId === selectedEmpId).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [selectedEmpId, requests]);

  const balance = useMemo(() => {
    if (!selectedEmp) return null;
    return calculateEmployeeBalance(selectedEmp.id, selectedEmp.admissionDate);
  }, [selectedEmp, calculateEmployeeBalance]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.searchBar}>
          <div style={{...styles.formGroup, flex: 1}}>
            <label style={styles.label}>Pesquisar Funcionário (Nome ou NUIT)</label>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={styles.input} 
              placeholder="Digite para pesquisar..."
            />
            {filteredEmployees.length > 0 && !selectedEmp && (
              <div style={styles.autocomplete}>
                {filteredEmployees.map(e => (
                  <div key={e.id} style={styles.autocompleteItem} onClick={() => { setSelectedEmpId(e.id); setSearchTerm(''); }}>
                    <strong>{e.nip}</strong> - {e.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedEmp && (
            <button onClick={() => setSelectedEmpId('')} style={styles.btnClear}>Limpar Seleção</button>
          )}
        </div>
      </div>

      {selectedEmp && (
        <div style={styles.layout}>
          <div style={styles.sidePanel}>
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>Ficha Resumo</h4>
              <p style={{margin: '0 0 4px 0', fontSize: '15px', fontWeight: 'bold'}}>{selectedEmp.name}</p>
              <p style={{margin: '0 0 12px 0', fontSize: '13px', color: 'var(--color-text-muted)'}}>NUIT: {selectedEmp.nip}</p>
              
              {balance && (
                <div style={styles.balanceBox}>
                  <div style={styles.balanceItem}>
                    <span>Direito Anual:</span>
                    <strong>{balance.entitled} d</strong>
                  </div>
                  <div style={styles.balanceItem}>
                    <span>Gozados:</span>
                    <strong>{balance.used} d</strong>
                  </div>
                  <div style={{...styles.balanceItem, borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '8px', marginTop: '4px'}}>
                    <span>Saldo Restante:</span>
                    <strong style={{fontSize: '18px', color: balance.balance > 0 ? '#10B981' : '#EF4444'}}>{balance.balance} d</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={styles.mainPanel}>
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>Histórico de Solicitações e Aprovações</h4>
              
              {empRequests.length === 0 ? (
                <p style={styles.empty}>Este funcionário não tem histórico de férias ou licenças registado.</p>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  {empRequests.map(req => (
                    <div key={req.id} style={styles.historyCard}>
                      <div style={styles.historyHeader}>
                        <div>
                          <span style={styles.reqId}>{req.id}</span>
                          <strong style={{marginLeft: '8px', fontSize: '15px'}}>{req.type} ({req.year})</strong>
                        </div>
                        <span style={{...styles.badge, backgroundColor: getStatusColor(req.status)}}>{req.status}</span>
                      </div>
                      
                      <div style={styles.historyBody}>
                        <div style={{marginBottom: '12px', fontSize: '14px'}}>
                          <strong>Período:</strong> {req.startDate} a {req.endDate} ({req.daysCount} dias)
                        </div>

                        <div style={styles.timeline}>
                          {req.history.map((evt, idx) => (
                            <div key={idx} style={styles.timelineItem}>
                              <div style={styles.timelineDot}></div>
                              <div style={styles.timelineContent}>
                                <div style={{fontSize: '13px', fontWeight: 'bold'}}>{evt.action}</div>
                                <div style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>{new Date(evt.date).toLocaleString()} por {evt.user}</div>
                                {evt.notes && <div style={{fontSize: '12px', marginTop: '4px', fontStyle: 'italic'}}>{evt.notes}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'Aprovada': return '#10B981';
    case 'Em gozo': return '#3B82F6';
    case 'Rejeitada': case 'Cancelada': return '#EF4444';
    case 'Concluída': return '#6B7280';
    default: return '#F59E0B';
  }
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { backgroundColor: 'var(--color-bg-elevated)', borderRadius: '8px', padding: '20px', border: '1px solid var(--color-border)' },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: 'var(--color-text-base)', margin: '0 0 16px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' },
  searchBar: { display: 'flex', gap: '16px', alignItems: 'flex-end', position: 'relative' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)' },
  input: { padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-base)', fontSize: '14px' },
  autocomplete: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' },
  autocompleteItem: { padding: '10px 12px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-base)' },
  btnClear: { padding: '10px 16px', backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
  layout: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  sidePanel: { flex: '1', minWidth: '250px', maxWidth: '300px' },
  mainPanel: { flex: '3', minWidth: '400px' },
  balanceBox: { padding: '16px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', border: '1px solid var(--color-border)' },
  balanceItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' },
  empty: { color: 'var(--color-text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px' },
  historyCard: { border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' },
  historyHeader: { padding: '12px 16px', backgroundColor: 'var(--color-bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' },
  reqId: { fontSize: '12px', color: 'var(--color-text-muted)' },
  badge: { padding: '4px 8px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600' },
  historyBody: { padding: '16px' },
  timeline: { borderLeft: '2px solid var(--color-border)', paddingLeft: '16px', marginLeft: '8px', display: 'flex', flexDirection: 'column', gap: '16px' },
  timelineItem: { position: 'relative' },
  timelineDot: { position: 'absolute', width: '10px', height: '10px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', left: '-22px', top: '4px' },
  timelineContent: { backgroundColor: 'var(--color-bg-subtle)', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)' }
};
