import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import useTranslation from './hooks/useTranslation';
import SessionTimeoutModal from './components/SessionTimeoutModal';

const DEFAULT_SETTINGS = {
  nome_instituicao: 'Serviço Nacional de Investigação Criminal',
  sigla: 'SERNIC',
  logotipo: null, // Nulo por padrão. Será exibido o logotipo padrão do sistema
  cor_principal: '#1B365D',
  cor_secundaria: '#2D3748',
  cor_destaque: '#FFFFFF',
  modo_tema: 'light',
  cores_aleatorias: false,
  data_atualizacao: new Date().toISOString(),
  usuario_responsavel: 'Sistema (Padrão)'
};

const CORES_PALETA = [
  '#1B365D', '#0D1B4B', '#1565C0', '#0277BD', '#1B5E20', '#00695C',
  '#33691E', '#B71C1C', '#C62828', '#880E4F', '#4A148C', '#6A1B9A',
  '#212121', '#37474F', '#BF360C', '#F57F17', '#004D40', '#01579B'
];

import { useAuth } from './contexts/AuthContext';
import useSecuritySettings from './hooks/useSecuritySettings';

export default function App() {
  const { user, login, logout, updateSessionActivity } = useAuth();
  const { policies } = useSecuritySettings();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const { t, language, setLanguage } = useTranslation();

  // Carregar configurações do localStorage ao iniciar (simulação de carregamento do DB)
  useEffect(() => {
    const saved = localStorage.getItem('sernic_identity_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Se a opção de cores aleatórias estiver ativa, sorteia uma cor ao iniciar/recarregar a página
        if (parsed.cores_aleatorias) {
          const randomCor = CORES_PALETA[Math.floor(Math.random() * CORES_PALETA.length)];
          parsed.cor_principal = randomCor;
          localStorage.setItem('sernic_identity_settings', JSON.stringify(parsed));
        }
        setSettings(parsed);
      } catch (e) {
        console.error("Erro ao carregar configurações salvas, usando padrão.", e);
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  // Aplicar cores e tema globalmente sempre que houver alteração
  useEffect(() => {
    // Injeção de variáveis CSS customizadas
    if (settings.modo_tema === 'dark') {
      const isDefaultDarkNavy = !settings.cor_principal || settings.cor_principal.toUpperCase() === '#1B365D';
      const primaryColor = isDefaultDarkNavy ? '#4F8DF7' : settings.cor_principal;
      document.documentElement.style.setProperty('--color-primary', primaryColor);
      document.documentElement.style.setProperty('--color-secondary', settings.cor_secundaria || '#3A4A66');
      document.documentElement.style.setProperty('--color-accent', settings.cor_destaque || '#FFFFFF');
    } else {
      document.documentElement.style.setProperty('--color-primary', settings.cor_principal);
      document.documentElement.style.setProperty('--color-secondary', settings.cor_secundaria);
      document.documentElement.style.setProperty('--color-accent', settings.cor_destaque);
    }
    
    // Injeção do modo de tema no html/root
    document.documentElement.setAttribute('data-theme', settings.modo_tema);
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

  const handleLogin = (userData) => {
    login(userData);
    
    // Forçar a vista inicial e menus colapsados no novo login
    localStorage.setItem('sernic_active_tab', 'home');
    localStorage.setItem('sernic_expanded_menu', '');
    localStorage.setItem('sernic_expanded_submenu', '');
  };

  const handleLogout = () => {
    logout();
  };

  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

  // Controlo de Inatividade e Expiração da Sessão
  useEffect(() => {
    const isTimeoutEnabled = policies.autoLogout !== false;
    const userTimeout = parseInt(policies.sessionTimeoutMinutes || policies.sessionTimeout || 15, 10);
    const INACTIVITY_LIMIT_MS = Math.max(userTimeout * 60 * 1000, 60000); // Mínimo de 1 minuto
    let inactivityTimer;
    let lastActivityTime = 0;

    const triggerSessionExpired = () => {
      // Mostrar alerta PRIMEIRO. O logout só ocorre quando o utilizador clica OK.
      // Isto evita o flash branco causado pelo desmonte abrupto do Dashboard.
      setAlertModal({ isOpen: true, message: 'Sessão expirada por inatividade. Por favor, faça login novamente.' });
    };

    const resetTimer = () => {
      const now = Date.now();
      // Evitar spam de writes na localStorage e reflows no navegador
      if (now - lastActivityTime > 5000) {
        if (user && isTimeoutEnabled) {
          updateSessionActivity();
          clearTimeout(inactivityTimer);
          inactivityTimer = setTimeout(triggerSessionExpired, INACTIVITY_LIMIT_MS);
        }
        lastActivityTime = now;
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user && isTimeoutEnabled) {
        const lastActivity = parseInt(localStorage.getItem('sernic_last_activity') || '0', 10);
        if (Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
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
