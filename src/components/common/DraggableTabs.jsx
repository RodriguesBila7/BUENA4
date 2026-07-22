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

  return (
    <div
      ref={containerRef}
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
            onClick={() => onTabChange(tab.id !== undefined ? tab.id : (tab.key !== undefined ? tab.key : index))}
            style={isActive ? styles.activeTab : styles.tab}
          >
            {tab.icon && <span style={{ marginRight: '6px' }}>{tab.icon}</span>}
            {tab.label || tab.title || tab.name}
            {tab.count !== undefined && (
              <span style={{
                ...styles.badge,
                backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
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
    gap: '8px',
    borderBottom: '1px solid var(--color-border)',
    marginBottom: '20px',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    cursor: 'grab',
    userSelect: 'none',
    paddingBottom: '2px'
  },
  tab: {
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '6px 6px 0 0'
  },
  activeTab: {
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--color-primary)',
    backgroundColor: 'rgba(27, 54, 93, 0.05)',
    border: 'none',
    borderBottom: '3px solid var(--color-primary)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '6px 6px 0 0'
  },
  badge: {
    marginLeft: '8px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700'
  }
};
