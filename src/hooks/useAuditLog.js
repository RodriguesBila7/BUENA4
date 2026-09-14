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

function safeString(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.name || val.username || val.action || val.title || JSON.stringify(val);
  }
  return String(val);
}

export default function useAuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState(() => getFallbackAudit());

  const fetchLogs = useCallback(async () => {
    try {
      const data = await api('GET', '/');
      if (Array.isArray(data)) {
        setLogs(data);
        saveFallbackAudit(data);
      }
    } catch (e) {
      setLogs(getFallbackAudit());
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const logAction = useCallback(async (...args) => {
    let act = 'Ação';
    let mod = 'Geral';
    let det = '';
    let usr = user?.username || user?.name || 'Sistema';
    let role = user?.role || user?.role_id || 'Utilizador';

    // Signature 1: logAction({ user, action, module, details })
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
      const param = args[0];
      act = safeString(param.action, 'Ação');
      mod = safeString(param.module, 'Geral');
      det = safeString(param.details, '');
      if (param.user) usr = safeString(param.user, usr);
    }
    // Signature 2: logAction(userObj, module, action, details)
    else if (args.length >= 3 && typeof args[0] === 'object' && args[0] !== null) {
      const userObj = args[0];
      usr = safeString(userObj.username || userObj.name || userObj.nuit, usr);
      role = safeString(userObj.role || userObj.role_id, role);
      mod = safeString(args[1], 'Geral');
      act = safeString(args[2], 'Ação');
      det = args[3] !== undefined ? safeString(args[3]) : '';
    }
    // Signature 3: logAction(action, module, details)
    else {
      act = safeString(args[0], 'Ação');
      mod = safeString(args[1], 'Geral');
      det = args[2] !== undefined ? safeString(args[2]) : '';
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const newLog = {
      id: 'log_' + Date.now(),
      user: usr,
      username: usr,
      role: role,
      action: act,
      module: mod,
      details: det,
      date: dateStr,
      time: timeStr,
      timestamp: `${dateStr} ${timeStr}`,
      result: 'Sucesso',
      created_at: now.toISOString()
    };

    try {
      await api('POST', '/', { user: usr, action: act, module: mod, details: det });
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
