import React, { useState } from 'react';
import { SERNIC_LOGO_B64 } from '../utils/sernic_logo_default';
import useAuthData from '../hooks/useAuthData';
import useSecuritySettings from '../hooks/useSecuritySettings';
import useAuditLog from '../hooks/useAuditLog';
import { getBackgroundModel } from '../utils/backgroundModels';

/* ── Paleta VIP em Destaque (Cores Oficiais e Futuristas Curadas) ── */
export const TEMAS_VIP = [
  { nome: 'Carmesim SERNIC',   cor: '#B71C1C' },
  { nome: 'Rubi Tático',        cor: '#DC2626' },
  { nome: 'Azul Meia-Noite',   cor: '#0D1B4B' },
  { nome: 'Azul Safira',       cor: '#1E40AF' },
  { nome: 'Ciano Profundo',    cor: '#0891B2' },
  { nome: 'Verde Jade',        cor: '#059669' },
  { nome: 'Violeta Real',      cor: '#5B21B6' },
  { nome: 'Âmbar Soberano',    cor: '#D97706' },
  { nome: 'Titânio Escuro',    cor: '#1E293B' },
  { nome: 'Carvão Supremo',    cor: '#212121' },
];

/* ── Paleta Expandida Completa (46 Cores Nobres e Profissionais) ── */
export const TEMAS = [
  // Vermelhos & Carmins
  { nome: 'Vermelho Moçambique', cor: '#B71C1C' },
  { nome: 'Carmésim Oficial',    cor: '#DC2626' },
  { nome: 'Rubi Escarlate',      cor: '#C62828' },
  { nome: 'Bordô Profundo',      cor: '#880E4F' },
  { nome: 'Granada Nobre',       cor: '#991B1B' },
  { nome: 'Vinho Executivo',     cor: '#7F1D1D' },
  { nome: 'Cereja Escuro',       cor: '#9D174D' },

  // Azuis Institucionais & Forenses
  { nome: 'Azul Institucional',  cor: '#1B365D' },
  { nome: 'Azul Meia-Noite',     cor: '#0D1B4B' },
  { nome: 'Azul Real',           cor: '#1565C0' },
  { nome: 'Azul Aço',           cor: '#0277BD' },
  { nome: 'Azul Safira',         cor: '#1E40AF' },
  { nome: 'Azul Cobalto',        cor: '#1D4ED8' },
  { nome: 'Azul Oceano',         cor: '#0369A1' },

  // Cianos & Teals Tecnológicos
  { nome: 'Ciano Profundo',      cor: '#0891B2' },
  { nome: 'Teal Forense',        cor: '#0F766E' },
  { nome: 'Teal Profundo',       cor: '#004D40' },
  { nome: 'Turquesa Escuro',     cor: '#0E7490' },
  { nome: 'Azul Índigo',         cor: '#3730A3' },
  { nome: 'Índigo Cibernético',  cor: '#4338CA' },
  { nome: 'Marinho Escuro',      cor: '#0F172A' },

  // Verdes & Táticos
  { nome: 'Verde Institucional', cor: '#1B5E20' },
  { nome: 'Verde Esmeralda',     cor: '#00695C' },
  { nome: 'Verde Floresta',      cor: '#15803D' },
  { nome: 'Verde Jade',          cor: '#059669' },
  { nome: 'Verde Oliva',         cor: '#33691E' },
  { nome: 'Malaquita Forense',   cor: '#047857' },
  { nome: 'Musgo Tático',        cor: '#3F6212' },

  // Roxos & Violetas
  { nome: 'Roxo Imperial',       cor: '#4A148C' },
  { nome: 'Roxo Médio',         cor: '#6A1B9A' },
  { nome: 'Violeta Real',        cor: '#5B21B6' },
  { nome: 'Ametista Escura',     cor: '#701A75' },
  { nome: 'Púrpura Tática',      cor: '#6B21A8' },
  { nome: 'Ameixa Noturna',      cor: '#581C87' },
  { nome: 'Rosa Escuro Tático',  cor: '#BE185D' },

  // Âmbar, Dourados & Terracota
  { nome: 'Âmbar Soberano',      cor: '#D97706' },
  { nome: 'Castanho Dourado',    cor: '#F57F17' },
  { nome: 'Terracota Nobre',     cor: '#BF360C' },
  { nome: 'Bronze Tático',       cor: '#B45309' },
  { nome: 'Laranja Queimado',    cor: '#C2410C' },
  { nome: 'Cobre Escuro',        cor: '#78350F' },

  // Grafites & Carvão
  { nome: 'Carvão Supremo',      cor: '#212121' },
  { nome: 'Cinza Grafite',       cor: '#37474F' },
  { nome: 'Titânio Escuro',      cor: '#1E293B' },
  { nome: 'Ardósia Tática',      cor: '#334155' },
  { nome: 'Chumbo Operacional',   cor: '#1F2937' },
];

