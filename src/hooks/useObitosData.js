import { useState, useEffect } from 'react';

// Chave para armazenar os dados no localStorage
const STORAGE_KEY = 'buena3_obitos_workflow_data';

export default function useObitosData() {
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        setWorkflows(JSON.parse(storedData));
      }
    } catch (e) {
      console.error("Erro ao carregar dados do workflow de óbitos:", e);
    }
  }, []);

  const saveToStorage = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  // Inicializa um novo workflow se ele não existir
  const initializeWorkflow = (employeeId) => {
    const existing = workflows.find(w => w.employeeId === employeeId);
    if (existing) return existing;

    const newWorkflow = {
      id: `OB-${Date.now()}`,
      employeeId,
      step: 1, // 1: Suspensão de Salário, 2: Certidão de Óbito, 3: Subsídio de 6 meses
      docSuspensao: null,
      docCertidao: null,
      subsidioProcessado: false,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    const updated = [...workflows, newWorkflow];
    setWorkflows(updated);
    saveToStorage(updated);
    return newWorkflow;
  };

  const updateWorkflow = (id, changes) => {
    const updated = workflows.map(w => {
      if (w.id === id) {
        return { ...w, ...changes, updatedAt: new Date().toISOString() };
      }
      return w;
    });
    setWorkflows(updated);
    saveToStorage(updated);
  };

  const completeStep1 = (id, docName) => {
    updateWorkflow(id, { docSuspensao: docName, step: 2 });
  };

  const completeStep2 = (id, docName) => {
    updateWorkflow(id, { docCertidao: docName, step: 3 });
  };

  const completeStep3 = (id) => {
    updateWorkflow(id, { subsidioProcessado: true, step: 4, awaitingApproval: true, completedAt: new Date().toISOString() });
  };

  const approveWorkflow = (id) => {
    updateWorkflow(id, { isCompleted: true, awaitingApproval: false, approvedAt: new Date().toISOString() });
  };

  const deleteWorkflow = (id) => {
    const updated = workflows.filter(w => w.id !== id && w.employeeId !== id);
    setWorkflows(updated);
    saveToStorage(updated);
  };

  return {
    workflows,
    initializeWorkflow,
    completeStep1,
    completeStep2,
    completeStep3,
    approveWorkflow,
    deleteWorkflow
  };
}
