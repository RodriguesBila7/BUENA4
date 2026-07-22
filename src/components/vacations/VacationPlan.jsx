import React, { useState, useMemo } from 'react';
import useVacationData from '../../hooks/useVacationData';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function VacationPlan() {
  const { requests } = useVacationData();
  const { employees } = useEmployeeData();
  const { data: orgData } = useOrgData();

  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterDirectorate, setFilterDirectorate] = useState('');
  
  const getName = (list, id) => {
    if (!list || !id) return '';
    const item = list.find(i => i.id === id);
    return item ? item.name : '';
  };

  const filteredPlan = useMemo(() => {
    return requests.filter(r => {
      if (r.year !== filterYear) return false;
      // In a real app we'd fetch the employee's directorate from EmployeeData and match it here
      // For now we just return all requests for the year
      return true;
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [requests, filterYear]);

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(`Plano Anual de Férias - ${filterYear}`, 14, 20);
    
    autoTable(doc, {
      startY: 30,
      head: [['NUIT', 'Funcionário', 'Tipo', 'Data Início', 'Data Fim', 'Dias', 'Estado']],
      body: filteredPlan.map(r => [
        r.employeeNip, r.employeeName, r.type, r.startDate, r.endDate, r.daysCount, r.status
      ])
    });
    doc.save(`Plano_Ferias_${filterYear}.pdf`);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredPlan.map(r => {
      const emp = employees.find(e => e.id === r.employeeId);
      return {
        NUIT: emp ? emp.nuit : r.employeeNip,
        Funcionário: emp ? emp.name : r.employeeName,
        Tipo: r.type,
        Início: r.startDate,
        Fim: r.endDate,
        Dias: r.daysCount,
        Estado: r.status
      };
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plano Anual");
    XLSX.writeFile(wb, `Plano_Ferias_${filterYear}.xlsx`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.filtersBar}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Ano</label>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={styles.input}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Direcção / Unidade</label>
          <select value={filterDirectorate} onChange={(e) => setFilterDirectorate(e.target.value)} style={styles.input}>
            <option value="">Todas</option>
            {orgData?.directorates?.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}></div>
        <button onClick={handleExportExcel} style={styles.btnExcel}>📊 Excel</button>
        <button onClick={handleExportPDF} style={styles.btnPdf}>📕 PDF</button>
      </div>

      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>NUIT</th>
              <th>Funcionário</th>
              <th>Tipo de Férias</th>
              <th>Data Início</th>
              <th>Data Fim</th>
              <th>Dias</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlan.length === 0 ? (
              <tr>
                <td colSpan="7" style={styles.empty}>Nenhum registo no plano para os critérios selecionados.</td>
              </tr>
            ) : (
              filteredPlan.map(row => {
                const emp = employees.find(e => e.id === row.employeeId);
                return (
                <tr key={row.id} style={styles.tr}>
                  <td>{emp ? emp.nuit : row.employeeNip}</td>
                  <td><strong>{emp ? emp.name : row.employeeName}</strong></td>
                  <td>{row.type}</td>
                  <td>{row.startDate}</td>
                  <td>{row.endDate}</td>
                  <td><strong>{row.daysCount}</strong></td>
                  <td>
                    <span style={{...styles.badge, backgroundColor: getStatusColor(row.status)}}>{row.status}</span>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'Aprovada': return '#10B981';
    case 'Em gozo': return '#3B82F6';
    case 'Rejeitada': case 'Cancelada': return '#EF4444';
    case 'Concluída': return '#6B7280';
    default: return '#F59E0B';
  }
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '16px' },
  filtersBar: { display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: 'var(--color-bg-elevated)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)', alignItems: 'flex-end' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)' },
  input: { padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-base)' },
  btnExcel: { padding: '8px 16px', backgroundColor: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
  btnPdf: { padding: '8px 16px', backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
  tableContainer: { overflowX: 'auto', backgroundColor: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px 16px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '600' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '12px 16px', color: 'var(--color-text-base)', fontSize: '14px' },
  empty: { padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' },
  badge: { padding: '4px 8px', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: '600' }
};
