import React, { useState, useEffect } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import { 
  createEmployeeBackupPayload, 
  validateEmployeeBackupPayload, 
  saveInternalEmployeeBackup 
} from '../../utils/empBackupUtils';
import ConfirmModal from '../ConfirmModal';

export default function EmployeeBackupPanel({ t }) {
  const { employees, restoreEmployeeBackupData } = useEmployeeData();
  const [backups, setBackups] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Modal states
  const [confirmRestoreModal, setConfirmRestoreModal] = useState({ isOpen: false, payload: null, summary: null });
  const [confirmManualBackupModal, setConfirmManualBackupModal] = useState({ isOpen: false, description: '' });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

  // Load backups and history logs on mount
  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = () => {
    try {
      const savedBackups = JSON.parse(localStorage.getItem('sernic_employees_backups') || '[]');
      const savedHistory = JSON.parse(localStorage.getItem('sernic_employees_backup_history') || '[]');
      setBackups(savedBackups);
      setHistory(savedHistory);
    } catch (e) {
      console.error("Erro ao ler backups de funcionários:", e);
    }
  };

  const handleManualBackup = (desc) => {
    saveInternalEmployeeBackup(employees, 'Administrador', desc || 'Backup Manual');
    loadBackupData();
    setConfirmManualBackupModal({ isOpen: false, description: '' });
    setAlertModal({ isOpen: true, title: 'Backup Concluído', message: 'Cópia de segurança dos funcionários guardada localmente com sucesso!' });
  };

  const handleDownload = () => {
    const payload = createEmployeeBackupPayload(employees, 'Administrador', 'Exportação de Ficheiro');
    const dateStr = new Date().toISOString().replace(/[-:T]/g, '_').split('.')[0];
    const fileName = `funcionarios_${dateStr}.json`;
    
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Registar auditoria
    saveInternalEmployeeBackup(employees, 'Administrador', 'Ficheiro descarregado');
    loadBackupData();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target.result);
        const validation = validateEmployeeBackupPayload(payload);
        
        if (!validation.isValid) {
          setAlertModal({ isOpen: true, title: 'Ficheiro Inválido', message: `Erro de validação: ${validation.error}` });
          return;
        }

        setConfirmRestoreModal({
          isOpen: true,
          payload,
          summary: validation.counts
        });
      } catch (err) {
        setAlertModal({ isOpen: true, title: 'Erro de Leitura', message: 'O ficheiro selecionado não é um JSON válido ou está corrompido.' });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const executeRestore = () => {
    const { payload } = confirmRestoreModal;
    setConfirmRestoreModal({ isOpen: false, payload: null, summary: null });

    try {
      restoreEmployeeBackupData(payload, 'Administrador');
      loadBackupData();
      setAlertModal({ 
        isOpen: true, 
        title: 'Sucesso', 
        message: 'A lista de funcionários foi totalmente restaurada e atualizada com sucesso!' 
      });
    } catch (err) {
      setAlertModal({ 
        isOpen: true, 
        title: 'Falha no Restauro', 
        message: `A restauração foi abortada. Os dados originais foram mantidos intactos. Detalhe: ${err.message}` 
      });
    }
  };

  const handleRestoreLocalBackup = (localBackup) => {
    setConfirmRestoreModal({
      isOpen: true,
      payload: localBackup.payload,
      summary: validateEmployeeBackupPayload(localBackup.payload).counts
    });
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.sectionTitle}>Backup da Gestão de Funcionários</h3>
      <p style={styles.description}>
        Gerir exportação, importação e auditoria de backups dos funcionários do SERNIC.
      </p>

      <div style={styles.grid}>
        {/* Controles Principais */}
        <div style={styles.card}>
          <h4 style={styles.cardTitle}>Ações Disponíveis</h4>
          <div style={styles.btnGroup}>
            <button onClick={() => setConfirmManualBackupModal({ isOpen: true, description: '' })} style={styles.btnPrimary}>
              Guardar Backup Local
            </button>
            <button onClick={handleDownload} style={styles.btnSecondary}>
              Baixar Backup (.json)
            </button>
          </div>

          <div style={styles.uploadBox}>
            <label style={styles.uploadLabel}>Restaurar Backup a partir de Ficheiro</label>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleFileChange}
              style={styles.fileInput}
            />
          </div>
        </div>

        {/* Backups Internos Disponíveis */}
        <div style={styles.card}>
          <h4 style={styles.cardTitle}>Backups Locais Disponíveis</h4>
          <div style={styles.tableWrapper}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Operador</th>
                  <th>Funcionários</th>
                  <th>Tamanho</th>
                  <th>Descrição</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.id} style={styles.tr}>
                    <td>{new Date(b.timestamp).toLocaleString()}</td>
                    <td>{b.user}</td>
                    <td>{b.employeeCount || 0}</td>
                    <td>{b.size}</td>
                    <td>
                      <span style={b.description.includes('Auto') ? styles.badgeAuto : styles.badgeManual}>
                        {b.description}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleRestoreLocalBackup(b)} style={styles.btnAction}>
                        Restaurar
                      </button>
                    </td>
                  </tr>
                ))}
                {backups.length === 0 && (
                  <tr>
                    <td colSpan="6" style={styles.empty}>Sem backups locais registados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Histórico e Auditoria */}
        <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
          <h4 style={styles.cardTitle}>Auditoria de Operações (Histórico de Backups)</h4>
          <div style={styles.tableWrapper}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Utilizador</th>
                  <th>Endereço IP</th>
                  <th>Operação</th>
                  <th>Registos Afetados</th>
                  <th>Resultado</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} style={styles.tr}>
                    <td>{new Date(h.timestamp).toLocaleString()}</td>
                    <td>{h.user}</td>
                    <td>{h.ip}</td>
                    <td>{h.action}</td>
                    <td>{h.affectedRecords}</td>
                    <td>
                      <span style={h.result === 'Sucesso' ? styles.resultSuccess : styles.resultError}>
                        {h.result}
                      </span>
                    </td>
                    <td>{h.details}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan="7" style={styles.empty}>Sem histórico de auditoria registado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirm Manual Backup Modal */}
      <ConfirmModal 
        isOpen={confirmManualBackupModal.isOpen}
        title="Guardar Cópia de Segurança Local"
        message={
          <div>
            <p style={{ marginBottom: '10px' }}>Indique uma descrição para identificar esta cópia local:</p>
            <input 
              type="text" 
              value={confirmManualBackupModal.description} 
              onChange={(e) => setConfirmManualBackupModal(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Ex: Backup antes da migração de províncias"
              style={styles.modalInput}
            />
          </div>
        }
        onConfirm={() => handleManualBackup(confirmManualBackupModal.description)}
        onCancel={() => setConfirmManualBackupModal({ isOpen: false, description: '' })}
        confirmText="Confirmar Cópia"
        cancelText="Cancelar"
      />

      {/* Confirm Restore Modal */}
      <ConfirmModal 
        isOpen={confirmRestoreModal.isOpen}
        title="Aviso Crítico: Restaurar Cadastro de Funcionários"
        message={
          <div>
            <p style={{ color: 'var(--color-danger)', fontWeight: '700', marginBottom: '15px' }}>
              Tem a certeza de que pretende restaurar este backup? Todos os dados atuais da Gestão de Funcionários serão substituídos pelos dados do ficheiro selecionado. Esta ação não pode ser desfeita.
            </p>
            {confirmRestoreModal.summary && (
              <div style={styles.summaryBox}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '13px' }}>Resumo do Ficheiro a Importar:</h5>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                  <li><strong>Quantidade de Funcionários:</strong> {confirmRestoreModal.summary.employees}</li>
                  <li><strong>Fotografias Associadas:</strong> {confirmRestoreModal.summary.photos}</li>
                  <li><strong>Documentos Associados:</strong> {confirmRestoreModal.summary.documents || 0}</li>
                  <li><strong>Data de Criação:</strong> {new Date(confirmRestoreModal.summary.timestamp).toLocaleString()}</li>
                  <li><strong>Operador Responsável:</strong> {confirmRestoreModal.summary.user}</li>
                </ul>
              </div>
            )}
          </div>
        }
        isDestructive={true}
        onConfirm={executeRestore}
        onCancel={() => setConfirmRestoreModal({ isOpen: false, payload: null, summary: null })}
        confirmText="Confirmar Restauro"
        cancelText="Cancelar"
      />

      {/* Alert Modal */}
      <ConfirmModal 
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        onConfirm={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        hideCancel={true}
        confirmText="OK"
      />
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.3s ease-out' },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: 'var(--color-primary)', margin: 0 },
  description: { fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginTop: '10px' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '15px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' },
  btnGroup: { display: 'flex', gap: '10px', marginBottom: '20px' },
  btnPrimary: { padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', flex: 1 },
  btnSecondary: { padding: '10px 16px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', flex: 1 },
  uploadBox: { display: 'flex', flexDirection: 'column', gap: '8px' },
  uploadLabel: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  fileInput: { padding: '8px', border: '1px dashed var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-base)', cursor: 'pointer', color: 'var(--color-text-base)', fontSize: '13px' },
  tableWrapper: { maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-base)', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '10px 12px', color: 'var(--color-text-base)', verticalAlign: 'middle' },
  btnAction: { padding: '4px 8px', backgroundColor: 'rgba(27, 54, 93, 0.08)', color: 'var(--color-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  empty: { textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  badgeAuto: { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  badgeManual: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  resultSuccess: { color: 'var(--color-success)', fontWeight: '700' },
  resultError: { color: 'var(--color-danger)', fontWeight: '700' },
  modalInput: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px', outline: 'none' },
  summaryBox: { backgroundColor: 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)', marginTop: '10px' }
};
