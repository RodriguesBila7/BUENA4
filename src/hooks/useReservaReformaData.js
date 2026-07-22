import { useState, useEffect } from 'react';
const generateId = () => 'wf_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

export default function useReservaReformaData() {
  const [workflows, setWorkflows] = useState(() => {
    const saved = localStorage.getItem('sernic_reserva_reforma_workflows');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sernic_reserva_reforma_workflows', JSON.stringify(workflows));
  }, [workflows]);

  const initializeWorkflow = (actId, employeeId) => {
    const existing = workflows.find(w => w.actId === actId);
    if (existing) return existing;

    const newWf = {
      id: generateId(),
      actId,
      employeeId,
      step: 1, // 1: Pendente (aguarda processo), 2: Aguarda Despacho, 3: Finalizado
      processNumber: '',
      dispatchNumber: '',
      isCompleted: false,
      createdAt: new Date().toISOString()
    };
    setWorkflows(prev => [...prev, newWf]);
    return newWf;
  };

  const completeStep1 = (wfId, processNumber) => {
    setWorkflows(prev => prev.map(w => 
      w.id === wfId ? { ...w, step: 2, processNumber } : w
    ));
  };

  const completeStep2 = (wfId, dispatchNumber) => {
    setWorkflows(prev => prev.map(w => 
      w.id === wfId ? { ...w, step: 3, dispatchNumber, isCompleted: true, completedAt: new Date().toISOString() } : w
    ));
  };

  const deleteWorkflow = (wfId) => {
    setWorkflows(prev => prev.filter(w => w.id !== wfId));
  };

  return {
    workflows,
    initializeWorkflow,
    completeStep1,
    completeStep2,
    deleteWorkflow
  };
}
