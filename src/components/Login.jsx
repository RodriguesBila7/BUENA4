import React, { useState } from 'react';
import { SERNIC_LOGO_B64 } from '../utils/sernic_logo_default';
import useAuthData from '../hooks/useAuthData';
import useSecuritySettings from '../hooks/useSecuritySettings';
import useAuditLog from '../hooks/useAuditLog';

/* ── Temas pré-definidos ── */
const TEMAS = [
  { nome: 'Azul Institucional', cor: '#1B365D' },
  { nome: 'Azul Escuro',        cor: '#0D1B4B' },
  { nome: 'Azul Real',          cor: '#1565C0' },
  { nome: 'Azul Aço',          cor: '#0277BD' },
  { nome: 'Verde Institucional', cor: '#1B5E20' },
  { nome: 'Verde Esmeralda',    cor: '#00695C' },
  { nome: 'Verde Oliva',        cor: '#33691E' },
  { nome: 'Vermelho Moçambique', cor: '#B71C1C' },
  { nome: 'Carmésim',          cor: '#C62828' },
  { nome: 'Bordô',             cor: '#880E4F' },
  { nome: 'Roxo Imperial',      cor: '#4A148C' },
  { nome: 'Roxo Médio',        cor: '#6A1B9A' },
  { nome: 'Carvão',            cor: '#212121' },
  { nome: 'Cinza Escuro',       cor: '#37474F' },
  { nome: 'Laranja Escuro',     cor: '#BF360C' },
  { nome: 'Castaño Dourado',   cor: '#F57F17' },
  { nome: 'Teal Profundo',      cor: '#004D40' },
  { nome: 'Azul Meia-Noite',    cor: '#01579B' },
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
  const [showLangMenu, setShowLangMenu] = useState(false);
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
    (settings.cor_principal || '#1C2433');

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
      const result = await authenticate(username, password, policies);
      setIsLoading(false);
      
      if (result && result.success) {
        logAction('Login', 'Sistema', `Login com sucesso: ${username}`);
        onLogin(result.user);
      } else {
        logAction('Login', 'Sistema', `Falha na autenticação: ${username}`);
        setError(result?.error || t('msg_wrong_credentials'));
      }
    } catch (err) {
      setIsLoading(false);
      logAction('Login', 'Sistema', `Falha na autenticação: ${username}`);
      setError(t('msg_wrong_credentials'));
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
      setView('login');
      setPassword('');
      setRegName('');
      setRegEmail('');
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
      setView('login');
      setRegEmail('');
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
    const randomTema = nextVal ? TEMAS[Math.floor(Math.random() * TEMAS.length)].cor : settings.cor_principal;
    if (updateSettings) {
      updateSettings({
        ...settings,
        cores_aleatorias: nextVal,
        cor_principal: randomTema,
        usuario_responsavel: 'Modo Cores Aleatórias (Login)'
      });
    }
  };

  return (
    <div style={{ ...s.page, backgroundColor: bgColor, transition: 'background-color 0.35s ease' }}>

      {/* ══════════════ MENU TOPO DIREITO (TEMAS + IDIOMA) ══════════════ */}
      <div style={s.topRightMenu}>

        {/* Seletor de Idioma */}
        <div style={{ position: 'relative' }} ref={langMenuRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            style={{
              ...s.langBtn,
              backgroundColor: bwMode === 'claro' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)',
              color: bwMode === 'claro' ? '#1B365D' : '#FFFFFF',
              border: bwMode === 'claro' ? '1px solid rgba(0,0,0,0.15)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: 1,
              fontWeight: '700'
            }}
            title={t('language')}
          >
            {language.toUpperCase()}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          
          {showLangMenu && (
            <div style={{
              ...s.langDropdown,
              backgroundColor: bwMode === 'claro' ? '#FFFFFF' : 'rgba(15, 23, 42, 0.95)',
              border: bwMode === 'claro' ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
            }}>
              {['pt', 'en'].filter(l => l !== language).map(lang => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                  style={{
                    ...s.langBtn,
                    backgroundColor: 'transparent',
                    color: bwMode === 'claro' ? '#1B365D' : '#FFFFFF',
                    opacity: 0.95,
                    width: '100%',
                    textAlign: 'left',
                    marginTop: '2px',
                    fontWeight: '700'
                  }}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botão Modo Noite / Modo Claro */}
        <button
          onClick={toggleBwMode}
          title={
            bwMode === 'theme' ? t('themes_activate_night') :
            bwMode === 'noite' ? t('themes_activate_light') : t('themes_back_theme')
          }
          style={{
            ...s.iconBtn,
            backgroundColor:
              bwMode === 'noite' ? 'rgba(255,255,255,0.18)' :
              bwMode === 'claro' ? 'rgba(0,0,0,0.08)' :
              'rgba(255,255,255,0.2)',
            color:
              bwMode === 'claro' ? '#1B365D' : '#FFFFFF',
            border: bwMode === 'claro' ? '1px solid rgba(0,0,0,0.15)' : 'none',
          }}
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
            /* ícone meio círculo (tema padrão) */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2v20"/>
            </svg>
          )}
        </button>

        {/* Botão de Temas */}
        <div style={{ position: 'relative' }} ref={themeMenuRef}>
          <button 
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title={t('themes_title')}
            style={{
              ...s.iconBtn,
              backgroundColor: bwMode === 'claro' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.2)',
              color: bwMode === 'claro' ? '#1B365D' : '#FFFFFF',
              border: bwMode === 'claro' ? '1px solid rgba(0,0,0,0.15)' : 'none',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
            </svg>
          </button>

          {/* Dropdown de Temas */}
          {showThemeMenu && (
            <div style={s.themeDropdown}>
              <p style={s.dropdownTitle}>{t('themes_predefined')}</p>
              <div style={s.temaSwatches}>
                {TEMAS.map((tema) => {
                  const isActive = settings.cor_principal === tema.cor;
                  const isHover  = hoveredTema === tema.cor;
                  return (
                    <button
                      key={tema.cor}
                      type="button"
                      title={tema.nome}
                      onClick={() => { aplicarTema(tema.cor); setShowThemeMenu(false); }}
                      onMouseEnter={() => setHoveredTema(tema.cor)}
                      onMouseLeave={() => setHoveredTema(null)}
                      style={{
                        ...s.temaSwatch,
                        backgroundColor: tema.cor,
                        transform: isActive || isHover ? 'scale(1.3)' : 'scale(1)',
                        outline: isActive ? '2px solid #333' : isHover ? '2px solid rgba(0,0,0,0.4)' : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  );
                })}
              </div>
              {hoveredTema && (
                <p style={s.temaTooltip}>
                  {TEMAS.find(t => t.cor === hoveredTema)?.nome}
                </p>
              )}
              {/* Separador + Color Picker personalizado */}
              <div style={s.dropdownDivider} />
              <p style={s.dropdownTitle}>{t('themes_custom')}</p>
              <div style={s.colorPickerRow}>
                <input
                  type="color"
                  id="custom-color-picker"
                  defaultValue={settings.cor_principal}
                  onChange={(e) => aplicarTema(e.target.value)}
                  style={s.colorPicker}
                  title={t('themes_pick')}
                />
                <label htmlFor="custom-color-picker" style={s.colorPickerLabel}>
                  {t('themes_pick')}
                </label>
              </div>

              {/* Separador + Opção de Cores Aleatórias ao Entrar / Refresh */}
              <div style={s.dropdownDivider} />
              <div
                onClick={toggleCoresAleatorias}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 2px 2px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px' }}>🎲</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: bwMode === 'claro' ? '#2c3e50' : 'var(--color-text-base, #F8FAFC)',
                    letterSpacing: '0.2px'
                  }}>
                    {t('themes_random_mode') || 'Cores Aleatórias'}
                  </span>
                </div>

                {/* Switch estilo toggle moderno */}
                <div style={{
                  width: '32px',
                  height: '18px',
                  backgroundColor: settings.cores_aleatorias ? 'var(--color-primary, #EF4444)' : (bwMode === 'claro' ? '#CBD5E1' : '#475569'),
                  borderRadius: '10px',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: settings.cores_aleatorias ? '16px' : '2px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.35)'
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ CABEÇALHO INSTITUCIONAL ══════════════ */}
      <div style={s.header}>
        <img src={logoSrc} alt="Logótipo SERNIC" style={s.logo} />
        <p style={{...s.instNome, color: bwMode === 'claro' ? '#2c3e50' : '#FFFFFF', textShadow: bwMode === 'claro' ? 'none' : s.instNome.textShadow, margin: '0 0 2px'}}>SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL</p>
        <p style={{...s.instNome, fontSize: '13px', fontWeight: '800', letterSpacing: '1px', color: bwMode === 'claro' ? '#2c3e50' : '#FFFFFF', textShadow: bwMode === 'claro' ? 'none' : s.instNome.textShadow, margin: '0 0 4px'}}>{t('login_dg') || 'DIRECÇÃO GERAL'}</p>
        <p style={{...s.sysTitleBold, color: bwMode === 'claro' ? '#1a252f' : '#FFFFFF', textShadow: bwMode === 'claro' ? 'none' : s.sysTitleBold.textShadow, margin: '0 0 0'}}>{t('login_drh') || 'DIRECÇÃO DE RECURSOS HUMANOS'}</p>
        
        {/* Espaçamento de 1.5cm antes do Sistema e aproximação ao quadro de login */}
        <p style={{
          ...s.sysTitleLine, 
          fontSize: '14px',
          fontWeight: '700',
          letterSpacing: '0.8px',
          color: bwMode === 'claro' ? '#2c3e50' : '#FFFFFF', 
          textShadow: bwMode === 'claro' ? 'none' : s.sysTitleLine.textShadow,
          marginTop: '1.5cm',
          marginBottom: '0'
        }}>
          {t('login_system') || 'SISTEMA DE INFORMAÇÃO E GESTÃO DE RECURSOS HUMANOS'}
        </p>
      </div>

      {/* ══════════════ CARD DE LOGIN / REGISTO / RECUPERAR (Aproximado ao texto acima) ══════════════ */}
      <div style={{...s.card, marginTop: '14px'}}>
        {successMsg && <p style={{...s.errorMsg, backgroundColor: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0'}}>{successMsg}</p>}
        {error && <p style={s.errorMsg}>{error}</p>}

        {view === 'login' && (
          <>
            <h2 style={s.cardTitle}>{t('login_title')}</h2>
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                <input type="text" placeholder={t('login_username_placeholder')} value={username} onChange={e => setUsername(e.target.value)} style={s.field} />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input type={showPassword ? 'text' : 'password'} placeholder={t('login_password_placeholder')} value={password} onChange={e => setPassword(e.target.value)} style={s.field} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.eyeBtn} tabIndex={-1}>
                  {showPassword ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
              <button type="submit" style={{...s.btnPrimary, opacity: isLoading ? 0.7 : 1}} disabled={isLoading}>
                {isLoading ? t('login_submit_loading') : t('login_submit')}
              </button>
              <button
                type="button"
                onClick={() => { setView('recover'); setError(''); setSuccessMsg(''); }}
                style={{ ...s.btnPrimary, marginTop: '12px', textTransform: 'uppercase' }}
              >
                {t('login_forgot')}
              </button>
              <button
                type="button"
                onClick={() => { setView('register'); setError(''); setSuccessMsg(''); }}
                style={{ ...s.btnPrimary, marginTop: '12px', textTransform: 'uppercase' }}
              >
                {t('login_request_access')}
              </button>
            </form>
          </>
        )}

        {view === 'register' && (
          <>
            <h2 style={s.cardTitle}>{t('register_title')}</h2>
            <form onSubmit={handleRegister} style={s.form}>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                <input type="text" placeholder={t('register_name_placeholder')} value={regName} onChange={e => setRegName(e.target.value)} style={s.field} />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input type="text" placeholder={t('login_username_placeholder')} value={username} onChange={e => setUsername(e.target.value)} style={s.field} />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                <input type="email" placeholder={t('register_email_placeholder')} value={regEmail} onChange={e => setRegEmail(e.target.value)} style={s.field} />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input type="password" placeholder={t('register_password_placeholder')} value={password} onChange={e => setPassword(e.target.value)} style={s.field} />
              </div>
              <button type="submit" style={{...s.btnPrimary, opacity: isLoading ? 0.7 : 1}} disabled={isLoading}>
                {isLoading ? t('register_submit_loading') : t('register_submit')}
              </button>
              <button type="button" onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }} style={s.btnSecondary}>{t('register_back')}</button>
            </form>
          </>
        )}

        {view === 'recover' && (
          <>
            <h2 style={s.cardTitle}>{t('recover_title')}</h2>
            <form onSubmit={handleRecuperarSubmit} style={s.form}>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                <input type="email" placeholder={t('register_email_placeholder')} value={regEmail} onChange={e => setRegEmail(e.target.value)} style={s.field} />
              </div>
              <button type="submit" style={{...s.btnPrimary, opacity: isLoading ? 0.7 : 1}} disabled={isLoading}>
                {isLoading ? t('recover_submit_loading') : t('recover_submit')}
              </button>
              <button type="button" onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }} style={s.btnSecondary}>{t('recover_back')}</button>
            </form>
          </>
        )}
      </div>

      {/* ══════════════ RODÁPÉ ══════════════ */}
      <footer style={{...s.footer, color: bwMode === 'claro' ? '#7f8c8d' : 'rgba(255,255,255,0.7)'}}>
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
    padding: '36px 16px 20px',
    transition: 'background-color 0.35s ease',
    fontFamily: "'Inter', system-ui, sans-serif",
  },

  /* ── Cabeçalho ── */
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '0',
    textAlign: 'center',
  },
  logo: {
    width: '150px',
    height: '150px',
    objectFit: 'contain',
    marginBottom: '12px',
    filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.35))',
  },
  instNome: {
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '800',
    letterSpacing: '0.8px',
    textAlign: 'center',
    lineHeight: '1.5',
    margin: '0 0 6px',
    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
  sysTitleLine: {
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '0.8px',
    margin: '0',
    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
    opacity: 0.95,
  },
  sysTitleBold: {
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: '800',
    letterSpacing: '1.2px',
    margin: '4px 0 2px',
    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  sysTitleSub: {
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    margin: 0,
    opacity: 0.85,
    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },

  /* ── Card ── */
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'var(--color-bg-card, #243044)',
    border: '1px solid var(--color-border, #3A4A66)',
    borderRadius: '16px',
    padding: '34px 30px calc(26px + 1.6cm)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
    boxSizing: 'border-box'
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--color-text-base, #F8FAFC)',
    textAlign: 'center',
    margin: '0 0 22px',
    letterSpacing: '-0.3px'
  },
  errorMsg: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#EF4444',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '14px',
    textAlign: 'center',
    borderLeft: '4px solid #EF4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },

  /* ── Campos ── */
  fieldWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--color-border, #3A4A66)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-bg-base, #1C2433)',
    overflow: 'hidden',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  fieldIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    color: 'var(--color-text-muted, #A8B7CD)',
    flexShrink: 0,
  },
  field: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    padding: '13px 8px',
    fontSize: '14px',
    color: 'var(--color-text-base, #F8FAFC)',
    outline: 'none',
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
    padding: '13px',
    backgroundColor: 'var(--color-primary, #DC2626)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '1px',
    cursor: 'pointer',
    marginTop: '6px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
  },
  btnSecondary: {
    width: '100%',
    padding: '13px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-base, #F8FAFC)',
    border: '1px solid var(--color-border, #3A4A66)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '1px',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'all 0.2s ease',
  },

  /* ── Dropdown de Temas ── */
  topRightMenu: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  iconBtn: {
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backdropFilter: 'blur(6px)',
  },
  themeDropdown: {
    position: 'absolute',
    top: '50px',
    right: '0',
    backgroundColor: 'var(--color-bg-card, #243044)',
    border: '1px solid var(--color-border, #3A4A66)',
    borderRadius: '12px',
    padding: '18px 16px 14px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
    width: '252px',
    zIndex: 10,
    color: 'var(--color-text-base, #F8FAFC)'
  },
  dropdownTitle: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--color-text-muted, #A8B7CD)',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    margin: '0 0 10px',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: 'var(--color-border, #3A4A66)',
    margin: '12px 0',
  },
  temaSwatches: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  temaSwatch: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '1px solid rgba(0,0,0,0.12)',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, outline 0.15s ease',
    padding: 0,
    boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
  },
  temaTooltip: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#555',
    margin: '8px 0 0',
    textAlign: 'center',
    minHeight: '16px',
  },
  colorPickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '2px',
  },
  colorPicker: {
    width: '38px',
    height: '38px',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '2px',
    cursor: 'pointer',
    background: 'none',
    flexShrink: 0,
  },
  colorPickerLabel: {
    fontSize: '13px',
    color: '#555',
    cursor: 'pointer',
    fontWeight: '500',
  },

  /* ── Seletor de Idioma ── */
  langDropdown: {
    position: 'absolute',
    top: '36px',
    right: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '8px',
    padding: '8px',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 10,
    minWidth: '60px',
  },
  langBtn: {
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'none',
    color: '#FFFFFF',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '20px',
    transition: 'all 0.2s ease',
    letterSpacing: '0.5px',
    backdropFilter: 'blur(4px)',
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
