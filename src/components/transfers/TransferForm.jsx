import React, { useState, useMemo } from 'react';
import { mozambiqueStructure } from '../../utils/mozambiqueDistricts';
import ConfirmModal from '../ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { isCentralUser, filterByProvincialScope } from '../../utils/scopeUtils';

export default function TransferForm({ employees = [], orgData, initialData, onSubmit, onCancel }) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, hideCancel: false });
  
  const { data } = orgData || {};

  // Escopo de funcionários permitidos (Provincial ou Central)
  const scopedEmployees = useMemo(() => {
    return filterByProvincialScope(employees || [], user, orgData);
  }, [employees, user, orgData]);

  const isCentral = isCentralUser(user);

  // If we are editing, we already know the employee
  const [selectedEmployee, setSelectedEmployee] = useState(() => {
    if (initialData) {
      return scopedEmployees.find(e => e.id === initialData.employeeId) || null;
    }
    return null;
  });
  
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        reason: initialData.reason || '',
        reasonDescription: initialData.reasonDescription || '',
        type: initialData.type || '',
        toProvinceId: initialData.toProvinceId || '',
        toDistrictId: initialData.toDistrictId || '',
        toDirectorateId: initialData.toDirectorateId || '',
        toDepartmentId: initialData.toDepartmentId || '',
        toDivisionId: initialData.toDivisionId || '',
        toSectionId: initialData.toSectionId || '',
        documentNumber: initialData.documentNumber || '',
        officialLetterNumber: initialData.officialLetterNumber || '',
        transferDate: initialData.transferDate || '',
        effectiveDate: initialData.effectiveDate || '',
        presentationDate: initialData.presentationDate || '',
        authorizedBy: initialData.authorizedBy || '',
        notes: initialData.notes || ''
      };
    }
    return {
      reason: '',
      reasonDescription: '',
      type: '',
      toProvinceId: '',
      toDistrictId: '',
      toDirectorateId: '',
      toDepartmentId: '',
      toDivisionId: '',
      toSectionId: '',
      documentNumber: '',
      officialLetterNumber: '',
      transferDate: '',
      effectiveDate: '',
      presentationDate: '',
      authorizedBy: '',
      notes: ''
    };
  });

  const [files, setFiles] = useState(() => {
    if (initialData && initialData.attachments) {
      return initialData.attachments;
    }
    return [];
  });

  const calculateServiceTime = (admissionDate) => {
    if (!admissionDate) return '-';
    const admission = new Date(admissionDate);
    const now = new Date();
    
    let years = now.getFullYear() - admission.getFullYear();
    let months = now.getMonth() - admission.getMonth();
    
    if (months < 0 || (months === 0 && now.getDate() < admission.getDate())) {
      years--;
      months += 12;
    }
    
    if (years === 0) return `${months} meses`;
    return `${years} anos e ${months} meses`;
  };

  const getName = (list, id) => list?.find(item => item.id === id)?.name || '-';

  const searchResults = useMemo(() => {
    const list = scopedEmployees.filter(e => e.isActive !== false && e.healthStatus !== 'Baixa Médica' && e.status !== 'Apagado');
    if (!searchTerm.trim()) {
      return showAll ? list : [];
    }
    const term = searchTerm.toLowerCase();
    return list.filter(e => 
      (e.name || '').toLowerCase().includes(term) ||
      (e.nip || '').toLowerCase().includes(term) ||
      (e.nuit || '').toLowerCase().includes(term) ||
      (getName(data?.careers, e.careerId) || '').toLowerCase().includes(term) ||
      (getName(data?.categories, e.categoryId) || '').toLowerCase().includes(term)
    );
  }, [scopedEmployees, searchTerm, showAll, data]);

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setSearchTerm('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'toProvinceId' && { toDistrictId: '' }),
      ...(name === 'toDirectorateId' && { toDepartmentId: '', toDivisionId: '', toSectionId: '' }),
      ...(name === 'toDepartmentId' && { toDivisionId: '', toSectionId: '' }),
      ...(name === 'toDivisionId' && { toSectionId: '' })
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => ({
        name: f.name,
        size: (f.size / 1024).toFixed(1) + ' KB',
        type: f.type,
        url: URL.createObjectURL(f)
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setConfirmModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Por favor, selecione um funcionário primeiro.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }
    if (!formData.reason || !formData.type || !formData.toDirectorateId || !formData.transferDate) {
      setConfirmModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Por favor, preencha todos os campos obrigatórios (*).',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }

    if (formData.reason === 'Outro' && !formData.reasonDescription) {
      setConfirmModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Por favor, especifique o motivo da transferência.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }

    const newTransferData = {
      ...formData,
      employeeId: selectedEmployee.id,
      employeeNip: selectedEmployee.nip,
      employeeName: selectedEmployee.name,
      fromProvinceId: selectedEmployee.provinceId,
      fromDistrictId: selectedEmployee.districtId,
      fromDirectorateId: selectedEmployee.directorateId,
      fromDepartmentId: selectedEmployee.departmentId,
      fromDivisionId: selectedEmployee.divisionId,
      fromSectionId: selectedEmployee.sectionId,
      attachments: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    };

    onSubmit(newTransferData);
  };

  const reasons = [
    "Necessidade de serviço", "Reorganização institucional", "Promoção", 
    "Progressão na carreira", "Pedido do funcionário", "Aproximação familiar", 
    "Mobilidade interna", "Substituição de funcionário", "Reestruturação administrativa", 
    "Redistribuição de efetivos", "Interesse da Administração", "Outro"
  ];

  const types = [
    "Transferência entre Províncias", "Transferência entre Distritos", 
    "Transferência entre Direcções", "Transferência entre Departamentos", 
    "Transferência entre Repartições", "Transferência entre Secções", 
    "Transferência Temporária", "Transferência Definitiva", 
    "Mobilidade Interna", "Cedência Temporária", "Comissão de Serviço"
  ];

  const selectedProvinceData = mozambiqueStructure.find(p => p.province === formData.toProvinceId);
  const availableDistricts = selectedProvinceData ? selectedProvinceData.districts : [];

  return (
    <div style={styles.container}>
      
      {!selectedEmployee ? (
        <div style={styles.searchSection}>
          <div style={styles.searchHeader}>
            <div style={styles.searchIconLarge}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <h3 style={styles.searchTitle}>Identificação do Funcionário</h3>
            <p style={styles.searchSubtitle}>Pesquise pelo Nome, NUIT, NIP ou Cargo para iniciar o processo.</p>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', marginTop: '6px' }}>
              {!isCentral ? (
                `📍 Escopo Provincial (${scopedEmployees.length} funcionários disponíveis)`
              ) : (
                `🌐 Escopo Nacional (${scopedEmployees.length} funcionários disponíveis)`
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ ...styles.searchWrapper, flex: 1 }}>
              <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setShowAll(false); }} 
                placeholder="Digite o Nome, NUIT ou NIP..."
                style={styles.searchInput}
                autoFocus
              />
            </div>
            <button 
              type="button" 
              onClick={() => { setSearchTerm(''); setShowAll(!showAll); }} 
              style={{
                padding: '14px 18px',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
                backgroundColor: showAll ? 'var(--color-primary)' : 'var(--color-bg-base)',
                color: showAll ? '#fff' : 'var(--color-text-base)',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              👥 {showAll ? 'Ocultar' : 'Visualizar Todos'}
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div style={styles.searchResults}>
              {searchResults.map(emp => (
                <div key={emp.id} style={styles.searchItem} onClick={() => handleSelectEmployee(emp)}>
                  <div style={styles.searchItemAvatar}>
                    {emp.photo ? <img src={emp.photo} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : emp.name.charAt(0)}
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <div style={{fontWeight: '700', color: 'var(--color-text-base)'}}>{emp.name}</div>
                      <div style={{fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '600'}}>NUIT: {emp.nip}</div>
                    </div>
                    <div style={{fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px'}}>
                      {getName(data.careers, emp.careerId)} • {getName(data.directorates, emp.directorateId)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {searchTerm.length > 2 && searchResults.length === 0 && (
            <div style={styles.noResults}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{marginBottom: '12px'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <div>Nenhum funcionário encontrado.</div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          
          {/* Card de Identificação */}
          <div style={styles.profileCard}>
            <div style={styles.profileHeader}>
              <h4 style={styles.stepTitle}>Ficha do Funcionário</h4>
              {!initialData && (
                <button type="button" onClick={() => setSelectedEmployee(null)} style={styles.btnChange}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 17l-5-5 5-5"></path><path d="M18 17l-5-5 5-5"></path></svg>
                  Selecionar Outro
                </button>
              )}
            </div>
            
            <div style={styles.profileBody}>
              <div style={styles.profileAvatar}>
                {selectedEmployee.photo ? (
                  <img src={selectedEmployee.photo} alt="Fotografia" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                )}
              </div>
              
              <div style={styles.profileGrid}>
                <div style={styles.profileItem}>
                  <div style={styles.profileLabel}>Nome Completo</div>
                  <div style={styles.profileValue}>{selectedEmployee.name}</div>
                </div>
                <div style={styles.profileItem}>
                  <div style={styles.profileLabel}>NUIT / Número Mecanográfico</div>
                  <div style={styles.profileValue}>{selectedEmployee.nip}</div>
                </div>
                <div style={styles.profileItem}>
                  <div style={styles.profileLabel}>Carreira e Categoria</div>
                  <div style={styles.profileValue}>
                    {getName(data.careers, selectedEmployee.careerId)}
                    {selectedEmployee.categoryId ? ` • ${getName(data.categories, selectedEmployee.categoryId)}` : ''}
                  </div>
                </div>
                <div style={styles.profileItem}>
                  <div style={styles.profileLabel}>Tempo de Serviço</div>
                  <div style={styles.profileValue}>{selectedEmployee.admissionDate ? `${selectedEmployee.admissionDate} (${calculateServiceTime(selectedEmployee.admissionDate)})` : '-'}</div>
                </div>
              </div>
            </div>
            
            <div style={styles.profileFooter}>
              <div style={styles.profileLabel}>Lotação de Origem (Atual)</div>
              <div style={styles.pathVisualizer}>
                <div style={styles.pathNode}>{selectedEmployee.provinceId || 'Província'}</div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{color:'var(--color-primary)'}}><polyline points="9 18 15 12 9 6"></polyline></svg>
                <div style={styles.pathNode}>{getName(data.directorates, selectedEmployee.directorateId)}</div>
                {selectedEmployee.departmentId && (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{color:'var(--color-primary)'}}><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <div style={styles.pathNode}>{getName(data.departments, selectedEmployee.departmentId)}</div>
                  </>
                )}
                {selectedEmployee.divisionId && (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{color:'var(--color-primary)'}}><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <div style={styles.pathNode}>{getName(data.divisions, selectedEmployee.divisionId)}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={styles.formGrid}>
            
            {/* Bloco 1: Motivo e Tipo */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.stepBadge}>1</div>
                <h4 style={styles.cardTitle}>Enquadramento do Processo</h4>
              </div>
              
              <div style={styles.cardBody}>
                <div style={styles.inputRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Motivo da Movimentação <span style={styles.required}>*</span></label>
                    <select name="reason" value={formData.reason} onChange={handleChange} style={styles.input} required>
                      <option value="">Selecione um motivo...</option>
                      {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Tipo de Movimentação <span style={styles.required}>*</span></label>
                    <select name="type" value={formData.type} onChange={handleChange} style={styles.input} required>
                      <option value="">Selecione um tipo...</option>
                      {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {formData.reason === 'Outro' && (
                  <div style={{...styles.formGroup, marginTop: '20px'}}>
                    <label style={styles.label}>Justificação Específica <span style={styles.required}>*</span></label>
                    <input 
                      type="text" 
                      name="reasonDescription" 
                      value={formData.reasonDescription} 
                      onChange={handleChange} 
                      style={styles.input} 
                      placeholder="Descreva o motivo detalhadamente..."
                      required 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bloco 2: Lugar de Origem e Destino */}
            <div style={{...styles.card, gridColumn: 'span 2'}}>
              <div style={styles.cardHeader}>
                <div style={styles.stepBadge}>2</div>
                <h4 style={styles.cardTitle}>Lugar de Origem e Destino</h4>
              </div>
              
              <div style={styles.cardBody}>
                <div style={styles.lugarGrid}>
                  
                  {/* Coluna de Origem (Leitura) */}
                  <div style={styles.lugarColumn}>
                    <h5 style={styles.lugarSubTitle}>Lugar de Origem (Lotação Atual)</h5>
                    <div style={styles.lugarInfoBox}>
                      <div style={styles.lugarInfoItem}>
                        <span style={styles.lugarInfoLabel}>Província</span>
                        <span style={styles.lugarInfoValue}>{selectedEmployee.provinceId || 'Não Definido'}</span>
                      </div>
                      <div style={styles.lugarInfoItem}>
                        <span style={styles.lugarInfoLabel}>Distrito</span>
                        <span style={styles.lugarInfoValue}>{selectedEmployee.districtId || 'Não Definido'}</span>
                      </div>
                      <div style={styles.lugarInfoItem}>
                        <span style={styles.lugarInfoLabel}>Direcção</span>
                        <span style={styles.lugarInfoValue}>{getName(data.directorates, selectedEmployee.directorateId)}</span>
                      </div>
                      <div style={styles.lugarInfoItem}>
                        <span style={styles.lugarInfoLabel}>Departamento</span>
                        <span style={styles.lugarInfoValue}>{selectedEmployee.departmentId ? getName(data.departments, selectedEmployee.departmentId) : 'Nenhum'}</span>
                      </div>
                      <div style={styles.lugarInfoItem}>
                        <span style={styles.lugarInfoLabel}>Repartição</span>
                        <span style={styles.lugarInfoValue}>{selectedEmployee.divisionId ? getName(data.divisions, selectedEmployee.divisionId) : 'Nenhuma'}</span>
                      </div>
                      <div style={styles.lugarInfoItem}>
                        <span style={styles.lugarInfoLabel}>Secção</span>
                        <span style={styles.lugarInfoValue}>{selectedEmployee.sectionId ? getName(data.sections, selectedEmployee.sectionId) : 'Nenhuma'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Divisor Visual */}
                  <div style={styles.lugarDivider}>
                    <div style={styles.lugarDividerLine}></div>
                    <div style={styles.lugarDividerArrow}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </div>
                    <div style={styles.lugarDividerLine}></div>
                  </div>

                  {/* Coluna de Destino (Inputs) */}
                  <div style={styles.lugarColumn}>
                    <h5 style={styles.lugarSubTitle}>Lugar de Destino (Nova Lotação)</h5>
                    
                    <div style={styles.lugarFormGrid}>
                      <div style={styles.formGroup}>
                        <label style={styles.labelCompact}>Província</label>
                        <select name="toProvinceId" value={formData.toProvinceId} onChange={handleChange} style={styles.inputCompact}>
                          <option value="">Selecione...</option>
                          {mozambiqueStructure.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.labelCompact}>Distrito</label>
                        <select name="toDistrictId" value={formData.toDistrictId} onChange={handleChange} style={styles.inputCompact} disabled={!formData.toProvinceId}>
                          <option value="">Selecione...</option>
                          {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.labelCompact}>Direcção <span style={styles.required}>*</span></label>
                        <select name="toDirectorateId" value={formData.toDirectorateId} onChange={handleChange} style={styles.inputCompact} required>
                          <option value="">Selecione...</option>
                          {data.directorates.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={styles.lugarSubFormGrid}>
                      <div style={styles.formGroup}>
                        <label style={styles.labelCompact}>Departamento</label>
                        <select name="toDepartmentId" value={formData.toDepartmentId} onChange={handleChange} style={styles.inputCompact} disabled={!formData.toDirectorateId}>
                          <option value="">Nenhum</option>
                          {data.departments.filter(d => d.directorateId === formData.toDirectorateId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.labelCompact}>Repartição</label>
                        <select name="toDivisionId" value={formData.toDivisionId} onChange={handleChange} style={styles.inputCompact} disabled={!formData.toDirectorateId}>
                          <option value="">Nenhuma</option>
                          {data.divisions.filter(d => {
                            if (formData.toDepartmentId) return d.departmentId === formData.toDepartmentId;
                            return d.directorateId === formData.toDirectorateId || (d.departmentId && data.departments.some(dep => dep.id === d.departmentId && dep.directorateId === formData.toDirectorateId));
                          }).map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name}{!d.departmentId ? ' (Repartição Central)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.labelCompact}>Secção</label>
                        <select name="toSectionId" value={formData.toSectionId} onChange={handleChange} style={styles.inputCompact} disabled={!formData.toDivisionId}>
                          <option value="">Nenhuma</option>
                          {data.sections.filter(d => d.divisionId === formData.toDivisionId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Bloco 3: Dados Administrativos */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.stepBadge}>3</div>
                <h4 style={styles.cardTitle}>Dados Administrativos</h4>
              </div>
              
              <div style={styles.cardBody}>
                <div style={styles.inputRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Número do Despacho <span style={styles.required}>*</span></label>
                    <input type="text" name="documentNumber" value={formData.documentNumber} onChange={handleChange} style={styles.input} placeholder="Ex: 123/SERNIC/2026" required />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Número do Ofício <span style={styles.required}>*</span></label>
                    <input type="text" name="officialLetterNumber" value={formData.officialLetterNumber} onChange={handleChange} style={styles.input} placeholder="Ex: OF-456/26" required />
                  </div>
                </div>
                
                <div style={{...styles.formGroup, marginTop: '20px'}}>
                  <label style={styles.label}>Entidade Autorizadora <span style={styles.required}>*</span></label>
                  <input type="text" name="authorizedBy" value={formData.authorizedBy} onChange={handleChange} style={styles.input} placeholder="Ex: Diretor-Geral" required />
                </div>

                <div style={styles.dateGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Data da Decisão <span style={styles.required}>*</span></label>
                    <input type="date" name="transferDate" value={formData.transferDate} onChange={handleChange} style={styles.input} required />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Data de Efetivação <span style={styles.required}>*</span></label>
                    <input type="date" name="effectiveDate" value={formData.effectiveDate} onChange={handleChange} style={styles.input} required />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Apresentação Prevista <span style={styles.required}>*</span></label>
                    <input type="date" name="presentationDate" value={formData.presentationDate} onChange={handleChange} style={styles.input} required />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bloco 4: Documentação */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.stepBadge}>4</div>
                <h4 style={styles.cardTitle}>Documentação e Notas</h4>
              </div>
              
              <div style={styles.cardBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Anexar Documentos Físicos (PDF, DOCX, Imagens)</label>
                  <div style={styles.fileUploadBox}>
                    <input type="file" multiple onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png" style={styles.fileInput} id="file-upload" />
                    <label htmlFor="file-upload" style={styles.fileUploadLabel}>
                      <div style={styles.uploadIcon}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      </div>
                      <div style={{fontWeight: '600', fontSize: '15px'}}>Clique ou arraste ficheiros</div>
                      <div style={{fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px'}}>Suporta PDF, Word e Imagens até 10MB</div>
                    </label>
                  </div>
                  
                  {files.length > 0 && (
                    <div style={styles.fileList}>
                      {files.map((f, i) => (
                        <div key={i} style={styles.fileItem}>
                          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                            <div style={styles.fileIconBox}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                            </div>
                            <div>
                              <div style={{fontWeight: '600', fontSize: '13px', color: 'var(--color-text-base)'}}>{f.name}</div>
                              <div style={{fontSize: '11px', color: 'var(--color-text-muted)'}}>{f.size}</div>
                            </div>
                          </div>
                          <button type="button" onClick={() => removeFile(i)} style={styles.fileRemoveBtn} title="Remover ficheiro">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div style={{...styles.formGroup, marginTop: '24px'}}>
                  <label style={styles.label}>Observações Adicionais</label>
                  <textarea 
                    name="notes" 
                    value={formData.notes} 
                    onChange={handleChange} 
                    style={{...styles.input, minHeight: '120px', resize: 'vertical'}} 
                    placeholder="Registe qualquer particularidade sobre este processo de transferência..."
                  ></textarea>
                </div>
              </div>
            </div>

          </div>

          {/* Action Bar */}
          <div style={styles.actionBar}>
            <button type="button" onClick={onCancel} style={styles.btnCancel}>Cancelar</button>
            <button type="submit" style={styles.btnSubmit}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              {initialData ? 'Guardar Alterações' : 'Registar Processo'}
            </button>
          </div>
        </form>
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
  container: { padding: '10px 0 40px 0', animation: 'fadeIn 0.4s ease-out' },
  
  // Search state
  searchSection: { maxWidth: '700px', margin: '40px auto', backgroundColor: 'var(--color-bg-card)', padding: '40px', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' },
  searchHeader: { textAlign: 'center', marginBottom: '30px' },
  searchIconLarge: { width: '64px', height: '64px', margin: '0 auto 16px auto', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  searchTitle: { fontSize: '22px', fontWeight: '800', color: 'var(--color-text-base)', margin: '0 0 8px 0' },
  searchSubtitle: { fontSize: '15px', color: 'var(--color-text-muted)', margin: 0 },
  
  searchWrapper: { position: 'relative' },
  searchInput: { width: '100%', padding: '18px 24px 18px 56px', borderRadius: '12px', border: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '16px', transition: 'all 0.2s', outline: 'none' },
  searchIcon: { position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', width: '22px', height: '22px', color: 'var(--color-text-muted)' },
  
  searchResults: { marginTop: '16px', border: '1px solid var(--color-border)', borderRadius: '12px', backgroundColor: 'var(--color-bg-base)', maxHeight: '350px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
  searchItem: { padding: '16px 20px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', transition: 'background-color 0.2s', ':hover': {backgroundColor: 'var(--color-bg-card)'} },
  searchItemAvatar: { width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 },
  noResults: { padding: '40px', color: 'var(--color-text-muted)', fontSize: '15px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'var(--color-bg-base)', borderRadius: '12px', marginTop: '16px', border: '1px dashed var(--color-border)' },
  
  // Form layout
  form: { display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '1000px', margin: '0 auto' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px' },
  
  // Profile Card
  profileCard: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' },
  profileHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border)' },
  stepTitle: { margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--color-text-base)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  btnChange: { background: 'none', border: '1px solid var(--color-border)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', color: 'var(--color-text-base)', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-bg-card)' },
  profileBody: { padding: '24px', display: 'flex', gap: '30px' },
  profileAvatar: { width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' },
  profileGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', flex: 1 },
  profileItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
  profileLabel: { fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' },
  profileValue: { fontSize: '15px', color: 'var(--color-text-base)', fontWeight: '600' },
  profileFooter: { padding: '20px 24px', backgroundColor: 'var(--color-bg-base)', borderTop: '1px dashed var(--color-border)' },
  pathVisualizer: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' },
  pathNode: { padding: '6px 12px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' },
  
  // Section Cards
  card: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' },
  cardHeader: { padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px' },
  stepBadge: { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700' },
  cardTitle: { margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--color-text-base)' },
  cardBody: { padding: '24px', flex: 1 },
  
  // Form elements
  inputRow: { display: 'flex', gap: '20px' },
  dateGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' },
  formGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '700', color: 'var(--color-text-base)' },
  required: { color: 'var(--color-primary)' },
  input: { width: '100%', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px', transition: 'border-color 0.2s', outline: 'none' },
  
  // File Upload
  fileUploadBox: { width: '100%', position: 'relative' },
  fileInput: { width: '0.1px', height: '0.1px', opacity: 0, overflow: 'hidden', position: 'absolute', zIndex: -1 },
  fileUploadLabel: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', border: '2px dashed var(--color-border)', borderRadius: '10px', cursor: 'pointer', color: 'var(--color-text-base)', backgroundColor: 'var(--color-bg-base)', transition: 'all 0.2s', textAlign: 'center' },
  uploadIcon: { width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  fileList: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  fileItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '8px' },
  fileIconBox: { width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fileRemoveBtn: { background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '4px', ':hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' } },
  
  // Action bar
  actionBar: { display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '10px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' },
  btnCancel: { padding: '14px 32px', backgroundColor: 'transparent', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-base)', cursor: 'pointer', fontWeight: '700', fontSize: '15px', transition: 'all 0.2s' },
  btnSubmit: { padding: '14px 32px', backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '10px', transition: 'transform 0.2s' },

  // New Lugar Origem / Destino styles
  lugarGrid: { display: 'flex', gap: '30px', alignItems: 'stretch' },
  lugarColumn: { flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' },
  lugarSubTitle: { margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.5px' },
  lugarInfoBox: { display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--color-bg-base)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border)', height: '100%', justifyContent: 'space-between' },
  lugarInfoItem: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--color-border)', paddingBottom: '8px' },
  lugarInfoLabel: { fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' },
  lugarInfoValue: { fontSize: '13px', color: 'var(--color-text-base)', fontWeight: '600' },
  lugarDivider: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '40px' },
  lugarDividerLine: { flex: 1, width: '1px', backgroundColor: 'var(--color-border)', margin: '10px 0' },
  lugarDividerArrow: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' },
  lugarFormGrid: { display: 'flex', flexDirection: 'column', gap: '15px' },
  lugarSubFormGrid: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '5px' },
  labelCompact: { fontSize: '12px', fontWeight: '700', color: 'var(--color-text-base)', marginBottom: '6px' },
  inputCompact: { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px', outline: 'none' }
};

