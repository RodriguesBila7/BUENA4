import { useState, useEffect, useCallback } from 'react';
import { getFallbackActTypes, saveFallbackActTypes } from '../services/storageFallback';
import { safeApiCall } from '../services/apiClient';

export default function useActTypesData() {
  const [actTypes, setActTypes] = useState(() => getFallbackActTypes());
  const [loading, setLoading] = useState(true);

  const fetchActTypes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await safeApiCall('/api/act-types');
      if (Array.isArray(data)) {
        setActTypes(data);
        saveFallbackActTypes(data);
      } else {
        setActTypes(getFallbackActTypes());
      }
    } catch (e) {
      console.warn('[useActTypesData] API indisponível, a usar tipos de actos de demonstração...');
      setActTypes(getFallbackActTypes());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActTypes();
  }, [fetchActTypes]);

  const addActType = async (actTypeData) => {
    try {
      await safeApiCall('/api/act-types', {
        method: 'POST',
        body: actTypeData
      });
      await fetchActTypes();
      return { success: true };
    } catch (e) {
      const current = getFallbackActTypes();
      const id = 'act_type_' + Date.now();
      const updated = [...current, { ...actTypeData, id }];
      saveFallbackActTypes(updated);
      setActTypes(updated);
      return { success: true };
    }
  };

  const updateActType = async (id, actTypeData) => {
    try {
      await safeApiCall(`/api/act-types/${id}`, {
        method: 'PUT',
        body: actTypeData
      });
      await fetchActTypes();
      return { success: true };
    } catch (e) {
      const current = getFallbackActTypes();
      const updated = current.map(item => item.id === id ? { ...item, ...actTypeData } : item);
      saveFallbackActTypes(updated);
      setActTypes(updated);
      return { success: true };
    }
  };

  const deleteActType = async (id) => {
    try {
      await safeApiCall(`/api/act-types/${id}`, { method: 'DELETE' });
      await fetchActTypes();
      return { success: true };
    } catch (e) {
      const current = getFallbackActTypes();
      const updated = current.filter(item => item.id !== id);
      saveFallbackActTypes(updated);
      setActTypes(updated);
      return { success: true };
    }
  };

  return { actTypes, loading, fetchActTypes, addActType, updateActType, deleteActType };
}
