/**
 * src/hooks/useEmployeeData.js
 * Hook de dados de Funcionarios — usa a API REST (SQLite backend)
 * com fallback transparente para localStorage quando executado na Vercel ou modo offline.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useOrgData from './useOrgData';
import { filterByProvincialScope } from '../utils/scopeUtils';
import { getFallbackEmployees, saveFallbackEmployees } from '../services/storageFallback';

let _cache = null;
const _listeners = new Set();

function notifyAll(data) {
  _cache = data;
  _listeners.forEach(fn => fn(data));
}

async function apiFetch(method, path, body) {
  const res = await fetch(`/api/employees${path}`, {
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

async function fetchEmployees() {
  try {
    const data = await apiFetch('GET', '/');
    notifyAll(data);
    saveFallbackEmployees(data);
    return data;
  } catch (e) {
    console.warn('[useEmployeeData] API indisponível, a carregar dados locais de demonstração...');
    const fallback = getFallbackEmployees();
    notifyAll(fallback);
    return fallback;
  }
}

const _id = () => `emp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2,6)}`;

export default function useEmployeeData() {
  const { user: currentUser } = useAuth();
  const { data: orgData } = useOrgData();
  const [employeesRaw, setLocalEmployees] = useState(_cache || getFallbackEmployees());

  useEffect(() => {
    const listener = data => setLocalEmployees(data);
    _listeners.add(listener);
    if (!_cache) fetchEmployees();
    return () => _listeners.delete(listener);
  }, []);

  // Filtrar por utilizador segundo escopo Central vs Provincial (inclui Direcções Distritais)
  const employees = useMemo(() => {
    if (!currentUser) return employeesRaw;
    return filterByProvincialScope(employeesRaw, currentUser, orgData);
  }, [employeesRaw, currentUser, orgData]);

  const addEmployee = useCallback(async (empData) => {
    const id = empData.id || _id();
    try {
      await apiFetch('POST', '/', { ...empData, id });
      await fetchEmployees();
      return { success: true, employee: { ...empData, id } };
    } catch (e) {
      if (e.message === 'nip_duplicate') return { success: false, error: 'nip_duplicate' };
      const current = getFallbackEmployees();
      if (empData.nip && current.some(item => item.nip === empData.nip)) {
        return { success: false, error: 'nip_duplicate' };
      }
      const newEmp = {
        ...empData,
        id,
        isActive: true,
        status: empData.status || 'Ativo',
        createdAt: new Date().toISOString()
      };
      const updated = [newEmp, ...current];
      saveFallbackEmployees(updated);
      notifyAll(updated);
      return { success: true, employee: newEmp };
    }
  }, []);

  const updateEmployee = useCallback(async (id, empData) => {
    try {
      await apiFetch('PUT', `/${id}`, { ...empData, id });
      await fetchEmployees();
      return { success: true };
    } catch (e) {
      if (e.message === 'nip_duplicate') return { success: false, error: 'nip_duplicate' };
      const current = getFallbackEmployees();
      if (empData.nip && current.some(item => item.id !== id && item.nip === empData.nip)) {
        return { success: false, error: 'nip_duplicate' };
      }
      const updated = current.map(item => item.id === id ? { ...item, ...empData, updatedAt: new Date().toISOString() } : item);
      saveFallbackEmployees(updated);
      notifyAll(updated);
      return { success: true };
    }
  }, []);

  const deleteEmployee = useCallback(async (id) => {
    try {
      await apiFetch('DELETE', `/${id}`);
      await fetchEmployees();
      return { success: true };
    } catch (e) {
      const current = getFallbackEmployees();
      const updated = current.map(item => item.id === id ? { ...item, isActive: false, status: 'Inativo' } : item);
      saveFallbackEmployees(updated);
      notifyAll(updated);
      return { success: true };
    }
  }, []);

  const permanentDeleteEmployee = useCallback(async (id) => {
    try {
      await apiFetch('DELETE', `/${id}/permanent`);
      await fetchEmployees();
      return { success: true };
    } catch (e) {
      const current = getFallbackEmployees();
      const updated = current.filter(item => item.id !== id);
      saveFallbackEmployees(updated);
      notifyAll(updated);
      return { success: true };
    }
  }, []);

  const restoreEmployee = useCallback(async (id) => {
    try {
      await apiFetch('PUT', `/${id}/restore`);
      await fetchEmployees();
      return { success: true };
    } catch (e) {
      const current = getFallbackEmployees();
      const updated = current.map(item => item.id === id ? { ...item, isActive: true, status: 'Ativo' } : item);
      saveFallbackEmployees(updated);
      notifyAll(updated);
      return { success: true };
    }
  }, []);

  const bulkAddEmployees = useCallback(async (empArray) => {
    try {
      const result = await apiFetch('POST', '/bulk', { employees: empArray });
      if (result.added > 0) await fetchEmployees();
      return { success: result.errors.length === 0, added: result.added, errors: result.errors };
    } catch (e) {
      const current = getFallbackEmployees();
      const created = [];
      for (const item of empArray) {
        const id = item.id || _id();
        created.push({ ...item, id, isActive: true, status: item.status || 'Ativo' });
      }
      const updated = [...created, ...current];
      saveFallbackEmployees(updated);
      notifyAll(updated);
      return { success: true, added: created.length, errors: [] };
    }
  }, []);

  const restoreEmployeeBackupData = useCallback(async (payload) => {
    try {
      await apiFetch('POST', '/migrate', { employees: payload.data?.employees || [] });
      await fetchEmployees();
      return true;
    } catch (e) {
      const emps = payload.data?.employees || [];
      if (emps.length > 0) {
        saveFallbackEmployees(emps);
        notifyAll(emps);
        return true;
      }
      return false;
    }
  }, []);

  return {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    permanentDeleteEmployee,
    restoreEmployee,
    bulkAddEmployees,
    restoreEmployeeBackupData,
    refreshEmployees: fetchEmployees,
  };
}
