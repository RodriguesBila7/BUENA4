import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';

export default function DistrictQueries({ data, t }) {
  const { employees } = useEmployeeData();

  // Filtros
  const [province, setProvince] = useState('');
  const [provDirId, setProvDirId] = useState('');
  const [distDirId, setDistDirId] = useState('');
  const [empName, setEmpName] = useState('');
  const [nip, setNip] = useState('');
  const [role, setRole] = useState('');
  const [secId, setSecId] = useState('');
  const [status, setStatus] = useState('');

  // Listagem de Províncias ativas
  const provinces = useMemo(() => {
    const set = new Set();
    (data.directorates || []).forEach(d => {
      if (d.province && d.isActive) set.add(d.province);
    });
    return Array.from(set);
  }, [data.directorates]);

  // Listagem de Direções Provinciais correspondentes à Província selecionada
  const provincialDirs = useMemo(() => {
    return (data.directorates || []).filter(d => d.province && d.isActive && (!province || d.province === province));
  }, [data.directorates, province]);

  // Listagem de Distritos correspondentes à Província/Direção Provincial selecionada
  const districts = useMemo(() => {
    return (data.districtDirectorates || []).filter(d => {
      if (!d.isActive) return false;
      if (province && d.province !== province) return false;
      if (provDirId && d.provincialDirectorateId !== provDirId) return false;
      return true;
    });
  }, [data.districtDirectorates, province, provDirId]);

  // Listagem de Secções
  const sections = useMemo(() => {
    return (data.sections || []).filter(s => {
      if (!s.isActive || !s.districtDirectorateId) return false;
      if (distDirId && s.districtDirectorateId !== distDirId) return false;
      return true;
    });
  }, [data.sections, distDirId]);

  // Listagem de Cargos únicos em Distritos
  const roles = useMemo(() => {
    const set = new Set();
    employees.forEach(emp => {
      if (emp.unitType === 'district' && emp.role) set.add(emp.role);
    });
    return Array.from(set);
  }, [employees]);

  // Processamento e Filtragem dos Resultados
  const filteredEmployees = useMemo(() => {
    // Map para rápido lookup de nomes
    const dirMap = {};
    (data.directorates || []).forEach(d => { dirMap[d.id] = d; });

    const distMap = {};
    (data.districtDirectorates || []).forEach(d => { distMap[d.id] = d; });

    const secMap = {};
    (data.sections || []).forEach(s => { secMap[s.id] = s; });

    return employees.filter(emp => {
      // Filtrar apenas funcionários distritais
      if (emp.unitType !== 'district') return false;

      // Filtro de Nome
      if (empName.trim() && !emp.name.toLowerCase().includes(empName.toLowerCase())) return false;

      // Filtro de NUIT
      if (nip.trim() && !emp.nip.toLowerCase().includes(nip.toLowerCase())) return false;

      // Filtro de Província (obtida via Direção Provincial)
      if (province) {
        const dir = dirMap[emp.directorateId];
        if (!dir || dir.province !== province) return false;
      }

      // Filtro de Direção Provincial
      if (provDirId && emp.directorateId !== provDirId) return false;

      // Filtro de Direção Distrital
      if (distDirId && emp.districtDirectorateId !== distDirId) return false;

      // Filtro de Secção
      if (secId && emp.sectionId !== secId) return false;

      // Filtro de Cargo
      if (role && emp.role !== role) return false;

      // Filtro de Estado
      if (status && emp.status !== status) return false;

      return true;
    }).map(emp => {
      const dir = dirMap[emp.directorateId];
      const dist = distMap[emp.districtDirectorateId];
      const sec = secMap[emp.sectionId];
      return {
        ...emp,
        provinceName: dir ? dir.province : 'N/A',
        provDirName: dir ? dir.name : 'N/A',
        distDirName: dist ? dist.name : 'N/A',
        secName: sec ? sec.name : 'N/A'
      };
    });
  }, [employees, data, province, provDirId, distDirId, empName, nip, role, secId, status]);

  const resetFilters = () => {
    setProvince('');
    setProvDirId('');
    setDistDirId('');
    setEmpName('');
    setNip('');
    setRole('');
    setSecId('');
    setStatus('');
  };

  return (
    <div style={styles.container}>
      {/* Filtros */}
      <div style={styles.filterCard}>
        <h3 style={styles.cardTitle}>Pesquisa Avançada (Estrutura Distrital)</h3>
        <div style={styles.filterGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Província</label>
            <select value={province} onChange={(e) => { setProvince(e.target.value); setProvDirId(''); setDistDirId(''); setSecId(''); }} style={styles.input}>
              <option value="">-- Todas as Províncias --</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Direção Provincial</label>
            <select value={provDirId} onChange={(e) => { setProvDirId(e.target.value); setDistDirId(''); setSecId(''); }} style={styles.input} disabled={!province}>
              <option value="">-- Todas as Direções Provinciais --</option>
              {provincialDirs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Direção Distrital</label>
            <select value={distDirId} onChange={(e) => { setDistDirId(e.target.value); setSecId(''); }} style={styles.input}>
              <option value="">-- Todas as Direções Distritais --</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.province})</option>)}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Secção</label>
            <select value={secId} onChange={(e) => setSecId(e.target.value)} style={styles.input}>
              <option value="">-- Todas as Secções --</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.filterGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nome do Funcionário</label>
            <input type="text" value={empName} onChange={(e) => setEmpName(e.target.value)} style={styles.input} placeholder="Ex: Carlos Zitha" />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>NUIT</label>
            <input type="text" value={nip} onChange={(e) => setNip(e.target.value)} style={styles.input} placeholder="Ex: NUIT-1234" />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Cargo de Chefia</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={styles.input}>
              <option value="">-- Todos os Cargos --</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
              <option value="">-- Todos os Estados --</option>
              <option value="Ativo">Ativo</option>
              <option value="Férias">Férias</option>
              <option value="Suspenso">Suspenso</option>
              <option value="Licença">Licença</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div style={styles.btnRow}>
          <button onClick={resetFilters} style={styles.btnReset}>Limpar Filtros</button>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div style={styles.resultsCard}>
        <div style={styles.resultsHeader}>
          <h3 style={styles.cardTitle}>Funcionários Encontrados</h3>
          <span style={styles.countBadge}>{filteredEmployees.length} registos</span>
        </div>

        {filteredEmployees.length > 0 ? (
          <div style={styles.tableContainer}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>NUIT</th>
                  <th>Nome</th>
                  <th>Província</th>
                  <th>D. Distrital</th>
                  <th>Secção</th>
                  <th>Cargo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} style={styles.tr}>
                    <td>{emp.nip}</td>
                    <td><strong>{emp.name}</strong></td>
                    <td>{emp.provinceName}</td>
                    <td>{emp.distDirName}</td>
                    <td>{emp.secName}</td>
                    <td>{emp.role || 'Sem Cargo'}</td>
                    <td>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: emp.status === 'Ativo' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: emp.status === 'Ativo' ? '#10B981' : '#EF4444'
                      }}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={styles.noData}>Nenhum funcionário encontrado com os filtros selecionados.</div>
        )}
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
  filterCard: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--color-text-base)',
    marginBottom: '16px'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    marginBottom: '8px'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    fontSize: '14px'
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '8px'
  },
  btnReset: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  resultsCard: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  countBadge: {
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: 'var(--color-border)',
    color: 'var(--color-text-muted)',
    padding: '4px 10px',
    borderRadius: '20px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  th: {
    padding: '12px 16px',
    backgroundColor: 'rgba(0,0,0,0.02)',
    textAlign: 'left',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
    borderBottom: '2px solid var(--color-border)'
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
    ':hover': {
      backgroundColor: 'rgba(0,0,0,0.01)'
    }
  },
  td: {
    padding: '12px 16px',
    color: 'var(--color-text-base)'
  },
  badge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
    fontStyle: 'italic'
  }
};

