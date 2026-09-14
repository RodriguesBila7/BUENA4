import React, { useState, useMemo } from 'react';
import useAdminActsData from '../../../hooks/useAdminActsData';
import useEmployeeData from '../../../hooks/useEmployeeData';
import RegistoSaudeModal from './RegistoSaudeModal';
import EvolucaoSaudeModal from './EvolucaoSaudeModal';
import AdminActsAnalytics from '../AdminActsAnalytics';
import ConfirmModal from '../../ConfirmModal';
import { exportToExcel } from '../../../utils/excelExport';

export default function JuntaSaudeManager() {
  const { acts, addAct, updateAct, deleteAct } = useAdminActsData();
  const { employees, updateEmployee } = useEmployeeData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [evolucaoAct, setEvolucaoAct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('lista'); // 'lista' ou 'estatisticas'
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });

  // Filter acts for "Junta de Saúde"
  const saudeActs = useMemo(() => {
    return (acts || [])
      .filter(act => act.actType === 'Junta de Saúde')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [acts]);

  const filteredActs = useMemo(() => {
    let activeActs = saudeActs.filter(act => act.status === 'Em Baixa').map(act => {
      const emp = employees.find(e => e.id === act.employeeId);
      return {
        ...act,
        employeeName: emp ? emp.name : (act.employeeName || 'Desconhecido'),
        employeeNip: emp ? emp.nuit : (act.employeeNip || 'N/D')
      };
    });
    
    if (!searchTerm) return activeActs;
    const term = searchTerm.toLowerCase();
    return activeActs.filter(act => 
      act.employeeName?.toLowerCase().includes(term) || 
      act.employeeNip?.toLowerCase().includes(term)
    );
  }, [saudeActs, employees, searchTerm]);

  const handleExportExcel = () => {
    const exportData = filteredActs.map(act => {
      const emp = employees.find(e => e.id === act.employeeId);
      return {
        'Data de Início': new Date(act.date).toLocaleDateString('pt-PT'),
        'Funcionário': act.employeeName || 'Desconhecido',
        'NUIT': act.employeeNip || 'N/D',
        'Motivo': act.details?.motivo || 'N/D',
        'Tipo de Condição': act.details?.tipoCondicao || 'Temporária',
        'Data Prevista de Fim': act.details?.dataFim || 'N/D',
        'Estado': act.status
      };
    });
    exportToExcel(exportData, 'Registos_JuntaSaude');
  };

  // Statistics
  const totalBaixas = saudeActs.filter(a => a.status === 'Em Baixa').length;
  const baixasTemporarias = saudeActs.filter(a => a.status === 'Em Baixa' && a.details?.tipoCondicao === 'Temporária').length;
  const baixasPermanentes = saudeActs.filter(a => a.status === 'Em Baixa' && a.details?.tipoCondicao === 'Permanente').length;
  const altasMedicas = saudeActs.filter(a => a.status === 'Alta Médica').length;

  const handleSaveSaude = async (data) => {
    // Registar acto
    await addAct({
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      employeeNip: data.employeeNip,
      actType: 'Junta de Saúde',
      date: new Date().toISOString().split('T')[0],
      status: 'Em Baixa',
      details: {
        tipoCondicao: data.tipoCondicao,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim,
        motivo: data.motivo,
        documento: data.documento
      }
    });

    // Atualizar funcionário para mostrar Badge de Saúde
    const emp = employees.find(e => e.id === data.employeeId);
    if (emp) {
      await updateEmployee(emp.id, { ...emp, healthStatus: 'Baixa Médica' });
    }

    setIsModalOpen(false);
  };

  const handleDarAlta = (act) => {
    setConfirmModal({
      isOpen: true,
      title: 'Dar Alta Médica',
      message: `Tem certeza que deseja dar alta a ${act.employeeName}? O funcionário voltará ao estado activo normal e o processo de baixa será encerrado.`,
      onConfirm: async () => {
        // Atualizar acto para concluído
        await updateAct(act.id, { 
          ...act, 
          status: 'Alta Médica', 
          details: { ...act.details, dataAlta: new Date().toISOString().split('T')[0] } 
        });

        // Retirar Badge de Saúde do funcionário
        const emp = employees.find(e => e.id === act.employeeId);
        if (emp) {
          const { healthStatus, ...restEmp } = emp;
          await updateEmployee(emp.id, restEmp);
        }
        setConfirmModal({ isOpen: false });
      }
    });
  };

  const handleEvolucaoSave = async (actId, evolucaoData) => {
    const act = saudeActs.find(a => a.id === actId);
    if (!act) return;

    await updateAct(actId, {
      ...act,
      details: {
        ...act.details,
        tipoCondicao: 'Permanente',
        dataEvolucao: evolucaoData.dataAprovacao,
        documentoJunta: evolucaoData.documento,
        notasEvolucao: evolucaoData.motivoEvolucao,
        dataFim: '' // Limpar a data de fim porque é permanente
      }
    });

    setEvolucaoAct(null);
  };

  return (
    <div style={styles.container}>
      
      {/* Cards de Resumo */}
      <div style={styles.cardsContainer}>
        <div style={styles.card}>
          <div style={styles.cardIconBox}><span style={{fontSize: '24px'}}>🩺</span></div>
          <div>
            <div style={styles.cardValue}>{totalBaixas}</div>
            <div style={styles.cardTitle}>Total em Baixa</div>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIconBoxOrange}><span style={{fontSize: '24px'}}>🤒</span></div>
          <div>
            <div style={styles.cardValue}>{baixasTemporarias}</div>
            <div style={styles.cardTitle}>Doenças Temporárias</div>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIconBoxRed}><span style={{fontSize: '24px'}}>♿</span></div>
          <div>
            <div style={styles.cardValue}>{baixasPermanentes}</div>
            <div style={styles.cardTitle}>Incapacidade (Junta)</div>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIconBoxGreen}><span style={{fontSize: '24px'}}>✅</span></div>
          <div>
            <div style={styles.cardValue}>{altasMedicas}</div>
            <div style={styles.cardTitle}>Altas Médicas dadas</div>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div style={styles.header}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            style={{...styles.tabBtn, ...(viewMode === 'lista' ? styles.tabBtnActive : {})}} 
            onClick={() => setViewMode('lista')}
          >
            📋 Lista de Doentes
          </button>
          <button 
            style={{...styles.tabBtn, ...(viewMode === 'estatisticas' ? styles.tabBtnActive : {})}} 
            onClick={() => setViewMode('estatisticas')}
          >
            📊 Estatísticas Analíticas
          </button>
        </div>
        
        {viewMode === 'lista' && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Pesquisar funcionário ou NUIT..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <button onClick={handleExportExcel} style={styles.btnExport}>
              📥 Exportar Excel
            </button>
            <button onClick={() => setIsModalOpen(true)} style={styles.btnPrimary}>
              + Nova Junta de Saúde/Baixa
            </button>
          </div>
        )}
      </div>

      {viewMode === 'estatisticas' ? (
        <AdminActsAnalytics acts={saudeActs} title="Junta de Saúde" />
      ) : (
        <div style={styles.tableContainer}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Condição</th>
                <th>Data de Início</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredActs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={styles.empty}>Nenhum processo de saúde encontrado.</td>
                </tr>
              ) : (
                filteredActs.map(act => (
                  <tr key={act.id} style={styles.tr}>
                    <td>
                      <div style={styles.primaryText}>{act.employeeName}</div>
                      <div style={styles.secondaryText}>NUIT: {act.employeeNip}</div>
                    </td>
                    <td>
                      {act.details?.tipoCondicao === 'Permanente' ? (
                        <span style={styles.badgeDanger}>Incapacidade (Permanente)</span>
                      ) : (
                        <span style={styles.badgeWarning}>Baixa Temporária</span>
                      )}
                      {act.details?.motivo && <div style={{...styles.secondaryText, marginTop: '4px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={act.details.motivo}>{act.details.motivo}</div>}
                    </td>
                    <td>
                      <div style={styles.primaryText}>{act.details?.dataInicio || act.date}</div>
                      {act.details?.dataFim && act.status === 'Em Baixa' && <div style={styles.secondaryText}>Previsão: {act.details.dataFim}</div>}
                    </td>
                    <td>
                      {act.status === 'Em Baixa' ? (
                        <span style={styles.statusEmBaixa}>🌡️ Em Baixa</span>
                      ) : (
                        <span style={styles.statusAlta}>✅ Alta Médica</span>
                      )}
                    </td>
                    <td>
                      {act.status === 'Em Baixa' && (
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button onClick={() => handleDarAlta(act)} style={styles.btnAlta}>Dar Alta</button>
                          {act.details?.tipoCondicao === 'Temporária' && (
                            <button onClick={() => setEvolucaoAct(act)} style={styles.btnAgravar} title="Passar a Junta Médica Permanente">⚠️ Agravar</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <RegistoSaudeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        employees={employees} 
        onSave={handleSaveSaude} 
      />

      <EvolucaoSaudeModal
        isOpen={!!evolucaoAct}
        onClose={() => setEvolucaoAct(null)}
        act={evolucaoAct}
        onSave={handleEvolucaoSave}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
        confirmText="Confirmar"
      />
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px' },
  cardsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' },
  cardIconBox: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardIconBoxOrange: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardIconBoxRed: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardIconBoxGreen: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardValue: { fontSize: '28px', fontWeight: '800', color: 'var(--color-text-main)', lineHeight: '1' },
  cardTitle: { fontSize: '13px', color: '#64748b', fontWeight: '500' },
  tabBtn: { padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid var(--color-border, #cbd5e0)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: 'var(--color-text-muted, #475569)', transition: 'all 0.2s' },
  tabBtnActive: { backgroundColor: 'var(--color-primary, #2563eb)', color: 'white', borderColor: 'var(--color-primary, #2563eb)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  searchInput: { width: '300px', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px' },
  btnPrimary: { padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  btnExport: { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  tableContainer: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 24px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '16px 24px', verticalAlign: 'middle' },
  primaryText: { fontSize: '14px', fontWeight: '600', color: 'var(--color-text-base)' },
  secondaryText: { fontSize: '12px', color: 'var(--color-text-muted)' },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' },
  badgeWarning: { display: 'inline-block', padding: '4px 10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#D97706', borderRadius: '6px', fontSize: '12px', fontWeight: '700' },
  badgeDanger: { display: 'inline-block', padding: '4px 10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#DC2626', borderRadius: '6px', fontSize: '12px', fontWeight: '700' },
  statusEmBaixa: { display: 'inline-block', padding: '4px 10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  statusAlta: { display: 'inline-block', padding: '4px 10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  btnAlta: { padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--color-bg-subtle, #fff)', border: '1px solid var(--color-border)', color: 'var(--color-text-base)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  btnAgravar: { padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }
};
