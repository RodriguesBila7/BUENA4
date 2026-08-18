import React from 'react';
import ReactDOM from 'react-dom';
import useDraggable from '../../../hooks/useDraggable';

export default function ProvimentoCessacaoViewModal({ act, employee, onClose, onOpenDespacho, onOpenApproval, currentUser, isPrimary }) {
  const { position, onPointerDown } = useDraggable();

  if (!act) return null;

  const approvals = act.approvals || {
    super_admin_1: { approved: false },
    admin_1: { approved: false },
    admin_2: { approved: false }
  };

  const isApproved1 = Boolean(approvals.super_admin_1?.approved);
  const isApproved2 = Boolean(approvals.admin_1?.approved);
  const isApproved3 = Boolean(approvals.admin_2?.approved);
  const approvedCount = [isApproved1, isApproved2, isApproved3].filter(Boolean).length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Finalizado':
      case 'Aprovado':
      case 'Confirmado':
        return { label: 'Finalizado (3/3)', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'Pendente de Aprovação':
        return { label: `Pendente de Aprovação (${approvedCount}/3)`, bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'Pendente de Despacho':
        return { label: 'Pendente de Despacho DRH', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
      case 'Rejeitado':
        return { label: 'Rejeitado', bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' };
      default:
        return { label: status || 'Rascunho', bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
    }
  };

  const statusBadge = getStatusBadge(act.status);

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div 
        style={{ 
          ...styles.modal, 
          transform: `translate(${position.x}px, ${position.y}px)` 
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header com Drag Handle */}
        <div style={styles.header} onPointerDown={onPointerDown} className="drag-handle">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>
              {act.actType === 'Nomeação' ? '👔' : act.actType === 'Cessação de Funções' ? '🛑' : '🔄'}
            </span>
            <div>
              <h3 style={styles.title}>Processo de {act.actType}</h3>
              <p style={styles.subtitle}>ID: {act.id} • Registado a {new Date(act.createdAt || act.actDate).toLocaleDateString('pt-PT')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              ...styles.badge,
              backgroundColor: statusBadge.bg,
              color: statusBadge.text,
              borderColor: statusBadge.border
            }}>
              {statusBadge.label}
            </span>
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div style={styles.body}>
          {/* Seção 1: Dados do Funcionário */}
          <div style={styles.sectionCard}>
            <h4 style={styles.sectionTitle}>👤 Identificação do Funcionário</h4>
            <div style={styles.empGrid}>
              <div>
                <span style={styles.fieldLabel}>Nome Completo:</span>
                <span style={styles.fieldVal}>{act.employeeName || employee?.name || 'Não especificado'}</span>
              </div>
              <div>
                <span style={styles.fieldLabel}>NUIT:</span>
                <span style={styles.fieldVal}>{act.employeeNuit || employee?.nuit || '-'}</span>
              </div>
              <div>
                <span style={styles.fieldLabel}>Categoria Funcional:</span>
                <span style={styles.fieldVal}>{employee?.categoryName || act.details?.categoryName || '-'}</span>
              </div>
              <div>
                <span style={styles.fieldLabel}>Cargo Atual:</span>
                <span style={styles.fieldVal}>{employee?.extra_data?.role || employee?.role || act.details?.previousRole || 'Sem Cargo de Liderança'}</span>
              </div>
            </div>
          </div>

          {/* Seção 2: Especificações do Acto */}
          <div style={styles.sectionCard}>
            <h4 style={styles.sectionTitle}>📋 Detalhes do Acto Administrativo</h4>
            <div style={styles.detailsGrid}>
              <div>
                <span style={styles.fieldLabel}>Data do Acto:</span>
                <span style={styles.fieldVal}>{act.actDate ? new Date(act.actDate).toLocaleDateString('pt-PT') : '-'}</span>
              </div>
              <div>
                <span style={styles.fieldLabel}>Data Efectiva:</span>
                <span style={styles.fieldVal}>{act.details?.effectiveDate ? new Date(act.details.effectiveDate).toLocaleDateString('pt-PT') : '-'}</span>
              </div>
              <div>
                <span style={styles.fieldLabel}>Boletim da República (BR):</span>
                <span style={styles.fieldVal}>{act.details?.brNumber || 'Em tramitação'}</span>
              </div>
              <div>
                <span style={styles.fieldLabel}>
                  {act.actType === 'Nomeação' ? 'Novo Cargo / Função:' : act.actType === 'Cessação de Funções' ? 'Cargo Cessado:' : 'Função de Retorno:'}
                </span>
                <span style={{ ...styles.fieldVal, color: '#1B365D', fontWeight: '700' }}>
                  {act.details?.newRole || act.details?.newCargo || act.details?.previousRole || '-'}
                </span>
              </div>
              {act.details?.reason && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={styles.fieldLabel}>Motivo / Fundamentação:</span>
                  <span style={styles.fieldVal}>{act.details.reason}</span>
                </div>
              )}
              {act.details?.observations && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={styles.fieldLabel}>Observações Gerais:</span>
                  <span style={styles.fieldVal}>{act.details.observations}</span>
                </div>
              )}
            </div>
          </div>

          {/* Seção 3: Despacho da Direcção de Recursos Humanos */}
          <div style={{ ...styles.sectionCard, borderLeft: '4px solid #1B365D' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ ...styles.sectionTitle, margin: 0 }}>📜 Despacho da Direcção de Recursos Humanos</h4>
              {isPrimary && (!act.despacho || act.status === 'Pendente de Despacho') && (
                <button onClick={() => onOpenDespacho(act)} style={styles.actionBtnPrimary}>
                  + Inserir Despacho
                </button>
              )}
            </div>
            {act.despacho ? (
              <div style={styles.despachoBox}>
                <p style={styles.despachoText}>"{act.despacho}"</p>
                <div style={styles.despachoMeta}>
                  <span><strong>Emitido por:</strong> {act.despachoUser || 'Direcção de Recursos Humanos'}</span>
                  <span><strong>Data:</strong> {act.despachoDate ? new Date(act.despachoDate).toLocaleString('pt-PT') : '-'}</span>
                </div>
              </div>
            ) : (
              <div style={styles.pendingDespachoBanner}>
                <span style={{ fontSize: '18px' }}>⏳</span>
                <span>Processo pendente de inserção do Despacho pela Direcção Central de Recursos Humanos.</span>
              </div>
            )}
          </div>

          {/* Seção 4: Matriz de Tripla Aprovação Obrigatória (3 Níveis) */}
          <div style={styles.sectionCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h4 style={{ ...styles.sectionTitle, margin: 0 }}>🛡️ Matriz de Tripla Aprovação Central (Obrigatória)</h4>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>
                  O processo só é finalizado após a aprovação individual e vinculativa dos 3 perfis centrais.
                </p>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: approvedCount === 3 ? '#059669' : '#1B365D' }}>
                Progresso: {approvedCount} de 3 Aprovados
              </span>
            </div>

            {act.status === 'Rejeitado' && act.rejection && (
              <div style={styles.rejectionBanner}>
                <strong>⚠️ Processo Rejeitado por {act.rejection.roleTitle || act.rejection.rejectedBy}:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Motivo: {act.rejection.reason}</p>
                <span style={{ fontSize: '11px', color: '#991B1B', display: 'block', marginTop: '2px' }}>
                  Data: {new Date(act.rejection.date).toLocaleString('pt-PT')}
                </span>
              </div>
            )}

            <div style={styles.approvalGrid}>
              {/* Nível 1: Super Administrador Principal (Chefe da DRH) */}
              <div style={{
                ...styles.approvalCard,
                borderColor: isApproved1 ? '#10B981' : '#E5E7EB',
                backgroundColor: isApproved1 ? '#F0FDF4' : '#FAFAFA'
              }}>
                <div style={styles.approvalHeader}>
                  <span style={styles.approvalIcon}>{isApproved1 ? '✅' : '⏳'}</span>
                  <div>
                    <span style={styles.approvalRoleTitle}>1. Super Administrador Principal</span>
                    <span style={styles.approvalRoleSub}>Chefe da Direcção de Recursos Humanos</span>
                  </div>
                </div>
                <div style={styles.approvalStatus}>
                  {isApproved1 ? (
                    <>
                      <span style={styles.approvalConfirmedTag}>Aprovado</span>
                      <p style={styles.approvalMetaText}>Por: {approvals.super_admin_1.name || approvals.super_admin_1.user}</p>
                      <p style={styles.approvalMetaText}>Data: {new Date(approvals.super_admin_1.date).toLocaleString('pt-PT')}</p>
                      {approvals.super_admin_1.observation && (
                        <p style={styles.approvalObs}>"{approvals.super_admin_1.observation}"</p>
                      )}
                    </>
                  ) : (
                    <span style={styles.approvalPendingTag}>Pendente</span>
                  )}
                </div>
              </div>

              {/* Nível 2: Super Administrador (Chefe Dep. Central Gestão Pessoal) */}
              <div style={{
                ...styles.approvalCard,
                borderColor: isApproved2 ? '#10B981' : '#E5E7EB',
                backgroundColor: isApproved2 ? '#F0FDF4' : '#FAFAFA'
              }}>
                <div style={styles.approvalHeader}>
                  <span style={styles.approvalIcon}>{isApproved2 ? '✅' : '⏳'}</span>
                  <div>
                    <span style={styles.approvalRoleTitle}>2. Super Administrador</span>
                    <span style={styles.approvalRoleSub}>Chefe do Dep. Central de Administração de Pessoal</span>
                  </div>
                </div>
                <div style={styles.approvalStatus}>
                  {isApproved2 ? (
                    <>
                      <span style={styles.approvalConfirmedTag}>Aprovado</span>
                      <p style={styles.approvalMetaText}>Por: {approvals.admin_1.name || approvals.admin_1.user}</p>
                      <p style={styles.approvalMetaText}>Data: {new Date(approvals.admin_1.date).toLocaleString('pt-PT')}</p>
                      {approvals.admin_1.observation && (
                        <p style={styles.approvalObs}>"{approvals.admin_1.observation}"</p>
                      )}
                    </>
                  ) : (
                    <span style={styles.approvalPendingTag}>Pendente</span>
                  )}
                </div>
              </div>

              {/* Nível 3: Administrador Principal (Técnico Central de RH) */}
              <div style={{
                ...styles.approvalCard,
                borderColor: isApproved3 ? '#10B981' : '#E5E7EB',
                backgroundColor: isApproved3 ? '#F0FDF4' : '#FAFAFA'
              }}>
                <div style={styles.approvalHeader}>
                  <span style={styles.approvalIcon}>{isApproved3 ? '✅' : '⏳'}</span>
                  <div>
                    <span style={styles.approvalRoleTitle}>3. Administrador Principal</span>
                    <span style={styles.approvalRoleSub}>Técnico Central de Recursos Humanos</span>
                  </div>
                </div>
                <div style={styles.approvalStatus}>
                  {isApproved3 ? (
                    <>
                      <span style={styles.approvalConfirmedTag}>Aprovado</span>
                      <p style={styles.approvalMetaText}>Por: {approvals.admin_2.name || approvals.admin_2.user}</p>
                      <p style={styles.approvalMetaText}>Data: {new Date(approvals.admin_2.date).toLocaleString('pt-PT')}</p>
                      {approvals.admin_2.observation && (
                        <p style={styles.approvalObs}>"{approvals.admin_2.observation}"</p>
                      )}
                    </>
                  ) : (
                    <span style={styles.approvalPendingTag}>Pendente</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ação rápida de Aprovar/Rejeitar se elegível */}
            {isPrimary && act.status === 'Pendente de Aprovação' && (
              <div style={styles.approvalActionsRow}>
                <button onClick={() => onOpenApproval(act, 'approve')} style={styles.actionBtnSuccess}>
                  ✍️ Registar Minha Aprovação
                </button>
                <button onClick={() => onOpenApproval(act, 'reject')} style={styles.actionBtnDanger}>
                  🚫 Rejeitar Processo
                </button>
              </div>
            )}
          </div>

          {/* Seção 5: Histórico de Tramitação e Auditoria */}
          <div style={styles.sectionCard}>
            <h4 style={styles.sectionTitle}>🕒 Histórico de Tramitação e Auditoria</h4>
            <div style={styles.timeline}>
              {(act.history && act.history.length > 0) ? (
                act.history.map((item, idx) => (
                  <div key={item.id || idx} style={styles.timelineItem}>
                    <div style={styles.timelineDot} />
                    <div style={styles.timelineContent}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={styles.timelineAction}>{item.action}</span>
                        <span style={styles.timelineDate}>
                          {item.date ? new Date(item.date).toLocaleString('pt-PT') : ''}
                        </span>
                      </div>
                      <p style={styles.timelineDesc}>{item.description}</p>
                      <span style={styles.timelineUser}>
                        Responsável: <strong>{item.user}</strong> ({item.role || 'Sistema'})
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', color: '#9CA3AF' }}>Nenhum histórico detalhado registado.</p>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.closeModalBtn}>
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backdropFilter: 'blur(3px)',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '850px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    cursor: 'move',
    userSelect: 'none',
  },
  title: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    margin: 0,
    fontSize: '12px',
    color: '#64748B',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#64748B',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    border: '1px solid',
  },
  body: {
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '14px 16px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: '10px',
  },
  empGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  fieldVal: {
    fontSize: '13px',
    color: '#0F172A',
    fontWeight: '500',
  },
  despachoBox: {
    backgroundColor: '#F8FAFC',
    padding: '12px 14px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
  },
  despachoText: {
    margin: '0 0 8px',
    fontSize: '13px',
    fontStyle: 'italic',
    color: '#1E293B',
    lineHeight: '1.5',
  },
  despachoMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#64748B',
    borderTop: '1px solid #E2E8F0',
    paddingTop: '6px',
  },
  pendingDespachoBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#FFFBEB',
    color: '#B45309',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
  },
  approvalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px',
  },
  approvalCard: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  approvalHeader: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  approvalIcon: {
    fontSize: '16px',
  },
  approvalRoleTitle: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    color: '#0F172A',
  },
  approvalRoleSub: {
    display: 'block',
    fontSize: '10px',
    color: '#64748B',
  },
  approvalStatus: {
    marginTop: 'auto',
  },
  approvalConfirmedTag: {
    display: 'inline-block',
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '12px',
    marginBottom: '4px',
  },
  approvalPendingTag: {
    display: 'inline-block',
    backgroundColor: '#FEF3C7',
    color: '#B45309',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  approvalMetaText: {
    margin: 0,
    fontSize: '11px',
    color: '#475569',
  },
  approvalObs: {
    margin: '4px 0 0',
    fontSize: '11px',
    color: '#0F172A',
    fontStyle: 'italic',
  },
  approvalActionsRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '14px',
    paddingTop: '12px',
    borderTop: '1px dashed #CBD5E1',
  },
  rejectionBanner: {
    padding: '10px 12px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '6px',
    color: '#991B1B',
    marginBottom: '12px',
  },
  timeline: {
    position: 'relative',
    paddingLeft: '16px',
    borderLeft: '2px solid #E2E8F0',
    marginLeft: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  timelineItem: {
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: '-22px',
    top: '4px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#1B365D',
    border: '2px solid #FFFFFF',
  },
  timelineContent: {
    backgroundColor: '#F8FAFC',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #E2E8F0',
  },
  timelineAction: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineDate: {
    fontSize: '11px',
    color: '#64748B',
  },
  timelineDesc: {
    margin: '4px 0 2px',
    fontSize: '12px',
    color: '#334155',
  },
  timelineUser: {
    fontSize: '11px',
    color: '#64748B',
  },
  actionBtnPrimary: {
    backgroundColor: '#1B365D',
    color: '#FFFFFF',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionBtnSuccess: {
    backgroundColor: '#059669',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionBtnDanger: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  footer: {
    padding: '12px 20px',
    borderTop: '1px solid #E5E7EB',
    backgroundColor: '#F8FAFC',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  closeModalBtn: {
    padding: '8px 18px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    backgroundColor: '#FFFFFF',
    color: '#374151',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
};
