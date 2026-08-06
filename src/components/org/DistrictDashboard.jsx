import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import useEmployeeData from '../../hooks/useEmployeeData';
import useAuditLog from '../../hooks/useAuditLog';
import { formatDistrictName } from '../../utils/mozambiqueDistricts';
import DistrictOrganogram from './DistrictOrganogram';
import DistrictQueries from './DistrictQueries';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#374151', '#6B7280', '#06B6D4', '#14B8A6'];

export default function DistrictDashboard({ data, t }) {
  const { employees } = useEmployeeData();
  const { logs } = useAuditLog();
  const [subTab, setSubTab] = useState('records');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

    // Dados para Gráfico 1: Funcionários por Província
    const provinceChartData = Object.keys(empByProvinceCount).map(prov => ({
      name: prov,
      count: empByProvinceCount[prov]
    }));

    // Dados para Gráfico 2: Top Distritos com mais funcionários
    const districtChartData = (data.districtDirectorates || [])
      .map(d => ({
        name: formatDistrictName(d.name),
        count: empByDistrictCount[d.id] || 0
      }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Dados para Gráfico 3: Estado das Secções (Com Chefe vs Sem Chefe)
    const sectionsStatusData = [
      { name: 'Com Chefe Nomeado', value: totalSections - totalSecsWithoutChief },
      { name: 'Sem Chefe (Vaga)', value: totalSecsWithoutChief }
    ];

    // Dados para Gráfico 4: Cobertura de Diretores Distritais
    const districtsStatusData = [
      { name: 'Com Diretor Nomeado', value: totalDistDirs - totalDistsWithoutDirector },
      { name: 'Sem Diretor (Vaga)', value: totalDistsWithoutDirector }
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
      districtsStatusData
    };
  }, [data, employees, logs]);

  const filteredDistricts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return (data.districtDirectorates || []).filter(d => {
      const formatted = formatDistrictName(d.name).toLowerCase();
      const prov = (d.province || '').toLowerCase();
      return !term || formatted.includes(term) || prov.includes(term);
    });
  }, [data.districtDirectorates, searchTerm]);

  const totalPages = Math.ceil(filteredDistricts.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedDistricts = filteredDistricts.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  return (
    <div style={styles.container}>
      {/* Sub-abas de Navegação dentro de Estatística Organizacional */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '4px',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setSubTab('records')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: subTab === 'records' ? 'var(--color-primary)' : 'var(--color-bg-card)',
            color: subTab === 'records' ? '#ffffff' : 'var(--color-text-main)',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: subTab === 'records' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          📋 Registos Guardados
        </button>

        <button
          type="button"
          onClick={() => setSubTab('charts')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: subTab === 'charts' ? 'var(--color-primary)' : 'var(--color-bg-card)',
            color: subTab === 'charts' ? '#ffffff' : 'var(--color-text-main)',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: subTab === 'charts' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          📊 Indicadores & Gráficos
        </button>

        <button
          type="button"
          onClick={() => setSubTab('tree')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: subTab === 'tree' ? 'var(--color-primary)' : 'var(--color-bg-card)',
            color: subTab === 'tree' ? '#ffffff' : 'var(--color-text-main)',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: subTab === 'tree' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          🌳 Organograma Distrital
        </button>

        <button
          type="button"
          onClick={() => setSubTab('queries')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: subTab === 'queries' ? 'var(--color-primary)' : 'var(--color-bg-card)',
            color: subTab === 'queries' ? '#ffffff' : 'var(--color-text-main)',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: subTab === 'queries' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          🔍 Pesquisa Distrital
        </button>
      </div>

      {subTab === 'tree' && (
        <div style={{ width: '100%' }}>
          <DistrictOrganogram data={data} t={t} />
        </div>
      )}

      {subTab === 'queries' && (
        <div style={{ width: '100%' }}>
          <DistrictQueries data={data} t={t} />
        </div>
      )}

      {subTab === 'records' && (
        <div style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-base)', margin: 0 }}>
              📋 Registos Guardados de Direcções Distritais ({filteredDistricts.length})
            </h3>
            <input
              type="text"
              placeholder="🔍 Pesquisar por distrito ou província..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-main)',
                fontSize: '13px',
                width: '320px'
              }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="premium-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Nome da Direcção Distrital</th>
                  <th>Direcção Provincial</th>
                  <th>Secções Registadas</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDistricts.map(item => {
                  const pDir = (data.directorates || []).find(d => d.id === item.provincialDirectorateId);
                  const distSecs = (data.sections || []).filter(s => String(s.districtDirectorateId || s.districtId) === String(item.id));
                  const DEFAULT_SECS = [
                    "Piquete Operativo", "Secretaria", "Secção Técnica Criminalística",
                    "Secção de Apoio e Documentação", "Secção de Armamento e Segurança",
                    "Secção de Identificação e Registo Policial", "Secção de Investigação Operativa",
                    "Secção de Investigação e Instrução Criminal"
                  ];
                  const sectionNames = distSecs.length > 0 ? distSecs.map(s => s.name) : DEFAULT_SECS;

                  return (
                    <tr key={item.id}>
                      <td><strong style={{ color: 'var(--color-primary)' }}>{formatDistrictName(item.name)}</strong></td>
                      <td>{pDir?.name || item.province || '-'}</td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-main)' }}>
                          {sectionNames.join(', ')}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: item.isActive !== false ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: item.isActive !== false ? '#10B981' : '#EF4444'
                        }}>
                          {item.isActive !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '14px',
            borderTop: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              A mostrar <strong>{filteredDistricts.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1}</strong> a <strong>{Math.min(safeCurrentPage * itemsPerPage, filteredDistricts.length)}</strong> de <strong>{filteredDistricts.length}</strong> distritos
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(1)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-base)',
                  cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: safeCurrentPage === 1 ? 0.5 : 1,
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--color-text-main)'
                }}
              >
                ⏮ Primeira
              </button>
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-base)',
                  cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: safeCurrentPage === 1 ? 0.5 : 1,
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--color-text-main)'
                }}
              >
                ◀ Anterior
              </button>

              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)', padding: '0 8px' }}>
                Página {safeCurrentPage} de {totalPages}
              </span>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-base)',
                  cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: safeCurrentPage >= totalPages ? 0.5 : 1,
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--color-text-main)'
                }}
              >
                Próxima ▶
              </button>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-base)',
                  cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: safeCurrentPage >= totalPages ? 0.5 : 1,
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--color-text-main)'
                }}
              >
                Última ⏭
              </button>

              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-base)',
                  color: 'var(--color-text-main)',
                  fontSize: '12px',
                  marginLeft: '8px'
                }}
              >
                <option value={10}>10 por pág.</option>
                <option value={20}>20 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {subTab === 'charts' && (
        <>
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

          <div style={styles.chartsGrid}>
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
                        outerRadius={80}
                        label={({ name, count }) => `${name} (${count})`}
                        dataKey="count"
                      >
                        {stats.provinceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={styles.noData}>Sem dados suficientes</div>
                )}
              </div>
            </div>

            <div style={styles.chartCard}>
              <h4 style={styles.chartTitle}>Top Distritos com Mais Efetivos</h4>
              <div style={styles.chartWrapper}>
                {stats.districtChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.districtChartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                      <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} fontSize={10} />
                      <YAxis allowDecimals={false} fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={styles.noData}>Sem funcionários alocados em distritos</div>
                )}
              </div>
            </div>
          </div>

          <div style={styles.chartsGrid}>
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
        </>
      )}
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
