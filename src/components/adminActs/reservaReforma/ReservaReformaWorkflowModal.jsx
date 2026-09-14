import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../../../hooks/useResizableModal';

export default function ReservaReformaWorkflowModal({ act, workflow, employee, onClose, onCompleteStep1, onCompleteStep2, onReactivate }) {
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

  const [processNumber, setProcessNumber] = useState('');
  const [dispatchNumber, setDispatchNumber] = useState('');
  
  const [isReactivating, setIsReactivating] = useState(false);
  const [reactivateDispatch, setReactivateDispatch] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const renderStep = () => {
    if (workflow.isCompleted) {
      if (act.actType === 'Reserva') {
        if (isReactivating) {
          return (
            <div style={styles.stepContainer}>
              <h3 style={{ color: 'var(--color-primary, #1B365D)', marginBottom: '16px' }}>Trazer para a Ativa (Reativar)</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted, #64748B)', marginBottom: '16px' }}>
                Para trazer {employee.name} de volta à atividade, insira o número do Despacho e o código de Super Administrador.
              </p>
              
              {error && <div style={styles.errorAlert}>{error}</div>}

              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Nº do Despacho de Reativação</label>
                <input 
                  type="text" 
                  value={reactivateDispatch} 
                  onChange={e => setReactivateDispatch(e.target.value)} 
                  placeholder="Ex: 504/GAB-DRH/2026"
                  style={styles.input} 
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={styles.label}>Código do Super Administrador</label>
                <input 
                  type="password" 
                  value={adminCode} 
                  onChange={e => setAdminCode(e.target.value)} 
                  placeholder="Insira o PIN"
                  style={styles.input} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setIsReactivating(false)} style={styles.btnCancel}>Cancelar</button>
                <button 
                  disabled={!reactivateDispatch || !adminCode}
                  onClick={() => {
                    if (adminCode !== '1234' && adminCode !== 'admin' && adminCode !== 'BUENA3') {
                      setError('Código de Super Administrador incorreto.');
                      return;
                    }
                    setError('');
                    onReactivate(employee.id, reactivateDispatch);
                  }} 
                  style={{...styles.btnPrimary, opacity: (!reactivateDispatch || !adminCode) ? 0.5 : 1}}
                >
                  Confirmar Reativação
                </button>
              </div>
            </div>
          );
        }

        return (
          <div style={styles.stepContainer}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
              <h3 style={{ color: '#10B981', marginBottom: '8px' }}>Processo Finalizado</h3>
              <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '14px', marginBottom: '24px' }}>O funcionário encontra-se inativo (Na Reserva).</p>
              <button onClick={() => setIsReactivating(true)} style={styles.btnAction}>
                Trazer de volta à Ativa
              </button>
            </div>
          </div>
        );
      } else {
        return (
          <div style={styles.stepContainer}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
              <h3 style={{ color: '#10B981', marginBottom: '8px' }}>Processo Finalizado</h3>
              <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '14px' }}>O funcionário encontra-se reformado definitivamente.</p>
            </div>
          </div>
        );
      }
    }

    if (workflow.step === 1) {
      return (
        <div style={styles.stepContainer}>
          <h4 style={{ marginBottom: '12px', color: 'var(--color-text-main, #0f172a)' }}>Passo 1: Fixação da Pensão Provisória</h4>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted, #64748B)', marginBottom: '16px' }}>
            Registo da tramitação do processo no Instituto Nacional de Previdência Social / Ministério das Finanças.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={styles.label}>Nº do Processo de Fixação</label>
            <input 
              type="text" 
              value={processNumber} 
              onChange={e => setProcessNumber(e.target.value)} 
              placeholder="Ex: PROC-2026/089"
              style={styles.input} 
            />
          </div>

          <button 
            disabled={!processNumber} 
            onClick={() => onCompleteStep1(workflow.id, processNumber)} 
            style={{...styles.btnPrimary, opacity: !processNumber ? 0.5 : 1}}
          >
            Avançar para Passo 2
          </button>
        </div>
      );
    }

    if (workflow.step === 2) {
      return (
        <div style={styles.stepContainer}>
          <h4 style={{ marginBottom: '12px', color: 'var(--color-text-main, #0f172a)' }}>Passo 2: Visto do Tribunal Administrativo</h4>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted, #64748B)', marginBottom: '16px' }}>
            Registo do Visto do Tribunal Administrativo ou Despacho Homologatório de Reforma.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={styles.label}>Nº do Visto / Despacho Final</label>
            <input 
              type="text" 
              value={dispatchNumber} 
              onChange={e => setDispatchNumber(e.target.value)} 
              placeholder="Ex: VISTO-TA/890/2026"
              style={styles.input} 
            />
          </div>

          <button 
            disabled={!dispatchNumber} 
            onClick={() => onCompleteStep2(workflow.id, dispatchNumber)} 
            style={{...styles.btnPrimary, opacity: !dispatchNumber ? 0.5 : 1}}
          >
            Concluir Processo
          </button>
        </div>
      );
    }

    return null;
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
          <div>
            <h3 style={styles.title}>Tramitação: {act.actType}</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748b)' }}>{employee.name} (NUIT: {employee.nip || employee.nuit})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          {/* Stepper */}
          <div style={styles.stepper}>
            <div style={{ ...styles.stepItem, opacity: workflow.step >= 1 ? 1 : 0.5 }}>
              <div style={{ ...styles.stepCircle, backgroundColor: workflow.step > 1 ? '#10B981' : workflow.step === 1 ? '#1B365D' : '#CBD5E1' }}>
                {workflow.step > 1 ? '✓' : '1'}
              </div>
              <span style={styles.stepLabel}>1. Fixação Provisória</span>
            </div>
            <div style={styles.stepLine} />
            <div style={{ ...styles.stepItem, opacity: workflow.step >= 2 ? 1 : 0.5 }}>
              <div style={{ ...styles.stepCircle, backgroundColor: workflow.isCompleted ? '#10B981' : workflow.step === 2 ? '#1B365D' : '#CBD5E1' }}>
                {workflow.isCompleted ? '✓' : '2'}
              </div>
              <span style={styles.stepLabel}>2. Visto do T.A.</span>
            </div>
          </div>

          {renderStep()}
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
    justifyContent: 'space-around',
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
    margin: '0 16px'
  },
  stepContainer: {
    backgroundColor: 'var(--color-bg-base, #f8fafc)',
    padding: '18px',
    borderRadius: '10px',
    border: '1px solid var(--color-border, #e2e8f0)'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted, #64748b)',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #cbd5e1)',
    backgroundColor: 'var(--color-bg-base, #ffffff)',
    color: 'var(--color-text-base, #1e293b)',
    fontSize: '13px',
    boxSizing: 'border-box',
    outline: 'none'
  },
  btnPrimary: {
    padding: '10px 18px',
    backgroundColor: 'var(--color-primary, #1B365D)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px'
  },
  btnCancel: {
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border, #cbd5e1)',
    borderRadius: '8px',
    color: 'var(--color-text-base, #1e293b)',
    cursor: 'pointer',
    fontSize: '13px'
  },
  btnAction: {
    padding: '10px 18px',
    backgroundColor: 'var(--color-primary, #1B365D)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px'
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    marginBottom: '14px',
    border: '1px solid rgba(239, 68, 68, 0.3)'
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
