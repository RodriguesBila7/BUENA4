import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

/* ─────────────────────────────────────────────────────────
   Toast Context & Hook
   ───────────────────────────────────────────────────────── */
export const ToastContext = React.createContext(null);

let _showToast = null;

/** Global imperative helper – use inside any component without context */
export function showToast(message, type = 'info', duration = 4000) {
  if (_showToast) _showToast(message, type, duration);
}

/* ─────────────────────────────────────────────────────────
   ICONS
   ───────────────────────────────────────────────────────── */
const ICONS = {
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const COLORS = {
  success: {
    bg: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.18))',
    border: 'rgba(16,185,129,0.4)',
    icon: '#10b981',
    bar: '#10b981',
    text: 'var(--color-text-main, #1a202c)',
  },
  error: {
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.18))',
    border: 'rgba(239,68,68,0.4)',
    icon: '#ef4444',
    bar: '#ef4444',
    text: 'var(--color-text-main, #1a202c)',
  },
  warning: {
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.18))',
    border: 'rgba(245,158,11,0.4)',
    icon: '#f59e0b',
    bar: '#f59e0b',
    text: 'var(--color-text-main, #1a202c)',
  },
  info: {
    bg: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(37,99,235,0.18))',
    border: 'rgba(59,130,246,0.4)',
    icon: '#3b82f6',
    bar: '#3b82f6',
    text: 'var(--color-text-main, #1a202c)',
  },
};

/* ─────────────────────────────────────────────────────────
   Single Toast Item
   ───────────────────────────────────────────────────────── */
function ToastItem({ id, message, type = 'info', duration = 4000, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef(null);
  const colors = COLORS[type] || COLORS.info;

  useEffect(() => {
    // Slide-in
    requestAnimationFrame(() => setVisible(true));

    // Progress bar countdown
    const step = 100 / (duration / 50);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        const next = p - step;
        if (next <= 0) { clearInterval(intervalRef.current); return 0; }
        return next;
      });
    }, 50);

    // Auto dismiss
    const timer = setTimeout(() => dismiss(), duration);
    return () => { clearTimeout(timer); clearInterval(intervalRef.current); };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onRemove(id), 300);
  };

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '12px',
        background: COLORS[type]?.bg || COLORS.info.bg,
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)',
        cursor: 'pointer',
        minWidth: '280px',
        maxWidth: '380px',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(40px) scale(0.95)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        marginBottom: '8px',
      }}
    >
      {/* Icon */}
      <div style={{ color: colors.icon, flexShrink: 0, marginTop: '1px' }}>
        {ICONS[type] || ICONS.info}
      </div>

      {/* Message */}
      <div style={{ flex: 1, fontSize: '13.5px', fontWeight: '500', color: colors.text, lineHeight: '1.5', wordBreak: 'break-word' }}>
        {message}
      </div>

      {/* Close btn */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-muted, #9ca3af)', fontSize: '18px', lineHeight: 1,
          padding: '0 2px', flexShrink: 0, transition: 'color 0.2s',
        }}
      >×</button>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        height: '3px', borderRadius: '0 0 12px 12px',
        width: `${progress}%`,
        backgroundColor: colors.bar,
        transition: 'width 0.05s linear',
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   ToastProvider – wrap your app root with this
   ───────────────────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Register global imperative helper
  useEffect(() => { _showToast = addToast; return () => { _showToast = null; }; }, [addToast]);

  const portal = ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column-reverse',
      alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem {...t} onRemove={removeToast} />
        </div>
      ))}
    </div>,
    document.body
  );

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {portal}
    </ToastContext.Provider>
  );
}

/** Hook to use inside components */
export function useToast() {
  return React.useContext(ToastContext) || showToast;
}
