const fs = require('fs');
const filePath = 'src/components/Login.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

const state_target = `  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [hoveredTema, setHoveredTema] = useState(null);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  // 'theme' = cor do tema | 'noite' = fundo preto | 'claro' = fundo branco
  const [bwMode, setBwMode] = useState('theme');`;

const state_repl = `  const [username, setUsername]       = useState('');
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
  // 'theme' = cor do tema | 'noite' = fundo preto | 'claro' = fundo branco
  const [bwMode, setBwMode] = useState('theme');

  React.useEffect(() => {
    if (!localStorage.getItem('sernic_users')) {
      localStorage.setItem('sernic_users', JSON.stringify([
        { username: 'admin', password: 'admin123', role: 'super_admin', email: 'admin@sernic.gov.mz', name: 'Super Administrador' },
        { username: 'user', password: 'user123', role: 'regular_user', email: 'agente.silva@sernic.gov.mz', name: 'Utilizador Comum' }
      ]));
    }
  }, []);`;

content = content.replace(state_target, state_repl);

const handlers_target = `  /* ── Autenticação simulada ── */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setError('');
    if (username === 'admin' && password === 'admin123') {
      onLogin({ username: 'Super Administrador', role: 'super_admin', email: 'admin@sernic.gov.mz' });
    } else if (username === 'user' && password === 'user123') {
      onLogin({ username: 'Utilizador Comum', role: 'regular_user', email: 'agente.silva@sernic.gov.mz' });
    } else {
      setError('Utilizador ou senha incorrectos.');
    }
  };

  /* ── Aplicar tema de cor (sai do modo B&W) ── */
  const aplicarTema = (cor) => {
    setBwMode('theme');
    if (updateSettings) {
      updateSettings({ ...settings, cor_principal: cor, usuario_responsavel: 'Selecção de Tema (Login)' });
    }
  };

  const handleRecuperar = (e) => {
    e.preventDefault();
    alert('Para recuperação de acesso contacte: suporte.drh@sernic.gov.mz');
  };`;

const handlers_repl = `  /* ── Autenticação e Registo ── */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const users = JSON.parse(localStorage.getItem('sernic_users') || '[]');
      const user = users.find(u => u.username === username && u.password === password);
      
      if (user) {
        onLogin({ username: user.name, role: user.role, email: user.email });
      } else {
        setError('Utilizador ou senha incorrectos.');
      }
    }, 800);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !regName.trim() || !regEmail.trim()) {
      setError('Preencha todos os campos para solicitar acesso.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const users = JSON.parse(localStorage.getItem('sernic_users') || '[]');
      if (users.find(u => u.username === username)) {
        setError('Este NUIT já existe no sistema.');
        return;
      }
      users.push({ username, password, role: 'regular_user', email: regEmail, name: regName });
      localStorage.setItem('sernic_users', JSON.stringify(users));
      setSuccessMsg('Conta criada com sucesso! Pode entrar com as suas credenciais.');
      setView('login');
      setPassword('');
      setRegName('');
      setRegEmail('');
    }, 1000);
  };

  const handleRecuperarSubmit = (e) => {
    e.preventDefault();
    if (!regEmail.trim()) {
      setError('Preencha o seu email para recuperar a senha.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMsg('Instruções de recuperação enviadas para o seu email.');
      setView('login');
      setRegEmail('');
    }, 1000);
  };

  const aplicarTema = (cor) => {
    setBwMode('theme');
    if (updateSettings) {
      updateSettings({ ...settings, cor_principal: cor, usuario_responsavel: 'Selecção de Tema (Login)' });
    }
  };`;

content = content.replace(handlers_target, handlers_repl);

const card_target = `      {/* ══════════════ CARD DE LOGIN ══════════════ */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Entrar</h2>

        {error && <p style={s.errorMsg}>{error}</p>}

        <form onSubmit={handleSubmit} style={s.form}>

          {/* Campo de Utilizador */}
          <div style={s.fieldWrap}>
            <span style={s.fieldIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input
              id="username"
              type="text"
              placeholder="Utilizador (NUIT)"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={s.field}
            />
            <span style={s.fieldIconRight}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </span>
          </div>

          {/* Campo de Senha */}
          <div style={s.fieldWrap}>
            <span style={s.fieldIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={s.field}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={s.eyeBtn}
              tabIndex={-1}
              title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {/* Botão ENTRAR */}
          <button type="submit" id="btn-entrar" style={s.btnPrimary}>
            ENTRAR
          </button>

          {/* Botão RECUPERAR SENHA */}
          <button type="button" id="btn-recuperar" onClick={handleRecuperar} style={s.btnSecondary}>
            RECUPERAR SENHA
          </button>
        </form>

        {/* Credenciais de teste */}
        <div style={s.testBox}>
          <p style={s.testLabel}>⚡ Credenciais de teste:</p>
          <button
            type="button"
            onClick={() => { setUsername('admin'); setPassword('admin123'); }}
            style={s.testBtn}
          >
            Super Admin: admin / admin123
          </button>
          <button
            type="button"
            onClick={() => { setUsername('user'); setPassword('user123'); }}
            style={s.testBtn}
          >
            Utilizador: user / user123
          </button>
        </div>
      </div>`;

