import React, { useState, useMemo } from 'react';
import ConfirmModal from '../ConfirmModal';
import CrudActionButtons from '../common/CrudActionButtons';

export default function EmployeeList({ employees, orgData, onEdit, onDelete }) {
  const { data } = orgData;

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    directorateId: '',
    departmentId: '',
    divisionId: '',
    sectionId: '',
    careerId: '',
    categoryId: ''
  });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, empId: null });

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
    return employees.filter(emp => {
      // Text Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!emp.name?.toLowerCase().includes(term) && !emp.nip?.toLowerCase().includes(term)) {
          return false;
        }
      }
      
      // Dropdown Filters
      if (filters.directorateId && emp.directorateId !== filters.directorateId) return false;
      if (filters.departmentId && emp.departmentId !== filters.departmentId) return false;
      if (filters.divisionId && emp.divisionId !== filters.divisionId) return false;
      if (filters.sectionId && emp.sectionId !== filters.sectionId) return false;
      if (filters.careerId && emp.careerId !== filters.careerId) return false;
      if (filters.categoryId && emp.categoryId !== filters.categoryId) return false;
      
      return true;
    });
  }, [employees, searchTerm, filters]);

  // Helpers to resolve names
  const getName = (list, id) => list.find(item => item.id === id)?.name || '-';

  return (
    <div>
      {/* TOOLBAR & FILTERS */}
      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <input 
            type="text" 
            placeholder="Pesquisar por Nome ou NUIT..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filtersGrid}>
          <select name="directorateId" value={filters.directorateId} onChange={handleFilterChange} style={styles.filterSelect}>
            <option value="">Todas as Direcções</option>
            {data.directorates.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          
          <select name="departmentId" value={filters.departmentId} onChange={handleFilterChange} style={styles.filterSelect} disabled={!filters.directorateId}>
            <option value="">Todos os Departamentos / Distritos</option>
            {data.departments.filter(d => d.directorateId === filters.directorateId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select name="divisionId" value={filters.divisionId} onChange={handleFilterChange} style={{ ...styles.filterSelect, minWidth: '240px' }} disabled={!filters.departmentId && !filters.directorateId}>
            <option value="">Todas as Repartições / Repartições Centrais</option>
            {data.divisions.filter(d => {
              if (filters.departmentId) return d.departmentId === filters.departmentId;
              if (filters.directorateId) return d.directorateId === filters.directorateId || (d.departmentId && data.departments.some(dep => dep.id === d.departmentId && dep.directorateId === filters.directorateId));
              return true;
            }).map(d => <option key={d.id} value={d.id}>{d.name}{!d.departmentId ? ' (Repartição Central)' : ''}</option>)}
          </select>

          <select name="sectionId" value={filters.sectionId} onChange={handleFilterChange} style={styles.filterSelect} disabled={!filters.departmentId && !filters.divisionId && !filters.directorateId}>
            <option value="">Todas as Secções</option>
            {data.sections.filter(s => {
              if (filters.divisionId) return s.divisionId === filters.divisionId;
              if (filters.departmentId) return s.departmentId === filters.departmentId;
              if (filters.directorateId) {
                const secDiv = s.divisionId ? data.divisions.find(d => d.id === s.divisionId) : null;
                if (secDiv && (secDiv.directorateId === filters.directorateId || (secDiv.departmentId && data.departments.some(dep => dep.id === secDiv.departmentId && dep.directorateId === filters.directorateId)))) return true;
                if (s.departmentId && data.departments.some(dep => dep.id === s.departmentId && dep.directorateId === filters.directorateId)) return true;
                return false;
              }
              return true;
            }).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select name="careerId" value={filters.careerId} onChange={handleFilterChange} style={styles.filterSelect}>
            <option value="">Todas as Carreiras</option>
            {(data.careers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} style={styles.filterSelect} disabled={!filters.careerId}>
            <option value="">Todas as Categorias</option>
            {data.categories.filter(c => c.careerId === filters.careerId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div style={styles.statsBar}>
        Total Encontrado: <strong>{filteredEmployees.length}</strong> funcionário(s)
      </div>

      {/* TABLE */}
      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>NUIT</th>
              <th>Nome</th>
              <th>Patente</th>
              <th>Direcção</th>
              <th>Departamento / Distrito</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="7" style={styles.empty}>Nenhum funcionário encontrado.</td>
              </tr>
            ) : (
              filteredEmployees.map(emp => (
                <tr key={emp.id} style={styles.tr}>
                  <td><strong>{emp.nip}</strong></td>
                  <td>{emp.name}</td>
                  <td>{emp.rank || '-'}</td>
                  <td>{getName(data.directorates, emp.directorateId)}</td>
                  <td>{getName(data.departments, emp.departmentId)}</td>
                  <td>
                    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                      <span style={emp.isActive ? styles.badgeActive : styles.badgeInactive}>
                        {emp.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                      {emp.healthStatus === 'Baixa Médica' && (
                        <span style={styles.badgeSaude} title="Em Baixa / Junta Médica">🌡️ Doente</span>
                      )}
                    </div>
                  </td>
                  <td style={styles.tdActions}>
                    <CrudActionButtons 
                      onEdit={() => onEdit(emp.id)}
                      onDelete={() => setConfirmModal({ isOpen: true, empId: emp.id })}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Confirmar Eliminação"
        message="Apagar funcionário definitivamente?"
        isDestructive={true}
        onConfirm={() => {
          onDelete(confirmModal.empId);
          setConfirmModal({ isOpen: false, empId: null });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, empId: null })}
      />
    </div>
  );
}

const styles = {
  toolbar: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' },
  searchBox: { width: '100%', maxWidth: '400px' },
  searchInput: { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px', outline: 'none' },
  filtersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' },
  filterSelect: { padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px', outline: 'none' },
  statsBar: { fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' },
  tableContainer: { overflowX: 'auto', backgroundColor: 'var(--color-bg-card)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '14px 16px', backgroundColor: 'var(--color-bg-base)', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: '600' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '14px 16px', color: 'var(--color-text-base)' },
  tdActions: { padding: '14px 16px', display: 'flex', gap: '12px' },
  btnIcon: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-muted)', padding: '4px', transition: 'color 0.2s' },
  badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  badgeInactive: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  badgeSaude: { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }
};
