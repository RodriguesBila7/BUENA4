import React, { useState } from 'react';
import { exportToExcel } from '../../utils/excelExport';
import AdminActWizard from '../employees/acts/AdminActWizard';

export default function ProgressionTab({ elegibles, orgData, onProgress, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleProgressClick = (e) => {
    setSelectedEmp(e.emp);
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
        'Categoria Actual': category,
        'Nível Actual': e.emp.step || 'C',
        'Tempo no Nível (Anos)': e.yearsInLevel.toFixed(1),
        'Tempo na Categoria (Anos)': e.yearsInCategory.toFixed(1)
      };
    });
    exportToExcel(dataToExport, 'Elegiveis_Progressao');
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
          <span style={{ padding: '6px 12px', backgroundColor: '#f59e0b', color: '#fff', borderRadius: '4px', fontSize: '12px' }}>Atraso (&gt;3 anos)</span>
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
            <th>Nível Actual</th>
            <th>Tempo no Nível</th>
            <th>Acções</th>
          </tr>
        </thead>
        <tbody>
          {currentData.length === 0 && (
            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Nenhum funcionário elegível encontrado.</td></tr>
          )}
          {currentData.map(e => {
            const career = orgData?.careers?.find(c => c.id === e.emp.careerId)?.name || '-';
            const category = orgData?.categories?.find(c => c.id === e.emp.categoryId)?.name || '-';
            const currentStep = e.emp.step || 'C';
            
            return (
              <tr key={e.emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td>{e.emp.nip || e.emp.nuit || '-'}</td>
                <td><strong>{e.emp.name || 'Sem Nome'}</strong></td>
                <td>{career}</td>
                <td>{category}</td>
                <td>{currentStep}</td>
                <td>
                  <span style={{ fontWeight: 'bold', color: '#2563eb' }}>
                    {e.exactTimeLevel.formatted}
                  </span>
                </td>
                <td>
                  {currentStep === 'A' ? (
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Topo (nível A)</span>
                  ) : (
                    <button onClick={() => handleProgressClick(e)} style={styles.actionBtn}>Progredir</button>
                  )}
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
  searchInput: { padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', width: '300px' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: 'var(--color-bg-base)' },
  th: { padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' },
  td: { padding: '12px', borderBottom: '1px solid var(--color-border)' },
  actionBtn: { padding: '6px 12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', padding: '10px' },
  pageBtn: { padding: '6px 12px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '450px', maxHeight: '90vh', overflowY: 'auto' },
  formGroup: { marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: 'bold' },
  input: { padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' },
  inputDisabled: { padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#f3f4f6', color: '#6b7280' },
  cancelBtn: { padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' },
  confirmBtn: { padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};
