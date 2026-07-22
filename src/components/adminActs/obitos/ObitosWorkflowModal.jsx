import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import useDraggable from '../../../hooks/useDraggable';
import { useAuth } from '../../../contexts/AuthContext';
import ConfirmModal from '../../ConfirmModal';

export default function ObitosWorkflowModal({ workflow, employee, onClose, onCompleteStep1, onCompleteStep2, onCompleteStep3, onApprove, onReactivate }) {
  const { user } = useAuth();
  const isSuperAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(user?.roleId || user?.role) || user?.username === 'admin';
  const [mounted, setMounted] = useState(false);
  const { position, onPointerDown } = useDraggable();
  
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

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...styles.modal, transform: `translate(${position.x}px, ${position.y}px)` }} onClick={e => e.stopPropagation()}>
        <div style={styles.header} className="drag-handle" onPointerDown={onPointerDown}>
          <h3 style={styles.title}>Processo de Óbito: {employee?.name}</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
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
            <button onClick={onClose} style={styles.closeBtn}>×</button>
          </div>
        </div>
        
        <div style={styles.body}>
          <p style={{marginBottom: '20px', color: 'var(--color-text-muted)'}}>NUIT: {employee?.nip}</p>

          <div style={styles.stepper}>
            {/* Step 1 */}
            <div style={{...styles.stepBox, borderColor: step >= 1 ? 'var(--color-primary)' : 'var(--color-border)', opacity: step >= 1 ? 1 : 0.5}}>
              <h4 style={styles.stepTitle}>Etapa 1: Suspensão de Salário</h4>
              {step === 1 ? (
                <div>
                  <label style={styles.label}>Referência do Documento (Guia/Despacho)</label>
                  <input type="text" value={doc1} onChange={e => setDoc1(e.target.value)} style={styles.input} placeholder="Ex: Ofício nº 123/2026" />
                  <button onClick={handleStep1} style={styles.btnAction}>Submeter e Avançar</button>
                </div>
              ) : (
                <div style={styles.completedText}>✔️ Concluído (Ref: {workflow.docSuspensao})</div>
              )}
            </div>

            {/* Step 2 */}
            <div style={{...styles.stepBox, borderColor: step >= 2 ? 'var(--color-primary)' : 'var(--color-border)', opacity: step >= 2 ? 1 : 0.5}}>
              <h4 style={styles.stepTitle}>Etapa 2: Certidão de Óbito</h4>
              {step === 2 ? (
                <div>
                  <label style={styles.label}>Número da Certidão / Assento</label>
                  <input type="text" value={doc2} onChange={e => setDoc2(e.target.value)} style={styles.input} placeholder="Ex: Assento 4567/2026" />
                  <button onClick={handleStep2} style={styles.btnAction}>Submeter e Avançar</button>
                </div>
              ) : step > 2 ? (
                <div style={styles.completedText}>✔️ Concluído (Certidão: {workflow.docCertidao})</div>
              ) : (
                <div style={styles.pendingText}>Aguardando Etapa 1</div>
              )}
            </div>

            {/* Step 3 */}
            <div style={{...styles.stepBox, borderColor: step >= 3 ? 'var(--color-primary)' : 'var(--color-border)', opacity: step >= 3 ? 1 : 0.5}}>
              <h4 style={styles.stepTitle}>Etapa 3: Subsídio de 6 Meses</h4>
              {step === 3 ? (
                <div>
                  <p style={{fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px'}}>Confirme que o processo para o pagamento do subsídio de morte equivalente a 6 meses de salário foi enviado aos herdeiros.</p>
                  <button onClick={handleStep3} style={{...styles.btnAction, backgroundColor: '#10B981'}}>Confirmar Pagamento do Subsídio</button>
                </div>
              ) : step > 3 || workflow.isCompleted ? (
                <div style={styles.completedText}>✔️ Enviado para Aprovação Superior</div>
              ) : (
                <div style={styles.pendingText}>Aguardando Etapas Anteriores</div>
              )}
            </div>

            {/* Step 4: Aprovação Final */}
            {(step >= 4 || workflow.isCompleted) && (
              <div style={{...styles.stepBox, borderColor: workflow.isCompleted ? '#10B981' : '#F59E0B', backgroundColor: workflow.isCompleted ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)'}}>
                <h4 style={styles.stepTitle}>Etapa 4: Aprovação Final</h4>
                {workflow.isCompleted ? (
                  <div style={styles.completedText}>✔️ Processo Totalmente Concluído e Aprovado</div>
                ) : (
                  <div>
                    <p style={{fontSize: '13px', color: '#92400E', marginBottom: '10px'}}>
                      <strong>Aguardando Aprovação do Super Administrador.</strong> O processo foi cadastrado por um utilizador e necessita de validação superior.
                    </p>
                    {isSuperAdmin && (
                      <button onClick={handleApprove} style={{...styles.btnAction, backgroundColor: '#F59E0B'}}>Validar e Aprovar Processo</button>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
        hideCancel={confirmModal.hideCancel}
        confirmText={confirmModal.confirmText}
      />
    </div>,
    document.body
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' },
  modal: { backgroundColor: 'var(--color-bg-card)', width: '600px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
  header: { padding: '16px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'move', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' },
  title: { margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--color-text-main)' },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'color 0.2s' },
  body: { padding: '20px', overflowY: 'auto' },
  stepper: { display: 'flex', flexDirection: 'column', gap: '16px' },
  stepBox: { padding: '16px', border: '2px solid', borderRadius: '6px', backgroundColor: 'var(--color-bg-subtle)' },
  stepTitle: { margin: '0 0 12px 0', fontSize: '15px', color: 'var(--color-text-main)' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '4px' },
  input: { width: '100%', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', marginBottom: '12px', outline: 'none', transition: 'border-color 0.2s' },
  btnAction: { padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  completedText: { color: '#10B981', fontWeight: '600', fontSize: '14px' },
  pendingText: { color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '13px' }
};
