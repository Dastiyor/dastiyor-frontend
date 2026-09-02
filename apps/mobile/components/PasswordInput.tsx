import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = Omit<TextInputProps, 'secureTextEntry'> & {
  /** Controlled visibility, so a group of fields can share one toggle. */
  visible?: boolean;
  onToggleVisible?: () => void;
  /** Render the eye. Off for the other fields in a shared group. */
  showToggle?: boolean;
};

/**
 * Password field with a show/hide eye.
 *
 * A new-password and its confirm field are a matched pair: revealing one
 * without the other is incoherent, and revealing both makes the confirm
 * redundant anyway. So a group shares a single toggle -- pass `visible` and
 * `onToggleVisible` to every field and `showToggle` to just the first.
 * Used alone (one field, no props), it manages its own state.
 */
export function PasswordInput({ visible, onToggleVisible, showToggle = true, ...props }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [ownVisible, setOwnVisible] = useState(false);

  const isControlled = visible !== undefined;
  const shown = isControlled ? visible : ownVisible;
  const toggle = isControlled ? onToggleVisible : () => setOwnVisible((v) => !v);

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <TextInput
        {...props}
        style={[styles.input, { color: colors.text }, props.style]}
        placeholderTextColor={props.placeholderTextColor ?? colors.textTertiary}
        secureTextEntry={!shown}
        maxLength={props.maxLength ?? 128}
      />
      {showToggle ? (
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={toggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={shown ? t.common.hidePassword : t.common.showPassword}
        >
          <Ionicons name={shown ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9CA3AF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
  },
  input: { flex: 1, padding: 14, fontSize: 15, letterSpacing: 0 },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 10 },
});
