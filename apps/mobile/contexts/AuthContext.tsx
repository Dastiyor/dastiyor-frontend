import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as storage from '@/lib/storage';
import { router } from 'expo-router';
import { api, setOnUnauthorized } from '@/lib/api-client';
import { registerForPushNotifications, unregisterPushNotifications } from '@/lib/push';
import { setUser as setErrorUser } from '@/lib/errorReporting';
import { track, identify, reset as resetAnalytics, AnalyticsEvent } from '@/lib/analytics';
import type { ApiUser } from '@dastiyor/types';

const PUSH_TOKEN_KEY = 'expo_push_token';

// Register this device for push and persist the token so we can unregister on
// logout. Fully non-blocking — push must never gate auth.
async function syncPushRegistration() {
  try {
    const token = await registerForPushNotifications();
    if (token) await storage.setItem(PUSH_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

async function clearPushRegistration() {
  try {
    const token = await storage.getItem(PUSH_TOKEN_KEY);
    await unregisterPushNotifications(token);
    await storage.deleteItem(PUSH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

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
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOnUnauthorized(async () => {
      await storage.deleteItem('auth_token');
      setUser(null);
      router.replace('/(auth)/login');
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await storage.getItem('auth_token');
        if (token) {
          const me = await api.get<ApiUser>('/api/auth/me');
          setUser(me);
          setErrorUser({ id: me.id, role: me.role });
          identify(me.id, { role: me.role });
          syncPushRegistration();
        }
      } catch {
        await storage.deleteItem('auth_token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist token, set user, attach error-reporting identity, register push,
  // and emit the funnel event (sign_up vs login, with auth method).
  function onAuthenticated(
    res: { token: string; user: ApiUser },
    event: string,
    method: string,
  ) {
    setUser(res.user);
    setErrorUser({ id: res.user.id, role: res.user.role });
    identify(res.user.id, { role: res.user.role });
    track(event, { method, role: res.user.role });
    syncPushRegistration();
  }

  async function login(identifier: string, password: string) {
    const res = await api.post<{ token: string; user: ApiUser }>('/api/auth/login', { identifier, password });
    await storage.setItem('auth_token', res.token);
    onAuthenticated(res, AnalyticsEvent.LoginCompleted, 'password');
  }

  async function register(data: RegisterData) {
    const res = await api.post<{ token: string; user: ApiUser }>('/api/auth/register', data);
    await storage.setItem('auth_token', res.token);
    onAuthenticated(res, AnalyticsEvent.SignUpCompleted, 'password');
  }

  async function loginWithGoogle(accessToken: string, role = 'customer') {
    const res = await api.post<{ token: string; user: ApiUser }>('/api/auth/google/mobile', {
      accessToken,
      role,
    });
    await storage.setItem('auth_token', res.token);
    onAuthenticated(res, AnalyticsEvent.LoginCompleted, 'google');
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
    await storage.setItem('auth_token', res.token);
    onAuthenticated(res, AnalyticsEvent.LoginCompleted, 'apple');
  }

  async function refreshUser() {
    try {
      const me = await api.get<ApiUser>('/api/auth/me');
      setUser(me);
    } catch {}
  }

  async function logout() {
    await clearPushRegistration();
    await storage.deleteItem('auth_token');
    setUser(null);
    setErrorUser(null);
    track(AnalyticsEvent.Logout);
    resetAnalytics();
    router.replace('/(auth)/login');
  }

  async function deleteAccount() {
    // Throws on failure so the caller can surface the error and keep the
    // user signed in; only clears local session once the server confirms.
    await api.del('/api/account');
    await clearPushRegistration();
    await storage.deleteItem('auth_token');
    setUser(null);
    setErrorUser(null);
    track(AnalyticsEvent.Logout);
    resetAnalytics();
    router.replace('/(auth)/login');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, loginWithApple, logout, deleteAccount, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
