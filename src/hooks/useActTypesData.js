import { useState, useEffect, useCallback } from 'react';

export default function useActTypesData() {
  const [actTypes, setActTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    ...(localStorage.getItem('sernic_jwt_token') ? { 'Authorization': 'Bearer ' + localStorage.getItem('sernic_jwt_token') } : {})
  });

  const fetchActTypes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/act-types', {
        headers: getAuthHeaders()
      });
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
      const res = await fetch(`/api/act-types/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
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

  return { actTypes, loading, fetchActTypes, addActType, updateActType, deleteActType };
}
