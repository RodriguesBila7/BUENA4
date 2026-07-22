import React, { useState } from 'react';
import { SERNIC_LOGO_B64 } from '../utils/sernic_logo_default';
import OrgStructureManager from './OrgStructureManager';
import HomeDashboard from './HomeDashboard';
import EmployeeManager from './employees/EmployeeManager';
import DisciplinaryManager from './disciplinary/DisciplinaryManager';
import EffectivenessManager from './effectiveness/EffectivenessManager';
import AdminActsManager from './adminActs/AdminActsManager';
import EvaluationManager from './evaluations/EvaluationManager';
import AccessManager from './access/AccessManager';
import PermissionGuard from './PermissionGuard';
import ConfirmModal from './ConfirmModal';
import useEmployeeData from '../hooks/useEmployeeData';
import useOrgData from '../hooks/useOrgData';
import useActTypesData from '../hooks/useActTypesData';
import SettingsLanguages from './settings/SettingsLanguages';
import SettingsSystem from './settings/SettingsSystem';
import AccountManager from './settings/accounts/AccountManager';
import BackupCenter from './settings/BackupCenter';
import ActTypesManager from './settings/ActTypesManager';
import CareerManager from './career/CareerManager';
import TransferManager from './transfers/TransferManager';
import VacationManager from './vacations/VacationManager';
import ErrorBoundary from './common/ErrorBoundary';

const getDynamicGroupIcon = (groupName) => {
  switch(groupName) {
    case 'Férias e Licenças':
      return <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></>;
    case 'Mudança de Carreira':
      return <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></>;
    case 'Processos Disciplinares':
      return <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></>;
    case 'Promoção e Progressão':
      return <><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></>;
    case 'Provimento e Cessação':
      return <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></>;
    case 'Reserva e Reforma':
      return <><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></>;
    case 'Saúde e Óbitos':
      return <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></>;
    case 'Transferências e Mobilidade':
      return <><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></>;
    default:
      return <polyline points="9 11 12 14 22 4"></polyline>;
  }
};

