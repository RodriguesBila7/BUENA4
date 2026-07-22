import { useState, useEffect, useCallback } from 'react';

let _cache = null;
const _listeners = new Set();

function notifyAll(data) {
  _cache = data;
  _listeners.forEach(fn => fn(data));
}

async function api(method, path, body) {
  const res = await fetch(`/api/disciplinary${path}`, {
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
    const data = await api('GET', '/');
    notifyAll(data);
  } catch (e) {
    console.error('[useDisciplinaryData] Erro ao carregar:', e);
    if (!_cache) notifyAll([]);
  }
}

export default function useDisciplinaryData() {
  const [processes, setLocalProcesses] = useState(_cache || []);

  useEffect(() => {
    const listener = (data) => setLocalProcesses(data);
    _listeners.add(listener);
    if (!_cache) fetchData();
    return () => _listeners.delete(listener);
  }, []);

  const generateId = () => 'proc_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  const addProcess = useCallback(async (processData) => {
    try {
      const id = generateId();
      await api('POST', '/', { ...processData, id, isActive: true, createdAt: new Date().toISOString() });
      await fetchData();
      return { success: true, process: { ...processData, id } };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  const updateProcess = useCallback(async (id, processData) => {
    try {
      await api('PUT', `/${id}`, { ...processData, id, updatedAt: new Date().toISOString() });
      await fetchData();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  const deleteProcess = useCallback(async (id) => {
    try {
      // Soft delete -> just mark inactive if wanted, but original code had a hard delete too?
      // Original code did: deleteProcess = (id) => filter(p !== id). We use hard delete.
      await api('DELETE', `/${id}`);
      await fetchData();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  const deleteProcessHistory = useCallback(async (employeeId) => {
    try {
      const toDelete = processes.filter(p => p.employeeId === employeeId);
      for (const p of toDelete) {
        await api('DELETE', `/${p.id}`);
      }
      await fetchData();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [processes]);

  const getAllActiveProcesses = () => processes.filter(p => p.isActive !== false);

  const getProcessesByEmployee = useCallback((employeeId) => {
    return processes.filter(p => p.employeeId === employeeId && p.isActive !== false);
  }, [processes]);

  return {
    processes: processes.filter(p => p.isActive !== false),
    getAllActiveProcesses,
    getProcessesByEmployee,
    addProcess,
    updateProcess,
    deleteProcess,
    deleteProcessHistory
  };
}
