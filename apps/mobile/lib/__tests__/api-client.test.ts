// api-client.test.ts
// jest.setup.ts mocks @/lib/api-client globally.
// This file tests the REAL implementation, so we override the mock.

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Unmock api-client so we test the real code
jest.unmock('@/lib/api-client');

import * as SecureStore from 'expo-secure-store';
import { api, setOnUnauthorized, setOnNetworkError } from '../api-client';

const mockFetch = (status: number, body: object) => {
  (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as unknown as Response);
};

describe('api-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    // Reset callbacks
    setOnUnauthorized(() => {});
    setOnNetworkError(() => {});
  });

  describe('api.get', () => {
    it('calls fetch with correct URL and Content-Type header', async () => {
      mockFetch(200, { tasks: [] });

      await api.get('/api/tasks');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tasks'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    it('includes Authorization header when token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('my-jwt-token');
      mockFetch(200, { user: {} });

      await api.get('/api/auth/me');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer my-jwt-token' }),
        })
      );
    });

    it('does not include Authorization header when no token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      mockFetch(200, { data: 'ok' });

      await api.get('/api/tasks');

      const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('returns parsed JSON on success', async () => {
      mockFetch(200, { tasks: [{ id: '1' }] });

      const result = await api.get<{ tasks: { id: string }[] }>('/api/tasks');
      expect(result.tasks).toHaveLength(1);
    });

    it('throws API error message on non-ok response', async () => {
      mockFetch(400, { error: 'Bad request' });

      await expect(api.get('/api/tasks')).rejects.toThrow('Bad request');
    });

    it('throws generic error when API error field missing', async () => {
      mockFetch(500, {});

      await expect(api.get('/api/tasks')).rejects.toThrow('Ошибка запроса');
    });
  });

  describe('api.post', () => {
    it('sends POST with JSON-serialized body', async () => {
      mockFetch(201, { user: { id: '1' } });

      await api.post('/api/auth/login', { email: 'a@b.com', password: '123' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com', password: '123' }),
        })
      );
    });
  });

  describe('api.put', () => {
    it('sends PUT method', async () => {
      mockFetch(200, { user: {} });

      await api.put('/api/profile', { fullName: 'Ali' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('api.del', () => {
    it('sends DELETE method', async () => {
      mockFetch(200, { ok: true });

      await api.del('/api/subscription');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('401 handling', () => {
    it('calls onUnauthorized callback and throws session error', async () => {
      const onUnauthorized = jest.fn();
      setOnUnauthorized(onUnauthorized);
      mockFetch(401, { error: 'Unauthorized' });

      await expect(api.get('/api/auth/me')).rejects.toThrow('Сессия истекла');
      expect(onUnauthorized).toHaveBeenCalled();
    });
  });

  describe('network error handling', () => {
    it('calls onNetworkError callback and throws connectivity error', async () => {
      const onNetworkError = jest.fn();
      setOnNetworkError(onNetworkError);

      (global.fetch as jest.Mock) = jest.fn().mockRejectedValue(new Error('Network failed'));

      await expect(api.get('/api/tasks')).rejects.toThrow('Нет подключения');
      expect(onNetworkError).toHaveBeenCalled();
    });
  });
});
