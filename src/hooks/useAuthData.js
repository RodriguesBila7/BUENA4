/**
 * src/hooks/useAuthData.js
 * Gestao de Utilizadores, Perfis (Roles) e Autenticacao via API REST (SQLite)
 */

import { useState, useEffect, useCallback } from 'react';

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
  const res = await fetch(`/api/auth${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function fetchData() {
  try {
    const [u, r] = await Promise.all([
      api('GET', '/users'),
      api('GET', '/roles')
    ]);
    notifyAll(u, r);
  } catch (e) {
    console.error('[useAuthData] Erro ao carregar dados:', e);
    if (!_usersCache) notifyAll([], []);
  }
}

export default function useAuthData() {
  const [users, setUsers] = useState(_usersCache || []);
  const [roles, setRoles] = useState(_rolesCache || []);

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
      return { success: false, error: e.message };
    }
  }, []);

  const updateUser = useCallback(async (id, userData) => {
    try {
      await api('PUT', `/users/${id}`, userData);
      await fetchData();
      return { success: true };
    } catch (e) {
      if (e.message === 'duplicate_username') return { success: false, error: 'O nome de utilizador ja existe.' };
      return { success: false, error: e.message };
    }
  }, []);

  const deleteUser = useCallback(async (id) => {
    try {
      await api('DELETE', `/users/${id}`);
      await fetchData();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  // ─── Autenticacao ───────────────────────────────────────────────────────
  const authenticate = useCallback(async (username, password, policies) => {
    try {
      const res = await api('POST', '/login', { username, password });
      return { success: true, user: { ...res.user, roleDetails: res.user.permissions ? { permissions: res.user.permissions } : null } };
    } catch (e) {
      if (e.message === 'invalid_credentials') return { success: false, error: 'Credenciais invalidas.' };
      return { success: false, error: e.message };
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
      return { success: false, error: e.message };
    }
  }, []);

  const updateRole = useCallback(async (id, roleData) => {
    try {
      await api('PUT', `/roles/${id}`, roleData);
      await fetchData();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  const deleteRole = useCallback(async (id) => {
    try {
      await api('DELETE', `/roles/${id}`);
      await fetchData();
      return { success: true };
    } catch (e) {
      if (e.message === 'has_users') return { success: false, error: 'Nao e possivel eliminar um perfil associado a utilizadores.' };
      return { success: false, error: e.message };
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
