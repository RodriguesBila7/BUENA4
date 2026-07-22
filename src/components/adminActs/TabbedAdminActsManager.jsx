import React, { useState } from 'react';
import GenericAdminActsList from './GenericAdminActsList';
import DraggableTabs from '../common/DraggableTabs';

export default function TabbedAdminActsManager({ mainTitle, tabs }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div style={styles.container}>
      <h2 style={styles.mainTitle}>{mainTitle}</h2>
      
      <DraggableTabs 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(index) => setActiveTab(index)}
      />

      <div style={styles.contentContainer}>
        {tabs[activeTab].component ? (
          tabs[activeTab].component
        ) : (
          <GenericAdminActsList 
            title="" 
            actTypes={tabs[activeTab].actTypes} 
            emptyMessage={tabs[activeTab].emptyMessage} 
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    backgroundColor: 'var(--color-bg-base)',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  mainTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: 'var(--color-text-main)',
    margin: '0 0 24px 0',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid var(--color-border)',
    marginBottom: '20px',
  },
  tab: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeTab: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--color-primary)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid var(--color-primary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  }
};
