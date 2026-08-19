import React, { useMemo, useState } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useEffectivenessData from '../../hooks/useEffectivenessData';
import useOrgData from '../../hooks/useOrgData';
import { isCentralUser, filterByProvincialScope } from '../../utils/scopeUtils';

export default function EffectivenessStats({ user, orgData: passedOrgData, employeesData }) {
  const { employees: allEmployees } = useEmployeeData();
  const { records } = useEffectivenessData();
  const { data: hookOrgData } = useOrgData();

  const orgData = passedOrgData?.data || passedOrgData || hookOrgData || { directorates: [], departments: [], divisions: [], sections: [], careers: [], categories: [] };
  const isCentral = isCentralUser(user);

  const userDirId = user?.directorateId ? String(user.directorateId) : '';
  const [selectedDirFilter, setSelectedDirFilter] = useState(!isCentral ? userDirId : '');

  const employees = useMemo(() => {
    let raw = (employeesData?.employees || (Array.isArray(employeesData) ? employeesData : null) || allEmployees) || [];
    if (!isCentral && user) {
      return filterByProvincialScope(raw, user, orgData);
    }
    return raw;
  }, [employeesData, allEmployees, isCentral, user, orgData]);

  // Scoped records
  const scopedRecords = useMemo(() => {
    let base = records;
    if (!isCentral && userDirId) {
      const scopedEmpIds = new Set(employees.map(e => String(e.id)));
      base = records.filter(rec => {
        const empMatch = scopedEmpIds.has(String(rec.employeeId));
        const dirMatch = String(rec.directorateId || rec.registeredByDirectorateId || '') === userDirId;
        return empMatch || dirMatch;
      });
    } else if (isCentral && selectedDirFilter) {
      base = records.filter(rec => String(rec.directorateId || rec.registeredByDirectorateId || '') === selectedDirFilter);
    }
    return base;
  }, [records, isCentral, userDirId, selectedDirFilter, employees]);

  const getName = (list, id) => list?.find(item => String(item.id) === String(id))?.name || '-';

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

  // General counts over filtered absences
  const stats = useMemo(() => {
    const totalEmployees = employees.filter(e => e.isActive).length;
    
    // Set of employees who have absences
    const faltososEmpIds = new Set(scopedRecords.map(r => r.employeeId));
    const employeesWithAbsences = faltososEmpIds.size;
    const employeesWithoutAbsences = Math.max(0, totalEmployees - employeesWithAbsences);

    let totalJustified = 0;
    let totalUnjustified = 0;
    let totalDaysLost = 0;

    scopedRecords.forEach(r => {
      const days = Number(r.daysCount) || (r.dates ? r.dates.length : 1);
      totalDaysLost += days;
      if (r.type === 'Falta Justificada') {
        totalJustified += days;
      } else {
        totalUnjustified += days;
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
  }, [scopedRecords, employees]);

  // Organizational stats calculation (by Directorate, Province, District)
  const orgStats = useMemo(() => {
    // 1. Directorate
    const dirsMap = {};
    (orgData.directorates || []).forEach(d => {
      dirsMap[d.id] = { name: d.name, days: 0, count: 0 };
    });

    // 2. Province
    const provsMap = {};

    scopedRecords.forEach(r => {
      const days = Number(r.daysCount) || (r.dates ? r.dates.length : 1);

      // Directorate
      const dId = r.directorateId || r.registeredByDirectorateId;
      if (dId && dirsMap[dId]) {
        dirsMap[dId].days += days;
        dirsMap[dId].count++;
      }

      // Province
      const prov = r.provinceId || 'Direcção Geral';
      if (!provsMap[prov]) {
        provsMap[prov] = { name: prov, days: 0, count: 0 };
      }
      provsMap[prov].days += days;
      provsMap[prov].count++;
    });

    return {
      directorates: Object.values(dirsMap).filter(d => d.count > 0).sort((a,b) => b.days - a.days),
      provinces: Object.values(provsMap).sort((a,b) => b.days - a.days)
    };
  }, [scopedRecords, orgData.directorates]);

  return (
    <div style={styles.container}>
      {/* SELETOR DE ESCOPO PARA ADMIN CENTRAL */}
      {isCentral && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'rgba(27, 54, 93, 0.05)',
          borderRadius: '8px',
          border: '1px solid var(--color-primary)',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '13px' }}>
            🏛️ Filtrar Estatísticas por Perfil Secundário / Direcção:
          </span>
          <select
            value={selectedDirFilter}
            onChange={(e) => setSelectedDirFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-primary)',
              backgroundColor: 'var(--color-bg-base)',
              color: 'var(--color-text-main)',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            <option value="">🌐 Estatísticas Globais (Consolidado Nacional)</option>
            {(orgData?.directorates || []).map(d => (
              <option key={d.id} value={d.id}>📍 {d.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* KPI CARDS */}
      <div style={styles.gridCards}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total Efectivos no Quadro</div>
          <div style={styles.cardValue}>{stats.totalEmployees}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Funcionários com Faltas</div>
          <div style={{...styles.cardValue, color: '#dc2626'}}>{stats.employeesWithAbsences}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Total Dias de Ausência</div>
          <div style={styles.cardValue}>{stats.totalDaysLost} Dias</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Faltas Justificadas vs Injustificadas</div>
          <div style={{fontSize: '14px', fontWeight: 'bold', marginTop: '6px'}}>
            <span style={{color: '#059669'}}>✓ {stats.totalJustified}d Just.</span> | <span style={{color: '#dc2626'}}>✕ {stats.totalUnjustified}d Injust.</span>
          </div>
        </div>
      </div>

      {/* DETALHE POR PROVÍNCIA / DIRECÇÃO */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px'}}>
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Faltas por Província / Direcção</h4>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {orgStats.directorates.length === 0 ? (
              <div style={{color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '16px', textAlign: 'center'}}>
                Sem registos de faltas a apresentar.
              </div>
            ) : (
              orgStats.directorates.map((d, i) => (
                <div key={i} style={{display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-bg-card)', borderRadius: '6px', border: '1px solid var(--color-border)'}}>
                  <span style={{fontWeight: '600', fontSize: '13px'}}>{d.name}</span>
                  <span style={{fontWeight: 'bold', color: 'var(--color-primary)'}}>{d.days} Dias ({d.count} ocorrências)</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Distribuição por Âmbito Regional</h4>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {orgStats.provinces.length === 0 ? (
              <div style={{color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '16px', textAlign: 'center'}}>
                Sem dados regionais.
              </div>
            ) : (
              orgStats.provinces.map((p, i) => (
                <div key={i} style={{display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-bg-card)', borderRadius: '6px', border: '1px solid var(--color-border)'}}>
                  <span style={{fontWeight: '600', fontSize: '13px'}}>📍 {p.name}</span>
                  <span style={{fontWeight: 'bold', color: '#dc2626'}}>{p.days} Dias</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '16px' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  card: { padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  cardTitle: { fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' },
  cardValue: { fontSize: '26px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  chartCard: { padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  chartTitle: { fontSize: '14.5px', color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '14px' }
};
