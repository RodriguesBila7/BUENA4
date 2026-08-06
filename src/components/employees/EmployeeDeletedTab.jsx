import React, { useState, useMemo } from 'react';
import ConfirmModal from '../ConfirmModal';
import DraggableModal from '../common/DraggableModal';
import useAdminActsData from '../../hooks/useAdminActsData';
import { showToast } from '../common/Toast';

export default function EmployeeDeletedTab({ employees = [], orgData, onRestore, onPermanentDelete }) {
  const deletedEmployees = (employees || []).filter(e => ['Apagado', 'Demitido', 'Expulso', 'Falecido'].includes(e.status));
  const { registerAct } = useAdminActsData();
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [restoreModal, setRestoreModal] = useState({ isOpen: false, employee: null });
  const [fileB64, setFileB64] = useState(null);

  const stats = useMemo(() => {
    const byMonthYear = {};
    const totals = { Expulso: 0, Demitido: 0, Falecido: 0, Apagado: 0 };
    
    deletedEmployees.forEach(emp => {
      if (totals[emp.status] !== undefined) totals[emp.status]++;
      
      const date = new Date(emp.updatedAt || emp.createdAt || Date.now());
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      
      if (!byMonthYear[key]) {
        byMonthYear[key] = { Expulso: 0, Demitido: 0, Falecido: 0, Apagado: 0 };
      }
      if (byMonthYear[key][emp.status] !== undefined) {
        byMonthYear[key][emp.status]++;
      }
    });

    const sortedKeys = Object.keys(byMonthYear).sort().reverse();
    return { totals, byMonthYear, sortedKeys };
  }, [deletedEmployees]);

  const handleDelete = (emp) => {
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Permanentemente',
      message: `Tem a certeza que deseja APAGAR PERMANENTEMENTE o funcionário ${emp.name}? Esta ação irá eliminar todo o seu histórico e dados associados (processos, transferências, férias, promoções) e é IRREVERSÍVEL.`,
      isDestructive: true,
      onConfirm: () => {
        onPermanentDelete(emp.id);
        setConfirmModal({ isOpen: false });
      },
      onCancel: () => setConfirmModal({ isOpen: false })
    });
  };

  const handleRestoreClick = (emp) => {
    if (emp.status === 'Apagado') {
      // Direct restore
      onRestore(emp.id);
    } else {
      // Demitido ou Expulso -> Requer Despacho
      setRestoreModal({ isOpen: true, employee: emp });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFileB64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const submitReintegration = async (e) => {
    e.preventDefault();
    if (!fileB64) {
      showToast('É obrigatório anexar o Despacho de Reintegração.', 'warning');
      return;
    }
    
    // Create an Admin Act "Reintegração" in Pending state
    const actData = {
      employeeId: restoreModal.employee.id,
      actType: 'Reintegração',
      group_name: 'Provimento e Cessação',
      details: {
        documentB64: fileB64,
        motivo: `Reintegração de funcionário ${restoreModal.employee.status}`,
        status: 'Pendente'
      },
      date: new Date().toISOString()
    };
    
    await registerAct(actData);
    showToast('Despacho submetido! A reintegração ficará pendente até confirmação pelo Super Administrador.', 'success', 6000);
    setRestoreModal({ isOpen: false, employee: null });
    setFileB64(null);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <h3 style={{ fontSize: '18px', color: 'var(--color-primary)', marginBottom: '15px' }}>
        Funcionários Eliminados ({deletedEmployees.length})
      </h3>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px', fontSize: '14px' }}>
        Lista de funcionários marcados como Apagados, Demitidos, Expulsos ou Falecidos. 
        Funcionários apagados podem ser restaurados diretamente ou apagados de forma permanente. 
        Para reintegração de Demitidos/Expulsos, é obrigatório um despacho sujeito a confirmação superior.
      </p>

      {/* Estatísticas Analíticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Expulsos</div>
          <div style={{...styles.statValue, color: '#e53e3e'}}>{stats.totals.Expulso}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Demitidos</div>
          <div style={{...styles.statValue, color: '#dd6b20'}}>{stats.totals.Demitido}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Falecidos</div>
          <div style={{...styles.statValue, color: '#718096'}}>{stats.totals.Falecido}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Apagados (Erro)</div>
          <div style={{...styles.statValue, color: '#d69e2e'}}>{stats.totals.Apagado}</div>
        </div>
      </div>

      {stats.sortedKeys.length > 0 && (
        <div style={{ marginBottom: '24px', backgroundColor: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <h4 style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>Estatística Mensal (Ano-Mês)</h4>
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
            {stats.sortedKeys.map(key => {
              const row = stats.byMonthYear[key];
              return (
                <div key={key} style={{ minWidth: '120px', backgroundColor: 'var(--color-bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)', flexShrink: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px', color: 'var(--color-primary)' }}>{key}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-base)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {row.Expulso > 0 && <div>Expulsos: <b style={{color:'#e53e3e'}}>{row.Expulso}</b></div>}
                    {row.Demitido > 0 && <div>Demitidos: <b style={{color:'#dd6b20'}}>{row.Demitido}</b></div>}
                    {row.Falecido > 0 && <div>Falecidos: <b style={{color:'#718096'}}>{row.Falecido}</b></div>}
                    {row.Apagado > 0 && <div>Apagados: <b style={{color:'#d69e2e'}}>{row.Apagado}</b></div>}
                    {(row.Expulso+row.Demitido+row.Falecido+row.Apagado) === 0 && <div style={{color:'var(--color-text-muted)'}}>Sem registos</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {deletedEmployees.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Nenhum funcionário eliminado encontrado.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <table className="premium-table">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)' }}>NIP</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)' }}>Nome</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)' }}>Direção</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)' }}>Estado</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {deletedEmployees.map(emp => {
                const dir = orgData?.directorates?.find(d => d.id === emp.directorateId);
                const isApagado = emp.status === 'Apagado';
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{emp.nip}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{emp.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{dir?.name || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' 
                      }}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleRestoreClick(emp)}
                          style={{
                            padding: '6px 12px', backgroundColor: 'var(--color-primary)', color: 'white',
                            border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                          }}
                        >
                          {isApagado ? 'Restaurar' : 'Submeter Reintegração'}
                        </button>
                        <button 
                          onClick={() => handleDelete(emp)}
                          style={{
                            padding: '6px 12px', backgroundColor: '#ef4444', color: 'white',
                            border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                          }}
                        >
                          Apagar Permanentemente
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Confirmar Ação Destrutiva */}
      {confirmModal.isOpen && (
        <ConfirmModal 
          isOpen={true}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText="Apagar"
          isDestructive={true}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}

      {/* Modal de Reintegração */}
      <DraggableModal
        isOpen={restoreModal.isOpen}
        title="Despacho de Reintegração"
        onClose={() => setRestoreModal({isOpen: false, employee: null})}
        maxWidth="440px"
      >
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Para reintegrar o funcionário <strong>{restoreModal.employee?.name}</strong> (Estado: {restoreModal.employee?.status}), é necessário anexar o despacho oficial. O processo ficará pendente de confirmação.
        </p>
        <form onSubmit={submitReintegration}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-base)' }}>Documento Anexo (PDF/Imagem) *</label>
            <input 
              type="file" 
              accept=".pdf,image/*" 
              onChange={handleFileChange}
              style={{ width: '100%', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)' }}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setRestoreModal({isOpen: false, employee: null})} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--color-text-base)' }}>
              Cancelar
            </button>
            <button type="submit" style={{ padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
              Submeter
            </button>
          </div>
        </form>
      </DraggableModal>
    </div>
  );
}

const styles = {
  statCard: {
    backgroundColor: 'var(--color-bg-card)',
    padding: '16px 20px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  statTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '800',
    lineHeight: '1.2'
  }
};
