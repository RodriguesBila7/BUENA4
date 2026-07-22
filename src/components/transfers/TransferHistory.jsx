import React, { useState, useEffect } from 'react';

export default function TransferHistory({ transfers, employees, orgData, initialEmployeeId }) {
  const { data } = orgData;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployeeId || null);

  useEffect(() => {
    if (initialEmployeeId) {
      setSelectedEmployeeId(initialEmployeeId);
    }
  }, [initialEmployeeId]);

  const searchResults = searchTerm.length > 2 
    ? employees.filter(e => e.isActive && (e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.nip.toLowerCase().includes(searchTerm.toLowerCase())))
    : [];

  const handleSelectEmployee = (empId) => {
    setSelectedEmployeeId(empId);
    setSearchTerm('');
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const employeeTransfers = transfers.filter(t => t.employeeId === selectedEmployeeId).sort((a, b) => new Date(b.transferDate) - new Date(a.transferDate));

  const getName = (list, id) => list?.find(item => item.id === id)?.name || '-';

  const getStatusColor = (status) => {
    switch(status) {
      case 'Aprovada': return '#10B981';
      case 'Concluída': return '#8B5CF6';
      case 'Rejeitada': return '#EF4444';
      case 'Cancelada': return '#6B7280';
      case 'Submetida': return '#3B82F6';
      case 'Em análise': return '#F97316';
      default: return '#EAB308';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h4 style={styles.sidebarTitle}>Pesquisar Histórico</h4>
        <div style={styles.searchWrapper}>
          <input 
            type="text" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Nome ou NUIT..."
            style={styles.searchInput}
          />
          <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        
        {searchResults.length > 0 && (
          <div style={styles.searchResults}>
            {searchResults.map(emp => (
              <div key={emp.id} style={styles.searchItem} onClick={() => handleSelectEmployee(emp.id)}>
                <div style={styles.searchItemAvatar}>
                  {emp.photo ? <img src={emp.photo} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : emp.name.charAt(0)}
                </div>
                <div>
                  <div style={{fontWeight: '600', color: 'var(--color-text-base)', fontSize: '13px'}}>{emp.name}</div>
                  <div style={{color: 'var(--color-text-muted)', fontSize: '11px'}}>{emp.nip}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.main}>
        {!selectedEmployee ? (
          <div style={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{marginBottom: '16px', color: 'var(--color-text-muted)'}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <div>Selecione um funcionário para visualizar a sua evolução funcional.</div>
          </div>
        ) : (
          <div>
            <div style={styles.empHeader}>
              <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                <div style={styles.empPhotoBox}>
                  {selectedEmployee.photo ? (
                    <img src={selectedEmployee.photo} alt="Fotografia" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  ) : (
                    <div style={styles.empPhotoPlaceholder}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                  )}
                </div>
                <div>
                  <h3 style={styles.empName}>{selectedEmployee.name}</h3>
                  <p style={styles.empNip}>NUIT: {selectedEmployee.nip} | {getName(data.careers, selectedEmployee.careerId)}</p>
                  <p style={styles.empExtraInfo}>Ingresso: {selectedEmployee.admissionDate || '-'} | BI: {selectedEmployee.idNumber || '-'}</p>
                </div>
              </div>
              <div style={styles.empCurrentLocation}>
                <div style={{fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px'}}>Lotação Atual</div>
                <div style={{fontWeight: '600'}}>{getName(data.directorates, selectedEmployee.directorateId)}</div>
                {selectedEmployee.departmentId && <div style={{fontSize: '12px', marginTop: '2px'}}>{getName(data.departments, selectedEmployee.departmentId)}</div>}
                {selectedEmployee.divisionId && <div style={{fontSize: '12px'}}>{getName(data.divisions, selectedEmployee.divisionId)}</div>}
              </div>
            </div>

            <h4 style={styles.timelineTitle}>Linha do Tempo Funcional</h4>
            
            {employeeTransfers.length === 0 ? (
              <div style={styles.emptyTimeline}>Nenhum processo registado para este funcionário.</div>
            ) : (
              <div style={styles.timeline}>
                {employeeTransfers.map((tr, index) => {
                  const statusColor = getStatusColor(tr.status);
                  const lastHistory = (tr.history && tr.history.length > 0) ? tr.history[tr.history.length - 1] : null;
                  
                  return (
                    <div key={tr.id} style={styles.timelineItem}>
                      <div style={{...styles.timelineDot, backgroundColor: statusColor}}></div>
                      <div style={styles.timelineContent}>
                        
                        <div style={styles.timelineHeader}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                            <span style={styles.timelineDate}>{tr.transferDate}</span>
                            <span style={{fontWeight: '600', color: 'var(--color-text-base)'}}>{tr.type}</span>
                          </div>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <span style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>Processo: {tr.processNumber}</span>
                            <span style={{...styles.statusBadge, backgroundColor: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30`}}>
                              {tr.status}
                            </span>
                          </div>
                        </div>
                        
                        <div style={styles.timelineBody}>
                          <div style={styles.transferFlow}>
                            <div style={styles.transferUnit}>
                              <div style={styles.unitLabel}>DE (ORIGEM)</div>
                              <div style={styles.unitName}>{getName(data.directorates, tr.fromDirectorateId)}</div>
                              {tr.fromDepartmentId && <div style={styles.unitSubName}>{getName(data.departments, tr.fromDepartmentId)}</div>}
                              {tr.fromDivisionId && <div style={styles.unitSubName}>{getName(data.divisions, tr.fromDivisionId)}</div>}
                            </div>
                            <div style={styles.transferArrow}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </div>
                            <div style={styles.transferUnit}>
                              <div style={styles.unitLabel}>PARA (DESTINO)</div>
                              <div style={styles.unitName}>{getName(data.directorates, tr.toDirectorateId)}</div>
                              {tr.toDepartmentId && <div style={styles.unitSubName}>{getName(data.departments, tr.toDepartmentId)}</div>}
                              {tr.toDivisionId && <div style={styles.unitSubName}>{getName(data.divisions, tr.toDivisionId)}</div>}
                            </div>
                          </div>
                          
                          <div style={styles.transferDetailsGrid}>
                            <div style={styles.detailCard}>
                              <span style={styles.detailLabel}>Motivo</span>
                              <span style={styles.detailValue}>{tr.reason} {tr.reasonDescription ? `(${tr.reasonDescription})` : ''}</span>
                            </div>
                            <div style={styles.detailCard}>
                              <span style={styles.detailLabel}>Datas</span>
                              <span style={styles.detailValue}>
                                Efetivação: <strong>{tr.effectiveDate}</strong><br/>
                                Apresentação: <strong>{tr.presentationDate}</strong>
                              </span>
                            </div>
                            <div style={styles.detailCard}>
                              <span style={styles.detailLabel}>Despacho & Autoridade</span>
                              <span style={styles.detailValue}>
                                Despacho: <strong>{tr.documentNumber || '-'}</strong><br/>
                                Autorizado por: <strong>{tr.authorizedBy || '-'}</strong>
                              </span>
                            </div>
                            <div style={styles.detailCard}>
                              <span style={styles.detailLabel}>Responsável pela {tr.status}</span>
                              <span style={styles.detailValue}>
                                {lastHistory ? `${lastHistory.user} em ${new Date(lastHistory.date).toLocaleDateString()}` : 'Sistema'}
                              </span>
                            </div>
                          </div>
                          
                          {tr.notes && (
                            <div style={styles.notesBox}>
                              <strong>Observações:</strong> {tr.notes}
                            </div>
                          )}

                          {tr.attachments && tr.attachments.length > 0 && (
                            <div style={styles.attachmentsBox}>
                              <strong>Documentos Anexos:</strong>
                              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px'}}>
                                {tr.attachments.map((f, i) => (
                                  <div key={i} style={styles.attachmentChip}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                    {f.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', gap: '30px', minHeight: '600px', animation: 'fadeIn 0.3s ease-out' },
  sidebar: { width: '320px', flexShrink: 0, paddingRight: '20px' },
  sidebarTitle: { fontSize: '15px', fontWeight: '700', color: 'var(--color-text-base)', marginBottom: '16px', textTransform: 'uppercase' },
  
  searchWrapper: { position: 'relative' },
  searchInput: { width: '100%', padding: '12px 14px 12px 40px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px' },
  searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--color-text-muted)' },
  
  searchResults: { marginTop: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-bg-card)', maxHeight: '450px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
  searchItem: { padding: '12px 16px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background-color 0.2s', ':hover': {backgroundColor: 'var(--color-bg-base)'} },
  searchItemAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', overflow: 'hidden' },
  
  main: { flex: 1, backgroundColor: 'var(--color-bg-base)', padding: '30px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' },
  emptyState: { padding: '80px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  
  empHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
  empPhotoBox: { width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' },
  empPhotoPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' },
  empName: { margin: '0 0 6px 0', fontSize: '22px', color: 'var(--color-text-base)', fontWeight: '700' },
  empNip: { margin: '0 0 4px 0', color: 'var(--color-text-base)', fontSize: '14px', fontWeight: '500' },
  empExtraInfo: { margin: 0, color: 'var(--color-text-muted)', fontSize: '13px' },
  empCurrentLocation: { textAlign: 'right', fontSize: '14px', color: 'var(--color-text-base)', backgroundColor: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--color-border)' },
  
  timelineTitle: { fontSize: '18px', fontWeight: '700', color: 'var(--color-text-base)', marginBottom: '30px' },
  emptyTimeline: { padding: '30px', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '8px' },
  
  timeline: { display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '24px' },
  timelineItem: { position: 'relative', paddingBottom: '40px', borderLeft: '2px solid var(--color-border)', paddingLeft: '32px' },
  timelineDot: { position: 'absolute', left: '-8px', top: '0', width: '14px', height: '14px', borderRadius: '50%', border: '3px solid var(--color-bg-base)', boxShadow: '0 0 0 1px var(--color-border)' },
  timelineContent: { backgroundColor: 'var(--color-bg-card)', borderRadius: '10px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' },
  
  timelineHeader: { padding: '16px 20px', backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  timelineDate: { fontSize: '13px', fontWeight: '700', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-card)', padding: '4px 10px', borderRadius: '16px', border: '1px solid var(--color-border)' },
  statusBadge: { padding: '4px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' },
  
  timelineBody: { padding: '24px' },
  
  transferFlow: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' },
  transferUnit: { flex: 1, backgroundColor: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--color-border)' },
  unitLabel: { fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  unitName: { fontSize: '15px', fontWeight: '600', color: 'var(--color-text-base)' },
  unitSubName: { fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' },
  transferArrow: { color: 'var(--color-primary)' },
  
  transferDetailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' },
  detailCard: { backgroundColor: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' },
  detailLabel: { display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px' },
  detailValue: { fontSize: '13px', color: 'var(--color-text-base)', lineHeight: '1.5' },
  
  notesBox: { backgroundColor: 'rgba(245, 158, 11, 0.05)', borderLeft: '4px solid #F59E0B', padding: '16px', borderRadius: '0 8px 8px 0', fontSize: '13px', color: 'var(--color-text-base)', marginBottom: '16px' },
  
  attachmentsBox: { fontSize: '13px', color: 'var(--color-text-base)', marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--color-border)' },
  attachmentChip: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '16px', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-muted)' }
};

