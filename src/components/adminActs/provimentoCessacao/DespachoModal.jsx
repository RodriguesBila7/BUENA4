import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import useDraggable from '../../../hooks/useDraggable';
import { showToast } from '../../common/Toast';

export default function DespachoModal({ act, onClose, onSaveDespacho, currentUser }) {
  const { position, onPointerDown } = useDraggable();
  const [despacho, setDespacho] = useState(act?.despacho || '');
  const [brNumber, setBrNumber] = useState(act?.details?.brNumber || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!act) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!despacho.trim()) {
      showToast('O texto do despacho é obrigatório.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSaveDespacho(act.id, {
        despacho: despacho.trim(),
        brNumber: brNumber.trim(),
        userResponsible: currentUser?.name || currentUser?.username || 'Super Administrador Principal',
        userRole: currentUser?.roleTitle || 'Direcção de Recursos Humanos'
      });

      if (res && res.success) {
        showToast('Despacho inserido com sucesso! O processo avançou para Tripla Aprovação.', 'success');
        onClose();
      } else {
        showToast(res?.error || 'Erro ao gravar despacho.', 'error');
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
          <div>
            <h3 style={styles.title}>📜 Inserir Despacho da DRH</h3>
            <p style={styles.subtitle}>Processo: {act.actType} • {act.employeeName}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.infoBanner}>
            <span style={{ fontSize: '16px' }}>ℹ️</span>
            <div>
              <strong>Regra Institucional:</strong> Os despachos são emitidos exclusivamente pela <strong>Direcção de Recursos Humanos</strong>. Após a inserção do despacho, o processo avançará para a fase de <strong>Tripla Aprovação Obrigatória</strong>.
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Texto do Despacho Oficial *</label>
            <textarea
              value={despacho}
              onChange={e => setDespacho(e.target.value)}
              placeholder="Ex: Em conformidade com o Estatuto dos Funcionários do SERNIC e proposta da Direcção Provincial, autorizo a nomeação..."
              rows={5}
              style={styles.textarea}
              required
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Número do Boletim da República (BR) / Ordem de Serviço</label>
            <input
              type="text"
              value={brNumber}
              onChange={e => setBrNumber(e.target.value)}
              placeholder="Ex: BR nº 33, I Série de 18/08/2026"
              style={styles.input}
            />
          </div>

          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'A Processar...' : '📜 Gravar Despacho e Avançar para Aprovação'}
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
    maxWidth: '620px',
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
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '8px',
    color: '#1E40AF',
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
  input: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '13px',
    fontFamily: 'inherit',
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
  submitBtn: {
    padding: '8px 18px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#1B365D',
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(27, 54, 93, 0.2)',
  },
};
