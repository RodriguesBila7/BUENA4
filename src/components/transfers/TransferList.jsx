import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../ConfirmModal';
import { exportToExcel } from '../../utils/excelExport';
import CrudActionButtons from '../common/CrudActionButtons';

export default function TransferList({ transfers, orgData, employees, onUpdateStatus, onDelete, onEdit, updateEmployeeFn, onViewHistory }) {
  const { data } = orgData;
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false, hasInput: false, placeholder: '', confirmText: 'Confirmar' });
  const [promptValue, setPromptValue] = useState('');

  const getName = (list, id) => list?.find(item => item.id === id)?.name || '-';

  const filteredTransfers = useMemo(() => {
    return transfers.filter(tr => {
      const term = searchTerm.toLowerCase();
      const empName = (tr.employeeName || '').toLowerCase();
      const empNip = (tr.employeeNip || '').toLowerCase();
      const docNum = (tr.documentNumber || '').toLowerCase();
      const reason = (tr.reason || '').toLowerCase();
      const dirName = (getName(data.directorates, tr.toDirectorateId)).toLowerCase();
      
      const matchesSearch = !searchTerm || empName.includes(term) || empNip.includes(term) || docNum.includes(term) || reason.includes(term) || dirName.includes(term);
      const matchesStatus = !statusFilter || tr.status === statusFilter;
      const matchesType = !typeFilter || tr.type === typeFilter;
      const matchesDateFrom = !dateFrom || new Date(tr.transferDate) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(tr.transferDate) <= new Date(dateTo);

      return matchesSearch && matchesStatus && matchesType && matchesDateFrom && matchesDateTo;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [transfers, searchTerm, statusFilter, typeFilter, dateFrom, dateTo, data.directorates]);

  const [expandedRows, setExpandedRows] = useState({});
  const toggleRow = (empId) => setExpandedRows(prev => ({...prev, [empId]: !prev[empId]}));

  const groupedTransfers = useMemo(() => {
    const map = new Map();
    filteredTransfers.forEach(t => {
      if (!map.has(t.employeeId)) {
        map.set(t.employeeId, {
          employeeId: t.employeeId,
          employeeName: t.employeeName,
          employeeNip: t.employeeNip,
          transfers: []
        });
      }
      map.get(t.employeeId).transfers.push(t);
    });
    return Array.from(map.values());
  }, [filteredTransfers]);

  const handleExportExcel = () => {
    const exportData = filteredTransfers.map(t => {
      const emp = employees.find(e => e.id === t.employeeId);
      const toDirectorateName = data?.directorates?.find(d => d.id === t.toDirectorateId)?.name || t.toDirectorateId;
      
      return {
        'Data do Pedido': t.createdAt,
        'Funcionário': t.employeeName || (emp ? emp.name : 'Desconhecido'),
        'NUIT': t.employeeNip || (emp ? emp.nip : 'N/D'),
        'Tipo de Transferência': t.type,
        'Motivo': t.reason,
        'Nova Direcção': toDirectorateName || 'N/D',
        'Nº Despacho': t.documentNumber || '-',
        'Estado': t.status
      };
    });
    exportToExcel(exportData, 'Registos_Transferencias');
  };

  const handleStatusChange = (id, newStatus) => {
    const isApprove = newStatus === 'Aprovada' || newStatus === 'Concluída';
    if (isApprove) {
      setConfirmModal({
        isOpen: true,
        title: 'Confirmar Alteração',
        message: `Tem certeza que deseja marcar esta transferência como ${newStatus}? O cadastro poderá ser atualizado.`,
        onConfirm: () => {
          onUpdateStatus(id, newStatus, `Alterado manualmente para ${newStatus}`, updateEmployeeFn, employees);
        }
      });
    } else {
      setPromptValue('');
      setConfirmModal({
        isOpen: true,
        title: 'Justificativa Requerida',
        message: `Adicione uma nota justificativa para alterar o estado para ${newStatus}:`,
        hasInput: true,
        placeholder: 'Escreva a justificativa...',
        confirmText: 'Submeter',
        onConfirm: (val) => {
          if (val && val.trim()) {
            onUpdateStatus(id, newStatus, val.trim(), null, null);
          } else {
            setConfirmModal({
              isOpen: true,
              title: 'Erro',
              message: 'A justificativa é obrigatória!',
              hideCancel: true,
              confirmText: 'OK'
            });
          }
        }
      });
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Em elaboração': return <span style={{...styles.badge, ...styles.badgeGray}}>{status}</span>;
      case 'Submetida': return <span style={{...styles.badge, ...styles.badgeBlue}}>{status}</span>;
      case 'Em análise': return <span style={{...styles.badge, ...styles.badgeOrange}}>{status}</span>;
      case 'Aprovada': return <span style={{...styles.badge, ...styles.badgeGreen}}>{status}</span>;
      case 'Concluída': return <span style={{...styles.badge, ...styles.badgePurple}}>{status}</span>;
      case 'Rejeitada': return <span style={{...styles.badge, ...styles.badgeRed}}>{status}</span>;
      case 'Cancelada': return <span style={{...styles.badge, ...styles.badgeDarkGray}}>{status}</span>;
      default: return <span style={styles.badge}>{status}</span>;
    }
  };

  const availableTypes = [
    "Transferência entre Províncias", "Transferência entre Distritos", "Transferência entre Direcções", 
    "Transferência entre Departamentos", "Transferência entre Repartições", "Transferência entre Secções", 
    "Transferência Temporária", "Transferência Definitiva", "Mobilidade Interna", "Cedência Temporária", "Comissão de Serviço"
  ];

  const availableStatuses = [
    "Em elaboração", "Submetida", "Em análise", "Aprovada", "Concluída", "Rejeitada", "Cancelada"
  ];

  return (
    <div style={styles.container}>
      
      <div style={styles.filtersCard}>
        <div style={styles.filtersHeader}>
          <h4 style={styles.filtersTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filtros de Pesquisa
          </h4>
          <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
            <span style={styles.resultsCount}>{filteredTransfers.length} encontrados</span>
            <button onClick={handleExportExcel} style={styles.btnExport}>
              📥 Exportar Excel
            </button>
          </div>
        </div>
        
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Pesquisa Global</label>
            <div style={styles.searchWrapper}>
              <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="Ex: Nome, NUIT, Nº Despacho..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>
          
          <div style={styles.filterGroup}>
            <label style={styles.label}>Estado</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.selectInput}>
              <option value="">Todos os Estados</option>
              {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Tipo</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.selectInput}>
              <option value="">Todos os Tipos</option>
              {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Data (De)</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={styles.selectInput} />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Data (Até)</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={styles.selectInput} />
          </div>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Processo</th>
              <th>Funcionário</th>
              <th>Movimentação</th>
              <th>Datas</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {groupedTransfers.length === 0 ? (
              <tr>
                <td colSpan="6" style={styles.empty}>Nenhum processo encontrado.</td>
              </tr>
            ) : (
              groupedTransfers.map(emp => (
                <React.Fragment key={emp.employeeId}>
                  <tr style={{...styles.tr, backgroundColor: 'rgba(0,0,0,0.02)', cursor: 'pointer'}} onClick={() => toggleRow(emp.employeeId)}>
                    <td colSpan="6" style={styles.td}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                          <strong>{emp.employeeName}</strong> (NUIT: {emp.employeeNip})
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <span style={{fontSize: '12px', padding: '4px 8px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', borderRadius: '12px'}}>
                            {emp.transfers.length} Pedido{emp.transfers.length > 1 ? 's' : ''}
                          </span>
                          <span style={{transform: expandedRows[emp.employeeId] ? 'rotate(180deg)' : 'none', transition: '0.2s', fontSize: '12px'}}>▼</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {expandedRows[emp.employeeId] && emp.transfers.map(tr => (
                    <tr key={tr.id} style={{...styles.tr, backgroundColor: 'var(--color-bg-base)'}}>
                      <td style={{...styles.td, paddingLeft: '40px'}}>
                        <div style={styles.primaryText}>{tr.processNumber}</div>
                        <div style={styles.secondaryText}>
                          Despacho: <strong>{tr.documentNumber}</strong>
                        </div>
                        {tr.attachments && tr.attachments.length > 0 && (
                          <div style={styles.attachmentBadge}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            {tr.attachments.length} Anexo{tr.attachments.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={styles.primaryText}>-</div>
                        <div style={styles.secondaryText}>-</div>
                      </td>
                      <td>
                        <div style={{marginBottom: '8px'}}>
                          <div style={{...styles.primaryText, fontSize: '13px'}}>{tr.type}</div>
                          <div style={{...styles.secondaryText, fontSize: '12px'}}>{tr.reason}</div>
                        </div>
                        <div style={styles.movementBox}>
                          <div style={styles.movementUnit} title={getName(data.directorates, tr.fromDirectorateId)}>
                            {getName(data.directorates, tr.fromDirectorateId)}
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{color: 'var(--color-primary)', flexShrink: 0}}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                          <div style={styles.movementUnit} title={getName(data.directorates, tr.toDirectorateId)}>
                            {getName(data.directorates, tr.toDirectorateId)}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={styles.dateGroup}>
                          <span style={styles.dateLabel}>Transf:</span> 
                          <span style={styles.dateValue}>{tr.transferDate}</span>
                        </div>
                        <div style={styles.dateGroup}>
                          <span style={styles.dateLabel}>Efetivação:</span> 
                          <span style={styles.dateValue}>{tr.effectiveDate}</span>
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(tr.status)}
                      </td>
                      <td style={styles.tdActions}>
                        <CrudActionButtons 
                          onView={() => onViewHistory(tr.employeeId)}
                          onEdit={() => onEdit(tr)}
                          onDelete={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Confirmar Eliminação',
                              message: 'Tem certeza que deseja apagar este processo permanentemente?',
                              isDestructive: true,
                              onConfirm: () => {
                                onDelete(tr.id);
                              }
                            });
                          }}
                          viewTitle="Ver Histórico Completo"
                          editTitle="Editar Processo"
                          deleteTitle="Apagar Processo"
                          extraButtons={
                            <div style={styles.statusDropdown}>
                              <button 
                                onClick={() => setOpenDropdownId(openDropdownId === tr.id ? null : tr.id)} 
                                style={{...styles.btnAction, ...(openDropdownId === tr.id ? {backgroundColor: 'var(--color-bg-base)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)'} : {})}} 
                                title="Alterar Estado"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                              </button>
                              
                              {openDropdownId === tr.id && (
                                <div style={{...styles.statusDropdownMenu, display: 'flex', flexDirection: 'column'}}>
                                  <div style={styles.dropdownHeader}>Alterar Estado</div>
                                  {availableStatuses.filter(s => s !== tr.status).map(s => (
                                    <div 
                                      key={s} 
                                      style={styles.dropdownItem} 
                                      onClick={() => { handleStatusChange(tr.id, s); setOpenDropdownId(null); }}
                                    >
                                      Mudar para <strong>{s}</strong>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm(promptValue);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setPromptValue('');
        }}
        onCancel={() => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setPromptValue('');
        }}
        hideCancel={confirmModal.hideCancel}
        confirmText={confirmModal.confirmText || 'Confirmar'}
        isDestructive={confirmModal.isDestructive}
        hasInput={confirmModal.hasInput}
        inputValue={promptValue}
        onInputChange={setPromptValue}
        placeholder={confirmModal.placeholder}
      />
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.4s ease-out' },
  filtersCard: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' },
  filtersHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' },
  filtersTitle: { margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--color-text-base)', display: 'flex', alignItems: 'center', gap: '8px' },
  resultsCount: { fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500', backgroundColor: 'var(--color-bg-base)', padding: '4px 12px', borderRadius: '12px' },
  btnExport: {
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-main)',
    border: '1px solid var(--color-border)',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filtersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.5px' },
  searchWrapper: { position: 'relative' },
  searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--color-text-muted)' },
  searchInput: { width: '100%', padding: '12px 16px 12px 40px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px', transition: 'all 0.2s', outline: 'none' },
  selectInput: { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px', transition: 'all 0.2s', outline: 'none', cursor: 'pointer' },
  
  tableContainer: { overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 6px 24px rgba(0,0,0,0.04)', backgroundColor: 'var(--color-bg-card)', whiteSpace: 'nowrap', minHeight: '400px', paddingBottom: '120px' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '18px 24px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: 'rgba(0,0,0,0.02)' },
  tr: { borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s', ':hover': { backgroundColor: 'var(--color-bg-base)' } },
  td: { padding: '20px 24px', verticalAlign: 'middle' },
  
  primaryText: { fontSize: '15px', fontWeight: '600', color: 'var(--color-text-base)', marginBottom: '4px' },
  secondaryText: { fontSize: '13px', color: 'var(--color-text-muted)' },
  
  dateGroup: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', width: '160px' },
  dateLabel: { fontSize: '12px', color: 'var(--color-text-muted)' },
  dateValue: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' },
  
  empty: { padding: '80px 20px', textAlign: 'center', color: 'var(--color-text-muted)' },
  emptyIcon: { display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--color-border)' },
  
  badge: { padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '0.5px' },
  badgeGray: { backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' },
  badgeBlue: { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#2563EB', border: '1px solid rgba(59, 130, 246, 0.3)' },
  badgeOrange: { backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#EA580C', border: '1px solid rgba(249, 115, 22, 0.3)' },
  badgeGreen: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)' },
  badgePurple: { backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#7C3AED', border: '1px solid rgba(139, 92, 246, 0.3)' },
  badgeRed: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#DC2626', border: '1px solid rgba(239, 68, 68, 0.3)' },
  badgeDarkGray: { backgroundColor: 'rgba(75, 85, 99, 0.15)', color: '#4B5563', border: '1px solid rgba(75, 85, 99, 0.3)' },
  
  movementBox: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--color-bg-base)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', width: 'fit-content' },
  movementUnit: { fontSize: '13px', fontWeight: '500', color: 'var(--color-text-base)', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  
  attachmentBadge: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '11px', marginTop: '8px', fontWeight: '600' },
  
  tdActions: { display: 'flex', gap: '8px', alignItems: 'center' },
  btnAction: { background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)', transition: 'all 0.2s', backgroundColor: 'var(--color-bg-base)' },
  btnActionEdit: { background: 'none', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#3B82F6', transition: 'all 0.2s', backgroundColor: 'rgba(59, 130, 246, 0.05)' },
  btnActionDelete: { background: 'none', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EF4444', transition: 'all 0.2s', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  
  statusDropdown: { position: 'relative' },
  statusDropdownMenu: { position: 'absolute', right: '0', top: '48px', width: '300px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '10px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 10, display: 'none', flexDirection: 'column', overflow: 'hidden' },
  dropdownHeader: { padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)', letterSpacing: '0.5px' },
  dropdownItem: { padding: '12px 20px', fontSize: '15px', color: 'var(--color-text-base)', cursor: 'pointer', transition: 'background-color 0.2s', ':hover': { backgroundColor: 'var(--color-bg-base)', color: 'var(--color-primary)' } }
};

