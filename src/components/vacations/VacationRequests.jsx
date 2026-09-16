import React, { useState } from 'react';
import useVacationData from '../../hooks/useVacationData';
import useEmployeeData from '../../hooks/useEmployeeData';
import VacationForm from './VacationForm';
import ConfirmModal from '../ConfirmModal';
import StartVacationModal from './StartVacationModal';
import { exportToExcel } from '../../utils/excelExport';
import CrudActionButtons from '../common/CrudActionButtons';

export default function VacationRequests() {
  const { requests, updateRequestStatus, removeRequest, updateRequest } = useVacationData();
  const { employees } = useEmployeeData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });
  const [startModalReq, setStartModalReq] = useState(null);

  const handleStatusChange = async (id, currentStatus) => {
    const flow = {
      'Rascunho': 'Submetida',
      'Submetida': 'Em análise',
      'Em análise': 'Aprovada',
      'Aprovada': 'Em gozo',
      'Em gozo': 'Concluída'
    };
    
    if (flow[currentStatus]) {
      await updateRequestStatus(id, flow[currentStatus], 'Admin', 'Avanço de estado pelo Administrador');
    }
  };

  const handleReject = async (id) => {
    await updateRequestStatus(id, 'Rejeitada', 'Admin', 'Rejeitado pelo Administrador');
  };

  const handleCancel = async (id) => {
    await updateRequestStatus(id, 'Cancelada', 'Admin', 'Cancelamento administrativo');
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Pedido',
      message: 'Tem a certeza que deseja apagar definitivamente este pedido?',
      isDestructive: true,
      onConfirm: async () => {
        await removeRequest(id);
        setConfirmModal({ isOpen: false });
      }
    });
  };

  const handleStartVacation = async (reqId, base64File) => {
    await updateRequestStatus(reqId, 'Em gozo', 'Admin', 'Início de férias validado com senha e guia submetida');
    await updateRequest(reqId, { guia_inicio: base64File });
    setStartModalReq(null);
  };

  if (isFormOpen) {
    return <VacationForm onBack={() => setIsFormOpen(false)} requestToEdit={selectedRequest} />;
  }

  const handleExportExcel = () => {
    const exportData = requests.map(req => {
      const emp = employees.find(e => e.id === req.employeeId);
      return {
        'ID Pedido': req.id,
        'NUIT': emp ? emp.nuit : (req.employeeNip || 'N/D'),
        'Funcionário': emp ? emp.name : (req.employeeName || 'Desconhecido'),
        'Data Início': req.startDate,
        'Data Fim': req.endDate,
        'Dias': req.daysCount,
        'Ano Ref.': req.year,
        'Estado': req.status
      };
    });
    exportToExcel(exportData, 'Registos_FeriasLicencas');
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h3 style={styles.title}>Gestão de Solicitações</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportExcel} style={styles.btnExport}>
            📥 Exportar Excel
          </button>
          <button onClick={() => { setSelectedRequest(null); setIsFormOpen(true); }} style={styles.btnAdd}>
            + Nova Solicitação
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>ID Pedido</th>
              <th>NUIT</th>
              <th>Funcionário</th>
              <th>Período</th>
              <th>Dias</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="7" style={styles.empty}>Nenhuma solicitação encontrada.</td>
              </tr>
            ) : (
              // Order by created date descending
              [...requests].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(row => {
                const emp = employees.find(e => e.id === row.employeeId);
                return (
                <tr key={row.id} style={styles.tr}>
                  <td>{row.id}</td>
                  <td>{emp ? emp.nuit : row.employeeNip}</td>
                  <td><strong>{emp ? emp.name : row.employeeName}</strong></td>
                  <td>{row.startDate} a {row.endDate}</td>
                  <td><strong>{row.daysCount}</strong></td>
                  <td>
                    <span style={{...styles.badge, backgroundColor: getStatusColor(row.status)}}>{row.status}</span>
                  </td>
                  <td>
                    <CrudActionButtons 
                      onDelete={() => handleDelete(row.id)}
                      deleteTitle="Apagar Registro"
                      extraButtons={
                        <>
                          {!['Aprovada', 'Rejeitada', 'Cancelada', 'Concluída', 'Em gozo'].includes(row.status) && (
                            <>
                              <button onClick={() => handleStatusChange(row.id, row.status)} style={styles.btnApprove} title="Avançar Estado">✔️ Avançar</button>
                              <button onClick={() => handleReject(row.id)} style={styles.btnReject} title="Rejeitar">❌</button>
                            </>
                          )}
                          {row.status === 'Aprovada' && (
                            <button onClick={() => setStartModalReq(row)} style={styles.btnApprove} title="Iniciar Gozo">▶️ Iniciar</button>
                          )}
                          {row.status === 'Em gozo' && (
                            <button onClick={() => handleStatusChange(row.id, row.status)} style={styles.btnApprove} title="Concluir">🏁 Concluir</button>
                          )}
                          {['Aprovada', 'Submetida', 'Em análise'].includes(row.status) && (
                            <button onClick={() => handleCancel(row.id)} style={styles.btnReject} title="Cancelar">🚫 Cancelar</button>
                          )}
                        </>
                      }
                    />
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
        }}
        onCancel={() => setConfirmModal({ isOpen: false })}
        isDestructive={confirmModal.isDestructive}
      />

      {startModalReq && (
        <StartVacationModal 
          request={startModalReq} 
          onClose={() => setStartModalReq(null)}
          onStart={handleStartVacation}
        />
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
  container: { display: 'flex', flexDirection: 'column', gap: '16px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '18px', fontWeight: '600', color: 'var(--color-text-base)', margin: 0 },
  btnAdd: { padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' },
  btnExport: { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  tableContainer: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 16px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '600' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '12px 16px', color: 'var(--color-text-base)', fontSize: '14px' },
  empty: { padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' },
  badge: { padding: '4px 8px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600' },
  btnApprove: { padding: '4px 8px', backgroundColor: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  btnReject: { padding: '4px 8px', backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }
};
