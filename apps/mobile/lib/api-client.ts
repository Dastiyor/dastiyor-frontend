import * as storage from '@/lib/storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.dastiyor.com';
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Error thrown for non-2xx API responses. Keeps `.message` (sanitized, safe to
 * display) for backward compatibility while exposing a machine-readable `code`
 * and HTTP `status` so callers can branch without brittle string matching.
 */
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Callbacks registered by AuthProvider / app shell
let _onUnauthorized: (() => void) | null = null;
let _onNetworkError: (() => void) | null = null;
let _onNetworkRecovered: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) { _onUnauthorized = cb; }
export function setOnNetworkError(cb: () => void) { _onNetworkError = cb; }
export function setOnNetworkRecovered(cb: () => void) { _onNetworkRecovered = cb; }

/** Sanitize server error text before showing in UI (OWASP API3). */
export function sanitizeApiError(status: number, serverError?: string): string {
  if (status >= 500) return 'Ошибка сервера. Попробуйте позже.';
  if (!serverError || typeof serverError !== 'string') return 'Ошибка запроса';
  if (serverError.length > 200) return 'Ошибка запроса';
  if (/stack|prisma|sql|internal|exception|traceback|at\s+\w+/i.test(serverError)) {
    return 'Ошибка запроса';
  }
  return serverError;
}

async function getToken(): Promise<string | null> {
  return storage.getItem('auth_token');
}

async function parseResponseBody(res: Response): Promise<{ error?: string; [key: string]: unknown }> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { error?: string; [key: string]: unknown };
  } catch {
    return {};
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal });
    _onNetworkRecovered?.();
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') {
      throw new Error('Превышено время ожидания. Проверьте соединение.');
    }
    _onNetworkError?.();
    throw new Error('Нет подключения к интернету');
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 401) {
    _onUnauthorized?.();
    throw new Error('Сессия истекла. Войдите снова.');
  }

  const data = await parseResponseBody(res);

  if (!res.ok) {
    const serverError = typeof data.error === 'string' ? data.error : undefined;
    const code = typeof data.code === 'string' ? data.code : undefined;
    throw new ApiError(sanitizeApiError(res.status, serverError), res.status, code);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'DELETE',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
};
