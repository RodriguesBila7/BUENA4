import React, { useState, useEffect } from 'react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('sernic_pwa_dismissed') === 'true';
  });

  useEffect(() => {
    // Detectar se já está instalado em modo standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;

    // Detectar iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isIosDevice);

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
      }
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('sernic_pwa_dismissed', 'true');
  };

  if (isDismissed || (!deferredPrompt && !isIos)) {
    return null;
  }

  return (
    <>
      <div style={styles.banner}>
        <div style={styles.left}>
          <span style={styles.icon}>📱</span>
          <div>
            <div style={styles.title}>Aplicativo Oficial SERNIC DRH</div>
            <div style={styles.subtitle}>Instale no telemóvel para acesso rápido e direto</div>
          </div>
        </div>

        <div style={styles.right}>
          <button onClick={handleInstallClick} style={styles.btnInstall}>
            Instalar App
          </button>
          <button onClick={handleDismiss} style={styles.btnClose}>
            ✕
          </button>
        </div>
      </div>

      {/* GUIA IOS */}
      {showIosGuide && (
        <div style={styles.overlay} onClick={() => setShowIosGuide(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary)' }}>📱 Como Instalar no iPhone / iPad</h4>
            <ol style={{ paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6', margin: '0 0 16px 0' }}>
              <li>No Safari, toque no botão <strong>Partilhar</strong> (ícone com quadrado e seta para cima).</li>
              <li>Deslize para baixo e toque em <strong>"Adicionar ao Ecrã Principal"</strong>.</li>
              <li>Toque em <strong>"Adicionar"</strong> no canto superior direito.</li>
            </ol>
            <button onClick={() => setShowIosGuide(false)} style={styles.btnModalClose}>
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
    backgroundColor: 'var(--color-primary, #1B365D)',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: '30px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    zIndex: 99999,
    maxWidth: '92vw',
    border: '1px solid rgba(255,255,255,0.2)'
  },
  left: { display: 'flex', alignItems: 'center', gap: '10px' },
  icon: { fontSize: '20px' },
  title: { fontSize: '13px', fontWeight: '700' },
  subtitle: { fontSize: '11px', opacity: 0.85 },
  right: { display: 'flex', alignItems: 'center', gap: '8px' },
  btnInstall: {
    padding: '6px 14px',
    backgroundColor: '#fff',
    color: 'var(--color-primary, #1B365D)',
    border: 'none',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '800',
    cursor: 'pointer'
  },
  btnClose: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    opacity: 0.7
  },
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100000, padding: '20px'
  },
  modal: {
    backgroundColor: 'var(--color-bg-elevated, #fff)',
    color: 'var(--color-text-base, #111)',
    padding: '20px', borderRadius: '12px', maxWidth: '380px', width: '100%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
  },
  btnModalClose: {
    width: '100%', padding: '10px',
    backgroundColor: 'var(--color-primary, #1B365D)',
    color: '#fff', border: 'none', borderRadius: '6px',
    fontWeight: '700', cursor: 'pointer'
  }
};
