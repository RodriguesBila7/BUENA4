import { useState, useEffect, useCallback } from 'react';

async function api(method, path, body) {
  const res = await fetch(`/api/effectiveness${path}`, {
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

export default function useEffectivenessData() {
  const [records, setRecords] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const data = await api('GET', '/');
      setRecords(data);
    } catch (e) {
      console.error('[useEffectivenessData] Erro ao carregar:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateId = () => 'eff_' + Date.now().toString(36);

  const addRecord = async (recordData) => {
    try {
      const id = generateId();
      await api('POST', '/', { ...recordData, id, createdAt: new Date().toISOString() });
      await fetchData();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const updateRecord = async (id, updates) => {
    try {
      await api('PUT', `/${id}`, { ...updates, id, updatedAt: new Date().toISOString() });
      await fetchData();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const deleteRecord = async (id) => {
    try {
      await api('DELETE', `/${id}`);
      await fetchData();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  return {
    records,
    addRecord,
    updateRecord,
    deleteRecord
  };
}
