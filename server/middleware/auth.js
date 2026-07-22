import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sernic-super-secret-key-2026';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️  [SEGURANÇA] JWT_SECRET não configurado nas variáveis de ambiente em modo de produção!');
}

export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role_id, 
      delegatedRole: user.delegated_role_id 
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nenhum token fornecido ou formato inválido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const userRole = req.user.delegatedRole || req.user.role;
    
    // Super Administrador tem acesso total por padrão
    if (userRole === 'super_admin') {
      return next();
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Sem permissão para esta ação' });
      }
    }
    next();
  };
}
