import React, { useState, useMemo } from 'react';
import useAdminActsData from '../../../hooks/useAdminActsData';
import useReservaReformaData from '../../../hooks/useReservaReformaData';
import useEmployeeData from '../../../hooks/useEmployeeData';
import useOrgData from '../../../hooks/useOrgData';
import { exportToExcel } from '../../../utils/excelExport';
import ReservaReformaWorkflowModal from './ReservaReformaWorkflowModal';
import EmployeeSearchModal from '../EmployeeSearchModal';
import AdminActWizard from '../../employees/acts/AdminActWizard';
import EmployeeDetailsModal from '../../employees/EmployeeDetailsModal';
import CrudActionButtons from '../../common/CrudActionButtons';
import ConfirmModal from '../../ConfirmModal';
import EditActModal from '../EditActModal';

export default function ReservaReformaManager() {
  const { acts, deleteAct, saveAct, updateAct, fetchData } = useAdminActsData();
  const { workflows, initializeWorkflow, completeStep1, completeStep2, deleteWorkflow } = useReservaReformaData();
  const { employees, updateEmployee } = useEmployeeData();
  const orgData = useOrgData();

  const [activeTab, setActiveTab] = useState('Reserva'); // 'Reserva' ou 'Reforma'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAct, setSelectedAct] = useState(null); // Para abrir o workflow modal
  
  // Create New Act
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // View Details and Editing
  const [viewDetailsEmp, setViewDetailsEmp] = useState(null);
  const [editingAct, setEditingAct] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });

  // Filter Acts by Active Tab
  const tabActs = useMemo(() => {
    return (acts || []).filter(act => act.actType === activeTab);
  }, [acts, activeTab]);

  // Combine with Workflow and Employee data
  const combinedData = useMemo(() => {
    const wfMap = new Map();
    workflows.forEach(w => wfMap.set(w.actId, w));

    const empMap = new Map();
    employees.forEach(e => empMap.set(e.id, e));

    return tabActs.map(act => {
      const workflow = wfMap.get(act.id) || { step: 1, isCompleted: false };
      const emp = empMap.get(act.employeeId);
      
      // Calculate years in reserve if it's 'Reserva' and completed
      let yearsInReserve = 0;
      if (activeTab === 'Reserva' && workflow.isCompleted && workflow.completedAt) {
        const completedDate = new Date(workflow.completedAt);
        const now = new Date();
        yearsInReserve = (now - completedDate) / (1000 * 60 * 60 * 24 * 365.25);
      }

      return {
        ...act,
        employeeName: emp ? emp.name : (act.employeeName || 'Desconhecido'),
        employeeNip: emp ? emp.nuit : (act.employeeNip || '-'),
        workflow,
        yearsInReserve
      };
    }).filter(item => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return item.employeeName?.toLowerCase().includes(term) || item.employeeNip?.toLowerCase().includes(term);
    }).sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [tabActs, workflows, employees, searchTerm, activeTab]);

  const handleExportExcel = () => {
    const exportData = combinedData.map(act => ({
      'Data': act.date,
      'NUIT': act.employeeNip,
      'Funcionário': act.employeeName,
      'Nº Processo': act.workflow.processNumber || '-',
      'Nº Despacho': act.workflow.dispatchNumber || '-',
      'Estado': act.workflow.isCompleted ? 'Finalizado (Inativo)' : `Pendente (Etapa ${act.workflow.step})`
    }));
    exportToExcel(exportData, `Registos_${activeTab}`);
  };

  const handleOpenWorkflow = (act) => {
    let wf = workflows.find(w => w.actId === act.id);
    if (!wf) {
      wf = initializeWorkflow(act.id, act.employeeId);
    }
    setSelectedAct({ act, workflow: wf });
  };

  const handleDelete = (actId, wfId) => {
    setConfirmModal({
      isOpen: true,
      title: `Apagar Registo de ${activeTab}`,
      message: 'Aviso: Esta ação irá apagar definitivamente o registo e o processo. Deseja continuar?',
      isDestructive: true,
      onConfirm: () => {
        deleteAct(actId);
        if (wfId) deleteWorkflow(wfId);
      }
    });
  };

  const handleTransferToReforma = (act) => {
    setConfirmModal({
      isOpen: true,
      title: 'Passar à Reforma',
      message: `O funcionário ${act.employeeName} já cumpriu mais de 5 anos na Reserva. Deseja transferi-lo definitivamente para a Reforma?`,
      confirmText: 'Transferir para Reforma',
      onConfirm: async () => {
        // Create Reforma Act
        const newActId = await saveAct({
          employeeId: act.employeeId,
          employeeName: act.employeeName,
          employeeNip: act.employeeNip,
          actType: 'Reforma',
          date: new Date().toISOString().split('T')[0],
          description: 'Transferência automática de Reserva para Reforma (limite de 5 anos).'
        });
        
        // Update Employee status
        const emp = employees.find(e => e.id === act.employeeId);
        if (emp) {
          await updateEmployee(emp.id, { ...emp, status: 'Reforma', isActive: false });
        }

        // Initialize new workflow as already completed
        const wf = initializeWorkflow(newActId, act.employeeId);
        completeStep1(wf.id, 'PROC-AUTO-REFORMA');
        completeStep2(wf.id, 'DESP-AUTO-REFORMA');

        // Delete old Reserva act
        deleteAct(act.id);
        if (act.workflow.id) deleteWorkflow(act.workflow.id);
      }
    });
  };

  // Workflow Modal Actions
  const handleCompleteStep1 = (wfId, processNumber) => {
    completeStep1(wfId, processNumber);
    setSelectedAct(prev => ({ ...prev, workflow: { ...prev.workflow, step: 2, processNumber } }));
  };

  const handleCompleteStep2 = async (wfId, dispatchNumber) => {
    completeStep2(wfId, dispatchNumber);
    setSelectedAct(prev => ({ ...prev, workflow: { ...prev.workflow, step: 3, dispatchNumber, isCompleted: true } }));
    
    // Deactivate employee upon finalization
    const emp = employees.find(e => e.id === selectedAct.act.employeeId);
    if (emp) {
      await updateEmployee(emp.id, { ...emp, status: activeTab, isActive: false });
    }
  };

  const handleReactivate = async (empId, dispatchNumber) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    
    const res = await updateEmployee(empId, { ...emp, status: 'Ativo', isActive: true });
    if (res.success) {
      // Create a Reativação log or simply delete the Reserva act
      await deleteAct(selectedAct.act.id);
      if (selectedAct.workflow?.id) {
        await deleteWorkflow(selectedAct.workflow.id);
      }
      setConfirmModal({
        isOpen: true,
        title: 'Sucesso',
        message: `Funcionário reativado com sucesso (Despacho: ${dispatchNumber}). O registo de Reserva foi arquivado/apagado.`,
        hideCancel: true,
        confirmText: 'OK',
        onConfirm: () => {
          setSelectedAct(null);
        }
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao reativar funcionário: ' + res.error,
        hideCancel: true,
        confirmText: 'OK',
        isDestructive: true
      });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.tabsContainer}>
        <button 
          style={activeTab === 'Reserva' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('Reserva')}
        >
          Reserva
        </button>
        <button 
          style={activeTab === 'Reforma' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('Reforma')}
        >
          Reforma
        </button>
      </div>

      <div style={styles.toolbar}>
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
            + Nova Solicitação ({activeTab})
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Funcionário</th>
              <th>Nº Processo</th>
              <th>Nº Despacho</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {combinedData.length === 0 ? (
              <tr>
                <td colSpan="6" style={styles.empty}>Nenhum registo de {activeTab} encontrado.</td>
              </tr>
            ) : (
              combinedData.map(row => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>
                    <div><strong>{row.employeeName}</strong></div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>NUIT: {row.employeeNip}</div>
                  </td>
                  <td>{row.workflow.processNumber || '-'}</td>
                  <td>{row.workflow.dispatchNumber || '-'}</td>
                  <td>
                    <span className="premium-badge" style={{ backgroundColor: row.workflow.isCompleted ? '#FEE2E2' : '#FEF3C7', color: row.workflow.isCompleted ? '#991B1B' : '#B45309' }}>
                      {row.workflow.isCompleted ? 'Finalizado (Inativo)' : `Pendente (Passo ${row.workflow.step})`}
                    </span>
                    {activeTab === 'Reserva' && row.yearsInReserve >= 5 && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={styles.alertText}>⚠️ +5 Anos na Reserva</span>
                      </div>
                    )}
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
                      viewTitle="Ver Funcionário"
                      proceedTitle="Gerir Processo"
                      editTitle="Editar Registo"
                      deleteTitle="Apagar Registo"
                    />
                    {activeTab === 'Reserva' && row.yearsInReserve >= 5 && (
                      <button 
                        onClick={() => handleTransferToReforma(row)}
                        style={styles.btnTransfer}
                      >
                        Transferir p/ Reforma
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedAct && (
        <ReservaReformaWorkflowModal 
          act={selectedAct.act}
          workflow={selectedAct.workflow}
          employee={{ id: selectedAct.act.employeeId, name: selectedAct.act.employeeName, nip: selectedAct.act.employeeNip }}
          onClose={() => setSelectedAct(null)}
          onCompleteStep1={handleCompleteStep1}
          onCompleteStep2={handleCompleteStep2}
          onReactivate={handleReactivate}
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

      <EmployeeSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        employees={employees} 
        onSelect={(emp) => {
          setSelectedEmp(emp);
          setIsSearchOpen(false);
        }} 
      />

      {selectedEmp && (
        <AdminActWizard 
          emp={selectedEmp} 
          orgData={{ data: orgData.data }} 
          allowedActTypes={[activeTab]}
          onClose={() => setSelectedEmp(null)} 
          onActRegistered={() => {
            setSelectedEmp(null);
            fetchData();
          }}
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
    </div>
  );
}

const styles = {
  container: { padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '20px' },
  tabsContainer: { display: 'flex', borderBottom: '2px solid #E2E8F0', marginBottom: '10px' },
  tab: { padding: '12px 24px', backgroundColor: 'transparent', border: 'none', color: '#64748B', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  activeTab: { padding: '12px 24px', backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid #E11D48', marginBottom: '-2px', color: '#E11D48', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  searchInput: { padding: '10px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', width: '320px' },
  btnAdd: { backgroundColor: '#C81E1E', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnExport: { backgroundColor: '#fff', color: '#334155', border: '1px solid #CBD5E1', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  tableContainer: { overflowX: 'auto', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#fff' },
  empty: { padding: '30px', textAlign: 'center', color: '#64748B' },
  alertText: { fontSize: '11px', color: '#DC2626', fontWeight: '700', backgroundColor: '#FEE2E2', padding: '2px 6px', borderRadius: '4px' },
  btnTransfer: { marginTop: '8px', padding: '6px 12px', backgroundColor: '#F3F4F6', color: '#1F2937', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }
};
