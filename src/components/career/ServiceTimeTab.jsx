import React, { useState, useMemo } from 'react';
import { exportToExcel } from '../../utils/excelExport';
import AdminActWizard from '../employees/acts/AdminActWizard';

export default function ServiceTimeTab({ data = [], orgData, onRegisterAct }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCareer, setFilterCareer] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDirectorate, setFilterDirectorate] = useState('');
  const [filterEligibility, setFilterEligibility] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedAction, setSelectedAction] = useState(null);

  const availableCategories = useMemo(() => {
    const list = orgData?.categories || [];
    if (!filterCareer) return list;
    return list.filter(c => String(c.careerId) === String(filterCareer));
  }, [orgData?.categories, filterCareer]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterCareer('');
    setFilterCategory('');
    setFilterDirectorate('');
    setFilterEligibility('');
    setFilterStatus('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm || filterCareer || filterCategory || filterDirectorate || filterEligibility || filterStatus
  );

  const filtered = useMemo(() => {
    return (data || []).filter(d => {
      if (!d || !d.emp) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const name = String(d.emp.name || '').toLowerCase();
        const nip = String(d.emp.nip || d.emp.nuit || '').toLowerCase();
        if (!name.includes(term) && !nip.includes(term)) return false;
      }

      if (filterCareer && String(d.emp.careerId) !== String(filterCareer)) {
        return false;
      }

      if (filterCategory && String(d.emp.categoryId) !== String(filterCategory)) {
        return false;
      }

      if (filterDirectorate && String(d.emp.directorateId) !== String(filterDirectorate)) {
        return false;
      }

      if (filterEligibility) {
        const isPromoEligible = Boolean(d.promoData?.isEligible);
        const isProgEligible = Boolean(d.progData?.isEligible && d.emp.step !== 'A');
        const promoYears = d.promoData?.exactTime?.years ?? 0;
        const progYears = d.progData?.exactTimeLevel?.years ?? 0;

        switch (filterEligibility) {
          case 'promo_eligible':
            if (!isPromoEligible) return false;
            break;
          case 'promo_delayed':
            if (promoYears < 6) return false;
            break;
          case 'prog_eligible':
            if (!isProgEligible) return false;
            break;
          case 'prog_delayed':
            if (progYears < 3) return false;
            break;
          case 'both_eligible':
            if (!isPromoEligible || !isProgEligible) return false;
            break;
          case 'neither':
            if (isPromoEligible || isProgEligible) return false;
            break;
          default:
            break;
        }
      }

      if (filterStatus) {
        const isPending = Boolean(d.promoData?.hasPendingPromo || d.progData?.hasPendingProg);
        if (filterStatus === 'pending' && !isPending) return false;
        if (filterStatus === 'regular' && isPending) return false;
      }

      return true;
    });
  }, [data, searchTerm, filterCareer, filterCategory, filterDirectorate, filterEligibility, filterStatus]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = useMemo(() => {
    return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const handleExportExcel = () => {
    const dataToExport = filtered.map(d => {
      const careerName = orgData?.careers?.find(c => c.id === d.emp.careerId)?.name || 'N/A';
      const categoryName = orgData?.categories?.find(c => c.id === d.emp.categoryId)?.name || 'N/A';
      const directorateName = orgData?.directorates?.find(dir => dir.id === d.emp.directorateId)?.name || 'N/A';
      return {
        'NUIT': d.emp.nip || d.emp.nuit || '-',
        'Nome': d.emp.name || 'Sem Nome',
        'Direcção': directorateName,
        'Carreira': careerName,
        'Categoria Atual': categoryName,
        'Escalão': d.emp.step || 'C',
        'Tempo na Categoria (Promoção)': d.promoData.exactTime.formatted,
        'Tempo no Escalão (Progressão)': d.progData.exactTimeLevel.formatted,
        'Situação': (d.promoData.hasPendingPromo || d.progData.hasPendingProg) ? 'Acto Pendente' : 'Regular'
      };
    });
    exportToExcel(dataToExport, 'Tempo_Servico_Funcionarios');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={styles.filterCard}>
        <div style={styles.filterCardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <h4 style={styles.filterCardTitle}>Filtros de Tempo de Serviço</h4>
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
              onChange={e => { setFilterDirectorate(e.target.value); setCurrentPage(1); }} 
              style={styles.select}
            >
              <option value="">Todas as Direcções</option>
              {(orgData?.directorates || []).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
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
            <label style={styles.label}>Critério de Elegibilidade / Tempo</label>
            <select 
              value={filterEligibility} 
              onChange={e => { setFilterEligibility(e.target.value); setCurrentPage(1); }} 
              style={styles.select}
            >
              <option value="">Todas as Situações de Tempo</option>
              <option value="promo_eligible">Elegíveis para Promoção (≥ 6 Anos)</option>
              <option value="promo_delayed">Promoções em Atraso (&gt; 6 Anos)</option>
              <option value="prog_eligible">Elegíveis para Progressão (≥ 2 Anos)</option>
              <option value="prog_delayed">Progressões em Atraso (&gt; 3 Anos)</option>
              <option value="both_eligible">Ambos Elegíveis (Promoção e Progressão)</option>
              <option value="neither">Sem Elegibilidade Atual</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Estado do Acto</label>
            <select 
              value={filterStatus} 
              onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} 
              style={styles.select}
            >
              <option value="">Todos os Estados</option>
              <option value="regular">Regular (Sem Actos Pendentes)</option>
              <option value="pending">Acto Pendente de Confirmação</option>
            </select>
          </div>
        </div>

        <div style={styles.filterFooter}>
          <span style={styles.resultsBadge}>
            📊 <strong>{filtered.length}</strong> {filtered.length === 1 ? 'funcionário encontrado' : 'funcionários encontrados'}
          </span>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>NUIT</th>
              <th>Nome do Funcionário</th>
              <th>Carreira / Categoria</th>
              <th>Tempo p/ Promoção<br/><small style={{ fontWeight: 'normal', fontSize: '11px' }}>(Na Categoria Atual)</small></th>
              <th>Tempo p/ Progressão<br/><small style={{ fontWeight: 'normal', fontSize: '11px' }}>(No Escalão Atual)</small></th>
              <th>Situação</th>
              <th style={{ textAlign: 'center' }}>Acções</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 && (
              <tr>
                <td colSpan="7" style={styles.empty}>
                  Nenhum funcionário encontrado com os critérios selecionados.
                </td>
              </tr>
            )}
            {currentData.map(d => {
              const careerName = orgData?.careers?.find(c => c.id === d.emp.careerId)?.name || 'N/A';
              const categoryName = orgData?.categories?.find(c => c.id === d.emp.categoryId)?.name || 'N/A';
              const isPending = d.promoData.hasPendingPromo || d.progData.hasPendingProg;

              return (
                <tr key={d.emp.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isPending ? 'rgba(245, 158, 11, 0.06)' : 'transparent' }}>
                  <td><strong>{d.emp.nip || d.emp.nuit || '-'}</strong></td>
                  <td><strong>{d.emp.name || 'Sem Nome'}</strong></td>
                  <td>
                    {careerName}
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                      {categoryName} (Nível {d.emp.step || 'C'})
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      fontWeight: d.promoData.exactTime.years >= 6 && !isPending ? '700' : 'normal', 
                      color: d.promoData.exactTime.years >= 6 && !isPending ? '#059669' : 'inherit' 
                    }}>
                      {d.promoData.exactTime.formatted}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      fontWeight: d.progData.exactTimeLevel.years >= 2 && !isPending ? '700' : 'normal', 
                      color: d.progData.exactTimeLevel.years >= 2 && !isPending ? '#2563eb' : 'inherit' 
                    }}>
                      {d.progData.exactTimeLevel.formatted}
                    </span>
                  </td>
                  <td>
                    {isPending ? (
                      <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: '#f59e0b', color: '#fff' }}>
                        Acto Pendente
                      </span>
                    ) : (
                      <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: 'rgba(100, 116, 139, 0.12)', color: 'var(--color-text-muted)' }}>
                        Regular
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {d.promoData.isEligible && (
                        <button 
                          onClick={() => setSelectedAction({ emp: d.emp, type: 'Promoção' })} 
                          style={styles.promoBtn}
                          title="Iniciar Acto de Promoção"
                        >
                          Promover
                        </button>
                      )}
                      {d.progData.isEligible && d.emp.step !== 'A' && (
                        <button 
                          onClick={() => setSelectedAction({ emp: d.emp, type: 'Progressão' })} 
                          style={styles.progBtn}
                          title="Iniciar Acto de Progressão"
                        >
                          Progredir
                        </button>
                      )}
                      {!d.promoData.isEligible && (!d.progData.isEligible || d.emp.step === 'A') && (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Nenhuma</span>
                      )}
                    </div>
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

      {selectedAction && (
        <AdminActWizard 
          emp={selectedAction.emp} 
          orgData={{ data: orgData }} 
          allowedActTypes={[selectedAction.type]} 
          onClose={() => setSelectedAction(null)} 
          onActRegistered={() => {
            if (onRegisterAct) {
              onRegisterAct();
            }
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
  },
  promoBtn: {
    padding: '4px 10px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '700'
  },
  progBtn: {
    padding: '4px 10px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '700'
  }
};
