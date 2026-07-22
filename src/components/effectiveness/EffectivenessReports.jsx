import React, { useState, useMemo, useRef } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useOrgData from '../../hooks/useOrgData';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { mozambiqueStructure } from '../../utils/mozambiqueDistricts';
import ConfirmModal from '../ConfirmModal';
import useDraggable from '../../hooks/useDraggable';

export default function EffectivenessReports() {
  const { employees } = useEmployeeData();
  const { records, removeRecord, updateRecord } = useEffectivenessData();
  const { data: orgData } = useOrgData();

  // Selections
  const [reportType, setReportType] = useState('general'); // 'general', 'directorate', 'department', 'division', 'section', 'category', 'career', 'type', 'monthly', 'yearly'
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Specific filters depending on reportType
  const [selectedDirectorateId, setSelectedDirectorateId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedCareerId, setSelectedCareerId] = useState('');
  const [selectedAbsenceType, setSelectedAbsenceType] = useState('Falta Justificada');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, hideCancel: false });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const { position, onPointerDown } = useDraggable();

  const getName = (list, id) => list?.find(item => item.id === id)?.name || '-';

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
      onConfirm: () => removeRecord(id),
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

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (editFormData) {
      updateRecord(editFormData.id, {
        type: editFormData.type,
        reason: editFormData.reason
      });
      setEditModalOpen(false);
    }
  };

  // Filter employees for calculating "Total de funcionários" in target unit
  const activeEmployeesInUnit = useMemo(() => {
    return employees.filter(emp => {
      if (!emp.isActive) return false;
      if (reportType === 'directorate' && selectedDirectorateId && emp.directorateId !== selectedDirectorateId) return false;
      if (reportType === 'department' && selectedDepartmentId && emp.departmentId !== selectedDepartmentId) return false;
      if (reportType === 'division' && selectedDivisionId && emp.divisionId !== selectedDivisionId) return false;
      if (reportType === 'section' && selectedSectionId && emp.sectionId !== selectedSectionId) return false;
      if (reportType === 'category' && selectedCategoryId && emp.categoryId !== selectedCategoryId) return false;
      if (reportType === 'career' && selectedCareerId && emp.careerId !== selectedCareerId) return false;
      return true;
    });
  }, [employees, reportType, selectedDirectorateId, selectedDepartmentId, selectedDivisionId, selectedSectionId, selectedCategoryId, selectedCareerId]);

  // Generate Report Data
  const reportData = useMemo(() => {
    return records.filter(rec => {
      // Date constraints
      if (reportType === 'monthly') {
        const [year, month] = rec.startDate.split('-');
        if (year !== selectedYear || month !== selectedMonth) return false;
      } else if (reportType === 'yearly') {
        const [year] = rec.startDate.split('-');
        if (year !== selectedYear) return false;
      } else {
        // Date range
        if (dateFrom && rec.endDate < dateFrom) return false;
        if (dateTo && rec.startDate > dateTo) return false;
      }

      // Unit/RH constraints
      if (reportType === 'directorate' && selectedDirectorateId && rec.directorateId !== selectedDirectorateId) return false;
      if (reportType === 'department' && selectedDepartmentId && rec.departmentId !== selectedDepartmentId) return false;
      if (reportType === 'division' && selectedDivisionId && rec.divisionId !== selectedDivisionId) return false;
      if (reportType === 'section' && selectedSectionId && rec.sectionId !== selectedSectionId) return false;
      if (reportType === 'category' && selectedCategoryId && rec.categoryId !== selectedCategoryId) return false;
      if (reportType === 'career' && selectedCareerId && rec.careerId !== selectedCareerId) return false;
      if (reportType === 'type' && selectedAbsenceType && rec.type !== selectedAbsenceType) return false;

      return true;
    }).map(rec => ({
      id: rec.id,
      nip: rec.employeeNip,
      name: rec.employeeName,
      type: rec.type,
      days: rec.daysCount,
      datesStr: (rec.dates && rec.dates.length > 0) ? formatDatesList(rec.dates) : `${rec.startDate} a ${rec.endDate}`,
      startDate: rec.startDate,
      reason: rec.reason,
      directorate: getName(orgData.directorates, rec.directorateId),
      province: rec.provinceId || 'Direcção Geral',
      registeredBy: rec.createdBy,
      dateRegistered: new Date(rec.createdAt).toLocaleDateString()
    })).sort((a,b) => b.startDate.localeCompare(a.startDate));
  }, [records, reportType, dateFrom, dateTo, selectedDirectorateId, selectedDepartmentId, selectedDivisionId, selectedSectionId, selectedCategoryId, selectedCareerId, selectedAbsenceType, selectedMonth, selectedYear, orgData]);

  // Report Summary Totals
  const summary = useMemo(() => {
    const totalEmployees = activeEmployeesInUnit.length;
    const faltososUnique = new Set(reportData.map(r => r.nip)).size;
    const totalDays = reportData.reduce((acc, curr) => acc + curr.days, 0);

    let unitName = 'Geral';
    if (reportType === 'directorate' && selectedDirectorateId) unitName = getName(orgData.directorates, selectedDirectorateId);
    else if (reportType === 'department' && selectedDepartmentId) unitName = getName(orgData.departments, selectedDepartmentId);
    else if (reportType === 'division' && selectedDivisionId) unitName = getName(orgData.divisions, selectedDivisionId);
    else if (reportType === 'section' && selectedSectionId) unitName = getName(orgData.sections, selectedSectionId);
    else if (reportType === 'career' && selectedCareerId) unitName = getName(orgData.careers, selectedCareerId);
    else if (reportType === 'category' && selectedCategoryId) unitName = getName(orgData.categories, selectedCategoryId);

    let periodStr = `${dateFrom} a ${dateTo}`;
    if (reportType === 'monthly') periodStr = `${selectedMonth}/${selectedYear}`;
    else if (reportType === 'yearly') periodStr = `Ano ${selectedYear}`;

    const dirBreakdown = {};
    reportData.forEach(r => {
      const dirName = r.directorate || 'Sem Direcção';
      if (!dirBreakdown[dirName]) dirBreakdown[dirName] = 0;
      dirBreakdown[dirName] += 1;
    });
    const directorateBreakdown = Object.entries(dirBreakdown).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);

    return {
      totalEmployees,
      faltososUnique,
      totalDays,
      unitName,
      periodStr,
      directorateBreakdown,
      issueDate: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
    };
  }, [reportData, activeEmployeesInUnit, reportType, selectedDirectorateId, selectedDepartmentId, selectedDivisionId, selectedSectionId, selectedCareerId, selectedCategoryId, dateFrom, dateTo, selectedMonth, selectedYear, orgData]);

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

    // Create Excel worksheets
    const titleData = [
      ["SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL (SERNIC)"],
      ["Direcção de Recursos Humanos"],
      ["RELATÓRIO MENSAL DE EFETIVIDADE - GESTÃO DE FALTAS"],
      [""],
      [`Unidade Organizacional: ${summary.unitName}`],
      [`Período de Referência: ${summary.periodStr}`],
      [`Data de Emissão: ${summary.issueDate}`],
      [`Total de Funcionários na Unidade: ${summary.totalEmployees}`],
      [`Total de Funcionários Faltosos no Período: ${summary.faltososUnique}`],
      [`Total de Dias de Ausência Acumulado: ${summary.totalDays} Dias`],
      [""]
    ];

    const breakdownStrings = summary.directorateBreakdown.map(d => `${d.name}: ${d.count} faltas`);
    const breakdownRows = breakdownStrings.length > 0 ? [[""], ["Faltas por Direcção:"], ...breakdownStrings.map(s => [s]), [""]] : [];

    const tableHeaders = ["NUIT", "Nome Completo", "Tipo de Falta", "Dias", "Dias de Falta", "Direcção", "Província", "Motivo", "Registado Por"];
    const rows = reportData.map(r => [
      r.nip, r.name, r.type, r.days, r.datesStr, r.directorate, r.province, r.reason, r.registeredBy
    ]);

    const finalSheetData = [...titleData, ...breakdownRows, tableHeaders, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(finalSheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Faltas");

    const fileName = `SERNIC_Relatorio_Faltas_${reportType}_${summary.periodStr.replace(/[\/\s]/g, '_')}.xlsx`;
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
    
    // Institutional Header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("REPÚBLICA DE MOÇAMBIQUE", 14, 15);
    doc.setFont("helvetica", "normal");
    doc.text("MINISTÉRIO DO INTERIOR", 14, 20);
    doc.text("SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL (SERNIC)", 14, 25);
    doc.text("DIRECÇÃO DE RECURSOS HUMANOS", 14, 30);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`RELATÓRIO DE EFETIVIDADE (FALTAS) - ${reportType.toUpperCase()}`, 14, 42);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Unidade Organizacional / Critério: ${summary.unitName}`, 14, 48);
    doc.text(`Período de referência: ${summary.periodStr}`, 14, 53);
    doc.text(`Data de Emissão: ${summary.issueDate}`, 14, 58);

    // Sumary block side by side
    doc.text(`Total Funcionários na Unidade: ${summary.totalEmployees}`, 180, 48);
    doc.text(`Total Funcionários Faltosos: ${summary.faltososUnique}`, 180, 53);
    doc.text(`Total de Dias de Falta: ${summary.totalDays} Dias`, 180, 58);

    let startY = 70;
    if (summary.directorateBreakdown.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Faltas por Direcção:", 14, startY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      let breakY = startY + 6;
      summary.directorateBreakdown.forEach(d => {
        doc.text(`${d.name}: ${d.count} faltas`, 14, breakY);
        breakY += 5;
      });
      startY = breakY + 5;
    }

    const headers = ["NUIT", "Nome Completo", "Tipo de Falta", "Dias", "Dias de Falta", "Direcção", "Província", "Motivo"];
    const rows = reportData.map(r => [
      r.nip, r.name, r.type, r.days, r.datesStr, r.directorate, r.province, r.reason
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: startY,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [27, 54, 93], textColor: [255, 255, 255] }
    });

    const finalY = (doc.lastAutoTable || doc.previousAutoTable || { finalY: 64 }).finalY + 15;
    if (finalY + 30 < 210) {
      doc.setFontSize(10);
      doc.text("O Diretor de Recursos Humanos", 14, finalY);
      doc.text("__________________________________________", 14, finalY + 15);
      doc.text("Assinatura Eletrónica Certificada (SIGRH)", 14, finalY + 20);
    }

    doc.save(`SERNIC_Relatorio_Faltas_${reportType}.pdf`);
  };

  // Direct Print
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

    const printWin = window.open('', '', 'width=900,height=600');
    printWin.document.write(`
      <html>
        <head>
          <title>Imprimir Relatório de Efetividade</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #333; }
            .header { margin-bottom: 25px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .header h3, .header h4 { margin: 0 0 5px 0; }
            .summary-box { display: flex; justify-content: space-between; margin: 15px 0; background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
            .no-print { display: none !important; }
            .signature { margin-top: 50px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h3>REPÚBLICA DE MOÇAMBIQUE</h3>
            <h4>MINISTÉRIO DO INTERIOR</h4>
            <h4>SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL (SERNIC)</h4>
            <h4>DIRECÇÃO DE RECURSOS HUMANOS</h4>
            <p><strong>Relatório Mensal de Efetividade - Ausências e Faltas</strong></p>
          </div>
          <div class="summary-box">
            <div>
              <strong>Unidade:</strong> ${summary.unitName}<br />
              <strong>Período:</strong> ${summary.periodStr}<br />
              <strong>Emissão:</strong> ${summary.issueDate}
            </div>
            <div>
              <strong>Funcionários na Unidade:</strong> ${summary.totalEmployees}<br />
              <strong>Funcionários Faltosos:</strong> ${summary.faltososUnique}<br />
              <strong>Total de Dias de Falta:</strong> ${summary.totalDays} Dias
            </div>
          </div>
          <table className="premium-table">
            <thead>
              ${document.getElementById('report-tbl-header').innerHTML}
            </thead>
            <tbody>
              ${document.getElementById('report-tbl-body').innerHTML}
            </tbody>
          </table>
          <div class="signature">
            <div>
              <p>O Diretor de Recursos Humanos</p>
              <p>_____________________________________</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div style={styles.container}>
      
      {/* Configuração do Relatório */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h4 style={styles.cardTitle}>Gerador de Relatórios de Faltas (Efetividade)</h4>
        </div>
        <div style={styles.cardBody}>
          
          <div style={styles.filterGrid}>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Critério de Emissão</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={styles.input}>
                <option value="general">Relatório Geral de Faltas</option>
                <option value="directorate">Por Direcção</option>
                <option value="department">Por Departamento</option>
                <option value="division">Por Repartição</option>
                <option value="section">Por Secção</option>
                <option value="category">Por Categoria Profissional</option>
                <option value="career">Por Carreira</option>
                <option value="type">Por Tipo de Falta</option>
                <option value="monthly">Relatório Mensal</option>
                <option value="yearly">Relatório Anual</option>
              </select>
            </div>

            {/* Condicionais */}
            {reportType === 'directorate' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Direcção</label>
                <select value={selectedDirectorateId} onChange={(e) => setSelectedDirectorateId(e.target.value)} style={styles.input}>
                  <option value="">Selecione...</option>
                  {orgData.directorates.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {reportType === 'department' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Departamento</label>
                <select value={selectedDepartmentId} onChange={(e) => setSelectedDepartmentId(e.target.value)} style={styles.input}>
                  <option value="">Selecione...</option>
                  {orgData.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {reportType === 'division' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Repartição</label>
                <select value={selectedDivisionId} onChange={(e) => setSelectedDivisionId(e.target.value)} style={styles.input}>
                  <option value="">Selecione...</option>
                  {orgData.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {reportType === 'section' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Secção</label>
                <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} style={styles.input}>
                  <option value="">Selecione...</option>
                  {orgData.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {reportType === 'category' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Categoria</label>
                <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} style={styles.input}>
                  <option value="">Selecione...</option>
                  {orgData.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {reportType === 'career' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Carreira</label>
                <select value={selectedCareerId} onChange={(e) => setSelectedCareerId(e.target.value)} style={styles.input}>
                  <option value="">Selecione...</option>
                  {orgData.careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {reportType === 'type' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Tipo de Falta</label>
                <select value={selectedAbsenceType} onChange={(e) => setSelectedAbsenceType(e.target.value)} style={styles.input}>
                  <option value="Falta Justificada">Falta Justificada</option>
                  <option value="Falta Injustificada">Falta Injustificada</option>
                </select>
              </div>
            )}

            {/* Seleção de Mês/Ano */}
            {(reportType === 'monthly' || reportType === 'yearly') ? (
              <div style={styles.formGroup}>
                <label style={styles.label}>Mês de Referência <span style={{color:'red'}}>*</span></label>
                <div style={{display:'flex', gap:'4px', flexWrap:'wrap'}}>
                  {reportType === 'monthly' && (
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{...styles.input, flex: 1}}>
                      <option value="">Mês</option>
                      {Array.from({length: 12}).map((_, i) => {
                        const m = (i + 1).toString().padStart(2, '0');
                        return <option key={m} value={m}>{m}</option>;
                      })}
                    </select>
                  )}
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{...styles.input, flex: 1}}>
                    <option value="">Ano</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>
            ) : (
              // Intervalo de Datas
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data Inicial (De)</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data Final (Até)</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={styles.input} />
                </div>
              </>
            )}

          </div>

          <div style={styles.actionsBar}>
            <button onClick={handleDirectPrint} style={styles.btnAction}>
              🖨 Imprimir
            </button>
            <button onClick={handleExportExcel} style={{...styles.btnAction, backgroundColor:'#10B981', color:'#fff', borderColor:'#059669'}}>
              📊 Excel (.xlsx)
            </button>
            <button onClick={handleExportPDF} style={{...styles.btnAction, backgroundColor:'#EF4444', color:'#fff', borderColor:'#DC2626'}}>
              📕 PDF Certificado
            </button>
          </div>

        </div>
      </div>

      {/* Pré-visualização do Relatório */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h4 style={styles.cardTitle}>Pré-visualização do Relatório de Efetividade</h4>
        </div>
        <div style={styles.cardBody}>
          
          <div style={styles.summaryMetaBox}>
            <div style={styles.metaColumn}>
              <div>Instituição: <strong>SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL (SERNIC)</strong></div>
              <div>Período: <strong>{summary.periodStr}</strong></div>
              <div>Unidade/Filtro: <strong>{summary.unitName}</strong></div>
            </div>
            <div style={styles.metaColumn}>
              <div>Funcionários na Unidade: <strong>{summary.totalEmployees}</strong></div>
              <div>Funcionários Faltosos: <strong>{summary.faltososUnique}</strong></div>
              <div>Dias de Falta Acumulados: <strong style={{color:'#e53e3e'}}>{summary.totalDays} Dias</strong></div>
            </div>
            {summary.directorateBreakdown && summary.directorateBreakdown.length > 0 && (
              <div style={styles.metaColumn}>
                <div style={{fontWeight: 'bold', marginBottom: '4px'}}>Faltas por Direcção:</div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '80px', overflowY: 'auto'}}>
                  {summary.directorateBreakdown.map((d, idx) => (
                    <div key={idx} style={{fontSize: '11px'}}>
                      {d.name}: <strong style={{color:'#e53e3e'}}>{d.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={styles.tableContainer}>
            <table className="premium-table">
              <thead id="report-tbl-header">
                <tr>
                  <th>NUIT</th>
                  <th>Nome Completo</th>
                  <th>Tipo de Falta</th>
                  <th>Dias</th>
                  <th>Dias de Falta</th>
                  <th>Direcção</th>
                  <th>Província</th>
                  <th>Motivo / Justificação</th>
                  <th className="no-print">Ações</th>
                </tr>
              </thead>
              <tbody id="report-tbl-body">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={styles.empty}>Nenhum registo de falta corresponde aos critérios de emissão selecionados.</td>
                  </tr>
                ) : (
                  reportData.map((row, index) => (
                    <tr key={index} style={styles.tr}>
                      <td>{row.nip}</td>
                      <td><strong>{row.name}</strong></td>
                      <td>
                        <span style={{
                          ...styles.typeBadge,
                          ...(row.type === 'Falta Justificada' ? styles.badgeGreen : styles.badgeRed)
                        }}>
                          {row.type}
                        </span>
                      </td>
                      <td><strong>{row.days}</strong></td>
                      <td>{row.datesStr}</td>
                      <td>{row.directorate}</td>
                      <td>{row.province}</td>
                      <td title={row.reason}>
                        {row.reason.length > 30 ? row.reason.substring(0, 27) + '...' : row.reason}
                      </td>
                      <td className="no-print">
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEdit(row)} style={styles.actionBtn} title="Editar">✏️</button>
                          <button onClick={() => handleDelete(row.id)} style={{...styles.actionBtn, color: '#ef4444'}} title="Eliminar">🗑️</button>
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
        confirmText={confirmModal.confirmText || 'Confirmar'}
      />

      {editModalOpen && editFormData && (
        <div style={styles.modalOverlay}>
          <div 
            style={{ ...styles.modalContent, transform: `translate(${position.x}px, ${position.y}px)` }}
            onPointerDown={onPointerDown}
          >
            <h4 style={{ margin: '0 0 15px 0', padding: '10px', margin: '-24px -24px 15px -24px', backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)', borderRadius: '8px 8px 0 0' }} className="drag-handle">Editar Registo de Falta</h4>
              <form onSubmit={handleSaveEdit}>
                <div style={styles.formGroup}>
                <label style={styles.label}>Tipo de Falta</label>
                <select 
                  value={editFormData.type} 
                  onChange={e => setEditFormData({...editFormData, type: e.target.value})}
                  style={styles.input}
                >
                  <option value="Falta Justificada">Falta Justificada</option>
                  <option value="Falta Injustificada">Falta Injustificada</option>
                </select>
              </div>
              <div style={{...styles.formGroup, marginTop: '15px'}}>
                <label style={styles.label}>Motivo / Justificação</label>
                <textarea 
                  value={editFormData.reason}
                  onChange={e => setEditFormData({...editFormData, reason: e.target.value})}
                  style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setEditModalOpen(false)} style={styles.btnCancel}>Cancelar</button>
                <button type="submit" style={styles.btnAction}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s' },
  card: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', overflow: 'hidden' },
  cardHeader: { padding: '16px 20px', borderBottom: '1px solid var(--color-border)' },
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--color-text-base)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardBody: { padding: '20px' },
  
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'end' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px', outline: 'none' },
  actionsBar: { display: 'flex', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' },
  btnAction: { padding: '10px 20px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', transition: 'all 0.2s' },
  
  summaryMetaBox: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', padding: '16px', backgroundColor: 'rgba(27,54,93,0.03)', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.6' },
  metaColumn: { display: 'flex', flexDirection: 'column', gap: '4px' },
  
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: '600' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '10px', color: 'var(--color-text-base)' },
  empty: { textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  
  typeBadge: { padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', display: 'inline-block' },
  badgeGreen: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669' },
  badgeRed: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#DC2626' },
  
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px', opacity: 0.8, transition: 'opacity 0.2s' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'var(--color-bg-base)', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', color: 'var(--color-text-base)' },
  btnCancel: { padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-text-base)' }
};

