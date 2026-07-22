import { useState, useEffect, useMemo, useCallback } from 'react';

async function api(method, path, body) {
  const res = await fetch(`/api/admin-acts${path}`, {
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

export default function useAdminActsData() {
  const [acts, setActs] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const data = await api('GET', '/');
      setActs(data);
    } catch (e) {
      console.error('[useAdminActsData] Erro ao carregar:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addAct = async (actData) => {
    try {
      const id = 'act_' + Date.now();
      await api('POST', '/', { ...actData, id });
      await fetchData();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const registerAct = async (actData) => {
    try {
      const result = await api('POST', '/register', actData);
      await fetchData();
      return result;
    } catch (e) { return { success: false, error: e.message }; }
  };

  const confirmAct = async (actId) => {
    try {
      const result = await api('POST', `/confirm/${actId}`);
      await fetchData();
      return result;
    } catch (e) { return { success: false, error: e.message }; }
  };

  const fetchHistory = async (employeeId) => {
    try {
      return await api('GET', `/history/${employeeId}`);
    } catch (e) { 
      console.error(e);
      return []; 
    }
  };

  const updateAct = async (id, actData) => {
    try {
      await api('PUT', `/${id}`, actData);
      await fetchData();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const deleteAct = async (id) => {
    try {
      await api('DELETE', `/${id}`);
      await fetchData();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const stats = useMemo(() => {
    const total = acts.length;
    const promotions = acts.filter(a => a.type === 'promotion').length;
    const progressions = acts.filter(a => a.type === 'progression').length;
    const careerChanges = acts.filter(a => a.type === 'career_change').length;
    const retirements = acts.filter(a => a.type === 'retirement').length;
    const healthIssues = acts.filter(a => a.type === 'health_leave' || a.type === 'death').length;

    // By Province
    const byProvince = {};
    acts.forEach(a => {
      const p = a.province || 'Desconhecida';
      byProvince[p] = (byProvince[p] || 0) + 1;
    });

    const provinceData = Object.keys(byProvince).map(key => ({
      name: key,
      value: byProvince[key]
    })).sort((a, b) => b.value - a.value);

    // Temporal (By Month for the current year, e.g., 2026)
    const byMonth = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    monthNames.forEach(m => byMonth[m] = 0);

    acts.forEach(a => {
      if (!a.date) return;
      const d = new Date(a.date);
      if (d.getFullYear() === new Date().getFullYear()) {
        const monthIndex = d.getMonth();
        byMonth[monthNames[monthIndex]] += 1;
      }
    });

    const monthlyData = monthNames.map(m => ({
      name: m,
      Atos: byMonth[m]
    }));

    return {
      total,
      promotions,
      progressions,
      careerChanges,
      retirements,
      healthIssues,
      provinceData,
      monthlyData
    };
  }, [acts]);

  return {
    acts,
    stats,
    addAct,
    registerAct,
    confirmAct,
    fetchHistory,
    updateAct,
    deleteAct,
    fetchData
  };
}
