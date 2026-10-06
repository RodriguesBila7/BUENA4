import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useOrgData from '../../hooks/useOrgData';
import { isCentralUser, isPrimaryCentralAdmin, filterByProvincialScope } from '../../utils/scopeUtils';
import { mozambiqueStructure } from '../../utils/mozambiqueDistricts';
import ConfirmModal from '../ConfirmModal';
import * as XLSX from 'xlsx';
import { printAllAbsencesNationalMap } from './printAllEffectiveness';

export default function EffectivenessQuery({ onGoToRegister, user, orgData: passedOrgData, employeesData }) {
  const { employees: allEmployees } = useEmployeeData();
  const { records, addRecord, updateRecord, deleteRecord, deleteEmployeeAbsences } = useEffectivenessData();
  const { data: hookOrgData } = useOrgData();

  const orgData = passedOrgData?.data || passedOrgData || hookOrgData || { directorates: [], departments: [], divisions: [], sections: [], careers: [], categories: [] };
  const isCentral = isCentralUser(user);
  const isPrincipal = isPrimaryCentralAdmin(user) || isCentralUser(user);

  const handlePrintAllNational = () => {
    if (!records || records.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Não existem registos de faltas no sistema para imprimir.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }
    printAllAbsencesNationalMap({
      records,
      employees: allEmployees,
      orgData,
      user
    });
  };

  // Escopo de funcionários por utilizador
  const employees = useMemo(() => {
    let raw = (employeesData?.employees || (Array.isArray(employeesData) ? employeesData : null) || allEmployees) || [];
    if (!isCentral && user) {
      return filterByProvincialScope(raw, user, orgData);
    }
    return raw;
  }, [employeesData, allEmployees, isCentral, user, orgData]);

  // Se for perfil secundário, fixa o directorateId
  const userDirId = user?.directorateId ? String(user.directorateId) : '';
  const userDirObj = userDirId ? (orgData?.directorates || []).find(d => String(d.id) === userDirId) : null;

  // Search/Filters states
  const [searchTerm, setSearchTerm] = useState('');
  const [provinceId, setProvinceId] = useState(!isCentral && userDirObj ? (userDirObj.province || '') : '');
  const [districtId, setDistrictId] = useState('');
  const [directorateId, setDirectorateId] = useState(!isCentral ? userDirId : '');
  const [departmentId, setDepartmentId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [careerId, setCareerId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [absenceType, setAbsenceType] = useState('');
  
  // Date Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // Grouping Criteria
  const [groupCriteria, setGroupCriteria] = useState('none');

  // Selected Employee for History Detail
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  // Editing Absence Modal State
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [editType, setEditType] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');

  // Quick Register Modal State
  const [registeringEmp, setRegisteringEmp] = useState(null);
  const [newType, setNewType] = useState('Falta Justificada');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newError, setNewError] = useState('');

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, hideCancel: false });

  const getName = (list, id) => list?.find(item => String(item.id) === String(id))?.name || '-';

  const formatDatesList = (dates = []) => {
    if (!dates.length) return '';
    return dates.map(d => {
      const parts = d.split('-');
      if (parts.length !== 3) return d;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }).join(', ');
  };

  // Province districts cascading
  const selectedProvinceData = mozambiqueStructure.find(p => p.province === provinceId);
  const availableDistricts = selectedProvinceData ? selectedProvinceData.districts : [];

  const empMap = useMemo(() => {
    const m = new Map();
    (employees || []).forEach(e => m.set(String(e.id), e));
    return m;
  }, [employees]);

  const availableDepartments = useMemo(() => {
    if (!directorateId) return [];
    return (orgData?.departments || []).filter(dep => String(dep.directorateId) === String(directorateId));
  }, [orgData?.departments, directorateId]);

  const availableDivisions = useMemo(() => {
    if (!directorateId) return [];
    if (departmentId) {
      return (orgData?.divisions || []).filter(div => String(div.departmentId) === String(departmentId));
    }
    const depIds = new Set(availableDepartments.map(d => String(d.id)));
    return (orgData?.divisions || []).filter(div => 
      String(div.directorateId) === String(directorateId) || (div.departmentId && depIds.has(String(div.departmentId)))
    );
  }, [orgData?.divisions, directorateId, departmentId, availableDepartments]);

  // Scoped records base
  const scopedRecords = useMemo(() => {
    if (!isCentral && userDirId) {
      const scopedEmpIds = new Set(employees.map(e => String(e.id)));
      return records.filter(rec => {
        const empMatch = scopedEmpIds.has(String(rec.employeeId));
        const dirMatch = String(rec.directorateId || rec.registeredByDirectorateId || '') === userDirId;
        return empMatch || dirMatch;
      });
    }
    return records;
  }, [records, isCentral, userDirId, employees]);

  // Contagem de faltas por direcção para o dropdown do perfil primário
  const absenceCountByDir = useMemo(() => {
    const counts = {};
    records.forEach(r => {
      const dId = String(r.directorateId || r.registeredByDirectorateId || '');
      if (dId) {
        counts[dId] = (counts[dId] || 0) + (r.daysCount || (r.dates ? r.dates.length : 1));
      }
    });
    return counts;
  }, [records]);

  // Filtered list of absences
  const filteredAbsences = useMemo(() => {
    return scopedRecords.filter(rec => {
      // Global search term (Name or NUIT)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const empName = (rec.employeeName || '').toLowerCase();
        const empNip = (rec.employeeNip || '').toLowerCase();
        if (!empName.includes(term) && !empNip.includes(term)) return false;
      }

      const emp = empMap.get(String(rec.employeeId));
      const rDir = String(rec.directorateId || rec.registeredByDirectorateId || emp?.directorateId || '');
      const rDep = String(rec.departmentId || emp?.departmentId || '');
      const rDiv = String(rec.divisionId || emp?.divisionId || '');

      // Structure filters
      if (provinceId && rec.provinceId !== provinceId) return false;
      if (districtId && rec.districtId !== districtId) return false;
      if (directorateId && rDir !== String(directorateId)) return false;
      if (departmentId && rDep !== String(departmentId)) return false;
      if (divisionId && rDiv !== String(divisionId)) return false;
      if (sectionId && String(rec.sectionId || emp?.sectionId || '') !== String(sectionId)) return false;

      // RH filters
      if (careerId && String(rec.careerId || emp?.careerId || '') !== String(careerId)) return false;
      if (categoryId && String(rec.categoryId || emp?.categoryId || '') !== String(categoryId)) return false;
      if (absenceType && rec.type !== absenceType) return false;

      if (roleFilter) {
        const role = (rec.jobPosition || emp?.role || '').toLowerCase();
        if (!role.includes(roleFilter.toLowerCase())) return false;
      }

      const recStartDate = rec.startDate || (rec.dates && rec.dates.length > 0 ? rec.dates[0] : '');
      const recEndDate = rec.endDate || (rec.dates && rec.dates.length > 0 ? rec.dates[rec.dates.length - 1] : '');

      if (dateFrom && recEndDate < dateFrom) return false;
      if (dateTo && recStartDate > dateTo) return false;

      if (yearFilter && recStartDate) {
        const recYear = recStartDate.split('-')[0];
        if (recYear !== yearFilter) return false;
      }
      if (monthFilter && recStartDate) {
        const recMonth = recStartDate.split('-')[1];
        if (recMonth !== monthFilter) return false;
      }

      return true;
    });
  }, [scopedRecords, searchTerm, provinceId, districtId, directorateId, departmentId, divisionId, sectionId, careerId, categoryId, roleFilter, absenceType, dateFrom, dateTo, yearFilter, monthFilter, empMap]);

  // Group absences by employee to build the "Funcionários Faltosos" view
  const faltososList = useMemo(() => {
    const map = {};

    filteredAbsences.forEach(rec => {
      const empId = rec.employeeId;
      if (!map[empId]) {
        const emp = employees.find(e => String(e.id) === String(empId));
        map[empId] = {
          employeeId: empId,
          nip: rec.employeeNip || (emp?.nip || emp?.nuit || '-'),
          name: rec.employeeName || (emp?.name || 'Funcionário'),
          gender: rec.gender || emp?.gender,
          provinceId: rec.provinceId || '',
          districtId: rec.districtId || '',
          career: getName(orgData.careers, rec.careerId || emp?.careerId),
          category: getName(orgData.categories, rec.categoryId || emp?.categoryId),
          role: rec.jobPosition || emp?.role || 'Investigador',
          directorate: getName(orgData.directorates, rec.directorateId || emp?.directorateId),
          directorateName: rec.directorateName || getName(orgData.directorates, rec.directorateId || emp?.directorateId),
          department: getName(orgData.departments, rec.departmentId || emp?.departmentId),
          division: getName(orgData.divisions, rec.divisionId || emp?.divisionId),
          section: getName(orgData.sections, rec.sectionId || emp?.sectionId),
          registeredBy: rec.registeredByName || rec.registeredBy || 'Operador RH',
          registeredByRole: rec.registeredByRole || '',
          totalJustified: 0,
          totalUnjustified: 0,
          totalDays: 0,
          types: new Set(),
          lastAbsenceDate: '',
          absences: []
        };
      }

      const recDaysCount = rec.daysCount !== undefined ? Number(rec.daysCount) : (rec.dates ? rec.dates.length : 1);
      const recEndDate = rec.endDate || (rec.dates && rec.dates.length > 0 ? rec.dates[rec.dates.length - 1] : '');

      map[empId].totalDays += recDaysCount;
      if (rec.type === 'Falta Justificada') map[empId].totalJustified += recDaysCount;
      else map[empId].totalUnjustified += recDaysCount;

      map[empId].types.add(rec.type);
      map[empId].absences.push(rec);

      if (!map[empId].lastAbsenceDate || recEndDate > map[empId].lastAbsenceDate) {
        map[empId].lastAbsenceDate = recEndDate;
      }
    });

    return Object.values(map).sort((a, b) => b.totalDays - a.totalDays);
  }, [filteredAbsences, employees, orgData]);

  // Selected employee's detailed history
  const selectedEmpDetails = useMemo(() => {
    if (!selectedEmpId) return null;
    return faltososList.find(f => String(f.employeeId) === String(selectedEmpId)) || null;
  }, [faltososList, selectedEmpId]);

  // Smart Grouping logic
  const groupedData = useMemo(() => {
    if (groupCriteria === 'none') return [];

    const groups = {};

    filteredAbsences.forEach(rec => {
      let key = '';
      switch (groupCriteria) {
        case 'directorate':
          key = getName(orgData.directorates, rec.directorateId);
          break;
        case 'department':
          key = getName(orgData.departments, rec.departmentId);
          break;
        case 'division':
          key = getName(orgData.divisions, rec.divisionId);
          break;
        case 'section':
          key = getName(orgData.sections, rec.sectionId);
          break;
        case 'province':
          key = rec.provinceId || 'Direcção Geral';
          break;
        case 'district':
          key = rec.districtId || 'Direcção Geral';
          break;
        case 'career':
          key = getName(orgData.careers, rec.careerId);
          break;
        case 'category':
          key = getName(orgData.categories, rec.categoryId);
          break;
        case 'type':
          key = rec.type;
          break;
        default:
          key = 'Outro';
      }

      if (!groups[key]) {
        groups[key] = {
          name: key,
          employees: new Set(),
          totalDays: 0
        };
      }

      groups[key].employees.add(rec.employeeId);
      groups[key].totalDays += (rec.daysCount || 1);
    });

    return Object.values(groups).map(g => ({
      name: g.name,
      employeesCount: g.employees.size,
      totalDays: g.totalDays,
      averageDays: g.employees.size > 0 ? (g.totalDays / g.employees.size).toFixed(1) : 0
    })).sort((a, b) => b.totalDays - a.totalDays);
  }, [filteredAbsences, groupCriteria, orgData]);

  // Exportar Excel
  const exportToExcel = () => {
    const dataToExport = faltososList.map(emp => ({
      'NUIT / NIP': emp.nip,
      'Nome do Funcionário': emp.name,
      'Carreira': emp.career,
      'Categoria': emp.category,
      'Cargo': emp.role || 'Sem Cargo',
      'Província': emp.provinceId,
      'Direcção / Unidade': emp.directorate,
      'Faltas Justificadas (Dias)': emp.totalJustified,
      'Faltas Injustificadas (Dias)': emp.totalUnjustified,
      'Total de Dias de Faltas': emp.totalDays,
      'Última Falta': emp.lastAbsenceDate ? emp.lastAbsenceDate.split('-').reverse().join('/') : '',
      'Registado Por': emp.registeredBy
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio_Faltas");
    const dirLabel = directorateId ? getName(orgData.directorates, directorateId).replace(/[\/\s]/g, '_') : 'Nacional';
    XLSX.writeFile(workbook, `Faltas_SERNIC_${dirLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Impressão Institucional SERNIC por Perfil Secundário / Direcção Provincial
  const handlePrintProvincialMap = () => {
    if (faltososList.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Não existem registos de faltas para imprimir com os filtros selecionados.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }

    const currentDirName = directorateId ? getName(orgData.directorates, directorateId) : 'CONSOLIDADO NACIONAL (TODAS AS DIRECÇÕES)';
    const dateStr = new Date().toLocaleDateString('pt-PT');
    const totalFaltosos = faltososList.length;
    const grandTotalDays = faltososList.reduce((acc, curr) => acc + curr.totalDays, 0);
    const grandJustified = faltososList.reduce((acc, curr) => acc + curr.totalJustified, 0);
    const grandUnjustified = faltososList.reduce((acc, curr) => acc + curr.totalUnjustified, 0);

    const printWin = window.open('', '', 'width=1000,height=700');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mapa Oficial de Efetividade e Faltas - ${currentDirName}</title>
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 0; padding: 20px; font-size: 11px; }
            .header { text-align: center; border-bottom: 2.5px solid #1B365D; padding-bottom: 12px; margin-bottom: 16px; }
            .header h2 { margin: 0 0 4px 0; font-size: 14px; text-transform: uppercase; color: #1B365D; }
            .header h3 { margin: 0 0 4px 0; font-size: 12px; font-weight: 600; }
            .header h4 { margin: 0 0 6px 0; font-size: 13px; color: #1B365D; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-box { display: flex; justify-content: space-between; background-color: #f8fafc; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 14px; }
            .meta-box div { font-size: 11px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            th { background-color: #1B365D; color: #ffffff; padding: 6px 8px; border: 1px solid #0f2442; text-align: left; font-weight: 700; }
            td { padding: 5px 8px; border: 1px solid #cbd5e1; text-align: left; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer-totals { margin-top: 14px; padding: 10px 14px; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; justify-content: space-around; font-weight: bold; font-size: 11px; }
            .signatures { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
            .sig-block { width: 28%; border-top: 1px solid #333; padding-top: 6px; font-size: 10.5px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h2>REPÚBLICA DE MOÇAMBIQUE</h2>
            <h3>MINISTÉRIO DO INTERIOR</h3>
            <h4>SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL (SERNIC)</h4>
            <div style="font-weight: 800; font-size: 11.5px; color: #1B365D; text-transform: uppercase;">DIRECÇÃO GERAL</div>
            <div style="font-weight: 700; font-size: 11px; color: #1B365D; text-transform: uppercase;">DIRECÇÃO DE RECURSOS HUMANOS</div>
            <div style="margin-top: 6px; font-size: 12.5px; font-weight: 800; text-transform: uppercase; color: #1B365D;">
              MAPA OFICIAL DE EFETIVIDADE E ASSIDUIDADE DE PESSOAL
            </div>
          </div>

          <div class="meta-box">
            <div>
              <strong>ÂMBITO TERRITORIAL:</strong> ${currentDirName.toUpperCase()}<br />
              <strong>EMISSÃO:</strong> ${dateStr} • <strong>SISTEMA:</strong> SERNIC-DRH SIGRH
            </div>
            <div style="text-align: right;">
              <strong>TOTAL DE FALTOSOS:</strong> ${totalFaltosos} Funcionários<br />
              <strong>TOTAL DE DIAS DE FALTA:</strong> ${grandTotalDays} Dias (${grandJustified} Justificadas | ${grandUnjustified} Injustificadas)
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">Nº</th>
                <th>NUIT / NIP</th>
                <th>Nome Completo</th>
                <th>Carreira / Categoria</th>
                <th>Cargo / Função</th>
                <th>Direcção / Província</th>
                <th style="text-align: center;">F. Just.</th>
                <th style="text-align: center;">F. Injust.</th>
                <th style="text-align: center;">Total Dias</th>
                <th>Última Falta</th>
                <th>Registado Por</th>
              </tr>
            </thead>
            <tbody>
              ${faltososList.map((f, i) => `
                <tr>
                  <td style="text-align: center;">${i + 1}</td>
                  <td><strong>${f.nip}</strong></td>
                  <td><strong>${f.name}</strong></td>
                  <td>${f.category || f.career}</td>
                  <td>${f.role || 'Investigador'}</td>
                  <td>${f.directorate}</td>
                  <td style="text-align: center; color: #059669; font-weight: bold;">${f.totalJustified}</td>
                  <td style="text-align: center; color: #dc2626; font-weight: bold;">${f.totalUnjustified}</td>
                  <td style="text-align: center; font-weight: bold; background-color: #f1f5f9;">${f.totalDays}</td>
                  <td>${f.lastAbsenceDate ? f.lastAbsenceDate.split('-').reverse().join('/') : '-'}</td>
                  <td>${f.registeredBy}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer-totals">
            <span>Total Geral de Funcionários: ${totalFaltosos}</span>
            <span>Total Faltas Justificadas: ${grandJustified} Dias</span>
            <span>Total Faltas Injustificadas: ${grandUnjustified} Dias</span>
            <span>Volume Global de Ausências: ${grandTotalDays} Dias</span>
          </div>

          <div class="signatures">
            <div class="sig-block">
              O Responsável Provincial de RH<br /><br /><br />
              _____________________________________<br />
              Data: ____/____/2026
            </div>
            <div class="sig-block">
              O Director da Direcção Provincial<br /><br /><br />
              _____________________________________<br />
              Data: ____/____/2026
            </div>
            <div class="sig-block">
              Visto Central (DRH / SERNIC)<br /><br /><br />
              _____________________________________<br />
              Direcção de Recursos Humanos
            </div>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Soft delete / anular falta handler
  const handleSoftDelete = (absenceId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Anulação',
      message: 'Pretende anular/remover esta falta permanentemente do histórico do funcionário? Esta operação será registada na Auditoria.',
      isDestructive: true,
      hideCancel: false,
      onConfirm: async () => {
        const res = await deleteRecord(absenceId);
        if (res.success) {
          setConfirmModal({
            isOpen: true,
            title: 'Sucesso',
            message: 'Falta anulada com sucesso.',
            hideCancel: true,
            confirmText: 'OK'
          });
        } else {
          setConfirmModal({
            isOpen: true,
            title: 'Erro',
            message: res.error,
            hideCancel: true,
            confirmText: 'OK'
          });
        }
      }
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (abs) => {
    setEditingAbsence(abs);
    setEditType(abs.type);
    setEditStart(abs.startDate);
    setEditEnd(abs.endDate || abs.startDate);
    setEditReason(abs.reason || '');
    setEditNotes(abs.notes || '');
    setEditError('');
  };

  // Submit Edit com recálculo automático de datas e dias
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editStart) {
      setEditError('Por favor informe a data inicial.');
      return;
    }

    const startDate = editStart;
    const endDate = editEnd || editStart;
    if (endDate < startDate) {
      setEditError('A data final não pode ser anterior à data inicial.');
      return;
    }

    let datesList = [];
    let cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end) {
      datesList.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    const daysCount = datesList.length || 1;

    const res = await updateRecord(editingAbsence.id, {
      ...editingAbsence,
      type: editType,
      startDate: startDate,
      endDate: endDate,
      dates: datesList,
      daysCount: daysCount,
      reason: editReason,
      notes: editNotes,
      updatedAt: new Date().toISOString()
    });

    if (res.success) {
      setConfirmModal({
        isOpen: true,
        title: 'Sucesso',
        message: 'Falta atualizada com sucesso.',
        hideCancel: true,
        confirmText: 'OK',
        onConfirm: () => {
          setEditingAbsence(null);
        }
      });
    } else {
      setEditError(res.error || 'Erro ao atualizar falta.');
    }
  };

  // Quick Register Modal Handlers
  const handleOpenRegister = (emp = null) => {
    setRegisteringEmp(emp || { isNew: true });
    setNewType('Falta Justificada');
    const today = new Date().toISOString().split('T')[0];
    setNewStart(today);
    setNewEnd(today);
    setNewReason('');
    setNewNotes('');
    setNewError('');
  };

  const handleSaveRegister = async (e) => {
    e.preventDefault();
    setNewError('');

    if (!newStart) {
      setNewError('Por favor informe a data inicial.');
      return;
    }

    const startDate = newStart;
    const endDate = newEnd || newStart;
    if (endDate < startDate) {
      setNewError('A data final não pode ser anterior à data inicial.');
      return;
    }

    let datesList = [];
    let cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end) {
      datesList.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    const daysCount = datesList.length || 1;

    const empObj = employees.find(e => String(e.id) === String(registeringEmp.employeeId || registeringEmp.id)) || registeringEmp;
    const dirObj = (orgData?.directorates || []).find(d => String(d.id) === String(empObj.directorateId));

    const payload = {
      employeeId: empObj.id || registeringEmp.employeeId,
      employeeNip: empObj.nip || empObj.nuit || registeringEmp.nip || '-',
      employeeName: empObj.name || registeringEmp.name || 'Funcionário',
      gender: empObj.gender || registeringEmp.gender,
      type: newType,
      dates: datesList,
      daysCount: daysCount,
      startDate: startDate,
      endDate: endDate,
      reason: newReason,
      notes: newNotes,
      provinceId: empObj.provinceId || registeringEmp.provinceId || dirObj?.province || '',
      districtId: empObj.districtId || registeringEmp.districtId || '',
      directorateId: empObj.directorateId || registeringEmp.directorateId || userDirId || '',
      directorateName: dirObj?.name || registeringEmp.directorate || 'Direcção Geral',
      departmentId: empObj.departmentId || registeringEmp.departmentId || '',
      divisionId: empObj.divisionId || registeringEmp.divisionId || '',
      sectionId: empObj.sectionId || registeringEmp.sectionId || '',
      careerId: empObj.careerId || registeringEmp.careerId || '',
      categoryId: empObj.categoryId || registeringEmp.categoryId || '',
      jobPosition: empObj.role || registeringEmp.role || 'Investigador',
      registeredBy: user?.username || 'Utilizador',
      registeredByName: user?.name || user?.username || 'Utilizador RH',
      registeredByRole: user?.roleName || user?.roleId || 'Operador',
      registeredByDirectorateId: user?.directorateId || empObj.directorateId || '',
      registeredAt: new Date().toISOString()
    };

    const res = await addRecord(payload);
    if (res.success) {
      setConfirmModal({
        isOpen: true,
        title: 'Sucesso',
        message: `Falta registada com sucesso para ${payload.employeeName}!`,
        hideCancel: true,
        confirmText: 'OK',
        onConfirm: () => {
          setRegisteringEmp(null);
        }
      });
    } else {
      setNewError(res.error || 'Erro ao registar falta.');
    }
  };

  // Anular todas as faltas do funcionário
  const handleDeleteAllForEmployee = (empId, empName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar Anulação Total',
      message: `Pretende anular e remover todas as faltas registadas de ${empName}? Esta operação não pode ser desfeita.`,
      isDestructive: true,
      hideCancel: false,
      onConfirm: async () => {
        const res = await deleteEmployeeAbsences(empId);
        if (res.success) {
          if (selectedEmpId === empId) setSelectedEmpId(null);
          setConfirmModal({
            isOpen: true,
            title: 'Sucesso',
            message: 'Todas as faltas do funcionário foram anuladas com sucesso.',
            hideCancel: true,
            confirmText: 'OK'
          });
        }
      }
    });
  };

  return (
    <div style={styles.container}>
      {/* 1. SELETOR DE ESCOPO / PERFIL SECUNDÁRIO PARA O PERFIL PRIMÁRIO CENTRAL */}
      {isCentral ? (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          padding: '14px 18px',
          backgroundColor: 'rgba(27, 54, 93, 0.05)',
          borderRadius: '10px',
          border: '1.5px solid var(--color-primary, #1B365D)',
          marginBottom: '16px',
          flexWrap: 'wrap',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🏛️</span>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--color-primary, #1B365D)' }}>
                Direcção Provincial de RH:
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={directorateId}
              onChange={(e) => {
                setDirectorateId(e.target.value);
                setDepartmentId('');
                setDivisionId('');
                setSectionId('');
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid var(--color-primary)',
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-main)',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">🌐 Todas as Direcções Provinciais (Consolidado Nacional)</option>
              {(orgData?.directorates || []).map(d => (
                <option key={d.id} value={d.id}>
                  📍 {d.name} ({absenceCountByDir[String(d.id)] || 0} dias de falta)
                </option>
              ))}
            </select>

            <button
              onClick={handlePrintProvincialMap}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary, #1B365D)',
                color: 'var(--color-accent, #EAAA00)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Imprimir Mapa Oficial de Faltas desta Direcção"
            >
              🖨️ Imprimir Mapa
            </button>

            {isPrincipal && (
              <button
                onClick={handlePrintAllNational}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
                }}
                title="Imprimir todas as faltas de todas as direcções e unidades (Consolidado Nacional)"
              >
                🏛️ Imprimir Todas as Direcções
              </button>
            )}
          </div>
        </div>
      ) : (
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
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📍</span>
            <span>
              <strong>Gerência Provincial Ativa:</strong> {userDirObj?.name || 'Direcção Local'} — Visualização restrita aos efectivos sob sua alçada.
            </span>
          </div>
          <button
            onClick={handlePrintProvincialMap}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--color-primary, #1B365D)',
              color: 'var(--color-accent, #EAAA00)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px'
            }}
          >
            🖨️ Imprimir Mapa Provincial
          </button>
        </div>
      )}
      
      {/* Bloco de Filtros */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h4 style={styles.cardTitle}>Pesquisa e Filtros de Efetividade</h4>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.filterGrid}>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Pesquisa por Nome/NUIT</label>
              <input 
                type="text" 
                placeholder="Ex: João da Silva..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                style={styles.input} 
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de Falta</label>
              <select value={absenceType} onChange={(e) => setAbsenceType(e.target.value)} style={styles.input}>
                <option value="">Todos os Tipos</option>
                <option value="Falta Justificada">Falta Justificada</option>
                <option value="Falta Injustificada">Falta Injustificada</option>
              </select>
            </div>

            {isCentral && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Província</label>
                <select value={provinceId} onChange={(e) => { setProvinceId(e.target.value); setDistrictId(''); }} style={styles.input}>
                  <option value="">Todas</option>
                  {mozambiqueStructure.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}
                </select>
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Distrito</label>
              <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} style={styles.input} disabled={!provinceId}>
                <option value="">Todos</option>
                {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {isCentral ? (
              <div style={styles.formGroup}>
                <label style={styles.label}>Direcção / Unidade Orgânica</label>
                <select 
                  value={directorateId} 
                  onChange={(e) => { 
                    setDirectorateId(e.target.value); 
                    setDepartmentId(''); 
                    setDivisionId(''); 
                  }} 
                  style={styles.input}
                >
                  <option value="">Todas as Direcções</option>
                  {(orgData?.directorates || []).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={styles.formGroup}>
                <label style={styles.label}>Direcção / Unidade Orgânica</label>
                <select value={directorateId} disabled style={styles.input}>
                  <option value={directorateId}>{userDirObj?.name || 'Minha Direcção'}</option>
                </select>
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Departamento</label>
              <select 
                value={departmentId} 
                onChange={(e) => { 
                  setDepartmentId(e.target.value); 
                  setDivisionId(''); 
                }} 
                style={styles.input}
                disabled={!directorateId}
              >
                <option value="">{directorateId ? 'Todos os Departamentos' : 'Selecione a Direcção primeiro'}</option>
                {availableDepartments.map(dep => (
                  <option key={dep.id} value={dep.id}>{dep.name}</option>
                ))}
              </select>
            </div>

            <div style={{ ...styles.formGroup, minWidth: '260px' }}>
              <label style={{ ...styles.label, whiteSpace: 'nowrap' }}>Repartição / Repartição Central</label>
              <select 
                value={divisionId} 
                onChange={(e) => setDivisionId(e.target.value)} 
                style={styles.input}
                disabled={!directorateId}
              >
                <option value="">
                  {!directorateId 
                    ? 'Selecione a Direcção primeiro' 
                    : (departmentId ? 'Todas as Repartições do Departamento' : 'Todas as Repartições (incluindo Centrais)')
                  }
                </option>
                {availableDivisions.map(div => {
                  const isCentralDiv = !div.departmentId;
                  return (
                    <option key={div.id} value={div.id}>
                      {div.name}{isCentralDiv ? ' (Repartição Central)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Carreira</label>
              <select value={careerId} onChange={(e) => setCareerId(e.target.value)} style={styles.input}>
                <option value="">Todas</option>
                {(orgData?.careers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Período (De - Até)</label>
              <div style={{display:'flex', gap:'4px', flexWrap:'wrap'}}>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{...styles.input, padding:'8px 4px', flex:1}} />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{...styles.input, padding:'8px 4px', flex:1}} />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Mês / Ano</label>
              <div style={{display:'flex', gap:'4px', flexWrap:'wrap'}}>
                <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{...styles.input, flex:1}}>
                  <option value="">Mês</option>
                  {Array.from({length: 12}).map((_, i) => {
                    const m = (i + 1).toString().padStart(2, '0');
                    return <option key={m} value={m}>{m}</option>;
                  })}
                </select>
                <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{...styles.input, flex:1}}>
                  <option value="">Ano</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Agrupamento Inteligente</label>
              <select value={groupCriteria} onChange={(e) => setGroupCriteria(e.target.value)} style={{...styles.input, borderColor:'var(--color-primary)', fontWeight:'600'}}>
                <option value="none">Nenhum (Lista Geral)</option>
                <option value="directorate">Por Direcção</option>
                <option value="department">Por Departamento</option>
                <option value="province">Por Província</option>
                <option value="district">Por Distrito</option>
                <option value="career">Por Carreira</option>
                <option value="category">Por Categoria</option>
                <option value="type">Por Tipo de Falta</option>
              </select>
            </div>

          </div>

          <div style={styles.filterFooter}>
            <button 
              type="button" 
              onClick={() => {
                setSearchTerm(''); 
                if (isCentral) { setProvinceId(''); setDirectorateId(''); }
                setDistrictId('');
                setDepartmentId(''); setDivisionId(''); setSectionId(''); setCareerId('');
                setCategoryId(''); setRoleFilter(''); setAbsenceType(''); setDateFrom('');
                setDateTo(''); setYearFilter(''); setMonthFilter(''); setGroupCriteria('none');
              }}
              style={styles.btnReset}
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Exibição Condicional baseada no Agrupamento */}
      {groupCriteria !== 'none' ? (
        
        /* 1. Modo Agrupado */
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h4 style={styles.cardTitle}>Agrupamento Inteligente de Faltosos</h4>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.tableContainer}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Critério / Grupo</th>
                    <th>Qtd. Funcionários Faltosos</th>
                    <th>Total de Dias de Falta</th>
                    <th>Média de Dias por Funcionário</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={styles.empty}>Nenhum registo no período.</td>
                    </tr>
                  ) : (
                    groupedData.map((g, idx) => (
                      <tr key={idx} style={styles.tr}>
                        <td><strong>{g.name}</strong></td>
                        <td>{g.employeesCount}</td>
                        <td>{g.totalDays} Dias</td>
                        <td><strong style={{color:'var(--color-primary)'}}>{g.averageDays} dias/func</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      ) : (

        /* 2. Modo Lista de Funcionários Faltosos */
        <div style={styles.resultsContainer}>
          
          {/* Tabela Principal */}
          <div style={{...styles.card, flex: 1, minWidth: '350px'}}>
            <div style={styles.cardHeaderWithInfo}>
              <h4 style={styles.cardTitle}>
                Lista de Funcionários com Faltas ({faltososList.length})
              </h4>
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                {isPrincipal && (
                  <button 
                    onClick={handlePrintAllNational} 
                    style={{
                      ...styles.btnGoToRegister, 
                      backgroundColor: '#DC2626', 
                      color: '#FFFFFF',
                      boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
                    }}
                    title="Imprimir todas as faltas de todas as direcções e unidades do SERNIC"
                  >
                    🏛️ Imprimir Todas as Faltas (Todas as Direcções)
                  </button>
                )}
                <button onClick={handlePrintProvincialMap} style={{...styles.btnGoToRegister, backgroundColor: 'var(--color-primary, #1B365D)'}}>
                  🖨️ Imprimir Mapa
                </button>
                <button onClick={exportToExcel} style={{...styles.btnGoToRegister, backgroundColor: '#107c41'}}>
                  📊 Exportar Excel
                </button>
                <button onClick={() => handleOpenRegister(null)} style={styles.btnGoToRegister}>
                  + Registar Falta
                </button>
              </div>
            </div>

            <div style={styles.cardBody}>
              <div style={styles.tableContainer}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Funcionário</th>
                      <th>Direcção & Origem</th>
                      <th>Cargo / Carreira</th>
                      <th>Justificadas</th>
                      <th>Injustificadas</th>
                      <th>Total Dias</th>
                      <th>Última Falta</th>
                      <th style={{textAlign: 'right'}}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faltososList.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={styles.empty}>
                          Nenhum funcionário com faltas registadas para os filtros definidos.
                        </td>
                      </tr>
                    ) : (
                      faltososList.map(emp => (
                        <tr 
                          key={emp.employeeId} 
                          style={{
                            ...styles.tr,
                            backgroundColor: selectedEmpId === emp.employeeId ? 'rgba(27, 54, 93, 0.08)' : 'transparent',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedEmpId(emp.employeeId === selectedEmpId ? null : emp.employeeId)}
                        >
                          <td>
                            <strong>{emp.name}</strong>
                            <div style={{fontSize: '11px', color: 'var(--color-text-muted)'}}>
                              NUIT: {emp.nip}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-primary)' }}>
                              📍 {emp.directorate}
                            </span>
                            <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                              Reg: {emp.registeredBy}
                            </div>
                          </td>
                          <td>
                            <div>{emp.role}</div>
                            <div style={{fontSize: '11px', color: 'var(--color-text-muted)'}}>{emp.category || emp.career}</div>
                          </td>
                          <td style={{ color: '#059669', fontWeight: 'bold' }}>
                            {emp.totalJustified} d
                          </td>
                          <td style={{ color: '#dc2626', fontWeight: 'bold' }}>
                            {emp.totalUnjustified} d
                          </td>
                          <td>
                            <strong style={{fontSize: '13px', color: 'var(--color-text-main)'}}>{emp.totalDays} Dias</strong>
                          </td>
                          <td>
                            {emp.lastAbsenceDate ? emp.lastAbsenceDate.split('-').reverse().join('/') : '-'}
                          </td>
                          <td style={{textAlign: 'right'}}>
                            <div style={{display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center'}}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEmpId(emp.employeeId === selectedEmpId ? null : emp.employeeId);
                                }}
                                style={styles.btnViewDetails}
                                title="Ver histórico de faltas"
                              >
                                {selectedEmpId === emp.employeeId ? 'Fechar' : '👁️ Histórico'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRegister(emp);
                                }}
                                style={{...styles.btnViewDetails, borderColor: '#059669', color: '#059669'}}
                                title="Registar nova falta para este funcionário"
                              >
                                ➕ Falta
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAllForEmployee(emp.employeeId, emp.name);
                                }}
                                style={{...styles.btnViewDetails, borderColor: '#ef4444', color: '#ef4444'}}
                                title="Anular todas as faltas deste funcionário"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Painel Lateral / Detalhes das Faltas do Funcionário Selecionado */}
          {selectedEmpDetails && (
            <div style={styles.detailCard}>
              <div style={styles.detailHeader}>
                <div>
                  <h4 style={{margin: 0, fontSize: '15px', color: 'var(--color-primary)'}}>
                    Histórico: {selectedEmpDetails.name}
                  </h4>
                  <div style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>
                    NUIT: {selectedEmpDetails.nip} • {selectedEmpDetails.directorate}
                  </div>
                </div>
                <button onClick={() => setSelectedEmpId(null)} style={styles.btnCloseDetail}>✕</button>
              </div>

              <div style={styles.detailBody}>
                <div style={styles.detailSummary}>
                  <div><strong>Total:</strong> {selectedEmpDetails.totalDays} Dias</div>
                  <div><strong>Justificadas:</strong> {selectedEmpDetails.totalJustified} Dias</div>
                  <div><strong>Injustificadas:</strong> {selectedEmpDetails.totalUnjustified} Dias</div>
                </div>

                <div style={{marginTop: '10px', display: 'flex', gap: '8px'}}>
                  <button
                    onClick={() => handleOpenRegister(selectedEmpDetails)}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      backgroundColor: 'var(--color-primary, #1B365D)',
                      color: 'var(--color-accent, #EAAA00)',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    ➕ Registar Falta
                  </button>
                  <button
                    onClick={() => handleDeleteAllForEmployee(selectedEmpDetails.employeeId, selectedEmpDetails.name)}
                    style={{
                      padding: '7px 10px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#dc2626',
                      border: '1px solid #dc2626',
                      borderRadius: '5px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    title="Anular todas as faltas deste funcionário"
                  >
                    🗑️ Anular Todas
                  </button>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px'}}>
                  {selectedEmpDetails.absences.map((abs, i) => (
                    <div key={abs.id || i} style={styles.absenceItem}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                          backgroundColor: abs.type === 'Falta Justificada' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: abs.type === 'Falta Justificada' ? '#059669' : '#dc2626'
                        }}>
                          {abs.type} ({abs.daysCount || (abs.dates ? abs.dates.length : 1)} dias)
                        </span>
                        
                        <div style={{display: 'flex', gap: '4px'}}>
                          <button onClick={() => handleOpenEdit(abs)} style={styles.btnSmallEdit} title="Editar Falta">✏️</button>
                          <button onClick={() => handleSoftDelete(abs.id)} style={styles.btnSmallDelete} title="Anular Falta">🗑️</button>
                        </div>
                      </div>

                      <div style={{fontSize: '12px', color: 'var(--color-text-main)', margin: '4px 0'}}>
                        <strong>Datas:</strong> {abs.dates && abs.dates.length > 0 ? formatDatesList(abs.dates) : `${abs.startDate} a ${abs.endDate}`}
                      </div>

                      {abs.reason && (
                        <div style={{fontSize: '11.5px', color: 'var(--color-text-muted)', fontStyle: 'italic'}}>
                          <strong>Motivo:</strong> {abs.reason}
                        </div>
                      )}

                      <div style={{fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '4px'}}>
                        Registado por: {abs.registeredByName || abs.registeredBy || 'Operador'} ({new Date(abs.createdAt || abs.registeredAt || Date.now()).toLocaleDateString()})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL DE NOVO REGISTO DE FALTA DIRETO */}
      {registeringEmp && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div>
                <h4 style={{margin: 0, color: 'var(--color-primary)'}}>Registar Falta</h4>
                {(registeringEmp.name || registeringEmp.employeeName) && (
                  <div style={{fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px'}}>
                    {registeringEmp.name || registeringEmp.employeeName} (NUIT: {registeringEmp.nip || registeringEmp.employeeNip})
                  </div>
                )}
              </div>
              <button onClick={() => setRegisteringEmp(null)} style={styles.btnCloseDetail}>✕</button>
            </div>

            <form onSubmit={handleSaveRegister} style={{display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px'}}>
              {newError && <div style={{color: '#dc2626', fontSize: '12px'}}>{newError}</div>}

              {(!registeringEmp.id && !registeringEmp.employeeId) && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Funcionário *</label>
                  <select
                    value={registeringEmp.employeeId || ''}
                    onChange={(e) => {
                      const chosen = employees.find(emp => String(emp.id) === String(e.target.value));
                      if (chosen) {
                        setRegisteringEmp({
                          ...chosen,
                          employeeId: chosen.id,
                          employeeNip: chosen.nip || chosen.nuit,
                          employeeName: chosen.name
                        });
                      }
                    }}
                    style={styles.input}
                    required
                  >
                    <option value="">-- Selecione o Funcionário ({employees.length}) --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} (NUIT: {emp.nip || emp.nuit || '-'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Tipo de Falta</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)} style={styles.input}>
                  <option value="Falta Justificada">Falta Justificada</option>
                  <option value="Falta Injustificada">Falta Injustificada</option>
                </select>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data Inicial</label>
                  <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} style={styles.input} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data Final</label>
                  <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} style={styles.input} required />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Motivo / Justificação</label>
                <input
                  type="text"
                  placeholder="Ex: Motivo de saúde, comparência judicial, ausência sem aviso..."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Notas / Observações</label>
                <textarea
                  placeholder="Observações adicionais ou despacho..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  style={{...styles.input, minHeight: '60px'}}
                />
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px'}}>
                <button type="button" onClick={() => setRegisteringEmp(null)} style={styles.btnReset}>Cancelar</button>
                <button type="submit" style={styles.btnGoToRegister}>Gravar Registo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE FALTA */}
      {editingAbsence && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h4 style={{margin: 0, color: 'var(--color-primary)'}}>Editar Registo de Falta</h4>
              <button onClick={() => setEditingAbsence(null)} style={styles.btnCloseDetail}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px'}}>
              {editError && <div style={{color: '#dc2626', fontSize: '12px'}}>{editError}</div>}

              <div style={styles.formGroup}>
                <label style={styles.label}>Tipo de Falta</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)} style={styles.input}>
                  <option value="Falta Justificada">Falta Justificada</option>
                  <option value="Falta Injustificada">Falta Injustificada</option>
                </select>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data Inicial</label>
                  <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} style={styles.input} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data Final</label>
                  <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} style={styles.input} required />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Motivo / Justificação</label>
                <input type="text" value={editReason} onChange={(e) => setEditReason(e.target.value)} style={styles.input} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Notas / Observações</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} style={{...styles.input, minHeight: '60px'}} />
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px'}}>
                <button type="button" onClick={() => setEditingAbsence(null)} style={styles.btnReset}>Cancelar</button>
                <button type="submit" style={styles.btnGoToRegister}>Guardar Alterações</button>
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
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        hideCancel={confirmModal.hideCancel}
        confirmText={confirmModal.confirmText || 'OK'}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: { backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  cardHeader: { padding: '14px 18px', borderBottom: '1px solid var(--color-border)' },
  cardHeaderWithInfo: { padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary)' },
  cardBody: { padding: '16px' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '14px' },
  filterFooter: { display: 'flex', justifyContent: 'flex-end', marginTop: '14px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '11.5px', fontWeight: '600', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' },
  input: { padding: '8px 10px', borderRadius: '5px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-main)', fontSize: '12.5px', outline: 'none' },
  btnReset: { padding: '6px 14px', borderRadius: '5px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '12px' },
  btnGoToRegister: { padding: '8px 14px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', fontWeight: 'bold', cursor: 'pointer', fontSize: '12.5px' },
  tableContainer: { overflowX: 'auto' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  empty: { textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  resultsContainer: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' },
  btnViewDetails: { padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-primary)', backgroundColor: 'transparent', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  detailCard: { width: '380px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' },
  detailHeader: { padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  detailBody: { padding: '14px', maxHeight: '550px', overflowY: 'auto' },
  btnCloseDetail: { background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: 'var(--color-text-muted)' },
  detailSummary: { display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(27, 54, 93, 0.05)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '600' },
  absenceItem: { padding: '10px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '6px' },
  btnSmallEdit: { padding: '2px 5px', border: '1px solid var(--color-border)', borderRadius: '3px', background: 'none', cursor: 'pointer', fontSize: '10px' },
  btnSmallDelete: { padding: '2px 5px', border: '1px solid #ef4444', borderRadius: '3px', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  modalContent: { backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', width: '480px', maxWidth: '95%' },
  modalHeader: { padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
};
