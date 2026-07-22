import React, { useState } from 'react';
import useTransferData from '../../hooks/useTransferData';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import TransferDashboard from './TransferDashboard';
import TransferList from './TransferList';
import TransferForm from './TransferForm';
import TransferHistory from './TransferHistory';

export default function TransferManager() {
  const { 
    transfers, 
    requestTransfer: addTransfer, 
    updateTransfer, 
    approveTransfer,
    rejectTransfer,
    cancelTransfer,
    deleteTransfer 
  } = useTransferData();
  const { employees, updateEmployee } = useEmployeeData();
  const orgData = useOrgData();

  const updateTransferStatus = async (id, newStatus, reason, updateEmployeeFn, employeesList) => {
    if (newStatus === 'Aprovada') {
      return approveTransfer(id, reason);
    } else if (newStatus === 'Rejeitada') {
      return rejectTransfer(id, reason);
    } else if (newStatus === 'Cancelada') {
      return cancelTransfer(id);
    } else {
      const target = transfers.find(t => t.id === id);
      if (target) {
        if (newStatus === 'Concluída' && updateEmployeeFn && employeesList) {
          const emp = employeesList.find(e => e.id === target.employeeId);
          if (emp) {
            await updateEmployeeFn(emp.id, {
              ...emp,
              provinceId: target.toProvinceId || emp.provinceId,
              districtId: target.toDistrictId || emp.districtId,
              directorateId: target.toDirectorateId || emp.directorateId,
              departmentId: target.toDepartmentId || emp.departmentId,
              divisionId: target.toDivisionId || emp.divisionId,
              sectionId: target.toSectionId || emp.sectionId
            });
          }
        }
        return updateTransfer(id, { ...target, status: newStatus, notes: reason || target.notes });
      }
    }
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [editingTransfer, setEditingTransfer] = useState(null);

  const stats = React.useMemo(() => {
    if (!transfers) return { total: 0, pending: 0, approved: 0, completed: 0, rejected: 0 };
    return {
      total: transfers.length,
      pending: transfers.filter(t => t.status === 'Pendente').length,
      approved: transfers.filter(t => t.status === 'Aprovada').length,
      completed: transfers.filter(t => t.status === 'Concluída').length,
      rejected: transfers.filter(t => t.status === 'Rejeitada' || t.status === 'Cancelada').length,
    };
  }, [transfers]);

  const handleCreateTransfer = () => {
    setEditingTransfer(null);
    setActiveTab('form');
  };

  const handleEditTransfer = (transfer) => {
    setEditingTransfer(transfer);
    setActiveTab('form');
  };

  const handleViewHistory = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    setActiveTab('history');
  };

  return (
    <div style={styles.container}>
      
      {/* STATS CARDS */}
      <div style={styles.cardsContainer}>
        <div style={styles.card}>
          <div style={styles.cardIconBox}><span style={{fontSize: '24px'}}>🔄</span></div>
          <div>
            <div style={styles.cardValue}>{stats.total}</div>
            <div style={styles.cardTitle}>Total Processos</div>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIconBoxOrange}><span style={{fontSize: '24px'}}>⏳</span></div>
          <div>
            <div style={styles.cardValue}>{stats.pending}</div>
            <div style={styles.cardTitle}>Pendentes</div>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIconBoxGreen}><span style={{fontSize: '24px'}}>✅</span></div>
          <div>
            <div style={styles.cardValue}>{stats.completed + stats.approved}</div>
            <div style={styles.cardTitle}>Aprovados/Concluídos</div>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIconBoxRed}><span style={{fontSize: '24px'}}>❌</span></div>
          <div>
            <div style={styles.cardValue}>{stats.rejected}</div>
            <div style={styles.cardTitle}>Rejeitados</div>
          </div>
        </div>
      </div>

      <div style={{ ...styles.header, justifyContent: 'flex-end', marginTop: '10px' }}>
        <button onClick={handleCreateTransfer} style={styles.btnPrimary}>
          + Nova Transferência
        </button>
      </div>

      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={activeTab === 'dashboard' ? styles.activeTab : styles.tab}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('list')} 
          style={activeTab === 'list' ? styles.activeTab : styles.tab}
        >
          Lista de Processos
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          style={activeTab === 'history' ? styles.activeTab : styles.tab}
        >
          Histórico de Colaborador
        </button>
        {activeTab === 'form' && (
          <button style={styles.activeTab}>
            {editingTransfer ? 'Editar Movimentação' : 'Nova Movimentação'}
          </button>
        )}
      </div>

      <div style={styles.contentArea}>
        {activeTab === 'dashboard' && (
          <TransferDashboard 
            transfers={transfers} 
            orgData={orgData} 
          />
        )}
        
        {activeTab === 'list' && (
          <TransferList 
            transfers={transfers} 
            employees={employees} 
            orgData={orgData}
            onUpdateStatus={updateTransferStatus}
            onDelete={deleteTransfer}
            onEdit={handleEditTransfer}
            updateEmployeeFn={updateEmployee}
            onViewHistory={handleViewHistory}
          />
        )}

        {activeTab === 'history' && (
          <TransferHistory 
            transfers={transfers} 
            employees={employees} 
            orgData={orgData}
            initialEmployeeId={selectedEmployeeId}
          />
        )}

        {activeTab === 'form' && (
          <TransferForm 
            employees={employees} 
            orgData={orgData}
            initialData={editingTransfer}
            onSubmit={(data) => {
              if (editingTransfer) {
                updateTransfer(editingTransfer.id, data);
              } else {
                addTransfer(data);
              }
              setActiveTab('list');
            }}
            onCancel={() => setActiveTab('list')}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { animation: 'fadeIn 0.4s ease-out', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' },
  cardsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' },
  cardIconBox: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardIconBoxOrange: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardIconBoxGreen: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardIconBoxRed: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardValue: { fontSize: '24px', fontWeight: '800', color: 'var(--color-text-main)', lineHeight: '1', marginBottom: '4px' },
  cardTitle: { fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' },
  header: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center' },
  title: { fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' },
  desc: { color: 'var(--color-text-muted)', fontSize: '15px' },
  btnPrimary: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'all 0.2s',
  },
  tabsContainer: { display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' },
  tab: { padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid transparent', transition: 'all 0.2s' },
  activeTab: { padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid var(--color-primary)', transition: 'all 0.2s' },
  contentArea: { backgroundColor: 'var(--color-bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', minHeight: '500px', width: '100%' },
};
