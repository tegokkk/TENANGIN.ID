import { ApiError, normalizeApiError } from './api-error.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

let csrfTokenInMemory = null;

export function setCsrfTokenInMemory(token) {
  csrfTokenInMemory = token || null;
}

export function clearCsrfTokenInMemory() {
  csrfTokenInMemory = null;
}

export async function fetchCsrfToken(forceRefresh = false) {
  if (csrfTokenInMemory && !forceRefresh) {
    return csrfTokenInMemory;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError({ isNetworkError: true });
  }

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.data?.csrfToken) {
    throw normalizeApiError(res.status, body);
  }
  csrfTokenInMemory = body.data.csrfToken;
  return csrfTokenInMemory;
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (isMutation) {
    const token = await fetchCsrfToken(false);
    headers.set('x-csrf-token', token);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
      signal: options.signal,
      body:
        options.body !== undefined
          ? typeof options.body === 'string'
            ? options.body
            : JSON.stringify(options.body)
          : undefined,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError({ isNetworkError: true });
  }

  let json = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    json = await res.json().catch(() => null);
  }

  // Jika CSRF kedaluwarsa karena sesi berubah di tab lain, refresh satu kali dan ulangi
  if (res.status === 403 && json?.error?.code === 'CSRF_INVALID' && isMutation && !options._retriedCsrf) {
    await fetchCsrfToken(true);
    return apiRequest(path, { ...options, _retriedCsrf: true });
  }

  if (!res.ok) {
    throw normalizeApiError(res.status, json);
  }

  if (options.responseType === 'text' || contentType.includes('text/csv')) {
    return res.text();
  }

  if (json?.data?.csrfToken) {
    csrfTokenInMemory = json.data.csrfToken;
  }

  return json?.data ?? json;
}
