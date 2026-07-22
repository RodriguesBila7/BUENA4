import React, { useEffect, useState } from 'react';
import useAdminActsData from '../../../hooks/useAdminActsData';

export default function FunctionalHistory({ employeeId, orgData }) {
  const { fetchHistory } = useAdminActsData();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [employeeId]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await fetchHistory(employeeId);
    setHistory(data);
    setLoading(false);
  };

  const getEntityName = (type, id) => {
    if (!id) return '-';
    if (type === 'career') return orgData.data.careers?.find(c => c.id === id)?.name || id;
    if (type === 'category') return orgData.data.categories?.find(c => c.id === id)?.name || id;
    if (type === 'directorate') return orgData.data.directorates?.find(d => d.id === id)?.name || id;
    if (type === 'department') return orgData.data.departments?.find(d => d.id === id)?.name || id;
    return id;
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>A carregar histórico...</div>;
  }

  if (history.length === 0) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '30px', marginBottom: '10px' }}>📄</div>
        Nenhum acto administrativo registado para este funcionário.
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.timeline}>
        {history.map((h, idx) => (
          <div key={h.id} style={styles.item}>
            <div style={styles.line}></div>
            <div style={styles.dot}></div>
            
            <div style={styles.content}>
              <div style={styles.header}>
                <span style={styles.typeBadge}>{h.actType}</span>
                <span style={styles.date}>{h.actDate}</span>
              </div>
              
              <div style={styles.details}>
                {h.details?.despacho && <div style={styles.infoRow}><strong>Despacho:</strong> {h.details.despacho}</div>}
                
                {h.actType === 'Promoção' && (
                  <div style={styles.changeBox}>
                    <span style={styles.oldVal}>{getEntityName('category', h.oldState?.categoryId)}</span>
                    <span style={styles.arrow}>→</span>
                    <span style={styles.newVal}>{getEntityName('category', h.newState?.categoryId)}</span>
                  </div>
                )}
                
                {h.actType === 'Mudança de Carreira' && (
                  <div style={styles.changeBox}>
                    <div style={{ marginBottom: '4px' }}>
                      <span style={styles.oldVal}>{getEntityName('career', h.oldState?.careerId)}</span>
                      <span style={styles.arrow}>→</span>
                      <span style={styles.newVal}>{getEntityName('career', h.newState?.careerId)}</span>
                    </div>
                    <div>
                      <span style={styles.oldVal}>{getEntityName('category', h.oldState?.categoryId)}</span>
                      <span style={styles.arrow}>→</span>
                      <span style={styles.newVal}>{getEntityName('category', h.newState?.categoryId)}</span>
                    </div>
                  </div>
                )}

                {h.actType === 'Progressão' && (
                  <div style={styles.changeBox}>
                    <span style={styles.oldVal}>Escalão {h.oldState?.escalao || '?'}</span>
                    <span style={styles.arrow}>→</span>
                    <span style={styles.newVal}>Escalão {h.newState?.escalao}</span>
                  </div>
                )}

                {['Nomeação', 'Cessação de Funções', 'Alteração de Cargo'].includes(h.actType) && (
                  <div style={styles.changeBox}>
                    <span style={styles.oldVal}>Cargo: {h.oldState?.cargo || 'Sem Cargo'}</span>
                    <span style={styles.arrow}>→</span>
                    <span style={styles.newVal}>{h.newState?.cargo || 'Sem Cargo'}</span>
                  </div>
                )}

                {['Transferência', 'Destacamento', 'Reafectação'].includes(h.actType) && h.details?.newDirectorateId && (
                  <div style={styles.changeBox}>
                    <span style={styles.newVal}>Nova Direcção: {getEntityName('directorate', h.details.newDirectorateId)}</span>
                  </div>
                )}

                {h.oldState?.status !== h.newState?.status && (
                  <div style={styles.changeBox}>
                    <span style={styles.oldVal}>Estado: {h.oldState?.status}</span>
                    <span style={styles.arrow}>→</span>
                    <span style={styles.newVal}>{h.newState?.status}</span>
                  </div>
                )}

                {h.details?.pdfAttachment && (
                  <div style={{ marginTop: '10px' }}>
                    <a 
                      href={h.details.pdfAttachment} 
                      download={`Despacho_${h.actType}_${h.actDate}.pdf`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', backgroundColor: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)', borderRadius: '6px',
                        color: 'var(--color-primary)', textDecoration: 'none', fontSize: '13px', fontWeight: '500'
                      }}
                    >
                      📎 Ver Despacho Anexo (PDF)
                    </a>
                  </div>
                )}
              </div>
              
              <div style={styles.meta}>
                Registo por: {h.user} em {new Date(h.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px 0',
  },
  timeline: {
    position: 'relative',
    marginLeft: '20px'
  },
  item: {
    position: 'relative',
    paddingLeft: '30px',
    paddingBottom: '20px',
  },
  line: {
    position: 'absolute', left: 0, top: '24px', bottom: '-8px',
    width: '2px', backgroundColor: 'var(--color-border)',
  },
  dot: {
    position: 'absolute', left: '-5px', top: '4px',
    width: '12px', height: '12px', borderRadius: '50%',
    backgroundColor: 'var(--color-primary)', border: '2px solid white',
    boxShadow: '0 0 0 1px var(--color-border)'
  },
  content: {
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '10px'
  },
  typeBadge: {
    backgroundColor: 'var(--color-primary)', color: 'white',
    padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
  },
  date: {
    fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500'
  },
  details: {
    marginBottom: '10px'
  },
  changeBox: {
    backgroundColor: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '6px',
    display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
    marginTop: '10px', fontSize: '14px'
  },
  oldVal: { color: 'var(--color-danger)', textDecoration: 'line-through' },
  arrow: { color: 'var(--color-text-muted)', fontWeight: 'bold' },
  newVal: { color: 'var(--color-success)', fontWeight: 'bold' },
  meta: {
    fontSize: '11px', color: 'var(--color-text-muted)',
    borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '10px'
  }
};
