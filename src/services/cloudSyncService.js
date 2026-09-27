/**
 * src/services/cloudSyncService.js
 * Serviço de sincronização em nuvem para fotos de perfil e dados de utilizador.
 * Permite que fotos alteradas num computador apareçam instantaneamente no telemóvel
 * e vice-versa, sem necessidade de servidores pagos ou configurações adicionais.
 */

const GIST_ID = 'dd985f35807d842a90cc097c26c07e47';
const GIST_FILENAME = 'sernic_sync.json';

// Cache em memória
let _cloudPhotosCache = null;
let _lastFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10 segundos

/**
 * Obtém todas as fotos sincronizadas na nuvem
 * @param {boolean} forceRefresh - Forçar busca na rede sem usar cache em memória
 * @returns {Promise<Object>} Mapa de fotografias: { [username]: base64 }
 */
export async function getCloudPhotos(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cloudPhotosCache && (now - _lastFetchTime < CACHE_TTL_MS)) {
    return _cloudPhotosCache;
  }

  // 1. Tentar primeiro o endpoint Serverless da Vercel (/api/sync-photo)
  try {
    const res = await fetch(`/api/sync-photo?t=${now}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.photos) {
        _cloudPhotosCache = data.photos;
        _lastFetchTime = now;
        syncPhotosToLocalStorage(data.photos);
        return data.photos;
      }
    }
  } catch (err) {
    // Falha silenciosa, tenta o fallback direto via Gist
  }

  // 2. Fallback direto para o GitHub Gist público (funciona em qualquer navegador, computador ou telemóvel)
  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}?t=${now}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'sernic-drh-frontend'
      }
    });

    if (res.ok) {
      const gistData = await res.json();
      const content = gistData.files && gistData.files[GIST_FILENAME] ? gistData.files[GIST_FILENAME].content : '{}';
      const parsed = JSON.parse(content || '{}');
      const photos = parsed.photos || {};

      _cloudPhotosCache = photos;
      _lastFetchTime = now;
      syncPhotosToLocalStorage(photos);
      return photos;
    }
  } catch (err) {
    console.warn('[cloudSyncService] Não foi possível conectar à nuvem:', err.message);
  }

  // 3. Fallback: carregar do localStorage
  return loadPhotosFromLocalStorage();
}

/**
 * Atualiza e substitui a foto de um utilizador na nuvem (sincronização entre computador e telemóvel)
 * @param {string} username - Nome de utilizador ou NUIT
 * @param {string|null} photoBase64 - Foto codificada e comprimida em Base64 (ou null para remover)
 */
export async function saveCloudPhoto(username, photoBase64) {
  if (!username) return false;
  const key = String(username).trim().toLowerCase();

  // 1. Atualizar imediatamente no localStorage local
  const photoKey = 'sernic_user_photo_' + key;
  if (photoBase64) {
    localStorage.setItem(photoKey, photoBase64);
  } else {
    localStorage.removeItem(photoKey);
  }

  if (_cloudPhotosCache) {
    if (photoBase64) {
      _cloudPhotosCache[key] = photoBase64;
    } else {
      delete _cloudPhotosCache[key];
    }
  }

  // 2. Sincronizar via endpoint seguro (/api/sync-photo)
  try {
    const res = await fetch('/api/sync-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: key, photo: photoBase64 })
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn('[cloudSyncService] Erro ao sincronizar foto com o servidor:', err.message);
  }

  return false;
}

/**
 * Remove a foto do utilizador da nuvem
 */
export async function removeCloudPhoto(username) {
  return saveCloudPhoto(username, null);
}

/**
 * Sincroniza o mapa de fotos recebido da nuvem para o localStorage deste dispositivo
 */
function syncPhotosToLocalStorage(photos) {
  if (!photos || typeof photos !== 'object') return;
  try {
    Object.entries(photos).forEach(([userKey, base64]) => {
      if (base64) {
        localStorage.setItem('sernic_user_photo_' + userKey.toLowerCase(), base64);
      }
    });
  } catch (e) {}
}

/**
 * Lê fotos já armazenadas no localStorage deste dispositivo
 */
function loadPhotosFromLocalStorage() {
  const result = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sernic_user_photo_')) {
        const username = key.replace('sernic_user_photo_', '');
        result[username] = localStorage.getItem(key);
      }
    }
  } catch (e) {}
  return result;
}
