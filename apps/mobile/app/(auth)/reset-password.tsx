import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBackground } from '@/components/AuthBackground';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LogoWordmark } from '@/components/Logo';

export default function ResetPasswordScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rp = t.resetPassword;
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!code.trim() || !password || !confirm) {
      Alert.alert(t.common.error, rp.errFill);
      return;
    }
    if (password.length < 8) {
      Alert.alert(t.common.error, rp.errLength);
      return;
    }
    if (password !== confirm) {
      Alert.alert(t.common.error, rp.errMatch);
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password/mobile', {
        email: email ?? '',
        code: code.trim(),
        password,
      });
      Alert.alert(t.common.ok, rp.success, [
        { text: t.common.ok, onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuthBackground />
      <ScrollView contentContainerStyle={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <LogoWordmark size={30} style={{ marginBottom: 8 }} />
        <Text style={[styles.title, { color: colors.text }]}>{rp.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{rp.subtitle}</Text>

        <TextInput
          style={[styles.input, styles.codeInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
          placeholder={rp.codePh}
          placeholderTextColor={colors.textTertiary}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
          placeholder={rp.newPh}
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          maxLength={128}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
          placeholder={rp.confirmPh}
          placeholderTextColor={colors.textTertiary}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          maxLength={128}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{rp.btn}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
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
  codeInput: {
    fontSize: 24, fontWeight: '700', letterSpacing: 3,
    color: '#111827', marginBottom: 20,
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
