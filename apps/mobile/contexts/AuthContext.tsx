import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { api, setOnUnauthorized } from '@/lib/api-client';
import type { ApiUser } from '@dastiyor/types';

interface RegisterData {
  phone: string;
  email?: string;
  password: string;
  fullName: string;
  role: 'customer' | 'provider';
}

interface AuthState {
  user: ApiUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginWithGoogle: (accessToken: string, role?: string) => Promise<void>;
  loginWithApple: (identityToken: string, email?: string, fullName?: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOnUnauthorized(async () => {
      await SecureStore.deleteItemAsync('auth_token');
      setUser(null);
      router.replace('/(auth)/login');
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          const me = await api.get<ApiUser>('/api/auth/me');
          setUser(me);
        }
      } catch {
        await SecureStore.deleteItemAsync('auth_token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(identifier: string, password: string) {
    const res = await api.post<{ token: string; user: ApiUser }>('/api/auth/login', { identifier, password });
    await SecureStore.setItemAsync('auth_token', res.token);
    setUser(res.user);
  }

  async function register(data: RegisterData) {
    const res = await api.post<{ token: string; user: ApiUser }>('/api/auth/register', data);
    await SecureStore.setItemAsync('auth_token', res.token);
    setUser(res.user);
  }

  async function loginWithGoogle(accessToken: string, role = 'customer') {
    const res = await api.post<{ token: string; user: ApiUser }>('/api/auth/google/mobile', {
      accessToken,
      role,
    });
    await SecureStore.setItemAsync('auth_token', res.token);
    setUser(res.user);
  }

  async function loginWithApple(
    identityToken: string,
    email?: string,
    fullName?: string,
    role = 'customer',
  ) {
    const res = await api.post<{ token: string; user: ApiUser }>('/api/auth/apple/mobile', {
      identityToken,
      email,
      fullName,
      role,
    });
    await SecureStore.setItemAsync('auth_token', res.token);
    setUser(res.user);
  }

  async function logout() {
    await SecureStore.deleteItemAsync('auth_token');
    setUser(null);
    router.replace('/(auth)/login');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, loginWithApple, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
