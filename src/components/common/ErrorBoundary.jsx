import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Erro capturado na interface:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.setItem('sernic_active_tab', 'home');
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          margin: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            ⚠️
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: 'var(--color-text-base)',
            marginBottom: '8px'
          }}>
            Ocorreu um erro inesperado ao carregar este módulo
          </h3>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            marginBottom: '24px',
            maxWidth: '500px',
            margin: '0 auto 24px auto'
          }}>
            {this.state.error?.message || 'Falha temporária de carregamento ou componente indisponível.'}
          </p>

          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-accent)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            🔄 Recarregar Módulo e Voltar ao Início
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
