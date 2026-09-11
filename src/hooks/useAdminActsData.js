import { useState, useEffect, useMemo, useCallback } from 'react';
import { getFallbackAdminActs, saveFallbackAdminActs } from '../services/storageFallback';

async function api(method, path, body) {
  let isSecondary = false;
  let userRole = '';
  try {
    const savedUser = localStorage.getItem('sernic_logged_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      userRole = parsed?.roleId || parsed?.role || '';
      if (parsed?.delegatedRoleId) {
        if (parsed.isSecondaryActive || parsed.activeRole === parsed.delegatedRoleId || parsed.roleId === parsed.delegatedRoleId) {
          isSecondary = true;
        }
      }
      if (userRole === 'usuario_normal' || userRole === 'usuario') {
        isSecondary = true;
      }
    }
  } catch (e) {}

  const res = await fetch(`/api/admin-acts${path}`, {
    method,
    headers: { 
      'Content-Type': 'application/json',
      'X-Is-Secondary': isSecondary ? 'true' : 'false',
      'X-User-Role': userRole
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
  const [acts, setActs] = useState(() => getFallbackAdminActs());

  const fetchData = useCallback(async () => {
    try {
      const data = await api('GET', '/');
      setActs(data);
      saveFallbackAdminActs(data);
    } catch (e) {
      console.warn('[useAdminActsData] API indisponível, a carregar actos administrativos locais...');
      setActs(getFallbackAdminActs());
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
    } catch (e) {
      const current = getFallbackAdminActs();
      const id = 'act_' + Date.now();
      const updated = [{ ...actData, id, createdAt: new Date().toISOString() }, ...current];
      saveFallbackAdminActs(updated);
      setActs(updated);
      return { success: true };
    }
  };

  const registerAct = async (actData) => {
    try {
      const result = await api('POST', '/register', actData);
      await fetchData();
      return result;
    } catch (e) {
      const current = getFallbackAdminActs();
      const id = 'act_' + Date.now();
      const newAct = { ...actData, id, status: 'Pendente', createdAt: new Date().toISOString() };
      const updated = [newAct, ...current];
      saveFallbackAdminActs(updated);
      setActs(updated);
      return { success: true, act: newAct };
    }
  };

  const confirmAct = async (actId) => {
    try {
      const result = await api('POST', `/confirm/${actId}`);
      await fetchData();
      return result;
    } catch (e) {
      const current = getFallbackAdminActs();
      const updated = current.map(a => a.id === actId ? { ...a, status: 'Aprovado', confirmedAt: new Date().toISOString() } : a);
      saveFallbackAdminActs(updated);
      setActs(updated);
      return { success: true };
    }
  };

  const fetchHistory = async (employeeId) => {
    try {
      return await api('GET', `/history/${employeeId}`);
    } catch (e) { 
      const current = getFallbackAdminActs();
      return current.filter(a => a.employeeId === employeeId);
    }
  };

  const updateAct = async (id, actData) => {
    try {
      await api('PUT', `/${id}`, actData);
      await fetchData();
      return { success: true };
    } catch (e) {
      const current = getFallbackAdminActs();
      const updated = current.map(a => a.id === id ? { ...a, ...actData } : a);
      saveFallbackAdminActs(updated);
      setActs(updated);
      return { success: true };
    }
  };

  const deleteAct = async (id) => {
    try {
      await api('DELETE', `/${id}`);
      await fetchData();
      return { success: true };
    } catch (e) {
      const current = getFallbackAdminActs();
      const updated = current.filter(a => a.id !== id);
      saveFallbackAdminActs(updated);
      setActs(updated);
      return { success: true };
    }
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
