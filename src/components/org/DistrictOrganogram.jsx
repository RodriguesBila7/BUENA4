import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';

export default function DistrictOrganogram({ data, t }) {
  const { employees } = useEmployeeData();
  
  const [selectedProvId, setSelectedProvId] = useState('');
  const [selectedDistId, setSelectedDistId] = useState('');
  const [selectedSecDetails, setSelectedSecDetails] = useState(null);

  // Filtrar Direções Provinciais ativas
  const provincialDirs = useMemo(() => {
    return (data.directorates || []).filter(d => d.province && d.isActive);
  }, [data.directorates]);

  // Filtrar Direções Distritais pertencentes à Província selecionada
  const districtDirs = useMemo(() => {
    if (!selectedProvId) return [];
    const provDir = provincialDirs.find(p => p.id === selectedProvId);
    if (!provDir) return [];
    return (data.districtDirectorates || []).filter(d => d.provincialDirectorateId === selectedProvId && d.isActive);
  }, [selectedProvId, provincialDirs, data.districtDirectorates]);

  // Obter o Diretor Distrital ativo para o distrito selecionado
  const distDirector = useMemo(() => {
    if (!selectedDistId) return null;
    return employees.find(emp => emp.districtDirectorateId === selectedDistId && emp.role === 'Diretor Distrital' && emp.isActive);
  }, [selectedDistId, employees]);

  // Obter as Secções ativas deste distrito
  const distSections = useMemo(() => {
    if (!selectedDistId) return [];
    return (data.sections || []).filter(s => s.districtDirectorateId === selectedDistId && s.isActive);
  }, [selectedDistId, data.sections]);

  // Calcular dados de cada Secção (Chefe e Funcionários)
  const sectionsData = useMemo(() => {
    const map = {};
    distSections.forEach(sec => {
      const chief = employees.find(emp => emp.sectionId === sec.id && emp.role === 'Chefe de Secção' && emp.isActive);
      const staff = employees.filter(emp => emp.sectionId === sec.id && emp.role !== 'Chefe de Secção' && emp.role !== 'Diretor Distrital' && emp.isActive);
      map[sec.id] = { sec, chief, staff };
    });
    return map;
  }, [distSections, employees]);

  const handleSecClick = (secId) => {
    const details = sectionsData[secId];
    if (details) setSelectedSecDetails(details);
  };

  const calculateTimeInCargo = (dateStr) => {
    if (!dateStr) return 'Não disponível';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Não disponível';
    const diffTime = Math.abs(new Date() - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} dias`;
    const diffMonths = Math.floor(diffDays / 30.41);
    if (diffMonths < 12) return `${diffMonths} meses`;
    
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    return `${years} ano(s) ${months > 0 ? `e ${months} mês/meses` : ''}`;
  };

  return (
    <div style={styles.container}>
      {/* Seletores */}
      <div style={styles.selectorsCard}>
        <h3 style={styles.cardTitle}>Selecione a Unidade Orgânica</h3>
        <div style={styles.selectorsRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Direção Provincial</label>
            <select
              value={selectedProvId}
              onChange={(e) => {
                setSelectedProvId(e.target.value);
                setSelectedDistId('');
                setSelectedSecDetails(null);
              }}
              style={styles.select}
            >
              <option value="">-- Selecione a Província --</option>
              {provincialDirs.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.province})</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Direção Distrital</label>
            <select
              value={selectedDistId}
              onChange={(e) => {
                setSelectedDistId(e.target.value);
                setSelectedSecDetails(null);
              }}
              style={styles.select}
              disabled={!selectedProvId}
            >
              <option value="">-- Selecione o Distrito --</option>
              {districtDirs.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedDistId ? (
        <div style={styles.orgChartArea}>
          {/* Organograma Tree */}
          <div style={styles.treeContainer}>
            {/* Nível 1: Diretor Distrital */}
            <div style={styles.levelRow}>
              <div style={{ ...styles.nodeCard, borderTop: '4px solid var(--color-primary)' }}>
                <span style={styles.nodeRole}>Diretor Distrital</span>
                {distDirector ? (
                  <div style={styles.directorInfo}>
                    {distDirector.photo && <img src={distDirector.photo} alt="Foto" style={styles.nodePhoto} />}
                    <div>
                      <div style={styles.nodeName}>{distDirector.name}</div>
                      <div style={styles.nodeSub}>{distDirector.email || 'Sem e-mail'}</div>
                    </div>
                  </div>
                ) : (
                  <div style={styles.vacantNode}>Cargo Vago</div>
                )}
              </div>
            </div>

            {/* Linha vertical de conexão */}
            <div style={styles.verticalLine}></div>

            {/* Nível 2: Secções Grid */}
            <div style={styles.sectionsGrid}>
              {distSections.map(sec => {
                const { chief } = sectionsData[sec.id] || {};
                return (
                  <div 
                    key={sec.id} 
                    onClick={() => handleSecClick(sec.id)}
                    style={{
                      ...styles.secNodeCard,
                      border: selectedSecDetails?.sec.id === sec.id 
                        ? '2px solid var(--color-primary)' 
                        : '1px solid var(--color-border)'
                    }}
                  >
                    <span style={styles.secName}>{sec.name}</span>
                    {chief ? (
                      <div style={styles.chiefPreview}>
                        <span style={styles.chiefLabel}>Chefe:</span> {chief.name}
                      </div>
                    ) : (
                      <div style={styles.secVacant}>Sem Chefe Nomeado</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal / Painel de Detalhes da Secção Selecionada */}
          {selectedSecDetails && (
            <div style={styles.detailsCard}>
              <div style={styles.detailsHeader}>
                <h4 style={styles.detailsTitle}>{selectedSecDetails.sec.name}</h4>
                <button style={styles.closeBtn} onClick={() => setSelectedSecDetails(null)}>✕</button>
              </div>

              {/* Informações do Chefe */}
              <div style={styles.chiefDetailsBox}>
                <h5 style={styles.subSectionTitle}>Chefia da Secção</h5>
                {selectedSecDetails.chief ? (
                  <div style={styles.chiefInfoRow}>
                    <div style={styles.chiefPhotoContainer}>
                      {selectedSecDetails.chief.photo ? (
                        <img src={selectedSecDetails.chief.photo} alt="Chefe" style={styles.chiefPhoto} />
                      ) : (
                        <div style={styles.photoPlaceholder}>👤</div>
                      )}
                    </div>
                    <div style={styles.chiefTextDetails}>
                      <p style={styles.detailRow}><strong>Nome:</strong> {selectedSecDetails.chief.name}</p>
                      <p style={styles.detailRow}><strong>Contacto:</strong> {selectedSecDetails.chief.phone || 'N/A'}</p>
                      <p style={styles.detailRow}><strong>E-mail:</strong> {selectedSecDetails.chief.email || 'N/A'}</p>
                      <p style={styles.detailRow}>
                        <strong>Data de Nomeação:</strong> {selectedSecDetails.chief.nominationDate || selectedSecDetails.chief.admissionDate || 'N/A'}
                      </p>
                      <p style={styles.detailRow}>
                        <strong>Tempo no Cargo:</strong> {calculateTimeInCargo(selectedSecDetails.chief.nominationDate || selectedSecDetails.chief.admissionDate)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={styles.vacantDetailsBox}>Nenhum Chefe nomeado para esta Secção.</div>
                )}
              </div>

              {/* Funcionários da Secção */}
              <div style={styles.staffBox}>
                <h5 style={styles.subSectionTitle}>Efetivos da Secção ({selectedSecDetails.staff.length})</h5>
                {selectedSecDetails.staff.length > 0 ? (
                  <div style={styles.tableWrapper}>
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>NUIT</th>
                          <th>Nome</th>
                          <th>Contacto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSecDetails.staff.map(emp => (
                          <tr key={emp.id} style={styles.tr}>
                            <td>{emp.nip}</td>
                            <td><strong>{emp.name}</strong></td>
                            <td>{emp.phone || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={styles.noStaffBox}>Não existem outros funcionários afetos a esta Secção.</div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.placeholderContainer}>
          <p>Selecione uma Província e uma Direção Distrital para renderizar o Organograma.</p>
        </div>
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
  selectorsCard: {
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
  selectorsRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '240px',
    flex: '1'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    marginBottom: '8px'
  },
  select: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    fontSize: '14px'
  },
  orgChartArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  treeContainer: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
  },
  levelRow: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%'
  },
  nodeCard: {
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '16px 24px',
    width: '280px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  nodeRole: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px'
  },
  directorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'left'
  },
  nodePhoto: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid var(--color-primary)'
  },
  nodeName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--color-text-base)'
  },
  nodeSub: {
    fontSize: '11px',
    color: 'var(--color-text-muted)'
  },
  vacantNode: {
    padding: '10px',
    color: '#EF4444',
    fontWeight: '600',
    fontSize: '14px',
    border: '1px dashed rgba(239,68,68,0.4)',
    borderRadius: '6px',
    backgroundColor: 'rgba(239,68,68,0.05)'
  },
  verticalLine: {
    width: '2px',
    height: '32px',
    backgroundColor: 'var(--color-border)',
    margin: '8px 0'
  },
  sectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    width: '100%',
    maxWidth: '1000px',
    marginTop: '16px'
  },
  secNodeCard: {
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.08)'
    }
  },
  secName: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-base)',
    marginBottom: '8px',
    minHeight: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  chiefPreview: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  chiefLabel: {
    fontWeight: '600',
    color: 'var(--color-text-base)'
  },
  secVacant: {
    fontSize: '11px',
    color: '#EF4444',
    fontWeight: '600',
    borderTop: '1px dashed rgba(239,68,68,0.3)',
    paddingTop: '6px'
  },
  detailsCard: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    animation: 'slideUp 0.3s ease'
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '14px',
    marginBottom: '20px'
  },
  detailsTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--color-primary)'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)'
  },
  chiefDetailsBox: {
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid var(--color-border)'
  },
  subSectionTitle: {
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.5px',
    marginBottom: '14px'
  },
  chiefInfoRow: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  chiefPhotoContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '3px solid #fff',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    backgroundColor: 'var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  chiefPhoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  photoPlaceholder: {
    fontSize: '32px',
    color: 'var(--color-text-muted)'
  },
  chiefTextDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  detailRow: {
    fontSize: '13px',
    margin: '0',
    color: 'var(--color-text-base)'
  },
  vacantDetailsBox: {
    padding: '16px',
    textAlign: 'center',
    color: '#EF4444',
    fontStyle: 'italic',
    border: '1px dashed rgba(239,68,68,0.2)',
    borderRadius: '6px',
    backgroundColor: 'rgba(239,68,68,0.02)',
    fontSize: '13px'
  },
  staffBox: {
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid var(--color-border)'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  th: {
    padding: '10px 12px',
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
    padding: '10px 12px',
    color: 'var(--color-text-base)'
  },
  noStaffBox: {
    padding: '16px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '13px',
    fontStyle: 'italic'
  },
  noStaffBox: {
    padding: '16px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '13px',
    fontStyle: 'italic'
  },
  placeholderContainer: {
    padding: '60px 20px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-card)',
    border: '1px dashed var(--color-border)',
    borderRadius: '8px'
  }
};

