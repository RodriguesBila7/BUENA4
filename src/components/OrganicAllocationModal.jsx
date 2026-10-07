import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../hooks/useResizableModal';

/**
 * OrganicAllocationModal.jsx
 * CRUD de Lotação Orgânica de Funcionários.
 * Permite alocar funcionários a Departamentos (com Repartição/Secção)
 * ou a Direcções Distritais (com Secção Distrital), ou mantê-los na Sede Provincial.
 */
export default function OrganicAllocationModal({
  isOpen,
  onClose,
  employee: initialEmployee,
  availableEmployees = [],
  directorateId = '',
  directorateName = '',
  orgData = {},
  onSave,
  onUnassign
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [targetType, setTargetType] = useState('department'); // 'department' | 'district' | 'unassigned'
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedDistrictSectionId, setSelectedDistrictSectionId] = useState('');
  const [roleInUnit, setRoleInUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    modalRef,
    onPointerDown,
    isMaximized,
    toggleMaximize,
    handleResizePointerDown,
    handleHeaderDoubleClick,
    getOverlayProps,
    modalStyle
  } = useResizableModal({ defaultWidth: '640px', minWidth: 420, minHeight: 380 });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Determinar o funcionário atual sendo editado
  const currentEmployee = useMemo(() => {
    if (selectedEmpId) {
      const found = availableEmployees.find(e => String(e.id) === String(selectedEmpId));
      if (found) return found;
    }
    return initialEmployee || (availableEmployees.length > 0 ? availableEmployees[0] : null);
  }, [selectedEmpId, initialEmployee, availableEmployees]);

  // Sincronizar dados do funcionário ao abrir ou trocar
  useEffect(() => {
    if (!isOpen) return;

    const emp = currentEmployee;
    if (emp) {
      setSelectedEmpId(String(emp.id));
      setRoleInUnit(emp.role || emp.position || '');
      setNotes(emp.allocationNotes || '');
      setErrorMsg('');

      const distId = emp.districtDirectorateId || emp.districtId;
      if (distId) {
        setTargetType('district');
        setSelectedDistrictId(String(distId));
        setSelectedDistrictSectionId(emp.sectionId || emp.seccaoId ? String(emp.sectionId || emp.seccaoId) : '');
        setSelectedDepartmentId('');
        setSelectedDivisionId('');
        setSelectedSectionId('');
      } else if (emp.departmentId) {
        setTargetType('department');
        setSelectedDepartmentId(String(emp.departmentId));
        setSelectedDivisionId(emp.divisionId || emp.reparticaoId ? String(emp.divisionId || emp.reparticaoId) : '');
        setSelectedSectionId(emp.sectionId || emp.seccaoId ? String(emp.sectionId || emp.seccaoId) : '');
        setSelectedDistrictId('');
        setSelectedDistrictSectionId('');
      } else {
        setTargetType('unassigned');
        setSelectedDepartmentId('');
        setSelectedDivisionId('');
        setSelectedSectionId('');
        setSelectedDistrictId('');
        setSelectedDistrictSectionId('');
      }
    }
  }, [isOpen, currentEmployee]);

  // Lista de departamentos disponíveis para esta Direcção Provincial
  const availableDepartments = useMemo(() => {
    const all = orgData.departments || [];
    if (!directorateId || directorateId === 'ALL') return all;
    return all.filter(d => String(d.directorateId) === String(directorateId));
  }, [orgData.departments, directorateId]);

  // Lista de Direcções Distritais disponíveis para esta Direcção Provincial
  const availableDistricts = useMemo(() => {
    const all = orgData.districtDirectorates || [];
    if (!directorateId || directorateId === 'ALL') return all;
    return all.filter(d => String(d.provincialDirectorateId) === String(directorateId));
  }, [orgData.districtDirectorates, directorateId]);

  // Repartições subordinadas ao departamento selecionado
  const availableDivisions = useMemo(() => {
    if (!selectedDepartmentId) return [];
    return (orgData.divisions || []).filter(v => String(v.departmentId) === String(selectedDepartmentId));
  }, [orgData.divisions, selectedDepartmentId]);

  // Secções subordinadas à repartição ou departamento selecionado
  const availableSections = useMemo(() => {
    if (!selectedDepartmentId) return [];
    return (orgData.sections || []).filter(s => {
      if (selectedDivisionId) {
        return String(s.divisionId) === String(selectedDivisionId);
      }
      return String(s.departmentId) === String(selectedDepartmentId);
    });
  }, [orgData.sections, selectedDepartmentId, selectedDivisionId]);

  // Secções subordinadas à Direcção Distrital selecionada
  const availableDistrictSections = useMemo(() => {
    if (!selectedDistrictId) return [];
    return (orgData.sections || []).filter(s => String(s.districtDirectorateId || s.districtId) === String(selectedDistrictId));
  }, [orgData.sections, selectedDistrictId]);

  // Resolução da Lotação Atual
  const currentPlacementInfo = useMemo(() => {
    if (!currentEmployee) return null;
    const distId = currentEmployee.districtDirectorateId || currentEmployee.districtId;
    if (distId) {
      const dist = (orgData.districtDirectorates || []).find(d => String(d.id) === String(distId));
      const sec = currentEmployee.sectionId || currentEmployee.seccaoId
        ? (orgData.sections || []).find(s => String(s.id) === String(currentEmployee.sectionId || currentEmployee.seccaoId))
        : null;
      return {
        isAssigned: true,
        type: 'district',
        label: dist ? dist.name : 'Direcção Distrital',
        sub: sec ? `Secção: ${sec.name}` : null,
        badgeColor: '#0d9488',
        icon: '📍'
      };
    }
    if (currentEmployee.departmentId) {
      const dep = (orgData.departments || []).find(d => String(d.id) === String(currentEmployee.departmentId));
      const div = currentEmployee.divisionId || currentEmployee.reparticaoId
        ? (orgData.divisions || []).find(v => String(v.id) === String(currentEmployee.divisionId || currentEmployee.reparticaoId))
        : null;
      const sec = currentEmployee.sectionId || currentEmployee.seccaoId
        ? (orgData.sections || []).find(s => String(s.id) === String(currentEmployee.sectionId || currentEmployee.seccaoId))
        : null;
      return {
        isAssigned: true,
        type: 'department',
        label: dep ? dep.name : 'Departamento',
        sub: div ? `Repartição: ${div.name}` : (sec ? `Secção: ${sec.name}` : null),
        badgeColor: '#2563eb',
        icon: '🏬'
      };
    }
    return {
      isAssigned: false,
      type: 'unassigned',
      label: 'Sede Provincial (Pendente de Lotação)',
      sub: 'Sem departamento ou distrito específico',
      badgeColor: '#d97706',
      icon: '⚠️'
    };
  }, [currentEmployee, orgData]);

  if (!isOpen || !mounted) return null;

  const overlayProps = getOverlayProps(onClose);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentEmployee) {
      setErrorMsg('Nenhum funcionário selecionado.');
      return;
    }

    if (targetType === 'department' && !selectedDepartmentId) {
      setErrorMsg('Por favor, selecione o Departamento de destino.');
      return;
    }

    if (targetType === 'district' && !selectedDistrictId) {
      setErrorMsg('Por favor, selecione a Direcção Distrital de destino.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        role: roleInUnit.trim() || currentEmployee.role || currentEmployee.position || '',
        allocationNotes: notes.trim(),
        departmentId: targetType === 'department' ? selectedDepartmentId : null,
        divisionId: targetType === 'department' ? (selectedDivisionId || null) : null,
        sectionId: targetType === 'department'
          ? (selectedSectionId || null)
          : (targetType === 'district' ? (selectedDistrictSectionId || null) : null),
        districtDirectorateId: targetType === 'district' ? selectedDistrictId : null,
        districtId: targetType === 'district' ? selectedDistrictId : null
      };

      await onSave(currentEmployee.id, payload);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar lotação:', err);
      setErrorMsg('Ocorreu um erro ao salvar a lotação orgânica.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassignClick = async () => {
    if (!currentEmployee) return;
    if (!window.confirm(`Tem a certeza que deseja remover a lotação de "${currentEmployee.name}"? O funcionário ficará afeto apenas à Sede Provincial.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (onUnassign) {
        await onUnassign(currentEmployee.id);
      } else {
        await onSave(currentEmployee.id, {
          departmentId: null,
          divisionId: null,
          sectionId: null,
          districtDirectorateId: null,
          districtId: null
        });
      }
      onClose();
    } catch (err) {
      console.error('Erro ao remover lotação:', err);
      setErrorMsg('Ocorreu um erro ao remover a lotação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onMouseDown={overlayProps.onMouseDown}
      onClick={overlayProps.onClick}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: 'var(--color-bg-base, #ffffff)',
          color: 'var(--color-text-main, #1e293b)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--color-border, #e2e8f0)',
          ...modalStyle
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className={isMaximized ? '' : 'drag-handle'}
          onPointerDown={isMaximized ? undefined : onPointerDown}
          onDoubleClick={handleHeaderDoubleClick}
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--color-primary, #1b365d)',
            color: 'var(--color-accent, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: isMaximized ? 'default' : 'move',
            userSelect: 'none'
          }}
          title="Arraste para mover ou dê duplo clique para maximizar"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🏛️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
                Lotação Orgânica de Efectivo
              </h3>
              <p style={{ margin: 0, fontSize: '11px', opacity: 0.85, color: '#e2e8f0' }}>
                {directorateName ? `Direcção Provincial: ${directorateName}` : 'Alocação de Funcionários na Estrutura Orgânica'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={toggleMaximize}
              title={isMaximized ? 'Restaurar tamanho' : 'Maximizar'}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '6px',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}
            >
              {isMaximized ? '🗗' : '🗖'}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Fechar"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '6px',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* SELEÇÃO DO FUNCIONÁRIO (SE HOUVER MAIS DE UM DISPONÍVEL) */}
            {availableEmployees.length > 1 && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--color-text-secondary, #475569)' }}>
                  Funcionário a Alocar / Editar:
                </label>
                <select
                  value={currentEmployee ? currentEmployee.id : ''}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--color-border, #cbd5e1)',
                    backgroundColor: 'var(--color-bg-base, #ffffff)',
                    color: 'var(--color-text-main, #1e293b)',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  {availableEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} (NUIT: {emp.nuit || 'S/N'}) — {emp.role || emp.position || emp.career || 'Sem Cargo'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* CARD DO FUNCIONÁRIO SELECIONADO & LOTAÇÃO ATUAL */}
            {currentEmployee && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(27, 54, 93, 0.04)',
                  border: '1px solid rgba(27, 54, 93, 0.15)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary, #1b365d)' }}>
                    👤 {currentEmployee.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748b)', marginTop: '2px' }}>
                    NUIT: <strong>{currentEmployee.nuit || '-'}</strong> • Género: {currentEmployee.gender === 'M' || currentEmployee.gender === 'Masculino' ? 'Homem' : 'Mulher'} • Estado: {currentEmployee.isActive !== false ? 'Ativo' : 'Inativo'}
                  </div>
                </div>

                {currentPlacementInfo && (
                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: `${currentPlacementInfo.badgeColor}18`,
                      border: `1.5px solid ${currentPlacementInfo.badgeColor}`,
                      textAlign: 'right'
                    }}
                  >
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: currentPlacementInfo.badgeColor, letterSpacing: '0.5px' }}>
                      Lotação Atual
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-main, #1e293b)', marginTop: '2px' }}>
                      {currentPlacementInfo.icon} {currentPlacementInfo.label}
                    </div>
                    {currentPlacementInfo.sub && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748b)' }}>
                        {currentPlacementInfo.sub}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SELETOR DO TIPO DE DESTINO (RADIO CARDS) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--color-text-secondary, #475569)' }}>
                Selecione o Destino Orgânico na Província:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                {/* OPÇÃO 1: DEPARTAMENTO */}
                <div
                  onClick={() => setTargetType('department')}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: targetType === 'department' ? '2px solid var(--color-primary, #1b365d)' : '1px solid var(--color-border, #cbd5e1)',
                    backgroundColor: targetType === 'department' ? 'rgba(27, 54, 93, 0.06)' : 'var(--color-bg-base, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--color-primary, #1b365d)' }}>
                    <span>🏬</span> Departamento
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748b)', marginTop: '4px' }}>
                    Alocar aos departamentos provinciais e suas repartições/secções ({availableDepartments.length} disponíveis).
                  </div>
                  {targetType === 'department' && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary, #1b365d)' }} />
                  )}
                </div>

                {/* OPÇÃO 2: DIRECÇÃO DISTRITAL */}
                <div
                  onClick={() => setTargetType('district')}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: targetType === 'district' ? '2px solid #0d9488' : '1px solid var(--color-border, #cbd5e1)',
                    backgroundColor: targetType === 'district' ? 'rgba(13, 148, 136, 0.08)' : 'var(--color-bg-base, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px', color: '#0d9488' }}>
                    <span>📍</span> Direcção Distrital
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748b)', marginTop: '4px' }}>
                    Alocar a uma direcção distrital subordinada ({availableDistricts.length} disponíveis).
                  </div>
                  {targetType === 'district' && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0d9488' }} />
                  )}
                </div>

                {/* OPÇÃO 3: SEDE PROVINCIAL (GERAL) */}
                <div
                  onClick={() => setTargetType('unassigned')}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: targetType === 'unassigned' ? '2px solid #d97706' : '1px solid var(--color-border, #cbd5e1)',
                    backgroundColor: targetType === 'unassigned' ? 'rgba(217, 119, 6, 0.08)' : 'var(--color-bg-base, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px', color: '#d97706' }}>
                    <span>🏢</span> Sede Provincial
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748b)', marginTop: '4px' }}>
                    Manter na Sede sem alocação em departamento ou distrito específico.
                  </div>
                  {targetType === 'unassigned' && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                  )}
                </div>
              </div>
            </div>

            {/* SE DESTINO FOR DEPARTAMENTO */}
            {targetType === 'department' && (
              <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border, #e2e8f0)', backgroundColor: 'var(--color-card-bg, #f8fafc)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--color-text-secondary, #475569)' }}>
                    Departamento Provincial <span style={{ color: '#dc2626' }}>*</span>:
                  </label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => {
                      setSelectedDepartmentId(e.target.value);
                      setSelectedDivisionId('');
                      setSelectedSectionId('');
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--color-primary, #1b365d)',
                      backgroundColor: 'var(--color-bg-base, #ffffff)',
                      color: 'var(--color-text-main, #1e293b)',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    <option value="">-- Selecione o Departamento ({availableDepartments.length}) --</option>
                    {availableDepartments.map(dep => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* REPARTIÇÃO SUBORDINADA (OPCIONAL) */}
                {selectedDepartmentId && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--color-text-secondary, #475569)' }}>
                      Repartição Subordinada (Opcional):
                    </label>
                    <select
                      value={selectedDivisionId}
                      onChange={(e) => {
                        setSelectedDivisionId(e.target.value);
                        setSelectedSectionId('');
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border, #cbd5e1)',
                        backgroundColor: 'var(--color-bg-base, #ffffff)',
                        color: 'var(--color-text-main, #1e293b)',
                        fontSize: '13px'
                      }}
                    >
                      <option value="">-- Nenhuma Repartição (Direto no Departamento) --</option>
                      {availableDivisions.map(div => (
                        <option key={div.id} value={div.id}>
                          {div.name}
                        </option>
                      ))}
                    </select>
                    {availableDivisions.length === 0 && (
                      <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--color-text-muted, #64748b)' }}>
                        Este departamento não possui repartições registadas.
                      </p>
                    )}
                  </div>
                )}

                {/* SECÇÃO SUBORDINADA (OPCIONAL) */}
                {selectedDepartmentId && availableSections.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--color-text-secondary, #475569)' }}>
                      Secção Subordinada (Opcional):
                    </label>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border, #cbd5e1)',
                        backgroundColor: 'var(--color-bg-base, #ffffff)',
                        color: 'var(--color-text-main, #1e293b)',
                        fontSize: '13px'
                      }}
                    >
                      <option value="">-- Nenhuma Secção Específica --</option>
                      {availableSections.map(sec => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* SE DESTINO FOR DIRECÇÃO DISTRITAL */}
            {targetType === 'district' && (
              <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #0d948844', backgroundColor: 'rgba(13, 148, 136, 0.04)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#0f766e' }}>
                    Direcção Distrital Subordinada <span style={{ color: '#dc2626' }}>*</span>:
                  </label>
                  <select
                    value={selectedDistrictId}
                    onChange={(e) => {
                      setSelectedDistrictId(e.target.value);
                      setSelectedDistrictSectionId('');
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #0d9488',
                      backgroundColor: 'var(--color-bg-base, #ffffff)',
                      color: 'var(--color-text-main, #1e293b)',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    <option value="">-- Selecione a Direcção Distrital ({availableDistricts.length}) --</option>
                    {availableDistricts.map(dist => (
                      <option key={dist.id} value={dist.id}>
                        {dist.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SECÇÃO DISTRITAL (OPCIONAL) */}
                {selectedDistrictId && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#0f766e' }}>
                      Secção Distrital (Opcional):
                    </label>
                    <select
                      value={selectedDistrictSectionId}
                      onChange={(e) => setSelectedDistrictSectionId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border, #cbd5e1)',
                        backgroundColor: 'var(--color-bg-base, #ffffff)',
                        color: 'var(--color-text-main, #1e293b)',
                        fontSize: '13px'
                      }}
                    >
                      <option value="">-- Nenhuma Secção Distrital (Direto no Comando Distrital) --</option>
                      {availableDistrictSections.map(sec => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                    {availableDistrictSections.length === 0 && (
                      <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--color-text-muted, #64748b)' }}>
                        Esta direcção distrital ainda não possui secções cadastradas.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SE DESTINO FOR SEDE PROVINCIAL */}
            {targetType === 'unassigned' && (
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #d9770644', backgroundColor: 'rgba(217, 119, 6, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 'bold', fontSize: '13px' }}>
                  <span>ℹ️</span> Alocação Direta na Sede Provincial
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary, #475569)', lineHeight: 1.4 }}>
                  O funcionário permanecerá afeto aos quadros gerais da Direcção Provincial, mas não será contabilizado num departamento ou distrito em particular até ser alocado.
                </p>
              </div>
            )}

            {/* FUNÇÃO / CARGO NA UNIDADE ORGÂNICA */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--color-text-secondary, #475569)' }}>
                Função / Cargo na Unidade Orgânica (Opcional):
              </label>
              <input
                type="text"
                value={roleInUnit}
                onChange={(e) => setRoleInUnit(e.target.value)}
                placeholder="Ex: Chefe de Departamento, Técnico Investigador, Escrivão, Oficial de Diligências..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  backgroundColor: 'var(--color-bg-base, #ffffff)',
                  color: 'var(--color-text-main, #1e293b)',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* OBSERVAÇÕES / DESPACHO */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--color-text-secondary, #475569)' }}>
                Despacho / Observações de Lotação (Opcional):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ex: Despacho nº 24/GDP/2026 de 15 de Fevereiro..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  backgroundColor: 'var(--color-bg-base, #ffffff)',
                  color: 'var(--color-text-main, #1e293b)',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* MENSAGEM DE ERRO SE HOUVER */}
            {errorMsg && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(220, 38, 38, 0.1)', border: '1px solid #dc2626', color: '#b91c1c', fontSize: '12px', fontWeight: 'bold' }}>
                ⚠️ {errorMsg}
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--color-border, #e2e8f0)',
              backgroundColor: 'var(--color-card-bg, #f8fafc)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div>
              {currentPlacementInfo && currentPlacementInfo.isAssigned && (
                <button
                  type="button"
                  onClick={handleUnassignClick}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #dc2626',
                    backgroundColor: 'transparent',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🗑️ Remover Lotação
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  backgroundColor: 'var(--color-bg-base, #ffffff)',
                  color: 'var(--color-text-main, #1e293b)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--color-primary, #1b365d)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(27, 54, 93, 0.25)'
                }}
              >
                {isSubmitting ? 'A salvar...' : '💾 Salvar Lotação'}
              </button>
            </div>
          </div>
        </form>

        {/* RESIZE HANDLE */}
        <div
          onPointerDown={handleResizePointerDown}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '16px',
            height: '16px',
            cursor: 'nwse-resize',
            zIndex: 10
          }}
          title="Arraste para redimensionar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.35 }}>
            <path d="M14 14L10 14M14 10L14 14M14 6L6 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>,
    document.body
  );
}
