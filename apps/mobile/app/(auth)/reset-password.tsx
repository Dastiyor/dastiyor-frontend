import { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBackground } from '@/components/AuthBackground';
import { useAuthTopSpacing } from '@/lib/authLayout';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LogoWordmark } from '@/components/Logo';
import { PasswordInput } from '@/components/PasswordInput';
import { passwordStrength } from '@/lib/validation';
import { Alert } from '@/lib/dialog';
import { GradientButton } from '@/components/Premium';
import { ResendCodeButton } from '@/components/ResendCodeButton';
import { OtpInput } from '@/components/OtpInput';
import { FieldError } from '@/components/FieldError';

export default function ResetPasswordScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const top = useAuthTopSpacing();
  const rp = t.resetPassword;
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);
  // Problems found on submit, shown in red under each field (no alert).
  const [fieldErrors, setFieldErrors] = useState<{ code?: string; password?: string; confirm?: string }>({});
  const clearError = (field: 'code' | 'password' | 'confirm') => setFieldErrors((e) => ({ ...e, [field]: undefined }));
  const share = { visible: pwVisible, onToggleVisible: () => setPwVisible((v) => !v) };

  /** Sends the reset code again (SMS or email, by the shape of the identifier). */
  async function resendCode(): Promise<boolean> {
    try {
      await api.post('/api/auth/forgot-password/mobile', { identifier: identifier ?? '' });
      return true;
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
      return false;
    }
  }

  async function handleReset() {
    const issues = passwordStrength(password, rp);
    const found = {
      code: code.length === 6 ? undefined : code ? t.verifyPhone.errCode : t.common.fieldRequired,
      password: !password ? t.common.fieldRequired : issues[0],
      confirm: !confirm ? t.common.fieldRequired : password && confirm !== password ? rp.errMatch : undefined,
    };
    setFieldErrors(found);
    if (found.code || found.password || found.confirm) return;
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password/mobile', {
        identifier: identifier ?? '',
        code: code.trim(),
        password,
      });
      Alert.alert(t.common.ok, rp.success, [
        { text: t.common.ok, onPress: () => router.replace('/(auth)/login') },
      ], { icon: 'success' });
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: top.screenPaddingTop }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuthBackground />
      <ScrollView contentContainerStyle={[styles.inner, { paddingTop: top.contentPaddingTop, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <LogoWordmark size={30} style={{ marginBottom: 8 }} />
        <Text style={[styles.title, { color: colors.text }]}>{rp.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{rp.subtitle}</Text>

        <OtpInput value={code} onChangeText={(v) => { setCode(v); clearError('code'); }} label={rp.codeLabel} error={fieldErrors.code} />

        <PasswordInput
          {...share}
          placeholder={rp.newPh}
          value={password}
          onChangeText={(v) => { setPassword(v); clearError('password'); }}
          autoComplete="new-password"
          hasError={!!fieldErrors.password}
        />
        <FieldError message={fieldErrors.password} />

        <PasswordInput
          {...share}
          showToggle={false}
          placeholder={rp.confirmPh}
          value={confirm}
          onChangeText={(v) => { setConfirm(v); clearError('confirm'); }}
          hasError={!!fieldErrors.confirm}
        />
        <FieldError message={fieldErrors.confirm} />

        <GradientButton
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{rp.btn}</Text>}
        </GradientButton>

        {identifier ? <ResendCodeButton onResend={resendCode} disabled={loading} /> : null}

        <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.backLinkText}>{t.forgotPassword.backToLogin}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#111827', marginBottom: 12, backgroundColor: '#F9FAFB', letterSpacing: 0,
  },
  button: {
    backgroundColor: '#2563EB', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { alignItems: 'center', marginTop: 20 },
  backLinkText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
});
