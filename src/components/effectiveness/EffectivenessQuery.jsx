import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useOrgData from '../../hooks/useOrgData';
import { mozambiqueStructure } from '../../utils/mozambiqueDistricts';
import ConfirmModal from '../ConfirmModal';
import * as XLSX from 'xlsx';

export default function EffectivenessQuery({ onGoToRegister }) {
  const { employees } = useEmployeeData();
  const { records, updateRecord, deleteRecord } = useEffectivenessData();
  const { data: orgData } = useOrgData();

  // Search/Filters states
  const [searchTerm, setSearchTerm] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [directorateId, setDirectorateId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [careerId, setCareerId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [absenceType, setAbsenceType] = useState('');
  
  // Date Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // Grouping Criteria
  const [groupCriteria, setGroupCriteria] = useState('none'); // 'none', 'directorate', 'department', 'province', 'district', 'career', 'category', 'type'

  // Selected Employee for History Detail
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  // Editing Absence Modal State
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [editType, setEditType] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, hideCancel: false });

  const getName = (list, id) => list?.find(item => item.id === id)?.name || '-';

  const formatDatesList = (dates = []) => {
    if (!dates.length) return '';
    return dates.map(d => {
      const parts = d.split('-');
      if (parts.length !== 3) return d;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }).join(', ');
  };

  const exportToExcel = () => {
    const dataToExport = faltososList.map(emp => ({
      'NUIT': emp.nip,
      'Nome do Funcionário': emp.name,
      'Carreira': emp.career,
      'Categoria': emp.category,
      'Cargo': emp.role || 'Sem Cargo',
      'Província': emp.provinceId,
      'Distrito': emp.districtId,
      'Direcção / Unidade': emp.directorate,
      'Departamento': emp.department,
      'Tipos de Faltas': Array.from(emp.types).join(' / '),
      'Total de Dias de Faltas': emp.totalDays,
      'Data da Última Falta': emp.lastAbsenceDate ? emp.lastAbsenceDate.split('-').reverse().join('/') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio_Faltas");
    XLSX.writeFile(workbook, `Faltas_SERNIC_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Province districts cascading
  const selectedProvinceData = mozambiqueStructure.find(p => p.province === provinceId);
  const availableDistricts = selectedProvinceData ? selectedProvinceData.districts : [];

  // Filtered list of raw absences records
  const filteredAbsences = useMemo(() => {
    return records.filter(rec => {
      // Global search term (Name or NUIT)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const empName = (rec.employeeName || '').toLowerCase();
        const empNip = (rec.employeeNip || '').toLowerCase();
        if (!empName.includes(term) && !empNip.includes(term)) return false;
      }

      // Structure filters
      if (provinceId && rec.provinceId !== provinceId) return false;
      if (districtId && rec.districtId !== districtId) return false;
      if (directorateId && rec.directorateId !== directorateId) return false;
      if (departmentId && rec.departmentId !== departmentId) return false;
      if (divisionId && rec.divisionId !== divisionId) return false;
      if (sectionId && rec.sectionId !== sectionId) return false;

      // RH filters
      if (careerId && rec.careerId !== careerId) return false;
      if (categoryId && rec.categoryId !== categoryId) return false;
      if (absenceType && rec.type !== absenceType) return false;

      if (roleFilter) {
        const role = (rec.jobPosition || '').toLowerCase();
        if (!role.includes(roleFilter.toLowerCase())) return false;
      }

      // Fallbacks for older records
      const recStartDate = rec.startDate || (rec.dates && rec.dates.length > 0 ? rec.dates[0] : '');
      const recEndDate = rec.endDate || (rec.dates && rec.dates.length > 0 ? rec.dates[rec.dates.length - 1] : '');

      // Date range overlap check
      if (dateFrom && recEndDate < dateFrom) return false;
      if (dateTo && recStartDate > dateTo) return false;

      // Month/Year check
      if (yearFilter && recStartDate) {
        const recYear = recStartDate.split('-')[0];
        if (recYear !== yearFilter) return false;
      }
      if (monthFilter && recStartDate) {
        const recMonth = recStartDate.split('-')[1];
        if (recMonth !== monthFilter) return false;
      }

      return true;
    });
  }, [records, searchTerm, provinceId, districtId, directorateId, departmentId, divisionId, sectionId, careerId, categoryId, roleFilter, absenceType, dateFrom, dateTo, yearFilter, monthFilter]);

  // Group absences by employee to build the "Funcionários Faltosos" view
  const faltososList = useMemo(() => {
    const map = {};

    filteredAbsences.forEach(rec => {
      const empId = rec.employeeId;
      if (!map[empId]) {
        map[empId] = {
          employeeId: empId,
          nip: rec.employeeNip,
          name: rec.employeeName,
          gender: rec.gender,
          provinceId: rec.provinceId || '',
          districtId: rec.districtId || '',
          career: getName(orgData.careers, rec.careerId),
          category: getName(orgData.categories, rec.categoryId),
          role: rec.jobPosition,
          directorate: getName(orgData.directorates, rec.directorateId),
          department: getName(orgData.departments, rec.departmentId),
          division: getName(orgData.divisions, rec.divisionId),
          section: getName(orgData.sections, rec.sectionId),
          totalDays: 0,
          types: new Set(),
          lastAbsenceDate: '',
          absences: []
        };
      }

      const recDaysCount = rec.daysCount !== undefined ? rec.daysCount : (rec.dates ? rec.dates.length : 0);
      const recEndDate = rec.endDate || (rec.dates && rec.dates.length > 0 ? rec.dates[rec.dates.length - 1] : '');

      map[empId].totalDays += recDaysCount;
      map[empId].types.add(rec.type);
      map[empId].absences.push(rec);

      if (!map[empId].lastAbsenceDate || recEndDate > map[empId].lastAbsenceDate) {
        map[empId].lastAbsenceDate = recEndDate;
      }
    });

    return Object.values(map).sort((a, b) => b.totalDays - a.totalDays);
  }, [filteredAbsences, orgData]);

  // Selected employee's detailed history
  const selectedEmpDetails = useMemo(() => {
    if (!selectedEmpId) return null;
    return faltososList.find(f => f.employeeId === selectedEmpId) || null;
  }, [faltososList, selectedEmpId]);

  // Smart Grouping logic
  const groupedData = useMemo(() => {
    if (groupCriteria === 'none') return [];

    const groups = {};

    filteredAbsences.forEach(rec => {
      let key = '';
      switch (groupCriteria) {
        case 'directorate':
          key = getName(orgData.directorates, rec.directorateId);
          break;
        case 'department':
          key = getName(orgData.departments, rec.departmentId);
          break;
        case 'division':
          key = getName(orgData.divisions, rec.divisionId);
          break;
        case 'section':
          key = getName(orgData.sections, rec.sectionId);
          break;
        case 'province':
          key = rec.provinceId || 'Direcção Geral';
          break;
        case 'district':
          key = rec.districtId || 'Direcção Geral';
          break;
        case 'career':
          key = getName(orgData.careers, rec.careerId);
          break;
        case 'category':
          key = getName(orgData.categories, rec.categoryId);
          break;
        case 'type':
          key = rec.type;
          break;
        default:
          key = 'Outro';
      }

      if (!groups[key]) {
        groups[key] = {
          name: key,
          employees: new Set(),
          totalDays: 0
        };
      }

      groups[key].employees.add(rec.employeeId);
      groups[key].totalDays += rec.daysCount;
    });

    return Object.values(groups).map(g => ({
      name: g.name,
      employeesCount: g.employees.size,
      totalDays: g.totalDays,
      averageDays: g.employees.size > 0 ? (g.totalDays / g.employees.size).toFixed(1) : 0
    })).sort((a, b) => b.totalDays - a.totalDays);
  }, [filteredAbsences, groupCriteria, orgData]);

  // Soft delete / anular falta handler
  const handleSoftDelete = (absenceId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Anulação',
      message: 'Pretende anular/remover esta falta permanentemente do histórico do funcionário? Esta operação será registada na Auditoria.',
      isDestructive: true,
      hideCancel: false,
      onConfirm: () => {
        const res = deleteRecord(absenceId);
        if (res.success) {
          setConfirmModal({
            isOpen: true,
            title: 'Sucesso',
            message: 'Falta anulada com sucesso.',
            hideCancel: true,
            confirmText: 'OK'
          });
        } else {
          setConfirmModal({
            isOpen: true,
            title: 'Erro',
            message: res.error,
            hideCancel: true,
            confirmText: 'OK'
          });
        }
      }
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (abs) => {
    setEditingAbsence(abs);
    setEditType(abs.type);
    setEditStart(abs.startDate);
    setEditEnd(abs.endDate);
    setEditReason(abs.reason);
    setEditNotes(abs.notes || '');
    setEditError('');
  };

  // Submit Edit
  const handleSaveEdit = (e) => {
    e.preventDefault();
    setEditError('');

    const res = updateRecord(editingAbsence.id, {
      type: editType,
      startDate: editStart,
      endDate: editEnd,
      reason: editReason,
      notes: editNotes
    });

    if (res.success) {
      setConfirmModal({
        isOpen: true,
        title: 'Sucesso',
        message: 'Falta atualizada com sucesso.',
        hideCancel: true,
        confirmText: 'OK',
        onConfirm: () => {
          setEditingAbsence(null);
        }
      });
    } else {
      setEditError(res.error);
    }
  };

  return (
    <div style={styles.container}>
      
      {/* Bloco de Filtros */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h4 style={styles.cardTitle}>Pesquisa de Funcionários Faltosos</h4>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.filterGrid}>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Pesquisa por Nome/NUIT</label>
              <input 
                type="text" 
                placeholder="Ex: João da Silva..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                style={styles.input} 
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de Falta</label>
              <select value={absenceType} onChange={(e) => setAbsenceType(e.target.value)} style={styles.input}>
                <option value="">Todos os Tipos</option>
                <option value="Falta Justificada">Falta Justificada</option>
                <option value="Falta Injustificada">Falta Injustificada</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Província</label>
              <select value={provinceId} onChange={(e) => { setProvinceId(e.target.value); setDistrictId(''); }} style={styles.input}>
                <option value="">Todas</option>
                {mozambiqueStructure.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Distrito</label>
              <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} style={styles.input} disabled={!provinceId}>
                <option value="">Todos</option>
                {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Direcção</label>
              <select value={directorateId} onChange={(e) => { setDirectorateId(e.target.value); setDepartmentId(''); setDivisionId(''); setSectionId(''); }} style={styles.input}>
                <option value="">Todas</option>
                {orgData.directorates.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Departamento / Direcção Distrital</label>
              <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setDivisionId(''); setSectionId(''); }} style={styles.input} disabled={!directorateId}>
                <option value="">Todos</option>
                {orgData.departments.filter(d => d.directorateId === directorateId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Carreira</label>
              <select value={careerId} onChange={(e) => setCareerId(e.target.value)} style={styles.input}>
                <option value="">Todas</option>
                {orgData.careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Período (De - Até)</label>
              <div style={{display:'flex', gap:'4px', flexWrap:'wrap'}}>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{...styles.input, padding:'10px 4px', flex:1}} />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{...styles.input, padding:'10px 4px', flex:1}} />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Mês / Ano</label>
              <div style={{display:'flex', gap:'4px', flexWrap:'wrap'}}>
                <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{...styles.input, flex:1}}>
                  <option value="">Mês</option>
                  {Array.from({length: 12}).map((_, i) => {
                    const m = (i + 1).toString().padStart(2, '0');
                    return <option key={m} value={m}>{m}</option>;
                  })}
                </select>
                <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{...styles.input, flex:1}}>
                  <option value="">Ano</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Agrupamento Inteligente</label>
              <select value={groupCriteria} onChange={(e) => setGroupCriteria(e.target.value)} style={{...styles.input, borderColor:'var(--color-primary)', fontWeight:'600'}}>
                <option value="none">Nenhum (Lista Geral)</option>
                <option value="directorate">Por Direcção</option>
                <option value="department">Por Departamento</option>
                <option value="province">Por Província</option>
                <option value="district">Por Distrito</option>
                <option value="career">Por Carreira</option>
                <option value="category">Por Categoria</option>
                <option value="type">Por Tipo de Falta</option>
              </select>
            </div>

          </div>

          <div style={styles.filterFooter}>
            <button 
              type="button" 
              onClick={() => {
                setSearchTerm(''); setProvinceId(''); setDistrictId(''); setDirectorateId('');
                setDepartmentId(''); setDivisionId(''); setSectionId(''); setCareerId('');
                setCategoryId(''); setRoleFilter(''); setAbsenceType(''); setDateFrom('');
                setDateTo(''); setYearFilter(''); setMonthFilter(''); setGroupCriteria('none');
              }}
              style={styles.btnReset}
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Exibição Condicional baseada no Agrupamento */}
      {groupCriteria !== 'none' ? (
        
        /* 1. Modo Agrupado */
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h4 style={styles.cardTitle}>Agrupamento Inteligente de Faltosos</h4>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.tableContainer}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Critério / Grupo</th>
                    <th>Qtd. Funcionários Faltosos</th>
                    <th>Total de Dias de Falta</th>
                    <th>Média de Dias por Funcionário</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={styles.empty}>Nenhum registo no período.</td>
                    </tr>
                  ) : (
                    groupedData.map((g, idx) => (
                      <tr key={idx} style={styles.tr}>
                        <td><strong>{g.name}</strong></td>
                        <td>{g.employeesCount}</td>
                        <td>{g.totalDays} Dias</td>
                        <td><strong style={{color:'var(--color-primary)'}}>{g.averageDays} dias/func</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      ) : (

        /* 2. Modo Lista de Funcionários Faltosos */
        <div style={styles.resultsContainer}>
          
          {/* Tabela Principal */}
          <div style={{...styles.card, flex: 1, minWidth: '350px'}}>
            <div style={styles.cardHeaderWithInfo}>
              <h4 style={styles.cardTitle}>Lista de Funcionários com Faltas</h4>
              <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={exportToExcel} style={{...styles.btnGoToRegister, backgroundColor: '#107c41'}}>Exportar Excel</button>
                <button onClick={onGoToRegister} style={styles.btnGoToRegister}>+ Registar Nova Falta</button>
              </div>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.tableContainer}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>NUIT</th>
                      <th>Funcionário</th>
                      <th>Direcção / Unidade</th>
                      <th>Faltas Registadas</th>
                      <th>Total Dias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faltososList.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={styles.empty}>Nenhum funcionário faltoso encontrado com os filtros definidos.</td>
                      </tr>
                    ) : (
                      faltososList.map(emp => (
                        <tr 
                          key={emp.employeeId} 
                          onClick={() => setSelectedEmpId(emp.employeeId)}
                          style={{
                            ...styles.tr,
                            backgroundColor: selectedEmpId === emp.employeeId ? 'rgba(27, 54, 93, 0.05)' : 'transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <td>{emp.nip}</td>
                          <td>
                            <div style={{fontWeight:'700'}}>{emp.name}</div>
                            <div style={{fontSize:'12px', color:'var(--color-text-muted)'}}>{emp.role}</div>
                          </td>
                          <td>
                            <div style={{fontWeight:'600'}}>{emp.directorate}</div>
                            <div style={{fontSize:'11px', color:'var(--color-text-muted)'}}>{emp.department}</div>
                          </td>
                          <td>
                            {[...emp.types].map(t => (
                              <span key={t} style={{
                                ...styles.typeBadge,
                                ...(t === 'Falta Justificada' ? styles.badgeGreen : styles.badgeRed)
                              }}>
                                {t}
                              </span>
                            ))}
                          </td>
                          <td>
                            <strong style={{fontSize:'15px', color:'var(--color-primary)'}}>{emp.totalDays}</strong> Dias
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Histórico Detalhado do Funcionário Selecionado */}
          {selectedEmpDetails && (
            <div style={styles.detailCard}>
              <div style={styles.cardHeader}>
                <h4 style={styles.cardTitle}>Histórico de Faltas do Colaborador</h4>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.detailHeaderBox}>
                  <strong>{selectedEmpDetails.name}</strong><br />
                  <span style={{fontSize:'12px', color:'var(--color-text-muted)'}}>
                    NUIT: {selectedEmpDetails.nip} • {selectedEmpDetails.role}
                  </span>
                </div>

                <div style={styles.historyList}>
                  {selectedEmpDetails.absences.map(abs => (
                    <div key={abs.id} style={styles.historyItem}>
                      
                      <div style={styles.historyItemHeader}>
                        <span style={{
                          ...styles.typeBadge,
                          ...(abs.type === 'Falta Justificada' ? styles.badgeGreen : styles.badgeRed)
                        }}>
                          {abs.type}
                        </span>
                        <strong style={{color:'var(--color-primary)'}}>{abs.daysCount} {abs.daysCount === 1 ? 'dia' : 'dias'}</strong>
                      </div>

                      <div style={styles.historyItemMeta}>
                        <div>Dias de Falta: <strong>{abs.dates && abs.dates.length > 0 ? formatDatesList(abs.dates) : `${abs.startDate} a ${abs.endDate}`}</strong></div>
                        <div>Motivo: <em>{abs.reason}</em></div>
                        {abs.notes && <div style={{marginTop:'4px', fontSize:'12px', color:'var(--color-text-muted)'}}>Obs: {abs.notes}</div>}
                        {abs.attachment && (
                          <div style={{marginTop:'6px'}}>
                            <span style={{fontSize:'12px'}}>Documento: </span>
                            <a href="#" onClick={(e) => { e.preventDefault(); setConfirmModal({ isOpen: true, title: 'Documento Comprovativo', message: `A simular a abertura do documento "${abs.attachment.name}"...`, hideCancel: true, confirmText: 'Fechar' }); }} style={styles.attachmentLink}>
                              📄 {abs.attachment.name}
                            </a>
                          </div>
                        )}
                      </div>

                      <div style={styles.historyItemFooter}>
                        <span>Registado por: <strong>{abs.createdBy}</strong></span>
                        <span>Em: {new Date(abs.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Botões de Ação na Falta */}
                      <div style={styles.historyActions}>
                        <button 
                          onClick={() => handleOpenEdit(abs)} 
                          style={styles.btnEditAbsence}
                        >
                          Editar Falta
                        </button>
                        <button 
                          onClick={() => handleSoftDelete(abs.id)} 
                          style={styles.btnDeleteAbsence}
                        >
                          Anular/Remover
                        </button>
                      </div>

                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setSelectedEmpId(null)} 
                  style={styles.btnCloseDetail}
                >
                  Fechar Histórico
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Modal de Edição de Falta */}
      {editingAbsence && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h4 style={styles.modalTitle}>Editar Registo de Falta</h4>
              <button onClick={() => setEditingAbsence(null)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit} style={styles.modalForm}>
              {editError && <div style={styles.modalError}>{editError}</div>}
              
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipo de Falta</label>
                  <select value={editType} onChange={(e) => setEditType(e.target.value)} style={styles.input} required>
                    <option value="Falta Justificada">Falta Justificada</option>
                    <option value="Falta Injustificada">Falta Injustificada</option>
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Dias de Ausência</label>
                  <div style={styles.daysBadge}>
                    {calculateDaysCount(editStart, editEnd)} Dias
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Data Inicial</label>
                  <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} style={styles.input} required />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Data Final</label>
                  <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} style={styles.input} required />
                </div>

                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Motivo</label>
                  <input type="text" value={editReason} onChange={(e) => setEditReason(e.target.value)} style={styles.input} required />
                </div>

                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Observações</label>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} style={{...styles.input, minHeight:'60px'}} />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setEditingAbsence(null)} style={styles.btnSecondary}>Cancelar</button>
                <button type="submit" style={styles.btnSubmit}>Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
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
        hideCancel={confirmModal.hideCancel}
        confirmText={confirmModal.confirmText || 'Confirmar'}
        isDestructive={confirmModal.isDestructive}
      />

    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s' },
  card: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', overflow: 'hidden' },
  cardHeader: { padding: '16px 20px', borderBottom: '1px solid var(--color-border)' },
  cardHeaderWithInfo: { padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--color-text-base)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardBody: { padding: '20px' },
  
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px', outline: 'none' },
  filterFooter: { marginTop: '16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px' },
  btnReset: { background: 'none', border: '1px solid var(--color-border)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-base)', fontWeight: '600' },
  
  resultsContainer: { display: 'flex', gap: '24px', alignItems: 'start', flexWrap: 'wrap' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px' },
  tr: { borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' },
  td: { padding: '12px', color: 'var(--color-text-base)' },
  
  typeBadge: { padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', display: 'inline-block', marginRight: '6px' },
  badgeGreen: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669' },
  badgeRed: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#DC2626' },
  
  btnGoToRegister: { padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  
  // Detail card
  detailCard: { width: '380px', backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' },
  detailHeaderBox: { padding: '16px', backgroundColor: 'rgba(27, 54, 93, 0.05)', borderBottom: '1px solid var(--color-border)', lineHeight: '1.4' },
  historyList: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto' },
  historyItem: { border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px', backgroundColor: 'var(--color-bg-base)', display: 'flex', flexDirection: 'column', gap: '8px' },
  historyItemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyItemMeta: { fontSize: '12px', color: 'var(--color-text-base)', lineHeight: '1.4' },
  attachmentLink: { color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '700' },
  historyItemFooter: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-muted)', borderTop: '1px dashed var(--color-border)', paddingTop: '6px' },
  
  historyActions: { display: 'flex', gap: '8px', marginTop: '4px' },
  btnEditAbsence: { background: 'none', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: 'var(--color-text-base)', cursor: 'pointer' },
  btnDeleteAbsence: { background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' },

  btnCloseDetail: { display: 'block', width: 'calc(100% - 32px)', margin: '0 16px 16px 16px', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px', background: 'transparent', color: 'var(--color-text-base)', fontWeight: '600', cursor: 'pointer', textAlign: 'center' },

  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', width: '90%', maxWidth: '500px', overflow: 'hidden' },
  modalHeader: { padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-base)' },
  modalTitle: { margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--color-text-base)' },
  closeBtn: { border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--color-text-muted)' },
  modalForm: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' },
  daysBadge: { padding: '10px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '14px', textAlign: 'center', fontWeight: '700', color: 'var(--color-primary)' },
  modalError: { padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: '6px', fontSize: '12px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' },
  btnSecondary: { padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: '6px', background: 'transparent', color: 'var(--color-text-base)', cursor: 'pointer' },
  btnSubmit: { padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: '700', cursor: 'pointer' }
};

