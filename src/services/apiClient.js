/**
 * src/services/apiClient.js
 * Utilitário central de chamadas à API com deteção inteligente de ambiente.
 * No ambiente Vercel (onde o backend Express/SQLite não corre em servidor próprio),
 * redireciona instantaneamente para o mecanismo de fallback offline/cloudSync,
 * evitando atrasos de rede ou erros de parsing HTML ("Unexpected token <").
 */

export const isVercelHost = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('vercel.app') || (host !== 'localhost' && host !== '127.0.0.1');
};

export async function safeApiCall(url, options = {}) {
  // Endpoints serverless que existem nativamente na Vercel
  const isVercelServerlessEndpoint = url.startsWith('/api/sync');

  // Se estiver na Vercel e for um endpoint do Express (SQLite), salta diretamente para o fallback
  if (isVercelHost() && !isVercelServerlessEndpoint) {
    throw new Error('Ambiente Vercel ativo — a utilizar persistência local e sincronização em nuvem.');
  }

  const timeoutMs = options.timeout || 3500;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions = { ...options };
  if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('sernic_jwt_token') || localStorage.getItem('sernic_jwt_token'))
    : null;

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: fetchOptions.signal || controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(fetchOptions.headers || {})
      }
    });
    clearTimeout(timer);

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html')) {
      const err = await res.json().catch(() => ({ error: res.statusText || 'Erro no servidor' }));
      throw new Error(err.error || res.statusText || 'API indisponível');
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
