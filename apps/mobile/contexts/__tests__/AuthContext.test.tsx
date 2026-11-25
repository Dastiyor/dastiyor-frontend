import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { api, setOnUnauthorized } from '@/lib/api-client';
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
    // Sign-in now also calls /api/auth/me; a value one test set must not leak into the next.
    mockApi.get.mockReset();
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

    it('loads the full profile after signing in (the login response has no phone or photo)', async () => {
      mockApi.post.mockResolvedValue({ token: 'new-jwt', user: { id: 'u1', email: 'ali@test.com' } });
      // /api/auth/me answers with the full record; the email differs so the test can see it landed.
      mockApi.get.mockResolvedValueOnce({ id: 'u1', email: 'full@test.com', phone: '+992901234567' });

      let authRef: ReturnType<typeof useAuth>;
      const { getByTestId } = renderWithAuth((auth) => { authRef = auth; });
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));
      await act(async () => { await authRef!.login('ali@test.com', 'pass123'); });

      expect(mockApi.get).toHaveBeenCalledWith('/api/auth/me');
      await waitFor(() => expect(getByTestId('user').props.children).toBe('full@test.com'));
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
          code: '123456',
        });
      });

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'reg-jwt');
      expect(getByTestId('user').props.children).toBe('new@test.com');
    });
  });

  describe('revoked session (401)', () => {
    const unauthorizedHandler = () =>
      (setOnUnauthorized as jest.Mock).mock.calls.at(-1)![0] as () => Promise<void>;

    it('does not navigate on launch, so app/index can hide the splash', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('revoked-token');
      // What api-client does on a 401: call the handler, then throw.
      mockApi.get.mockImplementation(async () => {
        await unauthorizedHandler()();
        throw new Error('Сессия истекла. Войдите снова.');
      });

      const { getByTestId } = renderWithAuth();
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(getByTestId('user').props.children).toBe('null');
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('sends the user to login when it happens after launch', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token');
      mockApi.get.mockResolvedValue({ id: 'u1', email: 'ali@test.com' });

      const { getByTestId } = renderWithAuth();
      await waitFor(() => expect(getByTestId('user').props.children).toBe('ali@test.com'));

      await act(async () => { await unauthorizedHandler()(); });

      expect(getByTestId('user').props.children).toBe('null');
      expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');
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

    it('asks the server to hold a new account until the role is picked', async () => {
      mockApi.post.mockResolvedValue({ roleRequired: true });
      (SecureStore.setItemAsync as jest.Mock).mockClear();

      let authRef: ReturnType<typeof useAuth>;
      const { getByTestId } = renderWithAuth((auth) => { authRef = auth; });
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      let result: string | undefined;
      await act(async () => {
        result = await authRef!.loginWithGoogle('google-access-token');
      });

      expect(result).toBe('role-required');
      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/google/mobile', {
        accessToken: 'google-access-token',
        deferRole: true,
      });
      expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('auth_token', expect.anything());
      expect(getByTestId('user').props.children).toBe('null');
    });

    it('sends the picked role, and no deferRole, on the second call', async () => {
      mockApi.post.mockResolvedValue({ token: 'a-jwt', user: { id: 'a1', email: 'apple@test.com' } });

      let authRef: ReturnType<typeof useAuth>;
      const { getByTestId } = renderWithAuth((auth) => { authRef = auth; });
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      let result: string | undefined;
      await act(async () => {
        result = await authRef!.loginWithApple('apple-identity-token', 'apple@test.com', 'Apple User', 'provider');
      });

      expect(result).toBe('signed-in');
      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/apple/mobile', {
        identityToken: 'apple-identity-token',
        email: 'apple@test.com',
        fullName: 'Apple User',
        role: 'provider',
      });
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'a-jwt');
    });

    it('fails loudly on a response with neither a token nor roleRequired', async () => {
      mockApi.post.mockResolvedValue({});

      let authRef: ReturnType<typeof useAuth>;
      const { getByTestId } = renderWithAuth((auth) => { authRef = auth; });
      await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

      await expect(authRef!.loginWithGoogle('t')).rejects.toThrow();
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
