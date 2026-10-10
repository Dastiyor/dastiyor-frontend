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
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { goBack } from '@/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardOffset } from '@/lib/useKeyboardOffset';
import { useAuthTopSpacing } from '@/lib/authLayout';
import { useKeyboardAwareScroll } from '@/lib/useKeyboardAwareScroll';
import { AuthBackground } from '@/components/AuthBackground';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LogoWordmark } from '@/components/Logo';
import { Alert } from '@/lib/dialog';

export default function ForgotPasswordScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const top = useAuthTopSpacing();
  const kbScroll = useKeyboardAwareScroll();
  const fp = t.forgotPassword;
  // Phone or email: phone-only signups have no reachable address, so the code
  // goes out by SMS for them. The server decides which by the shape of this.
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const value = identifier.trim();
    if (!value) {
      Alert.alert(t.common.error, fp.errEmail);
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password/mobile', { identifier: value });
      Alert.alert(t.common.ok, fp.sent, [
        { text: t.common.ok, onPress: () => router.push({ pathname: '/(auth)/reset-password', params: { identifier: value } }) },
      ]);
    } catch (e) {
      Alert.alert(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: top.screenPaddingTop }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuthBackground />
      <ScrollView {...kbScroll}
        contentContainerStyle={[styles.inner, { paddingTop: top.contentPaddingTop, paddingBottom: insets.bottom + 24 + keyboardOffset }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LogoWordmark size={30} style={{ marginBottom: 8 }} />
        <Text style={[styles.title, { color: colors.text }]}>{fp.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{fp.subtitle}</Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
          placeholder={fp.emailPh}
          placeholderTextColor={colors.textTertiary}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          maxLength={255}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{fp.btn}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => goBack()}>
          <Text style={styles.backLinkText}>{fp.backToLogin}</Text>
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
    padding: 14, fontSize: 16, color: '#111827', marginBottom: 12, backgroundColor: '#F9FAFB',
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
