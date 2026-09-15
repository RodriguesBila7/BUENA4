import React, { useState, useMemo } from 'react';
import { exportToExcel } from '../../utils/excelExport';
import ConfirmModal from '../ConfirmModal';
import CrudActionButtons from '../common/CrudActionButtons';

export default function CareerHistoryTab({ acts = [], employees = [], orgData, user, onConfirm, onDelete, onUpdate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirectorate, setFilterDirectorate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterActType, setFilterActType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, onCancel: null, hideCancel: false, isDestructive: false, hasInput: false, inputType: 'text', placeholder: '' });
  const [passwordInput, setPasswordInput] = useState('');

  const showAlert = (title, message) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      hideCancel: true,
      hasInput: false,
      onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
    });
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterDirectorate('');
    setFilterDepartment('');
    setFilterDivision('');
    setFilterActType('');
    setFilterStatus('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm || filterDirectorate || filterDepartment || filterDivision || filterActType || filterStatus
  );

  const careerActs = useMemo(() => {
    return (acts || []).filter(a => a.type === 'promotion' || a.actType === 'Promoção' || a.type === 'progression' || a.actType === 'Progressão' || a.actType === 'Mudança de Carreira').sort((a,b) => new Date(b.date || b.actDate) - new Date(a.date || a.actDate));
  }, [acts]);

  const filtered = useMemo(() => {
    return careerActs.filter(a => {
      const emp = (employees || []).find(e => e.id === a.employeeId);
      if (!emp) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!String(emp.name || '').toLowerCase().includes(term) && !String(emp.nip || emp.nuit || '').includes(term)) {
          return false;
        }
      }

      if (filterDirectorate && String(emp.directorateId) !== String(filterDirectorate)) {
        return false;
      }
      if (filterDepartment && String(emp.departmentId) !== String(filterDepartment)) {
        return false;
      }
      if (filterDivision && String(emp.divisionId) !== String(filterDivision)) {
        return false;
      }

      if (filterActType) {
        const actType = a.actType || a.type;
        if (actType !== filterActType) return false;
      }

      if (filterStatus) {
        const isPending = a.status === 'Pendente' || a.details?.status === 'Pendente';
        if (filterStatus === 'Pendente' && !isPending) return false;
        if (filterStatus === 'Confirmado' && isPending) return false;
      }

      return true;
    });
  }, [careerActs, employees, searchTerm, filterDirectorate, filterDepartment, filterDivision, filterActType, filterStatus]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportExcel = () => {
    const dataToExport = filtered.map(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      const actType = a.actType || a.type;
      const dateStr = a.actDate ? new Date(a.actDate).toLocaleDateString() : (a.date ? new Date(a.date).toLocaleDateString() : '-');
      let detailsStr = '';
      if (actType === 'Promoção' || actType === 'promotion') {
        const newCat = orgData?.categories?.find(c => c.id === a.details?.newCategoryId)?.name || 'Desconhecida';
        detailsStr = `Promovido para: ${newCat} (Nível ${a.details?.newEscalao || 'C'})`;
      } else if (actType === 'Progressão' || actType === 'progression') {
        detailsStr = `Progrediu para: Nível ${a.details?.newEscalao || 'B'}`;
      } else if (actType === 'Mudança de Carreira') {
        const newCareer = orgData?.careers?.find(c => c.id === a.details?.newCareerId)?.name || 'Desconhecida';
        const newCat = orgData?.categories?.find(c => c.id === a.details?.newCategoryId)?.name || 'Desconhecida';
        detailsStr = `Mudança para: ${newCareer} - ${newCat}`;
      }

      return {
        'Data': dateStr,
        'Tipo': actType,
        'NUIT': emp?.nip || emp?.nuit || '-',
        'Nome do Funcionário': emp?.name || '-',
        'Detalhes': detailsStr,
        'Despacho': a.despacho || '-',
        'Estado': a.status || a.details?.status || 'Confirmado',
        'Responsável': a.user || a.userResponsible || 'Sistema'
      };
    });

    exportToExcel(dataToExport, 'Historico_Promocoes_Progressoes');
  };

  const handleAttach = (act, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showAlert("Atenção", "O ficheiro deve ter no máximo 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (onUpdate) {
        // Send the updated document to the act details
        const updatedDetails = { ...act.details, documentB64: reader.result };
        const result = await onUpdate(act.id, { details: updatedDetails });
        if (result && result.success) {
          showAlert("Sucesso", 'Ficheiro anexado com sucesso!');
        } else {
          showAlert("Erro", 'Erro ao anexar ficheiro: ' + (result?.error || 'Desconhecido'));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAction = (actId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Acto Pendente',
      message: 'Tem a certeza que deseja apagar este registo? Esta acção não pode ser revertida.',
      hideCancel: false,
      isDestructive: true,
      hasInput: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (onDelete) {
          const result = await onDelete(actId);
          if (result && result.success) {
            setConfirmModal({
              isOpen: true, title: 'Sucesso', message: 'Acto apagado com sucesso!',
              hideCancel: true, isDestructive: false, hasInput: false,
              onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
          } else {
            setConfirmModal({
              isOpen: true, title: 'Erro', message: 'Erro ao apagar: ' + (result?.error || "Desconhecido"),
              hideCancel: true, isDestructive: false, hasInput: false,
              onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
          }
        }
      },
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleConfirmAction = async (act, hasDoc) => {
    if (!hasDoc) {
      showAlert("Atenção", "Só é possível confirmar este acto após anexar o Documento Comprovativo (PDF ou Imagem).");
      return;
    }
    
    const isSuperAdminUser = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(user?.roleId || user?.role) || user?.username === 'admin';

    if (!isSuperAdminUser) {
      // Normal Admin confirming: moves to "Aguardando Super Admin"
      setConfirmModal({
        isOpen: true,
        title: 'Pré-Confirmação de Administrador',
        message: 'Como Administrador, o seu registo será pré-confirmado, mas o acto continuará pendente até à confirmação final com o código de um Super Administrador.',
        hideCancel: false,
        isDestructive: false,
        hasInput: false,
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          if (onUpdate) {
            await onUpdate(act.id, { details: { ...act.details, adminConfirmed: true } });
            showAlert("Sucesso", "Pré-confirmação registada. Aguarda aprovação final do Super Administrador.");
          }
        },
        onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // Super Admin confirmation
    setPasswordInput('');
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Acto (Aprovação de Super Admin)',
      message: 'Para efectivar este acto e alterar o perfil do funcionário, insira o Código de Confirmação do Super Administrador.',
      hideCancel: false,
      isDestructive: false,
      hasInput: true,
      inputType: 'password',
      placeholder: 'Código de Super Administrador...',
      onConfirm: async (currentPass) => {
        if (!currentPass || currentPass.trim() === '') {
           showAlert("Atenção", "Código obrigatório para confirmar o acto.");
           return;
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (onUpdate) {
          await onUpdate(act.id, { details: { ...act.details, superAdminConfirmed: true, adminConfirmed: true } });
        }
        const result = await onConfirm(act.id);
        if (result && result.success) {
          setConfirmModal({
            isOpen: true, title: 'Sucesso', message: 'Acto confirmado com sucesso e perfil actualizado!',
            hideCancel: true, hasInput: false,
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
          });
        } else {
          setConfirmModal({
            isOpen: true, title: 'Erro', message: 'Erro ao confirmar: ' + (result?.error || "Desconhecido"),
            hideCancel: true, hasInput: false,
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
          });
        }
      },
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleViewDoc = (b64) => {
    const newWindow = window.open();
    if (newWindow) {
      if (b64.startsWith('data:application/pdf')) {
        newWindow.document.write(`<iframe src="${b64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      } else {
        newWindow.document.write(`<img src="${b64}" style="max-width: 100%;" />`);
      }
    }
  };

  // Verificação de Super Administrador baseada em permissions ou role. No sistema SERNIC, role é geralmente accessRole.
  // Assumimos que isSuperAdmin é verificado com:
  const isSuperAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(user?.roleId || user?.role) || user?.username === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={styles.filterCard}>
        <div style={styles.filterCardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <h4 style={styles.filterCardTitle}>Filtros do Histórico de Carreira</h4>
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
            <label style={styles.label}>Tipo de Acto</label>
            <select 
              value={filterActType} 
              onChange={e => { setFilterActType(e.target.value); setCurrentPage(1); }} 
              style={styles.select}
            >
              <option value="">Todos os Tipos</option>
              <option value="Promoção">Promoção</option>
              <option value="Progressão">Progressão</option>
              <option value="Mudança de Carreira">Mudança de Carreira</option>
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
              <option value="Confirmado">Confirmado / Efectivo</option>
              <option value="Pendente">Pendente de Homologação</option>
            </select>
          </div>
        </div>

        <div style={styles.filterFooter}>
          <span style={styles.resultsBadge}>
            📊 <strong>{filtered.length}</strong> {filtered.length === 1 ? 'registo encontrado' : 'registos encontrados'}
          </span>
        </div>
      </div>

      <table className="premium-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Funcionário</th>
            <th>Detalhes</th>
            <th>Despacho</th>
            <th>Estado</th>
            <th>Anexo</th>
            <th>Acção</th>
          </tr>
        </thead>
        <tbody>
          {currentData.length === 0 && (
            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Nenhum histórico encontrado.</td></tr>
          )}
          {currentData.map(a => {
            const emp = employees.find(e => e.id === a.employeeId);
            const actType = a.actType || a.type;
            const dateStr = a.actDate ? new Date(a.actDate).toLocaleDateString() : (a.date ? new Date(a.date).toLocaleDateString() : '-');
            
            let detailsStr = '';
            if (actType === 'Promoção' || actType === 'promotion') {
              const newCat = orgData?.categories?.find(c => c.id === a.details?.newCategoryId)?.name || 'Desconhecida';
              detailsStr = `Promovido para: ${newCat} (Nível ${a.details?.newEscalao || 'C'})`;
            } else if (actType === 'Progressão' || actType === 'progression') {
              detailsStr = `Progrediu para: Nível ${a.details?.newEscalao || 'B'}`;
            } else if (actType === 'Mudança de Carreira') {
              const newCareer = orgData?.careers?.find(c => c.id === a.details?.newCareerId)?.name || 'Desconhecida';
              const newCat = orgData?.categories?.find(c => c.id === a.details?.newCategoryId)?.name || 'Desconhecida';
              detailsStr = `Mudança para: ${newCareer} - ${newCat}`;
            }

            // Força o estado a ser Pendente se não tiver documento e a confirmação do Super Admin
            const isPending = !a.details?.documentB64 || !a.details?.superAdminConfirmed;
            const stateLabel = a.details?.superAdminConfirmed ? 'Confirmado' : (a.details?.adminConfirmed ? 'Aguardando S.A.' : 'Pendente');

            return (
              <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isPending ? '#fffbeb' : 'transparent' }}>
                <td>{dateStr}</td>
                <td>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: actType.includes('Mudança') ? '#f3e8ff' : (actType === 'Promoção' ? '#d1fae5' : '#dbeafe'), color: actType.includes('Mudança') ? '#7e22ce' : (actType === 'Promoção' ? '#065f46' : '#1e40af') }}>
                    {actType}
                  </span>
                </td>
                <td><strong>{emp?.name || '-'}</strong> <br/><small>{emp?.nip || emp?.nuit || '-'}</small></td>
                <td>{detailsStr}</td>
                <td>{a.despacho || '-'}</td>
                <td>
                  <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: isPending ? '#f59e0b' : '#10b981', color: '#fff' }}>
                    {stateLabel}
                  </span>
                </td>
                <td>
                  {a.details?.documentB64 ? (
                    <button onClick={() => handleViewDoc(a.details.documentB64)} style={styles.linkBtn}>Ver Anexo</button>
                  ) : (
                    isPending ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 'bold' }}>Falta Anexo</span>
                        <input type="file" accept=".pdf,image/*" style={{ fontSize: '10px', width: '130px' }} onChange={(e) => handleAttach(a, e)} />
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>Sem anexo</span>
                    )
                  )}
                </td>
                <td>
                  {isPending ? (
                    <CrudActionButtons 
                      onDelete={() => handleDeleteAction(a.id)}
                      extraButtons={
                        isSuperAdmin ? (
                          <button onClick={() => handleConfirmAction(a, !!a.details?.documentB64)} style={styles.confirmActionBtn}>Confirmar</button>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>Aguardando S.Admin</span>
                        )
                      }
                    />
                  ) : (
                    <span style={{ fontSize: '12px', color: '#10b981' }}>Efectivado</span>
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

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => confirmModal.onConfirm(passwordInput)}
        onCancel={confirmModal.onCancel || (() => setConfirmModal(prev => ({...prev, isOpen: false})))}
        hideCancel={confirmModal.hideCancel}
        isDestructive={confirmModal.isDestructive}
        hasInput={confirmModal.hasInput}
        inputType={confirmModal.inputType}
        placeholder={confirmModal.placeholder}
        inputValue={passwordInput}
        onInputChange={setPasswordInput}
      />
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
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: 'var(--color-bg-base)' },
  th: { padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' },
  td: { padding: '12px', borderBottom: '1px solid var(--color-border)' },
  linkBtn: { padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  confirmActionBtn: { padding: '6px 12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  deleteActionBtn: { padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', padding: '10px' },
  pageBtn: { padding: '6px 12px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }
};
