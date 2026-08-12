/**
 * server/middleware/auth.js
 * Middleware de Autenticação e Verificação de Permissões para o Backend Express (SERNIC)
 */

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
      delegatedRole: user.delegated_role_id,
      directorateId: user.directorate_id
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

/**
 * Express Middleware: Autentica o utilizador por JWT Bearer Token ou Headers HTTP de Sessão (x-user-role / x-user-id)
 */
export function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      // Falha no token JWT, avança para tentar verificar headers customizados
    }
  }

  // Identificação complementar de sessão por headers HTTP
  const userId = req.headers['x-user-id'] || req.headers['user-id'];
  const userRole = req.headers['x-user-role'] || req.headers['user-role'] || req.headers['x-role-id'];

  if (userId || userRole) {
    req.user = {
      id: userId || 'usr_session',
      role: userRole || 'usuario_normal',
      delegatedRole: req.headers['x-delegated-role'] || null,
      directorateId: req.headers['x-directorate-id'] || null
    };
    return next();
  }

  req.user = null;
  next();
}

/**
 * Middleware Guard para Verificação de Permissão de Perfis de Utilizador no Backend
 * Retorna HTTP 403 Forbidden se o utilizador não possuir o perfil/papel autorizado.
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.user ? (req.user.delegatedRole || req.user.role) : (req.headers['x-user-role'] || req.headers['user-role'] || req.headers['x-role-id']);

    if (!userRole) {
      return res.status(401).json({ 
        error: 'Não Autenticado (401 Unauthorized)',
        message: 'Nenhum utilizador ou sessão foi fornecida para executar esta ação.' 
      });
    }

    const normalizedRole = String(userRole).toLowerCase();

    // Perfis Centrais Superiores (1º Nível Super Admin Principal e 2º Nível Super Admin) têm permissão total por padrão
    if (
      normalizedRole === 'super_admin_1' || 
      normalizedRole === 'admin_1' || 
      normalizedRole === 'super_admin' || 
      normalizedRole === 'admin'
    ) {
      return next();
    }

    if (allowedRoles.length > 0) {
      const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase());
      const isAllowed = normalizedAllowed.some(allowedPattern => {
        if (allowedPattern === normalizedRole) return true;
        if (allowedPattern === 'admin_central' && ['super_admin_1', 'admin_1', 'admin_2'].includes(normalizedRole)) return true;
        if (allowedPattern === 'central' && ['super_admin_1', 'admin_1', 'admin_2', 'tecnico_reserva', 'tecnico_saude'].includes(normalizedRole)) return true;
        return false;
      });

      if (!isAllowed) {
        return res.status(403).json({ 
          error: 'Acesso Negado (403 Forbidden)', 
          message: `Ação não autorizada. O seu perfil (${userRole}) não possui permissão para modificar as configurações do sistema.` 
        });
      }
    }

    next();
  };
}

/**
 * Guard Específico para Rotas de Configuração do Sistema e Definições de Segurança
 * Permite leitura GET a todos os perfis ativos, mas EXIGE PERFIL ADMINISTRATIVO para alterações (PUT, POST, DELETE).
 */
export function requireSystemSettingsPermission(req, res, next) {
  if (req.method === 'GET') {
    return next();
  }

  // Apenas Perfis Centrais e Administradores (1º, 2º, 3º e 4º Níveis) podem alterar configurações do sistema
  return requireRole(['super_admin_1', 'admin_1', 'admin_2', 'usuario_admin', 'admin_central'])(req, res, next);
}
