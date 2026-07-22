export function calculateExactTime(startDate, endDate = new Date()) {
  if (!startDate) return { years: 0, months: 0, days: 0, weeks: 0, formatted: '0 dias' };

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) return { years: 0, months: 0, days: 0, weeks: 0, formatted: '0 dias' };

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += previousMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const diffTime = Math.abs(end - start);
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);

  let formattedParts = [];
  if (years > 0) formattedParts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  if (months > 0) formattedParts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  if (days > 0) formattedParts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);

  if (formattedParts.length === 0) {
    formattedParts.push('0 dias');
  }

  return { years, months, days, weeks, totalDays, formatted: formattedParts.join(', ') };
}

export function calcPromoEligibility(emp, allActs) {
  // Verifica se tem promoção pendente
  const hasPendingPromo = allActs.some(a => 
    a.employeeId === emp.id && 
    (a.actType === 'Promoção' || a.type === 'promotion') && 
    (a.status === 'Pendente' || a.details?.status === 'Pendente')
  );

  const empActs = allActs.filter(a => a.employeeId === emp.id && (a.actType === 'Promoção' || a.type === 'promotion')).sort((a,b) => new Date(b.actDate || b.date) - new Date(a.actDate || a.date));
  const lastPromo = empActs.length > 0 ? empActs[0] : null;

  const baseDate = lastPromo ? new Date(lastPromo.actDate || lastPromo.date) : (emp.admissionDate ? new Date(emp.admissionDate) : null);
  
  if (!baseDate) {
    return { emp, isEligible: false, yearsInCategory: 0, exactTime: calculateExactTime(null), lastPromoDate: null };
  }

  const exactTime = calculateExactTime(baseDate);
  // Regra: 6 anos para promoção
  const isEligible = !hasPendingPromo && exactTime.years >= 6;

  return {
    emp,
    isEligible,
    yearsInCategory: exactTime.years,
    exactTime,
    lastPromoDate: baseDate,
    hasPendingPromo
  };
}

export function calcProgEligibility(emp, allActs) {
  // Verifica se tem progressão pendente
  const hasPendingProg = allActs.some(a => 
    a.employeeId === emp.id && 
    (a.actType === 'Progressão' || a.type === 'progression') && 
    (a.status === 'Pendente' || a.details?.status === 'Pendente')
  );

  const empActs = allActs.filter(a => a.employeeId === emp.id && (a.actType === 'Progressão' || a.type === 'progression')).sort((a,b) => new Date(b.actDate || b.date) - new Date(a.actDate || a.date));
  const lastProg = empActs.length > 0 ? empActs[0] : null;

  const baseDate = lastProg ? new Date(lastProg.actDate || lastProg.date) : (emp.admissionDate ? new Date(emp.admissionDate) : null);
  
  if (!baseDate) {
    return { emp, isEligible: false, yearsInLevel: 0, exactTimeLevel: calculateExactTime(null), lastProgDate: null, yearsInCategory: 0 };
  }

  const exactTimeLevel = calculateExactTime(baseDate);
  const isEligible = !hasPendingProg && exactTimeLevel.years >= 2;

  // Calcula tambem anos na categoria para ordenacao
  const promoActs = allActs.filter(a => a.employeeId === emp.id && (a.actType === 'Promoção' || a.type === 'promotion')).sort((a,b) => new Date(b.actDate || b.date) - new Date(a.actDate || a.date));
  const lastPromo = promoActs.length > 0 ? promoActs[0] : null;
  const promoBase = lastPromo ? new Date(lastPromo.actDate || lastPromo.date) : (emp.admissionDate ? new Date(emp.admissionDate) : null);
  const exactTimeCat = calculateExactTime(promoBase);

  return {
    emp,
    isEligible,
    yearsInLevel: exactTimeLevel.years,
    exactTimeLevel,
    lastProgDate: baseDate,
    yearsInCategory: exactTimeCat.years,
    exactTimeCat,
    hasPendingProg
  };
}
