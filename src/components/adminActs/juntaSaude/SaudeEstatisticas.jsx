import React, { useState, useMemo } from 'react';

export default function SaudeEstatisticas({ saudeActs }) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const stats = useMemo(() => {
    // 1. Filtrar pelo periodo
    let filtered = saudeActs || [];
    if (dataInicio) {
      filtered = filtered.filter(a => new Date(a.date) >= new Date(dataInicio));
    }
    if (dataFim) {
      filtered = filtered.filter(a => new Date(a.date) <= new Date(dataFim));
    }

    // 2. Agrupar por doenca / motivo
    const porMotivo = {};
    const porCondicao = {
      'Temporária': 0,
      'Permanente': 0,
      'Óbito': 0 // Se vier para aqui
    };
    
    let totais = {
      emBaixa: 0,
      altas: 0
    };

    filtered.forEach(act => {
      const motivo = (act.details?.motivo || act.details?.parecer || 'Não Especificado').toLowerCase().trim();
      const tipo = act.details?.tipoCondicao || 'Temporária';
      
      if (!porMotivo[motivo]) porMotivo[motivo] = 0;
      porMotivo[motivo]++;
      
      if (porCondicao[tipo] !== undefined) {
        porCondicao[tipo]++;
      }

      if (act.status === 'Alta Médica') {
        totais.altas++;
      } else {
        totais.emBaixa++;
      }
    });

    const motivosOrdenados = Object.entries(porMotivo)
      .sort((a, b) => b[1] - a[1])
      .map(([m, c]) => ({ motivo: m, count: c }));

    return { porCondicao, motivosOrdenados, totais, total: filtered.length };
  }, [saudeActs, dataInicio, dataFim]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Estatísticas Detalhadas de Saúde</h3>
        <div style={styles.filters}>
          <div>
            <label style={styles.label}>Período De:</label>
            <input type="date" style={styles.input} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Até:</label>
            <input type="date" style={styles.input} value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h4 style={styles.cardTitle}>Resumo no Período</h4>
          <div style={styles.statRow}><span>Total de Casos Registados:</span> <strong>{stats.total}</strong></div>
          <div style={styles.statRow}><span>Doentes (Atualmente em Baixa):</span> <strong>{stats.totais.emBaixa}</strong></div>
          <div style={styles.statRow}><span>Altas Médicas Dadas:</span> <strong style={{ color: '#059669' }}>{stats.totais.altas}</strong></div>
        </div>

        <div style={styles.card}>
          <h4 style={styles.cardTitle}>Por Tipo de Baixa</h4>
          <div style={styles.statRow}><span>Baixa Temporária:</span> <strong>{stats.porCondicao['Temporária']}</strong></div>
          <div style={styles.statRow}><span>Junta / Baixa Permanente:</span> <strong>{stats.porCondicao['Permanente']}</strong></div>
        </div>
      </div>

      <div style={styles.card}>
        <h4 style={styles.cardTitle}>Top Doenças / Motivos (Ranking)</h4>
        {stats.motivosOrdenados.length === 0 ? (
          <p style={styles.empty}>Nenhuma doença registada neste período.</p>
        ) : (
          <table className="premium-table">
            <thead>
              <tr>
                <th>Patologia / Motivo</th>
                <th>Nº de Casos</th>
                <th>% do Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.motivosOrdenados.map((m, i) => (
                <tr key={i} style={styles.tr}>
                  <td style={{...styles.td, textTransform: 'capitalize'}}>{m.motivo}</td>
                  <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{m.count}</td>
                  <td style={{...styles.td, textAlign: 'right'}}>
                    {((m.count / stats.total) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { marginTop: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' },
  title: { margin: 0, color: '#1e293b', fontSize: '18px' },
  filters: { display: 'flex', gap: '15px', alignItems: 'center' },
  label: { fontSize: '13px', color: '#64748b', marginRight: '8px', fontWeight: '500' },
  input: { padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: '6px', outline: 'none' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
  card: { backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  cardTitle: { margin: '0 0 15px 0', color: '#334155', fontSize: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' },
  statRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#475569' },
  empty: { color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '13px', textAlign: 'left' },
  td: { padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#334155', fontSize: '14px' },
  tr: { ':hover': { backgroundColor: '#f8fafc' } }
};
