import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../ConfirmModal';
import DraggableModal from '../common/DraggableModal';
import { exportToExcel } from '../../utils/excelExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TransferList({ 
  transfers = [], 
  orgData, 
  employees = [], 
  onUpdateStatus, 
  onDelete, 
  onEdit, 
  updateEmployeeFn, 
  onViewHistory,
  activeStatusFilter,
  onStatusFilterChange
}) {
  const { data } = orgData || {};
  const { user } = useAuth();
  
  const isSuperAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(user?.roleId || user?.role) || user?.username === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(activeStatusFilter || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false, hasInput: false, placeholder: '', confirmText: 'Confirmar' });
  const [promptValue, setPromptValue] = useState('');
  const [viewingTransfer, setViewingTransfer] = useState(null);

  React.useEffect(() => {
    if (activeStatusFilter !== undefined) {
      setStatusFilter(activeStatusFilter);
    }
  }, [activeStatusFilter]);

  const getName = (list, id) => list?.find(item => item.id === id)?.name || '-';

  const filteredTransfers = useMemo(() => {
    return (transfers || []).filter(tr => {
      const term = searchTerm.toLowerCase();
      const empName = (tr.employeeName || '').toLowerCase();
      const empNip = (tr.employeeNip || '').toLowerCase();
      const docNum = (tr.documentNumber || tr.processNumber || '').toLowerCase();
      const reason = (tr.reason || '').toLowerCase();
      const toDirName = (getName(data?.directorates, tr.toDirectorateId)).toLowerCase();
      
      const matchesSearch = !searchTerm || empName.includes(term) || empNip.includes(term) || docNum.includes(term) || reason.includes(term) || toDirName.includes(term);
      
      let matchesStatus = true;
      if (statusFilter) {
        if (statusFilter === 'Pendente') {
          matchesStatus = ['Pendente', 'Em elaboração', 'Submetida', 'Em análise'].includes(tr.status);
        } else if (statusFilter === 'Aprovada') {
          matchesStatus = ['Aprovada', 'Concluída'].includes(tr.status);
        } else if (statusFilter === 'Rejeitada') {
          matchesStatus = ['Rejeitada', 'Cancelada'].includes(tr.status);
        } else {
          matchesStatus = tr.status === statusFilter;
        }
      }

      const matchesType = !typeFilter || tr.type === typeFilter;
      const matchesDateFrom = !dateFrom || new Date(tr.transferDate || tr.createdAt) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(tr.transferDate || tr.createdAt) <= new Date(dateTo);

      return matchesSearch && matchesStatus && matchesType && matchesDateFrom && matchesDateTo;
    }).sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));
  }, [transfers, searchTerm, statusFilter, typeFilter, dateFrom, dateTo, data?.directorates]);

  // Exportação Excel
  const handleExportExcel = () => {
    const exportData = filteredTransfers.map(tr => {
      const emp = employees.find(e => e.id === tr.employeeId);
      const toDirectorateName = data?.directorates?.find(d => d.id === tr.toDirectorateId)?.name || tr.toDirectorateId || '-';
      
      return {
        'Nº Processo': tr.processNumber || tr.id,
        'Nº Despacho': tr.documentNumber || '-',
        'Funcionário': tr.employeeName || (emp ? emp.name : 'Desconhecido'),
        'NUIT/NIP': tr.employeeNip || (emp ? emp.nip : 'N/D'),
        'Tipo de Movimentação': tr.type || 'Transferência',
        'Motivo': tr.reason || '-',
        'Província Destino': tr.toProvinceId || '-',
        'Direcção Destino': toDirectorateName,
        'Data Decisão': tr.transferDate || '-',
        'Data Efetivação': tr.effectiveDate || '-',
        'Estado': tr.status
      };
    });
    exportToExcel(exportData, `Processos_Transferencia_${new Date().toISOString().substring(0,10)}`);
  };

  // Exportação PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Relatório de Processos de Transferência e Mobilidade', 14, 15);
    doc.setFontSize(10);
    doc.text(`Total Registados: ${filteredTransfers.length} | Emitido em: ${new Date().toLocaleDateString('pt-PT')}`, 14, 22);

    const tableColumn = ["Processo", "Despacho", "Funcionário", "NUIT/NIP", "Tipo", "Destino", "Data", "Estado"];
    const tableRows = [];

    filteredTransfers.forEach(tr => {
      const emp = employees.find(e => e.id === tr.employeeId);
      const toDir = data?.directorates?.find(d => d.id === tr.toDirectorateId)?.name || '-';
      tableRows.push([
        tr.processNumber || tr.id,
        tr.documentNumber || '-',
        tr.employeeName || (emp ? emp.name : '-'),
        tr.employeeNip || (emp ? emp.nip : '-'),
        tr.type || '-',
        toDir,
        tr.transferDate || '-',
        tr.status
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Relatorio_Transferencias_${new Date().toISOString().substring(0,10)}.pdf`);
  };

  const handleStatusChange = (id, newStatus) => {
    const isApprove = newStatus === 'Aprovada' || newStatus === 'Concluída';
    if (isApprove) {
      setConfirmModal({
        isOpen: true,
        title: '✍️ Dar Conformidade / Aprovar Transferência',
        message: `Tem certeza que deseja APROVAR e dar conformidade a esta transferência? O cadastro do funcionário será automaticamente atualizado para a nova lotação.`,
        confirmText: '✍️ Aprovar & Efetivar',
        onConfirm: () => {
          onUpdateStatus(id, newStatus, `Aprovado e efetivado por ${user?.name || 'Administrador'}`, updateEmployeeFn, employees);
        }
      });
    } else {
      setPromptValue('');
      setConfirmModal({
        isOpen: true,
        title: 'Justificativa do Indeferimento / Alteração',
        message: `Por favor, indique a justificativa para alterar o estado da transferência para ${newStatus}:`,
        hasInput: true,
        placeholder: 'Escreva a justificativa oficial...',
        confirmText: 'Submeter Alteração',
        onConfirm: (val) => {
          if (val && val.trim()) {
            onUpdateStatus(id, newStatus, val.trim(), null, null);
          } else {
            setConfirmModal({
              isOpen: true,
              title: 'Aviso',
              message: 'A justificativa é obrigatória para rejeitar ou alterar o processo.',
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
      case 'Em elaboração':
      case 'Pendente':
      case 'Submetida':
      case 'Em análise':
        return <span style={{ ...styles.badge, backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' }}>🟡 {status}</span>;
      case 'Aprovada':
        return <span style={{ ...styles.badge, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)' }}>✅ Aprovada</span>;
      case 'Concluída':
        return <span style={{ ...styles.badge, backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed', border: '1px solid rgba(139, 92, 246, 0.3)' }}>🟣 Concluída</span>;
      case 'Rejeitada':
        return <span style={{ ...styles.badge, backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)' }}>🔴 Rejeitada</span>;
      case 'Cancelada':
        return <span style={{ ...styles.badge, backgroundColor: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.3)' }}>⚫ Cancelada</span>;
      default:
        return <span style={styles.badge}>{status}</span>;
    }
  };

  const availableTypes = [
    "Transferência entre Províncias", "Transferência entre Distritos", "Transferência entre Direcções", 
    "Transferência entre Departamentos", "Transferência entre Repartições", "Transferência entre Secções", 
    "Transferência Temporária", "Transferência Definitiva", "Mobilidade Interna", "Cedência Temporária", "Comissão de Serviço"
  ];

  return (
    <div style={styles.container}>
      
      {/* Filtros de Pesquisa */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersHeader}>
          <h4 style={styles.filtersTitle}>
            🔍 Filtros Avançados de Movimentação
          </h4>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={styles.resultsCount}>{filteredTransfers.length} processo(s) encontrado(s)</span>
            <button onClick={handleExportExcel} style={styles.btnTool}>📊 Excel</button>
            <button onClick={handleExportPDF} style={styles.btnTool}>📄 PDF</button>
          </div>
        </div>
        
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Pesquisa Global</label>
            <input 
              type="text" 
              placeholder="Nome, NUIT/NIP, Nº Despacho..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          <div style={styles.filterGroup}>
            <label style={styles.label}>Estado do Processo</label>
            <select 
              value={statusFilter} 
              onChange={(e) => {
                setStatusFilter(e.target.value);
                if (onStatusFilterChange) onStatusFilterChange(e.target.value);
              }} 
              style={styles.selectInput}
            >
              <option value="">Todos os Estados</option>
              <option value="Pendente">Pendentes / Em Análise</option>
              <option value="Aprovada">Aprovadas / Concluídas</option>
              <option value="Rejeitada">Rejeitadas / Canceladas</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Tipo de Movimentação</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.selectInput}>
              <option value="">Todos os Tipos</option>
              {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Data Decisão (De)</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={styles.selectInput} />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Data Decisão (Até)</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={styles.selectInput} />
          </div>
        </div>
      </div>

      {/* Tabela de Registos Directa */}
      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>PROCESSO / DESPACHO</th>
              <th>FUNCIONÁRIO</th>
              <th>MOVIMENTAÇÃO & DESTINO</th>
              <th>DATAS</th>
              <th>ESTADO</th>
              <th style={{ textAlign: 'right' }}>AÇÕES CRUD</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransfers.length === 0 ? (
              <tr>
                <td colSpan="6" style={styles.empty}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>📂</div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>Nenhum processo de transferência encontrado.</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Ajuste os filtros de pesquisa ou clique em "+ Nova Transferência" para criar um novo processo.</div>
                </td>
              </tr>
            ) : (
              filteredTransfers.map(tr => {
                const emp = employees.find(e => e.id === tr.employeeId);
                const empName = tr.employeeName || (emp ? emp.name : 'Funcionário Desconhecido');
                const empNip = tr.employeeNip || (emp ? emp.nip : 'N/D');
                const empRole = emp?.role || (emp ? getName(data?.categories, emp.categoryId) : 'Agente SERNIC');

                const fromDir = getName(data?.directorates, tr.fromDirectorateId || emp?.directorateId);
                const toDir = getName(data?.directorates, tr.toDirectorateId);
                const toProvince = tr.toProvinceId || 'Província Destino';

                const isPending = ['Pendente', 'Em elaboração', 'Submetida', 'Em análise'].includes(tr.status);

                return (
                  <tr key={tr.id} style={styles.tr}>
                    {/* Processo / Despacho */}
                    <td style={styles.td}>
                      <div style={styles.primaryText}>{tr.processNumber || `PROC-${tr.id.substring(0,6)}`}</div>
                      <div style={styles.secondaryText}>Despacho: <strong>{tr.documentNumber || '-'}</strong></div>
                      {tr.attachments && tr.attachments.length > 0 && (
                        <div style={styles.attachmentBadge}>
                          📎 {tr.attachments.length} Anexo(s)
                        </div>
                      )}
                    </td>

                    {/* Funcionário */}
                    <td style={styles.td}>
                      <div style={styles.primaryText}>{empName}</div>
                      <div style={styles.secondaryText}>NUIT/NIP: {empNip} • {empRole}</div>
                    </td>

                    {/* Movimentação */}
                    <td style={styles.td}>
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-primary)' }}>
                          {tr.type || 'Transferência'}
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{tr.reason || 'Necessidade de serviço'}</div>
                      </div>
                      <div style={styles.movementBox}>
                        <span style={styles.movementUnit} title={fromDir}>{fromDir || 'Origem'}</span>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>➔</span>
                        <span style={{ ...styles.movementUnit, color: '#2563eb', fontWeight: '700' }} title={`${toProvince} - ${toDir}`}>
                          {toProvince}: {toDir}
                        </span>
                      </div>
                    </td>

                    {/* Datas */}
                    <td style={styles.td}>
                      <div style={styles.dateGroup}>
                        <span style={styles.dateLabel}>Decisão:</span> 
                        <span style={styles.dateValue}>{tr.transferDate || '-'}</span>
                      </div>
                      <div style={styles.dateGroup}>
                        <span style={styles.dateLabel}>Efetivação:</span> 
                        <span style={styles.dateValue}>{tr.effectiveDate || '-'}</span>
                      </div>
                    </td>

                    {/* Estado */}
                    <td style={styles.td}>
                      {getStatusBadge(tr.status)}
                    </td>

                    {/* Ações CRUD */}
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        
                        {/* 👁️ Ver Detalhes */}
                        <button 
                          onClick={() => setViewingTransfer(tr)}
                          style={styles.btnActionIcon}
                          title="Visualizar Ficha Completa da Transferência"
                        >
                          👁️
                        </button>

                        {/* ✍️ Dar Conformidade / Aprovar */}
                        {isPending && isSuperAdmin && (
                          <button
                            onClick={() => handleStatusChange(tr.id, 'Aprovada')}
                            style={styles.btnApprove}
                            title="Aprovar e Dar Conformidade à Transferência"
                          >
                            ✍️ Aprovar
                          </button>
                        )}

                        {/* ✏️ Editar */}
                        <button
                          onClick={() => onEdit(tr)}
                          style={styles.btnActionIcon}
                          title="Editar Processo de Transferência"
                        >
                          ✏️
                        </button>

                        {/* 🗑️ Apagar */}
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Confirmar Eliminação Definitiva',
                              message: `Tem a certeza que deseja eliminar permanentemente o processo de transferência do funcionário ${empName}? Esta ação é irreversível.`,
                              isDestructive: true,
                              confirmText: 'Eliminar Processo',
                              onConfirm: () => onDelete(tr.id)
                            });
                          }}
                          style={styles.btnDeleteIcon}
                          title="Apagar Processo"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Ficha Completa do Processo de Transferência */}
      {viewingTransfer && (
        <DraggableModal
          isOpen={true}
          title={`Processo de Transferência: ${viewingTransfer.processNumber || viewingTransfer.id}`}
          onClose={() => setViewingTransfer(null)}
          maxWidth="680px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.05)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>FUNCIONÁRIO AFECTO</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-base)', marginTop: '2px' }}>{viewingTransfer.employeeName}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>NUIT / NIP: {viewingTransfer.employeeNip || 'N/D'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={styles.detailBox}>
                <div style={styles.detailLabel}>TIPO DE MOVIMENTAÇÃO</div>
                <div style={styles.detailVal}>{viewingTransfer.type || 'Transferência'}</div>
              </div>

              <div style={styles.detailBox}>
                <div style={styles.detailLabel}>ESTADO ATUAL</div>
                <div>{getStatusBadge(viewingTransfer.status)}</div>
              </div>

              <div style={styles.detailBox}>
                <div style={styles.detailLabel}>MOTIVO DECLARADO</div>
                <div style={styles.detailVal}>{viewingTransfer.reason || 'Necessidade de Serviço'}</div>
              </div>

              <div style={styles.detailBox}>
                <div style={styles.detailLabel}>ENTIDADE AUTORIZADORA</div>
                <div style={styles.detailVal}>{viewingTransfer.authorizedBy || 'Direção-Geral'}</div>
              </div>

              <div style={styles.detailBox}>
                <div style={styles.detailLabel}>Nº DO DESPACHO</div>
                <div style={styles.detailVal}>{viewingTransfer.documentNumber || '-'}</div>
              </div>

              <div style={styles.detailBox}>
                <div style={styles.detailLabel}>Nº DO OFÍCIO</div>
                <div style={styles.detailVal}>{viewingTransfer.officialLetterNumber || '-'}</div>
              </div>

              <div style={styles.detailBox}>
                <div style={styles.detailLabel}>DATA DA DECISÃO</div>
                <div style={styles.detailVal}>{viewingTransfer.transferDate || '-'}</div>
              </div>

              <div style={styles.detailBox}>
                <div style={styles.detailLabel}>DATA DE EFETIVAÇÃO</div>
                <div style={styles.detailVal}>{viewingTransfer.effectiveDate || '-'}</div>
              </div>
            </div>

            {/* Trajeto de Origem e Destino */}
            <div style={{ backgroundColor: 'var(--color-bg-base)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>TRAJETO DE LOTAÇÃO</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>ORIGEM</div>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>{getName(data?.directorates, viewingTransfer.fromDirectorateId)}</div>
                </div>
                <div style={{ fontSize: '20px', color: '#2563eb' }}>➔</div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>DESTINO ({viewingTransfer.toProvinceId || 'Província'})</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>{getName(data?.directorates, viewingTransfer.toDirectorateId)}</div>
                </div>
              </div>
            </div>

            {viewingTransfer.notes && (
              <div style={styles.detailBox}>
                <div style={styles.detailLabel}>OBSERVAÇÕES / JUSTIFICAÇÃO</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-base)', lineHeight: '1.4' }}>{viewingTransfer.notes}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button 
                onClick={() => setViewingTransfer(null)}
                style={styles.btnCancelModal}
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

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
  container: { display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' },
  filtersCard: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  filtersHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' },
  filtersTitle: { margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--color-text-base)' },
  resultsCount: { fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600', backgroundColor: 'var(--color-bg-base)', padding: '4px 10px', borderRadius: '12px' },
  btnTool: {
    padding: '6px 12px',
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-base)',
    cursor: 'pointer'
  },
  filtersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-muted)' },
  searchInput: { width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px', outline: 'none' },
  selectInput: { width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px', outline: 'none', cursor: 'pointer' },
  
  tableContainer: { overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  tr: { borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' },
  td: { padding: '14px 16px', verticalAlign: 'middle' },
  
  primaryText: { fontSize: '14px', fontWeight: '600', color: 'var(--color-text-base)', marginBottom: '2px' },
  secondaryText: { fontSize: '12px', color: 'var(--color-text-muted)' },
  
  dateGroup: { display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px' },
  dateLabel: { color: 'var(--color-text-muted)' },
  dateValue: { fontWeight: '600', color: 'var(--color-text-base)' },
  
  empty: { padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)' },
  
  badge: { padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center' },
  
  movementBox: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-bg-base)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', width: 'fit-content', marginTop: '4px' },
  movementUnit: { fontSize: '12px', fontWeight: '500', color: 'var(--color-text-base)', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  
  attachmentBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-muted)', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '11px', marginTop: '4px', fontWeight: '600' },
  
  btnActionIcon: { background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', padding: '6px 10px', fontSize: '13px' },
  btnDeleteIcon: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', cursor: 'pointer', padding: '6px 10px', fontSize: '13px' },
  btnApprove: { padding: '6px 12px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },

  detailBox: { backgroundColor: 'var(--color-bg-base)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)' },
  detailLabel: { fontSize: '10px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' },
  detailVal: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' },
  btnCancelModal: { padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: 'var(--color-text-base)' }
};
