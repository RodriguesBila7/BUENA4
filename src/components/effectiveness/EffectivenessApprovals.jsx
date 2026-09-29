import React, { useState, useMemo } from 'react';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import ConfirmModal from '../ConfirmModal';
import { formatDisplayDate } from '../../utils/vacationAlerts';

export default function EffectivenessApprovals({ user, orgData: passedOrgData, employeesData }) {
  const { records = [], updateRecord, deleteRecord } = useEffectivenessData();
  const { employees = [] } = useEmployeeData();
  const { data: hookOrgData } = useOrgData();

  const finalOrgData = passedOrgData?.data || passedOrgData || hookOrgData || {};
  const finalEmployees = employeesData?.employees || (Array.isArray(employeesData) ? employeesData : null) || employees || [];

  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecordForModal, setSelectedRecordForModal] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'APPROVE' | 'REJECT' | 'VIEW'
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '' });

  // Enriquecer registros com dados do funcionário
  const enrichedRecords = useMemo(() => {
    return records.map(rec => {
      const emp = finalEmployees.find(e => 
        e.id === rec.employeeId || 
        String(e.id) === String(rec.employee_id) ||
        (e.nip && String(e.nip) === String(rec.employeeNip || rec.nip)) ||
        (e.name && rec.employeeName && e.name.toLowerCase() === rec.employeeName.toLowerCase())
      ) || {};

      let deptName = 'Geral';
      if (finalOrgData.departments && emp.departmentId) {
        const d = finalOrgData.departments.find(dept => dept.id === emp.departmentId);
        if (d) deptName = d.name;
      }

      // Inferir status de aprovação
      // Se não tiver status gravado:
      // - Se o tipo for 'Pendente' ou tiver 'justification' sem aprovação formal -> 'Pendente'
      // - Se tipo for 'Justificada' ou tiver approvedAt -> 'Aprovada'
      // - Se tipo for 'Injustificada' -> 'Rejeitada' ou 'Injustificada'
      let status = rec.approvalStatus || rec.status;
      if (!status) {
        if (rec.type === 'Pendente' || (rec.justification && !rec.approvedAt && !rec.rejectedAt)) {
          status = 'Pendente';
        } else if (rec.type === 'Justificada' || rec.isJustified === true || rec.approvedAt) {
          status = 'Aprovada';
        } else {
          status = 'Registada (Injustificada)';
        }
      }

      return {
        ...rec,
        emp,
        employeeName: emp.name || rec.employeeName || 'Funcionário Não Identificado',
        employeeNip: emp.nip || rec.employeeNip || 'S/ NIP',
        departmentName: deptName,
        status,
        days: rec.daysCount || rec.days || rec.totalDays || 1,
        dateFormatted: formatDisplayDate(rec.startDate || rec.date || rec.createdAt),
        endDateFormatted: formatDisplayDate(rec.endDate || rec.startDate || rec.date)
      };
    });
  }, [records, finalEmployees, finalOrgData]);

  // Contagens
  const stats = useMemo(() => {
    const pending = enrichedRecords.filter(r => r.status === 'Pendente').length;
    const approved = enrichedRecords.filter(r => r.status === 'Aprovada').length;
    const rejected = enrichedRecords.filter(r => r.status === 'Rejeitada' || r.status === 'Registada (Injustificada)').length;
    return {
      total: enrichedRecords.length,
      pending,
      approved,
      rejected
    };
  }, [enrichedRecords]);

  // Filtragem
  const filteredRecords = useMemo(() => {
    return enrichedRecords.filter(r => {
      // Filtro de Status
      if (filterStatus === 'PENDING' && r.status !== 'Pendente') return false;
      if (filterStatus === 'APPROVED' && r.status !== 'Aprovada') return false;
      if (filterStatus === 'REJECTED' && r.status !== 'Rejeitada' && r.status !== 'Registada (Injustificada)') return false;

      // Filtro de Tipo
      if (filterType !== 'ALL' && r.type !== filterType) return false;

      // Pesquisa
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const mName = r.employeeName.toLowerCase().includes(term);
        const mNip = r.employeeNip.toLowerCase().includes(term);
        const mDept = r.departmentName.toLowerCase().includes(term);
        const mReason = (r.reason || r.justification || '').toLowerCase().includes(term);
        if (!mName && !mNip && !mDept && !mReason) return false;
      }

      return true;
    });
  }, [enrichedRecords, filterStatus, filterType, searchTerm]);

  // Ação de Despacho (Aprovar ou Rejeitar)
  const handleExecuteDispatch = async () => {
    if (!selectedRecordForModal || !modalAction) return;

    setIsProcessing(true);
    const nowIso = new Date().toISOString();
    const dispatcher = user?.username || user?.name || 'Chefia DRH';

    const updates = {
      approvalStatus: modalAction === 'APPROVE' ? 'Aprovada' : 'Rejeitada',
      status: modalAction === 'APPROVE' ? 'Aprovada' : 'Rejeitada',
      type: modalAction === 'APPROVE' ? 'Justificada' : 'Injustificada',
      isJustified: modalAction === 'APPROVE',
      dispatchedBy: dispatcher,
      dispatchedAt: nowIso,
      dispatchNotes: dispatchNotes || (modalAction === 'APPROVE' ? 'Justificação deferida pela Direcção' : 'Justificação indeferida'),
      updatedAt: nowIso
    };

    if (modalAction === 'APPROVE') {
      updates.approvedBy = dispatcher;
      updates.approvedAt = nowIso;
    } else {
      updates.rejectedBy = dispatcher;
      updates.rejectedAt = nowIso;
    }

    await updateRecord(selectedRecordForModal.id, updates);
    setIsProcessing(false);
    setSelectedRecordForModal(null);
    setModalAction(null);
    setDispatchNotes('');

    setConfirmModal({
      isOpen: true,
      title: modalAction === 'APPROVE' ? 'Justificação Deferida' : 'Justificação Indeferida',
      message: `O processo de falta do agente ${selectedRecordForModal.employeeName} foi atualizado com sucesso.`,
      hideCancel: true
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Aprovada':
        return { bg: '#ecfdf5', color: '#059669', border: '#059669', label: '✓ Aprovada (Justificada)' };
      case 'Rejeitada':
        return { bg: '#fef2f2', color: '#dc2626', border: '#dc2626', label: '✕ Rejeitada (Injustificada)' };
      case 'Pendente':
        return { bg: '#fffbeb', color: '#d97706', border: '#d97706', label: '⏳ Aguarda Despacho' };
      default:
        return { bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db', label: status };
    }
  };

  return (
    <div style={styles.container}>
      {/* CABEÇALHO */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>⚖️ Tramitação e Aprovação de Justificações de Faltas</h3>
          <p style={styles.subtitle}>
            Apreciação de atestados médicos, declarações e pedidos de justificação de ausências dos agentes.
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={styles.kpiGrid}>
        <div 
          style={{ ...styles.kpiCard, borderLeft: '4px solid #d97706', cursor: 'pointer' }}
          onClick={() => setFilterStatus(filterStatus === 'PENDING' ? 'ALL' : 'PENDING')}
        >
          <div style={styles.kpiTop}>
            <span style={styles.kpiIcon}>⏳</span>
            <span style={{ ...styles.kpiBadge, backgroundColor: '#fffbeb', color: '#d97706' }}>A Decidir</span>
          </div>
          <div style={styles.kpiValue}>{stats.pending}</div>
          <div style={styles.kpiLabel}>Justificações Pendentes</div>
          <div style={styles.kpiSub}>Aguardam despacho da Direcção/RH</div>
        </div>

        <div 
          style={{ ...styles.kpiCard, borderLeft: '4px solid #059669', cursor: 'pointer' }}
          onClick={() => setFilterStatus(filterStatus === 'APPROVED' ? 'ALL' : 'APPROVED')}
        >
          <div style={styles.kpiTop}>
            <span style={styles.kpiIcon}>✅</span>
            <span style={{ ...styles.kpiBadge, backgroundColor: '#ecfdf5', color: '#059669' }}>Deferidas</span>
          </div>
          <div style={styles.kpiValue}>{stats.approved}</div>
          <div style={styles.kpiLabel}>Faltas Justificadas</div>
          <div style={styles.kpiSub}>Aprovadas sem infração disciplinar</div>
        </div>

        <div 
          style={{ ...styles.kpiCard, borderLeft: '4px solid #dc2626', cursor: 'pointer' }}
          onClick={() => setFilterStatus(filterStatus === 'REJECTED' ? 'ALL' : 'REJECTED')}
        >
          <div style={styles.kpiTop}>
            <span style={styles.kpiIcon}>❌</span>
            <span style={{ ...styles.kpiBadge, backgroundColor: '#fef2f2', color: '#dc2626' }}>Indeferidas</span>
          </div>
          <div style={styles.kpiValue}>{stats.rejected}</div>
          <div style={styles.kpiLabel}>Faltas Injustificadas</div>
          <div style={styles.kpiSub}>Sujeitas a desconto e sanção legal</div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #1b365d' }}>
          <div style={styles.kpiTop}>
            <span style={styles.kpiIcon}>📋</span>
            <span style={{ ...styles.kpiBadge, backgroundColor: '#eff6ff', color: '#1b365d' }}>Total</span>
          </div>
          <div style={styles.kpiValue}>{stats.total}</div>
          <div style={styles.kpiLabel}>Total de Registos</div>
          <div style={styles.kpiSub}>Histórico geral de assiduidade</div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={styles.filterBar}>
        <div style={styles.tabButtons}>
          <button 
            style={filterStatus === 'ALL' ? styles.tabActive : styles.tabInactive}
            onClick={() => setFilterStatus('ALL')}
          >
            Todas ({stats.total})
          </button>
          <button 
            style={filterStatus === 'PENDING' ? styles.tabActive : styles.tabInactive}
            onClick={() => setFilterStatus('PENDING')}
          >
            Pendentes ({stats.pending})
          </button>
          <button 
            style={filterStatus === 'APPROVED' ? styles.tabActive : styles.tabInactive}
            onClick={() => setFilterStatus('APPROVED')}
          >
            Aprovadas ({stats.approved})
          </button>
          <button 
            style={filterStatus === 'REJECTED' ? styles.tabActive : styles.tabInactive}
            onClick={() => setFilterStatus('REJECTED')}
          >
            Injustificadas ({stats.rejected})
          </button>
        </div>

        <div style={styles.rightActions}>
          <input 
            type="text" 
            placeholder="Pesquisar por agente, NIP, unidade..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={styles.searchInput} 
          />
        </div>
      </div>

      {/* TABELA DE APROVAÇÕES */}
      {filteredRecords.length === 0 ? (
        <div style={styles.emptyBox}>
          <span style={{ fontSize: '36px' }}>📂</span>
          <h4 style={{ margin: '8px 0 4px 0', color: 'var(--color-text-base)' }}>
            Nenhum registo encontrado para este filtro
          </h4>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Não existem faltas com o estado ou termo de pesquisa selecionado.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <table className="premium-table" style={{ width: '100%', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                <th style={styles.th}>Agente / Funcionário</th>
                <th style={styles.th}>Unidade Orgânica</th>
                <th style={styles.th}>Período & Dias</th>
                <th style={styles.th}>Motivo / Justificação</th>
                <th style={styles.th}>Estado Atual</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Despacho / Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(rec => {
                const badge = getStatusBadge(rec.status);
                return (
                  <tr key={rec.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: '700', color: 'var(--color-text-base)' }}>
                        {rec.employeeName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        NIP: {rec.employeeNip}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-base)' }}>
                        {rec.departmentName}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <div style={{ fontWeight: '600', color: 'var(--color-text-base)' }}>
                        {rec.dateFormatted}
                        {rec.dateFormatted !== rec.endDateFormatted && ` até ${rec.endDateFormatted}`}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                        {rec.days} dia{rec.days > 1 ? 's' : ''} de ausência
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={{ maxWidth: '280px', lineHeight: '1.4' }}>
                        <strong>{rec.type || 'Falta'}:</strong> {rec.reason || rec.justification || 'Sem justificação especificada'}
                      </div>
                      {rec.dispatchNotes && (
                        <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', fontStyle: 'italic' }}>
                          Despacho: "{rec.dispatchNotes}" por {rec.dispatchedBy || 'DRH'}
                        </div>
                      )}
                    </td>

                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        display: 'inline-block'
                      }}>
                        {badge.label}
                      </span>
                    </td>

                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        {rec.status !== 'Aprovada' && (
                          <button
                            onClick={() => {
                              setSelectedRecordForModal(rec);
                              setModalAction('APPROVE');
                              setDispatchNotes('Justificação aceite nos termos legais.');
                            }}
                            style={styles.btnApprove}
                            title="Aprovar e considerar Falta Justificada"
                          >
                            ✓ Aprovar
                          </button>
                        )}

                        {rec.status !== 'Rejeitada' && rec.status !== 'Registada (Injustificada)' && (
                          <button
                            onClick={() => {
                              setSelectedRecordForModal(rec);
                              setModalAction('REJECT');
                              setDispatchNotes('Justificação não apresentada no prazo legal / não aceite.');
                            }}
                            style={styles.btnReject}
                            title="Rejeitar e manter Falta Injustificada"
                          >
                            ✕ Rejeitar
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedRecordForModal(rec);
                            setModalAction('VIEW');
                          }}
                          style={styles.btnView}
                          title="Ver detalhes do processo"
                        >
                          👁️ Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE DESPACHO / DECISÃO */}
      {selectedRecordForModal && modalAction && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--color-text-base)' }}>
                {modalAction === 'APPROVE' && '✅ Despacho de Deferimento (Aprovar Justificação)'}
                {modalAction === 'REJECT' && '❌ Despacho de Indeferimento (Rejeitar Justificação)'}
                {modalAction === 'VIEW' && '📄 Processo de Falta e Justificação'}
              </h3>
              <button onClick={() => setSelectedRecordForModal(null)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.infoBox}>
                <div><strong>Funcionário:</strong> {selectedRecordForModal.employeeName} (NIP: {selectedRecordForModal.employeeNip})</div>
                <div><strong>Unidade:</strong> {selectedRecordForModal.departmentName}</div>
                <div><strong>Período:</strong> {selectedRecordForModal.dateFormatted} ({selectedRecordForModal.days} dias)</div>
                <div><strong>Motivo Alegado:</strong> {selectedRecordForModal.reason || selectedRecordForModal.justification || 'N/A'}</div>
              </div>

              {modalAction !== 'VIEW' ? (
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--color-text-base)' }}>
                    Fundamentação do Despacho da Chefia:
                  </label>
                  <textarea 
                    rows={4}
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    style={styles.textarea}
                    placeholder="Insira as observações oficiais do despacho..."
                  />
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                    {modalAction === 'APPROVE' 
                      ? 'Ao aprovar, a falta é convertida em "Justificada" sem aplicação de sansão disciplinar.'
                      : 'Ao rejeitar, a falta é mantida como "Injustificada" e sujeita ao desconto salarial e cômputo disciplinar.'}
                  </p>
                </div>
              ) : (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--color-primary)' }}>Histórico de Tramitação</h4>
                  <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--color-text-base)' }}>
                    <div><strong>Estado:</strong> {selectedRecordForModal.status}</div>
                    <div><strong>Despachado por:</strong> {selectedRecordForModal.dispatchedBy || selectedRecordForModal.approvedBy || 'Pendente'}</div>
                    <div><strong>Data do Despacho:</strong> {formatDisplayDate(selectedRecordForModal.dispatchedAt || selectedRecordForModal.approvedAt)}</div>
                    <div><strong>Observações:</strong> {selectedRecordForModal.dispatchNotes || 'Nenhuma observação registada.'}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setSelectedRecordForModal(null)} style={styles.btnCancel}>
                Fechar
              </button>

              {modalAction === 'APPROVE' && (
                <button onClick={handleExecuteDispatch} disabled={isProcessing} style={styles.btnConfirmApprove}>
                  {isProcessing ? 'A processar...' : '✓ Confirmar e Deferir Falta'}
                </button>
              )}

              {modalAction === 'REJECT' && (
                <button onClick={handleExecuteDispatch} disabled={isProcessing} style={styles.btnConfirmReject}>
                  {isProcessing ? 'A processar...' : '✕ Confirmar Indeferimento'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        hideCancel={confirmModal.hideCancel}
      />
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' },
  header: {
    backgroundColor: 'var(--color-bg-elevated)',
    padding: '18px 20px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)'
  },
  title: { fontSize: '18px', fontWeight: '700', color: 'var(--color-text-base)', margin: '0 0 4px 0' },
  subtitle: { fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' },
  kpiCard: {
    backgroundColor: 'var(--color-bg-elevated)',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  kpiTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' },
  kpiIcon: { fontSize: '18px' },
  kpiBadge: { fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' },
  kpiValue: { fontSize: '26px', fontWeight: '800', color: 'var(--color-text-base)' },
  kpiLabel: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' },
  kpiSub: { fontSize: '11px', color: 'var(--color-text-muted)' },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    backgroundColor: 'var(--color-bg-elevated)',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)'
  },
  tabButtons: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tabActive: {
    padding: '6px 12px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  tabInactive: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  rightActions: { display: 'flex', alignItems: 'center', gap: '10px' },
  searchInput: {
    padding: '6px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-base)',
    fontSize: '13px',
    minWidth: '220px'
  },
  emptyBox: {
    backgroundColor: 'var(--color-bg-elevated)',
    padding: '40px 20px',
    borderRadius: '8px',
    border: '1px dashed var(--color-border)',
    textAlign: 'center'
  },
  th: { padding: '12px 14px', textAlign: 'left', fontWeight: '600' },
  td: { padding: '12px 14px', verticalAlign: 'middle' },
  btnApprove: {
    padding: '5px 10px',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  btnReject: {
    padding: '5px 10px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  btnView: {
    padding: '5px 10px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modalBox: {
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '540px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)'
  },
  modalBody: { padding: '20px' },
  infoBox: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '12px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    lineHeight: '1.6',
    color: 'var(--color-text-base)',
    border: '1px solid var(--color-border)'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-base)',
    fontSize: '13px',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    boxSizing: 'border-box'
  },
  modalFooter: {
    padding: '14px 20px',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  btnCancel: {
    padding: '8px 14px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  btnConfirmApprove: {
    padding: '8px 16px',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  btnConfirmReject: {
    padding: '8px 16px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '700',
    cursor: 'pointer'
  }
};
