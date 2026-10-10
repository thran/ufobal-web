export const API_BASE = '/api_frontend/';

export class ApiError extends Error {
  status: number;
  errorType: string | null;

  constructor(status: number, message: string, errorType: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorType = errorType;
  }
}

export function getCookie(name: string): string | null {
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq) === name) {
      const value = decodeURIComponent(part.slice(eq + 1));
      return value || null;
    }
  }
  return null;
}

function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function api<T>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    const token = getCookie('csrftoken');
    if (token) headers['X-CSRFToken'] = token;
  }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    credentials: 'same-origin',
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const body = parseBody(await res.text());

  if (!res.ok) {
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      const errorType = 'error_type' in body && typeof body.error_type === 'string' ? body.error_type : null;
      throw new ApiError(res.status, body.error, errorType);
    }
    throw new ApiError(res.status, typeof body === 'string' && body ? body : res.statusText);
  }
  return body as T;
}
