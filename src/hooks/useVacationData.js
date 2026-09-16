import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'buena3_vacations_data';
const EVENT_KEY = 'buena3_vacations_updated';

const getInitialVacations = () => {
  const now = new Date();
  const formatD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const ongoingStart = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
  const ongoingEnd = new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000);

  const endingSoonStart = new Date(now.getTime() - 26 * 24 * 60 * 60 * 1000);
  const endingSoonEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const scheduledStart = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const scheduledEnd = new Date(now.getTime() + 44 * 24 * 60 * 60 * 1000);

  const completedStart = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
  const completedEnd = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  const curYear = String(now.getFullYear());

  return [
    {
      id: `VAC-${curYear}-001`,
      employeeId: 'EMP001',
      employeeNip: '1001',
      employeeName: 'João da Silva',
      year: curYear,
      type: 'Férias Anuais',
      startDate: formatD(ongoingStart),
      endDate: formatD(ongoingEnd),
      daysCount: 30,
      status: 'Em gozo',
      reason: 'Férias anuais regulares',
      notes: 'Plano aprovado pela Direcção',
      createdBy: 'Admin RH',
      createdAt: ongoingStart.toISOString(),
      updatedAt: now.toISOString(),
      history: [
        { action: 'Submetida', date: ongoingStart.toISOString(), user: 'João da Silva', notes: '' },
        { action: 'Aprovada', date: ongoingStart.toISOString(), user: 'Admin RH', notes: 'Aprovado pelo RH' },
        { action: 'Em gozo', date: ongoingStart.toISOString(), user: 'Sistema', notes: 'Início do gozo de férias' }
      ]
    },
    {
      id: `VAC-${curYear}-002`,
      employeeId: 'EMP002',
      employeeNip: '1002',
      employeeName: 'Maria Antónia Santos',
      year: curYear,
      type: 'Férias Anuais',
      startDate: formatD(endingSoonStart),
      endDate: formatD(endingSoonEnd),
      daysCount: 30,
      status: 'Em gozo',
      reason: 'Férias regulares',
      notes: 'Atenção: Término próximo em menos de 5 dias',
      createdBy: 'Admin RH',
      createdAt: endingSoonStart.toISOString(),
      updatedAt: now.toISOString(),
      history: [
        { action: 'Submetida', date: endingSoonStart.toISOString(), user: 'Maria Antónia Santos', notes: '' },
        { action: 'Aprovada', date: endingSoonStart.toISOString(), user: 'Admin RH', notes: 'Validado' },
        { action: 'Em gozo', date: endingSoonStart.toISOString(), user: 'Sistema', notes: 'Em curso' }
      ]
    },
    {
      id: `VAC-${curYear}-003`,
      employeeId: 'EMP003',
      employeeNip: '1003',
      employeeName: 'Carlos Alberto Mondlane',
      year: curYear,
      type: 'Férias Anuais',
      startDate: formatD(scheduledStart),
      endDate: formatD(scheduledEnd),
      daysCount: 30,
      status: 'Aprovada',
      reason: 'Férias programadas',
      notes: 'Aguardando data de início',
      createdBy: 'Admin RH',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      history: [
        { action: 'Submetida', date: now.toISOString(), user: 'Carlos Alberto Mondlane', notes: '' },
        { action: 'Aprovada', date: now.toISOString(), user: 'Admin RH', notes: 'Aprovado' }
      ]
    },
    {
      id: `VAC-${curYear}-004`,
      employeeId: 'EMP004',
      employeeNip: '1004',
      employeeName: 'Ana Paula Cossa',
      year: curYear,
      type: 'Férias Anuais',
      startDate: formatD(completedStart),
      endDate: formatD(completedEnd),
      daysCount: 30,
      status: 'Concluída',
      reason: 'Férias anuais já gozadas',
      notes: 'Regresso ao serviço confirmado',
      createdBy: 'Admin RH',
      createdAt: completedStart.toISOString(),
      updatedAt: completedEnd.toISOString(),
      history: [
        { action: 'Submetida', date: completedStart.toISOString(), user: 'Ana Paula Cossa', notes: '' },
        { action: 'Aprovada', date: completedStart.toISOString(), user: 'Admin RH', notes: 'Aprovado' },
        { action: 'Concluída', date: completedEnd.toISOString(), user: 'Sistema', notes: 'Período encerrado' }
      ]
    }
  ];
};

const initialSettings = {
  annualDays: 30,
  minMonthsForEligibility: 12,
  allowAccumulation: true,
  maxAccumulatedDays: 60,
  approvalFlow: ['Chefe Direto', 'Direção', 'Recursos Humanos'],
  holidayOffset: true
};

let _sharedRequests = null;
let _sharedSettings = initialSettings;
const _subscribers = new Set();

