import React, { useState, useMemo } from 'react';
import useVacationData from '../../hooks/useVacationData';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import { 
  detectVacationAlerts, 
  ALERT_TYPES, 
  formatDisplayDate,
  DEFAULT_TEMPLATES 
} from '../../utils/vacationAlerts';
import ConfirmModal from '../ConfirmModal';

export default function VacationAlerts({ onGoToSettings }) {
  const { requests, settings, updateRequest } = useVacationData();
  const { employees } = useEmployeeData();
  const { orgData } = useOrgData();

  // Data de referência (hoje por defeito)
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlertForModal, setSelectedAlertForModal] = useState(null);
  const [copiedAlertId, setCopiedAlertId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '' });

  // Calcular alertas para a data selecionada
  const allAlerts = useMemo(() => {
    return detectVacationAlerts(
      requests || [],
      employees || [],
      orgData || {},
      settings?.messageTemplates || DEFAULT_TEMPLATES,
      selectedDate
    );
  }, [requests, employees, orgData, settings, selectedDate]);

  // Contagens dos 3 momentos
  const counts = useMemo(() => {
    return {
      startToday: allAlerts.filter(a => a.alertType === ALERT_TYPES.START_TODAY).length,
      fiveDays: allAlerts.filter(a => a.alertType === ALERT_TYPES.FIVE_DAYS_BEFORE).length,
      oneDayReturn: allAlerts.filter(a => a.alertType === ALERT_TYPES.ONE_DAY_BEFORE_RETURN).length,
      total: allAlerts.length
    };
  }, [allAlerts]);

  // Filtragem
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(alert => {
      // Filtro de tipo
      if (activeFilter === ALERT_TYPES.START_TODAY && alert.alertType !== ALERT_TYPES.START_TODAY) return false;
      if (activeFilter === ALERT_TYPES.FIVE_DAYS_BEFORE && alert.alertType !== ALERT_TYPES.FIVE_DAYS_BEFORE) return false;
      if (activeFilter === ALERT_TYPES.ONE_DAY_BEFORE_RETURN && alert.alertType !== ALERT_TYPES.ONE_DAY_BEFORE_RETURN) return false;
      
      // Filtro de texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = alert.employeeName && alert.employeeName.toLowerCase().includes(term);
        const matchesNip = alert.nip && alert.nip.toLowerCase().includes(term);
        const matchesDept = alert.department && alert.department.toLowerCase().includes(term);
        const matchesPhone = alert.phone && alert.phone.includes(term);
        if (!matchesName && !matchesNip && !matchesDept && !matchesPhone) return false;
      }

      return true;
    });
  }, [allAlerts, activeFilter, searchTerm]);

  // Marcar como enviado
  const handleMarkAsSent = async (alert) => {
    const req = requests.find(r => r.id === alert.requestId);
    if (!req) return;

    const notified = { ...(req.notified || {}) };
    const nowIso = new Date().toISOString();

    if (alert.alertType === ALERT_TYPES.START_TODAY) notified.start = nowIso;
    else if (alert.alertType === ALERT_TYPES.FIVE_DAYS_BEFORE) notified.fiveDays = nowIso;
    else if (alert.alertType === ALERT_TYPES.ONE_DAY_BEFORE_RETURN) notified.returnEve = nowIso;

    await updateRequest(req.id, { notified }, 'Sistema', `Alerta de férias enviado (${alert.alertTitle})`);
  };

  // Copiar mensagem para a área de transferência
  const handleCopyText = (alert) => {
    navigator.clipboard.writeText(alert.messageText);
    setCopiedAlertId(alert.id);
    setTimeout(() => setCopiedAlertId(null), 2500);
  };

  // Abrir WhatsApp e marcar enviado
  const handleSendWhatsApp = (alert) => {
    if (!alert.whatsappUrl) {
      alert('Contacto de telefone não registado para este funcionário.');
      return;
    }
    window.open(alert.whatsappUrl, '_blank');
    handleMarkAsSent(alert);
  };

  // Disparo em lote
  const handleBatchDispatch = () => {
    const pending = filteredAlerts.filter(a => !a.alreadySent && a.whatsappUrl);
    if (pending.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Nenhum Alerta Pendente',
        message: 'Todos os alertas da lista atual já foram enviados ou os funcionários não têm contactos telefónicos cadastrados.',
        hideCancel: true
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Disparo de Alertas em Lote',
      message: `Deseja abrir as mensagens de WhatsApp para os ${pending.length} funcionários pendentes e marcar como enviadas?`,
      onConfirm: () => {
        pending.forEach((alert, idx) => {
          setTimeout(() => {
            window.open(alert.whatsappUrl, '_blank');
            handleMarkAsSent(alert);
          }, idx * 600);
        });
      }
    });
  };

  return (
    <div style={styles.container}>
      {/* CABEÇALHO */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📢 Central de Alertas e Mensagens de Férias</h2>
          <p style={styles.subtitle}>
            Monitorização automática e comunicação aos contactos registados (Início, 5 dias para o término e véspera de reinício).
          </p>
        </div>

        {/* SELETOR DE DATA DE REFERÊNCIA */}
        <div style={styles.dateSelectorBox}>
          <label style={styles.dateLabel}>Data de Referência:</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            style={styles.dateInput} 
          />
          {selectedDate !== todayStr && (
            <button onClick={() => setSelectedDate(todayStr)} style={styles.btnToday}>
              Voltar a Hoje
            </button>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={styles.kpiGrid}>
        <div 
          style={{ ...styles.kpiCard, borderLeft: '4px solid #059669', cursor: 'pointer' }}
          onClick={() => setActiveFilter(activeFilter === ALERT_TYPES.START_TODAY ? 'ALL' : ALERT_TYPES.START_TODAY)}
        >
          <div style={styles.kpiTop}>
            <span style={styles.kpiIcon}>🌴</span>
            <span style={{ ...styles.kpiBadge, backgroundColor: '#ecfdf5', color: '#059669' }}>Gatilho 1</span>
          </div>
          <div style={styles.kpiValue}>{counts.startToday}</div>
          <div style={styles.kpiLabel}>Iniciam Férias Hoje</div>
          <div style={styles.kpiSub}>Mensagem de início e confirmação</div>
        </div>

        <div 
          style={{ ...styles.kpiCard, borderLeft: '4px solid #d97706', cursor: 'pointer' }}
          onClick={() => setActiveFilter(activeFilter === ALERT_TYPES.FIVE_DAYS_BEFORE ? 'ALL' : ALERT_TYPES.FIVE_DAYS_BEFORE)}
        >
          <div style={styles.kpiTop}>
            <span style={styles.kpiIcon}>⏳</span>
            <span style={{ ...styles.kpiBadge, backgroundColor: '#fffbeb', color: '#d97706' }}>Gatilho 2</span>
          </div>
          <div style={styles.kpiValue}>{counts.fiveDays}</div>
          <div style={styles.kpiLabel}>5 Dias para o Término</div>
          <div style={styles.kpiSub}>Alerta preventivo de regresso</div>
        </div>

        <div 
          style={{ ...styles.kpiCard, borderLeft: '4px solid #dc2626', cursor: 'pointer' }}
          onClick={() => setActiveFilter(activeFilter === ALERT_TYPES.ONE_DAY_BEFORE_RETURN ? 'ALL' : ALERT_TYPES.ONE_DAY_BEFORE_RETURN)}
        >
          <div style={styles.kpiTop}>
            <span style={styles.kpiIcon}>🚨</span>
            <span style={{ ...styles.kpiBadge, backgroundColor: '#fef2f2', color: '#dc2626' }}>Gatilho 3</span>
          </div>
          <div style={styles.kpiValue}>{counts.oneDayReturn}</div>
          <div style={styles.kpiLabel}>1 Dia para Reinício (Amanhã)</div>
          <div style={styles.kpiSub}>Convocatória de apresentação</div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #B71C1C' }}>
          <div style={styles.kpiTop}>
            <span style={styles.kpiIcon}>📲</span>
            <span style={{ ...styles.kpiBadge, backgroundColor: '#eff6ff', color: '#B71C1C' }}>Total</span>
          </div>
          <div style={styles.kpiValue}>{counts.total}</div>
          <div style={styles.kpiLabel}>Processos a Notificar</div>
          <div style={styles.kpiSub}>Na data de {formatDisplayDate(selectedDate)}</div>
        </div>
      </div>

      {/* BARRA DE FILTROS E PESQUISA */}
      <div style={styles.filterBar}>
        <div style={styles.tabButtons}>
          <button 
            style={activeFilter === 'ALL' ? styles.tabActive : styles.tabInactive}
            onClick={() => setActiveFilter('ALL')}
          >
            Todos ({counts.total})
          </button>
          <button 
            style={activeFilter === ALERT_TYPES.START_TODAY ? styles.tabActive : styles.tabInactive}
            onClick={() => setActiveFilter(ALERT_TYPES.START_TODAY)}
          >
            Iniciam Hoje ({counts.startToday})
          </button>
          <button 
            style={activeFilter === ALERT_TYPES.FIVE_DAYS_BEFORE ? styles.tabActive : styles.tabInactive}
            onClick={() => setActiveFilter(ALERT_TYPES.FIVE_DAYS_BEFORE)}
          >
            Faltam 5 Dias ({counts.fiveDays})
          </button>
          <button 
            style={activeFilter === ALERT_TYPES.ONE_DAY_BEFORE_RETURN ? styles.tabActive : styles.tabInactive}
            onClick={() => setActiveFilter(ALERT_TYPES.ONE_DAY_BEFORE_RETURN)}
          >
            Regresso Amanhã ({counts.oneDayReturn})
          </button>
        </div>

        <div style={styles.rightActions}>
          <input 
            type="text" 
            placeholder="Pesquisar por nome, NIP, telefone..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={styles.searchInput} 
          />

          {filteredAlerts.length > 0 && (
            <button onClick={handleBatchDispatch} style={styles.btnBatch}>
              ⚡ Disparar Alertas ({filteredAlerts.length})
            </button>
          )}

          {onGoToSettings && (
            <button onClick={onGoToSettings} style={styles.btnSettings}>
              ⚙️ Modelos de Mensagem
            </button>
          )}
        </div>
      </div>

      {/* LISTA DE CARDS DE ALERTAS */}
      {filteredAlerts.length === 0 ? (
        <div style={styles.emptyBox}>
          <span style={{ fontSize: '40px' }}>✅</span>
          <h3 style={{ margin: '10px 0 6px 0', color: 'var(--color-text-base)' }}>
            Nenhum alerta de férias para a data selecionada ({formatDisplayDate(selectedDate)})
          </h3>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Não existem funcionários a iniciar férias, a 5 dias do término ou na véspera de regresso nesta data.
          </p>
        </div>
      ) : (
        <div style={styles.alertList}>
          {filteredAlerts.map(alert => (
            <div key={alert.id} style={styles.alertCard}>
              {/* TOPO DO CARD */}
              <div style={styles.cardHeader}>
                <div style={styles.empInfo}>
                  <div style={styles.avatar}>
                    {alert.employeeName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={styles.empName}>{alert.employeeName}</div>
                    <div style={styles.empDetails}>
                      <span><strong>NIP:</strong> {alert.nip}</span> • 
                      <span> {alert.department}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: alert.alertBadgeBg,
                    color: alert.alertBadgeColor,
                    borderColor: alert.alertBadgeColor
                  }}>
                    {alert.alertTitle}
                  </span>

                  {alert.alreadySent && (
                    <span style={styles.sentBadge}>
                      ✓ Enviado
                    </span>
                  )}
                </div>
              </div>

              {/* CRONOGRAMA DAS DATAS */}
              <div style={styles.timelineRow}>
                <div style={styles.timelineItem}>
                  <span style={styles.timelineLabel}>Início:</span>
                  <span style={styles.timelineVal}>{formatDisplayDate(alert.startDate)}</span>
                </div>
                <div style={styles.timelineArrow}>➔</div>
                <div style={styles.timelineItem}>
                  <span style={styles.timelineLabel}>Término das Férias:</span>
                  <span style={styles.timelineVal}>{formatDisplayDate(alert.endDate)}</span>
                </div>
                <div style={styles.timelineArrow}>➔</div>
                <div style={styles.timelineItem}>
                  <span style={styles.timelineLabel}>Apresentação Oficial:</span>
                  <span style={{ ...styles.timelineVal, color: '#dc2626', fontWeight: 'bold' }}>
                    {formatDisplayDate(alert.returnDate)} (07:30)
                  </span>
                </div>
                <div style={{ ...styles.timelineItem, marginLeft: 'auto' }}>
                  <span style={styles.timelineLabel}>Contacto Registado:</span>
                  <span style={{ ...styles.timelineVal, color: alert.phone ? 'var(--color-text-base)' : '#d97706' }}>
                    {alert.phone || '⚠️ Sem Telefone Cadastrado'}
                  </span>
                </div>
              </div>

              {/* PRÉ-VISUALIZAÇÃO DA MENSAGEM */}
              <div style={styles.messageBox}>
                <div style={styles.messageBoxHeader}>
                  <span>📝 Texto Oficial Pré-Formatado:</span>
                  <button 
                    onClick={() => handleCopyText(alert)} 
                    style={styles.btnCopy}
                    title="Copiar texto para área de transferência"
                  >
                    {copiedAlertId === alert.id ? '✓ Copiado!' : '📋 Copiar Mensagem'}
                  </button>
                </div>
                <div style={styles.messageContent}>
                  {alert.messageText}
                </div>
              </div>

              {/* AÇÕES DE ENVIO */}
              <div style={styles.cardActions}>
                {alert.whatsappUrl ? (
                  <button 
                    onClick={() => handleSendWhatsApp(alert)} 
                    style={styles.btnWhatsapp}
                  >
                    <span>💬</span> Enviar por WhatsApp ({alert.phone})
                  </button>
                ) : (
                  <button disabled style={styles.btnDisabled}>
                    ❌ Sem Contacto Telefónico
                  </button>
                )}

                {alert.smsUrl && (
                  <a 
                    href={alert.smsUrl} 
                    style={styles.btnSms}
                    onClick={() => handleMarkAsSent(alert)}
                  >
                    <span>✉️</span> Enviar SMS
                  </a>
                )}

                <button 
                  onClick={() => setSelectedAlertForModal(alert)} 
                  style={styles.btnPreview}
                >
                  👁️ Personalizar / Pré-visualizar
                </button>

                {!alert.alreadySent ? (
                  <button 
                    onClick={() => handleMarkAsSent(alert)} 
                    style={styles.btnMarkSent}
                  >
                    Marcar como Notificado
                  </button>
                ) : (
                  <span style={{ fontSize: '13px', color: '#059669', alignSelf: 'center' }}>
                    ✓ Notificação Registada no Processo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO / EDIÇÃO RÁPIDA ANTES DO ENVIO */}
      {selectedAlertForModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-base)' }}>
                Mensagem para {selectedAlertForModal.employeeName}
              </h3>
              <button 
                onClick={() => setSelectedAlertForModal(null)} 
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                <strong>Tipo de Alerta:</strong> {selectedAlertForModal.alertTitle} | <strong>Contacto:</strong> {selectedAlertForModal.phone || 'Não registado'}
              </div>

              <textarea 
                value={selectedAlertForModal.messageText}
                onChange={(e) => {
                  const newText = e.target.value;
                  setSelectedAlertForModal(prev => ({
                    ...prev,
                    messageText: newText,
                    whatsappUrl: getWhatsAppUrl(prev.phone, newText),
                    smsUrl: getSmsUrl(prev.phone, newText)
                  }));
                }}
                rows={10}
                style={styles.modalTextarea}
              />
            </div>

            <div style={styles.modalFooter}>
              <button 
                onClick={() => setSelectedAlertForModal(null)} 
                style={styles.modalBtnCancel}
              >
                Fechar
              </button>

              <button 
                onClick={() => {
                  handleCopyText(selectedAlertForModal);
                  setSelectedAlertForModal(null);
                }} 
                style={styles.btnCopy}
              >
                📋 Copiar Texto
              </button>

              {selectedAlertForModal.whatsappUrl && (
                <button 
                  onClick={() => {
                    handleSendWhatsApp(selectedAlertForModal);
                    setSelectedAlertForModal(null);
                  }} 
                  style={styles.btnWhatsapp}
                >
                  💬 Enviar WhatsApp Agora
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        hideCancel={confirmModal.hideCancel}
      />
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    flexWrap: 'wrap', 
    gap: '15px',
    backgroundColor: 'var(--color-bg-elevated)',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)'
  },
  title: { fontSize: '20px', fontWeight: '700', color: 'var(--color-text-base)', margin: '0 0 6px 0' },
  subtitle: { fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 },
  dateSelectorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)'
  },
  dateLabel: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' },
  dateInput: {
    padding: '6px 10px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    backgroundColor: 'var(--color-bg-elevated)',
    color: 'var(--color-text-base)',
    fontSize: '13px'
  },
  btnToday: {
    padding: '6px 10px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' },
  kpiCard: {
    backgroundColor: 'var(--color-bg-elevated)',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  kpiTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  kpiIcon: { fontSize: '20px' },
  kpiBadge: { fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' },
  kpiValue: { fontSize: '28px', fontWeight: '800', color: 'var(--color-text-base)' },
  kpiLabel: { fontSize: '14px', fontWeight: '600', color: 'var(--color-text-base)' },
  kpiSub: { fontSize: '12px', color: 'var(--color-text-muted)' },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    backgroundColor: 'var(--color-bg-elevated)',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)'
  },
  tabButtons: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tabActive: {
    padding: '8px 14px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  tabInactive: {
    padding: '8px 14px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  rightActions: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-base)',
    fontSize: '13px',
    minWidth: '220px'
  },
  btnBatch: {
    padding: '8px 14px',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  btnSettings: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  emptyBox: {
    backgroundColor: 'var(--color-bg-elevated)',
    padding: '40px 20px',
    borderRadius: '8px',
    border: '1px dashed var(--color-border)',
    textAlign: 'center'
  },
  alertList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  alertCard: {
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
  empInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '16px'
  },
  empName: { fontSize: '16px', fontWeight: '700', color: 'var(--color-text-base)' },
  empDetails: { fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' },
  badge: {
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '700',
    border: '1px solid transparent'
  },
  sentBadge: {
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    border: '1px solid #059669'
  },
  timelineRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '10px 14px',
    borderRadius: '6px',
    flexWrap: 'wrap',
    fontSize: '13px'
  },
  timelineItem: { display: 'flex', flexDirection: 'column' },
  timelineLabel: { fontSize: '11px', color: 'var(--color-text-muted)' },
  timelineVal: { fontWeight: '600', color: 'var(--color-text-base)' },
  timelineArrow: { color: 'var(--color-text-muted)', fontWeight: 'bold' },
  messageBox: {
    backgroundColor: 'var(--color-bg-subtle)',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    overflow: 'hidden'
  },
  messageBoxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted)'
  },
  messageContent: {
    padding: '12px',
    fontSize: '13px',
    color: 'var(--color-text-base)',
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    lineHeight: '1.5'
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '12px'
  },
  btnWhatsapp: {
    padding: '8px 14px',
    backgroundColor: '#25D366',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  btnSms: {
    padding: '8px 14px',
    backgroundColor: '#B71C1C',
    color: '#fff',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '13px',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  btnPreview: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  btnCopy: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  btnMarkSent: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px dashed var(--color-border)',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    marginLeft: 'auto'
  },
  btnDisabled: {
    padding: '8px 14px',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'not-allowed'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modalBox: {
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '560px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)'
  },
  modalBody: { padding: '20px' },
  modalTextarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-base)',
    fontSize: '13px',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    boxSizing: 'border-box'
  },
  modalFooter: {
    padding: '16px 20px',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  modalBtnCancel: {
    padding: '8px 14px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    cursor: 'pointer'
  }
};
