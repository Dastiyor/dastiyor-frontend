import { router } from 'expo-router';

/**
 * router.back() is a silent no-op when the current screen is the stack root --
 * a cold-start deep link from a push notification, or anything reached via
 * router.replace. Fall back to the tab shell so a back button is never dead.
 */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
