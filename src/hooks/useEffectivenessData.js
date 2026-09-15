import { useState, useEffect, useCallback } from 'react';
import { getFallbackEffectiveness, saveFallbackEffectiveness } from '../services/storageFallback';

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
  const [records, setRecords] = useState(() => getFallbackEffectiveness());

  const fetchData = useCallback(async () => {
    try {
      const data = await api('GET', '/');
      setRecords(data);
      saveFallbackEffectiveness(data);
    } catch (e) {
      console.warn('[useEffectivenessData] API indisponível, a carregar dados locais...');
      setRecords(getFallbackEffectiveness());
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateId = () => 'eff_' + Date.now().toString(36);

  const addRecord = async (recordData) => {
    const id = generateId();
    try {
      await api('POST', '/', { ...recordData, id, createdAt: new Date().toISOString() });
      await fetchData();
      return { success: true };
    } catch (e) {
      const current = getFallbackEffectiveness();
      const updated = [{ ...recordData, id, createdAt: new Date().toISOString() }, ...current];
      saveFallbackEffectiveness(updated);
      setRecords(updated);
      return { success: true };
    }
  };

  const updateRecord = async (id, updates) => {
    try {
      const current = records.find(r => r.id === id) || {};
      const fullPayload = { ...current, ...updates, id, updatedAt: new Date().toISOString() };
      await api('PUT', `/${id}`, fullPayload);
      await fetchData();
      return { success: true };
    } catch (e) {
      const current = getFallbackEffectiveness();
      const updated = current.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r);
      saveFallbackEffectiveness(updated);
      setRecords(updated);
      return { success: true };
    }
  };

  const deleteRecord = async (id) => {
    try {
      await api('DELETE', `/${id}`);
      await fetchData();
      return { success: true };
    } catch (e) {
      const current = getFallbackEffectiveness();
      const updated = current.filter(r => r.id !== id);
      saveFallbackEffectiveness(updated);
      setRecords(updated);
      return { success: true };
    }
  };

  const deleteEmployeeAbsences = async (employeeId) => {
    try {
      const toDelete = records.filter(r => String(r.employeeId) === String(employeeId));
      for (const rec of toDelete) {
        await api('DELETE', `/${rec.id}`).catch(() => {});
      }
      await fetchData();
      return { success: true };
    } catch (e) {
      const current = getFallbackEffectiveness();
      const updated = current.filter(r => String(r.employeeId) !== String(employeeId));
      saveFallbackEffectiveness(updated);
      setRecords(updated);
      return { success: true };
    }
  };

  return {
    records,
    fetchData,
    addRecord,
    updateRecord,
    deleteRecord,
    deleteEmployeeAbsences
  };
}
