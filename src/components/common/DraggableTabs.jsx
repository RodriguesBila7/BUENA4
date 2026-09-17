import React, { useRef, useState } from 'react';

export default function DraggableTabs({ tabs, activeTab, onTabChange }) {
  const containerRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    setIsMouseDown(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      const nextTab = tabs[nextIndex];
      onTabChange(nextTab.id !== undefined ? nextTab.id : (nextTab.key !== undefined ? nextTab.key : nextIndex));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      const prevTab = tabs[prevIndex];
      onTabChange(prevTab.id !== undefined ? prevTab.id : (prevTab.key !== undefined ? prevTab.key : prevIndex));
    } else if (e.key === 'Home') {
      e.preventDefault();
      const firstTab = tabs[0];
      onTabChange(firstTab.id !== undefined ? firstTab.id : (firstTab.key !== undefined ? firstTab.key : 0));
    } else if (e.key === 'End') {
      e.preventDefault();
      const lastTab = tabs[tabs.length - 1];
      onTabChange(lastTab.id !== undefined ? lastTab.id : (lastTab.key !== undefined ? lastTab.key : tabs.length - 1));
    }
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Abas de navegação do módulo"
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      style={styles.tabsContainer}
      className="draggable-tabs-scroll"
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === index || activeTab === tab.id || activeTab === tab.key;
        return (
          <button
            key={tab.key || tab.id || index}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`module-tab ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id !== undefined ? tab.id : (tab.key !== undefined ? tab.key : index))}
            onKeyDown={(e) => handleKeyDown(e, index)}
            style={isActive ? styles.activeTab : styles.tab}
          >
            {tab.icon && <span style={{ marginRight: '6px' }}>{tab.icon}</span>}
            {tab.label || tab.title || tab.name}
            {tab.count !== undefined && (
              <span style={{
                ...styles.badge,
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--color-border)',
                color: isActive ? '#ffffff' : 'var(--color-text-muted)'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  tabsContainer: {
    display: 'flex',
    gap: '10px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px',
    marginBottom: '20px',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    cursor: 'grab',
    userSelect: 'none'
  },
  tab: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    outline: 'none'
  },
  activeTab: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--color-accent, #ffffff)',
    backgroundColor: 'var(--color-primary)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    outline: 'none'
  },
  badge: {
    marginLeft: '8px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700'
  }
};
