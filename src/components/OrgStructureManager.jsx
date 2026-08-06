import React, { useState } from 'react';
import useOrgData from '../hooks/useOrgData';
import ConfirmModal from './ConfirmModal';
import DistrictDashboard from './org/DistrictDashboard';
import { formatDistrictName, getDistrictsByProvinceName } from '../utils/mozambiqueDistricts';

export default function OrgStructureManager({ t }) {
  const {
    data, toggleStatus,
    addDirectorate, updateDirectorate, deleteDirectorate,
    addDepartment, updateDepartment, deleteDepartment,
    addDivision, updateDivision, deleteDivision,
    addSection, updateSection, deleteSection,
    addCareer, updateCareer, deleteCareer,
    addCategory, updateCategory, deleteCategory,
    toggleDistrictStatus,
    addDistrict, updateDistrict, deleteDistrict,
    bootstrapNationalStructure,
    resetAndBootstrap,
    bootstrapDistricts,
    reorderItem, moveItem
  } = useOrgData();

  const [activeTab, setActiveTab] = useState('dir'); // dir | dep | rep | sec | car | cat
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Confirm/Alert modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', isDestructive: false, onConfirm: null, hideCancel: false });
  const [notes, setNotes] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [sectionName, setSectionName] = useState('');

  // Drag and Drop state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => { 
    e.preventDefault(); 
    
    // Auto-scroll para facilitar arrasto
    const SCROLL_MARGIN = 80;
    const SCROLL_SPEED = 15;
    
    // Tentar rolar a janela/documento principal
    if (e.clientY < SCROLL_MARGIN) {
      window.scrollBy(0, -SCROLL_SPEED);
      document.body.scrollBy(0, -SCROLL_SPEED);
    } else if (window.innerHeight - e.clientY < SCROLL_MARGIN) {
      window.scrollBy(0, SCROLL_SPEED);
      document.body.scrollBy(0, SCROLL_SPEED);
    }

    // Tentar rolar containers internos (caso a main area tenha overflow: auto)
    const scrollContainers = document.querySelectorAll('main, div');
    for (let container of scrollContainers) {
      const style = window.getComputedStyle(container);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        const rect = container.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          if (e.clientY - rect.top < SCROLL_MARGIN) {
            container.scrollBy(0, -SCROLL_SPEED);
            break; // Já encontrou o container sob o cursor
          } else if (rect.bottom - e.clientY < SCROLL_MARGIN) {
            container.scrollBy(0, SCROLL_SPEED);
            break;
          }
        }
      }
    }
  };
  const handleDragEnter = (id) => { setDragOverId(id); };
  const handleDragLeave = () => { setDragOverId(null); };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    if (draggedId && draggedId !== targetId) {
      moveItem(getListName(activeTab), draggedId, targetId);
    }
    setDraggedId(null);
  };

  const getTrProps = (id) => ({
    style: {
      ...styles.tr,
      opacity: draggedId === id ? 0.5 : 1,
      borderTop: dragOverId === id ? '2px dashed var(--color-primary)' : 'none',
      backgroundColor: dragOverId === id ? 'rgba(27, 54, 93, 0.05)' : 'transparent',
    },
    draggable: true,
    onDragStart: (e) => handleDragStart(e, id),
    onDragOver: handleDragOver,
    onDragEnter: () => handleDragEnter(id),
    onDragLeave: handleDragLeave,
    onDrop: (e) => handleDrop(e, id)
  });
  
  // Form states
  const [name, setName] = useState('');
  const [parentDirId, setParentDirId] = useState('');
  const [parentDepId, setParentDepId] = useState('');
  const [parentRepId, setParentRepId] = useState('');
  const [parentCarId, setParentCarId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [province, setProvince] = useState('');
  const [code, setCode] = useState('');

  const resetForm = () => {
    setName('');
    setParentDirId('');
    setParentDepId('');
    setParentRepId('');
    setParentCarId('');
    setSelectedDistrictId('');
    setSectionName('');
    setProvince('');
    setCode('');
    setNotes('');
    setEditingId(null);
    setErrorMsg('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetForm();
  };

  const showError = (msgKey) => {
    setErrorMsg(t(msgKey) || msgKey);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(e);
    }
  };

  const handleBootstrapDistricts = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Popular Distritos',
      message: 'Esta ação vai popular todas as Direções Distritais de Moçambique. Deseja continuar?',
      isDestructive: false,
      onConfirm: async () => {
        try {
          const res = await bootstrapDistricts();
          setConfirmModal({
            isOpen: true,
            title: 'Sucesso',
            message: res.message,
            hideCancel: true,
            onConfirm: () => setConfirmModal({ isOpen: false })
          });
        } catch (e) {
          setConfirmModal({
            isOpen: true,
            title: 'Erro',
            message: "Erro ao popular distritos: " + e.message,
            hideCancel: true,
            isDestructive: true,
            onConfirm: () => setConfirmModal({ isOpen: false })
          });
        }
      }
    });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    let success = false;

    if (activeTab === 'dir') {
      if (!name.trim()) return showError('Digite o nome');
      if (editingId) success = await updateDirectorate(editingId, name, province);
      else success = await addDirectorate(name, province);
    } else if (activeTab === 'dep') {
      if (!name.trim()) return showError('Digite o nome');
      if (!parentDirId) return showError('org_select_dir');
      if (editingId) success = await updateDepartment(editingId, name);
      else success = await addDepartment(parentDirId, name);
    } else if (activeTab === 'rep') {
      if (!name.trim()) return showError('Digite o nome');
      if (!parentDepId) return showError('org_select_dep');
      if (editingId) success = await updateDivision(editingId, name);
      else success = await addDivision(parentDepId, name);
    } else if (activeTab === 'sec') {
      if (!name.trim()) return showError('Digite o nome');
      if (!parentDepId) return showError('org_select_dep');
      const pId = parentRepId || parentDepId;
      const pType = parentRepId ? 'divisionId' : 'departmentId';
      if (editingId) success = await updateSection(editingId, name, pId, pType);
      else success = await addSection(pId, name, pType);
    } else if (activeTab === 'dist_dir') {
      if (!parentDirId) return showError('Selecione a Direção Provincial');

      if (editingId) {
        if (!name.trim()) return showError('Digite o Nome da Direção Distrital');
        const formattedDistName = formatDistrictName(name);
        success = await updateDistrict(editingId, formattedDistName, parentDirId, notes, 'Ativo');
      } else {
        if (selectedDistrictId === 'NEW') {
          if (!name.trim()) return showError('Digite o Nome da Nova Direção Distrital');
          const formattedDistName = formatDistrictName(name);
          const newDist = await addDistrict(formattedDistName, parentDirId, '', notes);
          if (newDist && newDist.id) success = true;
        } else if (selectedDistrictId) {
          const formattedDistName = formatDistrictName(name);
          success = await updateDistrict(selectedDistrictId, formattedDistName, parentDirId, notes, 'Ativo');
        } else {
          return showError('Selecione uma Direção Distrital');
        }
      }
    } else if (activeTab === 'dist_sec') {
      const targetDistId = selectedDistrictId;
      if (!targetDistId) return showError('Selecione a Direcção Distrital');
      if (!name.trim()) return showError('Digite o Nome da Secção Distrital');
      if (editingId) success = await updateSection(editingId, name, targetDistId, 'districtDirectorateId');
      else success = await addSection(targetDistId, name, 'districtDirectorateId');
    } else if (activeTab === 'car') {
      if (!name.trim()) return showError('Digite o Nome da Carreira');
      if (editingId) success = await updateCareer(editingId, name);
      else success = await addCareer(name);
    } else if (activeTab === 'cat') {
      if (!parentCarId) return showError('Selecione a Carreira');
      if (!name.trim()) return showError('Digite o Nome da Categoria');
      if (editingId) success = await updateCategory(editingId, parentCarId, name);
      else success = await addCategory(parentCarId, name);
    }

    if (!success) {
      showError('msg_org_duplicate');
    } else {
      resetForm();
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    
    if (activeTab === 'dir') {
      setProvince(item.province || '');
    } else if (activeTab === 'dep') {
      setParentDirId(item.directorateId);
    } else if (activeTab === 'rep') {
      setParentDepId(item.departmentId);
      const dep = data.departments.find(d => d.id === item.departmentId);
      if (dep) setParentDirId(dep.directorateId);
    } else if (activeTab === 'sec') {
      if (item.divisionId) {
        setParentRepId(item.divisionId);
        const rep = data.divisions.find(r => r.id === item.divisionId);
        if (rep) {
          setParentDepId(rep.departmentId);
          const dep = data.departments.find(d => d.id === rep.departmentId);
          if (dep) setParentDirId(dep.directorateId);
        }
      } else if (item.departmentId) {
        setParentRepId('');
        setParentDepId(item.departmentId);
        const dep = data.departments.find(d => d.id === item.departmentId);
        if (dep) setParentDirId(dep.directorateId);
      }
    } else if (activeTab === 'dist_dir') {
      setParentDirId(item.provincialDirectorateId);
      setSelectedDistrictId(item.id);
      setCode(item.code || '');
      setNotes(item.notes || '');
    } else if (activeTab === 'dist_sec') {
      const distId = item.districtDirectorateId || item.districtId;
      setSelectedDistrictId(distId || '');
      const dist = (data.districtDirectorates || []).find(d => String(d.id) === String(distId));
      if (dist) setParentDirId(dist.provincialDirectorateId);
    } else if (activeTab === 'cat') {
      setParentCarId(item.careerId);
    }
    setErrorMsg('');
  };

  const requestDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Eliminação',
      message: t('org_confirm_delete') || 'Tem a certeza que deseja apagar?',
      isDestructive: true,
      onConfirm: () => executeDelete(id)
    });
  };

  const executeDelete = async (id) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    let success = false;
    if (activeTab === 'dir') success = await deleteDirectorate(id);
    else if (activeTab === 'dep') success = await deleteDepartment(id);
    else if (activeTab === 'rep') success = await deleteDivision(id);
    else if (activeTab === 'sec') success = await deleteSection(id);
    else if (activeTab === 'dist_dir') success = await deleteDistrict(id);
    else if (activeTab === 'dist_sec') success = await deleteSection(id);
    else if (activeTab === 'car') success = await deleteCareer(id);
    else if (activeTab === 'cat') success = await deleteCategory(id);

    if (!success) {
      showError('msg_org_delete_blocked');
    }
  };

  const getListName = (tab) => {
    if (tab === 'dir') return 'directorates';
    if (tab === 'dep') return 'departments';
    if (tab === 'rep') return 'divisions';
    if (tab === 'sec') return 'sections';
    if (tab === 'dist_dir') return 'district_directorates';
    if (tab === 'dist_sec') return 'sections';
    if (tab === 'car') return 'careers';
    if (tab === 'cat') return 'categories';
  };

  const handleToggleStatus = (id) => {
    if (activeTab === 'dist_dir') {
      toggleDistrictStatus(id);
    } else {
      toggleStatus(getListName(activeTab), id);
    }
  };

  const handleReorder = (id, direction) => {
    reorderItem(getListName(activeTab), id, direction);
  };

  // Filtragem dinâmica
  const availableDepartments = data.departments.filter(d => d.directorateId === parentDirId);
  const availableDivisions = data.divisions.filter(d => d.departmentId === parentDepId);

  // Província selecionada no form dist_dir
  const selectedProvDir = (data.directorates || []).find(d => String(d.id) === String(parentDirId));
  const selectedProvinceName = selectedProvDir ? selectedProvDir.province : null;

  let availableDistricts = [];
  if (parentDirId) {
    let rawDistricts = (data.districtDirectorates || []).filter(d => {
      if (String(d.provincialDirectorateId) === String(parentDirId)) return true;
      if (selectedProvinceName && d.province && d.province.toLowerCase() === selectedProvinceName.toLowerCase()) return true;
      return false;
    });

    if (rawDistricts.length === 0 && selectedProvinceName) {
      const officialDistNames = getDistrictsByProvinceName(selectedProvinceName);
      rawDistricts = officialDistNames.map((distName, idx) => ({
        id: `dist_${selectedProvinceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${distName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: distName,
        provincialDirectorateId: parentDirId,
        province: selectedProvinceName
      }));
    }

    availableDistricts = rawDistricts.reduce((acc, current) => {
      const formattedCurrent = formatDistrictName(current.name);
      if (!acc.some(item => formatDistrictName(item.name).toLowerCase() === formattedCurrent.toLowerCase())) {
        acc.push(current);
      }
      return acc;
    }, []);
  }

  // List filters
  const displayDepartments = parentDirId ? data.departments.filter(d => d.directorateId === parentDirId) : data.departments;
  const displayDivisions = parentDepId ? data.divisions.filter(d => d.departmentId === parentDepId) : data.divisions;
  const displaySections = parentRepId 
    ? data.sections.filter(s => s.divisionId === parentRepId) 
    : (parentDepId ? data.sections.filter(s => s.departmentId === parentDepId) : data.sections.filter(s => !s.districtDirectorateId));
  const displayDistricts = selectedDistrictId && selectedDistrictId !== 'NEW'
    ? (data.districtDirectorates || []).filter(d => String(d.id) === String(selectedDistrictId))
    : (parentDirId ? availableDistricts : (data.districtDirectorates || []));
  const rawDistrictSections = selectedDistrictId
    ? (data.sections || []).filter(s => String(s.districtDirectorateId || s.districtId) === String(selectedDistrictId))
    : (parentDirId
        ? (data.sections || []).filter(s => {
            const dist = (data.districtDirectorates || []).find(d => String(d.id) === String(s.districtDirectorateId || s.districtId));
            return dist && String(dist.provincialDirectorateId) === String(parentDirId);
          })
        : (data.sections || []).filter(s => s.districtDirectorateId || s.districtId)
      );

  let displayDistrictSections = rawDistrictSections;
  if (selectedDistrictId && displayDistrictSections.length === 0) {
    const DEFAULT_SECS = [
      "Piquete Operativo", "Secretaria", "Secção Técnica Criminalística",
      "Secção de Apoio e Documentação", "Secção de Armamento e Segurança",
      "Secção de Identificação e Registo Policial", "Secção de Investigação Operativa",
      "Secção de Investigação e Instrução Criminal"
    ];
    displayDistrictSections = DEFAULT_SECS.map((name, idx) => ({
      id: `virtual_sec_${selectedDistrictId}_${idx}`,
      districtDirectorateId: selectedDistrictId,
      name,
      isActive: true
    }));
  }
  const displayCategories = parentCarId ? data.categories.filter(c => c.careerId === parentCarId) : data.categories;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{t('org_title')}</h2>
          <p style={styles.desc}>{t('org_desc')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <button onClick={() => handleTabChange('dir')} style={activeTab === 'dir' ? styles.activeTab : styles.tab}>{t('org_tab_dir')}</button>
        <button onClick={() => handleTabChange('dep')} style={activeTab === 'dep' ? styles.activeTab : styles.tab}>{t('org_tab_dep')}</button>
        <button onClick={() => handleTabChange('rep')} style={activeTab === 'rep' ? styles.activeTab : styles.tab}>{t('org_tab_rep')}</button>
        <button onClick={() => handleTabChange('sec')} style={activeTab === 'sec' ? styles.activeTab : styles.tab}>{t('org_tab_sec')}</button>
        <button onClick={() => handleTabChange('dist_dir')} style={activeTab === 'dist_dir' ? styles.activeTab : styles.tab}>Direcções Distritais</button>
        <button onClick={() => handleTabChange('car')} style={activeTab === 'car' ? styles.activeTab : styles.tab}>{t('org_tab_car')}</button>
        <button onClick={() => handleTabChange('cat')} style={activeTab === 'cat' ? styles.activeTab : styles.tab}>{t('org_tab_cat')}</button>
        <button onClick={() => handleTabChange('dist_dash')} style={activeTab === 'dist_dash' ? styles.activeTab : styles.tab}>Estatística Organizacional</button>
      </div>

      <div style={{ ...styles.contentArea, gridTemplateColumns: activeTab === 'dist_dash' ? '1fr' : '350px 1fr' }}>
        {activeTab === 'dist_dash' && (
          <div style={{ width: '100%' }}><DistrictDashboard data={data} t={t} /></div>
        )}

        {activeTab !== 'dist_dash' && (
          <>
            {/* Formulário */}
            <div style={styles.formCard}>
              <h3 style={styles.cardTitle}>
                {editingId 
                  ? t('org_edit_title') 
                  : (activeTab === 'dist_dir' ? 'Criar Direcção Distrital' : (activeTab === 'dist_sec' ? 'Criar Secção Distrital' : t(`org_create_${activeTab}`)))}
              </h3>
              
              {activeTab === 'dist_dir' && !editingId && (!data.districtDirectorates || data.districtDirectorates.length === 0) && (
                <div style={{marginBottom: '20px'}}>
                  <button type="button" onClick={handleBootstrapDistricts} style={{...styles.btnPrimary, backgroundColor: '#38a169', borderColor: '#2f855a', width: '100%'}}>
                    🌟 Injetar Todos os Distritos Nacionais Automaticamente
                  </button>
                  <p style={{fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px', textAlign: 'center'}}>Irá popular todos os distritos de Moçambique nas suas respetivas províncias.</p>
                </div>
              )}
              
              <form onSubmit={handleSave} style={styles.form}>
                {['dep', 'rep', 'sec'].includes(activeTab) && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t('org_tab_dir')}</label>
                    <select 
                      value={parentDirId} 
                      onChange={(e) => {
                        setParentDirId(e.target.value);
                        setParentDepId('');
                        setParentRepId('');
                      }}
                      onKeyDown={handleKeyPress}
                      style={styles.input}
                      required
                    >
                      <option value="">-- {t('org_select_dir')} --</option>
                      {data.directorates.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}

                {activeTab === 'dist_dir' && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>1. Direcção Provincial *</label>
                      <select 
                        value={parentDirId} 
                        onChange={(e) => {
                          setParentDirId(e.target.value);
                          setSelectedDistrictId('');
                        }}
                        onKeyDown={handleKeyPress}
                        style={styles.input}
                        required
                      >
                        <option value="">-- Seleccione a Direcção Provincial --</option>
                        {(data.directorates || [])
                          .filter(d => d.isActive && d.province)
                          .reduce((acc, current) => {
                            if (!acc.some(item => item.province === current.province)) {
                              acc.push(current);
                            }
                            return acc;
                          }, [])
                          .map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.province})</option>
                          ))}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>2. Seleccionar Direcção Distrital *</label>
                      <select
                        value={selectedDistrictId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedDistrictId(val);
                          if (val !== 'NEW') {
                            const distObj = availableDistricts.find(d => String(d.id) === String(val));
                            if (distObj) setName(distObj.name);
                          } else {
                            setName('');
                          }
                        }}
                        style={styles.input}
                        disabled={!parentDirId}
                      >
                        <option value="">-- Seleccione a Direcção Distrital --</option>
                        {availableDistricts.map(d => (
                          <option key={d.id} value={d.id}>{formatDistrictName(d.name)}</option>
                        ))}
                        <option value="NEW">➕ Criar Nova Direcção Distrital...</option>
                      </select>
                    </div>

                    {(selectedDistrictId === 'NEW' || editingId) && (
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Nome da Nova Direcção Distrital *</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onKeyDown={handleKeyPress}
                          placeholder="Ex: Moatize"
                          style={styles.input}
                          required
                        />
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'cat' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t('org_tab_car')} *</label>
                    <select 
                      value={parentCarId} 
                      onChange={(e) => setParentCarId(e.target.value)}
                      onKeyDown={handleKeyPress}
                      style={styles.input}
                      required
                    >
                      <option value="">-- Seleccione a Carreira --</option>
                      {(data.careers || []).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTab !== 'dist_dir' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{t('org_name')} *</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={activeTab === 'car' ? 'Ex: Investigação Criminal' : (activeTab === 'cat' ? 'Ex: Investigador Principal' : 'Escreva o nome...')}
                      style={styles.input}
                      required
                    />
                  </div>
                )}

                {activeTab === 'dir' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Província (Apenas para Direções Provinciais)</label>
                    <select 
                      value={province} 
                      onChange={(e) => setProvince(e.target.value)} 
                      onKeyDown={handleKeyPress}
                      style={styles.input}
                    >
                      <option value="">-- Nenhuma (Direção Central) --</option>
                      <option value="Cidade de Maputo">Cidade de Maputo</option>
                      <option value="Maputo Província">Maputo Província</option>
                      <option value="Gaza">Gaza</option>
                      <option value="Inhambane">Inhambane</option>
                      <option value="Sofala">Sofala</option>
                      <option value="Manica">Manica</option>
                      <option value="Tete">Tete</option>
                      <option value="Zambézia">Zambézia</option>
                      <option value="Nampula">Nampula</option>
                      <option value="Niassa">Niassa</option>
                      <option value="Cabo Delgado">Cabo Delgado</option>
                    </select>
                  </div>
                )}

                {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

                <div style={styles.buttonGroup}>
                  <button type="submit" style={styles.btnPrimary}>
                    {editingId ? t('org_save') : t('org_add')}
                  </button>
                  {editingId && (
                    <button type="button" onClick={resetForm} style={styles.btnSecondary}>
                      {t('org_cancel')}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Lista de Registos */}
            <div style={styles.listCard}>
              <h3 style={styles.cardTitle}>Registos Guardados</h3>
              <div style={styles.tableContainer}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>{t('org_name')}</th>
                      {activeTab === 'dir' && <th>Província</th>}
                      {['dist_dir', 'dist_sec'].includes(activeTab) && <th>Direcções</th>}
                      {['dep', 'rep', 'sec'].includes(activeTab) && <th>{t('org_tab_dir')}</th>}
                      {['rep', 'sec'].includes(activeTab) && <th>{t('org_tab_dep')}</th>}
                      {activeTab === 'sec' && <th>{t('org_tab_rep')}</th>}
                      {activeTab === 'cat' && <th>{t('org_tab_car')}</th>}
                      <th>{t('org_status')}</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === 'dir' && data.directorates.map(item => (
                      <tr key={item.id} {...getTrProps(item.id)}>
                        <td>{item.name}</td>
                        <td>{item.province || <span style={{color: '#a0aec0', fontStyle: 'italic'}}>Central</span>}</td>
                        <td>
                          <span style={item.isActive ? styles.badgeActive : styles.badgeInactive}>
                            {item.isActive ? t('org_active') : t('org_inactive')}
                          </span>
                        </td>
                        <td style={styles.tdActions}>
                          <span style={{...styles.btnIcon, cursor: 'grab', fontSize: '16px', display: 'inline-flex'}} title="Arraste para reordenar">☰</span>
                          <span style={styles.divider}></span>
                          <button onClick={() => handleToggleStatus(item.id)} style={styles.btnIcon} title="Toggle Status">⏻</button>
                          <button onClick={() => handleEdit(item)} style={styles.btnIcon}>✎</button>
                          <button onClick={() => requestDelete(item.id)} style={{...styles.btnIcon, color: '#e53e3e'}}>🗑</button>
                        </td>
                      </tr>
                    ))}
                    
                    {activeTab === 'dist_dir' && displayDistricts.flatMap(item => {
                      let distSecs = (data.sections || []).filter(s => String(s.districtDirectorateId || s.districtId) === String(item.id));
                      if (distSecs.length === 0) {
                        const DEFAULT_SECS = [
                          "Piquete Operativo", "Secretaria", "Secção Técnica Criminalística",
                          "Secção de Apoio e Documentação", "Secção de Armamento e Segurança",
                          "Secção de Identificação e Registo Policial", "Secção de Investigação Operativa",
                          "Secção de Investigação e Instrução Criminal"
                        ];
                        distSecs = DEFAULT_SECS.map((name, idx) => ({
                          id: `v_sec_${item.id}_${idx}`,
                          name,
                          districtDirectorateId: item.id,
                          isActive: item.isActive !== false
                        }));
                      }
                      const distName = formatDistrictName(item.name);

                      return distSecs.map(sec => (
                        <tr key={sec.id} {...getTrProps(sec.id)}>
                          <td><strong style={{ color: 'var(--color-text-main)' }}>{sec.name}</strong></td>
                          <td>{distName}</td>
                          <td>
                            <span style={sec.isActive !== false ? styles.badgeActive : styles.badgeInactive}>
                              {sec.isActive !== false ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td style={styles.tdActions}>
                            <span style={{...styles.btnIcon, cursor: 'grab', fontSize: '16px', display: 'inline-flex'}} title="Arraste para reordenar">☰</span>
                            <span style={styles.divider}></span>
                            <button onClick={() => handleToggleStatus(sec.id)} style={styles.btnIcon} title="Toggle Status">⏻</button>
                            <button onClick={() => handleEdit(sec)} style={styles.btnIcon}>✎</button>
                            <button onClick={() => requestDelete(sec.id)} style={{...styles.btnIcon, color: '#e53e3e'}}>🗑</button>
                          </td>
                        </tr>
                      ));
                    })}

                    {activeTab === 'dist_sec' && displayDistrictSections.map(item => {
                      const dist = (data.districtDirectorates || []).find(d => String(d.id) === String(item.districtDirectorateId || item.districtId));
                      const selectedDistObj = (data.districtDirectorates || []).find(d => String(d.id) === String(selectedDistrictId));
                      const distName = dist ? formatDistrictName(dist.name) : (selectedDistObj ? formatDistrictName(selectedDistObj.name) : '-');

                      return (
                        <tr key={item.id} {...getTrProps(item.id)}>
                          <td><strong style={{ color: 'var(--color-text-main)' }}>{item.name}</strong></td>
                          <td>{distName}</td>
                          <td>
                            <span style={item.isActive !== false ? styles.badgeActive : styles.badgeInactive}>
                              {item.isActive !== false ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td style={styles.tdActions}>
                            <span style={{...styles.btnIcon, cursor: 'grab', fontSize: '16px', display: 'inline-flex'}} title="Arraste para reordenar">☰</span>
                            <span style={styles.divider}></span>
                            <button onClick={() => handleToggleStatus(item.id)} style={styles.btnIcon} title="Toggle Status">⏻</button>
                            <button onClick={() => handleEdit(item)} style={styles.btnIcon}>✎</button>
                            <button onClick={() => requestDelete(item.id)} style={{...styles.btnIcon, color: '#e53e3e'}}>🗑</button>
                          </td>
                        </tr>
                      );
                    })}

                    {activeTab === 'dep' && displayDepartments.map(item => {
                      const pDir = data.directorates.find(d => d.id === item.directorateId);
                      return (
                        <tr key={item.id} {...getTrProps(item.id)}>
                          <td>{item.name}</td>
                          <td>{pDir?.name || '-'}</td>
                          <td>
                            <span style={item.isActive ? styles.badgeActive : styles.badgeInactive}>{item.isActive ? t('org_active') : t('org_inactive')}</span>
                          </td>
                          <td style={styles.tdActions}>
                            <span style={{...styles.btnIcon, cursor: 'grab', fontSize: '16px', display: 'inline-flex'}} title="Arraste para reordenar">☰</span>
                            <span style={styles.divider}></span>
                            <button onClick={() => handleToggleStatus(item.id)} style={styles.btnIcon}>⏻</button>
                            <button onClick={() => handleEdit(item)} style={styles.btnIcon}>✎</button>
                            <button onClick={() => requestDelete(item.id)} style={{...styles.btnIcon, color: '#e53e3e'}}>🗑</button>
                          </td>
                        </tr>
                      )
                    })}

                    {activeTab === 'rep' && displayDivisions.map(item => {
                      const pDep = data.departments.find(d => d.id === item.departmentId);
                      const pDir = data.directorates.find(d => d.id === pDep?.directorateId);
                      return (
                        <tr key={item.id} {...getTrProps(item.id)}>
                          <td>{item.name}</td>
                          <td>{pDir?.name || '-'}</td>
                          <td>{pDep?.name || '-'}</td>
                          <td>
                            <span style={item.isActive ? styles.badgeActive : styles.badgeInactive}>{item.isActive ? t('org_active') : t('org_inactive')}</span>
                          </td>
                          <td style={styles.tdActions}>
                            <span style={{...styles.btnIcon, cursor: 'grab', fontSize: '16px', display: 'inline-flex'}} title="Arraste para reordenar">☰</span>
                            <span style={styles.divider}></span>
                            <button onClick={() => handleToggleStatus(item.id)} style={styles.btnIcon}>⏻</button>
                            <button onClick={() => handleEdit(item)} style={styles.btnIcon}>✎</button>
                            <button onClick={() => requestDelete(item.id)} style={{...styles.btnIcon, color: '#e53e3e'}}>🗑</button>
                          </td>
                        </tr>
                      )
                    })}

                    {activeTab === 'sec' && displaySections.map(item => {
                      // Pode estar associado a uma Repartição ou a um Departamento direto
                      let pRep = null, pDep = null, pDir = null;
                      
                      if (item.divisionId) {
                        pRep = data.divisions.find(d => d.id === item.divisionId);
                        pDep = data.departments.find(d => d.id === pRep?.departmentId);
                        pDir = data.directorates.find(d => d.id === pDep?.directorateId);
                      } else if (item.departmentId) {
                        pDep = data.departments.find(d => d.id === item.departmentId);
                        pDir = data.directorates.find(d => d.id === pDep?.directorateId);
                      }

                      return (
                        <tr key={item.id} {...getTrProps(item.id)}>
                          <td>{item.name}</td>
                          <td>{pDir?.name || '-'}</td>
                          <td>{pDep?.name || '-'}</td>
                          <td>{pRep ? pRep.name : <span style={{color: '#a0aec0', fontStyle: 'italic'}}>Dir. Direta</span>}</td>
                          <td>
                            <span style={item.isActive ? styles.badgeActive : styles.badgeInactive}>{item.isActive ? t('org_active') : t('org_inactive')}</span>
                          </td>
                          <td style={styles.tdActions}>
                            <span style={{...styles.btnIcon, cursor: 'grab', fontSize: '16px', display: 'inline-flex'}} title="Arraste para reordenar">☰</span>
                            <span style={styles.divider}></span>
                            <button onClick={() => handleToggleStatus(item.id)} style={styles.btnIcon}>⏻</button>
                            <button onClick={() => handleEdit(item)} style={styles.btnIcon}>✎</button>
                            <button onClick={() => requestDelete(item.id)} style={{...styles.btnIcon, color: '#e53e3e'}}>🗑</button>
                          </td>
                        </tr>
                      )
                    })}

                    {activeTab === 'car' && (data.careers || []).map(item => (
                      <tr key={item.id} {...getTrProps(item.id)}>
                        <td>{item.name}</td>
                        <td>
                          <span style={item.isActive ? styles.badgeActive : styles.badgeInactive}>{item.isActive ? t('org_active') : t('org_inactive')}</span>
                        </td>
                        <td style={styles.tdActions}>
                          <button onClick={() => handleReorder(item.id, 'up')} style={styles.btnIcon} title="Mover para Cima">↑</button>
                          <button onClick={() => handleReorder(item.id, 'down')} style={styles.btnIcon} title="Mover para Baixo">↓</button>
                          <span style={styles.divider}></span>
                          <button onClick={() => handleToggleStatus(item.id)} style={styles.btnIcon}>⏻</button>
                          <button onClick={() => handleEdit(item)} style={styles.btnIcon}>✎</button>
                          <button onClick={() => requestDelete(item.id)} style={{...styles.btnIcon, color: '#e53e3e'}}>🗑</button>
                        </td>
                      </tr>
                    ))}

                    {activeTab === 'cat' && displayCategories.map(item => {
                      const pCar = (data.careers || []).find(c => c.id === item.careerId);
                      return (
                        <tr key={item.id} {...getTrProps(item.id)}>
                          <td>{item.name}</td>
                          <td>{pCar?.name || '-'}</td>
                          <td>
                            <span style={item.isActive ? styles.badgeActive : styles.badgeInactive}>{item.isActive ? t('org_active') : t('org_inactive')}</span>
                          </td>
                          <td style={styles.tdActions}>
                            <span style={{...styles.btnIcon, cursor: 'grab', fontSize: '16px', display: 'inline-flex'}} title="Arraste para reordenar">☰</span>
                            <span style={styles.divider}></span>
                            <button onClick={() => handleToggleStatus(item.id)} style={styles.btnIcon}>⏻</button>
                            <button onClick={() => handleEdit(item)} style={styles.btnIcon}>✎</button>
                            <button onClick={() => requestDelete(item.id)} style={{...styles.btnIcon, color: '#e53e3e'}}>🗑</button>
                          </td>
                        </tr>
                      )
                    })}

                    {/* Empty states */}
                    {activeTab === 'dir' && data.directorates.length === 0 && <tr><td colSpan="4" style={styles.empty}>{t('org_empty')}</td></tr>}
                    {activeTab === 'dist_dir' && displayDistricts.length === 0 && <tr><td colSpan="7" style={styles.empty}>{t('org_empty')}</td></tr>}
                    {activeTab === 'dist_sec' && displayDistrictSections.length === 0 && <tr><td colSpan="6" style={styles.empty}>{t('org_empty')}</td></tr>}
                    {activeTab === 'dep' && displayDepartments.length === 0 && <tr><td colSpan="5" style={styles.empty}>{t('org_empty')}</td></tr>}
                    {activeTab === 'rep' && displayDivisions.length === 0 && <tr><td colSpan="6" style={styles.empty}>{t('org_empty')}</td></tr>}
                    {activeTab === 'sec' && displaySections.length === 0 && <tr><td colSpan="7" style={styles.empty}>{t('org_empty')}</td></tr>}
                    {activeTab === 'car' && (!data.careers || data.careers.length === 0) && <tr><td colSpan="4" style={styles.empty}>{t('org_empty')}</td></tr>}
                    {activeTab === 'cat' && displayCategories.length === 0 && <tr><td colSpan="5" style={styles.empty}>{t('org_empty')}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm || confirmModal.action}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

const styles = {
  container: { padding: '30px', animation: 'fadeIn 0.4s ease-out' },
  header: { marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' },
  desc: { color: 'var(--color-text-muted)', fontSize: '15px' },
  bootstrapBtn: { backgroundColor: '#3182ce', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(49, 130, 206, 0.3)' },
  tabsContainer: { display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' },
  tab: { padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid transparent', transition: 'all 0.2s' },
  activeTab: { padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid var(--color-primary)', transition: 'all 0.2s' },
  contentArea: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', alignItems: 'start' },
  formCard: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  listCard: { backgroundColor: 'var(--color-bg-card)', padding: '20px 20px 12px 20px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', minHeight: 0 },
  cardTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-primary)' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)', marginBottom: '8px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px' },
  buttonGroup: { display: 'flex', gap: '12px', marginTop: '24px' },
  btnPrimary: { padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', flex: 1 },
  btnSecondary: { padding: '10px 16px', backgroundColor: 'transparent', color: 'var(--color-text-base)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  errorAlert: { marginTop: '12px', padding: '10px', backgroundColor: 'rgba(229, 62, 62, 0.1)', color: '#e53e3e', borderRadius: '6px', fontSize: '13px', fontWeight: '500' },
  tableContainer: { overflowX: 'auto', overflowY: 'auto', maxHeight: '480px', borderRadius: '8px', border: '1px solid var(--color-border)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '9px 10px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '12px', letterSpacing: '0.04em', textTransform: 'uppercase', position: 'sticky', top: 0, backgroundColor: 'var(--color-bg-card)', zIndex: 1 },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '8px 10px', color: 'var(--color-text-base)', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' },
  tdActions: { padding: '8px 10px', whiteSpace: 'nowrap', textAlign: 'right' },
  divider: { display: 'inline-flex', width: '1px', height: '16px', backgroundColor: 'var(--color-border)', margin: '0 8px', verticalAlign: 'middle' },
  btnIcon: { 
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
    width: '32px', height: '32px', background: '#f7fafc', border: '1px solid #e2e8f0', 
    cursor: 'pointer', fontSize: '15px', color: 'var(--color-text-muted)', 
    transition: 'all 0.2s', borderRadius: '6px', margin: '0 3px', verticalAlign: 'middle',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  empty: { textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  badgeActive: { backgroundColor: 'rgba(72, 187, 120, 0.15)', color: '#2f855a', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  badgeInactive: { backgroundColor: 'rgba(160, 174, 192, 0.15)', color: '#718096', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }
};
