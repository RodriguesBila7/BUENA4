import React, { useState, useMemo } from 'react';
import useAdminActsData from '../../hooks/useAdminActsData';
import useEmployeeData from '../../hooks/useEmployeeData';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../ConfirmModal';
import useOrgData from '../../hooks/useOrgData';
import EmployeeSearchModal from './EmployeeSearchModal';
import AdminActWizard from '../employees/acts/AdminActWizard';
import AdminActsAnalytics from './AdminActsAnalytics';
import { exportToExcel } from '../../utils/excelExport';

export default function GenericAdminActsList({ title, actTypes, emptyMessage }) {
  const { user } = useAuth();
  const isSuperAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(user?.roleId || user?.role) || user?.username === 'admin';
  const { acts, deleteAct, confirmAct, fetchData } = useAdminActsData();
  const { employees, updateEmployee } = useEmployeeData();
  const { data: orgData } = useOrgData();
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });
  const [viewMode, setViewMode] = useState('lista');

  // Add Act Flow
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  const handleSelectEmployee = (emp) => {
    setSelectedEmp(emp);
    setIsSearchOpen(false);
  };

  const handleCloseWizard = () => {
    setSelectedEmp(null);
    fetchData();
  };

  const handleGiveConformity = (act, emp) => {
    setConfirmModal({
      isOpen: true,
      title: '✍️ Dar Conformidade ao Acto Administrativo',
      message: `Tem a certeza que pretende DAR CONFORMIDADE e aprovar formalmente o acto de "${act.actType}" para o funcionário ${emp?.name || 'selecionado'}? O estado passará a Confirmado e o registo será efetivado no histórico.`,
      isDestructive: false,
      confirmText: '✍️ Dar Conformidade',
      onConfirm: async () => {
        const res = await confirmAct(act.id);
        if (res.success) {
          setConfirmModal({
            isOpen: true,
            title: 'Sucesso',
            message: 'Conformidade atribuída com sucesso! O acto foi efetivado.',
            onConfirm: () => { setConfirmModal({ isOpen: false }); fetchData(); },
            hideCancel: true,
            confirmText: 'OK'
          });
        } else {
          setConfirmModal({
            isOpen: true,
            title: 'Erro',
            message: 'Erro ao atribuir conformidade: ' + (res.error || 'Falha na operação.'),
            onConfirm: () => setConfirmModal({ isOpen: false }),
            hideCancel: true,
            confirmText: 'OK',
            isDestructive: true
          });
        }
      }
    });
  };

  // Filter acts by type and search term
  const filteredActs = useMemo(() => {
    return acts.filter(act => {
      // Filtrar pelo tipo
      if (!actTypes.includes(act.actType)) return false;
      
      // Filtrar por termo de pesquisa
      if (!searchTerm) return true;
      
      const emp = employees.find(e => e.id === act.employeeId);
      const empName = emp ? emp.name.toLowerCase() : '';
      const actId = (act.id || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      
      return empName.includes(term) || actId.includes(term);
    });
  }, [acts, employees, actTypes, searchTerm]);

  const handleExportExcel = () => {
    const exportData = filteredActs.map(act => {
      const emp = employees.find(e => e.id === act.employeeId);
      return {
        'Data do Acto': new Date(act.actDate).toLocaleDateString('pt-PT'),
        'Funcionário': emp ? emp.name : 'Desconhecido',
        'NUIT': emp ? emp.nuit : 'N/D',
        'Tipo de Acto': formatActType(act.actType),
        'Nº Despacho': act.despacho || '-',
        'Boletim (BR)': act.br || '-'
      };
    });
    exportToExcel(exportData, `Registos_${actTypes.join('_')}`);
  };

  return (
    <div style={{...styles.container, padding: title ? '24px' : '0px', backgroundColor: title ? 'var(--color-bg-base)' : 'transparent'}}>
      {title && (
        <h2 style={{...styles.title, marginBottom: '24px'}}>{title}</h2>
      )}

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
            <button onClick={() => setIsSearchOpen(true)} style={styles.btnAdd}>
              + Nova Solicitação
            </button>
          </div>
        )}
      </div>

      {viewMode === 'estatisticas' ? (
        <AdminActsAnalytics acts={filteredActs} title={actTypes.length === 1 ? formatActType(actTypes[0]) : 'Atos Administrativos'} />
      ) : (
        <div style={styles.tableContainer}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Funcionário</th>
                <th>Tipo de Acto</th>
                <th>Nº Despacho</th>
                <th>Boletim (BR)</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredActs.length > 0 ? (
                filteredActs.map(act => {
                  const emp = employees.find(e => e.id === act.employeeId);
                  const isPending = act.status === 'Pendente' || act.details?.status === 'Pendente';
                  return (
                    <tr key={act.id} style={styles.tr}>
                      <td>{new Date(act.actDate).toLocaleDateString('pt-PT')}</td>
                      <td>
                        <div style={styles.primaryText}>{emp ? emp.name : 'Funcionário Desconhecido'}</div>
                        <div style={styles.secondaryText}>NUIT: {emp ? emp.nuit : 'N/D'}</div>
                      </td>
                      <td>
                        <span style={styles.badge}>{formatActType(act.actType)}</span>
                      </td>
                      <td>{act.despacho || '-'}</td>
                      <td>{act.br || '-'}</td>
                      <td>
                        {isPending ? (
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            🟡 Pendente
                          </span>
                        ) : (
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            ✅ Confirmado
                          </span>
                        )}
                      </td>
                      <td style={{...styles.td, textAlign: 'right'}}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {isPending && isSuperAdmin && (
                            <button
                              onClick={() => handleGiveConformity(act, emp)}
                              style={{
                                padding: '5px 12px',
                                backgroundColor: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Aprovar e Dar Conformidade ao Acto"
                            >
                              ✍️ Dar Conformidade
                            </button>
                          )}
                          {['Expulsão', 'Demissão'].includes(act.actType) && ['Expulso', 'Demitido'].includes(emp?.status) && isSuperAdmin && (
                            <button 
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Reativar Funcionário',
                                  message: 'Tem a certeza que pretende reativar este funcionário? O estado passará novamente a "Ativo".',
                                  onConfirm: async () => {
                                    const fullEmp = employees.find(e => e.id === emp.id);
                                    const res = await updateEmployee(emp.id, { ...fullEmp, status: 'Ativo', isActive: true });
                                    if (res.success) {
                                      await deleteAct(act.id);
                                      setConfirmModal({
                                        isOpen: true,
                                        title: 'Sucesso',
                                        message: 'Funcionário reativado com sucesso!',
                                        onConfirm: () => setConfirmModal({ isOpen: false }),
                                        hideCancel: true,
                                        confirmText: 'OK'
                                      });
                                    } else {
                                      setConfirmModal({
                                        isOpen: true,
                                        title: 'Erro',
                                        message: 'Erro ao reativar: ' + res.error,
                                        onConfirm: () => setConfirmModal({ isOpen: false }),
                                        hideCancel: true,
                                        confirmText: 'OK',
                                        isDestructive: true
                                      });
                                    }
                                  }
                                });
                              }}
                              style={styles.btnReactivate}
                              title="Reativar funcionário"
                            >
                              Reativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={styles.emptyState}>
                    {searchTerm ? 'Nenhum registo encontrado para a pesquisa.' : emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
        hideCancel={confirmModal.hideCancel}
        confirmText={confirmModal.confirmText}
      />

      <EmployeeSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        employees={employees} 
        onSelect={handleSelectEmployee} 
      />

      {selectedEmp && (
        <AdminActWizard 
          emp={selectedEmp} 
          orgData={{ data: orgData }} 
          allowedActTypes={actTypes}
          onClose={handleCloseWizard} 
          onActRegistered={handleCloseWizard}
        />
      )}
    </div>
  );
}

function formatActType(type) {
  const map = {
    'promocao': 'Promoção',
    'progressao': 'Progressão',
    'mudanca_carreira': 'Mudança de Carreira',
    'reserva': 'Passagem à Reserva',
    'reforma': 'Passagem à Reforma',
    'saude': 'Junta de Saúde',
    'obito': 'Óbito'
  };
  return map[type] || type;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  tabBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    borderColor: 'var(--color-primary)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  searchInput: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    width: '300px',
    fontSize: '14px',
    outline: 'none',
  },
  btnAdd: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'all 0.2s',
  },
  cardsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  cardIconBox: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardIconBoxBlue: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardIconBoxGreen: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardIconBoxPurple: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardValue: { fontSize: '20px', fontWeight: '800', color: 'var(--color-text-main)', lineHeight: '1', marginBottom: '4px' },
  cardTitle: { fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    flex: 1,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    color: '#4a5568',
    fontWeight: '600',
    fontSize: '14px',
    borderBottom: '2px solid #edf2f7',
  },
  tr: {
    borderBottom: '1px solid #edf2f7',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#2d3748',
    verticalAlign: 'middle',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#ebf4ff',
    color: '#3182ce',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '600',
  },
  btnReactivate: {
    padding: '4px 8px',
    backgroundColor: '#fff',
    color: '#059669',
    border: '1px solid #059669',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  btnExport: {
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-main)',
    border: '1px solid var(--color-border)',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryText: { fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' },
  secondaryText: { fontSize: '13px', color: '#64748b' },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: '15px',
  }
};
