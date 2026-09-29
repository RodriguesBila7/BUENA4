import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import useVacationData from '../../hooks/useVacationData';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useDisciplinaryData from '../../hooks/useDisciplinaryData';
import useAdminActsData from '../../hooks/useAdminActsData';
import { compressImage } from '../../utils/imageCompressor';
import { saveCloudPhoto } from '../../services/cloudSyncService';
import { SERNIC_LOGO_B64 } from '../../utils/sernic_logo_default';
import ConfirmModal from '../ConfirmModal';
import { formatDisplayDate } from '../../utils/vacationAlerts';

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

  // ESTADO DA PESQUISA E FILTRAGEM AVANÇADA DE FUNCIONÁRIOS
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDirectorate, setFilterDirectorate] = useState('ALL');
  const [filterCareer, setFilterCareer] = useState('ALL');

  // Filtragem ao vivo da lista de funcionários
  const filteredEmployeesList = useMemo(() => {
    return employees.filter(emp => {
      // Filtro de Direcção
      if (filterDirectorate !== 'ALL' && String(emp.directorateId) !== String(filterDirectorate)) {
        return false;
      }
      // Filtro de Carreira
      if (filterCareer !== 'ALL' && String(emp.careerId) !== String(filterCareer)) {
        return false;
      }
      // Filtro de Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = emp.name && emp.name.toLowerCase().includes(q);
        const mNip = emp.nip && String(emp.nip).toLowerCase().includes(q);
        const mNuit = emp.nuit && String(emp.nuit).toLowerCase().includes(q);
        const mBi = emp.idNumber && String(emp.idNumber).toLowerCase().includes(q);
        const mCargo = (emp.cargo || emp.category || '').toLowerCase().includes(q);
        if (!mName && !mNip && !mNuit && !mBi && !mCargo) return false;
      }
      return true;
    });
  }, [employees, filterDirectorate, filterCareer, searchQuery]);

  // Modal para solicitar férias
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
  const [vacationForm, setVacationForm] = useState({
    type: 'Férias Anuais',
    startDate: '',
    endDate: '',
    reason: '',
    notes: ''
  });

  // Modal para submeter justificação de falta
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
      directorateName: dir?.name || currentEmp.directorate || 'Direcção Geral SERNIC',
      departmentName: dept?.name || 'Departamento Geral',
      divisionName: div?.name || '-',
      sectionName: sec?.name || '-',
      careerName: career?.name || currentEmp.career || 'Carreira Policial de Investigação Criminal',
      categoryName: category?.name || currentEmp.category || currentEmp.cargo || 'Investigador de 2ª'
    };
  }, [currentEmp, orgData]);

  // CÁLCULO DE TEMPO DE SERVIÇO & RESERVA (REFORMA)
  const serviceStats = useMemo(() => {
    const admissionDateStr = currentEmp.admissionDate || currentEmp.createdAt || '2012-05-10';
    const birthDateStr = currentEmp.birthDate || '1984-06-15';

    const admDate = new Date(admissionDateStr);
    const birthDate = new Date(birthDateStr);
    const now = new Date();

    let age = now.getFullYear() - birthDate.getFullYear();
    const mDiff = now.getMonth() - birthDate.getMonth();
    if (mDiff < 0 || (mDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }

    let serviceYears = now.getFullYear() - admDate.getFullYear();
    let serviceMonths = now.getMonth() - admDate.getMonth();
    let serviceDays = now.getDate() - admDate.getDate();

    if (serviceDays < 0) {
      serviceMonths--;
      serviceDays += 30;
    }
    if (serviceMonths < 0) {
      serviceYears--;
      serviceMonths += 12;
    }

    const yearsForServiceRetirement = Math.max(0, 35 - serviceYears);
    const yearsForAgeRetirement = Math.max(0, 60 - age);
    const yearsToRetirement = Math.min(yearsForServiceRetirement, yearsForAgeRetirement);
    const retirementYear = now.getFullYear() + yearsToRetirement;
    const progressPercent = Math.min(100, Math.round((serviceYears / 35) * 100));

    return {
      admissionDateFormatted: formatDisplayDate(admissionDateStr),
      birthDateFormatted: formatDisplayDate(birthDateStr),
      age: Math.max(18, age),
      serviceYears: Math.max(0, serviceYears),
      serviceMonths: Math.max(0, serviceMonths),
      serviceDays: Math.max(0, serviceDays),
      yearsToRetirement: Math.max(0, yearsToRetirement),
      retirementYear,
      progressPercent
    };
  }, [currentEmp]);

  // CÁLCULO DE FÉRIAS DO AGENTE
  const myVacations = useMemo(() => {
    const filtered = requests.filter(r => 
      (currentEmp.id && r.employeeId === currentEmp.id) ||
      (currentEmp.nip && String(r.employeeNip) === String(currentEmp.nip)) ||
      (currentEmp.name && r.employeeName && r.employeeName.toLowerCase() === currentEmp.name.toLowerCase())
    );

    const entitledDays = 30;
    const currentYear = String(new Date().getFullYear());
    const usedDays = filtered
      .filter(r => (r.year === currentYear || !r.year) && ['Aprovada', 'Em gozo', 'Concluída'].includes(r.status))
      .reduce((sum, r) => sum + (Number(r.daysCount) || 0), 0);

    const balance = Math.max(0, entitledDays - usedDays);

    return { list: filtered, entitledDays, usedDays, balance };
  }, [requests, currentEmp]);

  // CÁLCULO DE EFETIVIDADE (FALTAS DO AGENTE)
  const myAbsences = useMemo(() => {
    const filtered = absenceRecords.filter(r => 
      (currentEmp.id && String(r.employeeId) === String(currentEmp.id)) ||
      (currentEmp.nip && String(r.employeeNip || r.nip) === String(currentEmp.nip)) ||
      (currentEmp.name && r.employeeName && r.employeeName.toLowerCase() === currentEmp.name.toLowerCase())
    );

    const justified = filtered.filter(r => r.type === 'Justificada' || r.status === 'Aprovada').length;
    const unjustified = filtered.filter(r => r.type === 'Injustificada' || r.status === 'Rejeitada').length;
    const pending = filtered.filter(r => r.status === 'Pendente').length;

    return { list: filtered, total: filtered.length, justified, unjustified, pending };
  }, [absenceRecords, currentEmp]);

  // PROCESSOS DISCIPLINARES DO AGENTE
  const myDisciplinary = useMemo(() => {
    return disciplinaryProcesses.filter(p => 
      (currentEmp.id && p.employeeId === currentEmp.id) ||
      (currentEmp.nip && String(p.nip) === String(currentEmp.nip)) ||
      (currentEmp.name && p.employeeName && p.employeeName.toLowerCase() === currentEmp.name.toLowerCase())
    );
  }, [disciplinaryProcesses, currentEmp]);

  // ATOS E NOMEAÇÕES DO AGENTE
  const myAdminActs = useMemo(() => {
    return adminActs.filter(a => 
      (currentEmp.id && a.employeeId === currentEmp.id) ||
      (currentEmp.nip && String(a.nip) === String(currentEmp.nip)) ||
      (currentEmp.name && a.employeeName && a.employeeName.toLowerCase() === currentEmp.name.toLowerCase())
    );
  }, [adminActs, currentEmp]);

  // ELEGIBILIDADE A PROMOÇÃO / PROGRESSÃO
  const careerEligibility = useMemo(() => {
    const yearsInRank = (serviceStats.serviceYears % 4) || 1;
    const yearsNeeded = 3;
    const isProgressionEligible = yearsInRank >= yearsNeeded;
    const monthsRemaining = Math.max(0, (yearsNeeded - yearsInRank) * 12);

    const academicLevel = (currentEmp.academic_level || '').toLowerCase();
    const hasHigherEducation = academicLevel.includes('licenciatura') || academicLevel.includes('mestrado') || academicLevel.includes('doutoramento');

    return {
      yearsInRank,
      isProgressionEligible,
      monthsRemaining,
      hasHigherEducation,
      academicLevel: currentEmp.academic_level || 'Médio Técnico'
    };
  }, [serviceStats, currentEmp]);

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
      reason: absenceForm.reason || 'Justificação apresentada pelo agente',
      justification: absenceForm.reason || '',
      attachmentName: absenceForm.attachmentName || 'Comprovativo_Submetido.pdf',
      submittedBy: currentEmp.name
    });

    setIsAbsenceModalOpen(false);
    setAbsenceForm({ type: 'Justificada', startDate: '', endDate: '', reason: '', attachmentName: '' });

    setConfirmModal({
      isOpen: true,
      title: 'Justificação Submetida',
      message: 'A sua justificação de ausência foi submetida com sucesso e aguarda despacho da Direcção.',
      hideCancel: true
    });
  };

  // Upload de Foto de Perfil com compressão
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const b64 = await compressImage(file, 320, 0.75);
      if (currentEmp.nip) saveCloudPhoto(currentEmp.nip, b64);
      if (currentEmp.name) saveCloudPhoto(currentEmp.name, b64);
      await updateEmployee(currentEmp.id, { photo: b64 });
    } catch (err) {
      console.warn('Erro ao atualizar foto:', err);
    }
  };

  return (
    <div style={styles.container}>
      {/* ──────────────────────────────────────────────────────────────
          CABEÇALHO INSTITUCIONAL OFICIAL DO SERNIC (MOÇAMBIQUE)
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
              ⬅️ Painel Geral
            </button>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────
          CARTÃO DE IDENTIFICAÇÃO E PERFIL DO AGENTE (DESPOLUÍDO & ELEGANTE)
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
          </div>
        </div>

        {/* RESUMO RÁPIDO: PASSAGEM À RESERVA (CLEAN CARD) */}
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
          BARRA DE NAVEGAÇÃO SEGMENTADA (PWA & DESKTOP TOUCH FRIENDLY)
         ────────────────────────────────────────────────────────────── */}
      <div style={styles.navBar}>
        <button 
          style={activePortalTab === 'overview' ? styles.navTabActive : styles.navTab} 
          onClick={() => setActivePortalTab('overview')}
        >
          👤 Ficha Cadastral
        </button>
        <button 
          style={activePortalTab === 'vacations' ? styles.navTabActive : styles.navTab} 
          onClick={() => setActivePortalTab('vacations')}
        >
          🌴 Minhas Férias ({myVacations.balance}d)
        </button>
        <button 
          style={activePortalTab === 'retirement' ? styles.navTabActive : styles.navTab} 
          onClick={() => setActivePortalTab('retirement')}
        >
          ⏳ Tempo de Serviço & Reserva
        </button>
        <button 
          style={activePortalTab === 'career' ? styles.navTabActive : styles.navTab} 
          onClick={() => setActivePortalTab('career')}
        >
          📈 Elegibilidade de Carreira
        </button>
        <button 
          style={activePortalTab === 'absences' ? styles.navTabActive : styles.navTab} 
          onClick={() => setActivePortalTab('absences')}
        >
          📅 Minha Efetividade & Faltas
        </button>
        <button 
          style={activePortalTab === 'disciplinary' ? styles.navTabActive : styles.navTab} 
          onClick={() => setActivePortalTab('disciplinary')}
        >
          ⚖️ Processos ({myDisciplinary.length})
        </button>
        <button 
          style={activePortalTab === 'acts' ? styles.navTabActive : styles.navTab} 
          onClick={() => setActivePortalTab('acts')}
        >
          📜 Atos & Nomeações ({myAdminActs.length})
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

        {/* ABA 2: MINHAS FÉRIAS */}
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

        {/* ABA 3: TEMPO DE SERVIÇO & RESERVA */}
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
                <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '16px' }}>
                  Faltam aproximadamente <strong>{serviceStats.yearsToRetirement} anos</strong> para a conclusão da carreira ativa.
                </div>

                <div>
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

        {/* ABA 5: MINHA EFETIVIDADE & FALTAS */}
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
      </div>

      {/* ──────────────────────────────────────────────────────────────
          MODAL INTERATIVO DE PESQUISA & FILTRAGEM DE AGENTES
         ────────────────────────────────────────────────────────────── */}
      {isSearchModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsSearchModalOpen(false)}>
          <div style={styles.searchModalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔍</span>
                <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--color-text-base)' }}>
                  Pesquisa e Seleção de Agente SERNIC
                </h3>
              </div>
              <button onClick={() => setIsSearchModalOpen(false)} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.searchModalBody}>
              {/* CAMPO DE PESQUISA */}
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <input 
                  type="text" 
                  placeholder="Pesquisar por Nome, NIP, NUIT, BI, cargo..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchFieldInput}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={styles.btnClearSearch}>✕</button>
                )}
              </div>

              {/* FILTROS POR DIRECÇÃO E CARREIRA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={styles.filterMiniLabel}>Filtrar por Direcção / Província:</label>
                  <select 
                    value={filterDirectorate} 
                    onChange={e => setFilterDirectorate(e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="ALL">Todas as Direcções</option>
                    {(orgData?.directorates || []).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.filterMiniLabel}>Filtrar por Carreira:</label>
                  <select 
                    value={filterCareer} 
                    onChange={e => setFilterCareer(e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="ALL">Todas as Carreiras</option>
                    {(orgData?.careers || []).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LISTA DE RESULTADOS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>
                  Encontrados: {filteredEmployeesList.length} agentes
                </span>
                {(searchQuery || filterDirectorate !== 'ALL' || filterCareer !== 'ALL') && (
                  <button 
                    onClick={() => { setSearchQuery(''); setFilterDirectorate('ALL'); setFilterCareer('ALL'); }}
                    style={styles.btnResetFilters}
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>

              <div style={styles.resultsList}>
                {filteredEmployeesList.length === 0 ? (
                  <div style={styles.noResultsBox}>
                    Nenhum funcionário encontrado com os critérios fornecidos.
                  </div>
                ) : (
                  filteredEmployeesList.map(emp => {
                    const isSelected = emp.id === currentEmp.id;
                    const dir = (orgData?.directorates || []).find(d => String(d.id) === String(emp.directorateId));

                    return (
                      <div 
                        key={emp.id} 
                        onClick={() => {
                          setSelectedEmpId(emp.id);
                          setIsSearchModalOpen(false);
                        }}
                        style={{
                          ...styles.resultCard,
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: isSelected ? 'rgba(27, 54, 93, 0.06)' : 'var(--color-bg-subtle)'
                        }}
                      >
                        <div style={styles.resAvatar}>
                          {emp.photo ? (
                            <img src={emp.photo} alt={emp.name} style={styles.resAvatarImg} />
                          ) : (
                            <div style={styles.resAvatarFallback}>
                              {emp.name?.charAt(0).toUpperCase() || 'A'}
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '14px', color: 'var(--color-text-base)' }}>{emp.name}</strong>
                            <span style={styles.nipTag}>NIP: {emp.nip || 'N/A'}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {dir?.name || 'Direcção Geral'} • {emp.category || emp.cargo || 'Investigador'}
                          </div>
                        </div>

                        {isSelected && (
                          <span style={styles.selectedPill}>✓ Atual</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SOLICITAÇÃO DE FÉRIAS */}
      {isVacationModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '17px' }}>🌴 Solicitar Férias Regulamentares</h3>
              <button onClick={() => setIsVacationModalOpen(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleSubmitVacation} style={styles.modalBody}>
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
                <button type="button" onClick={() => setIsVacationModalOpen(false)} style={styles.btnModalCancel}>
                  Cancelar
                </button>
                <button type="submit" style={styles.btnActionPrimary}>
                  Submeter Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE JUSTIFICAÇÃO DE FALTA */}
      {isAbsenceModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '17px' }}>✍️ Submeter Justificação de Falta</h3>
              <button onClick={() => setIsAbsenceModalOpen(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleSubmitAbsence} style={styles.modalBody}>
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
                <button type="button" onClick={() => setIsAbsenceModalOpen(false)} style={styles.btnModalCancel}>
                  Cancelar
                </button>
                <button type="submit" style={styles.btnActionPrimary}>
                  Submeter Justificação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    backgroundColor: 'var(--color-bg-elevated)',
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
  instRepub: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#d97706',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    marginBottom: '2px'
  },
  instTitle: {
    fontSize: '19px',
    fontWeight: '800',
    color: 'var(--color-primary, #1B365D)',
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
    backgroundColor: 'var(--color-bg-elevated)',
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
  tagsRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tag: {
    padding: '3px 9px',
    borderRadius: '6px',
    backgroundColor: 'var(--color-bg-subtle)',
    border: '1px solid var(--color-border)',
    fontSize: '12px',
    color: 'var(--color-text-base)'
  },
  unitRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-muted)', flexWrap: 'wrap' },
  statReserveCard: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '16px 20px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    minWidth: '230px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  reserveTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  reserveLabel: { fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  reserveIcon: { fontSize: '16px' },
  reserveYear: { fontSize: '24px', fontWeight: '800', color: '#059669' },
  reserveHint: { fontSize: '12px', color: 'var(--color-text-muted)' },
  progressTrack: { height: '6px', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' },
  progressTrackLarge: { height: '10px', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '5px', marginTop: '8px', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: '3px' },
  navBar: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    backgroundColor: 'var(--color-bg-elevated)',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)'
  },
  navTab: {
    padding: '8px 14px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s'
  },
  navTabActive: {
    padding: '8px 14px',
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  contentBody: {
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
  },
  sectionWrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  secTitle: { fontSize: '17px', fontWeight: '700', color: 'var(--color-text-base)', margin: 0 },
  secDesc: { fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 },
  headerBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  cleanCard: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '18px 20px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)'
  },
  cleanCardTitle: { fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)', margin: '0 0 12px 0' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.03)', fontSize: '13px' },
  lbl: { color: 'var(--color-text-muted)' },
  hugeStat: { fontSize: '32px', fontWeight: '800', color: 'var(--color-primary)', margin: '8px 0 2px 0' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' },
  kpiCard: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '16px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  kpiTitle: { fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600' },
  kpiNum: { fontSize: '24px', fontWeight: '800', color: 'var(--color-text-base)' },
  kpiSub: { fontSize: '11px', color: 'var(--color-text-muted)' },
  btnActionPrimary: {
    padding: '9px 16px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer'
  },
  btnActionSecondary: {
    padding: '9px 16px',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer'
  },
  emptyState: {
    padding: '36px',
    textAlign: 'center',
    backgroundColor: 'var(--color-bg-subtle)',
    borderRadius: '10px',
    border: '1px dashed var(--color-border)',
    color: 'var(--color-text-muted)',
    fontSize: '13px'
  },
  cleanStateBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #059669',
    padding: '20px',
    borderRadius: '10px'
  },
  alertSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #059669',
    padding: '12px 14px',
    borderRadius: '8px',
    color: '#059669',
    fontSize: '13px'
  },
  alertWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#fffbeb',
    border: '1px solid #d97706',
    padding: '12px 14px',
    borderRadius: '8px',
    color: '#d97706',
    fontSize: '13px'
  },
  alertInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'var(--color-bg-subtle)',
    border: '1px solid var(--color-border)',
    padding: '12px 14px',
    borderRadius: '8px',
    color: 'var(--color-text-base)',
    fontSize: '13px'
  },
  subSecTitle: { margin: '20px 0 10px 0', fontSize: '15px', color: 'var(--color-text-base)', fontWeight: '700' },
  th: { padding: '12px 14px', textAlign: 'left', fontWeight: '600' },
  td: { padding: '12px 14px', verticalAlign: 'middle', borderBottom: '1px solid var(--color-border)' },
  statusPill: (status) => {
    let bg = '#eff6ff', color = '#1b365d';
    if (status === 'Aprovada' || status === 'Concluída') { bg = '#ecfdf5'; color = '#059669'; }
    if (status === 'Em gozo' || status === 'Em análise' || status === 'Pendente') { bg = '#fffbeb'; color = '#d97706'; }
    if (status === 'Rejeitada' || status === 'Cancelada' || status === 'Injustificada') { bg = '#fef2f2'; color = '#dc2626'; }
    return {
      padding: '3px 9px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '700',
      backgroundColor: bg,
      color: color,
      display: 'inline-block'
    };
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  searchModalBox: {
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '680px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--color-border)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
    overflow: 'hidden'
  },
  modalBox: {
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '520px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--color-text-muted)' },
  searchModalBody: { padding: '20px', overflowY: 'auto' },
  searchFieldInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid var(--color-primary)',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-base)',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  btnClearSearch: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    fontSize: '14px'
  },
  filterMiniLabel: { display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '4px' },
  filterSelect: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-base)',
    fontSize: '12px'
  },
  btnResetFilters: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  resultsList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' },
  resultCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  resAvatar: { width: '42px', height: '42px', flexShrink: 0 },
  resAvatarImg: { width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' },
  resAvatarFallback: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800'
  },
  nipTag: {
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-base)'
  },
  selectedPill: {
    padding: '3px 8px',
    borderRadius: '10px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: '11px',
    fontWeight: '800'
  },
  noResultsBox: {
    padding: '30px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '13px'
  },
  modalBody: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  formLbl: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' },
  fieldInput: {
    padding: '9px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-base)',
    fontSize: '13px'
  },
  fieldTextarea: {
    padding: '9px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-base)',
    fontSize: '13px',
    fontFamily: 'inherit'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '10px',
    borderTop: '1px solid var(--color-border)'
  },
  btnModalCancel: {
    padding: '8px 14px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)'
  }
};
