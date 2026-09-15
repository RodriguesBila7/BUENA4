import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useOrgData from '../../hooks/useOrgData';
import { isCentralUser, isPrimaryCentralAdmin, filterByProvincialScope } from '../../utils/scopeUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ConfirmModal from '../ConfirmModal';
import useDraggable from '../../hooks/useDraggable';
import { printAllAbsencesNationalMap } from './printAllEffectiveness';

export default function EffectivenessReports({ user, orgData: passedOrgData, employeesData }) {
  const { employees: allEmployees } = useEmployeeData();
  const { records, deleteRecord, updateRecord } = useEffectivenessData();
  const { data: hookOrgData } = useOrgData();

  const orgData = passedOrgData?.data || passedOrgData || hookOrgData || { directorates: [], departments: [], divisions: [], sections: [], careers: [], categories: [] };
  const isCentral = isCentralUser(user);
  const isPrincipal = isPrimaryCentralAdmin(user) || isCentralUser(user);

  const handlePrintAllNational = () => {
    printAllAbsencesNationalMap({
      records,
      employees: allEmployees,
      orgData,
      user
    });
  };

  // Escopo de funcionários
  const employees = useMemo(() => {
    let raw = (employeesData?.employees || (Array.isArray(employeesData) ? employeesData : null) || allEmployees) || [];
    if (!isCentral && user) {
      return filterByProvincialScope(raw, user, orgData);
    }
    return raw;
  }, [employeesData, allEmployees, isCentral, user, orgData]);

  const userDirId = user?.directorateId ? String(user.directorateId) : '';
  const userDirObj = userDirId ? (orgData?.directorates || []).find(d => String(d.id) === userDirId) : null;

  // Selections
  const [reportType, setReportType] = useState('directorate'); // 'directorate', 'general', 'department', 'type', 'monthly', 'yearly'
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Specific filters
  const [selectedDirectorateId, setSelectedDirectorateId] = useState(!isCentral ? userDirId : '');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedAbsenceType, setSelectedAbsenceType] = useState('');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, hideCancel: false });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const { position, onPointerDown } = useDraggable();

  const getName = (list, id) => list?.find(item => String(item.id) === String(id))?.name || '-';

  const formatDatesList = (dates = []) => {
    if (!dates.length) return '';
    return dates.map(d => {
      const parts = d.split('-');
      if (parts.length !== 3) return d;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }).join(', ');
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover Registo de Falta',
      message: 'Tem a certeza que deseja eliminar este registo de falta permanentemente? Esta ação afetará as estatísticas.',
      isDestructive: true,
      onConfirm: async () => {
        await deleteRecord(id);
      },
      hideCancel: false
    });
  };

  const handleEdit = (rec) => {
    setEditFormData({
      id: rec.id,
      type: rec.type,
      reason: rec.reason
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (editFormData) {
      await updateRecord(editFormData.id, {
        type: editFormData.type,
        reason: editFormData.reason
      });
      setEditModalOpen(false);
    }
  };

  // Base Scoped Records
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

  // Active employees in target unit for percentage calculation
  const activeEmployeesInUnit = useMemo(() => {
    return employees.filter(emp => {
      if (!emp.isActive) return false;
      if (selectedDirectorateId && String(emp.directorateId) !== String(selectedDirectorateId)) return false;
      if (selectedDepartmentId && String(emp.departmentId) !== String(selectedDepartmentId)) return false;
      return true;
    });
  }, [employees, selectedDirectorateId, selectedDepartmentId]);

  // Generate Report Data
  const reportData = useMemo(() => {
    return scopedRecords.filter(rec => {
      // Date constraints
      if (reportType === 'monthly') {
        const [year, month] = (rec.startDate || '').split('-');
        if (year !== selectedYear || month !== selectedMonth) return false;
      } else if (reportType === 'yearly') {
        const [year] = (rec.startDate || '').split('-');
        if (year !== selectedYear) return false;
      } else {
        if (dateFrom && rec.endDate < dateFrom) return false;
        if (dateTo && rec.startDate > dateTo) return false;
      }

      // Unit constraints
      if (selectedDirectorateId && String(rec.directorateId || rec.registeredByDirectorateId || '') !== String(selectedDirectorateId)) return false;
      if (selectedDepartmentId && String(rec.departmentId || '') !== String(selectedDepartmentId)) return false;
      if (selectedAbsenceType && rec.type !== selectedAbsenceType) return false;

      return true;
    }).map(rec => ({
      id: rec.id,
      nip: rec.employeeNip || '-',
      name: rec.employeeName || 'Funcionário',
      type: rec.type,
      days: Number(rec.daysCount) || (rec.dates ? rec.dates.length : 1),
      datesStr: (rec.dates && rec.dates.length > 0) ? formatDatesList(rec.dates) : `${rec.startDate} a ${rec.endDate}`,
      startDate: rec.startDate,
      endDate: rec.endDate,
      reason: rec.reason || '-',
      directorate: rec.directorateName || getName(orgData.directorates, rec.directorateId),
      province: rec.provinceId || 'Direcção Geral',
      registeredBy: rec.registeredByName || rec.registeredBy || 'Operador RH',
      dateRegistered: new Date(rec.createdAt || rec.registeredAt || Date.now()).toLocaleDateString()
    })).sort((a,b) => (b.startDate || '').localeCompare(a.startDate || ''));
  }, [scopedRecords, reportType, dateFrom, dateTo, selectedDirectorateId, selectedDepartmentId, selectedAbsenceType, selectedMonth, selectedYear, orgData]);

  // Report Summary Totals
  const summary = useMemo(() => {
    const totalEmployees = activeEmployeesInUnit.length;
    const faltososUnique = new Set(reportData.map(r => r.nip)).size;
    const totalDays = reportData.reduce((acc, curr) => acc + curr.days, 0);
    const justifiedDays = reportData.filter(r => r.type === 'Falta Justificada').reduce((acc, curr) => acc + curr.days, 0);
    const unjustifiedDays = reportData.filter(r => r.type !== 'Falta Justificada').reduce((acc, curr) => acc + curr.days, 0);

    let unitName = 'CONSOLIDADO NACIONAL';
    if (selectedDirectorateId) unitName = getName(orgData.directorates, selectedDirectorateId);
    else if (!isCentral && userDirObj) unitName = userDirObj.name;

    let periodStr = `${dateFrom} a ${dateTo}`;
    if (reportType === 'monthly') periodStr = `${selectedMonth}/${selectedYear}`;
    else if (reportType === 'yearly') periodStr = `Ano ${selectedYear}`;

    const dirBreakdown = {};
    reportData.forEach(r => {
      const dirName = r.directorate || 'Outra Direcção';
      if (!dirBreakdown[dirName]) dirBreakdown[dirName] = 0;
      dirBreakdown[dirName] += r.days;
    });
    const directorateBreakdown = Object.entries(dirBreakdown).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);

    return {
      totalEmployees,
      faltososUnique,
      totalDays,
      justifiedDays,
      unjustifiedDays,
      unitName,
      periodStr,
      directorateBreakdown,
      issueDate: new Date().toLocaleDateString('pt-PT') + ' ' + new Date().toLocaleTimeString('pt-PT')
    };
  }, [reportData, activeEmployeesInUnit, selectedDirectorateId, isCentral, userDirObj, dateFrom, dateTo, reportType, selectedMonth, selectedYear, orgData]);

  // Excel Export (.xlsx)
  const handleExportExcel = () => {
    if (reportData.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Sem dados para exportar.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }

    const titleData = [
      ["SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL (SERNIC)"],
      ["Direcção de Recursos Humanos"],
      ["RELATÓRIO INSTITUCIONAL DE EFETIVIDADE E ASSIDUIDADE"],
      [""],
      [`Unidade / Âmbito Territorial: ${summary.unitName}`],
      [`Período de Referência: ${summary.periodStr}`],
      [`Data de Emissão: ${summary.issueDate}`],
      [`Total de Funcionários no Quadro: ${summary.totalEmployees}`],
      [`Total de Efectivos Faltosos: ${summary.faltososUnique}`],
      [`Total de Dias de Falta: ${summary.totalDays} Dias (${summary.justifiedDays} Justificadas | ${summary.unjustifiedDays} Injustificadas)`],
      [""]
    ];

    const tableHeaders = ["NUIT / NIP", "Nome Completo", "Tipo de Falta", "Dias", "Datas da Falta", "Direcção Provincial", "Motivo", "Registado Por"];
    const rows = reportData.map(r => [
      r.nip, r.name, r.type, r.days, r.datesStr, r.directorate, r.reason, r.registeredBy
    ]);

    const finalSheetData = [...titleData, tableHeaders, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(finalSheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Faltas");

    const fileName = `SERNIC_Relatorio_Assiduidade_${summary.unitName.replace(/[\/\s]/g, '_')}_${summary.periodStr.replace(/[\/\s]/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // PDF Export
  const handleExportPDF = () => {
    if (reportData.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Sem dados para exportar.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }

    const doc = new jsPDF('landscape');
    
    // Header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("REPÚBLICA DE MOÇAMBIQUE", 14, 15);
    doc.setFont("helvetica", "normal");
    doc.text("MINISTÉRIO DO INTERIOR", 14, 20);
    doc.text("SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL (SERNIC)", 14, 25);
    doc.text("DIRECÇÃO DE RECURSOS HUMANOS", 14, 30);
    
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`MAPA DE EFETIVIDADE E ASSIDUIDADE - ${summary.unitName.toUpperCase()}`, 14, 40);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Período de Referência: ${summary.periodStr} | Emissão: ${summary.issueDate}`, 14, 46);
    doc.text(`Efectivos Faltosos: ${summary.faltososUnique} | Total de Dias: ${summary.totalDays} (${summary.justifiedDays} Just. / ${summary.unjustifiedDays} Injust.)`, 14, 51);

    const headers = ["NUIT/NIP", "Nome Completo", "Tipo de Falta", "Dias", "Datas", "Direcção Provincial", "Motivo", "Registado Por"];
    const rows = reportData.map(r => [
      r.nip, r.name, r.type, r.days, r.datesStr, r.directorate, r.reason, r.registeredBy
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 56,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [27, 54, 93], textColor: [255, 255, 255] }
    });

    const finalY = (doc.lastAutoTable || doc.previousAutoTable || { finalY: 64 }).finalY + 15;
    if (finalY + 30 < 200) {
      doc.setFontSize(9);
      doc.text("O Responsável Provincial de RH", 20, finalY);
      doc.text("___________________________________", 20, finalY + 14);

      doc.text("O Director da Direcção Provincial", 115, finalY);
      doc.text("___________________________________", 115, finalY + 14);

      doc.text("Visto Central (DRH / SERNIC)", 210, finalY);
      doc.text("___________________________________", 210, finalY + 14);
    }

    doc.save(`SERNIC_Relatorio_Assiduidade_${summary.unitName.replace(/[\/\s]/g, '_')}.pdf`);
  };

  // Direct Print A4 Institucional SERNIC
  const handleDirectPrint = () => {
    if (reportData.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Sem dados para imprimir.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }

    const printWin = window.open('', '', 'width=1000,height=700');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Oficial de Assiduidade - ${summary.unitName}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 0; padding: 15px; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #1B365D; padding-bottom: 10px; margin-bottom: 14px; }
            .header h2 { margin: 0 0 3px 0; font-size: 13.5px; text-transform: uppercase; color: #1B365D; }
            .header h3 { margin: 0 0 3px 0; font-size: 11.5px; font-weight: 600; }
            .header h4 { margin: 0 0 4px 0; font-size: 12.5px; color: #1B365D; font-weight: 800; text-transform: uppercase; }
            .meta-box { display: flex; justify-content: space-between; background-color: #f8fafc; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 12px; }
            .meta-box div { font-size: 10.5px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
            th { background-color: #1B365D; color: #ffffff; padding: 5px 6px; border: 1px solid #0f2442; text-align: left; font-weight: 700; }
            td { padding: 4px 6px; border: 1px solid #cbd5e1; text-align: left; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .totals-bar { margin-top: 12px; padding: 8px 12px; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; justify-content: space-around; font-weight: bold; font-size: 10.5px; }
            .signatures { margin-top: 35px; display: flex; justify-content: space-between; text-align: center; }
            .sig-block { width: 28%; border-top: 1px solid #333; padding-top: 5px; font-size: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h2>REPÚBLICA DE MOÇAMBIQUE</h2>
            <h3>MINISTÉRIO DO INTERIOR</h3>
            <h4>SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL (SERNIC)</h4>
            <div style="font-weight: 700; font-size: 11px; color: #1B365D;">DIRECÇÃO DE RECURSOS HUMANOS</div>
            <div style="margin-top: 4px; font-size: 12px; font-weight: 800; text-transform: uppercase;">
              MAPA OFICIAL DE EFETIVIDADE E ASSIDUIDADE DE PESSOAL
            </div>
          </div>

          <div class="meta-box">
            <div>
              <strong>ÂMBITO / DELEGAÇÃO:</strong> ${summary.unitName.toUpperCase()}<br />
              <strong>PERÍODO DE APURAÇÃO:</strong> ${summary.periodStr}
            </div>
            <div style="text-align: right;">
              <strong>EFECTIVOS FALTOSOS:</strong> ${summary.faltososUnique} Funcionários<br />
              <strong>VOLUME DE DIAS:</strong> ${summary.totalDays} Dias (${summary.justifiedDays} Justificadas | ${summary.unjustifiedDays} Injustificadas)
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 20px; text-align: center;">Nº</th>
                <th>NUIT / NIP</th>
                <th>Nome Completo</th>
                <th>Tipo de Falta</th>
                <th style="text-align: center;">Dias</th>
                <th>Datas da Ausência</th>
                <th>Direcção Provincial</th>
                <th>Motivo Apresentado</th>
                <th>Registado Por</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map((r, i) => `
                <tr>
                  <td style="text-align: center;">${i + 1}</td>
                  <td><strong>${r.nip}</strong></td>
                  <td><strong>${r.name}</strong></td>
                  <td>
                    <span style="color: ${r.type === 'Falta Justificada' ? '#059669' : '#dc2626'}; font-weight: bold;">
                      ${r.type}
                    </span>
                  </td>
                  <td style="text-align: center; font-weight: bold;">${r.days}</td>
                  <td>${r.datesStr}</td>
                  <td>${r.directorate}</td>
                  <td>${r.reason}</td>
                  <td>${r.registeredBy}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-bar">
            <span>Total Funcionários Faltosos: ${summary.faltososUnique}</span>
            <span>Faltas Justificadas: ${summary.justifiedDays} Dias</span>
            <span>Faltas Injustificadas: ${summary.unjustifiedDays} Dias</span>
            <span>Total Acumulado de Dias: ${summary.totalDays} Dias</span>
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

  return (
    <div style={styles.container}>
      
      {/* PAINEL DE CONFIGURAÇÃO DO RELATÓRIO */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h4 style={styles.cardTitle}>Emissão de Relatórios de Assiduidade e Faltas</h4>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.filterGrid}>
            
            {/* SELETOR DE PERFIL SECUNDÁRIO / DIRECÇÃO PROVINCIAL */}
            <div style={styles.formGroup}>
              <label style={styles.label}>🏛️ Direcção Provincial / Perfil Secundário</label>
              <select 
                value={selectedDirectorateId} 
                onChange={(e) => {
                  setSelectedDirectorateId(e.target.value);
                  setSelectedDepartmentId('');
                }} 
                disabled={!isCentral}
                style={{...styles.input, fontWeight: 'bold', borderColor: 'var(--color-primary)'}}
              >
                {isCentral && <option value="">🌐 Todas as Direcções (Consolidado Nacional)</option>}
                {(orgData?.directorates || []).map(d => (
                  <option key={d.id} value={d.id}>📍 {d.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de Período</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={styles.input}>
                <option value="directorate">Por Intervalo de Datas</option>
                <option value="monthly">Mensal (Mês Selecionado)</option>
                <option value="yearly">Anual (Ano Selecionado)</option>
              </select>
            </div>

            {reportType === 'monthly' ? (
              <div style={styles.formGroup}>
                <label style={styles.label}>Mês / Ano</label>
                <div style={{display:'flex', gap:'4px'}}>
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{...styles.input, flex:1}}>
                    {Array.from({length: 12}).map((_, i) => {
                      const m = (i + 1).toString().padStart(2, '0');
                      return <option key={m} value={m}>{m}</option>;
                    })}
                  </select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{...styles.input, flex:1}}>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>
            ) : reportType === 'yearly' ? (
              <div style={styles.formGroup}>
                <label style={styles.label}>Ano de Referência</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={styles.input}>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            ) : (
              <div style={styles.formGroup}>
                <label style={styles.label}>Intervalo de Datas</label>
                <div style={{display:'flex', gap:'4px'}}>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{...styles.input, flex:1}} />
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{...styles.input, flex:1}} />
                </div>
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de Falta</label>
              <select value={selectedAbsenceType} onChange={(e) => setSelectedAbsenceType(e.target.value)} style={styles.input}>
                <option value="">Todas (Justificadas e Injustificadas)</option>
                <option value="Falta Justificada">Apenas Faltas Justificadas</option>
                <option value="Falta Injustificada">Apenas Faltas Injustificadas</option>
              </select>
            </div>

          </div>

          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', flexWrap: 'wrap'}}>
            {isPrincipal && (
              <button 
                onClick={handlePrintAllNational} 
                style={{
                  ...styles.btnPrint, 
                  backgroundColor: '#DC2626', 
                  color: '#FFFFFF',
                  borderColor: '#DC2626',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
                }}
                title="Imprimir todas as faltas de todas as direcções e unidades do SERNIC"
              >
                🏛️ Imprimir Todas as Faltas (Todas as Direcções)
              </button>
            )}
            <button onClick={handleDirectPrint} style={styles.btnPrint}>
              🖨️ Imprimir Mapa de Efetividade (A4 Oficial)
            </button>
            <button onClick={handleExportPDF} style={styles.btnPdf}>
              📄 Exportar PDF
            </button>
            <button onClick={handleExportExcel} style={styles.btnExcel}>
              📊 Exportar Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* QUADRO DE RESUMO ESTATÍSTICO DO RELATÓRIO */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>Âmbito Selecionado</div>
          <div style={{fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary)'}}>{summary.unitName}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>Efectivos Faltosos</div>
          <div style={styles.summaryVal}>{summary.faltososUnique}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>Faltas Justificadas</div>
          <div style={{...styles.summaryVal, color: '#059669'}}>{summary.justifiedDays} Dias</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>Faltas Injustificadas</div>
          <div style={{...styles.summaryVal, color: '#dc2626'}}>{summary.unjustifiedDays} Dias</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>Total Geral de Dias</div>
          <div style={styles.summaryVal}>{summary.totalDays} Dias</div>
        </div>
      </div>

      {/* TABELA DE PRÉ-VISUALIZAÇÃO DO RELATÓRIO */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h4 style={styles.cardTitle}>Pré-visualização do Mapa de Efetividade ({reportData.length} Registos)</h4>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.tableContainer}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>NUIT / NIP</th>
                  <th>Funcionário</th>
                  <th>Direcção Provincial</th>
                  <th>Tipo de Falta</th>
                  <th>Dias</th>
                  <th>Datas</th>
                  <th>Motivo</th>
                  <th>Registado Por</th>
                  <th style={{textAlign: 'right'}}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={styles.empty}>
                      Nenhum registo encontrado para os filtros e âmbito territorial selecionados.
                    </td>
                  </tr>
                ) : (
                  reportData.map((r) => (
                    <tr key={r.id} style={styles.tr}>
                      <td><strong>{r.nip}</strong></td>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.directorate}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                          backgroundColor: r.type === 'Falta Justificada' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: r.type === 'Falta Justificada' ? '#059669' : '#dc2626'
                        }}>
                          {r.type}
                        </span>
                      </td>
                      <td><strong>{r.days} d</strong></td>
                      <td>{r.datesStr}</td>
                      <td>{r.reason}</td>
                      <td style={{fontSize: '11px', color: 'var(--color-text-muted)'}}>{r.registeredBy}</td>
                      <td style={{textAlign: 'right'}}>
                        <button onClick={() => handleEdit(r)} style={styles.btnActionEdit} title="Editar">✏️</button>
                        <button onClick={() => handleDelete(r.id)} style={styles.btnActionDelete} title="Eliminar">🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO */}
      {editModalOpen && editFormData && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h4 style={{margin: 0, color: 'var(--color-primary)'}}>Retificar Falta</h4>
              <button onClick={() => setEditModalOpen(false)} style={styles.btnCloseDetail}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit} style={{display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px'}}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Tipo de Falta</label>
                <select value={editFormData.type} onChange={(e) => setEditFormData({...editFormData, type: e.target.value})} style={styles.input}>
                  <option value="Falta Justificada">Falta Justificada</option>
                  <option value="Falta Injustificada">Falta Injustificada</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Motivo / Justificação</label>
                <input type="text" value={editFormData.reason} onChange={(e) => setEditFormData({...editFormData, reason: e.target.value})} style={styles.input} />
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px'}}>
                <button type="button" onClick={() => setEditModalOpen(false)} style={styles.btnCancel}>Cancelar</button>
                <button type="submit" style={styles.btnSave}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO */}
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
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--color-primary)' },
  cardBody: { padding: '16px' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '11.5px', fontWeight: '600', color: 'var(--color-text-muted)' },
  input: { padding: '8px 10px', borderRadius: '5px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-main)', fontSize: '12.5px', outline: 'none' },
  btnPrint: { padding: '9px 18px', backgroundColor: 'var(--color-primary, #1B365D)', color: 'var(--color-accent, #EAAA00)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  btnPdf: { padding: '9px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  btnExcel: { padding: '9px 16px', backgroundColor: '#107c41', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  summaryCard: { padding: '14px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '8px' },
  summaryTitle: { fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' },
  summaryVal: { fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  tableContainer: { overflowX: 'auto' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  empty: { textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  btnActionEdit: { padding: '3px 6px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'none', cursor: 'pointer', fontSize: '11px', marginRight: '4px' },
  btnActionDelete: { padding: '3px 6px', border: '1px solid #ef4444', borderRadius: '4px', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 },
  modalContent: { backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', width: '450px', maxWidth: '95%' },
  modalHeader: { padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnCloseDetail: { background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: 'var(--color-text-muted)' },
  btnCancel: { padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'none', cursor: 'pointer' },
  btnSave: { padding: '6px 14px', border: 'none', borderRadius: '4px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', fontWeight: 'bold', cursor: 'pointer' }
};
