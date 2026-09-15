import React, { useState, useMemo } from 'react';
import { mozambiqueStructure } from '../../utils/mozambiqueDistricts';
import useEmployeeData from '../../hooks/useEmployeeData';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useOrgData from '../../hooks/useOrgData';
import { isCentralUser, filterByProvincialScope } from '../../utils/scopeUtils';
import ConfirmModal from '../ConfirmModal';
import MultiDateCalendar from './MultiDateCalendar';

export default function EffectivenessForm({ onRegistrationComplete, user, orgData: passedOrgData, employeesData }) {
  const { employees: allEmployees } = useEmployeeData();
  const { addRecord } = useEffectivenessData();
  const { data: hookOrgData } = useOrgData();

  const orgData = passedOrgData?.data || passedOrgData || hookOrgData || {};
  const isCentral = isCentralUser(user);

  const employees = useMemo(() => {
    let raw = (employeesData?.employees || (Array.isArray(employeesData) ? employeesData : null) || allEmployees) || [];
    if (!isCentral && user) {
      return filterByProvincialScope(raw, user, orgData);
    }
    return raw;
  }, [employeesData, allEmployees, isCentral, user, orgData]);

  // Structure selection states
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [directorateId, setDirectorateId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [sectionId, setSectionId] = useState('');

  // Active employee for individual absence registration modal
  const [selectedEmp, setSelectedEmp] = useState(null);
  
  // Employee search
  const [searchTerm, setSearchTerm] = useState('');

  // View options & Pagination
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Reset pagination on filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, provinceId, directorateId, departmentId, divisionId, sectionId, districtId, employees]);

  // Form states for the absence
  const [absenceType, setAbsenceType] = useState('Falta Justificada');
  const [currentDateInput, setCurrentDateInput] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, hideCancel: false });
  
  // Dragging state for modal
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - modalPos.x,
      y: e.clientY - modalPos.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setModalPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getName = (list, id) => list?.find(item => item.id === id)?.name || '-';

  // Province districts cascading
  const selectedProvinceData = mozambiqueStructure.find(p => p.province === provinceId);
  const availableDistricts = selectedProvinceData ? selectedProvinceData.districts : [];

  // Filter employees belonging to the selected unit
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (!e.isActive) return false;
      if (searchTerm && !e.name.toLowerCase().includes(searchTerm.toLowerCase()) && !(e.nip && e.nip.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
      if (provinceId && e.provinceId !== provinceId) return false;
      if (directorateId && e.directorateId !== directorateId) return false;
      if (departmentId && e.departmentId !== departmentId) return false;
      if (divisionId && e.divisionId !== divisionId) return false;
      if (sectionId && e.sectionId !== sectionId) return false;
      if (districtId && e.districtId !== districtId) return false;
      return true;
    });
  }, [employees, provinceId, districtId, directorateId, departmentId, divisionId, sectionId, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const currentEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Date management
  const handleAddDate = () => {
    if (!currentDateInput) return;
    if (selectedDates.includes(currentDateInput)) {
      setErrorMessage("Esta data já foi adicionada!");
      return;
    }
    setSelectedDates([...selectedDates, currentDateInput].sort());
    setCurrentDateInput('');
    setErrorMessage('');
  };

  const handleAddDateRange = () => {
    if (!rangeStart || !rangeEnd) {
      setErrorMessage("Selecione a data inicial e final do intervalo.");
      return;
    }
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    if (end < start) {
      setErrorMessage("A data final deve ser posterior ou igual à inicial.");
      return;
    }
    
    let current = new Date(start);
    const newDates = [];
    while (current <= end) {
      const dStr = current.toISOString().split('T')[0];
      if (!selectedDates.includes(dStr)) {
        newDates.push(dStr);
      }
      current.setDate(current.getDate() + 1);
    }
    
    if (newDates.length === 0) {
      setErrorMessage("Estas datas já foram adicionadas!");
      return;
    }

    setSelectedDates([...selectedDates, ...newDates].sort());
    setRangeStart('');
    setRangeEnd('');
    setErrorMessage('');
  };

  const handleRemoveDate = (dateToRemove) => {
    setSelectedDates(selectedDates.filter(d => d !== dateToRemove));
  };

  // Automatic calculation of days count
  const calculatedDays = selectedDates.length;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file extension
      const validExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        setConfirmModal({
          isOpen: true,
          title: 'Formato de Ficheiro Inválido',
          message: 'Apenas documentos (PDF, DOC) e fotos (JPG, PNG) são permitidos.',
          hideCancel: true,
          confirmText: 'OK'
        });
        return;
      }

      setAttachment({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type
      });
    }
  };

  const handleOpenModal = (emp) => {
    setSelectedEmp(emp);
    setAbsenceType('Falta Justificada');
    setSelectedDates([]);
    setCurrentDateInput('');
    setRangeStart('');
    setRangeEnd('');
    setReason('');
    setNotes('');
    setAttachment(null);
    setErrorMessage('');
    setModalPos({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleSubmitAbsence = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (calculatedDays <= 0) {
      setErrorMessage("Deve adicionar pelo menos um dia de falta!");
      return;
    }

    const dirObj = (orgData?.directorates || []).find(d => String(d.id) === String(selectedEmp.directorateId));

    const payload = {
      employeeId: selectedEmp.id,
      employeeNip: selectedEmp.nip,
      employeeName: selectedEmp.name,
      gender: selectedEmp.gender,
      type: absenceType,
      dates: selectedDates,
      daysCount: calculatedDays,
      startDate: selectedDates.length > 0 ? selectedDates[0] : '',
      endDate: selectedDates.length > 0 ? selectedDates[selectedDates.length - 1] : '',
      reason: reason,
      notes: notes,
      attachment: attachment,
      // structural logs
      provinceId: selectedEmp.provinceId || dirObj?.province || '',
      districtId: selectedEmp.districtId || '',
      directorateId: selectedEmp.directorateId,
      directorateName: dirObj?.name || selectedEmp.directorate || 'Direcção Geral',
      departmentId: selectedEmp.departmentId || '',
      divisionId: selectedEmp.divisionId || '',
      sectionId: selectedEmp.sectionId || '',
      careerId: selectedEmp.careerId,
      categoryId: selectedEmp.categoryId || '',
      jobPosition: selectedEmp.role || 'Investigador',
      registeredBy: user?.username || 'Utilizador',
      registeredByName: user?.name || user?.username || 'Utilizador RH',
      registeredByRole: user?.roleName || user?.roleId || 'Operador',
      registeredByDirectorateId: user?.directorateId || selectedEmp.directorateId,
      registeredAt: new Date().toISOString()
    };

    const res = await addRecord(payload);
    if (res.success) {
      setConfirmModal({
        isOpen: true,
        title: 'Sucesso',
        message: `Falta registada com sucesso para ${selectedEmp.name}!`,
        hideCancel: true,
        confirmText: 'OK',
        onConfirm: () => {
          setSelectedEmp(null);
          onRegistrationComplete();
        }
      });
    } else {
      setErrorMessage(res.error || 'Erro ao registar falta.');
    }
  };

  return (
    <div style={styles.container}>
      
      {/* Bloco 1: Seleção de Unidade Organizacional */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.stepBadge}>1</div>
          <h4 style={styles.cardTitle}>Localização e Unidade de Trabalho</h4>
        </div>
        <div style={styles.cardBody}>
          
          <div style={styles.selectRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Província</label>
              <select value={provinceId} onChange={(e) => { setProvinceId(e.target.value); setDistrictId(''); }} style={styles.input}>
                <option value="">Selecione...</option>
                {mozambiqueStructure.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Distrito</label>
              <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} style={styles.input} disabled={!provinceId}>
                <option value="">Selecione...</option>
                {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Direcção</label>
              <select value={directorateId} onChange={(e) => { setDirectorateId(e.target.value); setDepartmentId(''); setDivisionId(''); setSectionId(''); }} style={styles.input}>
                <option value="">Selecione...</option>
                {orgData.directorates.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{...styles.selectRow, marginTop: '16px'}}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Departamento / Direcção Distrital</label>
              <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setDivisionId(''); setSectionId(''); }} style={styles.input} disabled={!directorateId}>
                <option value="">Todos</option>
                {orgData.departments.filter(d => d.directorateId === directorateId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Repartição (Opcional)</label>
              <select value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setSectionId(''); }} style={styles.input} disabled={!departmentId}>
                <option value="">Todas</option>
                {orgData.divisions.filter(d => d.departmentId === departmentId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Secção</label>
              <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} style={styles.input} disabled={!divisionId}>
                <option value="">Todas</option>
                {orgData.sections.filter(d => d.divisionId === divisionId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Bloco 2: Lançamento de Faltas */}
      <div style={styles.card}>
        <div style={styles.cardHeaderWithInfo}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={styles.stepBadge}>2</div>
            <h4 style={styles.cardTitle}>Listagem de Funcionários para Registo</h4>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <div style={styles.viewToggle}>
              <button 
                type="button"
                onClick={() => setViewMode('grid')} 
                style={viewMode === 'grid' ? styles.viewBtnActive : styles.viewBtn}
                title="Visualização em Grelha"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('list')} 
                style={viewMode === 'list' ? styles.viewBtnActive : styles.viewBtn}
                title="Visualização em Lista"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </button>
            </div>
            <input 
              type="text" 
              placeholder="Pesquisar por Nome ou NUIT..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                width: '250px',
                fontSize: '14px'
              }}
            />
            <span style={styles.badgeCount}>{filteredEmployees.length} Funcionários</span>
          </div>
        </div>

        <div style={styles.cardBody}>
          {filteredEmployees.length === 0 ? (
            <div style={styles.empty}>Nenhum funcionário encontrado com os filtros atuais.</div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div style={styles.employeeGrid}>
                  {currentEmployees.map(emp => (
                    <div key={emp.id} style={styles.employeeCard}>
                    <div style={styles.empHeader}>
                      <div style={styles.empAvatar}>
                        {emp.photo ? <img src={emp.photo} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : emp.name.charAt(0)}
                      </div>
                      <div style={styles.empMeta}>
                        <div style={styles.empName}>{emp.name}</div>
                        <div style={styles.empNip}>NUIT: <strong>{emp.nip}</strong></div>
                      </div>
                    </div>

                    <div style={styles.empInfoBlock}>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Carreira:</span>
                        <strong style={styles.infoVal} title={getName(orgData.careers, emp.careerId)}>{getName(orgData.careers, emp.careerId)}</strong>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Categoria:</span>
                        <strong style={styles.infoVal} title={getName(orgData.categories, emp.categoryId)}>{getName(orgData.categories, emp.categoryId)}</strong>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Cargo:</span>
                        <strong style={styles.infoVal} title={emp.role || 'Sem Cargo'}>{emp.role || 'Sem Cargo'}</strong>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Local:</span>
                        <strong style={styles.infoVal}>{emp.provinceId ? `${emp.provinceId} • ${emp.districtId || '-'}` : '-'}</strong>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => handleOpenModal(emp)} 
                      style={styles.btnRegisterFalta}
                    >
                      ✍️ Registar Falta
                    </button>
                  </div>
                ))}
              </div>
              ) : (
                <div style={styles.employeeList}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Nome e NUIT</th>
                        <th>Carreira / Categoria</th>
                        <th>Cargo</th>
                        <th>Localização</th>
                        <th>Acções</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentEmployees.map(emp => (
                        <tr key={emp.id} style={styles.tr}>
                          <td>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                              <div style={{...styles.empAvatar, width: '36px', height: '36px', fontSize: '14px'}}>
                                {emp.photo ? <img src={emp.photo} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : emp.name.charAt(0)}
                              </div>
                              <div style={{display: 'flex', flexDirection: 'column'}}>
                                <span style={{fontWeight: '700', fontSize: '14px', color: 'var(--color-text-base)'}}>{emp.name}</span>
                                <span style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>{emp.nip}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{display: 'flex', flexDirection: 'column'}}>
                              <span style={{fontSize: '13px', fontWeight: '600'}}>{getName(orgData.careers, emp.careerId)}</span>
                              <span style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>{getName(orgData.categories, emp.categoryId)}</span>
                            </div>
                          </td>
                          <td>{emp.role || '-'}</td>
                          <td>{emp.provinceId} • {emp.districtId || '-'}</td>
                          <td style={{...styles.td, textAlign: 'right'}}>
                            <button 
                              type="button" 
                              onClick={() => handleOpenModal(emp)} 
                              style={{...styles.btnRegisterFalta, width: 'auto', padding: '6px 16px'}}
                            >
                              Registar Falta
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div style={styles.pagination}>
                  <button 
                    type="button"
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                    style={{...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1}}
                  >
                    ← Anterior
                  </button>
                  <span style={styles.pageInfo}>Página {currentPage} de {totalPages}</span>
                  <button 
                    type="button"
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)}
                    style={{...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1}}
                  >
                    Próxima →
                  </button>
                </div>
              )}
            </>
            )}
          </div>
        </div>

      {/* Modal de Registo Individual de Falta */}
      {selectedEmp && (
        <div style={styles.modalOverlay} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div style={{
            ...styles.modalCard, 
            transform: `translate(${modalPos.x}px, ${modalPos.y}px)`, 
            transition: isDragging ? 'none' : 'transform 0.1s ease',
            position: 'relative'
          }}>
            <div style={{...styles.modalHeader, cursor: isDragging ? 'grabbing' : 'grab'}} onMouseDown={handleMouseDown}>
              <h4 style={styles.modalTitle}>Lançamento de Falta Individual</h4>
              <button 
                type="button" 
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={() => setSelectedEmp(null)} 
                style={styles.closeBtn}
              >✕</button>
            </div>
            
            <form onSubmit={handleSubmitAbsence} style={styles.modalForm}>
              <div style={styles.empSummaryBox}>
                <strong>{selectedEmp.name}</strong> (NUIT: {selectedEmp.nip})<br />
                <span style={{fontSize:'12px', color:'var(--color-text-muted)'}}>
                  {selectedEmp.role || 'Investigador'} • {getName(orgData.directorates, selectedEmp.directorateId)}
                </span>
              </div>

              {errorMessage && <div style={styles.modalError}>{errorMessage}</div>}

              <div style={styles.formGrid}>
                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Tipo de Falta <span style={{color:'red'}}>*</span></label>
                  <select 
                    value={absenceType} 
                    onChange={(e) => setAbsenceType(e.target.value)} 
                    style={styles.input}
                    required
                  >
                    <option value="Falta Justificada">Falta Justificada</option>
                    <option value="Falta Injustificada">Falta Injustificada</option>
                  </select>
                </div>

                <div style={{...styles.formGroup, gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                  {/* Option 1: Adicionar Dia Específico via Calendário Visual */}
                  <div style={{border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px'}}>
                    <label style={{...styles.label, display: 'block', marginBottom: '8px'}}>Selecionar no Calendário</label>
                    <MultiDateCalendar 
                      selectedDates={selectedDates} 
                      onChange={(newDates) => {
                        setSelectedDates(newDates);
                        setErrorMessage('');
                      }} 
                    />
                  </div>

                  {/* Option 2: Adicionar Vários Dias Seguidos */}
                  <div style={{border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px'}}>
                    <label style={{...styles.label, display: 'block', marginBottom: '8px'}}>Adicionar Múltiplos Dias (Intervalo)</label>
                    <div style={{display:'flex', gap:'5px', alignItems: 'center', flexWrap: 'wrap'}}>
                      <input 
                        type="date" 
                        value={rangeStart} 
                        onChange={(e) => setRangeStart(e.target.value)} 
                        style={{...styles.input, width: 'auto', flex: 1, padding: '8px'}}
                      />
                      <span style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>até</span>
                      <input 
                        type="date" 
                        value={rangeEnd} 
                        onChange={(e) => setRangeEnd(e.target.value)} 
                        style={{...styles.input, width: 'auto', flex: 1, padding: '8px'}}
                      />
                      <button 
                        type="button" 
                        onClick={handleAddDateRange} 
                        style={{...styles.btnRegisterFalta, padding: '8px 15px', borderRadius: '6px', fontSize: '13px', marginLeft: 'auto', flexBasis: '100%', marginTop: '5px'}}
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <label style={styles.label}>Datas Selecionadas para Falta</label>
                    <div style={{...styles.daysBadge, padding: '4px 12px', fontSize: '12px'}}>
                      Total: <strong>{calculatedDays}</strong> {calculatedDays === 1 ? 'Dia de Falta' : 'Dias de Falta'}
                    </div>
                  </div>
                  <div style={{display:'flex', flexWrap:'wrap', gap:'8px', minHeight: '40px', padding: '10px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '6px'}}>
                    {selectedDates.length === 0 ? (
                      <span style={{color: 'var(--color-text-muted)', fontSize: '13px', fontStyle: 'italic'}}>Nenhum dia selecionado.</span>
                    ) : (
                      selectedDates.map(date => {
                        const parts = date.split('-');
                        const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
                        return (
                          <span key={date} style={{
                            display:'inline-flex', alignItems:'center', gap:'6px', 
                            backgroundColor:'var(--color-primary)', color:'white', 
                            padding:'4px 10px', borderRadius:'16px', fontSize:'12px', fontWeight:'500'
                          }}>
                            {formatted}
                            <button type="button" onClick={() => handleRemoveDate(date)} style={{background:'none', border:'none', color:'white', cursor:'pointer', fontSize:'14px', lineHeight:'1', padding:0}}>×</button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                {absenceType === 'Falta Justificada' && (
                  <>
                    <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                      <label style={styles.label}>Motivo / Justificação <span style={{color:'red'}}>*</span></label>
                      <select 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)} 
                        style={styles.input}
                        required
                      >
                        <option value="">-- Selecione o Motivo --</option>
                        <option value="Doença / Consulta Médica">Doença / Consulta Médica</option>
                        <option value="Falecimento de Familiar">Falecimento de Familiar</option>
                        <option value="Casamento">Casamento</option>
                        <option value="Prestação de Provas Escolares">Prestação de Provas Escolares / Exames</option>
                        <option value="Doação de Sangue">Doação de Sangue</option>
                        <option value="Isolamento Profilático">Isolamento Profilático</option>
                        <option value="Cumprimento de Obrigações Legais">Cumprimento de Obrigações Legais</option>
                        <option value="Licença de Maternidade / Paternidade">Licença de Maternidade / Paternidade</option>
                        <option value="Acidente de Trabalho">Acidente de Trabalho</option>
                        <option value="Outro Motivo">Outro Motivo</option>
                      </select>
                    </div>

                    <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                      <label style={styles.label}>Ficheiro Comprovativo (Opcional)</label>
                      <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                        <input 
                          type="file" 
                          id="modal-file-upload" 
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={handleFileUpload} 
                          style={{display:'none'}}
                        />
                        <label htmlFor="modal-file-upload" style={styles.btnUploadCompact}>
                          Escolher Ficheiro
                        </label>
                        <span style={{fontSize:'12px', color:'var(--color-text-muted)'}}>
                          {attachment ? `${attachment.name} (${attachment.size})` : 'Nenhum comprovativo anexado'}
                        </span>
                      </div>
                      <small style={{color:'var(--color-text-muted)', marginTop:'4px'}}>Formatos aceites: PDF, DOC, DOCX, JPG, PNG.</small>
                    </div>
                  </>
                )}

                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Observações</label>
                  <textarea 
                    placeholder="Notas adicionais livres..."
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    style={{...styles.input, minHeight:'60px', resize:'vertical'}}
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setSelectedEmp(null)} style={styles.btnSecondary}>
                  Cancelar
                </button>
                <button type="submit" style={styles.btnSubmit}>
                  Registar Falta
                </button>
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
      />

    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s' },
  card: { backgroundColor: 'var(--color-bg-card)', borderRadius: '14px', border: '1px solid var(--color-border)', boxShadow: '0 4px 18px rgba(0,0,0,0.1)', overflow: 'hidden' },
  cardHeader: { padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' },
  cardHeaderWithInfo: { padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  stepBadge: { width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)' },
  cardTitle: { margin: 0, fontSize: '15.5px', fontWeight: '700', color: 'var(--color-text-base)' },
  badgeCount: { fontSize: '12px', backgroundColor: 'var(--color-bg-base)', padding: '5px 12px', borderRadius: '20px', fontWeight: '700', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' },
  cardBody: { padding: '20px' },
  selectRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  label: { fontSize: '11.5px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13.5px', outline: 'none' },
  prompt: { padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: '1px dashed var(--color-border)', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)' },
  empty: { textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  
  employeeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' },
  employeeCard: { 
    border: '1px solid var(--color-border)', 
    borderRadius: '12px', 
    padding: '18px', 
    backgroundColor: 'var(--color-bg-base)', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'space-between', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
  },
  empHeader: { display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' },
  empAvatar: { 
    width: '46px', 
    height: '46px', 
    borderRadius: '50%', 
    backgroundColor: 'var(--color-primary)', 
    color: '#fff', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: '18px', 
    fontWeight: '800', 
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
    flexShrink: 0
  },
  empMeta: { display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' },
  empName: { fontSize: '14.5px', fontWeight: '700', color: 'var(--color-text-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  empNip: { fontSize: '11.5px', color: 'var(--color-text-muted)' },
  
  empInfoBlock: { 
    borderTop: '1px solid var(--color-border)', 
    borderBottom: '1px solid var(--color-border)', 
    padding: '12px 0', 
    marginBottom: '14px', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '6px' 
  },
  infoRow: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px' 
  },
  infoLabel: {
    color: 'var(--color-text-muted)',
    fontWeight: '500',
    flexShrink: 0
  },
  infoVal: {
    color: 'var(--color-text-base)',
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '65%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  btnRegisterFalta: { 
    width: '100%', 
    padding: '10px 14px', 
    backgroundColor: 'var(--color-primary)', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '8px', 
    fontWeight: '700', 
    fontSize: '13px', 
    cursor: 'pointer', 
    textAlign: 'center', 
    transition: 'all 0.2s', 
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  
  viewToggle: { display: 'flex', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', overflow: 'hidden', padding: '2px' },
  viewBtn: { padding: '6px 10px', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  viewBtnActive: { padding: '6px 10px', backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
  
  employeeList: { overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' },
  listTable: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 16px', backgroundColor: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
  td: { padding: '12px 16px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-base)', fontSize: '13px' },
  tr: { ':hover': { backgroundColor: 'var(--color-bg-base)' } },
  
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' },
  pageBtn: { padding: '8px 16px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)', transition: 'background 0.2s' },
  pageInfo: { fontSize: '14px', fontWeight: '600', color: 'var(--color-text-muted)' },

  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.2s' },
  modalCard: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', width: '90%', maxWidth: '580px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  modalHeader: { padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-base)' },
  modalTitle: { margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--color-text-base)' },
  closeBtn: { border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--color-text-muted)' },
  modalForm: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 },
  empSummaryBox: { padding: '12px 16px', backgroundColor: 'rgba(27,54,93,0.05)', borderRadius: '8px', border: '1px solid var(--color-border)', lineHeight: '1.5' },
  modalError: { padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '13px', fontWeight: '600' },
  
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' },
  daysBadge: { padding: '10px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '14px', textAlign: 'center', color: 'var(--color-primary)' },
  btnUploadCompact: { padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '12px', fontWeight: '600', backgroundColor: 'var(--color-bg-base)', cursor: 'pointer' },
  
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' },
  btnSecondary: { padding: '10px 20px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--color-text-base)', fontWeight: '600', cursor: 'pointer' },
  btnSubmit: { padding: '10px 20px', border: 'none', borderRadius: '6px', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: '700', cursor: 'pointer' }
};

