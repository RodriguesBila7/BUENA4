import { useState, useEffect, useCallback } from 'react';
import { getFallbackSecurity, saveFallbackSecurity } from '../services/storageFallback';

async function api(method, path, body) {
  const res = await fetch(`/api/security${path}`, {
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

export default function useSecuritySettings() {
  const [policies, setPolicies] = useState(() => {
    const saved = getFallbackSecurity();
    return {
      sessionTimeoutMinutes: saved?.session_timeout_minutes || 30,
      loginMaxAttempts: saved?.max_login_attempts || 5,
      loginLockoutMinutes: saved?.lockout_duration_minutes || 15,
      passwordExpirationDays: saved?.password_expiry_days || 90,
      passwordMinLength: saved?.password_min_length || 6,
      minLength: saved?.password_min_length || 6,
      complexity: 'high',
      maxAttempts: saved?.max_login_attempts || 5,
      sessionTimeout: saved?.session_timeout_minutes || 30,
      force2FA: !!saved?.two_factor_auth,
      autoLogout: true,
      maxSessions: 1,
      multipleDevices: false,
      ...(saved || {})
    };
  });

  const fetchData = useCallback(async () => {
    try {
      const data = await api('GET', '/');
      if (Object.keys(data).length > 0) {
        setPolicies(prev => ({ ...prev, ...data }));
        saveFallbackSecurity(data);
      }
    } catch (e) {
      console.warn('[useSecuritySettings] Servidor offline, a usar configurações locais...');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updatePolicies = async (newPolicies) => {
    const updated = { ...policies, ...newPolicies };
    try {
      await api('PUT', '/', updated);
      setPolicies(updated);
      saveFallbackSecurity(updated);
      return { success: true };
    } catch (e) {
      setPolicies(updated);
      saveFallbackSecurity(updated);
      return { success: true };
    }
  };

  const validatePassword = (password) => {
    if (password.length < policies.passwordMinLength) {
      return { isValid: false, message: `A password deve ter pelo menos ${policies.passwordMinLength} caracteres.` };
    }
    return { isValid: true };
  };

  return {
    policies,
    updatePolicies,
    validatePassword
  };
}
