/**
 * api/login.js
 * Vercel Serverless Function para autenticação segura e emissão de token JWT
 * Permite que a aplicação em nuvem (Vercel) autentique utilizadores e gere tokens
 * criptográficos assinados com JWT_SECRET no servidor, sem expor chaves ao navegador.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'sernic-super-secret-key-2026';
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

// Perfis e Utilizadores Padrão do Sistema
const DEFAULT_SUPER_ROLE = {
  id: 'super_admin_1',
  name: 'Super Administrador Principal',
  permissions: { all: true }
};

const DEFAULT_USERS = [
  {
    id: 'usr_buenaverte_main',
    name: 'Buenaverte',
    username: '123922328',
    nuit: '123922328',
    email: 'buenaverte@gmail.com',
    role_id: 'super_admin_1',
    status: 'Ativo',
    passwords: ['buenaverte7', 'admin123', '55555']
  },
  {
    id: 'usr_admin',
    name: 'Administrador Principal',
    username: 'admin',
    nuit: 'admin',
    role_id: 'super_admin_1',
    status: 'Ativo',
    passwords: ['admin123']
  },
  {
    id: 'usr_admin_maputo_cidade',
    name: 'Administrador RH (Cidade de Maputo)',
    username: 'Administrador',
    nuit: 'Administrador',
    role_id: 'usuario_admin',
    status: 'Ativo',
    passwords: ['55555']
  },
  {
    id: 'usr_basic',
    name: 'Utilizador Padrão',
    username: 'user',
    nuit: 'user',
    role_id: 'user',
    status: 'Ativo',
    passwords: ['user123']
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

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de utilizador e palavra-passe obrigatórios.' });
  }

  const cleanU = String(username).trim().toLowerCase();
  const cleanP = String(password).trim();

  // 1. Procurar nos utilizadores padrão
  let foundUser = DEFAULT_USERS.find(u => 
    u.username.toLowerCase() === cleanU || (u.nuit && u.nuit.toLowerCase() === cleanU)
  );

  let isValidPassword = false;
  if (foundUser && foundUser.passwords) {
    isValidPassword = foundUser.passwords.includes(cleanP);
  }

  // 2. Se não encontrou ou a senha não coincidiu, procurar na base sincronizada do Gist (se configurado)
  if (!isValidPassword && GIST_ID && GITHUB_TOKEN) {
    try {
      const gistRes = await fetch(`https://api.github.com/gists/${GIST_ID}?t=${Date.now()}`, {
        headers: {
          'User-Agent': 'sernic-drh-app',
          'Authorization': `token ${GITHUB_TOKEN}`
        }
      });
      if (gistRes.ok) {
        const gistData = await gistRes.json();
        const content = gistData.files && gistData.files[GIST_FILENAME] ? gistData.files[GIST_FILENAME].content : '{}';
        const parsed = JSON.parse(content || '{}');
        const cloudUsers = Array.isArray(parsed.users) ? parsed.users : [];
        const cloudMatch = cloudUsers.find(u => 
          (u.username && u.username.toLowerCase() === cleanU) || 
          (u.nuit && u.nuit.toLowerCase() === cleanU)
        );
        if (cloudMatch) {
          const pwd = cloudMatch.password || '';
          if (pwd.startsWith('$2a$') || pwd.startsWith('$2b$')) {
            isValidPassword = bcrypt.compareSync(cleanP, pwd);
          } else {
            isValidPassword = (pwd === cleanP);
          }
          if (isValidPassword) {
            foundUser = cloudMatch;
          }
        }
      }
    } catch (e) {
      console.warn('[api/login] Aviso ao consultar Gist:', e.message);
    }
  }

  if (!isValidPassword || !foundUser) {
    return res.status(401).json({
      success: false,
      error: 'Credenciais inválidas. Verifique o utilizador ou a palavra-passe.'
    });
  }

  // 3. Montar dados seguros do utilizador e assinar token JWT
  const userPayload = {
    id: foundUser.id,
    username: foundUser.username,
    role: foundUser.role_id || foundUser.role || 'user',
    directorateId: foundUser.directorateId || foundUser.directorate_id || null
  };

  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '8h' });

  const safeUser = {
    id: foundUser.id,
    name: foundUser.name,
    username: foundUser.username,
    nuit: foundUser.nuit || foundUser.username,
    email: foundUser.email || '',
    role_id: userPayload.role,
    role: userPayload.role,
    status: foundUser.status || 'Ativo',
    avatar: foundUser.avatar || foundUser.photo || null,
    photo: foundUser.avatar || foundUser.photo || null,
    roleDetails: {
      permissions: foundUser.permissions || DEFAULT_SUPER_ROLE.permissions
    }
  };

  return res.status(200).json({
    success: true,
    token,
    user: safeUser
  });
}
