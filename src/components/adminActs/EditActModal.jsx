import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import useDraggable from '../../hooks/useDraggable';

export default function EditActModal({ act, onClose, onSave }) {
  const { position, onPointerDown } = useDraggable();
  const [mounted, setMounted] = useState(false);
  
  const [formData, setFormData] = useState({
    date: act.date || act.actDate || '',
    despacho: act.despacho || act.dispatchNumber || '',
    br: act.br || '',
    description: act.description || (act.details?.description) || ''
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const updatedAct = {
      ...act,
      date: formData.date,
      despacho: formData.despacho,
      br: formData.br,
      description: formData.description,
      ...(act.details ? { details: { ...act.details, description: formData.description } } : {})
    };
    onSave(updatedAct);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!mounted) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={{ ...styles.modal, transform: `translate(${position.x}px, ${position.y}px)` }} onClick={e => e.stopPropagation()}>
        <div style={styles.header} className="drag-handle" onPointerDown={onPointerDown}>
          <h2 style={styles.title}>Editar Registo: {act.actType}</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        
        <div style={styles.empInfo}>
          <strong>{act.employeeNip || act.employeeId}</strong> - {act.employeeName || 'Desconhecido'}
        </div>

        <div style={styles.content}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Data do Registo</label>
            <input 
              type="date" 
              name="date"
              value={formData.date}
              onChange={handleChange}
              style={styles.input} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nº do Despacho (Opcional)</label>
            <input 
              type="text" 
              name="despacho"
              value={formData.despacho}
              onChange={handleChange}
              placeholder="Ex: 120/DRH/2026"
              style={styles.input} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Boletim da República (Opcional)</label>
            <input 
              type="text" 
              name="br"
              value={formData.br}
              onChange={handleChange}
              placeholder="Ex: BR 45, III Série"
              style={styles.input} 
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Observações / Descrição</label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              style={styles.textarea} 
            />
          </div>

          <div style={styles.footer}>
            <button onClick={onClose} style={styles.btnCancel}>Cancelar</button>
            <button onClick={handleSave} style={styles.btnPrimary}>Salvar Alterações</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)' },
  modal: { backgroundColor: 'var(--color-bg-card, #fff)', borderRadius: '12px', width: '95%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--color-border, #E2E8F0)', backgroundColor: 'var(--color-bg-card, #fff)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', cursor: 'move' },
  title: { margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--color-text-main, #0F172A)' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: 'var(--color-text-muted, #64748B)', cursor: 'pointer', transition: 'color 0.2s' },
  empInfo: { padding: '16px 24px', backgroundColor: 'var(--color-bg-subtle, #EFF6FF)', color: 'var(--color-text-base, #1E40AF)', fontSize: '14px', borderBottom: '1px solid var(--color-border, #E2E8F0)' },
  content: { padding: '24px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base, #334155)', marginBottom: '8px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border, #CBD5E1)', backgroundColor: 'var(--color-bg-base, #fff)', color: 'var(--color-text-main, #0f172a)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' },
  textarea: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border, #CBD5E1)', backgroundColor: 'var(--color-bg-base, #fff)', color: 'var(--color-text-main, #0f172a)', fontSize: '14px', outline: 'none', resize: 'vertical', transition: 'border-color 0.2s' },
  footer: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  btnPrimary: { padding: '10px 16px', backgroundColor: 'var(--color-primary, #1B365D)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  btnCancel: { padding: '10px 16px', backgroundColor: 'transparent', color: 'var(--color-text-muted, #64748B)', border: '1px solid var(--color-border, #CBD5E1)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
};
