import React, { useState } from 'react';

export default function EvolucaoSaudeModal({ isOpen, onClose, act, onSave }) {
  const [dataAprovacao, setDataAprovacao] = useState('');
  const [documento, setDocumento] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');

  if (!isOpen || !act) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dataAprovacao) {
      setErro('A Data de Aprovação pela Junta Médica é obrigatória.');
      return;
    }
    if (!documento) {
      setErro('É estritamente obrigatório anexar o Parecer da Junta Médica.');
      return;
    }

    onSave(act.id, {
      dataAprovacao,
      documento: documento.name,
      motivoEvolucao: motivo
    });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Evolução para Incapacidade Permanente</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <div style={styles.content}>
          <div style={styles.alertWarning}>
            <strong>Atenção:</strong> Está prestes a transferir o estado de <strong>{act.employeeName}</strong> de Baixa Temporária para Incapacidade Permanente. Esta ação exige validação documental rigorosa.
          </div>

          {erro && <div style={styles.errorAlert}>{erro}</div>}

          <div style={styles.section}>
            <label style={styles.label}>Data da Aprovação da Junta Médica</label>
            <input type="date" value={dataAprovacao} onChange={e => setDataAprovacao(e.target.value)} style={styles.input} />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Notas ou Diagnóstico Adicional</label>
            <textarea 
              value={motivo} 
              onChange={e => setMotivo(e.target.value)} 
              style={styles.textarea}
              placeholder="Ex: Em virtude do agravamento do quadro clínico..."
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Parecer da Junta Médica <span style={{color:'red'}}>* (Obrigatório)</span></label>
            <div style={styles.fileUpload}>
              <input type="file" onChange={e => setDocumento(e.target.files[0])} accept=".pdf,image/*" />
            </div>
            <span style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>O documento deve estar devidamente assinado pela comissão médica.</span>
          </div>

        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.btnCancel}>Cancelar</button>
          <button onClick={handleSubmit} style={styles.btnDanger}>Confirmar Incapacidade</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' },
  modal: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', width: '100%', maxWidth: '550px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  header: { padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--color-text-main)' },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', color: 'var(--color-text-muted)', cursor: 'pointer' },
  content: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  section: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '15px' },
  textarea: { padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '15px', minHeight: '80px', resize: 'vertical' },
  alertWarning: { padding: '12px 16px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #F59E0B', color: '#B45309', borderRadius: '4px', fontSize: '13.5px' },
  errorAlert: { padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#991B1B', borderRadius: '8px', fontSize: '14px', fontWeight: '500' },
  fileUpload: { padding: '16px', border: '2px dashed #EF4444', borderRadius: '8px', backgroundColor: 'var(--color-bg-base)' },
  footer: { padding: '20px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--color-bg-base)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' },
  btnCancel: { padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-text-base)', fontWeight: '600', cursor: 'pointer' },
  btnDanger: { padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#DC2626', color: '#fff', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px rgba(220, 38, 38, 0.2)' }
};
