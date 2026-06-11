import * as storage from '@/lib/storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.dastiyor.com';
const REQUEST_TIMEOUT_MS = 15_000;

// Callbacks registered by AuthProvider / app shell
let _onUnauthorized: (() => void) | null = null;
let _onNetworkError: (() => void) | null = null;
let _onNetworkRecovered: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) { _onUnauthorized = cb; }
export function setOnNetworkError(cb: () => void) { _onNetworkError = cb; }
export function setOnNetworkRecovered(cb: () => void) { _onNetworkRecovered = cb; }

async function getToken(): Promise<string | null> {
  return storage.getItem('auth_token');
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
  } catch (err: any) {
    if (err?.name === 'AbortError') {
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

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Ошибка запроса');
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'DELETE',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
};
