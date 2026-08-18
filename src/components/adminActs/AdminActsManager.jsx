import React from 'react';
import AdminActsDashboard from './AdminActsDashboard';
import GenericAdminActsList from './GenericAdminActsList';
import TabbedAdminActsManager from './TabbedAdminActsManager';
import ObitosManager from './obitos/ObitosManager';
import JuntaSaudeManager from './juntaSaude/JuntaSaudeManager';
import VacationManager from '../vacations/VacationManager';
import TransferManager from '../transfers/TransferManager';
import MudancaCarreiraManager from './mudancaCarreira/MudancaCarreiraManager';
import ReservaReformaManager from './reservaReforma/ReservaReformaManager';
import ProvimentoCessacaoManager from './provimentoCessacao/ProvimentoCessacaoManager';

export default function AdminActsManager({ activeTab, onTabChange, actTypesDb }) {
  
  // Render content based on the active sub-tab for Admin Acts
  const renderContent = () => {
    if (activeTab === 'admin_acts_dashboard') {
      return <AdminActsDashboard />;
    }

    if (activeTab.startsWith('admin_acts_dynamic_')) {
      const groupNameRaw = activeTab.replace('admin_acts_dynamic_', '');
      const groupName = groupNameRaw.replace(/_/g, ' ');
      
      // Look up all act types for this group
      const actsInGroup = (actTypesDb || [])
        .filter(a => a.group_name === groupName && a.is_active)
        .map(a => a.act_name);

      if (actsInGroup.length === 0) {
        return (
          <GenericAdminActsList 
            title={`Módulo de ${groupName}`} 
            actTypes={[]} 
            emptyMessage={`Nenhum acto registado para ${groupName}.`} 
          />
        );
      }

      // Special overrides for modules that have specific components
      if (groupName === 'Provimento e Cessação') {
        return <ProvimentoCessacaoManager actsInGroup={actsInGroup} />;
      }

      if (groupName === 'Mudança de Carreira') {
        return <MudancaCarreiraManager actsInGroup={actsInGroup} />;
      }

      if (groupName === 'Férias e Licenças') {
        return <VacationManager />;
      }

      if (groupName === 'Reserva e Reforma') {
        return <ReservaReformaManager />;
      }

      if (groupName === 'Transferências e Mobilidade') {
        return (
          <TabbedAdminActsManager 
            mainTitle={`Módulo de ${groupName}`} 
            tabs={[
              { label: 'Gestão de Transferências', component: <TransferManager /> },
              ...actsInGroup.filter(a => !['Transferência', 'Destacamento', 'Reafectação', 'Comissão de Serviço'].includes(a)).map(act => ({
                label: act,
                actTypes: [act],
                emptyMessage: `Nenhum registo de ${act}.`
              }))
            ]}
          />
        );
      }

      if (groupName === 'Saúde e Óbitos') {
        return (
          <TabbedAdminActsManager 
            mainTitle={`Módulo de ${groupName}`} 
            tabs={[
              { label: 'Junta de Saúde', actTypes: ['Junta de Saúde'], emptyMessage: 'Nenhum acto de saúde registado.', component: <JuntaSaudeManager /> },
              { label: 'Óbitos', actTypes: ['Óbito'], emptyMessage: 'Nenhum óbito registado.', component: <ObitosManager /> }
            ]}
          />
        );
      }

      // Default dynamic rendering
      if (actsInGroup.length === 1) {
        return (
          <GenericAdminActsList 
            title={`Módulo de ${groupName}`} 
            actTypes={actsInGroup} 
            emptyMessage={`Nenhum acto registado para ${groupName}.`} 
          />
        );
      } else {
        return (
          <TabbedAdminActsManager 
            mainTitle={`Módulo de ${groupName}`} 
            tabs={actsInGroup.map(act => ({
              label: act,
              actTypes: [act],
              emptyMessage: `Nenhum registo de ${act}.`
            }))}
          />
        );
      }
    }

    // Default fallback
    return <AdminActsDashboard />;
  };

  return (
    <div style={styles.managerContainer}>
      {renderContent()}
    </div>
  );
}

const styles = {
  managerContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  placeholderContainer: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-base)',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed var(--color-border)',
    borderRadius: '8px',
    margin: '20px'
  }
};
