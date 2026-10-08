/**
 * api/login.js
 * Vercel Serverless Function para autenticação segura e emissão de token JWT
 * Permite que a aplicação em nuvem (Vercel) autentique utilizadores e gere tokens
 * criptográficos assinados com JWT_SECRET no servidor, sem expor chaves ao navegador.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET;
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

// Perfil de fallback se não definido
const DEFAULT_SUPER_ROLE = {
  id: 'super_admin_1',
  name: 'Super Administrador Principal',
  permissions: { all: true }
};

function getLocalUsers() {
  try {
    const jsonPath = path.resolve(process.cwd(), 'src', 'data', 'initialDbData.json');
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, 'utf8');
      const data = JSON.parse(content);
      return Array.isArray(data.users) ? data.users : [];
    }
  } catch (_e) {}
  return [];
}

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

  if (!JWT_SECRET) {
    return res.status(500).json({
      error: 'Servidor não configurado. Defina a variável de ambiente JWT_SECRET no Vercel.'
    });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de utilizador e palavra-passe obrigatórios.' });
  }

  const cleanU = String(username).trim().toLowerCase();
  const cleanP = String(password).trim();

  // Carregar lista de utilizadores disponíveis
  let usersList = [];

  // 1. Tentar obter da base de dados sincronizada no GitHub Gist
  if (GIST_ID && GITHUB_TOKEN) {
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
        if (Array.isArray(parsed.users) && parsed.users.length > 0) {
          usersList = parsed.users;
        }
      }
    } catch (_e) {}
  }

  // 2. Se a nuvem não tiver utilizadores ou não estiver configurada, carregar dados locais sincronizados
  if (usersList.length === 0) {
    usersList = getLocalUsers();
  }

  // 3. Procurar utilizador por username, nuit ou email (TS08b)
  const foundUser = usersList.find(u => 
    (u.username && String(u.username).toLowerCase() === cleanU) || 
    (u.nuit && String(u.nuit).toLowerCase() === cleanU) ||
    (u.email && String(u.email).toLowerCase() === cleanU)
  );

  if (!foundUser || !foundUser.password) {
    return res.status(401).json({
      success: false,
      error: 'Credenciais inválidas. Verifique o utilizador ou a palavra-passe.'
    });
  }

  // 4. Validar EXCLUSIVAMENTE contra utilizadores com senha cifrada em bcrypt ($2a$ ou $2b$)
  // Rejeita terminantemente senhas em texto simples
  const pwd = String(foundUser.password).trim();
  const isBcrypt = pwd.startsWith('$2a$') || pwd.startsWith('$2b$');

  if (!isBcrypt) {
    return res.status(401).json({
      success: false,
      error: 'Credenciais inválidas. Palavra-passe não possui formato criptográfico seguro.'
    });
  }

  const isValidPassword = bcrypt.compareSync(cleanP, pwd);
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: 'Credenciais inválidas. Verifique o utilizador ou a palavra-passe.'
    });
  }

  // 5. Montar payload seguro e assinar JWT
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
