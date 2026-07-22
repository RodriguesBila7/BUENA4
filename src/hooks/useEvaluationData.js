import { useState, useEffect, useCallback } from 'react';
import { EVALUATION_STATES } from '../utils/evaluationRules';

async function api(method, path, body) {
  const res = await fetch(`/api/evaluations${path}`, {
    method,
    headers: { 
      'Content-Type': 'application/json',
      ...(localStorage.getItem('sernic_jwt_token') ? { 'Authorization': 'Bearer ' + localStorage.getItem('sernic_jwt_token') } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export default function useEvaluationData() {
  const [evaluations, setEvaluations] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const data = await api('GET', '/');
      setEvaluations(data);
    } catch (e) {
      console.error('[useEvaluationData] Erro ao carregar:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addEvaluation = async (record) => {
    const existing = evaluations.find(e => e.employeeId === record.employeeId && e.year === record.year);
    if (existing) {
      throw new Error(`O funcionario ja possui uma avaliacao registada no ano de ${record.year}.`);
    }
    
    const id = crypto.randomUUID();
    const newRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: EVALUATION_STATES.EVALUATED
    };

    await api('POST', '/', newRecord);
    await fetchData();
    return newRecord;
  };

  const updateEvaluation = async (id, updates) => {
    await api('PUT', `/${id}`, { ...updates, id });
    await fetchData();
  };

  const removeEvaluation = async (id) => {
    await api('DELETE', `/${id}`);
    await fetchData();
  };

  const getLatestEvaluation = (employeeId) => {
    const empEvals = evaluations.filter(e => e.employeeId === employeeId);
    if (empEvals.length === 0) return null;
    return empEvals.sort((a, b) => b.year - a.year)[0];
  };

  return {
    evaluations,
    addEvaluation,
    updateEvaluation,
    removeEvaluation,
    getLatestEvaluation
  };
}
