import React, { useState } from 'react';
import useAuditLog from '../../hooks/useAuditLog';
import { useAuth } from '../../contexts/AuthContext';

const styles = {
  container: { padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  filterRow: { display: 'flex', gap: '15px', marginBottom: '20px' },
  input: { padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', minWidth: '150px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '10px', textAlign: 'left', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' },
  td: { padding: '10px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-main)' },
  badge: { padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }
};

export default function AuditViewer() {
  const { logs } = useAuditLog();
  const { user: currentUser } = useAuth();
  const [filterUser, setFilterUser] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredLogs = logs.filter(log => {
    const dLog = new Date(log.date);
    const mFrom = dateFrom ? dLog >= new Date(dateFrom) : true;
    const mTo = dateTo ? dLog <= new Date(dateTo) : true;

    return (
      mFrom && mTo &&
      (log.username || '').toLowerCase().includes(filterUser.toLowerCase()) &&
      (log.module || '').toLowerCase().includes(filterModule.toLowerCase())
    );
  });

  const exportToCSV = () => {
    const header = ['Data,Hora,Utilizador,Perfil,Módulo,Ação,Detalhes,IP,Resultado'];
    const rows = filteredLogs.map(l => 
      `${l.date || ''},${l.time || ''},${l.username || ''},${l.role || ''},${l.module || ''},${l.action || ''},"${(l.details || '').replace(/"/g, '""')}",${l.ip || ''},${l.result || ''}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-');
    link.setAttribute("download", `auditoria_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.container}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
        <h3 style={{margin: 0}}>Registo de Auditoria</h3>
        <button style={{...styles.input, cursor: 'pointer', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)'}} onClick={exportToCSV}>Exportar CSV</button>
      </div>
      <div style={styles.filterRow}>
        <input 
          type="text" 
          placeholder="Filtrar por Utilizador..." 
          style={styles.input}
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
        />
        <select style={styles.input} value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
          <option value="">Todos os Módulos</option>
          <option value="Sistema">Sistema (Login/Logout)</option>
          <option value="Utilizadores">Utilizadores</option>
          <option value="Funcionarios">Funcionários</option>
          <option value="Acessos">Acessos e Perfis</option>
        </select>
        <input type="date" style={styles.input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Data Início" />
        <input type="date" style={styles.input} value={dateTo} onChange={e => setDateTo(e.target.value)} title="Data Fim" />
      </div>

      <table className="premium-table">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Utilizador</th>
            <th>Módulo</th>
            <th>Ação</th>
            <th>Detalhes</th>
            <th>IP</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map(log => (
            <tr key={log.id}>
              <td>{log.date} {log.time}</td>
              <td><strong>{log.username || 'Sistema'}</strong><br/><span style={{fontSize:'11px', color:'var(--color-text-muted)'}}>{log.role || 'Automatizado'}</span></td>
              <td>{log.module}</td>
              <td>{log.action}</td>
              <td>{log.details}</td>
              <td>{log.ip}</td>
              <td>
                <span style={{
                  ...styles.badge, 
                  backgroundColor: log.result === 'Sucesso' ? '#e8f5e9' : '#ffebee', 
                  color: log.result === 'Sucesso' ? '#2e7d32' : '#c62828'
                }}>
                  {log.result}
                </span>
              </td>
            </tr>
          ))}
          {filteredLogs.length === 0 && (
            <tr>
              <td colSpan="7" style={{...styles.td, textAlign: 'center', fontStyle: 'italic', color: 'var(--color-text-muted)'}}>
                Nenhum registo encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
