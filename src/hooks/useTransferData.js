import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useAuditLog from './useAuditLog';
import { getFallbackTransfers, saveFallbackTransfers } from '../services/storageFallback';

let _cache = null;
const _listeners = new Set();

function notifyAll(data) {
  _cache = data;
  _listeners.forEach(fn => fn(data));
}

async function api(method, path, body) {
  const res = await fetch(`/api/transfers${path}`, {
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

async function fetchData() {
  try {
    const data = await api('GET', '/');
    notifyAll(data);
    saveFallbackTransfers(data);
  } catch (e) {
    console.warn('[useTransferData] API indisponível, a carregar dados locais...');
    const fallback = getFallbackTransfers();
    notifyAll(fallback);
  }
}

export default function useTransferData() {
  const { user: currentUser } = useAuth();
  const { logAction } = useAuditLog();
  const [transfersRaw, setLocalTransfers] = useState(_cache || getFallbackTransfers());

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
    const newTransfer = {
      ...transferData,
      id: generateId(),
      status: 'Pendente',
      requestDate: new Date().toISOString(),
      requestedBy: currentUser?.username || 'Sistema',
    };
    try {
      await api('POST', '/', newTransfer);
      await fetchData();
      logAction('Criar', 'Transferencias', `Criou pedido de transferencia para o funcionario ID: ${transferData.employeeId}`);
      return { success: true, transfer: newTransfer };
    } catch (e) {
      const current = getFallbackTransfers();
      const updated = [newTransfer, ...current];
      saveFallbackTransfers(updated);
      notifyAll(updated);
      logAction('Criar', 'Transferencias', `Criou pedido de transferencia para o funcionario ID: ${transferData.employeeId}`);
      return { success: true, transfer: newTransfer };
    }
  }, [currentUser, logAction]);

  const updateTransfer = useCallback(async (id, transferData) => {
    try {
      await api('PUT', `/${id}`, { ...transferData, id, updatedAt: new Date().toISOString() });
      await fetchData();
      logAction('Editar', 'Transferencias', `Editou pedido de transferencia ID: ${id}`);
      return { success: true };
    } catch (e) {
      const current = getFallbackTransfers();
      const updated = current.map(t => t.id === id ? { ...t, ...transferData, updatedAt: new Date().toISOString() } : t);
      saveFallbackTransfers(updated);
      notifyAll(updated);
      logAction('Editar', 'Transferencias', `Editou pedido de transferencia ID: ${id}`);
      return { success: true };
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
      const current = getFallbackTransfers();
      const target = current.find(t => t.id === id);
      if (!target) return { success: false, error: 'not_found' };
      const updated = current.map(t => t.id === id ? {
        ...t,
        status: 'Aprovada',
        approvalDate: new Date().toISOString(),
        approvedBy: currentUser?.username || 'Sistema',
        notes: notes || t.notes
      } : t);
      saveFallbackTransfers(updated);
      notifyAll(updated);
      logAction('Validar', 'Transferencias', `Aprovou pedido de transferencia ID: ${id}`);
      return { success: true };
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
      const current = getFallbackTransfers();
      const updated = current.map(t => t.id === id ? {
        ...t,
        status: 'Rejeitada',
        rejectionDate: new Date().toISOString(),
        rejectedBy: currentUser?.username || 'Sistema',
        rejectionReason: reason
      } : t);
      saveFallbackTransfers(updated);
      notifyAll(updated);
      logAction('Validar', 'Transferencias', `Rejeitou pedido de transferencia ID: ${id}`);
      return { success: true };
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
      const current = getFallbackTransfers();
      const updated = current.map(t => t.id === id ? {
        ...t,
        status: 'Cancelada',
        cancelledDate: new Date().toISOString(),
        cancelledBy: currentUser?.username || 'Sistema'
      } : t);
      saveFallbackTransfers(updated);
      notifyAll(updated);
      logAction('Eliminar', 'Transferencias', `Cancelou pedido de transferencia ID: ${id}`);
      return { success: true };
    }
  }, [transfersRaw, currentUser, logAction]);

  const deleteTransfer = useCallback(async (id) => {
    try {
      await api('DELETE', `/${id}`);
      await fetchData();
      logAction('Eliminar', 'Transferencias', `Apagou o registo de transferencia ID: ${id}`);
      return { success: true };
    } catch (e) {
      const current = getFallbackTransfers();
      const updated = current.filter(t => t.id !== id);
      saveFallbackTransfers(updated);
      notifyAll(updated);
      logAction('Eliminar', 'Transferencias', `Apagou o registo de transferencia ID: ${id}`);
      return { success: true };
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
