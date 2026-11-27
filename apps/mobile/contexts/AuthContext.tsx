import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import * as storage from '@/lib/storage';
import { router } from 'expo-router';
import { api, setOnUnauthorized } from '@/lib/api-client';
import { registerForPushNotifications, unregisterPushNotifications } from '@/lib/push';
import { signOutFromGoogle } from '@/lib/google-signin';
import { identifyPurchases, resetPurchases } from '@/lib/purchases';
import { setUser as setErrorUser } from '@/lib/errorReporting';
import { track, identify, reset as resetAnalytics, AnalyticsEvent } from '@/lib/analytics';
import { syncStoredLocale } from '@/contexts/LanguageContext';
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
  /** Without one, the account signs in with an SMS code. */
  password?: string;
  fullName: string;
  role: 'customer' | 'provider';
  /**
   * Proof the phone passed its SMS code: the `ticket` that
   * /api/auth/verify-check returns for a REGISTRATION code. The server also
   * still takes the raw `code` instead.
   */
  ticket?: string;
  code?: string;
}

/**
 * 'role-required': the token belongs to someone with no account yet. Nothing was
 * created; ask customer or provider and call again with the same token and the role.
 */
export type OAuthResult = 'signed-in' | 'role-required';

type OAuthResponse = { token?: string; user?: ApiUser; roleRequired?: boolean };

interface AuthState {
  user: ApiUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  loginWithCode: (phone: string, code: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  /** Without a role, a new person gets 'role-required' instead of an account. */
  loginWithGoogle: (accessToken: string, role?: 'customer' | 'provider') => Promise<OAuthResult>;
  loginWithApple: (identityToken: string, email?: string, fullName?: string, role?: 'customer' | 'provider') => Promise<OAuthResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Switch between customer and provider; throws with the server's message when refused. */
  switchRole: (role: 'CUSTOMER' | 'PROVIDER') => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Store purchases are tied to our user id (no-op until the store keys are set).
  useEffect(() => {
    if (user?.id) identifyPurchases(user.id);
  }, [user?.id]);

  // True until the stored session has been checked on launch.
  const bootingRef = useRef(true);

  useEffect(() => {
    setOnUnauthorized(async () => {
      await storage.deleteItem('auth_token');
      setUser(null);
      // A session revoked while the app was closed (logout elsewhere, password
      // change) answers 401 on launch. Navigating then replaces app/index, the
      // only screen that hides the splash, before it runs -- the splash stayed
      // up for good. On launch, app/index routes the signed-out user itself.
      if (!bootingRef.current) router.replace('/(auth)/login');
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
        bootingRef.current = false;
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
    // The sign-in responses carry only id, email, name and role; the phone, photo and
    // phone-verification flag come from /api/auth/me, which otherwise only ran on app start.
    refreshUser();
    setErrorUser({ id: res.user.id, role: res.user.role });
    identify(res.user.id, { role: res.user.role });
    track(event, { method, role: res.user.role });
    syncPushRegistration();
    // The language is usually picked on the login screen -- signed out, where
    // there is no token to sync it with. Push it now, or the account keeps a
    // stale locale and every notification and email arrives in it.
    syncStoredLocale().catch(() => {});
  }

  async function login(identifier: string, password: string) {
    const res = await api.post<{ token: string; user: ApiUser }>('/api/auth/login', { identifier, password });
    await storage.setItem('auth_token', res.token);
    onAuthenticated(res, AnalyticsEvent.LoginCompleted, 'password');
  }

  async function loginWithCode(phone: string, code: string) {
    const res = await api.post<{ token: string; user: ApiUser }>('/api/auth/login/code', { phone, code });
    await storage.setItem('auth_token', res.token);
    onAuthenticated(res, AnalyticsEvent.LoginCompleted, 'sms');
  }

  async function register(data: RegisterData) {
    const res = await api.post<{ token: string; user: ApiUser }>('/api/auth/register', data);
    await storage.setItem('auth_token', res.token);
    onAuthenticated(res, AnalyticsEvent.SignUpCompleted, 'password');
  }

  // Sign in first, ask the role after: with no role the server signs an
  // existing account in, and answers roleRequired for a new person without
  // creating anything. The screen then asks and calls again with the role.
  async function finishOAuth(res: OAuthResponse, role: string | undefined, method: string): Promise<OAuthResult> {
    if (res.roleRequired) return 'role-required';
    if (!res.token || !res.user) throw new Error('Empty sign-in response');
    await storage.setItem('auth_token', res.token);
    // A role is only sent once the server said this person is new.
    onAuthenticated({ token: res.token, user: res.user }, role ? AnalyticsEvent.SignUpCompleted : AnalyticsEvent.LoginCompleted, method);
    return 'signed-in';
  }

  async function loginWithGoogle(accessToken: string, role?: 'customer' | 'provider') {
    const res = await api.post<OAuthResponse>('/api/auth/google/mobile', {
      accessToken,
      ...(role ? { role } : { deferRole: true }),
    });
    return finishOAuth(res, role, 'google');
  }

  async function loginWithApple(
    identityToken: string,
    email?: string,
    fullName?: string,
    role?: 'customer' | 'provider',
  ) {
    const res = await api.post<OAuthResponse>('/api/auth/apple/mobile', {
      identityToken,
      email,
      fullName,
      ...(role ? { role } : { deferRole: true }),
    });
    return finishOAuth(res, role, 'apple');
  }

  async function refreshUser() {
    try {
      const me = await api.get<ApiUser>('/api/auth/me');
      if (me) setUser(me);
    } catch {}
  }

  async function switchRole(role: 'CUSTOMER' | 'PROVIDER') {
    // The role is inside the session token, so the server issues a new one.
    const res = await api.post<{ token: string; user: ApiUser }>('/api/account/role', { role });
    await storage.setItem('auth_token', res.token);
    setUser((prev) => (prev ? { ...prev, role: res.user.role } : prev));
    setErrorUser({ id: res.user.id, role: res.user.role });
    identify(res.user.id, { role: res.user.role });
    await refreshUser();
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* proceed with local cleanup even if server unreachable */
    }
    await clearPushRegistration();
    await signOutFromGoogle();
    await resetPurchases();
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
    await signOutFromGoogle();
    await resetPurchases();
    await storage.deleteItem('auth_token');
    setUser(null);
    setErrorUser(null);
    track(AnalyticsEvent.Logout);
    resetAnalytics();
    router.replace('/(auth)/login');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithCode, register, loginWithGoogle, loginWithApple, logout, deleteAccount, refreshUser, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
