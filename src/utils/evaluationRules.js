// Regras de Classificação para Avaliação de Desempenho (Decreto n.º 22/2018)

export const DEFAULT_CRITERIA = [
  { label: 'Excelente', min: 19, max: 20, color: '#047857', textColor: '#FFFFFF', hexBadge: '#10B981', hexLight: '#D1FAE5', hexDark: '#047857' },
  { label: 'Muito Bom', min: 17, max: 18.9, color: '#059669', textColor: '#FFFFFF', hexBadge: '#34D399', hexLight: '#D1FAE5', hexDark: '#059669' },
  { label: 'Bom', min: 14, max: 16.9, color: '#4D7C0F', textColor: '#FFFFFF', hexBadge: '#84CC16', hexLight: '#ECFCCB', hexDark: '#4D7C0F' },
  { label: 'Suficiente', min: 10, max: 13.9, color: '#B45309', textColor: '#FFFFFF', hexBadge: '#F59E0B', hexLight: '#FEF3C7', hexDark: '#B45309' },
  { label: 'Medíocre', min: 0, max: 9.9, color: '#B91C1C', textColor: '#FFFFFF', hexBadge: '#EF4444', hexLight: '#FEE2E2', hexDark: '#B91C1C' }
];

export const getCriteria = () => {
  try {
    const saved = localStorage.getItem('sernic_evaluation_criteria');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error reading evaluation criteria:", e);
  }
  return DEFAULT_CRITERIA;
};

/**
 * Calcula a classificação textual e a cor associada com base na pontuação de 0 a 20.
 * @param {number} score - Pontuação de 0 a 20
 * @returns {object}
 */
export const getClassification = (score) => {
  const numScore = parseFloat(score);

  if (isNaN(numScore) || numScore < 0) {
    return { label: 'Não Avaliado', color: '#CBD5E1', textColor: '#475569', hexBadge: '#CBD5E1', hexLight: '#F1F5F9', hexDark: '#475569' };
  }

  const criteria = getCriteria();
  
  // Sort criteria from highest to lowest to check bounds
  const sorted = [...criteria].sort((a, b) => b.min - a.min);
  
  for (const c of sorted) {
    if (numScore >= c.min && numScore <= c.max) {
      return c;
    }
  }

  // Fallback for edge cases where bounds have decimals gaps (e.g. 16.95)
  for (const c of sorted) {
    if (numScore >= c.min) {
      return c;
    }
  }

  return { label: 'Inválido', color: '#94A3B8', textColor: '#FFFFFF', hexBadge: '#94A3B8', hexLight: '#F1F5F9', hexDark: '#475569' };
};

export const EVALUATION_STATES = {
  PENDING: 'Não Avaliado',
  IN_PROGRESS: 'Em Avaliação',
  EVALUATED: 'Avaliado',
  APPROVED: 'Homologado'
};
