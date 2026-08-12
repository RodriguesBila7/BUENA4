import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import useDraggable from '../../hooks/useDraggable';
import { useAuth } from '../../contexts/AuthContext';
import useOrgData from '../../hooks/useOrgData';
import { isCentralUser, filterByProvincialScope } from '../../utils/scopeUtils';

export default function EmployeeSearchModal({ isOpen, onClose, employees = [], onSelect }) {
  const { user } = useAuth();
  const { data: orgData } = useOrgData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const { position, onPointerDown } = useDraggable();

  // Escopo institucional (Provincial vs Central)
  const scopedEmployees = useMemo(() => {
    return filterByProvincialScope(employees || [], user, orgData);
  }, [employees, user, orgData]);

  const isCentral = isCentralUser(user);

  const displayedResults = useMemo(() => {
    const list = scopedEmployees.filter(e => e.isActive !== false && e.status !== 'Apagado');
    
    if (!searchTerm.trim()) {
      return showAll ? list : list.slice(0, 8);
    }

    const term = searchTerm.toLowerCase();
    return list.filter(e => 
      (e.name || '').toLowerCase().includes(term) || 
      (e.nip || '').toLowerCase().includes(term) ||
      (e.nuit || '').toLowerCase().includes(term)
    );
  }, [scopedEmployees, searchTerm, showAll]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={styles.overlay}>
      <div 
        style={{ ...styles.modal, transform: `translate(${position.x}px, ${position.y}px)` }}
        onPointerDown={onPointerDown}
      >
        <div className="drag-handle" style={styles.header}>
          <div>
            <h2 style={styles.title}>Selecionar Funcionário</h2>
            <div style={styles.scopeBadge}>
              {!isCentral ? (
                `📍 Direcção Provincial (${scopedEmployees.length} funcionários)`
              ) : (
                `🌐 Âmbito Nacional (${scopedEmployees.length} funcionários)`
              )}
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>

        <div style={styles.content}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Pesquisar por Nome, NUIT ou NIP..." 
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setShowAll(false); }}
              style={styles.input}
              autoFocus
            />
            <button 
              type="button" 
              onClick={() => { setSearchTerm(''); setShowAll(!showAll); }} 
              style={{
                ...styles.btnShowAll,
                backgroundColor: showAll ? 'var(--color-primary)' : 'var(--color-bg-base)',
                color: showAll ? '#fff' : 'var(--color-text-base)',
                borderColor: showAll ? 'var(--color-primary)' : 'var(--color-border)'
              }}
            >
              👥 {showAll ? 'Ocultar' : 'Visualizar Todos'}
            </button>
          </div>

          <div style={styles.infoCount}>
            {searchTerm.trim() ? (
              `Encontrados ${displayedResults.length} de ${scopedEmployees.length} funcionários`
            ) : (
              showAll ? `Listando todos os ${displayedResults.length} funcionários` : `Apresentando ${displayedResults.length} de ${scopedEmployees.length} funcionários (Clique em Visualizar Todos)`
            )}
          </div>

          {displayedResults.length === 0 ? (
            <div style={styles.empty}>
              🔍 Nenhum funcionário encontrado com os critérios introduzidos.
            </div>
          ) : (
            <div style={styles.resultsList}>
              {displayedResults.map(emp => (
                <div key={emp.id} style={styles.resultItem} onClick={() => onSelect(emp)}>
                  <div style={styles.avatarBox}>
                    {emp.name ? emp.name.split(' ').map(n=>n[0]).slice(0,2).join('') : '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.empName}>{emp.name}</div>
                    <div style={styles.empNip}>
                      NUIT/NIP: {emp.nip || emp.nuit || '-'} • {emp.role || 'Agente SERNIC'}
                    </div>
                  </div>
                  <span style={styles.selectArrow}>➔</span>
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
    backgroundColor: 'var(--color-bg-card)', width: '520px', borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
  },
  header: {
    padding: '18px 24px', borderBottom: '1px solid var(--color-border)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-base)',
    cursor: 'move'
  },
  title: { fontSize: '17px', fontWeight: '700', color: 'var(--color-text-main)', margin: 0 },
  scopeBadge: { fontSize: '11px', fontWeight: '700', color: '#2563eb', marginTop: '2px' },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '24px', color: 'var(--color-text-muted)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', transition: 'all 0.2s'
  },
  content: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' },
  input: {
    flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px', outline: 'none'
  },
  btnShowAll: {
    padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)',
    fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
  },
  infoCount: { fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)' },
  resultsList: {
    display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', maxHeight: '300px', overflowY: 'auto'
  },
  resultItem: {
    padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)', cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', gap: '12px'
  },
  avatarBox: {
    width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', flexShrink: 0
  },
  empName: { fontSize: '14px', fontWeight: '600', color: 'var(--color-text-base)', marginBottom: '2px' },
  empNip: { fontSize: '12px', color: 'var(--color-text-muted)' },
  selectArrow: { fontSize: '14px', color: 'var(--color-primary)', fontWeight: 'bold' },
  empty: { padding: '30px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }
};
