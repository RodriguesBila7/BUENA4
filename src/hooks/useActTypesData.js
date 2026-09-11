import { useState, useEffect, useCallback } from 'react';
import { getFallbackActTypes, saveFallbackActTypes } from '../services/storageFallback';

export default function useActTypesData() {
  const [actTypes, setActTypes] = useState(() => getFallbackActTypes());
  const [loading, setLoading] = useState(true);

  const fetchActTypes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/act-types');
      if (res.ok) {
        const data = await res.json();
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
      const res = await fetch('/api/act-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actTypeData)
      });
      if (res.ok) {
        await fetchActTypes();
        return { success: true };
      }
      throw new Error('Falha ao gravar tipo de acto');
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
      const res = await fetch(`/api/act-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actTypeData)
      });
      if (res.ok) {
        await fetchActTypes();
        return { success: true };
      }
      throw new Error('Falha ao atualizar tipo de acto');
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
      const res = await fetch(`/api/act-types/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchActTypes();
        return { success: true };
      }
      throw new Error('Falha ao eliminar tipo de acto');
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
