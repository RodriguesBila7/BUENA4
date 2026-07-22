import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import useEmployeeData from '../../hooks/useEmployeeData';
import useAuditLog from '../../hooks/useAuditLog';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#374151', '#6B7280', '#06B6D4', '#14B8A6'];

export default function DistrictDashboard({ data, t }) {
  const { employees } = useEmployeeData();
  const { logs } = useAuditLog();

  const stats = useMemo(() => {
    // 1. Total Direções Provinciais (Direções com Província associada e ativas)
    const totalProvDirs = (data.directorates || []).filter(d => d.province && d.isActive).length;

    // 2. Total Direções Distritais ativas
    const totalDistDirs = (data.districtDirectorates || []).filter(d => d.isActive).length;

    // 3. Total Distritos
    const totalDistricts = (data.districtDirectorates || []).length;

    // 4. Total Secções Distritais ativas
    const distSecs = (data.sections || []).filter(s => s.isActive && s.districtDirectorateId);
    const totalSections = distSecs.length;

    // Map dos distritos para acesso fácil por ID
    const distMap = {};
    (data.districtDirectorates || []).forEach(d => {
      distMap[d.id] = d;
    });

    // Map das direções (provinciais) por ID
    const dirMap = {};
    (data.directorates || []).forEach(d => {
      dirMap[d.id] = d;
    });

    // Filtrar funcionários pertencentes às Direções Distritais
    const distEmployees = employees.filter(emp => emp.unitType === 'district' && emp.isActive);

    // Funcionários por Distrito
    const empByDistrictCount = {};
    distEmployees.forEach(emp => {
      if (emp.districtDirectorateId) {
        empByDistrictCount[emp.districtDirectorateId] = (empByDistrictCount[emp.districtDirectorateId] || 0) + 1;
      }
    });

    // Funcionários por Província
    const empByProvinceCount = {};
    distEmployees.forEach(emp => {
      if (emp.directorateId) {
        const dir = dirMap[emp.directorateId];
        if (dir && dir.province) {
          empByProvinceCount[dir.province] = (empByProvinceCount[dir.province] || 0) + 1;
        }
      }
    });

    // 5. Direções Distritais sem Diretor ativo
    const districtsWithDirector = new Set();
    distEmployees.forEach(emp => {
      if (emp.districtDirectorateId && emp.role === 'Diretor Distrital') {
        districtsWithDirector.add(emp.districtDirectorateId);
      }
    });

    const activeDistricts = (data.districtDirectorates || []).filter(d => d.isActive && d.provincialDirectorateId);
    const distsWithoutDirector = activeDistricts.filter(d => !districtsWithDirector.has(d.id));
    const totalDistsWithoutDirector = distsWithoutDirector.length;

    // 6. Secções Distritais sem Chefe ativo
    const sectionsWithChief = new Set();
    distEmployees.forEach(emp => {
      if (emp.sectionId && emp.role === 'Chefe de Secção') {
        sectionsWithChief.add(emp.sectionId);
      }
    });

    // Secções distritais ativas (pertencem a direções distritais ativas)
    const activeDistSecs = distSecs.filter(s => {
      const parentDist = distMap[s.districtDirectorateId];
      return parentDist && parentDist.isActive && parentDist.provincialDirectorateId;
    });
    const secsWithoutChief = activeDistSecs.filter(s => !sectionsWithChief.has(s.id));
    const totalSecsWithoutChief = secsWithoutChief.length;

    // 7. Cargos vagos = Distritos sem Diretor + Secções sem Chefe
    const totalVacantPositions = totalDistsWithoutDirector + totalSecsWithoutChief;

    // 8. Nomeações e Exonerações Realizadas a partir do log de auditoria
    const totalAppointments = (logs || []).filter(l => 
      l.module === 'Estrutura Orgânica' && 
      (l.action.toLowerCase().includes('nomea') || l.details?.toLowerCase().includes('nomea'))
    ).length;

    const totalExonerations = (logs || []).filter(l => 
      l.module === 'Estrutura Orgânica' && 
      (l.action.toLowerCase().includes('exone') || l.details?.toLowerCase().includes('exone'))
    ).length;

    // Dados para Gráficos
    const provinceChartData = Object.keys(empByProvinceCount).map(prov => ({
      name: prov,
      value: empByProvinceCount[prov]
    }));

    const districtChartData = Object.keys(empByDistrictCount).map(distId => {
      const dist = distMap[distId];
      return {
        name: dist ? dist.name : 'Desconhecido',
        Funcionários: empByDistrictCount[distId]
      };
    }).sort((a, b) => b.Funcionários - a.Funcionários).slice(0, 10); // Top 10

    // Distribuição das Secções (Ocupadas vs Vagas)
    const sectionsStatusData = [
      { name: 'Ocupadas (Com Chefe)', value: activeDistSecs.length - totalSecsWithoutChief },
      { name: 'Vagas (Sem Chefe)', value: totalSecsWithoutChief }
    ];

    // Distribuição dos Cargos de Chefia (Total de Diretores vs Chefes)
    const chefiaDistributionData = [
      { name: 'Diretores Distritais', value: districtsWithDirector.size },
      { name: 'Chefes de Secção', value: sectionsWithChief.size }
    ];

    // Ocupação Geral dos Distritos
    const districtsStatusData = [
      { name: 'Com Diretor', value: activeDistricts.length - totalDistsWithoutDirector },
      { name: 'Sem Diretor', value: totalDistsWithoutDirector }
    ];

    return {
      totalProvDirs,
      totalDistDirs,
      totalDistricts,
      totalSections,
      totalEmployees: distEmployees.length,
      totalDistsWithoutDirector,
      totalSecsWithoutChief,
      totalVacantPositions,
      totalAppointments,
      totalExonerations,
      provinceChartData,
      districtChartData,
      sectionsStatusData,
      chefiaDistributionData,
      districtsStatusData
    };
  }, [data, employees, logs]);

  return (
    <div style={styles.container}>
      {/* Indicadores Grid */}
      <div style={styles.grid}>
        <div style={{ ...styles.card, borderLeft: '4px solid #3B82F6' }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardVal}>{stats.totalProvDirs}</span>
            <span style={styles.cardIcon}>🏢</span>
          </div>
          <p style={styles.cardTitle}>Direções Provinciais</p>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #10B981' }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardVal}>{stats.totalDistDirs}</span>
            <span style={styles.cardIcon}>📍</span>
          </div>
          <p style={styles.cardTitle}>Direções Distritais Ativas</p>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #F59E0B' }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardVal}>{stats.totalSections}</span>
            <span style={styles.cardIcon}>📁</span>
          </div>
          <p style={styles.cardTitle}>Secções Distritais</p>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #8B5CF6' }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardVal}>{stats.totalEmployees}</span>
            <span style={styles.cardIcon}>👤</span>
          </div>
          <p style={styles.cardTitle}>Efetivos em Distritos</p>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={{ ...styles.card, borderLeft: '4px solid #EF4444' }}>
          <div style={styles.cardHeader}>
            <span style={{ ...styles.cardVal, color: '#EF4444' }}>{stats.totalDistsWithoutDirector}</span>
            <span style={styles.cardIcon}>⚠️</span>
          </div>
          <p style={styles.cardTitle}>Distritos sem Diretor</p>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #EF4444' }}>
          <div style={styles.cardHeader}>
            <span style={{ ...styles.cardVal, color: '#EF4444' }}>{stats.totalSecsWithoutChief}</span>
            <span style={styles.cardIcon}>⚠️</span>
          </div>
          <p style={styles.cardTitle}>Secções sem Chefe</p>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #F59E0B' }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardVal}>{stats.totalVacantPositions}</span>
            <span style={styles.cardIcon}>💼</span>
          </div>
          <p style={styles.cardTitle}>Cargos Vagos</p>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #10B981' }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardVal} title={`Nomeações: ${stats.totalAppointments} / Exonerações: ${stats.totalExonerations}`}>
              {stats.totalAppointments + stats.totalExonerations}
            </span>
            <span style={styles.cardIcon}>📝</span>
          </div>
          <p style={styles.cardTitle}>Movimentações de Cargo</p>
        </div>
      </div>

      {/* Gráficos Grid */}
      <div style={styles.chartsGrid}>
        {/* Gráfico 1: Funcionários por Província */}
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Efetivos por Província</h4>
          <div style={styles.chartWrapper}>
            {stats.provinceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={stats.provinceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.provinceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={styles.noData}>Nenhum funcionário alocado a distritos</div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Funcionários por Distrito (Top 10) */}
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Efetivos por Distrito (Top 10)</h4>
          <div style={styles.chartWrapper}>
            {stats.districtChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.districtChartData}>
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                  <Bar dataKey="Funcionários" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={styles.noData}>Nenhum funcionário alocado a distritos</div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        {/* Gráfico 3: Estado de Ocupação das Secções */}
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Ocupação das Secções Distritais</h4>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stats.sectionsStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 4: Ocupação dos Distritos (Diretor) */}
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Nomeações de Diretor Distrital</h4>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stats.districtsStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  dataKey="value"
                >
                  <Cell fill="#3B82F6" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    animation: 'fadeIn 0.3s ease'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px'
  },
  card: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  cardVal: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--color-text-base)'
  },
  cardIcon: {
    fontSize: '24px',
    opacity: 0.8
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px'
  },
  chartCard: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
  },
  chartTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--color-text-base)',
    marginBottom: '16px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px'
  },
  chartWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '260px'
  },
  noData: {
    color: 'var(--color-text-muted)',
    fontSize: '14px',
    fontStyle: 'italic'
  }
};
