import { useState, useEffect, useCallback } from 'react';
import { getFallbackDisciplinary, saveFallbackDisciplinary } from '../services/storageFallback';

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
    saveFallbackDisciplinary(data);
  } catch (e) {
    console.warn('[useDisciplinaryData] API indisponível, a carregar dados locais...');
    const fallback = getFallbackDisciplinary();
    notifyAll(fallback);
  }
}

export default function useDisciplinaryData() {
  const [processes, setLocalProcesses] = useState(_cache || getFallbackDisciplinary());

  useEffect(() => {
    const listener = (data) => setLocalProcesses(data);
    _listeners.add(listener);
    if (!_cache) fetchData();
    return () => _listeners.delete(listener);
  }, []);

  const generateId = () => 'proc_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  const addProcess = useCallback(async (processData) => {
    const id = generateId();
    try {
      await api('POST', '/', { ...processData, id, isActive: true, createdAt: new Date().toISOString() });
      await fetchData();
      return { success: true, process: { ...processData, id } };
    } catch (e) {
      const current = getFallbackDisciplinary();
      const newP = { ...processData, id, isActive: true, createdAt: new Date().toISOString() };
      const updated = [newP, ...current];
      saveFallbackDisciplinary(updated);
      notifyAll(updated);
      return { success: true, process: newP };
    }
  }, []);

  const updateProcess = useCallback(async (id, processData) => {
    try {
      await api('PUT', `/${id}`, { ...processData, id, updatedAt: new Date().toISOString() });
      await fetchData();
      return { success: true };
    } catch (e) {
      const current = getFallbackDisciplinary();
      const updated = current.map(p => p.id === id ? { ...p, ...processData, updatedAt: new Date().toISOString() } : p);
      saveFallbackDisciplinary(updated);
      notifyAll(updated);
      return { success: true };
    }
  }, []);

  const deleteProcess = useCallback(async (id) => {
    try {
      await api('DELETE', `/${id}`);
      await fetchData();
      return { success: true };
    } catch (e) {
      const current = getFallbackDisciplinary();
      const updated = current.filter(p => p.id !== id);
      saveFallbackDisciplinary(updated);
      notifyAll(updated);
      return { success: true };
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
      const current = getFallbackDisciplinary();
      const updated = current.filter(p => p.employeeId !== employeeId);
      saveFallbackDisciplinary(updated);
      notifyAll(updated);
      return { success: true };
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
    deleteProcessHistory,
    refreshProcesses: fetchData
  };
}
