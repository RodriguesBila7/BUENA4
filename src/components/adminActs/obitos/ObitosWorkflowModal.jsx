import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../../../hooks/useResizableModal';
import { useAuth } from '../../../contexts/AuthContext';
import ConfirmModal from '../../ConfirmModal';

export default function ObitosWorkflowModal({ workflow, employee, onClose, onCompleteStep1, onCompleteStep2, onCompleteStep3, onApprove, onReactivate }) {
  const { user } = useAuth();
  const isSuperAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(user?.roleId || user?.role) || user?.username === 'admin';
  const [mounted, setMounted] = useState(false);

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
  } = useResizableModal({ defaultWidth: '700px', minWidth: 420, minHeight: 320 });
  
  const [doc1, setDoc1] = useState('');
  const [doc2, setDoc2] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDestructive: false });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const step = workflow ? workflow.step : 1;

  const handleStep1 = () => {
    if (!doc1) {
      setConfirmModal({
        isOpen: true,
        title: 'Atenção',
        message: 'Por favor, informe o nome/referência do documento de suspensão de salário.',
        hideCancel: true,
        confirmText: 'OK',
        onConfirm: () => setConfirmModal({ isOpen: false }),
        onCancel: () => setConfirmModal({ isOpen: false })
      });
      return;
    }
    onCompleteStep1(workflow.id, doc1);
  };

  const handleStep2 = () => {
    if (!doc2) {
      setConfirmModal({
        isOpen: true,
        title: 'Atenção',
        message: 'Por favor, informe o número da Certidão de Óbito.',
        hideCancel: true,
        confirmText: 'OK',
        onConfirm: () => setConfirmModal({ isOpen: false }),
        onCancel: () => setConfirmModal({ isOpen: false })
      });
      return;
    }
    onCompleteStep2(workflow.id, doc2);
  };

  const handleStep3 = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Subsídio',
      message: 'Confirma o processamento do subsídio de 6 meses para os herdeiros?',
      onConfirm: () => onCompleteStep3(workflow.id)
    });
  };

  const handleApprove = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Aprovar Processo',
      message: 'Aprovar definitivamente este processo de óbito?',
      onConfirm: () => onApprove(workflow.id)
    });
  };

  if (!mounted) return null;

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
        <div 
          style={styles.header} 
          className={isMaximized ? '' : 'drag-handle'} 
          onPointerDown={isMaximized ? undefined : onPointerDown}
          onDoubleClick={handleHeaderDoubleClick}
          title="💡 Arraste para mover ou dê duplo clique com o rato para expandir / reduzir"
        >
          <h3 style={styles.title}>Processo de Óbito: {employee?.name}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isSuperAdmin && (!workflow || !workflow.isCompleted) && (
              <button 
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Reativar Funcionário',
                    message: 'Tem a certeza que pretende reativar este funcionário? O estado passará novamente a "Ativo".',
                    onConfirm: () => onReactivate(employee.id),
                    isDestructive: true
                  });
                }}
                style={{ ...styles.btnAction, backgroundColor: '#e53e3e', color: 'white', border: 'none' }}
                title="Reativar o funcionário, voltando ao estado Ativo"
              >
                Reativar Funcionário
              </button>
            )}
            <button
              type="button"
              onClick={toggleMaximize}
              style={styles.expandBtn}
              title={isMaximized ? "Reduzir Tamanho (Restaurar)" : "Modo Expandir (Tela Cheia)"}
            >
              {isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
            </button>
            <button onClick={onClose} style={styles.closeBtn} title="Fechar">×</button>
          </div>
        </div>

        <div style={styles.body}>
          {/* Timeline de Passos */}
          <div style={styles.stepper}>
            <div style={{ ...styles.stepItem, opacity: step >= 1 ? 1 : 0.5 }}>
              <div style={{ ...styles.stepCircle, backgroundColor: step > 1 ? '#48bb78' : step === 1 ? '#3182ce' : '#cbd5e0' }}>
                {step > 1 ? '✓' : '1'}
              </div>
              <span style={styles.stepLabel}>1. Suspensão de Salário</span>
            </div>
            <div style={styles.stepLine} />
            <div style={{ ...styles.stepItem, opacity: step >= 2 ? 1 : 0.5 }}>
              <div style={{ ...styles.stepCircle, backgroundColor: step > 2 ? '#48bb78' : step === 2 ? '#3182ce' : '#cbd5e0' }}>
                {step > 2 ? '✓' : '2'}
              </div>
              <span style={styles.stepLabel}>2. Certidão de Óbito</span>
            </div>
            <div style={styles.stepLine} />
            <div style={{ ...styles.stepItem, opacity: step >= 3 ? 1 : 0.5 }}>
              <div style={{ ...styles.stepCircle, backgroundColor: step > 3 ? '#48bb78' : step === 3 ? '#3182ce' : '#cbd5e0' }}>
                {step > 3 ? '✓' : '3'}
              </div>
              <span style={styles.stepLabel}>3. Subsídio por Morte</span>
            </div>
            <div style={styles.stepLine} />
            <div style={{ ...styles.stepItem, opacity: step >= 4 ? 1 : 0.5 }}>
              <div style={{ ...styles.stepCircle, backgroundColor: workflow?.isCompleted ? '#48bb78' : step === 4 ? '#3182ce' : '#cbd5e0' }}>
                {workflow?.isCompleted ? '✓' : '4'}
              </div>
              <span style={styles.stepLabel}>4. Homologação</span>
            </div>
          </div>

          <div style={styles.content}>
            {step === 1 && (
              <div style={styles.stepContent}>
                <h4>Passo 1: Suspensão Imediata de Salário</h4>
                <p>Anexe o documento ou despacho interno que solicita a suspensão do vencimento na folha de pagamentos.</p>
                <input 
                  type="text" 
                  placeholder="Referência do Documento / Nota Interna..." 
                  value={doc1} 
                  onChange={e => setDoc1(e.target.value)} 
                  style={styles.input} 
                />
                <button onClick={handleStep1} style={styles.btnPrimary}>Avançar Passo 1</button>
              </div>
            )}

            {step === 2 && (
              <div style={styles.stepContent}>
                <h4>Passo 2: Inserção da Certidão de Óbito</h4>
                <p>Registe os dados oficiais da Certidão de Óbito emitida pelo Registo Civil.</p>
                <input 
                  type="text" 
                  placeholder="Número da Certidão / Conservatória..." 
                  value={doc2} 
                  onChange={e => setDoc2(e.target.value)} 
                  style={styles.input} 
                />
                <button onClick={handleStep2} style={styles.btnPrimary}>Confirmar Certidão e Avançar</button>
              </div>
            )}

            {step === 3 && (
              <div style={styles.stepContent}>
                <h4>Passo 3: Atribuição do Subsídio por Morte (6 Meses)</h4>
                <p>Processamento do subsídio de funeral e sobrevivência para os herdeiros legais nos termos da lei.</p>
                <div style={styles.infoAlert}>
                  Ao clicar em processar, os 6 meses de vencimento base serão calculados e encaminhados para validação da Direção.
                </div>
                <button onClick={handleStep3} style={styles.btnPrimary}>Processar Subsídio de 6 Meses</button>
              </div>
            )}

            {step === 4 && (
              <div style={styles.stepContent}>
                <h4>Passo 4: Homologação Final do Processo de Óbito</h4>
                <p>Todos os requisitos foram preenchidos. Homologue para finalizar e atualizar definitivamente o cadastro.</p>
                {workflow?.isCompleted ? (
                  <div style={styles.successBadge}>✅ Processo Homologado e Finalizado</div>
                ) : (
                  <button onClick={handleApprove} style={{ ...styles.btnPrimary, backgroundColor: '#38a169' }}>
                    Homologar e Concluir Processo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel || (() => setConfirmModal({ isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
        hideCancel={confirmModal.hideCancel}
        confirmText={confirmModal.confirmText}
      />
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
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    borderRadius: '14px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  header: {
    padding: '16px 22px',
    borderBottom: '1px solid var(--color-border, #e2e8f0)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-base, #f8fafc)',
    cursor: 'move',
    userSelect: 'none',
    flexShrink: 0
  },
  title: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '700',
    color: 'var(--color-text-main, #0f172a)'
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
    fontSize: '20px',
    color: 'var(--color-text-muted, #64748b)',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  btnAction: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  body: {
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flex: 1,
    overflowY: 'auto',
    boxSizing: 'border-box'
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--color-bg-base, #f8fafc)',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid var(--color-border, #e2e8f0)'
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  stepCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '12px'
  },
  stepLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-text-muted, #64748b)'
  },
  stepLine: {
    flex: 1,
    height: '2px',
    backgroundColor: 'var(--color-border, #e2e8f0)',
    margin: '0 8px'
  },
  content: {
    flex: 1
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #cbd5e1)',
    backgroundColor: 'var(--color-bg-base, #f8fafc)',
    color: 'var(--color-text-base, #1e293b)',
    fontSize: '13px',
    outline: 'none'
  },
  btnPrimary: {
    padding: '10px 16px',
    backgroundColor: 'var(--color-primary, #1B365D)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    alignSelf: 'flex-start'
  },
  infoAlert: {
    padding: '12px',
    backgroundColor: 'rgba(49, 130, 206, 0.1)',
    borderLeft: '4px solid #3182ce',
    color: '#2b6cb0',
    borderRadius: '4px',
    fontSize: '13px'
  },
  successBadge: {
    padding: '12px',
    backgroundColor: 'rgba(56, 161, 105, 0.1)',
    color: '#2f855a',
    borderRadius: '8px',
    fontWeight: '600',
    textAlign: 'center'
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
