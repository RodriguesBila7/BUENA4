import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import useVacationData from '../../hooks/useVacationData';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useDisciplinaryData from '../../hooks/useDisciplinaryData';
import useAdminActsData from '../../hooks/useAdminActsData';
import useResizableModal from '../../hooks/useResizableModal';
import { compressImage } from '../../utils/imageCompressor';
import { saveCloudPhoto } from '../../services/cloudSyncService';
import { SERNIC_LOGO_B64 } from '../../utils/sernic_logo_default';
import ConfirmModal from '../ConfirmModal';
import { formatDisplayDate } from '../../utils/vacationAlerts';
import {
  generateAgentAccessCode,
  getActiveCodeForEmployee,
  buildActivationMessage,
  getStoredCodes
} from '../../services/agentActivationService';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SUB-MODAL MÓVEL E REDIMENSIONÁVEL: PESQUISAR AGENTE SERNIC
 * Padrão nativo do BUENA4 (useResizableModal + Portal)
 * ─────────────────────────────────────────────────────────────────────────────
 */
function PortalAgentSearchModal({ isOpen, onClose, employees = [], orgData, currentEmpId, onSelect }) {
  const {
    modalRef,
    position,
    onPointerDown,
    isMaximized,
    toggleMaximize,
    handleResizePointerDown,
    handleHeaderDoubleClick,
    getOverlayProps,
    modalStyle
  } = useResizableModal({ defaultWidth: '660px', minWidth: 420, minHeight: 380 });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirectorate, setFilterDirectorate] = useState('ALL');
  const [filterCareer, setFilterCareer] = useState('ALL');

  const filteredEmployeesList = useMemo(() => {
    return employees.filter(emp => {
      if (emp.isActive === false || emp.status === 'Apagado') return false;

      if (filterDirectorate !== 'ALL' && String(emp.directorateId) !== String(filterDirectorate)) {
        return false;
      }
      if (filterCareer !== 'ALL') {
        const cId = String(emp.careerId || '');
        const cName = String(emp.career || emp.carreira || '').toLowerCase();
        if (cId !== String(filterCareer) && !cName.includes(String(filterCareer).toLowerCase())) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mName = (emp.name || '').toLowerCase().includes(q);
        const mNip = String(emp.nip || '').toLowerCase().includes(q);
        const mNuit = String(emp.nuit || '').toLowerCase().includes(q);
        const mBi = String(emp.idNumber || '').toLowerCase().includes(q);
        const mCargo = String(emp.cargo || emp.category || '').toLowerCase().includes(q);
        const mPhone = String(emp.phone || '').includes(q);
        return mName || mNip || mNuit || mBi || mCargo || mPhone;
      }

      return true;
    });
  }, [employees, searchQuery, filterDirectorate, filterCareer]);

  if (!isOpen) return null;

  const overlayProps = getOverlayProps(onClose);

  return ReactDOM.createPortal(
    <div
      style={modalStyles.overlay}
      onMouseDown={overlayProps.onMouseDown}
      onClick={overlayProps.onClick}
    >
      <div
        ref={modalRef}
        style={{ ...modalStyles.modalBox, ...modalStyle }}
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO COM ARRASTAR E EXPANDIR */}
        <div
          className={isMaximized ? '' : 'drag-handle'}
          style={modalStyles.modalHeader}
          onPointerDown={isMaximized ? undefined : onPointerDown}
          onDoubleClick={handleHeaderDoubleClick}
          title="💡 Arraste para mover ou dê duplo clique para expandir/reduzir"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <div>
              <h3 style={modalStyles.headerTitle}>Pesquisa e Seleção de Agente SERNIC</h3>
              <div style={modalStyles.headerSubtitle}>
                {filteredEmployeesList.length} de {employees.length} agentes disponíveis
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={toggleMaximize}
              style={modalStyles.expandBtn}
              title={isMaximized ? 'Reduzir Tamanho' : 'Expandir (Ecrã Cheio)'}
            >
              {isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
            </button>
            <button onClick={onClose} style={modalStyles.closeBtn} title="Fechar">✕</button>
          </div>
        </div>

        {/* CORPO DO MODAL */}
        <div style={modalStyles.modalBody}>
          {/* Campo de Busca Rápida */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Pesquisar por Nome, NIP, NUIT, B.I., Cargo..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={modalStyles.searchInput}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={modalStyles.clearBtn} title="Limpar pesquisa">✕</button>
            )}
          </div>

          {/* Filtros em Grade */}
          <div style={modalStyles.filtersGrid}>
            <div>
              <label style={modalStyles.miniLabel}>Filtrar por Direcção / Província:</label>
              <select
                value={filterDirectorate}
                onChange={e => setFilterDirectorate(e.target.value)}
                style={modalStyles.selectInput}
              >
                <option value="ALL">Todas as Direcções</option>
                {(orgData?.directorates || []).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={modalStyles.miniLabel}>Filtrar por Carreira:</label>
              <select
                value={filterCareer}
                onChange={e => setFilterCareer(e.target.value)}
                style={modalStyles.selectInput}
              >
                <option value="ALL">Todas as Carreiras</option>
                {(orgData?.careers || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contagem e Botão Limpar */}
          <div style={modalStyles.counterBar}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)' }}>
              Encontrados: {filteredEmployeesList.length} agentes
            </span>
            {(searchQuery || filterDirectorate !== 'ALL' || filterCareer !== 'ALL') && (
              <button
                onClick={() => { setSearchQuery(''); setFilterDirectorate('ALL'); setFilterCareer('ALL'); }}
                style={modalStyles.btnResetFilters}
              >
                Limpar Filtros
              </button>
            )}
          </div>

          {/* Lista de Resultados */}
          <div style={modalStyles.resultsList}>
            {filteredEmployeesList.length === 0 ? (
              <div style={modalStyles.emptyState}>
                🔍 Nenhum funcionário encontrado com os critérios fornecidos.
              </div>
            ) : (
              filteredEmployeesList.map(emp => {
                const isSelected = String(emp.id) === String(currentEmpId);
                const dir = (orgData?.directorates || []).find(d => String(d.id) === String(emp.directorateId));

                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      onSelect(emp);
                      onClose();
                    }}
                    style={{
                      ...modalStyles.resultCard,
                      borderColor: isSelected ? 'var(--color-primary, #B71C1C)' : 'var(--color-border)',
                      backgroundColor: isSelected ? 'rgba(27, 54, 93, 0.08)' : 'var(--color-bg-card, #ffffff)'
                    }}
                  >
                    <div style={modalStyles.avatarBox}>
                      {emp.photo ? (
                        <img src={emp.photo} alt={emp.name} style={modalStyles.avatarImg} />
                      ) : (
                        <div style={modalStyles.avatarFallback}>
                          {emp.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <strong style={modalStyles.empName}>{emp.name}</strong>
                        <span style={modalStyles.nipBadge}>NIP: {emp.nip || 'N/A'}</span>
                      </div>
                      <div style={modalStyles.empSub}>
                        {dir?.name || 'Direcção Geral'} • {emp.category || emp.cargo || 'Investigador'}
                      </div>
                    </div>

                    {isSelected ? (
                      <span style={modalStyles.activePill}>✓ Atual</span>
                    ) : (
                      <span style={modalStyles.selectArrow}>➔</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Resizer Canto Inferior */}
        {!isMaximized && (
          <div
            onPointerDown={handleResizePointerDown}
            style={modalStyles.resizeHandle}
            title="Arraste para redimensionar"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="14" y1="3" x2="3" y2="14" />
              <line x1="14" y1="8" x2="8" y2="14" />
              <line x1="14" y1="13" x2="13" y2="14" />
            </svg>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SUB-MODAL MÓVEL: SOLICITAÇÃO DE FÉRIAS REGULAMENTARES
 * ─────────────────────────────────────────────────────────────────────────────
 */
function PortalVacationModal({ isOpen, onClose, vacationForm, setVacationForm, onSubmit }) {
  const {
    modalRef,
    onPointerDown,
    isMaximized,
    toggleMaximize,
    handleResizePointerDown,
    handleHeaderDoubleClick,
    getOverlayProps,
    modalStyle
  } = useResizableModal({ defaultWidth: '540px', minWidth: 380, minHeight: 340 });

  if (!isOpen) return null;
  const overlayProps = getOverlayProps(onClose);

  return ReactDOM.createPortal(
    <div style={modalStyles.overlay} onMouseDown={overlayProps.onMouseDown} onClick={overlayProps.onClick}>
      <div ref={modalRef} style={{ ...modalStyles.modalBox, ...modalStyle }} onClick={e => e.stopPropagation()}>
        <div
          className={isMaximized ? '' : 'drag-handle'}
          style={modalStyles.modalHeader}
          onPointerDown={isMaximized ? undefined : onPointerDown}
          onDoubleClick={handleHeaderDoubleClick}
          title="💡 Arraste para mover ou dê duplo clique para expandir/reduzir"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🌴</span>
            <h3 style={modalStyles.headerTitle}>Solicitar Férias Regulamentares</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button type="button" onClick={toggleMaximize} style={modalStyles.expandBtn}>
              {isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
            </button>
            <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
          </div>
        </div>

        <form onSubmit={onSubmit} style={modalStyles.modalForm}>
          <div style={styles.formGroup}>
            <label style={styles.formLbl}>Tipo de Férias / Licença:</label>
            <select
              value={vacationForm.type}
              onChange={e => setVacationForm({ ...vacationForm, type: e.target.value })}
              style={styles.fieldInput}
            >
              <option value="Férias Anuais">Férias Anuais (Regulamentares)</option>
              <option value="Licença de Casamento">Licença de Casamento (15 dias)</option>
              <option value="Licença de Maternidade/Paternidade">Licença de Maternidade / Paternidade</option>
              <option value="Licença de Luto (Nojo)">Licença de Luto (Nojo)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={styles.formGroup}>
              <label style={styles.formLbl}>Data de Início:</label>
              <input
                type="date"
                value={vacationForm.startDate}
                onChange={e => setVacationForm({ ...vacationForm, startDate: e.target.value })}
                style={styles.fieldInput}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLbl}>Data de Término:</label>
              <input
                type="date"
                value={vacationForm.endDate}
                onChange={e => setVacationForm({ ...vacationForm, endDate: e.target.value })}
                style={styles.fieldInput}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLbl}>Observações / Justificação:</label>
            <textarea
              rows={3}
              value={vacationForm.reason}
              onChange={e => setVacationForm({ ...vacationForm, reason: e.target.value })}
              placeholder="Informações adicionais para a chefia imediata..."
              style={styles.fieldTextarea}
            />
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.btnModalCancel}>
              Cancelar
            </button>
            <button type="submit" style={styles.btnActionPrimary}>
              Submeter Pedido
            </button>
          </div>
        </form>

        {!isMaximized && (
          <div onPointerDown={handleResizePointerDown} style={modalStyles.resizeHandle} title="Arraste para redimensionar">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="14" y1="3" x2="3" y2="14" />
              <line x1="14" y1="8" x2="8" y2="14" />
              <line x1="14" y1="13" x2="13" y2="14" />
            </svg>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SUB-MODAL MÓVEL: JUSTIFICAÇÃO DE FALTA
 * ─────────────────────────────────────────────────────────────────────────────
 */
function PortalAbsenceModal({ isOpen, onClose, absenceForm, setAbsenceForm, onSubmit }) {
  const {
    modalRef,
    onPointerDown,
    isMaximized,
    toggleMaximize,
    handleResizePointerDown,
    handleHeaderDoubleClick,
    getOverlayProps,
    modalStyle
  } = useResizableModal({ defaultWidth: '540px', minWidth: 380, minHeight: 340 });

  if (!isOpen) return null;
  const overlayProps = getOverlayProps(onClose);

  return ReactDOM.createPortal(
    <div style={modalStyles.overlay} onMouseDown={overlayProps.onMouseDown} onClick={overlayProps.onClick}>
      <div ref={modalRef} style={{ ...modalStyles.modalBox, ...modalStyle }} onClick={e => e.stopPropagation()}>
        <div
          className={isMaximized ? '' : 'drag-handle'}
          style={modalStyles.modalHeader}
          onPointerDown={isMaximized ? undefined : onPointerDown}
          onDoubleClick={handleHeaderDoubleClick}
          title="💡 Arraste para mover ou dê duplo clique para expandir/reduzir"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>✍️</span>
            <h3 style={modalStyles.headerTitle}>Submeter Justificação de Falta</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button type="button" onClick={toggleMaximize} style={modalStyles.expandBtn}>
              {isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
            </button>
            <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
          </div>
        </div>

        <form onSubmit={onSubmit} style={modalStyles.modalForm}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={styles.formGroup}>
              <label style={styles.formLbl}>Data de Início:</label>
              <input
                type="date"
                value={absenceForm.startDate}
                onChange={e => setAbsenceForm({ ...absenceForm, startDate: e.target.value })}
                style={styles.fieldInput}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLbl}>Data de Fim (Opcional):</label>
              <input
                type="date"
                value={absenceForm.endDate}
                onChange={e => setAbsenceForm({ ...absenceForm, endDate: e.target.value })}
                style={styles.fieldInput}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLbl}>Motivo Legal Alegado:</label>
            <textarea
              rows={3}
              value={absenceForm.reason}
              onChange={e => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
              placeholder="Ex: Doença súbita com atestado médico emitido pelo Hospital Central..."
              style={styles.fieldTextarea}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLbl}>Nome do Comprovativo / Atestado (PDF/Foto):</label>
            <input
              type="text"
              value={absenceForm.attachmentName}
              onChange={e => setAbsenceForm({ ...absenceForm, attachmentName: e.target.value })}
              placeholder="Ex: Atestado_Medico_27Setembro.pdf"
              style={styles.fieldInput}
            />
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.btnModalCancel}>
              Cancelar
            </button>
            <button type="submit" style={styles.btnActionPrimary}>
              Submeter Justificação
            </button>
          </div>
        </form>

        {!isMaximized && (
          <div onPointerDown={handleResizePointerDown} style={modalStyles.resizeHandle} title="Arraste para redimensionar">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="14" y1="3" x2="3" y2="14" />
              <line x1="14" y1="8" x2="8" y2="14" />
              <line x1="14" y1="13" x2="13" y2="14" />
            </svg>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SUB-MODAL MÓVEL: DISPARO DE CREDENCIAIS & CÓDIGO DE ACESSO DO AGENTE (SERNIC)
 * Padrão nativo do BUENA4 (useResizableModal + Portal)
 * Permite envio direto por WhatsApp, SMS, Email e gravação imediata de contacto.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function PortalSendCredentialsModal({ isOpen, onClose, employee, onUpdateEmployee }) {
  const {
    modalRef,
    onPointerDown,
    isMaximized,
    toggleMaximize,
    handleResizePointerDown,
    handleHeaderDoubleClick,
    getOverlayProps,
    modalStyle
  } = useResizableModal({ defaultWidth: '580px', minWidth: 420, minHeight: 460 });

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [codeData, setCodeData] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (employee && isOpen) {
      setPhone(employee.phone || employee.contacto || '');
      setEmail(employee.email || '');
      let active = getActiveCodeForEmployee(employee.id);
      if (!active || active.isExpired) {
        const gen = generateAgentAccessCode(employee.id, 'WhatsApp');
        active = { code: gen.code, durationMinutes: gen.durationMinutes };
      }
      setCodeData(active);
      setCopySuccess(false);
      setSaveSuccess(false);
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const currentCode = codeData?.code || '------';
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  const mozPhone = cleanPhone.startsWith('258') ? cleanPhone : (cleanPhone ? `258${cleanPhone}` : '');

  const messageText = `SERNIC DRH: Caro(a) Investigador(a)/Agente ${employee.name}, o seu código de acesso ao Portal do Agente é ${currentCode}. Aceda ao aplicativo móvel/web, selecione [🛡️ Portal], introduza o seu NUIT ${employee.nuit || employee.nip || ''} e este código para definir a sua palavra-passe definitiva (validade de 15 minutos ao iniciar o acesso).`;

  const handleRenewCode = () => {
    const res = generateAgentAccessCode(employee.id, 'WhatsApp');
    setCodeData({ code: res.code, durationMinutes: res.durationMinutes });
    setCopySuccess(false);
  };

  const handleSaveContact = async () => {
    if (!employee.id) return;
    if (onUpdateEmployee) {
      await onUpdateEmployee(employee.id, { phone, email });
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!mozPhone || mozPhone.length < 9) {
      alert('Por favor preencha um contacto de telefone/WhatsApp moçambicano antes de abrir o WhatsApp.');
      return;
    }
    const url = `https://wa.me/${mozPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const handleOpenSMS = () => {
    if (!mozPhone || mozPhone.length < 9) {
      alert('Por favor preencha o contacto de telefone antes de disparar SMS.');
      return;
    }
    window.location.href = `sms:${mozPhone}?body=${encodeURIComponent(messageText)}`;
  };

  const handleOpenEmail = () => {
    if (!email) {
      alert('Por favor preencha o e-mail institucional antes de enviar.');
      return;
    }
    window.location.href = `mailto:${email}?subject=${encodeURIComponent('SERNIC DRH - Código de Ativação do Portal do Agente')}&body=${encodeURIComponent(messageText)}`;
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const overlayProps = getOverlayProps(onClose);

  return ReactDOM.createPortal(
    <div
      style={modalStyles.overlay}
      onMouseDown={overlayProps.onMouseDown}
      onClick={overlayProps.onClick}
    >
      <div
        ref={modalRef}
        style={{ ...modalStyles.modalBox, ...modalStyle }}
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <div
          className={isMaximized ? '' : 'drag-handle'}
          style={modalStyles.modalHeader}
          onPointerDown={isMaximized ? undefined : onPointerDown}
          onDoubleClick={handleHeaderDoubleClick}
          title="💡 Arraste para mover ou dê duplo clique para expandir/reduzir"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📡</span>
            <div>
              <h3 style={modalStyles.headerTitle}>Enviar Credenciais & Código de Acesso</h3>
              <div style={modalStyles.headerSubtitle}>
                {employee.name} • NUIT: {employee.nuit || employee.nip || 'N/A'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={toggleMaximize}
              style={modalStyles.expandBtn}
              title={isMaximized ? 'Reduzir' : 'Expandir'}
            >
              {isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
            </button>
            <button onClick={onClose} style={modalStyles.closeBtn} title="Fechar">✕</button>
          </div>
        </div>

        {/* CORPO DO MODAL */}
        <div style={{ ...modalStyles.modalBody, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* CARTÃO DE DESTAQUE DO CÓDIGO */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(183, 28, 28, 0.05)',
            border: '1.5px solid rgba(183, 28, 28, 0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-primary, #B71C1C)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔑 Código de Acesso do Agente (6 Dígitos)
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--color-primary, #B71C1C)', letterSpacing: '4px', margin: '2px 0' }}>
                {currentCode}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                ⏱️ Validade de 15 minutos ao iniciar o acesso no aplicativo.
              </div>
            </div>

            <button
              type="button"
              onClick={handleRenewCode}
              style={{
                backgroundColor: 'var(--color-bg-base, #ffffff)',
                color: 'var(--color-text-main)',
                border: '1px solid var(--color-border)',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Gerar outro código aleatório"
            >
              🔄 Gerar Novo Código
            </button>
          </div>

          {/* DADOS DE CONTACTO DO AGENTE (COM POSSIBILIDADE DE ATUALIZAR) */}
          <div style={{ backgroundColor: 'var(--color-bg-subtle, #f8fafc)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-base)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📱 Destinatário e Contacto de Envio:</span>
              {saveSuccess && <span style={{ color: '#059669', fontSize: '11px', fontWeight: '700' }}>✓ Guardado na ficha!</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', display: 'block', marginBottom: '3px' }}>
                  Telefone / WhatsApp (+258):
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+258 84 123 4567"
                    style={{ ...styles.fieldInput, flex: 1, padding: '7px 10px', fontSize: '12px' }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: 'var(--color-primary, #B71C1C)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    title="Gravar este contacto na ficha do funcionário"
                  >
                    💾 Guardar
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', display: 'block', marginBottom: '3px' }}>
                  Email Institucional:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="exemplo@sernic.gov.mz"
                  style={{ ...styles.fieldInput, width: '100%', padding: '7px 10px', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* MENSAGEM OFICIAL FORMATADA */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-base)' }}>
                ✉️ Mensagem Oficial SERNIC DRH:
              </label>
              {copySuccess && (
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#059669' }}>
                  ✓ Copiado para a área de transferência!
                </span>
              )}
            </div>
            <textarea
              readOnly
              rows={3}
              value={messageText}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-base)',
                fontSize: '12px',
                lineHeight: '1.4',
                boxSizing: 'border-box',
                resize: 'none'
              }}
            />
          </div>

          {/* BOTÕES DE DISPARO OFICIAL */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
              }}
              title="Abrir o WhatsApp com a mensagem oficial preenchida"
            >
              <span>💬</span>
              <span>Abrir WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleOpenSMS}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
              }}
              title="Disparar por SMS no telemóvel"
            >
              <span>📱</span>
              <span>Disparar SMS</span>
            </button>

            <button
              type="button"
              onClick={handleOpenEmail}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(29, 78, 216, 0.25)'
              }}
              title="Enviar por e-mail institucional"
            >
              <span>✉️</span>
              <span>Enviar Email</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMessage}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-main)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
              title="Copiar texto completo das credenciais"
            >
              <span>📋</span>
              <span>Copiar Texto</span>
            </button>
          </div>

          {/* GUIA PASSO A PASSO PARA O AGENTE */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(2, 132, 199, 0.06)',
            borderRadius: '8px',
            border: '1px solid rgba(2, 132, 199, 0.2)',
            fontSize: '11.5px',
            color: 'var(--color-text-base)',
            lineHeight: '1.4'
          }}>
            <strong>💡 Como o Agente Entra no Sistema:</strong>
            <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li>Acede ao aplicativo no telemóvel ou computador.</li>
              <li>Na tela inicial de login, clica no botão <strong>[🛡️ Portal]</strong> no topo direito.</li>
              <li>Digita o seu <strong>NUIT ({employee.nuit || employee.nip || '...'})</strong> e o código temporário <strong>{currentCode}</strong>.</li>
              <li>Cria e confirma a sua <strong>palavra-passe pessoal definitiva</strong> para ter acesso total.</li>
            </ol>
          </div>
        </div>

        {/* Resizer Canto Inferior */}
        {!isMaximized && (
          <div onPointerDown={handleResizePointerDown} style={modalStyles.resizeHandle} title="Arraste para redimensionar">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="14" y1="3" x2="3" y2="14" />
              <line x1="14" y1="8" x2="8" y2="14" />
              <line x1="14" y1="13" x2="13" y2="14" />
            </svg>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SUB-ABA: CENTRAL DE EMISSÃO E ENVIO DE CÓDIGOS DE ACESSO (PRIMEIRO LOGIN)
 * ─────────────────────────────────────────────────────────────────────────────
 */
function PortalActivationCodesTab({ employees = [], orgData, onUpdateEmployee, onSendCredentials }) {
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeCodes, setActiveCodes] = useState(() => getStoredCodes());
  const [activeModalMessage, setActiveModalMessage] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const refreshCodes = () => {
    setActiveCodes(getStoredCodes());
  };

  const handleGenerate = (emp, channel = 'SMS') => {
    if (onSendCredentials) {
      onSendCredentials(emp);
      return;
    }
    const res = generateAgentAccessCode(emp.id, channel);
    refreshCodes();
    const message = buildActivationMessage(emp, res.code);
    setActiveModalMessage({
      emp,
      code: res.code,
      channel,
      message,
      expiresAt: res.expiresAt
    });
  };

  const handleGenerateBatch = () => {
    let count = 0;
    employees.forEach(emp => {
      const existing = getActiveCodeForEmployee(emp.id);
      if (!existing || existing.isExpired) {
        generateAgentAccessCode(emp.id, 'SMS');
        count++;
      }
    });
    refreshCodes();
    alert(`Sucesso: Foram gerados ${count} novos códigos de acesso provisórios.`);
  };

  const handleOpenChannel = (emp, channel) => {
    if (onSendCredentials) {
      onSendCredentials(emp);
      return;
    }
    const existing = getActiveCodeForEmployee(emp.id);
    let code = existing?.code;
    let expiresAt = existing?.expiresAt;
    if (!code || existing.isExpired) {
      const res = generateAgentAccessCode(emp.id, channel);
      code = res.code;
      expiresAt = res.expiresAt;
      refreshCodes();
    }
    const message = buildActivationMessage(emp, code);
    setActiveModalMessage({
      emp,
      code,
      channel,
      message,
      expiresAt
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const filteredList = useMemo(() => {
    return employees.filter(emp => {
      if (emp.isActive === false || emp.status === 'Apagado') return false;

      if (dirFilter !== 'ALL' && String(emp.directorateId) !== String(dirFilter)) {
        return false;
      }

      const codeEntry = activeCodes[emp.id];
      const hasActiveCode = codeEntry && !codeEntry.isUsed && new Date(codeEntry.expiresAt) > new Date();

      if (statusFilter === 'ACTIVE_CODE' && !hasActiveCode) return false;
      if (statusFilter === 'NO_CODE' && hasActiveCode) return false;
      if (statusFilter === 'ACTIVATED' && !emp.hasActivatedAccount) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const mName = (emp.name || '').toLowerCase().includes(q);
        const mNip = String(emp.nip || '').includes(q);
        const mNuit = String(emp.nuit || '').includes(q);
        const mPhone = String(emp.phone || '').includes(q);
        return mName || mNip || mNuit || mPhone;
      }
      return true;
    });
  }, [employees, dirFilter, statusFilter, search, activeCodes]);

  const stats = useMemo(() => {
    const total = employees.length;
    let withCode = 0;
    let activated = 0;
    employees.forEach(e => {
      if (e.hasActivatedAccount) activated++;
      const c = activeCodes[e.id];
      if (c && !c.isUsed && new Date(c.expiresAt) > new Date()) withCode++;
    });
    return { total, withCode, activated, pending: Math.max(0, total - withCode - activated) };
  }, [employees, activeCodes]);

  return (
    <div style={styles.sectionWrap}>
      <div style={styles.headerBetween}>
        <div>
          <h3 style={styles.secTitle}>🔐 Central de Códigos de Acesso & Primeiro Login</h3>
          <p style={styles.secDesc}>
            Gere e envie códigos aleatórios de 6 dígitos para os funcionários ativarem o Portal do Agente via SMS, WhatsApp ou Email.
          </p>
        </div>
        <button onClick={handleGenerateBatch} style={styles.btnActionPrimary}>
          ⚡ Gerar Códigos em Lote
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiTitle}>Total de Agentes</span>
          <span style={styles.kpiNum}>{stats.total}</span>
          <span style={styles.kpiSub}>Efetivo Registado</span>
        </div>
        <div style={{ ...styles.kpiCard, borderTop: '3px solid #0284c7' }}>
          <span style={styles.kpiTitle}>Com Código Ativo</span>
          <span style={{ ...styles.kpiNum, color: '#0284c7' }}>{stats.withCode}</span>
          <span style={styles.kpiSub}>Prontos para ativação</span>
        </div>
        <div style={{ ...styles.kpiCard, borderTop: '3px solid #059669' }}>
          <span style={styles.kpiTitle}>Contas Ativadas</span>
          <span style={{ ...styles.kpiNum, color: '#059669' }}>{stats.activated}</span>
          <span style={styles.kpiSub}>Acesso concluído</span>
        </div>
        <div style={{ ...styles.kpiCard, borderTop: '3px solid #d97706' }}>
          <span style={styles.kpiTitle}>Sem Código Emitido</span>
          <span style={{ ...styles.kpiNum, color: '#d97706' }}>{stats.pending}</span>
          <span style={styles.kpiSub}>Aguardam envio</span>
        </div>
      </div>

      {/* FILTROS E PESQUISA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Pesquisar por Nome, NIP, NUIT ou Telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.fieldInput}
        />

        <select value={dirFilter} onChange={e => setDirFilter(e.target.value)} style={styles.fieldInput}>
          <option value="ALL">Todas as Direcções</option>
          {(orgData?.directorates || []).map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={styles.fieldInput}>
          <option value="ALL">Todos os Estados</option>
          <option value="ACTIVE_CODE">Com Código Ativo</option>
          <option value="ACTIVATED">Conta Já Ativada</option>
          <option value="NO_CODE">Sem Código Emitido</option>
        </select>
      </div>

      {/* TABELA DE AGENTES */}
      <div style={{ overflowX: 'auto', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
        <table className="premium-table" style={{ width: '100%', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-primary, #B71C1C)', color: '#fff' }}>
              <th style={styles.th}>Agente / Investigador</th>
              <th style={styles.th}>NUIT / NIP</th>
              <th style={styles.th}>Contactos (SMS / Email)</th>
              <th style={styles.th}>Estado do Código</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Canais de Envio Oficial</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Nenhum funcionário encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredList.map(emp => {
                const codeEntry = activeCodes[emp.id];
                const hasCode = codeEntry && !codeEntry.isUsed && (!codeEntry.expiresAt || new Date(codeEntry.expiresAt) > new Date());
                const dir = (orgData?.directorates || []).find(d => String(d.id) === String(emp.directorateId));

                return (
                  <tr key={emp.id}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', overflow: 'hidden' }}>
                          {emp.photo ? (
                            <img src={emp.photo} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            emp.name?.charAt(0).toUpperCase() || 'A'
                          )}
                        </div>
                        <div>
                          <strong>{emp.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {dir?.name || 'Direcção Geral'} • {emp.category || emp.cargo || 'Agente'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div><strong>NUIT:</strong> {emp.nuit || '-'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>NIP: {emp.nip || '-'}</div>
                    </td>

                    <td style={styles.td}>
                      <div>📱 {emp.phone || '+258 N/D'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>✉️ {emp.email || 'Sem email'}</div>
                    </td>

                    <td style={styles.td}>
                      {emp.hasActivatedAccount ? (
                        <span style={styles.statusPill('Concluído')}>✓ Conta Ativada</span>
                      ) : hasCode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', fontWeight: '800', letterSpacing: '2px', fontSize: '13px', display: 'inline-block', width: 'fit-content' }}>
                            {codeEntry.code}
                          </span>
                          <span style={{ fontSize: '10px', color: codeEntry.accessStartedAt ? '#059669' : 'var(--color-text-muted)', fontWeight: codeEntry.accessStartedAt ? '700' : 'normal' }}>
                            {codeEntry.accessStartedAt
                              ? `⏱️ Em uso (expira: ${new Date(codeEntry.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                              : '⏱️ 15 min ao aceder'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ padding: '3px 8px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '11px', fontWeight: '600' }}>
                          Pendente de Emissão
                        </span>
                      )}
                    </td>

                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleOpenChannel(emp, 'SMS')}
                          style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                          title="Enviar por SMS"
                        >
                          📱 SMS
                        </button>
                        <button
                          onClick={() => handleOpenChannel(emp, 'WhatsApp')}
                          style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #86efac', backgroundColor: '#ecfdf5', color: '#047857', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                          title="Enviar por WhatsApp"
                        >
                          💬 WhatsApp
                        </button>
                        <button
                          onClick={() => handleOpenChannel(emp, 'Email')}
                          style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                          title="Enviar por Email"
                        >
                          ✉️ Email
                        </button>
                        <button
                          onClick={() => handleGenerate(emp, 'Novo Código')}
                          style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                          title="Gerar Novo Código Aleatório"
                        >
                          🔄 Novo
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO E DISPARO DE MENSAGEM */}
      {activeModalMessage && (
        <div style={modalStyles.overlay} onClick={() => setActiveModalMessage(null)}>
          <div style={{ ...modalStyles.modalBox, maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div style={modalStyles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📡</span>
                <h3 style={modalStyles.headerTitle}>Disparo de Código de Acesso</h3>
              </div>
              <button onClick={() => setActiveModalMessage(null)} style={modalStyles.closeBtn}>✕</button>
            </div>

            <div style={modalStyles.modalBody}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <strong>Destinatário:</strong> {activeModalMessage.emp.name} (NUIT: {activeModalMessage.emp.nuit})
              </div>

              <div style={{ padding: '14px', backgroundColor: 'rgba(27, 54, 93, 0.05)', borderRadius: '10px', border: '1px solid rgba(27, 54, 93, 0.15)', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '4px' }}>
                  CÓDIGO GERADO:
                </div>
                <div style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '4px', color: 'var(--color-primary)' }}>
                  {activeModalMessage.code}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={modalStyles.miniLabel}>Mensagem Formatada Oficial SERNIC:</label>
                <textarea
                  readOnly
                  rows={4}
                  value={activeModalMessage.message}
                  style={{ ...styles.fieldTextarea, width: '100%', fontSize: '13px', lineHeight: '1.4' }}
                />
              </div>

              {copySuccess && (
                <div style={{ padding: '8px 12px', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
                  ✓ Mensagem copiada para a área de transferência!
                </div>
              )}

              {/* BOTÕES DE ENVIO RÁPIDO */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {activeModalMessage.emp.phone && (
                  <a
                    href={`sms:${String(activeModalMessage.emp.phone).replace(/\D/g, '')}?body=${encodeURIComponent(activeModalMessage.message)}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <button type="button" style={{ ...styles.btnActionPrimary, width: '100%', backgroundColor: '#0284c7' }}>
                      📱 Disparar SMS
                    </button>
                  </a>
                )}

                {activeModalMessage.emp.phone && (
                  <a
                    href={`https://wa.me/${String(activeModalMessage.emp.phone).replace(/\D/g, '').startsWith('258') ? String(activeModalMessage.emp.phone).replace(/\D/g, '') : `258${String(activeModalMessage.emp.phone).replace(/\D/g, '')}`}?text=${encodeURIComponent(activeModalMessage.message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <button type="button" style={{ ...styles.btnActionPrimary, width: '100%', backgroundColor: '#059669' }}>
                      💬 Abrir WhatsApp
                    </button>
                  </a>
                )}

                {activeModalMessage.emp.email && (
                  <a
                    href={`mailto:${activeModalMessage.emp.email}?subject=${encodeURIComponent('SERNIC DRH - Código de Ativação do Portal do Agente')}&body=${encodeURIComponent(activeModalMessage.message)}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <button type="button" style={{ ...styles.btnActionPrimary, width: '100%', backgroundColor: '#1d4ed8' }}>
                      ✉️ Enviar Email
                    </button>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => copyToClipboard(activeModalMessage.message)}
                  style={{ ...styles.btnActionSecondary, width: '100%' }}
                >
                  📋 Copiar Texto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENTE PRINCIPAL: EMPLOYEE PORTAL (SERNIC)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function EmployeePortal({ user, onBackToAdmin }) {
  const { employees = [], updateEmployee } = useEmployeeData();
  const { data: orgData } = useOrgData();
  const { requests = [], addRequest } = useVacationData();
  const { records: absenceRecords = [], addRecord: addAbsenceRecord } = useEffectivenessData();
  const { processes: disciplinaryProcesses = [] } = useDisciplinaryData();
  const { acts: adminActs = [] } = useAdminActsData();

  // Encontrar o funcionário associado ao utilizador logado
  const matchedEmployee = useMemo(() => {
    if (!employees || employees.length === 0) return null;
    if (user?.employeeId) {
      const found = employees.find(e => e.id === user.employeeId);
      if (found) return found;
    }
    if (user?.nuit) {
      const found = employees.find(e => e.nuit === user.nuit);
      if (found) return found;
    }
    if (user?.username) {
      const found = employees.find(e =>
        (e.nip && String(e.nip) === String(user.username)) ||
        (e.name && e.name.toLowerCase() === user.username.toLowerCase())
      );
      if (found) return found;
    }
    return employees[0];
  }, [user, employees]);

  const [selectedEmpId, setSelectedEmpId] = useState(matchedEmployee?.id || '');
  const currentEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || matchedEmployee || employees[0] || {};
  }, [employees, selectedEmpId, matchedEmployee]);

  const [activePortalTab, setActivePortalTab] = useState('overview');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '' });

  // Controlos de Modais
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [credentialsModalEmp, setCredentialsModalEmp] = useState(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
  const [vacationForm, setVacationForm] = useState({
    type: 'Férias Anuais',
    startDate: '',
    endDate: '',
    reason: '',
    notes: ''
  });

  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({
    type: 'Justificada',
    startDate: '',
    endDate: '',
    reason: '',
    attachmentName: ''
  });

  // Carregar dados de estrutura orgânica do funcionário atual
  const empOrgInfo = useMemo(() => {
    if (!currentEmp) return {};
    const dir = (orgData?.directorates || []).find(d => String(d.id) === String(currentEmp.directorateId));
    const dept = (orgData?.departments || []).find(d => String(d.id) === String(currentEmp.departmentId));
    const div = (orgData?.divisions || []).find(d => String(d.id) === String(currentEmp.divisionId));
    const sec = (orgData?.sections || []).find(d => String(d.id) === String(currentEmp.sectionId));
    const career = (orgData?.careers || []).find(c => String(c.id) === String(currentEmp.careerId));
    const category = (orgData?.categories || []).find(c => String(c.id) === String(currentEmp.categoryId));

    return {
      directorateName: dir?.name || 'Direcção Geral',
      departmentName: dept?.name || 'Departamento Geral',
      divisionName: div?.name || '-',
      sectionName: sec?.name || '-',
      careerName: career?.name || currentEmp.career || 'Investigação Criminal',
      categoryName: category?.name || currentEmp.category || currentEmp.cargo || 'Agente'
    };
  }, [currentEmp, orgData]);

  // Tempo de serviço, idade e previsão de passagem à reserva
  const serviceStats = useMemo(() => {
    if (!currentEmp) return {};

    const now = new Date();
    const admissionDate = currentEmp.admissionDate ? new Date(currentEmp.admissionDate) : new Date(now.getFullYear() - 8, 0, 1);
    const birthDate = currentEmp.birthDate ? new Date(currentEmp.birthDate) : new Date(now.getFullYear() - 36, 0, 1);

    const diffServiceMs = Math.max(0, now - admissionDate);
    const serviceYears = Math.floor(diffServiceMs / (1000 * 60 * 60 * 24 * 365.25));
    const serviceMonths = Math.floor((diffServiceMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.4));
    const serviceDays = Math.floor(diffServiceMs / (1000 * 60 * 60 * 24));

    const diffAgeMs = Math.max(0, now - birthDate);
    const age = Math.floor(diffAgeMs / (1000 * 60 * 60 * 24 * 365.25));

    // No SERNIC/EGFAE Moçambique: Reserva compulsória aos 60 anos de idade ou 35 anos de serviço
    const retirementByAgeYear = birthDate.getFullYear() + 60;
    const retirementByServiceYear = admissionDate.getFullYear() + 35;
    const retirementYear = Math.min(retirementByAgeYear, retirementByServiceYear);
    const yearsToRetirement = Math.max(0, retirementYear - now.getFullYear());
    const totalServiceTarget = 35;
    const progressPercent = Math.min(100, Math.round((serviceYears / totalServiceTarget) * 100));

    return {
      serviceYears,
      serviceMonths,
      serviceDays,
      age,
      retirementYear,
      yearsToRetirement,
      progressPercent,
      admissionDateFormatted: formatDisplayDate(currentEmp.admissionDate || admissionDate.toISOString().split('T')[0]),
      birthDateFormatted: formatDisplayDate(currentEmp.birthDate || birthDate.toISOString().split('T')[0])
    };
  }, [currentEmp]);

  // Férias do funcionário
  const myVacations = useMemo(() => {
    if (!currentEmp?.id) return { list: [], usedDays: 0, balance: 30, entitledDays: 30 };
    const empRequests = requests.filter(r => String(r.employeeId) === String(currentEmp.id));
    const usedDays = empRequests
      .filter(r => r.status === 'Aprovada' || r.status === 'Em Gozo' || r.status === 'Gozada')
      .reduce((sum, r) => sum + (Number(r.daysCount) || 0), 0);
    const entitledDays = 30;
    const balance = Math.max(0, entitledDays - usedDays);

    return {
      list: empRequests,
      usedDays,
      balance,
      entitledDays
    };
  }, [requests, currentEmp]);

  // Faltas do funcionário
  const myAbsences = useMemo(() => {
    if (!currentEmp?.id) return { list: [], justified: 0, unjustified: 0, pending: 0 };
    const list = absenceRecords.filter(r => String(r.employeeId) === String(currentEmp.id));

    let justified = 0;
    let unjustified = 0;
    let pending = 0;

    list.forEach(r => {
      const days = Number(r.daysCount || r.days || 1);
      const st = (r.status || r.approvalStatus || r.type || '').toLowerCase();
      if (st.includes('justificada') || st.includes('aprovad')) {
        justified += days;
      } else if (st.includes('injustificada') || st.includes('rejeitad')) {
        unjustified += days;
      } else {
        pending += days;
      }
    });

    return { list, justified, unjustified, pending };
  }, [absenceRecords, currentEmp]);

  // Processos disciplinares do funcionário
  const myDisciplinary = useMemo(() => {
    if (!currentEmp?.id) return [];
    return disciplinaryProcesses.filter(p => String(p.employeeId) === String(currentEmp.id));
  }, [disciplinaryProcesses, currentEmp]);

  // Atos administrativos e nomeações
  const myAdminActs = useMemo(() => {
    if (!currentEmp?.id) return [];
    return adminActs.filter(a => String(a.employeeId) === String(currentEmp.id));
  }, [adminActs, currentEmp]);

  // Elegibilidade de carreira
  const careerEligibility = useMemo(() => {
    const yearsInRank = Math.max(1, Math.min(serviceStats.serviceYears || 3, 6));
    const isProgressionEligible = yearsInRank >= 3;
    const monthsRemaining = isProgressionEligible ? 0 : Math.max(0, (3 - yearsInRank) * 12);
    const academicLevel = currentEmp.academic_level || currentEmp.academicLevel || 'Médio';
    const hasHigherEducation = ['Licenciatura', 'Mestrado', 'Doutoramento', 'Superior'].some(l =>
      academicLevel.toLowerCase().includes(l.toLowerCase())
    );

    return {
      yearsInRank,
      isProgressionEligible,
      monthsRemaining,
      academicLevel,
      hasHigherEducation
    };
  }, [serviceStats, currentEmp]);

  // Atualização da foto de perfil
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentEmp?.id) return;

    try {
      const compressed = await compressImage(file, { maxWidth: 300, maxHeight: 300, quality: 0.8 });
      await updateEmployee(currentEmp.id, { photo: compressed });
      saveCloudPhoto(currentEmp.id, compressed);

      setConfirmModal({
        isOpen: true,
        title: 'Foto Atualizada',
        message: 'A sua foto de perfil oficial foi atualizada e sincronizada com sucesso!',
        hideCancel: true
      });
    } catch {
      alert('Erro ao processar imagem.');
    }
  };

  // Submeter pedido de férias
  const handleSubmitVacation = async (e) => {
    e.preventDefault();
    if (!vacationForm.startDate || !vacationForm.endDate) {
      alert('Por favor, selecione as datas de início e fim.');
      return;
    }

    const start = new Date(vacationForm.startDate);
    const end = new Date(vacationForm.endDate);
    const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    await addRequest({
      employeeId: currentEmp.id,
      employeeNip: currentEmp.nip,
      employeeName: currentEmp.name,
      phone: currentEmp.phone || currentEmp.altPhone || '',
      year: String(new Date().getFullYear()),
      type: vacationForm.type,
      startDate: vacationForm.startDate,
      endDate: vacationForm.endDate,
      daysCount: diffDays,
      status: 'Submetida',
      reason: vacationForm.reason || 'Férias regulamentares solicitadas pelo funcionário no Portal',
      notes: vacationForm.notes || '',
      createdBy: currentEmp.name
    });

    setIsVacationModalOpen(false);
    setVacationForm({ type: 'Férias Anuais', startDate: '', endDate: '', reason: '', notes: '' });

    setConfirmModal({
      isOpen: true,
      title: 'Pedido de Férias Submetido',
      message: 'O seu pedido de férias foi encaminhado com sucesso para a Direcção de Recursos Humanos e para o parecer da sua chefia.',
      hideCancel: true
    });
  };

  // Submeter justificação de falta
  const handleSubmitAbsence = async (e) => {
    e.preventDefault();
    if (!absenceForm.startDate) {
      alert('Por favor, informe a data da falta.');
      return;
    }

    const start = new Date(absenceForm.startDate);
    const end = absenceForm.endDate ? new Date(absenceForm.endDate) : start;
    const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    await addAbsenceRecord({
      employeeId: currentEmp.id,
      employeeNip: currentEmp.nip,
      employeeName: currentEmp.name,
      type: 'Pendente',
      approvalStatus: 'Pendente',
      status: 'Pendente',
      startDate: absenceForm.startDate,
      endDate: absenceForm.endDate || absenceForm.startDate,
      daysCount: diffDays,
      reason: absenceForm.reason,
      attachmentName: absenceForm.attachmentName,
      submittedBy: currentEmp.name,
      directorateId: currentEmp.directorateId,
      departmentId: currentEmp.departmentId
    });

    setIsAbsenceModalOpen(false);
    setAbsenceForm({ type: 'Justificada', startDate: '', endDate: '', reason: '', attachmentName: '' });

    setConfirmModal({
      isOpen: true,
      title: 'Justificação Submetida',
      message: 'A justificação de ausência foi registada e encaminhada para validação da Direcção.',
      hideCancel: true
    });
  };

  return (
    <div style={styles.container}>
      {/* ──────────────────────────────────────────────────────────────
          CABEÇALHO INSTITUCIONAL OFICIAL DO SERNIC (LIMPO E OFICIAL)
         ────────────────────────────────────────────────────────────── */}
      <div style={styles.institutionalHeader}>
        <div style={styles.instLeft}>
          <img 
            src={SERNIC_LOGO_B64} 
            alt="Emblema SERNIC" 
            style={styles.sernicLogo} 
          />
          <div style={styles.instText}>
            <h1 style={styles.instTitle}>
              SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL
            </h1>
            <div style={styles.instSub}>
              DIRECÇÃO DE RECURSOS HUMANOS • PORTAL OFICIAL DO AGENTE & FUNCIONÁRIO
            </div>
          </div>
        </div>

        {/* FERRAMENTAS DE PESQUISA, SELEÇÃO E CONTROLO */}
        <div style={styles.instActions}>
          <button 
            type="button"
            onClick={() => setActivePortalTab('activation_codes')} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: activePortalTab === 'activation_codes' ? 'var(--color-primary, #B71C1C)' : 'rgba(183, 28, 28, 0.08)',
              color: activePortalTab === 'activation_codes' ? '#ffffff' : 'var(--color-primary, #B71C1C)',
              border: '1.5px solid var(--color-primary, #B71C1C)',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Aceder à lista de emissão de códigos de ativação e envio de credenciais"
          >
            <span style={{ fontSize: '15px' }}>🔐</span>
            <span>Central de Credenciais</span>
          </button>

          <button 
            onClick={() => setIsSearchModalOpen(true)} 
            style={styles.btnSearchTrigger}
            title="Pesquisar e filtrar qualquer funcionário cadastrado"
          >
            <span style={{ fontSize: '15px' }}>🔍</span>
            <span>Pesquisar Agente</span>
            <span style={styles.countBadge}>{employees.length}</span>
          </button>

          {onBackToAdmin && (
            <button onClick={onBackToAdmin} style={styles.btnBackAdmin}>
              ⬅ Painel Geral
            </button>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────
          CARTÃO DE IDENTIFICAÇÃO DO AGENTE (CLEAN DESIGN)
         ────────────────────────────────────────────────────────────── */}
      <div style={styles.profileCard}>
        <div style={styles.profileMain}>
          <div style={styles.avatarWrapper}>
            {currentEmp.photo ? (
              <img src={currentEmp.photo} alt={currentEmp.name} style={styles.avatarImg} />
            ) : (
              <div style={styles.avatarFallback}>
                {currentEmp.name?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            <label style={styles.photoUploadBtn} title="Atualizar Foto de Perfil">
              📷
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={styles.profileInfo}>
            <div style={styles.nameRow}>
              <h2 style={styles.agentName}>{currentEmp.name}</h2>
              <span style={styles.statusPillActive}>
                <span style={styles.statusDot}></span>
                {currentEmp.status || 'Ativo'}
              </span>
            </div>

            <div style={styles.tagsRow}>
              <span style={styles.tag}><strong>NIP:</strong> {currentEmp.nip || 'N/A'}</span>
              <span style={styles.tag}><strong>NUIT:</strong> {currentEmp.nuit || 'N/A'}</span>
              <span style={styles.tag}><strong>BI:</strong> {currentEmp.idNumber || 'N/A'}</span>
              <span style={styles.tag}><strong>Contacto:</strong> {currentEmp.phone || '+258 N/D'}</span>
            </div>

            <div style={styles.unitRow}>
              <span>🏢 <strong>{empOrgInfo.directorateName}</strong></span>
              <span>•</span>
              <span>🏬 {empOrgInfo.departmentName}</span>
              <span>•</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>🎖️ {empOrgInfo.categoryName}</span>
            </div>

            {/* BOTÕES DE DISPARO RÁPIDO DE CREDENCIAIS DO AGENTE SELECIONADO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setCredentialsModalEmp(currentEmp);
                  setIsCredentialsModalOpen(true);
                }}
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                  transition: 'all 0.15s ease'
                }}
                title="Enviar credenciais e código de acesso para este funcionário via WhatsApp, SMS ou Email"
              >
                <span>💬</span>
                <span>Enviar Credenciais / Código de Acesso</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePortalTab('activation_codes')}
                style={{
                  backgroundColor: 'var(--color-bg-base, #ffffff)',
                  color: 'var(--color-primary, #B71C1C)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Ver lista geral de códigos e envio em lote de todos os funcionários"
              >
                <span>🔐</span>
                <span>Central de Códigos ({employees.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* RESUMO RÁPIDO: PASSAGEM À RESERVA */}
        <div style={styles.statReserveCard}>
          <div style={styles.reserveTop}>
            <span style={styles.reserveLabel}>Previsão de Reserva</span>
            <span style={styles.reserveIcon}>⏳</span>
          </div>
          <div style={styles.reserveYear}>{serviceStats.retirementYear}</div>
          <div style={styles.reserveHint}>
            Faltam aprox. <strong>{serviceStats.yearsToRetirement} anos</strong> ({serviceStats.serviceYears} anos cumpridos)
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${serviceStats.progressPercent}%` }}></div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────
          SUB-ABAS DE NAVEGAÇÃO PADRONIZADAS (BUENA4 STANDARD)
         ────────────────────────────────────────────────────────────── */}
      <div className="tabs-container-standard" style={{ marginTop: '4px', marginBottom: '18px' }}>
        <button 
          className={`module-tab ${activePortalTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActivePortalTab('overview')}
        >
          👤 Ficha Cadastral
        </button>
        <button 
          className={`module-tab ${activePortalTab === 'vacations' ? 'active' : ''}`}
          onClick={() => setActivePortalTab('vacations')}
        >
          🌴 Minhas Férias ({myVacations.balance}d)
        </button>
        <button 
          className={`module-tab ${activePortalTab === 'retirement' ? 'active' : ''}`}
          onClick={() => setActivePortalTab('retirement')}
        >
          ⏳ Tempo de Serviço & Reserva
        </button>
        <button 
          className={`module-tab ${activePortalTab === 'career' ? 'active' : ''}`}
          onClick={() => setActivePortalTab('career')}
        >
          📈 Elegibilidade de Carreira
        </button>
        <button 
          className={`module-tab ${activePortalTab === 'absences' ? 'active' : ''}`}
          onClick={() => setActivePortalTab('absences')}
        >
          📅 Minha Efetividade & Faltas
        </button>
        <button 
          className={`module-tab ${activePortalTab === 'disciplinary' ? 'active' : ''}`}
          onClick={() => setActivePortalTab('disciplinary')}
        >
          ⚖️ Processos ({myDisciplinary.length})
        </button>
        <button 
          className={`module-tab ${activePortalTab === 'acts' ? 'active' : ''}`}
          onClick={() => setActivePortalTab('acts')}
        >
          📜 Atos & Nomeações ({myAdminActs.length})
        </button>
        <button 
          className={`module-tab ${activePortalTab === 'activation_codes' ? 'active' : ''}`}
          onClick={() => setActivePortalTab('activation_codes')}
          style={{
            fontWeight: '700',
            border: activePortalTab === 'activation_codes' ? '1.5px solid var(--color-primary, #B71C1C)' : '1.5px solid rgba(183, 28, 28, 0.4)',
            backgroundColor: activePortalTab === 'activation_codes' ? 'var(--color-primary, #B71C1C)' : 'rgba(183, 28, 28, 0.08)',
            color: activePortalTab === 'activation_codes' ? '#ffffff' : 'var(--color-primary, #B71C1C)'
          }}
        >
          🔐 Códigos de Acesso & Credenciais ({employees.length})
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────
          CONTEÚDO DA ABA SELECIONADA
         ────────────────────────────────────────────────────────────── */}
      <div style={styles.contentBody}>
        {/* ABA 1: FICHA CADASTRAL */}
        {activePortalTab === 'overview' && (
          <div style={styles.sectionWrap}>
            <h3 style={styles.secTitle}>📄 Ficha Biográfica e Cadastral Oficial</h3>
            <div style={styles.gridCards}>
              <div style={styles.cleanCard}>
                <h4 style={styles.cleanCardTitle}>Dados Pessoais</h4>
                <div style={styles.infoRow}><span style={styles.lbl}>Nome Completo:</span> <strong>{currentEmp.name}</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Data de Nascimento:</span> <strong>{serviceStats.birthDateFormatted} ({serviceStats.age} anos)</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Género:</span> <strong>{currentEmp.gender || 'N/A'}</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Estado Civil:</span> <strong>{currentEmp.marital_status || 'Solteiro(a)'}</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Habilitações Literárias:</span> <strong>{currentEmp.academic_level || 'Não especificado'}</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Especialidade:</span> <strong>{currentEmp.specialty || 'Geral'}</strong></div>
              </div>

              <div style={styles.cleanCard}>
                <h4 style={styles.cleanCardTitle}>Enquadramento Institucional</h4>
                <div style={styles.infoRow}><span style={styles.lbl}>Carreira:</span> <strong>{empOrgInfo.careerName}</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Categoria / Patente:</span> <strong>{empOrgInfo.categoryName}</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Direcção:</span> <strong>{empOrgInfo.directorateName}</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Departamento:</span> <strong>{empOrgInfo.departmentName}</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Repartição / Secção:</span> <strong>{empOrgInfo.divisionName} / {empOrgInfo.sectionName}</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Admissão no Estado:</span> <strong>{serviceStats.admissionDateFormatted}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: MINHAS FÉRIAS (COM GRÁFICO VISUAL) */}
        {activePortalTab === 'vacations' && (
          <div style={styles.sectionWrap}>
            <div style={styles.headerBetween}>
              <div>
                <h3 style={styles.secTitle}>🌴 Gestão de Férias e Licenças</h3>
                <p style={styles.secDesc}>Saldo regulamentar anual e acompanhamento de despachos.</p>
              </div>
              <button onClick={() => setIsVacationModalOpen(true)} style={styles.btnActionPrimary}>
                ➕ Solicitar Férias
              </button>
            </div>

            {/* GRÁFICO E BALANÇO VISUAL */}
            <div style={styles.chartsGridTwoCol}>
              <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}>
                  <span style={styles.kpiTitle}>Direito Anual</span>
                  <span style={styles.kpiNum}>{myVacations.entitledDays} dias</span>
                  <span style={styles.kpiSub}>Ano {new Date().getFullYear()}</span>
                </div>
                <div style={styles.kpiCard}>
                  <span style={styles.kpiTitle}>Dias Gozados</span>
                  <span style={{ ...styles.kpiNum, color: '#d97706' }}>{myVacations.usedDays} dias</span>
                  <span style={styles.kpiSub}>Aprovados ou em curso</span>
                </div>
                <div style={{ ...styles.kpiCard, borderTop: '3px solid #059669' }}>
                  <span style={styles.kpiTitle}>Saldo Disponível</span>
                  <span style={{ ...styles.kpiNum, color: '#059669' }}>{myVacations.balance} dias</span>
                  <span style={styles.kpiSub}>Disponíveis para marcação</span>
                </div>
              </div>

              {/* Card com Gráfico Donut de Férias */}
              <div style={styles.chartMiniCard}>
                <h4 style={styles.chartTitle}>Distribuição da Quota de Férias</h4>
                <div style={{ width: '100%', height: '140px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Dias Gozados', value: Math.max(0, myVacations.usedDays) },
                          { name: 'Saldo Disponível', value: Math.max(0, myVacations.balance) }
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={62}
                        paddingAngle={3}
                      >
                        <Cell fill="#d97706" />
                        <Cell fill="#059669" />
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={styles.chartLegendRow}>
                  <span style={styles.chartLegendItem}><span style={{ ...styles.legendDot, backgroundColor: '#d97706' }} /> Gozados ({myVacations.usedDays}d)</span>
                  <span style={styles.chartLegendItem}><span style={{ ...styles.legendDot, backgroundColor: '#059669' }} /> Disponível ({myVacations.balance}d)</span>
                </div>
              </div>
            </div>

            <h4 style={styles.subSecTitle}>Histórico de Pedidos</h4>
            {myVacations.list.length === 0 ? (
              <div style={styles.emptyState}>Nenhum pedido de férias registado no sistema para este agente.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="premium-table" style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Período</th>
                      <th style={styles.th}>Dias</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>Justificação / Despacho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myVacations.list.map(vac => (
                      <tr key={vac.id}>
                        <td style={styles.td}><strong>{vac.type}</strong></td>
                        <td style={styles.td}>{formatDisplayDate(vac.startDate)} até {formatDisplayDate(vac.endDate)}</td>
                        <td style={styles.td}>{vac.daysCount} dias</td>
                        <td style={styles.td}>
                          <span style={styles.statusPill(vac.status)}>{vac.status}</span>
                        </td>
                        <td style={styles.td}>{vac.reason || vac.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: TEMPO DE SERVIÇO & RESERVA (COM GRÁFICO VISUAL) */}
        {activePortalTab === 'retirement' && (
          <div style={styles.sectionWrap}>
            <h3 style={styles.secTitle}>⏳ Contagem de Tempo de Serviço e Passagem à Reserva</h3>
            <p style={styles.secDesc}>
              Cálculo baseado no Estatuto Geral dos Funcionários e Agentes do Estado (EGFAE) e Regulamento do SERNIC.
            </p>

            <div style={styles.gridCards}>
              <div style={styles.cleanCard}>
                <h4 style={styles.cleanCardTitle}>Tempo de Serviço Prestado</h4>
                <div style={styles.hugeStat}>{serviceStats.serviceYears} Anos</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '14px' }}>
                  e {serviceStats.serviceMonths} meses ({serviceStats.serviceDays} dias de serviço efetivo)
                </div>
                <div style={styles.infoRow}><span style={styles.lbl}>Data de Admissão:</span> <strong>{serviceStats.admissionDateFormatted}</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Idade Atual do Agente:</span> <strong>{serviceStats.age} anos</strong></div>
              </div>

              <div style={{ ...styles.cleanCard, borderTop: '3px solid #059669' }}>
                <h4 style={styles.cleanCardTitle}>Previsão da Passagem à Reserva / Reforma</h4>
                <div style={{ ...styles.hugeStat, color: '#059669' }}>Ano {serviceStats.retirementYear}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '10px' }}>
                  Faltam aproximadamente <strong>{serviceStats.yearsToRetirement} anos</strong> para a conclusão da carreira ativa.
                </div>

                {/* Donut Chart de Reserva */}
                <div style={{ width: '100%', height: '130px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Anos Cumpridos', value: Math.max(0, serviceStats.serviceYears) },
                          { name: 'Anos Restantes', value: Math.max(0, serviceStats.yearsToRetirement) }
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={58}
                        paddingAngle={3}
                      >
                        <Cell fill="var(--color-primary, #B71C1C)" />
                        <Cell fill="#059669" />
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                    <span>Progresso Cumprido</span>
                    <span>{serviceStats.progressPercent}%</span>
                  </div>
                  <div style={styles.progressTrackLarge}>
                    <div style={{ ...styles.progressFill, width: `${serviceStats.progressPercent}%`, backgroundColor: '#059669' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: ELEGIBILIDADE DE CARREIRA */}
        {activePortalTab === 'career' && (
          <div style={styles.sectionWrap}>
            <h3 style={styles.secTitle}>📈 Radar de Elegibilidade a Promoção e Progressão</h3>
            <p style={styles.secDesc}>Verificação de interstício legal de tempo no escalão (mínimo 3 anos) e habilitações.</p>

            <div style={styles.gridCards}>
              <div style={styles.cleanCard}>
                <h4 style={styles.cleanCardTitle}>Progressão no Escalão / Classe</h4>
                <div style={{ margin: '14px 0' }}>
                  {careerEligibility.isProgressionEligible ? (
                    <div style={styles.alertSuccess}>
                      <span style={{ fontSize: '20px' }}>✅</span>
                      <div>
                        <strong>Elegível para Progressão no Próximo Ciclo</strong>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>Cumpriu o interstício regulamentar de 3 anos no escalão.</div>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.alertWarning}>
                      <span style={{ fontSize: '20px' }}>⏳</span>
                      <div>
                        <strong>Interstício em Curso</strong>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>
                          Faltam aproximadamente {careerEligibility.monthsRemaining} meses para completar os 3 anos no escalão.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={styles.infoRow}><span style={styles.lbl}>Tempo Estimado no Escalão:</span> <strong>{careerEligibility.yearsInRank} anos</strong></div>
                <div style={styles.infoRow}><span style={styles.lbl}>Avaliação de Desempenho:</span> <strong>Bom / Muito Bom</strong></div>
              </div>

              <div style={styles.cleanCard}>
                <h4 style={styles.cleanCardTitle}>Mudança de Carreira por Nível Académico</h4>
                <div style={{ margin: '14px 0' }}>
                  {careerEligibility.hasHigherEducation ? (
                    <div style={styles.alertSuccess}>
                      <span style={{ fontSize: '20px' }}>🎓</span>
                      <div>
                        <strong>Qualificação Superior Registada</strong>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>
                          Nível {careerEligibility.academicLevel} permite solicitação de ingresso na carreira técnica superior.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.alertInfo}>
                      <span style={{ fontSize: '20px' }}>📚</span>
                      <div>
                        <strong>Nível Académico Atual: {careerEligibility.academicLevel}</strong>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>
                          Para transição para carreiras superiores é necessária licenciatura reconhecida pelo Estado.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: MINHA EFETIVIDADE & FALTAS (COM GRÁFICO VISUAL) */}
        {activePortalTab === 'absences' && (
          <div style={styles.sectionWrap}>
            <div style={styles.headerBetween}>
              <div>
                <h3 style={styles.secTitle}>📅 Assiduidade e Registo de Faltas</h3>
                <p style={styles.secDesc}>Extrato de presenças e submissão de atestados médicos ou justificações.</p>
              </div>
              <button onClick={() => setIsAbsenceModalOpen(true)} style={styles.btnActionSecondary}>
                ✍️ Submeter Justificação
              </button>
            </div>

            {/* GRÁFICO E BALANÇO VISUAL */}
            <div style={styles.chartsGridTwoCol}>
              <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}>
                  <span style={styles.kpiTitle}>Faltas Justificadas</span>
                  <span style={{ ...styles.kpiNum, color: '#059669' }}>{myAbsences.justified}</span>
                  <span style={styles.kpiSub}>Aprovadas pela Direcção</span>
                </div>
                <div style={styles.kpiCard}>
                  <span style={styles.kpiTitle}>Faltas Injustificadas</span>
                  <span style={{ ...styles.kpiNum, color: '#dc2626' }}>{myAbsences.unjustified}</span>
                  <span style={styles.kpiSub}>Sujeitas a desconto salarial</span>
                </div>
                <div style={styles.kpiCard}>
                  <span style={styles.kpiTitle}>Aguardam Despacho</span>
                  <span style={{ ...styles.kpiNum, color: '#d97706' }}>{myAbsences.pending}</span>
                  <span style={styles.kpiSub}>Em apreciação da chefia</span>
                </div>
              </div>

              {/* BarChart de Assiduidade */}
              <div style={styles.chartMiniCard}>
                <h4 style={styles.chartTitle}>Extrato Comparativo de Ausências</h4>
                <div style={{ width: '100%', height: '140px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Justificadas', total: myAbsences.justified, fill: '#059669' },
                        { name: 'Injustificadas', total: myAbsences.unjustified, fill: '#dc2626' },
                        { name: 'Em Análise', total: myAbsences.pending, fill: '#d97706' }
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        <Cell fill="#059669" />
                        <Cell fill="#dc2626" />
                        <Cell fill="#d97706" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <h4 style={styles.subSecTitle}>Histórico de Faltas</h4>
            {myAbsences.list.length === 0 ? (
              <div style={styles.emptyState}>✅ Excelente assiduidade! Sem faltas registadas no sistema.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="premium-table" style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                      <th style={styles.th}>Data / Período</th>
                      <th style={styles.th}>Duração</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Estado da Justificação</th>
                      <th style={styles.th}>Motivo Alegado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAbsences.list.map(abs => (
                      <tr key={abs.id}>
                        <td style={styles.td}>{formatDisplayDate(abs.startDate || abs.date)}</td>
                        <td style={styles.td}>{abs.daysCount || 1} dia(s)</td>
                        <td style={styles.td}><strong>{abs.type}</strong></td>
                        <td style={styles.td}>
                          <span style={styles.statusPill(abs.status || abs.approvalStatus || 'Registada')}>
                            {abs.status || abs.approvalStatus || 'Registada'}
                          </span>
                        </td>
                        <td style={styles.td}>{abs.reason || abs.justification || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA 6: PROCESSOS DISCIPLINARES */}
        {activePortalTab === 'disciplinary' && (
          <div style={styles.sectionWrap}>
            <h3 style={styles.secTitle}>⚖️ Trâmites de Processos Disciplinares</h3>
            <p style={styles.secDesc}>Consulta de autos e prazos legais de contraditório e defesa.</p>

            {myDisciplinary.length === 0 ? (
              <div style={styles.cleanStateBox}>
                <span style={{ fontSize: '32px' }}>🛡️</span>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#059669', fontSize: '16px' }}>Situação Disciplinar Limpa</h4>
                  <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    Não existe nenhum processo disciplinar instaurado contra o seu cadastro no SERNIC.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myDisciplinary.map(proc => (
                  <div key={proc.id} style={styles.cleanCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '15px' }}>Processo nº {proc.processNumber || proc.id}</strong>
                      <span style={styles.statusPill(proc.status)}>{proc.status}</span>
                    </div>
                    <div style={{ fontSize: '13px', margin: '8px 0', color: 'var(--color-text-base)' }}>
                      <strong>Infração Invocada:</strong> {proc.allegedInfraction || proc.reason || 'Em averiguação'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Fase Processual: {proc.stage || 'Instrução'} • Data de Instauração: {formatDisplayDate(proc.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 7: ATOS & NOMEAÇÕES */}
        {activePortalTab === 'acts' && (
          <div style={styles.sectionWrap}>
            <h3 style={styles.secTitle}>📜 Atos Administrativos, Nomeações e Cessações</h3>
            <p style={styles.secDesc}>Histórico de despachos ministeriais e da Direcção Nacional.</p>

            {myAdminActs.length === 0 ? (
              <div style={styles.emptyState}>Nenhum ato administrativo formal emitido no sistema para este agente.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myAdminActs.map(act => (
                  <div key={act.id} style={styles.cleanCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--color-primary)' }}>{act.actType || act.type || 'Despacho'}</strong>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>
                        {formatDisplayDate(act.date || act.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--color-text-base)', lineHeight: '1.5' }}>
                      {act.description || act.notes || 'Despacho administrativo regulamentar arquivado no processo individual.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 8: CÓDIGOS DE ACESSO (PRIMEIRO LOGIN SERNIC) */}
        {activePortalTab === 'activation_codes' && (
          <PortalActivationCodesTab
            employees={employees}
            orgData={orgData}
            onUpdateEmployee={updateEmployee}
            onSendCredentials={(emp) => {
              setCredentialsModalEmp(emp);
              setIsCredentialsModalOpen(true);
            }}
          />
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────
          MODAIS MÓVEIS (PORTAIS ROBUSTOS E PADRONIZADOS)
         ────────────────────────────────────────────────────────────── */}
      <PortalSendCredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => {
          setIsCredentialsModalOpen(false);
          setCredentialsModalEmp(null);
        }}
        employee={credentialsModalEmp || currentEmp}
        onUpdateEmployee={updateEmployee}
      />

      <PortalAgentSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        employees={employees}
        orgData={orgData}
        currentEmpId={currentEmp.id}
        onSelect={(emp) => setSelectedEmpId(emp.id)}
      />

      <PortalVacationModal
        isOpen={isVacationModalOpen}
        onClose={() => setIsVacationModalOpen(false)}
        vacationForm={vacationForm}
        setVacationForm={setVacationForm}
        onSubmit={handleSubmitVacation}
      />

      <PortalAbsenceModal
        isOpen={isAbsenceModalOpen}
        onClose={() => setIsAbsenceModalOpen(false)}
        absenceForm={absenceForm}
        setAbsenceForm={setAbsenceForm}
        onSubmit={handleSubmitAbsence}
      />

      {/* MODAL DE CONFIRMAÇÃO */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        hideCancel={confirmModal.hideCancel}
      />
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ESTILOS VISUAIS DO PORTAL E MODAIS MÓVEIS
 * ─────────────────────────────────────────────────────────────────────────────
 */
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    maxWidth: '1440px',
    margin: '0 auto',
    boxSizing: 'border-box'
  },
  institutionalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    padding: '18px 24px',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
  },
  instLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  sernicLogo: {
    width: '56px',
    height: '56px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))'
  },
  instText: { display: 'flex', flexDirection: 'column' },
  instTitle: {
    fontSize: '19px',
    fontWeight: '800',
    color: 'var(--color-primary, #B71C1C)',
    margin: '0 0 2px 0',
    letterSpacing: '0.4px'
  },
  instSub: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted)'
  },
  instActions: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  btnSearchTrigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  countBadge: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '800',
    padding: '2px 7px',
    borderRadius: '10px'
  },
  btnBackAdmin: {
    padding: '8px 14px',
    backgroundColor: 'transparent',
    color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  profileCard: {
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    borderRadius: '12px',
    padding: '22px 24px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '24px'
  },
  profileMain: { display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' },
  avatarWrapper: { position: 'relative', width: '84px', height: '84px' },
  avatarImg: {
    width: '84px',
    height: '84px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid var(--color-primary)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  avatarFallback: {
    width: '84px',
    height: '84px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: '800'
  },
  photoUploadBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '13px',
    border: '2px solid #fff',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
  },
  profileInfo: { display: 'flex', flexDirection: 'column', gap: '6px' },
  nameRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  agentName: { fontSize: '20px', fontWeight: '800', color: 'var(--color-text-base)', margin: 0 },
  statusPillActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '800'
  },
  statusDot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' },
  tagsRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-text-muted)' },
  tag: { backgroundColor: 'var(--color-bg-subtle)', padding: '3px 8px', borderRadius: '6px' },
  unitRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-muted)', flexWrap: 'wrap' },
  statReserveCard: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '16px 20px',
    borderRadius: '10px',
    minWidth: '220px',
    border: '1px solid var(--color-border)'
  },
  reserveTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  reserveLabel: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-muted)' },
  reserveIcon: { fontSize: '14px' },
  reserveYear: { fontSize: '26px', fontWeight: '800', color: '#059669' },
  reserveHint: { fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 8px 0' },
  progressTrack: { width: '100%', height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' },
  progressTrackLarge: { width: '100%', height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' },
  progressFill: { height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.3s ease' },
  contentBody: {
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
  },
  sectionWrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  secTitle: { fontSize: '17px', fontWeight: '700', color: 'var(--color-text-base)', margin: 0 },
  secDesc: { fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 },
  subSecTitle: { fontSize: '15px', fontWeight: '700', color: 'var(--color-text-base)', margin: '14px 0 6px 0' },
  headerBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  chartsGridTwoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '8px' },
  chartMiniCard: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '16px 18px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  chartTitle: { fontSize: '13px', fontWeight: '700', color: 'var(--color-primary, #B71C1C)', margin: '0 0 8px 0' },
  chartLegendRow: { display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px' },
  chartLegendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)' },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%' },
  cleanCard: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '18px 20px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)'
  },
  cleanCardTitle: { fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)', margin: '0 0 12px 0' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.03)', fontSize: '13px' },
  lbl: { color: 'var(--color-text-muted)' },
  hugeStat: { fontSize: '30px', fontWeight: '800', color: 'var(--color-primary)', margin: '6px 0 2px 0' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' },
  kpiCard: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  kpiTitle: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-muted)' },
  kpiNum: { fontSize: '20px', fontWeight: '800', color: 'var(--color-text-base)' },
  kpiSub: { fontSize: '11px', color: 'var(--color-text-muted)' },
  emptyState: {
    padding: '28px 16px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-subtle)',
    borderRadius: '8px',
    fontSize: '13px'
  },
  cleanStateBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#ecfdf5',
    borderRadius: '10px',
    border: '1px solid #a7f3d0'
  },
  alertSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    borderRadius: '8px',
    border: '1px solid #a7f3d0',
    fontSize: '13px'
  },
  alertWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: '#fffbeb',
    color: '#92400e',
    borderRadius: '8px',
    border: '1px solid #fde68a',
    fontSize: '13px'
  },
  alertInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    borderRadius: '8px',
    border: '1px solid #bfdbfe',
    fontSize: '13px'
  },
  th: { padding: '10px 14px', textAlign: 'left', fontWeight: '700', fontSize: '12px' },
  td: { padding: '10px 14px', borderBottom: '1px solid var(--color-border)' },
  statusPill: (status) => {
    let bg = '#f1f5f9';
    let col = '#475569';
    const s = (status || '').toLowerCase();
    if (s.includes('aprov') || s.includes('goz') || s.includes('concl')) {
      bg = '#ecfdf5';
      col = '#059669';
    } else if (s.includes('pend') || s.includes('submet')) {
      bg = '#fffbeb';
      col = '#d97706';
    } else if (s.includes('rejeit') || s.includes('injust')) {
      bg = '#fef2f2';
      col = '#dc2626';
    }
    return {
      padding: '3px 8px',
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: '700',
      backgroundColor: bg,
      color: col,
      display: 'inline-block'
    };
  },
  btnActionPrimary: {
    padding: '9px 16px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  btnActionSecondary: {
    padding: '9px 16px',
    backgroundColor: 'transparent',
    color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' },
  btnModalCancel: {
    padding: '9px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--color-text-base)'
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  formLbl: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' },
  fieldInput: {
    padding: '9px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    color: 'var(--color-text-base)',
    fontSize: '13px'
  },
  fieldTextarea: {
    padding: '9px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card, #ffffff)',
    color: 'var(--color-text-base)',
    fontSize: '13px',
    resize: 'vertical'
  }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ESTILOS DOS MODAIS MÓVEIS E RESIZABLE (SOLID SURFACES)
 * ─────────────────────────────────────────────────────────────────────────────
 */
const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
    animation: 'fadeIn 0.2s ease-out'
  },
  modalBox: {
    backgroundColor: 'var(--color-bg-base, #ffffff)',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    border: '1px solid var(--color-border, #cbd5e1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border, #e2e8f0)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-card, #f8fafc)',
    cursor: 'move',
    userSelect: 'none',
    flexShrink: 0
  },
  headerTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--color-text-base, #0f172a)'
  },
  headerSubtitle: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-text-muted, #64748b)',
    marginTop: '2px'
  },
  expandBtn: {
    background: 'rgba(37, 99, 235, 0.08)',
    border: '1px solid rgba(37, 99, 235, 0.25)',
    color: '#2563eb',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '3px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: 'var(--color-text-muted, #64748b)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px'
  },
  modalBody: {
    padding: '18px 20px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  },
  modalForm: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxSizing: 'border-box'
  },
  searchInput: {
    width: '100%',
    padding: '11px 14px',
    paddingRight: '36px',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #cbd5e1)',
    backgroundColor: 'var(--color-bg-card, #f8fafc)',
    color: 'var(--color-text-base, #0f172a)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  clearBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: '14px'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '12px'
  },
  miniLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    marginBottom: '4px'
  },
  selectInput: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--color-border, #cbd5e1)',
    backgroundColor: 'var(--color-bg-card, #f8fafc)',
    color: 'var(--color-text-base, #0f172a)',
    fontSize: '12px',
    outline: 'none'
  },
  counterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    padding: '0 2px'
  },
  btnResetFilters: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary, #B71C1C)',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
    flex: 1,
    maxHeight: '440px',
    paddingRight: '4px'
  },
  resultCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--color-border, #e2e8f0)',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  avatarBox: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'var(--color-primary, #B71C1C)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '16px'
  },
  empName: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-text-base, #0f172a)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  nipBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(27, 54, 93, 0.08)',
    color: 'var(--color-primary, #B71C1C)',
    whiteSpace: 'nowrap'
  },
  empSub: {
    fontSize: '11px',
    color: 'var(--color-text-muted, #64748b)',
    marginTop: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  activePill: {
    padding: '3px 8px',
    borderRadius: '10px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: '11px',
    fontWeight: '800',
    whiteSpace: 'nowrap'
  },
  selectArrow: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    fontWeight: 'bold'
  },
  emptyState: {
    padding: '32px 16px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '13px'
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: '18px',
    height: '18px',
    cursor: 'se-resize',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    zIndex: 10
  }
};
