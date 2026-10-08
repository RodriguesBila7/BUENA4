/**
 * src/services/cloudSyncService.js
 * Serviço de sincronização total em nuvem para todo o sistema SERNIC DRH
 * (Perfis, Utilizadores, Colaboradores, Atos, Transferências, Disciplinar, Avaliações, Fotos, etc.)
 * Permite que todas as operações efetuadas num computador fiquem disponíveis em tempo real
 * no telemóvel e vice-versa.
 */

// Chaves locais mapeadas para coleções na nuvem
export const COLLECTION_MAP = {
  users: 'sernic_db_users',
  roles: 'sernic_db_roles',
  employees: 'sernic_db_employees',
  org: 'sernic_db_org',
  adminActs: 'sernic_db_admin_acts',
  disciplinary: 'sernic_db_disciplinary',
  evaluations: 'sernic_db_evaluations',
  transfers: 'sernic_db_transfers',
  effectiveness: 'sernic_db_effectiveness',
  actTypes: 'sernic_db_act_types',
  security: 'sernic_db_security',
  audit: 'sernic_db_audit'
};

let _cloudCache = null;
let _lastFetchTime = 0;
const CACHE_TTL_MS = 6000; // 6 segundos

const getSyncHeaders = (extra = {}) => {
  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('sernic_jwt_token') || localStorage.getItem('sernic_jwt_token'))
    : null;

  return {
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extra
  };
};

/**
 * Obtém todo o estado da base de dados sincronizada na nuvem
 * e atualiza o localStorage deste dispositivo
 */
export async function getCloudFullData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cloudCache && (now - _lastFetchTime < CACHE_TTL_MS)) {
    return _cloudCache;
  }

  // Tentar endpoint da Vercel /api/sync de forma autenticada e segura
  try {
    const res = await fetch(`/api/sync?t=${now}`, {
      method: 'GET',
      headers: getSyncHeaders()
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        _cloudCache = json.data;
        _lastFetchTime = now;
        applyCloudDataToLocal(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[cloudSyncService] Aviso ao contactar a nuvem:', err.message);
  }

  return _cloudCache || {};
}

/**
 * Salva uma coleção inteira na nuvem (ex: 'users', 'employees', 'roles', etc.)
 */
export async function saveCloudCollection(collection, data) {
  if (!collection || data === undefined) return false;

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: getSyncHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ collection, data })
    });
    return res.ok;
  } catch (err) {
    console.warn(`[cloudSyncService] Erro ao sincronizar coleção ${collection}:`, err.message);
    return false;
  }
}

/**
 * Obtém todas as fotos da nuvem
 */
export async function getCloudPhotos(forceRefresh = false) {
  const full = await getCloudFullData(forceRefresh);
  return full.photos || {};
}

/**
 * Salva e substitui uma foto de perfil na nuvem
 */
export async function saveCloudPhoto(username, photoBase64) {
  if (!username) return false;
  const key = String(username).trim().toLowerCase();

  const photoKey = 'sernic_user_photo_' + key;
  if (photoBase64) {
    localStorage.setItem(photoKey, photoBase64);
  } else {
    localStorage.removeItem(photoKey);
  }

  if (_cloudCache && _cloudCache.photos) {
    if (photoBase64) _cloudCache.photos[key] = photoBase64;
    else delete _cloudCache.photos[key];
  }

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: getSyncHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username: key, photo: photoBase64 })
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Remove a foto do utilizador da nuvem
 */
export async function removeCloudPhoto(username) {
  return saveCloudPhoto(username, null);
}

/**
 * Aplica os dados da nuvem no localStorage deste dispositivo
 */
function applyCloudDataToLocal(cloudData) {
  if (!cloudData || typeof cloudData !== 'object') return;

  try {
    let hasChanges = false;

    // Aplicar cada coleção se presente na nuvem
    Object.entries(COLLECTION_MAP).forEach(([colKey, storageKey]) => {
      if (cloudData[colKey] !== undefined && cloudData[colKey] !== null) {
        const cloudStr = JSON.stringify(cloudData[colKey]);
        const currentStr = localStorage.getItem(storageKey);
        if (cloudStr !== currentStr) {
          localStorage.setItem(storageKey, cloudStr);
          hasChanges = true;
        }
      }
    });

    // Aplicar fotografias
    if (cloudData.photos && typeof cloudData.photos === 'object') {
      Object.entries(cloudData.photos).forEach(([userKey, base64]) => {
        if (base64) {
          const photoKey = 'sernic_user_photo_' + userKey.toLowerCase();
          if (localStorage.getItem(photoKey) !== base64) {
            localStorage.setItem(photoKey, base64);
            hasChanges = true;
          }
        }
      });
    }

    if (hasChanges && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sernic_cloud_sync_updated', { detail: cloudData }));
    }
  } catch (e) {
    console.warn('[cloudSyncService] Erro ao aplicar dados locais:', e);
  }
}
