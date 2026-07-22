import React, { useState, useMemo, useEffect } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useEffectivenessData from '../../hooks/useEffectivenessData';

export default function EffectivenessCalendar({ initialEmployee }) {
  const { employees } = useEmployeeData();
  const { records } = useEffectivenessData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Calendar Month/Year states
  const [currentDate, setCurrentDate] = useState(new Date());

  // Handle initial employee selection from query tab
  useEffect(() => {
    if (initialEmployee) {
      const emp = employees.find(e => e.id === initialEmployee.employeeId);
      if (emp) setSelectedEmployee(emp);
    }
  }, [initialEmployee, employees]);

  const searchResults = useMemo(() => {
    if (searchTerm.length < 2) return [];
    return employees.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.nip.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Generate calendar days
  const calendarDays = useMemo(() => {
    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // First day of month (0 = Sunday, 1 = Monday...)
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    const days = [];
    
    // Add empty slots for days of previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      days.push({
        day,
        dateStr
      });
    }

    return days;
  }, [year, month]);

  // Find employee records for the currently selected month
  const employeeMonthRecords = useMemo(() => {
    if (!selectedEmployee) return {};
    const map = {};
    records.forEach(r => {
      if (r.employeeId === selectedEmployee.id && r.date.startsWith(`${year}-${(month + 1).toString().padStart(2, '0')}`)) {
        map[r.date] = r;
      }
    });
    return map;
  }, [selectedEmployee, records, year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDayStyle = (dateStr) => {
    const record = employeeMonthRecords[dateStr];
    if (!record) return {};

    switch (record.status) {
      case 'Presente':
      case 'Teletrabalho':
      case 'Formação':
        return styles.dayPresent;
      case 'Atraso':
        return styles.dayLate;
      case 'Falta Justificada':
        return styles.dayExcusedAbsence;
      case 'Falta Injustificada':
        return styles.dayUnexcusedAbsence;
      case 'Férias':
      case 'Licença':
        return styles.dayVacation;
      case 'Missão de Serviço':
      case 'Dispensa':
        return styles.dayMission;
      default:
        return styles.dayOther;
    }
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div style={styles.container}>
      
      {/* Search Employee Bar */}
      <div style={styles.searchCard}>
        <h4 style={styles.cardTitle}>Selecionar Funcionário para Rastreabilidade Visual</h4>
        <div style={styles.searchWrapper}>
          <input 
            type="text" 
            placeholder="Pesquisar por Nome ou NUIT..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={styles.searchInput}
          />
          {searchResults.length > 0 && (
            <div style={styles.searchResults}>
              {searchResults.map(emp => (
                <div 
                  key={emp.id} 
                  style={styles.searchItem} 
                  onClick={() => { setSelectedEmployee(emp); setSearchTerm(''); }}
                >
                  <strong>{emp.name}</strong> (NUIT: {emp.nip})
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedEmployee && (
          <div style={styles.selectedEmpBadge}>
            <div style={styles.selectedEmpText}>
              Visualizando histórico de: <strong>{selectedEmployee.name}</strong> (NUIT: {selectedEmployee.nip})
            </div>
            <button onClick={() => setSelectedEmployee(null)} style={styles.btnClearEmp}>✕</button>
          </div>
        )}
      </div>

      {selectedEmployee ? (
        <div style={styles.calendarCard}>
          
          {/* Calendar Header Nav */}
          <div style={styles.calendarHeader}>
            <button onClick={handlePrevMonth} style={styles.btnNav}>◀</button>
            <h3 style={styles.monthLabel}>{monthNames[month]} de {year}</h3>
            <button onClick={handleNextMonth} style={styles.btnNav}>▶</button>
          </div>

          {/* Calendar Grid */}
          <div style={styles.calendarGrid}>
            {/* Weekdays headers */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} style={styles.weekdayHeader}>{d}</div>
            ))}

            {/* Days slots */}
            {calendarDays.map((dayObj, index) => {
              if (!dayObj) {
                return <div key={`empty-${index}`} style={styles.dayEmpty} />;
              }

              const { day, dateStr } = dayObj;
              const hasRecord = !!employeeMonthRecords[dateStr];
              const record = employeeMonthRecords[dateStr];

              return (
                <div 
                  key={dateStr} 
                  style={{...styles.dayCell, ...getDayStyle(dateStr)}}
                  title={record ? `${record.status}${record.reason ? ' - ' + record.reason : ''}` : 'Sem registo'}
                >
                  <span style={styles.dayNumber}>{day}</span>
                  {hasRecord && (
                    <span style={styles.statusDotLabel}>
                      {record.status.substring(0, 4)}..
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={styles.legend}>
            <h5 style={styles.legendTitle}>Legenda de Situações</h5>
            <div style={styles.legendGrid}>
              <div style={styles.legendItem}><span style={{...styles.legendDot, ...styles.dayPresent}} /> Presente / Teletrabalho / Formação</div>
              <div style={styles.legendItem}><span style={{...styles.legendDot, ...styles.dayLate}} /> Atraso</div>
              <div style={styles.legendItem}><span style={{...styles.legendDot, ...styles.dayExcusedAbsence}} /> Falta Justificada</div>
              <div style={styles.legendItem}><span style={{...styles.legendDot, ...styles.dayUnexcusedAbsence}} /> Falta Injustificada</div>
              <div style={styles.legendItem}><span style={{...styles.legendDot, ...styles.dayVacation}} /> Férias / Licença</div>
              <div style={styles.legendItem}><span style={{...styles.legendDot, ...styles.dayMission}} /> Missão / Dispensa</div>
            </div>
          </div>

        </div>
      ) : (
        <div style={styles.prompt}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <div>Pesquise e selecione um funcionário acima para visualizar a sua folha mensal de assiduidade.</div>
        </div>
      )}

    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s' },
  searchCard: { backgroundColor: 'var(--color-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' },
  cardTitle: { margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: 'var(--color-text-base)', textTransform: 'uppercase' },
  searchWrapper: { position: 'relative', width: '100%', maxWidth: '500px' },
  searchInput: { width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '14px', outline: 'none' },
  searchResults: { position: 'absolute', top: '44px', left: 0, right: 0, backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '6px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' },
  searchItem: { padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: '13px', ':hover': { backgroundColor: 'var(--color-bg-base)' } },
  selectedEmpBadge: { marginTop: '14px', backgroundColor: 'rgba(27, 54, 93, 0.05)', display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)' },
  selectedEmpText: { fontSize: '13px', color: 'var(--color-text-base)' },
  btnClearEmp: { border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: 'var(--color-text-muted)' },
  
  calendarCard: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' },
  calendarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  btnNav: { padding: '8px 16px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s', ':hover': { backgroundColor: 'rgba(0,0,0,0.03)' } },
  monthLabel: { fontSize: '18px', fontWeight: '800', color: 'var(--color-text-base)', margin: 0 },
  
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' },
  weekdayHeader: { textAlign: 'center', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-muted)', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' },
  dayEmpty: { backgroundColor: 'transparent', height: '80px', borderRadius: '6px' },
  dayCell: { backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: '8px', height: '80px', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.2s' },
  dayNumber: { fontSize: '14px', fontWeight: '700', color: 'var(--color-text-base)' },
  statusDotLabel: { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', alignSelf: 'stretch', textAlign: 'center', padding: '2px 4px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-text-muted)' },
  
  // Day states coloring
  dayPresent: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#047857' },
  dayLate: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#B45309' },
  dayExcusedAbsence: { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#1D4ED8' },
  dayUnexcusedAbsence: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#B91C1C' },
  dayVacation: { backgroundColor: 'rgba(139, 92, 246, 0.12)', borderColor: 'rgba(139, 92, 246, 0.3)', color: '#6D28D9' },
  dayMission: { backgroundColor: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.3)', color: '#0E7490' },
  dayOther: { backgroundColor: 'rgba(107, 114, 128, 0.12)', borderColor: 'rgba(107, 114, 128, 0.3)', color: '#4B5563' },
  
  legend: { marginTop: '24px', borderTop: '1px dashed var(--color-border)', paddingTop: '20px' },
  legendTitle: { margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  legendGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-base)', fontWeight: '500' },
  legendDot: { width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--color-border)' },
  
  prompt: { padding: '80px 20px', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: '1px dashed var(--color-border)', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)' }
};

