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
import BackupCenter from './settings/BackupCenter';
import ActTypesManager from './settings/ActTypesManager';
import CareerManager from './career/CareerManager';
import TransferManager from './transfers/TransferManager';
import VacationManager from './vacations/VacationManager';
import ErrorBoundary from './common/ErrorBoundary';
import { isPrimaryCentralAdmin, isCentralUser, filterByProvincialScope } from '../utils/scopeUtils';

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

  const [reportViewLevel, setReportViewLevel] = useState('directorates'); // 'directorates' | 'departments' | 'divisions' | 'sections' | 'districts'
  const [selectedReportDirectorate, setSelectedReportDirectorate] = useState('ALL');
  const [selectedReportDepartment, setSelectedReportDepartment] = useState('ALL');
  const [selectedReportDivision, setSelectedReportDivision] = useState('ALL');
  const [selectedReportSection, setSelectedReportSection] = useState('ALL');
  const [selectedReportDistrict, setSelectedReportDistrict] = useState('ALL');
  const [searchReportText, setSearchReportText] = useState('');

  const { employees } = useEmployeeData();
  const { data: orgData } = useOrgData();
  const { actTypes } = useActTypesData();

  const userDirectorate = React.useMemo(() => {
    if (!user || isCentralUser(user)) return null;
    return (orgData?.directorates || []).find(d => String(d.id) === String(user.directorateId));
  }, [user, orgData]);

  const reportStats = React.useMemo(() => {
    const isCentral = isCentralUser(user);
    const effectiveEmployees = !isCentral
      ? filterByProvincialScope(employees, user, orgData)
      : employees;

    const total = effectiveEmployees.length;
    const active = effectiveEmployees.filter(e => e.isActive !== false).length;
    const inactive = total - active;
    const men = effectiveEmployees.filter(e => e.gender === 'M' || e.gender === 'Masculino').length;
    const women = effectiveEmployees.filter(e => e.gender === 'F' || e.gender === 'Feminino').length;

    // Helper para normalizar o nome da direcção e eliminar duplicados de ortografia/nomenclatura
    const getCanonicalDirName = (rawName) => {
      if (!rawName) return '';
      let norm = rawName.trim().replace(/^Direção\b/i, 'Direcção');
      const lower = norm.toLowerCase();

      if (
        lower.includes('cidade de maputo') ||
        lower.includes('maputo cidade')
      ) {
        return 'Direcção da Cidade de Maputo';
      }

      if (
        lower.includes('maputo província') ||
        lower.includes('maputo provincia')
      ) {
        return 'Direcção Provincial de Maputo';
      }

      if (lower === 'direcção provincial de zambézia' || lower === 'direção provincial de zambézia') {
        return 'Direcção Provincial da Zambézia';
      }

      return norm;
    };

    const dirIdToCanonicalKey = {};

    const userDirId = user?.directorateId ? String(user.directorateId) : null;
    const userDir = userDirId ? (orgData?.directorates || []).find(d => String(d.id) === userDirId) : null;
    const userProvince = (userDir?.province || userDir?.name || '').toLowerCase();

    // 1. Distribution by Directorate (Filtrado por Província se secundário)
    const byDirectorate = {};
    const filteredDirectorates = (!isCentral && userDirId)
      ? (orgData?.directorates || []).filter(d => String(d.id) === userDirId)
      : (orgData?.directorates || []);

    if (filteredDirectorates) {
      filteredDirectorates.forEach(d => {
        const canonicalName = getCanonicalDirName(d.name);
        const key = canonicalName.toLowerCase();
        dirIdToCanonicalKey[String(d.id)] = key;

        const childDistricts = (orgData && orgData.districtDirectorates) 
          ? orgData.districtDirectorates.filter(dist => String(dist.provincialDirectorateId) === String(d.id))
          : [];

        if (!byDirectorate[key]) {
          byDirectorate[key] = { 
            id: String(d.id), 
            ids: [String(d.id)],
            name: canonicalName, 
            count: 0, M: 0, F: 0, 
            employees: [],
            districtDirectorates: [...childDistricts]
          };
        } else {
          byDirectorate[key].ids.push(String(d.id));
          childDistricts.forEach(dist => {
            if (!byDirectorate[key].districtDirectorates.some(existing => String(existing.id) === String(dist.id))) {
              byDirectorate[key].districtDirectorates.push(dist);
            }
          });
        }
      });
    }
    let unassignedDir = { id: 'unassigned', ids: ['unassigned'], name: 'Sem Afetação / Outros', count: 0, M: 0, F: 0, employees: [], districtDirectorates: [] };

    // 2. Distribution by Department (Filtrado por Província se secundário)
    const byDepartment = {};
    const filteredDepartments = (!isCentral && userDirId)
      ? (orgData?.departments || []).filter(dep => String(dep.directorateId) === userDirId)
      : (orgData?.departments || []);

    if (filteredDepartments) {
      filteredDepartments.forEach(dep => {
        const idStr = String(dep.id);
        const parentDir = orgData.directorates ? orgData.directorates.find(d => String(d.id) === String(dep.directorateId)) : null;
        byDepartment[idStr] = {
          id: idStr,
          name: dep.name,
          directorateId: dep.directorateId ? String(dep.directorateId) : null,
          directorateName: parentDir ? parentDir.name : 'Direcção Geral / Central',
          count: 0, M: 0, F: 0, employees: []
        };
      });
    }
    let unassignedDep = { id: 'unassigned', name: 'Sem Departamento Especificado', count: 0, M: 0, F: 0, employees: [] };

    // 3. Distribution by Division (Repartição) (Filtrado por Província se secundário)
    const byDivision = {};
    const allowedDeptIds = new Set(filteredDepartments.map(d => String(d.id)));
    const filteredDivisions = (!isCentral && userDirId)
      ? (orgData?.divisions || []).filter(div => String(div.directorateId) === userDirId || allowedDeptIds.has(String(div.departmentId)))
      : (orgData?.divisions || []);

    if (filteredDivisions) {
      filteredDivisions.forEach(div => {
        const idStr = String(div.id);
        const parentDep = orgData.departments ? orgData.departments.find(d => String(d.id) === String(div.departmentId)) : null;
        const parentDir = orgData.directorates ? orgData.directorates.find(d => String(d.id) === String(div.directorateId || (parentDep ? parentDep.directorateId : null))) : null;
        byDivision[idStr] = {
          id: idStr,
          name: div.name,
          departmentId: div.departmentId ? String(div.departmentId) : null,
          departmentName: parentDep ? parentDep.name : 'Departamento N/A',
          directorateId: div.directorateId ? String(div.directorateId) : (parentDep && parentDep.directorateId ? String(parentDep.directorateId) : null),
          directorateName: parentDir ? parentDir.name : 'Direcção N/A',
          count: 0, M: 0, F: 0, employees: []
        };
      });
    }
    let unassignedDiv = { id: 'unassigned', name: 'Sem Repartição Especificada', count: 0, M: 0, F: 0, employees: [] };

    // Helper para padronizar nomes das Direcções Distritais
    const formatDistrictName = (rawName) => {
      if (!rawName) return '';
      const trimmed = rawName.trim();
      if (/^Direcçã?o\s+Distrital/i.test(trimmed)) {
        return trimmed.replace(/^Direção\b/i, 'Direcção');
      }
      const lower = trimmed.toLowerCase();
      if (['matola', 'beira', 'manhiça', 'namaacha', 'mavia', 'maganja da costa'].includes(lower) || lower.startsWith('ilha ') || lower.startsWith('cidade ')) {
        return `Direcção Distrital da ${trimmed}`;
      }
      return `Direcção Distrital de ${trimmed}`;
    };

    // 5. Distribution by District (Direcções Distritais) (Filtrado por Província se secundário)
    const byDistrict = {};
    const filteredDistricts = (!isCentral && userDirId)
      ? (orgData?.districtDirectorates || []).filter(dist => {
          const provMatch = String(dist.provincialDirectorateId || dist.directorateId || '') === userDirId;
          const provNameMatch = userProvince && dist.province && userProvince.includes(dist.province.toLowerCase());
          return provMatch || provNameMatch;
        })
      : (orgData?.districtDirectorates || []);

    if (filteredDistricts) {
      filteredDistricts.forEach(dist => {
        const idStr = String(dist.id);
        const parentProv = orgData.directorates ? orgData.directorates.find(d => String(d.id) === String(dist.provincialDirectorateId)) : null;
        const districtSecs = orgData.sections ? orgData.sections.filter(sec => String(sec.districtDirectorateId || sec.districtId) === idStr) : [];
        byDistrict[idStr] = {
          id: idStr,
          name: formatDistrictName(dist.name),
          provincialDirectorateId: dist.provincialDirectorateId ? String(dist.provincialDirectorateId) : null,
          provinceName: parentProv ? parentProv.name : 'Província N/A',
          sections: districtSecs,
          count: 0, M: 0, F: 0, employees: []
        };
      });
    }
    let unassignedDist = { id: 'unassigned', name: 'Sem Afetação Distrital', count: 0, M: 0, F: 0, employees: [] };

    // 4. Distribution by Section (Secção) (Filtrado por Província se secundário)
    const bySection = {};
    const allowedDivIds = new Set(filteredDivisions.map(d => String(d.id)));
    const allowedDistIds = new Set(filteredDistricts.map(d => String(d.id)));
    const filteredSections = (!isCentral && userDirId)
      ? (orgData?.sections || []).filter(sec => 
          String(sec.directorateId) === userDirId || 
          allowedDeptIds.has(String(sec.departmentId)) || 
          allowedDivIds.has(String(sec.divisionId)) ||
          allowedDistIds.has(String(sec.districtDirectorateId || sec.districtId))
        )
      : (orgData?.sections || []);

    if (filteredSections) {
      filteredSections.forEach(sec => {
        const idStr = String(sec.id);
        const parentDiv = orgData.divisions ? orgData.divisions.find(d => String(d.id) === String(sec.divisionId)) : null;
        const parentDep = orgData.departments ? orgData.departments.find(d => String(d.id) === String(sec.departmentId || (parentDiv ? parentDiv.departmentId : null))) : null;
        const parentDir = orgData.directorates ? orgData.directorates.find(d => String(d.id) === String(sec.directorateId || (parentDep ? parentDep.directorateId : null))) : null;
        const parentDist = orgData.districtDirectorates ? orgData.districtDirectorates.find(d => String(d.id) === String(sec.districtDirectorateId || sec.districtId)) : null;
        bySection[idStr] = {
          id: idStr,
          name: sec.name,
          divisionId: sec.divisionId ? String(sec.divisionId) : null,
          divisionName: parentDiv ? parentDiv.name : 'Repartição N/A',
          departmentId: sec.departmentId ? String(sec.departmentId) : (parentDiv && parentDiv.departmentId ? String(parentDiv.departmentId) : null),
          departmentName: parentDep ? parentDep.name : 'Departamento N/A',
          directorateId: sec.directorateId ? String(sec.directorateId) : (parentDep && parentDep.directorateId ? String(parentDep.directorateId) : null),
          directorateName: parentDir ? parentDir.name : 'Direcção N/A',
          districtDirectorateId: sec.districtDirectorateId || sec.districtId ? String(sec.districtDirectorateId || sec.districtId) : null,
          districtDirectorateName: parentDist ? parentDist.name : null,
          count: 0, M: 0, F: 0, employees: []
        };
      });
    }
    let unassignedSec = { id: 'unassigned', name: 'Sem Secção Especificada', count: 0, M: 0, F: 0, employees: [] };

    // 6. Distribution by Career
    const byCareer = {};
    if (orgData && orgData.careers) {
      orgData.careers.forEach(c => {
        const idStr = String(c.id);
        byCareer[idStr] = { id: idStr, name: c.name, count: 0, M: 0, F: 0, employees: [] };
      });
    }
    let unassignedCareer = { id: 'unassigned', name: 'Sem Carreira', count: 0, M: 0, F: 0, employees: [] };

    // 7. Distribution by Academic Level
    const academicLevels = {
      'Ensino Básico': 0,
      'Ensino Médio': 0,
      'Licenciatura': 0,
      'Mestrado': 0,
      'Doutoramento': 0,
      'Outro': 0
    };

    effectiveEmployees.forEach(emp => {
      const isM = emp.gender === 'M' || emp.gender === 'Masculino';
      const isF = emp.gender === 'F' || emp.gender === 'Feminino';

      // Directorate
      const dId = emp.directorateId ? String(emp.directorateId) : null;
      let dirKey = dId ? dirIdToCanonicalKey[dId] : null;
      if (!dirKey && emp.directorate) {
        dirKey = getCanonicalDirName(emp.directorate).toLowerCase();
      }

      if (dirKey && byDirectorate[dirKey]) {
        byDirectorate[dirKey].count++;
        byDirectorate[dirKey].employees.push(emp);
        if (isM) byDirectorate[dirKey].M++;
        if (isF) byDirectorate[dirKey].F++;
      } else {
        unassignedDir.count++;
        unassignedDir.employees.push(emp);
        if (isM) unassignedDir.M++;
        if (isF) unassignedDir.F++;
      }

      // Department
      const depId = emp.departmentId ? String(emp.departmentId) : null;
      if (depId && byDepartment[depId]) {
        byDepartment[depId].count++;
        byDepartment[depId].employees.push(emp);
        if (isM) byDepartment[depId].M++;
        if (isF) byDepartment[depId].F++;
      } else {
        unassignedDep.count++;
        unassignedDep.employees.push(emp);
        if (isM) unassignedDep.M++;
        if (isF) unassignedDep.F++;
      }

      // Division (Repartição)
      const divId = emp.divisionId || emp.reparticaoId ? String(emp.divisionId || emp.reparticaoId) : null;
      if (divId && byDivision[divId]) {
        byDivision[divId].count++;
        byDivision[divId].employees.push(emp);
        if (isM) byDivision[divId].M++;
        if (isF) byDivision[divId].F++;
      } else {
        unassignedDiv.count++;
        unassignedDiv.employees.push(emp);
        if (isM) unassignedDiv.M++;
        if (isF) unassignedDiv.F++;
      }

      // Section (Secção)
      const secId = emp.sectionId || emp.seccaoId ? String(emp.sectionId || emp.seccaoId) : null;
      if (secId && bySection[secId]) {
        bySection[secId].count++;
        bySection[secId].employees.push(emp);
        if (isM) bySection[secId].M++;
        if (isF) bySection[secId].F++;
      } else {
        unassignedSec.count++;
        unassignedSec.employees.push(emp);
        if (isM) unassignedSec.M++;
        if (isF) unassignedSec.F++;
      }

      // District
      const distId = emp.districtDirectorateId ? String(emp.districtDirectorateId) : null;
      if (distId && byDistrict[distId]) {
        byDistrict[distId].count++;
        byDistrict[distId].employees.push(emp);
        if (isM) byDistrict[distId].M++;
        if (isF) byDistrict[distId].F++;
      } else {
        unassignedDist.count++;
        unassignedDist.employees.push(emp);
        if (isM) unassignedDist.M++;
        if (isF) unassignedDist.F++;
      }

      // Career
      const cId = emp.careerId ? String(emp.careerId) : null;
      if (cId && byCareer[cId]) {
        byCareer[cId].count++;
        byCareer[cId].employees.push(emp);
        if (isM) byCareer[cId].M++;
        if (isF) byCareer[cId].F++;
      } else {
        unassignedCareer.count++;
        unassignedCareer.employees.push(emp);
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
    const allDirectoratesList = Object.values(byDirectorate).sort((a,b) => a.name.localeCompare(b.name));
    const provincialDirectoratesList = allDirectoratesList.filter(d => {
      const nameLower = d.name.toLowerCase();
      return nameLower.includes('provincial') || 
             nameLower.includes('cidade de maputo') || 
             nameLower.includes('geral') ||
             (d.districtDirectorates && d.districtDirectorates.length > 0);
    }).sort((a,b) => a.name.localeCompare(b.name));

    const activeDepartments = Object.values(byDepartment).filter(d => d.count > 0).sort((a,b) => b.count - a.count);
    const allDepartmentsList = Object.values(byDepartment).sort((a,b) => b.count - a.count);

    const activeDivisions = Object.values(byDivision).filter(d => d.count > 0).sort((a,b) => b.count - a.count);
    const allDivisionsList = Object.values(byDivision).sort((a,b) => b.count - a.count);

    const activeSections = Object.values(bySection).filter(s => s.count > 0).sort((a,b) => b.count - a.count);
    const allSectionsList = Object.values(bySection).sort((a,b) => b.count - a.count);

    const activeDistricts = Object.values(byDistrict).filter(d => d.count > 0).sort((a,b) => b.count - a.count);
    const allDistrictsList = Object.values(byDistrict).sort((a,b) => b.count - a.count);

    const activeCareers = Object.values(byCareer).filter(c => c.count > 0).sort((a,b) => b.count - a.count);

    return {
      total,
      active,
      inactive,
      men,
      women,
      directorates: activeDirectorates,
      allDirectoratesList,
      provincialDirectoratesList,
      unassignedDir,
      departments: activeDepartments,
      allDepartmentsList,
      unassignedDep,
      divisions: activeDivisions,
      allDivisionsList,
      unassignedDiv,
      sections: activeSections,
      allSectionsList,
      unassignedSec,
      districts: activeDistricts,
      allDistrictsList,
      unassignedDist,
      careers: activeCareers,
      unassignedCareer,
      academicLevels,
      isScopedToProvince: !isCentral,
      userDirectorateName: userDir?.name || 'Direcção Local'
    };
  }, [employees, orgData, user]);

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  // Foto de perfil persistida no localStorage ou vinda do utilizador
  const [profilePhoto, setProfilePhoto] = useState(() => {
    return localStorage.getItem('sernic_user_photo_' + (user?.username || 'admin')) || user?.photo || null;
  });

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setProfilePhoto(base64);
      localStorage.setItem('sernic_user_photo_' + (user?.username || 'admin'), base64);
    };
    reader.readAsDataURL(file);
  };

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null, isDestructive: false });

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setShowLangMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
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
  const userDisplayName = user?.name || (user?.username ? user.username.toUpperCase() : 'ADMINISTRADOR');
  const userRoleDisplay = isSuperAdmin 
    ? 'Super Administrador Principal' 
    : (user?.roleName || user?.role || 'Utilizador do Sistema');
  const userDirectorateDisplay = userDirectorate?.name || 'Direcção Geral (DRH)';

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

  const getReportAddress = () => {
    let activeDir = null;
    if (reportStats.isScopedToProvince && reportStats.userDirectorateName) {
      activeDir = reportStats.userDirectorateName;
    } else if (selectedReportDirectorate && selectedReportDirectorate !== 'ALL' && selectedReportDirectorate !== 'unassigned') {
      const dirObj = (reportStats.directorates || []).find(d => String(d.id) === String(selectedReportDirectorate)) ||
                     (reportStats.allDirectoratesList || []).find(d => String(d.id) === String(selectedReportDirectorate));
      if (dirObj) activeDir = dirObj.name;
    }

    if (!activeDir) {
      return t('report_address');
    }

    const norm = activeDir.toLowerCase();
    if (norm.includes('geral') || norm.includes('cidade de maputo')) {
      return t('report_address');
    }

    return `${activeDir} - Moçambique`;
  };

  const getReportContact = () => {
    let activeDir = null;
    if (reportStats.isScopedToProvince && reportStats.userDirectorateName) {
      activeDir = reportStats.userDirectorateName;
    } else if (selectedReportDirectorate && selectedReportDirectorate !== 'ALL' && selectedReportDirectorate !== 'unassigned') {
      const dirObj = (reportStats.directorates || []).find(d => String(d.id) === String(selectedReportDirectorate)) ||
                     (reportStats.allDirectoratesList || []).find(d => String(d.id) === String(selectedReportDirectorate));
      if (dirObj) activeDir = dirObj.name;
    }

    const norm = (activeDir || '').toLowerCase();
    if (!activeDir || norm.includes('geral') || norm.includes('cidade de maputo')) {
      return t('report_contact');
    }

    return 'Email: contacto@sernic.gov.mz';
  };

  const getNavItemStyle = (isActive, isSub = false) => ({
    ...styles.navItem,
    backgroundColor: isActive ? 'rgba(27, 54, 93, 0.08)' : 'transparent',
    color: isActive ? 'var(--color-primary, #1B365D)' : 'var(--color-text-base)',
    fontWeight: isActive ? '700' : '500',
    borderLeft: isActive ? '3.5px solid var(--color-primary, #1B365D)' : '3.5px solid transparent',
    paddingLeft: isSub ? '36px' : '14px',
    boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.03)' : 'none',
  });

  return (
    <div style={styles.appContainer}>
      {/* SIDEBAR LATERAL (Oculta na impressão) */}
      <aside className="no-print" style={{ ...styles.sidebar, marginLeft: isSidebarOpen ? '0' : '-260px' }}>
        <div style={styles.sidebarHeader}>
          {settings.logotipo ? (
            <img src={settings.logotipo} alt="Logo SERNIC" style={styles.sidebarLogo} />
          ) : (
            <img src={SERNIC_LOGO_B64} alt="Logo SERNIC Padrão" style={{ ...styles.sidebarLogo, width: '42px', height: '42px' }} />
          )}
          <div style={styles.sidebarHeaderText}>
            <span style={styles.sidebarSigla}>{settings.sigla}</span>
            <span style={styles.sidebarDRH}>{t('sidebar_hr')}</span>
          </div>
        </div>

        <nav style={styles.sidebarNav}>
          <button 
            onClick={() => handleTabChange('home')}
            style={getNavItemStyle(activeTab === 'home')}
          >
            <svg style={{ ...styles.navIcon, color: activeTab === 'home' ? 'var(--color-primary, #1B365D)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            {t('menu_home')}
          </button>
          
          <button 
            onClick={() => handleTabChange('reports')}
            style={getNavItemStyle(activeTab === 'reports')}
          >
            <svg style={{ ...styles.navIcon, color: activeTab === 'reports' ? 'var(--color-primary, #1B365D)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            {t('menu_reports')}
          </button>

          {/* Menu Contencioso Laboral */}
          <button 
            onClick={() => handleTabChange('disciplinary')}
            style={getNavItemStyle(activeTab === 'disciplinary')}
          >
            <svg style={{ ...styles.navIcon, color: activeTab === 'disciplinary' ? 'var(--color-primary, #1B365D)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Contencioso Laboral
          </button>

          {/* Menu Efetividade */}
          <button 
            onClick={() => handleTabChange('effectiveness')}
            style={getNavItemStyle(activeTab === 'effectiveness')}
          >
            <svg style={{ ...styles.navIcon, color: activeTab === 'effectiveness' ? 'var(--color-primary, #1B365D)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Efetividade
          </button>

          {/* Menu Gestão de Desempenho Individual */}
          <button 
            onClick={() => handleTabChange('evaluations')}
            style={getNavItemStyle(activeTab === 'evaluations')}
          >
            <svg style={{ ...styles.navIcon, color: activeTab === 'evaluations' ? 'var(--color-primary, #1B365D)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-6M6 20V10M18 20V4" /><circle cx="12" cy="10" r="2" /><circle cx="6" cy="6" r="2" /><circle cx="18" cy="16" r="2" /></svg>
            Gestão de Desempenho Individual
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
                   ...(isPrimaryCentralAdmin(user) ? [{ id: 'career', label: 'Promoção e Progressão', icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path> }] : []),
                 ...Object.keys(
                   (Array.isArray(actTypes) ? actTypes : []).reduce((acc, act) => {
                     if ((act.is_active || act.isActive !== false) && act.group_name) {
                       acc[act.group_name] = true;
                     }
                     return acc;
                   }, {
                     'Férias e Licenças': true,
                     'Mudança de Carreira': true,
                     'Provimento e Cessação': true,
                     'Reserva e Reforma': true,
                     'Saúde e Óbitos': true,
                     'Transferências e Mobilidade': true
                   })
                 )
                   .filter(group => group && group !== 'Promoção e Progressão' && group !== 'Processos Disciplinares')
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
                       ...getNavItemStyle(activeTab === item.id, true),
                       fontSize: '13px',
                       position: 'relative'
                     }}
                   >
                     <div style={{ position: 'absolute', left: '32px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                     <span style={{ fontWeight: activeTab === item.id ? '700' : '400', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <svg style={{ width: '14px', height: '14px', color: activeTab === item.id ? 'var(--color-primary, #1B365D)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

                 {[
                   { id: 'emp_list', label: 'Visualizar Funcionários', icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path> },
                   { id: 'emp_form', label: 'Cadastrar Funcionário', icon: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path> },
                   { id: 'emp_import', label: 'Carregar e Importar', icon: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path> },
                   { id: 'emp_deleted', label: 'Funcionários Eliminados', icon: <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path> }
                 ].map(item => (
                   <button 
                     key={item.id}
                     onClick={() => handleTabChange(item.id)}
                     style={{
                       ...getNavItemStyle(activeTab === item.id, true),
                       fontSize: '13px',
                       position: 'relative'
                     }}
                   >
                     <div style={{ position: 'absolute', left: '32px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                     <span style={{ fontWeight: activeTab === item.id ? '700' : '400', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <svg style={{ width: '14px', height: '14px', color: activeTab === item.id ? 'var(--color-primary, #1B365D)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                         {item.icon}
                       </svg>
                       {item.label}
                     </span>
                   </button>
                 ))}
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

                 {/* Personalização — Visível APENAS para os 3 Administradores Primários Centrais */}
                  {isPrimaryCentralAdmin(user) && (
                    <>
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
                    </>
                  )}

                  {/* Utilizadores e Acessos - Protegido por RBAC */}
                  <PermissionGuard module="Acessos" action="Visualizar">
                     <button onClick={() => toggleSubMenu('acessos')} style={{ ...styles.navItem, padding: '10px 16px 10px 36px', justifyContent: 'space-between', opacity: 0.9, borderLeft: 'none', fontSize: '13px', position: 'relative', backgroundColor: expandedSubMenu === 'acessos' ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                       <div style={{ position: 'absolute', left: '26px', top: '50%', width: '6px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                         <svg style={{ width: '15px', height: '15px', color: 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                         <span style={{ fontWeight: '600' }}>{t('menu_users_access') || 'Utilizadores e Acessos'}</span>
                       </div>
                       <svg style={{ width: '14px', height: '14px', color: 'var(--color-text-muted)', transition: 'transform 0.3s ease', transform: expandedSubMenu === 'acessos' ? 'rotate(180deg)' : 'rotate(0)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                     </button>
                  </PermissionGuard>

                  {expandedSubMenu === 'acessos' && (
                     <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                       <div style={{ position: 'absolute', left: '46px', top: '0', bottom: '20px', width: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>

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
                             ...getNavItemStyle(activeTab === item.id, true),
                             paddingLeft: '56px',
                             fontSize: '13px',
                             position: 'relative'
                           }}
                         >
                           <div style={{ position: 'absolute', left: '46px', top: '50%', width: '6px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                           <span style={{ fontWeight: activeTab === item.id ? '700' : '400', display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <svg style={{ width: '14px', height: '14px', color: activeTab === item.id ? 'var(--color-primary, #1B365D)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle></svg>
                             {t(`menu_${item.id}`) || item.label}
                           </span>
                         </button>
                       ))}
                     </div>
                   )}

                  {/* Idiomas */}
                  <button 
                    onClick={() => handleTabChange('settings_languages')}
                    style={{ 
                      ...getNavItemStyle(activeTab === 'settings_languages', true),
                      fontSize: '13px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', left: '26px', top: '50%', width: '6px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg style={{ width: '15px', height: '15px', color: activeTab === 'settings_languages' ? 'var(--color-primary, #1B365D)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                      <span style={{ fontWeight: activeTab === 'settings_languages' ? '700' : '400' }}>{t('menu_settings_languages') || 'Idiomas e Região'}</span>
                    </div>
                  </button>

                  {/* Sistema */}
                  <button 
                    onClick={() => handleTabChange('settings_system')}
                    style={{ 
                      ...getNavItemStyle(activeTab === 'settings_system', true),
                      fontSize: '13px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', left: '26px', top: '50%', width: '6px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg style={{ width: '15px', height: '15px', color: activeTab === 'settings_system' ? 'var(--color-primary, #1B365D)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                      <span style={{ fontWeight: activeTab === 'settings_system' ? '700' : '400' }}>{t('menu_settings_system') || 'Sistema'}</span>
                    </div>
                  </button>

                  {/* Central de Backup */}
                  <button 
                    onClick={() => handleTabChange('settings_backup')}
                    style={{ 
                      ...getNavItemStyle(activeTab === 'settings_backup', true),
                      fontSize: '13px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', left: '26px', top: '50%', width: '6px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg style={{ width: '15px', height: '15px', color: activeTab === 'settings_backup' ? 'var(--color-primary, #1B365D)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      <span style={{ fontWeight: activeTab === 'settings_backup' ? '700' : '400' }}>Central de Backup</span>
                    </div>
                  </button>

                  {/* Tipos de Acto — Visível APENAS para os 3 Administradores Primários Centrais */}
                  {isPrimaryCentralAdmin(user) && (
                    <button 
                      onClick={() => handleTabChange('settings_act_types')}
                      style={{ 
                        ...getNavItemStyle(activeTab === 'settings_act_types', true),
                        fontSize: '13px',
                        position: 'relative',
                      }}
                    >
                      <div style={{ position: 'absolute', left: '32px', top: '50%', width: '8px', height: '1px', backgroundColor: 'var(--color-border)', zIndex: 1 }}></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg style={{ width: '15px', height: '15px', color: activeTab === 'settings_act_types' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        <span style={{ fontWeight: activeTab === 'settings_act_types' ? '600' : '400' }}>Tipos de Actos</span>
                      </div>
                    </button>
                  )}
              </div>
            )}
          </div>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.sidebarUser}>
            {profilePhoto ? (
              <img 
                src={profilePhoto} 
                alt="Avatar" 
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: '2px solid rgba(255,255,255,0.2)',
                  flexShrink: 0
                }} 
              />
            ) : (
              <div style={styles.userBadge}>
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={styles.userInfo}>
              <div style={styles.username}>{userDisplayName}</div>
              <div style={styles.userRole}>
                {userRoleDisplay}
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
                <img src={settings.logotipo} alt="Logo" style={{ ...styles.headerLogo, width: '42px', height: '42px' }} />
              ) : (
                <img src={SERNIC_LOGO_B64} alt="Logo Padrão" style={{ ...styles.headerLogo, width: '42px', height: '42px' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 style={{ ...styles.institutionTitle, margin: 0, fontSize: '13px', color: 'var(--color-text-muted, #64748b)', fontWeight: '600', lineHeight: '1.2' }}>
                  {settings.nome_instituicao} ({settings.sigla})
                </h2>
                {userDirectorate && (
                  <span style={{ 
                    fontSize: '20px', 
                    fontWeight: '800', 
                    color: 'var(--color-primary, #1B365D)', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    marginTop: '2px',
                    lineHeight: '1.2'
                  }}>
                    {userDirectorate.name.toUpperCase()}
                  </span>
                )}
              </div>
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
                updateSettings({ ...settings, modo_tema: settings.modo_tema === 'light' ? 'dark' : 'light', usuario_responsavel: user?.username || 'Utilizador' });
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

            {/* Perfil do Administrador Moderno e Sofisticado */}
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'var(--color-bg-base)',
                  padding: '4px 14px 4px 6px',
                  borderRadius: '30px',
                  border: showProfileMenu ? '1.5px solid var(--color-primary, #1B365D)' : '1px solid var(--color-border)',
                  boxShadow: showProfileMenu 
                    ? '0 0 0 3px rgba(27, 54, 93, 0.12), 0 4px 12px rgba(0,0,0,0.06)' 
                    : '0 2px 6px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary, #1B365D)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  if (!showProfileMenu) {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                  }
                }}
                title="Perfil do Utilizador"
              >
                {/* Foto / Avatar com Status Indicator */}
                <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                  {profilePhoto ? (
                    <img 
                      src={profilePhoto} 
                      alt="Foto de Perfil" 
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--color-primary, #1B365D)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }} 
                    />
                  ) : (
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isSuperAdmin 
                        ? 'linear-gradient(135deg, #1B365D 0%, #2563eb 100%)' 
                        : 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '14px',
                      letterSpacing: '0.5px',
                      boxShadow: '0 2px 5px rgba(27, 54, 93, 0.25)',
                      border: '1.5px solid rgba(255,255,255,0.7)'
                    }}>
                      {userDisplayName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Indicador Activo com Brilho Suave */}
                  <span style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    border: '2px solid var(--color-bg-base, #ffffff)',
                    boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)'
                  }}></span>
                </div>

                {/* Nome e Cargo / Função */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: '1.2' }}>
                  <div style={{ 
                    fontSize: '12.5px', 
                    fontWeight: '700', 
                    color: 'var(--color-text-base)', 
                    maxWidth: '160px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {userDisplayName}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    marginTop: '2px'
                  }}>
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: isSuperAdmin ? 'rgba(16, 185, 129, 0.12)' : 'rgba(27, 54, 93, 0.08)',
                      color: isSuperAdmin ? '#047857' : 'var(--color-primary, #1B365D)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      fontWeight: '800'
                    }}>
                      {isSuperAdmin ? 'SUPER ADMIN' : 'USER'}
                    </span>
                    <span style={{
                      color: 'var(--color-text-muted)',
                      fontSize: '11px',
                      fontWeight: '500',
                      maxWidth: '140px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {userRoleDisplay}
                    </span>
                  </div>
                </div>

                {/* Seta / Chevron */}
                <svg 
                  width="13" 
                  height="13" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{
                    color: 'var(--color-text-muted)',
                    transition: 'transform 0.2s ease',
                    transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                    marginLeft: '4px'
                  }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Menu Dropdown Sofisticado */}
              {showProfileMenu && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: '0',
                  width: '290px',
                  backgroundColor: 'var(--color-bg-card)',
                  borderRadius: '16px',
                  padding: '18px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0,0,0,0.06)',
                  border: '1px solid var(--color-border)',
                  zIndex: 1000,
                  backdropFilter: 'blur(10px)',
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  {/* Cabeçalho do Perfil com Avatar Grande e Troca de Foto */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ position: 'relative', width: '52px', height: '52px', flexShrink: 0 }}>
                      {profilePhoto ? (
                        <img 
                          src={profilePhoto} 
                          alt="Foto" 
                          style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary, #1B365D)' }} 
                        />
                      ) : (
                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #1B365D 0%, #2563eb 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '20px'
                        }}>
                          {userDisplayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Botão de Upload com Ícone de Câmara */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Carregar nova foto"
                        style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary, #1B365D)',
                          color: '#ffffff',
                          border: '2px solid var(--color-bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-base)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {userDisplayName}
                      </span>
                      <span style={{ fontSize: '11.5px', fontWeight: '600', color: isSuperAdmin ? '#059669' : 'var(--color-primary, #1B365D)', marginTop: '2px' }}>
                        {userRoleDisplay}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {userDirectorateDisplay}
                      </span>
                    </div>
                  </div>

                  {/* Input invisível para carregar foto */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />

                  {/* Detalhes Institucionais */}
                  <div style={{ backgroundColor: 'var(--color-bg-base)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Utilizador / NUIT:</span>
                      <span style={{ fontWeight: '600', color: 'var(--color-text-base)' }}>{user?.username || 'admin'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Sessão de Acesso:</span>
                      <span style={{ fontWeight: '600', color: '#10B981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                        Protegida & Activa
                      </span>
                    </div>
                  </div>

                  {/* Ação de Logout */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        color: '#EF4444',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      {t('menu_logout')}
                    </button>
                  </div>
                </div>
              )}
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
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <PermissionGuard module="Avaliação de Desempenho" action="Visualizar" showLockCard={true}>
                <EvaluationManager user={user} />
              </PermissionGuard>
            </div>
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
              <DisciplinaryManager 
                orgData={{ data: orgData }} 
                employeesData={{ employees }} 
                user={user}
                onNavigateTab={handleTabChange}
              />
            </div>
          )}



          {/* TAB EFETIVIDADE */}
          {activeTab === 'effectiveness' && (
            <div className="animate-fade-in" style={{...styles.tabContainer, padding: 0}}>
              <EffectivenessManager 
                user={user}
                orgData={{ data: orgData }}
                employeesData={{ employees }}
              />
            </div>
          )}

          {/* TAB PROMOÇÃO E PROGRESSÃO */}
          {activeTab === 'career' && isPrimaryCentralAdmin(user) && (
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
            <div className="animate-fade-in" style={{...styles.tabContainer, maxWidth: '1400px', padding: 0}}>
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

                  {/* RESUMO GERAL E GÉNERO SIMPLIFICADOS */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px', marginTop: '16px' }}>
                    <div style={{ border: '1px solid var(--color-border)', padding: '16px', borderRadius: '10px', backgroundColor: 'var(--color-bg-base)', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary, #1B365D)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📊 Resumo Geral
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Total de Funcionários:</span>
                        <strong style={{ fontSize: '18px', color: 'var(--color-text-main)' }}>{reportStats.total}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                        <span>Ativos: <strong style={{ color: '#16a34a' }}>{reportStats.active}</strong></span>
                        <span>•</span>
                        <span>Inativos: <strong style={{ color: '#dc2626' }}>{reportStats.inactive}</strong></span>
                      </div>
                    </div>

                    <div style={{ border: '1px solid var(--color-border)', padding: '16px', borderRadius: '10px', backgroundColor: 'var(--color-bg-base)', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary, #1B365D)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        👥 Distribuição por Género
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '42px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Homens: </span>
                          <strong style={{ fontSize: '16px', color: 'var(--color-primary, #1B365D)' }}>{reportStats.men}</strong>
                        </div>
                        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)' }}></div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Mulheres: </span>
                          <strong style={{ fontSize: '16px', color: '#db2777' }}>{reportStats.women}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AVISO DE ESCOPO PROVINCIAL (QUANDO PERFIL SECUNDÁRIO) */}
                  {reportStats.isScopedToProvince && (
                    <div style={{
                      padding: '10px 16px',
                      backgroundColor: 'rgba(27, 54, 93, 0.06)',
                      borderRadius: '8px',
                      border: '1px solid rgba(27, 54, 93, 0.15)',
                      color: 'var(--color-primary, #1B365D)',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px'
                    }}>
                      <span>📍</span>
                      <span>
                        <strong>Gerência Territorial Exclusiva:</strong> {reportStats.userDirectorateName} — Estrutura orgânica e quadro de pessoal restritos a esta Província.
                      </span>
                    </div>
                  )}

                  {/* BARRA SELETORA DE NÍVEL DA ESTRUTURA ORGÂNICA (no-print) */}
                  <div className="no-print" style={{ 
                    marginTop: '16px', 
                    marginBottom: '20px', 
                    padding: '14px 18px', 
                    borderRadius: '10px', 
                    backgroundColor: 'var(--color-bg-base)', 
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        Filtrar por Estrutura Orgânica:
                      </span>
                      
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        💡 Navegação em Cascatas: Direcção ➔ Departamento ➔ Repartição ➔ Secção
                      </span>
                    </div>

                    {/* ABAS DA ESTRUTURA ORGÂNICA */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => { setReportViewLevel('directorates'); setSearchReportText(''); }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: reportViewLevel === 'directorates' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          backgroundColor: reportViewLevel === 'directorates' ? 'var(--color-primary)' : 'var(--color-card-bg)',
                          color: reportViewLevel === 'directorates' ? 'var(--color-accent)' : 'var(--color-text-main)',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🏢 Direcções ({reportStats.allDirectoratesList.length})
                      </button>

                      <button
                        onClick={() => { setReportViewLevel('departments'); setSearchReportText(''); }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: reportViewLevel === 'departments' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          backgroundColor: reportViewLevel === 'departments' ? 'var(--color-primary)' : 'var(--color-card-bg)',
                          color: reportViewLevel === 'departments' ? 'var(--color-accent)' : 'var(--color-text-main)',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🏬 Departamentos ({reportStats.allDepartmentsList.length})
                      </button>

                      <button
                        onClick={() => { setReportViewLevel('divisions'); setSearchReportText(''); }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: reportViewLevel === 'divisions' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          backgroundColor: reportViewLevel === 'divisions' ? 'var(--color-primary)' : 'var(--color-card-bg)',
                          color: reportViewLevel === 'divisions' ? 'var(--color-accent)' : 'var(--color-text-main)',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🏛️ Repartições ({reportStats.allDivisionsList.length})
                      </button>

                      <button
                        onClick={() => { setReportViewLevel('sections'); setSearchReportText(''); }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: reportViewLevel === 'sections' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          backgroundColor: reportViewLevel === 'sections' ? 'var(--color-primary)' : 'var(--color-card-bg)',
                          color: reportViewLevel === 'sections' ? 'var(--color-accent)' : 'var(--color-text-main)',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🔖 Secções ({reportStats.allSectionsList.length})
                      </button>

                      <button
                        onClick={() => { setReportViewLevel('districts'); setSearchReportText(''); }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: reportViewLevel === 'districts' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          backgroundColor: reportViewLevel === 'districts' ? 'var(--color-primary)' : 'var(--color-card-bg)',
                          color: reportViewLevel === 'districts' ? 'var(--color-accent)' : 'var(--color-text-main)',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📍 Distritos ({reportStats.allDistrictsList.length})
                      </button>
                    </div>
                  </div>

                  {/* ──────────────────────────────────────────────────────────
                      NÍVEL 1: DIRECÇÕES
                   ────────────────────────────────────────────────────────── */}
                  {reportViewLevel === 'directorates' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <h4 style={{ color: 'var(--color-primary)', margin: 0, fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          Por Onde Está Afecto ({reportStats.isScopedToProvince ? reportStats.userDirectorateName : 'Direcções'})
                        </h4>

                        <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {!reportStats.isScopedToProvince ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                                Seleccionar Direcção:
                              </label>
                              <select
                                value={selectedReportDirectorate}
                                onChange={(e) => setSelectedReportDirectorate(e.target.value)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--color-primary)',
                                  backgroundColor: 'var(--color-bg-base)',
                                  color: 'var(--color-text-main)',
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                <option value="ALL">Todas as Direcções ({reportStats.total} funcionários)</option>
                                {reportStats.allDirectoratesList.map(d => (
                                  <option key={d.id} value={d.id}>
                                    {d.name} ({d.count} {d.count === 1 ? 'funcionário' : 'funcionários'})
                                  </option>
                                ))}
                                {reportStats.unassignedDir.count > 0 && (
                                  <option value="unassigned">
                                    Sem Afetação / Outros ({reportStats.unassignedDir.count} funcionários)
                                  </option>
                                )}
                              </select>
                            </div>
                          ) : (
                            <div style={{ padding: '4px 10px', backgroundColor: 'rgba(27, 54, 93, 0.08)', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--color-primary, #1B365D)' }}>
                              📍 {reportStats.userDirectorateName}
                            </div>
                          )}

                          {selectedReportDirectorate === 'ALL' && (
                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                placeholder="Pesquisar direcção..."
                                value={searchReportText}
                                onChange={(e) => setSearchReportText(e.target.value)}
                                style={{
                                  padding: '6px 10px 6px 30px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--color-border)',
                                  backgroundColor: 'var(--color-bg-base)',
                                  color: 'var(--color-text-main)',
                                  fontSize: '13px',
                                  width: '200px'
                                }}
                              />
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                          )}

                          {selectedReportDirectorate !== 'ALL' && (
                            <button
                              onClick={() => setSelectedReportDirectorate('ALL')}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'var(--color-primary)',
                                color: 'var(--color-accent)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              ✕ Ver Todas
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedReportDirectorate === 'ALL' ? (
                        <>
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
                              {reportStats.directorates
                                .filter(d => d.name.toLowerCase().includes(searchReportText.toLowerCase()))
                                .map(dir => (
                                  <tr 
                                    key={dir.id}
                                    onClick={() => setSelectedReportDirectorate(dir.id)}
                                    title="Clique para ver os funcionários desta direcção"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <td><strong style={{ color: 'var(--color-primary)' }}>{dir.name}</strong></td>
                                    <td>{dir.M}</td>
                                    <td>{dir.F}</td>
                                    <td>
                                      <span style={{ fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}>
                                        {dir.count}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              {reportStats.unassignedDir.count > 0 && 
                               ('sem afetação / outros'.includes(searchReportText.toLowerCase()) || !searchReportText) && (
                                <tr onClick={() => setSelectedReportDirectorate('unassigned')} style={{ cursor: 'pointer' }}>
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
                          <p className="no-print" style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                            💡 Dica: Clique em qualquer linha da tabela para ver a lista de funcionários e os Departamentos afetos a essa Direcção.
                          </p>
                        </>
                      ) : (
                        (() => {
                          const selectedObj = selectedReportDirectorate === 'unassigned'
                            ? reportStats.unassignedDir
                            : (reportStats.directorates.find(d => String(d.id) === String(selectedReportDirectorate)) ||
                               reportStats.allDirectoratesList.find(d => String(d.id) === String(selectedReportDirectorate)));

                          if (!selectedObj) return null;
                          const pct = reportStats.total > 0 ? ((selectedObj.count / reportStats.total) * 100).toFixed(1) : 0;

                          // Departamentos pertencentes a esta direcção
                          const childDeps = reportStats.allDepartmentsList.filter(dep => String(dep.directorateId) === String(selectedReportDirectorate));
                          // Direcções Distritais pertencentes a esta direcção provincial
                          const childDistricts = reportStats.allDistrictsList.filter(dist => String(dist.provincialDirectorateId) === String(selectedReportDirectorate));

                          return (
                            <div style={{ border: '2px solid var(--color-primary)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--color-bg-base)', marginBottom: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                  <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '17px', fontWeight: 'bold' }}>
                                    🏢 {selectedObj.name}
                                  </h3>
                                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                    Detalhe do Efetivo Afeto a esta Direcção
                                  </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{selectedObj.count}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Total Afetos</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{selectedObj.M} H | {selectedObj.F} M</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Género</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-accent)' }}>{pct}%</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>do Efetivo Total</div>
                                  </div>
                                </div>
                              </div>

                              {/* TABELA DE DEPARTAMENTOS DESTA DIRECÇÃO (SE HOUVER) */}
                              {childDeps.length > 0 && (
                                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--color-card-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <h5 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      🏬 Departamentos Pertencentes a esta Direcção ({childDeps.length})
                                    </h5>
                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                      Clique num departamento para filtrar repartições e funcionários
                                    </span>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                                    {childDeps.map(dep => (
                                      <div
                                        key={dep.id}
                                        onClick={() => {
                                          setReportViewLevel('departments');
                                          setSelectedReportDepartment(dep.id);
                                        }}
                                        style={{
                                          padding: '8px 12px',
                                          borderRadius: '6px',
                                          border: '1px solid var(--color-border)',
                                          backgroundColor: 'var(--color-bg-base)',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s'
                                        }}
                                      >
                                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--color-text-main)' }}>{dep.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '2px' }}>
                                          {dep.count} {dep.count === 1 ? 'funcionário' : 'funcionários'} ({dep.M} H / {dep.F} M)
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* DIRECÇÕES DISTRITAIS SUBORDINADAS A ESTA DIRECÇÃO PROVINCIAL */}
                              {childDistricts.length > 0 && (
                                <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: 'rgba(27, 54, 93, 0.04)', borderRadius: '8px', border: '1px solid var(--color-primary)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                      <h5 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        📍 Direcções Distritais Subordinadas a esta Direcção Provincial ({childDistricts.length})
                                      </h5>
                                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                        As Direcções Distritais enquadram-se na estrutura provincial e possuem Secções diretamente.
                                      </p>
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                                      Clique numa Direcção Distrital para ver o seu Efetivo e Secções
                                    </span>
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                                    {childDistricts.map(dist => (
                                      <div
                                        key={dist.id}
                                        onClick={() => {
                                          setReportViewLevel('districts');
                                          setSelectedReportDistrict(dist.id);
                                        }}
                                        style={{
                                          padding: '10px 14px',
                                          borderRadius: '8px',
                                          border: '1.5px solid var(--color-primary)',
                                          backgroundColor: 'var(--color-bg-base)',
                                          cursor: 'pointer',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                          transition: 'transform 0.15s, border-color 0.15s'
                                        }}
                                      >
                                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--color-primary)' }}>
                                          📍 {dist.name}
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-main)', marginTop: '4px' }}>
                                          {dist.count} {dist.count === 1 ? 'funcionário' : 'funcionários'} ({dist.M} H / {dist.F} M)
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                          🔖 {dist.sections ? dist.sections.length : 0} Secção(ões) Registadas
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <h5 style={{ color: 'var(--color-text-main)', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                Lista Nominal dos Funcionários Afetos ({selectedObj.count})
                              </h5>

                              {selectedObj.employees && selectedObj.employees.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                                      <th>Nome Completo</th>
                                      <th>NUIT</th>
                                      <th>Cargo / Carreira</th>
                                      <th>Patente</th>
                                      <th>Género</th>
                                      <th>Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedObj.employees.map(emp => {
                                      const carObj = orgData?.careers?.find(c => String(c.id) === String(emp.careerId));
                                      return (
                                        <tr key={emp.id}>
                                          <td><strong>{emp.name}</strong></td>
                                          <td>{emp.nuit || '-'}</td>
                                          <td>{carObj ? carObj.name : (emp.position || emp.career || '-')}</td>
                                          <td>{emp.rank || emp.patente || '-'}</td>
                                          <td>{emp.gender === 'M' || emp.gender === 'Masculino' ? 'Homem' : (emp.gender === 'F' || emp.gender === 'Feminino' ? 'Mulher' : '-')}</td>
                                          <td>
                                            <span style={{
                                              padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                                              backgroundColor: emp.isActive !== false ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)',
                                              color: emp.isActive !== false ? '#28a745' : '#dc3545'
                                            }}>
                                              {emp.isActive !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '13px' }}>Nenhum funcionário cadastrado nesta direcção.</p>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </>
                  )}

                  {/* ──────────────────────────────────────────────────────────
                      NÍVEL 2: DEPARTAMENTOS
                  ────────────────────────────────────────────────────────── */}
                  {reportViewLevel === 'departments' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <h4 style={{ color: 'var(--color-primary)', margin: 0, fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg>
                          Distribuição por Departamentos Institucionais
                        </h4>

                        <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              Direcção Pai:
                            </label>
                            <select
                              value={selectedReportDirectorate}
                              onChange={(e) => { setSelectedReportDirectorate(e.target.value); setSelectedReportDepartment('ALL'); }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-bg-base)',
                                color: 'var(--color-text-main)',
                                fontSize: '12px'
                              }}
                            >
                              <option value="ALL">Todas as Direcções</option>
                              {reportStats.allDirectoratesList.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              Departamento:
                            </label>
                            <select
                              value={selectedReportDepartment}
                              onChange={(e) => setSelectedReportDepartment(e.target.value)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--color-primary)',
                                backgroundColor: 'var(--color-bg-base)',
                                color: 'var(--color-text-main)',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="ALL">Todos os Departamentos ({reportStats.total} funcionários)</option>
                              {reportStats.allDepartmentsList
                                .filter(dep => selectedReportDirectorate === 'ALL' || String(dep.directorateId) === String(selectedReportDirectorate))
                                .map(dep => (
                                  <option key={dep.id} value={dep.id}>
                                    {dep.name} ({dep.count} {dep.count === 1 ? 'funcionário' : 'funcionários'})
                                  </option>
                                ))}
                              {reportStats.unassignedDep.count > 0 && (
                                <option value="unassigned">Sem Departamento ({reportStats.unassignedDep.count})</option>
                              )}
                            </select>
                          </div>

                          {selectedReportDepartment === 'ALL' && (
                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                placeholder="Pesquisar departamento..."
                                value={searchReportText}
                                onChange={(e) => setSearchReportText(e.target.value)}
                                style={{
                                  padding: '6px 10px 6px 30px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--color-border)',
                                  backgroundColor: 'var(--color-bg-base)',
                                  color: 'var(--color-text-main)',
                                  fontSize: '13px',
                                  width: '190px'
                                }}
                              />
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                          )}

                          {selectedReportDepartment !== 'ALL' && (
                            <button
                              onClick={() => setSelectedReportDepartment('ALL')}
                              style={{
                                padding: '6px 12px', borderRadius: '6px', border: 'none',
                                backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)',
                                fontSize: '12px', cursor: 'pointer', fontWeight: 'bold'
                              }}
                            >
                              ✕ Ver Todos
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedReportDepartment === 'ALL' ? (
                        <>
                          <table className="premium-table">
                            <thead>
                              <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                                <th>Departamento</th>
                                <th>Direcção de Origem</th>
                                <th>Homens</th>
                                <th>Mulheres</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportStats.departments
                                .filter(dep => selectedReportDirectorate === 'ALL' || String(dep.directorateId) === String(selectedReportDirectorate))
                                .filter(dep => dep.name.toLowerCase().includes(searchReportText.toLowerCase()) || dep.directorateName.toLowerCase().includes(searchReportText.toLowerCase()))
                                .map(dep => (
                                  <tr 
                                    key={dep.id}
                                    onClick={() => setSelectedReportDepartment(dep.id)}
                                    title="Clique para ver os funcionários e repartições deste departamento"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <td><strong style={{ color: 'var(--color-primary)' }}>{dep.name}</strong></td>
                                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{dep.directorateName}</td>
                                    <td>{dep.M}</td>
                                    <td>{dep.F}</td>
                                    <td>
                                      <span style={{ fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}>
                                        {dep.count}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              {reportStats.unassignedDep.count > 0 && 
                               (selectedReportDirectorate === 'ALL' || selectedReportDirectorate === 'unassigned') &&
                               ('sem departamento'.includes(searchReportText.toLowerCase()) || !searchReportText) && (
                                <tr onClick={() => setSelectedReportDepartment('unassigned')} style={{ cursor: 'pointer' }}>
                                  <td><strong>Sem Departamento Especificado</strong></td>
                                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>-</td>
                                  <td>{reportStats.unassignedDep.M}</td>
                                  <td>{reportStats.unassignedDep.F}</td>
                                  <td>{reportStats.unassignedDep.count}</td>
                                </tr>
                              )}
                              <tr style={{ fontWeight: 'bold', borderTop: '2px solid var(--color-primary)' }}>
                                <td>Total Geral</td>
                                <td>-</td>
                                <td>{reportStats.men}</td>
                                <td>{reportStats.women}</td>
                                <td>{reportStats.total}</td>
                              </tr>
                            </tbody>
                          </table>
                          <p className="no-print" style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                            💡 Dica: Clique em qualquer linha para ver os funcionários e Repartições pertencentes àquele departamento.
                          </p>
                        </>
                      ) : (
                        (() => {
                          const selectedObj = selectedReportDepartment === 'unassigned'
                            ? reportStats.unassignedDep
                            : (reportStats.departments.find(dep => String(dep.id) === String(selectedReportDepartment)) ||
                               reportStats.allDepartmentsList.find(dep => String(dep.id) === String(selectedReportDepartment)));

                          if (!selectedObj) return null;
                          const pct = reportStats.total > 0 ? ((selectedObj.count / reportStats.total) * 100).toFixed(1) : 0;

                          // Repartições pertencentes a este departamento
                          const childDivs = reportStats.allDivisionsList.filter(div => String(div.departmentId) === String(selectedReportDepartment));

                          return (
                            <div style={{ border: '2px solid var(--color-primary)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--color-bg-base)', marginBottom: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                  <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '17px', fontWeight: 'bold' }}>
                                    🏬 {selectedObj.name}
                                  </h3>
                                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                    Direcção de Origem: {selectedObj.directorateName || 'Central'}
                                  </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{selectedObj.count}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Total Afetos</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{selectedObj.M} H | {selectedObj.F} M</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Género</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-accent)' }}>{pct}%</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>do Efetivo Total</div>
                                  </div>
                                </div>
                              </div>

                              {/* TABELA DE REPARTIÇÕES DESTE DEPARTAMENTO */}
                              {childDivs.length > 0 && (
                                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--color-card-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <h5 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      🏛️ Repartições Pertencentes a este Departamento ({childDivs.length})
                                    </h5>
                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                      Clique numa repartição para filtrar secções e funcionários
                                    </span>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                                    {childDivs.map(div => (
                                      <div
                                        key={div.id}
                                        onClick={() => {
                                          setReportViewLevel('divisions');
                                          setSelectedReportDivision(div.id);
                                        }}
                                        style={{
                                          padding: '8px 12px',
                                          borderRadius: '6px',
                                          border: '1px solid var(--color-border)',
                                          backgroundColor: 'var(--color-bg-base)',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s'
                                        }}
                                      >
                                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--color-text-main)' }}>{div.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '2px' }}>
                                          {div.count} {div.count === 1 ? 'funcionário' : 'funcionários'} ({div.M} H / {div.F} M)
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <h5 style={{ color: 'var(--color-text-main)', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                Lista Nominal dos Funcionários deste Departamento ({selectedObj.count})
                              </h5>

                              {selectedObj.employees && selectedObj.employees.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                                      <th>Nome Completo</th>
                                      <th>NUIT</th>
                                      <th>Cargo / Carreira</th>
                                      <th>Patente</th>
                                      <th>Género</th>
                                      <th>Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedObj.employees.map(emp => {
                                      const carObj = orgData?.careers?.find(c => String(c.id) === String(emp.careerId));
                                      return (
                                        <tr key={emp.id}>
                                          <td><strong>{emp.name}</strong></td>
                                          <td>{emp.nuit || '-'}</td>
                                          <td>{carObj ? carObj.name : (emp.position || emp.career || '-')}</td>
                                          <td>{emp.rank || emp.patente || '-'}</td>
                                          <td>{emp.gender === 'M' || emp.gender === 'Masculino' ? 'Homem' : (emp.gender === 'F' || emp.gender === 'Feminino' ? 'Mulher' : '-')}</td>
                                          <td>
                                            <span style={{
                                              padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                                              backgroundColor: emp.isActive !== false ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)',
                                              color: emp.isActive !== false ? '#28a745' : '#dc3545'
                                            }}>
                                              {emp.isActive !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '13px' }}>Nenhum funcionário cadastrado neste departamento.</p>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </>
                  )}

                  {/* ──────────────────────────────────────────────────────────
                      NÍVEL 3: REPARTIÇÕES
                  ────────────────────────────────────────────────────────── */}
                  {reportViewLevel === 'divisions' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <h4 style={{ color: 'var(--color-primary)', margin: 0, fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                          Distribuição por Repartições
                        </h4>

                        <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              Departamento Pai:
                            </label>
                            <select
                              value={selectedReportDepartment}
                              onChange={(e) => { setSelectedReportDepartment(e.target.value); setSelectedReportDivision('ALL'); }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-bg-base)',
                                color: 'var(--color-text-main)',
                                fontSize: '12px'
                              }}
                            >
                              <option value="ALL">Todos os Departamentos</option>
                              {reportStats.allDepartmentsList.map(dep => (
                                <option key={dep.id} value={dep.id}>{dep.name}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              Repartição:
                            </label>
                            <select
                              value={selectedReportDivision}
                              onChange={(e) => setSelectedReportDivision(e.target.value)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--color-primary)',
                                backgroundColor: 'var(--color-bg-base)',
                                color: 'var(--color-text-main)',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="ALL">Todas as Repartições ({reportStats.allDivisionsList.length})</option>
                              {reportStats.allDivisionsList
                                .filter(div => selectedReportDepartment === 'ALL' || String(div.departmentId) === String(selectedReportDepartment))
                                .map(div => (
                                  <option key={div.id} value={div.id}>
                                    {div.name} ({div.count} {div.count === 1 ? 'funcionário' : 'funcionários'})
                                  </option>
                                ))}
                              {reportStats.unassignedDiv.count > 0 && (
                                <option value="unassigned">Sem Repartição Especificada ({reportStats.unassignedDiv.count})</option>
                              )}
                            </select>
                          </div>

                          {selectedReportDivision === 'ALL' && (
                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                placeholder="Pesquisar repartição..."
                                value={searchReportText}
                                onChange={(e) => setSearchReportText(e.target.value)}
                                style={{
                                  padding: '6px 10px 6px 30px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--color-border)',
                                  backgroundColor: 'var(--color-bg-base)',
                                  color: 'var(--color-text-main)',
                                  fontSize: '13px',
                                  width: '190px'
                                }}
                              />
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                          )}

                          {selectedReportDivision !== 'ALL' && (
                            <button
                              onClick={() => setSelectedReportDivision('ALL')}
                              style={{
                                padding: '6px 12px', borderRadius: '6px', border: 'none',
                                backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)',
                                fontSize: '12px', cursor: 'pointer', fontWeight: 'bold'
                              }}
                            >
                              ✕ Ver Todas
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedReportDivision === 'ALL' ? (
                        <>
                          <table className="premium-table">
                            <thead>
                              <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                                <th>Repartição</th>
                                <th>Departamento Pai</th>
                                <th>Direcção de Origem</th>
                                <th>Homens</th>
                                <th>Mulheres</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportStats.divisions
                                .filter(div => selectedReportDepartment === 'ALL' || String(div.departmentId) === String(selectedReportDepartment))
                                .filter(div => div.name.toLowerCase().includes(searchReportText.toLowerCase()) || div.departmentName.toLowerCase().includes(searchReportText.toLowerCase()))
                                .map(div => (
                                  <tr 
                                    key={div.id}
                                    onClick={() => setSelectedReportDivision(div.id)}
                                    title="Clique para ver os funcionários e secções desta repartição"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <td><strong style={{ color: 'var(--color-primary)' }}>{div.name}</strong></td>
                                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{div.departmentName}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{div.directorateName}</td>
                                    <td>{div.M}</td>
                                    <td>{div.F}</td>
                                    <td>
                                      <span style={{ fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}>
                                        {div.count}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              {reportStats.unassignedDiv.count > 0 && 
                               (selectedReportDepartment === 'ALL' || selectedReportDepartment === 'unassigned') &&
                               ('sem repartição'.includes(searchReportText.toLowerCase()) || !searchReportText) && (
                                <tr onClick={() => setSelectedReportDivision('unassigned')} style={{ cursor: 'pointer' }}>
                                  <td><strong>Sem Repartição Especificada</strong></td>
                                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>-</td>
                                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>-</td>
                                  <td>{reportStats.unassignedDiv.M}</td>
                                  <td>{reportStats.unassignedDiv.F}</td>
                                  <td>{reportStats.unassignedDiv.count}</td>
                                </tr>
                              )}
                              <tr style={{ fontWeight: 'bold', borderTop: '2px solid var(--color-primary)' }}>
                                <td>Total Geral</td>
                                <td>-</td>
                                <td>-</td>
                                <td>{reportStats.men}</td>
                                <td>{reportStats.women}</td>
                                <td>{reportStats.total}</td>
                              </tr>
                            </tbody>
                          </table>
                          <p className="no-print" style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                            💡 Dica: Clique em qualquer linha para ver os funcionários e Secções pertencentes àquela repartição.
                          </p>
                        </>
                      ) : (
                        (() => {
                          const selectedObj = selectedReportDivision === 'unassigned'
                            ? reportStats.unassignedDiv
                            : (reportStats.divisions.find(div => String(div.id) === String(selectedReportDivision)) ||
                               reportStats.allDivisionsList.find(div => String(div.id) === String(selectedReportDivision)));

                          if (!selectedObj) return null;
                          const pct = reportStats.total > 0 ? ((selectedObj.count / reportStats.total) * 100).toFixed(1) : 0;

                          // Secções pertencentes a esta repartição
                          const childSecs = reportStats.allSectionsList.filter(sec => String(sec.divisionId) === String(selectedReportDivision));

                          return (
                            <div style={{ border: '2px solid var(--color-primary)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--color-bg-base)', marginBottom: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                  <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '17px', fontWeight: 'bold' }}>
                                    🏛️ {selectedObj.name}
                                  </h3>
                                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                    Departamento Pai: {selectedObj.departmentName} • Direcção: {selectedObj.directorateName}
                                  </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{selectedObj.count}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Total Afetos</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{selectedObj.M} H | {selectedObj.F} M</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Género</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-accent)' }}>{pct}%</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>do Efetivo Total</div>
                                  </div>
                                </div>
                              </div>

                              {/* TABELA DE SECÇÕES DESTA REPARTIÇÃO */}
                              {childSecs.length > 0 && (
                                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--color-card-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <h5 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      🔖 Secções Pertencentes a esta Repartição ({childSecs.length})
                                    </h5>
                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                      Clique numa secção para ver os funcionários afetos
                                    </span>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                                    {childSecs.map(sec => (
                                      <div
                                        key={sec.id}
                                        onClick={() => {
                                          setReportViewLevel('sections');
                                          setSelectedReportSection(sec.id);
                                        }}
                                        style={{
                                          padding: '8px 12px',
                                          borderRadius: '6px',
                                          border: '1px solid var(--color-border)',
                                          backgroundColor: 'var(--color-bg-base)',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s'
                                        }}
                                      >
                                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--color-text-main)' }}>{sec.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '2px' }}>
                                          {sec.count} {sec.count === 1 ? 'funcionário' : 'funcionários'} ({sec.M} H / {sec.F} M)
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <h5 style={{ color: 'var(--color-text-main)', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                Lista Nominal dos Funcionários desta Repartição ({selectedObj.count})
                              </h5>

                              {selectedObj.employees && selectedObj.employees.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                                      <th>Nome Completo</th>
                                      <th>NUIT</th>
                                      <th>Cargo / Carreira</th>
                                      <th>Patente</th>
                                      <th>Género</th>
                                      <th>Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedObj.employees.map(emp => {
                                      const carObj = orgData?.careers?.find(c => String(c.id) === String(emp.careerId));
                                      return (
                                        <tr key={emp.id}>
                                          <td><strong>{emp.name}</strong></td>
                                          <td>{emp.nuit || '-'}</td>
                                          <td>{carObj ? carObj.name : (emp.position || emp.career || '-')}</td>
                                          <td>{emp.rank || emp.patente || '-'}</td>
                                          <td>{emp.gender === 'M' || emp.gender === 'Masculino' ? 'Homem' : (emp.gender === 'F' || emp.gender === 'Feminino' ? 'Mulher' : '-')}</td>
                                          <td>
                                            <span style={{
                                              padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                                              backgroundColor: emp.isActive !== false ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)',
                                              color: emp.isActive !== false ? '#28a745' : '#dc3545'
                                            }}>
                                              {emp.isActive !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '13px' }}>Nenhum funcionário cadastrado nesta repartição.</p>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </>
                  )}

                  {/* ──────────────────────────────────────────────────────────
                      NÍVEL 4: SECÇÕES
                  ────────────────────────────────────────────────────────── */}
                  {reportViewLevel === 'sections' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <h4 style={{ color: 'var(--color-primary)', margin: 0, fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"></path></svg>
                          Distribuição por Secções
                        </h4>

                        <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              Repartição Pai:
                            </label>
                            <select
                              value={selectedReportDivision}
                              onChange={(e) => { setSelectedReportDivision(e.target.value); setSelectedReportSection('ALL'); }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-bg-base)',
                                color: 'var(--color-text-main)',
                                fontSize: '12px'
                              }}
                            >
                              <option value="ALL">Todas as Repartições</option>
                              {reportStats.allDivisionsList.map(div => (
                                <option key={div.id} value={div.id}>{div.name}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              Secção:
                            </label>
                            <select
                              value={selectedReportSection}
                              onChange={(e) => setSelectedReportSection(e.target.value)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--color-primary)',
                                backgroundColor: 'var(--color-bg-base)',
                                color: 'var(--color-text-main)',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="ALL">Todas as Secções ({reportStats.allSectionsList.length})</option>
                              {reportStats.allSectionsList
                                .filter(sec => selectedReportDivision === 'ALL' || String(sec.divisionId) === String(selectedReportDivision))
                                .map(sec => (
                                  <option key={sec.id} value={sec.id}>
                                    {sec.name} ({sec.count} {sec.count === 1 ? 'funcionário' : 'funcionários'})
                                  </option>
                                ))}
                              {reportStats.unassignedSec.count > 0 && (
                                <option value="unassigned">Sem Secção Especificada ({reportStats.unassignedSec.count})</option>
                              )}
                            </select>
                          </div>

                          {selectedReportSection === 'ALL' && (
                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                placeholder="Pesquisar secção..."
                                value={searchReportText}
                                onChange={(e) => setSearchReportText(e.target.value)}
                                style={{
                                  padding: '6px 10px 6px 30px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--color-border)',
                                  backgroundColor: 'var(--color-bg-base)',
                                  color: 'var(--color-text-main)',
                                  fontSize: '13px',
                                  width: '190px'
                                }}
                              />
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                          )}

                          {selectedReportSection !== 'ALL' && (
                            <button
                              onClick={() => setSelectedReportSection('ALL')}
                              style={{
                                padding: '6px 12px', borderRadius: '6px', border: 'none',
                                backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)',
                                fontSize: '12px', cursor: 'pointer', fontWeight: 'bold'
                              }}
                            >
                              ✕ Ver Todas
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedReportSection === 'ALL' ? (
                        <>
                          <table className="premium-table">
                            <thead>
                              <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                                <th>Secção</th>
                                <th>Repartição Pai</th>
                                <th>Departamento Pai</th>
                                <th>Homens</th>
                                <th>Mulheres</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportStats.sections
                                .filter(sec => selectedReportDivision === 'ALL' || String(sec.divisionId) === String(selectedReportDivision))
                                .filter(sec => sec.name.toLowerCase().includes(searchReportText.toLowerCase()) || sec.divisionName.toLowerCase().includes(searchReportText.toLowerCase()))
                                .map(sec => (
                                  <tr 
                                    key={sec.id}
                                    onClick={() => setSelectedReportSection(sec.id)}
                                    title="Clique para ver os funcionários desta secção"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <td><strong style={{ color: 'var(--color-primary)' }}>{sec.name}</strong></td>
                                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{sec.divisionName}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{sec.departmentName}</td>
                                    <td>{sec.M}</td>
                                    <td>{sec.F}</td>
                                    <td>
                                      <span style={{ fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}>
                                        {sec.count}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              {reportStats.unassignedSec.count > 0 && 
                               (selectedReportDivision === 'ALL' || selectedReportDivision === 'unassigned') &&
                               ('sem secção'.includes(searchReportText.toLowerCase()) || !searchReportText) && (
                                <tr onClick={() => setSelectedReportSection('unassigned')} style={{ cursor: 'pointer' }}>
                                  <td><strong>Sem Secção Especificada</strong></td>
                                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>-</td>
                                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>-</td>
                                  <td>{reportStats.unassignedSec.M}</td>
                                  <td>{reportStats.unassignedSec.F}</td>
                                  <td>{reportStats.unassignedSec.count}</td>
                                </tr>
                              )}
                              <tr style={{ fontWeight: 'bold', borderTop: '2px solid var(--color-primary)' }}>
                                <td>Total Geral</td>
                                <td>-</td>
                                <td>-</td>
                                <td>{reportStats.men}</td>
                                <td>{reportStats.women}</td>
                                <td>{reportStats.total}</td>
                              </tr>
                            </tbody>
                          </table>
                          <p className="no-print" style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                            💡 Dica: Clique em qualquer linha para ver a lista de funcionários pertencentes àquela secção.
                          </p>
                        </>
                      ) : (
                        (() => {
                          const selectedObj = selectedReportSection === 'unassigned'
                            ? reportStats.unassignedSec
                            : (reportStats.sections.find(sec => String(sec.id) === String(selectedReportSection)) ||
                               reportStats.allSectionsList.find(sec => String(sec.id) === String(selectedReportSection)));

                          if (!selectedObj) return null;
                          const pct = reportStats.total > 0 ? ((selectedObj.count / reportStats.total) * 100).toFixed(1) : 0;

                          return (
                            <div style={{ border: '2px solid var(--color-primary)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--color-bg-base)', marginBottom: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                  <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '17px', fontWeight: 'bold' }}>
                                    🔖 {selectedObj.name}
                                  </h3>
                                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                    Repartição Pai: {selectedObj.divisionName} • Dept: {selectedObj.departmentName} • Dir: {selectedObj.directorateName}
                                  </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{selectedObj.count}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Total Afetos</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{selectedObj.M} H | {selectedObj.F} M</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Género</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-accent)' }}>{pct}%</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>do Efetivo Total</div>
                                  </div>
                                </div>
                              </div>

                              <h5 style={{ color: 'var(--color-text-main)', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                Lista Nominal dos Funcionários desta Secção ({selectedObj.count})
                              </h5>

                              {selectedObj.employees && selectedObj.employees.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                                      <th>Nome Completo</th>
                                      <th>NUIT</th>
                                      <th>Cargo / Carreira</th>
                                      <th>Patente</th>
                                      <th>Género</th>
                                      <th>Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedObj.employees.map(emp => {
                                      const carObj = orgData?.careers?.find(c => String(c.id) === String(emp.careerId));
                                      return (
                                        <tr key={emp.id}>
                                          <td><strong>{emp.name}</strong></td>
                                          <td>{emp.nuit || '-'}</td>
                                          <td>{carObj ? carObj.name : (emp.position || emp.career || '-')}</td>
                                          <td>{emp.rank || emp.patente || '-'}</td>
                                          <td>{emp.gender === 'M' || emp.gender === 'Masculino' ? 'Homem' : (emp.gender === 'F' || emp.gender === 'Feminino' ? 'Mulher' : '-')}</td>
                                          <td>
                                            <span style={{
                                              padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                                              backgroundColor: emp.isActive !== false ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)',
                                              color: emp.isActive !== false ? '#28a745' : '#dc3545'
                                            }}>
                                              {emp.isActive !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '13px' }}>Nenhum funcionário cadastrado nesta secção.</p>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </>
                  )}

                  {/* ──────────────────────────────────────────────────────────
                      NÍVEL 5: DISTRITOS
                  ────────────────────────────────────────────────────────── */}
                  {reportViewLevel === 'districts' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <h4 style={{ color: 'var(--color-primary)', margin: 0, fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          Distribuição por Direcções Distritais / Distritos
                        </h4>

                        <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              Província:
                            </label>
                            <select
                              value={selectedReportDirectorate}
                              onChange={(e) => { setSelectedReportDirectorate(e.target.value); setSelectedReportDistrict('ALL'); }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-bg-base)',
                                color: 'var(--color-text-main)',
                                fontSize: '12px'
                              }}
                            >
                              <option value="ALL">Todas as Províncias</option>
                              {(reportStats.provincialDirectoratesList || reportStats.allDirectoratesList).map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                              Distrito:
                            </label>
                            <select
                              value={selectedReportDistrict}
                              onChange={(e) => setSelectedReportDistrict(e.target.value)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--color-primary)',
                                backgroundColor: 'var(--color-bg-base)',
                                color: 'var(--color-text-main)',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="ALL">Todos os Distritos ({reportStats.total} funcionários)</option>
                              {reportStats.allDistrictsList
                                .filter(dist => {
                                  if (selectedReportDirectorate === 'ALL') return true;
                                  const selDirObj = reportStats.allDirectoratesList.find(d => String(d.id) === String(selectedReportDirectorate) || (d.ids && d.ids.includes(String(selectedReportDirectorate))));
                                  if (!selDirObj) return String(dist.provincialDirectorateId) === String(selectedReportDirectorate);
                                  return selDirObj.ids ? selDirObj.ids.includes(String(dist.provincialDirectorateId)) : String(dist.provincialDirectorateId) === String(selectedReportDirectorate);
                                })
                                .map(dist => (
                                  <option key={dist.id} value={dist.id}>
                                    {dist.name} ({dist.count} {dist.count === 1 ? 'funcionário' : 'funcionários'})
                                  </option>
                                ))}
                              {reportStats.unassignedDist.count > 0 && (
                                <option value="unassigned">Sem Distrito ({reportStats.unassignedDist.count})</option>
                              )}
                            </select>
                          </div>

                          {selectedReportDistrict === 'ALL' && (
                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                placeholder="Pesquisar distrito..."
                                value={searchReportText}
                                onChange={(e) => setSearchReportText(e.target.value)}
                                style={{
                                  padding: '6px 10px 6px 30px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--color-border)',
                                  backgroundColor: 'var(--color-bg-base)',
                                  color: 'var(--color-text-main)',
                                  fontSize: '13px',
                                  width: '190px'
                                }}
                              />
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                          )}

                          {selectedReportDistrict !== 'ALL' && (
                            <button
                              onClick={() => setSelectedReportDistrict('ALL')}
                              style={{
                                padding: '6px 12px', borderRadius: '6px', border: 'none',
                                backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)',
                                fontSize: '12px', cursor: 'pointer', fontWeight: 'bold'
                              }}
                            >
                              ✕ Ver Todos
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedReportDistrict === 'ALL' ? (
                        <>
                          <table className="premium-table">
                            <thead>
                              <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                                <th>Direcção Distrital / Distrito</th>
                                <th>Província</th>
                                <th>Homens</th>
                                <th>Mulheres</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportStats.districts
                                .filter(dist => {
                                  if (selectedReportDirectorate === 'ALL') return true;
                                  const selDirObj = reportStats.allDirectoratesList.find(d => String(d.id) === String(selectedReportDirectorate) || (d.ids && d.ids.includes(String(selectedReportDirectorate))));
                                  if (!selDirObj) return String(dist.provincialDirectorateId) === String(selectedReportDirectorate);
                                  return selDirObj.ids ? selDirObj.ids.includes(String(dist.provincialDirectorateId)) : String(dist.provincialDirectorateId) === String(selectedReportDirectorate);
                                })
                                .filter(dist => dist.name.toLowerCase().includes(searchReportText.toLowerCase()) || dist.provinceName.toLowerCase().includes(searchReportText.toLowerCase()))
                                .map(dist => (
                                  <tr 
                                    key={dist.id}
                                    onClick={() => setSelectedReportDistrict(dist.id)}
                                    title="Clique para ver os funcionários deste distrito"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <td><strong style={{ color: 'var(--color-primary)' }}>{dist.name}</strong></td>
                                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{dist.provinceName}</td>
                                    <td>{dist.M}</td>
                                    <td>{dist.F}</td>
                                    <td>
                                      <span style={{ fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}>
                                        {dist.count}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              {reportStats.unassignedDist.count > 0 && 
                               (selectedReportDirectorate === 'ALL' || selectedReportDirectorate === 'unassigned') &&
                               ('sem afetação distrital'.includes(searchReportText.toLowerCase()) || !searchReportText) && (
                                <tr onClick={() => setSelectedReportDistrict('unassigned')} style={{ cursor: 'pointer' }}>
                                  <td><strong>Sem Afetação Distrital</strong></td>
                                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>-</td>
                                  <td>{reportStats.unassignedDist.M}</td>
                                  <td>{reportStats.unassignedDist.F}</td>
                                  <td>{reportStats.unassignedDist.count}</td>
                                </tr>
                              )}
                              <tr style={{ fontWeight: 'bold', borderTop: '2px solid var(--color-primary)' }}>
                                <td>Total Geral</td>
                                <td>-</td>
                                <td>{reportStats.men}</td>
                                <td>{reportStats.women}</td>
                                <td>{reportStats.total}</td>
                              </tr>
                            </tbody>
                          </table>
                          <p className="no-print" style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                            💡 Dica: Clique em qualquer linha para ver os funcionários afetos àquela unidade distrital.
                          </p>
                        </>
                      ) : (
                        (() => {
                          const selectedObj = selectedReportDistrict === 'unassigned'
                            ? reportStats.unassignedDist
                            : (reportStats.districts.find(dist => String(dist.id) === String(selectedReportDistrict)) ||
                               reportStats.allDistrictsList.find(dist => String(dist.id) === String(selectedReportDistrict)));

                          if (!selectedObj) return null;
                          const pct = reportStats.total > 0 ? ((selectedObj.count / reportStats.total) * 100).toFixed(1) : 0;

                          return (
                            <div style={{ border: '2px solid var(--color-primary)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--color-bg-base)', marginBottom: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                  <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '17px', fontWeight: 'bold' }}>
                                    📍 {selectedObj.name}
                                  </h3>
                                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                    Província de Afetação: {selectedObj.provinceName || 'N/A'}
                                  </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{selectedObj.count}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Total Afetos</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{selectedObj.M} H | {selectedObj.F} M</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Género</div>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-accent)' }}>{pct}%</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>do Efetivo Total</div>
                                  </div>
                                </div>
                              </div>

                              {/* SECÇÕES DA DIRECÇÃO DISTRITAL */}
                              {selectedObj.sections && selectedObj.sections.length > 0 && (
                                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--color-card-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                  <h5 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🔖 Secções Registadas nesta Direcção Distrital ({selectedObj.sections.length})
                                  </h5>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                                    {selectedObj.sections.map(sec => {
                                      const secEmpCount = (selectedObj.employees || []).filter(e => String(e.sectionId || e.seccaoId) === String(sec.id)).length;
                                      return (
                                        <div key={sec.id} style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}>
                                          <div style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--color-text-main)' }}>{sec.name}</div>
                                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                            {secEmpCount} funcionário(s) nesta secção
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              <h5 style={{ color: 'var(--color-text-main)', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                Lista Nominal dos Funcionários deste Distrito ({selectedObj.count})
                              </h5>

                              {selectedObj.employees && selectedObj.employees.length > 0 ? (
                                <table className="premium-table">
                                  <thead>
                                    <tr style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' }}>
                                      <th>Nome Completo</th>
                                      <th>NUIT</th>
                                      <th>Cargo / Carreira</th>
                                      <th>Patente</th>
                                      <th>Género</th>
                                      <th>Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedObj.employees.map(emp => {
                                      const carObj = orgData?.careers?.find(c => String(c.id) === String(emp.careerId));
                                      return (
                                        <tr key={emp.id}>
                                          <td><strong>{emp.name}</strong></td>
                                          <td>{emp.nuit || '-'}</td>
                                          <td>{carObj ? carObj.name : (emp.position || emp.career || '-')}</td>
                                          <td>{emp.rank || emp.patente || '-'}</td>
                                          <td>{emp.gender === 'M' || emp.gender === 'Masculino' ? 'Homem' : (emp.gender === 'F' || emp.gender === 'Feminino' ? 'Mulher' : '-')}</td>
                                          <td>
                                            <span style={{
                                              padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                                              backgroundColor: emp.isActive !== false ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)',
                                              color: emp.isActive !== false ? '#28a745' : '#dc3545'
                                            }}>
                                              {emp.isActive !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '13px' }}>Nenhum funcionário cadastrado neste distrito.</p>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </>
                  )}


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
                  <p>{getReportAddress()}</p>
                  <p>{getReportContact()}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ESTRUTURA ORGANIZACIONAL */}
          {activeTab === 'org_structure' && (
            <OrgStructureManager t={t} />
          )}

          {/* TAB: OUTROS (MÓDULOS EM DESENVOLVIMENTO) */}
          {!['home', 'identity', 'reports', 'org_structure', 'emp_list', 'emp_form', 'emp_import', 'emp_deleted', 'disc_list', 'disc_inspections', 'users_manage', 'users_roles', 'users_permissions', 'users_policies', 'users_audit', 'settings_languages', 'settings_system', 'settings_accounts', 'settings_backup', 'evaluations', 'effectiveness', 'transfers', 'vacations', 'career'].includes(activeTab) && !activeTab.startsWith('admin_acts') && (
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
    height: '100vh',
    maxHeight: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    transition: 'background-color var(--transition-normal), color var(--transition-normal)',
  },
  sidebar: {
    width: '260px',
    backgroundColor: 'var(--color-bg-card)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    height: '100vh',
    maxHeight: '100vh',
    position: 'relative',
    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 40,
    boxShadow: '4px 0 16px rgba(0, 0, 0, 0.02)',
  },
  sidebarHeader: {
    padding: '20px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--color-border)',
    background: 'linear-gradient(180deg, rgba(27, 54, 93, 0.04) 0%, transparent 100%)',
    flexShrink: 0,
  },
  sidebarLogo: {
    width: '42px',
    height: '42px',
    objectFit: 'contain',
    borderRadius: '8px',
    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.1))',
  },
  sidebarHeaderText: {
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarSigla: {
    fontSize: '18px',
    fontWeight: '800',
    letterSpacing: '0.6px',
    color: 'var(--color-text-main, #0f172a)',
  },
  sidebarDRH: {
    fontSize: '10.5px',
    color: 'var(--color-primary, #1B365D)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sidebarNav: {
    flex: 1,
    padding: '14px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: '10px',
    border: 'none',
    color: 'var(--color-text-base)',
    fontSize: '13.5px',
    fontWeight: '500',
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 0.9,
    gap: '12px',
    boxSizing: 'border-box',
  },
  navIcon: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
    transition: 'transform 0.2s ease',
  },
  sidebarFooter: {
    marginTop: 'auto',
    flexShrink: 0,
    padding: '16px 14px 20px 14px',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: 'var(--color-bg-base)',
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
    minHeight: '74px',
    backgroundColor: 'var(--color-bg-card)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 30px',
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
