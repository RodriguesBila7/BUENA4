import React from 'react';

export default function AdvancedFilters({ filters, setFilters, orgData }) {
  const { data } = orgData;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const updates = { [name]: value };
      // Resets on hierarchy change
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

  const handleReset = () => {
    setFilters({
      searchTerm: '',
      directorateId: '', departmentId: '', divisionId: '', sectionId: '',
      careerId: '', categoryId: '', role: '', class: '', step: '',
      academicLevel: '', employmentStatus: '',
      gender: '', ageRange: '', isActive: ''
    });
  };

  const activeDepartments = data.departments.filter(d => d.directorateId === filters.directorateId);
  const activeDivisions = data.divisions.filter(d => d.departmentId === filters.departmentId);
  const activeSections = data.sections.filter(s => {
    if (filters.divisionId) return s.divisionId === filters.divisionId;
    if (filters.departmentId) return s.departmentId === filters.departmentId;
    return false;
  });
  const activeCategories = data.categories.filter(c => c.careerId === filters.careerId);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>Filtros Avançados</h4>
        <button onClick={handleReset} style={styles.resetBtn}>Limpar Filtros</button>
      </div>

      <div style={styles.grid}>
        {/* Pessoais / Demográficos */}
        <div style={styles.group}>
          <label style={styles.label}>Género</label>
          <select name="gender" value={filters.gender || ''} onChange={handleChange} style={styles.input}>
            <option value="">Todos</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Faixa Etária</label>
          <select name="ageRange" value={filters.ageRange || ''} onChange={handleChange} style={styles.input}>
            <option value="">Todas</option>
            <option value="18-25">18 a 25 anos</option>
            <option value="26-35">26 a 35 anos</option>
            <option value="36-45">36 a 45 anos</option>
            <option value="46-55">46 a 55 anos</option>
            <option value="56+">Acima de 55 anos</option>
          </select>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Estado do Funcionário</label>
          <select name="isActive" value={filters.isActive || ''} onChange={handleChange} style={styles.input}>
            <option value="">Todos</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>

        {/* Profissionais */}
        <div style={styles.group}>
          <label style={styles.label}>Carreira</label>
          <select name="careerId" value={filters.careerId || ''} onChange={handleChange} style={styles.input}>
            <option value="">Todas</option>
            {(data.careers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Categoria</label>
          <select name="categoryId" value={filters.categoryId || ''} onChange={handleChange} style={styles.input} disabled={!filters.careerId}>
            <option value="">Todas</option>
            {activeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Nível Académico</label>
          <select name="academicLevel" value={filters.academicLevel || ''} onChange={handleChange} style={styles.input}>
            <option value="">Todos</option>
            <option value="Básico">Básico</option>
            <option value="Médio">Médio</option>
            <option value="Superior (Licenciatura)">Superior (Licenciatura)</option>
            <option value="Mestrado">Mestrado</option>
            <option value="Doutoramento">Doutoramento</option>
          </select>
        </div>

        {/* Organizacionais */}
        <div style={styles.group}>
          <label style={styles.label}>Direcção</label>
          <select name="directorateId" value={filters.directorateId || ''} onChange={handleChange} style={styles.input}>
            <option value="">Todas</option>
            {data.directorates.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Departamento / Distrital</label>
          <select name="departmentId" value={filters.departmentId || ''} onChange={handleChange} style={styles.input} disabled={!filters.directorateId}>
            <option value="">Todos</option>
            {activeDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Repartição</label>
          <select name="divisionId" value={filters.divisionId || ''} onChange={handleChange} style={styles.input} disabled={!filters.departmentId}>
            <option value="">Todas</option>
            {activeDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Secção</label>
          <select name="sectionId" value={filters.sectionId || ''} onChange={handleChange} style={styles.input} disabled={(!filters.divisionId && !filters.departmentId)}>
            <option value="">Todas</option>
            {activeSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: 'var(--color-bg-base)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' },
  title: { fontSize: '15px', fontWeight: '600', color: 'var(--color-text-base)', margin: 0 },
  resetBtn: { fontSize: '13px', color: '#e53e3e', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' },
  group: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-base)', fontSize: '13px' }
};
