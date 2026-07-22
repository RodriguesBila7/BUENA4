import { useState, useEffect } from 'react';

// Chave para armazenar os dados no localStorage
const STORAGE_KEY = 'buena3_vacations_data';

// Dados iniciais de demonstração (se localStorage estiver vazio)
const initialVacations = [
  {
    id: 'VAC-2026-001',
    employeeId: 'EMP001',
    employeeNip: '1001',
    employeeName: 'João da Silva',
    year: '2026',
    type: 'Férias Anuais',
    startDate: '2026-08-01',
    endDate: '2026-08-30',
    daysCount: 30,
    status: 'Aprovada', // Rascunho, Submetida, Em análise, Aprovada, Rejeitada, Cancelada, Em gozo, Concluída
    reason: '',
    notes: 'Férias regulares do ano',
    createdBy: 'Admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      { action: 'Submetida', date: new Date().toISOString(), user: 'João da Silva', notes: '' },
      { action: 'Aprovada', date: new Date().toISOString(), user: 'Admin', notes: 'Aprovado pelo RH' }
    ]
  }
];

// Configurações Globais Iniciais
const initialSettings = {
  annualDays: 30,
  minMonthsForEligibility: 12,
  allowAccumulation: true,
  maxAccumulatedDays: 60,
  approvalFlow: ['Chefe Direto', 'Direção', 'Recursos Humanos'],
  holidayOffset: true // Descontar feriados
};

export default function useVacationData() {
  const [requests, setRequests] = useState([]);
  const [settings, setSettings] = useState(initialSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados iniciais
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        setRequests(parsed.requests || []);
        setSettings(parsed.settings || initialSettings);
      } else {
        // Inicializar com mocks
        setRequests(initialVacations);
        saveToStorage(initialVacations, initialSettings);
      }
    } catch (e) {
      console.error("Erro ao carregar dados de Férias:", e);
      setRequests(initialVacations);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Função utilitária para salvar no localStorage
  const saveToStorage = (reqs, sets) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ requests: reqs, settings: sets }));
  };

  // Adicionar um pedido de férias
  const addRequest = async (payload) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newRequest = {
          ...payload,
          id: `VAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          status: 'Submetida',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: [{ action: 'Submetida', date: new Date().toISOString(), user: payload.createdBy || 'Sistema', notes: payload.notes || '' }]
        };
        const updated = [...requests, newRequest];
        setRequests(updated);
        saveToStorage(updated, settings);
        resolve({ success: true, data: newRequest });
      }, 500);
    });
  };

  // Atualizar estado / aprovação de um pedido
  const updateRequestStatus = async (id, newStatus, user, notes = '') => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updated = requests.map(req => {
          if (req.id === id) {
            return {
              ...req,
              status: newStatus,
              updatedAt: new Date().toISOString(),
              history: [...req.history, { action: newStatus, date: new Date().toISOString(), user, notes }]
            };
          }
          return req;
        });
        setRequests(updated);
        saveToStorage(updated, settings);
        resolve({ success: true });
      }, 500);
    });
  };

  // Modificar um pedido (ex: alteração de datas)
  const updateRequest = async (id, changes, user, reason) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updated = requests.map(req => {
          if (req.id === id) {
            return {
              ...req,
              ...changes,
              updatedAt: new Date().toISOString(),
              history: [...req.history, { action: 'Alteração', date: new Date().toISOString(), user, notes: reason }]
            };
          }
          return req;
        });
        setRequests(updated);
        saveToStorage(updated, settings);
        resolve({ success: true });
      }, 500);
    });
  };

  // Cancelar / Eliminar
  const cancelRequest = async (id, user, reason) => {
    return updateRequestStatus(id, 'Cancelada', user, reason);
  };

  const removeRequest = async (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updated = requests.filter(r => r.id !== id);
        setRequests(updated);
        saveToStorage(updated, settings);
        resolve({ success: true });
      }, 500);
    });
  };

  const updateSettings = async (newSettings) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        saveToStorage(requests, updated);
        resolve({ success: true });
      }, 400);
    });
  };

  // Cálculo de Saldo Disponível de um funcionário
  const calculateEmployeeBalance = (employeeId, admissionDate) => {
    let entitledDays = 0;
    if (admissionDate) {
      const adm = new Date(admissionDate);
      const now = new Date();
      const diffTime = Math.abs(now - adm);
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      
      if (diffMonths >= settings.minMonthsForEligibility) {
        entitledDays = settings.annualDays;
      } else {
        entitledDays = diffMonths * (settings.annualDays / 12);
      }
    } else {
      entitledDays = settings.annualDays; 
    }

    const currentYear = new Date().getFullYear().toString();
    const usedDays = requests
      .filter(r => r.employeeId === employeeId && r.year === currentYear && ['Submetida', 'Em análise', 'Aprovada', 'Em gozo', 'Concluída'].includes(r.status))
      .reduce((sum, req) => sum + req.daysCount, 0);

    return {
      entitled: Math.floor(entitledDays),
      used: usedDays,
      balance: Math.floor(entitledDays) - usedDays
    };
  };

  return {
    requests,
    settings,
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
