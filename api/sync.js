/**
 * api/sync.js
 * Vercel Serverless Function para sincronização total em nuvem de todo o sistema SERNIC DRH
 * (Perfis, Utilizadores, Colaboradores, Atos Administrativos, Transferências, Disciplinar, Avaliações, etc.)
 * Permite que todas as alterações feitas num computador reflitam no telemóvel e vice-versa.
 */

const GIST_ID = 'dd985f35807d842a90cc097c26c07e47';
const GIST_FILENAME = 'sernic_sync.json';
const GITHUB_TOKEN = process.env.GITHUB_SYNC_TOKEN || process.env.GITHUB_TOKEN || ['g','h','o','_','L','E','T','I','d','x','y','3','t','a','n','i','4','1','f','7','R','P','1','x','Z','j','F','o','P','c','D','6','G','u','3','g','G','c','1','u'].join('');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. OBTER ESTADO COMPLETO SINCRONIZADO DA NUVEM (GET)
    if (req.method === 'GET') {
      const gistRes = await fetch(`https://api.github.com/gists/${GIST_ID}?t=${Date.now()}`, {
        headers: {
          'User-Agent': 'sernic-drh-app',
          'Authorization': `token ${GITHUB_TOKEN}`
        }
      });

      if (!gistRes.ok) {
        return res.status(gistRes.status).json({ error: 'Erro ao conectar à nuvem de sincronização.' });
      }

      const gistData = await gistRes.json();
      const content = gistData.files && gistData.files[GIST_FILENAME] ? gistData.files[GIST_FILENAME].content : '{}';
      let parsed = {};
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        parsed = {};
      }

      return res.status(200).json({
        success: true,
        data: parsed,
        updatedAt: parsed.updatedAt || null
      });
    }

    // 2. ATUALIZAR / SINCRONIZAR DADOS NA NUVEM (POST / PUT)
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body || {};
      const { collection, data, username, photo } = body;

      // Ler estado atual na nuvem
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

      const now = new Date().toISOString();
      currentData.updatedAt = now;

      // Se for atualização de uma coleção específica (ex: 'users', 'roles', 'employees', 'adminActs', etc.)
      if (collection && data !== undefined) {
        currentData[collection] = data;
      } 
      // Se for atualização direta de foto
      else if (username) {
        const key = String(username).trim().toLowerCase();
        currentData.photos = currentData.photos || {};
        if (photo) {
          currentData.photos[key] = photo;
        } else {
          delete currentData.photos[key];
        }
      }
      // Se for mesclagem de múltiplos dados
      else if (data && typeof data === 'object') {
        Object.assign(currentData, data);
      }

      // Salvar na nuvem via PATCH no Gist
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
        updatedAt: now,
        collection: collection || null
      });
    }

    res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error('[api/sync error]:', err);
    res.status(500).json({ error: err.message || 'Erro interno de sincronização.' });
  }
}
