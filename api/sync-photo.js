/**
 * api/sync-photo.js
 * Vercel Serverless Function para sincronização em tempo real de fotos de perfil
 * entre computadores, telemóveis e diferentes dispositivos.
 */

const GIST_ID = process.env.GIST_ID || 'dd985f35807d842a90cc097c26c07e47';
const GIST_FILENAME = 'sernic_sync.json';
// Credencial obtida ESTRITAMENTE de variáveis de ambiente seguras (sem credenciais hardcoded)
const GITHUB_TOKEN = process.env.GITHUB_SYNC_TOKEN || process.env.GITHUB_TOKEN;
const SYNC_SECRET = process.env.SYNC_API_SECRET;

function isOriginAllowed(origin, host) {
  if (!origin) return true;
  if (process.env.ALLOWED_ORIGIN) {
    const list = process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim().toLowerCase());
    return list.includes(origin.toLowerCase());
  }
  const cleanOrigin = origin.replace(/^https?:\/\//, '').toLowerCase();
  const cleanHost = host ? host.toLowerCase() : '';
  if (cleanHost && cleanOrigin === cleanHost) return true;
  if (cleanOrigin.includes('vercel.app') || cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1')) {
    return true;
  }
  return false;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // CORS restrito e seguro
  if (isOriginAllowed(origin, host)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-sync-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Verificação de credencial de ambiente
  if (!GITHUB_TOKEN) {
    return res.status(500).json({
      error: 'Servidor não configurado. Defina a variável de ambiente GITHUB_SYNC_TOKEN nas configurações do Vercel.'
    });
  }

  // 2. Proteção de autenticação opcional por segredo da API
  if (SYNC_SECRET) {
    const authHeader = req.headers.authorization || '';
    const secretHeader = req.headers['x-sync-secret'] || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    if (bearer !== SYNC_SECRET && secretHeader !== SYNC_SECRET) {
      return res.status(401).json({ error: 'Acesso não autorizado. Chave de autenticação inválida.' });
    }
  }

  try {
    // 1. OBTER FOTOS SINCRONIZADAS DA NUVEM (GET)
    if (req.method === 'GET') {
      const gistRes = await fetch(`https://api.github.com/gists/${GIST_ID}?t=${Date.now()}`, {
        headers: {
          'User-Agent': 'sernic-drh-app',
          'Authorization': `token ${GITHUB_TOKEN}`
        }
      });

      if (!gistRes.ok) {
        return res.status(gistRes.status).json({ error: 'Erro ao aceder à nuvem de sincronização.' });
      }

      const gistData = await gistRes.json();
      const content = gistData.files && gistData.files[GIST_FILENAME] ? gistData.files[GIST_FILENAME].content : '{}';
      let parsed = { photos: {} };
      try {
        parsed = JSON.parse(content);
      } catch (e) {}

      return res.status(200).json({
        success: true,
        photos: parsed.photos || {}
      });
    }

    // 2. ATUALIZAR / SUBSTITUIR FOTO DE PERFIL NA NUVEM (POST / PUT)
    if (req.method === 'POST' || req.method === 'PUT') {
      const { username, photo, photos: bulkPhotos } = req.body || {};

      // Ler estado atual
      const gistRes = await fetch(`https://api.github.com/gists/${GIST_ID}?t=${Date.now()}`, {
        headers: {
          'User-Agent': 'sernic-drh-app',
          'Authorization': `token ${GITHUB_TOKEN}`
        }
      });

      let currentData = { photos: {} };
      if (gistRes.ok) {
        const gistData = await gistRes.json();
        const content = gistData.files && gistData.files[GIST_FILENAME] ? gistData.files[GIST_FILENAME].content : '{}';
        try {
          currentData = JSON.parse(content);
        } catch (e) {}
      }
      currentData.photos = currentData.photos || {};

      if (bulkPhotos && typeof bulkPhotos === 'object') {
        Object.assign(currentData.photos, bulkPhotos);
      } else if (username) {
        const key = String(username).trim().toLowerCase();
        if (photo) {
          // Substitui diretamente a foto existente pela nova codificada
          currentData.photos[key] = photo;
        } else {
          // Remover
          delete currentData.photos[key];
        }
      }

      // Gravar na nuvem via PATCH
      const patchRes = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'User-Agent': 'sernic-drh-app',
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(currentData)
            }
          }
        })
      });

      if (!patchRes.ok) {
        return res.status(patchRes.status).json({ error: 'Falha ao salvar sincronização na nuvem.' });
      }

      return res.status(200).json({
        success: true,
        photo: photo || null,
        photos: currentData.photos
      });
    }

    // 3. REMOVER FOTO (DELETE)
    if (req.method === 'DELETE') {
      const { username } = req.query || req.body || {};
      if (!username) return res.status(400).json({ error: 'Username obrigatório.' });

      const key = String(username).trim().toLowerCase();

      const gistRes = await fetch(`https://api.github.com/gists/${GIST_ID}?t=${Date.now()}`, {
        headers: {
          'User-Agent': 'sernic-drh-app',
          'Authorization': `token ${GITHUB_TOKEN}`
        }
      });

      let currentData = { photos: {} };
      if (gistRes.ok) {
        const gistData = await gistRes.json();
        const content = gistData.files && gistData.files[GIST_FILENAME] ? gistData.files[GIST_FILENAME].content : '{}';
        try {
          currentData = JSON.parse(content);
        } catch (e) {}
      }
      currentData.photos = currentData.photos || {};
      delete currentData.photos[key];

      await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'User-Agent': 'sernic-drh-app',
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(currentData)
            }
          }
        })
      });

      return res.status(200).json({ success: true, removed: key });
    }

    res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error('[sync-photo API error]:', err);
    res.status(500).json({ error: err.message || 'Erro interno de sincronização.' });
  }
}
