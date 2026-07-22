import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import useDraggable from '../../../hooks/useDraggable';

export default function ReservaReformaWorkflowModal({ act, workflow, employee, onClose, onCompleteStep1, onCompleteStep2, onReactivate }) {
  const [mounted, setMounted] = useState(false);
  const { position, onPointerDown } = useDraggable();

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
          <h3 style={{ color: 'var(--color-primary, #1B365D)', marginBottom: '16px' }}>Passo 1: Iniciar Processo</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted, #64748B)', marginBottom: '16px' }}>O pedido de passagem à {act.actType} está pendente. Registe o número do processo para avançar.</p>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={styles.label}>Nº do Processo</label>
            <input 
              type="text" 
              value={processNumber} 
              onChange={e => setProcessNumber(e.target.value)} 
              placeholder="Ex: PROC-120/2026"
              style={styles.input} 
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button disabled={!processNumber.trim()} onClick={() => onCompleteStep1(workflow.id, processNumber)} style={{...styles.btnPrimary, opacity: !processNumber.trim() ? 0.5 : 1}}>
              Salvar Processo
            </button>
          </div>
        </div>
      );
    }

    if (workflow.step === 2) {
      return (
        <div style={styles.stepContainer}>
          <h3 style={{ color: 'var(--color-primary, #1B365D)', marginBottom: '16px' }}>Passo 2: Anexar Despacho e Finalizar</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted, #64748B)', marginBottom: '16px' }}>Insira o número do despacho oficial. Ao finalizar, o funcionário passará imediatamente para o estado Inativo.</p>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={styles.label}>Nº do Despacho</label>
            <input 
              type="text" 
              value={dispatchNumber} 
              onChange={e => setDispatchNumber(e.target.value)} 
              placeholder="Ex: 89/DRH/2026"
              style={styles.input} 
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button disabled={!dispatchNumber.trim()} onClick={() => onCompleteStep2(workflow.id, dispatchNumber)} style={{...styles.btnPrimary, backgroundColor: '#10B981', opacity: !dispatchNumber.trim() ? 0.5 : 1}}>
              Finalizar e Inativar Funcionário
            </button>
          </div>
        </div>
      );
    }
  };

  if (!mounted) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...styles.modal, transform: `translate(${position.x}px, ${position.y}px)` }} onClick={e => e.stopPropagation()}>
        <div style={styles.header} className="drag-handle" onPointerDown={onPointerDown}>
          <h2 style={{ fontSize: '18px', color: 'var(--color-text-main, #0F172A)' }}>Fluxo de {act.actType}</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        
        <div style={styles.empInfo}>
          <strong>{employee.nip}</strong> - {employee.name}
        </div>

        <div style={styles.progressBar}>
          <div style={{...styles.progressStep, ...(workflow.step >= 1 || workflow.isCompleted ? styles.stepActive : {})}}>
            <div style={styles.stepCircle}>1</div>
            <span style={styles.stepText}>Pendente</span>
          </div>
          <div style={styles.progressLine}></div>
          <div style={{...styles.progressStep, ...(workflow.step >= 2 || workflow.isCompleted ? styles.stepActive : {})}}>
            <div style={styles.stepCircle}>2</div>
            <span style={styles.stepText}>Despacho</span>
          </div>
          <div style={styles.progressLine}></div>
          <div style={{...styles.progressStep, ...(workflow.isCompleted ? styles.stepActive : {})}}>
            <div style={styles.stepCircle}>3</div>
            <span style={styles.stepText}>Finalizado</span>
          </div>
        </div>

        <div style={styles.content}>
          {renderStep()}
        </div>
      </div>
    </div>,
    document.body
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)' },
  modal: { backgroundColor: 'var(--color-bg-card, #fff)', borderRadius: '12px', width: '95%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--color-border, #E2E8F0)', backgroundColor: 'var(--color-bg-card, #fff)', cursor: 'move' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: 'var(--color-text-muted, #64748B)', cursor: 'pointer', transition: 'color 0.2s' },
  empInfo: { padding: '16px 24px', backgroundColor: 'var(--color-bg-subtle, #EFF6FF)', color: 'var(--color-text-base, #1E40AF)', fontSize: '14px', borderBottom: '1px solid var(--color-border, #E2E8F0)' },
  content: { padding: '24px' },
  stepContainer: { backgroundColor: 'var(--color-bg-base, #F8FAFC)', border: '1px solid var(--color-border, #E2E8F0)', borderRadius: '8px', padding: '24px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base, #334155)', marginBottom: '8px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border, #CBD5E1)', backgroundColor: 'var(--color-bg-base, #fff)', color: 'var(--color-text-main, #0f172a)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' },
  btnPrimary: { padding: '10px 16px', backgroundColor: 'var(--color-primary, #1B365D)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  btnCancel: { padding: '10px 16px', backgroundColor: 'transparent', color: 'var(--color-text-muted, #64748B)', border: '1px solid var(--color-border, #CBD5E1)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  btnAction: { padding: '8px 16px', backgroundColor: 'var(--color-bg-base, #fff)', color: 'var(--color-primary, #1B365D)', border: '1px solid var(--color-primary, #1B365D)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' },
  errorAlert: { backgroundColor: '#FEF2F2', color: '#991B1B', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', border: '1px solid #FCA5A5' },
  progressBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', paddingBottom: '0' },
  progressStep: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.5 },
  stepActive: { opacity: 1 },
  stepCircle: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-primary, #1B365D)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' },
  stepText: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-base, #334155)' },
  progressLine: { flex: 1, height: '2px', backgroundColor: 'var(--color-border, #E2E8F0)', margin: '0 16px', position: 'relative', top: '-12px' }
};