const card_repl = `      {/* ══════════════ CARD DE LOGIN / REGISTO / RECUPERAR ══════════════ */}
      <div style={s.card}>
        {successMsg && <p style={{...s.errorMsg, backgroundColor: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0'}}>{successMsg}</p>}
        {error && <p style={s.errorMsg}>{error}</p>}

        {view === 'login' && (
          <>
            <h2 style={s.cardTitle}>Entrar</h2>
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                <input type="text" placeholder="Utilizador (NUIT)" value={username} onChange={e => setUsername(e.target.value)} style={s.field} />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={s.field} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.eyeBtn} tabIndex={-1}>
                  {showPassword ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
              <button type="submit" style={{...s.btnPrimary, opacity: isLoading ? 0.7 : 1}} disabled={isLoading}>
                {isLoading ? 'A ENTRAR...' : 'ENTRAR'}
              </button>
              <div style={s.linkRow}>
                <button type="button" onClick={() => { setView('recover'); setError(''); setSuccessMsg(''); }} style={s.linkBtn}>Esqueceu a Senha?</button>
                <button type="button" onClick={() => { setView('register'); setError(''); setSuccessMsg(''); }} style={s.linkBtn}>Solicitar Acesso</button>
              </div>
            </form>
            <div style={s.testBox}>
              <p style={s.testLabel}>⚡ Credenciais de teste:</p>
              <button type="button" onClick={() => { setUsername('admin'); setPassword('admin123'); }} style={s.testBtn}>Super Admin: admin / admin123</button>
              <button type="button" onClick={() => { setUsername('user'); setPassword('user123'); }} style={s.testBtn}>Utilizador: user / user123</button>
            </div>
          </>
        )}

        {view === 'register' && (
          <>
            <h2 style={s.cardTitle}>Solicitar Acesso</h2>
            <form onSubmit={handleRegister} style={s.form}>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                <input type="text" placeholder="Nome Completo" value={regName} onChange={e => setRegName(e.target.value)} style={s.field} />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input type="text" placeholder="Utilizador (NUIT)" value={username} onChange={e => setUsername(e.target.value)} style={s.field} />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                <input type="email" placeholder="Email Institucional" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={s.field} />
              </div>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input type="password" placeholder="Definir Senha" value={password} onChange={e => setPassword(e.target.value)} style={s.field} />
              </div>
              <button type="submit" style={{...s.btnPrimary, opacity: isLoading ? 0.7 : 1}} disabled={isLoading}>
                {isLoading ? 'A PROCESSAR...' : 'REGISTAR EFECTIVO'}
              </button>
              <button type="button" onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }} style={s.btnSecondary}>VOLTAR AO LOGIN</button>
            </form>
          </>
        )}

        {view === 'recover' && (
          <>
            <h2 style={s.cardTitle}>Recuperar Senha</h2>
            <form onSubmit={handleRecuperarSubmit} style={s.form}>
              <div style={s.fieldWrap}>
                <span style={s.fieldIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                <input type="email" placeholder="Email Institucional" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={s.field} />
              </div>
              <button type="submit" style={{...s.btnPrimary, opacity: isLoading ? 0.7 : 1}} disabled={isLoading}>
                {isLoading ? 'A ENVIAR...' : 'ENVIAR INSTRUÇÕES'}
              </button>
              <button type="button" onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }} style={s.btnSecondary}>VOLTAR AO LOGIN</button>
            </form>
          </>
        )}
      </div>`;

content = content.replace(card_target, card_repl);

const style_target = `  btnSecondary: {
    width: '100%',
    padding: '13px',
    backgroundColor: '#F0B429',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '1.5px',
    cursor: 'pointer',
    transition: 'filter 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  },`;

const style_repl = `  btnSecondary: {
    width: '100%',
    padding: '13px',
    backgroundColor: 'transparent',
    color: '#4A5568',
    border: '1px solid #CBD5E1',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '1.5px',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'all 0.2s ease',
  },
  linkRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '16px',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#3182CE',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
  },`;

content = content.replace(style_target, style_repl);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Updated successfully');
