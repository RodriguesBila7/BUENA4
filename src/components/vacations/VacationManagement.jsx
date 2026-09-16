import React, { useState, useEffect, useMemo } from 'react';
import useVacationData from '../../hooks/useVacationData';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import useResizableModal from '../../hooks/useResizableModal';
import ConfirmModal from '../ConfirmModal';
import CrudActionButtons from '../common/CrudActionButtons';
import { exportToExcel } from '../../utils/excelExport';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/D';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};

const computeVacationCountdown = (startDateStr, endDateStr, manualStatus, now) => {
  if (manualStatus === 'Cancelada') {
    return {
      computedStatus: 'Cancelada',
      isOngoing: false,
      isScheduled: false,
      isCompleted: false,
      isEndingSoon: false,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      totalDurationDays: 0,
      elapsedDays: 0,
      progressPercent: 0,
      displayText: 'Férias Canceladas',
      countdownText: 'Cancelada',
      endDateFormatted: formatDate(endDateStr)
    };
  }

  if (!startDateStr || !endDateStr) {
    return {
      computedStatus: manualStatus || 'Agendadas',
      isOngoing: false,
      isScheduled: false,
      isCompleted: false,
      isEndingSoon: false,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      totalDurationDays: 0,
      elapsedDays: 0,
      progressPercent: 0,
      displayText: 'Datas não definidas',
      countdownText: 'N/D',
      endDateFormatted: 'N/D'
    };
  }

  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T23:59:59`);
  const totalDurationMs = Math.max(end.getTime() - start.getTime(), 1000);
  const totalDurationDays = Math.max(1, Math.round(totalDurationMs / (1000 * 60 * 60 * 24)));

  const nowMs = now.getTime();
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (nowMs < startMs) {
    const msUntilStart = startMs - nowMs;
    const daysUntilStart = Math.ceil(msUntilStart / (1000 * 60 * 60 * 24));
    return {
      computedStatus: 'Agendadas',
      isOngoing: false,
      isScheduled: true,
      isCompleted: false,
      isEndingSoon: false,
      remainingDays: totalDurationDays,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      totalDurationDays,
      elapsedDays: 0,
      progressPercent: 0,
      displayText: `Iniciam em ${daysUntilStart} dia${daysUntilStart !== 1 ? 's' : ''} (${formatDate(startDateStr)})`,
      countdownText: `Faltam ${daysUntilStart}d para o início`,
      endDateFormatted: formatDate(endDateStr)
    };
  }

  if (nowMs > endMs) {
    return {
      computedStatus: 'Concluídas',
      isOngoing: false,
      isScheduled: false,
      isCompleted: true,
      isEndingSoon: false,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      totalDurationDays,
      elapsedDays: totalDurationDays,
      progressPercent: 100,
      displayText: `Concluídas a ${formatDate(endDateStr)}`,
      countdownText: 'Período Concluído (0 dias)',
      endDateFormatted: formatDate(endDateStr)
    };
  }

  const diffMs = endMs - nowMs;
  const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const remainingSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const elapsedMs = nowMs - startMs;
  const elapsedDays = Math.min(totalDurationDays, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1);
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));
  const isEndingSoon = remainingDays <= 5;

  let countdownText = '';
  if (remainingDays > 0) {
    countdownText = `Faltam ${remainingDays} dia${remainingDays !== 1 ? 's' : ''} e ${remainingHours}h`;
  } else if (remainingHours > 0) {
    countdownText = `Faltam ${remainingHours}h e ${remainingMinutes}m (Último dia)`;
  } else {
    countdownText = `Faltam ${remainingMinutes}m e ${remainingSeconds}s`;
  }

  return {
    computedStatus: 'Em curso',
    isOngoing: true,
    isScheduled: false,
    isCompleted: false,
    isEndingSoon,
    remainingDays,
    remainingHours,
    remainingMinutes,
    remainingSeconds,
    totalDurationDays,
    elapsedDays,
    progressPercent,
    displayText: `Faltam ${remainingDays} dias para terminar`,
    countdownText,
    endDateFormatted: formatDate(endDateStr)
  };
};

export default function VacationManagement() {
  const { requests, addRequest, updateRequest, removeRequest } = useVacationData();
  const { employees } = useEmployeeData();
  const { data: orgData } = useOrgData();

  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirectorate, setFilterDirectorate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [viewingRecord, setViewingRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const viewModal = useResizableModal({ defaultWidth: '780px', minWidth: 420, minHeight: 460 });
  const formModal = useResizableModal({ defaultWidth: '720px', minWidth: 420, minHeight: 480 });

  const availableDepartments = useMemo(() => {
    if (!filterDirectorate) return [];
    return (orgData?.departments || []).filter(d => String(d.directorateId) === String(filterDirectorate));
  }, [orgData?.departments, filterDirectorate]);

  const availableDivisions = useMemo(() => {
    if (!filterDirectorate) return [];
    if (filterDepartment) {
      return (orgData?.divisions || []).filter(div => String(div.departmentId) === String(filterDepartment));
    }
    const depIds = new Set(availableDepartments.map(d => String(d.id)));
    return (orgData?.divisions || []).filter(div => 
      String(div.directorateId) === String(filterDirectorate) || (div.departmentId && depIds.has(String(div.departmentId)))
    );
  }, [orgData?.divisions, filterDirectorate, filterDepartment, availableDepartments]);

  const enrichedRequests = useMemo(() => {
    return (requests || []).map(req => {
      const emp = (employees || []).find(e => 
        String(e.id) === String(req.employeeId) || 
        (e.nuit && e.nuit === req.employeeNip) ||
        (e.nip && e.nip === req.employeeNip)
      );

      const countdown = computeVacationCountdown(req.startDate, req.endDate, req.status, currentTime);

      const directorateName = emp?.directorateId 
        ? (orgData?.directorates || []).find(d => String(d.id) === String(emp.directorateId))?.name 
        : 'Direcção Geral';
      
      const departmentName = emp?.departmentId 
        ? (orgData?.departments || []).find(d => String(d.id) === String(emp.departmentId))?.name 
        : 'N/A';

      const divisionName = emp?.divisionId 
        ? (orgData?.divisions || []).find(d => String(d.id) === String(emp.divisionId))?.name 
        : 'N/A';

      return {
        ...req,
        emp,
        directorateName,
        departmentName,
        divisionName,
        countdown
      };
    });
  }, [requests, employees, orgData, currentTime]);

  const filteredRequests = useMemo(() => {
    return enrichedRequests.filter(item => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const empName = (item.emp?.name || item.employeeName || '').toLowerCase();
        const nuit = (item.emp?.nuit || '').toLowerCase();
        const nip = (item.emp?.nip || item.employeeNip || '').toLowerCase();
        if (!empName.includes(term) && !nuit.includes(term) && !nip.includes(term)) {
          return false;
        }
      }

      if (filterDirectorate && String(item.emp?.directorateId) !== String(filterDirectorate)) {
        return false;
      }

      if (filterDepartment && String(item.emp?.departmentId) !== String(filterDepartment)) {
        return false;
      }

      if (filterDivision && String(item.emp?.divisionId) !== String(filterDivision)) {
        return false;
      }

      if (filterStatus && item.countdown.computedStatus !== filterStatus) {
        return false;
      }

      if (filterAlertOnly && !item.countdown.isEndingSoon) {
        return false;
      }

      return true;
    });
  }, [enrichedRequests, searchTerm, filterDirectorate, filterDepartment, filterDivision, filterStatus, filterAlertOnly]);

  const stats = useMemo(() => {
    let total = enrichedRequests.length;
    let ongoing = 0;
    let scheduled = 0;
    let endingSoon = 0;
    let completed = 0;

    enrichedRequests.forEach(r => {
      if (r.countdown.computedStatus === 'Em curso') ongoing++;
      if (r.countdown.computedStatus === 'Agendadas') scheduled++;
      if (r.countdown.computedStatus === 'Concluídas') completed++;
      if (r.countdown.isEndingSoon) endingSoon++;
    });

    return { total, ongoing, scheduled, endingSoon, completed };
  }, [enrichedRequests]);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterDirectorate('');
    setFilterDepartment('');
    setFilterDivision('');
    setFilterStatus('');
    setFilterAlertOnly(false);
    setCurrentPage(1);
  };

  const handleDelete = (record) => {
    setConfirmModal({
      isOpen: true,
      title: 'Apagar Registo de Férias',
      message: `Tem a certeza que deseja eliminar o registo de férias de ${record.emp?.name || record.employeeName}? Esta ação é definitiva.`,
      onConfirm: async () => {
        await removeRequest(record.id);
        setConfirmModal({ isOpen: false });
        if (viewingRecord?.id === record.id) setViewingRecord(null);
      }
    });
  };

  const handleExportExcel = () => {
    const dataToExport = filteredRequests.map(r => ({
      'ID Registo': r.id,
      'Funcionário': r.emp?.name || r.employeeName || 'N/D',
      'NUIT': r.emp?.nuit || 'N/D',
      'NIP': r.emp?.nip || r.employeeNip || 'N/D',
      'Direcção': r.directorateName,
      'Departamento': r.departmentName,
      'Repartição': r.divisionName,
      'Tipo': r.type || 'Férias Anuais',
      'Início': r.startDate,
      'Término': r.endDate,
      'Dias Totais': r.daysCount,
      'Estado': r.countdown.computedStatus,
      'Contagem Regressiva': r.countdown.countdownText,
      'Data de Término': r.countdown.endDateFormatted,
      'Alerta Término Próximo': r.countdown.isEndingSoon ? 'SIM (≤ 5 dias)' : 'Não'
    }));
    exportToExcel(dataToExport, 'Gestao_Ferias_SERNIC');
  };

  return (
    <div style={styles.container}>
      <div style={styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, borderLeft: '4px solid var(--color-primary, #1B365D)' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Total de Registos</span>
            <span style={styles.kpiIcon}>📋</span>
          </div>
          <div style={styles.kpiValue}>{stats.total}</div>
          <div style={styles.kpiDesc}>Histórico global cadastrado</div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #059669' }}>
          <div style={styles.kpiHeader}>
            <span style={{ ...styles.kpiTitle, color: '#059669' }}>Em Curso (Decorrendo)</span>
            <span style={styles.kpiIcon}>⏳</span>
          </div>
          <div style={{ ...styles.kpiValue, color: '#059669' }}>{stats.ongoing}</div>
          <div style={styles.kpiDesc}>Funcionários em período de gozo</div>
        </div>

        <div style={{ 
          ...styles.kpiCard, 
          borderLeft: '4px solid #DC2626',
          backgroundColor: stats.endingSoon > 0 ? 'rgba(220, 38, 38, 0.04)' : 'var(--color-bg-card)'
        }}>
          <div style={styles.kpiHeader}>
            <span style={{ ...styles.kpiTitle, color: '#DC2626' }}>Término Próximo (≤ 5 dias)</span>
            <span style={styles.kpiIcon}>⚠️</span>
          </div>
          <div style={{ ...styles.kpiValue, color: '#DC2626' }}>{stats.endingSoon}</div>
          <div style={styles.kpiDesc}>Alertas para regresso ao serviço</div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #2563EB' }}>
          <div style={styles.kpiHeader}>
            <span style={{ ...styles.kpiTitle, color: '#2563EB' }}>Agendadas (Futuras)</span>
            <span style={styles.kpiIcon}>📅</span>
          </div>
          <div style={{ ...styles.kpiValue, color: '#2563EB' }}>{stats.scheduled}</div>
          <div style={styles.kpiDesc}>Programadas para início breve</div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #64748B' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Concluídas</span>
            <span style={styles.kpiIcon}>✅</span>
          </div>
          <div style={styles.kpiValue}>{stats.completed}</div>
          <div style={styles.kpiDesc}>Férias terminadas com êxito</div>
        </div>
      </div>

      <div style={styles.filterContainer}>
        <div style={styles.filterTitleRow}>
          <span style={styles.filterHeaderTitle}>🔍 Filtros de Selecção e Pesquisa Operacional</span>
          {(searchTerm || filterDirectorate || filterDepartment || filterDivision || filterStatus || filterAlertOnly) && (
            <button type="button" onClick={handleClearFilters} style={styles.btnClearFilters}>
              ✕ Limpar Filtros
            </button>
          )}
        </div>

        <div style={styles.filterGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Pesquisar Funcionário (Nome / NUIT / NIP)</label>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              placeholder="Digite o nome, NUIT ou NIP..." 
              style={styles.input} 
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Direcção / Unidade</label>
            <select 
              value={filterDirectorate} 
              onChange={e => {
                setFilterDirectorate(e.target.value);
                setFilterDepartment('');
                setFilterDivision('');
                setCurrentPage(1);
              }}
              style={styles.select}
            >
              <option value="">Todas as Direcções</option>
              {(orgData?.directorates || []).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Departamento</label>
            <select 
              value={filterDepartment} 
              onChange={e => {
                setFilterDepartment(e.target.value);
                setFilterDivision('');
                setCurrentPage(1);
              }}
              style={styles.select}
              disabled={!filterDirectorate}
            >
              <option value="">{filterDirectorate ? 'Todos os Departamentos' : 'Selecione a Direcção primeiro'}</option>
              {availableDepartments.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
          </div>

          <div style={{ ...styles.filterGroup, minWidth: '260px' }}>
            <label style={{ ...styles.filterLabel, whiteSpace: 'nowrap' }}>Repartição / Repartição Central</label>
            <select 
              value={filterDivision} 
              onChange={e => { setFilterDivision(e.target.value); setCurrentPage(1); }} 
              style={styles.select}
              disabled={!filterDirectorate}
            >
              <option value="">{filterDirectorate ? 'Todas as Repartições' : 'Selecione a Direcção primeiro'}</option>
              {availableDivisions.map(div => (
                <option key={div.id} value={div.id}>
                  {div.name}{!div.departmentId ? ' (Repartição Central)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Estado Automático</label>
            <select 
              value={filterStatus} 
              onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} 
              style={styles.select}
            >
              <option value="">Todos os Estados</option>
              <option value="Em curso">Em curso (Gozando agora)</option>
              <option value="Agendadas">Agendadas (Futuras)</option>
              <option value="Concluídas">Concluídas</option>
              <option value="Canceladas">Canceladas</option>
            </select>
          </div>

          <div style={{ ...styles.filterGroup, justifyContent: 'flex-end' }}>
            <label 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '6px',
                backgroundColor: filterAlertOnly ? 'rgba(220, 38, 38, 0.12)' : 'var(--color-bg-base)',
                border: filterAlertOnly ? '1px solid #DC2626' : '1px solid var(--color-border)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                color: filterAlertOnly ? '#DC2626' : 'var(--color-text-main)',
                transition: 'all 0.2s'
              }}
            >
              <input 
                type="checkbox" 
                checked={filterAlertOnly} 
                onChange={e => { setFilterAlertOnly(e.target.checked); setCurrentPage(1); }} 
              />
              <span>⚠️ Apenas Próximas de Terminar (≤ 5 dias)</span>
            </label>
          </div>
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableHeaderBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)' }}>
              Lista Nominal de Funcionários e Contagem Regressiva ({filteredRequests.length})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              ⏱️ {currentTime.toLocaleTimeString()}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={handleExportExcel} 
              style={styles.btnSecondary}
              title="Exportar listagem completa em formato Excel"
            >
              📥 Exportar Excel
            </button>
            <button 
              type="button" 
              onClick={() => { setEditingRecord(null); setIsNewModalOpen(true); }} 
              style={styles.btnPrimary}
              title="Registar nova marcação de férias para funcionário"
            >
              ➕ Novo Agendamento de Férias
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Funcionário / Lotação</th>
                <th style={styles.th}>Período de Férias</th>
                <th style={styles.th}>Duração Total</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Contagem Decrescente (Dias e Horas)</th>
                <th style={styles.th}>Férias Terminam Em</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>
                    Nenhum registo de férias encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map(r => {
                  const { countdown } = r;
                  const empName = r.emp?.name || r.employeeName || 'Funcionário';
                  const empNuit = r.emp?.nuit || 'N/A';
                  const empNip = r.emp?.nip || r.employeeNip || 'N/A';
                  const cargo = r.emp?.cargo || 'Técnico';

                  return (
                    <tr key={r.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={styles.avatar}>
                            {r.emp?.photo ? (
                              <img src={r.emp.photo} alt={empName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <span>{empName.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{empName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              NUIT: <strong>{empNuit}</strong> | NIP: {empNip}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              {cargo} • {r.directorateName}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>
                          {formatDate(r.startDate)} ➔ {formatDate(r.endDate)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {r.type || 'Férias Anuais'} ({r.year || new Date().getFullYear()})
                        </div>
                      </td>

                      <td style={styles.td}>
                        <span style={styles.badgeDays}>
                          {r.daysCount || countdown.totalDurationDays} dias
                        </span>
                      </td>

                      <td style={styles.td}>
                        <span style={getStatusBadgeStyle(countdown.computedStatus)}>
                          {countdown.computedStatus}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {countdown.isOngoing ? (
                          <div>
                            {countdown.isEndingSoon && (
                              <div style={styles.alertEndingSoon}>
                                ⚠️ Férias terminam em breve!
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '800', color: countdown.isEndingSoon ? '#DC2626' : '#059669' }}>
                                {countdown.remainingDays} dias restantes
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                ({countdown.remainingHours}h {countdown.remainingMinutes}m)
                              </span>
                            </div>

                            <div style={styles.progressBarBg}>
                              <div 
                                style={{
                                  ...styles.progressBarFill,
                                  width: `${countdown.progressPercent}%`,
                                  backgroundColor: countdown.isEndingSoon ? '#DC2626' : 'var(--color-primary)'
                                }} 
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              <span>Dia {countdown.elapsedDays} de {countdown.totalDurationDays}</span>
                              <span>{countdown.displayText}</span>
                            </div>
                          </div>
                        ) : countdown.isScheduled ? (
                          <div>
                            <div style={{ fontWeight: '600', color: '#2563EB', fontSize: '12px' }}>
                              {countdown.displayText}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              Início a {formatDate(r.startDate)}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {countdown.displayText}
                          </div>
                        )}
                      </td>

                      <td style={styles.td}>
                        <div style={{ fontWeight: '700', color: 'var(--color-text-main)' }}>
                          {countdown.endDateFormatted}
                        </div>
                        {countdown.isOngoing && (
                          <div style={{ fontSize: '11px', color: countdown.isEndingSoon ? '#DC2626' : '#059669', fontWeight: '600' }}>
                            {countdown.displayText}
                          </div>
                        )}
                      </td>

                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <CrudActionButtons 
                          onView={() => setViewingRecord(r)}
                          onEdit={() => { setEditingRecord(r); setIsNewModalOpen(true); }}
                          onDelete={() => handleDelete(r)}
                          viewTitle="Visualizar Ficha e Histórico Completo de Férias"
                          editTitle="Editar Agendamento e Período de Férias"
                          deleteTitle="Apagar Registo de Férias"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={styles.paginationRow}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              A mostrar {Math.min(filteredRequests.length, (currentPage - 1) * itemsPerPage + 1)} até {Math.min(filteredRequests.length, currentPage * itemsPerPage)} de {filteredRequests.length} funcionários
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                type="button" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                style={styles.pageBtn}
              >
                ◀ Anterior
              </button>
              <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)' }}>
                Página {currentPage} de {totalPages}
              </span>
              <button 
                type="button" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
                style={styles.pageBtn}
              >
                Próxima ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {viewingRecord && (
        <div style={styles.modalOverlay} onClick={viewModal.getOverlayProps(() => setViewingRecord(null)).onClick}>
          <div 
            ref={viewModal.modalRef} 
            style={{ ...styles.modalContent, ...viewModal.modalStyle }}
            onClick={e => e.stopPropagation()}
          >
            <div 
              style={styles.modalHeader}
              onPointerDown={viewModal.isMaximized ? undefined : viewModal.onPointerDown}
              onDoubleClick={viewModal.handleHeaderDoubleClick}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🌴</span>
                <h3 style={styles.modalTitle}>
                  Ficha de Férias e Contagem Regressiva: {viewingRecord.emp?.name || viewingRecord.employeeName}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button type="button" onClick={viewModal.toggleMaximize} style={styles.expandBtn}>
                  {viewModal.isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
                </button>
                <button type="button" onClick={() => setViewingRecord(null)} style={styles.closeBtn}>✕</button>
              </div>
            </div>

            <div style={styles.modalBody}>
              {viewingRecord.countdown.isOngoing ? (
                <div style={styles.liveCountdownCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1B365D', fontWeight: '700' }}>
                        ⏱️ Contagem Regressiva em Tempo Real (Férias em Curso)
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: viewingRecord.countdown.isEndingSoon ? '#DC2626' : '#1B365D', marginTop: '2px' }}>
                        Férias terminam em: {viewingRecord.countdown.endDateFormatted}
                      </div>
                    </div>
                    {viewingRecord.countdown.isEndingSoon && (
                      <div style={styles.pulseAlertBadge}>
                        ⚠️ Alerta: Faltam menos de 5 dias para o regresso ao serviço!
                      </div>
                    )}
                  </div>

                  <div style={styles.timerBlocksGrid}>
                    <div style={styles.timerBlock}>
                      <div style={styles.timerNumber}>{viewingRecord.countdown.remainingDays}</div>
                      <div style={styles.timerLabel}>DIAS</div>
                    </div>
                    <div style={styles.timerBlock}>
                      <div style={styles.timerNumber}>{viewingRecord.countdown.remainingHours}</div>
                      <div style={styles.timerLabel}>HORAS</div>
                    </div>
                    <div style={styles.timerBlock}>
                      <div style={styles.timerNumber}>{viewingRecord.countdown.remainingMinutes}</div>
                      <div style={styles.timerLabel}>MINUTOS</div>
                    </div>
                    <div style={styles.timerBlock}>
                      <div style={styles.timerNumber}>{viewingRecord.countdown.remainingSeconds}</div>
                      <div style={styles.timerLabel}>SEGUNDOS</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#1B365D' }}>
                      <span>Início: {formatDate(viewingRecord.startDate)} ({viewingRecord.countdown.elapsedDays} dias gozados)</span>
                      <span>Restam: {viewingRecord.countdown.remainingDays} dias de {viewingRecord.countdown.totalDurationDays}</span>
                    </div>
                    <div style={styles.progressBarBgBig}>
                      <div 
                        style={{
                          ...styles.progressBarFillBig,
                          width: `${viewingRecord.countdown.progressPercent}%`,
                          backgroundColor: viewingRecord.countdown.isEndingSoon ? '#DC2626' : '#059669'
                        }} 
                      />
                    </div>
                  </div>
                </div>
              ) : viewingRecord.countdown.isScheduled ? (
                <div style={{ ...styles.liveCountdownCard, backgroundColor: 'rgba(37, 99, 235, 0.08)', borderColor: '#2563EB' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#2563EB' }}>
                    📅 Férias Agendadas: {viewingRecord.countdown.displayText}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Período previsto: de {formatDate(viewingRecord.startDate)} a {formatDate(viewingRecord.endDate)} ({viewingRecord.daysCount} dias).
                  </div>
                </div>
              ) : (
                <div style={{ ...styles.liveCountdownCard, backgroundColor: 'rgba(100, 116, 139, 0.08)', borderColor: '#64748B' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>
                    ✅ {viewingRecord.countdown.displayText}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Período cumprido: de {formatDate(viewingRecord.startDate)} a {formatDate(viewingRecord.endDate)} ({viewingRecord.daysCount} dias).
                  </div>
                </div>
              )}

              <div style={styles.sectionHeader}>👤 Dados Cadastrais do Funcionário</div>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Nome Completo:</span>
                  <span style={styles.infoVal}>{viewingRecord.emp?.name || viewingRecord.employeeName}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>NUIT:</span>
                  <span style={styles.infoVal}>{viewingRecord.emp?.nuit || 'N/A'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>NIP:</span>
                  <span style={styles.infoVal}>{viewingRecord.emp?.nip || viewingRecord.employeeNip || 'N/A'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Cargo / Função:</span>
                  <span style={styles.infoVal}>{viewingRecord.emp?.cargo || 'Técnico'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Direcção / Unidade:</span>
                  <span style={styles.infoVal}>{viewingRecord.directorateName}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Departamento:</span>
                  <span style={styles.infoVal}>{viewingRecord.departmentName}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Repartição:</span>
                  <span style={styles.infoVal}>{viewingRecord.divisionName}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Contacto:</span>
                  <span style={styles.infoVal}>{viewingRecord.emp?.phone || viewingRecord.emp?.contact || '+258 N/D'}</span>
                </div>
              </div>

              <div style={styles.sectionHeader}>📜 Histórico Completo de Férias e Licenças deste Funcionário</div>
              <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                <table className="premium-table" style={{ width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Ano</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Período</th>
                      <th style={styles.th}>Dias</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedRequests
                      .filter(r => 
                        (viewingRecord.employeeId && r.employeeId === viewingRecord.employeeId) ||
                        (viewingRecord.emp?.nuit && r.emp?.nuit === viewingRecord.emp.nuit) ||
                        (viewingRecord.employeeNip && r.employeeNip === viewingRecord.employeeNip)
                      )
                      .map(hist => (
                        <tr key={hist.id} style={{ backgroundColor: hist.id === viewingRecord.id ? 'rgba(27, 54, 93, 0.05)' : 'transparent' }}>
                          <td style={styles.td}><strong>{hist.year || '2026'}</strong></td>
                          <td style={styles.td}>{hist.type || 'Férias Anuais'}</td>
                          <td style={styles.td}>{formatDate(hist.startDate)} ➔ {formatDate(hist.endDate)}</td>
                          <td style={styles.td}><strong>{hist.daysCount}</strong></td>
                          <td style={styles.td}>
                            <span style={getStatusBadgeStyle(hist.countdown.computedStatus)}>
                              {hist.countdown.computedStatus}
                            </span>
                          </td>
                          <td style={styles.td}>{hist.notes || hist.reason || 'Sem notas'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button 
                type="button" 
                onClick={() => {
                  const toEdit = viewingRecord;
                  setViewingRecord(null);
                  setEditingRecord(toEdit);
                  setIsNewModalOpen(true);
                }} 
                style={styles.btnSecondary}
              >
                ✏️ Editar Registo
              </button>
              <button type="button" onClick={() => setViewingRecord(null)} style={styles.btnPrimary}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {isNewModalOpen && (
        <VacationFormModal 
          isOpen={isNewModalOpen}
          initialData={editingRecord}
          employees={employees}
          orgData={orgData}
          onClose={() => { setIsNewModalOpen(false); setEditingRecord(null); }}
          onSave={async (formData) => {
            if (editingRecord) {
              await updateRequest(editingRecord.id, formData, 'Admin RH', 'Atualização via Gestão de Férias');
            } else {
              await addRequest(formData);
            }
            setIsNewModalOpen(false);
            setEditingRecord(null);
          }}
          modalProps={formModal}
        />
      )}

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={true}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
    </div>
  );
}

function VacationFormModal({ isOpen, initialData, employees, orgData, onClose, onSave, modalProps }) {
  const [employeeId, setEmployeeId] = useState(initialData?.employeeId || '');
  const [employeeName, setEmployeeName] = useState(initialData?.employeeName || '');
  const [employeeNip, setEmployeeNip] = useState(initialData?.employeeNip || '');
  const [year, setYear] = useState(initialData?.year || String(new Date().getFullYear()));
  const [type, setType] = useState(initialData?.type || 'Férias Anuais');
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [daysCount, setDaysCount] = useState(initialData?.daysCount || 30);
  const [status, setStatus] = useState(initialData?.status || 'Aprovada');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectEmployee = (id) => {
    setEmployeeId(id);
    const found = (employees || []).find(e => String(e.id) === String(id));
    if (found) {
      setEmployeeName(found.name);
      setEmployeeNip(found.nuit || found.nip || '');
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
        setDaysCount(diffDays);
        setErrorMsg('');
      } else if (e < s) {
        setErrorMsg('A data de término não pode ser anterior à data de início.');
      }
    }
  }, [startDate, endDate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeId && !employeeName) {
      setErrorMsg('Por favor selecione ou indique o funcionário.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMsg('Por favor preencha as datas de início e término.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg('A data de término deve ser posterior à data de início.');
      return;
    }

    onSave({
      employeeId,
      employeeName,
      employeeNip,
      year,
      type,
      startDate,
      endDate,
      daysCount: parseInt(daysCount, 10) || 30,
      status,
      notes,
      updatedAt: new Date().toISOString()
    });
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={modalProps.getOverlayProps(onClose).onClick}>
      <div 
        ref={modalProps.modalRef} 
        style={{ ...styles.modalContent, ...modalProps.modalStyle }}
        onClick={e => e.stopPropagation()}
      >
        <div 
          style={styles.modalHeader}
          onPointerDown={modalProps.isMaximized ? undefined : modalProps.onPointerDown}
          onDoubleClick={modalProps.handleHeaderDoubleClick}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🌴</span>
            <h3 style={styles.modalTitle}>
              {initialData ? 'Editar Marcação de Férias' : 'Novo Agendamento de Férias'}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" onClick={modalProps.toggleMaximize} style={styles.expandBtn}>
              {modalProps.isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
            </button>
            <button type="button" onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={styles.modalBody}>
            {errorMsg && <div style={styles.errorBanner}>⚠️ {errorMsg}</div>}

            <div style={styles.formGroupModal}>
              <label style={styles.filterLabel}>Funcionário SERNIC <span style={{ color: '#DC2626' }}>*</span></label>
              <select 
                value={employeeId} 
                onChange={e => handleSelectEmployee(e.target.value)}
                style={styles.select}
                required
              >
                <option value="">-- Seleccione o Funcionário Cadastrado --</option>
                {(employees || []).map(emp => (
                  <option key={emp.id} value={emp.id}>
                    [NUIT: {emp.nuit || emp.nip || 'N/A'}] {emp.name} ({emp.cargo || 'Funcionário'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={styles.formGroupModal}>
                <label style={styles.filterLabel}>Tipo de Férias / Licença <span style={{ color: '#DC2626' }}>*</span></label>
                <select value={type} onChange={e => setType(e.target.value)} style={styles.select}>
                  <option value="Férias Anuais">Férias Anuais Regulares (30 dias)</option>
                  <option value="Férias Acumuladas">Férias Acumuladas (60 dias)</option>
                  <option value="Licença de Parto">Licença de Maternidade / Parto</option>
                  <option value="Licença de Paternidade">Licença de Paternidade</option>
                  <option value="Licença de Casamento">Licença de Casamento</option>
                  <option value="Licença de Luto">Licença de Luto</option>
                  <option value="Licença para Estudos">Licença para Estudos / Formação</option>
                  <option value="Outra Licença">Outra Licença Justificada</option>
                </select>
              </div>

              <div style={styles.formGroupModal}>
                <label style={styles.filterLabel}>Ano de Referência <span style={{ color: '#DC2626' }}>*</span></label>
                <input 
                  type="number" 
                  value={year} 
                  onChange={e => setYear(e.target.value)} 
                  style={styles.input} 
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div style={styles.formGroupModal}>
                <label style={styles.filterLabel}>Data de Início <span style={{ color: '#DC2626' }}>*</span></label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  style={styles.input} 
                  required 
                />
              </div>

              <div style={styles.formGroupModal}>
                <label style={styles.filterLabel}>Data de Término <span style={{ color: '#DC2626' }}>*</span></label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  style={styles.input} 
                  required 
                />
              </div>

              <div style={styles.formGroupModal}>
                <label style={styles.filterLabel}>Total de Dias</label>
                <input 
                  type="number" 
                  value={daysCount} 
                  onChange={e => setDaysCount(e.target.value)} 
                  style={styles.input} 
                  min="1"
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
              <div style={styles.formGroupModal}>
                <label style={styles.filterLabel}>Regime / Estado Administrativo</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={styles.select}>
                  <option value="Aprovada">Vigente (Estado calculado automaticamente pelas datas)</option>
                  <option value="Cancelada">Cancelada Administrativamente</option>
                </select>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  ℹ️ O sistema calcula automaticamente se as férias estão "Agendadas", "Em curso" ou "Concluídas" com base no período inserido.
                </div>
              </div>

              <div style={styles.formGroupModal}>
                <label style={styles.filterLabel}>Notas e Observações</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Ex: Despacho de autorização nº 23/DRH/2026..." 
                  style={{ ...styles.input, minHeight: '60px' }} 
                />
              </div>
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>
              Cancelar
            </button>
            <button type="submit" style={styles.btnPrimary}>
              💾 Guardar Registo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const getStatusBadgeStyle = (status) => {
  const base = {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  };

  switch (status) {
    case 'Em curso':
      return { ...base, backgroundColor: 'rgba(5, 150, 105, 0.15)', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.3)' };
    case 'Agendadas':
      return { ...base, backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#2563EB', border: '1px solid rgba(37, 99, 235, 0.3)' };
    case 'Concluídas':
      return { ...base, backgroundColor: 'rgba(100, 116, 139, 0.15)', color: '#64748B', border: '1px solid rgba(100, 116, 139, 0.3)' };
    case 'Canceladas':
      return { ...base, backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#DC2626', border: '1px solid rgba(220, 38, 38, 0.3)' };
    default:
      return { ...base, backgroundColor: 'rgba(27, 54, 93, 0.1)', color: 'var(--color-primary)' };
  }
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%'
  },
  btnPrimary: {
    padding: '8px 16px',
    backgroundColor: 'var(--color-primary, #1B365D)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  btnSecondary: {
    padding: '8px 14px',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-primary, #1B365D)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px'
  },
  kpiCard: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '8px',
    padding: '14px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  kpiTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px'
  },
  kpiIcon: {
    fontSize: '16px'
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--color-primary, #1B365D)'
  },
  kpiDesc: {
    fontSize: '11px',
    color: 'var(--color-text-muted)'
  },
  filterContainer: {
    backgroundColor: 'var(--color-bg-card)',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  filterTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  filterHeaderTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-primary)'
  },
  btnClearFilters: {
    background: 'none',
    border: 'none',
    color: '#DC2626',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  filterGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'flex-end'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1 1 190px',
    minWidth: '180px'
  },
  formGroupModal: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '10px'
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted)'
  },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-main)',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-main)',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
    boxSizing: 'border-box'
  },
  tableCard: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    overflow: 'hidden'
  },
  tableHeaderBar: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    backgroundColor: 'var(--color-bg-base)'
  },
  tableHeaderRow: {
    backgroundColor: 'var(--color-bg-base)',
    borderBottom: '2px solid var(--color-border)'
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
    transition: 'background 0.15s'
  },
  td: {
    padding: '11px 14px',
    fontSize: '12px',
    color: 'var(--color-text-main)',
    verticalAlign: 'middle'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(27, 54, 93, 0.15)',
    color: 'var(--color-primary)',
    fontWeight: '800',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  badgeDays: {
    display: 'inline-block',
    padding: '3px 8px',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-main)'
  },
  alertEndingSoon: {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: '800',
    color: '#DC2626',
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    padding: '2px 6px',
    borderRadius: '4px',
    marginBottom: '3px'
  },
  progressBarBg: {
    width: '100%',
    maxWidth: '180px',
    height: '5px',
    backgroundColor: 'var(--color-border)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s'
  },
  paginationRow: {
    padding: '10px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--color-border)',
    flexWrap: 'wrap',
    gap: '10px'
  },
  pageBtn: {
    padding: '5px 10px',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'var(--color-text-main)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--color-border)',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: '12px 18px',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'move',
    userSelect: 'none'
  },
  modalTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-primary)',
    margin: 0
  },
  expandBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '3px 7px',
    fontSize: '11px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    padding: '0 4px'
  },
  modalBody: {
    padding: '16px 20px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  modalFooter: {
    padding: '12px 18px',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px'
  },
  liveCountdownCard: {
    backgroundColor: 'rgba(27, 54, 93, 0.05)',
    border: '2px solid var(--color-primary)',
    borderRadius: '8px',
    padding: '16px'
  },
  pulseAlertBadge: {
    backgroundColor: '#DC2626',
    color: '#fff',
    padding: '5px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '800'
  },
  timerBlocksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    marginTop: '14px'
  },
  timerBlock: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    padding: '10px',
    textAlign: 'center'
  },
  timerNumber: {
    fontSize: '24px',
    fontWeight: '900',
    color: 'var(--color-primary, #1B365D)'
  },
  timerLabel: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.5px'
  },
  progressBarBgBig: {
    width: '100%',
    height: '8px',
    backgroundColor: 'var(--color-border)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressBarFillBig: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s'
  },
  sectionHeader: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--color-primary)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '5px',
    marginTop: '4px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
    backgroundColor: 'var(--color-bg-base)',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  infoLabel: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    fontWeight: '600'
  },
  infoVal: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--color-text-main)'
  },
  errorBanner: {
    padding: '8px 12px',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    border: '1px solid #DC2626',
    borderRadius: '6px',
    color: '#DC2626',
    fontSize: '12px',
    fontWeight: '700',
    marginBottom: '8px'
  }
};
