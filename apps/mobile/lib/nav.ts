import { Keyboard } from 'react-native';
import { router } from 'expo-router';

/**
 * router.back() is a silent no-op when the current screen is the stack root --
 * a cold-start deep link from a push notification, or anything reached via
 * router.replace. Fall back to the tab shell so a back button is never dead.
 *
 * Keyboard.dismiss() first: most callers are modal screens with text inputs,
 * and their submit buttons sit under keyboardShouldPersistTaps="handled", so
 * the keyboard is still up at dismissal time. Tearing down an iOS modal while
 * it holds first responder leaves the screen underneath unresponsive -- its
 * native header back button stops reacting.
 */
export function goBack() {
  Keyboard.dismiss();
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
