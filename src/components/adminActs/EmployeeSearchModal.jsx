import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import useDraggable from '../../hooks/useDraggable';

export default function EmployeeSearchModal({ isOpen, onClose, employees, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { position, onPointerDown } = useDraggable();

  if (!isOpen) return null;

  const searchResults = searchTerm.length > 2 
    ? employees.filter(e => 
        e.isActive && 
        ((e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
         (e.nip || '').toLowerCase().includes(searchTerm.toLowerCase()))
      ).slice(0, 5) // Limit to 5 results to avoid huge lists
    : [];

  return ReactDOM.createPortal(
    <div style={styles.overlay}>
      <div 
        style={{ ...styles.modal, transform: `translate(${position.x}px, ${position.y}px)` }}
        onPointerDown={onPointerDown}
      >
        <div className="drag-handle" style={styles.header}>
          <h2 style={styles.title}>Selecionar Funcionário</h2>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>

        <div style={styles.content}>
          <label style={styles.label}>Pesquise pelo Nome ou NUIT</label>
          <input 
            type="text" 
            placeholder="Ex: Catarina Jesus..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={styles.input}
            autoFocus
          />

          {searchTerm.length > 2 && searchResults.length === 0 && (
            <div style={styles.empty}>Nenhum funcionário encontrado.</div>
          )}

          {searchResults.length > 0 && (
            <div style={styles.resultsList}>
              {searchResults.map(emp => (
                <div key={emp.id} style={styles.resultItem} onClick={() => onSelect(emp)}>
                  <div style={styles.empName}>{emp.name}</div>
                  <div style={styles.empNip}>NUIT: {emp.nip}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999999, animation: 'fadeIn 0.2s ease-out'
  },
  modal: {
    backgroundColor: 'var(--color-bg-card)', width: '450px', borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
  },
  header: {
    padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-base)',
    cursor: 'move'
  },
  title: { fontSize: '18px', fontWeight: '700', color: 'var(--color-text-main)', margin: 0 },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '24px', color: 'var(--color-text-muted)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', transition: 'all 0.2s'
  },
  content: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: {
    padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px', outline: 'none'
  },
  resultsList: {
    display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', maxHeight: '250px', overflowY: 'auto'
  },
  resultItem: {
    padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)', cursor: 'pointer', transition: 'all 0.2s',
  },
  empName: { fontSize: '15px', fontWeight: '600', color: 'var(--color-text-base)', marginBottom: '4px' },
  empNip: { fontSize: '13px', color: 'var(--color-text-muted)' },
  empty: { padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }
};
