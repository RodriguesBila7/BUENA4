import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('sernic_logged_user');
      if (savedUser) {
        let parsed = JSON.parse(savedUser);
        // Migration patch for missing permissions in the currently logged user
        if (parsed && parsed.roleDetails && parsed.roleDetails.permissions) {
          const ALL_MODULES = [
            'Dashboard',
            'Funcionários',
            'Estrutura Organizacional',
            'Processos Disciplinares',
            'Efetividade (Faltas)',
            'Avaliação de Desempenho',
            'Promoção e Progressão',
            'Férias e Licenças',
            'Mudança de Carreira',
            'Provimento e Cessação',
            'Reserva e Reforma',
            'Saúde e Óbitos',
            'Transferências e Mobilidade',
            'Carreiras',
            'Categorias Funcionais',
            'Relatórios e Impressão',
            'Configurações',
            'Utilizadores',
            'Auditoria',
            'Acessos e Perfis'
          ];
          let updated = false;
          ALL_MODULES.forEach(mod => {
            if (!parsed.roleDetails.permissions[mod]) {
              parsed.roleDetails.permissions[mod] = parsed.roleId === 'super_admin' 
                ? ['Visualizar', 'Criar', 'Editar', 'Eliminar', 'Validar', 'Exportar', 'Importar', 'Imprimir', 'Administrar'] 
                : ['Visualizar'];
              updated = true;
            }
          });
          if (updated) {
            localStorage.setItem('sernic_logged_user', JSON.stringify(parsed));
          }
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('sernic_logged_user', JSON.stringify(userData));
    localStorage.setItem('sernic_last_activity', Date.now().toString());
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sernic_logged_user');
    localStorage.removeItem('sernic_last_activity');
  };

  const updateSessionActivity = () => {
    if (user) {
      localStorage.setItem('sernic_last_activity', Date.now().toString());
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateSessionActivity }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
