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

// Lazily load optional native modules using literal specifiers so Metro bundles
// them and Hermes can compile the release build — a variable `import()` fails
// Hermes with "Invalid expression encountered". Guarded so the module stays safe
// under Jest / web / a build missing a given native dep.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadModule(name: string): any | null {
  try {
    switch (name) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      case 'expo-notifications': return require('expo-notifications');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      case 'expo-device': return require('expo-device');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      case 'expo-constants': return require('expo-constants');
      default: return null;
    }
  } catch {
    return null;
  }
}

/**
 * Ask for permission and return the Expo push token, or null if unavailable
 * (web, simulator, denied permission, or native module not installed).
 */
export async function getExpoPushToken(): Promise<string | null> {
  const Notifications = loadModule('expo-notifications');
  const Device = loadModule('expo-device');
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

    // EAS injects the project id at build time. Read from every location it can
    // surface so a valid linked project always resolves: app config `extra.eas`
    // (what `eas init` writes) and the runtime `easConfig`.
    const Constants = loadModule('expo-constants')?.default;
    const projectId: string | undefined =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      Constants?.manifest2?.extra?.eas?.projectId;

    // Without a project id, getExpoPushTokenAsync throws on standalone builds.
    // Skip cleanly rather than surfacing a crash — push degrades to disabled.
    if (!projectId) return null;

    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
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
