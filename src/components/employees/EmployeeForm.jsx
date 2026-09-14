import React, { useState, useEffect } from 'react';
import DisciplinarySubForm from '../disciplinary/DisciplinarySubForm';
import useDisciplinaryData from '../../hooks/useDisciplinaryData';
import { sanitizeNuit, validateNuit, formatMozPhone, validateMozPhone } from '../../utils/formatters';

export default function EmployeeForm({ employees, orgData, editingEmpId, onSave, onCancel, onSaved }) {
  const { data } = orgData;
  const { addProcess, getProcessesByEmployee } = useDisciplinaryData();

  const [formData, setFormData] = useState({
    name: '', nip: '', bi: '', nim: '', nimDistintivo: '', dob: '', gender: '', maritalStatus: '', nationality: '', photo: '',
    phone: '', altPhone: '',
    rank: '', role: '', class: '', step: '', academicLevel: '', formationArea: '',
    employmentStatus: '', contractType: '', admissionDate: '',
    unitType: 'normal',
    directorateId: '', departmentId: '', divisionId: '', districtDirectorateId: '', sectionId: '', careerId: '', categoryId: '',
    isActive: true, hasDisciplinary: false, academicHistory: []
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [fullScreenPhoto, setFullScreenPhoto] = useState(null);
  const [tempProcesses, setTempProcesses] = useState([]);

  useEffect(() => {
    if (editingEmpId) {
      const emp = employees.find(e => e.id === editingEmpId);
      if (emp) {
        setFormData({
          ...emp,
          unitType: emp.unitType || 'normal',
          academicHistory: emp.academicHistory || []
        });
        const procs = getProcessesByEmployee(emp.id);
        if (procs.length > 0) {
          setFormData(prev => ({ ...prev, hasDisciplinary: true }));
        }
      }
    }
  }, [editingEmpId, employees]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalVal = type === 'checkbox' ? checked : value;

    if (name === 'nip') {
      finalVal = sanitizeNuit(value);
    } else if (name === 'phone' || name === 'altPhone') {
      finalVal = formatMozPhone(value);
    }

    setFormData(prev => {
      const updates = { [name]: finalVal };
      
      // Cascading resets
      if (name === 'directorateId') {
        updates.departmentId = '';
        updates.divisionId = '';
        updates.sectionId = '';
        updates.districtDirectorateId = '';
        updates.unitType = 'normal';
      } else if (name === 'unitType') {
        updates.directorateId = '';
        updates.departmentId = '';
        updates.divisionId = '';
        updates.districtDirectorateId = '';
        updates.sectionId = '';
        updates.role = ''; // Reset cargo
      } else if (name === 'departmentId') {
        updates.divisionId = '';
        updates.sectionId = '';
      } else if (name === 'districtDirectorateId') {
        updates.sectionId = '';
        if (value) {
          updates.unitType = 'district';
          updates.departmentId = '';
          updates.divisionId = '';
        } else {
          updates.unitType = 'normal';
        }
      } else if (name === 'divisionId') {
        updates.sectionId = '';
      } else if (name === 'careerId') {
        updates.categoryId = '';
      }
      
      return { ...prev, ...updates };
    });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setErrorMsg('A foto deve ter no máximo 50MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addAcademicHistory = () => {
    setFormData(prev => ({
      ...prev,
      academicHistory: [...(prev.academicHistory || []), { id: Date.now(), level: '', formationArea: '', certB64: '', diplomaB64: '' }]
    }));
  };

  const updateAcademicHistory = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      academicHistory: prev.academicHistory.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeAcademicHistory = (id) => {
    setFormData(prev => ({
      ...prev,
      academicHistory: prev.academicHistory.filter(item => item.id !== id)
    }));
  };

  const handleAcademicDocUpload = (id, field, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('O documento deve ter no máximo 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateAcademicHistory(id, field, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const viewDocument = (b64) => {
    const newWindow = window.open();
    if (newWindow) {
      if (b64.startsWith('data:application/pdf')) {
        newWindow.document.write(`<iframe src="${b64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      } else {
        newWindow.document.write(`<img src="${b64}" style="max-width: 100%;" />`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isDistrict = formData.unitType === 'district';

    if (!formData.name || !formData.nip || !formData.directorateId || (isDistrict && !formData.districtDirectorateId)) {
      setErrorMsg('Preencha os campos obrigatórios (Nome, NUIT, Direcção/Província e Distrito se aplicável).');
      return;
    }

    const nuitCheck = validateNuit(formData.nip, true);
    if (!nuitCheck.isValid) {
      setErrorMsg(nuitCheck.message || 'O NUIT deve conter apenas números, até ao máximo de 12 dígitos.');
      return;
    }

    if (formData.phone) {
      const phoneCheck = validateMozPhone(formData.phone, false);
      if (!phoneCheck.isValid) {
        setErrorMsg(phoneCheck.message);
        return;
      }
    }

    if (formData.altPhone) {
      const altPhoneCheck = validateMozPhone(formData.altPhone, false);
      if (!altPhoneCheck.isValid) {
        setErrorMsg(altPhoneCheck.message);
        return;
      }
    }

    const biPattern = /^\d{1,14}[A-Za-z]$/;
    if (formData.bi && !biPattern.test(formData.bi)) {
      setErrorMsg('O BI deve conter no máximo 14 números seguidos de 1 letra.');
      return;
    }

    // Validação de Duplicados de Cargo de Direção e Chefia
    if (isDistrict && formData.isActive) {
      if (formData.role === 'Diretor Distrital') {
        const dupDirector = employees.find(emp => 
          emp.districtDirectorateId === formData.districtDirectorateId && 
          emp.role === 'Diretor Distrital' && 
          emp.isActive &&
          emp.id !== editingEmpId
        );
        if (dupDirector) {
          setErrorMsg(`Já existe um Diretor Distrital ativo nomeado para este Distrito (${dupDirector.name}). Exonere o atual ocupante antes de nomear outro.`);
          return;
        }
      } else if (formData.role === 'Chefe de Secção') {
        if (!formData.sectionId) {
          setErrorMsg('A secção é obrigatória para nomeação de Chefe de Secção.');
          return;
        }
        const dupChief = employees.find(emp => 
          emp.sectionId === formData.sectionId && 
          emp.role === 'Chefe de Secção' && 
          emp.isActive &&
          emp.id !== editingEmpId
        );
        if (dupChief) {
          setErrorMsg(`Já existe um Chefe de Secção ativo nomeado para esta Secção (${dupChief.name}). Exonere o atual ocupante antes de nomear outro.`);
          return;
        }
      }
    }

    // Calc highest academic level before saving
    let highestLevel = formData.academicLevel || '';
    if (formData.academicHistory && formData.academicHistory.length > 0) {
      const levelOrder = { 'Básico': 0, 'Médio': 1, 'Superior (Licenciatura)': 2, 'Mestrado': 3, 'Doutoramento': 4 };
      let maxLevelIdx = -1;
      formData.academicHistory.forEach(item => {
        const idx = levelOrder[item.level] || -1;
        if (idx > maxLevelIdx) {
          maxLevelIdx = idx;
          highestLevel = item.level;
        }
      });
    }

    const payload = {
      ...formData,
      academicLevel: highestLevel,
      // Se necessário manter compatibilidade
      academicDocs: {}
    };

    const result = editingEmpId 
      ? await onSave(editingEmpId, payload)
      : await onSave(payload);

    if (!result.success) {
      if (result.error === 'nip_duplicate') setErrorMsg('Este NUIT já se encontra registado.');
      else setErrorMsg('Ocorreu um erro ao guardar.');
    } else {
      if (formData.hasDisciplinary && tempProcesses.length > 0) {
        const empId = result.employee ? result.employee.id : editingEmpId;
        tempProcesses.forEach(proc => {
          const { isTemp, id, ...cleanProc } = proc;
          addProcess({ ...cleanProc, employeeId: empId });
        });
      }
      onSaved();
    }
  };

  // Dynamic Filtering for Dropdowns
  const selectedEmpDir = data.directorates.find(d => d.id === formData.directorateId);
  const isEmpDirProvincial = !!(selectedEmpDir && (selectedEmpDir.province || (selectedEmpDir.name || '').toLowerCase().includes('provincial') || (selectedEmpDir.name || '').toLowerCase().includes('cidade de maputo')));

  const activeDepartments = data.departments.filter(d => d.isActive && d.directorateId === formData.directorateId);
  const activeDivisions = data.divisions.filter(d => {
    if (!d.isActive) return false;
    if (formData.departmentId) return d.departmentId === formData.departmentId;
    if (formData.directorateId) {
      if (d.directorateId === formData.directorateId && (!d.departmentId || d.departmentId === '')) return true;
      if (activeDepartments.length === 0 && d.directorateId === formData.directorateId) return true;
    }
    return false;
  });
  
  // Distritos filtrados por Direção Provincial
  const activeDistricts = (data.districtDirectorates || []).filter(d => d.isActive && d.provincialDirectorateId === formData.directorateId);

  // Sections can belong to a Division OR directly to a Department OR directly to a District Directorate
  const activeSections = data.sections.filter(s => {
    if (!s.isActive) return false;
    if (formData.unitType === 'district') {
      return s.districtDirectorateId === formData.districtDirectorateId;
    }
    if (formData.divisionId) return s.divisionId === formData.divisionId;
    if (formData.departmentId) return s.departmentId === formData.departmentId;
    return false;
  });

  const activeCategories = data.categories.filter(c => c.isActive && c.careerId === formData.careerId);

  return (
    <form onSubmit={handleSubmit} style={styles.formContainer}>
      <h3 style={styles.title}>{editingEmpId ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
      
      <div style={styles.photoContainer}>
        <div style={{...styles.photoWrapper, cursor: formData.photo ? 'pointer' : 'default'}} onClick={() => formData.photo && setFullScreenPhoto(formData.photo)}>
          {formData.photo ? (
            <img src={formData.photo} alt="Avatar" style={styles.photoPreview} title="Clique para expandir" />
          ) : (
            <div style={styles.photoPlaceholder}>📷</div>
          )}
        </div>
        <div>
          <label style={{...styles.btnSecondary, display: 'inline-block', padding: '8px 16px', fontSize: '13px'}}>
            Carregar Foto
            <input type="file" accept="image/png, image/jpeg" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </label>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '8px 0 0 0' }}>Formatos: JPG, PNG. Max 50MB.</p>
        </div>
      </div>

      {fullScreenPhoto && (
        <div style={styles.fullscreenOverlay} onClick={() => setFullScreenPhoto(null)}>
          <img src={fullScreenPhoto} style={styles.fullscreenImage} alt="Fullscreen FHD" />
          <button style={styles.closeFullscreenBtn} onClick={(e) => { e.stopPropagation(); setFullScreenPhoto(null); }}>✕</button>
        </div>
      )}

      <div style={styles.formBody}>
        {/* IDENTIFICAÇÃO PESSOAL */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Identificação Pessoal</h4>
          <div style={styles.fieldGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nome Completo *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} style={styles.input} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>NUIT * (Máx. 12 dígitos)</label>
              <input type="text" name="nip" value={formData.nip} onChange={handleChange} style={styles.input} required maxLength={12} pattern="\d{1,12}" title="Apenas números, máximo de 12 dígitos" placeholder="Ex: 123456789012" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contacto Principal (+258)</label>
              <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} style={styles.input} maxLength={16} placeholder="+258 84 123 4567" title="Padrão moçambicano (+258) com 9 dígitos" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contacto Alternativo (+258)</label>
              <input type="text" name="altPhone" value={formData.altPhone || ''} onChange={handleChange} style={styles.input} maxLength={16} placeholder="+258 82 123 4567" title="Padrão moçambicano (+258) com 9 dígitos" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nº de BI</label>
              <input type="text" name="bi" value={formData.bi} onChange={handleChange} style={styles.input} maxLength={15} pattern="\d{1,14}[A-Za-z]" title="No máximo 14 números seguidos de 1 letra" placeholder="Ex: 12345678901234A" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>NIM (Identidade do Funcionário)</label>
              <input type="text" name="nim" value={formData.nim || ''} onChange={handleChange} style={styles.input} placeholder="Ex: 123456" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>NIM de Distintivo</label>
              <input type="text" name="nimDistintivo" value={formData.nimDistintivo || ''} onChange={handleChange} style={styles.input} placeholder="Ex: 654321" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data de Nascimento</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Género</label>
              <select name="gender" value={formData.gender} onChange={handleChange} style={styles.input}>
                <option value="">-- Selecione --</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nacionalidade</label>
              <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} style={styles.input} placeholder="Ex: Moçambicana" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Estado Civil</label>
              <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} style={styles.input}>
                <option value="">-- Selecione --</option>
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
              </select>
            </div>
          </div>
        </div>

        {/* INFORMAÇÃO ACADÉMICA E PROFISSIONAL */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Informação Académica e Profissional</h4>
          <div style={styles.fieldGrid}>
            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                <label style={{...styles.label, margin: 0}}>Histórico Académico</label>
                <button type="button" onClick={addAcademicHistory} style={{...styles.btnAdd, padding: '6px 12px', fontSize: '12px'}}>+ Adicionar novo Nível Académico</button>
              </div>

              {(!formData.academicHistory || formData.academicHistory.length === 0) ? (
                <div style={{padding: '20px', textAlign: 'center', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '13px'}}>
                  Clique no botão acima para adicionar novo Nível Académico e preencher os passos.
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                  {formData.academicHistory.map((item, idx) => (
                    <div key={item.id} style={{padding: '15px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', position: 'relative'}}>
                      <button type="button" onClick={() => removeAcademicHistory(item.id)} style={{position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px'}}>✕ Remover</button>
                      <h5 style={{margin: '0 0 15px 0', fontSize: '14px', color: 'var(--color-primary)'}}>Passo {idx + 1}: Preencher Dados do Nível</h5>
                      
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px'}}>
                        <div>
                          <label style={{display: 'block', fontSize: '12px', marginBottom: '5px', color: 'var(--color-text-muted)'}}>Nível Académico</label>
                          <select value={item.level} onChange={(e) => updateAcademicHistory(item.id, 'level', e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px'}}>
                            <option value="">-- Selecione --</option>
                            <option value="Médio">Médio</option>
                            <option value="Superior (Licenciatura)">Superior (Licenciatura)</option>
                            <option value="Mestrado">Mestrado</option>
                            <option value="Doutoramento">Doutoramento</option>
                          </select>
                        </div>
                        <div>
                          <label style={{display: 'block', fontSize: '12px', marginBottom: '5px', color: 'var(--color-text-muted)'}}>Área de Formação</label>
                          <input type="text" value={item.formationArea} onChange={(e) => updateAcademicHistory(item.id, 'formationArea', e.target.value)} placeholder="Ex: Informática" style={{width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px'}} />
                        </div>
                      </div>

                      {item.level && (
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '15px', backgroundColor: 'var(--color-bg-base)', borderRadius: '6px', border: '1px dashed var(--color-border)'}}>
                          {/* CERTIFICADO */}
                          <div>
                            <div style={{fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--color-text-muted)'}}>Certificado do Nível {item.level}</div>
                            {item.certB64 ? (
                              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span style={{color: 'green', fontSize: '12px'}}>✓ Anexado</span>
                                <button type="button" onClick={() => viewDocument(item.certB64)} style={{padding: '4px 8px', border: '1px solid var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px'}}>Ver</button>
                                <button type="button" onClick={() => updateAcademicHistory(item.id, 'certB64', '')} style={{padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '11px'}}>Remover</button>
                              </div>
                            ) : (
                              <input type="file" accept="image/*,application/pdf" onChange={(e) => handleAcademicDocUpload(item.id, 'certB64', e)} style={{fontSize: '12px', width: '100%'}} />
                            )}
                          </div>

                          {/* DIPLOMA (apenas se for superior a médio) */}
                          {['Superior (Licenciatura)', 'Mestrado', 'Doutoramento'].includes(item.level) && (
                            <div>
                              <div style={{fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--color-text-muted)'}}>Diploma de {item.level}</div>
                              {item.diplomaB64 ? (
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                  <span style={{color: 'green', fontSize: '12px'}}>✓ Anexado</span>
                                  <button type="button" onClick={() => viewDocument(item.diplomaB64)} style={{padding: '4px 8px', border: '1px solid var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px'}}>Ver</button>
                                  <button type="button" onClick={() => updateAcademicHistory(item.id, 'diplomaB64', '')} style={{padding: '4px 8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '11px'}}>Remover</button>
                                </div>
                              ) : (
                                <input type="file" accept="image/*,application/pdf" onChange={(e) => handleAcademicDocUpload(item.id, 'diplomaB64', e)} style={{fontSize: '12px', width: '100%'}} />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Carreira</label>
              <select name="careerId" value={formData.careerId || ''} onChange={handleChange} style={styles.input}>
                <option value="">-- Selecione a Carreira --</option>
                {(data.careers || []).filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Categoria do Funcionário</label>
              <select name="categoryId" value={formData.categoryId || ''} onChange={handleChange} style={styles.input} disabled={!formData.careerId || activeCategories.length === 0}>
                <option value="">-- Selecione a Categoria --</option>
                {activeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Cargo</label>
              {formData.unitType === 'district' ? (
                <select name="role" value={formData.role || ''} onChange={handleChange} style={styles.input}>
                  <option value="">-- Sem Cargo / Técnico --</option>
                  <option value="Diretor Distrital">Diretor Distrital</option>
                  <option value="Chefe de Secção">Chefe de Secção</option>
                </select>
              ) : (
                <input type="text" name="role" value={formData.role} onChange={handleChange} style={styles.input} placeholder="Ex: Chefe de Repartição" />
              )}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Enquadramento TSU</label>
              <select name="class" value={formData.class} onChange={handleChange} style={styles.input}>
                <option value="">-- Selecione --</option>
                {[...Array(21)].map((_, i) => (
                  <option key={i+1} value={`Nível ${i+1}`}>Nível {i+1}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Escalão</label>
              <select name="step" value={formData.step} onChange={handleChange} style={styles.input}>
                <option value="">-- Selecione --</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Situação Laboral</label>
              <select name="employmentStatus" value={formData.employmentStatus} onChange={handleChange} style={styles.input}>
                <option value="">-- Selecione --</option>
                <option value="Efetivo">Efetivo</option>
                <option value="Contratado">Contratado</option>
                <option value="Estagiário">Estagiário</option>
                <option value="Destacado">Destacado</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de Vínculo</label>
              <select name="contractType" value={formData.contractType} onChange={handleChange} style={styles.input}>
                <option value="">-- Selecione --</option>
                <option value="Nomeação Definitiva">Nomeação Definitiva</option>
                <option value="Nomeação Provisória">Nomeação Provisória</option>
                <option value="Contrato a Termo">Contrato a Termo</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data de Ingresso</label>
              <input type="date" name="admissionDate" value={formData.admissionDate} onChange={handleChange} style={styles.input} />
            </div>
            <div style={{...styles.formGroup, display: 'flex', alignItems: 'center', paddingTop: '24px'}}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                Funcionário Ativo
              </label>
            </div>
          </div>
          
          <div style={{ marginTop: '25px', padding: '15px', backgroundColor: 'rgba(229, 62, 62, 0.05)', border: '1px solid rgba(229, 62, 62, 0.2)', borderRadius: '8px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '10px' }}>
              Possui Processo Disciplinar?
            </label>
            <div style={{ display: 'flex', gap: '20px', color: 'var(--color-text-base)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="radio" name="hasDisciplinary" checked={formData.hasDisciplinary === true} onChange={() => setFormData(prev => ({...prev, hasDisciplinary: true}))} />
                Sim
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="radio" name="hasDisciplinary" checked={formData.hasDisciplinary === false} onChange={() => setFormData(prev => ({...prev, hasDisciplinary: false}))} />
                Não
              </label>
            </div>

            {formData.hasDisciplinary && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <DisciplinarySubForm 
                  employeeId={editingEmpId}
                  tempProcesses={tempProcesses}
                  setTempProcesses={setTempProcesses}
                />
              </div>
            )}
          </div>
        </div>

        {/* ESTRUTURA ORGANIZACIONAL */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Colocação (Estrutura Organizacional)</h4>
          <div style={styles.fieldGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Direcção *</label>
              <select name="directorateId" value={formData.directorateId} onChange={handleChange} style={styles.input} required>
                <option value="">-- Selecione a Direcção --</option>
                {data.directorates.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {(() => {
              const currentDir = data.directorates.find(d => d.id === formData.directorateId);
              const isProvincial = !!(currentDir && currentDir.province);
              if (!isProvincial) return null;

              return (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Direção Distrital</label>
                  <select name="districtDirectorateId" value={formData.districtDirectorateId || ''} onChange={handleChange} style={styles.input}>
                    <option value="">-- Nenhuma / Sede Provincial --</option>
                    {activeDistricts.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              );
            })()}

            {!formData.districtDirectorateId && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Departamento {isEmpDirProvincial ? '(Opcional na Província)' : ''}</label>
                  <select name="departmentId" value={formData.departmentId} onChange={handleChange} style={styles.input} disabled={!formData.directorateId}>
                    <option value="">{isEmpDirProvincial ? '-- Nenhum / Directo na Direcção --' : '-- Selecione o Departamento --'}</option>
                    {activeDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Repartição (Opcional)</label>
                  <select 
                    name="divisionId" 
                    value={formData.divisionId} 
                    onChange={handleChange} 
                    style={styles.input} 
                    disabled={(!formData.departmentId && !formData.directorateId) || activeDivisions.length === 0}
                  >
                    <option value="">-- Nenhuma / Sem Repartição --</option>
                    {activeDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>
                {formData.districtDirectorateId ? 'Secção Distrital' : 'Secção'}
              </label>
              <select name="sectionId" value={formData.sectionId} onChange={handleChange} style={styles.input} disabled={(!formData.districtDirectorateId && !formData.divisionId && !formData.departmentId) || activeSections.length === 0}>
                <option value="">-- Selecione a Secção --</option>
                {activeSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && <div style={styles.error}>{errorMsg}</div>}

      <div style={styles.footer}>
        <button type="button" onClick={onCancel} style={styles.btnSecondary}>Cancelar</button>
        <button type="submit" style={styles.btnPrimary}>Salvar Funcionário</button>
      </div>
    </form>
  );
}

const styles = {
  formContainer: { animation: 'fadeIn 0.3s ease' },
  title: { fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: 'var(--color-primary)' },
  photoContainer: { display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '28px', padding: '24px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px dashed var(--color-border)' },
  photoWrapper: { width: '130px', height: '130px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', border: '4px solid #fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s ease' },
  photoPreview: { width: '100%', height: '100%', objectFit: 'cover' },
  photoPlaceholder: { fontSize: '40px', color: '#a0aec0' },
  fullscreenOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.2s ease' },
  fullscreenImage: { maxHeight: '90vh', maxWidth: '90vw', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' },
  closeFullscreenBtn: { position: 'absolute', top: '20px', right: '30px', background: 'transparent', border: 'none', color: '#fff', fontSize: '30px', cursor: 'pointer', opacity: 0.8 },
  formBody: { display: 'flex', flexDirection: 'column', gap: '30px' },
  section: { backgroundColor: 'var(--color-bg-base)', padding: '24px', borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  sectionTitle: { fontSize: '15px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '24px', borderBottom: '2px solid var(--color-border)', paddingBottom: '12px' },
  fieldGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)', marginBottom: '8px' },
  input: { width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-base)', fontSize: '14px', transition: 'all 0.2s' },
  error: { marginTop: '20px', padding: '14px', backgroundColor: 'rgba(229, 62, 62, 0.1)', color: '#e53e3e', borderRadius: '6px', fontSize: '14px', fontWeight: '500', border: '1px solid rgba(229, 62, 62, 0.3)' },
  footer: { marginTop: '40px', display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '24px' },
  btnPrimary: { padding: '12px 28px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' },
  btnSecondary: { padding: '12px 28px', backgroundColor: 'transparent', color: 'var(--color-text-base)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }
};
