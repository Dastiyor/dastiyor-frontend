import { Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';

/**
 * App Store / Google Play billing through RevenueCat. The RevenueCat user id is
 * our User.id, which is what /api/subscription/sync and the server webhook use.
 *
 * Without a public SDK key (EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY) every
 * call is a no-op, so a build made before the store products exist runs fine.
 * Errors are swallowed: billing must never get in the way of logging in or out.
 */

export function storeKey(): string | undefined {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || undefined;
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || undefined;
  return undefined;
}

let configured = false;

export function initPurchases(key: string | undefined = storeKey()): boolean {
  if (configured) return true;
  if (!key) return false;
  Purchases.configure({ apiKey: key });
  configured = true;
  return true;
}

export async function identifyPurchases(userId: string, key: string | undefined = storeKey()): Promise<void> {
  if (!initPurchases(key)) return;
  try {
    await Purchases.logIn(userId);
  } catch {
    // Retried on the next app start or login.
  }
}

export async function resetPurchases(): Promise<void> {
  if (!configured) return;
  try {
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  } catch {
    // Nothing to undo locally.
  }
}

export function isUserCancel(e: unknown): boolean {
  const err = e as { userCancelled?: boolean; code?: string } | null;
  return err?.userCancelled === true || err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}
