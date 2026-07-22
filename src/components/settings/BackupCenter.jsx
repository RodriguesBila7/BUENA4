import React, { useState, useEffect, useCallback } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import ConfirmModal from '../ConfirmModal';

// Utilitários de backup individuais
import {
  createBackupPayload as createOrgBackup,
  validateBackupPayload as validateOrgBackup,
  saveInternalBackup as saveOrgBackup,
} from '../../utils/orgBackupUtils';

import {
  createEmployeeBackupPayload as createEmpBackup,
  validateEmployeeBackupPayload as validateEmpBackup,
  saveInternalEmployeeBackup as saveEmpBackup,
} from '../../utils/empBackupUtils';

// Motor de backup geral do sistema
import {
  createFullSystemBackup,
  validateSystemBackup,
  restoreFullSystemBackup,
  getGlobalBackupHistory,
  getAllLocalBackups,
  getModuleStats,
  logGlobalHistory,
} from '../../utils/systemBackupUtils';

// Tabs internas da Central de Backup
const TABS = [
  { id: 'overview', label: 'Resumo', icon: 'M3 3h18v18H3z' },
  { id: 'org', label: 'Estrutura Orgânica', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { id: 'employees', label: 'Funcionários', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
  { id: 'full', label: 'Backup Geral', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { id: 'history', label: 'Histórico & Auditoria', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
];

export default function BackupCenter({ t }) {
  const { employees, restoreEmployeeBackupData } = useEmployeeData();
  const orgHook = useOrgData();
  const { data: orgData, restoreBackupData: restoreOrgData } = orgHook;

  const [activeTab, setActiveTab] = useState('overview');
  const [moduleStats, setModuleStats] = useState({});
  const [allBackups, setAllBackups] = useState([]);
  const [history, setHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal states
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null, isDestructive: false });
  const [descModal, setDescModal] = useState({ isOpen: false, module: '', description: '', onConfirm: null });
  const [restoreModal, setRestoreModal] = useState({ isOpen: false, module: '', payload: null, summary: null });

  const showAlert = (title, message) => setAlertModal({ isOpen: true, title, message });

  const reload = useCallback(() => {
    setModuleStats(getModuleStats());
    setAllBackups(getAllLocalBackups());
    setHistory(getGlobalBackupHistory());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ─── BACKUP MANUAL ─────────────────────────────────────────────────────────

  const handleSaveOrgBackup = (desc) => {
    saveOrgBackup(orgData, 'Administrador', desc || 'Backup Manual – Estrutura Orgânica');
    logGlobalHistory('Administrador', `Backup Manual – Estrutura Orgânica`, 'Backup', 'Sucesso', {
      directorates: orgData.directorates?.length || 0,
      departments: orgData.departments?.length || 0,
    });
    reload();
    showAlert('Backup Guardado', 'Cópia de segurança da Estrutura Orgânica guardada com sucesso!');
  };

  const handleSaveEmpBackup = (desc) => {
    saveEmpBackup(employees, 'Administrador', desc || 'Backup Manual – Funcionários');
    logGlobalHistory('Administrador', `Backup Manual – Funcionários`, 'Backup', 'Sucesso', { total: employees.length });
    reload();
    showAlert('Backup Guardado', 'Cópia de segurança dos Funcionários guardada com sucesso!');
  };

  // ─── DOWNLOAD ──────────────────────────────────────────────────────────────

  const downloadJSON = (payload, prefix) => {
    const str = JSON.stringify(payload, null, 2);
    const dateStr = new Date().toISOString().replace(/[-:T]/g, '_').split('.')[0];
    const fileName = `${prefix}_${dateStr}.json`;
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadOrg = () => {
    const payload = createOrgBackup(orgData, 'Administrador', 'Exportação Manual');
    downloadJSON(payload, 'estrutura_organica');
    saveOrgBackup(orgData, 'Administrador', 'Ficheiro descarregado – Estrutura');
    reload();
  };

  const handleDownloadEmp = () => {
    const payload = createEmpBackup(employees, 'Administrador', 'Exportação Manual');
    downloadJSON(payload, 'funcionarios');
    saveEmpBackup(employees, 'Administrador', 'Ficheiro descarregado – Funcionários');
    reload();
  };

  const handleDownloadFull = async () => {
    setIsGenerating(true);
    try {
      const { payload, sizeKB } = createFullSystemBackup('Administrador');
      downloadJSON(payload, 'backup_completo_SIGRH');
      logGlobalHistory('Administrador', 'Backup Geral Descarregado', 'Backup Geral', 'Sucesso', payload.metadata.stats || {}, `Tamanho: ${sizeKB} KB`);
      reload();
      showAlert('Backup Geral Concluído', `Backup geral do sistema descarregado com sucesso. Tamanho: ${sizeKB} KB.`);
    } catch (err) {
      showAlert('Erro', `Falha ao gerar o backup geral: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── RESTAURO POR FICHEIRO ─────────────────────────────────────────────────

  const handleFileUpload = (e, moduleType) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const payload = JSON.parse(ev.target.result);
        let validation;
        let summary = null;

        if (moduleType === 'org') {
          validation = validateOrgBackup(payload);
          if (validation.isValid) summary = { ...validation.counts, module: 'Estrutura Orgânica' };
        } else if (moduleType === 'employees') {
          validation = validateEmpBackup(payload);
          if (validation.isValid) summary = { ...validation.counts, module: 'Funcionários' };
        } else if (moduleType === 'full') {
          validation = validateSystemBackup(payload);
          if (validation.isValid) summary = { ...validation.metadata, module: 'Sistema Completo' };
        }

        if (!validation.isValid) {
          showAlert('Ficheiro Inválido', `Erro de validação: ${validation.error}`);
          return;
        }
        setRestoreModal({ isOpen: true, module: moduleType, payload, summary });
      } catch {
        showAlert('Erro de Leitura', 'O ficheiro selecionado não é um JSON válido ou está corrompido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeRestore = async () => {
    const { module, payload } = restoreModal;
    setRestoreModal({ isOpen: false, module: '', payload: null, summary: null });
    try {
      if (module === 'org') {
        restoreOrgData(payload, 'Administrador');
        logGlobalHistory('Administrador', 'Restauração – Estrutura Orgânica', 'Restauração', 'Sucesso', payload.data || {});
      } else if (module === 'employees') {
        restoreEmployeeBackupData(payload, 'Administrador');
        logGlobalHistory('Administrador', 'Restauração – Funcionários', 'Restauração', 'Sucesso', { total: payload.data?.employees?.length || 0 });
      } else if (module === 'full') {
        restoreFullSystemBackup(payload, 'Administrador');
        // Forçar re-carregamento da app após restauro geral
        setTimeout(() => window.location.reload(), 800);
      }
      reload();
      showAlert('Restauração Concluída', 'Os dados foram restaurados com sucesso a partir do ficheiro selecionado!');
    } catch (err) {
      showAlert('Falha no Restauro', `Restauração abortada. Os dados originais foram mantidos intactos.\n\nDetalhe: ${err.message}`);
    }
  };

  const handleRestoreLocalBackup = (backup) => {
    const isOrg = backup.module === 'Estrutura Orgânica';
    const payload = backup.payload;
    const validation = isOrg ? validateOrgBackup(payload) : validateEmpBackup(payload);
    if (!validation.isValid) {
      showAlert('Erro de Validação', validation.error);
      return;
    }
    setRestoreModal({
      isOpen: true,
      module: isOrg ? 'org' : 'employees',
      payload,
      summary: { ...validation.counts, module: backup.module }
    });
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Central de Backup e Restauração</h2>
          <p style={styles.subtitle}>Gestão centralizada e auditável das cópias de segurança de todos os módulos do sistema.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`evaluation-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: RESUMO ── */}
      {activeTab === 'overview' && (
        <OverviewTab stats={moduleStats} backups={allBackups} onRestore={handleRestoreLocalBackup} onRefresh={reload} />
      )}

      {/* ── TAB: ESTRUTURA ORGÂNICA ── */}
      {activeTab === 'org' && (
        <ModuleBackupTab
          title="Estrutura Orgânica"
          description="Direções, Departamentos, Repartições, Secções, Carreiras e Categorias."
          onSaveBackup={() => setDescModal({ isOpen: true, module: 'org', description: '', onConfirm: (d) => handleSaveOrgBackup(d) })}
          onDownload={handleDownloadOrg}
          onFileChange={(e) => handleFileUpload(e, 'org')}
          backups={allBackups.filter(b => b.module === 'Estrutura Orgânica')}
          onRestore={handleRestoreLocalBackup}
        />
      )}

      {/* ── TAB: FUNCIONÁRIOS ── */}
      {activeTab === 'employees' && (
        <ModuleBackupTab
          title="Gestão de Funcionários"
          description="Fichas completas dos colaboradores, fotografias e dados de colocação."
          onSaveBackup={() => setDescModal({ isOpen: true, module: 'employees', description: '', onConfirm: (d) => handleSaveEmpBackup(d) })}
          onDownload={handleDownloadEmp}
          onFileChange={(e) => handleFileUpload(e, 'employees')}
          backups={allBackups.filter(b => b.module === 'Funcionários')}
          onRestore={handleRestoreLocalBackup}
        />
      )}

      {/* ── TAB: BACKUP GERAL ── */}
      {activeTab === 'full' && (
        <FullBackupTab
          isGenerating={isGenerating}
          onDownload={handleDownloadFull}
          onFileChange={(e) => handleFileUpload(e, 'full')}
          stats={moduleStats}
        />
      )}

      {/* ── TAB: HISTÓRICO ── */}
      {activeTab === 'history' && <HistoryTab history={history} />}

      {/* ─── MODAIS ─── */}

      {/* Descrição para backup manual */}
      <ConfirmModal
        isOpen={descModal.isOpen}
        title="Descrição do Backup"
        message={
          <div>
            <p style={{ marginBottom: '10px', fontSize: '14px' }}>Indique uma descrição para identificar esta cópia:</p>
            <input
              type="text"
              value={descModal.description}
              onChange={(e) => setDescModal(p => ({ ...p, description: e.target.value }))}
              placeholder="Ex: Antes da reorganização das direcções"
              style={styles.modalInput}
              autoFocus
            />
          </div>
        }
        onConfirm={() => {
          const fn = descModal.onConfirm;
          const desc = descModal.description;
          setDescModal({ isOpen: false, module: '', description: '', onConfirm: null });
          fn && fn(desc);
        }}
        onCancel={() => setDescModal({ isOpen: false, module: '', description: '', onConfirm: null })}
        confirmText="Guardar Backup"
        cancelText="Cancelar"
      />

      {/* Confirmação de restauro */}
      <ConfirmModal
        isOpen={restoreModal.isOpen}
        title="⚠️ Aviso Crítico de Restauração"
        isDestructive
        message={
          <div>
            <p style={{ color: 'var(--color-danger)', fontWeight: '700', marginBottom: '12px' }}>
              Tem a certeza? Todos os dados atuais do módulo <strong>{restoreModal.summary?.module}</strong> serão substituídos pelos dados do ficheiro selecionado. Esta ação não pode ser desfeita.
            </p>
            {restoreModal.summary && (
              <div style={styles.summaryBox}>
                <strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>Resumo do ficheiro a restaurar:</strong>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', lineHeight: '1.8' }}>
                  {restoreModal.summary.employees !== undefined && <li><strong>Funcionários:</strong> {restoreModal.summary.employees}</li>}
                  {restoreModal.summary.photos !== undefined && <li><strong>Fotografias:</strong> {restoreModal.summary.photos}</li>}
                  {restoreModal.summary.documents !== undefined && <li><strong>Documentos:</strong> {restoreModal.summary.documents}</li>}
                  {restoreModal.summary.directorates !== undefined && <li><strong>Direções:</strong> {restoreModal.summary.directorates}</li>}
                  {restoreModal.summary.departments !== undefined && <li><strong>Departamentos:</strong> {restoreModal.summary.departments}</li>}
                  {restoreModal.summary.timestamp && <li><strong>Data do backup:</strong> {new Date(restoreModal.summary.timestamp).toLocaleString()}</li>}
                  {restoreModal.summary.user && <li><strong>Operador:</strong> {restoreModal.summary.user}</li>}
                  {restoreModal.summary.sizeKB && <li><strong>Tamanho:</strong> {restoreModal.summary.sizeKB}</li>}
                </ul>
              </div>
            )}
          </div>
        }
        onConfirm={executeRestore}
        onCancel={() => setRestoreModal({ isOpen: false, module: '', payload: null, summary: null })}
        confirmText="Confirmar Restauro"
        cancelText="Cancelar"
      />

      {/* Alert genérico */}
      <ConfirmModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        onConfirm={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        hideCancel
        confirmText="OK"
      />
    </div>
  );
}

// ─── SUB-COMPONENTES ───────────────────────────────────────────────────────────

function OverviewTab({ stats, backups, onRestore, onRefresh }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cards de estado dos módulos */}
      <div style={styles.overviewGrid}>
        <ModuleCard title="Estrutura Orgânica" color="#3b82f6">
          {stats.org ? (
            <>
              <StatRow label="Direções" value={stats.org.directorates} />
              <StatRow label="Departamentos" value={stats.org.departments} />
              <StatRow label="Repartições" value={stats.org.divisions} />
              <StatRow label="Secções" value={stats.org.sections} />
              <StatRow label="Categorias" value={stats.org.categories} />
            </>
          ) : <p style={styles.emptyNote}>Sem dados</p>}
        </ModuleCard>

        <ModuleCard title="Funcionários" color="#10b981">
          {stats.employees ? (
            <>
              <StatRow label="Total de Funcionários" value={stats.employees.total} />
              <StatRow label="Ativos" value={stats.employees.active} />
              <StatRow label="Com fotografia" value={stats.employees.photos} />
            </>
          ) : <p style={styles.emptyNote}>Sem dados</p>}
        </ModuleCard>

        <ModuleCard title="Avaliações" color="#f59e0b">
          {stats.evaluations ? (
            <StatRow label="Total de avaliações" value={stats.evaluations.total} />
          ) : <p style={styles.emptyNote}>Sem dados</p>}
        </ModuleCard>

        <ModuleCard title="Processos Disciplinares" color="#ef4444">
          {stats.disciplinary ? (
            <StatRow label="Total de processos" value={stats.disciplinary.total} />
          ) : <p style={styles.emptyNote}>Sem dados</p>}
        </ModuleCard>
      </div>

      {/* Lista de backups locais disponíveis */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h4 style={styles.cardTitle}>Backups Locais Disponíveis</h4>
          <button onClick={onRefresh} style={styles.btnRefresh}>⟳ Atualizar</button>
        </div>
        <BackupsTable backups={backups} onRestore={onRestore} />
      </div>
    </div>
  );
}

function ModuleBackupTab({ title, description, onSaveBackup, onDownload, onFileChange, backups, onRestore }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={styles.actionsCard}>
        <h4 style={styles.cardTitle}>{title}</h4>
        <p style={styles.descText}>{description}</p>
        <div style={styles.actionBtns}>
          <ActionBtn icon="💾" label="Guardar Backup Local" onClick={onSaveBackup} color="var(--color-primary)" light="var(--color-accent)" />
          <ActionBtn icon="⬇" label="Baixar Backup (.json)" onClick={onDownload} color="#10b981" light="#fff" />
          <label style={{ ...styles.actionBtnBase, backgroundColor: '#f59e0b', color: '#fff', cursor: 'pointer' }}>
            <span style={{ fontSize: '18px' }}>📂</span>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>Restaurar de Ficheiro</span>
            <input type="file" accept=".json" onChange={onFileChange} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
      <div style={styles.card}>
        <h4 style={styles.cardTitle}>Backups Locais – {title}</h4>
        <BackupsTable backups={backups} onRestore={onRestore} />
      </div>
    </div>
  );
}

function FullBackupTab({ isGenerating, onDownload, onFileChange, stats }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ ...styles.actionsCard, borderLeft: '4px solid var(--color-primary)' }}>
        <h4 style={styles.cardTitle}>Backup Geral do Sistema</h4>
        <p style={styles.descText}>
          Exporta <strong>todos os dados da aplicação</strong> (Estrutura Orgânica, Funcionários, Avaliações, Processos Disciplinares e Configurações do Sistema) num único ficheiro JSON.
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
          <button onClick={onDownload} disabled={isGenerating} style={{ ...styles.bigBtn, opacity: isGenerating ? 0.7 : 1 }}>
            {isGenerating ? (
              <span>⏳ A gerar backup...</span>
            ) : (
              <>⬇ Baixar Backup Geral do Sistema</>
            )}
          </button>
          <label style={{ ...styles.bigBtn, backgroundColor: '#f59e0b', cursor: 'pointer' }}>
            📂 Restaurar Backup Geral
            <input type="file" accept=".json" onChange={onFileChange} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div style={styles.card}>
        <h4 style={styles.cardTitle}>Estado Atual do Sistema (a incluir no backup)</h4>
        <div style={styles.overviewGrid}>
          {stats.org && <StatCard label="Direções" value={stats.org.directorates} />}
          {stats.employees && <StatCard label="Funcionários" value={stats.employees.total} />}
          {stats.evaluations && <StatCard label="Avaliações" value={stats.evaluations.total} />}
          {stats.disciplinary && <StatCard label="Processos Disciplinares" value={stats.disciplinary.total} />}
        </div>
      </div>

      <div style={{ ...styles.card, backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
          ⚠️ Aviso: A restauração de um Backup Geral irá substituir <strong>todos</strong> os dados ativos da aplicação e exige um recarregamento da página. Certifique-se de que guarda uma cópia antes de restaurar.
        </p>
      </div>
    </div>
  );
}

function HistoryTab({ history }) {
  return (
    <div style={styles.card}>
      <h4 style={styles.cardTitle}>Histórico Unificado de Auditoria</h4>
      <p style={styles.descText}>Registo cronológico de todas as operações de backup e restauração do sistema.</p>
      <div style={styles.tableWrapper}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Data / Hora</th>
              <th>Utilizador</th>
              <th>IP</th>
              <th>Módulo</th>
              <th>Operação</th>
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
                <td>{h.ip || '—'}</td>
                <td>{h.source || '—'}</td>
                <td>{h.action}</td>
                <td>{h.type}</td>
                <td>
                  <span style={h.result === 'Sucesso' ? styles.badgeSuccess : styles.badgeError}>{h.result}</span>
                </td>
                <td style={{ ...styles.td, maxWidth: '200px', wordBreak: 'break-word', fontSize: '11px' }}>{h.details || '—'}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan="8" style={styles.empty}>Sem histórico de auditoria registado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BackupsTable({ backups, onRestore }) {
  return (
    <div style={styles.tableWrapper}>
      <table className="premium-table">
        <thead>
          <tr>
            <th>Data / Hora</th>
            <th>Módulo</th>
            <th>Responsável</th>
            <th>Registos</th>
            <th>Tamanho</th>
            <th>Descrição</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {backups.map(b => (
            <tr key={b.id} style={styles.tr}>
              <td>{new Date(b.timestamp).toLocaleString()}</td>
              <td><span style={b.module === 'Funcionários' ? styles.badgeEmp : styles.badgeOrg}>{b.module}</span></td>
              <td>{b.user}</td>
              <td>{b.employeeCount ?? '—'}</td>
              <td>{b.size}</td>
              <td>
                <span style={b.description?.includes('Auto') ? styles.badgeAuto : styles.badgeManual}>{b.description}</span>
              </td>
              <td>
                <button onClick={() => onRestore(b)} style={styles.btnAction}>Restaurar</button>
              </td>
            </tr>
          ))}
          {backups.length === 0 && (
            <tr><td colSpan="7" style={styles.empty}>Sem backups locais disponíveis.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ModuleCard({ title, color, children }) {
  return (
    <div style={{ ...styles.card, borderTop: `3px solid ${color}` }}>
      <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color }}>{title}</h5>
      {children}
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <strong>{value ?? 0}</strong>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-primary)' }}>{value ?? 0}</div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, color, light }) {
  return (
    <button onClick={onClick} style={{ ...styles.actionBtnBase, backgroundColor: color, color: light }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span style={{ fontSize: '12px', fontWeight: '600' }}>{label}</span>
    </button>
  );
}

const styles = {
  container: { padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease-out' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' },
  title: { fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)', margin: 0 },
  subtitle: { color: 'var(--color-text-muted)', fontSize: '14px', margin: '6px 0 0 0' },
  tabs: { display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', overflowX: 'auto', flexWrap: 'nowrap' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  actionsCard: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: 'var(--color-primary)', margin: '0 0 8px 0' },
  descText: { fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 0 0' },
  overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  actionBtns: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' },
  actionBtnBase: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '16px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', minWidth: '130px', transition: 'opacity 0.2s' },
  bigBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 24px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  btnRefresh: { padding: '6px 12px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  tableWrapper: { maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-base)', textTransform: 'uppercase', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '10px 12px', color: 'var(--color-text-base)', verticalAlign: 'middle' },
  btnAction: { padding: '4px 10px', backgroundColor: 'rgba(27, 54, 93, 0.08)', color: 'var(--color-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  empty: { textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  emptyNote: { color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '13px', margin: 0 },
  badgeSuccess: { color: '#10b981', fontWeight: '700' },
  badgeError: { color: '#ef4444', fontWeight: '700' },
  badgeAuto: { backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  badgeManual: { backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  badgeOrg: { backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  badgeEmp: { backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' },
  modalInput: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
  summaryBox: { backgroundColor: 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)', marginTop: '10px' },
};
