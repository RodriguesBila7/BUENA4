/**
 * api/sync.js
 * Vercel Serverless Function para sincronização total em nuvem de todo o sistema SERNIC DRH
 * (Perfis, Utilizadores, Colaboradores, Atos Administrativos, Transferências, Disciplinar, Avaliações, etc.)
 */

const GIST_ID = process.env.GIST_ID;
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
  // Permitir por padrão o próprio host, domínios vercel.app e localhost
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

  // 1. Verificação de variáveis de ambiente obrigatórias
  if (!GITHUB_TOKEN) {
    return res.status(500).json({
      error: 'Servidor não configurado. Defina a variável de ambiente GITHUB_SYNC_TOKEN nas configurações do Vercel.'
    });
  }

  if (!GIST_ID) {
    return res.status(500).json({
      error: 'Servidor não configurado. Defina a variável de ambiente GIST_ID nas configurações do Vercel com o ID do seu Gist secreto.'
    });
  }

  // 2. Proteção de autenticação por segredo da API
  if (SYNC_SECRET) {
    const authHeader = req.headers.authorization || '';
    const secretHeader = req.headers['x-sync-secret'] || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    if (bearer !== SYNC_SECRET && secretHeader !== SYNC_SECRET) {
      return res.status(401).json({ error: 'Acesso não autorizado. Chave de autenticação inválida.' });
    }
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
