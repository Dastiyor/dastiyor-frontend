import { useState } from 'react';
import { TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/AppText';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatCountdown, useResendCooldown } from '@/lib/useResendCooldown';

/**
 * "Send the code again" under an SMS code field. Disabled for 60 seconds after
 * a code goes out ("…через 0:42") and while a resend is in flight, so nobody
 * taps it five times and burns the server's 3-per-15-minutes allowance.
 * `onResend` sends the code, shows its own error, and resolves true when a
 * code went out; only then does the countdown restart.
 */
export function ResendCodeButton({ onResend, disabled = false, style }: {
  onResend: () => Promise<boolean>;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { secondsLeft, restart } = useResendCooldown();
  const [sending, setSending] = useState(false);
  const rc = t.resendCode;

  async function handlePress() {
    if (sending || secondsLeft > 0) return;
    setSending(true);
    try {
      if (await onResend()) restart();
    } finally {
      setSending(false);
    }
  }

  const label = sending
    ? rc.sending
    : secondsLeft > 0
      ? rc.againIn.replace('{time}', formatCountdown(secondsLeft))
      : rc.again;
  const inactive = disabled || sending || secondsLeft > 0;

  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      onPress={handlePress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive }}
    >
      <Text style={[styles.text, { color: inactive ? colors.textTertiary : colors.accent }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center' },
  text: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
