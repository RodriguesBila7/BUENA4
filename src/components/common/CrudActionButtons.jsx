import React from 'react';

export default function CrudActionButtons({ 
  onView, 
  onEdit, 
  onProceed,
  onDelete, 
  viewTitle = "Visualizar", 
  editTitle = "Editar", 
  proceedTitle = "Prosseguir / Atualizar Estado",
  deleteTitle = "Apagar",
  viewDisabled = false,
  editDisabled = false,
  proceedDisabled = false,
  deleteDisabled = false,
  extraButtons = null
}) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
      {extraButtons}
      
      {onView && (
        <button 
          onClick={onView} 
          style={styles.btnView} 
          title={viewTitle}
          disabled={viewDisabled}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      )}

      {onProceed && (
        <button 
          onClick={onProceed} 
          style={styles.btnProceed} 
          title={proceedTitle}
          disabled={proceedDisabled}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 16 16 12 12 8"></polyline>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </button>
      )}
      
      {onEdit && (
        <button 
          onClick={onEdit} 
          style={styles.btnEdit} 
          title={editTitle}
          disabled={editDisabled}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      )}
      
      {onDelete && (
        <button 
          onClick={onDelete} 
          style={styles.btnDelete} 
          title={deleteTitle}
          disabled={deleteDisabled}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      )}
    </div>
  );
}

const styles = {
  btnView: { 
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
    width: '32px', height: '32px', padding: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.08)', color: '#2563eb', 
    border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '7px', 
    cursor: 'pointer', transition: 'all 0.15s ease' 
  },
  btnProceed: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
    width: '32px', height: '32px', padding: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#059669', 
    border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '7px', 
    cursor: 'pointer', transition: 'all 0.15s ease' 
  },
  btnEdit: { 
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
    width: '32px', height: '32px', padding: 0,
    backgroundColor: 'rgba(139, 92, 246, 0.08)', color: '#7c3aed', 
    border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '7px', 
    cursor: 'pointer', transition: 'all 0.15s ease' 
  },
  btnDelete: { 
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
    width: '32px', height: '32px', padding: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', 
    border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '7px', 
    cursor: 'pointer', transition: 'all 0.15s ease' 
  }
};
