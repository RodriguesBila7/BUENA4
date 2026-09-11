import { useState, useEffect, useCallback } from 'react';
import { EVALUATION_STATES } from '../utils/evaluationRules';
import { getFallbackEvaluations, saveFallbackEvaluations } from '../services/storageFallback';

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const savedUser = localStorage.getItem('sernic_logged_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.id) headers['x-user-id'] = user.id;
      if (user.roleId || user.role) headers['x-user-role'] = user.roleId || user.role;
      if (user.delegatedRoleId) headers['x-delegated-role'] = user.delegatedRoleId;
      if (user.directorateId) headers['x-directorate-id'] = user.directorateId;
    }
  } catch {
    // Ignore error
  }
  return headers;
}

async function api(method, path, body) {
  const res = await fetch(`/api/evaluations${path}`, {
    method,
    headers: getAuthHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || res.statusText);
  }
  return res.json();
}

export default function useEvaluationData() {
  const [evaluations, setEvaluations] = useState(() => getFallbackEvaluations());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api('GET', '/');
      const list = Array.isArray(data) ? data : [];
      setEvaluations(list);
      saveFallbackEvaluations(list);
    } catch (e) {
      console.warn('[useEvaluationData] API indisponível, a carregar dados locais...');
      setEvaluations(getFallbackEvaluations());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addEvaluation = async (record) => {
    const existing = (evaluations || []).find(
      e => e && String(e.employeeId) === String(record.employeeId) && String(e.year) === String(record.year)
    );
    if (existing) {
      throw new Error(`O funcionário já possui uma avaliação registada no ano de ${record.year}.`);
    }
    
    const id = crypto.randomUUID ? crypto.randomUUID() : 'eval_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: record.status || EVALUATION_STATES.EVALUATED
    };

    try {
      await api('POST', '/', newRecord);
      await fetchData();
    } catch (e) {
      const current = getFallbackEvaluations();
      const updated = [newRecord, ...current];
      saveFallbackEvaluations(updated);
      setEvaluations(updated);
    }
    return newRecord;
  };

  const updateEvaluation = async (id, updates) => {
    try {
      await api('PUT', `/${id}`, { ...updates, id, updatedAt: new Date().toISOString() });
      await fetchData();
    } catch (e) {
      const current = getFallbackEvaluations();
      const updated = current.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item);
      saveFallbackEvaluations(updated);
      setEvaluations(updated);
    }
  };

  const removeEvaluation = async (id) => {
    try {
      await api('DELETE', `/${id}`);
      await fetchData();
    } catch (e) {
      const current = getFallbackEvaluations();
      const updated = current.filter(item => item.id !== id);
      saveFallbackEvaluations(updated);
      setEvaluations(updated);
    }
  };

  const getLatestEvaluation = (employeeId) => {
    if (!employeeId) return null;
    const empEvals = (evaluations || []).filter(e => e && String(e.employeeId) === String(employeeId));
    if (empEvals.length === 0) return null;
    return empEvals.sort((a, b) => (parseInt(b.year || 0) - parseInt(a.year || 0)))[0];
  };

  return {
    evaluations: Array.isArray(evaluations) ? evaluations : [],
    loading,
    error,
    addEvaluation,
    updateEvaluation,
    removeEvaluation,
    getLatestEvaluation,
    refreshEvaluations: fetchData
  };
}
