import React, { useState, useMemo } from 'react';
import useAdminActsData from '../../../hooks/useAdminActsData';
import useObitosData from '../../../hooks/useObitosData';
import useEmployeeData from '../../../hooks/useEmployeeData';
import useOrgData from '../../../hooks/useOrgData';
import EmployeeDetailsModal from '../../employees/EmployeeDetailsModal';
import EmployeeSearchModal from '../EmployeeSearchModal';
import AdminActWizard from '../../employees/acts/AdminActWizard';
import AdminActsAnalytics from '../AdminActsAnalytics';
import ObitosWorkflowModal from './ObitosWorkflowModal';
import { useAuth } from '../../../contexts/AuthContext';
import ConfirmModal from '../../ConfirmModal';
import { exportToExcel } from '../../../utils/excelExport';
import CrudActionButtons from '../../common/CrudActionButtons';
import EditActModal from '../EditActModal';

export default function ObitosManager() {
  const { user } = useAuth();
  const { acts, deleteAct, updateAct, fetchData } = useAdminActsData();
  const { workflows, initializeWorkflow, completeStep1, completeStep2, completeStep3, approveWorkflow, deleteWorkflow } = useObitosData();
  const { employees, updateEmployee } = useEmployeeData();
  const orgData = useOrgData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAct, setSelectedAct] = useState(null);
  const [editingAct, setEditingAct] = useState(null);
  const [viewDetailsEmp, setViewDetailsEmp] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });
  const [viewMode, setViewMode] = useState('lista'); // 'lista' ou 'estatisticas'
  
  // Add Act Flow
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  const handleSelectEmployee = (emp) => {
    setSelectedEmp(emp);
    setIsSearchOpen(false);
  };

  const handleCloseWizard = () => {
    setSelectedEmp(null);
    fetchData();
  };

  // Filtrar atos apenas de Óbito
  const obitosActs = useMemo(() => {
    return (acts || []).filter(act => act.actType === 'Óbito');
  }, [acts]);

  // Juntar atos administrativos de óbito com o workflow
  const combinedData = useMemo(() => {
    return obitosActs.map(act => {
      const workflow = workflows.find(w => w.employeeId === act.employeeId);
      const emp = employees.find(e => e.id === act.employeeId);
      return {
        ...act,
        employeeName: emp ? emp.name : (act.employeeName || 'Desconhecido'),
        employeeNip: emp ? emp.nuit : (act.employeeNip || '-'),
        workflow: workflow || { step: 0, isCompleted: false }
      };
    }).filter(item => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return item.employeeName?.toLowerCase().includes(term) || item.employeeNip?.toLowerCase().includes(term);
    }).sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [obitosActs, workflows, searchTerm]);

  const handleExportExcel = () => {
    const exportData = combinedData.map(act => ({
      'Data de Óbito': act.date,
      'NUIT/NIP': act.employeeNip,
      'Funcionário': act.employeeName,
      'Nº Despacho': act.dispatchNumber || '-',
      'Estado': act.workflow.isCompleted ? 'Concluído' : act.workflow.awaitingApproval ? 'Aguardando Aprovação' : `Pendente (Etapa ${act.workflow.step || 1}/3)`
    }));
    exportToExcel(exportData, 'Registos_Obitos');
  };

  const handleOpenWorkflow = (act) => {
    const wf = initializeWorkflow(act.employeeId);
    setSelectedAct({ act, workflow: wf });
  };

  const handleCloseModal = () => {
    setSelectedAct(null);
  };

  const handleStep1 = (wfId, docName) => {
    completeStep1(wfId, docName);
    setSelectedAct(prev => ({ ...prev, workflow: { ...prev.workflow, step: 2, docSuspensao: docName } }));
  };

  const handleStep2 = (wfId, docName) => {
    completeStep2(wfId, docName);
    setSelectedAct(prev => ({ ...prev, workflow: { ...prev.workflow, step: 3, docCertidao: docName } }));
  };

  const handleStep3 = (wfId) => {
    completeStep3(wfId);
    setSelectedAct(prev => ({ ...prev, workflow: { ...prev.workflow, step: 4, awaitingApproval: true, subsidioProcessado: true } }));
  };

  const handleApprove = (wfId) => {
    approveWorkflow(wfId);
    setSelectedAct(prev => ({ ...prev, workflow: { ...prev.workflow, isCompleted: true, awaitingApproval: false } }));
  };

  const handleDelete = (actId, wfId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Registo de Óbito',
      message: 'Aviso: Esta ação irá apagar definitivamente o registo de óbito e o fluxo associado. Deseja continuar?',
      isDestructive: true,
      onConfirm: () => {
        deleteAct(actId);
        if (wfId) deleteWorkflow(wfId);
      }
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            style={{...styles.tabBtn, ...(viewMode === 'lista' ? styles.tabBtnActive : {})}} 
            onClick={() => setViewMode('lista')}
          >
            📋 Lista de Óbitos
          </button>
          <button 
            style={{...styles.tabBtn, ...(viewMode === 'estatisticas' ? styles.tabBtnActive : {})}} 
            onClick={() => setViewMode('estatisticas')}
          >
            📊 Estatísticas Analíticas
          </button>
        </div>
        
        {viewMode === 'lista' && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Pesquisar funcionário ou NUIT..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <button onClick={handleExportExcel} style={styles.btnExport}>
              📥 Exportar Excel
            </button>
            <button onClick={() => setIsSearchOpen(true)} style={styles.btnAdd}>
              + Novo Registo de Óbito
            </button>
          </div>
        )}
      </div>

      {viewMode === 'estatisticas' ? (
        <AdminActsAnalytics acts={obitosActs} title="Óbitos" />
      ) : (
        <div style={styles.tableContainer}>
          <table className="premium-table">
            <thead>
            <tr>
              <th>Data de Óbito</th>
              <th>NUIT</th>
              <th>Funcionário</th>
              <th>Nº Despacho / Doc.</th>
              <th>Estado do Processo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {combinedData.length === 0 ? (
              <tr>
                <td colSpan="6" style={styles.empty}>Nenhum óbito registado correspondente à pesquisa.</td>
              </tr>
            ) : (
              combinedData.map(row => (
                <tr key={row.id} style={styles.tr}>
                  <td>{row.date}</td>
                  <td><strong>{row.employeeNip}</strong></td>
                  <td>{row.employeeName}</td>
                  <td>{row.dispatchNumber || '-'}</td>
                  <td>
                    <span style={{...styles.badge, backgroundColor: row.workflow.isCompleted ? '#10B981' : row.workflow.awaitingApproval ? '#F59E0B' : '#6B7280'}}>
                      {row.workflow.isCompleted ? 'Concluído' : row.workflow.awaitingApproval ? 'Aguardando Aprovação' : `Pendente (Etapa ${row.workflow.step || 1}/3)`}
                    </span>
                  </td>
                  <td>
                    <CrudActionButtons 
                      onView={() => {
                        const emp = employees.find(e => e.id === row.employeeId);
                        setViewDetailsEmp(emp);
                      }}
                      onProceed={() => handleOpenWorkflow(row)}
                      onEdit={() => setEditingAct(row)}
                      onDelete={() => handleDelete(row.id, row.workflow.id)}
                      viewTitle="Ver Ficha do Funcionário"
                      proceedTitle="Gerir Processo de Óbito"
                      editTitle="Editar Registo"
                      deleteTitle="Apagar Registo"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {selectedAct && (
        <ObitosWorkflowModal 
          workflow={selectedAct.workflow} 
          employee={{ id: selectedAct.act.employeeId, name: selectedAct.act.employeeName, nip: selectedAct.act.employeeNip }} 
          onClose={handleCloseModal}
          onCompleteStep1={handleStep1}
          onCompleteStep2={handleStep2}
          onCompleteStep3={handleStep3}
          onApprove={handleApprove}
          onReactivate={async (empId) => {
            const fullEmp = employees.find(e => e.id === empId);
            if (!fullEmp) return;
            const res = await updateEmployee(empId, { ...fullEmp, status: 'Ativo', isActive: true });
            if (res.success) {
              await deleteAct(selectedAct.act.id);
              if (selectedAct.workflow?.id) {
                await deleteWorkflow(selectedAct.workflow.id);
              }
              setConfirmModal({
                isOpen: true,
                title: 'Sucesso',
                message: 'Funcionário reativado com sucesso!',
                onConfirm: () => {
                  setConfirmModal({ isOpen: false });
                  handleCloseModal();
                },
                hideCancel: true,
                confirmText: 'OK'
              });
            } else {
              setConfirmModal({
                isOpen: true,
                title: 'Erro',
                message: 'Erro ao reativar funcionário: ' + res.error,
                onConfirm: () => setConfirmModal({ isOpen: false }),
                hideCancel: true,
                confirmText: 'OK',
                isDestructive: true
              });
            }
          }}
        />
      )}

      {editingAct && (
        <EditActModal 
          act={editingAct}
          onClose={() => setEditingAct(null)}
          onSave={(updatedAct) => {
            updateAct(updatedAct.id, updatedAct);
            setEditingAct(null);
          }}
        />
      )}

      {viewDetailsEmp && (
        <EmployeeDetailsModal 
          emp={viewDetailsEmp} 
          orgData={orgData} 
          onClose={() => setViewDetailsEmp(null)} 
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
        hideCancel={confirmModal.hideCancel}
        confirmText={confirmModal.confirmText}
      />

      <EmployeeSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        employees={employees} 
        onSelect={handleSelectEmployee} 
      />

      {selectedEmp && (
        <AdminActWizard 
          emp={selectedEmp} 
          orgData={{ data: orgData.data }} 
          allowedActTypes={['Óbito']}
          onClose={handleCloseWizard} 
          onActRegistered={handleCloseWizard}
        />
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  tabBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    borderColor: 'var(--color-primary)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  searchInput: { padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px', width: '300px' },
  btnAdd: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnExport: {
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-main)',
    border: '1px solid var(--color-border)',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tableContainer: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 16px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '12px 16px', color: 'var(--color-text-main)', fontSize: '14px', verticalAlign: 'middle' },
  empty: { padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' },
  badge: { padding: '4px 8px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600' },
  btnAction: { padding: '6px 12px', backgroundColor: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  btnDelete: { padding: '6px 10px', backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }
};
