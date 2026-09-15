import React, { useState, useMemo } from 'react';
import { exportToExcel } from '../../utils/excelExport';
import AdminActWizard from '../employees/acts/AdminActWizard';

export default function ProgressionTab({ elegibles = [], orgData, onProgress, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirectorate, setFilterDirectorate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterCareer, setFilterCareer] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDelay, setFilterDelay] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleProgressClick = (e) => {
    setSelectedEmp(e.emp);
  };

  const availableDepartments = useMemo(() => {
    if (!filterDirectorate) return [];
    return (orgData?.departments || []).filter(d => String(d.directorateId) === String(filterDirectorate));
  }, [orgData?.departments, filterDirectorate]);

  const availableDivisions = useMemo(() => {
    if (!filterDirectorate) return [];
    if (filterDepartment) {
      return (orgData?.divisions || []).filter(div => String(div.departmentId) === String(filterDepartment));
    }
    const depIds = new Set(availableDepartments.map(d => String(d.id)));
    return (orgData?.divisions || []).filter(div => 
      String(div.directorateId) === String(filterDirectorate) || (div.departmentId && depIds.has(String(div.departmentId)))
    );
  }, [orgData?.divisions, filterDirectorate, filterDepartment, availableDepartments]);

  const availableCategories = useMemo(() => {
    const list = orgData?.categories || [];
    if (!filterCareer) return list;
    return list.filter(c => String(c.careerId) === String(filterCareer));
  }, [orgData?.categories, filterCareer]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterDirectorate('');
    setFilterDepartment('');
    setFilterDivision('');
    setFilterCareer('');
    setFilterCategory('');
    setFilterDelay('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm || filterDirectorate || filterDepartment || filterDivision || filterCareer || filterCategory || filterDelay
  );

  const filtered = useMemo(() => {
    return elegibles.filter(e => {
      if (!e || !e.emp) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const name = String(e.emp.name || '').toLowerCase();
        const nip = String(e.emp.nip || e.emp.nuit || '').toLowerCase();
        if (!name.includes(term) && !nip.includes(term)) return false;
      }

      if (filterDirectorate && String(e.emp.directorateId) !== String(filterDirectorate)) {
        return false;
      }

      if (filterDepartment && String(e.emp.departmentId) !== String(filterDepartment)) {
        return false;
      }

      if (filterDivision && String(e.emp.divisionId) !== String(filterDivision)) {
        return false;
      }

      if (filterCareer && String(e.emp.careerId) !== String(filterCareer)) {
        return false;
      }

      if (filterCategory && String(e.emp.categoryId) !== String(filterCategory)) {
        return false;
      }

      if (filterDelay === 'delayed' && e.yearsInLevel < 3) {
        return false;
      }

      return true;
    });
  }, [elegibles, searchTerm, filterDirectorate, filterDepartment, filterDivision, filterCareer, filterCategory, filterDelay]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = useMemo(() => {
    return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const handleExportExcel = () => {
    const dataToExport = filtered.map(e => {
      const career = orgData?.careers?.find(c => c.id === e.emp.careerId)?.name || '-';
      const category = orgData?.categories?.find(c => c.id === e.emp.categoryId)?.name || '-';
      const dirName = orgData?.directorates?.find(d => d.id === e.emp.directorateId)?.name || '-';
      const depName = orgData?.departments?.find(d => d.id === e.emp.departmentId)?.name || '-';
      const divName = orgData?.divisions?.find(div => div.id === e.emp.divisionId)?.name || '-';

      return {
        'NUIT': e.emp.nip || e.emp.nuit || '-',
        'Nome': e.emp.name || 'Sem Nome',
        'Direcção': dirName,
        'Departamento': depName,
        'Repartição': divName,
        'Carreira': career,
        'Categoria Actual': category,
        'Nível Actual': e.emp.step || 'C',
        'Tempo no Nível (Anos)': e.yearsInLevel.toFixed(1),
        'Tempo na Categoria (Anos)': e.yearsInCategory.toFixed(1)
      };
    });
    exportToExcel(dataToExport, 'Elegiveis_Progressao');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={styles.filterCard}>
        <div style={styles.filterCardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <h4 style={styles.filterCardTitle}>Filtros de Elegíveis para Progressão</h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hasActiveFilters && (
              <button 
                type="button" 
                onClick={handleClearFilters}
                style={styles.btnClearFilters}
                title="Limpar todos os filtros"
              >
                ✕ Limpar Filtros
              </button>
            )}
            <button onClick={handleExportExcel} style={styles.exportBtn}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Exportar Excel
            </button>
          </div>
        </div>

        <div style={styles.filterGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Pesquisa por Nome ou NUIT</label>
            <input 
              type="text" 
              placeholder="Digite o NUIT ou Nome..." 
              value={searchTerm} 
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Direcção / Unidade Orgânica</label>
            <select 
              value={filterDirectorate} 
              onChange={e => { 
                setFilterDirectorate(e.target.value); 
                setFilterDepartment('');
                setFilterDivision('');
                setCurrentPage(1); 
              }} 
              style={styles.select}
            >
              <option value="">Todas as Direcções</option>
              {(orgData?.directorates || []).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Departamento</label>
            <select 
              value={filterDepartment} 
              onChange={e => { 
                setFilterDepartment(e.target.value); 
                setFilterDivision('');
                setCurrentPage(1); 
              }} 
              style={styles.select}
              disabled={!filterDirectorate}
            >
              <option value="">{filterDirectorate ? 'Todos os Departamentos' : 'Selecione a Direcção primeiro'}</option>
              {availableDepartments.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Repartição / Repartição Central</label>
            <select 
              value={filterDivision} 
              onChange={e => { setFilterDivision(e.target.value); setCurrentPage(1); }} 
              style={styles.select}
              disabled={!filterDirectorate}
            >
              <option value="">{filterDirectorate ? 'Todas as Repartições' : 'Selecione a Direcção primeiro'}</option>
              {availableDivisions.map(div => (
                <option key={div.id} value={div.id}>
                  {div.name} {!div.departmentId ? '(Central / Sem Dep.)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Carreira Profissional</label>
            <select 
              value={filterCareer} 
              onChange={e => { 
                setFilterCareer(e.target.value); 
                setFilterCategory(''); 
                setCurrentPage(1); 
              }} 
              style={styles.select}
            >
              <option value="">Todas as Carreiras</option>
              {(orgData?.careers || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Categoria Profissional</label>
            <select 
              value={filterCategory} 
              onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }} 
              style={styles.select}
            >
              <option value="">Todas as Categorias</option>
              {availableCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Situação do Tempo no Escalão</label>
            <select 
              value={filterDelay} 
              onChange={e => { setFilterDelay(e.target.value); setCurrentPage(1); }} 
              style={styles.select}
            >
              <option value="">Todas as Situações</option>
              <option value="delayed">Atraso (&gt; 3 anos no escalão)</option>
            </select>
          </div>
        </div>

        <div style={styles.filterFooter}>
          <span style={styles.resultsBadge}>
            📊 <strong>{filtered.length}</strong> {filtered.length === 1 ? 'funcionário elegível' : 'funcionários elegíveis'}
          </span>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>NUIT</th>
              <th>Nome</th>
              <th>Carreira</th>
              <th>Categoria Actual</th>
              <th>Nível Actual</th>
              <th>Tempo no Nível</th>
              <th style={{ textAlign: 'center' }}>Acções</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 && (
              <tr>
                <td colSpan="7" style={styles.empty}>
                  Nenhum funcionário elegível encontrado com os critérios selecionados.
                </td>
              </tr>
            )}
            {currentData.map(e => {
              const career = orgData?.careers?.find(c => c.id === e.emp.careerId)?.name || '-';
              const category = orgData?.categories?.find(c => c.id === e.emp.categoryId)?.name || '-';
              const currentStep = e.emp.step || 'C';
              
              return (
                <tr key={e.emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td><strong>{e.emp.nip || e.emp.nuit || '-'}</strong></td>
                  <td><strong>{e.emp.name || 'Sem Nome'}</strong></td>
                  <td>{career}</td>
                  <td>{category}</td>
                  <td>{currentStep}</td>
                  <td>
                    <span style={{ fontWeight: 'bold', color: '#2563eb' }}>
                      {e.exactTimeLevel.formatted}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {currentStep === 'A' ? (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Topo (Nível A)</span>
                    ) : (
                      <button onClick={() => handleProgressClick(e)} style={styles.actionBtn}>Progredir</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            style={styles.pageBtn}
          >
            Anterior
          </button>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
          </span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            style={styles.pageBtn}
          >
            Próxima
          </button>
        </div>
      )}

      {selectedEmp && (
        <AdminActWizard 
          emp={selectedEmp} 
          orgData={{ data: orgData }} 
          allowedActTypes={['Progressão']} 
          onClose={() => setSelectedEmp(null)} 
          onActRegistered={() => {
            if (onRefresh) onRefresh();
          }} 
        />
      )}
    </div>
  );
}

const styles = {
  filterCard: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    padding: '18px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  },
  filterCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--color-border)',
    flexWrap: 'wrap',
    gap: '10px'
  },
  filterCardTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-primary)'
  },
  btnClearFilters: {
    padding: '6px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  exportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '12px'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '14px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  input: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    outline: 'none',
    fontSize: '13px'
  },
  select: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    outline: 'none',
    fontSize: '13px',
    cursor: 'pointer'
  },
  filterFooter: {
    marginTop: '14px',
    paddingTop: '10px',
    borderTop: '1px solid var(--color-border)',
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
  tableContainer: {
    overflowX: 'auto',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  },
  empty: {
    padding: '35px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '13.5px'
  },
  actionBtn: {
    padding: '4px 12px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px',
    marginTop: '10px',
    padding: '10px'
  },
  pageBtn: {
    padding: '6px 14px',
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-base)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12.5px',
    fontWeight: '600'
  }
};
