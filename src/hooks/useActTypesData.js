import { useState, useEffect, useCallback } from 'react';

export default function useActTypesData() {
  const [actTypes, setActTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActTypes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/act-types');
      if (res.ok) {
        const data = await res.json();
        setActTypes(data);
      }
    } catch (e) {
      console.error('[useActTypesData] Erro ao carregar:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActTypes();
  }, [fetchActTypes]);

  const addActType = async (actTypeData) => {
    try {
      const res = await fetch('/api/act-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actTypeData)
      });
      if (res.ok) {
        await fetchActTypes();
        return { success: true };
      }
      return { success: false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const updateActType = async (id, actTypeData) => {
    try {
      const res = await fetch(`/api/act-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actTypeData)
      });
      if (res.ok) {
        await fetchActTypes();
        return { success: true };
      }
      return { success: false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const deleteActType = async (id) => {
    try {
      const res = await fetch(`/api/act-types/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchActTypes();
        return { success: true };
      }
      return { success: false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  return { actTypes, loading, fetchActTypes, addActType, updateActType, deleteActType };
}
