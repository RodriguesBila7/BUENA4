/**
 * src/hooks/useAuthData.js
 * Gestao de Utilizadores, Perfis (Roles) e Autenticacao via API REST (SQLite)
 * com fallback inteligente para modo offline / demonstração (Vercel).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getFallbackUsers,
  saveFallbackUsers,
  getFallbackRoles,
  saveFallbackRoles,
  authenticateOffline
} from '../services/storageFallback';
import { getCloudPhotos } from '../services/cloudSyncService';

// Cache em memoria
let _usersCache = null;
let _rolesCache = null;
const _listeners = new Set();

function notifyAll(users, roles) {
  _usersCache = users;
  _rolesCache = roles;
  _listeners.forEach(fn => fn(users, roles));
}

import { safeApiCall, isVercelHost } from '../services/apiClient';

async function api(method, path, body) {
  return safeApiCall(`/api/auth${path}`, {
    method,
    body: body !== undefined ? body : undefined
  });
}

async function fetchData() {
  let u = [];
  let r = [];
  try {
    [u, r] = await Promise.all([
      api('GET', '/users'),
      api('GET', '/roles')
    ]);
  } catch (e) {
    console.warn('[useAuthData] API indisponível, a utilizar dados locais de fallback...');
    u = getFallbackUsers();
    r = getFallbackRoles();
  }

  // Sincronizar e mesclar fotografias da nuvem (garante que utilizadores criados no PC apareçam com foto no telemóvel e vice-versa)
  try {
    const cloudPhotos = await getCloudPhotos();
    if (cloudPhotos && typeof cloudPhotos === 'object') {
      u = (u || []).map(user => {
        const key = (user.username || user.nuit || user.id || '').toLowerCase();
        const photo = cloudPhotos[key] || cloudPhotos[(user.nuit || '').toLowerCase()] || cloudPhotos[(user.username || '').toLowerCase()] || user.photo || user.avatar;
        return {
          ...user,
          photo: photo || null,
          avatar: photo || null
        };
      });
    }
  } catch (err) {}

  notifyAll(u, r);
}

export default function useAuthData() {
  const [users, setUsers] = useState(_usersCache || getFallbackUsers());
  const [roles, setRoles] = useState(_rolesCache || getFallbackRoles());

  useEffect(() => {
    const listener = (u, r) => { setUsers(u); setRoles(r); };
    _listeners.add(listener);
    if (!_usersCache) fetchData();
    return () => _listeners.delete(listener);
  }, []);

  // ─── Utilizadores ────────────────────────────────────────────────────────
  const addUser = useCallback(async (userData) => {
    try {
      const id = 'usr_' + Date.now();
      await api('POST', '/users', { ...userData, id });
      await fetchData();
      return { success: true, user: { ...userData, id } };
    } catch (e) {
      if (e.message === 'duplicate_username') return { success: false, error: 'O nome de utilizador ja existe.' };
      const current = getFallbackUsers();
      const id = 'usr_' + Date.now();
      const updated = [...current, { ...userData, id }];
      saveFallbackUsers(updated);
      notifyAll(updated, getFallbackRoles());
      return { success: true, user: { ...userData, id } };
    }
  }, []);

  const updateUser = useCallback(async (id, userData) => {
    try {
      await api('PUT', `/users/${id}`, userData);
      await fetchData();
      return { success: true };
    } catch (e) {
      if (e.message === 'duplicate_username') return { success: false, error: 'O nome de utilizador ja existe.' };
      const current = getFallbackUsers();
      const updated = current.map(u => u.id === id ? { ...u, ...userData } : u);
      saveFallbackUsers(updated);
      notifyAll(updated, getFallbackRoles());
      return { success: true };
    }
  }, []);

  const deleteUser = useCallback(async (id) => {
    try {
      await api('DELETE', `/users/${id}`);
      await fetchData();
      return { success: true };
    } catch (e) {
      const current = getFallbackUsers();
      const updated = current.filter(u => u.id !== id);
      saveFallbackUsers(updated);
      notifyAll(updated, getFallbackRoles());
      return { success: true };
    }
  }, []);

  const authenticate = useCallback(async (username, password, _policies) => {
    // Autenticação obrigatória com o servidor seguro (Express local ou Serverless Vercel /api/login)
    try {
      const endpoint = isVercelHost() ? '/api/login' : '/api/auth/login';
      const res = await safeApiCall(endpoint, {
        method: 'POST',
        body: { username, password }
      });
      if (res && res.token) {
        try {
          sessionStorage.setItem('sernic_jwt_token', res.token);
          localStorage.removeItem('sernic_jwt_token');
        } catch (e) {}
        return { 
          success: true, 
          token: res.token, 
          user: { ...res.user, roleDetails: res.user.roleDetails || (res.user.permissions ? { permissions: res.user.permissions } : null) } 
        };
      }
      return { success: false, error: res?.error || res?.message || 'Credenciais inválidas.' };
    } catch (e) {
      if (e.message && (e.message.includes('Credenciais inválidas') || e.message.includes('invalid_credentials'))) {
        return { success: false, error: 'Credenciais inválidas. Verifique o utilizador ou a palavra-passe.' };
      }
      if (e.message && e.message.includes('account_locked')) {
        return { success: false, error: 'Conta temporariamente bloqueada por excesso de tentativas falhadas. Aguarde 15 minutos.' };
      }
      return { 
        success: false, 
        error: 'Serviço de autenticação inacessível. É necessária ligação ao servidor para iniciar sessão com segurança.' 
      };
    }
  }, []);

  // ─── Perfis (Roles) ─────────────────────────────────────────────────────
  const addRole = useCallback(async (roleData) => {
    try {
      const id = 'role_' + Date.now();
      await api('POST', '/roles', { ...roleData, id });
      await fetchData();
      return { success: true, role: { ...roleData, id } };
    } catch (e) {
      const current = getFallbackRoles();
      const id = 'role_' + Date.now();
      const updated = [...current, { ...roleData, id }];
      saveFallbackRoles(updated);
      notifyAll(getFallbackUsers(), updated);
      return { success: true, role: { ...roleData, id } };
    }
  }, []);

  const updateRole = useCallback(async (id, roleData) => {
    try {
      await api('PUT', `/roles/${id}`, roleData);
      await fetchData();
      return { success: true };
    } catch (e) {
      const current = getFallbackRoles();
      const updated = current.map(r => r.id === id ? { ...r, ...roleData } : r);
      saveFallbackRoles(updated);
      notifyAll(getFallbackUsers(), updated);
      return { success: true };
    }
  }, []);

  const deleteRole = useCallback(async (id) => {
    try {
      await api('DELETE', `/roles/${id}`);
      await fetchData();
      return { success: true };
    } catch (e) {
      const current = getFallbackRoles();
      const updated = current.filter(r => r.id !== id);
      saveFallbackRoles(updated);
      notifyAll(getFallbackUsers(), updated);
      return { success: true };
    }
  }, []);

  return {
    users,
    roles,
    addUser,
    updateUser,
    deleteUser,
    authenticate,
    addRole,
    updateRole,
    deleteRole
  };
}
