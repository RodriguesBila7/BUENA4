/**
 * src/utils/formatters.js
 * Validações e Formatadores Padronizados Moçambicanos (SERNIC)
 */

/**
 * Sanitiza o NUIT para conter no máximo 12 dígitos numéricos.
 */
export function sanitizeNuit(val) {
  if (!val) return '';
  return String(val).replace(/\D/g, '').slice(0, 12);
}

/**
 * Valida se o NUIT é válido (numérico, entre 1 e 12 dígitos).
 */
export function validateNuit(nuit, isRequired = true) {
  if (!nuit || !String(nuit).trim()) {
    if (isRequired) return { isValid: false, message: 'O NUIT é obrigatório.' };
    return { isValid: true, value: '' };
  }
  const cleaned = sanitizeNuit(nuit);
  if (!cleaned || cleaned.length === 0) {
    return { isValid: false, message: 'O NUIT deve conter apenas números.' };
  }
  if (cleaned.length > 12) {
    return { isValid: false, message: 'O NUIT não pode ultrapassar o limite de 12 dígitos.' };
  }
  return { isValid: true, value: cleaned };
}

/**
 * Formata um contacto moçambicano no padrão oficial telecom (+258 8X XXX XXXX).
 * Recebe qualquer string, extrai os 9 dígitos locais e prefixa com (+258).
 */
export function formatMozPhone(val) {
  if (!val) return '';
  let digits = String(val).replace(/\D/g, '');
  
  // Se começou com 258, remover o prefixo 258 para obter os 9 dígitos locais
  if (digits.startsWith('258')) {
    digits = digits.slice(3);
  }
  
  // Limitar estritamente aos 9 dígitos locais das telecomunicações de Moçambique
  digits = digits.slice(0, 9);
  
  if (!digits) return '';
  
  if (digits.length <= 2) {
    return `+258 ${digits}`;
  }
  if (digits.length <= 5) {
    return `+258 ${digits.slice(0, 2)} ${digits.slice(2)}`;
  }
  return `+258 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

/**
 * Sanitiza e extrai os 9 dígitos locais do telefone +258
 */
export function sanitizeMozPhone(val) {
  if (!val) return '';
  let digits = String(val).replace(/\D/g, '');
  if (digits.startsWith('258')) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 9);
}

/**
 * Valida se o contacto possui exactamente 9 dígitos moçambicanos após o +258
 */
export function validateMozPhone(val, isRequired = false) {
  if (!val || !String(val).trim()) {
    if (isRequired) return { isValid: false, message: 'O contacto é obrigatório.' };
    return { isValid: true, value: '' };
  }

  const digits = sanitizeMozPhone(val);
  if (digits.length !== 9) {
    return { 
      isValid: false, 
      message: 'O contacto deve conter exactamente 9 dígitos das telecomunicações de Moçambique após o prefixo (+258). Ex: +258 84 123 4567' 
    };
  }

  return { isValid: true, value: formatMozPhone(digits), rawDigits: digits };
}
