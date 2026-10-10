import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Geometry of the round close button on login and register. */
export const AUTH_CLOSE_TOP = 8;
export const AUTH_CLOSE_SIZE = 40;

// Room for the close button plus a little air under it.
const CLOSE_BAND = AUTH_CLOSE_TOP + AUTH_CLOSE_SIZE + 4;
// Where the logo starts below the top inset, on every auth screen, so they
// line up with each other however the space above is split.
const CONTENT_TOP = CLOSE_BAND + 8;

/**
 * Top spacing for the auth screens (login, register, forgot/reset password).
 *
 * Android is edge to edge, so a form taller than the screen used to scroll up
 * beneath the status bar icons and the close button. There the screen itself is
 * padded -- `screenPaddingTop` goes on the container, so the scroll view starts
 * and clips below the status bar, and below the close button when there is one.
 * While the keyboard is up the close-button band is handed back to the scroll
 * content: space is scarcest then, and the total stays the same so nothing
 * jumps as the keyboard opens.
 *
 * iOS presents these screens as a sheet that already sits under the status bar,
 * so it keeps all of the spacing inside the scroll content, where it scrolls
 * away.
 */
export function useAuthTopSpacing({ closeButton = false, keyboardOpen = false } = {}) {
  const insets = useSafeAreaInsets();
  const closeTop = insets.top + AUTH_CLOSE_TOP;

  if (Platform.OS !== 'android') {
    return { closeTop, screenPaddingTop: 0, contentPaddingTop: insets.top + 24 };
  }

  const band = closeButton && !keyboardOpen ? CLOSE_BAND : 0;
  return {
    closeTop,
    screenPaddingTop: insets.top + band,
    contentPaddingTop: CONTENT_TOP - band,
  };
}
