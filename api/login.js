/**
 * api/login.js
 * Vercel Serverless Function para autenticação segura e emissão de token JWT
 * Permite que a aplicação em nuvem (Vercel) autentique utilizadores e gere tokens
 * criptográficos assinados com JWT_SECRET no servidor, sem expor senhas ao navegador.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

// Hashes criptográficos BCrypt ($2b$10$) pré-configurados no servidor (sem senhas em texto simples)
const SERVER_SEED_USERS = [
  {
    id: 'usr_buenaverte_main',
    name: 'Buenaverte',
    username: '123922328',
    nuit: '123922328',
    email: 'buenaverte@gmail.com',
    role_id: 'super_admin_1',
    status: 'Ativo',
    password: '$2b$10$1eAzpYFdFJyEdU3hAbFuvOJZ7CNZylzjqKOXkJX49GiFROtUfi0XW'
  },
  {
    id: 'usr_admin',
    name: 'Administrador Principal',
    username: 'admin',
    nuit: 'admin',
    role_id: 'super_admin_1',
    status: 'Ativo',
    password: '$2b$10$.NQzvFdQBf.NIoZ3aN/3KOoGB697/wgHTRP7TAEKeCFo8OY59oYo2'
  },
  {
    id: 'usr_admin_maputo_cidade',
    name: 'Administrador RH (Cidade de Maputo)',
    username: 'Administrador',
    nuit: 'Administrador',
    role_id: 'usuario_admin',
    status: 'Ativo',
    password: '$2b$10$Ed7ryvQDHuZG9RGde3XEWOr5DQR4JLQNqLQEb/tkaEAO5UL2o0nmq'
  },
  {
    id: 'usr_1788863244291',
    name: 'Buenaverte',
    username: 'Buenaverte',
    nuit: '256487895555',
    role_id: 'usuario_admin',
    status: 'Ativo',
    password: '$2b$10$0jp4WGvblRHYVC4stu/m6.VpPvOhSGXFnP/Q5CPH7YWwnr9rCHTfW'
  }
];

// Rate Limiting para proteção contra força bruta no Vercel (TS09)
const failedAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

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

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const trackKey = `${clientIp}_${cleanU}`;
  const now = Date.now();
  const attemptInfo = failedAttempts.get(trackKey);

  // TS09: Bloqueio automático se excedeu 5 tentativas falhadas
  if (attemptInfo && attemptInfo.lockUntil && now < attemptInfo.lockUntil) {
    const waitMinutes = Math.ceil((attemptInfo.lockUntil - now) / 60000);
    return res.status(429).json({
      error: 'account_locked',
      message: `Conta temporariamente bloqueada após excesso de tentativas falhadas. Tente novamente em ${waitMinutes} minutos.`
    });
  }

  const recordFailed = (errMsg) => {
    const currentCount = (attemptInfo ? attemptInfo.count : 0) + 1;
    if (currentCount >= MAX_FAILED_ATTEMPTS) {
      failedAttempts.set(trackKey, { count: currentCount, lockUntil: now + LOCKOUT_DURATION_MS });
      return res.status(429).json({
        error: 'account_locked',
        message: 'Conta temporariamente bloqueada após 5 tentativas falhadas consecutivas. Tente novamente após 15 minutos.'
      });
    }
    failedAttempts.set(trackKey, { count: currentCount, lockUntil: 0 });
    return res.status(401).json({ success: false, error: errMsg });
  };

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

  // 2. Se a nuvem não tiver utilizadores ou não estiver configurada, carregar dados com hashes seguros do servidor
  if (usersList.length === 0) {
    usersList = SERVER_SEED_USERS;
  }

  // 3. Procurar utilizador por username, nuit ou email (TS08b)
  const foundUser = usersList.find(u => 
    (u.username && String(u.username).toLowerCase() === cleanU) || 
    (u.nuit && String(u.nuit).toLowerCase() === cleanU) ||
    (u.email && String(u.email).toLowerCase() === cleanU)
  );

  if (!foundUser || !foundUser.password) {
    return recordFailed('Credenciais inválidas. Verifique o utilizador ou a palavra-passe.');
  }

  // 4. Validar EXCLUSIVAMENTE contra utilizadores com senha cifrada em bcrypt ($2a$ ou $2b$)
  // Rejeita terminantemente senhas em texto simples
  const pwd = String(foundUser.password).trim();
  const isBcrypt = pwd.startsWith('$2a$') || pwd.startsWith('$2b$');

  if (!isBcrypt) {
    return recordFailed('Credenciais inválidas. Palavra-passe não possui formato criptográfico seguro.');
  }

  const isValidPassword = bcrypt.compareSync(cleanP, pwd);
  if (!isValidPassword) {
    return recordFailed('Credenciais inválidas. Verifique o utilizador ou a palavra-passe.');
  }

  // Sucesso: limpar contador de tentativas falhadas (TS09)
  failedAttempts.delete(trackKey);

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
