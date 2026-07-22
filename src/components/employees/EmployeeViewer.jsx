import React, { useState, useEffect, useCallback } from 'react';
import { fetchEmployees, getEmployeeStats } from '../../services/employeeApiService';
import AdvancedFilters from './AdvancedFilters';
import EmployeeStats from './EmployeeStats';
import ConfirmModal from '../ConfirmModal';
import EmployeeDetailsModal from './EmployeeDetailsModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useDisciplinaryData from '../../hooks/useDisciplinaryData';
import useEvaluationData from '../../hooks/useEvaluationData';
import { getClassification } from '../../utils/evaluationRules';
import CrudActionButtons from '../common/CrudActionButtons';

export default function EmployeeViewer({ employees, orgData, onEdit, onDelete, onRefresh }) {
  const { data } = orgData;
  const { getProcessesByEmployee } = useDisciplinaryData();
  const { getLatestEvaluation } = useEvaluationData();

  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'org'
  const [filters, setFilters] = useState({
    searchTerm: '',
    directorateId: '', departmentId: '', divisionId: '', sectionId: '',
    careerId: '', categoryId: '', role: '', class: '', step: '',
    academicLevel: '', employmentStatus: '',
    gender: '', ageRange: '', isActive: ''
  });

  const [pagination, setPagination] = useState({ page: 1, limit: 15 });
  const [sort, setSort] = useState({ field: 'name', order: 'asc' });

  const [results, setResults] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, empId: null });
  const [fullScreenPhoto, setFullScreenPhoto] = useState(null);
  const [viewDetailsEmp, setViewDetailsEmp] = useState(null);

  useEffect(() => {
    if (viewDetailsEmp) {
      const updatedEmp = employees.find(e => e.id === viewDetailsEmp.id);
      if (updatedEmp && JSON.stringify(updatedEmp) !== JSON.stringify(viewDetailsEmp)) {
        setViewDetailsEmp(updatedEmp);
      }
    }

    const detailsId = localStorage.getItem('sernic_details_employee_id');
    if (detailsId && employees.length > 0) {
      const emp = employees.find(e => e.id === detailsId);
      if (emp) {
        setViewDetailsEmp(emp);
        localStorage.removeItem('sernic_details_employee_id');
      }
    }
  }, [employees, viewDetailsEmp]);

  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const res = await fetchEmployees(employees, orgData, filters, pagination, sort);
      setResults(res.data);
      setTotalItems(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingData(false);
    }
  }, [employees, orgData, filters, pagination, sort]);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const resStats = await getEmployeeStats(employees, orgData, filters);
      setStats(resStats);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingStats(false);
    }
  }, [employees, orgData, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStats();
    // Reiniciar para página 1 sempre que os filtros mudarem
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters, loadStats]);

  const handleSort = (field) => {
    setSort(prev => {
      if (prev.field === field) return { field, order: prev.order === 'asc' ? 'desc' : 'asc' };
      return { field, order: 'asc' };
    });
  };

  const getName = (list, id) => list.find(item => item.id === id)?.name || '-';

  const exportExcel = async () => {
    // Obter todos sem paginação
    const res = await fetchEmployees(employees, orgData, filters, { page: 1, limit: 999999 }, sort);
    const exportData = res.data.map(emp => ({
      'NUIT': emp.nip,
      'Nome': emp.name,
      'Género': (emp.gender === 'M' || emp.gender === 'Masculino') ? 'Masculino' : ((emp.gender === 'F' || emp.gender === 'Feminino') ? 'Feminino' : (emp.gender || '')),
      'Carreira': getName(data.careers || [], emp.careerId),
      'Categoria': getName(data.categories, emp.categoryId),
      'Direcção': getName(data.directorates, emp.directorateId),
      'Departamento': getName(data.departments, emp.departmentId),
      'Repartição': getName(data.divisions, emp.divisionId),
      'Secção': getName(data.sections, emp.sectionId),
      'Estado': emp.isActive ? 'Ativo' : 'Inativo',
      'Data de Ingresso': emp.admissionDate || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Funcionários");
    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-');
    XLSX.writeFile(workbook, `Lista_Funcionarios_${dateStr}.xlsx`);
  };

  const exportPDF = async () => {
    const res = await fetchEmployees(employees, orgData, filters, { page: 1, limit: 999999 }, sort);
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text('Listagem de Funcionários', 14, 15);
    doc.setFontSize(10);
    doc.text(`Total: ${res.total} | Data: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableColumn = ["NUIT", "Nome", "Género", "Carreira", "Direcção", "Estado"];
    const tableRows = [];

    res.data.forEach(emp => {
      const rowData = [
        emp.nip,
        emp.name,
        emp.gender,
        getName(data.careers || [], emp.careerId),
        getName(data.directorates, emp.directorateId),
        emp.isActive ? 'Ativo' : 'Inativo'
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [44, 62, 80] }
    });

    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-');
    doc.save(`Funcionarios_${dateStr}.pdf`);
  };

  const printFicha = (emp) => {
    const processes = getProcessesByEmployee(emp.id);
    let disciplinaryHtml = '';
    
    if (processes.length === 0) {
      disciplinaryHtml = '<p style="font-size:14px; color:#718096; font-style:italic;">Sem registo de processo disciplinar.</p>';
    } else {
      disciplinaryHtml = `
        <table className="premium-table">
          <thead>
            <tr>
              <th style="border-bottom:2px solid #e2e8f0; padding:8px; text-align:left;">Nº Processo</th>
              <th style="border-bottom:2px solid #e2e8f0; padding:8px; text-align:left;">Tipo</th>
              <th style="border-bottom:2px solid #e2e8f0; padding:8px; text-align:left;">Estado</th>
              <th style="border-bottom:2px solid #e2e8f0; padding:8px; text-align:left;">Data Infração</th>
            </tr>
          </thead>
          <tbody>
            ${processes.map(p => `
              <tr>
                <td style="border-bottom:1px solid #e2e8f0; padding:8px;"><strong>${p.processNumber || '-'}</strong></td>
                <td style="border-bottom:1px solid #e2e8f0; padding:8px;">${p.type || '-'}</td>
                <td style="border-bottom:1px solid #e2e8f0; padding:8px;">${p.status || '-'}</td>
                <td style="border-bottom:1px solid #e2e8f0; padding:8px;">${p.infractionDate || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Ficha do Funcionário</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { border-bottom: 2px solid #2c3e50; padding-bottom: 10px; color: #2c3e50; }
            .section { margin-top: 30px; }
            .section h3 { background-color: #f8fafc; padding: 10px; border-left: 4px solid #3182ce; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
            .item { margin-bottom: 10px; }
            .label { font-weight: bold; color: #718096; font-size: 12px; text-transform: uppercase; }
            .value { font-size: 14px; margin-top: 4px; }
            .header-flex { display: flex; align-items: flex-start; justify-content: space-between; gap: 30px; }
            .photo-box { width: 120px; height: 120px; border: 2px solid #e2e8f0; border-radius: 8px; object-fit: cover; }
          </style>
        </head>
        <body>
          <h1>Ficha Individual de Funcionário</h1>
          
          <div class="section header-flex">
            <div style="flex: 1;">
              <h3>Identificação</h3>
              <div class="grid">
                <div class="item"><div class="label">Nome Completo</div><div class="value">${emp.name || '-'}</div></div>
                 <div class="item"><div class="label">NUIT</div><div class="value">${emp.nip || '-'}</div></div>
                <div class="item"><div class="label">Nº de BI</div><div class="value">${emp.bi || '-'}</div></div>
                <div class="item"><div class="label">Data de Nascimento</div><div class="value">${emp.dob || '-'}</div></div>
                <div class="item"><div class="label">Género</div><div class="value">${emp.gender || '-'}</div></div>
                <div class="item"><div class="label">Nacionalidade</div><div class="value">${emp.nationality || '-'}</div></div>
              </div>
            </div>
            <div>
              ${emp.photo ? `<img src="${emp.photo}" class="photo-box" alt="Foto do Funcionário" />` : '<div class="photo-box" style="display:flex; align-items:center; justify-content:center; background:#f8fafc; color:#a0aec0; font-size:12px; text-align:center;">Sem Foto</div>'}
            </div>
          </div>

          <div class="section">
            <h3>Profissional</h3>
            <div class="grid">
              <div class="item"><div class="label">Carreira</div><div class="value">${getName(data.careers || [], emp.careerId)}</div></div>
              <div class="item"><div class="label">Categoria Funcional</div><div class="value">${getName(data.categories, emp.categoryId)}</div></div>
              <div class="item"><div class="label">Cargo</div><div class="value">${emp.role || '-'}</div></div>
              <div class="item"><div class="label">Nível Académico</div><div class="value">${emp.academicLevel || '-'}</div></div>
              <div class="item"><div class="label">Situação Laboral</div><div class="value">${emp.employmentStatus || '-'}</div></div>
              <div class="item"><div class="label">Data de Ingresso</div><div class="value">${emp.admissionDate || '-'}</div></div>
            </div>
          </div>

          <div class="section">
            <h3>Colocação</h3>
            <div class="grid">
              <div class="item"><div class="label">Direcção</div><div class="value">${getName(data.directorates, emp.directorateId)}</div></div>
              <div class="item"><div class="label">Departamento</div><div class="value">${getName(data.departments, emp.departmentId)}</div></div>
              <div class="item"><div class="label">Repartição</div><div class="value">${getName(data.divisions, emp.divisionId)}</div></div>
            </div>
          </div>

          <div class="section">
            <h3>Histórico Disciplinar</h3>
            ${disciplinaryHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const SortIcon = ({ field }) => {
    if (sort.field !== field) return <span style={{opacity: 0.3}}>↕</span>;
    return <span>{sort.order === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="employee-viewer-container">
      <div style={styles.tabsContainer}>
        <button onClick={() => { setActiveTab('all'); setFilters({...filters, directorateId: '', departmentId: '', divisionId: '', sectionId: ''}); }} style={activeTab === 'all' ? styles.activeTab : styles.tab}>Todos os Funcionários</button>
        <button onClick={() => setActiveTab('org')} style={activeTab === 'org' ? styles.activeTab : styles.tab}>Por Estrutura Organizacional</button>
      </div>

      {activeTab === 'org' && (
        <div style={{...styles.orgFilterBanner, marginBottom: '24px'}}>
          <p style={{margin: '0 0 16px 0', fontSize: '14px', color: 'var(--color-primary)', fontWeight: '600'}}>Filtre os funcionários pela hierarquia da instituição:</p>
          <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap'}}>
            <select name="directorateId" value={filters.directorateId} onChange={(e) => setFilters(p => ({...p, directorateId: e.target.value, departmentId: '', divisionId: '', sectionId: ''}))} style={styles.filterSelect}>
              <option value="">Selecione a Direcção...</option>
              {data.directorates.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select name="departmentId" value={filters.departmentId} onChange={(e) => setFilters(p => ({...p, departmentId: e.target.value, divisionId: '', sectionId: ''}))} style={styles.filterSelect} disabled={!filters.directorateId}>
              <option value="">Selecione o Departamento...</option>
              {data.departments.filter(d => d.directorateId === filters.directorateId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select name="divisionId" value={filters.divisionId} onChange={(e) => setFilters(p => ({...p, divisionId: e.target.value, sectionId: ''}))} style={styles.filterSelect} disabled={!filters.departmentId}>
              <option value="">Selecione a Repartição...</option>
              {data.divisions.filter(d => d.departmentId === filters.departmentId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <EmployeeStats stats={stats} isLoading={isLoadingStats} />

      {/* Ferramentas e Filtros */}
      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <input 
            type="text" 
            placeholder="Pesquisar por Nome ou NUIT..." 
            value={filters.searchTerm}
            onChange={(e) => setFilters(p => ({...p, searchTerm: e.target.value}))}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.actions}>
          <button onClick={exportExcel} style={styles.btnAction}>Excel</button>
          <button onClick={exportPDF} style={styles.btnAction}>PDF</button>
          <button onClick={() => window.print()} style={styles.btnAction}>Imprimir Lista</button>
        </div>
      </div>

      <AdvancedFilters filters={filters} setFilters={setFilters} orgData={orgData} />

      {/* Tabela de Resultados */}
      <div style={styles.tableContainer}>
        {isLoadingData ? (
          <div style={{padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '15px'}}>A carregar dados dos funcionários...</div>
        ) : (
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort('nip')}>NUIT <SortIcon field="nip" /></th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort('name')}>Funcionário <SortIcon field="name" /></th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort('gender')}>G. <SortIcon field="gender" /></th>
                <th>Carreira & Categoria</th>
                <th>Colocação</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan="7" style={styles.empty}>Nenhum funcionário encontrado.</td>
                </tr>
              ) : (
                results.map(emp => {
                  const getInitials = (name) => {
                    if (!name) return '?';
                    const parts = name.trim().split(' ');
                    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                    return name.substring(0, 2).toUpperCase();
                  };

                  return (
                  <tr key={emp.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#475569', letterSpacing: '0.5px' }}>
                        {emp.nip}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {emp.photo ? (
                          <img src={emp.photo} alt="avatar" style={{width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer'}} onClick={() => setFullScreenPhoto(emp.photo)} title="Ver foto em FHD" />
                        ) : (
                          <div className="avatar-initials">{getInitials(emp.name)}</div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{emp.name}</span>
                          <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            Ingresso: {emp.admissionDate || 'N/D'}
                          </span>
                        </div>
                        {(() => {
                          const latestEval = getLatestEvaluation(emp.id);
                          if (!latestEval) return null;
                          const cls = getClassification(latestEval.score);
                          return (
                            <div title={`Classificação ${latestEval.year}: ${cls.label} (${latestEval.score}v)`} style={{
                              width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cls.hexBadge,
                              marginLeft: 'auto', boxShadow: '0 0 0 2px #fff, 0 0 0 3px rgba(0,0,0,0.05)'
                            }}></div>
                          );
                        })()}
                      </div>
                    </td>
                    <td style={{ color: '#64748b' }}>{emp.gender ? emp.gender[0].toUpperCase() : '-'}</td>
                    <td>
                      <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>{getName(data.careers || [], emp.careerId)}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{getName(data.categories, emp.categoryId)}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>{getName(data.directorates, emp.directorateId)}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{getName(data.departments, emp.departmentId)}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`premium-badge ${emp.isActive ? 'badge-ativo' : 'badge-inativo'}`}>
                          {emp.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                        {emp.healthStatus === 'Baixa Médica' && (
                          <span style={{ ...styles.badgeSaude, display: 'inline-flex', alignItems: 'center', gap: '4px' }} title="Em Baixa / Junta Médica">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                            Doente
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <CrudActionButtons 
                          onView={() => setViewDetailsEmp(emp)}
                          onEdit={() => onEdit(emp.id)}
                          editDisabled={['Falecido', 'Expulso', 'Demitido'].includes(emp.status)}
                          onDelete={() => setConfirmModal({ isOpen: true, empId: emp.id })}
                          viewTitle="Ver Detalhes"
                          editTitle={['Falecido', 'Expulso', 'Demitido'].includes(emp.status) ? `Edição bloqueada (Estado: ${emp.status})` : "Editar"}
                          deleteTitle="Apagar"
                          extraButtons={
                            <>
                              <button onClick={() => setViewDetailsEmp(emp)} className="premium-btn-icon" title="Actos e Histórico Funcional">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                              </button>
                              <button onClick={() => printFicha(emp)} className="premium-btn-icon" title="Ficha Individual">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                              </button>
                            </>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Controlos de Paginação */}
      {!isLoadingData && totalPages > 1 && (
        <div style={styles.pagination}>
          <span style={{fontSize: '13px', color: 'var(--color-text-muted)'}}>Página {pagination.page} de {totalPages}</span>
          <div style={{display: 'flex', gap: '8px'}}>
            <button 
              disabled={pagination.page === 1}
              onClick={() => setPagination(p => ({...p, page: p.page - 1}))}
              style={styles.pageBtn}
            >Anterior</button>
            <button 
              disabled={pagination.page === totalPages}
              onClick={() => setPagination(p => ({...p, page: p.page + 1}))}
              style={styles.pageBtn}
            >Próxima</button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Confirmar Eliminação"
        message="Tem a certeza que deseja eliminar este funcionário? O registo será movido para a lista de Funcionários Eliminados e o seu acesso suspenso."
        isDestructive={true}
        onConfirm={() => {
          onDelete(confirmModal.empId);
          setConfirmModal({ isOpen: false, empId: null });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, empId: null })}
      />

      {fullScreenPhoto && (
        <div style={styles.fullscreenOverlay} onClick={() => setFullScreenPhoto(null)}>
          <img src={fullScreenPhoto} style={styles.fullscreenImage} alt="Fullscreen FHD" />
          <button style={styles.closeFullscreenBtn} onClick={(e) => { e.stopPropagation(); setFullScreenPhoto(null); }}>✕</button>
        </div>
      )}

      {viewDetailsEmp && (
        <EmployeeDetailsModal 
          emp={viewDetailsEmp} 
          orgData={orgData} 
          onClose={() => setViewDetailsEmp(null)} 
          onRefresh={onRefresh}
          showRegisterAct={true}
        />
      )}
    </div>
  );
}

const styles = {
  tabsContainer: { display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' },
  tab: { padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid transparent' },
  activeTab: { padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid var(--color-primary)' },
  orgFilterBanner: { backgroundColor: 'rgba(49, 130, 206, 0.05)', border: '1px solid rgba(49, 130, 206, 0.2)', padding: '20px', borderRadius: '8px' },
  filterSelect: { padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px', minWidth: '220px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' },
  searchBox: { flex: 1, minWidth: '300px' },
  searchInput: { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px' },
  actions: { display: 'flex', gap: '12px' },
  btnAction: { padding: '10px 16px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  tableContainer: { overflowX: 'auto', padding: '2px' },
  empty: { textAlign: 'center', padding: '60px', color: '#94a3b8', fontStyle: 'italic', fontSize: '15px' },
  badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  badgeInactive: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  badgeSaude: { backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D', padding: '4px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '16px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  pageBtn: { padding: '8px 16px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  fullscreenOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.2s ease' },
  fullscreenImage: { maxHeight: '90vh', maxWidth: '90vw', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' },
  closeFullscreenBtn: { position: 'absolute', top: '20px', right: '30px', background: 'transparent', border: 'none', color: '#fff', fontSize: '30px', cursor: 'pointer', opacity: 0.8 }
};
