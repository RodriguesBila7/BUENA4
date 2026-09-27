import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCloudPhotos } from '../services/cloudSyncService';

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
            'Contencioso Laboral',
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
          const isAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(parsed.roleId || parsed.role) || parsed.username === 'admin' || parsed.roleDetails.permissions?.all === true;

          ALL_MODULES.forEach(mod => {
            if (!parsed.roleDetails.permissions[mod] || (isAdmin && parsed.roleDetails.permissions[mod].length < 9)) {
              parsed.roleDetails.permissions[mod] = isAdmin
                ? ['Visualizar', 'Criar', 'Editar', 'Eliminar', 'Validar', 'Exportar', 'Importar', 'Imprimir', 'Administrar'] 
                : (parsed.roleDetails.permissions[mod] || ['Visualizar']);
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

  // Sincronizar fotografias da nuvem logo que o contexto inicializa (PC e Telemóvel)
  useEffect(() => {
    getCloudPhotos().then(photos => {
      if (photos && user) {
        const key = (user.username || user.nuit || user.id || '').toLowerCase();
        const cloudPhoto = photos[key] || photos[(user.nuit || '').toLowerCase()] || photos[(user.username || '').toLowerCase()];
        if (cloudPhoto && cloudPhoto !== user.photo) {
          setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, photo: cloudPhoto, avatar: cloudPhoto };
            localStorage.setItem('sernic_logged_user', JSON.stringify(updated));
            return updated;
          });
        }
      }
    }).catch(() => {});
  }, [user?.username]);

  const login = (userData) => {
    // Verificar se já existe foto salva localmente ou na nuvem
    const key = (userData.username || userData.nuit || userData.id || '').toLowerCase();
    const localPhoto = localStorage.getItem('sernic_user_photo_' + key);
    if (localPhoto && !userData.photo) {
      userData.photo = localPhoto;
      userData.avatar = localPhoto;
    }

    setUser(userData);
    localStorage.setItem('sernic_logged_user', JSON.stringify(userData));
    localStorage.setItem('sernic_last_activity', Date.now().toString());

    // Buscar a foto mais recente na nuvem de forma assíncrona para garantir sincronização entre dispositivos
    getCloudPhotos(true).then(photos => {
      if (photos) {
        const cloudPhoto = photos[key] || photos[(userData.nuit || '').toLowerCase()] || photos[(userData.username || '').toLowerCase()];
        if (cloudPhoto && cloudPhoto !== userData.photo) {
          setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, photo: cloudPhoto, avatar: cloudPhoto };
            localStorage.setItem('sernic_logged_user', JSON.stringify(updated));
            return updated;
          });
        }
      }
    }).catch(() => {});
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

  const updateUserSession = (partialData) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partialData };
      localStorage.setItem('sernic_logged_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateSessionActivity, updateUserSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
