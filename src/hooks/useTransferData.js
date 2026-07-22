import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useAuditLog from './useAuditLog';

let _cache = null;
const _listeners = new Set();

function notifyAll(data) {
  _cache = data;
  _listeners.forEach(fn => fn(data));
}

async function api(method, path, body) {
  const res = await fetch(`/api/transfers${path}`, {
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

async function fetchData() {
  try {
    const data = await api('GET', '/');
    notifyAll(data);
  } catch (e) {
    console.error('[useTransferData] Erro ao carregar:', e);
    if (!_cache) notifyAll([]);
  }
}

export default function useTransferData() {
  const { user: currentUser } = useAuth();
  const { logAction } = useAuditLog();
  const [transfersRaw, setLocalTransfers] = useState(_cache || []);

  useEffect(() => {
    const listener = (data) => setLocalTransfers(data);
    _listeners.add(listener);
    if (!_cache) fetchData();
    return () => _listeners.delete(listener);
  }, []);

  const transfers = useMemo(() => {
    if (!currentUser) return transfersRaw;
    const isSuperAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(currentUser.roleId || currentUser.role) || currentUser.username === 'admin';
    if (isSuperAdmin || currentUser.roleId === 'hr_manager') return transfersRaw;

    return transfersRaw.filter(tr => {
      let keepOrigem = true;
      let keepDestino = true;
      
      if (currentUser.directorateId && tr.fromDirectorateId !== currentUser.directorateId) keepOrigem = false;
      if (currentUser.departmentId && tr.fromDepartmentId !== currentUser.departmentId) keepOrigem = false;
      if (currentUser.divisionId && tr.fromDivisionId !== currentUser.divisionId) keepOrigem = false;
      
      if (currentUser.directorateId && tr.toDirectorateId !== currentUser.directorateId) keepDestino = false;
      if (currentUser.departmentId && tr.toDepartmentId !== currentUser.departmentId) keepDestino = false;
      if (currentUser.divisionId && tr.toDivisionId !== currentUser.divisionId) keepDestino = false;

      return keepOrigem || keepDestino;
    });
  }, [transfersRaw, currentUser]);

  const generateId = () => 'trf_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  const requestTransfer = useCallback(async (transferData) => {
    try {
      const newTransfer = {
        ...transferData,
        id: generateId(),
        status: 'Pendente',
        requestDate: new Date().toISOString(),
        requestedBy: currentUser?.username || 'Sistema',
      };
      await api('POST', '/', newTransfer);
      await fetchData();
      logAction('Criar', 'Transferencias', `Criou pedido de transferencia para o funcionario ID: ${transferData.employeeId}`);
      return { success: true, transfer: newTransfer };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [currentUser, logAction]);

  const updateTransfer = useCallback(async (id, transferData) => {
    try {
      await api('PUT', `/${id}`, { ...transferData, id, updatedAt: new Date().toISOString() });
      await fetchData();
      logAction('Editar', 'Transferencias', `Editou pedido de transferencia ID: ${id}`);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [logAction]);

  const approveTransfer = useCallback(async (id, notes = '') => {
    try {
      const target = transfersRaw.find(t => t.id === id);
      if (!target) return { success: false, error: 'not_found' };
      const updated = {
        ...target,
        status: 'Aprovada',
        approvalDate: new Date().toISOString(),
        approvedBy: currentUser?.username || 'Sistema',
        notes: notes || target.notes
      };
      await api('PUT', `/${id}`, updated);
      await fetchData();
      logAction('Validar', 'Transferencias', `Aprovou pedido de transferencia ID: ${id}`);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [transfersRaw, currentUser, logAction]);

  const rejectTransfer = useCallback(async (id, reason) => {
    try {
      const target = transfersRaw.find(t => t.id === id);
      if (!target) return { success: false, error: 'not_found' };
      const updated = {
        ...target,
        status: 'Rejeitada',
        rejectionDate: new Date().toISOString(),
        rejectedBy: currentUser?.username || 'Sistema',
        rejectionReason: reason
      };
      await api('PUT', `/${id}`, updated);
      await fetchData();
      logAction('Validar', 'Transferencias', `Rejeitou pedido de transferencia ID: ${id}`);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [transfersRaw, currentUser, logAction]);

  const cancelTransfer = useCallback(async (id) => {
    try {
      const target = transfersRaw.find(t => t.id === id);
      if (!target) return { success: false, error: 'not_found' };
      const updated = {
        ...target,
        status: 'Cancelada',
        cancelledDate: new Date().toISOString(),
        cancelledBy: currentUser?.username || 'Sistema'
      };
      await api('PUT', `/${id}`, updated);
      await fetchData();
      logAction('Eliminar', 'Transferencias', `Cancelou pedido de transferencia ID: ${id}`);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [transfersRaw, currentUser, logAction]);

  const deleteTransfer = useCallback(async (id) => {
    try {
      await api('DELETE', `/${id}`);
      await fetchData();
      logAction('Eliminar', 'Transferencias', `Apagou o registo de transferencia ID: ${id}`);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [logAction]);

  return {
    transfers,
    requestTransfer,
    updateTransfer,
    approveTransfer,
    rejectTransfer,
    cancelTransfer,
    deleteTransfer
  };
}
