import React, { useMemo } from 'react';
import useVacationData from '../../hooks/useVacationData';
import useEmployeeData from '../../hooks/useEmployeeData';
import AdminActsAnalytics from '../adminActs/AdminActsAnalytics';

export default function VacationDashboard() {
  const { requests } = useVacationData();
  const { employees } = useEmployeeData();

  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const activeEmployees = employees.filter(e => e.isActive !== false);
    
    // Status counts
    const pending = requests.filter(r => ['Submetida', 'Em análise'].includes(r.status)).length;
    const approved = requests.filter(r => r.status === 'Aprovada').length;
    const activeVacations = requests.filter(r => r.status === 'Em gozo').length;
    const completed = requests.filter(r => r.status === 'Concluída').length;
    
    const plannedDays = requests
      .filter(r => r.year === currentYear && !['Cancelada', 'Rejeitada'].includes(r.status))
      .reduce((sum, r) => sum + r.daysCount, 0);

    return {
      totalEmployees: activeEmployees.length,
      pending,
      approved,
      activeVacations,
      completed,
      plannedDays
    };
  }, [requests, employees]);

  const upcomingVacations = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return requests.filter(r => {
      if (r.status !== 'Aprovada') return false;
      
      const [year, month, day] = r.startDate.split('-');
      const startDate = new Date(year, month - 1, day);
      
      return startDate >= today && startDate <= nextWeek;
    }).sort((a,b) => {
      const startA = new Date(a.startDate.split('-')[0], a.startDate.split('-')[1] - 1, a.startDate.split('-')[2]);
      const startB = new Date(b.startDate.split('-')[0], b.startDate.split('-')[1] - 1, b.startDate.split('-')[2]);
      return startA - startB;
    });
  }, [requests]);

  return (
    <div style={styles.container}>
      
      {/* Visão Mensal / Anual */}
      <AdminActsAnalytics acts={requests.map(r => ({...r, actType: 'Férias/Licenças', date: r.startDate || new Date().toISOString()}))} title="Férias e Licenças" />
      
      <div style={{height: '2px', backgroundColor: 'var(--color-border)', margin: '30px 0'}}></div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Funcionários Ativos</div>
          <div style={styles.cardValue}>{stats.totalEmployees}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Em Férias Agora</div>
          <div style={styles.cardValue}>{stats.activeVacations}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Solicitações Pendentes</div>
          <div style={styles.cardValue} className={stats.pending > 0 ? "text-warning" : ""}>{stats.pending}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Férias Aprovadas</div>
          <div style={styles.cardValue}>{stats.approved}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Férias Concluídas</div>
          <div style={styles.cardValue}>{stats.completed}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Dias Planeados (Ano Atual)</div>
          <div style={styles.cardValue}>{stats.plannedDays}</div>
        </div>
      </div>

      <div style={styles.alertsContainer}>
        <h4 style={styles.alertsTitle}>🔔 Alertas Próximos (próximos 7 dias)</h4>
        {upcomingVacations.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontStyle: 'italic', padding: '10px 0' }}>
            Não existem funcionários com férias aprovadas a iniciar nos próximos 7 dias.
          </div>
        ) : (
          <div style={styles.alertsList}>
            {upcomingVacations.map(req => {
              const [year, month, day] = req.startDate.split('-');
              const start = new Date(year, month - 1, day);
              const today = new Date();
              today.setHours(0,0,0,0);
              const diffTime = start - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              return (
                <div key={req.id} style={styles.alertItem}>
                  <div style={styles.alertIcon}>⚠️</div>
                  <div style={styles.alertContent}>
                    <strong>{req.employeeName}</strong> ({req.employeeNip}) inicia as férias/licença em <strong>{diffDays === 0 ? 'hoje' : diffDays === 1 ? '1 dia' : `${diffDays} dias`}</strong>.
                    <br />
                    <span style={{fontSize: '12px', color: 'var(--color-text-muted)'}}>
                      Período: {req.startDate} a {req.endDate} ({req.daysCount} dias)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' },
  card: { backgroundColor: 'var(--color-bg-elevated)', borderRadius: '8px', padding: '20px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' },
  cardTitle: { color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' },
  cardValue: { color: 'var(--color-text-base)', fontSize: '28px', fontWeight: '800' },
  alertsContainer: { marginTop: '16px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '16px' },
  alertsTitle: { margin: '0 0 16px 0', fontSize: '15px', fontWeight: '600', color: '#f59e0b' },
  alertsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  alertItem: { display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'var(--color-bg-card, #fff)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border)' },
  alertIcon: { fontSize: '20px' },
  alertContent: { color: 'var(--color-text-base)', fontSize: '14px', lineHeight: '1.4' }
};
