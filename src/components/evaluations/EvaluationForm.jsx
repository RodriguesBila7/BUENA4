import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import useEvaluationData from '../../hooks/useEvaluationData';
import { getClassification } from '../../utils/evaluationRules';
import { filterByProvincialScope } from '../../utils/scopeUtils';
import ConfirmModal from '../ConfirmModal';

export default function EvaluationForm({ user, onSave }) {
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
    
    return result.slice(0, 15);
  }, [searchTerm, filters, employees, user, orgData]);

  const selectedEmp = useMemo(() => (employees || []).find(e => e && e.id === selectedEmpId), [employees, selectedEmpId]);
  
  const classification = useMemo(() => getClassification(formData.score), [formData.score]);

  const getName = (list, id) => (list || []).find(item => item && item.id === id)?.name || '-';

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
      setAlertModal({ isOpen: true, message: 'Por favor, selecione um funcionário da lista.' });
      return;
    }
    
    if (formData.score === '' || isNaN(parseFloat(formData.score)) || parseFloat(formData.score) < 0 || parseFloat(formData.score) > 20) {
      setAlertModal({ isOpen: true, message: 'A pontuação deve ser um número válido entre 0 e 20.' });
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
          <h3 style={styles.sectionTitle}>1. Identificação do Funcionário</h3>
          <div style={styles.searchBox}>
            <div style={styles.filtersGrid}>
              <select name="directorateId" value={filters.directorateId} onChange={handleFilterChange} style={styles.filterSelect}>
                <option value="">Todas as Direcções</option>
                {(orgData?.directorates || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              
              <select name="departmentId" value={filters.departmentId} onChange={handleFilterChange} style={styles.filterSelect} disabled={!filters.directorateId}>
                <option value="">Todos os Departamentos / Distritos</option>
                {(orgData?.departments || []).filter(d => d.directorateId === filters.directorateId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>

              <select name="divisionId" value={filters.divisionId} onChange={handleFilterChange} style={styles.filterSelect} disabled={!filters.departmentId}>
                <option value="">Todas as Repartições</option>
                {(orgData?.divisions || []).filter(d => d.departmentId === filters.departmentId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>

              <select name="sectionId" value={filters.sectionId} onChange={handleFilterChange} style={styles.filterSelect} disabled={!filters.departmentId && !filters.divisionId}>
                <option value="">Todas as Secções</option>
                {(orgData?.sections || []).filter(s => filters.divisionId ? s.divisionId === filters.divisionId : s.departmentId === filters.departmentId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <select name="careerId" value={filters.careerId} onChange={handleFilterChange} style={styles.filterSelect}>
                <option value="">Todas as Carreiras</option>
                {(orgData?.careers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} style={styles.filterSelect} disabled={!filters.careerId}>
                <option value="">Todas as Categorias</option>
                {(orgData?.categories || []).filter(c => c.careerId === filters.careerId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <input 
              type="text" 
              placeholder="Pesquisar por NUIT ou Nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{...styles.input, marginTop: '10px'}}
            />
            <div style={styles.empList}>
              {filteredEmployees.map(emp => (
                <div 
                  key={emp.id} 
                  style={{...styles.empItem, ...(selectedEmpId === emp.id ? styles.empItemSelected : {})}}
                  onClick={() => setSelectedEmpId(emp.id)}
                >
                  <strong>{emp.nip}</strong> - {emp.name}
                </div>
              ))}
              {filteredEmployees.length === 0 && (
                <div style={{ padding: '15px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>
                  Nenhum funcionário encontrado no seu âmbito territorial ou critérios selecionados.
                </div>
              )}
            </div>
          </div>

          {selectedEmp && (() => {
            const timeOfService = (() => {
              if (!selectedEmp.admissionDate) return '-';
              const start = new Date(selectedEmp.admissionDate);
              const end = new Date();
              const diffTime = Math.abs(end - start);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const years = Math.floor(diffDays / 365);
              const months = Math.floor((diffDays % 365) / 30);
              return years > 0 ? `${years} ano(s) e ${months} mês(es)` : `${months} mês(es)`;
            })();

            return (
              <div style={styles.previewBox}>
                <div style={styles.avatar}>
                  {selectedEmp.photo ? (
                    <img src={selectedEmp.photo} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%'}} />
                  ) : (
                    (selectedEmp.name || 'F').charAt(0)
                  )}
                </div>
                <div style={styles.previewGrid}>
                  <div style={styles.previewItem}>
                    <strong>Nome Completo:</strong> {selectedEmp.name}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Nº Mecanográfico (NUIT):</strong> {selectedEmp.nip}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Carreira:</strong> {getName(orgData?.careers || [], selectedEmp.careerId)}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Categoria:</strong> {getName(orgData?.categories || [], selectedEmp.categoryId)}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Cargo:</strong> {selectedEmp.role || 'Nenhum'}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Unidade Orgânica:</strong> {getName(orgData?.directorates || [], selectedEmp.directorateId)}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Tempo de Serviço:</strong> {timeOfService}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Seção 2: Dados da Avaliação */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>2. Dados da Avaliação</h3>
          <div style={styles.grid}>
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
              <input type="text" name="dispatchNumber" value={formData.dispatchNumber} onChange={handleChange} style={styles.input} />
            </div>
            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.label}>Observações</label>
              <textarea name="observations" value={formData.observations} onChange={handleChange} style={{...styles.input, minHeight:'60px'}}></textarea>
            </div>
          </div>
        </div>

        {/* Seção 3: Pontuação e Ficheiro */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>3. Classificação e Anexos</h3>
          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Pontuação (0 a 20) *</label>
              <input type="number" name="score" value={formData.score} onChange={handleChange} style={styles.input} required min="0" max="20" step="0.1" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Classificação Calculada</label>
              <div style={{
                padding: '10px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '14px',
                backgroundColor: classification.hexLight, color: classification.hexDark, border: `1px solid ${classification.hexBadge}`
              }}>
                {classification.label}
              </div>
            </div>
            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.label}>Declaração da Avaliação (PDF max 500KB)</label>
              <input type="file" accept=".pdf" onChange={handleFileChange} style={styles.fileInput} />
              {formData.pdfBase64 && <span style={styles.fileSuccess}>✓ Ficheiro anexado com sucesso</span>}
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button type="submit" style={styles.btnSave}>Gravar Avaliação</button>
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
  container: { padding: '20px' },
  formContainer: { maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' },
  section: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' },
  sectionTitle: { margin: '0 0 20px 0', fontSize: '16px', color: 'var(--color-primary)', borderBottom: '2px solid var(--color-border)', paddingBottom: '10px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' },
  fileInput: { padding: '8px', border: '1px dashed var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-bg-base)' },
  fileSuccess: { color: 'var(--color-success)', fontSize: '12px', marginTop: '4px', fontWeight: '600' },
  searchBox: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  filtersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' },
  filterSelect: { padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px', outline: 'none' },
  empList: { maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-bg-base)' },
  empItem: { padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: '13px', transition: 'background-color 0.2s' },
  empItemSelected: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' },
  previewBox: { display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', flexWrap: 'wrap' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '700', color: 'var(--color-text-muted)', flexShrink: 0 },
  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', flex: 1 },
  previewItem: { fontSize: '13px', color: 'var(--color-text-base)' },
  footer: { display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' },
  btnSave: { padding: '12px 24px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.2s' }
};
