/**
 * server/middleware/auth.js
 * Middleware de Autenticação Estrita e Verificação de Permissões (Conformidade Tabela 21)
 * - Token JWT Obrigatório assinado pelo servidor em todas as rotas protegidas
 * - Eliminação total de bypass por cabeçalhos x-user-role / x-user-id
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sernic-super-secret-key-2026';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️  [SEGURANÇA] JWT_SECRET não configurado nas variáveis de ambiente em modo de produção!');
}

/**
 * Gera um token JWT seguro assinado pelo servidor
 */
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.roleId || user.role_id || user.role, 
      delegatedRole: user.delegatedRoleId || user.delegated_role_id || null,
      directorateId: user.directorateId || user.directorate_id || null
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

/**
 * Express Middleware: Autentica o utilizador OBRIGATORIAMENTE por JWT Bearer Token.
 * Rejeita qualquer tentativa de personificação por cabeçalhos HTTP livres (Fim do bypass).
 */
export function authenticateUser(req, res, next) {
  // Rotas públicas que não requerem token JWT
  const publicPaths = ['/api/auth/login', '/api/health', '/api/sync-photo'];
  const currentPath = (req.originalUrl || req.url || '').split('?')[0];

  if (publicPaths.some(p => currentPath === p || currentPath.startsWith(p))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Não Autenticado (401 Unauthorized)',
      message: 'Token JWT obrigatório. Forneça o cabeçalho Authorization: Bearer <token> para aceder a esta funcionalidade.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Token Inválido ou Expirado (401 Unauthorized)',
      message: 'A sua sessão expirou ou o token de segurança é inválido. Por favor, autentique-se novamente.'
    });
  }
}

/**
 * Middleware Guard para Verificação de Permissão de Perfis de Utilizador no Backend.
 * Obtém o perfil EXCLUSIVAMENTE do token JWT validado pelo servidor.
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Não Autenticado (401 Unauthorized)',
        message: 'Nenhum utilizador autenticado via JWT foi identificado.' 
      });
    }

    const userRole = req.user.delegatedRole || req.user.role;
    if (!userRole) {
      return res.status(403).json({ 
        error: 'Acesso Negado (403 Forbidden)', 
        message: 'O token fornecido não possui perfil atribuído.' 
      });
    }

    const normalizedRole = String(userRole).toLowerCase();

    // Perfis Centrais Superiores têm acesso administrativo completo
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
          message: `Ação não autorizada. O seu perfil (${userRole}) não possui permissão para esta operação.` 
        });
      }
    }

    next();
  };
}

/**
 * Guard Específico para Rotas de Configuração do Sistema e Definições de Segurança
 */
export function requireSystemSettingsPermission(req, res, next) {
  if (req.method === 'GET') {
    return next();
  }
  return requireRole(['super_admin_1', 'admin_1', 'admin_2', 'usuario_admin', 'admin_central'])(req, res, next);
}
