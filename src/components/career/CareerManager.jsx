import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import useAdminActsData from '../../hooks/useAdminActsData';
import PromotionTab from './PromotionTab';
import ProgressionTab from './ProgressionTab';
import CareerHistoryTab from './CareerHistoryTab';
import ServiceTimeTab from './ServiceTimeTab';
import AdminActsAnalytics from '../adminActs/AdminActsAnalytics';
import { calcPromoEligibility, calcProgEligibility } from './careerUtils';

export default function CareerManager({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('promo'); // promo, prog, history
  const { employees } = useEmployeeData();
  const { data: orgData } = useOrgData();
  const { acts, registerAct, confirmAct, deleteAct, updateAct, fetchData } = useAdminActsData();

  // Filter out inactive employees if needed, but normally we check active employees
  const activeEmployees = useMemo(() => employees.filter(e => e.isActive !== false), [employees]);

  // Calculate elegibles
  const promoElegibles = useMemo(() => {
    return activeEmployees.map(emp => calcPromoEligibility(emp, acts)).filter(e => e.isEligible).sort((a,b) => {
      // 1. Mais anos de atraso 2. Maior tempo na categoria 3. Mais antigo
      if (b.yearsInCategory !== a.yearsInCategory) return b.yearsInCategory - a.yearsInCategory;
      return new Date(a.emp.admissionDate || 0) - new Date(b.emp.admissionDate || 0);
    });
  }, [activeEmployees, acts]);

  const progElegibles = useMemo(() => {
    return activeEmployees.map(emp => calcProgEligibility(emp, acts)).filter(e => e.isEligible).sort((a,b) => {
      // 1. Maior tempo no nivel 2. Maior tempo na categoria
      if (b.yearsInLevel !== a.yearsInLevel) return b.yearsInLevel - a.yearsInLevel;
      return b.yearsInCategory - a.yearsInCategory;
    });
  }, [activeEmployees, acts]);

  // Calcular tempo para todos os funcionarios para a nova aba
  const allServiceTimes = useMemo(() => {
    return activeEmployees.map(emp => {
      const promoData = calcPromoEligibility(emp, acts);
      const progData = calcProgEligibility(emp, acts);
      return {
        emp,
        promoData,
        progData
      };
    }).sort((a, b) => b.promoData.exactTime.totalDays - a.promoData.exactTime.totalDays);
  }, [activeEmployees, acts]);

  const promoDelayed = promoElegibles.filter(e => e.yearsInCategory >= 6).length;
  const progDelayed = progElegibles.filter(e => e.yearsInLevel >= 3).length;

  const promoProgActs = useMemo(() => {
    return acts.filter(a => a.actType === 'Promoção' || a.actType === 'Progressão');
  }, [acts]);

  const pendingActs = promoProgActs.filter(a => a.status === 'Pendente' || a.details?.status === 'Pendente');

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={styles.pageTitle}>Promoção e Progressão de Carreira</h2>
      </div>

      {pendingActs.length > 0 && (
        <div style={{ padding: '15px', backgroundColor: 'rgba(245, 158, 11, 0.12)', borderLeft: '4px solid #f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
            Tem {pendingActs.length} {pendingActs.length === 1 ? 'acto pendente' : 'actos pendentes'} a aguardar confirmação. 
            Vá à aba "Histórico" para rever e confirmar.
          </span>
        </div>
      )}
      
      {/* Cards de Resumo */}
      <div style={styles.cardsGrid}>
        <div style={{...styles.card, borderLeft: '4px solid #10b981'}}>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Elegíveis para Promoção</span>
            <span style={styles.cardValue}>{promoElegibles.length} func.</span>
          </div>
        </div>
        <div style={{...styles.card, borderLeft: '4px solid #3b82f6'}}>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Elegíveis para Progressão</span>
            <span style={styles.cardValue}>{progElegibles.length} func.</span>
          </div>
        </div>
        <div style={{...styles.card, borderLeft: '4px solid #ef4444'}}>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Promoções em Atraso (&gt;6 anos)</span>
            <span style={{...styles.cardValue, color: '#ef4444'}}>{promoDelayed} func.</span>
          </div>
        </div>
        <div style={{...styles.card, borderLeft: '4px solid #f59e0b'}}>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Progressões em Atraso (&gt;3 anos)</span>
            <span style={{...styles.cardValue, color: '#f59e0b'}}>{progDelayed} func.</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ ...styles.tabsContainer, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveSubTab('analytics')} style={activeSubTab === 'analytics' ? styles.tabActive : styles.tab}>
          Estatística Analítica
        </button>
        <button onClick={() => setActiveSubTab('promo')} style={activeSubTab === 'promo' ? styles.tabActive : styles.tab}>
          Elegíveis para Promoção (≥ 6 Anos)
        </button>
        <button onClick={() => setActiveSubTab('prog')} style={activeSubTab === 'prog' ? styles.tabActive : styles.tab}>
          Elegíveis para Progressão (≥ 2 Anos)
        </button>
        <button onClick={() => setActiveSubTab('time')} style={activeSubTab === 'time' ? styles.tabActive : styles.tab}>
          Tempo de Serviço Geral
        </button>
        <button onClick={() => setActiveSubTab('history')} style={activeSubTab === 'history' ? styles.tabActive : styles.tab}>
          Histórico de Promoções / Progressões
        </button>
      </div>

      <div style={styles.tabContent}>
        {activeSubTab === 'analytics' && <AdminActsAnalytics acts={promoProgActs} title="Estatísticas de Promoção e Progressão" />}
        {activeSubTab === 'promo' && <PromotionTab elegibles={promoElegibles} orgData={orgData} onPromote={registerAct} onRefresh={fetchData} />}
        {activeSubTab === 'prog' && <ProgressionTab elegibles={progElegibles} orgData={orgData} onProgress={registerAct} onRefresh={fetchData} />}
        {activeSubTab === 'time' && <ServiceTimeTab data={allServiceTimes} orgData={orgData} onRegisterAct={registerAct} />}
        {activeSubTab === 'history' && <CareerHistoryTab acts={acts} employees={employees} orgData={orgData} user={user} onConfirm={confirmAct} onDelete={deleteAct} onUpdate={updateAct} />}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' },
  pageTitle: { margin: 0, fontSize: '24px', color: 'var(--color-primary)' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
  cardContent: { display: 'flex', flexDirection: 'column', gap: '8px' },
  cardLabel: { fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-muted)' },
  cardValue: { fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  tabsContainer: { display: 'flex', gap: '10px', borderBottom: '1px solid var(--color-border)' },
  tab: { padding: '12px 24px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none', borderBottom: '3px solid transparent', fontSize: '15px', color: 'var(--color-text-muted)', fontWeight: '500' },
  tabActive: { padding: '12px 24px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none', borderBottom: '3px solid var(--color-primary)', fontSize: '15px', color: 'var(--color-primary)', fontWeight: 'bold' },
  tabContent: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)' }
};
