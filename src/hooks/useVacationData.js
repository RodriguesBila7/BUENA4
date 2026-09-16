import { useState, useEffect } from 'react';

// Chave para armazenar os dados no localStorage
const STORAGE_KEY = 'buena3_vacations_data';

// Dados iniciais de demonstração (se localStorage estiver vazio)
const getInitialVacations = () => {
  const now = new Date();
  const formatD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 1. Férias em curso (iniciou há 12 dias, faltam 18 dias de um total de 30)
  const ongoingStart = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
  const ongoingEnd = new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000);

  // 2. Férias em curso PRÓXIMAS DE TERMINAR (iniciou há 26 dias, faltam apenas 4 dias!)
  const endingSoonStart = new Date(now.getTime() - 26 * 24 * 60 * 60 * 1000);
  const endingSoonEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // 3. Férias Agendadas (iniciam daqui a 14 dias)
  const scheduledStart = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const scheduledEnd = new Date(now.getTime() + 44 * 24 * 60 * 60 * 1000);

  // 4. Férias Concluídas (terminaram há 15 dias)
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

const initialVacations = getInitialVacations();

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
