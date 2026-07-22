import React, { useState, useEffect } from 'react';
import useOrgData from '../hooks/useOrgData';
import { 
  createBackupPayload, 
  validateBackupPayload, 
  saveInternalBackup 
} from '../utils/orgBackupUtils';
import ConfirmModal from './ConfirmModal';

export default function OrgBackupPanel({ t }) {
  const { data, restoreBackupData } = useOrgData();
  const [backups, setBackups] = useState([]);
  const [history, setHistory] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  
  // Modal states
  const [confirmRestoreModal, setConfirmRestoreModal] = useState({ isOpen: false, payload: null, summary: null });
  const [confirmManualBackupModal, setConfirmManualBackupModal] = useState({ isOpen: false, description: '' });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

  // Load backups and history on mount
  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = () => {
    try {
      const savedBackups = JSON.parse(localStorage.getItem('sernic_org_backups') || '[]');
      const savedHistory = JSON.parse(localStorage.getItem('sernic_org_backup_history') || '[]');
      setBackups(savedBackups);
      setHistory(savedHistory);
    } catch (e) {
      console.error("Erro ao ler dados de backup:", e);
    }
  };

  const handleManualBackup = (desc) => {
    saveInternalBackup(data, 'Administrador', desc || 'Backup Manual');
    loadBackupData();
    setConfirmManualBackupModal({ isOpen: false, description: '' });
    setAlertModal({ isOpen: true, title: 'Backup Concluído', message: 'Cópia de segurança guardada localmente com sucesso!' });
  };

  const handleDownload = () => {
    const payload = createBackupPayload(data, 'Administrador', 'Exportação de Ficheiro');
    const dateStr = new Date().toISOString().replace(/[-:T]/g, '_').split('.')[0];
    const fileName = `estrutura_organica_${dateStr}.json`;
    
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Regista auditoria
    saveInternalBackup(data, 'Administrador', 'Ficheiro descarregado');
    loadBackupData();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target.result);
        const validation = validateBackupPayload(payload);
        
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
      restoreBackupData(payload, 'Administrador');
      loadBackupData();
      setAlertModal({ 
        isOpen: true, 
        title: 'Sucesso', 
        message: 'A estrutura orgânica foi totalmente restaurada e atualizada com sucesso!' 
      });
    } catch (err) {
      setAlertModal({ 
        isOpen: true, 
        title: 'Falha no Restauro', 
        message: `A restauração foi abortada e os dados originais foram mantidos intactos. Detalhe: ${err.message}` 
      });
    }
  };

  const handleRestoreLocalBackup = (localBackup) => {
    setConfirmRestoreModal({
      isOpen: true,
      payload: localBackup.payload,
      summary: validateBackupPayload(localBackup.payload).counts
    });
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.sectionTitle}>Gestão de Backup da Estrutura Orgânica</h3>
      <p style={styles.description}>
        Copiar, descarregar ou restaurar as definições organizacionais (Direções, Departamentos, Repartições, Secções e Categorias).
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
                  <th>Responsável</th>
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
                    <td colSpan="5" style={styles.empty}>Sem backups locais registados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Histórico e Auditoria */}
        <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
          <h4 style={styles.cardTitle}>Histórico de Operações (Auditoria)</h4>
          <div style={styles.tableWrapper}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Utilizador</th>
                  <th>Ação</th>
                  <th>Tipo</th>
                  <th>Resultado</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} style={styles.tr}>
                    <td>{new Date(h.timestamp).toLocaleString()}</td>
                    <td>{h.user}</td>
                    <td>{h.action}</td>
                    <td>{h.type}</td>
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
                    <td colSpan="6" style={styles.empty}>Sem histórico de auditoria registado.</td>
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
              placeholder="Ex: Backup antes de organizar Direções"
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
        title="Aviso Crítico: Restaurar Estrutura Orgânica"
        message={
          <div>
            <p style={{ color: 'var(--color-danger)', fontWeight: '700', marginBottom: '15px' }}>
              Tem a certeza de que pretende restaurar este backup? Todos os dados atuais da Estrutura Orgânica serão substituídos pelos dados do ficheiro selecionado. Esta ação não pode ser desfeita.
            </p>
            {confirmRestoreModal.summary && (
              <div style={styles.summaryBox}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '13px' }}>Resumo de Entidades a Importar:</h5>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                  <li><strong>Direções:</strong> {confirmRestoreModal.summary.directorates}</li>
                  <li><strong>Departamentos:</strong> {confirmRestoreModal.summary.departments}</li>
                  <li><strong>Repartições:</strong> {confirmRestoreModal.summary.divisions}</li>
                  <li><strong>Secções:</strong> {confirmRestoreModal.summary.sections}</li>
                  <li><strong>Categorias:</strong> {confirmRestoreModal.summary.categories}</li>
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
