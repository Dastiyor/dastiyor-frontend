import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { api } from '@/lib/api-client';
import { AuthProvider, useAuth } from '../AuthContext';

const mockApi = api as jest.Mocked<typeof api>;
const mockRouter = router as jest.Mocked<typeof router>;

function TestConsumer({ action }: { action?: (auth: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();
  if (action) {
    React.useEffect(() => { action(auth); }, []);
  }
  return (
    <>
      <Text testID="loading">{String(auth.loading)}</Text>
      <Text testID="user">{auth.user ? auth.user.email : 'null'}</Text>
    </>
  );
}

function renderWithAuth(action?: (auth: ReturnType<typeof useAuth>) => void) {
  return render(
    <AuthProvider>
      <TestConsumer action={action} />
    </AuthProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  describe('initial state', () => {
    it('starts with loading=true then resolves to false', async () => {
      const { getByTestId } = renderWithAuth();
      // After async init
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));
    });

    it('user is null when no token in secure store', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const { getByTestId } = renderWithAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      expect(getByTestId('user').props.children).toBe('null');
    });

    it('restores user from stored token on mount', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored-token');
      mockApi.get.mockResolvedValue({ id: 'u1', email: 'ali@test.com' });

      const { getByTestId } = renderWithAuth();
      await waitFor(() => expect(getByTestId('user').props.children).toBe('ali@test.com'));
    });

    it('clears token when /api/auth/me fails on mount', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('bad-token');
      mockApi.get.mockRejectedValue(new Error('Unauthorized'));

      const { getByTestId } = renderWithAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(getByTestId('user').props.children).toBe('null');
    });
  });

  describe('login', () => {
    it('stores token and sets user on successful login', async () => {
      mockApi.post.mockResolvedValue({
        token: 'new-jwt',
        user: { id: 'u1', email: 'ali@test.com' },
      });

      let authRef: ReturnType<typeof useAuth>;
      const { getByTestId } = renderWithAuth((auth) => { authRef = auth; });
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        await authRef!.login('ali@test.com', 'pass123');
      });

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'new-jwt');
      expect(getByTestId('user').props.children).toBe('ali@test.com');
    });

    it('throws when API returns error', async () => {
      mockApi.post.mockRejectedValue(new Error('Invalid credentials'));

      let authRef: ReturnType<typeof useAuth>;
      renderWithAuth((auth) => { authRef = auth; });
      await waitFor(() => {});

      await expect(authRef!.login('bad@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('stores token and sets user on successful registration', async () => {
      mockApi.post.mockResolvedValue({
        token: 'reg-jwt',
        user: { id: 'u2', email: 'new@test.com' },
      });

      let authRef: ReturnType<typeof useAuth>;
      const { getByTestId } = renderWithAuth((auth) => { authRef = auth; });
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        await authRef!.register({
          phone: '+992901234567',
          password: 'pass123',
          fullName: 'New User',
          role: 'customer',
        });
      });

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'reg-jwt');
      expect(getByTestId('user').props.children).toBe('new@test.com');
    });
  });

  describe('logout', () => {
    it('deletes token, clears user, and navigates to login', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token');
      mockApi.get.mockResolvedValue({ id: 'u1', email: 'ali@test.com' });

      let authRef: ReturnType<typeof useAuth>;
      const { getByTestId } = renderWithAuth((auth) => { authRef = auth; });
      await waitFor(() => expect(getByTestId('user').props.children).toBe('ali@test.com'));

      await act(async () => { await authRef!.logout(); });

      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/logout');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(getByTestId('user').props.children).toBe('null');
      expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  describe('OAuth', () => {
    it('loginWithGoogle stores token and sets user', async () => {
      mockApi.post.mockResolvedValue({
        token: 'g-jwt',
        user: { id: 'g1', email: 'google@test.com' },
      });

      let authRef: ReturnType<typeof useAuth>;
      const { getByTestId } = renderWithAuth((auth) => { authRef = auth; });
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        await authRef!.loginWithGoogle('google-access-token');
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/google/mobile', expect.objectContaining({
        accessToken: 'google-access-token',
      }));
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'g-jwt');
      expect(getByTestId('user').props.children).toBe('google@test.com');
    });

    it('loginWithApple stores token and sets user', async () => {
      mockApi.post.mockResolvedValue({
        token: 'a-jwt',
        user: { id: 'a1', email: 'apple@test.com' },
      });

      let authRef: ReturnType<typeof useAuth>;
      const { getByTestId } = renderWithAuth((auth) => { authRef = auth; });
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await act(async () => {
        await authRef!.loginWithApple('apple-identity-token', 'apple@test.com', 'Apple User');
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/apple/mobile', expect.objectContaining({
        identityToken: 'apple-identity-token',
      }));
      expect(getByTestId('user').props.children).toBe('apple@test.com');
    });
  });

  describe('useAuth guard', () => {
    it('throws when used outside AuthProvider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within AuthProvider');
      spy.mockRestore();
    });
  });
});
