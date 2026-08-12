import React, { useState, useMemo } from 'react';
import ConfirmModal from '../ConfirmModal';
import DraggableModal from '../common/DraggableModal';
import EmployeeDetailsModal from './EmployeeDetailsModal';
import useAdminActsData from '../../hooks/useAdminActsData';
import { showToast } from '../common/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function EmployeeDeletedTab({ employees = [], orgData, onRestore, onPermanentDelete, onRefresh }) {
  const { registerAct } = useAdminActsData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Expulso' | 'Demitido' | 'Falecido' | 'Apagado'
  
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, employee: null });
  const [restoreModal, setRestoreModal] = useState({ isOpen: false, employee: null });
  const [viewDetailsEmp, setViewDetailsEmp] = useState(null);
  
  const [dispatchNumber, setDispatchNumber] = useState('');
  const [reintegrationReason, setReintegrationReason] = useState('');
  const [fileB64, setFileB64] = useState(null);

  // Lista base de funcionários eliminados ou desvinculados
  const deletedEmployees = useMemo(() => {
    return (employees || []).filter(e => ['Apagado', 'Demitido', 'Expulso', 'Falecido'].includes(e.status));
  }, [employees]);

  // Totais agregados
  const stats = useMemo(() => {
    const totals = { Expulso: 0, Demitido: 0, Falecido: 0, Apagado: 0 };
    const byMonthYear = {};

    deletedEmployees.forEach(emp => {
      const st = emp.status === 'Apagado' ? 'Apagado' : emp.status;
      if (totals[st] !== undefined) totals[st]++;

      const date = new Date(emp.updatedAt || emp.createdAt || Date.now());
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;

      if (!byMonthYear[key]) {
        byMonthYear[key] = { Expulso: 0, Demitido: 0, Falecido: 0, Apagado: 0 };
      }
      if (byMonthYear[key][st] !== undefined) {
        byMonthYear[key][st]++;
      }
    });

    const sortedKeys = Object.keys(byMonthYear).sort().reverse();
    return { totals, byMonthYear, sortedKeys };
  }, [deletedEmployees]);

  // Lista filtrada
  const filteredList = useMemo(() => {
    return deletedEmployees.filter(emp => {
      // Filtro de estado
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Apagado' && emp.status !== 'Apagado') return false;
        if (statusFilter !== 'Apagado' && emp.status !== statusFilter) return false;
      }
      // Pesquisa por texto (Nome, NUIT, NIP)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const nameMatch = emp.name?.toLowerCase().includes(term);
        const nipMatch = emp.nip?.toLowerCase().includes(term);
        const nuitMatch = emp.nuit?.toLowerCase().includes(term);
        if (!nameMatch && !nipMatch && !nuitMatch) return false;
      }
      return true;
    });
  }, [deletedEmployees, statusFilter, searchTerm]);

  const getName = (list, id) => list?.find(item => item.id === id)?.name || '-';

  const handleDeleteClick = (emp) => {
    setConfirmModal({
      isOpen: true,
      employee: emp
    });
  };

  const executePermanentDelete = async () => {
    if (confirmModal.employee) {
      const res = await onPermanentDelete(confirmModal.employee.id);
      if (res?.success !== false) {
        showToast(`Funcionário ${confirmModal.employee.name} eliminado permanentemente.`, 'success');
      } else {
        showToast(res?.error || 'Erro ao eliminar permanentemente.', 'error');
      }
      setConfirmModal({ isOpen: false, employee: null });
      if (onRefresh) onRefresh();
    }
  };

  const handleRestoreClick = (emp) => {
    if (emp.status === 'Apagado') {
      // Direct restore instantânea
      onRestore(emp.id);
      showToast(`Funcionário ${emp.name} restaurado com sucesso!`, 'success');
      if (onRefresh) onRefresh();
    } else {
      // Demitido ou Expulso -> Requer Despacho
      setDispatchNumber('');
      setReintegrationReason(`Reintegração funcional de funcionário ${emp.status}`);
      setFileB64(null);
      setRestoreModal({ isOpen: true, employee: emp });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFileB64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const submitReintegration = async (e) => {
    e.preventDefault();
    if (!fileB64) {
      showToast('É obrigatório anexar o Despacho oficial de Reintegração.', 'warning');
      return;
    }
    
    // Registar o Acto Administrativo "Reintegração" em estado Pendente
    const actData = {
      employeeId: restoreModal.employee.id,
      actType: 'Reintegração',
      group_name: 'Provimento e Cessação',
      details: {
        documentB64: fileB64,
        dispatchNumber: dispatchNumber || 'N/D',
        motivo: reintegrationReason || `Reintegração de funcionário ${restoreModal.employee.status}`,
        status: 'Pendente'
      },
      date: new Date().toISOString()
    };
    
    await registerAct(actData);
    showToast('Despacho de Reintegração submetido! O processo aguarda confirmação superior.', 'success', 6000);
    setRestoreModal({ isOpen: false, employee: null });
    setFileB64(null);
    if (onRefresh) onRefresh();
  };

  // Exportação Excel
  const exportExcel = () => {
    const exportData = filteredList.map(emp => ({
      'NUIT / NIP': emp.nip || emp.nuit || '-',
      'Funcionário': emp.name,
      'Género': emp.gender || '-',
      'Motivo / Estado': emp.status,
      'Direcção': getName(orgData?.directorates, emp.directorateId),
      'Departamento': getName(orgData?.departments, emp.departmentId),
      'Data de Registo': emp.updatedAt ? new Date(emp.updatedAt).toLocaleDateString('pt-PT') : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Eliminados");
    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-');
    XLSX.writeFile(workbook, `Funcionarios_Eliminados_${dateStr}.xlsx`);
  };

  // Exportação PDF
  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Relatório de Funcionários Eliminados e Desvinculados', 14, 15);
    doc.setFontSize(10);
    doc.text(`Total Registados: ${filteredList.length} | Emitido em: ${new Date().toLocaleDateString('pt-PT')}`, 14, 22);

    const tableColumn = ["NUIT/NIP", "Nome", "Género", "Motivo/Estado", "Direcção", "Departamento"];
    const tableRows = [];

    filteredList.forEach(emp => {
      tableRows.push([
        emp.nip || emp.nuit || '-',
        emp.name,
        emp.gender || '-',
        emp.status,
        getName(orgData?.directorates, emp.directorateId),
        getName(orgData?.departments, emp.departmentId)
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [185, 28, 28] }
    });

    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-');
    doc.save(`Relatorio_Funcionarios_Eliminados_${dateStr}.pdf`);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#991b1b', margin: '0 0 4px 0' }}>
            Funcionários Eliminados e Desvinculados ({filteredList.length})
          </h3>
          <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '13px' }}>
            Gestão profissional de registos desvinculados, processos de reintegração por despacho e exclusão definitiva.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportExcel} style={styles.btnTool}>📊 Excel</button>
          <button onClick={exportPDF} style={styles.btnTool}>📄 PDF</button>
          <button onClick={() => window.print()} style={styles.btnTool}>🖨️ Imprimir</button>
        </div>
      </div>

      {/* Cartões de Indicadores Interativos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div 
          onClick={() => setStatusFilter('ALL')}
          style={{
            ...styles.statCard,
            borderColor: statusFilter === 'ALL' ? 'var(--color-primary)' : 'var(--color-border)',
            backgroundColor: statusFilter === 'ALL' ? 'rgba(37, 99, 235, 0.04)' : 'var(--color-bg-card)'
          }}
        >
          <div style={styles.statTitle}>TODOS ELIMINADOS</div>
          <div style={{ ...styles.statValue, color: 'var(--color-primary)' }}>{deletedEmployees.length}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Expulso')}
          style={{
            ...styles.statCard,
            borderColor: statusFilter === 'Expulso' ? '#ef4444' : 'var(--color-border)',
            backgroundColor: statusFilter === 'Expulso' ? 'rgba(239, 68, 68, 0.06)' : 'var(--color-bg-card)'
          }}
        >
          <div style={styles.statTitle}>EXPULSOS</div>
          <div style={{ ...styles.statValue, color: '#dc2626' }}>{stats.totals.Expulso}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Demitido')}
          style={{
            ...styles.statCard,
            borderColor: statusFilter === 'Demitido' ? '#f97316' : 'var(--color-border)',
            backgroundColor: statusFilter === 'Demitido' ? 'rgba(249, 115, 22, 0.06)' : 'var(--color-bg-card)'
          }}
        >
          <div style={styles.statTitle}>DEMITIDOS</div>
          <div style={{ ...styles.statValue, color: '#ea580c' }}>{stats.totals.Demitido}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Falecido')}
          style={{
            ...styles.statCard,
            borderColor: statusFilter === 'Falecido' ? '#64748b' : 'var(--color-border)',
            backgroundColor: statusFilter === 'Falecido' ? 'rgba(100, 116, 139, 0.06)' : 'var(--color-bg-card)'
          }}
        >
          <div style={styles.statTitle}>FALECIDOS</div>
          <div style={{ ...styles.statValue, color: '#475569' }}>{stats.totals.Falecido}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Apagado')}
          style={{
            ...styles.statCard,
            borderColor: statusFilter === 'Apagado' ? '#eab308' : 'var(--color-border)',
            backgroundColor: statusFilter === 'Apagado' ? 'rgba(234, 179, 8, 0.06)' : 'var(--color-bg-card)'
          }}
        >
          <div style={styles.statTitle}>APAGADOS (ERRO)</div>
          <div style={{ ...styles.statValue, color: '#ca8a04' }}>{stats.totals.Apagado}</div>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Pesquisar por Nome ou NUIT..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />

        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.selectFilter}
        >
          <option value="ALL">Todos os Motivos</option>
          <option value="Expulso">Expulso</option>
          <option value="Demitido">Demitido</option>
          <option value="Falecido">Falecido</option>
          <option value="Apagado">Apagado (Erro)</option>
        </select>

        {(searchTerm || statusFilter !== 'ALL') && (
          <button 
            onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
            style={{ fontSize: '13px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Histórico Mensal */}
      {stats.sortedKeys.length > 0 && (
        <div style={{ marginBottom: '20px', backgroundColor: 'var(--color-bg-base)', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
             Histórico Cronológico de Cessação
          </div>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
            {stats.sortedKeys.map(key => {
              const row = stats.byMonthYear[key];
              return (
                <div key={key} style={{ minWidth: '130px', backgroundColor: 'var(--color-bg-card)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', flexShrink: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '6px', color: 'var(--color-primary)' }}>{key}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-base)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {row.Expulso > 0 && <div>Expulsos: <b style={{color:'#dc2626'}}>{row.Expulso}</b></div>}
                    {row.Demitido > 0 && <div>Demitidos: <b style={{color:'#ea580c'}}>{row.Demitido}</b></div>}
                    {row.Falecido > 0 && <div>Falecidos: <b style={{color:'#475569'}}>{row.Falecido}</b></div>}
                    {row.Apagado > 0 && <div>Apagados: <b style={{color:'#ca8a04'}}>{row.Apagado}</b></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela de Funcionários Eliminados */}
      {filteredList.length === 0 ? (
        <div style={{ padding: '45px 20px', textAlign: 'center', backgroundColor: 'var(--color-bg-base)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📂</div>
          <h4 style={{ margin: '0 0 6px 0', color: 'var(--color-text-base)', fontSize: '16px' }}>Nenhum funcionário eliminado encontrado.</h4>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '13px' }}>Ajuste os filtros de pesquisa para localizar registos desvinculados.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <table className="premium-table">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)' }}>NUIT / NIP</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)' }}>FUNCIONÁRIO</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)' }}>DIRECÇÃO / COLOCAÇÃO</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)' }}>MOTIVO DE CESSAÇÃO</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', textAlign: 'right' }}>AÇÕES CRUD</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(emp => {
                const dir = orgData?.directorates?.find(d => String(d.id) === String(emp.directorateId));
                const isApagado = emp.status === 'Apagado';
                
                let badgeBg = 'rgba(239, 68, 68, 0.1)';
                let badgeColor = '#dc2626';
                if (emp.status === 'Demitido') { badgeBg = 'rgba(249, 115, 22, 0.1)'; badgeColor = '#ea580c'; }
                else if (emp.status === 'Falecido') { badgeBg = 'rgba(100, 116, 139, 0.1)'; badgeColor = '#475569'; }
                else if (emp.status === 'Apagado') { badgeBg = 'rgba(234, 179, 8, 0.1)'; badgeColor = '#ca8a04'; }

                const initials = emp.name ? emp.name.split(' ').map(n => n[0]).slice(0,2).join('') : '?';

                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' }}>
                      {emp.nip || emp.nuit || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', fontSize: '12px', flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-base)' }}>{emp.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{emp.role || 'Sem Cargo'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      {dir?.name || 'Direcção Provincial'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                        backgroundColor: badgeBg, color: badgeColor
                      }}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* Ver Ficha Completa */}
                        <button
                          onClick={() => setViewDetailsEmp(emp)}
                          style={styles.btnActionIcon}
                          title="Visualizar Ficha Completa"
                        >
                          👁️
                        </button>

                        {/* Restaurar / Submeter Reintegração */}
                        <button 
                          onClick={() => handleRestoreClick(emp)}
                          style={styles.btnRestore}
                          title={isApagado ? 'Restaurar funcionário' : 'Submeter Despacho de Reintegração'}
                        >
                          {isApagado ? '🔄 Restaurar' : '✍️ Reintegrar'}
                        </button>

                        {/* Apagar Permanentemente */}
                        <button 
                          onClick={() => handleDeleteClick(emp)}
                          style={styles.btnDelete}
                          title="Apagar permanentemente da base de dados"
                        >
                          🗑️ Apagar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ficha de Detalhes do Funcionário Eliminado */}
      {viewDetailsEmp && (
        <EmployeeDetailsModal
          emp={viewDetailsEmp}
          orgData={orgData}
          onClose={() => setViewDetailsEmp(null)}
          onRefresh={onRefresh}
          showRegisterAct={false}
        />
      )}

      {/* Modal Confirmar Ação Destrutiva Definitiva */}
      {confirmModal.isOpen && (
        <ConfirmModal 
          isOpen={true}
          title="Eliminar Permanentemente o Registar"
          message={`Tem a certeza absoluta que deseja APAGAR PERMANENTEMENTE o funcionário "${confirmModal.employee?.name}"? Esta ação removerá definitivamente todo o seu histórico funcional e é IRREVERSÍVEL.`}
          confirmText="Eliminar Definitivamente"
          isDestructive={true}
          onConfirm={executePermanentDelete}
          onCancel={() => setConfirmModal({ isOpen: false, employee: null })}
        />
      )}

      {/* Modal de Reintegração por Despacho */}
      <DraggableModal
        isOpen={restoreModal.isOpen}
        title="Processo de Reintegração Funcional"
        onClose={() => setRestoreModal({ isOpen: false, employee: null })}
        maxWidth="500px"
      >
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '18px', lineHeight: '1.5' }}>
          Para instaurar o processo de reintegração do funcionário <strong>{restoreModal.employee?.name}</strong> (Estado atual: {restoreModal.employee?.status}), preencha o número do despacho oficial e anexe a documentação.
        </p>

        <form onSubmit={submitReintegration}>
          <div style={{ marginBottom: '16px' }}>
            <label style={styles.modalLabel}>Número do Despacho Oficial *</label>
            <input 
              type="text" 
              required
              placeholder="Ex: Despacho Nº 142/DRH/2026"
              value={dispatchNumber}
              onChange={(e) => setDispatchNumber(e.target.value)}
              style={styles.modalInput}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={styles.modalLabel}>Justificação / Motivo *</label>
            <textarea 
              required
              rows={3}
              value={reintegrationReason}
              onChange={(e) => setReintegrationReason(e.target.value)}
              style={{ ...styles.modalInput, resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={styles.modalLabel}>Documento Oficial Anexo (PDF/Imagem) *</label>
            <input 
              type="file" 
              accept=".pdf,image/*" 
              onChange={handleFileChange}
              style={{ width: '100%', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button 
              type="button" 
              onClick={() => setRestoreModal({ isOpen: false, employee: null })}
              style={styles.btnCancelModal}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              style={styles.btnSubmitModal}
            >
              ✍️ Submeter Reintegração
            </button>
          </div>
        </form>
      </DraggableModal>
    </div>
  );
}

const styles = {
  btnTool: {
    padding: '8px 14px',
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-base)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  statCard: {
    backgroundColor: 'var(--color-bg-card)',
    padding: '14px 18px',
    borderRadius: '8px',
    border: '1.5px solid var(--color-border)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  statTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '800',
    lineHeight: '1.2'
  },
  searchInput: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-base)',
    fontSize: '13px',
    minWidth: '260px'
  },
  selectFilter: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-base)',
    fontSize: '13px'
  },
  btnActionIcon: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    cursor: 'pointer',
    padding: '6px 10px',
    fontSize: '14px'
  },
  btnRestore: {
    padding: '6px 12px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
  },
  btnDelete: {
    padding: '6px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#dc2626',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
  },
  modalLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-base)',
    marginBottom: '6px'
  },
  modalInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-base)',
    fontSize: '13px',
    boxSizing: 'border-box'
  },
  btnCancelModal: {
    padding: '9px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    color: 'var(--color-text-base)'
  },
  btnSubmitModal: {
    padding: '9px 18px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px'
  }
};
