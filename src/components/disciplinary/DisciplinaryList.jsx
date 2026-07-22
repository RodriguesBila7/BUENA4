import React, { useState, useMemo } from 'react';
import useDisciplinaryData from '../../hooks/useDisciplinaryData';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function DisciplinaryList({ orgData, employeesData }) {
  const { data } = orgData;
  const { getAllActiveProcesses } = useDisciplinaryData();
  const processes = getAllActiveProcesses();

  const [filters, setFilters] = useState({
    searchTerm: '',
    status: '',
    type: ''
  });

  const getName = (list, id) => list.find(item => item.id === id)?.name || '-';

  const enrichedProcesses = useMemo(() => {
    return processes.map(p => {
      const emp = employeesData.employees.find(e => e.id === p.employeeId);
      return {
        ...p,
        employeeName: emp ? emp.name : 'Desconhecido',
        employeeNip: emp ? emp.nip : '-',
        directorate: emp ? getName(data.directorates, emp.directorateId) : '-'
      };
    }).filter(p => {
      const matchSearch = p.employeeName.toLowerCase().includes(filters.searchTerm.toLowerCase()) || p.processNumber.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchStatus = filters.status ? p.status === filters.status : true;
      const matchType = filters.type ? p.type === filters.type : true;
      return matchSearch && matchStatus && matchType;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [processes, employeesData, data, filters]);

  const [expandedRows, setExpandedRows] = useState({});
  const toggleRow = (empId) => setExpandedRows(prev => ({...prev, [empId]: !prev[empId]}));

  const groupedEmployees = useMemo(() => {
    const map = new Map();
    enrichedProcesses.forEach(p => {
      if (!map.has(p.employeeId)) {
        map.set(p.employeeId, {
          employeeId: p.employeeId,
          employeeName: p.employeeName,
          employeeNip: p.employeeNip,
          directorate: p.directorate,
          processes: []
        });
      }
      map.get(p.employeeId).processes.push(p);
    });
    return Array.from(map.values());
  }, [enrichedProcesses]);

  const exportExcel = () => {
    const exportData = enrichedProcesses.map(p => ({
      'Nº Processo': p.processNumber,
      'Funcionário': p.employeeName,
      'NIB': p.employeeNip,
      'Direcção': p.directorate,
      'Tipo de Sanção': p.type,
      'Estado': p.status,
      'Data Infração': p.infractionDate
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Processos");
    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-');
    XLSX.writeFile(workbook, `Processos_Disciplinares_${dateStr}.xlsx`);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <div style={styles.toolbar}>
        <input 
          type="text" 
          placeholder="Pesquisar funcionário ou nº processo..." 
          value={filters.searchTerm}
          onChange={(e) => setFilters(p => ({...p, searchTerm: e.target.value}))}
          style={styles.searchInput}
        />
        <select value={filters.type} onChange={(e) => setFilters(p => ({...p, type: e.target.value}))} style={styles.select}>
          <option value="">Todos os Tipos</option>
          <option value="Advertência">Advertência</option>
          <option value="Repreensão Pública">Repreensão Pública</option>
          <option value="Multa">Multa</option>
          <option value="Despromoção">Despromoção</option>
          <option value="Demissão">Demissão</option>
          <option value="Expulsão">Expulsão</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters(p => ({...p, status: e.target.value}))} style={styles.select}>
          <option value="">Todos os Estados</option>
          <option value="Aberto">Aberto</option>
          <option value="Em Instrução">Em Instrução</option>
          <option value="Concluído">Concluído</option>
          <option value="Arquivado">Arquivado</option>
          <option value="Suspenso">Suspenso</option>
        </select>
        
        <button onClick={exportExcel} style={styles.btnExport}>Exportar Excel</button>
      </div>

      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Nº Processo</th>
              <th>Funcionário</th>
              <th>Direcção</th>
              <th>Tipo Sanção</th>
              <th>Data Infração</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {groupedEmployees.length === 0 ? (
              <tr><td colSpan="6" style={styles.empty}>Nenhum processo encontrado.</td></tr>
            ) : (
              groupedEmployees.map(emp => (
                <React.Fragment key={emp.employeeId}>
                  <tr style={{...styles.tr, backgroundColor: 'rgba(0,0,0,0.02)', cursor: 'pointer'}} onClick={() => toggleRow(emp.employeeId)}>
                    <td colSpan="6" style={styles.td}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                          <strong>{emp.employeeName}</strong> (NIB: {emp.employeeNip}) - {emp.directorate}
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <span style={{fontSize: '12px', padding: '4px 8px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', borderRadius: '12px'}}>
                            {emp.processes.length} Processo{emp.processes.length > 1 ? 's' : ''}
                          </span>
                          <span style={{transform: expandedRows[emp.employeeId] ? 'rotate(180deg)' : 'none', transition: '0.2s', fontSize: '12px'}}>▼</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {expandedRows[emp.employeeId] && emp.processes.map(p => (
                    <tr key={p.id} style={{...styles.tr, backgroundColor: 'var(--color-bg-base)'}}>
                      <td style={{...styles.td, paddingLeft: '40px'}}><strong>{p.processNumber}</strong></td>
                      <td>-</td>
                      <td>-</td>
                      <td>{p.type}</td>
                      <td>{p.infractionDate || '-'}</td>
                      <td>
                        <span style={{
                          padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                          backgroundColor: p.status === 'Concluído' ? 'rgba(16, 185, 129, 0.1)' : (p.status === 'Aberto' || p.status === 'Em Instrução' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(100, 116, 139, 0.1)'),
                          color: p.status === 'Concluído' ? 'var(--color-success)' : (p.status === 'Aberto' || p.status === 'Em Instrução' ? 'var(--color-warning)' : 'var(--color-text-muted)')
                        }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  toolbar: { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)' },
  select: { padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)' },
  btnExport: { padding: '10px 16px', backgroundColor: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  tableContainer: { overflowX: 'auto', backgroundColor: 'var(--color-bg-card)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-base)', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '12px 16px', color: 'var(--color-text-base)' },
  empty: { textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)', fontStyle: 'italic' }
};
