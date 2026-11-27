import { Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { goBack } from '@/lib/nav';

/**
 * The back control in native screen headers: a plain "←", no "Back" label or
 * pill. Set as `headerLeft` (with `headerBackVisible: false`) on pushed
 * screens only -- modal screens close by swiping down and get none.
 * Swipe-back still works; this only replaces what is drawn.
 */
export function HeaderBackArrow({ tintColor, label }: { tintColor?: string; label: string }) {
  return (
    <Pressable
      onPress={() => goBack()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.5 }]}
    >
      <Icon name="arrow-back" size={24} color={tintColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 6, paddingRight: 8 },
});
