import React, { useState } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import EmployeeViewer from './EmployeeViewer';
import EmployeeForm from './EmployeeForm';
import EmployeeImport from './EmployeeImport';
import EmployeeDeletedTab from './EmployeeDeletedTab';

export default function EmployeeManager({ t, currentView, onViewChange }) {
  const { employees, addEmployee, updateEmployee, deleteEmployee, permanentDeleteEmployee, restoreEmployee, bulkAddEmployees, refreshEmployees } = useEmployeeData();
  const orgData = useOrgData();

  const [editingEmpId, setEditingEmpId] = useState(() => {
    const focusId = localStorage.getItem('sernic_focus_employee_id');
    if (focusId) {
      localStorage.removeItem('sernic_focus_employee_id');
      return focusId;
    }
    return null;
  });

  const handleEdit = (id) => {
    setEditingEmpId(id);
    onViewChange('emp_form');
  };

  const handleAddNew = () => {
    setEditingEmpId(null);
    onViewChange('emp_form');
  };

  const onSaved = () => {
    onViewChange('emp_list');
    setEditingEmpId(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Gestão de Funcionários</h2>
          <p style={styles.desc}>Registo, consulta e importação massiva de funcionários da instituição.</p>
        </div>
      </div>

      {/* Barra de Abas do Módulo de Funcionários (CRUD Completo) */}
      <div className="employee-crud-tabs" style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'none'
      }}>
        <button
          type="button"
          onClick={() => onViewChange('emp_list')}
          style={{
            padding: '9px 16px',
            borderRadius: '10px',
            border: currentView === 'emp_list' ? '1px solid var(--color-primary, #B71C1C)' : '1px solid var(--color-border)',
            backgroundColor: currentView === 'emp_list' ? 'var(--color-primary, #B71C1C)' : 'var(--color-bg-card)',
            color: currentView === 'emp_list' ? '#ffffff' : 'var(--color-text-base)',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            boxShadow: currentView === 'emp_list' ? '0 3px 10px rgba(183, 28, 28, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Todos os Efetivos ({employees.length})
        </button>

        <button
          type="button"
          onClick={handleAddNew}
          style={{
            padding: '9px 16px',
            borderRadius: '10px',
            border: currentView === 'emp_form' ? '1px solid var(--color-primary, #B71C1C)' : '1px solid var(--color-border)',
            backgroundColor: currentView === 'emp_form' ? 'var(--color-primary, #B71C1C)' : 'var(--color-bg-card)',
            color: currentView === 'emp_form' ? '#ffffff' : 'var(--color-text-base)',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            boxShadow: currentView === 'emp_form' ? '0 3px 10px rgba(183, 28, 28, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          {editingEmpId ? 'Editar Funcionário' : '+ Registar Funcionário'}
        </button>

        <button
          type="button"
          onClick={() => onViewChange('emp_import')}
          style={{
            padding: '9px 16px',
            borderRadius: '10px',
            border: currentView === 'emp_import' ? '1px solid var(--color-primary, #B71C1C)' : '1px solid var(--color-border)',
            backgroundColor: currentView === 'emp_import' ? 'var(--color-primary, #B71C1C)' : 'var(--color-bg-card)',
            color: currentView === 'emp_import' ? '#ffffff' : 'var(--color-text-base)',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            boxShadow: currentView === 'emp_import' ? '0 3px 10px rgba(183, 28, 28, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Importar Excel
        </button>

        <button
          type="button"
          onClick={() => onViewChange('emp_deleted')}
          style={{
            padding: '9px 16px',
            borderRadius: '10px',
            border: currentView === 'emp_deleted' ? '1px solid var(--color-primary, #B71C1C)' : '1px solid var(--color-border)',
            backgroundColor: currentView === 'emp_deleted' ? 'var(--color-primary, #B71C1C)' : 'var(--color-bg-card)',
            color: currentView === 'emp_deleted' ? '#ffffff' : 'var(--color-text-base)',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            boxShadow: currentView === 'emp_deleted' ? '0 3px 10px rgba(183, 28, 28, 0.2)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          Eliminados
        </button>
      </div>

      <div style={styles.contentArea}>
        {currentView === 'emp_list' && (
          <EmployeeViewer 
            employees={employees} 
            orgData={orgData} 
            onEdit={handleEdit} 
            onDelete={deleteEmployee}
            onRefresh={refreshEmployees}
          />
        )}
        
        {currentView === 'emp_form' && (
          <EmployeeForm 
            employees={employees}
            orgData={orgData}
            editingEmpId={editingEmpId}
            onSave={editingEmpId ? updateEmployee : addEmployee}
            onCancel={() => onViewChange('emp_list')}
            onSaved={onSaved}
          />
        )}

        {currentView === 'emp_import' && (
          <EmployeeImport 
            orgData={orgData}
            onBulkAdd={bulkAddEmployees}
            onSuccess={() => onViewChange('emp_list')}
          />
        )}

        {currentView === 'emp_deleted' && (
          <EmployeeDeletedTab 
            employees={employees}
            orgData={orgData}
            onRestore={restoreEmployee}
            onPermanentDelete={permanentDeleteEmployee}
          />
        )}


      </div>
    </div>
  );
}

const styles = {
  container: { padding: '30px', animation: 'fadeIn 0.4s ease-out' },
  header: { marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' },
  desc: { color: 'var(--color-text-muted)', fontSize: '15px' },
  tabsContainer: { display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' },
  tab: { padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid transparent', transition: 'all 0.2s' },
  activeTab: { padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid var(--color-primary)', transition: 'all 0.2s' },
  contentArea: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', minHeight: '500px' },
};
