import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../../../hooks/useResizableModal';
import { showToast } from '../../common/Toast';

export default function DespachoModal({ act, onClose, onSaveDespacho, currentUser }) {
  const {
    modalRef,
    position,
    onPointerDown,
    isMaximized,
    toggleMaximize,
    handleResizePointerDown,
    handleHeaderDoubleClick,
    getOverlayProps,
    modalStyle
  } = useResizableModal({ defaultWidth: '640px', minWidth: 420, minHeight: 300 });

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

  const overlayProps = getOverlayProps(onClose);

  return ReactDOM.createPortal(
    <div 
      style={styles.overlay}
      onMouseDown={overlayProps.onMouseDown}
      onClick={overlayProps.onClick}
    >
      <div 
        ref={modalRef}
        style={{ 
          ...styles.modal, 
          ...modalStyle
        }} 
      >
        {/* Header com Drag Handle, Duplo Clique e Maximizar */}
        <div 
          style={styles.header} 
          onPointerDown={isMaximized ? undefined : onPointerDown} 
          onDoubleClick={handleHeaderDoubleClick}
          className={isMaximized ? '' : 'drag-handle'}
          title="💡 Arraste para mover ou dê duplo clique com o rato para expandir / reduzir"
        >
          <div>
            <h3 style={styles.title}>📜 Inserir Despacho da DRH</h3>
            <p style={styles.subtitle}>Processo: {act.actType} • {act.employeeName}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={toggleMaximize}
              style={styles.expandBtn}
              title={isMaximized ? "Reduzir Tamanho (Restaurar)" : "Modo Expandir (Tela Cheia)"}
            >
              {isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
            </button>
            <button onClick={onClose} style={styles.closeBtn} title="Fechar">✕</button>
          </div>
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
            <button 
              type="submit" 
              style={styles.submitBtn} 
              disabled={isSubmitting}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
            >
              {isSubmitting ? 'A Processar...' : '📜 Gravar Despacho e Avançar para Aprovação'}
            </button>
          </div>
        </form>

        {/* Handle de redimensionamento por mouse no canto inferior direito */}
        {!isMaximized && (
          <div 
            onPointerDown={handleResizePointerDown}
            style={styles.resizeHandle}
            title="Arraste com o rato para expandir ou reduzir livremente"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="14" y1="3" x2="3" y2="14" />
              <line x1="14" y1="8" x2="8" y2="14" />
              <line x1="14" y1="13" x2="13" y2="14" />
            </svg>
          </div>
        )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backdropFilter: 'blur(4px)',
    boxSizing: 'border-box'
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  header: {
    padding: '16px 22px',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    cursor: 'move',
    userSelect: 'none',
    flexShrink: 0
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
  expandBtn: {
    background: 'rgba(37, 99, 235, 0.08)',
    border: '1px solid rgba(37, 99, 235, 0.25)',
    color: '#2563eb',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    transition: 'all 0.15s ease'
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
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flex: 1,
    overflowY: 'auto',
    boxSizing: 'border-box'
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
    flexShrink: 0
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
    padding: '9px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)',
    transition: 'all 0.2s ease',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: '18px',
    height: '18px',
    cursor: 'se-resize',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    zIndex: 10
  }
};
