import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../../hooks/useResizableModal';
import { useAuth } from '../../contexts/AuthContext';
import useOrgData from '../../hooks/useOrgData';
import { isCentralUser, filterByProvincialScope } from '../../utils/scopeUtils';

export default function EmployeeSearchModal({ isOpen, onClose, employees = [], onSelect }) {
  const { user } = useAuth();
  const { data: orgData } = useOrgData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

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
  } = useResizableModal({ defaultWidth: '580px', minWidth: 400, minHeight: 300 });

  // Escopo institucional (Provincial vs Central)
  const scopedEmployees = useMemo(() => {
    return filterByProvincialScope(employees || [], user, orgData);
  }, [employees, user, orgData]);

  const isCentral = isCentralUser(user);

  const displayedResults = useMemo(() => {
    const list = scopedEmployees.filter(e => e.isActive !== false && e.status !== 'Apagado');
    
    if (!searchTerm.trim()) {
      return showAll ? list : list.slice(0, 10);
    }

    const term = searchTerm.toLowerCase();
    return list.filter(e => 
      (e.name || '').toLowerCase().includes(term) || 
      (e.nip || '').toLowerCase().includes(term) ||
      (e.nuit || '').toLowerCase().includes(term)
    );
  }, [scopedEmployees, searchTerm, showAll]);

  if (!isOpen) return null;

  const overlayProps = getOverlayProps(onClose);

  return ReactDOM.createPortal(
    <div 
      style={styles.overlay}
      onMouseDown={overlayProps.onMouseDown}
      onClick={overlayProps.onClick}
    >
      <div 
        ref={modalRef}
        style={{ ...styles.modal, ...modalStyle }}
      >
        {/* Header com Drag Handle, Duplo Clique e Botão Maximizar/Reduzir */}
        <div 
          className={isMaximized ? '' : 'drag-handle'} 
          style={styles.header}
          onPointerDown={isMaximized ? undefined : onPointerDown}
          onDoubleClick={handleHeaderDoubleClick}
          title="💡 Arraste para mover ou dê duplo clique com o rato para expandir / reduzir"
        >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={toggleMaximize}
              style={styles.expandBtn}
              title={isMaximized ? "Reduzir Tamanho (Restaurar)" : "Modo Expandir (Tela Cheia)"}
            >
              {isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
            </button>
            <button onClick={onClose} style={styles.closeBtn} title="Fechar">&times;</button>
          </div>
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
                backgroundColor: showAll ? 'var(--color-primary, #1B365D)' : 'var(--color-bg-base, #f8fafc)',
                color: showAll ? '#fff' : 'var(--color-text-base, #1e293b)',
                borderColor: showAll ? 'var(--color-primary, #1B365D)' : 'var(--color-border, #cbd5e1)'
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
                      NUIT/NIP: {emp.nip || emp.nuit || '-'} • {emp.categoryName || 'Geral'} • {emp.role || 'Agente SERNIC'}
                    </div>
                  </div>
                  <span style={styles.selectArrow}>➔</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Handle de redimensionamento no canto inferior direito */}
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
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999999, animation: 'fadeIn 0.2s ease-out'
  },
  modal: {
    backgroundColor: 'var(--color-bg-card, #ffffff)', 
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)', 
    overflow: 'hidden', 
    display: 'flex', 
    flexDirection: 'column',
    boxSizing: 'border-box'
  },
  header: {
    padding: '16px 22px', borderBottom: '1px solid var(--color-border, #e2e8f0)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-bg-base, #f8fafc)',
    cursor: 'move',
    userSelect: 'none',
    flexShrink: 0
  },
  title: { fontSize: '17px', fontWeight: '700', color: 'var(--color-text-main, #0f172a)', margin: 0 },
  scopeBadge: { fontSize: '11px', fontWeight: '700', color: '#2563eb', marginTop: '2px' },
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
    background: 'none', border: 'none', fontSize: '22px', color: 'var(--color-text-muted, #64748b)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', transition: 'all 0.2s'
  },
  content: { 
    padding: '18px 22px', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '12px',
    flex: 1,
    overflowY: 'auto',
    boxSizing: 'border-box'
  },
  input: {
    flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border, #cbd5e1)',
    backgroundColor: 'var(--color-bg-base, #f8fafc)', color: 'var(--color-text-base, #1e293b)', fontSize: '13px', outline: 'none'
  },
  btnShowAll: {
    padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border, #cbd5e1)',
    fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
  },
  infoCount: { fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted, #64748b)' },
  resultsList: {
    display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', flex: 1, maxHeight: '60vh', overflowY: 'auto'
  },
  resultItem: {
    padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border, #e2e8f0)',
    backgroundColor: 'var(--color-bg-base, #ffffff)', cursor: 'pointer', transition: 'all 0.15s ease',
    display: 'flex', alignItems: 'center', gap: '12px'
  },
  avatarBox: {
    width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', flexShrink: 0
  },
  empName: { fontSize: '14px', fontWeight: '600', color: 'var(--color-text-base, #0f172a)', marginBottom: '2px' },
  empNip: { fontSize: '12px', color: 'var(--color-text-muted, #64748b)' },
  selectArrow: { fontSize: '14px', color: 'var(--color-primary, #1B365D)', fontWeight: 'bold' },
  empty: { padding: '30px 20px', textAlign: 'center', color: 'var(--color-text-muted, #64748b)', fontSize: '13px' },
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
