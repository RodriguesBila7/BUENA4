import React from 'react';
import SystemModal from './SystemModal';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      category: 'Navegação Direcional Principal',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      ),
      items: [
        {
          keys: ['↑', 'Alt + ↑'],
          desc: 'Módulo Anterior (Sobe no menu principal de navegação)'
        },
        {
          keys: ['↓', 'Alt + ↓'],
          desc: 'Próximo Módulo (Desce no menu principal de navegação)'
        },
        {
          keys: ['←', 'Alt + ←'],
          desc: 'Voltar no Histórico de Navegação do ecrã'
        },
        {
          keys: ['→', 'Alt + →'],
          desc: 'Avançar no Histórico de Navegação do ecrã'
        }
      ]
    },
    {
      category: 'Abas e Navegação Local',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
      ),
      items: [
        {
          keys: ['←', '→'],
          desc: 'Alternar entre Abas/Subguias ativas de qualquer módulo'
        },
        {
          keys: ['Home', 'End'],
          desc: 'Ir diretamente para a Primeira / Última Aba'
        },
        {
          keys: ['Tab', 'Shift + Tab'],
          desc: 'Focar próximo / elemento anterior da tela'
        }
      ]
    },
    {
      category: 'Atalhos Funcionais e Produtividade',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      ),
      items: [
        {
          keys: ['Ctrl + K', '/'],
          desc: 'Focar no Campo de Pesquisa Ativo instantaneamente'
        },
        {
          keys: ['Ctrl + B', 'Alt + B'],
          desc: 'Recolher / Expandir a Barra de Menu Lateral'
        },
        {
          keys: ['Ctrl + P'],
          desc: 'Imprimir ou Exportar Relatório da página corrente'
        }
      ]
    },
    {
      category: 'Controlo do Sistema e Diálogos',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      ),
      items: [
        {
          keys: ['Esc'],
          desc: 'Fechar Janelas, Modais, Menus suspensos ou Cancelar foco'
        },
        {
          keys: ['Enter'],
          desc: 'Confirmar Ação em Diálogos de Confirmação'
        },
        {
          keys: ['F1', '?'],
          desc: 'Abrir / Fechar esta Janela de Atalhos do Teclado'
        }
      ]
    }
  ];

  return (
    <SystemModal
      isOpen={isOpen}
      onClose={onClose}
      title="Atalhos de Teclado e Navegação Funcional"
      width="720px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={styles.badgeHint}>Dica</span>
            As setas funcionam livremente para navegar sem interferir com campos de digitação.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn}
          >
            Entendido (Esc)
          </button>
        </div>
      }
    >
      <div style={styles.container}>
        <div style={styles.banner}>
          <div style={styles.bannerIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <line x1="6" y1="8" x2="6" y2="8"></line>
              <line x1="10" y1="8" x2="10" y2="8"></line>
              <line x1="14" y1="8" x2="14" y2="8"></line>
              <line x1="18" y1="8" x2="18" y2="8"></line>
              <line x1="6" y1="12" x2="6" y2="12"></line>
              <line x1="10" y1="12" x2="10" y2="12"></line>
              <line x1="14" y1="12" x2="14" y2="12"></line>
              <line x1="18" y1="12" x2="18" y2="12"></line>
              <line x1="7" y1="16" x2="17" y2="16"></line>
            </svg>
          </div>
          <div>
            <h4 style={styles.bannerTitle}>Navegação Dinâmica e Eficiente por Teclado</h4>
            <p style={styles.bannerSubtitle}>
              O sistema suporta navegação direta via setas do teclado e atalhos rápidos corporativos para acelerar as operações diárias sem necessidade de uso contínuo do rato.
            </p>
          </div>
        </div>

        <div style={styles.grid}>
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} style={styles.groupCard}>
              <div style={styles.groupHeader}>
                <span style={styles.groupHeaderIcon}>{group.icon}</span>
                <span style={styles.groupTitle}>{group.category}</span>
              </div>
              <div style={styles.itemList}>
                {group.items.map((item, iIdx) => (
                  <div key={iIdx} style={styles.itemRow}>
                    <div style={styles.keysContainer}>
                      {item.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <kbd style={styles.kbdKey}>{k}</kbd>
                          {kIdx < item.keys.length - 1 && <span style={styles.orText}>ou</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    <div style={styles.itemDesc}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SystemModal>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '4px 0'
  },
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 16px',
    backgroundColor: 'rgba(27, 54, 93, 0.05)',
    border: '1px solid rgba(27, 54, 93, 0.12)',
    borderRadius: '10px'
  },
  bannerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-primary, #1B365D)',
    color: '#ffffff',
    flexShrink: 0
  },
  bannerTitle: {
    margin: '0 0 2px 0',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-text-base)'
  },
  bannerSubtitle: {
    margin: 0,
    fontSize: '12.5px',
    color: 'var(--color-text-muted)',
    lineHeight: '1.4'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
    gap: '14px'
  },
  groupCard: {
    backgroundColor: 'var(--color-bg-base, #ffffff)',
    border: '1px solid var(--color-border, #e2e8f0)',
    borderRadius: '10px',
    padding: '12px 14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '8px',
    marginBottom: '8px',
    borderBottom: '1px solid var(--color-border, #f1f5f9)'
  },
  groupHeaderIcon: {
    color: 'var(--color-primary, #1B365D)',
    display: 'flex',
    alignItems: 'center'
  },
  groupTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-text-base)'
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '12.5px'
  },
  keysContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0
  },
  kbdKey: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '24px',
    padding: '0 6px',
    fontSize: '11px',
    fontWeight: '700',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    color: 'var(--color-text-base)',
    backgroundColor: 'var(--color-bg-muted, #f8fafc)',
    border: '1px solid var(--color-border, #cbd5e1)',
    borderBottomWidth: '2px',
    borderRadius: '5px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
  },
  orText: {
    fontSize: '10.5px',
    color: 'var(--color-text-muted)'
  },
  itemDesc: {
    color: 'var(--color-text-muted)',
    fontSize: '12px',
    textAlign: 'right',
    flexGrow: 1
  },
  badgeHint: {
    display: 'inline-block',
    padding: '1px 5px',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    borderRadius: '4px',
    backgroundColor: 'rgba(27, 54, 93, 0.1)',
    color: 'var(--color-primary, #1B365D)'
  },
  closeBtn: {
    padding: '7px 16px',
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: 'var(--color-primary, #1B365D)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease'
  }
};
