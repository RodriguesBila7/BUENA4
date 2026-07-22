import { useState, useEffect, useCallback } from 'react';

async function api(method, path, body) {
  const res = await fetch(`/api/security${path}`, {
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

export default function useSecuritySettings() {
  const [policies, setPolicies] = useState({
    sessionTimeoutMinutes: 30, // minutos
    loginMaxAttempts: 5,
    loginLockoutMinutes: 15,
    passwordExpirationDays: 90,
    passwordMinLength: 6,
    minLength: 6,
    complexity: 'high',
    maxAttempts: 5,
    sessionTimeout: 30,
    force2FA: false,
    autoLogout: true,
    maxSessions: 1,
    multipleDevices: false
  });

  const fetchData = useCallback(async () => {
    try {
      const data = await api('GET', '/');
      if (Object.keys(data).length > 0) {
        // Map the new generic settings to the policies format expected by the app
        setPolicies(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error('[useSecuritySettings] Erro ao carregar:', e);
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
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
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

