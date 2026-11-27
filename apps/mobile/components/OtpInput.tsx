import { useRef, useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/AppText';
import { useTheme } from '@/contexts/ThemeContext';

export const OTP_LENGTH = 6;

/**
 * A 6-digit SMS code drawn as six boxes.
 *
 * It is one real TextInput laid invisibly over the boxes, not six inputs:
 * iOS "From Messages" autofill, Android SMS autofill, pasting a whole code,
 * backspace and screen readers all work on a single field, and each of those
 * breaks in some way when the digits are split across six. The boxes only
 * draw what the field holds; the box the next digit goes into is highlighted.
 */
export function OtpInput({ value, onChangeText, autoFocus, label, error, accessibilityLabel, style }: {
  value: string;
  onChangeText: (code: string) => void;
  autoFocus?: boolean;
  /** Shown above the boxes, its left edge on the first box's. */
  label?: string;
  /** Shown in red under the boxes (left edge on the first box's), with red borders. */
  error?: string;
  /** Defaults to `label`. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const hasError = !!error;
  const { colors } = useTheme();
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, OTP_LENGTH - 1);

  return (
    // The inner View is as wide as the row of boxes, so the label and error
    // inside it start exactly where the first box does, however it is centred.
    <View style={[styles.wrap, style]}>
      <View>
        {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
        <Pressable style={styles.row} onPress={() => ref.current?.focus()} accessible={false}>
          {Array.from({ length: OTP_LENGTH }, (_, i) => {
            const isActive = focused && i === active;
            return (
              <View
                key={i}
                style={[
                  styles.box,
                  { backgroundColor: colors.surfaceAlt, borderColor: hasError ? '#DC2626' : colors.border },
                  isActive && { borderColor: colors.accent, borderWidth: 2 },
                ]}
              >
                <Text style={[styles.digit, { color: colors.text }]}>{value[i] ?? ''}</Text>
              </View>
            );
          })}
          <TextInput
            ref={ref}
            testID="otp-input"
            value={value}
            onChangeText={(v) => onChangeText(v.replace(/\D/g, '').slice(0, OTP_LENGTH))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus={autoFocus}
            maxLength={OTP_LENGTH}
            caretHidden
            selectionColor="transparent"
            accessibilityLabel={accessibilityLabel ?? label}
            style={styles.hiddenInput}
          />
        </Pressable>
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  error: { color: '#DC2626', fontSize: 12, marginTop: 6 },
  box: {
    width: 44, height: 48,
    borderWidth: 1, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  digit: { fontSize: 20, fontWeight: '700' },
  // Covers the boxes so a tap anywhere focuses it; its own text is never seen.
  hiddenInput: { ...StyleSheet.absoluteFillObject, color: 'transparent', fontSize: 1 },
});
