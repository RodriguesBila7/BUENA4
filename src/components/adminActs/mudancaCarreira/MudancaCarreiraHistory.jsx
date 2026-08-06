import React, { useState, useMemo } from 'react';
import useAdminActsData from '../../../hooks/useAdminActsData';
import useEmployeeData from '../../../hooks/useEmployeeData';
import ConfirmModal from '../../ConfirmModal';
import AdminActsAnalytics from '../AdminActsAnalytics';
import { exportToExcel } from '../../../utils/excelExport';
import CrudActionButtons from '../../common/CrudActionButtons';
import SystemModal from '../../common/SystemModal';
import { showToast } from '../../common/Toast';

export default function MudancaCarreiraHistory({ acts, onNewRequest }) {
  const { employees } = useEmployeeData();
  const { deleteAct, updateAct } = useAdminActsData();
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [viewMode, setViewMode] = useState('lista');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viewDetailsAct, setViewDetailsAct] = useState(null);
  const [editAct, setEditAct] = useState(null);
  const [editFormData, setEditFormData] = useState({ actDate: '', despacho: '' });

  // Filter only 'Mudança de Carreira' acts
  const mcActs = acts || [];

  const filteredActs = useMemo(() => {
    if (!searchTerm) return mcActs;
    const term = searchTerm.toLowerCase();
    return mcActs.filter(act => {
      const emp = employees.find(e => e.id === act.employeeId);
      const empName = emp ? emp.name.toLowerCase() : '';
      const despacho = (act.despacho || '').toLowerCase();
      return empName.includes(term) || despacho.includes(term);
    });
  }, [mcActs, employees, searchTerm]);

  const handleExportExcel = () => {
    const exportData = filteredActs.map(act => {
      const emp = employees.find(e => e.id === act.employeeId);
      return {
        'Data do Acto': new Date(act.actDate).toLocaleDateString('pt-PT'),
        'Funcionário': emp ? emp.name : 'Desconhecido',
        'Despacho': act.despacho || '-',
        'De (Categoria Antiga)': act.details?.oldCategoryName || 'N/A',
        'Para (Nova Categoria)': act.details?.newCategoryName || 'N/A'
      };
    });
    exportToExcel(exportData, 'Registos_Mudanca_Carreira');
  };

  const handleDelete = (actId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Registo',
      message: 'Tem a certeza que pretende apagar permanentemente este processo de mudança de carreira? O perfil do funcionário terá de ser revertido manualmente se necessário.',
      isDestructive: true,
      onConfirm: async () => {
        await deleteAct(actId);
        setConfirmModal({ isOpen: false });
      }
    });
  };

  const handleView = (act) => {
    setViewDetailsAct(act);
  };

  const handleEdit = (act) => {
    setEditAct(act);
    setEditFormData({
      actDate: act.actDate ? act.actDate.split('T')[0] : (act.date ? act.date.split('T')[0] : ''),
      despacho: act.despacho || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editFormData.actDate || !editFormData.despacho) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
      return;
    }
    await updateAct(editAct.id, {
      ...editAct,
      actDate: editFormData.actDate,
      date: editFormData.actDate,
      despacho: editFormData.despacho
    });
    setEditAct(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            style={{...styles.tabBtn, ...(viewMode === 'lista' ? styles.tabBtnActive : {})}} 
            onClick={() => setViewMode('lista')}
          >
            📋 Lista de Registos
          </button>
          <button 
            style={{...styles.tabBtn, ...(viewMode === 'estatisticas' ? styles.tabBtnActive : {})}} 
            onClick={() => setViewMode('estatisticas')}
          >
            📊 Estatísticas Analíticas
          </button>
        </div>
        
        {viewMode === 'lista' && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Pesquisar funcionário ou acto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <button onClick={handleExportExcel} style={styles.btnExport}>
              📥 Exportar Excel
            </button>
            {onNewRequest && (
              <button onClick={onNewRequest} style={styles.btnAdd}>
                + Nova Solicitação
              </button>
            )}
          </div>
        )}
      </div>

      {viewMode === 'estatisticas' ? (
        <AdminActsAnalytics acts={filteredActs} title="Mudança de Carreira" />
      ) : (
        <>
          {filteredActs.length === 0 ? (
            <div style={styles.empty}>
              {searchTerm ? 'Nenhum registo encontrado para a pesquisa.' : 'Nenhum processo registado.'}
            </div>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Data do Acto</th>
                  <th>Funcionário</th>
                  <th>Despacho</th>
                  <th>De (Categoria Antiga)</th>
                  <th>Para (Nova Categoria)</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredActs.map(act => {
                  const emp = employees.find(e => e.id === act.employeeId);
                  const { oldCategoryName, newCategoryName } = act.details || {};

                  return (
                    <tr key={act.id} style={styles.tr}>
                      <td>{act.actDate ? new Date(act.actDate).toLocaleDateString('pt-PT') : '-'}</td>
                      <td><strong>{emp ? emp.name : 'Desconhecido'}</strong></td>
                      <td>{act.despacho || '-'}</td>
                      <td>{oldCategoryName || 'N/A'}</td>
                      <td>{newCategoryName || 'N/A'}</td>
                      <td style={{...styles.td, textAlign: 'right'}}>
                        <CrudActionButtons 
                          onView={() => handleView(act)}
                          onEdit={() => handleEdit(act)}
                          onDelete={() => handleDelete(act.id)}
                          viewTitle="Visualizar"
                          editTitle="Editar"
                          deleteTitle="Apagar"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
        hideCancel={confirmModal.hideCancel}
        confirmText={confirmModal.hideCancel ? "OK" : "Confirmar"}
      />

      <SystemModal
        isOpen={!!viewDetailsAct}
        title="Detalhes do Processo de Mudança de Carreira"
        onClose={() => setViewDetailsAct(null)}
        width="600px"
        footer={<button onClick={() => setViewDetailsAct(null)} style={styles.btnExport}>Fechar</button>}
      >
        {viewDetailsAct && (
          <div style={styles.detailGrid}>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Funcionário</div>
              <div style={styles.detailValue}>{employees.find(e => e.id === viewDetailsAct.employeeId)?.name || 'Desconhecido'}</div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Data do Acto</div>
              <div style={styles.detailValue}>{viewDetailsAct.actDate ? new Date(viewDetailsAct.actDate).toLocaleDateString('pt-PT') : '-'}</div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Nº de Despacho</div>
              <div style={styles.detailValue}>{viewDetailsAct.despacho || '-'}</div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Carreira Anterior</div>
              <div style={styles.detailValue}>{viewDetailsAct.details?.oldCareerName || 'N/A'}</div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Nova Carreira</div>
              <div style={styles.detailValue}>{viewDetailsAct.details?.newCareerName || 'N/A'}</div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Categoria Anterior</div>
              <div style={styles.detailValue}>{viewDetailsAct.details?.oldCategoryName || 'N/A'}</div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Nova Categoria</div>
              <div style={styles.detailValue}>{viewDetailsAct.details?.newCategoryName || 'N/A'}</div>
            </div>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Registado por</div>
              <div style={styles.detailValue}>{viewDetailsAct.userResponsible || 'Sistema'}</div>
            </div>
          </div>
        )}
        
        {viewDetailsAct?.details?.documentB64 && (
          <div style={{ marginTop: '20px' }}>
            <div style={styles.detailLabel}>Documento Anexo</div>
            <button onClick={() => {
              const win = window.open();
              win.document.write(`<iframe src="${viewDetailsAct.details.documentB64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
            }} style={{...styles.btnExport, marginTop: '8px'}}>Visualizar Documento</button>
          </div>
        )}
      </SystemModal>

      <SystemModal
        isOpen={!!editAct}
        title="Editar Processo"
        onClose={() => setEditAct(null)}
        width="600px"
        footer={
          <>
            <button onClick={() => setEditAct(null)} style={styles.btnExport}>Cancelar</button>
            <button onClick={handleSaveEdit} style={{...styles.btnExport, backgroundColor: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)'}}>Guardar</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={styles.detailLabel}>Data do Acto</label>
            <input 
              type="date" 
              value={editFormData.actDate} 
              onChange={e => setEditFormData({...editFormData, actDate: e.target.value})}
              style={styles.formInput}
            />
          </div>
          <div>
            <label style={styles.detailLabel}>Nº de Despacho</label>
            <input 
              type="text" 
              value={editFormData.despacho} 
              onChange={e => setEditFormData({...editFormData, despacho: e.target.value})}
              style={styles.formInput}
            />
          </div>
        </div>
      </SystemModal>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#fff', borderRadius: '8px', padding: '0px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  tabBtn: { padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' },
  tabBtnActive: { backgroundColor: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  searchInput: { padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e0', width: '300px', fontSize: '14px', outline: 'none' },
  btnExport: { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  btnAdd: { backgroundColor: '#e53e3e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'all 0.2s' },
  empty: { padding: '40px', textAlign: 'center', color: '#a0aec0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' },
  th: { textAlign: 'left', padding: '16px', borderBottom: '2px solid #edf2f7', color: '#4a5568', backgroundColor: '#f8fafc', fontWeight: '600' },
  tr: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '16px', color: '#2d3748', verticalAlign: 'middle' },
  btnView: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: '#ebf4ff', color: '#3182ce', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' },
  btnEdit: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: '#faf5ff', color: '#805ad5', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' },
  btnDelete: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: '#fff5f5', color: '#e53e3e', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  detailLabel: { fontSize: '12px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' },
  detailValue: { fontSize: '14px', color: '#2d3748', fontWeight: '500' },
  formInput: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px', marginTop: '4px' }
};
