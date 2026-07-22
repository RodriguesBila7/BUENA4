import React, { useState } from 'react';
import { exportToExcel } from '../../utils/excelExport';
import AdminActWizard from '../employees/acts/AdminActWizard';

export default function ServiceTimeTab({ data, orgData, onRegisterAct }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedAction, setSelectedAction] = useState(null); // { emp, type: 'Promoção' | 'Progressão' }

  const filtered = data.filter(d => {
    if (!searchTerm) return true;
    return String(d.emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(d.emp.nip || d.emp.nuit || '').includes(searchTerm);
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportExcel = () => {
    const dataToExport = filtered.map(d => {
      const careerName = orgData?.careers?.find(c => c.id === d.emp.careerId)?.name || 'N/A';
      const categoryName = orgData?.categories?.find(c => c.id === d.emp.categoryId)?.name || 'N/A';
      return {
        'NUIT': d.emp.nip || d.emp.nuit || '-',
        'Nome': d.emp.name || 'Sem Nome',
        'Carreira': careerName,
        'Categoria Atual': categoryName,
        'Tempo na Categoria (Promoção)': d.promoData.exactTime.formatted,
        'Tempo no Escalão (Progressão)': d.progData.exactTimeLevel.formatted,
        'Situação': (d.promoData.hasPendingPromo || d.progData.hasPendingProg) ? 'Pendente' : 'Efectivo'
      };
    });
    exportToExcel(dataToExport, 'Tempo_Servico_Funcionarios');
  };

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Pesquisar por Nome ou NUIT..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          style={styles.searchInput}
        />
        <button onClick={handleExportExcel} style={styles.exportBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Exportar Excel
        </button>
      </div>

      <table className="premium-table">
        <thead>
          <tr>
            <th>NUIT</th>
            <th>Nome do Funcionário</th>
            <th>Carreira / Categoria</th>
            <th>Tempo p/ Promoção<br/><small style={{fontWeight:'normal'}}>(Na Categoria Atual)</small></th>
            <th>Tempo p/ Progressão<br/><small style={{fontWeight:'normal'}}>(No Escalão Atual)</small></th>
            <th>Situação</th>
            <th>Acções</th>
          </tr>
        </thead>
        <tbody>
          {currentData.length === 0 && (
            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Nenhum funcionário encontrado.</td></tr>
          )}
          {currentData.map(d => {
            const careerName = orgData?.careers?.find(c => c.id === d.emp.careerId)?.name || 'N/A';
            const categoryName = orgData?.categories?.find(c => c.id === d.emp.categoryId)?.name || 'N/A';
            const isPending = d.promoData.hasPendingPromo || d.progData.hasPendingProg;

            return (
              <tr key={d.emp.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isPending ? '#fffbeb' : 'transparent' }}>
                <td>{d.emp.nip || d.emp.nuit || '-'}</td>
                <td><strong>{d.emp.name || 'Sem Nome'}</strong></td>
                <td>{careerName} <br/><span style={{color: 'var(--color-text-muted)'}}>{categoryName} (Nível {d.emp.step || 'C'})</span></td>
                <td>
                  <span style={{ fontWeight: d.promoData.exactTime.years >= 6 && !isPending ? 'bold' : 'normal', color: d.promoData.exactTime.years >= 6 && !isPending ? '#059669' : 'inherit' }}>
                    {d.promoData.exactTime.formatted}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: d.progData.exactTimeLevel.years >= 2 && !isPending ? 'bold' : 'normal', color: d.progData.exactTimeLevel.years >= 2 && !isPending ? '#2563eb' : 'inherit' }}>
                    {d.progData.exactTimeLevel.formatted}
                  </span>
                </td>
                <td>
                  {isPending ? (
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: '#f59e0b', color: '#fff' }}>Acto Pendente</span>
                  ) : (
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: '#e5e7eb', color: '#4b5563' }}>Regular</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {d.promoData.isEligible && (
                      <button onClick={() => setSelectedAction({ emp: d.emp, type: 'Promoção' })} style={styles.promoBtn}>Promover</button>
                    )}
                    {d.progData.isEligible && d.emp.step !== 'A' && (
                      <button onClick={() => setSelectedAction({ emp: d.emp, type: 'Progressão' })} style={styles.progBtn}>Progredir</button>
                    )}
                    {!d.promoData.isEligible && (!d.progData.isEligible || d.emp.step === 'A') && (
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>Nenhuma</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            style={styles.pageBtn}
          >
            Anterior
          </button>
          <span>Página {currentPage} de {totalPages}</span>
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
              // Note: the wizard itself registers the act through the useAdminActsData hook natively
              // However, since we are overriding it slightly and to force update, we could just trigger the callback
              // Actually AdminActWizard calls registerAct which is from context, so we don't need to pass it, but
              // it's already done inside AdminActWizard. We just need to close.
            }
          }} 
        />
      )}
    </div>
  );
}

const styles = {
  searchInput: { padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', width: '300px' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: 'var(--color-bg-base)' },
  th: { padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' },
  td: { padding: '12px', borderBottom: '1px solid var(--color-border)' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', padding: '10px' },
  pageBtn: { padding: '6px 12px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' },
  promoBtn: { padding: '4px 8px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  progBtn: { padding: '4px 8px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }
};
