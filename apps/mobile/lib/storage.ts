import * as SecureStore from 'expo-secure-store';

const mem = new Map<string, string>();

const SENSITIVE_KEYS = new Set(['auth_token', 'expo_push_token']);

function isSensitive(key: string): boolean {
  return SENSITIVE_KEYS.has(key);
}

async function ensureSecureStore(key: string): Promise<void> {
  if (!isSensitive(key)) return;
  try {
    const available = await SecureStore.isAvailableAsync();
    if (!available && !__DEV__) {
      throw new Error('Secure storage unavailable');
    }
  } catch (err) {
    if (!__DEV__ && isSensitive(key)) throw err;
  }
}

export async function getItem(key: string): Promise<string | null> {
  try {
    const available = await SecureStore.isAvailableAsync();
    if (!available) {
      if (isSensitive(key) && !__DEV__) return null;
      return mem.get(key) ?? null;
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    if (isSensitive(key) && !__DEV__) return null;
    return mem.get(key) ?? null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  await ensureSecureStore(key);
  try {
    const available = await SecureStore.isAvailableAsync();
    if (!available) {
      if (isSensitive(key) && !__DEV__) {
        throw new Error('Secure storage unavailable');
      }
      mem.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    if (isSensitive(key) && !__DEV__) throw err;
    mem.set(key, value);
  }
}

export async function deleteItem(key: string): Promise<void> {
  try {
    const available = await SecureStore.isAvailableAsync();
    if (available) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    /* ignore */
  }
  mem.delete(key);
}
