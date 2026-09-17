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
  container: { padding: '24px 30px', animation: 'fadeIn 0.3s ease-out' },
  header: { marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '22px', fontWeight: '700', color: 'var(--color-text-main)', letterSpacing: '-0.3px', marginBottom: '4px' },
  desc: { color: 'var(--color-text-muted)', fontSize: '13.5px' },
  tabsContainer: { display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' },
  tab: { padding: '10px 18px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '13.5px', fontWeight: '500', cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'all 0.15s ease' },
  activeTab: { padding: '10px 18px', background: 'transparent', border: 'none', color: 'var(--color-primary, #dc2626)', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', borderBottom: '2px solid var(--color-primary, #dc2626)', transition: 'all 0.15s ease' },
  contentArea: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minHeight: '500px' },
};
