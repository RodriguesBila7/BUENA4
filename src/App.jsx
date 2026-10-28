import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import useTranslation from './hooks/useTranslation';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import { getBackgroundModel } from './utils/backgroundModels';

const DEFAULT_SETTINGS = {
  nome_instituicao: 'Serviço Nacional de Investigação Criminal',
  sigla: 'SERNIC',
  logotipo: null, // Nulo por padrão. Será exibido o logotipo padrão do sistema
  cor_principal: '#B71C1C', // Vermelho Moçambique / SERNIC oficial
  cor_secundaria: '#2D3748',
  cor_destaque: '#FFFFFF',
  modo_tema: 'light',
  cores_aleatorias: false,
  modelo_fundo: 'soberania_sernic', // Fundo futurista, elegante e simples padrão
  data_atualizacao: new Date().toISOString(),
  usuario_responsavel: 'Sistema (Padrão)'
};

export const CORES_PALETA = [
  '#B71C1C', '#DC2626', '#C62828', '#880E4F', '#991B1B', '#7F1D1D', '#9D174D',
  '#1B365D', '#0D1B4B', '#1565C0', '#0277BD', '#1E40AF', '#1D4ED8', '#0369A1',
  '#0891B2', '#0F766E', '#004D40', '#0E7490', '#3730A3', '#4338CA', '#0F172A',
  '#1B5E20', '#00695C', '#15803D', '#059669', '#33691E', '#047857', '#3F6212',
  '#4A148C', '#6A1B9A', '#5B21B6', '#701A75', '#6B21A8', '#581C87', '#BE185D',
  '#D97706', '#F57F17', '#BF360C', '#B45309', '#C2410C', '#78350F',
  '#212121', '#37474F', '#1E293B', '#334155', '#1F2937'
];

import { useAuth } from './contexts/AuthContext';
import useSecuritySettings from './hooks/useSecuritySettings';

