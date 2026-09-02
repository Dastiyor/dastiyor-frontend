import { useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';

/**
 * Scrolls the focused input clear of the keyboard on Android.
 *
 * useKeyboardOffset() extends the scroll range so a covered field CAN be
 * reached, but nothing moves the view, so on a long form (create-task,
 * edit-profile) the field you just tapped stays hidden and you type blind.
 * Short forms only appeared to work because everything already fit.
 *
 * Spread the returned props onto the ScrollView. iOS is untouched -- its
 * KeyboardAvoidingView "padding" behavior already handles this.
 */
export function useKeyboardAwareScroll() {
  const ref = useRef<ScrollView>(null);
  const offsetY = useRef(0);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sub = Keyboard.addListener('keyboardDidShow', (e) => {
      // useKeyboardOffset() listens to this same event and grows the scroll
      // content padding through setState. scrollTo clamps to the CURRENT
      // maximum offset, so scrolling here lands short by exactly the padding
      // that has not been committed yet -- the field ends up half behind the
      // keyboard. Wait for that render and layout to settle first.
      timer = setTimeout(() => {
        const focused = TextInput.State.currentlyFocusedInput?.();
        const scroll = ref.current;
        if (!focused || !scroll) return;

        // endCoordinates.screenY is the top of the keyboard in window space.
        const keyboardTop = e.endCoordinates.screenY;
        focused.measureInWindow((_x: number, y: number, _w: number, h: number) => {
          const overlap = y + h - keyboardTop + 24; // 24 = breathing room
          if (overlap > 0) {
            scroll.scrollTo({ y: offsetY.current + overlap, animated: true });
          }
        });
      }, 150);
    });

    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { ref, onScroll, scrollEventThrottle: 16 };
}
