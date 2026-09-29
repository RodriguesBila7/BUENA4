import React, { useState, useEffect } from 'react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('sernic_pwa_dismissed') === 'true';
  });

  useEffect(() => {
    // 1. Detectar se a aplicação já está instalada / em modo standalone
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true ||
                       document.referrer.includes('android-app://');
    setIsStandalone(standalone);
    if (standalone) return;

    // 2. Detectar plataformas
    const ua = (window.navigator.userAgent || '').toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua);
    const androidDevice = /android/.test(ua);
    setIsIos(iosDevice);
    setIsAndroid(androidDevice);

    // 3. Capturar o evento nativo do PWA no Android/Chrome
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsDismissed(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('sernic_pwa_dismissed', 'true');
  };

  // Se já estiver em modo standalone ou fechado pelo utilizador nesta sessão
  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      <div style={styles.banner}>
        <div style={styles.left}>
          <div style={styles.iconBadge}>📱</div>
          <div>
            <div style={styles.title}>Aplicativo Oficial SERNIC DRH</div>
            <div style={styles.subtitle}>Instale no seu telemóvel para acesso rápido e seguro</div>
          </div>
        </div>

        <div style={styles.right}>
          <button onClick={handleInstallClick} style={styles.btnInstall}>
            Instalar App
          </button>
          <button onClick={handleDismiss} style={styles.btnClose} title="Fechar aviso">
            ✕
          </button>
        </div>
      </div>

      {/* GUIA PASSO-A-PASSO (PARA QUANDO O NAVEGADOR NÃO DISPARA INSTALAÇÃO AUTOMÁTICA) */}
      {showGuide && (
        <div style={styles.overlay} onClick={() => setShowGuide(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: 'var(--color-primary, #B71C1C)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📱 Como Instalar a Aplicação
              </h3>
              <button onClick={() => setShowGuide(false)} style={styles.btnGuideClose}>✕</button>
            </div>

            {isIos ? (
              <div>
                <p style={styles.guideIntro}>No seu iPhone / iPad (Safari):</p>
                <ol style={styles.guideList}>
                  <li>Toque no botão de <strong>Partilhar</strong> (ícone com quadrado e seta para cima <span style={{ fontSize: '16px' }}>⎋</span>).</li>
                  <li>Deslize para baixo nas opções e toque em <strong>"Adicionar ao Ecrã Principal"</strong>.</li>
                  <li>Toque em <strong>"Adicionar"</strong> no canto superior direito.</li>
                </ol>
              </div>
            ) : (
              <div>
                <p style={styles.guideIntro}>No seu Telemóvel (Google Chrome ou Navegador):</p>
                <ol style={styles.guideList}>
                  <li>Toque no menu de <strong>Três Pontinhos (⋮)</strong> no canto superior direito do ecrã.</li>
                  <li>Selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                  <li>Confirme tocando em <strong>"Instalar"</strong>.</li>
                </ol>
              </div>
            )}

            <div style={{ backgroundColor: 'rgba(183, 28, 28, 0.08)', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: 'var(--color-primary, #B71C1C)', marginBottom: '14px' }}>
              💡 O ícone oficial do SERNIC ficará disponível junto das suas outras aplicações no telemóvel.
            </div>

            <button onClick={() => setShowGuide(false)} style={styles.btnModalClose}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--color-primary, #B71C1C)',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: '30px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    zIndex: 999999,
    width: '92%',
    maxWidth: '480px',
    border: '1px solid rgba(255,255,255,0.25)',
    animation: 'slideUp 0.3s ease-out'
  },
  left: { display: 'flex', alignItems: 'center', gap: '12px' },
  iconBadge: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0
  },
  title: { fontSize: '13px', fontWeight: '800', letterSpacing: '0.2px' },
  subtitle: { fontSize: '11px', opacity: 0.9, marginTop: '1px' },
  right: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  btnInstall: {
    padding: '7px 16px',
    backgroundColor: '#fff',
    color: 'var(--color-primary, #B71C1C)',
    border: 'none',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    whiteSpace: 'nowrap'
  },
  btnClose: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '15px',
    cursor: 'pointer',
    opacity: 0.75,
    padding: '4px'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'var(--color-bg-base, #ffffff)',
    color: 'var(--color-text-base, #0f172a)',
    padding: '22px',
    borderRadius: '16px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    border: '1px solid var(--color-border, #cbd5e1)'
  },
  btnGuideClose: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)'
  },
  guideIntro: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-text-base)',
    marginBottom: '10px'
  },
  guideList: {
    paddingLeft: '20px',
    fontSize: '13px',
    lineHeight: '1.7',
    color: 'var(--color-text-base)',
    margin: '0 0 16px 0'
  },
  btnModalClose: {
    width: '100%',
    padding: '11px',
    backgroundColor: 'var(--color-primary, #B71C1C)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer'
  }
};
