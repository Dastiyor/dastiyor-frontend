/**
 * Native push-notification registration.
 *
 * `expo-notifications` / `expo-device` are loaded via guarded dynamic import so
 * this module is safe under Jest / web / a build that hasn't added the native
 * deps yet. When the modules are absent (or running on a simulator), the
 * functions resolve to null and the app degrades gracefully — no push, no crash.
 */

import { api } from '@/lib/api-client';

export type PushPermission = 'granted' | 'denied' | 'unavailable';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadModule(name: string): Promise<any | null> {
  try {
    // Indirection prevents static resolution by the bundler / Jest.
    return await import(/* webpackIgnore: true */ name);
  } catch {
    return null;
  }
}

/**
 * Ask for permission and return the Expo push token, or null if unavailable
 * (web, simulator, denied permission, or native module not installed).
 */
export async function getExpoPushToken(): Promise<string | null> {
  const Notifications = await loadModule('expo-notifications');
  const Device = await loadModule('expo-device');
  if (!Notifications?.getExpoPushTokenAsync) return null;

  // Push only works on physical devices.
  if (Device && Device.isDevice === false) return null;

  try {
    const settings = await Notifications.getPermissionsAsync();
    let status = settings?.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req?.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      // EAS injects this at build time.
      (await loadModule('expo-constants'))?.default?.expoConfig?.extra?.eas
        ?.projectId;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResult?.data ?? null;
  } catch {
    return null;
  }
}

function getPlatform(): 'ios' | 'android' | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { Platform } = require('react-native');
    if (Platform?.OS === 'ios' || Platform?.OS === 'android') return Platform.OS;
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Register this device for push with the backend. Idempotent and silent on
 * failure — push is a nice-to-have, never blocks the session.
 * Returns the token registered, or null if registration was skipped.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const token = await getExpoPushToken();
  if (!token) return null;
  try {
    await api.post('/api/push/register-device', { token, platform: getPlatform() });
    return token;
  } catch {
    return null;
  }
}

/** Unregister this device (called on logout). Silent on failure. */
export async function unregisterPushNotifications(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await api.del('/api/push/register-device', { token });
  } catch {
    /* ignore */
  }
}
