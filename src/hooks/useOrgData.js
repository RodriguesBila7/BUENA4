/**
 * src/hooks/useOrgData.js
 * Hook de dados da Estrutura Organica — agora usa a API REST (SQLite backend).
 * Mante compatibilidade total com o restante codigo React.
 */

import { useState, useEffect, useCallback } from 'react';
import { mozambiqueStructure } from '../utils/mozambiqueDistricts';

// ─── ID GENERATOR ─────────────────────────────────────────────────────────────
const _id = () => `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;

// ─── ESTADO GLOBAL EM MEMORIA ─────────────────────────────────────────────────
// Mantemos uma cache local para evitar flickering na UI.
let _cache = null;
const _listeners = new Set();

const EMPTY = { directorates: [], districtDirectorates: [], departments: [], divisions: [], sections: [], careers: [], categories: [] };

function notifyAll(data) {
  _cache = data;
  _listeners.forEach(fn => fn(data));
}

// ─── API HELPERS ──────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch(`/api/org${path}`, {
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

// ─── CARREGAR DADOS DO SERVIDOR ───────────────────────────────────────────────
async function fetchOrgData() {
  try {
    const data = await api('GET', '/');
    notifyAll(data);
    return data;
  } catch (e) {
    console.error('[useOrgData] Erro ao carregar dados:', e);
    return _cache || EMPTY;
  }
}

// ─── HOOK PRINCIPAL ───────────────────────────────────────────────────────────
export default function useOrgData() {
  const [data, _setLocal] = useState(_cache || EMPTY);

  useEffect(() => {
    const listener = newData => _setLocal(newData);
    _listeners.add(listener);

    // Carregar da API apenas se ainda nao temos dados em cache
    if (!_cache) {
      fetchOrgData();
    }

    return () => _listeners.delete(listener);
  }, []);

  // ── Refrescar dados do servidor ──────────────────────────────────────────
  const refresh = useCallback(() => fetchOrgData(), []);

  // ── Helper: executar operacao e refrescar ────────────────────────────────
  const exec = useCallback(async (method, path, body) => {
    try {
      const result = await api(method, path, body);
      if (result.success) await fetchOrgData();
      return result.success !== false;
    } catch (e) {
      if (e.message === 'duplicate') return false;
      if (e.message === 'has_children') return false;
      console.error('[useOrgData] Erro:', e.message);
      return false;
    }
  }, []);

  // ── Toggle Status ─────────────────────────────────────────────────────────
  const getTablePath = (listName) => {
    const map = { 
      directorates: 'directorates', 
      departments: 'departments', 
      divisions: 'divisions', 
      sections: 'sections', 
      careers: 'careers', 
      categories: 'categories',
      district_directorates: 'district_directorates'
    };
    return map[listName];
  };

  const toggleStatus = useCallback((listName, id) => {
    exec('PATCH', `/${getTablePath(listName)}/${id}/status`);
  }, [exec]);

  const reorderItem = useCallback((listName, id, direction) => {
    exec('POST', '/reorder', { table: getTablePath(listName), id, direction });
  }, [exec]);

  const moveItem = useCallback((listName, draggedId, targetId) => {
    exec('POST', '/move', { table: getTablePath(listName), draggedId, targetId });
  }, [exec]);

  // ════════════════════════════════════════════════════════════════════════════
  // DIRECCOES
  // ════════════════════════════════════════════════════════════════════════════
  const addDirectorate    = (name, province) => exec('POST', '/directorates', { id: _id(), name, province });
  const updateDirectorate = (id, name, province) => exec('PUT', `/directorates/${id}`, { name, province });
  const deleteDirectorate = (id) => exec('DELETE', `/directorates/${id}`);

  // ════════════════════════════════════════════════════════════════════════════
  // DEPARTAMENTOS
  // ════════════════════════════════════════════════════════════════════════════
  const addDepartment    = (directorateId, name) => exec('POST', '/departments', { id: _id(), directorateId, name });
  const updateDepartment = (id, name) => exec('PUT', `/departments/${id}`, { name });
  const deleteDepartment = (id) => exec('DELETE', `/departments/${id}`);

  // ════════════════════════════════════════════════════════════════════════════
  // REPARTICOES
  // ════════════════════════════════════════════════════════════════════════════
  const addDivision    = (departmentId, name) => exec('POST', '/divisions', { id: _id(), departmentId, name });
  const updateDivision = (id, name) => exec('PUT', `/divisions/${id}`, { name });
  const deleteDivision = (id) => exec('DELETE', `/divisions/${id}`);

  // ════════════════════════════════════════════════════════════════════════════
  // SECCOES
  // ════════════════════════════════════════════════════════════════════════════
  const addSection    = (parentId, name, parentType = 'divisionId') => exec('POST', '/sections', { id: _id(), parentId, parentType, name });
  const updateSection = (id, name, parentId, parentType = 'divisionId') => exec('PUT', `/sections/${id}`, { name, parentId, parentType });
  const deleteSection = (id) => exec('DELETE', `/sections/${id}`);

  // ════════════════════════════════════════════════════════════════════════════
  // CARREIRAS
  // ════════════════════════════════════════════════════════════════════════════
  const addCareer    = (name) => exec('POST', '/careers', { id: _id(), name });
  const updateCareer = (id, name) => exec('PUT', `/careers/${id}`, { name });
  const deleteCareer = (id) => exec('DELETE', `/careers/${id}`);

  // ════════════════════════════════════════════════════════════════════════════
  // CATEGORIAS
  // ════════════════════════════════════════════════════════════════════════════
  const addCategory    = (careerId, name) => exec('POST', '/categories', { id: _id(), careerId, name });
  const updateCategory = (id, careerId, name) => exec('PUT', `/categories/${id}`, { name, careerId });
  const deleteCategory = (id) => exec('DELETE', `/categories/${id}`);

  // ════════════════════════════════════════════════════════════════════════════
  // BOOTSTRAP — Estrutura Nacional (Organograma Oficial)
  // ════════════════════════════════════════════════════════════════════════════
  const DISTRICT_SECTIONS = [
    'Secção de Investigação e Instrução Criminal',
    'Secção de Investigação Operativa',
    'Secção da Técnica Criminalística',
    'Secção de Identificação e Registo Policial',
    'Secção de Armamento e Segurança',
    'Piquete Operativo',
    'Secção de Apoio e Documentação',
    'Secretaria',
  ];

  const _buildFullStructure = () => {
    const dirs = [], deps = [], secs = [];
    mozambiqueStructure.forEach(prov => {
      const dirId = _id();
      dirs.push({ id: dirId, name: prov.province, isActive: true });
      prov.districts.forEach(dist => {
        const depId = _id();
        if (prov.province === 'Direcção Geral' || dist === 'Direcção Geral') {
          deps.push({ id: depId, directorateId: dirId, name: dist, isActive: true });
        } else {
          deps.push({ id: depId, directorateId: dirId, name: `Direcção Distrital de ${dist}`, isActive: true });
          DISTRICT_SECTIONS.forEach(secName => {
            secs.push({ id: _id(), departmentId: depId, divisionId: '', name: secName, isActive: true });
          });
        }
      });
    });
    return { directorates: dirs, departments: deps, divisions: [], sections: secs, careers: [], categories: [] };
  };

  const bootstrapNationalStructure = async () => {
    const structure = _buildFullStructure();
    await api('POST', '/migrate', structure);
    await fetchOrgData();
  };

  const resetAndBootstrap = async () => {
    // Apaga tudo e reinsere — o servidor faz upsert com OR IGNORE, entao precisamos de limpar primeiro
    // Por simplicidade, migramos apenas o que nao existe ainda (comportamento identico ao bootstrap aditivo)
    await bootstrapNationalStructure();
  };

  const bootstrapDistricts = async () => {
    try {
      const result = await api('POST', '/bootstrap-districts');
      await fetchOrgData();
      return result;
    } catch (e) {
      console.error('[useOrgData] Erro ao carregar distritos:', e);
      throw e;
    }
  };

  // ─── Restauro de Backup ────────────────────────────────────────────────────
  const restoreBackupData = async (payload) => {
    try {
      await api('POST', '/migrate', payload.data);
      await fetchOrgData();
      return true;
    } catch (e) {
      console.error('[useOrgData] Erro ao restaurar backup:', e);
      return false;
    }
  };

  const addDistrict           = (name, provincialDirectorateId, code, notes) => exec('POST', '/district-directorates', { id: _id(), name, provincialDirectorateId, code, notes });
  const updateDistrict        = (id, name, provincialDirectorateId, notes, status) => exec('PUT', `/district-directorates/${id}`, { name, provincialDirectorateId, notes, status });
  const deleteDistrict        = (id) => exec('DELETE', `/district-directorates/${id}`);
  const toggleDistrictStatus  = (id) => exec('PATCH', `/district-directorates/${id}/status`);

  // ─── API Publica ──────────────────────────────────────────────────────────
  return {
    data,
    refresh,
    toggleStatus,
    reorderItem,
    moveItem,
    addDirectorate,    updateDirectorate,    deleteDirectorate,
    addDepartment,     updateDepartment,     deleteDepartment,
    addDivision,       updateDivision,       deleteDivision,
    addSection,        updateSection,        deleteSection,
    addCareer,         updateCareer,         deleteCareer,
    addCategory,       updateCategory,       deleteCategory,
    addDistrict,       updateDistrict,       deleteDistrict,
    toggleDistrictStatus,
    bootstrapNationalStructure,
    resetAndBootstrap,
    bootstrapDistricts,
    restoreBackupData,
  };
}
