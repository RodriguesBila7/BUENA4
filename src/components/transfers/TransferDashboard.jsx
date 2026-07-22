import React, { useMemo } from 'react';
import AdminActsAnalytics from '../adminActs/AdminActsAnalytics';

export default function TransferDashboard({ transfers, orgData }) {
  const { data } = orgData;

  const stats = useMemo(() => {
    const total = transfers.length;
    const pending = transfers.filter(t => t.status === 'Em elaboração' || t.status === 'Submetida' || t.status === 'Em análise').length;
    const approved = transfers.filter(t => t.status === 'Aprovada').length;
    const rejected = transfers.filter(t => t.status === 'Rejeitada' || t.status === 'Cancelada').length;
    const concluded = transfers.filter(t => t.status === 'Concluída').length;
    const inMobility = transfers.filter(t => t.type === 'Mobilidade Interna' || t.type === 'Comissão de Serviço').length;

    const countBy = (key, lookupList) => {
      const counts = {};
      transfers.forEach(t => {
        const valId = t[key];
        if (valId) {
          counts[valId] = (counts[valId] || 0) + 1;
        }
      });
      return Object.entries(counts).map(([id, count]) => {
        const name = lookupList ? (lookupList.find(i => i.id === id)?.name || id) : id;
        return { name, count };
      }).sort((a, b) => b.count - a.count).slice(0, 10);
    };

    const countByString = (key) => {
      const counts = {};
      transfers.forEach(t => {
        const val = t[key];
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    };

    return { 
      total, pending, approved, rejected, concluded, inMobility,
      byDirectorate: countBy('toDirectorateId', data.directorates),
      byDepartment: countBy('toDepartmentId', data.departments),
      byProvince: countByString('toProvinceId'),
      byReason: countByString('reason'),
      byType: countByString('type')
    };
  }, [transfers, data]);

  const SimpleBarChart = ({ title, data, color }) => (
    <div style={styles.chartCard}>
      <h4 style={styles.chartTitle}>{title}</h4>
      {data.length > 0 ? (
        <div style={styles.barList}>
          {data.map((d, i) => (
            <div key={i} style={styles.barItem}>
              <div style={styles.barLabel}>
                <span style={styles.barName}>{d.name}</span>
                <span style={styles.barCount}>{d.count}</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{...styles.barFill, backgroundColor: color || 'var(--color-primary)', width: `${Math.max(2, (d.count / (data[0].count || 1)) * 100)}%`}}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>Sem dados suficientes.</div>
      )}
    </div>
  );

  return (
    <div style={styles.container}>
      
      {/* Visão Mensal / Anual (Novo) */}
      <AdminActsAnalytics acts={transfers.map(t => ({...t, actType: t.type, date: t.date || new Date().toISOString()}))} title="Transferências (Evolução)" />
      
      <div style={{height: '2px', backgroundColor: 'var(--color-border)', margin: '30px 0'}}></div>

      {/* Indicadores Gerais */}
      <h3 style={styles.sectionTitle}>Métricas por Direcção e Província</h3>
      <div style={styles.kpiGrid}>
        <div style={{...styles.kpiCard, borderLeftColor: '#3B82F6'}}>
          <div style={styles.kpiValue}>{stats.total}</div>
          <div style={styles.kpiLabel}>Total de Pedidos</div>
        </div>
        <div style={{...styles.kpiCard, borderLeftColor: '#EAB308'}}>
          <div style={styles.kpiValue}>{stats.pending}</div>
          <div style={styles.kpiLabel}>Pendentes / Análise</div>
        </div>
        <div style={{...styles.kpiCard, borderLeftColor: '#10B981'}}>
          <div style={styles.kpiValue}>{stats.approved}</div>
          <div style={styles.kpiLabel}>Aprovadas</div>
        </div>
        <div style={{...styles.kpiCard, borderLeftColor: '#8B5CF6'}}>
          <div style={styles.kpiValue}>{stats.concluded}</div>
          <div style={styles.kpiLabel}>Concluídas</div>
        </div>
        <div style={{...styles.kpiCard, borderLeftColor: '#EF4444'}}>
          <div style={styles.kpiValue}>{stats.rejected}</div>
          <div style={styles.kpiLabel}>Rejeitadas/Canceladas</div>
        </div>
        <div style={{...styles.kpiCard, borderLeftColor: '#06B6D4'}}>
          <div style={styles.kpiValue}>{stats.inMobility}</div>
          <div style={styles.kpiLabel}>Em Mobilidade Interna</div>
        </div>
      </div>

      <div style={styles.dashboardGrid}>
        <SimpleBarChart title="Transferências por Direcção (Destino)" data={stats.byDirectorate} color="#3B82F6" />
        <SimpleBarChart title="Transferências por Província" data={stats.byProvince} color="#10B981" />
        <SimpleBarChart title="Principais Motivos" data={stats.byReason} color="#F59E0B" />
        <SimpleBarChart title="Tipos de Movimentação" data={stats.byType} color="#8B5CF6" />
      </div>

    </div>
  );
}

const styles = {
  container: { padding: '10px 0', animation: 'fadeIn 0.3s ease-out' },
  sectionTitle: { fontSize: '16px', fontWeight: '700', color: 'var(--color-text-base)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' },
  kpiCard: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', borderLeft: '4px solid', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '8px' },
  kpiValue: { fontSize: '32px', fontWeight: '800', color: 'var(--color-text-base)', lineHeight: '1' },
  kpiLabel: { fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '600' },
  
  dashboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' },
  chartCard: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '10px', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' },
  chartTitle: { fontSize: '14px', fontWeight: '700', color: 'var(--color-text-base)', marginBottom: '24px', textTransform: 'uppercase' },
  emptyState: { padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', backgroundColor: 'var(--color-bg-base)', borderRadius: '6px' },
  
  barList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  barItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
  barLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'flex-end' },
  barName: { fontWeight: '600', color: 'var(--color-text-base)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px' },
  barCount: { fontWeight: '700', color: 'var(--color-text-muted)' },
  barTrack: { height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 1s ease-out' }
};
