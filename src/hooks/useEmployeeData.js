/**
 * src/hooks/useEmployeeData.js
 * Hook de dados de Funcionarios — usa a API REST (SQLite backend).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useOrgData from './useOrgData';
import { filterByProvincialScope } from '../utils/scopeUtils';

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
    return data;
  } catch (e) {
    console.error('[useEmployeeData] Erro ao carregar:', e);
    return _cache || [];
  }
}

const _id = () => `emp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2,6)}`;

export default function useEmployeeData() {
  const { user: currentUser } = useAuth();
  const { data: orgData } = useOrgData();
  const [employeesRaw, setLocalEmployees] = useState(_cache || []);

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
    try {
      const id = empData.id || _id();
      await apiFetch('POST', '/', { ...empData, id });
      await fetchEmployees();
      return { success: true, employee: { ...empData, id } };
    } catch (e) {
      if (e.message === 'nip_duplicate') return { success: false, error: 'nip_duplicate' };
      console.error('[addEmployee]', e);
      return { success: false, error: e.message };
    }
  }, []);

  const updateEmployee = useCallback(async (id, empData) => {
    try {
      await apiFetch('PUT', `/${id}`, { ...empData, id });
      await fetchEmployees();
      return { success: true };
    } catch (e) {
      if (e.message === 'nip_duplicate') return { success: false, error: 'nip_duplicate' };
      return { success: false, error: e.message };
    }
  }, []);

  const deleteEmployee = useCallback(async (id) => {
    try {
      await apiFetch('DELETE', `/${id}`);
      await fetchEmployees();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  const permanentDeleteEmployee = useCallback(async (id) => {
    try {
      await apiFetch('DELETE', `/${id}/permanent`);
      await fetchEmployees();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  const restoreEmployee = useCallback(async (id) => {
    try {
      await apiFetch('PUT', `/${id}/restore`);
      await fetchEmployees();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  const bulkAddEmployees = useCallback(async (empArray) => {
    try {
      const result = await apiFetch('POST', '/bulk', { employees: empArray });
      if (result.added > 0) await fetchEmployees();
      return { success: result.errors.length === 0, added: result.added, errors: result.errors };
    } catch (e) {
      return { success: false, added: 0, errors: [e.message] };
    }
  }, []);

  const restoreEmployeeBackupData = useCallback(async (payload) => {
    try {
      await apiFetch('POST', '/migrate', { employees: payload.data?.employees || [] });
      await fetchEmployees();
      return true;
    } catch (e) {
      console.error('[restoreEmployeeBackupData]', e);
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
