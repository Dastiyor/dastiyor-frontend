import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Space the on-screen keyboard takes from the bottom of the window, on Android.
 *
 * Expo SDK 54 turns on edge-to-edge, so the window no longer shrinks when the
 * keyboard opens and KeyboardAvoidingView's "height" behavior measures a change
 * that never happens -- inputs end up behind the IME. iOS is unaffected and
 * keeps using "padding", so this returns 0 there.
 *
 * endCoordinates.height covers the keyboard alone; it sits above the gesture /
 * navigation bar, so the space actually consumed is height + bottom inset.
 * Measured on a Galaxy S23: 247 + 15 against a 780dp window, keyboard top 518.
 */
export function useKeyboardOffset(): number {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  return height > 0 ? height + insets.bottom : 0;
}
