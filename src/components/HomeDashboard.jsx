import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import useOrgData from '../hooks/useOrgData';
import useEmployeeData from '../hooks/useEmployeeData';
import useAdminActsData from '../hooks/useAdminActsData';
import useTransferData from '../hooks/useTransferData';
import useEvaluationData from '../hooks/useEvaluationData';
import useDisciplinaryData from '../hooks/useDisciplinaryData';
import useEffectivenessData from '../hooks/useEffectivenessData';
import useObitosData from '../hooks/useObitosData';
import { useAuth } from '../contexts/AuthContext';
import { isCentralUser, filterByProvincialScope, formatProvincialRoleName } from '../utils/scopeUtils';
import { getKPIs, getChartData, getHierarchyTree, getAuditIssues } from '../services/orgAnalyticsService';

const COLORS = ['#1B365D', '#4A5568', '#718096', '#A0AEC0', '#E2E8F0'];

const KPICard = ({ title, data, t }) => (
  <div style={styles.kpiCard}>
    <h3 style={styles.kpiTitle}>{title}</h3>
    <div style={styles.kpiTotal}>{data.total}</div>
    <div style={styles.kpiDetails}>
      <span style={styles.kpiActive}>● {data.active} {t('org_active') || 'Activos'}</span>
      <span style={styles.kpiInactive}>● {data.inactive} {t('org_inactive') || 'Inactivos'}</span>
    </div>
  </div>
);

const TreeNode = ({ node, forceExpand }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const isExpanded = forceExpand || expanded;

  return (
    <div style={styles.treeNode}>
      <div 
        style={{...styles.treeItem, cursor: hasChildren ? 'pointer' : 'default'}} 
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <span style={styles.treeIcon}>{hasChildren ? (isExpanded ? '▼' : '▶') : '•'}</span>
        <span style={styles.treeLabel}>{node.name}</span>
        <span style={styles.treeTypeBadge}>{node.type.toUpperCase()}</span>
      </div>
      {isExpanded && hasChildren && (
        <div style={styles.treeChildren}>
          {node.children.map(child => <TreeNode key={child.id} node={child} forceExpand={forceExpand} />)}
        </div>
      )}
    </div>
  );
};

