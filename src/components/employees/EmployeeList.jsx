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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TOOLBAR & FILTERS */}
      <div className="ui-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ width: '100%', maxWidth: '380px' }}>
              <input 
                type="text" 
                placeholder="Pesquisar por nome ou NUIT / NIP..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ui-input"
              />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' }}>
              Total: <strong style={{ color: 'var(--color-text-main)' }}>{filteredEmployees.length}</strong> funcionário(s)
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <select name="directorateId" value={filters.directorateId} onChange={handleFilterChange} className="ui-select">
              <option value="">Todas as Direcções</option>
              {data.directorates.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            
            <select name="departmentId" value={filters.departmentId} onChange={handleFilterChange} className="ui-select" disabled={!filters.directorateId}>
              <option value="">Todos os Departamentos / Distritos</option>
              {data.departments.filter(d => d.directorateId === filters.directorateId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            <select name="divisionId" value={filters.divisionId} onChange={handleFilterChange} className="ui-select" disabled={!filters.departmentId && !filters.directorateId}>
              <option value="">Todas as Repartições</option>
              {data.divisions.filter(d => {
                if (filters.departmentId) return d.departmentId === filters.departmentId;
                if (filters.directorateId) return d.directorateId === filters.directorateId || (d.departmentId && data.departments.some(dep => dep.id === d.departmentId && dep.directorateId === filters.directorateId));
                return true;
              }).map(d => <option key={d.id} value={d.id}>{d.name}{!d.departmentId ? ' (Central)' : ''}</option>)}
            </select>

            <select name="sectionId" value={filters.sectionId} onChange={handleFilterChange} className="ui-select" disabled={!filters.departmentId && !filters.divisionId && !filters.directorateId}>
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

            <select name="careerId" value={filters.careerId} onChange={handleFilterChange} className="ui-select">
              <option value="">Todas as Carreiras</option>
              {(data.careers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="ui-select" disabled={!filters.careerId}>
              <option value="">Todas as Categorias</option>
              {data.categories.filter(c => c.careerId === filters.careerId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="ui-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ui-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>NUIT / NIP</th>
                <th>Nome</th>
                <th>Patente / Carreira</th>
                <th>Direcção</th>
                <th>Departamento / Distrito</th>
                <th style={{ width: '120px' }}>Estado</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>
                    Nenhum funcionário encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <span style={{ fontWeight: '600', color: 'var(--color-text-main)', fontSize: '13px' }}>
                        {emp.nip || '-'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500', color: 'var(--color-text-main)' }}>{emp.name}</div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                        {emp.rank || '-'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px' }}>{getName(data.directorates, emp.directorateId)}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{getName(data.departments, emp.departmentId)}</span>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <span className={`ui-badge ${emp.isActive ? 'ui-badge-success' : 'ui-badge-neutral'}`}>
                          {emp.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                        {emp.healthStatus === 'Baixa Médica' && (
                          <span className="ui-badge ui-badge-warning" title="Em Baixa / Junta Médica">
                            Junta
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
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
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Confirmar Eliminação"
        message="Deseja eliminar este funcionário definitivamente do sistema?"
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