export default function App() {
  const { user, login, logout, updateSessionActivity } = useAuth();
  const { policies } = useSecuritySettings();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const { t, language, setLanguage } = useTranslation();

  // Carregar configurações do localStorage ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem('sernic_identity_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Se a cor salva for o azul legado (#1B365D) ou estiver em branco, migra imediatamente para o Vermelho Oficial (#B71C1C)
        if (!parsed.cor_principal || parsed.cor_principal.toUpperCase() === '#1B365D') {
          parsed.cor_principal = '#B71C1C';
        }
        if (!parsed.modelo_fundo) {
          parsed.modelo_fundo = 'soberania_sernic';
        }
        // Se a opção de cores aleatórias estiver ativa, sorteia uma cor ao iniciar/recarregar a página
        if (parsed.cores_aleatorias) {
          const randomCor = CORES_PALETA[Math.floor(Math.random() * CORES_PALETA.length)];
          parsed.cor_principal = randomCor;
        }
        setSettings(parsed);
        localStorage.setItem('sernic_identity_settings', JSON.stringify(parsed));
      } catch (e) {
        console.error("Erro ao carregar configurações salvas, usando padrão.", e);
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('sernic_identity_settings', JSON.stringify(DEFAULT_SETTINGS));
    }
  }, []);

  // Ciclo automático a cada 3 segundos quando o modo de Cores Aleatórias estiver ativo
  useEffect(() => {
    if (!settings.cores_aleatorias) return;

    const timer = setInterval(() => {
      setSettings(prev => {
        if (!prev.cores_aleatorias) return prev;
        const current = (prev.cor_principal || '').toUpperCase();
        const available = CORES_PALETA.filter(c => c.toUpperCase() !== current);
        const randomCor = available[Math.floor(Math.random() * available.length)] || CORES_PALETA[0];
        const updated = {
          ...prev,
          cor_principal: randomCor,
          data_atualizacao: new Date().toISOString()
        };
        try {
          localStorage.setItem('sernic_identity_settings', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [settings.cores_aleatorias]);

  // Aplicar cores, modelo de fundo e tema globalmente sempre que houver alteração
  useEffect(() => {
    const activeColor = (!settings.cor_principal || settings.cor_principal.toUpperCase() === '#1B365D')
      ? '#B71C1C'
      : settings.cor_principal;

    const activeBgModel = getBackgroundModel(settings.modelo_fundo || 'soberania_sernic');

    // Injeção de variáveis CSS customizadas de cores e fundo
    if (settings.modo_tema === 'dark') {
      document.documentElement.style.setProperty('--color-primary', activeColor);
      document.documentElement.style.setProperty('--color-secondary', settings.cor_secundaria || '#3A4A66');
      document.documentElement.style.setProperty('--color-accent', settings.cor_destaque || '#FFFFFF');
    } else {
      document.documentElement.style.setProperty('--color-primary', activeColor);
      document.documentElement.style.setProperty('--color-secondary', settings.cor_secundaria || '#2D3748');
      document.documentElement.style.setProperty('--color-accent', settings.cor_destaque || '#FFFFFF');
    }
    
    // Injeção de variáveis do modelo de fundo futurista simples e refinado
    const isDarkTheme = settings.modo_tema === 'dark';
    const resolvedBgGradient = isDarkTheme
      ? activeBgModel.bgGradient
      : (!activeBgModel.isDark
          ? activeBgModel.bgGradient
          : `radial-gradient(ellipse 90% 60% at 50% 12%, rgba(183, 28, 28, 0.08) 0%, transparent 70%), radial-gradient(circle at 15% 85%, rgba(27, 54, 93, 0.05) 0%, transparent 50%), linear-gradient(160deg, #FFFFFF 0%, #F1F5F9 55%, #E2E8F0 100%)`);

    document.documentElement.style.setProperty('--system-bg-gradient', resolvedBgGradient);
    document.documentElement.style.setProperty('--system-glow-color', activeBgModel.glowColor);
    document.documentElement.style.setProperty('--system-watermark-opacity', isDarkTheme ? '0.095' : '0.075');

    // Injeção do modo de tema no html/root
    document.documentElement.setAttribute('data-theme', settings.modo_tema || 'light');
  }, [settings]);

  // Função para actualizar e salvar configurações (simulação de UPDATE SQL)
  const updateSettings = (newSettings) => {
    const updated = {
      ...newSettings,
      data_atualizacao: new Date().toISOString()
    };
    setSettings(updated);
    localStorage.setItem('sernic_identity_settings', JSON.stringify(updated));
  };

  // Função para restaurar configurações padrão (simulação de RESET SQL)
  const resetSettings = (adminUser) => {
    const resetValues = {
      ...DEFAULT_SETTINGS,
      data_atualizacao: new Date().toISOString(),
      usuario_responsavel: adminUser
    };
    setSettings(resetValues);
    localStorage.setItem('sernic_identity_settings', JSON.stringify(resetValues));
  };

  const [loginSessionKey, setLoginSessionKey] = useState(() => Date.now());

  const handleLogin = (userData) => {
    login(userData);
    
    // Forçar a vista inicial e menus colapsados no novo login
    localStorage.setItem('sernic_active_tab', 'home');
    localStorage.setItem('sernic_expanded_menu', '');
    localStorage.setItem('sernic_expanded_submenu', '');
  };

  const handleLogout = () => {
    logout();
    setLoginSessionKey(Date.now());
    try {
      localStorage.removeItem('sernic_logged_user');
      sessionStorage.removeItem('sernic_logged_user');
      localStorage.removeItem('sernic_last_activity');
      sessionStorage.removeItem('sernic_last_activity');
      localStorage.setItem('sernic_active_tab', 'home');
      sessionStorage.setItem('sernic_active_tab', 'home');
    } catch (e) {}
  };

  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

  // Controlo de Inatividade e Expiração da Sessão
  useEffect(() => {
    const isTimeoutEnabled = policies.autoLogout !== false;
    const userTimeout = Math.max(parseInt(policies.sessionTimeoutMinutes || policies.sessionTimeout || 30, 10), 15);
    const INACTIVITY_LIMIT_MS = userTimeout * 60 * 1000;
    let inactivityTimer;
    let lastActivityTime = 0;

    const triggerSessionExpired = () => {
      // Mostrar alerta PRIMEIRO. O logout só ocorre quando o utilizador clica OK.
      setAlertModal({ isOpen: true, message: 'Sessão expirada por inatividade. Por favor, faça login novamente.' });
    };

    const resetTimer = () => {
      const now = Date.now();
      if (user && isTimeoutEnabled) {
        // Throttling apenas para escritas no storage
        if (now - lastActivityTime > 5000) {
          updateSessionActivity();
          lastActivityTime = now;
        }
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(triggerSessionExpired, INACTIVITY_LIMIT_MS);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user && isTimeoutEnabled) {
        const rawActivity = localStorage.getItem('sernic_last_activity') || sessionStorage.getItem('sernic_last_activity');
        const lastActivity = parseInt(rawActivity || '0', 10);
        if (lastActivity > 0 && Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
          triggerSessionExpired();
        } else {
          resetTimer();
        }
      }
    };

    if (user && isTimeoutEnabled) {
      resetTimer();
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('click', resetTimer);
      window.addEventListener('scroll', resetTimer);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, policies.sessionTimeoutMinutes, policies.sessionTimeout, policies.autoLogout]);

  return (
    <>
      {user ? (
        <Dashboard 
          user={user} 
          settings={settings} 
          updateSettings={updateSettings} 
          resetSettings={resetSettings} 
          onLogout={handleLogout}
          t={t}
          language={language}
          setLanguage={setLanguage}
        />
      ) : (
        <Login 
          key={loginSessionKey}
          settings={settings} 
          onLogin={handleLogin}
          updateSettings={updateSettings}
          t={t}
          language={language}
          setLanguage={setLanguage}
        />
      )}
      <SessionTimeoutModal 
        isOpen={alertModal.isOpen} 
        onConfirm={() => {
          setAlertModal({ isOpen: false, message: '' });
          // Logout executado APÓS o utilizador fechar o modal
          handleLogout();
        }}
      />
    </>
  );
}
