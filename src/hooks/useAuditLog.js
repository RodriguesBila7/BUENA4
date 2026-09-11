import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFallbackAudit, saveFallbackAudit } from '../services/storageFallback';

async function api(method, path, body) {
  const res = await fetch(`/api/audit${path}`, {
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

export default function useAuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState(() => getFallbackAudit());

  const fetchLogs = useCallback(async () => {
    try {
      const data = await api('GET', '/');
      setLogs(data);
      saveFallbackAudit(data);
    } catch (e) {
      setLogs(getFallbackAudit());
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const logAction = useCallback(async (action, module, details = '') => {
    const username = user?.username || 'Sistema';
    const newLog = {
      id: 'log_' + Date.now(),
      user: username,
      action,
      module,
      details,
      created_at: new Date().toISOString()
    };
    try {
      await api('POST', '/', { user: username, action, module, details });
      await fetchLogs();
    } catch (e) {
      const current = getFallbackAudit();
      const updated = [newLog, ...current.slice(0, 99)];
      saveFallbackAudit(updated);
      setLogs(updated);
    }
  }, [user, fetchLogs]);

  const clearLogs = useCallback(async () => {
    console.warn("Audit logs cannot be cleared via API for security reasons.");
  }, []);

  return {
    logs,
    logAction,
    clearLogs
  };
}
