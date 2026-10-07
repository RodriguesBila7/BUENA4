import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import useEvaluationData from '../../hooks/useEvaluationData';
import { getClassification } from '../../utils/evaluationRules';
import { filterByProvincialScope } from '../../utils/scopeUtils';
import ConfirmModal from '../ConfirmModal';

export default function EvaluationForm({ user, onSave, onCancel }) {
  const { employees = [] } = useEmployeeData();
  const { data: orgData } = useOrgData();
  const { addEvaluation } = useEvaluationData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    period: 'Anual',
    evaluatorName: user?.name || user?.username || 'Avaliador',
    evaluatorRole: user?.roleName || user?.roleDetails?.name || user?.role || 'Avaliador',
    evaluationDate: new Date().toISOString().split('T')[0],
    dispatchNumber: '',
    score: '',
    observations: '',
    pdfBase64: ''
  });
  
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

  const [filters, setFilters] = useState({
    directorateId: '',
    departmentId: '',
    divisionId: '',
    sectionId: '',
    careerId: '',
    categoryId: ''
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const updates = { [name]: value };
      if (name === 'directorateId') {
        updates.departmentId = '';
        updates.divisionId = '';
        updates.sectionId = '';
      } else if (name === 'departmentId') {
        updates.divisionId = '';
        updates.sectionId = '';
      } else if (name === 'divisionId') {
        updates.sectionId = '';
      } else if (name === 'careerId') {
        updates.categoryId = '';
      }
      return { ...prev, ...updates };
    });
  };

  const filteredEmployees = useMemo(() => {
    const rawList = Array.isArray(employees) ? employees : [];
    const scopedList = user ? filterByProvincialScope(rawList, user, orgData) : rawList;
    let result = scopedList.filter(e => e && e.isActive !== false);

    if (filters.directorateId) result = result.filter(e => String(e.directorateId) === String(filters.directorateId));
    if (filters.departmentId) result = result.filter(e => String(e.departmentId) === String(filters.departmentId));
    if (filters.divisionId) result = result.filter(e => String(e.divisionId) === String(filters.divisionId));
    if (filters.sectionId) result = result.filter(e => String(e.sectionId) === String(filters.sectionId));
    if (filters.careerId) result = result.filter(e => String(e.careerId) === String(filters.careerId));
    if (filters.categoryId) result = result.filter(e => String(e.categoryId) === String(filters.categoryId));

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(e => 
        (e.name && e.name.toLowerCase().includes(lower)) || 
        (e.nip && e.nip.toLowerCase().includes(lower))
      );
    }
    
    return result.slice(0, 20);
  }, [searchTerm, filters, employees, user, orgData]);

  const selectedEmp = useMemo(() => (employees || []).find(e => e && e.id === selectedEmpId), [employees, selectedEmpId]);
  
  const classification = useMemo(() => getClassification(formData.score), [formData.score]);

  const getName = (list, id) => (list || []).find(item => item && String(item.id) === String(id))?.name || '-';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setAlertModal({ isOpen: true, message: 'O documento anexado deve ser um ficheiro PDF.' });
      return;
    }

    if (file.size > 1024 * 500) { // Limite de 500KB
      setAlertModal({ isOpen: true, message: 'O ficheiro PDF excede o limite de 500KB. Por favor, comprima o documento para evitar sobrecarga do sistema.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, pdfBase64: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !selectedEmp) {
      setAlertModal({ isOpen: true, message: 'Por favor, selecione um funcionário da lista para avaliar.' });
      return;
    }
    
    if (formData.score === '' || isNaN(parseFloat(formData.score)) || parseFloat(formData.score) < 0 || parseFloat(formData.score) > 20) {
      setAlertModal({ isOpen: true, message: 'A pontuação deve ser um número válido compreendido entre 0 e 20.' });
      return;
    }

    try {
      await addEvaluation({
        employeeId: selectedEmpId,
        employeeNip: selectedEmp.nip || 'Sem NUIT',
        employeeName: selectedEmp.name || 'Sem Nome',
        directorateId: selectedEmp.directorateId,
        provincialDirectorateId: selectedEmp.provincialDirectorateId,
        districtDirectorateId: selectedEmp.districtDirectorateId || selectedEmp.districtId,
        province: selectedEmp.province,
        ...formData,
        classificationLabel: classification.label
      });
      if (onSave) onSave();
    } catch (err) {
      setAlertModal({ isOpen: true, message: err.message });
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.formContainer}>
        
        {/* Seção 1: Seleção do Funcionário */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>👤</span>
              <h4 style={styles.sectionTitle}>1. Identificação do Funcionário</h4>
            </div>
            {selectedEmp && (
              <span style={styles.selectedBadge}>
                ✓ Funcionário Selecionado: <strong>{selectedEmp.name}</strong> ({selectedEmp.nip})
              </span>
            )}
          </div>

          <div style={styles.filterGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Direcção / Unidade Orgânica</label>
              <select name="directorateId" value={filters.directorateId} onChange={handleFilterChange} style={styles.select}>
                <option value="">Todas as Direcções</option>
                {(orgData?.directorates || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Departamento / Distrito</label>
              <select name="departmentId" value={filters.departmentId} onChange={handleFilterChange} style={styles.select} disabled={!filters.directorateId}>
                <option value="">{filters.directorateId ? 'Todos os Departamentos' : 'Selecione a Direcção primeiro'}</option>
                {(orgData?.departments || []).filter(d => d.directorateId === filters.directorateId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Repartição / Repartição Central</label>
              <select name="divisionId" value={filters.divisionId} onChange={handleFilterChange} style={styles.select} disabled={!filters.departmentId}>
                <option value="">{filters.departmentId ? 'Todas as Repartições' : 'Selecione o Departamento primeiro'}</option>
                {(orgData?.divisions || []).filter(d => d.departmentId === filters.departmentId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Secção</label>
              <select name="sectionId" value={filters.sectionId} onChange={handleFilterChange} style={styles.select} disabled={!filters.departmentId && !filters.divisionId}>
                <option value="">{filters.departmentId || filters.divisionId ? 'Todas as Secções' : 'Selecione o Depto ou Repartição'}</option>
                {(orgData?.sections || []).filter(s => filters.divisionId ? s.divisionId === filters.divisionId : s.departmentId === filters.departmentId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Carreira Profissional</label>
              <select name="careerId" value={filters.careerId} onChange={handleFilterChange} style={styles.select}>
                <option value="">Todas as Carreiras</option>
                {(orgData?.careers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Categoria</label>
              <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} style={styles.select} disabled={!filters.careerId}>
                <option value="">{filters.careerId ? 'Todas as Categorias' : 'Selecione a Carreira primeiro'}</option>
                {(orgData?.categories || []).filter(c => c.careerId === filters.careerId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={styles.label}>Pesquisa por NUIT ou Nome</label>
            <input 
              type="text" 
              placeholder="Digite o NUIT ou Nome do funcionário..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.resultsBar}>
            <span style={styles.resultsBadge}>
              👥 {filteredEmployees.length} funcionário(s) na listagem (clique para selecionar)
            </span>
          </div>

          <div style={styles.empList}>
            {filteredEmployees.map(emp => {
              const isSelected = selectedEmpId === emp.id;
              return (
                <div 
                  key={emp.id} 
                  style={{
                    ...styles.empItem,
                    ...(isSelected ? styles.empItemSelected : {})
                  }}
                  onClick={() => setSelectedEmpId(emp.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? 'rgba(234, 88, 12, 0.15)' : 'rgba(27, 54, 93, 0.08)',
                      color: isSelected ? '#EA580C' : 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '800',
                      flexShrink: 0,
                      border: isSelected ? '1px solid rgba(234, 88, 12, 0.4)' : '1px solid var(--color-border)'
                    }}>
                      {(emp.name || 'F').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ 
                      fontWeight: '700', 
                      minWidth: '65px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: isSelected ? '#EA580C' : 'var(--color-primary)' 
                    }}>
                      {emp.nip || emp.nuit}
                    </span>
                    <span style={{ 
                      fontWeight: isSelected ? '700' : '600', 
                      fontSize: '13.5px',
                      color: isSelected ? 'var(--color-text-base)' : 'var(--color-text-base)'
                    }}>
                      {emp.name}
                    </span>
                  </div>
                  {isSelected && (
                    <span style={styles.selectedBadge}>
                      ✓ SELECIONADO
                    </span>
                  )}
                </div>
              );
            })}
            {filteredEmployees.length === 0 && (
              <div style={{ padding: '24px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>
                🔍 Nenhum funcionário encontrado nos critérios ou pesquisa selecionada.
              </div>
            )}
          </div>

          {selectedEmp && (() => {
            const timeOfService = (() => {
              if (!selectedEmp.admissionDate) return null;
              const start = new Date(selectedEmp.admissionDate);
              if (isNaN(start.getTime())) return null;
              const end = new Date();
              const diffTime = Math.abs(end - start);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const years = Math.floor(diffDays / 365);
              const months = Math.floor((diffDays % 365) / 30);
              if (years > 0) {
                return months > 0 ? `${years} ano(s) e ${months} mês(es)` : `${years} ano(s)`;
              }
              return `${months} mês(es)`;
            })();

            const careerName = getName(orgData?.careers || [], selectedEmp.careerId);
            const categoryName = getName(orgData?.categories || [], selectedEmp.categoryId);
            const directorateName = getName(orgData?.directorates || [], selectedEmp.directorateId);
            const departmentName = selectedEmp.departmentId ? getName(orgData?.departments || [], selectedEmp.departmentId) : null;
            const districtDirName = (selectedEmp.districtDirectorateId || selectedEmp.districtId)
              ? getName(orgData?.districtDirectorates || [], selectedEmp.districtDirectorateId || selectedEmp.districtId)
              : null;
            const rankName = selectedEmp.rank || selectedEmp.patente || null;
            const roleName = selectedEmp.role || selectedEmp.position || null;

            return (
              <div style={styles.profileCard}>
                {/* CABEÇALHO DO PERFIL */}
                <div style={styles.profileHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>👤</span>
                    <span style={styles.profileHeaderTitle}>Funcionário Selecionado para Avaliação</span>
                    <span style={styles.statusBadge}>
                      <span style={styles.statusDot}></span>
                      {selectedEmp.isActive !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEmpId('')}
                    style={styles.btnClearSelection}
                    title="Remover seleção e escolher outro funcionário"
                  >
                    ✕ Alterar Funcionário
                  </button>
                </div>

                {/* IDENTIDADE PRINCIPAL: AVATAR & DADOS */}
                <div style={styles.profileMain}>
                  <div style={styles.avatarWrapper}>
                    {selectedEmp.photo ? (
                      <img src={selectedEmp.photo} alt={selectedEmp.name} style={styles.avatarImg} />
                    ) : (
                      <div style={styles.avatarFallback}>
                        {(selectedEmp.name || 'F').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div style={styles.profileIdentity}>
                    <h3 style={styles.profileName}>{selectedEmp.name}</h3>
                    <div style={styles.profileTagRow}>
                      <span style={styles.nuitBadge}>
                        NUIT: <strong>{selectedEmp.nip || selectedEmp.nuit || '-'}</strong>
                      </span>
                      {rankName && rankName !== '-' && (
                        <span style={styles.rankBadge}>
                          ⭐ {rankName}
                        </span>
                      )}
                      {roleName && roleName !== '-' && roleName.toLowerCase() !== 'nenhum' && (
                        <span style={styles.roleBadge}>
                          🏷️ {roleName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* GRADE DE METADADOS ESTRUTURADOS */}
                <div style={styles.metaGrid}>
                  <div style={styles.metaCard}>
                    <div style={styles.metaIcon}>💼</div>
                    <div style={styles.metaContent}>
                      <span style={styles.metaLabel}>Carreira Profissional</span>
                      <strong style={styles.metaValue}>{careerName !== '-' ? careerName : 'Não atribuída'}</strong>
                    </div>
                  </div>

                  <div style={styles.metaCard}>
                    <div style={styles.metaIcon}>🎖️</div>
                    <div style={styles.metaContent}>
                      <span style={styles.metaLabel}>Categoria Funcional</span>
                      <strong style={styles.metaValue}>{categoryName !== '-' ? categoryName : 'Não atribuída'}</strong>
                    </div>
                  </div>

                  <div style={styles.metaCard}>
                    <div style={styles.metaIcon}>🏢</div>
                    <div style={styles.metaContent}>
                      <span style={styles.metaLabel}>Unidade Orgânica / Lotação</span>
                      <strong style={styles.metaValue}>{directorateName !== '-' ? directorateName : 'Sede Central'}</strong>
                      {(departmentName || districtDirName) && (
                        <span style={styles.metaSub}>
                          ↳ {departmentName ? `Depto: ${departmentName}` : `Distrito: ${districtDirName}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={styles.metaCard}>
                    <div style={styles.metaIcon}>⏳</div>
                    <div style={styles.metaContent}>
                      <span style={styles.metaLabel}>Tempo de Serviço</span>
                      <strong style={styles.metaValue}>{timeOfService || 'Sem data de admissão'}</strong>
                      {selectedEmp.admissionDate && (
                        <span style={styles.metaSub}>Admissão: {selectedEmp.admissionDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Seção 2: Dados da Avaliação */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📋</span>
              <h4 style={styles.sectionTitle}>2. Dados da Avaliação</h4>
            </div>
          </div>

          <div style={styles.filterGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Ano da Avaliação *</label>
              <input type="number" name="year" value={formData.year} onChange={handleChange} style={styles.input} required min="2000" max="2100" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Período *</label>
              <input type="text" name="period" value={formData.period} onChange={handleChange} style={styles.input} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Avaliador *</label>
              <input type="text" name="evaluatorName" value={formData.evaluatorName} onChange={handleChange} style={styles.input} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Cargo do Avaliador *</label>
              <input type="text" name="evaluatorRole" value={formData.evaluatorRole} onChange={handleChange} style={styles.input} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data da Avaliação *</label>
              <input type="date" name="evaluationDate" value={formData.evaluationDate} onChange={handleChange} style={styles.input} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nº do Despacho</label>
              <input type="text" name="dispatchNumber" value={formData.dispatchNumber} onChange={handleChange} style={styles.input} placeholder="Ex: DP-042/2026" />
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={styles.label}>Observações</label>
            <textarea 
              name="observations" 
              value={formData.observations} 
              onChange={handleChange} 
              placeholder="Notas adicionais sobre a avaliação..."
              style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Seção 3: Pontuação e Ficheiro */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚖️</span>
              <h4 style={styles.sectionTitle}>3. Classificação e Anexos</h4>
            </div>
          </div>

          <div style={styles.filterGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Pontuação (0 a 20) *</label>
              <input 
                type="number" 
                name="score" 
                value={formData.score} 
                onChange={handleChange} 
                style={styles.input} 
                required 
                min="0" 
                max="20" 
                step="0.1" 
                placeholder="Ex: 15.5"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Classificação Calculada</label>
              <div style={{
                padding: '9px 14px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: classification.hexLight,
                color: classification.hexDark,
                border: `1px solid ${classification.hexBadge}`,
                minHeight: '38px'
              }}>
                {classification.label}
              </div>
            </div>

            <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
              <label style={styles.label}>Declaração da Avaliação (PDF max 500KB)</label>
              <input type="file" accept=".pdf" onChange={handleFileChange} style={styles.fileInput} />
              {formData.pdfBase64 && <span style={styles.fileSuccess}>✓ Ficheiro PDF anexado com sucesso</span>}
            </div>
          </div>
        </div>

        {/* Ações / Rodapé */}
        <div style={styles.footer}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={styles.btnCancel}>
              Cancelar
            </button>
          )}
          <button type="submit" style={styles.btnSave}>
            💾 Gravar Avaliação
          </button>
        </div>
      </form>

      <ConfirmModal 
        isOpen={alertModal.isOpen} 
        title="Aviso"
        message={alertModal.message}
        onConfirm={() => setAlertModal({ isOpen: false, message: '' })}
        hideCancel={true}
        confirmText="OK"
      />
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '20px',
    padding: 0
  },
  formContainer: {
    width: '75%',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  section: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    padding: '18px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--color-border)',
    flexWrap: 'wrap',
    gap: '10px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-primary)'
  },
  selectedBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: '#EA580C',
    padding: '3px 10px',
    borderRadius: '12px',
    boxShadow: '0 2px 6px rgba(234, 88, 12, 0.35)',
    letterSpacing: '0.4px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap'
  },
  input: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    outline: 'none',
    fontSize: '13px',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box'
  },
  select: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    outline: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box'
  },
  resultsBar: {
    marginTop: '12px',
    display: 'flex',
    justifyContent: 'flex-start'
  },
  resultsBadge: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-base)',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)'
  },
  empList: {
    maxHeight: '160px',
    overflowY: 'auto',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-bg-base)',
    marginTop: '8px'
  },
  empItem: {
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '13px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.15s ease'
  },
  empItemSelected: {
    backgroundColor: 'rgba(234, 88, 12, 0.08)',
    boxShadow: 'inset 5px 0 0 #EA580C',
    borderBottomColor: 'rgba(234, 88, 12, 0.25)'
  },
  /* NOVO CARD EXECUTIVO DE PERFIL DO FUNCIONÁRIO */
  profileCard: {
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    borderLeft: '5px solid #EA580C',
    padding: '20px',
    marginTop: '16px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  profileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--color-border)',
    flexWrap: 'wrap',
    gap: '10px'
  },
  profileHeaderTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    borderRadius: '12px',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: '#10b981',
    fontSize: '11px',
    fontWeight: '700',
    border: '1px solid rgba(16, 185, 129, 0.25)'
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981'
  },
  btnClearSelection: {
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  profileMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    flexWrap: 'wrap'
  },
  avatarWrapper: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    padding: '2px',
    background: 'linear-gradient(135deg, #EA580C, #F59E0B)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 14px rgba(234, 88, 12, 0.22)'
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: 'var(--color-bg-card)',
    color: '#EA580C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    fontWeight: '800'
  },
  profileIdentity: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1
  },
  profileName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--color-text-base)',
    letterSpacing: '-0.2px'
  },
  profileTagRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  nuitBadge: {
    fontSize: '12px',
    color: 'var(--color-text-base)',
    backgroundColor: 'var(--color-bg-card)',
    padding: '3px 9px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    fontFamily: 'monospace'
  },
  rankBadge: {
    fontSize: '12px',
    color: 'var(--color-primary)',
    backgroundColor: 'rgba(27, 54, 93, 0.08)',
    padding: '3px 9px',
    borderRadius: '6px',
    border: '1px solid rgba(27, 54, 93, 0.16)',
    fontWeight: '600'
  },
  roleBadge: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-card)',
    padding: '3px 9px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    fontWeight: '500'
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px'
  },
  metaCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  metaIcon: {
    fontSize: '18px',
    lineHeight: 1,
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(27, 54, 93, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  metaContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    flex: 1
  },
  metaLabel: {
    fontSize: '10.5px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  metaValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-base)',
    wordBreak: 'break-word'
  },
  metaSub: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    marginTop: '2px'
  },
  fileInput: {
    padding: '8px 12px',
    border: '1px dashed var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-bg-base)',
    fontSize: '12px',
    cursor: 'pointer'
  },
  fileSuccess: {
    color: 'var(--color-success)',
    fontSize: '12px',
    marginTop: '4px',
    fontWeight: '600'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '6px'
  },
  btnCancel: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s'
  },
  btnSave: {
    padding: '10px 24px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-accent)',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    transition: 'opacity 0.2s'
  }
};

