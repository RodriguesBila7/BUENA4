import React, { useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useOrgData from '../../hooks/useOrgData';

export default function EffectivenessStats() {
  const { employees } = useEmployeeData();
  const { records } = useEffectivenessData();
  const { data: orgData } = useOrgData();

  const getName = (list, id) => list?.find(item => item.id === id)?.name || '-';

  // Calculate age from birthDate string (YYYY-MM-DD)
  const getAgeGroup = (birthDate) => {
    if (!birthDate) return 'Não Definido';
    const birth = new Date(birthDate);
    const now = new Date();
    const age = now.getFullYear() - birth.getFullYear();
    if (age < 35) return 'Jovens (< 35 anos)';
    if (age <= 50) return 'Adultos (35-50 anos)';
    return 'Seniores (> 50 anos)';
  };

  // General counts over all historical absences
  const stats = useMemo(() => {
    const totalEmployees = employees.filter(e => e.isActive).length;
    
    // Set of employees who have absences
    const faltososEmpIds = new Set(records.map(r => r.employeeId));
    const employeesWithAbsences = faltososEmpIds.size;
    const employeesWithoutAbsences = totalEmployees - employeesWithAbsences;

    let totalJustified = 0;
    let totalUnjustified = 0;
    let totalDaysLost = 0;

    records.forEach(r => {
      totalDaysLost += r.daysCount;
      if (r.type === 'Falta Justificada') {
        totalJustified++;
      } else {
        totalUnjustified++;
      }
    });

    return {
      totalEmployees,
      employeesWithAbsences,
      employeesWithoutAbsences,
      totalJustified,
      totalUnjustified,
      totalDaysLost
    };
  }, [records, employees]);

  // Organizational stats calculation (by Directorate, Province, District)
  const orgStats = useMemo(() => {
    // 1. Directorate
    const dirsMap = {};
    orgData.directorates.forEach(d => {
      dirsMap[d.id] = { name: d.name, days: 0, count: 0 };
    });

    // 2. Province
    const provsMap = {};

    // 3. District
    const distsMap = {};

    records.forEach(r => {
      // Directorate
      if (r.directorateId && dirsMap[r.directorateId]) {
        dirsMap[r.directorateId].days += r.daysCount;
        dirsMap[r.directorateId].count++;
      }

      // Province
      const prov = r.provinceId || 'Direcção Geral';
      if (!provsMap[prov]) {
        provsMap[prov] = { name: prov, days: 0, count: 0 };
      }
      provsMap[prov].days += r.daysCount;
      provsMap[prov].count++;

      // District
      const dist = r.districtId || 'Direcção Geral';
      if (!distsMap[dist]) {
        distsMap[dist] = { name: dist, days: 0, count: 0 };
      }
      distsMap[dist].days += r.daysCount;
      distsMap[dist].count++;
    });

    return {
      directorates: Object.values(dirsMap).filter(d => d.count > 0).sort((a,b) => b.days - a.days),
      provinces: Object.values(provsMap).sort((a,b) => b.days - a.days),
      districts: Object.values(distsMap).sort((a,b) => b.days - a.days)
    };
  }, [records, orgData.directorates]);

  // HR statistics (by Career, Gender, Age Group)
  const hrStats = useMemo(() => {
    const careersMap = {};
    orgData.careers.forEach(c => {
      careersMap[c.id] = { name: c.name, days: 0, count: 0 };
    });

    const gendersMap = {
      'M': { name: 'Masculino (M)', days: 0, count: 0 },
      'F': { name: 'Feminino (F)', days: 0, count: 0 }
    };

    const ageMap = {
      'Jovens (< 35 anos)': { name: 'Jovens (< 35)', days: 0, count: 0 },
      'Adultos (35-50 anos)': { name: 'Adultos (35-50)', days: 0, count: 0 },
      'Seniores (> 50 anos)': { name: 'Seniores (> 50)', days: 0, count: 0 },
      'Não Definido': { name: 'Não Definido', days: 0, count: 0 }
    };

    records.forEach(r => {
      // Career
      if (r.careerId && careersMap[r.careerId]) {
        careersMap[r.careerId].days += r.daysCount;
        careersMap[r.careerId].count++;
      }

      // Gender
      const gen = r.gender || 'M';
      if (gendersMap[gen]) {
        gendersMap[gen].days += r.daysCount;
        gendersMap[gen].count++;
      }

      // Age Group
      const emp = employees.find(e => e.id === r.employeeId);
      const ageGroup = getAgeGroup(emp?.birthDate);
      if (ageMap[ageGroup]) {
        ageMap[ageGroup].days += r.daysCount;
        ageMap[ageGroup].count++;
      }
    });

    return {
      careers: Object.values(careersMap).filter(c => c.count > 0).sort((a,b) => b.days - a.days),
      genders: Object.values(gendersMap).filter(g => g.count > 0).sort((a,b) => b.days - a.days),
      ages: Object.values(ageMap).filter(a => a.count > 0).sort((a,b) => b.days - a.days)
    };
  }, [records, orgData.careers, employees]);

  return (
    <div style={styles.container}>
      
      {/* 1. Indicadores Gerais */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h4 style={styles.cardTitle}>Painel de Estatísticas Gerais (Ausências)</h4>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.statsGrid}>
            
            <div style={styles.statBox}>
              <span style={styles.statBoxVal}>{stats.totalEmployees}</span>
              <span style={styles.statBoxLabel}>Total Funcionários</span>
            </div>

            <div style={styles.statBox}>
              <span style={{...styles.statBoxVal, color: '#e53e3e'}}>{stats.employeesWithAbsences}</span>
              <span style={styles.statBoxLabel}>Funcionários com Falta</span>
              <small style={styles.statBoxSub}>
                {stats.totalEmployees > 0 ? ((stats.employeesWithAbsences / stats.totalEmployees) * 100).toFixed(1) : 0}% do total
              </small>
            </div>

            <div style={styles.statBox}>
              <span style={{...styles.statBoxVal, color: '#38a169'}}>{stats.employeesWithoutAbsences}</span>
              <span style={styles.statBoxLabel}>Funcionários sem Falta</span>
              <small style={styles.statBoxSub}>
                {stats.totalEmployees > 0 ? ((stats.employeesWithoutAbsences / stats.totalEmployees) * 100).toFixed(1) : 0}% de assiduidade total
              </small>
            </div>

            <div style={styles.statBox}>
              <span style={{...styles.statBoxVal, color: 'var(--color-primary)'}}>{stats.totalDaysLost}</span>
              <span style={styles.statBoxLabel}>Total Dias Perdidos</span>
              <small style={styles.statBoxSub}>Média: {stats.employeesWithAbsences > 0 ? (stats.totalDaysLost / stats.employeesWithAbsences).toFixed(1) : 0} dias/func</small>
            </div>

            <div style={styles.statBox}>
              <span style={{...styles.statBoxVal, color: '#3182ce'}}>{stats.totalJustified}</span>
              <span style={styles.statBoxLabel}>Faltas Justificadas</span>
            </div>

            <div style={styles.statBox}>
              <span style={{...styles.statBoxVal, color: '#dd6b20'}}>{stats.totalUnjustified}</span>
              <span style={styles.statBoxLabel}>Faltas Injustificadas</span>
            </div>

          </div>
        </div>
      </div>

      <div style={styles.horizontalPanels}>
        
        {/* 2. Análise Organizacional */}
        <div style={styles.panelCard}>
          <div style={styles.cardHeader}>
            <h4 style={styles.cardTitle}>Perda de Dias por Unidade Organizacional</h4>
          </div>
          <div style={styles.cardBody}>
            
            <h5 style={styles.subTitle}>Faltas por Província</h5>
            <div style={styles.tableWrapper}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Província</th>
                    <th>Registos</th>
                    <th>Total Dias Perdidos</th>
                  </tr>
                </thead>
                <tbody>
                  {orgStats.provinces.length === 0 ? (
                    <tr><td colSpan="3" style={styles.empty}>Sem registos de faltas.</td></tr>
                  ) : (
                    orgStats.provinces.map(p => (
                      <tr key={p.name} style={styles.tr}>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.count}</td>
                        <td><strong style={{color:'#e53e3e'}}>{p.days} Dias</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h5 style={{...styles.subTitle, marginTop: '24px'}}>Faltas por Direcção</h5>
            <div style={styles.tableWrapper}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Direcção</th>
                    <th>Registos</th>
                    <th>Total Dias Perdidos</th>
                  </tr>
                </thead>
                <tbody>
                  {orgStats.directorates.length === 0 ? (
                    <tr><td colSpan="3" style={styles.empty}>Sem registos de faltas.</td></tr>
                  ) : (
                    orgStats.directorates.map(d => (
                      <tr key={d.name} style={styles.tr}>
                        <td title={d.name}><strong>{d.name.length > 25 ? d.name.substring(0, 22) + '...' : d.name}</strong></td>
                        <td>{d.count}</td>
                        <td><strong style={{color:'var(--color-primary)'}}>{d.days} Dias</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* 3. Análise de Recursos Humanos */}
        <div style={styles.panelCard}>
          <div style={styles.cardHeader}>
            <h4 style={styles.cardTitle}>Ausências por Fatores de RH</h4>
          </div>
          <div style={styles.cardBody}>
            
            <h5 style={styles.subTitle}>Faltas por Género</h5>
            <div style={styles.tableWrapper}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Género</th>
                    <th>Registos</th>
                    <th>Total Dias Perdidos</th>
                  </tr>
                </thead>
                <tbody>
                  {hrStats.genders.map(g => (
                    <tr key={g.name} style={styles.tr}>
                      <td><strong>{g.name}</strong></td>
                      <td>{g.count}</td>
                      <td><strong style={{color:'#3182ce'}}>{g.days} Dias</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h5 style={{...styles.subTitle, marginTop: '24px'}}>Faltas por Faixa Etária</h5>
            <div style={styles.tableWrapper}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Faixa Etária</th>
                    <th>Registos</th>
                    <th>Total Dias Perdidos</th>
                  </tr>
                </thead>
                <tbody>
                  {hrStats.ages.map(a => (
                    <tr key={a.name} style={styles.tr}>
                      <td><strong>{a.name}</strong></td>
                      <td>{a.count}</td>
                      <td><strong style={{color:'#8b5cf6'}}>{a.days} Dias</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h5 style={{...styles.subTitle, marginTop: '24px'}}>Faltas por Carreira</h5>
            <div style={styles.tableWrapper}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Carreira</th>
                    <th>Registos</th>
                    <th>Total Dias Perdidos</th>
                  </tr>
                </thead>
                <tbody>
                  {hrStats.careers.length === 0 ? (
                    <tr><td colSpan="3" style={styles.empty}>Sem registos de faltas.</td></tr>
                  ) : (
                    hrStats.careers.map(c => (
                      <tr key={c.name} style={styles.tr}>
                        <td><strong>{c.name}</strong></td>
                        <td>{c.count}</td>
                        <td><strong style={{color:'#dd6b20'}}>{c.days} Dias</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s' },
  card: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', overflow: 'hidden' },
  panelCard: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', overflow: 'hidden', flex: 1, minWidth: '350px' },
  cardHeader: { padding: '16px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)' },
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--color-text-base)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardBody: { padding: '20px' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' },
  statBox: { backgroundColor: 'var(--color-bg-base)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'center' },
  statBoxVal: { fontSize: '28px', fontWeight: '800', color: 'var(--color-text-base)', marginBottom: '4px' },
  statBoxLabel: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' },
  statBoxSub: { fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' },
  
  horizontalPanels: { display: 'flex', gap: '24px', flexWrap: 'wrap' },
  subTitle: { margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: 'var(--color-primary)', textTransform: 'uppercase', borderBottom: '1px dashed var(--color-border)', paddingBottom: '6px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: '600' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '10px', color: 'var(--color-text-base)' },
  empty: { textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontStyle: 'italic' }
};