const loadStoredData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      _sharedRequests = parsed.requests || [];
      _sharedSettings = parsed.settings || initialSettings;
    } else {
      _sharedRequests = getInitialVacations();
      _sharedSettings = initialSettings;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ requests: _sharedRequests, settings: _sharedSettings }));
    }
  } catch (e) {
    _sharedRequests = getInitialVacations();
    _sharedSettings = initialSettings;
  }
  return { requests: _sharedRequests, settings: _sharedSettings };
};

const persistAndBroadcast = (requests, settings) => {
  _sharedRequests = requests;
  _sharedSettings = settings;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ requests, settings }));
  } catch (e) {
    console.warn(e);
  }
  _subscribers.forEach(cb => cb({ requests, settings }));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { requests, settings } }));
  }
};

export default function useVacationData() {
  const [data, setData] = useState(() => {
    if (_sharedRequests) return { requests: _sharedRequests, settings: _sharedSettings };
    return loadStoredData();
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleUpdate = (updated) => {
      setData({ requests: updated.requests, settings: updated.settings });
    };

    _subscribers.add(handleUpdate);

    const handleCustomEvent = (e) => {
      if (e.detail) {
        setData({ requests: e.detail.requests, settings: e.detail.settings });
      }
    };

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        const freshlyLoaded = loadStoredData();
        _subscribers.forEach(cb => cb(freshlyLoaded));
      }
    };

    window.addEventListener(EVENT_KEY, handleCustomEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      _subscribers.delete(handleUpdate);
      window.removeEventListener(EVENT_KEY, handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const addRequest = useCallback(async (payload) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cur = _sharedRequests || loadStoredData().requests;
        const newRequest = {
          ...payload,
          id: `VAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          status: payload.status || 'Submetida',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: [{ action: 'Submetida', date: new Date().toISOString(), user: payload.createdBy || 'Sistema', notes: payload.notes || '' }]
        };
        const updated = [newRequest, ...cur];
        persistAndBroadcast(updated, _sharedSettings);
        resolve({ success: true, data: newRequest });
      }, 200);
    });
  }, []);

  const updateRequestStatus = useCallback(async (id, newStatus, user, notes = '') => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cur = _sharedRequests || loadStoredData().requests;
        const updated = cur.map(req => {
          if (req.id === id) {
            return {
              ...req,
              status: newStatus,
              updatedAt: new Date().toISOString(),
              history: [...(req.history || []), { action: newStatus, date: new Date().toISOString(), user, notes }]
            };
          }
          return req;
        });
        persistAndBroadcast(updated, _sharedSettings);
        resolve({ success: true });
      }, 200);
    });
  }, []);

  const updateRequest = useCallback(async (id, changes, user, reason) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cur = _sharedRequests || loadStoredData().requests;
        const updated = cur.map(req => {
          if (req.id === id) {
            return {
              ...req,
              ...changes,
              updatedAt: new Date().toISOString(),
              history: [...(req.history || []), { action: 'Alteração', date: new Date().toISOString(), user: user || 'Sistema', notes: reason || '' }]
            };
          }
          return req;
        });
        persistAndBroadcast(updated, _sharedSettings);
        resolve({ success: true });
      }, 200);
    });
  }, []);

  const cancelRequest = useCallback(async (id, user, reason) => {
    return updateRequestStatus(id, 'Cancelada', user, reason);
  }, [updateRequestStatus]);

  const removeRequest = useCallback(async (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cur = _sharedRequests || loadStoredData().requests;
        const updated = cur.filter(r => r.id !== id);
        persistAndBroadcast(updated, _sharedSettings);
        resolve({ success: true });
      }, 200);
    });
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updatedSets = { ..._sharedSettings, ...newSettings };
        persistAndBroadcast(_sharedRequests || [], updatedSets);
        resolve({ success: true });
      }, 200);
    });
  }, []);

  const calculateEmployeeBalance = useCallback((employeeId, admissionDate) => {
    const cur = _sharedRequests || [];
    let entitledDays = _sharedSettings.annualDays;
    if (admissionDate) {
      const adm = new Date(admissionDate);
      const now = new Date();
      const diffTime = Math.abs(now - adm);
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      if (diffMonths < _sharedSettings.minMonthsForEligibility) {
        entitledDays = diffMonths * (_sharedSettings.annualDays / 12);
      }
    }

    const currentYear = new Date().getFullYear().toString();
    const usedDays = cur
      .filter(r => r.employeeId === employeeId && r.year === currentYear && ['Submetida', 'Em análise', 'Aprovada', 'Em gozo', 'Concluída'].includes(r.status))
      .reduce((sum, req) => sum + (Number(req.daysCount) || 0), 0);

    return {
      entitled: Math.floor(entitledDays),
      used: usedDays,
      balance: Math.floor(entitledDays) - usedDays
    };
  }, []);

  return {
    requests: data.requests,
    settings: data.settings,
    isLoading,
    addRequest,
    updateRequestStatus,
    updateRequest,
    cancelRequest,
    removeRequest,
    updateSettings,
    calculateEmployeeBalance
  };
}
