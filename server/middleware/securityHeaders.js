/**
 * server/middleware/securityHeaders.js
 * Cabeçalhos Defensivos HTTP de Nível Empresarial — Conformidade OWASP Top 10 & ISO/IEC 27001
 * Protege contra XSS, Clickjacking, MIME-Sniffing e Injeção de Scripts Externos.
 */

export function securityHeaders(req, res, next) {
  // 1. Prevenção de Clickjacking (Obriga o sistema a não ser incorporado em iframes maliciosos)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // 2. Prevenção de MIME-Type Sniffing (Garante que o navegador respeita os tipos MIME declarados)
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 3. Proteção XSS Legada
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 4. Política de Referrer Estrita (Não vaza URLs internas para fora da aplicação)
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 5. Política de Recursos de Origem Cruzada
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // 6. Política de Abertura de Janelas de Origem Cruzada
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // 7. Desativar pré-carregamento de DNS para domínios de terceiros
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // 8. Ocultar que o servidor utiliza Express (Dificulta o reconhecimento de tecnologias por atacantes)
  res.removeHeader('X-Powered-By');

  // 9. Content Security Policy (CSP) robusta e compatível com React + Vite
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' http://localhost:* ws://localhost:* https://*.vercel.app",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );

  // 10. Forçar HTTPS (HSTS) em ambientes de produção
  if (process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}
