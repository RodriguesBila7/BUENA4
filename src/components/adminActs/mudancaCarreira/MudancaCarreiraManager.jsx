import React, { useMemo, useState } from 'react';
import useEmployeeData from '../../../hooks/useEmployeeData';
import useOrgData from '../../../hooks/useOrgData';
import GenericAdminActsList from '../GenericAdminActsList';
import MudancaCarreiraWizard from './MudancaCarreiraWizard';
import MudancaCarreiraHistory from './MudancaCarreiraHistory';
import ConfirmModal from '../../ConfirmModal';
import EmployeeSearchModal from '../EmployeeSearchModal';
import useAdminActsData from '../../../hooks/useAdminActsData';
import CrudActionButtons from '../../common/CrudActionButtons';
import EmployeeDetailsModal from '../../employees/EmployeeDetailsModal';
import EmployeeForm from '../../employees/EmployeeForm';
import ReactDOM from 'react-dom';
import useDraggable from '../../../hooks/useDraggable';

function EmployeeEditModalWrapper({ employees, orgData, editingEmpId, onClose, updateEmployee, setNotification }) {
  const { position, onPointerDown } = useDraggable();
  
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return ReactDOM.createPortal(
    <div style={styles.fullscreenModalOverlay} onClick={handleOverlayClick}>
      <div style={{ ...styles.fullscreenModalContent, transform: `translate(${position.x}px, ${position.y}px)` }} onClick={e => e.stopPropagation()}>
        <div style={styles.dragHeader} onPointerDown={onPointerDown} className="drag-handle">
           <span style={{fontWeight: 'bold', color: 'var(--color-text-main)'}}>Editar Detalhes</span>
           <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={{ padding: '0 20px 20px 20px', overflowY: 'auto', maxHeight: 'calc(90vh - 60px)' }}>
          <EmployeeForm 
            employees={employees}
            orgData={{ data: orgData }}
            editingEmpId={editingEmpId}
            onSave={async (id, data) => {
              const res = await updateEmployee(id, data);
              if (res.success) {
                setNotification({ isOpen: true, title: 'Sucesso', message: 'Funcionário atualizado com sucesso!', isError: false });
              }
              return res;
            }}
            onCancel={onClose}
            onSaved={onClose}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function MudancaCarreiraManager({ actsInGroup }) {
  const { employees, updateEmployee, deleteEmployee } = useEmployeeData();
  const { data: orgData } = useOrgData();
  const { acts, addAct } = useAdminActsData();
  const [activeSubTab, setActiveSubTab] = useState('avaliacao');
  
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', isError: false });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, empId: null });

  const [viewDetailsEmp, setViewDetailsEmp] = useState(null);
  const [editFormEmpId, setEditFormEmpId] = useState(null);

  const getName = (list, id) => list?.find(item => item.id === id)?.name || '-';

  const eligibleEmployees = useMemo(() => {
    if (!employees || !orgData || !orgData.categories || !orgData.careers) return [];

    const higherEdLevels = ['Licenciatura', 'Mestrado', 'Doutoramento', 'Pós-Graduação', 'Nível Superior', 'Mestrado Integrado'];

    return employees.filter(emp => {
      // 1. Categoria e Carreira
      const categoryName = getName(orgData.categories, emp.categoryId) || '';
      const careerName = getName(orgData.careers, emp.careerId) || '';

      const isQuadroTecnicoComum = careerName.toLowerCase().includes('quadro t');
      const allowedCategoryPrefixes = [
        'técnico de papiloscopia', 
        'técnico da técnica criminalística', 
        'agente de investigação e instrução criminal', 
        'agente de investigação operativa'
      ];
      const isAllowedSpecificCategory = allowedCategoryPrefixes.some(prefix => 
        categoryName.toLowerCase().includes(prefix)
      );

      if (!isQuadroTecnicoComum && !isAllowedSpecificCategory) return false;

      // 2. Formação Superior
      const hasHigherEd = higherEdLevels.includes(emp.academicLevel) || 
        (emp.academicHistory && emp.academicHistory.some(h => higherEdLevels.includes(h.level)));
      if (!hasHigherEd) return false;

      // 3. Tempo de Serviço (4 anos)
      if (!emp.admissionDate) return false;
      const admission = new Date(emp.admissionDate);
      if (isNaN(admission)) return false;
      const diff = Date.now() - admission.getTime();
      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      if (years < 4) return false;

      return true;
    });
  }, [employees, orgData]);

  const viewEmployeeDetails = (empId) => {
    const emp = employees.find(e => e.id === empId);
    if (emp) setViewDetailsEmp(emp);
  };

  const editEmployee = (empId) => {
    setEditFormEmpId(empId);
  };

  const handleDeleteEmployee = async (empId) => {
    const res = await deleteEmployee(empId);
    if (!res.success) {
      setNotification({ isOpen: true, title: 'Erro', message: 'Falha ao apagar funcionário: ' + res.error, isError: true });
    }
    setConfirmDelete({ isOpen: false, empId: null });
  };

  const handleProcessarMudanca = (emp) => {
    setSelectedEmp(emp);
    setWizardOpen(true);
  };

  const handleWizardComplete = async (wizardData) => {
    if (!selectedEmp) return;
    
    // 1. Add Act to History
    const actData = {
      employeeId: selectedEmp.id,
      actType: 'Mudança de Carreira',
      actDate: wizardData.dataActo,
      despacho: wizardData.despacho,
      documentB64: wizardData.fileBase64,
      details: {
        oldCareerId: selectedEmp.careerId,
        oldCategoryId: selectedEmp.categoryId,
        oldCategoryName: getName(orgData.categories, selectedEmp.categoryId),
        newCareerId: wizardData.newCareerId,
        newCategoryId: wizardData.newCategoryId,
        newCategoryName: wizardData.newCategoryName,
        newLevel: wizardData.level,
        newEscalao: wizardData.escalao
      }
    };

    await addAct(actData);

    // 2. Update Employee
    const res = await updateEmployee(selectedEmp.id, {
      ...selectedEmp,
      careerId: wizardData.newCareerId,
      categoryId: wizardData.newCategoryId,
      level: wizardData.level,
      step: wizardData.escalao
    });

    if (!res.success) {
      setNotification({
        isOpen: true,
        title: 'Erro na Atualização',
        message: 'Acto registado, mas houve um erro ao atualizar o perfil: ' + res.error,
        isError: true
      });
    } else {
      setNotification({
        isOpen: true,
        title: 'Sucesso',
        message: 'Mudança de Carreira processada e perfil atualizado com sucesso!',
        isError: false
      });
    }

    setWizardOpen(false);
    setSelectedEmp(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Módulo de Mudança de Carreira</h2>
        <p style={styles.desc}>Avaliação automática de elegibilidade e gestão de processos de mudança de carreira.</p>
      </div>

      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveSubTab('avaliacao')} 
          style={activeSubTab === 'avaliacao' ? styles.activeTab : styles.tab}
        >
          Funcionários Elegíveis ({eligibleEmployees.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('processos')} 
          style={activeSubTab === 'processos' ? styles.activeTab : styles.tab}
        >
          Processos e Histórico
        </button>
      </div>

      <div style={styles.content}>
        {activeSubTab === 'avaliacao' && (
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={styles.cardTitle}>Avaliação de Elegibilidade</h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
                  Lista de funcionários que cumprem simultaneamente os requisitos legais para Mudança de Carreira: 
                  <strong> Categoria Elegível</strong>, <strong>Formação Superior</strong> e <strong>Mínimo de 4 Anos de Serviço</strong>.
                </p>
              </div>
              <button 
                onClick={() => setSearchModalOpen(true)}
                style={{ backgroundColor: '#e53e3e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              >
                + Nova Solicitação
              </button>
            </div>

            {eligibleEmployees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
                Nenhum funcionário elegível para mudança de carreira no momento.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>NUIT / NIP</th>
                      <th>Nome</th>
                      <th>Categoria Atual</th>
                      <th>Nível Académico</th>
                      <th>Data de Ingresso</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleEmployees.map(emp => (
                      <tr key={emp.id} style={styles.tr}>
                        <td><strong>{emp.nip}</strong></td>
                        <td>{emp.name}</td>
                        <td>{getName(orgData.categories, emp.categoryId)}</td>
                        <td>{emp.academicLevel || 'Nível Superior'}</td>
                        <td>{emp.admissionDate}</td>
                        <td>
                          <CrudActionButtons 
                            onView={() => viewEmployeeDetails(emp.id)}
                            onEdit={() => editEmployee(emp.id)}
                            onDelete={() => setConfirmDelete({ isOpen: true, empId: emp.id })}
                            extraButtons={
                              <button 
                                onClick={() => handleProcessarMudanca(emp)}
                                style={{ backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                              >
                                Processar
                              </button>
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'processos' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <MudancaCarreiraHistory 
              acts={acts.filter(a => actsInGroup.includes(a.actType))} 
              onNewRequest={() => setActiveSubTab('avaliacao')}
            />
          </div>
        )}
      </div>

      {wizardOpen && selectedEmp && (
        <MudancaCarreiraWizard 
          employee={selectedEmp}
          onClose={() => { setWizardOpen(false); setSelectedEmp(null); }}
          onComplete={handleWizardComplete}
        />
      )}

      <ConfirmModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        onConfirm={() => setNotification({ isOpen: false })}
        onCancel={() => setNotification({ isOpen: false })}
        hideCancel={true}
        confirmText="OK"
        isDestructive={notification.isError}
      />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Apagar Funcionário"
        message="Tem a certeza que deseja eliminar este funcionário permanentemente? O registo será apagado da base de dados."
        isDestructive={true}
        onConfirm={() => handleDeleteEmployee(confirmDelete.empId)}
        onCancel={() => setConfirmDelete({ isOpen: false, empId: null })}
      />

      <EmployeeSearchModal 
        isOpen={searchModalOpen} 
        onClose={() => setSearchModalOpen(false)} 
        employees={employees} 
        onSelect={(emp) => {
          setSearchModalOpen(false);
          handleProcessarMudanca(emp);
        }} 
      />

      {viewDetailsEmp && (
        <EmployeeDetailsModal 
          emp={viewDetailsEmp} 
          orgData={{ data: orgData }} 
          onClose={() => setViewDetailsEmp(null)} 
          onRefresh={() => {}} 
        />
      )}

      {editFormEmpId && (
        <EmployeeEditModalWrapper
          employees={employees}
          orgData={orgData}
          editingEmpId={editFormEmpId}
          onClose={() => setEditFormEmpId(null)}
          updateEmployee={updateEmployee}
          setNotification={setNotification}
        />
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.3s ease' },
  header: { padding: '24px 30px', backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' },
  title: { margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)' },
  desc: { margin: 0, color: 'var(--color-text-muted)', fontSize: '15px' },
  tabsContainer: { display: 'flex', gap: '4px', padding: '0 30px', backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' },
  tab: { padding: '16px 24px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid transparent' },
  activeTab: { padding: '16px 24px', background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid var(--color-primary)' },
  content: { flex: 1, padding: '30px', overflowY: 'auto' },
  card: { backgroundColor: 'var(--color-bg-card)', borderRadius: '8px', border: '1px solid var(--color-border)', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  cardTitle: { margin: '0 0 16px 0', fontSize: '18px', color: 'var(--color-primary)' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.02)' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '12px 16px', color: 'var(--color-text-base)' },
  btnIcon: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--color-text-muted)' },
  fullscreenModalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  fullscreenModalContent: { backgroundColor: 'var(--color-bg-base)', width: '100%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  dragHeader: { padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)', cursor: 'move', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '50%', transition: 'background-color 0.2s' }
};
