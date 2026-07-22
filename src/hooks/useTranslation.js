import { useState, useCallback } from 'react';
import translations from '../utils/translations';

const STORAGE_KEY = 'sernic_language';
const DEFAULT_LANG = 'pt';

/**
 * Hook de tradução para o sistema SERNIC-DRH.
 * Lê / grava o idioma no localStorage para persistir após logout.
 *
 * @returns {{ t: (key: string) => string, language: string, setLanguage: (lang: string) => void }}
 */
export default function useTranslation() {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  });

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      console.error('Erro ao guardar idioma:', e);
    }
  }, []);

  const t = useCallback((key) => {
    const dict = translations[language] || translations[DEFAULT_LANG];
    return dict[key] ?? key;
  }, [language]);

  return { t, language, setLanguage };
}
