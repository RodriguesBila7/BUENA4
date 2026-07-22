import React, { useState } from 'react';

export default function MultiDateCalendar({ selectedDates, onChange }) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (selectedDates.includes(dStr)) {
      onChange(selectedDates.filter(d => d !== dStr));
    } else {
      onChange([...selectedDates, dStr].sort());
    }
  };

  // Generate blank spaces for days before the 1st
  const blanks = [];
  for (let i = 0; i < firstDay; i++) {
    blanks.push(<div key={`blank-${i}`} style={styles.dayBlank}></div>);
  }

  // Generate days
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isSelected = selectedDates.includes(dStr);
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    
    days.push(
      <button
        key={d}
        type="button"
        onClick={() => handleDayClick(d)}
        style={{
          ...styles.dayButton,
          backgroundColor: isSelected ? 'var(--color-primary)' : (isToday ? 'rgba(27, 54, 93, 0.05)' : 'transparent'),
          color: isSelected ? '#fff' : (isToday ? 'var(--color-primary)' : 'var(--color-text-base)'),
          fontWeight: isSelected || isToday ? '700' : '500',
          border: isSelected ? '1px solid var(--color-primary)' : (isToday ? '1px solid var(--color-primary)' : '1px solid var(--color-border)')
        }}
      >
        {d}
      </button>
    );
  }

  const allCells = [...blanks, ...days];

  return (
    <div style={styles.calendarContainer}>
      <div style={styles.header}>
        <button type="button" onClick={handlePrevMonth} style={styles.navBtn}>◀</button>
        <div style={styles.monthLabel}>{monthNames[month]} {year}</div>
        <button type="button" onClick={handleNextMonth} style={styles.navBtn}>▶</button>
      </div>

      <div style={styles.weekDays}>
        <div style={styles.weekDay}>D</div>
        <div style={styles.weekDay}>S</div>
        <div style={styles.weekDay}>T</div>
        <div style={styles.weekDay}>Q</div>
        <div style={styles.weekDay}>Q</div>
        <div style={styles.weekDay}>S</div>
        <div style={styles.weekDay}>S</div>
      </div>

      <div style={styles.grid}>
        {allCells}
      </div>
      
      <div style={styles.hint}>
        Clique nos dias para selecioná-los ou removê-los.
      </div>
    </div>
  );
}

const styles = {
  calendarContainer: {
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '12px',
    backgroundColor: 'var(--color-bg-base)',
    width: '100%',
    maxWidth: '300px',
    margin: '0 auto',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  navBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },
  monthLabel: {
    fontWeight: '700',
    fontSize: '14px',
    color: 'var(--color-text-base)'
  },
  weekDays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    textAlign: 'center',
    marginBottom: '6px'
  },
  weekDay: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-muted)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px'
  },
  dayBlank: {
    aspectRatio: '1',
    visibility: 'hidden'
  },
  dayButton: {
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.1s'
  },
  hint: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    marginTop: '10px',
    fontStyle: 'italic'
  }
};
