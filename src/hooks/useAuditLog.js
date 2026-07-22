import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

async function api(method, path, body) {
  const res = await fetch(`/api/audit${path}`, {
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

export default function useAuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await api('GET', '/');
      setLogs(data);
    } catch (e) {
      console.error('[useAuditLog] Erro ao carregar:', e);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const logAction = useCallback(async (action, module, details = '') => {
    const username = user?.username || 'Sistema';
    try {
      await api('POST', '/', { user: username, action, module, details });
      await fetchLogs();
    } catch (e) {
      console.error('[useAuditLog] Erro ao gravar log:', e);
    }
  }, [user, fetchLogs]);

  const clearLogs = useCallback(async () => {
    // Audit router currently doesn't implement DELETE /api/audit to clear logs.
    // For a real system we shouldn't allow clearing audit logs.
    // So this is a no-op or we could implement it if required.
    console.warn("Audit logs cannot be cleared via API for security reasons.");
  }, []);

  return {
    logs,
    logAction,
    clearLogs
  };
}
