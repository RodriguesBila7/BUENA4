import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCloudPhotos } from '../services/cloudSyncService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('sernic_logged_user') || sessionStorage.getItem('sernic_logged_user');
      const savedToken = localStorage.getItem('sernic_jwt_token') || sessionStorage.getItem('sernic_jwt_token');

      // Exigir token JWT criptografado ativo para restaurar a sessão (sessões antigas sem token vão para o login)
      if (savedUser && savedToken) {
        let parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object') {
          // Atualiza a atividade imediatamente no arranque/refresh para não expirar
          const nowStr = Date.now().toString();
          try {
            localStorage.setItem('sernic_last_activity', nowStr);
            sessionStorage.setItem('sernic_last_activity', nowStr);
            localStorage.setItem('sernic_logged_user', savedUser);
            sessionStorage.setItem('sernic_logged_user', savedUser);
          } catch (e) {}

          // Migration patch for missing permissions in the currently logged user
          if (parsed.roleDetails && parsed.roleDetails.permissions) {
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
              'Relatório do Efectivo',
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
              const updatedStr = JSON.stringify(parsed);
              try {
                localStorage.setItem('sernic_logged_user', updatedStr);
                sessionStorage.setItem('sernic_logged_user', updatedStr);
              } catch (e) {}
            }
          }
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // Sincronizar fotografias da nuvem logo que o contexto inicializa (PC e Telemóvel)
  useEffect(() => {
    if (!user) return;
    const candidates = [
      user.username,
      user.name,
      user.nuit,
      user.id,
      '123922328',
      'buenaverte'
    ].filter(Boolean).map(k => String(k).trim().toLowerCase());

    getCloudPhotos().then(photos => {
      if (photos && typeof photos === 'object') {
        let cloudPhoto = null;
        for (const c of candidates) {
          if (photos[c]) {
            cloudPhoto = photos[c];
            break;
          }
        }
        if (cloudPhoto && cloudPhoto !== user.photo) {
          candidates.forEach(c => localStorage.setItem('sernic_user_photo_' + c, cloudPhoto));
          setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, photo: cloudPhoto, avatar: cloudPhoto };
            try {
              const str = JSON.stringify(updated);
              localStorage.setItem('sernic_logged_user', str);
              sessionStorage.setItem('sernic_logged_user', str);
            } catch (e) {}
            return updated;
          });
        }
      }
    }).catch(() => {});
  }, [user?.username]);

  const login = (userData) => {
    if (!userData) return;
    const candidates = [
      userData.username,
      userData.name,
      userData.nuit,
      userData.id,
      '123922328',
      'buenaverte'
    ].filter(Boolean).map(k => String(k).trim().toLowerCase());

    // Verificar se já existe foto salva localmente sob qualquer uma das chaves
    let localPhoto = userData.photo || userData.avatar || null;
    if (!localPhoto) {
      for (const c of candidates) {
        const saved = localStorage.getItem('sernic_user_photo_' + c);
        if (saved) {
          localPhoto = saved;
          break;
        }
      }
    }
    if (localPhoto) {
      userData.photo = localPhoto;
      userData.avatar = localPhoto;
      candidates.forEach(c => localStorage.setItem('sernic_user_photo_' + c, localPhoto));
    }

    setUser(userData);
    try {
      const serialized = JSON.stringify(userData);
      localStorage.setItem('sernic_logged_user', serialized);
      sessionStorage.setItem('sernic_logged_user', serialized);
      const nowStr = Date.now().toString();
      localStorage.setItem('sernic_last_activity', nowStr);
      sessionStorage.setItem('sernic_last_activity', nowStr);
    } catch (e) {
      console.warn('[AuthContext] Falha ao gravar credenciais de sessão:', e);
    }

    // Buscar a foto mais recente na nuvem de forma assíncrona para garantir sincronização entre dispositivos
    getCloudPhotos(true).then(photos => {
      if (photos && typeof photos === 'object') {
        let cloudPhoto = null;
        for (const c of candidates) {
          if (photos[c]) {
            cloudPhoto = photos[c];
            break;
          }
        }
        if (cloudPhoto && cloudPhoto !== userData.photo) {
          candidates.forEach(c => localStorage.setItem('sernic_user_photo_' + c, cloudPhoto));
          setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, photo: cloudPhoto, avatar: cloudPhoto };
            try {
              const str = JSON.stringify(updated);
              localStorage.setItem('sernic_logged_user', str);
              sessionStorage.setItem('sernic_logged_user', str);
            } catch (e) {}
            return updated;
          });
        }
      }
    }).catch(() => {});
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('sernic_logged_user');
      sessionStorage.removeItem('sernic_logged_user');
      localStorage.removeItem('sernic_last_activity');
      sessionStorage.removeItem('sernic_last_activity');
      localStorage.removeItem('sernic_jwt_token');
      sessionStorage.removeItem('sernic_jwt_token');
    } catch (e) {}
  };

  const updateSessionActivity = () => {
    if (user) {
      const nowStr = Date.now().toString();
      try {
        localStorage.setItem('sernic_last_activity', nowStr);
        sessionStorage.setItem('sernic_last_activity', nowStr);
      } catch (e) {}
    }
  };

  const updateUserSession = (partialData) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partialData };
      try {
        const str = JSON.stringify(updated);
        localStorage.setItem('sernic_logged_user', str);
        sessionStorage.setItem('sernic_logged_user', str);
      } catch (e) {}
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