export default function Login({ settings, onLogin, updateSettings, t, language, setLanguage }) {
  const { authenticate, addUser } = useAuthData();
  const { policies } = useSecuritySettings();
  const { logAction } = useAuditLog();

  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [regName, setRegName]         = useState('');
  const [regEmail, setRegEmail]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [view, setView]               = useState('login'); // 'login' | 'register' | 'recover'
  const [hoveredTema, setHoveredTema] = useState(null);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLangMenu, setShowLangMenu]   = useState(false);
  const [showAllThemes, setShowAllThemes] = useState(false);
  // Sincronizar com settings globais
  const [bwMode, setBwMode] = useState(() => {
    return settings.modo_tema === 'dark' ? 'noite' : 'theme';
  });
  const themeMenuRef = React.useRef(null);
  const langMenuRef = React.useRef(null);

  React.useEffect(() => {
    if (settings.modo_tema === 'dark' && bwMode !== 'noite') {
      setBwMode('noite');
    } else if (settings.modo_tema === 'light' && bwMode === 'noite') {
      setBwMode('theme');
    }
  }, [settings.modo_tema]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setShowThemeMenu(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    // handled by useAuthData defaults
  }, []);

  // Ignorar o logotipo em cache temporariamente para forçar o transparente
  const logoSrc = SERNIC_LOGO_B64;

  const isDark = bwMode === 'noite' || settings.modo_tema === 'dark';

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  /* calcula a cor de fundo activa */
  const bgColor =
    bwMode === 'noite' ? '#1C2433' :
    bwMode === 'claro' ? '#F8FAFC' :
    (settings.cor_principal && settings.cor_principal !== '#1B365D' ? settings.cor_principal : '#B71C1C');

  /* Deteção de fundo claro (modo claro ou tema personalizado de alta luminosidade) */
  const isLightBg = () => {
    if (bwMode === 'claro') return true;
    if (bwMode === 'noite') return false;
    const hex = (bgColor || '').replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return yiq >= 160;
    }
    return false;
  };
  const lightActive = isLightBg();

  /* ciclo: theme → noite → claro → theme */
  const toggleBwMode = () => {
    const nextMode =
      bwMode === 'theme' ? 'noite' :
      bwMode === 'noite' ? 'claro' : 'theme';
    
    setBwMode(nextMode);

    if (updateSettings) {
      if (nextMode === 'noite') {
        updateSettings({ ...settings, modo_tema: 'dark', usuario_responsavel: 'Tema Login (Noite)' });
      } else if (nextMode === 'claro') {
        updateSettings({ ...settings, modo_tema: 'light', usuario_responsavel: 'Tema Login (Claro)' });
      }
    }
  };

  const passwordInputRef = React.useRef(null);

  const clearCredentials = () => {
    setUsername('');
    setPassword('');
    setRegName('');
    setRegEmail('');
    setShowPassword(false);
    setError('');
  };

  // Limpa campos apenas quando o utilizador alterna intencionalmente de vista (Login <-> Pedir Acesso <-> Recuperar)
  const prevViewRef = React.useRef(view);
  React.useEffect(() => {
    if (prevViewRef.current !== view) {
      clearCredentials();
      prevViewRef.current = view;
    }
  }, [view]);

  /* ── Autenticação e Registo ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t('msg_fill_all'));
      return;
    }
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    
    try {
      const result = await authenticate(username.trim(), password, policies);
      setIsLoading(false);
      
      if (result && result.success) {
        logAction('Login', 'Sistema', `Login com sucesso: ${username}`).catch(() => {});
        const userObj = result.user;
        clearCredentials();
        onLogin(userObj);
      } else {
        logAction('Login', 'Sistema', `Falha na autenticação: ${username}`).catch(() => {});
        setError(result?.error || t('msg_wrong_credentials'));
        // Preserva o username preenchido e limpa apenas a senha incorreta
        setPassword('');
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 50);
      }
    } catch (err) {
      setIsLoading(false);
      logAction('Login', 'Sistema', `Falha na autenticação: ${username}`).catch(() => {});
      setError(t('msg_wrong_credentials'));
      setPassword('');
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 50);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !regName.trim() || !regEmail.trim()) {
      setError(t('msg_fill_register'));
      return;
    }
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    
    try {
      const res = await addUser({ username, password, roleId: 'director', email: regEmail, name: regName, status: 'Ativo' });
      setIsLoading(false);
      if (res && !res.success) {
        setError(res.error || t('msg_user_exists'));
        return;
      }
      logAction('Registo', 'Utilizadores', `Novo utilizador registado na página de login: ${username}`);
      setSuccessMsg(t('msg_register_success'));
      clearCredentials();
      setView('login');
    } catch (err) {
      setIsLoading(false);
      setError(t('msg_user_exists'));
    }
  };

  const handleRecuperarSubmit = (e) => {
    e.preventDefault();
    if (!regEmail.trim()) {
      setError(t('msg_fill_email'));
      return;
    }
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMsg(t('msg_recover_sent'));
      clearCredentials();
      setView('login');
    }, 1000);
  };

  const aplicarTema = (cor) => {
    setBwMode('theme');
    if (updateSettings) {
      updateSettings({ 
        ...settings, 
        cor_principal: cor, 
        cores_aleatorias: false,
        usuario_responsavel: 'Selecção de Tema (Login)' 
      });
    }
  };

  const toggleCoresAleatorias = () => {
    const nextVal = !settings.cores_aleatorias;
    setBwMode('theme');
    const current = (settings.cor_principal || '').toUpperCase();
    const available = TEMAS.filter(t => t.cor.toUpperCase() !== current);
    const randomTema = nextVal ? (available[Math.floor(Math.random() * available.length)]?.cor || TEMAS[0].cor) : settings.cor_principal;
    if (updateSettings) {
      updateSettings({
        ...settings,
        cores_aleatorias: nextVal,
        cor_principal: randomTema,
        usuario_responsavel: 'Modo Cores Aleatórias 3s (Login)'
      });
    }
  };

  const selectedBgModel = getBackgroundModel(settings?.modelo_fundo);

  const pageBg = bwMode === 'noite'
    ? (selectedBgModel.isDark ? selectedBgModel.bgGradient : 'radial-gradient(ellipse 85% 65% at 50% 25%, #182333 0%, #0F1622 55%, #080D14 100%)')
    : bwMode === 'claro'
    ? 'radial-gradient(ellipse 90% 60% at 50% 12%, rgba(183, 28, 28, 0.08) 0%, transparent 70%), radial-gradient(circle at 15% 85%, rgba(27, 54, 93, 0.05) 0%, transparent 50%), linear-gradient(160deg, #FFFFFF 0%, #F1F5F9 55%, #E2E8F0 100%)'
    : (settings.cores_aleatorias
        ? `radial-gradient(ellipse 95% 75% at 50% 25%, ${settings.cor_principal} 0%, rgba(15, 23, 42, 0.95) 60%, #020617 100%)`
        : selectedBgModel.bgGradient);

  return (
    <div 
      className="login-page-root" 
      style={{ 
        ...s.page, 
        backgroundColor: bgColor, 
        background: pageBg,
        transition: 'background 1.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 1.2s ease' 
      }}
    >

      {/* ══════════════ MARCA DE ÁGUA OFICIAL NO FUNDO (SERNIC) ══════════════ */}
      <div className="landing-watermark-bg" aria-hidden="true">
        <img
          src="/logo-sernic-transparente.png"
          alt=""
          loading="eager"
          decoding="sync"
          className="landing-watermark-img"
          style={{ opacity: isDark ? 0.14 : 0.10 }}
        />
      </div>

      {/* ══════════════ MENU TOPO DIREITO (TEMAS + IDIOMA) ══════════════ */}
      <div style={s.topRightMenu}>

        {/* Seletor de Idioma */}
        <div style={{ position: 'relative' }} ref={langMenuRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="login-glass-btn"
            style={s.langBtn}
            title={t('language')}
          >
            <span style={{ fontSize: '13px' }}>🌐</span>
            <span>{language.toUpperCase()}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showLangMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          
          {showLangMenu && (
            <div className="login-glass-panel" style={s.langDropdown}>
              {['pt', 'en'].map(lang => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                  style={{
                    backgroundColor: language === lang ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: language === lang ? '#EF4444' : 'inherit',
                    border: 'none',
                    borderRadius: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontWeight: language === lang ? '800' : '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{lang === 'pt' ? 'Português' : 'English'}</span>
                  {language === lang && <span style={{ fontSize: '12px' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botão Modo Noite / Modo Claro */}
        <button
          onClick={toggleBwMode}
          className="login-glass-btn"
          title={
            bwMode === 'theme' ? t('themes_activate_night') :
            bwMode === 'noite' ? t('themes_activate_light') : t('themes_back_theme')
          }
          style={s.iconBtn}
        >
          {bwMode === 'noite' ? (
            /* ícone lua */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : bwMode === 'claro' ? (
            /* ícone sol */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            /* ícone meio círculo (tema dinâmico) */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2v20"/>
            </svg>
          )}
        </button>

        {/* Botão de Temas & Paleta */}
        <div style={{ position: 'relative' }} ref={themeMenuRef}>
          <button 
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="login-glass-btn"
            title={t('themes_title')}
            style={s.iconBtn}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
            </svg>
          </button>

          {/* Dropdown de Temas — Modo Frosted Glass Futurista e Limpo */}
          {showThemeMenu && (
            <div className="login-glass-panel" style={s.themeDropdown}>
              {/* Cabeçalho do Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ fontSize: '15px' }}>🎨</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    color: bwMode === 'claro' ? '#0F172A' : '#F8FAFC'
                  }}>
                    {t('themes_title') || 'Tema & Cores'}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowThemeMenu(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: bwMode === 'claro' ? '#64748B' : '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '15px',
                    padding: '2px 4px',
                    lineHeight: 1
                  }}
                  title="Fechar"
                >
                  ✕
                </button>
              </div>

              {/* Rótulo da Paleta Principal */}
              <p style={{
                ...s.dropdownTitle,
                color: bwMode === 'claro' ? '#475569' : '#94A3B8'
              }}>
                Cores em Destaque
              </p>

              {/* Grelha VIP Curada (Sem poluição visual: 10 cores perfeitamente espaçadas) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', justifyItems: 'center', marginBottom: '8px' }}>
                {TEMAS_VIP.map((tema) => {
                  const isActive = settings.cor_principal === tema.cor;
                  return (
                    <button
                      key={tema.cor}
                      type="button"
                      title={tema.nome}
                      className={`swatch-vip ${isActive ? 'active' : ''}`}
                      onClick={() => aplicarTema(tema.cor)}
                      onMouseEnter={() => setHoveredTema(tema.cor)}
                      onMouseLeave={() => setHoveredTema(null)}
                      style={{ backgroundColor: tema.cor }}
                    />
                  );
                })}
              </div>

              {/* Indicador e Nome da Cor Activa / Hover */}
              <div style={{
                ...s.temaTooltip,
                color: bwMode === 'claro' ? '#0F172A' : '#F8FAFC'
              }}>
                {hoveredTema 
                  ? TEMAS.find(t => t.cor === hoveredTema)?.nome 
                  : `Tom Ativo: ${TEMAS.find(t => t.cor === settings.cor_principal)?.nome || 'Personalizado'}`}
              </div>

              {/* Botão de Expansão para Todas as 46 Cores */}
              <button
                type="button"
                onClick={() => setShowAllThemes(!showAllThemes)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  backgroundColor: bwMode === 'claro' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                  border: bwMode === 'claro' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: bwMode === 'claro' ? '#334155' : '#CBD5E1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  marginTop: '6px',
                  marginBottom: '10px'
                }}
              >
                <span>{showAllThemes ? '▲' : '▼'}</span>
                <span>{showAllThemes ? 'Ocultar Catálogo Expandido' : 'Ver Todos os 46 Tons Futuristas'}</span>
              </button>

              {/* Catálogo Expandido (Apenas se o utilizador quiser explorar) */}
              {showAllThemes && (
                <div style={{
                  ...s.temaSwatches,
                  marginBottom: '10px',
                  border: bwMode === 'claro' ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '10px 8px',
                  backgroundColor: bwMode === 'claro' ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.25)'
                }}>
                  {TEMAS.map((tema) => {
                    const isActive = settings.cor_principal === tema.cor;
                    const isHover  = hoveredTema === tema.cor;
                    return (
                      <button
                        key={tema.cor}
                        type="button"
                        title={tema.nome}
                        onClick={() => aplicarTema(tema.cor)}
                        onMouseEnter={() => setHoveredTema(tema.cor)}
                        onMouseLeave={() => setHoveredTema(null)}
                        style={{
                          ...s.temaSwatch,
                          backgroundColor: tema.cor,
                          transform: isActive || isHover ? 'scale(1.2)' : 'scale(1)',
                          outline: isActive ? '2px solid #FFFFFF' : 'none',
                          outlineOffset: '2px',
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Separador */}
              <div style={{
                ...s.dropdownDivider,
                backgroundColor: bwMode === 'claro' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'
              }} />

              {/* Linha de Cor Personalizada */}
              <div style={{
                ...s.colorPickerRow,
                backgroundColor: bwMode === 'claro' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                border: bwMode === 'claro' ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)'
              }}>
                <label 
                  htmlFor="custom-color-picker" 
                  style={{
                    ...s.colorPickerLabel,
                    color: bwMode === 'claro' ? '#0F172A' : '#F8FAFC'
                  }}
                >
                  <span style={{ fontSize: '14px' }}>✨</span>
                  <span>{t('themes_pick') || 'Tom Personalizado'}</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: '700',
                    color: bwMode === 'claro' ? '#64748B' : '#94A3B8'
                  }}>
                    {settings.cor_principal?.toUpperCase() || '#BA1B1D'}
                  </span>
                  <input
                    type="color"
                    id="custom-color-picker"
                    defaultValue={settings.cor_principal}
                    onChange={(e) => aplicarTema(e.target.value)}
                    style={s.colorPicker}
                    title={t('themes_pick')}
                  />
                </div>
              </div>

              {/* Separador */}
              <div style={{
                ...s.dropdownDivider,
                backgroundColor: bwMode === 'claro' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'
              }} />

              {/* Card de Cores Aleatórias (Ciclo a cada 3s) */}
              <div
                onClick={toggleCoresAleatorias}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: settings.cores_aleatorias
                    ? (bwMode === 'claro' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.14)')
                    : (bwMode === 'claro' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)'),
                  border: settings.cores_aleatorias
                    ? '1px solid rgba(16, 185, 129, 0.35)'
                    : (bwMode === 'claro' ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)'),
                  borderRadius: '12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.25s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <span style={{ fontSize: '16px' }}>⚡</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: bwMode === 'claro' ? '#0F172A' : '#F8FAFC',
                      letterSpacing: '0.2px'
                    }}>
                      Ciclo Quântico de Cores
                    </span>
                    <span style={{ 
                      fontSize: '9.5px', 
                      fontWeight: '700', 
                      color: settings.cores_aleatorias ? '#10B981' : (bwMode === 'claro' ? '#64748B' : '#94A3B8'), 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px',
                      marginTop: '2px'
                    }}>
                      {settings.cores_aleatorias ? (
                        <>
                          <span className="pulse-dot-green"></span>
                          A MUDAR CADA 3 SEGUNDOS
                        </>
                      ) : (
                        'Alternar cores a cada 3s'
                      )}
                    </span>
                  </div>
                </div>

                {/* Switch estilo toggle moderno */}
                <div style={{
                  width: '34px',
                  height: '20px',
                  backgroundColor: settings.cores_aleatorias ? '#10B981' : (bwMode === 'claro' ? '#CBD5E1' : '#475569'),
                  borderRadius: '12px',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: settings.cores_aleatorias ? '16px' : '2px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.35)'
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ CABEÇALHO INSTITUCIONAL ELEGANTE E MINIMALISTA ══════════════ */}
      <div style={s.header}>
        <div style={s.logoContainer}>
          <img src={logoSrc} alt="Logótipo SERNIC" style={s.logo} />
        </div>
        <h1 style={{
          ...s.instNome,
          color: lightActive ? '#0F172A' : '#FFFFFF',
          textShadow: lightActive ? '0 1px 2px rgba(255,255,255,0.8)' : '0 2px 8px rgba(0,0,0,0.6)'
        }}>
          SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL
        </h1>
        <div style={{
          ...s.sysTitleBold,
          color: lightActive ? '#1E293B' : '#F1F5F9',
          textShadow: lightActive ? '0 1px 2px rgba(255,255,255,0.8)' : '0 2px 6px rgba(0,0,0,0.5)'
        }}>
          DIRECÇÃO GERAL
        </div>
        <div style={{
          ...s.sysTitleBold,
          color: lightActive ? '#1E293B' : '#F1F5F9',
          textShadow: lightActive ? '0 1px 2px rgba(255,255,255,0.8)' : '0 2px 6px rgba(0,0,0,0.5)'
        }}>
          DIRECÇÃO DE RECURSOS HUMANOS
        </div>
        <div style={{ marginTop: '8px', marginBottom: '14px' }}>
          <p style={{
            ...s.sysTitleSub,
            color: lightActive ? '#334155' : 'rgba(255,255,255,0.92)',
            textShadow: lightActive ? 'none' : '0 1px 4px rgba(0,0,0,0.5)'
          }}>
            SISTEMA DE INFORMAÇÃO E GESTÃO DE RECURSOS HUMANOS
          </p>
        </div>
      </div>

      {/* ══════════════ CARD DE LOGIN / REGISTO / RECUPERAR (MODO VIDRO) ══════════════ */}
      <div className="login-card login-card-glass" style={{...s.card, marginTop: '4px'}}>
        {successMsg && <p style={{...s.errorMsg, backgroundColor: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0'}}>{successMsg}</p>}
        {error && <p style={s.errorMsg}>{error}</p>}

        {view === 'login' && (
          <>
            <h2 style={s.cardTitle}>Entrar</h2>
            <form onSubmit={handleSubmit} style={s.form} autoComplete="off">
              {/* Armadilhas ocultas para impedir preenchimento automático indesejado pelo navegador */}
              <input type="text" name="fake_user_prevent" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_pass_prevent" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                <input 
                  type="text" 
                  name="username"
                  autoComplete="off" 
                  autoCorrect="off" 
                  autoCapitalize="off" 
                  spellCheck="false"
                  placeholder={t('login_username_placeholder') || 'Nome de Utilizador / NUIT'} 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  style={s.field} 
                />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input 
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'} 
                  name="password"
                  autoComplete="new-password"
                  placeholder={t('login_password_placeholder') || 'Palavra-passe'} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  style={s.field} 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.eyeBtn} tabIndex={-1}>
                  {showPassword ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
              <button 
                type="submit" 
                style={{
                  ...s.btnPrimary, 
                  backgroundColor: isLoading ? '#CE6767' : '#C0262B',
                  boxShadow: '0 4px 14px rgba(192, 38, 43, 0.35)',
                  marginTop: '6px'
                }} 
                disabled={isLoading}
              >
                {isLoading ? (t('login_submit_loading') || 'A ENTRAR...') : (t('login_submit') || 'ENTRAR')}
              </button>
              <button 
                type="submit" 
                style={{
                  ...s.btnPrimary, 
                  backgroundColor: isLoading ? '#CE6767' : '#C0262B',
                  boxShadow: '0 4px 16px rgba(192, 38, 43, 0.4)',
                  marginTop: '8px'
                }} 
                disabled={isLoading}
              >
                {isLoading ? (t('login_submit_loading') || 'A ENTRAR...') : (t('login_submit') || 'ENTRAR')}
              </button>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => { clearCredentials(); setView('recover'); }}
                  style={s.btnGlassSecondary}
                >
                  {t('login_forgot') || 'ESQUECEU A SENHA?'}
                </button>
                <button
                  type="button"
                  onClick={() => { clearCredentials(); setView('register'); }}
                  style={s.btnGlassSecondary}
                >
                  {t('login_request_access') || 'SOLICITAR ACESSO'}
                </button>
              </div>
            </form>
          </>
        )}

        {view === 'register' && (
          <>
            <h2 style={s.cardTitle}>{t('register_title')}</h2>
            <form onSubmit={handleRegister} style={s.form} autoComplete="off">
              <input type="text" name="fake_user_prevent2" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_pass_prevent2" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                <input type="text" name="regName" autoComplete="off" placeholder={t('register_name_placeholder')} value={regName} onChange={e => setRegName(e.target.value)} style={s.field} />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input type="text" name="username" autoComplete="off" placeholder={t('login_username_placeholder')} value={username} onChange={e => setUsername(e.target.value)} style={s.field} />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                <input type="email" name="email" autoComplete="off" placeholder={t('register_email_placeholder')} value={regEmail} onChange={e => setRegEmail(e.target.value)} style={s.field} />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input type="password" name="password" autoComplete="new-password" placeholder={t('register_password_placeholder')} value={password} onChange={e => setPassword(e.target.value)} style={s.field} />
              </div>
              <button type="submit" style={{...s.btnPrimary, opacity: isLoading ? 0.7 : 1}} disabled={isLoading}>
                {isLoading ? t('register_submit_loading') : t('register_submit')}
              </button>
              <button type="button" onClick={() => { clearCredentials(); setView('login'); }} style={s.btnSecondary}>{t('register_back')}</button>
            </form>
          </>
        )}

        {view === 'recover' && (
          <>
            <h2 style={s.cardTitle}>{t('recover_title')}</h2>
            <form onSubmit={handleRecuperarSubmit} style={s.form} autoComplete="off">
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                <input type="email" name="email" autoComplete="off" placeholder={t('register_email_placeholder')} value={regEmail} onChange={e => setRegEmail(e.target.value)} style={s.field} />
              </div>
              <button type="submit" style={{...s.btnPrimary, opacity: isLoading ? 0.7 : 1}} disabled={isLoading}>
                {isLoading ? t('recover_submit_loading') : t('recover_submit')}
              </button>
              <button type="button" onClick={() => { clearCredentials(); setView('login'); }} style={s.btnSecondary}>{t('recover_back')}</button>
            </form>
          </>
        )}
      </div>

      {/* ══════════════ RODAPÉ ══════════════ */}
      <footer style={{
        ...s.footer,
        color: lightActive ? '#334155' : 'rgba(255,255,255,0.85)',
        fontSize: '11.5px',
        marginTop: '26px',
        fontWeight: lightActive ? '600' : '400'
      }}>
        <p>Copyright © 2026 – Serviço Nacional de Investigação Criminal (SERNIC). Todos os direitos reservados. | Versão: 05.01.00</p>
      </footer>
    </div>
  );
}

/* ════════════════ ESTILOS ════════════════ */
const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '30px 16px 20px',
    transition: 'background-color 0.35s ease',
    fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative',
    overflowY: 'auto',
    overflowX: 'hidden',
  },

  /* ── Cabeçalho ── */
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '0',
    textAlign: 'center',
    position: 'relative',
    zIndex: 2,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  },
  logo: {
    width: '140px',
    height: '140px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.3))',
    transition: 'transform 0.25s ease',
  },
  instNome: {
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: '800',
    letterSpacing: '0.8px',
    textAlign: 'center',
    lineHeight: '1.35',
    margin: '0 0 3px',
    textShadow: '0 1px 4px rgba(0,0,0,0.35)',
  },
  sysTitleBold: {
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '800',
    letterSpacing: '0.8px',
    margin: '2px 0',
    textShadow: '0 1px 3px rgba(0,0,0,0.35)',
  },
  sysTitleSub: {
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.6px',
    margin: 0,
    textShadow: '0 1px 3px rgba(0,0,0,0.35)',
  },

  /* ── Card (Modo Vidro) ── */
  card: {
    width: '100%',
    maxWidth: '430px',
    borderRadius: '24px',
    padding: '34px 30px 28px',
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 2,
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'inherit',
    textAlign: 'center',
    margin: '0 0 20px',
    letterSpacing: '-0.2px'
  },
  errorMsg: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: '#DC2626',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '14px',
    textAlign: 'center',
    border: '1px solid rgba(239, 68, 68, 0.25)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },

  /* ── Campos Translúcidos Glass ── */
  fieldWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg-subtle)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  fieldIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '42px',
    color: 'var(--color-text-light)',
    flexShrink: 0,
  },
  field: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    padding: '13px 8px',
    fontSize: '14px',
    color: 'var(--color-text-base)',
    outline: 'none',
    fontWeight: '500',
  },
  fieldIconRight: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    flexShrink: 0,
  },
  eyeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '100%',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    flexShrink: 0,
    padding: '0',
  },

  /* ── Botões ── */
  btnPrimary: {
    width: '100%',
    padding: '13.5px',
    background: 'linear-gradient(135deg, #C0262B 0%, #991B1B 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    fontSize: '13.5px',
    fontWeight: '700',
    letterSpacing: '0.8px',
    cursor: 'pointer',
    marginTop: '6px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(192, 38, 43, 0.4)',
  },
  btnGlassSecondary: {
    flex: 1,
    padding: '10.5px 6px',
    backgroundColor: 'var(--color-bg-subtle)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: 'var(--color-text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.4px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
  },
  btnSecondary: {
    width: '100%',
    padding: '13px',
    backgroundColor: 'var(--color-bg-subtle)',
    color: 'var(--color-text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    fontSize: '13.5px',
    fontWeight: '600',
    letterSpacing: '0.8px',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'all 0.2s ease',
  },

  /* ── Dropdown de Temas & Menu Topo ── */
  topRightMenu: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    zIndex: 20,
  },
  iconBtn: {
    borderRadius: '12px',
    width: '42px',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
  },
  themeDropdown: {
    position: 'absolute',
    top: '52px',
    right: '0',
    padding: '18px 18px 16px',
    width: '320px',
    zIndex: 25,
  },
  dropdownTitle: {
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    margin: '0 0 10px',
  },
  dropdownDivider: {
    height: '1px',
    margin: '12px 0',
  },
  temaSwatches: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
    maxHeight: '170px',
    overflowY: 'auto',
    padding: '4px 2px',
  },
  temaSwatch: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.22)',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, outline 0.15s ease',
    padding: 0,
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  },
  temaTooltip: {
    fontSize: '11.5px',
    fontWeight: '700',
    margin: '8px 0 0',
    textAlign: 'center',
    minHeight: '16px',
    letterSpacing: '0.2px',
  },
  colorPickerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '12px',
    marginTop: '4px',
  },
  colorPicker: {
    width: '30px',
    height: '30px',
    border: 'none',
    borderRadius: '50%',
    padding: '0',
    cursor: 'pointer',
    background: 'none',
    flexShrink: 0,
  },
  colorPickerLabel: {
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  /* ── Seletor de Idioma ── */
  langDropdown: {
    position: 'absolute',
    top: '52px',
    right: '0',
    padding: '8px',
    zIndex: 25,
    minWidth: '90px',
  },
  langBtn: {
    fontSize: '12.5px',
    cursor: 'pointer',
    padding: '7px 14px',
    borderRadius: '12px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    letterSpacing: '0.6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '700',
  },

  /* ── Rodapé ── */
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: '1.6',
  },
};
