import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import useDraggable from '../../../hooks/useDraggable';
import { showToast } from '../../common/Toast';

export default function ApprovalModal({ act, mode = 'approve', onClose, onConfirmApproval, currentUser }) {
  const { position, onPointerDown } = useDraggable();
  const [observation, setObservation] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!act) return null;

  // Determinar qual é o perfil primário do utilizador
  const getRoleKey = () => {
    if (!currentUser) return 'super_admin_1';
    const roleId = String(currentUser.roleId || currentUser.role || '').toLowerCase();
    const roleName = String(currentUser.roleName || currentUser.roleDetails?.name || '').toLowerCase();

    if (roleId === 'super_admin_1' || roleName.includes('super administrador principal') || roleName.includes('chefe da direcção')) {
      return 'super_admin_1';
    }
    if (roleId === 'admin_1' || (roleName.includes('super administrador') && !roleName.includes('principal')) || roleName.includes('departamento central')) {
      return 'admin_1';
    }
    if (roleId === 'admin_2' || roleName.includes('administrador principal') || roleName.includes('técnico central')) {
      return 'admin_2';
    }
    return 'super_admin_1'; // fallback para admin root
  };

  const defaultRoleKey = getRoleKey();
  const [selectedRoleKey, setSelectedRoleKey] = useState(defaultRoleKey);

  const roleLabels = {
    super_admin_1: {
      title: '1. Super Administrador Principal',
      sub: 'Chefe da Direcção de Recursos Humanos'
    },
    admin_1: {
      title: '2. Super Administrador',
      sub: 'Chefe do Departamento Central de Administração de Pessoal'
    },
    admin_2: {
      title: '3. Administrador Principal',
      sub: 'Técnico Central de Recursos Humanos'
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'approve') {
        const res = await onConfirmApproval(act.id, {
          roleKey: selectedRoleKey,
          userResponsible: currentUser?.username || 'admin',
          userName: currentUser?.name || currentUser?.username || 'Administrador Primário',
          roleTitle: `${roleLabels[selectedRoleKey]?.title} (${roleLabels[selectedRoleKey]?.sub})`,
          observation: observation.trim()
        });

        if (res && res.success) {
          showToast(res.message || 'Aprovação registada com sucesso!', 'success');
          onClose();
        } else {
          showToast(res?.error || 'Erro ao registar aprovação.', 'error');
        }
      } else {
        if (!rejectionReason.trim()) {
          showToast('O motivo da rejeição é obrigatório.', 'warning');
          setIsSubmitting(false);
          return;
        }

        const res = await onConfirmApproval(act.id, {
          isRejection: true,
          reason: rejectionReason.trim(),
          userResponsible: currentUser?.username || 'admin',
          userName: currentUser?.name || currentUser?.username || 'Administrador Primário',
          roleTitle: `${roleLabels[selectedRoleKey]?.title} (${roleLabels[selectedRoleKey]?.sub})`
        });

        if (res && res.success) {
          showToast('Processo rejeitado com sucesso.', 'info');
          onClose();
        } else {
          showToast(res?.error || 'Erro ao rejeitar processo.', 'error');
        }
      }
    } catch (err) {
      showToast(err.message || 'Erro de comunicação com o servidor.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div 
        style={{ 
          ...styles.modal, 
          transform: `translate(${position.x}px, ${position.y}px)` 
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header} onPointerDown={onPointerDown} className="drag-handle">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>{mode === 'approve' ? '✍️' : '🚫'}</span>
            <div>
              <h3 style={styles.title}>
                {mode === 'approve' ? 'Conceder Aprovação Oficial' : 'Rejeitar Processo'}
              </h3>
              <p style={styles.subtitle}>Processo: {act.actType} • {act.employeeName}</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Seletor de Perfil Assinante (para super admins com visão global) */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Perfil Assinante / Cargo Central *</label>
            <select
              value={selectedRoleKey}
              onChange={e => setSelectedRoleKey(e.target.value)}
              style={styles.select}
            >
              <option value="super_admin_1">
                1. Super Administrador Principal (Chefe da Direcção de Recursos Humanos)
              </option>
              <option value="admin_1">
                2. Super Administrador (Chefe do Departamento Central de Administração de Pessoal)
              </option>
              <option value="admin_2">
                3. Administrador Principal (Técnico Central de RH)
              </option>
            </select>
          </div>

          {mode === 'approve' ? (
            <>
              <div style={styles.infoBanner}>
                <span style={{ fontSize: '16px' }}>🛡️</span>
                <div>
                  <strong>Conformidade Regulatória:</strong> Ao confirmar, estará a registar digitalmente a aprovação do nível <strong>{roleLabels[selectedRoleKey]?.title}</strong> com o seu utilizador (<strong>{currentUser?.name || currentUser?.username}</strong>).
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Parecer / Observação de Aprovação (Opcional)</label>
                <textarea
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  placeholder="Ex: Em conformidade com a legislação aplicável e disponibilidade no quadro de pessoal."
                  rows={3}
                  style={styles.textarea}
                />
              </div>
            </>
          ) : (
            <>
              <div style={styles.dangerBanner}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <div>
                  <strong>Atenção:</strong> A rejeição deste processo cancelará a tramitação e exigirá uma nova formulação ou correcção.
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Motivo / Justificação da Rejeição *</label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Especifique o fundamento legal ou administrativo para a não homologação deste acto..."
                  rows={4}
                  style={styles.textarea}
                  required
                />
              </div>
            </>
          )}

          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={isSubmitting}>
              Cancelar
            </button>
            <button 
              type="submit" 
              style={mode === 'approve' ? styles.approveBtn : styles.rejectBtn} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'A Processar...' : mode === 'approve' ? '✅ Assinar e Confirmar Aprovação' : '🚫 Confirmar Rejeição'}
            </button>
          </div>
        </form>
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
    maxWidth: '580px',
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
    fontSize: '16px',
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    margin: '2px 0 0',
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
  form: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoBanner: {
    display: 'flex',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '8px',
    color: '#15803D',
    fontSize: '12px',
    lineHeight: '1.5',
  },
  dangerBanner: {
    display: 'flex',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    color: '#B91C1C',
    fontSize: '12px',
    lineHeight: '1.5',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
  },
  select: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '13px',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    resize: 'vertical',
    outline: 'none',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '10px',
    borderTop: '1px solid #E5E7EB',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    backgroundColor: '#FFFFFF',
    color: '#374151',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  approveBtn: {
    padding: '8px 18px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#059669',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
  },
  rejectBtn: {
    padding: '8px 18px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
  },
};
