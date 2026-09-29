import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import useVacationData from '../../hooks/useVacationData';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useDisciplinaryData from '../../hooks/useDisciplinaryData';
import useAdminActsData from '../../hooks/useAdminActsData';
import { compressImage } from '../../utils/imageCompressor';
import { saveCloudPhoto, removeCloudPhoto } from '../../services/cloudSyncService';
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
    // Fallback: primeiro funcionário da lista para teste/demonstração
    return employees[0];
  }, [user, employees]);

  const [selectedEmpId, setSelectedEmpId] = useState(matchedEmployee?.id || '');
  const currentEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || matchedEmployee || employees[0] || {};
  }, [employees, selectedEmpId, matchedEmployee]);

  const [activePortalTab, setActivePortalTab] = useState('overview');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '' });

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

  // Carregar dados de estrutura orgânica do funcionário
  const empOrgInfo = useMemo(() => {
    if (!currentEmp) return {};
    const dir = (orgData?.directorates || []).find(d => d.id === currentEmp.directorateId);
    const dept = (orgData?.departments || []).find(d => d.id === currentEmp.departmentId);
    const div = (orgData?.divisions || []).find(d => d.id === currentEmp.divisionId);
    const sec = (orgData?.sections || []).find(d => d.id === currentEmp.sectionId);
    const career = (orgData?.careers || []).find(c => c.id === currentEmp.careerId);
    const category = (orgData?.categories || []).find(c => c.id === currentEmp.categoryId);

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

    // Idade Atual
    let age = now.getFullYear() - birthDate.getFullYear();
    const mDiff = now.getMonth() - birthDate.getMonth();
    if (mDiff < 0 || (mDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }

    // Tempo de Serviço
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

    // Regra da Reserva: 35 anos de serviço ou 60 anos de idade
    const yearsForServiceRetirement = Math.max(0, 35 - serviceYears);
    const yearsForAgeRetirement = Math.max(0, 60 - age);

    // O que ocorrer primeiro
    const yearsToRetirement = Math.min(yearsForServiceRetirement, yearsForAgeRetirement);
    const retirementYear = now.getFullYear() + yearsToRetirement;
    const progressPercent = Math.min(100, Math.round((serviceYears / 35) * 100));

    return {
      admissionDateFormatted: formatDisplayDate(admissionDateStr),
      birthDateFormatted: formatDisplayDate(birthDateStr),
      age,
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

    return {
      list: filtered,
      entitledDays,
      usedDays,
      balance
    };
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

    return {
      list: filtered,
      total: filtered.length,
      justified,
      unjustified,
      pending
    };
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
    // Interstício mínimo de 3 anos para progressão na carreira
    const yearsInRank = serviceStats.serviceYears % 4 || 1;
    const yearsNeeded = 3;
    const isProgressionEligible = yearsInRank >= yearsNeeded;
    const monthsRemaining = Math.max(0, (yearsNeeded - yearsInRank) * 12);

    // Mudança de carreira baseada no nível académico
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

  // Upload de Foto de Perfil
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const b64 = await compressImage(file, 320, 0.75);
      if (currentEmp.nip) {
        saveCloudPhoto(currentEmp.nip, b64);
      }
      if (currentEmp.name) {
        saveCloudPhoto(currentEmp.name, b64);
      }
      await updateEmployee(currentEmp.id, { photo: b64 });
    } catch (err) {
      console.warn('Erro ao atualizar foto:', err);
    }
  };

  return (
    <div style={styles.container}>
      {/* BARRA SUPERIOR DO PORTAL */}
      <div style={styles.topNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.policeBadge}>🛡️</div>
          <div>
            <h2 style={styles.portalTitle}>Portal do Agente & Funcionário SERNIC</h2>
            <p style={styles.portalSubtitle}>Autoatendimento de Recursos Humanos, Férias, Carreira e Processos</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* SELETOR DE FUNCIONÁRIO (Para Administradores e Teste) */}
          {employees.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>
                Visualizar como:
              </label>
              <select 
                value={currentEmp.id} 
                onChange={(e) => setSelectedEmpId(e.target.value)} 
                style={styles.empSelect}
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} (NIP: {emp.nip || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {onBackToAdmin && (
            <button onClick={onBackToAdmin} style={styles.btnBackAdmin}>
              ⬅️ Painel Geral de Gestão
            </button>
          )}
        </div>
      </div>

      {/* CARTÃO PRINCIPAL DE IDENTIFICAÇÃO DO AGENTE */}
      <div style={styles.profileCard}>
        <div style={styles.profileLeft}>
          <div style={styles.avatarContainer}>
            {currentEmp.photo ? (
              <img src={currentEmp.photo} alt={currentEmp.name} style={styles.avatarImg} />
            ) : (
              <div style={styles.avatarFallback}>
                {currentEmp.name?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            <label style={styles.photoUploadLabel} title="Alterar Foto de Perfil">
              📷
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={styles.profileDetails}>
            <div style={styles.empHeaderRow}>
              <h3 style={styles.empName}>{currentEmp.name}</h3>
              <span style={styles.activeTag}>● {currentEmp.status || 'Ativo'}</span>
            </div>
            <div style={styles.empBadgesRow}>
              <span style={styles.infoBadge}><strong>NIP:</strong> {currentEmp.nip || 'N/A'}</span>
              <span style={styles.infoBadge}><strong>NUIT:</strong> {currentEmp.nuit || 'N/A'}</span>
              <span style={styles.infoBadge}><strong>BI:</strong> {currentEmp.idNumber || 'N/A'}</span>
              <span style={styles.infoBadge}><strong>Contacto:</strong> {currentEmp.phone || '+258 N/D'}</span>
            </div>
            <div style={styles.empSubInfo}>
              <span>🏢 {empOrgInfo.directorateName}</span> • 
              <span> 🏬 {empOrgInfo.departmentName}</span> • 
              <span> 🎖️ {empOrgInfo.categoryName}</span>
            </div>
          </div>
        </div>

        {/* RESUMO RÁPIDO DO TEMPO PARA RESERVA */}
        <div style={styles.retirementQuickCard}>
          <div style={styles.quickCardLabel}>Passagem à Reserva</div>
          <div style={styles.quickCardVal}>{serviceStats.retirementYear}</div>
          <div style={styles.quickCardSub}>Faltam aprox. {serviceStats.yearsToRetirement} anos</div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${serviceStats.progressPercent}%` }}></div>
          </div>
        </div>
      </div>

      {/* ABAS DO PORTAL */}
      <div style={styles.tabsBar}>
        <button 
          style={activePortalTab === 'overview' ? styles.tabBtnActive : styles.tabBtn} 
          onClick={() => setActivePortalTab('overview')}
        >
          👤 Ficha Cadastral
        </button>
        <button 
          style={activePortalTab === 'vacations' ? styles.tabBtnActive : styles.tabBtn} 
          onClick={() => setActivePortalTab('vacations')}
        >
          🌴 Minhas Férias ({myVacations.balance}d saldo)
        </button>
        <button 
          style={activePortalTab === 'retirement' ? styles.tabBtnActive : styles.tabBtn} 
          onClick={() => setActivePortalTab('retirement')}
        >
          ⏳ Tempo de Serviço & Reserva
        </button>
        <button 
          style={activePortalTab === 'career' ? styles.tabBtnActive : styles.tabBtn} 
          onClick={() => setActivePortalTab('career')}
        >
          📈 Elegibilidade de Carreira
        </button>
        <button 
          style={activePortalTab === 'absences' ? styles.tabBtnActive : styles.tabBtn} 
          onClick={() => setActivePortalTab('absences')}
        >
          📅 Minha Efetividade & Faltas
        </button>
        <button 
          style={activePortalTab === 'disciplinary' ? styles.tabBtnActive : styles.tabBtn} 
          onClick={() => setActivePortalTab('disciplinary')}
        >
          ⚖️ Processos Disciplinares ({myDisciplinary.length})
        </button>
        <button 
          style={activePortalTab === 'acts' ? styles.tabBtnActive : styles.tabBtn} 
          onClick={() => setActivePortalTab('acts')}
        >
          📜 Atos & Nomeações ({myAdminActs.length})
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div style={styles.tabContent}>
        {/* ABA 1: FICHA CADASTRAL */}
        {activePortalTab === 'overview' && (
          <div style={styles.tabSection}>
            <h4 style={styles.sectionTitle}>📄 Dados Pessoais e Cadastrais Oficiais</h4>
            <div style={styles.grid2Col}>
              <div style={styles.cardItem}>
                <h5 style={styles.cardItemTitle}>Informações Pessoais</h5>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Nome Completo:</span> <strong>{currentEmp.name}</strong></div>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Data de Nascimento:</span> <strong>{serviceStats.birthDateFormatted} ({serviceStats.age} anos)</strong></div>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Género:</span> <strong>{currentEmp.gender || 'N/A'}</strong></div>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Estado Civil:</span> <strong>{currentEmp.marital_status || 'Solteiro(a)'}</strong></div>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Grau Académico:</span> <strong>{currentEmp.academic_level || 'Não especificado'}</strong></div>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Especialidade:</span> <strong>{currentEmp.specialty || 'Geral'}</strong></div>
              </div>

              <div style={styles.cardItem}>
                <h5 style={styles.cardItemTitle}>Dados Funcionais & Posicionamento</h5>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Carreira:</span> <strong>{empOrgInfo.careerName}</strong></div>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Categoria / Patente:</span> <strong>{empOrgInfo.categoryName}</strong></div>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Direcção:</span> <strong>{empOrgInfo.directorateName}</strong></div>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Departamento:</span> <strong>{empOrgInfo.departmentName}</strong></div>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Repartição / Secção:</span> <strong>{empOrgInfo.divisionName} / {empOrgInfo.sectionName}</strong></div>
                <div style={styles.rowItem}><span style={styles.rowLabel}>Data de Entrada no Estado:</span> <strong>{serviceStats.admissionDateFormatted}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: MINHAS FÉRIAS */}
        {activePortalTab === 'vacations' && (
          <div style={styles.tabSection}>
            <div style={styles.sectionHeaderRow}>
              <div>
                <h4 style={styles.sectionTitle}>🌴 Gestão Pessoal de Férias e Licenças</h4>
                <p style={styles.sectionDesc}>Consulte o seu saldo disponível e submeta pedidos de férias diretamente ao RH.</p>
              </div>
              <button onClick={() => setIsVacationModalOpen(true)} style={styles.btnPrimaryAction}>
                ➕ Solicitar Férias
              </button>
            </div>

            {/* CARDS DE SALDO DE FÉRIAS */}
            <div style={styles.kpiRow}>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Direito Anual</span>
                <span style={styles.kpiNumber}>{myVacations.entitledDays} dias</span>
                <span style={styles.kpiHint}>Ano {new Date().getFullYear()}</span>
              </div>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Dias Gozados</span>
                <span style={{ ...styles.kpiNumber, color: '#d97706' }}>{myVacations.usedDays} dias</span>
                <span style={styles.kpiHint}>Aprovados ou em curso</span>
              </div>
              <div style={{ ...styles.kpiCard, borderLeft: '4px solid #059669' }}>
                <span style={styles.kpiLabel}>Saldo Disponível</span>
                <span style={{ ...styles.kpiNumber, color: '#059669' }}>{myVacations.balance} dias</span>
                <span style={styles.kpiHint}>Disponíveis para gozo</span>
              </div>
            </div>

            {/* TABELA DE PEDIDOS DE FÉRIAS DO AGENTE */}
            <h5 style={{ margin: '20px 0 10px 0', fontSize: '15px', color: 'var(--color-text-base)' }}>Histórico de Pedidos de Férias</h5>
            {myVacations.list.length === 0 ? (
              <div style={styles.emptyBox}>Não existem pedidos de férias registados para este agente.</div>
            ) : (
              <table className="premium-table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Período</th>
                    <th style={styles.th}>Duração</th>
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
            )}
          </div>
        )}

        {/* ABA 3: TEMPO DE SERVIÇO & RESERVA */}
        {activePortalTab === 'retirement' && (
          <div style={styles.tabSection}>
            <h4 style={styles.sectionTitle}>⏳ Contagem de Tempo de Serviço e Passagem à Reserva</h4>
            <p style={styles.sectionDesc}>
              Cálculo regulamentar de acordo com a Lei do Estatuto Geral dos Funcionários e Agentes do Estado (EGFAE) e Regulamentos do SERNIC.
            </p>

            <div style={styles.grid2Col}>
              <div style={styles.cardItem}>
                <h5 style={styles.cardItemTitle}>Tempo Cumprido no Estado</h5>
                <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-primary)', margin: '10px 0' }}>
                  {serviceStats.serviceYears} Anos
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                  e {serviceStats.serviceMonths} meses ({serviceStats.serviceDays} dias)
                </div>
                <div style={{ marginTop: '16px', fontSize: '13px', lineHeight: '1.6' }}>
                  <div><strong>Data de Admissão:</strong> {serviceStats.admissionDateFormatted}</div>
                  <div><strong>Idade Atual do Agente:</strong> {serviceStats.age} anos</div>
                </div>
              </div>

              <div style={{ ...styles.cardItem, borderLeft: '4px solid var(--color-primary)' }}>
                <h5 style={styles.cardItemTitle}>Previsão de Passagem à Reserva / Reforma</h5>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#059669', margin: '10px 0' }}>
                  Ano {serviceStats.retirementYear}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                  Faltam aproximadamente <strong>{serviceStats.yearsToRetirement} anos</strong> de atividade
                </div>

                <div style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                    <span>Progresso de Carreira</span>
                    <span>{serviceStats.progressPercent}% Cumprido</span>
                  </div>
                  <div style={styles.progressBarLarge}>
                    <div style={{ ...styles.progressFill, width: `${serviceStats.progressPercent}%`, backgroundColor: '#059669' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: ELEGIBILIDADE DE CARREIRA */}
        {activePortalTab === 'career' && (
          <div style={styles.tabSection}>
            <h4 style={styles.sectionTitle}>📈 Radar de Elegibilidade a Promoção e Progressão</h4>
            <p style={styles.sectionDesc}>Verificação dos requisitos legais de tempo no escalão (interstício) e habilitações.</p>

            <div style={styles.grid2Col}>
              <div style={styles.cardItem}>
                <h5 style={styles.cardItemTitle}>Progressão no Escalão / Classe</h5>
                <div style={{ margin: '14px 0' }}>
                  {careerEligibility.isProgressionEligible ? (
                    <div style={styles.eligibleBox}>
                      <span style={{ fontSize: '20px' }}>✅</span>
                      <div>
                        <strong>Elegível para Progressão no Próximo Ciclo</strong>
                        <div style={{ fontSize: '12px', color: '#059669' }}>Cumpriu o interstício regulamentar de 3 anos no escalão.</div>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.pendingBox}>
                      <span style={{ fontSize: '20px' }}>⏳</span>
                      <div>
                        <strong>Interstício em Curso</strong>
                        <div style={{ fontSize: '12px', color: '#d97706' }}>
                          Faltam aproximadamente {careerEligibility.monthsRemaining} meses para completar os 3 anos no posto.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <div><strong>Tempo Estimado no Escalão:</strong> {careerEligibility.yearsInRank} anos</div>
                  <div><strong>Avaliação Média:</strong> Bom / Muito Bom</div>
                </div>
              </div>

              <div style={styles.cardItem}>
                <h5 style={styles.cardItemTitle}>Mudança de Carreira por Nível Académico</h5>
                <div style={{ margin: '14px 0' }}>
                  {careerEligibility.hasHigherEducation ? (
                    <div style={styles.eligibleBox}>
                      <span style={{ fontSize: '20px' }}>🎓</span>
                      <div>
                        <strong>Qualificação Superior Registada</strong>
                        <div style={{ fontSize: '12px', color: '#059669' }}>
                          Nível {careerEligibility.academicLevel} permite solicitação de ingresso na carreira técnica superior.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ ...styles.pendingBox, borderColor: '#d1d5db', backgroundColor: 'var(--color-bg-subtle)' }}>
                      <span style={{ fontSize: '20px' }}>📚</span>
                      <div>
                        <strong>Nível Académico Atual: {careerEligibility.academicLevel}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
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
          <div style={styles.tabSection}>
            <div style={styles.sectionHeaderRow}>
              <div>
                <h4 style={styles.sectionTitle}>📅 Registo de Efetividade e Ausências</h4>
                <p style={styles.sectionDesc}>Consulte o extrato das suas presenças e submeta atestados médicos ou justificações.</p>
              </div>
              <button onClick={() => setIsAbsenceModalOpen(true)} style={styles.btnSecondaryAction}>
                ✍️ Submeter Justificação
              </button>
            </div>

            <div style={styles.kpiRow}>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Faltas Justificadas</span>
                <span style={{ ...styles.kpiNumber, color: '#059669' }}>{myAbsences.justified}</span>
                <span style={styles.kpiHint}>Aprovadas pela Direcção</span>
              </div>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Faltas Injustificadas</span>
                <span style={{ ...styles.kpiNumber, color: '#dc2626' }}>{myAbsences.unjustified}</span>
                <span style={styles.kpiHint}>Sujeitas a desconto salarial</span>
              </div>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Aguardam Despacho</span>
                <span style={{ ...styles.kpiNumber, color: '#d97706' }}>{myAbsences.pending}</span>
                <span style={styles.kpiHint}>Em apreciação</span>
              </div>
            </div>

            <h5 style={{ margin: '20px 0 10px 0', fontSize: '15px', color: 'var(--color-text-base)' }}>Lista de Faltas Registadas</h5>
            {myAbsences.list.length === 0 ? (
              <div style={styles.emptyBox}>✅ Excelente assiduidade! Sem faltas registadas no sistema.</div>
            ) : (
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
            )}
          </div>
        )}

        {/* ABA 6: PROCESSOS DISCIPLINARES */}
        {activePortalTab === 'disciplinary' && (
          <div style={styles.tabSection}>
            <h4 style={styles.sectionTitle}>⚖️ Trâmites de Processos Disciplinares</h4>
            <p style={styles.sectionDesc}>Garantia de transparência e consulta dos prazos legais de contraditório e defesa.</p>

            {myDisciplinary.length === 0 ? (
              <div style={styles.cleanRecordBox}>
                <span style={{ fontSize: '32px' }}>🛡️</span>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#059669' }}>Situação Disciplinar Limpa</h4>
                  <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    Não existe nenhum processo disciplinar instaurado contra o seu cadastro no SERNIC.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {myDisciplinary.map(proc => (
                  <div key={proc.id} style={styles.procCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px' }}>Processo nº {proc.processNumber || proc.id}</span>
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
          <div style={styles.tabSection}>
            <h4 style={styles.sectionTitle}>📜 Atos Administrativos, Nomeações e Cessações</h4>
            <p style={styles.sectionDesc}>Histórico de despachos ministeriais e da direcção nacional vinculados à sua carreira.</p>

            {myAdminActs.length === 0 ? (
              <div style={styles.emptyBox}>Nenhum ato administrativo formal emitido no sistema para este agente.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myAdminActs.map(act => (
                  <div key={act.id} style={styles.cardItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{act.actType || act.type || 'Despacho Administrativo'}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                        {formatDisplayDate(act.date || act.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--color-text-base)' }}>
                      {act.description || act.notes || 'Despacho de nomeação/provimento de funções no SERNIC.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
                <label style={styles.label}>Tipo de Férias / Licença:</label>
                <select 
                  value={vacationForm.type} 
                  onChange={e => setVacationForm({ ...vacationForm, type: e.target.value })}
                  style={styles.input}
                >
                  <option value="Férias Anuais">Férias Anuais (Regulamentares)</option>
                  <option value="Licença de Casamento">Licença de Casamento (15 dias)</option>
                  <option value="Licença de Maternidade/Paternidade">Licença de Maternidade / Paternidade</option>
                  <option value="Licença de Luto (Nojo)">Licença de Luto (Nojo)</option>
                </select>
              </div>

              <div style={styles.grid2Col}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data de Início:</label>
                  <input 
                    type="date" 
                    value={vacationForm.startDate} 
                    onChange={e => setVacationForm({ ...vacationForm, startDate: e.target.value })} 
                    style={styles.input} 
                    required 
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data de Término:</label>
                  <input 
                    type="date" 
                    value={vacationForm.endDate} 
                    onChange={e => setVacationForm({ ...vacationForm, endDate: e.target.value })} 
                    style={styles.input} 
                    required 
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Observações / Justificação:</label>
                <textarea 
                  rows={3} 
                  value={vacationForm.reason} 
                  onChange={e => setVacationForm({ ...vacationForm, reason: e.target.value })}
                  placeholder="Informações adicionais para a chefia imediata..."
                  style={styles.textarea}
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setIsVacationModalOpen(false)} style={styles.btnCancel}>
                  Cancelar
                </button>
                <button type="submit" style={styles.btnConfirm}>
                  Submeter Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SUBMISSÃO DE JUSTIFICAÇÃO DE FALTA */}
      {isAbsenceModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '17px' }}>✍️ Submeter Justificação de Falta</h3>
              <button onClick={() => setIsAbsenceModalOpen(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleSubmitAbsence} style={styles.modalBody}>
              <div style={styles.grid2Col}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data de Início:</label>
                  <input 
                    type="date" 
                    value={absenceForm.startDate} 
                    onChange={e => setAbsenceForm({ ...absenceForm, startDate: e.target.value })} 
                    style={styles.input} 
                    required 
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data de Fim (Opcional):</label>
                  <input 
                    type="date" 
                    value={absenceForm.endDate} 
                    onChange={e => setAbsenceForm({ ...absenceForm, endDate: e.target.value })} 
                    style={styles.input} 
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Motivo Legal Alegado:</label>
                <textarea 
                  rows={3} 
                  value={absenceForm.reason} 
                  onChange={e => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                  placeholder="Ex: Doença súbita com atestado médico emitido pelo Hospital Central..."
                  style={styles.textarea}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Nome do Comprovativo / Atestado (PDF/Foto):</label>
                <input 
                  type="text" 
                  value={absenceForm.attachmentName} 
                  onChange={e => setAbsenceForm({ ...absenceForm, attachmentName: e.target.value })} 
                  placeholder="Ex: Atestado_Medico_27Setembro.pdf"
                  style={styles.input} 
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setIsAbsenceModalOpen(false)} style={styles.btnCancel}>
                  Cancelar
                </button>
                <button type="submit" style={styles.btnConfirm}>
                  Submeter Justificação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
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
  container: { display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '1400px', margin: '0 auto' },
  topNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    backgroundColor: 'var(--color-bg-elevated)',
    padding: '16px 20px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)'
  },
  policeBadge: {
    fontSize: '28px',
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff'
  },
  portalTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--color-text-base)', margin: '0 0 2px 0' },
  portalSubtitle: { fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 },
  empSelect: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-base)',
    fontSize: '13px'
  },
  btnBackAdmin: {
    padding: '7px 12px',
    backgroundColor: 'transparent',
    color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  profileCard: {
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: '10px',
    padding: '20px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  profileLeft: { display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' },
  avatarContainer: { position: 'relative', width: '84px', height: '84px' },
  avatarImg: { width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)' },
  avatarFallback: {
    width: '84px', height: '84px', borderRadius: '50%',
    backgroundColor: 'var(--color-primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '32px', fontWeight: 'bold'
  },
  photoUploadLabel: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: 'var(--color-primary)', color: '#fff',
    width: '28px', height: '28px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: '14px', border: '2px solid #fff'
  },
  profileDetails: { display: 'flex', flexDirection: 'column', gap: '6px' },
  empHeaderRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  empName: { fontSize: '20px', fontWeight: '800', color: 'var(--color-text-base)', margin: 0 },
  activeTag: { fontSize: '12px', color: '#059669', fontWeight: '700' },
  empBadgesRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  infoBadge: {
    padding: '3px 8px', borderRadius: '4px',
    backgroundColor: 'var(--color-bg-subtle)',
    border: '1px solid var(--color-border)',
    fontSize: '11px', color: 'var(--color-text-base)'
  },
  empSubInfo: { fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' },
  retirementQuickCard: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '14px 20px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  quickCardLabel: { fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '700' },
  quickCardVal: { fontSize: '22px', fontWeight: '800', color: '#059669' },
  quickCardSub: { fontSize: '11px', color: 'var(--color-text-muted)' },
  progressBar: { height: '6px', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' },
  progressBarLarge: { height: '10px', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '5px', marginTop: '8px', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: '3px' },
  tabsBar: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    backgroundColor: 'var(--color-bg-elevated)',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)'
  },
  tabBtn: {
    padding: '8px 14px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  tabBtnActive: {
    padding: '8px 14px',
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  tabContent: {
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: '10px',
    padding: '24px',
    border: '1px solid var(--color-border)'
  },
  tabSection: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionTitle: { fontSize: '17px', fontWeight: '700', color: 'var(--color-text-base)', margin: 0 },
  sectionDesc: { fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 },
  sectionHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
  grid2Col: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' },
  cardItem: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)'
  },
  cardItemTitle: { fontSize: '14px', fontWeight: '700', color: 'var(--color-primary)', margin: '0 0 12px 0' },
  rowItem: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: '13px' },
  rowLabel: { color: 'var(--color-text-muted)' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' },
  kpiCard: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  kpiLabel: { fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600' },
  kpiNumber: { fontSize: '24px', fontWeight: '800', color: 'var(--color-text-base)' },
  kpiHint: { fontSize: '11px', color: 'var(--color-text-muted)' },
  btnPrimaryAction: {
    padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer'
  },
  btnSecondaryAction: {
    padding: '8px 16px', backgroundColor: '#059669', color: '#fff',
    border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer'
  },
  emptyBox: {
    padding: '30px', textAlign: 'center', backgroundColor: 'var(--color-bg-subtle)',
    borderRadius: '8px', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '13px'
  },
  eligibleBox: {
    display: 'flex', alignItems: 'center', gap: '12px',
    backgroundColor: '#ecfdf5', border: '1px solid #059669',
    padding: '12px 14px', borderRadius: '8px', color: '#059669', fontSize: '13px'
  },
  pendingBox: {
    display: 'flex', alignItems: 'center', gap: '12px',
    backgroundColor: '#fffbeb', border: '1px solid #d97706',
    padding: '12px 14px', borderRadius: '8px', color: '#d97706', fontSize: '13px'
  },
  cleanRecordBox: {
    display: 'flex', alignItems: 'center', gap: '14px',
    backgroundColor: '#ecfdf5', border: '1px solid #059669',
    padding: '20px', borderRadius: '8px'
  },
  procCard: {
    backgroundColor: 'var(--color-bg-subtle)',
    padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)'
  },
  statusPill: (status) => {
    let bg = '#eff6ff', color = '#1b365d';
    if (status === 'Aprovada' || status === 'Concluída') { bg = '#ecfdf5'; color = '#059669'; }
    if (status === 'Em gozo' || status === 'Em análise' || status === 'Pendente') { bg = '#fffbeb'; color = '#d97706'; }
    if (status === 'Rejeitada' || status === 'Cancelada' || status === 'Injustificada') { bg = '#fef2f2'; color = '#dc2626'; }
    return {
      padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
      backgroundColor: bg, color: color, display: 'inline-block'
    };
  },
  th: { padding: '10px 12px', textAlign: 'left', fontWeight: '600' },
  td: { padding: '10px 12px', verticalAlign: 'middle', borderBottom: '1px solid var(--color-border)' },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '20px'
  },
  modalBox: {
    backgroundColor: 'var(--color-bg-elevated)', borderRadius: '10px',
    width: '100%', maxWidth: '520px', border: '1px solid var(--color-border)'
  },
  modalHeader: {
    padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--color-text-muted)' },
  modalBody: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' },
  input: {
    padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-base)', fontSize: '13px'
  },
  textarea: {
    padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-base)', fontSize: '13px', fontFamily: 'inherit'
  },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end', gap: '10px',
    paddingTop: '10px', borderTop: '1px solid var(--color-border)'
  },
  btnCancel: {
    padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid var(--color-border)',
    borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text-muted)'
  },
  btnConfirm: {
    padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer'
  }
};
