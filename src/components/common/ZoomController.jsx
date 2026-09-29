import React, { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'sernic_app_zoom';

export default function ZoomController() {
  const [isOpen, setIsOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? parseInt(saved, 10) : 100;
    } catch {
      return 100;
    }
  });

  const menuRef = useRef(null);

  // Aplicar zoom ao documento
  const applyZoom = (newLevel) => {
    const clamped = Math.max(50, Math.min(150, newLevel));
    setZoomLevel(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {}

    if (typeof document !== 'undefined') {
      const factor = clamped / 100;
      if ('zoom' in document.body.style) {
        document.body.style.zoom = String(factor);
      } else {
        document.body.style.transform = `scale(${factor})`;
        document.body.style.transformOrigin = 'top center';
      }
    }
  };

  // Carregar e aplicar o zoom guardado ao montar
  useEffect(() => {
    applyZoom(zoomLevel);
  }, []);

  // Fechar ao clicar fora ou pressionar ESC
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleDecrease = () => applyZoom(zoomLevel - 5);
  const handleIncrease = () => applyZoom(zoomLevel + 5);
  const handleReset = () => applyZoom(100);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        zIndex: 999999,
        fontFamily: "'Inter', system-ui, sans-serif"
      }}
    >
      {/* BOTÃO DOS 3 PONTINHOS NO CANTO SUPERIOR ESQUERDO */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ajustar Zoom do Ecrã"
        title="Ajustar Zoom do Ecrã (Diminuir / Aumentar)"
        style={{
          width: '38px',
          height: '38px',
          minWidth: '38px',
          minHeight: '38px',
          borderRadius: '50%',
          backgroundColor: 'rgba(27, 54, 93, 0.75)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          outline: 'none',
          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isOpen ? 'scale(1.08)' : 'scale(1)',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {/* ÍCONE NATIVO DE 3 PONTINHOS VERTICAIS (⋮) */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2.2" />
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="12" cy="19" r="2.2" />
        </svg>
      </button>

      {/* PAINEL FLUTUANTE DE AJUSTE DE ZOOM */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '46px',
            left: '0',
            width: '240px',
            backgroundColor: 'var(--color-bg-card, #243044)',
            color: 'var(--color-text-base, #F8FAFC)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
            border: '1px solid var(--color-border, #3A4A66)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            animation: 'fadeIn 0.2s ease-out',
            boxSizing: 'border-box'
          }}
        >
          {/* TOPO DO PAINEL */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px' }}>🔍</span>
              <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Zoom do Ecrã
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted, #94A3B8)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                padding: '2px 6px'
              }}
            >
              ✕
            </button>
          </div>

          {/* INDICADOR CENTRAL DA PERCENTAGEM ATUAL */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '12px',
              padding: '10px',
              marginBottom: '14px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px', color: '#38BDF8' }}>
              {zoomLevel}%
            </span>
            {zoomLevel === 100 && (
              <span style={{ fontSize: '10px', marginLeft: '6px', color: '#10B981', fontWeight: '700' }}>
                (Padrão)
              </span>
            )}
          </div>

          {/* CONTROLOS RÁPIDOS DE + E - */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={handleDecrease}
              disabled={zoomLevel <= 50}
              style={{
                padding: '9px 10px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '800',
                cursor: zoomLevel <= 50 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                opacity: zoomLevel <= 50 ? 0.5 : 1
              }}
            >
              <span>➖</span>
              <span>-5%</span>
            </button>

            <button
              type="button"
              onClick={handleIncrease}
              disabled={zoomLevel >= 150}
              style={{
                padding: '9px 10px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '800',
                cursor: zoomLevel >= 150 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                opacity: zoomLevel >= 150 ? 0.5 : 1
              }}
            >
              <span>➕</span>
              <span>+5%</span>
            </button>
          </div>

          {/* PRESETS RÁPIDOS (75%, 80%, 90%, 100%) */}
          <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-muted, #94A3B8)', marginBottom: '6px' }}>
            Atalhos Diretos:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '14px' }}>
            {[75, 80, 90, 100].map((preset) => {
              const isSelected = zoomLevel === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyZoom(preset)}
                  style={{
                    padding: '6px 0',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: isSelected ? '900' : '700',
                    backgroundColor: isSelected ? '#BA1B1D' : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#FFFFFF' : 'var(--color-text-base, #F8FAFC)',
                    border: isSelected ? '1px solid #BA1B1D' : '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {preset}%
                </button>
              );
            })}
          </div>

          {/* BOTÃO DE REPOR 100% */}
          {zoomLevel !== 100 && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'transparent',
                color: 'var(--color-text-muted, #94A3B8)',
                border: '1px dashed rgba(255, 255, 255, 0.25)',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>↺</span>
              <span>Repor Padrão (100%)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
