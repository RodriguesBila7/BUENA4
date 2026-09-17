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
