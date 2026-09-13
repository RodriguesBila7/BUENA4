import React, { useState, useMemo } from 'react';
import useDisciplinaryData from '../../hooks/useDisciplinaryData';
import useAdminActsData from '../../hooks/useAdminActsData';
import useEmployeeData from '../../hooks/useEmployeeData';
import { isPrimaryCentralAdmin, isCentralUser, filterByProvincialScope } from '../../utils/scopeUtils';
import DraggableModal from '../common/DraggableModal';
import ConfirmModal from '../ConfirmModal';
import * as XLSX from 'xlsx';
import { showToast } from '../common/Toast';

const initialFormState = {
  employeeId: '',
  processNumber: '',
  openDate: new Date().toISOString().split('T')[0],
  infractionDate: '',
  decisionDate: '',
  type: 'Advertência',
  status: 'Em Instrução',
  authority: '',
  description: '',
  legalFoundation: '',
  observations: '',
  multaDays: '',
  multaPercentage: '',
  multaValue: '',
  files: []
};

const initialDespachoState = {
  processId: null,
  employeeId: '',
  employeeName: '',
  employeeNip: '',
  processNumber: '',
  despachoNumero: '',
  despachoData: new Date().toISOString().split('T')[0],
  despachoAutoridade: '',
  despachoDecisao: 'Advertência',
  despachoFundamentacao: '',
  despachoAssinadoPor: '',
  despachoMultaDays: '',
  despachoMultaPercentage: '',
  despachoMultaValue: '',
  despachoFiles: []
};