export default function Dashboard({ user, settings, updateSettings, resetSettings, onLogout, t, language, setLanguage }) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('sernic_active_tab') || 'home';
  });
  const [expandedMenu, setExpandedMenu] = useState(() => {
    const val = localStorage.getItem('sernic_expanded_menu');
    return val !== null ? val : '';
  });
  const [expandedSubMenu, setExpandedSubMenu] = useState(() => {
    const val = localStorage.getItem('sernic_expanded_submenu');
    return val !== null ? val : '';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ─── HISTÓRICO DE NAVEGAÇÃO ────────────────────────────────────────────────
  const [navHistory, setNavHistory] = useState(() => [localStorage.getItem('sernic_active_tab') || 'home']);
  const [navIndex, setNavIndex] = useState(0);
  const canGoBack = navIndex > 0;
  const canGoForward = navIndex < navHistory.length - 1;

  const { employees } = useEmployeeData();
  const { data: orgData } = useOrgData();
  const { actTypes } = useActTypesData();

  const reportStats = React.useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.isActive !== false).length;
    const inactive = total - active;
    const men = employees.filter(e => e.gender === 'M' || e.gender === 'Masculino').length;
    const women = employees.filter(e => e.gender === 'F' || e.gender === 'Feminino').length;

    // Distribution by Directorate
    const byDirectorate = {};
    if (orgData && orgData.directorates) {
      orgData.directorates.forEach(d => byDirectorate[d.id] = { name: d.name, count: 0, M: 0, F: 0 });
    }
    let unassignedDir = { count: 0, M: 0, F: 0 };

    // Distribution by Career
    const byCareer = {};
    if (orgData && orgData.careers) {
      orgData.careers.forEach(c => byCareer[c.id] = { name: c.name, count: 0, M: 0, F: 0 });
    }
    let unassignedCareer = { count: 0, M: 0, F: 0 };

    // Distribution by Academic Level
    const academicLevels = {
      'Ensino Básico': 0,
      'Ensino Médio': 0,
      'Licenciatura': 0,
      'Mestrado': 0,
      'Doutoramento': 0,
      'Outro': 0
    };

    employees.forEach(emp => {
      const isM = emp.gender === 'M' || emp.gender === 'Masculino';
      const isF = emp.gender === 'F' || emp.gender === 'Feminino';

      // Directorate
      if (emp.directorateId && byDirectorate[emp.directorateId]) {
        byDirectorate[emp.directorateId].count++;
        if (isM) byDirectorate[emp.directorateId].M++;
        if (isF) byDirectorate[emp.directorateId].F++;
      } else {
        unassignedDir.count++;
        if (isM) unassignedDir.M++;
        if (isF) unassignedDir.F++;
      }

      // Career
      if (emp.careerId && byCareer[emp.careerId]) {
        byCareer[emp.careerId].count++;
        if (isM) byCareer[emp.careerId].M++;
        if (isF) byCareer[emp.careerId].F++;
      } else {
        unassignedCareer.count++;
        if (isM) unassignedCareer.M++;
        if (isF) unassignedCareer.F++;
      }

      // Academic Level
      const lvl = emp.academicLevel;
      if (lvl && academicLevels[lvl] !== undefined) {
        academicLevels[lvl]++;
      } else if (lvl) {
        academicLevels['Outro']++;
      }
    });

    const activeDirectorates = Object.values(byDirectorate).filter(d => d.count > 0).sort((a,b) => b.count - a.count);
    const activeCareers = Object.values(byCareer).filter(c => c.count > 0).sort((a,b) => b.count - a.count);

    return {
      total,
      active,
      inactive,
      men,
      women,
      directorates: activeDirectorates,
      unassignedDir,
      careers: activeCareers,
      unassignedCareer,
      academicLevels
    };
  }, [employees, orgData]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('sernic_active_tab', tab);
    // Registar no histórico de navegação (descarta o futuro ao navegar para nova tab)
    setNavHistory(prev => {
      const newHistory = [...prev.slice(0, navIndex + 1), tab];
      setNavIndex(newHistory.length - 1);
      return newHistory;
    });
  };

  const handleNavBack = () => {
    if (!canGoBack) return;
    const newIndex = navIndex - 1;
    const tab = navHistory[newIndex];
    setNavIndex(newIndex);
    setActiveTab(tab);
    localStorage.setItem('sernic_active_tab', tab);
  };

  const handleNavForward = () => {
    if (!canGoForward) return;
    const newIndex = navIndex + 1;
    const tab = navHistory[newIndex];
    setNavIndex(newIndex);
    setActiveTab(tab);
    localStorage.setItem('sernic_active_tab', tab);
  };

  const toggleMenu = (menu) => {
    const newVal = expandedMenu === menu ? '' : menu;
    setExpandedMenu(newVal);
    localStorage.setItem('sernic_expanded_menu', newVal);
  };

  const toggleSubMenu = (submenu) => {
    const newVal = expandedSubMenu === submenu ? '' : submenu;
    setExpandedSubMenu(newVal);
    localStorage.setItem('sernic_expanded_submenu', newVal);
  };
  const [formData, setFormData] = useState({
    nome_instituicao: settings.nome_instituicao,
    sigla: settings.sigla,
    cor_principal: settings.cor_principal,
    cor_secundaria: settings.cor_secundaria,
    cor_destaque: settings.cor_destaque,
    modo_tema: settings.modo_tema
  });
  const [tempLogo, setTempLogo] = useState(settings.logotipo || '');
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = React.useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null, isDestructive: false });

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Atalhos de teclado: Alt+← (voltar) / Alt+→ (avançar)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavForward();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canGoBack, canGoForward, navIndex, navHistory]);



  const isSuperAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(user.roleId || user.role) || user.username === 'admin';

  // Sincronizar form se as configurações centrais mudarem (ex: reset)
  React.useEffect(() => {
    setFormData({
      nome_instituicao: settings.nome_instituicao,
      sigla: settings.sigla,
      cor_principal: settings.cor_principal,
      cor_secundaria: settings.cor_secundaria,
      cor_destaque: settings.cor_destaque,
      modo_tema: settings.modo_tema
    });
    setTempLogo(settings.logotipo || '');
  }, [settings]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setTempLogo('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    updateSettings({
      ...formData,
      logotipo: tempLogo,
      usuario_responsavel: user.username
    });
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 4000);
  };

  const handleReset = () => {
    setConfirmModal({
      isOpen: true,
      title: t('form_reset'),
      message: t('msg_reset_confirm'),
      isDestructive: true,
      action: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        resetSettings(user.username);
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={styles.appContainer}>
      {/* SIDEBAR LATERAL (Oculta na impressão) */}
      <aside className="no-print" style={{ ...styles.sidebar, marginLeft: isSidebarOpen ? '0' : '-260px' }}>
        <div style={styles.sidebarHeader}>
          {settings.logotipo ? (
            <img src={settings.logotipo} alt="Logo SERNIC" style={styles.sidebarLogo} />
          ) : (
            <img src={SERNIC_LOGO_B64} alt="Logo SERNIC Padrão" style={{ ...styles.sidebarLogo, width: '40px', height: '40px' }} />
          )}
          <div style={styles.sidebarHeaderText}>
            <span style={styles.sidebarSigla}>{settings.sigla}</span>
            <span style={styles.sidebarDRH}>{t('sidebar_hr')}</span>
          </div>
        </div>

        <nav style={styles.sidebarNav}>
          <button 
            onClick={() => handleTabChange('home')}
            style={{ 
              ...styles.navItem, 
              backgroundColor: activeTab === 'home' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              borderLeft: activeTab === 'home' ? '4px solid var(--color-primary)' : '4px solid transparent'
            }}
          >
            <svg style={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            {t('menu_home')}
          </button>
          
          <button 
            onClick={() => handleTabChange('reports')}
            style={{ 
              ...styles.navItem, 
              backgroundColor: activeTab === 'reports' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              borderLeft: activeTab === 'reports' ? '4px solid var(--color-primary)' : '4px solid transparent'
            }}
          >
            <svg style={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            {t('menu_reports')}
          </button>

          {/* Menu Processos Disciplinares */}
          <button 
            onClick={() => handleTabChange('disciplinary')}
            style={{ 
              ...styles.navItem, 
              backgroundColor: activeTab === 'disciplinary' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              borderLeft: activeTab === 'disciplinary' ? '4px solid var(--color-primary)' : '4px solid transparent'
            }}
          >
            <svg style={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Processos Disciplinares
          </button>



          {/* Menu Efetividade */}
          <button 
            onClick={() => handleTabChange('effectiveness')}
            style={{ 
              ...styles.navItem, 
              backgroundColor: activeTab === 'effectiveness' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              borderLeft: activeTab === 'effectiveness' ? '4px solid var(--color-primary)' : '4px solid transparent'
            }}
          >
            <svg style={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Efetividade
          </button>

          {/* Menu Avaliação Desempenho */}
          <button 
            onClick={() => handleTabChange('evaluations')}
            style={{ 
              ...styles.navItem, 
              backgroundColor: activeTab === 'evaluations' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              borderLeft: activeTab === 'evaluations' ? '4px solid var(--color-primary)' : '4px solid transparent'
            }}
          >
            <svg style={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-6M6 20V10M18 20V4" /><circle cx="12" cy="10" r="2" /><circle cx="6" cy="6" r="2" /><circle cx="18" cy="16" r="2" /></svg>
            Avaliação Desempenho
          </button>



          {/* Menu Actos Administrativos */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button 
              onClick={() => toggleMenu('admin_acts')}
              style={{ 
                ...styles.navItem, 
                justifyContent: 'space-between', 
                paddingRight: '16px',
                backgroundColor: expandedMenu === 'admin_acts' ? 'rgba(0,0,0,0.03)' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg style={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                Actos Administrativos
              </div>
              <svg style={{ width: '16px', height: '16px', transition: 'transform 0.3s ease', transform: expandedMenu === 'admin_acts' ? 'rotate(180deg)' : 'rotate(0)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            
            {expandedMenu === 'admin_acts' && (
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                 <div style={{ position: 'absolute', left: '32px', top: '0', bottom: '16px', width: '1px', backgroundColor: 'var(--color-border)' }}></div>

                 {[
                   { id: 'admin_acts_dashboard', label: 'Dashboard Executivo', icon: <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path> },
                   { id: 'career', label: 'Promoção e Progressão', icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path> },
                 ...Object.keys(actTypes.reduce((acc, act) => { if (act.is_active) acc[act.group_name] = true; return acc; }, {}))
                   .filter(group => group !== 'Promoção e Progressão' && group !== 'Processos Disciplinares')
                   .sort()
                   .map(group => ({
                   id: `admin_acts_dynamic_${group.replace(/\s+/g, '_')}`,
                   label: group,
                   icon: getDynamicGroupIcon(group),
                   isDynamic: true,
                   groupName: group
                 }))
               ].map(item => (
                   <button 
                     key={item.id}
                     onClick={() => handleTabChange(item.id)}
                     style={{ 
                       ...styles.navItem, 
                       padding: '10px 16px 10px 48px', 
                       opacity: activeTab === item.id ? 1 : 0.85, 
                       borderLeft: 'none', 
                       fontSize: '13px',
                       position: 'relative',
                       backgroundColor: activeTab === item.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                       color: activeTab === item.id ? 'var(--color-primary)' : 'inherit'
                     }}
                   >
                     <div style={{ position: 'absolute', left: '32px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                     <span style={{ fontWeight: activeTab === item.id ? '600' : '400', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                         {item.icon}
                       </svg>
                       {item.label}
                     </span>
                   </button>
                 ))}
              </div>
            )}
          </div>


          {/* Menu Funcionários */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button 
              onClick={() => toggleMenu('funcionarios')}
              style={{ 
                ...styles.navItem, 
                justifyContent: 'space-between', 
                paddingRight: '16px',
                backgroundColor: expandedMenu === 'funcionarios' ? 'rgba(0,0,0,0.03)' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg style={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                Funcionários
              </div>
              <svg style={{ width: '16px', height: '16px', transition: 'transform 0.3s ease', transform: expandedMenu === 'funcionarios' ? 'rotate(180deg)' : 'rotate(0)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            
            {expandedMenu === 'funcionarios' && (
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                 <div style={{ position: 'absolute', left: '32px', top: '0', bottom: '16px', width: '1px', backgroundColor: 'var(--color-border)' }}></div>

                 <button 
                    onClick={() => handleTabChange('emp_list')}
                    style={{ 
                      ...styles.navItem, 
                      padding: '10px 16px 10px 48px', 
                      opacity: 0.85, 
                      borderLeft: 'none', 
                      fontSize: '13px',
                      position: 'relative',
                      backgroundColor: activeTab === 'emp_list' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: activeTab === 'emp_list' ? 'var(--color-primary)' : 'inherit'
                    }}
                  >
                    Visualizar Funcionários
                  </button>

                  <button 
                    onClick={() => handleTabChange('emp_form')}
                    style={{ 
                      ...styles.navItem, 
                      padding: '10px 16px 10px 48px', 
                      opacity: 0.85, 
                      borderLeft: 'none', 
                      fontSize: '13px',
                      position: 'relative',
                      backgroundColor: activeTab === 'emp_form' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: activeTab === 'emp_form' ? 'var(--color-primary)' : 'inherit'
                    }}
                  >
                    Cadastrar Funcionário
                  </button>

                  <button 
                    onClick={() => handleTabChange('emp_import')}
                    style={{ 
                      ...styles.navItem, 
                      padding: '10px 16px 10px 48px', 
                      opacity: 0.85, 
                      borderLeft: 'none', 
                      fontSize: '13px',
                      position: 'relative',
                      backgroundColor: activeTab === 'emp_import' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: activeTab === 'emp_import' ? 'var(--color-primary)' : 'inherit'
                    }}
                  >
                    Carregar e Importar
                  </button>

                  <button 
                    onClick={() => handleTabChange('emp_deleted')}
                    style={{ 
                      ...styles.navItem, 
                      padding: '10px 16px 10px 48px', 
                      opacity: 0.85, 
                      borderLeft: 'none', 
                      fontSize: '13px',
                      position: 'relative',
                      backgroundColor: activeTab === 'emp_deleted' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: activeTab === 'emp_deleted' ? 'var(--color-primary)' : 'inherit'
                    }}
                  >
                    Funcionários Eliminados
                  </button>

              </div>
            )}
          </div>

          {/* Menu Definições */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button 
              onClick={() => toggleMenu('definicoes')}
              style={{ 
                ...styles.navItem, 
                justifyContent: 'space-between', 
                paddingRight: '16px',
                backgroundColor: expandedMenu === 'definicoes' ? 'rgba(0,0,0,0.03)' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg style={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                {t('menu_settings') || 'Definições'}
              </div>
              <svg style={{ width: '16px', height: '16px', transition: 'transform 0.3s ease', transform: expandedMenu === 'definicoes' ? 'rotate(180deg)' : 'rotate(0)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            
            {expandedMenu === 'definicoes' && (
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                 <div style={{ position: 'absolute', left: '32px', top: '0', bottom: '16px', width: '1px', backgroundColor: 'var(--color-border)' }}></div>

                 <button 
                    onClick={() => toggleSubMenu('personalizacao')}
                    style={{ 
                      ...styles.navItem, 
                      padding: '10px 16px 10px 48px', 
                      justifyContent: 'space-between', 
                      opacity: 0.85, 
                      borderLeft: 'none', 
                      fontSize: '13px',
                      position: 'relative',
                      backgroundColor: expandedSubMenu === 'personalizacao' ? 'rgba(0,0,0,0.02)' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg style={{ width: '15px', height: '15px', color: 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      <span>{t('menu_personalization') || 'Personalização'}</span>
                    </div>
                    <svg style={{ width: '14px', height: '14px', color: 'var(--color-text-muted)', transition: 'transform 0.3s ease', transform: expandedSubMenu === 'personalizacao' ? 'rotate(180deg)' : 'rotate(0)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>

                  {expandedSubMenu === 'personalizacao' && (
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '56px', top: '0', bottom: '16px', width: '1px', backgroundColor: 'var(--color-border)' }}></div>

                      <button 
                        onClick={() => handleTabChange('identity')}
                        style={{ 
                          ...styles.navItem, 
                          padding: '10px 16px 10px 72px',
                          opacity: activeTab === 'identity' ? 1 : 0.7,
                          color: activeTab === 'identity' ? 'var(--color-primary)' : 'var(--color-text-base)',
                          backgroundColor: activeTab === 'identity' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                          borderLeft: 'none',
                          fontSize: '13px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ position: 'absolute', left: '56px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                        
                        <span style={{ fontWeight: activeTab === 'identity' ? '600' : '400', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                          {t('menu_identity') || 'Identidade Visual'}
                        </span>
                      </button>

                      <button 
                        onClick={() => handleTabChange('org_structure')}
                        style={{ 
                          ...styles.navItem, 
                          padding: '10px 16px 10px 72px',
                          opacity: activeTab === 'org_structure' ? 1 : 0.7,
                          color: activeTab === 'org_structure' ? 'var(--color-primary)' : 'var(--color-text-base)',
                          backgroundColor: activeTab === 'org_structure' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                          borderLeft: 'none',
                          fontSize: '13px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ position: 'absolute', left: '56px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                        
                        <span style={{ fontWeight: activeTab === 'org_structure' ? '600' : '400', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                          {t('org_title') || 'Estrutura Organizacional'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Utilizadores e Acessos - Protegido por RBAC */}
                  <PermissionGuard module="Acessos" action="Visualizar">
                    <button onClick={() => toggleSubMenu('acessos')} style={{ ...styles.navItem, padding: '10px 16px 10px 48px', justifyContent: 'space-between', opacity: 0.85, borderLeft: 'none', fontSize: '13px', position: 'relative', backgroundColor: expandedSubMenu === 'acessos' ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                      <div style={{ position: 'absolute', left: '32px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg style={{ width: '15px', height: '15px', color: 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span>{t('menu_users_access') || 'Utilizadores e Acessos'}</span>
                      </div>
                      <svg style={{ width: '14px', height: '14px', color: 'var(--color-text-muted)', transition: 'transform 0.3s ease', transform: expandedSubMenu === 'acessos' ? 'rotate(180deg)' : 'rotate(0)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                  </PermissionGuard>

                  {expandedSubMenu === 'acessos' && (
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '56px', top: '0', bottom: '20px', width: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>

                      {[
                        { id: 'users_manage', label: 'Gestão de utilizadores' },
                        { id: 'users_roles', label: 'Perfis / roles' },
                        { id: 'users_permissions', label: 'Permissões por módulo' },
                        { id: 'users_policies', label: 'Políticas de acesso' },
                        { id: 'users_audit', label: 'Auditoria de acessos' }
                      ].map((item) => (
                        <button 
                          key={item.id}
                          onClick={() => handleTabChange(item.id)}
                          style={{ 
                            ...styles.navItem, 
                            padding: '10px 16px 10px 72px',
                            opacity: activeTab === item.id ? 1 : 0.7,
                            color: item.id === 'users_permissions' ? '#e53e3e' : (activeTab === item.id ? 'var(--color-primary)' : 'var(--color-text-base)'),
                            backgroundColor: item.id === 'users_permissions' ? 'rgba(229, 62, 62, 0.1)' : (activeTab === item.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent'),
                            borderLeft: item.id === 'users_permissions' ? '3px solid #e53e3e' : 'none',
                            fontSize: '13px',
                            position: 'relative'
                          }}
                        >
                          <div style={{ position: 'absolute', left: '56px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                          <span style={{ fontWeight: activeTab === item.id ? '600' : '400', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle></svg>
                            {t(`menu_${item.id}`) || item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Gerir Contas */}
                  <button 
                    onClick={() => handleTabChange('settings_accounts')}
                    style={{ 
                      ...styles.navItem, 
                      padding: '10px 16px 10px 48px', 
                      justifyContent: 'flex-start', 
                      opacity: activeTab === 'settings_accounts' ? 1 : 0.85, 
                      borderLeft: 'none', 
                      fontSize: '13px',
                      position: 'relative',
                      backgroundColor: activeTab === 'settings_accounts' ? 'rgba(0,0,0,0.02)' : 'transparent',
                      color: activeTab === 'settings_accounts' ? 'var(--color-primary)' : 'var(--color-text-base)'
                    }}
                  >
                    <div style={{ position: 'absolute', left: '32px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg style={{ width: '15px', height: '15px', color: activeTab === 'settings_accounts' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      <span style={{ fontWeight: activeTab === 'settings_accounts' ? '600' : '400' }}>{t('menu_settings_accounts') || 'Gerir Contas'}</span>
                    </div>
                  </button>

                  {/* Idiomas */}
                  <button 
                    onClick={() => handleTabChange('settings_languages')}
                    style={{ 
                      ...styles.navItem, 
                      padding: '10px 16px 10px 48px', 
                      justifyContent: 'flex-start', 
                      opacity: activeTab === 'settings_languages' ? 1 : 0.85, 
                      borderLeft: 'none', 
                      fontSize: '13px',
                      position: 'relative',
                      backgroundColor: activeTab === 'settings_languages' ? 'rgba(0,0,0,0.02)' : 'transparent',
                      color: activeTab === 'settings_languages' ? 'var(--color-primary)' : 'var(--color-text-base)'
                    }}
                  >
                    <div style={{ position: 'absolute', left: '32px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg style={{ width: '15px', height: '15px', color: activeTab === 'settings_languages' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                      <span style={{ fontWeight: activeTab === 'settings_languages' ? '600' : '400' }}>{t('menu_settings_languages') || 'Idiomas e Região'}</span>
                    </div>
                  </button>

                  {/* Sistema */}
                  <button 
                    onClick={() => handleTabChange('settings_system')}
                    style={{ 
                      ...styles.navItem, 
                      padding: '10px 16px 10px 48px', 
                      justifyContent: 'flex-start', 
                      opacity: activeTab === 'settings_system' ? 1 : 0.85, 
                      borderLeft: 'none', 
                      fontSize: '13px',
                      position: 'relative',
                      backgroundColor: activeTab === 'settings_system' ? 'rgba(0,0,0,0.02)' : 'transparent',
                      color: activeTab === 'settings_system' ? 'var(--color-primary)' : 'var(--color-text-base)'
                    }}
                  >
                    <div style={{ position: 'absolute', left: '32px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg style={{ width: '15px', height: '15px', color: activeTab === 'settings_system' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                      <span style={{ fontWeight: activeTab === 'settings_system' ? '600' : '400' }}>{t('menu_settings_system') || 'Sistema'}</span>
                    </div>
                  </button>

                  {/* Central de Backup */}
                  <button 
                    onClick={() => handleTabChange('settings_backup')}
                    style={{ 
                      ...styles.navItem, 
                      padding: '10px 16px 10px 48px', 
                      justifyContent: 'flex-start', 
                      opacity: activeTab === 'settings_backup' ? 1 : 0.85, 
                      borderLeft: activeTab === 'settings_backup' ? '3px solid var(--color-primary)' : 'none', 
                      fontSize: '13px',
                      position: 'relative',
                      backgroundColor: activeTab === 'settings_backup' ? 'rgba(0,0,0,0.04)' : 'transparent',
                      color: activeTab === 'settings_backup' ? 'var(--color-primary)' : 'var(--color-text-base)'
                    }}
                  >
                    <div style={{ position: 'absolute', left: '32px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg style={{ width: '15px', height: '15px', color: activeTab === 'settings_backup' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      <span style={{ fontWeight: activeTab === 'settings_backup' ? '600' : '400' }}>Central de Backup</span>
                    </div>
                  </button>

                  {/* Tipos de Acto */}
                  <button 
                    onClick={() => handleTabChange('settings_act_types')}
                    style={{ 
                      ...styles.navItem, 
                      padding: '10px 16px 10px 48px', 
                      justifyContent: 'flex-start', 
                      opacity: activeTab === 'settings_act_types' ? 1 : 0.85, 
                      borderLeft: activeTab === 'settings_act_types' ? '3px solid var(--color-primary)' : 'none', 
                      fontSize: '13px',
                      position: 'relative',
                      backgroundColor: activeTab === 'settings_act_types' ? 'rgba(0,0,0,0.04)' : 'transparent',
                      color: activeTab === 'settings_act_types' ? 'var(--color-primary)' : 'var(--color-text-base)'
                    }}
                  >
                    <div style={{ position: 'absolute', left: '32px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg style={{ width: '15px', height: '15px', color: activeTab === 'settings_act_types' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      <span style={{ fontWeight: activeTab === 'settings_act_types' ? '600' : '400' }}>Tipos de Actos</span>
                    </div>
                  </button>
              </div>
            )}
          </div>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.sidebarUser}>
            <div style={styles.userBadge}>
              {user.username.charAt(0)}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.username}>{user.username}</div>
              <div style={styles.userRole}>
                {user.roleName || (user.role === 'super_admin' ? t('role_super_admin') : t('role_user'))}
              </div>
            </div>
          </div>
          <button onClick={onLogout} style={styles.logoutBtn}>
            <svg style={styles.logoutIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            {t('menu_logout')}
          </button>
        </div>

        {/* BOTAO FLUTUANTE NA LINHA */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            position: 'absolute',
            top: '50%',
            right: '-14px',
            transform: 'translateY(-50%)',
            width: '28px',
            height: '28px',
            backgroundColor: 'var(--color-bg-base)',
            border: '1px solid var(--color-border)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            color: 'var(--color-text-muted)',
            transition: 'color 0.2s, background-color 0.2s'
          }}
          title={isSidebarOpen ? "Ocultar Menu" : "Mostrar Menu"}
        >
          <svg 
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{
              transition: 'transform 0.3s ease',
              transform: isSidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)'
            }}
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL DA APLICAÇÃO */}
      <main style={styles.mainContent}>
        {/* NAVBAR SUPERIOR (Oculta na impressão) */}
        <header className="no-print" style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={styles.headerTitle}>
              {settings.logotipo ? (
                <img src={settings.logotipo} alt="Logo" style={styles.headerLogo} />
              ) : (
                <img src={SERNIC_LOGO_B64} alt="Logo Padrão" style={{ ...styles.headerLogo, width: '32px', height: '32px' }} />
              )}
              <h2 style={styles.institutionTitle}>
                {settings.nome_instituicao} ({settings.sigla})
              </h2>
            </div>
          </div>

          {/* SETAS DE NAVEGAÇÃO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
            <button
              onClick={handleNavBack}
              disabled={!canGoBack}
              title="Voltar (Alt+←)"
              style={{
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: canGoBack ? 'var(--color-bg-base)' : 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                cursor: canGoBack ? 'pointer' : 'not-allowed',
                opacity: canGoBack ? 1 : 0.35,
                color: 'var(--color-text-muted)',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button
              onClick={handleNavForward}
              disabled={!canGoForward}
              title="Avançar (Alt+→)"
              style={{
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: canGoForward ? 'var(--color-bg-base)' : 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                cursor: canGoForward ? 'pointer' : 'not-allowed',
                opacity: canGoForward ? 1 : 0.35,
                color: 'var(--color-text-muted)',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          <div style={styles.headerActions}>
            {/* Seletor de Idioma no Header */}
            <div style={{ position: 'relative' }} ref={langMenuRef}>
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                style={{ ...styles.langBtnHeader, display: 'flex', alignItems: 'center', gap: '4px', opacity: 1, fontWeight: '700' }}
                title={t('language')}
              >
                {language.toUpperCase()}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              
              {showLangMenu && (
                <div style={styles.langDropdownHeader}>
                  {['pt', 'en'].filter(l => l !== language).map(lang => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                      style={{ ...styles.langBtnHeader, opacity: 0.7, width: '100%', textAlign: 'left', marginTop: '4px' }}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Seletor Rápido de Tema (Claro / Escuro) */}
            <button 
              onClick={() => {
                if (isSuperAdmin) {
                  updateSettings({ ...settings, modo_tema: settings.modo_tema === 'light' ? 'dark' : 'light', usuario_responsavel: user.username });
                } else {
                  setConfirmModal({ isOpen: true, title: 'Atenção', message: t('msg_admin_only_theme'), action: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) });
                }
              }}
              style={styles.themeToggleBtn}
              title={t('theme_toggle_title')}
            >
              {settings.modo_tema === 'dark' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              )}
              <span style={{ fontSize: '13px', fontWeight: '500' }}>
                {t('theme_mode')}: {settings.modo_tema === 'dark' ? t('theme_dark') : t('theme_light')}
              </span>
            </button>

            <div style={styles.headerUserTag}>
              <span style={styles.roleDot(isSuperAdmin)}></span>
              <span style={styles.headerUserRole}>
                {isSuperAdmin ? 'SUPER ADMIN' : 'USER'}
              </span>
            </div>
          </div>
        </header>

        {/* ÁREA DE CONTEÚDO DINÂMICO */}
        <div style={styles.contentArea}>
          <ErrorBoundary key={activeTab}>
          
          {/* TAB 1: INÍCIO (DASHBOARD) */}
          {activeTab === 'home' && (
            <HomeDashboard t={t} onTabChange={handleTabChange} />
          )}

          {/* TAB TRANSFERÊNCIAS */}
          {activeTab === 'transfers' && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <PermissionGuard module="Transferências" action="Visualizar">
                <TransferManager />
              </PermissionGuard>
            </div>
          )}

          {/* TAB FÉRIAS E LICENÇAS */}
          {activeTab === 'vacations' && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <PermissionGuard module="Férias" action="Visualizar">
                <VacationManager />
              </PermissionGuard>
            </div>
          )}

          {/* TAB AVALIAÇÕES */}
          {activeTab === 'evaluations' && (
            <PermissionGuard module="Avaliacao de Desempenho" action="Visualizar">
              <EvaluationManager user={user} />
            </PermissionGuard>
          )}

          {/* TAB 1.5: FUNCIONÁRIOS */}
          {['emp_list', 'emp_form', 'emp_import', 'emp_deleted'].includes(activeTab) && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <EmployeeManager t={t} currentView={activeTab} onViewChange={handleTabChange} />
            </div>
          )}

          {/* TAB PROCESSOS DISCIPLINARES */}
          {activeTab === 'disciplinary' && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <DisciplinaryManager orgData={{ data: orgData }} employeesData={{ employees }} />
            </div>
          )}



          {/* TAB EFETIVIDADE */}
          {activeTab === 'effectiveness' && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <EffectivenessManager />
            </div>
          )}

          {/* TAB PROMOÇÃO E PROGRESSÃO */}
          {activeTab === 'career' && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <PermissionGuard module="Atos Administrativos" action="Visualizar">
                <CareerManager user={user} />
              </PermissionGuard>
            </div>
          )}

          {/* TAB 1.7: ACTOS ADMINISTRATIVOS */}
          {(activeTab.startsWith('admin_acts')) && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <AdminActsManager activeTab={activeTab} onTabChange={handleTabChange} actTypesDb={actTypes} />
            </div>
          )}

          {/* TAB SEGURANÇA E ACESSOS */}
          {['users_manage', 'users_roles', 'users_permissions', 'users_policies', 'users_audit'].includes(activeTab) && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <PermissionGuard module="Acessos" action="Visualizar" fallback={<div style={{padding: '20px', color: 'red'}}>Acesso não autorizado.</div>}>
                <AccessManager currentView={activeTab} onViewChange={handleTabChange} />
              </PermissionGuard>
            </div>
          )}

          {/* TAB 2: GESTÃO DE IDENTIDADE VISUAL */}
          {activeTab === 'identity' && (
            <div className="animate-fade-in" style={styles.tabContainer}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionMainTitle}>{t('panel_title')}</h3>
                <p style={styles.sectionMainDesc}>{t('panel_desc')}</p>
              </div>

              {/* Banner de Aviso para Utilizador Comum */}
              {!isSuperAdmin && (
                <div style={styles.warningBanner}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '10px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  <span>{t('msg_admin_only_identity')}</span>
                </div>
              )}

              {showSaveMessage && (
                <div style={styles.successBanner}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '10px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>{t('msg_identity_saved')}</span>
                </div>
              )}

              <div style={styles.settingsGrid}>
                {/* FORMULÁRIO DE CONFIGURAÇÕES */}
                <form onSubmit={handleSubmit} style={styles.formCard}>
                  <h4 style={styles.formCardTitle}>{t('form_display_settings')}</h4>
                  
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>{t('form_institution_name')}</label>
                      <input 
                        type="text" 
                        name="nome_instituicao"
                        value={formData.nome_instituicao}
                        onChange={handleInputChange}
                        disabled={!isSuperAdmin}
                        style={styles.formInput}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>{t('form_acronym')}</label>
                      <input 
                        type="text" 
                        name="sigla"
                        value={formData.sigla}
                        onChange={handleInputChange}
                        disabled={!isSuperAdmin}
                        style={styles.formInput}
                        required
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>{t('form_logo')}</label>
                    <div style={styles.logoUploadArea}>
                      <div style={styles.logoPreviewSquare}>
                        {tempLogo ? (
                          <img src={tempLogo} alt="Preview Logo" style={styles.logoPreviewImg} />
                        ) : (
                          <img src={SERNIC_LOGO_B64} alt="Preview Padrão" style={{ ...styles.logoPreviewImg, width: '64px', height: '64px' }} />
                        )}
                      </div>
                      <div style={styles.logoUploadControls}>
                        {isSuperAdmin ? (
                          <>
                            <input 
                              type="file" 
                              accept="image/*" 
                              id="logo-file"
                              onChange={handleLogoUpload}
                              style={{ display: 'none' }}
                            />
                            <label htmlFor="logo-file" className="btn-animate" style={styles.uploadBtn}>
                              {t('form_upload_logo')}
                            </label>
                            {tempLogo && (
                              <button type="button" onClick={handleRemoveLogo} style={styles.removeLogoBtn}>
                                {t('form_remove_logo')}
                              </button>
                            )}
                          </>
                        ) : (
                          <span style={styles.uploadDisabledText}>{t('form_upload_disabled')}</span>
                        )}
                        <p style={styles.logoUploadTip}>{t('form_logo_tip')}</p>
                      </div>
                    </div>
                  </div>

                  <h4 style={{ ...styles.formCardTitle, marginTop: '30px', marginBottom: '15px' }}>{t('form_colors_title')}</h4>
                  <div style={styles.colorsRow}>
                    <div style={styles.colorPickerGroup}>
                      <label style={styles.formLabel}>{t('form_color_primary')}</label>
                      <div style={styles.colorPickerWrapper}>
                        <input 
                          type="color" 
                          name="cor_principal"
                          value={formData.cor_principal}
                          onChange={handleInputChange}
                          disabled={!isSuperAdmin}
                          style={styles.colorInput}
                        />
                        <input 
                          type="text" 
                          name="cor_principal"
                          value={formData.cor_principal}
                          onChange={handleInputChange}
                          disabled={!isSuperAdmin}
                          style={styles.colorHexText}
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    <div style={styles.colorPickerGroup}>
                      <label style={styles.formLabel}>{t('form_color_secondary')}</label>
                      <div style={styles.colorPickerWrapper}>
                        <input 
                          type="color" 
                          name="cor_secundaria"
                          value={formData.cor_secundaria}
                          onChange={handleInputChange}
                          disabled={!isSuperAdmin}
                          style={styles.colorInput}
                        />
                        <input 
                          type="text" 
                          name="cor_secundaria"
                          value={formData.cor_secundaria}
                          onChange={handleInputChange}
                          disabled={!isSuperAdmin}
                          style={styles.colorHexText}
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    <div style={styles.colorPickerGroup}>
                      <label style={styles.formLabel}>{t('form_color_accent')}</label>
                      <div style={styles.colorPickerWrapper}>
                        <input 
                          type="color" 
                          name="cor_destaque"
                          value={formData.cor_destaque}
                          onChange={handleInputChange}
                          disabled={!isSuperAdmin}
                          style={styles.colorInput}
                        />
                        <input 
                          type="text" 
                          name="cor_destaque"
                          value={formData.cor_destaque}
                          onChange={handleInputChange}
                          disabled={!isSuperAdmin}
                          style={styles.colorHexText}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ ...styles.formRow, marginTop: '20px' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>{t('form_theme_mode')}</label>
                      <select 
                        name="modo_tema"
                        value={formData.modo_tema}
                        onChange={handleInputChange}
                        disabled={!isSuperAdmin}
                        style={styles.formSelect}
                      >
                        <option value="light">{t('form_theme_light')}</option>
                        <option value="dark">{t('form_theme_dark')}</option>
                      </select>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div style={styles.formActions}>
                      <button type="submit" className="btn-animate" style={{ ...styles.saveBtn, backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                        {t('form_save')}
                      </button>
                      <button type="button" onClick={handleReset} style={styles.resetBtn}>
                        {t('form_reset')}
                      </button>
                    </div>
                  )}
                </form>

                {/* VISUALIZADOR DA TABELA FÍSICA NO BANCO DE DADOS */}
                <div style={styles.dbTableCard}>
                  <div style={styles.dbCardHeader}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>
                    <h4 style={styles.dbCardTitle}>{t('db_table_title')} <code>configuracoes_identidade</code></h4>
                  </div>
                  <p style={styles.dbCardDesc}>{t('db_table_desc')}</p>
                  
                  <div style={styles.tableResponsive}>
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>{t('db_col_column')}</th>
                          <th>{t('db_col_type')}</th>
                          <th>{t('db_col_value')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>id</strong></td>
                          <td><code>INT</code></td>
                          <td><code>1</code></td>
                        </tr>
                        <tr>
                          <td><strong>nome_instituicao</strong></td>
                          <td><code>VARCHAR</code></td>
                          <td>"{settings.nome_instituicao}"</td>
                        </tr>
                        <tr>
                          <td><strong>sigla</strong></td>
                          <td><code>VARCHAR</code></td>
                          <td>"{settings.sigla}"</td>
                        </tr>
                        <tr>
                          <td><strong>logotipo</strong></td>
                          <td><code>LONGTEXT</code></td>
                          <td>
                            {settings.logotipo ? (
                              <span style={styles.logoDataBadge} title={settings.logotipo}>
                                DataURL (imagem/{settings.logotipo.split(';')[0].split('/')[1]})
                              </span>
                            ) : (
                              <span style={styles.nullBadge}>{t('db_null_logo')}</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>cor_principal</strong></td>
                          <td><code>VARCHAR</code></td>
                          <td>
                            <div style={styles.dbColorRow}>
                              <div style={styles.dbColorDot(settings.cor_principal)}></div>
                              <code>{settings.cor_principal}</code>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>cor_secundaria</strong></td>
                          <td><code>VARCHAR</code></td>
                          <td>
                            <div style={styles.dbColorRow}>
                              <div style={styles.dbColorDot(settings.cor_secundaria)}></div>
                              <code>{settings.cor_secundaria}</code>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>cor_destaque</strong></td>
                          <td><code>VARCHAR</code></td>
                          <td>
                            <div style={styles.dbColorRow}>
                              <div style={styles.dbColorDot(settings.cor_destaque)}></div>
                              <code>{settings.cor_destaque}</code>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>modo_tema</strong></td>
                          <td><code>VARCHAR</code></td>
                          <td><code>"{settings.modo_tema}"</code></td>
                        </tr>
                        <tr>
                          <td><strong>data_atualizacao</strong></td>
                          <td><code>TIMESTAMP</code></td>
                          <td><span style={{ fontSize: '12px' }}>{new Date(settings.data_atualizacao).toLocaleString()}</span></td>
                        </tr>
                        <tr>
                          <td><strong>usuario_responsavel</strong></td>
                          <td><code>VARCHAR</code></td>
                          <td><code>"{settings.usuario_responsavel}"</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2.5: IDIOMAS E REGIÃO */}
          {activeTab === 'settings_languages' && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <SettingsLanguages t={t} language={language} setLanguage={setLanguage} />
            </div>
          )}

          {/* TAB 2.6: SISTEMA */}
          {activeTab === 'settings_system' && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <SettingsSystem t={t} />
            </div>
          )}

          {/* TAB 2.7: GERIR CONTAS */}
          {activeTab === 'settings_accounts' && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <AccountManager t={t} />
            </div>
          )}

          {/* TAB 2.8: CENTRAL DE BACKUP */}
          {activeTab === 'settings_backup' && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <BackupCenter t={t} />
            </div>
          )}

          {/* TAB 2.9: TIPOS DE ACTO */}
          {activeTab === 'settings_act_types' && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <ActTypesManager />
            </div>
          )}

          {/* TAB 3: RELATÓRIOS E IMPRESSÕES */}
          {activeTab === 'reports' && (
            <div className="animate-fade-in" style={styles.tabContainer}>
              <div className="no-print" style={styles.sectionHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={styles.sectionMainTitle}>{t('reports_title')}</h3>
                    <p style={styles.sectionMainDesc}>{t('reports_desc')}</p>
                  </div>
                  <button 
                    onClick={handlePrint}
                    className="btn-animate" 
                    style={{ ...styles.printBtn, backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    {t('reports_print')}
                  </button>
                </div>
              </div>

              {/* MODELO DO DOCUMENTO DE RELATÓRIO OFICIAL (Suporta Impressão Limpa) */}
              <div style={styles.reportDocument} className="report-document">
                
                {/* CABEÇALHO DO RELATÓRIO */}
                <div style={{ ...styles.reportHeader, borderColor: 'var(--color-primary)' }} className="report-header">
                  <div style={styles.reportHeaderLeft}>
                    {settings.logotipo ? (
                      <img src={settings.logotipo} alt="Logo" style={styles.reportHeaderLogo} className="print-logo" />
                    ) : (
                      <img src={SERNIC_LOGO_B64} alt="Logo Padrão" style={{ ...styles.reportHeaderLogo, width: '70px', height: '70px' }} className="print-logo" />
                    )}
                  </div>
                  <div style={styles.reportHeaderRight}>
                    <h1 style={{ ...styles.reportTitle, color: 'var(--color-primary)' }} className="report-title">
                      {t('report_republic')}
                    </h1>
                    <h2 style={styles.reportSubtitle}>{settings.nome_instituicao} ({settings.sigla})</h2>
                    <p style={styles.reportDepartment}>{t('report_department')}</p>
                  </div>
                </div>

                {/* CORPO DO DOCUMENTO */}
                <div style={styles.reportContent}>
                  <div style={styles.docMeta}>
                    <p><strong>{t('report_ref')}</strong> 124/SERNIC-DRH/2026</p>
                    <p><strong>{t('report_date')}</strong> {new Date().toLocaleDateString(language === 'en' ? 'en-GB' : 'pt-PT')}</p>
                  </div>

                  <h3 style={styles.docTitle}>{t('report_doc_title')}</h3>
                  
                  <p style={styles.docText}>
                    {t('report_doc_body')} {settings.nome_instituicao} ({settings.sigla}){t('report_doc_body2')}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', marginTop: '20px' }}>
                    <div style={{ border: '1px solid var(--color-border)', padding: '15px', borderRadius: '8px', backgroundColor: 'var(--color-bg-base)' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary)' }}>Resumo Geral</h4>
                      <p style={{ margin: '5px 0' }}><strong>Total de Funcionários:</strong> {reportStats.total}</p>
                      <p style={{ margin: '5px 0' }}><strong>Ativos:</strong> {reportStats.active} | <strong>Inativos:</strong> {reportStats.inactive}</p>
                    </div>
                    <div style={{ border: '1px solid var(--color-border)', padding: '15px', borderRadius: '8px', backgroundColor: 'var(--color-bg-base)' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary)' }}>Distribuição por Género</h4>
                      <p style={{ margin: '5px 0' }}><strong>Homens:</strong> {reportStats.men}</p>
                      <p style={{ margin: '5px 0' }}><strong>Mulheres:</strong> {reportStats.women}</p>
                    </div>
                  </div>

                  <h4 style={{ color: 'var(--color-primary)', marginBottom: '10px' }}>Por Onde Está Afecto (Direcção)</h4>
                  <table className="premium-table">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                        <th>Direcção / Local</th>
                        <th>Homens</th>
                        <th>Mulheres</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportStats.directorates.map(dir => (
                        <tr key={dir.name}>
                          <td><strong>{dir.name}</strong></td>
                          <td>{dir.M}</td>
                          <td>{dir.F}</td>
                          <td>{dir.count}</td>
                        </tr>
                      ))}
                      {reportStats.unassignedDir.count > 0 && (
                        <tr>
                          <td><strong>Sem Afetação / Outros</strong></td>
                          <td>{reportStats.unassignedDir.M}</td>
                          <td>{reportStats.unassignedDir.F}</td>
                          <td>{reportStats.unassignedDir.count}</td>
                        </tr>
                      )}
                      <tr style={{ fontWeight: 'bold', borderTop: '2px solid var(--color-primary)' }}>
                        <td>Total Geral</td>
                        <td>{reportStats.men}</td>
                        <td>{reportStats.women}</td>
                        <td>{reportStats.total}</td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 style={{ color: 'var(--color-primary)', marginBottom: '10px' }}>Por Categorias / Carreiras</h4>
                  <table className="premium-table">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                        <th>Carreira / Categoria</th>
                        <th>Homens</th>
                        <th>Mulheres</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportStats.careers.map(car => (
                        <tr key={car.name}>
                          <td><strong>{car.name}</strong></td>
                          <td>{car.M}</td>
                          <td>{car.F}</td>
                          <td>{car.count}</td>
                        </tr>
                      ))}
                      {reportStats.unassignedCareer.count > 0 && (
                        <tr>
                          <td><strong>Sem Carreira</strong></td>
                          <td>{reportStats.unassignedCareer.M}</td>
                          <td>{reportStats.unassignedCareer.F}</td>
                          <td>{reportStats.unassignedCareer.count}</td>
                        </tr>
                      )}
                      <tr style={{ fontWeight: 'bold', borderTop: '2px solid var(--color-primary)' }}>
                        <td>Total Geral</td>
                        <td>{reportStats.men}</td>
                        <td>{reportStats.women}</td>
                        <td>{reportStats.total}</td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 style={{ color: 'var(--color-primary)', marginBottom: '10px' }}>Nível Académico (Prioridade do Sistema)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '30px' }}>
                    {Object.entries(reportStats.academicLevels).map(([lvl, count]) => (
                      <div key={lvl} style={{ border: '1px solid var(--color-border)', padding: '10px', borderRadius: '6px', textAlign: 'center', backgroundColor: 'var(--color-bg-base)' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{count}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{lvl}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECÇÃO DE ASSINATURA */}
                <div style={styles.reportSignatureArea}>
                  <div style={styles.sigLine}></div>
                  <p style={styles.sigName}>{t('report_signature')}</p>
                  <p style={styles.sigRole}>{settings.nome_instituicao} ({settings.sigla})</p>
                </div>

                {/* RODAPÉ DO RELATÓRIO */}
                <div style={styles.reportFooter}>
                  <p>{t('report_address')}</p>
                  <p>{t('report_contact')}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ESTRUTURA ORGANIZACIONAL */}
          {activeTab === 'org_structure' && (
            <OrgStructureManager t={t} />
          )}

          {/* TAB: OUTROS (MÓDULOS EM DESENVOLVIMENTO) */}
          {!['home', 'identity', 'reports', 'org_structure', 'emp_list', 'emp_form', 'emp_import', 'disc_list', 'disc_inspections', 'users_manage', 'users_roles', 'users_permissions', 'users_policies', 'users_audit', 'settings_languages', 'settings_system', 'settings_accounts', 'settings_backup', 'evaluations', 'effectiveness', 'transfers', 'vacations', 'career'].includes(activeTab) && !activeTab.startsWith('admin_acts') && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Módulo em Desenvolvimento</h3>
              <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', lineHeight: '1.6' }}>
                A funcionalidade selecionada encontra-se em fase de implementação. Em breve estarão disponíveis as novas opções de gestão e parametrização.
              </p>
            </div>
          )}

          </ErrorBoundary>
        </div>
      </main>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    transition: 'background-color var(--transition-normal), color var(--transition-normal)',
  },
  sidebar: {
    width: '260px',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-base)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    borderRight: '1px solid var(--color-border)',
    position: 'relative',
    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 40,
  },
  sidebarHeader: {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--color-border)',
  },
  sidebarLogo: {
    width: '40px',
    height: '40px',
    objectFit: 'contain',
    borderRadius: '4px',
  },
  sidebarHeaderText: {
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarSigla: {
    fontSize: '18px',
    fontWeight: '800',
    letterSpacing: '0.5px',
  },
  sidebarDRH: {
    fontSize: '10px',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sidebarNav: {
    flex: 1,
    padding: '20px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    border: 'none',
    color: 'var(--color-text-base)',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
    transition: 'all var(--transition-fast)',
    opacity: 0.85,
    gap: '12px',
  },
  navIcon: {
    width: '18px',
    height: '18px',
  },
  sidebarFooter: {
    padding: '20px',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sidebarUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '15px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  username: {
    fontSize: '13px',
    fontWeight: '600',
  },
  userRole: {
    fontSize: '10px',
    color: 'var(--color-text-muted)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-base)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all var(--transition-fast)',
  },
  logoutIcon: {
    width: '16px',
    height: '16px',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  header: {
    height: '70px',
    backgroundColor: 'var(--color-bg-card)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 30px',
    flexShrink: 0,
    transition: 'background-color var(--transition-normal), border-color var(--transition-normal)',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerLogo: {
    height: '32px',
    objectFit: 'contain',
  },
  institutionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-text-base)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  /* ── Language Selector (Dashboard Header) ── */
  langDropdownHeader: {
    position: 'absolute',
    top: '36px',
    left: '0',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '8px',
    padding: '8px',
    boxShadow: 'var(--shadow-md)',
    zIndex: 10,
    minWidth: '60px',
    border: '1px solid var(--color-border)',
  },
  langBtnHeader: {
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-base)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '20px',
    transition: 'all 0.2s ease',
    letterSpacing: '0.5px',
    backgroundColor: 'var(--color-bg-base)',
  },
  themeToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  headerUserTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--color-bg-base)',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid var(--color-border)',
  },
  roleDot: (isAdmin) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: isAdmin ? 'var(--color-success)' : 'var(--color-text-light)',
  }),
  headerUserRole: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-base)',
  },
  contentArea: {
    padding: '30px',
    flex: 1,
  },
  tabContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  welcomeBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '30px',
    marginBottom: '30px',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
    flexWrap: 'wrap',
    gap: '20px',
  },
  welcomeText: {
    flex: 1,
    minWidth: '280px',
  },
  welcomeTitle: {
    fontSize: '22px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  welcomeDesc: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    lineHeight: '1.6',
  },
  welcomeLogoWrapper: {
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeLogo: {
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: 'var(--color-bg-card)',
    padding: '24px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  statIconWrapper: (bg, color) => ({
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: bg,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '800',
    lineHeight: '1.2',
  },
  statLabel: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '30px',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '20px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px',
  },
  identityStatusBox: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '40px',
  },
  colorPalettePreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '200px',
  },
  colorPreviewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  colorBlock: (colorVar) => ({
    width: '40px',
    height: '30px',
    borderRadius: '6px',
    backgroundColor: colorVar,
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
  }),
  colorLabel: {
    fontSize: '13px',
    fontWeight: '600',
  },
  metaIdentityInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
  },
  sectionHeader: {
    marginBottom: '24px',
  },
  sectionMainTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--color-text-base)',
    marginBottom: '6px',
  },
  sectionMainDesc: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
  },
  warningBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--color-warning)',
    borderLeft: '4px solid var(--color-warning)',
    padding: '16px 20px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--color-success)',
    borderLeft: '4px solid var(--color-success)',
    padding: '16px 20px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
    gap: '30px',
  },
  formCard: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '30px',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formCardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-text-base)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px',
    marginBottom: '5px',
  },
  formRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  formGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '200px',
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-base)',
  },
  formInput: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
  },
  formSelect: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  },
  logoUploadArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '15px',
    border: '2px dashed var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-base)',
  },
  logoPreviewSquare: {
    width: '80px',
    height: '80px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    overflow: 'hidden',
  },
  logoPreviewImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  logoUploadControls: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  uploadBtn: {
    padding: '8px 16px',
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    display: 'inline-block',
  },
  removeLogoBtn: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--color-danger)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    width: 'fit-content',
  },
  uploadDisabledText: {
    fontSize: '12px',
    color: 'var(--color-text-light)',
    fontStyle: 'italic',
  },
  logoUploadTip: {
    fontSize: '11px',
    color: 'var(--color-text-light)',
  },
  colorsRow: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
  },
  colorPickerGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '130px',
  },
  colorPickerWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    backgroundColor: 'var(--color-bg-base)',
  },
  colorInput: {
    border: 'none',
    width: '45px',
    height: '40px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
  colorHexText: {
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--color-text-base)',
    padding: '10px 8px',
    width: '100%',
    fontSize: '14px',
    outline: 'none',
    textTransform: 'uppercase',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '15px',
  },
  saveBtn: {
    padding: '12px 24px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  resetBtn: {
    padding: '12px 24px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-base)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  dbTableCard: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '30px',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
    height: 'fit-content',
  },
  dbCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
    color: 'var(--color-primary)',
  },
  dbCardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-text-base)',
  },
  dbCardDesc: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    marginBottom: '20px',
  },
  tableResponsive: {
    overflowX: 'auto',
  },
  dbTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    textAlign: 'left',
  },
  dbColorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dbColorDot: (color) => ({
    width: '14px',
    height: '14px',
    borderRadius: '3px',
    backgroundColor: color,
    border: '1px solid #718096',
  }),
  logoDataBadge: {
    backgroundColor: '#E2E8F0',
    color: '#4A5568',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'help',
  },
  nullBadge: {
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
  printBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
  reportDocument: {
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-base)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-md)',
    padding: '40px',
    minHeight: '700px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all var(--transition-normal)',
  },
  reportHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    borderBottom: '2px solid',
    paddingBottom: '20px',
    marginBottom: '30px',
  },
  reportHeaderLogo: {
    maxHeight: '70px',
    maxWidth: '70px',
    objectFit: 'contain',
  },
  reportHeaderRight: {
    flex: 1,
  },
  reportTitle: {
    fontSize: '18px',
    fontWeight: '800',
    letterSpacing: '0.5px',
  },
  reportSubtitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-text-base)',
    marginTop: '2px',
  },
  reportDepartment: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.3px',
    marginTop: '2px',
  },
  reportContent: {
    flex: 1,
  },
  docMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginBottom: '20px',
  },
  docTitle: {
    fontSize: '15px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '24px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  docText: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: 'var(--color-text-base)',
    marginBottom: '20px',
    textAlign: 'justify',
  },
  reportTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
    marginBottom: '25px',
    fontSize: '12px',
  },
  reportSignatureArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '50px',
    marginBottom: '40px',
  },
  sigLine: {
    width: '240px',
    borderBottom: '1px solid var(--color-border)',
    marginBottom: '8px',
  },
  sigName: {
    fontSize: '12px',
    fontWeight: '700',
  },
  sigRole: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
  reportFooter: {
    borderTop: '1px solid var(--color-border)',
    paddingTop: '15px',
    textAlign: 'center',
    fontSize: '10px',
    color: 'var(--color-text-muted)',
    lineHeight: '1.5',
  }
};
