/**
 * api/request-access.js
 * Vercel Serverless Function para validação de NUIT e ativação de acesso de perfil
 * Regra: Apenas funcionários previamente registados pelo Administrador podem ativar o seu acesso.
 */

import bcrypt from 'bcryptjs';

const GIST_ID = process.env.GIST_ID;
const GIST_FILENAME = 'sernic_sync.json';
const GITHUB_TOKEN = process.env.GITHUB_SYNC_TOKEN || process.env.GITHUB_TOKEN;

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

const SERVER_SEED_USERS = [
  {
    id: 'usr_buenaverte_main',
    name: 'Buenaverte',
    username: '123922328',
    nuit: '123922328',
    email: 'eng.rodriguesbila@gmail.com',
    role_id: 'super_admin_1',
    status: 'Ativo'
  },
  {
    id: 'usr_admin',
    name: 'Administrador Principal',
    username: 'admin',
    nuit: '100123456',
    role_id: 'super_admin_1',
    status: 'Ativo'
  },
  {
    id: 'usr_admin_maputo_cidade',
    name: 'Administrador RH (Cidade de Maputo)',
    username: 'Administrador',
    nuit: '100456789',
    role_id: 'usuario_admin',
    status: 'Ativo'
  },
  {
    id: 'usr_1788863244291',
    name: 'Buenaverte',
    username: 'Buenaverte',
    nuit: '256487895',
    role_id: 'usuario_admin',
    status: 'Ativo'
  }
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (isOriginAllowed(origin, host)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { nuit, password } = req.body || {};
  if (!nuit || !password) {
    return res.status(400).json({ error: 'NUIT e palavra-passe obrigatórios.' });
  }

  const cleanNuit = String(nuit).trim().toLowerCase();

  // 1. Obter utilizadores da base na nuvem (GitHub Gist) ou sementes
  let usersList = [];
  let gistData = null;

  if (GIST_ID && GITHUB_TOKEN) {
    try {
      const gistRes = await fetch(`https://api.github.com/gists/${GIST_ID}?t=${Date.now()}`, {
        headers: {
          'User-Agent': 'sernic-drh-app',
          'Authorization': `token ${GITHUB_TOKEN}`
        }
      });
      if (gistRes.ok) {
        gistData = await gistRes.json();
        const content = gistData.files && gistData.files[GIST_FILENAME] ? gistData.files[GIST_FILENAME].content : '{}';
        const parsed = JSON.parse(content || '{}');
        if (Array.isArray(parsed.users) && parsed.users.length > 0) {
          usersList = parsed.users;
        }
      }
    } catch (_e) {}
  }

  if (usersList.length === 0) {
    usersList = [...SERVER_SEED_USERS];
  }

  // 2. Verificar se o perfil já foi previamente cadastrado pelo Administrador no sistema
  const userIdx = usersList.findIndex(u => 
    (u.nuit && String(u.nuit).toLowerCase() === cleanNuit) ||
    (u.username && String(u.username).toLowerCase() === cleanNuit)
  );

  if (userIdx === -1) {
    return res.status(404).json({
      error: 'NUIT não encontrado. O seu perfil de utilizador deve ser previamente cadastrado pelo Administrador no sistema.'
    });
  }

  // 3. Atualizar a palavra-passe e o estado, preservando RIGOROSAMENTE o role_id e dados atribuídos
  const existingUser = usersList[userIdx];
  const hashedPassword = bcrypt.hashSync(String(password).trim(), 10);
  usersList[userIdx] = {
    ...existingUser,
    password: hashedPassword,
    status: 'Ativo'
  };

  // Se estiver sincronizado com o Gist, salvar na nuvem
  if (GIST_ID && GITHUB_TOKEN && gistData) {
    try {
      const content = gistData.files && gistData.files[GIST_FILENAME] ? gistData.files[GIST_FILENAME].content : '{}';
      const parsed = JSON.parse(content || '{}');
      parsed.users = usersList;
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
              content: JSON.stringify(parsed, null, 2)
            }
          }
        })
      });
    } catch (_e) {}
  }

  return res.json({
    success: true,
    message: `Acesso ativado com sucesso para ${existingUser.name || 'o seu perfil'}! Inicie sessão com o seu NUIT.`
  });
}

