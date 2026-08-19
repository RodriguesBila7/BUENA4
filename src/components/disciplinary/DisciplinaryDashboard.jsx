import React, { useMemo } from 'react';
import useDisciplinaryData from '../../hooks/useDisciplinaryData';
import { isCentralUser, filterByProvincialScope } from '../../utils/scopeUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

export default function DisciplinaryDashboard({ orgData, employeesData, user }) {
  const { getAllActiveProcesses } = useDisciplinaryData();
  const allProcesses = getAllActiveProcesses();

  const isCentral = isCentralUser(user);

  const employeesList = useMemo(() => {
    let raw = [];
    if (employeesData) {
      if (Array.isArray(employeesData)) raw = employeesData;
      else if (Array.isArray(employeesData.employees)) raw = employeesData.employees;
    }
    if (!isCentral && user) {
      return filterByProvincialScope(raw, user, orgData?.data || orgData);
    }
    return raw;
  }, [employeesData, isCentral, user, orgData]);

  const processes = useMemo(() => {
    if (!isCentral && user) {
      const scopedEmpIds = new Set(employeesList.map(e => String(e.id)));
      return allProcesses.filter(p => scopedEmpIds.has(String(p.employeeId)));
    }
    return allProcesses;
  }, [allProcesses, employeesList, isCentral, user]);

  const stats = useMemo(() => {
    const total = processes.length;
    const active = processes.filter(p => p.status === 'Aberto' || p.status === 'Em Instrução' || p.status === 'Suspenso').length;
    const concluded = processes.filter(p => p.status === 'Concluído').length;
    const archived = processes.filter(p => p.status === 'Arquivado').length;
    
    // Unique employees
    const uniqueEmpIds = new Set(processes.map(p => p.employeeId));
    const totalEmployeesSancionados = uniqueEmpIds.size;
    const percentageOfTotal = employeesList.length > 0 
      ? ((totalEmployeesSancionados / employeesList.length) * 100).toFixed(1) 
      : 0;

    // By Type
    const byTypeMap = {};
    processes.forEach(p => { 
      const type = p.despachoDecisao || p.type || 'Outro';
      byTypeMap[type] = (byTypeMap[type] || 0) + 1; 
    });
    const byType = Object.keys(byTypeMap).map(k => ({ name: k, value: byTypeMap[k] }));

    return { total, active, concluded, archived, totalEmployeesSancionados, percentageOfTotal, byType };
  }, [processes, employeesList]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a0aec0', '#dc2626', '#8b5cf6'];

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <div style={styles.gridCards}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total de Processos</div>
          <div style={styles.cardValue}>{stats.total}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Em Instrução / Ativos</div>
          <div style={styles.cardValue} className="text-warning">{stats.active}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Concluídos (Com Despacho)</div>
          <div style={styles.cardValue} className="text-success">{stats.concluded}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Funcionários com Autos</div>
          <div style={styles.cardValue}>{stats.totalEmployeesSancionados} <span style={{fontSize:'14px', color:'#718096'}}>({stats.percentageOfTotal}%)</span></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginTop: '30px' }}>
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Processos por Tipo de Decisão / Sanção</h4>
          <div style={{ height: 300 }}>
            {stats.byType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.byType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {stats.byType.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={styles.emptyChart}>Sem dados para apresentar</div>
            )}
          </div>
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Volume de Processos por Sanção</h4>
          <div style={{ height: 300 }}>
             {stats.byType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byType} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="value" fill="var(--color-primary, #1B365D)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
              <div style={styles.emptyChart}>Sem dados para apresentar</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' },
  card: { padding: '24px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  cardTitle: { fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' },
  cardValue: { fontSize: '30px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  chartCard: { padding: '24px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  chartTitle: { fontSize: '15px', color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '16px' },
  emptyChart: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic' }
};
