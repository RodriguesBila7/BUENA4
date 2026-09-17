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

// Cache em memoria
let _usersCache = null;
let _rolesCache = null;
const _listeners = new Set();

function notifyAll(users, roles) {
  _usersCache = users;
  _rolesCache = roles;
  _listeners.forEach(fn => fn(users, roles));
}

async function api(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(`/api/auth${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchData() {
  try {
    const [u, r] = await Promise.all([
      api('GET', '/users'),
      api('GET', '/roles')
    ]);
    notifyAll(u, r);
  } catch (e) {
    console.warn('[useAuthData] API indisponível, a utilizar dados locais de fallback...');
    const u = getFallbackUsers();
    const r = getFallbackRoles();
    notifyAll(u, r);
  }
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

  const authenticate = useCallback(async (username, password, policies) => {
    try {
      const res = await api('POST', '/login', { username, password });
      return { success: true, user: { ...res.user, roleDetails: res.user.permissions ? { permissions: res.user.permissions } : null } };
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        const offlineCheck = authenticateOffline(username, password);
        if (offlineCheck && offlineCheck.success) return offlineCheck;
        return { success: false, error: 'Credenciais inválidas. Verifique o utilizador ou a palavra-passe.' };
      }
      return authenticateOffline(username, password);
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