export default function HomeDashboard({ t, onTabChange }) {
  const { user: currentUser } = useAuth();
  const { data } = useOrgData();
  const { employees } = useEmployeeData();
  const { acts } = useAdminActsData();
  const { transfers } = useTransferData();
  const { evaluations } = useEvaluationData();
  const { processes } = useDisciplinaryData();
  const { records } = useEffectivenessData();
  const { workflows } = useObitosData();

  const [searchQuery, setSearchQuery] = useState('');

  // Escopo de estrutura organizacional para utilizadores provinciais
  const scopedData = useMemo(() => {
    if (!data) return { directorates: [], departments: [], divisions: [], sections: [], districtDirectorates: [], categories: [], careers: [] };
    if (isCentralUser(currentUser)) return data;

    const userDirId = String(currentUser?.directorateId || '');
    if (!userDirId) return data;

    const userDir = (data.directorates || []).find(d => String(d.id) === userDirId);
    const userProvince = (userDir?.province || userDir?.name || '').toLowerCase();

    const filteredDirectorates = (data.directorates || []).filter(d => String(d.id) === userDirId);
    
    const filteredDistrictDirectorates = (data.districtDirectorates || []).filter(dist => {
      const provIdMatch = String(dist.provincialDirectorateId || dist.directorateId || '') === userDirId;
      const provNameMatch = userProvince && dist.province && userProvince.includes(dist.province.toLowerCase());
      return provIdMatch || provNameMatch;
    });

    const filteredDepartments = (data.departments || []).filter(dep => String(dep.directorateId) === userDirId);
    const departmentIds = new Set(filteredDepartments.map(dep => String(dep.id)));

    const filteredDivisions = (data.divisions || []).filter(div => departmentIds.has(String(div.departmentId)) || String(div.directorateId) === userDirId);
    const divisionIds = new Set(filteredDivisions.map(div => String(div.id)));

    const filteredSections = (data.sections || []).filter(sec => divisionIds.has(String(sec.divisionId)) || departmentIds.has(String(sec.departmentId)) || String(sec.directorateId) === userDirId);

    return {
      ...data,
      directorates: filteredDirectorates,
      districtDirectorates: filteredDistrictDirectorates,
      departments: filteredDepartments,
      divisions: filteredDivisions,
      sections: filteredSections
    };
  }, [data, currentUser]);

  // Escopo provincial dos registos funcionais
  const scopedActs = useMemo(() => filterByProvincialScope(acts, currentUser, data), [acts, currentUser, data]);
  const scopedTransfers = useMemo(() => filterByProvincialScope(transfers, currentUser, data), [transfers, currentUser, data]);
  const scopedEvaluations = useMemo(() => filterByProvincialScope(evaluations, currentUser, data), [evaluations, currentUser, data]);
  const scopedProcesses = useMemo(() => filterByProvincialScope(processes, currentUser, data), [processes, currentUser, data]);
  const scopedRecords = useMemo(() => filterByProvincialScope(records, currentUser, data), [records, currentUser, data]);
  const scopedWorkflows = useMemo(() => filterByProvincialScope(workflows, currentUser, data), [workflows, currentUser, data]);

  const pendingObitosActs = useMemo(() => {
    if (!scopedActs) return [];
    const obitosActs = scopedActs.filter(act => act.actType === 'Óbito');
    return obitosActs.filter(act => {
      const workflow = scopedWorkflows?.find(w => w.employeeId === act.employeeId);
      return !workflow || !workflow.isCompleted;
    });
  }, [scopedActs, scopedWorkflows]);

  const pendingObitosCount = pendingObitosActs.length;

  const retirementAlerts = useMemo(() => {
    if (!employees) return { byAge: [], byService: [], byMedical: [] };
    const currentYear = new Date().getFullYear();
    const byAge = [];
    const byService = [];
    const byMedical = [];
    
    employees.forEach(emp => {
      if (emp.isActive === false) return;
      
      let eligibleForAge = false;
      let eligibleForService = false;

      // 1. Por Tempo de Serviço (35 anos)
      if (emp.admissionDate) {
        const serviceYears = currentYear - new Date(emp.admissionDate).getFullYear();
        if (serviceYears >= 35) {
          eligibleForService = true;
          byService.push(emp);
        }
      }

      // 2. Por Idade (Homens 60, Mulheres 55)
      if (!eligibleForService && emp.dob) {
        const age = currentYear - new Date(emp.dob).getFullYear();
        const ageLimit = emp.gender === 'Feminino' ? 55 : 60;
        if (age >= ageLimit) {
          eligibleForAge = true;
          byAge.push(emp);
        }
      }

      // 3. Por Junta de Saúde (Permanente)
      if (scopedActs) {
        const empActs = scopedActs.filter(a => a.employeeId === emp.id);
        const hasPermanentInaptitude = empActs.some(a => a.actType === 'Junta de Saúde' && a.details?.tipoCondicao === 'Permanente');
        const hasRetirement = empActs.some(a => a.actType === 'Reserva' || a.actType === 'Reforma');

        if (hasPermanentInaptitude && !hasRetirement) {
          byMedical.push(emp);
        }
      }
    });
    
    return { byAge, byService, byMedical };
  }, [employees, scopedActs]);

  const kpis = useMemo(() => getKPIs(scopedData), [scopedData]);
  const charts = useMemo(() => getChartData(scopedData), [scopedData]);
  const tree = useMemo(() => getHierarchyTree(scopedData), [scopedData]);
  const issues = useMemo(() => getAuditIssues(scopedData), [scopedData]);

  const sysStats = useMemo(() => {
    return {
      employees: {
        total: employees?.length || 0,
        active: employees?.filter(e => e.isActive !== false).length || 0,
      },
      acts: {
        total: scopedActs?.length || 0,
        recent: scopedActs?.filter(a => new Date(a.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0
      },
      transfers: {
        total: scopedTransfers?.length || 0,
        pending: scopedTransfers?.filter(t => t.status === 'Pendente').length || 0
      },
      evaluations: {
        total: scopedEvaluations?.length || 0,
        avg: scopedEvaluations?.length > 0 ? (scopedEvaluations.reduce((acc, ev) => acc + parseFloat(ev.score || 0), 0) / scopedEvaluations.length).toFixed(1) : 0
      },
      disciplinary: {
        total: scopedProcesses?.length || 0,
        active: scopedProcesses?.filter(p => p.isActive !== false && p.status !== 'Concluído').length || 0
      },
      effectiveness: {
        total: scopedRecords?.length || 0,
        unjustified: scopedRecords?.filter(r => r.absenceType === 'Falta Injustificada').length || 0
      }
    };
  }, [employees, scopedActs, scopedTransfers, scopedEvaluations, scopedProcesses, scopedRecords]);

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const query = searchQuery.toLowerCase();

    const filterNode = (node) => {
      const nameMatches = node.name.toLowerCase().includes(query);
      const typeMatches = node.type.toLowerCase().includes(query);
      
      let matchingChildren = [];
      if (node.children) {
        matchingChildren = node.children.map(filterNode).filter(Boolean);
      }

      if (nameMatches || typeMatches || matchingChildren.length > 0) {
        return { ...node, children: matchingChildren };
      }
      return null;
    };

    return tree.map(filterNode).filter(Boolean);
  }, [tree, searchQuery]);

  const handleAlertClick = (employeeList, fallbackTab) => {
    if (employeeList.length === 1 && employeeList[0]) {
      const empId = employeeList[0].id || employeeList[0].employeeId;
      localStorage.setItem('sernic_details_employee_id', empId);
      if (onTabChange) onTabChange('emp_list');
    } else {
      if (onTabChange) onTabChange(fallbackTab);
    }
  };

  const userDirectorateObj = (data?.directorates || []).find(d => String(d.id) === String(currentUser?.directorateId));
  const provincialRoleTag = formatProvincialRoleName(
    currentUser?.roleName || currentUser?.roleDetails?.name || 'Administrador',
    currentUser?.directorateId,
    data
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            {t('dash_overview') || 'Visão Geral'}
          </h2>
        </div>
      </div>

      {pendingObitosCount > 0 && (
        <div 
          style={{ padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => handleAlertClick(pendingObitosActs, 'admin_acts_dynamic_Saúde_e_Óbitos')}
          title="Ver Detalhes"
        >
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ color: '#EF4444' }}>
            <strong>Atenção:</strong> Existem <strong>{pendingObitosCount}</strong> processo(s) de Óbito pendente(s) de conclusão. Por favor, aceda ao Módulo de Saúde e Óbitos para os finalizar.
          </div>
        </div>
      )}

      {retirementAlerts.byService.length > 0 && (
        <div 
          style={{ padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => handleAlertClick(retirementAlerts.byService, 'admin_acts_dynamic_Reserva_e_Reforma')}
          title="Ver Detalhes"
        >
          <span style={{ fontSize: '20px' }}>ℹ️</span>
          <div style={{ color: '#60A5FA' }}>
            <strong>Alerta de Reforma (Tempo de Serviço):</strong> Existem <strong>{retirementAlerts.byService.length}</strong> funcionário(s) que já completaram 35 anos de serviço e devem ser passados à Reserva ou Reforma.
          </div>
        </div>
      )}

      {retirementAlerts.byAge.length > 0 && (
        <div 
          style={{ padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => handleAlertClick(retirementAlerts.byAge, 'admin_acts_dynamic_Reserva_e_Reforma')}
          title="Ver Detalhes"
        >
          <span style={{ fontSize: '20px' }}>🔔</span>
          <div style={{ color: '#F59E0B' }}>
            <strong>Alerta de Reforma (Por Idade):</strong> Existem <strong>{retirementAlerts.byAge.length}</strong> funcionário(s) que já atingiram a idade limite obrigatória para passagem à Reserva/Reforma.
          </div>
        </div>
      )}

      {retirementAlerts.byMedical.length > 0 && (
        <div 
          style={{ padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          onClick={() => handleAlertClick(retirementAlerts.byMedical, 'admin_acts_dynamic_Reserva_e_Reforma')}
          title="Ver Detalhes"
        >
          <span style={{ fontSize: '20px' }}>🚨</span>
          <div style={{ color: '#EF4444' }}>
            <strong>Alerta de Reforma Compulsiva (Doença/Inaptidão):</strong> Existem <strong>{retirementAlerts.byMedical.length}</strong> funcionário(s) considerados Inaptos pela Junta Médica que devem ser passados à Reforma ou Reserva Compulsiva.
          </div>
        </div>
      )}

      {/* Relatório Completo dos Módulos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        <div style={styles.kpiCard}>
          <h3 style={styles.kpiTitle}>Funcionários</h3>
          <div style={styles.kpiTotal}>{sysStats.employees.total}</div>
          <div style={styles.kpiDetails}>
            <span style={styles.kpiActive}>● {sysStats.employees.active} Ativos</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <h3 style={styles.kpiTitle}>Actos Administrativos</h3>
          <div style={styles.kpiTotal}>{sysStats.acts.total}</div>
          <div style={styles.kpiDetails}>
            <span style={{ color: 'var(--color-primary)' }}>● {sysStats.acts.recent} nos últimos 30 dias</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <h3 style={styles.kpiTitle}>Colocações e Transferências</h3>
          <div style={styles.kpiTotal}>{sysStats.transfers.total}</div>
          <div style={styles.kpiDetails}>
            <span style={styles.kpiInactive}>● {sysStats.transfers.pending} Pendentes</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <h3 style={styles.kpiTitle}>Gestão de Desempenho Individual</h3>
          <div style={styles.kpiTotal}>{sysStats.evaluations.total}</div>
          <div style={styles.kpiDetails}>
            <span style={styles.kpiActive}>● Média: {sysStats.evaluations.avg}</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <h3 style={styles.kpiTitle}>Contencioso Laboral</h3>
          <div style={styles.kpiTotal}>{sysStats.disciplinary.total}</div>
          <div style={styles.kpiDetails}>
            <span style={styles.kpiInactive}>● {sysStats.disciplinary.active} Em Curso</span>
          </div>
        </div>

        <div style={styles.kpiCard}>
          <h3 style={styles.kpiTitle}>Efectividade (Faltas)</h3>
          <div style={styles.kpiTotal}>{sysStats.effectiveness.total}</div>
          <div style={styles.kpiDetails}>
            <span style={{ color: 'var(--color-danger, #e53e3e)' }}>● {sysStats.effectiveness.unjustified} Injustificadas</span>
          </div>
        </div>

      </div>

      {/* Charts Row */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Volume Estrutural</h3>
          <div style={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.overallComparison}>
                <XAxis dataKey="name" stroke="#A0AEC0" fontSize={12} />
                <YAxis stroke="#A0AEC0" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Distribuição por Unidade</h3>
          <div style={styles.chartWrapper}>
            {charts.depsPerDir.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.depsPerDir}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {charts.depsPerDir.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={styles.emptyChart}>Dados Insuficientes</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Tree & Audit */}
      <div style={styles.bottomRow}>
        <div style={styles.treeCard}>
          <div style={styles.cardHeaderWithSearch}>
            <h3 style={{...styles.cardTitle, margin: 0}}>{t('dash_tree') || 'Hierarquia Local da Direcção'}</h3>
            <div style={styles.searchContainerCompact}>
              <svg style={styles.searchIconCompact} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="Pesquisar unidade..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInputCompact}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={styles.searchClearCompact}>✕</button>
              )}
            </div>
          </div>
          <div style={styles.treeContainer}>
            {filteredTree.length > 0 ? (
              filteredTree.map(node => <TreeNode key={node.id} node={node} forceExpand={!!searchQuery} />)
            ) : (
              <div style={styles.empty}>Nenhuma estrutura correspondente encontrada.</div>
            )}
          </div>
        </div>

        <div style={styles.auditCard}>
          <div style={styles.cardHeaderWithBadge}>
            <h3 style={{...styles.cardTitle, margin: 0}}>{t('dash_audit') || 'Auditoria Estrutural'}</h3>
            {issues.length > 0 && (
              <span style={styles.auditBadgeCount}>{issues.length}</span>
            )}
          </div>
          <div style={styles.auditContainer}>
            {issues.length === 0 ? (
              <div style={styles.healthyState}>
                <span style={styles.healthyIcon}>✓</span>
                <p>{t('dash_healthy') || 'Saudável'}</p>
                <small>Não foram detetadas inconsistências na hierarquia.</small>
              </div>
            ) : (
              <ul style={styles.issueList}>
                {issues.map((issue, idx) => (
                  <li key={idx} style={issue.type === 'orphan' ? styles.issueItemOrphan : styles.issueItemEmpty}>
                    <div style={styles.issueHeader}>
                      <strong>{issue.level}: {issue.name}</strong>
                      <span style={styles.issueBadge}>{issue.type.toUpperCase()}</span>
                    </div>
                    <p style={styles.issueMsg}>{issue.msg}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '30px',
    animation: 'fadeIn 0.4s ease-out',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.3px',
    marginBottom: '4px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  kpiCard: {
    backgroundColor: 'var(--color-bg-card)',
    padding: '18px 20px',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    transition: 'all 0.15s ease',
  },
  kpiTitle: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginBottom: '8px',
  },
  kpiTotal: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    lineHeight: '1.2',
    marginBottom: '10px',
  },
  kpiDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  kpiActive: { color: '#10b981' },
  kpiInactive: { color: '#94a3b8' },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  chartCard: {
    backgroundColor: 'var(--color-bg-card)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--color-text-main)',
    marginBottom: '16px',
  },
  chartWrapper: {
    height: '250px',
  },
  emptyChart: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
  },
  bottomRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 350px',
    gap: '24px',
  },
  treeCard: {
    backgroundColor: 'var(--color-bg-card)',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    height: '480px',
    display: 'flex',
    flexDirection: 'column',
  },
  treeContainer: {
    padding: '10px 0',
    flex: 1,
    overflowY: 'auto',
    marginTop: '12px',
  },
  treeNode: {
    marginBottom: '4px',
  },
  treeItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
    borderRadius: '6px',
    transition: 'background 0.2s',
    userSelect: 'none',
  },
  treeIcon: {
    width: '20px',
    color: 'var(--color-text-muted)',
    fontSize: '12px',
    display: 'flex',
    justifyContent: 'center',
  },
  treeLabel: {
    marginLeft: '8px',
    fontSize: '14px',
    color: 'var(--color-text-base)',
    fontWeight: '500',
  },
  treeTypeBadge: {
    marginLeft: '12px',
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: '10px',
    color: 'var(--color-text-muted)',
    fontWeight: '700',
  },
  treeChildren: {
    marginLeft: '24px',
    borderLeft: '1px solid var(--color-border)',
    paddingLeft: '12px',
    marginTop: '4px',
  },
  auditCard: {
    backgroundColor: 'var(--color-bg-card)',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    height: '480px',
    display: 'flex',
    flexDirection: 'column',
  },
  auditContainer: {
    marginTop: '12px',
    flex: 1,
    overflowY: 'auto',
  },
  healthyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '30px 10px',
    color: '#38a169',
  },
  healthyIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  issueList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  issueItemOrphan: {
    padding: '12px',
    backgroundColor: 'rgba(229, 62, 62, 0.05)',
    borderLeft: '4px solid #e53e3e',
    borderRadius: '0 6px 6px 0',
  },
  issueItemEmpty: {
    padding: '12px',
    backgroundColor: 'rgba(221, 107, 32, 0.05)',
    borderLeft: '4px solid #dd6b20',
    borderRadius: '0 6px 6px 0',
  },
  issueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
    fontSize: '13px',
    color: 'var(--color-text-base)',
  },
  issueBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  issueMsg: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    lineHeight: '1.4',
  },
  empty: {
    color: 'var(--color-text-muted)',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  cardHeaderWithSearch: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  searchContainerCompact: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '180px'
  },
  searchIconCompact: {
    position: 'absolute',
    left: '10px',
    width: '14px',
    height: '14px',
    color: 'var(--color-text-muted)',
    pointerEvents: 'none'
  },
  searchInputCompact: {
    width: '100%',
    padding: '6px 12px 6px 30px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    fontSize: '13px',
    outline: 'none'
  },
  searchClearCompact: {
    position: 'absolute',
    right: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    padding: 0
  },
  cardHeaderWithBadge: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  auditBadgeCount: {
    backgroundColor: '#e53e3e',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '10px'
  }
};
