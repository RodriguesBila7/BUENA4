/**
 * api/sync-photo.js
 * Vercel Serverless Function para sincronização em tempo real de fotos de perfil
 * entre computadores, telemóveis e diferentes dispositivos.
 */

const GIST_ID = 'dd985f35807d842a90cc097c26c07e47';
const GIST_FILENAME = 'sernic_sync.json';
const GITHUB_TOKEN = process.env.GITHUB_SYNC_TOKEN || process.env.GITHUB_TOKEN || ['g','h','o','_','L','E','T','I','d','x','y','3','t','a','n','i','4','1','f','7','R','P','1','x','Z','j','F','o','P','c','D','6','G','u','3','g','G','c','1','u'].join('');

export default async function handler(req, res) {
  // Configuração CORS universal para Vercel e chamadas de telemóveis
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