export default function DisciplinaryList({ orgData, employeesData, user, onNavigateTab }) {
  const { data } = orgData || {};
  const { getAllActiveProcesses, addProcess, updateProcess, deleteProcess } = useDisciplinaryData();
  const { registerAct } = useAdminActsData();
  const { updateEmployee } = useEmployeeData();

  const processes = getAllActiveProcesses();

  const isCentral = isCentralUser(user);
  const isPrimary = isPrimaryCentralAdmin(user);

  const [filters, setFilters] = useState({
    searchTerm: '',
    status: '',
    type: ''
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, processId: null, processNumber: '' });
  const [submitting, setSubmitting] = useState(false);
  const [empModalSearchQuery, setEmpModalSearchQuery] = useState('');

  // Estados para o Despacho Final
  const [isDespachoModalOpen, setIsDespachoModalOpen] = useState(false);
  const [despachoData, setDespachoData] = useState(initialDespachoState);

  // Estados para o Modal de Execução de Sanção Gravosa (Expulsão / Demissão)
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [executionPayload, setExecutionPayload] = useState(null);
  const [executing, setExecuting] = useState(false);

  const employeesList = useMemo(() => {
    let raw = [];
    if (employeesData) {
      if (Array.isArray(employeesData)) raw = employeesData;
      else if (Array.isArray(employeesData.employees)) raw = employeesData.employees;
    }
    // Filtrar escopo territorial se for utilizador secundário / provincial
    if (!isCentral && user) {
      return filterByProvincialScope(raw, user, data);
    }
    return raw;
  }, [employeesData, isCentral, user, data]);

  const getName = (list, id) => (list && Array.isArray(list) ? list.find(item => String(item.id) === String(id))?.name || '-' : '-');

  const filteredModalEmployees = useMemo(() => {
    if (!empModalSearchQuery.trim()) return employeesList;
    const q = empModalSearchQuery.toLowerCase();
    return employeesList.filter(emp => {
      const nameMatch = emp.name && emp.name.toLowerCase().includes(q);
      const nipMatch = emp.nip && String(emp.nip).toLowerCase().includes(q);
      const nuitMatch = emp.nuit && String(emp.nuit).toLowerCase().includes(q);
      const dirName = getName(data?.directorates, emp.directorateId);
      const dirMatch = dirName && dirName.toLowerCase().includes(q);
      return nameMatch || nipMatch || nuitMatch || dirMatch;
    });
  }, [employeesList, empModalSearchQuery, data]);

  const enrichedProcesses = useMemo(() => {
    const scopedEmployeeIds = new Set(employeesList.map(e => String(e.id)));

    return processes
      .filter(p => {
        // Se utilizador for provincial/secundário, filtra estritamente processos dos seus funcionários
        if (!isCentral) {
          return scopedEmployeeIds.has(String(p.employeeId));
        }
        return true;
      })
      .map(p => {
        const emp = employeesList.find(e => String(e.id) === String(p.employeeId));
        return {
          ...p,
          employee: emp,
          employeeName: emp ? emp.name : (p.employeeName || 'Funcionário Desconhecido'),
          employeeNip: emp ? (emp.nip || emp.nuit || '-') : (p.employeeNip || '-'),
          employeeStatus: emp ? emp.status : '-',
          employeeIsActive: emp ? emp.isActive : true,
          directorate: emp ? getName(data?.directorates, emp.directorateId) : '-'
        };
      })
      .filter(p => {
        const matchSearch = (p.employeeName || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                            String(p.processNumber || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                            String(p.employeeNip || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                            String(p.despachoNumero || '').toLowerCase().includes(filters.searchTerm.toLowerCase());
        const matchStatus = filters.status ? p.status === filters.status : true;
        const matchType = filters.type ? (p.despachoDecisao || p.type) === filters.type : true;
        return matchSearch && matchStatus && matchType;
      })
      .sort((a, b) => new Date(b.createdAt || b.openDate || 0) - new Date(a.createdAt || a.openDate || 0));
  }, [processes, employeesList, data, filters, isCentral]);

  const [expandedRows, setExpandedRows] = useState({});
  const toggleRow = (empId) => setExpandedRows(prev => ({ ...prev, [empId]: !prev[empId] }));

  const groupedEmployees = useMemo(() => {
    const map = new Map();
    enrichedProcesses.forEach(p => {
      if (!map.has(p.employeeId)) {
        map.set(p.employeeId, {
          employeeId: p.employeeId,
          employeeName: p.employeeName,
          employeeNip: p.employeeNip,
          employeeStatus: p.employeeStatus,
          employeeIsActive: p.employeeIsActive,
          directorate: p.directorate,
          processes: []
        });
      }
      map.get(p.employeeId).processes.push(p);
    });
    return Array.from(map.values());
  }, [enrichedProcesses]);

  // Handlers para Processo
  const handleOpenNew = (empId = '') => {
    setEditingProcess(null);
    setIsViewOnly(false);
    setEmpModalSearchQuery('');
    setFormData({ ...initialFormState, employeeId: empId, status: 'Em Instrução' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (process) => {
    setEditingProcess(process);
    setIsViewOnly(false);
    setFormData({
      employeeId: process.employeeId || '',
      processNumber: process.processNumber || '',
      openDate: process.openDate || new Date().toISOString().split('T')[0],
      infractionDate: process.infractionDate || '',
      decisionDate: process.decisionDate || '',
      type: process.type || 'Advertência',
      status: process.status || 'Em Instrução',
      authority: process.authority || '',
      description: process.description || '',
      legalFoundation: process.legalFoundation || '',
      observations: process.observations || '',
      multaDays: process.multaDays || '',
      multaPercentage: process.multaPercentage || '',
      multaValue: process.multaValue || '',
      files: process.files || [],
      despachoNumero: process.despachoNumero || '',
      despachoData: process.despachoData || '',
      despachoAutoridade: process.despachoAutoridade || '',
      despachoDecisao: process.despachoDecisao || '',
      despachoFundamentacao: process.despachoFundamentacao || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenView = (process) => {
    setEditingProcess(process);
    setIsViewOnly(true);
    setFormData({
      employeeId: process.employeeId || '',
      processNumber: process.processNumber || '',
      openDate: process.openDate || '',
      infractionDate: process.infractionDate || '',
      decisionDate: process.decisionDate || '',
      type: process.type || '',
      status: process.status || '',
      authority: process.authority || '',
      description: process.description || '',
      legalFoundation: process.legalFoundation || '',
      observations: process.observations || '',
      multaDays: process.multaDays || '',
      multaPercentage: process.multaPercentage || '',
      multaValue: process.multaValue || '',
      files: process.files || [],
      despachoNumero: process.despachoNumero || '',
      despachoData: process.despachoData || '',
      despachoAutoridade: process.despachoAutoridade || '',
      despachoDecisao: process.despachoDecisao || '',
      despachoFundamentacao: process.despachoFundamentacao || '',
      despachoAssinadoPor: process.despachoAssinadoPor || '',
      despachoFiles: process.despachoFiles || []
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        date: new Date().toISOString()
      }));
      setFormData(prev => ({ ...prev, files: [...(prev.files || []), ...newFiles] }));
    }
  };

  const handleSaveProcess = async (e) => {
    e.preventDefault();
    if (!formData.employeeId) {
      showToast('Por favor, seleccione o funcionário a quem se aplica o processo.', 'warning');
      return;
    }
    if (!formData.processNumber.trim()) {
      showToast('Por favor, introduza o Número do Processo.', 'warning');
      return;
    }
    if (!formData.type) {
      showToast('Por favor, seleccione o Tipo de Sanção.', 'warning');
      return;
    }

    // Regra Institucional: O processo só termina com adicionamento do despacho final!
    if (formData.status === 'Concluído' && !formData.despachoNumero && !editingProcess?.despachoNumero) {
      showToast('O processo não pode ser marcado como Concluído sem a inserção do Despacho Final.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (editingProcess) {
        await updateProcess(editingProcess.id, formData);
        showToast('Processo disciplinar atualizado com sucesso.', 'success');
      } else {
        await addProcess({
          ...formData,
          status: formData.status || 'Em Instrução',
          registeredBy: user?.username || 'Utilizador',
          registeredByRole: user?.roleName || user?.roleId || 'Operador'
        });
        showToast('Processo disciplinar registado em instrução com sucesso.', 'success');
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingProcess(null);
    } catch (err) {
      showToast('Erro ao guardar processo: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers para Despacho Final
  const handleOpenDespacho = (process) => {
    const emp = employeesList.find(e => String(e.id) === String(process.employeeId));
    setDespachoData({
      processId: process.id,
      employeeId: process.employeeId,
      employeeName: emp ? emp.name : process.employeeName,
      employeeNip: emp ? (emp.nip || emp.nuit) : process.employeeNip,
      processNumber: process.processNumber,
      despachoNumero: process.despachoNumero || '',
      despachoData: process.despachoData || new Date().toISOString().split('T')[0],
      despachoAutoridade: process.despachoAutoridade || 'Director-Geral do SERNIC',
      despachoDecisao: process.despachoDecisao || process.type || 'Advertência',
      despachoFundamentacao: process.despachoFundamentacao || process.description || '',
      despachoAssinadoPor: process.despachoAssinadoPor || user?.name || user?.username || '',
      despachoMultaDays: process.despachoMultaDays || process.multaDays || '',
      despachoMultaPercentage: process.despachoMultaPercentage || process.multaPercentage || '',
      despachoMultaValue: process.despachoMultaValue || process.multaValue || '',
      despachoFiles: process.despachoFiles || []
    });
    setIsDespachoModalOpen(true);
  };

  const handleDespachoChange = (e) => {
    const { name, value } = e.target;
    setDespachoData(prev => ({ ...prev, [name]: value }));
  };

  const handleDespachoFileChange = (e) => {
    if (e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        date: new Date().toISOString()
      }));
      setDespachoData(prev => ({ ...prev, despachoFiles: [...(prev.despachoFiles || []), ...newFiles] }));
    }
  };

  const handleSaveDespacho = async (e) => {
    e.preventDefault();
    if (!despachoData.despachoNumero.trim()) {
      showToast('Por favor, introduza o Número/Referência do Despacho Final.', 'warning');
      return;
    }
    if (!despachoData.despachoDecisao) {
      showToast('Por favor, seleccione a Decisão/Sanção Final do Despacho.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const isArquivado = despachoData.despachoDecisao === 'Absolvição / Arquivamento';
      const updatedStatus = isArquivado ? 'Arquivado' : 'Concluído';

      const updatePayload = {
        status: updatedStatus,
        decisionDate: despachoData.despachoData,
        type: despachoData.despachoDecisao,
        despachoNumero: despachoData.despachoNumero,
        despachoData: despachoData.despachoData,
        despachoAutoridade: despachoData.despachoAutoridade,
        despachoDecisao: despachoData.despachoDecisao,
        despachoFundamentacao: despachoData.despachoFundamentacao,
        despachoAssinadoPor: despachoData.despachoAssinadoPor,
        despachoMultaDays: despachoData.despachoMultaDays,
        despachoMultaPercentage: despachoData.despachoMultaPercentage,
        despachoMultaValue: despachoData.despachoMultaValue,
        despachoFiles: despachoData.despachoFiles,
        despachoRegisteredAt: new Date().toISOString(),
        despachoRegisteredBy: user?.username || 'Administrador'
      };

      await updateProcess(despachoData.processId, updatePayload);
      setIsDespachoModalOpen(false);
      showToast(`Despacho Final registado e processo ${despachoData.processNumber} concluído com sucesso!`, 'success');

      // Se a sanção for EXPULSÃO ou DEMISSÃO, solicitar imediatamente a execução da decisão no registo do funcionário!
      if (['Expulsão', 'Demissão'].includes(despachoData.despachoDecisao)) {
        setExecutionPayload({
          processId: despachoData.processId,
          employeeId: despachoData.employeeId,
          employeeName: despachoData.employeeName,
          employeeNip: despachoData.employeeNip,
          processNumber: despachoData.processNumber,
          despachoNumero: despachoData.despachoNumero,
          despachoData: despachoData.despachoData,
          despachoDecisao: despachoData.despachoDecisao,
          despachoFundamentacao: despachoData.despachoFundamentacao
        });
        setIsExecutionModalOpen(true);
      }
    } catch (err) {
      showToast('Erro ao registar Despacho Final: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler para Executar Decisão de Expulsão / Demissão e Registar Acto Administrativo
  const handleExecuteSanctionAct = async (andNavigate = true) => {
    if (!executionPayload) return;
    setExecuting(true);
    try {
      const { employeeId, employeeName, employeeNip, processNumber, despachoNumero, despachoData, despachoDecisao, despachoFundamentacao, processId } = executionPayload;
      
      const emp = employeesList.find(e => String(e.id) === String(employeeId));

      // 1. Registar Acto Administrativo de Expulsão ou Demissão
      const actRes = await registerAct({
        employeeId,
        actType: despachoDecisao, // 'Expulsão' ou 'Demissão'
        actDate: despachoData || new Date().toISOString().split('T')[0],
        despacho: despachoNumero,
        userResponsible: user?.username || 'Sistema',
        details: {
          processNumber: processNumber,
          sanctionType: despachoDecisao,
          despachoNumero: despachoNumero,
          despachoData: despachoData,
          legalBasis: `Execução do Despacho do Processo Disciplinar nº ${processNumber}`,
          notes: despachoFundamentacao || `Decisão punitiva de ${despachoDecisao} lavrada nos autos.`
        }
      });

      // 2. Atualizar o estado do funcionário no banco de dados para Expulso ou Demitido
      if (emp) {
        await updateEmployee(employeeId, {
          ...emp,
          status: despachoDecisao === 'Expulsão' ? 'Expulso' : 'Demitido',
          isActive: false,
          inactivationReason: `Processo Disciplinar nº ${processNumber} (${despachoDecisao})`,
          inactivationDate: despachoData
        });
      }

      // 3. Marcar processo como executado no cadastro
      await updateProcess(processId, {
        isExecutedInEmployee: true,
        executedAt: new Date().toISOString(),
        executedBy: user?.username || 'Sistema'
      });

      showToast(`Decisão de ${despachoDecisao} executada com sucesso no quadro funcional!`, 'success');
      setIsExecutionModalOpen(false);
      setExecutionPayload(null);

      // 4. Se solicitado, navegar para o Acto Administrativo
      if (andNavigate && onNavigateTab) {
        onNavigateTab('admin_acts_dashboard');
      }
    } catch (err) {
      showToast('Erro ao executar decisão de sanção: ' + err.message, 'error');
    } finally {
      setExecuting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (confirmDelete.processId) {
      await deleteProcess(confirmDelete.processId);
      setConfirmDelete({ isOpen: false, processId: null, processNumber: '' });
      showToast('Processo disciplinar eliminado com sucesso.', 'success');
    }
  };

  const exportExcel = () => {
    const exportData = enrichedProcesses.map(p => ({
      'Nº Processo': p.processNumber,
      'Funcionário': p.employeeName,
      'NIB / NUIT': p.employeeNip,
      'Direcção': p.directorate,
      'Sanção': p.despachoDecisao || p.type,
      'Estado': p.status,
      'Nº Despacho': p.despachoNumero || 'Pendente',
      'Data Despacho': p.despachoData || '-',
      'Autoridade Despachante': p.despachoAutoridade || p.authority || '-',
      'Data Infração': p.infractionDate || '-',
      'Data Abertura': p.openDate || '-'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Processos");
    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-');
    XLSX.writeFile(workbook, `Processos_Disciplinares_${dateStr}.xlsx`);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      {/* AVISO DE ESCOPO TERRITORIAL SE FOR PERFIL SECUNDÁRIO */}
      {!isCentral && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: 'rgba(27, 54, 93, 0.06)',
          borderRadius: '8px',
          border: '1px solid rgba(27, 54, 93, 0.15)',
          color: 'var(--color-primary, #1B365D)',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <span>📍</span>
          <span>
            <strong>Gestão Provincial de Contencioso Laboral:</strong> Acesso restrito aos efectivos sob gerência da sua Província. Conclusão formal requer homologação do Despacho Final.
          </span>
        </div>
      )}

      {/* BARRA DE FERRAMENTAS */}
      <div style={styles.toolbar}>
        <button 
          onClick={() => handleOpenNew()} 
          style={styles.btnAddProcess}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
        >
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>+</span> Novo Processo Disciplinar
        </button>

        <input 
          type="text" 
          placeholder="Pesquisar funcionário, NIP, nº processo ou despacho..." 
          value={filters.searchTerm}
          onChange={(e) => setFilters(p => ({ ...p, searchTerm: e.target.value }))}
          style={styles.searchInput}
        />
        <select value={filters.type} onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))} style={styles.select}>
          <option value="">Todas as Sanções</option>
          <option value="Advertência">Advertência</option>
          <option value="Repreensão Pública">Repreensão Pública</option>
          <option value="Multa">Multa</option>
          <option value="Despromoção">Despromoção</option>
          <option value="Demissão">Demissão (Cessação)</option>
          <option value="Expulsão">Expulsão (Cessação)</option>
          <option value="Absolvição / Arquivamento">Absolvição / Arquivamento</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))} style={styles.select}>
          <option value="">Todos os Estados</option>
          <option value="Em Instrução">Em Instrução (Pendente Despacho)</option>
          <option value="Aberto">Aberto</option>
          <option value="Concluído">Concluído (Despacho Aplicado)</option>
          <option value="Arquivado">Arquivado</option>
          <option value="Suspenso">Suspenso</option>
        </select>
        
        <button onClick={exportExcel} style={styles.btnExport}>
          📊 Exportar Excel
        </button>
      </div>

      {/* TABELA DE PROCESSOS */}
      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Nº Processo</th>
              <th>Funcionário</th>
              <th>Direcção</th>
              <th>Sanção / Decisão</th>
              <th>Despacho Final</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {groupedEmployees.length === 0 ? (
              <tr>
                <td colSpan="7" style={styles.empty}>
                  Nenhum processo disciplinar encontrado para os critérios selecionados.
                </td>
              </tr>
            ) : (
              groupedEmployees.map(emp => (
                <React.Fragment key={emp.employeeId}>
                  <tr 
                    style={{ ...styles.tr, backgroundColor: 'rgba(0,0,0,0.02)', cursor: 'pointer' }}
                    onClick={() => toggleRow(emp.employeeId)}
                  >
                    <td colSpan="7" style={styles.td}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: 'var(--color-primary)' }}>{emp.employeeName}</strong>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                            (NIP: {emp.employeeNip}) • {emp.directorate}
                          </span>
                          {emp.employeeStatus && ['Expulso', 'Demitido'].includes(emp.employeeStatus) && (
                            <span style={{ padding: '2px 8px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                              ⛔ {emp.employeeStatus}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenNew(emp.employeeId); }}
                            style={styles.btnQuickAdd}
                            title="Instaurar Novo Processo a este Funcionário"
                          >
                            + Novo Processo
                          </button>
                          <span style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', borderRadius: '12px', fontWeight: 'bold' }}>
                            {emp.processes.length} Processo{emp.processes.length > 1 ? 's' : ''}
                          </span>
                          <span style={{ transform: expandedRows[emp.employeeId] ? 'rotate(180deg)' : 'none', transition: '0.2s', fontSize: '12px' }}>▼</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {expandedRows[emp.employeeId] && emp.processes.map(p => {
                    const isSevereSanction = ['Expulsão', 'Demissão'].includes(p.despachoDecisao || p.type);
                    const isExecuted = p.isExecutedInEmployee || ['Expulso', 'Demitido'].includes(emp.employeeStatus);

                    return (
                      <tr key={p.id} style={{ ...styles.tr, backgroundColor: 'var(--color-bg-base)' }}>
                        <td style={{ ...styles.td, paddingLeft: '32px' }}>
                          <strong style={{ color: 'var(--color-primary)' }}>{p.processNumber}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            Abertura: {p.openDate || '-'}
                          </div>
                        </td>
                        <td>-</td>
                        <td>-</td>
                        <td>
                          <strong>{p.despachoDecisao || p.type}</strong>
                          {p.despachoDecisao === 'Multa' && p.despachoMultaDays && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              {p.despachoMultaDays} dias ({p.despachoMultaPercentage}%)
                            </div>
                          )}
                        </td>
                        <td>
                          {p.despachoNumero ? (
                            <div>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                📜 {p.despachoNumero}
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                Data: {p.despachoData || '-'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#d97706', fontSize: '12px', fontStyle: 'italic', fontWeight: '600' }}>
                              ⏳ Pendente de Despacho
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', width: 'fit-content',
                              backgroundColor: p.status === 'Concluído' ? 'rgba(16, 185, 129, 0.15)' : (p.status === 'Em Instrução' || p.status === 'Aberto' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)'),
                              color: p.status === 'Concluído' ? '#059669' : (p.status === 'Em Instrução' || p.status === 'Aberto' ? '#d97706' : 'var(--color-text-muted)')
                            }}>
                              {p.status === 'Concluído' ? '✓ Concluído' : p.status}
                            </span>

                            {isSevereSanction && p.status === 'Concluído' && (
                              isExecuted ? (
                                <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: '700' }}>
                                  ✓ Executado no Cadastro
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setExecutionPayload({
                                      processId: p.id,
                                      employeeId: p.employeeId,
                                      employeeName: p.employeeName,
                                      employeeNip: p.employeeNip,
                                      processNumber: p.processNumber,
                                      despachoNumero: p.despachoNumero,
                                      despachoData: p.despachoData,
                                      despachoDecisao: p.despachoDecisao || p.type,
                                      despachoFundamentacao: p.despachoFundamentacao
                                    });
                                    setIsExecutionModalOpen(true);
                                  }}
                                  style={styles.btnExecuteSanction}
                                  title="Executar Sanção de Expulsão/Demissão no Quadro"
                                >
                                  ⚠️ Executar Sanção
                                </button>
                              )
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenView(p); }}
                              style={styles.btnActionView}
                              title="Ver Detalhes do Processo e Despacho"
                            >
                              👁️ Ver
                            </button>

                            {/* Botão de Despacho Final */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenDespacho(p); }}
                              style={p.despachoNumero ? styles.btnActionDespachoDone : styles.btnActionDespachoPending}
                              title={p.despachoNumero ? "Ver / Retificar Despacho Final" : "Adicionar Despacho Final e Concluir"}
                            >
                              ⚖️ {p.despachoNumero ? 'Despacho' : 'Adicionar Despacho'}
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }}
                              style={styles.btnActionEdit}
                              title="Editar Instrução do Processo"
                            >
                              ✏️
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, processId: p.id, processNumber: p.processNumber }); }}
                              style={styles.btnActionDelete}
                              title="Eliminar Processo"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: REGISTO / EDIÇÃO DE PROCESSO DISCIPLINAR */}
      <DraggableModal
        isOpen={isModalOpen}
        title={isViewOnly ? `Processo Disciplinar: ${formData.processNumber}` : (editingProcess ? `Editar Processo (${formData.processNumber})` : '+ Novo Processo Disciplinar')}
        onClose={() => setIsModalOpen(false)}
        maxWidth="780px"
      >
        <form onSubmit={handleSaveProcess} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* SELEÇÃO E PESQUISA DO FUNCIONÁRIO NO MODAL */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(27, 54, 93, 0.05)',
            border: '1px solid var(--color-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ ...styles.label, color: 'var(--color-primary)', fontWeight: 'bold' }}>
                🔍 Pesquisar & Seleccionar Funcionário *
              </label>
              {formData.employeeId && (
                <span style={{ fontSize: '11px', color: 'var(--color-success, #059669)', fontWeight: 'bold' }}>
                  ✓ Funcionário Seleccionado
                </span>
              )}
            </div>

            {!isViewOnly && !editingProcess && (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Digite o nome, NIP, NUIT ou Direcção para pesquisar..."
                  value={empModalSearchQuery}
                  onChange={(e) => setEmpModalSearchQuery(e.target.value)}
                  style={{
                    ...styles.input,
                    paddingLeft: '32px',
                    fontSize: '13px',
                    backgroundColor: 'var(--color-bg-base)',
                    borderColor: 'var(--color-primary)'
                  }}
                />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            )}

            <select
              name="employeeId"
              value={formData.employeeId}
              onChange={handleFormChange}
              disabled={isViewOnly || (editingProcess && formData.employeeId)}
              style={{ ...styles.input, fontWeight: 'bold', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', cursor: 'pointer' }}
              required
            >
              <option value="">
                -- Seleccione o Funcionário ({filteredModalEmployees.length} {filteredModalEmployees.length === 1 ? 'encontrado' : 'encontrados'}) --
              </option>
              {filteredModalEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  👤 {emp.name} {emp.nip ? `(NIP: ${emp.nip})` : (emp.nuit ? `(NUIT: ${emp.nuit})` : '')} - {getName(data?.directorates, emp.directorateId)}
                </option>
              ))}
            </select>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              💡 {!isCentral ? 'Lista restrita aos funcionários sob gerência da sua Província.' : 'Pode pesquisar pelo nome ou NIP para filtrar o funcionário.'}
            </p>
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nº do Processo Disciplinar *</label>
              <input
                type="text"
                name="processNumber"
                value={formData.processNumber}
                onChange={handleFormChange}
                placeholder="Ex: PROC-DISC-024/2026"
                disabled={isViewOnly}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Sanção Proposta / Em Averiguação *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleFormChange}
                disabled={isViewOnly}
                style={styles.input}
                required
              >
                <option value="Advertência">Advertência</option>
                <option value="Repreensão Pública">Repreensão Pública</option>
                <option value="Multa">Multa</option>
                <option value="Despromoção">Despromoção</option>
                <option value="Demissão">Demissão (Cessação)</option>
                <option value="Expulsão">Expulsão (Cessação)</option>
              </select>
            </div>
          </div>

          <div style={styles.grid3}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Estado do Processo</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                disabled={isViewOnly || !formData.despachoNumero}
                style={styles.input}
              >
                <option value="Em Instrução">Em Instrução (Pendente Despacho)</option>
                <option value="Aberto">Aberto</option>
                <option value="Suspenso">Suspenso</option>
                {formData.despachoNumero && <option value="Concluído">Concluído (Despacho Adicionado)</option>}
                {formData.despachoNumero && <option value="Arquivado">Arquivado</option>}
              </select>
              {!formData.despachoNumero && (
                <span style={{ fontSize: '10.5px', color: '#d97706', fontStyle: 'italic' }}>
                  * Conclusão requer inserção do Despacho Final.
                </span>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Autoridade Instrutora / Sancionadora</label>
              <input
                type="text"
                name="authority"
                value={formData.authority}
                onChange={handleFormChange}
                placeholder="Ex: Instrutor do Processo / DRH"
                disabled={isViewOnly}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Data da Infração</label>
              <input
                type="date"
                name="infractionDate"
                value={formData.infractionDate}
                onChange={handleFormChange}
                disabled={isViewOnly}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data de Abertura / Instauração</label>
              <input
                type="date"
                name="openDate"
                value={formData.openDate}
                onChange={handleFormChange}
                disabled={isViewOnly}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Data Prevista / Decisão</label>
              <input
                type="date"
                name="decisionDate"
                value={formData.decisionDate}
                onChange={handleFormChange}
                disabled={isViewOnly}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Descrição dos Factos e Infração Imputada</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              disabled={isViewOnly}
              placeholder="Descreva os factos ocorridos e a matéria disciplinar em averiguação..."
              style={styles.textarea}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Fundamentação Legal / Artigo do Regulamento</label>
            <input
              type="text"
              name="legalFoundation"
              value={formData.legalFoundation}
              onChange={handleFormChange}
              disabled={isViewOnly}
              placeholder="Ex: Artigo 123º e seguintes do EGFAE / Estatuto do SERNIC"
              style={styles.input}
            />
          </div>

          {/* DADOS DO DESPACHO FINAL (SE JÁ EXISTIR) */}
          {formData.despachoNumero && (
            <div style={{
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#059669', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📜 Despacho Final Homologado
              </h5>
              <div style={styles.grid2}>
                <div><strong>Nº Despacho:</strong> {formData.despachoNumero}</div>
                <div><strong>Data Despacho:</strong> {formData.despachoData || '-'}</div>
                <div><strong>Decisão / Sanção:</strong> {formData.despachoDecisao || formData.type}</div>
                <div><strong>Autoridade:</strong> {formData.despachoAutoridade || '-'}</div>
              </div>
              {formData.despachoFundamentacao && (
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  <strong>Fundamentação:</strong> {formData.despachoFundamentacao}
                </div>
              )}
            </div>
          )}

          {!isViewOnly && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Anexar Documentos dos Autos (PDF, DOCX, Imagens)</label>
              <input type="file" multiple onChange={handleFileChange} style={styles.input} />
              {formData.files && formData.files.length > 0 && (
                <ul style={{ fontSize: '12px', marginTop: '6px', color: 'var(--color-text-muted)' }}>
                  {formData.files.map((f, i) => (
                    <li key={i}>{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={styles.btnCancelModal}
            >
              {isViewOnly ? 'Fechar' : 'Cancelar'}
            </button>
            {!isViewOnly && (
              <button
                type="submit"
                disabled={submitting}
                style={styles.btnSaveModal}
              >
                {submitting ? 'A guardar...' : (editingProcess ? 'Atualizar Processo' : 'Instaurar Processo')}
              </button>
            )}
          </div>
        </form>
      </DraggableModal>

      {/* MODAL 2: INSERÇÃO DO DESPACHO FINAL */}
      <DraggableModal
        isOpen={isDespachoModalOpen}
        title={`⚖️ Despacho Final - Processo ${despachoData.processNumber}`}
        onClose={() => setIsDespachoModalOpen(false)}
        maxWidth="720px"
      >
        <form onSubmit={handleSaveDespacho} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(27, 54, 93, 0.05)',
            border: '1px solid var(--color-primary)',
            fontSize: '13px'
          }}>
            <strong style={{ color: 'var(--color-primary)' }}>Funcionário Notificado:</strong> {despachoData.employeeName} ({despachoData.employeeNip})
            <br />
            <strong style={{ color: 'var(--color-primary)' }}>Processo Disciplinar:</strong> {despachoData.processNumber}
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nº / Referência Oficial do Despacho *</label>
              <input
                type="text"
                name="despachoNumero"
                value={despachoData.despachoNumero}
                onChange={handleDespachoChange}
                placeholder="Ex: Despacho nº 045/GDG-SERNIC/2026"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Data do Despacho *</label>
              <input
                type="date"
                name="despachoData"
                value={despachoData.despachoData}
                onChange={handleDespachoChange}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Entidade Decisora / Despachante *</label>
              <input
                type="text"
                name="despachoAutoridade"
                value={despachoData.despachoAutoridade}
                onChange={handleDespachoChange}
                placeholder="Ex: Director-Geral do SERNIC / DRH"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Decisão / Sanção Aplicada *</label>
              <select
                name="despachoDecisao"
                value={despachoData.despachoDecisao}
                onChange={handleDespachoChange}
                style={{ ...styles.input, fontWeight: 'bold' }}
                required
              >
                <option value="Advertência">Advertência</option>
                <option value="Repreensão Pública">Repreensão Pública</option>
                <option value="Multa">Multa</option>
                <option value="Despromoção">Despromoção</option>
                <option value="Demissão" style={{ color: '#dc2626', fontWeight: 'bold' }}>🚨 Demissão (Cessação Funcional)</option>
                <option value="Expulsão" style={{ color: '#dc2626', fontWeight: 'bold' }}>🚨 Expulsão (Cessação Funcional)</option>
                <option value="Absolvição / Arquivamento">Absolvição / Arquivamento</option>
              </select>
            </div>
          </div>

          {/* DETALHES DE MULTA QUANDO APLICÁVEL */}
          {despachoData.despachoDecisao === 'Multa' && (
            <div style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-warning)' }}>
              <h5 style={{ margin: '0 0 10px 0', color: 'var(--color-text-main)', fontSize: '13px', fontWeight: 'bold' }}>
                Condições da Sanção por Multa
              </h5>
              <div style={styles.grid3}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Dias de Multa</label>
                  <input
                    type="number"
                    name="despachoMultaDays"
                    value={despachoData.despachoMultaDays}
                    onChange={handleDespachoChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Desconto Salarial (%)</label>
                  <input
                    type="number"
                    name="despachoMultaPercentage"
                    value={despachoData.despachoMultaPercentage}
                    onChange={handleDespachoChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Valor (MT)</label>
                  <input
                    type="number"
                    name="despachoMultaValue"
                    value={despachoData.despachoMultaValue}
                    onChange={handleDespachoChange}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ALERTA SE FOR EXPULSÃO OU DEMISSÃO */}
          {['Expulsão', 'Demissão'].includes(despachoData.despachoDecisao) && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1.5px solid #ef4444',
              color: '#991b1b',
              fontSize: '12.5px'
            }}>
              <strong>⚠️ Atenção (Sanção de Cessação Funcional):</strong> Ao confirmar o despacho de <strong>{despachoData.despachoDecisao}</strong>, o sistema solicitará a imediata execução da decisão no registo do funcionário e formalização do Acto Administrativo correspondente.
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Fundamentação do Despacho / Síntese Decisória</label>
            <textarea
              name="despachoFundamentacao"
              value={despachoData.despachoFundamentacao}
              onChange={handleDespachoChange}
              placeholder="Descreva a fundamentação legal e as conclusões do despacho decisor..."
              style={{ ...styles.textarea, minHeight: '80px' }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Anexar Despacho Digitalizado (PDF / Imagem)</label>
            <input type="file" multiple onChange={handleDespachoFileChange} style={styles.input} />
            {despachoData.despachoFiles && despachoData.despachoFiles.length > 0 && (
              <ul style={{ fontSize: '12px', marginTop: '6px', color: 'var(--color-text-muted)' }}>
                {despachoData.despachoFiles.map((f, i) => (
                  <li key={i}>📄 {f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setIsDespachoModalOpen(false)}
              style={styles.btnCancelModal}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.btnSaveModal,
                backgroundColor: ['Expulsão', 'Demissão'].includes(despachoData.despachoDecisao) ? '#dc2626' : 'var(--color-primary)'
              }}
            >
              {submitting ? 'A homologar...' : 'Homologar Despacho e Concluir'}
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* MODAL 3: EXECUÇÃO DA DECISÃO DE EXPULSÃO OU DEMISSÃO */}
      {isExecutionModalOpen && executionPayload && (
        <DraggableModal
          isOpen={isExecutionModalOpen}
          title={`🚨 Execução do Despacho de ${executionPayload.despachoDecisao}`}
          onClose={() => setIsExecutionModalOpen(false)}
          maxWidth="650px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px solid #ef4444'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#991b1b', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> Decisão Punitiva Gravosa: {executionPayload.despachoDecisao.toUpperCase()}
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d', lineHeight: '1.5' }}>
                O Despacho Final <strong>{executionPayload.despachoNumero}</strong> determinou a <strong>{executionPayload.despachoDecisao}</strong> do funcionário <strong>{executionPayload.employeeName}</strong> (NIP: {executionPayload.employeeNip}).
              </p>
            </div>

            <div style={{
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              fontSize: '13px'
            }}>
              <p style={{ margin: '4px 0' }}><strong>Processo Disciplinar:</strong> {executionPayload.processNumber}</p>
              <p style={{ margin: '4px 0' }}><strong>Data do Despacho:</strong> {executionPayload.despachoData}</p>
              <p style={{ margin: '4px 0' }}><strong>Sanção Aplicada:</strong> <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{executionPayload.despachoDecisao}</span></p>
            </div>

            <p style={{ margin: '4px 0', fontSize: '13.5px', color: 'var(--color-text-main)', fontWeight: '600' }}>
              Selecione o procedimento de execução pretendido:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                disabled={executing}
                onClick={() => handleExecuteSanctionAct(true)}
                style={{
                  padding: '14px 18px',
                  backgroundColor: 'var(--color-primary, #1B365D)',
                  color: 'var(--color-accent, #EAAA00)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                <span>🚀 Executar Decisão e Ir para o Acto Administrativo</span>
                <span>➔</span>
              </button>

              <button
                type="button"
                disabled={executing}
                onClick={() => handleExecuteSanctionAct(false)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>⚡ Executar Apenas no Cadastro do Funcionário (Inativar como {executionPayload.despachoDecisao})</span>
                <span>✓</span>
              </button>

              <button
                type="button"
                disabled={executing}
                onClick={() => {
                  setIsExecutionModalOpen(false);
                  setExecutionPayload(null);
                }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Deixar Pendente de Execução Manual
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* MODAL CONFIRMAÇÃO DE ELIMINAÇÃO */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Eliminar Processo Disciplinar"
        message={`Tem a certeza que deseja eliminar o processo ${confirmDelete.processNumber || ''}? Esta ação não pode ser desfeita.`}
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete({ isOpen: false, processId: null, processNumber: '' })}
      />
    </div>
  );
}

const styles = {
  toolbar: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  btnAddProcess: { padding: '10px 18px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)', transition: 'all 0.2s ease' },
  btnQuickAdd: { padding: '4px 10px', backgroundColor: 'transparent', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  searchInput: { flex: 1, minWidth: '240px', padding: '9px 14px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '13px' },
  select: { padding: '9px 14px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '13px' },
  btnExport: { padding: '9px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  tableContainer: { overflowX: 'auto', backgroundColor: 'var(--color-bg-card)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  td: { padding: '12px 16px', color: 'var(--color-text-main)' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  empty: { textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  btnActionView: { padding: '5px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '11.5px', fontWeight: '600' },
  btnActionEdit: { padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '11.5px' },
  btnActionDelete: { padding: '5px 8px', borderRadius: '4px', border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '11.5px' },
  btnActionDespachoPending: { padding: '5px 12px', borderRadius: '6px', border: '1px solid #d97706', backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#b45309', cursor: 'pointer', fontSize: '11.5px', fontWeight: '700' },
  btnActionDespachoDone: { padding: '5px 12px', borderRadius: '6px', border: '1px solid #059669', backgroundColor: 'rgba(5, 150, 105, 0.08)', color: '#059669', cursor: 'pointer', fontSize: '11.5px', fontWeight: '700' },
  btnExecuteSanction: { padding: '3px 8px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-main)' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '13px', outline: 'none' },
  textarea: { padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '13px', minHeight: '70px', resize: 'vertical', outline: 'none' },
  btnCancelModal: { padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '13px' },
  btnSaveModal: { padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }
};
