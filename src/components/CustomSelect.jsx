import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

export default function CustomSelect({ value, onChange, groups, placeholder = "Selecione..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLabel = () => {
    if (!value) return placeholder;
    return value; // Since value is the act string directly
  };

  const getRect = () => {
    if (!containerRef.current) return {};
    const rect = containerRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width
    };
  };

  const dropdownStyle = {
    ...getRect(),
    position: 'absolute',
    backgroundColor: 'var(--color-bg-base, #ffffff)',
    border: '1px solid var(--color-border, #e2e8f0)',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    zIndex: 999999, // Ensure it's above everything
    maxHeight: '350px',
    overflowY: 'auto',
    padding: '8px 0',
  };

  return (
    <>
      <div 
        ref={containerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: isOpen ? '2px solid var(--color-primary, #3182ce)' : '1px solid var(--color-border, #e2e8f0)',
          borderRadius: '8px',
          backgroundColor: 'var(--color-bg-elevated, #ffffff)',
          color: value ? 'var(--color-text-main, #1a202c)' : 'var(--color-text-muted, #a0aec0)',
          fontSize: '14px',
          fontWeight: value ? '500' : '400',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s',
          boxShadow: isOpen ? '0 0 0 3px rgba(49, 130, 206, 0.1)' : 'none'
        }}
      >
        <span>{getLabel()}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {isOpen && ReactDOM.createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="custom-select-dropdown">
          {groups.map((g, idx) => (
            <div key={idx} style={{ marginBottom: idx === groups.length - 1 ? '0' : '8px' }}>
              <div style={{
                padding: '8px 16px 4px 16px',
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-primary, #3182ce)',
                borderBottom: '1px solid var(--color-border, #edf2f7)',
                marginBottom: '4px'
              }}>
                {g.group}
              </div>
              {g.acts.map(act => (
                <div 
                  key={act}
                  onClick={() => {
                    onChange(act);
                    setIsOpen(false);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-subtle, #f7fafc)';
                    e.currentTarget.style.color = 'var(--color-primary, #3182ce)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-main, #2d3748)';
                  }}
                  style={{
                    padding: '10px 16px 10px 24px',
                    fontSize: '14px',
                    color: value === act ? 'var(--color-primary, #3182ce)' : 'var(--color-text-main, #2d3748)',
                    backgroundColor: value === act ? 'rgba(49, 130, 206, 0.05)' : 'transparent',
                    fontWeight: value === act ? '600' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {value === act && (
                    <div style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary, #3182ce)'
                    }} />
                  )}
                  {act}
                </div>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
