import React, { useState } from 'react';
import { exportToExcel } from '../../utils/excelExport';
import AdminActWizard from '../employees/acts/AdminActWizard';

export default function PromotionTab({ elegibles, orgData, onPromote, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handlePromoteClick = (e) => {
    setSelectedEmp(e.emp);
  };

  const getStatusColor = (years) => {
    if (years > 6) return '#ef4444'; // Red
    if (years >= 5) return '#f59e0b'; // Yellow
    return '#10b981'; // Green
  };

  const filtered = elegibles.filter(e => 
    String(e.emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(e.emp.nip || e.emp.nuit || '').includes(searchTerm)
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportExcel = () => {
    const dataToExport = filtered.map(e => {
      const career = orgData?.careers?.find(c => c.id === e.emp.careerId)?.name || '-';
      const category = orgData?.categories?.find(c => c.id === e.emp.categoryId)?.name || '-';
      return {
        'NUIT': e.emp.nip || e.emp.nuit || '-',
        'Nome': e.emp.name || 'Sem Nome',
        'Carreira': career,
        'Categoria Actual': `${category} ${e.emp.step ? `(Nível ${e.emp.step})` : ''}`,
        'Última Promoção': e.lastPromoDate ? e.lastPromoDate.toLocaleDateString() : 'Não registada',
        'Tempo na Categoria (Anos)': e.yearsInCategory.toFixed(1),
        'Estado': e.yearsInCategory > 6 ? 'Atrasado' : 'Elegível'
      };
    });
    exportToExcel(dataToExport, 'Elegiveis_Promocao');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Pesquisar por Nome ou NUIT..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          style={styles.searchInput}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '4px', fontSize: '12px' }}>Mais de 6 anos</span>
          <span style={{ padding: '6px 12px', backgroundColor: '#f59e0b', color: '#fff', borderRadius: '4px', fontSize: '12px' }}>5 a 6 anos</span>
          <button onClick={handleExportExcel} style={styles.exportBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Exportar
          </button>
        </div>
      </div>

      <table className="premium-table">
        <thead>
          <tr>
            <th>NUIT</th>
            <th>Nome</th>
            <th>Carreira</th>
            <th>Categoria Actual</th>
            <th>Última Promoção</th>
            <th>Tempo na Categoria</th>
            <th>Estado</th>
            <th>Acções</th>
          </tr>
        </thead>
        <tbody>
          {currentData.length === 0 && (
            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Nenhum funcionário elegível encontrado.</td></tr>
          )}
          {currentData.map(e => {
            const career = orgData?.careers?.find(c => c.id === e.emp.careerId)?.name || '-';
            const category = orgData?.categories?.find(c => c.id === e.emp.categoryId)?.name || '-';
            
            return (
              <tr key={e.emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td>{e.emp.nip || e.emp.nuit || '-'}</td>
                <td><strong>{e.emp.name || 'Sem Nome'}</strong></td>
                <td>{career}</td>
                <td>{category} {e.emp.step ? `(Nível ${e.emp.step})` : ''}</td>
                <td>{e.lastPromoDate ? e.lastPromoDate.toLocaleDateString() : 'Não registada'}</td>
                <td>
                  <span style={{ fontWeight: 'bold', color: '#059669' }}>
                    {e.exactTime.formatted}
                  </span>
                </td>
                <td>
                  <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: getStatusColor(e.yearsInCategory), color: '#fff' }}>
                    {e.yearsInCategory > 6 ? 'Atrasado' : 'Elegível'}
                  </span>
                </td>
                <td>
                  <button onClick={() => handlePromoteClick(e)} style={styles.actionBtn}>Promover</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Paginação */}
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

      {selectedEmp && (
        <AdminActWizard 
          emp={selectedEmp} 
          orgData={{ data: orgData }} 
          allowedActTypes={['Promoção']} 
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
  searchInput: { padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', width: '300px' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: 'var(--color-bg-base)' },
  th: { padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' },
  td: { padding: '12px', borderBottom: '1px solid var(--color-border)' },
  actionBtn: { padding: '6px 12px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', padding: '10px' },
  pageBtn: { padding: '6px 12px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'var(--color-bg-card, #fff)', color: 'var(--color-text-base)', border: '1px solid var(--color-border)', padding: '24px', borderRadius: '8px', width: '450px', maxHeight: '90vh', overflowY: 'auto' },
  formGroup: { marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-base)' },
  input: { padding: '8px', border: '1px solid var(--color-border, #d1d5db)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', borderRadius: '4px', outline: 'none' },
  inputDisabled: { padding: '8px', border: '1px solid var(--color-border, #d1d5db)', borderRadius: '4px', backgroundColor: 'var(--color-bg-subtle, #f3f4f6)', color: 'var(--color-text-muted, #6b7280)' },
  cancelBtn: { padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid var(--color-border, #d1d5db)', color: 'var(--color-text-base)', borderRadius: '4px', cursor: 'pointer' },
  confirmBtn: { padding: '8px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};
