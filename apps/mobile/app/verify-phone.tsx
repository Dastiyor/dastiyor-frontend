import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { useKeyboardAwareScroll } from '@/lib/useKeyboardAwareScroll';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { goBack } from '@/lib/nav';
import { Alert } from '@/lib/dialog';

/**
 * Phone verification, mirroring the web /verify-phone page.
 *
 * Two steps against the shared API: /api/auth/verify-send issues the OTP
 * (type PHONE_VERIFY, unauthenticated), /api/auth/verify-phone consumes it and
 * sets phoneVerified. Only that second call clears the posting/responding gate --
 * a number saved from Edit Profile does not.
 */
export default function VerifyPhoneScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const kbScroll = useKeyboardAwareScroll();
  const vp = t.verifyPhone;

  // Set by whichever screen hit the gate, so we can send the user back to it.
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const fullPhone = `+992${phone}`;

  async function sendCode() {
    if (phone.length < 9) { Alert.alert(t.common.error, vp.errPhone); return; }
    setBusy(true);
    try {
      await api.post('/api/auth/verify-send', { phone: fullPhone, type: 'PHONE_VERIFY' });
      setStep('code');
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (code.length < 6) { Alert.alert(t.common.error, vp.errCode); return; }
    setBusy(true);
    try {
      await api.post('/api/auth/verify-phone', { phone: fullPhone, code });
      // Pull the updated user so anything reading auth state sees the change.
      await refreshUser().catch(() => {});
      Alert.alert(t.common.done, vp.success, [{
        text: t.common.ok,
        onPress: () => {
          if (returnTo) router.replace(returnTo as never);
          else goBack();
        },
      }]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView {...kbScroll} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 + keyboardOffset }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.intro, { color: colors.textSecondary }]}>{vp.subtitle}</Text>

        {step === 'phone' ? (
          <>
            <Text style={[styles.label, { color: colors.text }]}>{vp.phoneLabel}</Text>
            <View style={[styles.phoneRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <View style={styles.phonePrefix}>
                <View style={styles.flagImg}>
                  <View style={{ flex: 1, backgroundColor: '#BE0027' }} />
                  <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
                  <View style={{ flex: 1, backgroundColor: '#006B3F' }} />
                </View>
                <Text style={styles.phonePrefixText}>+992</Text>
              </View>
              <TextInput
                style={[styles.phoneInput, { color: colors.text }]}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 9))}
                keyboardType="number-pad"
                autoComplete="tel"
                placeholder="XX XXX XXXX"
                placeholderTextColor={colors.textTertiary}
                maxLength={9}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, (busy || phone.length < 9) && styles.btnDisabled]}
              onPress={sendCode}
              disabled={busy || phone.length < 9}
              accessibilityLabel={vp.sendCode}
              accessibilityRole="button"
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{vp.sendCode}</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.sent, { color: colors.textSecondary }]}>{vp.codeSent.replace('{phone}', fullPhone)}</Text>

            <Text style={[styles.label, { color: colors.text }]}>{vp.codeLabel}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder={vp.codePlaceholder}
              placeholderTextColor={colors.textTertiary}
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.btn, (busy || code.length < 6) && styles.btnDisabled]}
              onPress={verifyCode}
              disabled={busy || code.length < 6}
              accessibilityLabel={vp.verify}
              accessibilityRole="button"
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{vp.verify}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => { setStep('phone'); setCode(''); }}
              disabled={busy}
              accessibilityLabel={vp.changeNumber}
              accessibilityRole="button"
            >
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>{vp.changeNumber}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  sent: { fontSize: 13, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 14 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  phonePrefix: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  flagImg: { width: 20, height: 14, borderRadius: 2, overflow: 'hidden' },
  phonePrefixText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  phoneInput: { flex: 1, padding: 14, fontSize: 15, backgroundColor: 'transparent' },
  btn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn: { padding: 14, alignItems: 'center' },
  linkText: { fontSize: 14, fontWeight: '500' },
});
