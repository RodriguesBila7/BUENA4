import React, { useState, useMemo, useEffect, useCallback } from 'react';
import useEmployeeData from '../../../hooks/useEmployeeData';
import useOrgData from '../../../hooks/useOrgData';
import { useAuth } from '../../../contexts/AuthContext';
import { isPrimaryCentralAdmin } from '../../../utils/scopeUtils';
import ProvimentoCessacaoViewModal from './ProvimentoCessacaoViewModal';
import DespachoModal from './DespachoModal';
import ApprovalModal from './ApprovalModal';
import ProvimentoCessacaoWizard from './ProvimentoCessacaoWizard';
import ConfirmModal from '../../ConfirmModal';
import { showToast } from '../../common/Toast';
import { exportToExcel } from '../../../utils/excelExport';

export default function ProvimentoCessacaoManager({ actsInGroup }) {
  const { employees, refetch: refetchEmployees } = useEmployeeData();
  const { data: orgData } = useOrgData();
  const { user } = useAuth();
  const isPrimary = isPrimaryCentralAdmin(user);

  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'nomeacao' | 'cessacao' | 'reintegracao' | 'stats'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modals state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [viewingAct, setViewingAct] = useState(null);
  const [despachoAct, setDespachoAct] = useState(null);
  const [approvalModalData, setApprovalModalData] = useState({ isOpen: false, act: null, mode: 'approve' });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, actId: null });

  // Carregar todos os atos do grupo "Provimento e Cessação"
  const fetchActs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-acts');
      if (res.ok) {
        const data = await res.json();
        const provimentoActs = (data || []).filter(a => 
          a.group === 'Provimento e Cessação' || 
          ['Nomeação', 'Cessação de Funções', 'Reintegração', 'Recondução', 'Designação', 'Exoneração'].includes(a.actType)
        );
        setActs(provimentoActs);
      }
    } catch (e) {
      console.error('Erro ao carregar processos de provimento:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActs();
  }, [fetchActs]);

  // Handler: Criar processo
  const handleCreateProcess = async (payload) => {
    try {
      const res = await fetch('/api/admin-acts/provimento/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchActs();
        if (refetchEmployees) await refetchEmployees();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // Handler: Inserir Despacho
  const handleSaveDespacho = async (actId, payload) => {
    try {
      const res = await fetch(`/api/admin-acts/provimento/${actId}/despacho`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchActs();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // Handler: Aprovação / Rejeição
  const handleApprovalAction = async (actId, payload) => {
    try {
      const endpoint = payload.isRejection ? `/api/admin-acts/provimento/${actId}/reject` : `/api/admin-acts/provimento/${actId}/approve`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchActs();
        if (refetchEmployees) await refetchEmployees();
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // Handler: Apagar processo
  const handleDeleteAct = async (actId) => {
    try {
      const res = await fetch(`/api/admin-acts/${actId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Processo eliminado com sucesso.', 'info');
        await fetchActs();
      } else {
        showToast('Erro ao eliminar processo.', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Filtragem dos Registos
  const filteredActs = useMemo(() => {
    return acts.filter(act => {
      // Sub-aba
      if (activeTab === 'nomeacao' && act.actType !== 'Nomeação') return false;
      if (activeTab === 'cessacao' && act.actType !== 'Cessação de Funções') return false;
      if (activeTab === 'reintegracao' && act.actType !== 'Reintegração') return false;

      // Status Filter
      if (statusFilter !== 'todos') {
        if (statusFilter === 'finalizado' && !['Finalizado', 'Aprovado', 'Confirmado'].includes(act.status)) return false;
        if (statusFilter === 'pendente_aprovacao' && act.status !== 'Pendente de Aprovação') return false;
        if (statusFilter === 'pendente_despacho' && act.status !== 'Pendente de Despacho') return false;
        if (statusFilter === 'rejeitado' && act.status !== 'Rejeitado') return false;
      }

      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const empName = (act.employeeName || '').toLowerCase();
        const nuit = (act.employeeNuit || '').toLowerCase();
        const role = (act.details?.newRole || act.details?.newCargo || act.details?.previousRole || '').toLowerCase();
        const despacho = (act.despacho || '').toLowerCase();
        return empName.includes(term) || nuit.includes(term) || role.includes(term) || despacho.includes(term);
      }

      return true;
    });
  }, [acts, activeTab, statusFilter, searchTerm]);

  // Contadores Métricas
  const stats = useMemo(() => {
    const total = acts.length;
    const pendenteDespacho = acts.filter(a => a.status === 'Pendente de Despacho').length;
    const pendenteAprovacao = acts.filter(a => a.status === 'Pendente de Aprovação').length;
    const finalizados = acts.filter(a => ['Finalizado', 'Aprovado', 'Confirmado'].includes(a.status)).length;
    const rejeitados = acts.filter(a => a.status === 'Rejeitado').length;
    return { total, pendenteDespacho, pendenteAprovacao, finalizados, rejeitados };
  }, [acts]);

  // Exportar para Excel
  const handleExportExcel = () => {
    const exportData = filteredActs.map(a => {
      const app1 = a.approvals?.super_admin_1?.approved ? 'Sim' : 'Não';
      const app2 = a.approvals?.admin_1?.approved ? 'Sim' : 'Não';
      const app3 = a.approvals?.admin_2?.approved ? 'Sim' : 'Não';

      return {
        'ID Processo': a.id,
        'Tipo de Acto': a.actType,
        'Funcionário': a.employeeName || '-',
        'NUIT': a.employeeNuit || '-',
        'Data do Acto': a.actDate ? new Date(a.actDate).toLocaleDateString('pt-PT') : '-',
        'Estado': a.status,
        'Despacho DRH': a.despacho || 'Pendente',
        'Data Despacho': a.despachoDate ? new Date(a.despachoDate).toLocaleDateString('pt-PT') : '-',
        'Novo Cargo/Função': a.details?.newRole || a.details?.previousRole || '-',
        'BR': a.details?.brNumber || '-',
        'Aprovação DRH (1/3)': app1,
        'Aprovação Gestão Pessoal (2/3)': app2,
        'Aprovação Técnico Central (3/3)': app3,
      };
    });
    exportToExcel(exportData, 'Processos_Provimento_Cessacao');
  };

  return (
    <div style={styles.container}>
      {/* ═══════════ CABEÇALHO DO MÓDULO ═══════════ */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>👔 Módulo de Provimento e Cessação de Funções</h2>
          <p style={styles.subtitle}>
            Tramitação institucional de <strong>Nomeações, Cessações de Funções e Reintegrações</strong> com exigência de <strong>Despacho DRH</strong> e <strong>Tripla Aprovação Central Obrigatória</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={handleExportExcel} style={styles.btnSecondary}>
            📊 Exportar Excel
          </button>
          <button 
            onClick={() => setWizardOpen(true)} 
            style={styles.btnPrimary}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
          >
            + Novo Processo
          </button>
        </div>
      </div>

      {/* ═══════════ CARTÕES DE MÉTRICAS ═══════════ */}
      <div style={styles.metricsGrid}>
        <div style={{ ...styles.metricCard, borderLeft: '4px solid #1B365D' }}>
          <span style={styles.metricLabel}>Total de Processos</span>
          <span style={styles.metricVal}>{stats.total}</span>
          <span style={styles.metricSub}>Registados no sistema</span>
        </div>

        <div style={{ ...styles.metricCard, borderLeft: '4px solid #F59E0B' }}>
          <span style={styles.metricLabel}>Pendente de Despacho</span>
          <span style={{ ...styles.metricVal, color: '#D97706' }}>{stats.pendenteDespacho}</span>
          <span style={styles.metricSub}>Aguardando emissão DRH</span>
        </div>

        <div style={{ ...styles.metricCard, borderLeft: '4px solid #3B82F6' }}>
          <span style={styles.metricLabel}>Pendente de Aprovação</span>
          <span style={{ ...styles.metricVal, color: '#2563EB' }}>{stats.pendenteAprovacao}</span>
          <span style={styles.metricSub}>Em fase de tripla assinatura</span>
        </div>

        <div style={{ ...styles.metricCard, borderLeft: '4px solid #10B981' }}>
          <span style={styles.metricLabel}>Finalizados / Homologados</span>
          <span style={{ ...styles.metricVal, color: '#059669' }}>{stats.finalizados}</span>
          <span style={styles.metricSub}>Com 3/3 aprovações completas</span>
        </div>

        <div style={{ ...styles.metricCard, borderLeft: '4px solid #EF4444' }}>
          <span style={styles.metricLabel}>Rejeitados</span>
          <span style={{ ...styles.metricVal, color: '#DC2626' }}>{stats.rejeitados}</span>
          <span style={styles.metricSub}>Não homologados</span>
        </div>
      </div>

      {/* ═══════════ SUB-ABAS DE NAVEGAÇÃO ═══════════ */}
      <div style={styles.tabNavRow}>
        <div style={styles.tabsList}>
          {[
            { id: 'todos', label: '📑 Todos os Processos', count: acts.length },
            { id: 'nomeacao', label: '👔 Nomeações', count: acts.filter(a => a.actType === 'Nomeação').length },
            { id: 'cessacao', label: '🛑 Cessações de Funções', count: acts.filter(a => a.actType === 'Cessação de Funções').length },
            { id: 'reintegracao', label: '🔄 Reintegrações', count: acts.filter(a => a.actType === 'Reintegração').length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                ...styles.tabBtn,
                borderBottom: activeTab === t.id ? '3px solid #1B365D' : '3px solid transparent',
                color: activeTab === t.id ? '#1B365D' : '#64748B',
                fontWeight: activeTab === t.id ? '700' : '500',
              }}
            >
              {t.label} <span style={styles.tabBadge}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ BARRA DE FILTROS ═══════════ */}
      <div style={styles.filterBar}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="🔍 Pesquisar por funcionário, NUIT, cargo ou despacho..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Estado:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="todos">Todos os Estados</option>
            <option value="pendente_despacho">Pendente de Despacho DRH</option>
            <option value="pendente_aprovacao">Pendente de Aprovação</option>
            <option value="finalizado">Finalizados / Aprovados (3/3)</option>
            <option value="rejeitado">Rejeitados</option>
          </select>
        </div>
      </div>

      {/* ═══════════ TABELA DE PROCESSOS ═══════════ */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingBox}>
            <span>A carregar processos...</span>
          </div>
        ) : filteredActs.length === 0 ? (
          <div style={styles.emptyBox}>
            <span style={{ fontSize: '32px' }}>📂</span>
            <p style={{ margin: '8px 0 0', fontWeight: '600', color: '#334155' }}>Nenhum processo encontrado.</p>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8' }}>
              Utilize o botão "+ Novo Processo" para registar uma nova proposta de Nomeação, Cessação de Funções ou Reintegração.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>PROCESSO / DATA</th>
                  <th style={styles.th}>FUNCIONÁRIO</th>
                  <th style={styles.th}>TIPO DE ACTO</th>
                  <th style={styles.th}>CARGO / DETALHES</th>
                  <th style={styles.th}>DESPACHO DRH</th>
                  <th style={styles.th}>TRIPLA APROVAÇÃO</th>
                  <th style={styles.th}>ESTADO</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>ACÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filteredActs.map(act => {
                  const emp = employees.find(e => String(e.id) === String(act.employeeId));
                  const app1 = Boolean(act.approvals?.super_admin_1?.approved);
                  const app2 = Boolean(act.approvals?.admin_1?.approved);
                  const app3 = Boolean(act.approvals?.admin_2?.approved);
                  const approvedCount = [app1, app2, app3].filter(Boolean).length;

                  return (
                    <tr key={act.id} style={styles.tr}>
                      {/* Processo / Data */}
                      <td style={styles.td}>
                        <span style={styles.actId}>{act.id}</span>
                        <span style={styles.actDate}>
                          {act.actDate ? new Date(act.actDate).toLocaleDateString('pt-PT') : '-'}
                        </span>
                      </td>

                      {/* Funcionário */}
                      <td style={styles.td}>
                        <strong style={{ color: '#0F172A', display: 'block' }}>{act.employeeName || emp?.name || 'Desconhecido'}</strong>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          NUIT: {act.employeeNuit || emp?.nuit || '-'}
                        </span>
                      </td>

                      {/* Tipo de Acto */}
                      <td style={styles.td}>
                        <span style={{
                          ...styles.typeTag,
                          backgroundColor: act.actType === 'Nomeação' ? '#EFF6FF' : act.actType === 'Cessação de Funções' ? '#FFF1F2' : '#F0FDF4',
                          color: act.actType === 'Nomeação' ? '#1D4ED8' : act.actType === 'Cessação de Funções' ? '#BE123C' : '#15803D',
                          borderColor: act.actType === 'Nomeação' ? '#BFDBFE' : act.actType === 'Cessação de Funções' ? '#FECDD3' : '#BBF7D0'
                        }}>
                          {act.actType}
                        </span>
                      </td>

                      {/* Cargo / Detalhes */}
                      <td style={styles.td}>
                        <span style={{ fontWeight: '600', color: '#1B365D', display: 'block', fontSize: '12px' }}>
                          {act.details?.newRole || act.details?.newCargo || act.details?.previousRole || '-'}
                        </span>
                        {act.details?.brNumber && (
                          <span style={{ fontSize: '11px', color: '#64748B' }}>BR: {act.details.brNumber}</span>
                        )}
                      </td>

                      {/* Despacho DRH */}
                      <td style={styles.td}>
                        {act.despacho ? (
                          <div style={styles.despachoSnippet} title={act.despacho}>
                            <span style={{ color: '#059669', fontWeight: '700' }}>✓ Emitido</span>
                            <span style={{ display: 'block', fontSize: '11px', color: '#475569', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {act.despacho}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#D97706', fontWeight: '600' }}>
                            ⏳ Pendente
                          </span>
                        )}
                      </td>

                      {/* Tripla Aprovação */}
                      <td style={styles.td}>
                        <div style={styles.approvalPillsWrapper}>
                          <div style={styles.approvalPillRow}>
                            <span 
                              style={{ ...styles.pillMini, backgroundColor: app1 ? '#DCFCE7' : '#F1F5F9', color: app1 ? '#15803D' : '#94A3B8' }}
                              title={app1 ? `Chefe DRH Aprovou a ${new Date(act.approvals.super_admin_1.date).toLocaleString('pt-PT')}` : 'Chefe DRH: Pendente'}
                            >
                              DRH {app1 ? '✓' : '…'}
                            </span>
                            <span 
                              style={{ ...styles.pillMini, backgroundColor: app2 ? '#DCFCE7' : '#F1F5F9', color: app2 ? '#15803D' : '#94A3B8' }}
                              title={app2 ? `Chefe Gestão Pessoal Aprovou a ${new Date(act.approvals.admin_1.date).toLocaleString('pt-PT')}` : 'Chefe Gestão Pessoal: Pendente'}
                            >
                              Gestão {app2 ? '✓' : '…'}
                            </span>
                            <span 
                              style={{ ...styles.pillMini, backgroundColor: app3 ? '#DCFCE7' : '#F1F5F9', color: app3 ? '#15803D' : '#94A3B8' }}
                              title={app3 ? `Técnico Central Aprovou a ${new Date(act.approvals.admin_2.date).toLocaleString('pt-PT')}` : 'Técnico Central: Pendente'}
                            >
                              Técnico {app3 ? '✓' : '…'}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#475569', fontWeight: '600', marginTop: '2px', display: 'block' }}>
                            {approvedCount}/3 assinaturas
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor:
                            ['Finalizado', 'Aprovado', 'Confirmado'].includes(act.status) ? '#ECFDF5' :
                            act.status === 'Pendente de Aprovação' ? '#EFF6FF' :
                            act.status === 'Pendente de Despacho' ? '#FFFBEB' :
                            act.status === 'Rejeitado' ? '#FEF2F2' : '#F3F4F6',
                          color:
                            ['Finalizado', 'Aprovado', 'Confirmado'].includes(act.status) ? '#059669' :
                            act.status === 'Pendente de Aprovação' ? '#1D4ED8' :
                            act.status === 'Pendente de Despacho' ? '#B45309' :
                            act.status === 'Rejeitado' ? '#B91C1C' : '#374151',
                          borderColor:
                            ['Finalizado', 'Aprovado', 'Confirmado'].includes(act.status) ? '#A7F3D0' :
                            act.status === 'Pendente de Aprovação' ? '#BFDBFE' :
                            act.status === 'Pendente de Despacho' ? '#FDE68A' :
                            act.status === 'Rejeitado' ? '#FECACA' : '#E5E7EB',
                        }}>
                          {act.status}
                        </span>
                      </td>

                      {/* Acções */}
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                          {/* Visualizar */}
                          <button
                            onClick={() => setViewingAct(act)}
                            style={styles.actionBtnIcon}
                            title="Visualizar Detalhes e Matriz de Aprovação"
                          >
                            👁️
                          </button>

                          {/* Inserir Despacho (Primary only, if pending) */}
                          {isPrimary && (!act.despacho || act.status === 'Pendente de Despacho') && (
                            <button
                              onClick={() => setDespachoAct(act)}
                              style={{ ...styles.actionBtnIcon, backgroundColor: '#EFF6FF', color: '#1D4ED8' }}
                              title="Inserir Despacho DRH"
                            >
                              📜
                            </button>
                          )}

                          {/* Conceder Aprovação (Primary only, if pending approval) */}
                          {isPrimary && act.status === 'Pendente de Aprovação' && (
                            <button
                              onClick={() => setApprovalModalData({ isOpen: true, act, mode: 'approve' })}
                              style={{ ...styles.actionBtnIcon, backgroundColor: '#ECFDF5', color: '#059669' }}
                              title="Registar Aprovação"
                            >
                              ✍️
                            </button>
                          )}

                          {/* Rejeitar Processo (Primary only, if pending approval) */}
                          {isPrimary && act.status === 'Pendente de Aprovação' && (
                            <button
                              onClick={() => setApprovalModalData({ isOpen: true, act, mode: 'reject' })}
                              style={{ ...styles.actionBtnIcon, backgroundColor: '#FEF2F2', color: '#DC2626' }}
                              title="Rejeitar Processo"
                            >
                              🚫
                            </button>
                          )}

                          {/* Apagar (Primary only) */}
                          {isPrimary && (
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, actId: act.id })}
                              style={{ ...styles.actionBtnIcon, color: '#94A3B8' }}
                              title="Eliminar Processo"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════ MODAIS ═══════════ */}
      {/* 1. Modal Wizard de Novo Processo */}
      {wizardOpen && (
        <ProvimentoCessacaoWizard
          onClose={() => setWizardOpen(false)}
          onSave={handleCreateProcess}
          employees={employees}
          orgData={orgData}
          currentUser={user}
          isPrimary={isPrimary}
        />
      )}

      {/* 2. Modal de Visualização Detalhada */}
      {viewingAct && (
        <ProvimentoCessacaoViewModal
          act={viewingAct}
          employee={employees.find(e => String(e.id) === String(viewingAct.employeeId))}
          onClose={() => setViewingAct(null)}
          onOpenDespacho={(a) => { setViewingAct(null); setDespachoAct(a); }}
          onOpenApproval={(a, mode) => { setViewingAct(null); setApprovalModalData({ isOpen: true, act: a, mode }); }}
          currentUser={user}
          isPrimary={isPrimary}
        />
      )}

      {/* 3. Modal de Despacho DRH */}
      {despachoAct && (
        <DespachoModal
          act={despachoAct}
          onClose={() => setDespachoAct(null)}
          onSaveDespacho={handleSaveDespacho}
          currentUser={user}
        />
      )}

      {/* 4. Modal de Aprovação / Rejeição */}
      {approvalModalData.isOpen && (
        <ApprovalModal
          act={approvalModalData.act}
          mode={approvalModalData.mode}
          onClose={() => setApprovalModalData({ isOpen: false, act: null, mode: 'approve' })}
          onConfirmApproval={handleApprovalAction}
          currentUser={user}
        />
      )}

      {/* 5. Modal de Confirmação de Exclusão */}
      {deleteConfirm.isOpen && (
        <ConfirmModal
          isOpen={true}
          title="Eliminar Processo"
          message="Tem a certeza que pretende eliminar permanentemente este registo de processo?"
          isDestructive={true}
          onConfirm={async () => {
            await handleDeleteAct(deleteConfirm.actId);
            setDeleteConfirm({ isOpen: false, actId: null });
          }}
          onClose={() => setDeleteConfirm({ isOpen: false, actId: null })}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#F8FAFC',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '14px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#64748B',
    lineHeight: '1.5',
    maxWidth: '750px',
  },
  btnPrimary: {
    padding: '9px 18px',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  btnSecondary: {
    padding: '9px 16px',
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '14px',
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    padding: '14px 16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  metricLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  metricVal: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0F172A',
  },
  metricSub: {
    fontSize: '11px',
    color: '#94A3B8',
  },
  tabNavRow: {
    borderBottom: '1px solid #E2E8F0',
  },
  tabsList: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    padding: '10px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tabBadge: {
    backgroundColor: '#E2E8F0',
    color: '#475569',
    fontSize: '11px',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '13px',
    outline: 'none',
  },
  selectFilter: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '13px',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px',
  },
  th: {
    padding: '12px 14px',
    backgroundColor: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0',
    color: '#475569',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background-color 0.15s ease',
  },
  td: {
    padding: '12px 14px',
    verticalAlign: 'middle',
  },
  actId: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748B',
    display: 'block',
  },
  actDate: {
    fontSize: '12px',
    color: '#0F172A',
  },
  typeTag: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    border: '1px solid',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    border: '1px solid',
  },
  despachoSnippet: {
    display: 'flex',
    flexDirection: 'column',
  },
  approvalPillsWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  approvalPillRow: {
    display: 'flex',
    gap: '3px',
  },
  pillMini: {
    padding: '2px 5px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '700',
  },
  actionBtnIcon: {
    padding: '6px 8px',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.15s ease',
  },
  loadingBox: {
    padding: '40px',
    textAlign: 'center',
    color: '#64748B',
    fontSize: '14px',
  },
  emptyBox: {
    padding: '50px 20px',
    textAlign: 'center',
    color: '#64748B',
  },
};
